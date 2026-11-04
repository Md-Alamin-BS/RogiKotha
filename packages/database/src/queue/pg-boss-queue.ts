// pg-boss adapter (T-009 task step 2). Exports a class with the `JobQueue`
// port's method shape (03-routes-and-contracts.md §3:
// `enqueue(name, payload, {key, retryLimit, startAfter})`,
// `work(name, handler)`) — `packages/application` does not declare the
// `JobQueue` interface yet (T-101 onward creates it), so there is no
// `implements` clause here yet.
// TODO(T-101): implements JobQueue
import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';

import { queueDeclarationFor } from './queue-declaration';
import type { DeclaredQueuePolicy } from './queue-declaration';
import type { SqlExecutor } from './sql-executor';

/** Structurally compatible with `apps/worker/src/logger.ts`'s `Logger` and
 * `packages/test-support/src/fakes/logger.ts`'s `CollectingLogger` — kept
 * local rather than importing the worker's type (this package must not
 * depend on `apps/worker`) or a not-yet-existing `application` port. */
export interface QueueLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export interface EnqueueOptions {
  /** pg-boss's `singletonKey`. The queue's `exclusive` policy (queue-declaration.ts)
   * refuses a second queued, retrying or active job with the same key. */
  key?: string;
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  expireInSeconds?: number;
  startAfter?: number | string | Date;
  /** The caller's open transaction. The insert and the de-duplication check
   * run on it, and the queue is not created from here: the caller ensures it
   * before opening the transaction, so no other connection is used inside it. */
  executor?: SqlExecutor;
}

export interface WorkOptions {
  batchSize?: number;
  pollingIntervalSeconds?: number;
}

export type JobHandler<T = unknown> = (payload: T) => Promise<void> | void;

export type EnqueueOutcome = 'enqueued' | 'deduplicated';

/** Result-shaped like `@rogikotha/contracts`' `Result`, with a code local to
 * the queue: `job_not_enqueued` is an internal failure, not an `ErrorCode`
 * of 03-routes-and-contracts.md §2. */
export type EnqueueResult =
  { ok: true; data: EnqueueOutcome } | { ok: false; error: { code: 'job_not_enqueued' } };

/** A stored queue whose policy differs from its declaration (BR3.5). */
export class QueuePolicyMismatchError extends Error {
  readonly queue: string;
  readonly expectedPolicy: DeclaredQueuePolicy;
  readonly actualPolicy: string;

  constructor(queue: string, expectedPolicy: DeclaredQueuePolicy, actualPolicy: string) {
    super(
      `queue ${queue} exists with policy ${actualPolicy}, but its declaration says ${expectedPolicy}; ` +
        'run pnpm db:reset to recreate the pgboss schema',
    );
    this.name = 'QueuePolicyMismatchError';
    this.queue = queue;
    this.expectedPolicy = expectedPolicy;
    this.actualPolicy = actualPolicy;
  }
}

/** pg-boss rejected a send because the queue row is gone (a reset under a
 * running process). Not specific to one job, so the relay rolls back its whole
 * batch on it. */
export class QueueMissingError extends Error {
  readonly queue: string;

  constructor(queue: string, options?: { cause?: unknown }) {
    super(`queue ${queue} does not exist`, options);
    this.name = 'QueueMissingError';
    this.queue = queue;
  }
}

const PGBOSS_SCHEMA = 'pgboss';

// pg-boss 12.31.0 `manager.js` `getQueueCache`: thrown once the queue has left its cache.
const MISSING_QUEUE_MESSAGE = /^Queue .+ does not exist$/;

function isMissingQueueError(error: unknown): boolean {
  return error instanceof Error && MISSING_QUEUE_MESSAGE.test(error.message);
}

const IN_FLIGHT_JOB_SQL = `
  select 1 from ${PGBOSS_SCHEMA}.job
  where name = $1
    and coalesce(singleton_key, '') = coalesce($2::text, '')
    and state in ('created', 'retry', 'active')
  limit 1`;

export interface PgBossQueueOptions {
  /** Default `false`: the worker connects as `rk_worker`, which owns no DDL
   * rights on the `pgboss` schema — `packages/database/src/migrate.ts`
   * installs/migrates it as `rk_app` before the worker ever starts.
   * `migrate: true` is used only by that install step, run as `rk_app`. */
  migrate?: boolean;
  createSchema?: boolean;
  reindex?: boolean;
  /** Default pg-boss's own (`true`). The web only sends jobs, so it turns maintenance off. */
  supervise?: boolean;
  /** Default pg-boss's own (`true`). The web runs no cron schedules. */
  schedule?: boolean;
}

/**
 * Thin wrapper around pg-boss. Queues are created lazily from the queue
 * declaration: `ensureQueue` creates a queue once per process and checks the
 * stored policy, and `enqueue`/`work`/`schedule` call it first (pg-boss 10+
 * rejects `send`/`work` against a queue that was never created).
 */
export class PgBossQueue {
  private readonly boss: PgBoss;
  private readonly logger: QueueLogger;
  private readonly ensured = new Set<string>();
  private started = false;

