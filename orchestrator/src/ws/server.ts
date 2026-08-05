import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { eq, ne } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { env } from "../env.js";
import { verifyWorkerToken } from "../auth/tokens.js";
import { completeJob, failJob } from "../jobs.js";
import { registry } from "../registry.js";
import {
  parseWorkerMessage,
  serialize,
  type WorkerClass,
  type WorkerRegistration,
} from "../protocol.js";

const WS_PATH = "/v1/worker";

interface ConnState {
  workerId: string | null;
  userId: string | null;
  workerClass: WorkerClass | null;
  headerToken: string | null;
}

/** Attach the worker WebSocket control plane to an existing HTTP server. */
export function attachWorkerWs(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "", "http://localhost");
    if (pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws, req) => {
    const authHeader = req.headers["authorization"];
    const headerToken = extractHeaderToken(
      Array.isArray(authHeader) ? authHeader[0] : authHeader,
    );
    const state: ConnState = {
      workerId: null,
      userId: null,
      workerClass: null,
      headerToken,
    };

    ws.on("message", (data) => {
      void handleMessage(ws, state, data.toString());
    });

    ws.on("close", () => {
      void handleClose(state);
    });

    ws.on("error", () => {
      // socket-level errors surface as close; nothing extra to do
    });
  });

  // Server → worker liveness ping + stale reaper.
  const timeout = env.pingIntervalMs * 3;
  setInterval(() => {
    const now = Date.now();
    for (const worker of registry.all()) {
      if (now - worker.lastHeartbeat > timeout) {
        try {
          worker.ws.terminate();
        } catch {
          /* noop */
        }
        continue;
      }
      try {
        worker.ws.send(serialize({ type: "ping" }));
      } catch {
        /* noop */
      }
    }
  }, env.pingIntervalMs).unref();
}

async function handleMessage(
  ws: WebSocket,
  state: ConnState,
  raw: string,
): Promise<void> {
  let msg;
  try {
    msg = parseWorkerMessage(raw);
  } catch (err) {
    ws.send(
      serialize({
        type: "error",
        message: err instanceof Error ? err.message : "Bad message",
      }),
    );
    return;
  }

  switch (msg.type) {
    case "register":
      await handleRegister(ws, state, msg.payload);
      break;

    case "heartbeat":
    case "pong":
      if (state.workerId) {
        registry.touch(state.workerId);
        void db
          .update(schema.workers)
          .set({ lastHeartbeatAt: new Date() })
          .where(eq(schema.workers.id, state.workerId));
      }
      break;

    case "job_token": {
      registry.getJob(msg.jobId)?.onToken(msg.token);
      break;
    }

    case "job_complete": {
      const job = registry.getJob(msg.jobId);
      if (job && state.userId && state.workerId && state.workerClass) {
        await completeJob(
          msg.jobId,
          state.userId,
          state.workerId,
          state.workerClass,
          msg.usage,
        );
        job.onDone(msg.usage);
        registry.removeJob(msg.jobId);
      }
      break;
    }

    case "job_error": {
      const job = registry.getJob(msg.jobId);
      if (job) {
        await failJob(msg.jobId, msg.message);
        job.onError(msg.message);
        registry.removeJob(msg.jobId);
      }
      break;
    }
  }
}

async function handleRegister(
  ws: WebSocket,
  state: ConnState,
  payload: WorkerRegistration,
): Promise<void> {
  const token = payload?.token || state.headerToken;
  const verified = await verifyWorkerToken(token);
  if (!verified) {
    ws.send(serialize({ type: "error", message: "Invalid worker token" }));
    ws.close(1008, "unauthorized");
    return;
  }

  const [row] = await db
    .insert(schema.workers)
    .values({
      token: verified.token,
      userId: verified.userId,
      workerClass: verified.workerClass,
      executionMode: payload.executionMode ?? "single",
      gpu: payload.gpu ?? null,
      model: payload.model ?? null,
      clientVersion: payload.clientVersion ?? null,
      status: "online",
      connectedAt: new Date(),
      lastHeartbeatAt: new Date(),
    })
    .returning({ id: schema.workers.id });

  state.workerId = row.id;
  state.userId = verified.userId;
  state.workerClass = verified.workerClass;

  registry.addWorker({
    workerId: row.id,
    ws,
    userId: verified.userId,
    workerClass: verified.workerClass,
    model: payload.model ?? null,
    connectedAt: Date.now(),
    lastHeartbeat: Date.now(),
    busy: false,
  });

  ws.send(serialize({ type: "registered", workerId: row.id }));
}

async function handleClose(state: ConnState): Promise<void> {
  if (!state.workerId) return;
  registry.removeWorker(state.workerId);
  await db
    .update(schema.workers)
    .set({ status: "offline", disconnectedAt: new Date() })
    .where(eq(schema.workers.id, state.workerId));
}

function extractHeaderToken(header: string | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/** On boot, reset any rows left 'online' by a previous (crashed) process. */
export async function resetStaleWorkers(): Promise<void> {
  await db
    .update(schema.workers)
    .set({ status: "offline", disconnectedAt: new Date() })
    .where(ne(schema.workers.status, "offline"));
}
