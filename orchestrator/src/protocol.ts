// Orchestrator protocol - mirrors @nuro/worker (nuro_client/src/orchestrator/messages.ts
// and types.ts). Kept in sync by hand; the worker does NOT validate, so the server does.

export type WorkerClass = "native" | "browser";
export type ExecutionMode = "single" | "swarm";
export type InferenceEngine = "ollama" | "vllm" | "webllm";

export interface GpuInfo {
  name: string;
  vramMb: number | null;
  backend: "cuda" | "metal" | "webgpu" | "unknown";
}

export interface ModelInfo {
  id: string;
  engine: InferenceEngine;
  ref: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface WorkerRegistration {
  workerClass: WorkerClass;
  executionMode: ExecutionMode;
  token: string;
  gpu: GpuInfo;
  model: ModelInfo;
  clientVersion: string;
}

export interface InferenceJob {
  jobId: string;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  maxTokens?: number;
}

/** Worker → orchestrator */
export type WorkerInbound =
  | { type: "register"; payload: WorkerRegistration }
  | { type: "heartbeat"; workerId: string; at: string }
  | { type: "job_token"; jobId: string; token: string }
  | { type: "job_complete"; jobId: string; usage: TokenUsage }
  | { type: "job_error"; jobId: string; message: string }
  | { type: "pong" };

/** Orchestrator → worker */
export type WorkerOutbound =
  | { type: "registered"; workerId: string }
  | { type: "job"; job: InferenceJob }
  | { type: "ping" }
  | { type: "error"; message: string };

export function serialize(message: WorkerOutbound): string {
  return JSON.stringify(message);
}

/** Parse + shallow-validate an inbound worker message. Throws on garbage. */
export function parseWorkerMessage(raw: string): WorkerInbound {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    throw new Error("Message is not valid JSON");
  }
  if (!msg || typeof msg !== "object" || !("type" in msg)) {
    throw new Error("Message missing `type`");
  }
  const m = msg as { type: string };
  switch (m.type) {
    case "register":
    case "heartbeat":
    case "job_token":
    case "job_complete":
    case "job_error":
    case "pong":
      return msg as WorkerInbound;
    default:
      throw new Error(`Unknown message type: ${m.type}`);
  }
}