  constructor(connectionString: string, logger: QueueLogger, options: PgBossQueueOptions = {}) {
    this.logger = logger;
    this.boss = new PgBoss({
      connectionString,
      migrate: options.migrate ?? false,
      createSchema: options.createSchema ?? false,
      reindex: options.reindex ?? false,
      ...(options.supervise !== undefined ? { supervise: options.supervise } : {}),
      ...(options.schedule !== undefined ? { schedule: options.schedule } : {}),
    });
    this.boss.on('error', (err: unknown) => {
      this.logger.error('queue.error', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }

  async start(): Promise<void> {
    await this.boss.start();
    this.started = true;
  }

  /** Graceful by default, per task step 8 ("queue.stop() graceful with 10 s timeout"). */
  async stop(options: { graceful?: boolean; timeout?: number } = {}): Promise<void> {
    if (!this.started) {
      return;
    }
    await this.boss.stop({
      graceful: options.graceful ?? true,
      timeout: options.timeout ?? 10_000,
    });
    this.started = false;
  }

  /** Creates the queue from its declaration and fails closed when the stored
   * policy differs (BR3.5); pg-boss keeps an existing queue unchanged. */
  async ensureQueue(name: string): Promise<void> {
    if (this.ensured.has(name)) {
      return;
    }
    const declared = queueDeclarationFor(name);
    await this.boss.createQueue(name, {
      policy: declared.policy,
      retryLimit: declared.retryLimit,
      retryDelay: declared.retryDelaySeconds,
      retryBackoff: declared.retryBackoff,
      expireInSeconds: declared.expireInSeconds,
    });
    const stored = await this.boss.getQueue(name);
    if (stored === null) {
      throw new QueueMissingError(name);
    }
    if (stored.policy !== declared.policy) {
      throw new QueuePolicyMismatchError(name, declared.policy, String(stored.policy));
    }
    this.ensured.add(name);
  }

  /**
   * Sends one job. pg-boss returns `null` both when the policy refused a
   * duplicate key and when the queue row is gone, so a `null` counts as
   * `deduplicated` only once an in-flight job with that key is found (BR3.6).
   * Database errors reject; a missing queue rejects with `QueueMissingError`.
   */
  async enqueue(name: string, payload: unknown, opts: EnqueueOptions = {}): Promise<EnqueueResult> {
    if (opts.executor === undefined) {
      await this.ensureQueue(name);
    }
    const declared = queueDeclarationFor(name);
    let id: string | null;
    try {
      id = await this.boss.send(name, payload ?? {}, {
        ...(opts.key !== undefined ? { singletonKey: opts.key } : {}),
        retryLimit: opts.retryLimit ?? declared.retryLimit,
        retryDelay: opts.retryDelay ?? declared.retryDelaySeconds,
        retryBackoff: opts.retryBackoff ?? declared.retryBackoff,
        expireInSeconds: opts.expireInSeconds ?? declared.expireInSeconds,
        ...(opts.startAfter !== undefined ? { startAfter: opts.startAfter } : {}),
        ...(opts.executor !== undefined ? { db: opts.executor } : {}),
      });
    } catch (error) {
      if (isMissingQueueError(error)) {
        this.ensured.delete(name);
        throw new QueueMissingError(name, { cause: error });
      }
      throw error;
    }
    if (id !== null) {
      return { ok: true, data: 'enqueued' };
    }
    if (await this.hasInFlightJob(name, opts.key, opts.executor)) {
      return { ok: true, data: 'deduplicated' };
    }
    // The queue row is gone behind a cached entry; the next ensure re-creates it.
    this.ensured.delete(name);
    return { ok: false, error: { code: 'job_not_enqueued' } };
  }

  private async hasInFlightJob(
    name: string,
    key: string | undefined,
    executor?: SqlExecutor,
  ): Promise<boolean> {
    const db = executor ?? this.boss.getDb();
    const { rows } = await db.executeSql(IN_FLIGHT_JOB_SQL, [name, key ?? null]);
    return rows.length > 0;
  }

  /** Wraps `handler` so a thrown error is logged as `job.failed` and rethrown
   * for pg-boss's own retry/backoff to take over (task step 2). */
  async work<T = unknown>(
    name: string,
    handler: JobHandler<T>,
    opts: WorkOptions = {},
  ): Promise<void> {
    await this.ensureQueue(name);
    await this.boss.work<T>(
      name,
      { batchSize: opts.batchSize ?? 1, pollingIntervalSeconds: opts.pollingIntervalSeconds ?? 2 },
      async (jobs: Job<T>[]) => {
        for (const job of jobs) {
          try {
            await handler(job.data);
          } catch (err) {
            this.logger.error('job.failed', {
              job: name,
              jobId: job.id,
              message: err instanceof Error ? err.message : String(err),
            });
            throw err;
          }
        }
      },
    );
  }

  async schedule(name: string, cron: string, payload: unknown = {}): Promise<void> {
    await this.ensureQueue(name);
    await this.boss.schedule(name, cron, payload as object);
  }
}

/**
 * Installs/migrates the `pgboss` schema as the caller's role (task step 2 —
 * run once, as `rk_app`, from `migrate.ts`). `rk_worker` never calls this;
 * its own `PgBossQueue` always passes `migrate: false`.
 */
export async function installPgBoss(connectionString: string): Promise<void> {
  const boss = new PgBoss({
    connectionString,
    migrate: true,
    createSchema: true,
    supervise: false,
    schedule: false,
  });
  await boss.start();
  await boss.stop({ graceful: false });
}
