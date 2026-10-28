// The relay transaction (CR-011, FD-038; functional-spec.md WF2 and § 10).
// One relay tick is one transaction on one connection: it claims events
// without marking them, enqueues their jobs on that connection, and marks
// each event in the same transaction, inside a savepoint per event, so jobs
// and `processed_at` commit or roll back together (BR1.1–BR1.10). The worker
// decides routes, keys and the retry-or-dead rule; this module runs the SQL.
import type { Pool, PoolClient } from 'pg';

import { PgOutbox } from '../repositories/outbox';
import { QueueMissingError } from './pg-boss-queue';
import type { EnqueueOptions, EnqueueResult } from './pg-boss-queue';
import { clientExecutor } from './sql-executor';
import type { SqlExecutor } from './sql-executor';

export interface OutboxEventRow {
  id: string;
  name: string;
  payload: unknown;
  attempts: number;
}

export interface PlannedJob {
  name: string;
  key: string;
  data: object;
}

export type EventPlan = { kind: 'unmapped' } | { kind: 'jobs'; jobs: PlannedJob[] };

export type RelayErrorCode = 'job_not_enqueued' | 'enqueue_error';

export type RelayResult = 'relayed' | 'audit_only' | 'unmapped' | 'retry' | 'dead';

export interface RelayedJob {
  name: string;
  status: 'enqueued' | 'deduplicated';
}

export interface EventOutcome {
  eventId: string;
  eventName: string;
  result: RelayResult;
  attempts: number;
  jobs: RelayedJob[];
  /** Present for `retry` and `dead`. */
  errorCode?: RelayErrorCode;
  /** The job whose enqueue failed, for `retry` and `dead`. */
  failedJob?: string;
}

export interface RelayBatchOptions {
  limit: number;
  plan: (event: OutboxEventRow) => EventPlan;
  onFailure: (attempts: number) => 'retry' | 'dead';
}

export interface RelayStore {
  /** Resolves only after COMMIT; a batch failure rejects and changes nothing. */
  relayBatch(opts: RelayBatchOptions): Promise<EventOutcome[]>;
}

/** The slice of `PgBossQueue` the relay sends through. */
export interface RelayEnqueuer {
  enqueue(name: string, payload: unknown, opts?: EnqueueOptions): Promise<EnqueueResult>;
}

// ASSUMPTION(CR-011): relay statement timeout 5 s and idle-in-transaction timeout 10 s (BR1.9).
const RELAY_STATEMENT_TIMEOUT = '5s';
const RELAY_IDLE_IN_TRANSACTION_TIMEOUT = '10s';

const EVENT_SAVEPOINT = 'relay_event';

type JobsOutcome =
  { ok: true; jobs: RelayedJob[] } | { ok: false; errorCode: RelayErrorCode; failedJob: string };

export class PgOutboxRelayStore implements RelayStore {
  private readonly pool: Pool;
  private readonly queue: RelayEnqueuer;
  private readonly outbox: PgOutbox;

  constructor(pool: Pool, queue: RelayEnqueuer, outbox: PgOutbox = new PgOutbox()) {
    this.pool = pool;
    this.queue = queue;
    this.outbox = outbox;
  }

  async relayBatch(opts: RelayBatchOptions): Promise<EventOutcome[]> {
    const client = await this.pool.connect();
    // A server-side timeout can end the session between statements; the next query then rejects.
    const onClientError = (): void => undefined;
    client.on('error', onClientError);
    let releaseError: Error | undefined;
    try {
      return await this.runBatch(client, opts);
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        // The connection is unusable; it must not go back to the pool.
        releaseError =
          rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
      }
      throw error;
    } finally {
      client.off('error', onClientError);
      client.release(releaseError);
    }
  }

  private async runBatch(client: PoolClient, opts: RelayBatchOptions): Promise<EventOutcome[]> {
    const sql = clientExecutor(client);
    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '${RELAY_STATEMENT_TIMEOUT}'`);
    await client.query(
      `SET LOCAL idle_in_transaction_session_timeout = '${RELAY_IDLE_IN_TRANSACTION_TIMEOUT}'`,
    );
    const events = await this.outbox.claimUnprocessed(sql, opts.limit);
    const outcomes: EventOutcome[] = [];
    for (const row of events) {
      const event: OutboxEventRow = {
        id: row.id,
        name: row.name,
        payload: row.payload,
        attempts: row.attempts,
      };
      outcomes.push(await this.relayEvent(client, sql, event, opts));
    }
    await client.query('COMMIT');
    return outcomes;
  }

  private async relayEvent(
    client: PoolClient,
    sql: SqlExecutor,
    event: OutboxEventRow,
    opts: RelayBatchOptions,
  ): Promise<EventOutcome> {
    const base = { eventId: event.id, eventName: event.name, attempts: event.attempts, jobs: [] };
    const plan = opts.plan(event);
    if (plan.kind === 'unmapped' || plan.jobs.length === 0) {
      await this.outbox.markProcessed(sql, event.id);
      return { ...base, result: plan.kind === 'unmapped' ? 'unmapped' : 'audit_only' };
    }
    await client.query(`SAVEPOINT ${EVENT_SAVEPOINT}`);
    const sent = await this.enqueueAll(sql, plan.jobs);
    if (sent.ok) {
      await this.outbox.markProcessed(sql, event.id);
      await client.query(`RELEASE SAVEPOINT ${EVENT_SAVEPOINT}`);
      return { ...base, result: 'relayed', jobs: sent.jobs };
    }
    // Undo this event's inserts only; the attempt is recorded in the same transaction (BR1.5).
    await client.query(`ROLLBACK TO SAVEPOINT ${EVENT_SAVEPOINT}`);
    await client.query(`RELEASE SAVEPOINT ${EVENT_SAVEPOINT}`);
    const attempts = await this.outbox.recordFailedAttempt(sql, event.id);
    const decision = opts.onFailure(attempts);
    if (decision === 'dead') {
      await this.outbox.markDead(sql, event.id);
    }
    return {
      ...base,
      attempts,
      result: decision,
      errorCode: sent.errorCode,
      failedJob: sent.failedJob,
    };
  }

  private async enqueueAll(sql: SqlExecutor, jobs: PlannedJob[]): Promise<JobsOutcome> {
    const relayed: RelayedJob[] = [];
    for (const job of jobs) {
      if (job.key === '') {
        throw new Error(`relay planned job ${job.name} without a key`);
      }
      let result: EnqueueResult;
      try {
        result = await this.queue.enqueue(job.name, job.data, { key: job.key, executor: sql });
      } catch (error) {
        // A missing queue is not this event's fault: the whole batch rolls back with no attempt counted.
        if (error instanceof QueueMissingError) {
          throw error;
        }
        return { ok: false, errorCode: 'enqueue_error', failedJob: job.name };
      }
      if (!result.ok) {
        return { ok: false, errorCode: result.error.code, failedJob: job.name };
      }
      relayed.push({ name: job.name, status: result.data });
    }
    return { ok: true, jobs: relayed };
  }
}
