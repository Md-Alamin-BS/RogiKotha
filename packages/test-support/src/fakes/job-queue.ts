// `JobQueue` port fake (03-routes-and-contracts.md §3:
// `enqueue(name, payload, {key, retryLimit, startAfter})`, `work(name, handler)`).
// Task step 5: "MemoryJobQueue (records enqueues; `drain()` runs handlers)".
export interface EnqueuedJob {
  name: string;
  payload: unknown;
  key?: string;
  retryLimit?: number;
  startAfter?: Date;
}

type Handler = (payload: unknown) => Promise<void> | void;

export class MemoryJobQueue {
  readonly enqueued: EnqueuedJob[] = [];
  private readonly handlers = new Map<string, Handler>();
  private readonly pending: EnqueuedJob[] = [];

  enqueue(
    name: string,
    payload: unknown,
    opts?: { key?: string; retryLimit?: number; startAfter?: Date },
  ): Promise<void> {
    const job: EnqueuedJob = { name, payload, ...opts };
    this.enqueued.push(job);
    this.pending.push(job);
    return Promise.resolve();
  }

  work(name: string, handler: Handler): void {
    this.handlers.set(name, handler);
  }

  /** Runs every pending job's registered handler once, in enqueue order, then clears the queue. */
  async drain(): Promise<void> {
    const batch = this.pending.splice(0, this.pending.length);
    for (const job of batch) {
      const handler = this.handlers.get(job.name);
      if (handler) await handler(job.payload);
    }
  }
}
