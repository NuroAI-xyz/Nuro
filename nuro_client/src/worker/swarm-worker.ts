import type { InferenceJob, SwarmNodeAssignment } from "../types.js";

/**
 * v2 placeholder - activated once nuro-swarm ships.
 *
 * In swarm mode the worker loads only an assigned layer block, receives
 * activation tensors from the previous node in the pipeline (or raw prompts on
 * the first node), and forwards output activations to the next node.
 */
export class SwarmWorker {
  constructor(_assignment: SwarmNodeAssignment) {}

  async start(): Promise<void> {
    throw new Error(
      "Swarm mode is not implemented. Track nuro-swarm for pipeline inference.",
    );
  }

  async process(_job: InferenceJob): Promise<void> {
    throw new Error("Swarm mode is not implemented.");
  }
}
