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
  /** Engine-specific model identifier, e.g. `qwen2.5:27b` for Ollama */
  ref: string;
}

export interface WorkerRegistration {
  workerClass: WorkerClass;
  executionMode: ExecutionMode;
  /** Contributor auth token issued after signing in at nuroai.xyz. */
  token: string;
  gpu: GpuInfo;
  model: ModelInfo;
  clientVersion: string;
}

/** v2 - assigned layer block when executionMode is `swarm` (nuro-swarm) */
export interface SwarmNodeAssignment {
  nodeId: string;
  layerStart: number;
  layerEnd: number;
  totalLayers: number;
  position: "first" | "middle" | "last";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface InferenceJob {
  jobId: string;
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  maxTokens?: number;
  /** v2 - present for nuro-swarm pipeline jobs */
  swarmPlan?: SwarmNodeAssignment;
}

export interface WorkerConfig {
  orchestratorUrl: string;
  token: string;
  workerClass: WorkerClass;
  executionMode: ExecutionMode;
  model: ModelInfo;
  ollamaHost: string;
  heartbeatIntervalMs: number;
  /** Pull the model via Ollama if it isn't already available. */
  autoPull: boolean;
}

export interface StreamTokenEvent {
  jobId: string;
  token: string;
}

export interface JobCompleteEvent {
  jobId: string;
  usage: TokenUsage;
}

export interface JobErrorEvent {
  jobId: string;
  message: string;
}
