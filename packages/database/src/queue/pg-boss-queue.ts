// pg-boss adapter (T-009 task step 2). Exports a class with the `JobQueue`
// port's method shape (03-routes-and-contracts.md §3:
// `enqueue(name, payload, {key, retryLimit, startAfter})`,
// `work(name, handler)`) — `packages/application` does not declare the
// `JobQueue` interface yet (T-101 onward creates it), so there is no
// `implements` clause here yet.
// TODO(T-101): implements JobQueue
import { PgBoss } from 'pg-boss';
import type { Job } from 'pg-boss';

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
  /** Maps to pg-boss's `singletonKey` — makes a retry of the same logical
   * event idempotent instead of enqueuing a duplicate job. */
  key?: string;
  retryLimit?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  expireInSeconds?: number;
  startAfter?: number | string | Date;
}

export interface WorkOptions {
  batchSize?: number;
  pollingIntervalSeconds?: number;
}

export type JobHandler<T = unknown> = (payload: T) => Promise<void> | void;

const ENQUEUE_DEFAULTS = {
  retryLimit: 3,
  retryDelay: 10,
  retryBackoff: true,
  expireInSeconds: 300,
} as const;

export interface PgBossQueueOptions {
  /** Default `false`: the worker connects as `rk_worker`, which owns no DDL
   * rights on the `pgboss` schema — `packages/database/src/migrate.ts`
   * installs/migrates it as `rk_app` before the worker ever starts.
   * `migrate: true` is used only by that install step, run as `rk_app`. */
  migrate?: boolean;
  createSchema?: boolean;
  reindex?: boolean;
}

/**
 * Thin wrapper around pg-boss. Queues are created lazily: `ensureQueue`
 * calls `boss.createQueue(name)` once per process per queue name — pg-boss
 * 10+ rejects `send`/`work` against a queue that was never created, so
 * `enqueue`/`work`/`schedule` all call it first.
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
    });
    this.boss.on('error', (err: unknown) => {
      this.logger.error('queue.error', { message: err instanceof Error ? err.message : String(err) });
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
    await this.boss.stop({ graceful: options.graceful ?? true, timeout: options.timeout ?? 10_000 });
    this.started = false;
  }

  async ensureQueue(name: string): Promise<void> {
    if (this.ensured.has(name)) {
      return;
    }
    await this.boss.createQueue(name);
    this.ensured.add(name);
  }

  async enqueue(name: string, payload: unknown, opts: EnqueueOptions = {}): Promise<string | null> {
    await this.ensureQueue(name);
    return this.boss.send(name, payload ?? {}, {
      ...(opts.key !== undefined ? { singletonKey: opts.key } : {}),
      retryLimit: opts.retryLimit ?? ENQUEUE_DEFAULTS.retryLimit,
      retryDelay: opts.retryDelay ?? ENQUEUE_DEFAULTS.retryDelay,
      retryBackoff: opts.retryBackoff ?? ENQUEUE_DEFAULTS.retryBackoff,
      expireInSeconds: opts.expireInSeconds ?? ENQUEUE_DEFAULTS.expireInSeconds,
      ...(opts.startAfter !== undefined ? { startAfter: opts.startAfter } : {}),
    });
  }

  /** Wraps `handler` so a thrown error is logged as `job.failed` and rethrown
   * for pg-boss's own retry/backoff to take over (task step 2). */
  async work<T = unknown>(name: string, handler: JobHandler<T>, opts: WorkOptions = {}): Promise<void> {
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
  const boss = new PgBoss({ connectionString, migrate: true, createSchema: true, supervise: false, schedule: false });
  await boss.start();
  await boss.stop({ graceful: false });
}
