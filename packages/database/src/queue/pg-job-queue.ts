// The application `JobQueue` port over `PgBossQueue` (T-101 WF12, BR6.2). A job is inserted on the
// command's own transaction connection, so it commits or rolls back with the command (ISS-253).
import type { EnqueueOutcome, JobQueue, PortResult, Tx as AppTx } from '@rogikotha/application';
import type { PoolClient } from 'pg';

import { executorOf } from '../unit-of-work';
import type { PgBossQueue } from './pg-boss-queue';
import { clientExecutor } from './sql-executor';
import type { SqlExecutor } from './sql-executor';

type Queryable = Pick<PoolClient, 'query'>;

/**
 * The connection under a Drizzle node-postgres transaction. Drizzle keeps it on the transaction's
 * session; the cast is checked, so a Drizzle upgrade that moves it fails loudly instead of
 * enqueuing on a second connection outside the transaction.
 */
export function sqlExecutorOf(tx: AppTx): SqlExecutor {
  const client = (executorOf(tx) as unknown as { session?: { client?: Partial<Queryable> } })
    .session?.client;
  if (typeof client?.query !== 'function') {
    throw new Error('the transaction exposes no node-postgres client to enqueue on');
  }
  return clientExecutor(client as PoolClient);
}

export class PgJobQueue implements JobQueue {
  private startup: Promise<void> | undefined;

  constructor(private readonly queue: PgBossQueue) {}

  /** Starts pg-boss once per process (the web never starts it elsewhere), then ensures `name`. */
  async ensure(name: string): Promise<void> {
    await this.started();
    await this.queue.ensureQueue(name);
  }

  async enqueue(
    tx: AppTx,
    name: string,
    payload: Record<string, unknown>,
    opts: { key: string },
  ): Promise<PortResult<EnqueueOutcome, 'job_not_enqueued'>> {
    await this.started();
    return this.queue.enqueue(name, payload, { key: opts.key, executor: sqlExecutorOf(tx) });
  }

  private started(): Promise<void> {
    this.startup ??= this.queue.start().catch((error: unknown) => {
      // A failed start is retried on the next call rather than cached.
      this.startup = undefined;
      throw error;
    });
    return this.startup;
  }
}
