// Composition root (task step 5). Wires the worker's own adapters —
// database connection, outbox reader, job queue, logger, clock. No auth,
// identity, or data-request modules are imported here, ever.
// boundary: worker composition — see 01-conventions §2 (AD-6: "the worker
// has no application session, identity-reveal, public-delete, or general
// database credentials"). `container.test.ts` greps this package's source
// for the auth library and the two forbidden commands to keep it that way
// until T-010 turns this into a lint rule.
import { PgOutbox, PgBossQueue, createDb, closeDb } from '@rogikotha/database';
import type { Db } from '@rogikotha/database';

import type { WorkerEnv } from './env.js';
import { JsonLogger, type Logger } from './logger.js';
import type { OutboxSource } from './handlers/outbox-relay.js';

/** No demo-clock adapter exists yet (`packages/adapters/src/clock/` is a
 * future task — see 00-master-plan.md §4's layout). `now()` is the only
 * thing T-009's own code needs a clock for (none, in fact — this is here so
 * later handlers built against this container don't each invent their own
 * wall-clock read). ASSUMPTION(T-009): a plain system clock, swapped for
 * the real demo-clock-aware adapter when one exists. */
export interface Clock {
  now(): Date;
}

class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export interface WorkerContainer {
  db: Db;
  outbox: PgOutbox;
  outboxSource: OutboxSource;
  queue: PgBossQueue;
  logger: Logger;
  clock: Clock;
  close(): Promise<void>;
}

export function buildContainer(env: WorkerEnv): WorkerContainer {
  const logger = new JsonLogger();
  const { db, pool } = createDb(env.DATABASE_URL_WORKER);
  const outbox = new PgOutbox();
  const outboxSource: OutboxSource = {
    claimBatch: (limit) => outbox.claimBatch(db, limit),
    markProcessed: (ids) => outbox.markProcessed(db, ids),
    markFailed: (id) => outbox.markFailed(db, id),
  };
  // `migrate`/`createSchema`/`reindex` all default to `false` — `rk_worker`
  // owns no DDL rights on the `pgboss` schema; `packages/database/src/migrate.ts`
  // installs and migrates it as `rk_app` before the worker ever starts.
  const queue = new PgBossQueue(env.DATABASE_URL_WORKER, logger);
  const clock = new SystemClock();

  return {
    db,
    outbox,
    outboxSource,
    queue,
    logger,
    clock,
    async close() {
      await queue.stop();
      await closeDb(pool);
    },
  };
}
