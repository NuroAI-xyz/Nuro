import type {
  InferenceJob,
  JobCompleteEvent,
  JobErrorEvent,
  StreamTokenEvent,
  TokenUsage,
  WorkerRegistration,
} from "../types.js";

export type OrchestratorInbound =
  | { type: "registered"; workerId: string }
  | { type: "job"; job: InferenceJob }
  | { type: "ping" }
  | { type: "error"; message: string };

export type OrchestratorOutbound =
  | { type: "register"; payload: WorkerRegistration }
  | { type: "heartbeat"; workerId: string; at: string }
  | StreamTokenEvent & { type: "job_token" }
  | JobCompleteEvent & { type: "job_complete" }
  | JobErrorEvent & { type: "job_error" }
  | { type: "pong" };

export function parseOrchestratorMessage(raw: string): OrchestratorInbound {
  const message = JSON.parse(raw) as OrchestratorInbound;
  if (!message || typeof message !== "object" || !("type" in message)) {
    throw new Error("Invalid orchestrator message.");
  }
  return message;
}

export function serializeOrchestratorMessage(
  message: OrchestratorOutbound,
): string {
  return JSON.stringify(message);
}

export function toRegistrationPayload(
  registration: WorkerRegistration,
): OrchestratorOutbound {
  return {
    type: "register",
    payload: registration,
  };
}

export function jobToken(
  jobId: string,
  token: string,
): OrchestratorOutbound {
  return { type: "job_token", jobId, token };
}

export function jobComplete(
  jobId: string,
  usage: TokenUsage,
): OrchestratorOutbound {
  return { type: "job_complete", jobId, usage };
}

export function jobError(jobId: string, message: string): OrchestratorOutbound {
  return { type: "job_error", jobId, message };
}
