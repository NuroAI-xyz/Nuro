import type { WebSocket } from "ws";
import type { ModelInfo, TokenUsage, WorkerClass } from "./protocol.js";

export interface ConnectedWorker {
  workerId: string;
  ws: WebSocket;
  userId: string;
  workerClass: WorkerClass;
  model: ModelInfo | null;
  connectedAt: number;
  lastHeartbeat: number;
  busy: boolean;
}

export interface PendingJob {
  jobId: string;
  workerId: string;
  requesterId: string | null;
  onToken: (token: string) => void;
  onDone: (usage: TokenUsage) => void;
  onError: (message: string) => void;
}

/** Process-local registry of live worker connections and in-flight jobs. */
class Registry {
  private workers = new Map<string, ConnectedWorker>();
  private jobs = new Map<string, PendingJob>();

  addWorker(worker: ConnectedWorker): void {
    this.workers.set(worker.workerId, worker);
  }

  removeWorker(workerId: string): void {
    this.workers.delete(workerId);
    // Fail any jobs still bound to this worker.
    for (const [jobId, job] of this.jobs) {
      if (job.workerId === workerId) {
        job.onError("Worker disconnected");
        this.jobs.delete(jobId);
      }
    }
  }

  getWorker(workerId: string): ConnectedWorker | undefined {
    return this.workers.get(workerId);
  }

  touch(workerId: string): void {
    const w = this.workers.get(workerId);
    if (w) w.lastHeartbeat = Date.now();
  }

  all(): ConnectedWorker[] {
    return [...this.workers.values()];
  }

  onlineForUser(userId: string): ConnectedWorker[] {
    return this.all().filter((w) => w.userId === userId);
  }

  /** Pick an available (not busy) worker, preferring one that serves `model`. */
  pickAvailable(opts?: {
    model?: string;
    workerClass?: WorkerClass;
  }): ConnectedWorker | undefined {
    const free = this.all().filter((w) => !w.busy);
    const pool = opts?.workerClass
      ? free.filter((w) => w.workerClass === opts.workerClass)
      : free;
    if (pool.length === 0) return undefined;

    if (opts?.model) {
      const wanted = opts.model.toLowerCase();
      const match = pool.find((w) => {
        const id = w.model?.id?.toLowerCase() ?? "";
        const ref = w.model?.ref?.toLowerCase() ?? "";
        return id === wanted || ref === wanted || ref.includes(wanted);
      });
      if (match) return match;
    }
    return pool[0];
  }

  counts(): { total: number; native: number; browser: number; busy: number } {
    const all = this.all();
    return {
      total: all.length,
      native: all.filter((w) => w.workerClass === "native").length,
      browser: all.filter((w) => w.workerClass === "browser").length,
      busy: all.filter((w) => w.busy).length,
    };
  }

  addJob(job: PendingJob): void {
    this.jobs.set(job.jobId, job);
    const w = this.workers.get(job.workerId);
    if (w) w.busy = true;
  }

  getJob(jobId: string): PendingJob | undefined {
    return this.jobs.get(jobId);
  }

  removeJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      const w = this.workers.get(job.workerId);
      if (w) w.busy = false;
    }
    this.jobs.delete(jobId);
  }

  queuedCount(): number {
    return this.jobs.size;
  }
}

export const registry = new Registry();
