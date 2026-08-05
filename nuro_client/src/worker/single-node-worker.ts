import type { InferenceEngineAdapter } from "../engines/ollama.js";
import type { InferenceJob, WorkerConfig, WorkerRegistration } from "../types.js";
import { OrchestratorClient } from "../orchestrator/client.js";
import { detectGpu } from "../system/gpu.js";

const CLIENT_VERSION = "0.1.0";

export class SingleNodeWorker {
  private orchestrator: OrchestratorClient | null = null;

  constructor(
    private readonly config: WorkerConfig,
    private readonly engine: InferenceEngineAdapter,
  ) {}

  async start(): Promise<void> {
    if (this.config.executionMode !== "single") {
      throw new Error(
        "Swarm mode is not available yet. Use executionMode=single for v1.",
      );
    }

    await this.engine.ensureReady(this.config.model);

    const gpu = await detectGpu();
    const registration: WorkerRegistration = {
      workerClass: this.config.workerClass,
      executionMode: this.config.executionMode,
      token: this.config.token,
      gpu,
      model: this.config.model,
      clientVersion: CLIENT_VERSION,
    };

    this.orchestrator = new OrchestratorClient({
      url: this.config.orchestratorUrl,
      registration,
      headers: { Authorization: `Bearer ${this.config.token}` },
      heartbeatIntervalMs: this.config.heartbeatIntervalMs,
      log: (message) => console.log(`[nuro-worker] ${message}`),
      onConnected: (workerId) => {
        console.log(
          `[nuro-worker] Registered as ${workerId} · ${this.config.model.id} via ${this.config.model.engine}`,
        );
      },
      onDisconnected: () => {
        console.log("[nuro-worker] Disconnected from orchestrator.");
      },
      onJob: async (message) => {
        await this.runJob(message.job);
      },
    });

    await this.orchestrator.start();
  }

  stop(): void {
    this.orchestrator?.stop();
    this.orchestrator = null;
  }

  private async runJob(job: InferenceJob): Promise<void> {
    const client = this.orchestrator;
    if (!client) return;

    if (job.swarmPlan) {
      client.failJob(
        job.jobId,
        "Swarm pipeline jobs require nuro-swarm (v2). This worker runs single-node only.",
      );
      return;
    }

    try {
      const stream = this.engine.streamCompletion(
        this.config.model,
        job.messages,
        { maxTokens: job.maxTokens },
      );

      let result = await stream.next();
      while (!result.done) {
        client.streamToken(job.jobId, result.value);
        result = await stream.next();
      }

      client.completeJob(job.jobId, result.value);
    } catch (error) {
      client.failJob(
        job.jobId,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
