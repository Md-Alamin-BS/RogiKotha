// Added by the T-009 **validator**, not by the implementer
// (`04-handoff-and-validation.md` §3.2: "A validator never fixes code. It may
// add test files under the task's test paths and must say so."). See
// `docs/validation/T-009.md`.
//
// The first two cases guard the `rk_worker` privilege boundary this task
// introduced on the `pgboss` schema. The ISS-201 and ISS-202 probes were
// `it.fails` tripwires until CR-011 fixed both defects (`exclusive` queues,
// and a reset that drops `pgboss` with `public`); they are now plain tests
// with their bodies unchanged. Do not weaken an assertion here: a red result
// means the defect named in the test is back.
import { randomUUID } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { runReset } from '../reset';
import { testDb, workerUrlForTestDb } from '../test-setup';
import { PgBossQueue, installPgBoss } from './pg-boss-queue';

const silentLogger = { info() {}, warn() {}, error() {} };

async function jobCount(name: string): Promise<number> {
  const result = await testDb.execute<{ n: string }>(
    sql`select count(*)::text as n from pgboss.job where name = ${name}`,
  );
  return Number(result.rows[0]?.n ?? 0);
}

describe('T-009 validator probes', () => {
  it('rk_worker cannot create objects in the pgboss schema (USAGE + DML only)', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('create table pgboss.validator_probe (id int)')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });

  it('installPgBoss is idempotent on an already-installed schema', async () => {
    await expect(installPgBoss(process.env.DATABASE_URL_TEST!)).resolves.toBeUndefined();
  }, 30_000);

  // ISS-201. Task step 7: "Use the singletonKey so a relay retry cannot
  // enqueue twice". pg-boss 12 only enforces `singleton_key` uniqueness under
  // the `short`/`singleton`/`stately`/`exclusive`/`key_strict_fifo` queue
  // policies or with `singletonSeconds` (pg-boss `dist/plans.js` job_i1..i8).
  // `PgBossQueue.ensureQueue` created every queue with the default
  // `standard` policy, so a second send with the same key while the first job
  // was still queued created a second job. Fixed in CR-011: queues are created
  // `exclusive` from the queue declaration.
  it('ISS-201: a second enqueue with the same key while the first job is still queued creates no second job', async () => {
    const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
    await queue.start();
    try {
      const name = `t009.validator.dedupe.${randomUUID()}`;
      const key = `${randomUUID()}:${name}`;
      await queue.enqueue(name, { n: 1 }, { key });
      await queue.enqueue(name, { n: 1 }, { key });
      expect(await jobCount(name)).toBe(1);
    } finally {
      await queue.stop({ graceful: false });
    }
  }, 30_000);

  // ISS-202. `reset.ts` dropped and recreated `public` only; the `pgboss`
  // schema T-009 introduced survived `db:reset` / `demo:reset`, so queued
  // jobs from before a reset ran against the freshly seeded database. Fixed in
  // CR-011: the reset drops `pgboss` and `public` in one transaction.
  it('ISS-202: db:reset leaves no pg-boss job behind', async () => {
    const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
    await queue.start();
    const name = `t009.validator.reset.${randomUUID()}`;
    try {
      await queue.enqueue(name, { n: 1 });
    } finally {
      await queue.stop({ graceful: false });
    }
    expect(await jobCount(name)).toBe(1);
    await runReset(process.env.DATABASE_URL_TEST!);
    expect(await jobCount(name)).toBe(0);
  }, 60_000);
});
