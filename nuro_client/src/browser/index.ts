import type {
  ChatMessage,
  InferenceJob,
  ModelInfo,
  TokenUsage,
  WorkerRegistration,
} from "../types.js";
import { OrchestratorClient } from "../orchestrator/client.js";
import {
  jobComplete,
  jobError,
  jobToken,
  parseOrchestratorMessage,
  serializeOrchestratorMessage,
  toRegistrationPayload,
} from "../orchestrator/messages.js";
import {
  WebLLMEngine,
  createWebLLMEngine,
  type WebLLMEngineOptions,
  type WebLLMProgress,
} from "./webllm-engine.js";

export interface BrowserWorkerOptions {
  orchestratorUrl: string;
  /** Contributor auth token from the signed-in nuroai.xyz session. */
  token: string;
  model: ModelInfo;
  /** WebLLM engine instance. Use `createWebLLMEngine` or `createBrowserWorker`. */
  engine?: BrowserInferenceEngine;
  heartbeatIntervalMs?: number;
  onStatus?: (message: string) => void;
}

export interface BrowserInferenceEngine {
  ensureReady(model: ModelInfo): Promise<void>;
  streamCompletion(
    model: ModelInfo,
    messages: ChatMessage[],
    options?: { maxTokens?: number },
  ): AsyncGenerator<string, TokenUsage>;
}

/**
 * Browser contributor worker (WebGPU / WebLLM).
 *
 * Intended to run inside nuroai.xyz - keeps a tab open, serves Qwen3 8B-class
 * models, and connects to the orchestrator over WebSocket.
 */
export class BrowserWorker {
  private socket: WebSocket | null = null;
  private workerId: string | null = null;
  private heartbeatTimer: number | null = null;

  constructor(private readonly options: BrowserWorkerOptions) {}

  async start(): Promise<void> {
    const engine = this.options.engine;
    if (!engine) {
      throw new Error(
        "Browser worker requires a WebLLM engine. Pass options.engine from your WebLLM setup.",
      );
    }

    await engine.ensureReady(this.options.model);
    await this.connect(engine);
  }

  stop(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.socket?.close();
    this.socket = null;
  }

  private log(message: string): void {
    this.options.onStatus?.(message);
  }

  private connect(engine: BrowserInferenceEngine): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.options.orchestratorUrl);
      this.socket = socket;

      const registration: WorkerRegistration = {
        workerClass: "browser",
        executionMode: "single",
        token: this.options.token,
        gpu: {
          name: "WebGPU",
          vramMb: null,
          backend: "webgpu",
        },
        model: this.options.model,
        clientVersion: "0.1.0",
      };

      socket.addEventListener("open", () => {
        socket.send(
          serializeOrchestratorMessage(toRegistrationPayload(registration)),
        );
        resolve();
      });

      socket.addEventListener("error", () => {
        reject(new Error("Failed to connect to orchestrator."));
      });

      socket.addEventListener("message", (event) => {
        void this.handleMessage(String(event.data), engine, socket);
      });
    });
  }

  private async handleMessage(
    raw: string,
    engine: BrowserInferenceEngine,
    socket: WebSocket,
  ): Promise<void> {
    const message = parseOrchestratorMessage(raw);

    switch (message.type) {
      case "registered":
        this.workerId = message.workerId;
        this.log(`Registered as ${message.workerId}`);
        this.startHeartbeat(socket);
        break;
      case "ping":
        socket.send(serializeOrchestratorMessage({ type: "pong" }));
        break;
      case "job":
        await this.runJob(message.job, engine, socket);
        break;
      case "error":
        this.log(message.message);
        break;
    }
  }

  private startHeartbeat(socket: WebSocket): void {
    const interval = this.options.heartbeatIntervalMs ?? 30_000;
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.workerId) return;
      socket.send(
        serializeOrchestratorMessage({
          type: "heartbeat",
          workerId: this.workerId,
          at: new Date().toISOString(),
        }),
      );
    }, interval);
  }

  private async runJob(
    job: InferenceJob,
    engine: BrowserInferenceEngine,
    socket: WebSocket,
  ): Promise<void> {
    if (job.swarmPlan) {
      socket.send(
        serializeOrchestratorMessage(
          jobError(
            job.jobId,
            "Swarm pipeline jobs are not supported in the browser worker.",
          ),
        ),
      );
      return;
    }

    try {
      const stream = engine.streamCompletion(this.options.model, job.messages, {
        maxTokens: job.maxTokens,
      });

      let result = await stream.next();
      while (!result.done) {
        socket.send(
          serializeOrchestratorMessage(jobToken(job.jobId, result.value)),
        );
        result = await stream.next();
      }

      socket.send(
        serializeOrchestratorMessage(jobComplete(job.jobId, result.value)),
      );
    } catch (error) {
      socket.send(
        serializeOrchestratorMessage(
          jobError(
            job.jobId,
            error instanceof Error ? error.message : String(error),
          ),
        ),
      );
    }
  }
}

/**
 * One-call setup for the website: builds a WebLLM engine (with load progress)
 * and returns a ready-to-start BrowserWorker.
 *
 * ```ts
 * const worker = await createBrowserWorker({
 *   orchestratorUrl: "wss://orchestrator.nuroai.xyz/v1/worker",
 *   token: session.workerToken,
 *   model: { id: "nuro-browser-8b", engine: "webllm", ref: "Qwen2.5-7B-Instruct-q4f16_1-MLC" },
 *   onProgress: (p) => setLoad(p.progress),
 *   onStatus: (s) => setStatus(s),
 * });
 * await worker.start();
 * ```
 */
export async function createBrowserWorker(
  options: Omit<BrowserWorkerOptions, "engine"> & {
    onProgress?: (report: WebLLMProgress) => void;
  },
): Promise<BrowserWorker> {
  const { onProgress, ...workerOptions } = options;
  const engine = new WebLLMEngine({ onProgress });
  return new BrowserWorker({ ...workerOptions, engine });
}

export { WebLLMEngine, createWebLLMEngine };
export type { WebLLMEngineOptions, WebLLMProgress };

export type { WorkerRegistration };
