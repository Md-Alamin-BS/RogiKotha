// `JobQueue` port fake: records ensures and enqueues, de-duplicates by key like pg-boss's
// singleton key, and `drain()` runs registered handlers. A rollback drops the jobs its
// transaction enqueued, as the real queue does when it enqueues on the caller's transaction.
import {
  portErr,
  portOk,
  type EnqueueOutcome,
  type JobQueue,
  type PortResult,
  type Tx,
} from '@rogikotha/application';

import type { Transactional } from './unit-of-work.js';

export interface EnqueuedJob {
  name: string;
  payload: Record<string, unknown>;
  key: string;
}

type Handler = (payload: Record<string, unknown>) => Promise<void> | void;

export class MemoryJobQueue implements JobQueue, Transactional {
  readonly ensured: string[] = [];
  enqueued: EnqueuedJob[] = [];
  private pending: EnqueuedJob[] = [];
  private readonly handlers = new Map<string, Handler>();
  private refuseNext = 0;

  ensure(name: string): Promise<void> {
    this.ensured.push(name);
    return Promise.resolve();
  }

  enqueue(
    _tx: Tx,
    name: string,
    payload: Record<string, unknown>,
    opts: { key: string },
  ): Promise<PortResult<EnqueueOutcome, 'job_not_enqueued'>> {
    void _tx;
    if (this.refuseNext > 0) {
      this.refuseNext -= 1;
      return Promise.resolve(portErr('job_not_enqueued'));
    }
    if (this.enqueued.some((job) => job.name === name && job.key === opts.key)) {
      return Promise.resolve(portOk('deduplicated'));
    }
    const job: EnqueuedJob = { name, payload: { ...payload }, key: opts.key };
    this.enqueued.push(job);
    this.pending.push(job);
    return Promise.resolve(portOk('enqueued'));
  }

  /** The next `count` enqueues answer `job_not_enqueued`. */
  refuseEnqueues(count = 1): void {
    this.refuseNext = count;
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

  snapshot(): unknown {
    return { enqueued: [...this.enqueued], pending: [...this.pending] };
  }

  restore(state: unknown): void {
    const saved = state as { enqueued: EnqueuedJob[]; pending: EnqueuedJob[] };
    this.enqueued = [...saved.enqueued];
    this.pending = [...saved.pending];
  }
}
