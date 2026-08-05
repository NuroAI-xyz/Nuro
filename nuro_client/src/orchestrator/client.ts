import WebSocket from "ws";
import type { WorkerRegistration } from "../types.js";
import {
  jobComplete,
  jobError,
  jobToken,
  parseOrchestratorMessage,
  serializeOrchestratorMessage,
  toRegistrationPayload,
  type OrchestratorInbound,
  type OrchestratorOutbound,
} from "./messages.js";

export interface OrchestratorClientOptions {
  url: string;
  registration: WorkerRegistration;
  /** Sent on the WebSocket handshake (e.g. Authorization: Bearer <token>). */
  headers?: Record<string, string>;
  heartbeatIntervalMs?: number;
  onJob: (job: OrchestratorInbound & { type: "job" }) => Promise<void>;
  onConnected?: (workerId: string) => void;
  onDisconnected?: (reason: string) => void;
  log?: (message: string) => void;
}

export class OrchestratorClient {
  private socket: WebSocket | null = null;
  private workerId: string | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private stopped = false;

  constructor(private readonly options: OrchestratorClientOptions) {}

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  send(message: OrchestratorOutbound): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Orchestrator socket is not connected.");
    }
    this.socket.send(serializeOrchestratorMessage(message));
  }

  streamToken(jobId: string, token: string): void {
    this.send(jobToken(jobId, token));
  }

  completeJob(jobId: string, usage: Parameters<typeof jobComplete>[1]): void {
    this.send(jobComplete(jobId, usage));
  }

  failJob(jobId: string, message: string): void {
    this.send(jobError(jobId, message));
  }

  private log(message: string): void {
    this.options.log?.(message);
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.options.url, {
        headers: this.options.headers,
      });
      this.socket = socket;

      socket.once("open", () => {
        this.log(`Connected to orchestrator at ${this.options.url}`);
        socket.send(
          serializeOrchestratorMessage(
            toRegistrationPayload(this.options.registration),
          ),
        );
        resolve();
      });

      socket.once("error", (error) => {
        if (socket.readyState === WebSocket.CONNECTING) {
          reject(error);
        }
      });

      socket.on("message", (data) => {
        void this.handleMessage(data.toString());
      });

      socket.on("close", () => {
        this.clearHeartbeat();
        this.workerId = null;
        this.options.onDisconnected?.("socket closed");
        if (!this.stopped) {
          this.scheduleReconnect();
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.log("Reconnecting in 5s...");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        this.log(
          `Reconnect failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.scheduleReconnect();
      });
    }, 5000);
  }

  private async handleMessage(raw: string): Promise<void> {
    let message: OrchestratorInbound;
    try {
      message = parseOrchestratorMessage(raw);
    } catch (error) {
      this.log(
        `Ignored malformed message: ${error instanceof Error ? error.message : String(error)}`,
      );
      return;
    }

    switch (message.type) {
      case "registered":
        this.workerId = message.workerId;
        this.options.onConnected?.(message.workerId);
        this.startHeartbeat();
        break;
      case "ping":
        this.send({ type: "pong" });
        break;
      case "job":
        await this.options.onJob(message);
        break;
      case "error":
        this.log(`Orchestrator error: ${message.message}`);
        break;
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    const interval = this.options.heartbeatIntervalMs ?? 30_000;
    this.heartbeatTimer = setInterval(() => {
      if (!this.workerId) return;
      this.send({
        type: "heartbeat",
        workerId: this.workerId,
        at: new Date().toISOString(),
      });
    }, interval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
