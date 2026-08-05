import { eq } from "drizzle-orm";
import { db, schema } from "./db/index.js";
import { computeEarningUsd } from "./rates.js";
import type { ChatMessage, TokenUsage, WorkerClass } from "./protocol.js";
import { registry, type ConnectedWorker } from "./registry.js";
import { serialize } from "./protocol.js";

export interface DispatchParams {
  worker: ConnectedWorker;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  requesterId: string | null;
  onToken: (token: string) => void;
  onDone: (usage: TokenUsage) => void;
  onError: (message: string) => void;
}

/** Create a job row, register callbacks, and send the job to the worker. */
export async function dispatchJob(params: DispatchParams): Promise<string> {
  const { worker } = params;
  const [row] = await db
    .insert(schema.jobs)
    .values({
      workerId: worker.workerId,
      requesterId: params.requesterId,
      model: params.model,
      status: "running",
      startedAt: new Date(),
    })
    .returning({ id: schema.jobs.id });

  const jobId = row.id;

  registry.addJob({
    jobId,
    workerId: worker.workerId,
    requesterId: params.requesterId,
    onToken: params.onToken,
    onDone: params.onDone,
    onError: params.onError,
  });

  worker.ws.send(
    serialize({
      type: "job",
      job: {
        jobId,
        model: params.model,
        messages: params.messages,
        stream: true,
        maxTokens: params.maxTokens,
      },
    }),
  );

  return jobId;
}

/** Mark a job done, persist usage, and credit the contributor. */
export async function completeJob(
  jobId: string,
  userId: string,
  workerId: string,
  _workerClass: WorkerClass,
  usage: TokenUsage,
): Promise<void> {
  const [updated] = await db
    .update(schema.jobs)
    .set({
      status: "done",
      promptTokens: usage.promptTokens || 0,
      completionTokens: usage.completionTokens || 0,
      completedAt: new Date(),
    })
    .where(eq(schema.jobs.id, jobId))
    .returning({ model: schema.jobs.model });

  // Worker payout is a revenue share of the job's market price (by model tier).
  const amountUsd = computeEarningUsd(updated?.model ?? null, usage);

  await db.insert(schema.earnings).values({
    userId,
    workerId,
    jobId,
    amountUsd: amountUsd.toFixed(6),
  });
}

export async function failJob(jobId: string, message: string): Promise<void> {
  await db
    .update(schema.jobs)
    .set({ status: "error", errorMessage: message, completedAt: new Date() })
    .where(eq(schema.jobs.id, jobId));
}
