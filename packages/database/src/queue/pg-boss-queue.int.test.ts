// Task step 9 (three tests). Runs against the compose PostgreSQL
// (`DATABASE_URL_TEST`, reset/migrated once per run by `global-setup.ts` —
// which now also installs the `pgboss` schema as `rk_app`, via
// `migrate.ts`'s new `installPgBoss` step). Connects as `rk_worker`
// (`workerUrlForTestDb()`) with `migrate: false` — the same restricted-role
// path the real worker uses — to prove that path actually works, not just
// the `rk_app`-privileged one.
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { PgBossQueue, QueuePolicyMismatchError } from './pg-boss-queue';
import type { QueueLogger } from './pg-boss-queue';
import { clientExecutor } from './sql-executor';
import {
  createStandardQueue,
  jobsIn,
  removeQueueBehindCache,
  silentLogger,
  storedPolicy,
  uniqueName,
} from './queue-test-support';
import { runReset } from '../reset';
import { workerUrlForTestDb } from '../test-setup';

class CollectingLogger implements QueueLogger {
  readonly entries: { level: string; event: string; fields: Record<string, unknown> }[] = [];
  info(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'info', event, fields });
  }
  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'warn', event, fields });
  }
  error(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'error', event, fields });
  }
}

async function waitFor(check: () => boolean, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error('waitFor timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe('pg-boss PgBossQueue (rk_worker, migrate: false)', () => {
  const queues: PgBossQueue[] = [];

  afterEach(async () => {
    await Promise.all(queues.splice(0).map((q) => q.stop({ graceful: false })));
  });

  it('enqueue then work runs the handler once', async () => {
    const logger = new CollectingLogger();
    const queue = new PgBossQueue(workerUrlForTestDb(), logger);
    queues.push(queue);
    await queue.start();

    const name = `t009.basic.${randomUUID()}`;
    const received: unknown[] = [];
    await queue.work<{ n: number }>(name, (payload) => {
      received.push(payload);
    });
    await queue.enqueue(name, { n: 1 });

    await waitFor(() => received.length === 1);
    expect(received).toEqual([{ n: 1 }]);
  }, 20_000);

  it('a thrown handler error is retried (retryLimit 1, two invocations)', async () => {
    const logger = new CollectingLogger();
    const queue = new PgBossQueue(workerUrlForTestDb(), logger);
    queues.push(queue);
    await queue.start();

    const name = `t009.retry.${randomUUID()}`;
    let invocations = 0;
    await queue.work(name, () => {
      invocations += 1;
      throw new Error('always fails');
    });
    await queue.enqueue(name, {}, { retryLimit: 1, retryDelay: 1, retryBackoff: false });

    await waitFor(() => invocations >= 2, 20_000);
    expect(invocations).toBe(2);
    expect(logger.entries.some((e) => e.event === 'job.failed')).toBe(true);
  }, 25_000);

  it('stop is graceful', async () => {
    const logger = new CollectingLogger();
    const queue = new PgBossQueue(workerUrlForTestDb(), logger);
    queues.push(queue);
    await queue.start();

    await expect(queue.stop({ graceful: true, timeout: 5_000 })).resolves.toBeUndefined();
    // Removing from the cleanup list — already stopped, `afterEach` would
    // otherwise call `stop()` a second time on a closed instance.
    queues.pop();
  });
});

// CR-011 functional-spec.md § 11.2: T1–T5 and T15. Each test uses its own
// queue names and asserts only on them.
describe('CR-011 queue declaration and enqueue (rk_worker)', () => {
  const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
  const workerPool = new Pool({ connectionString: workerUrlForTestDb() });

  beforeAll(async () => {
    await queue.start();
  });

  afterAll(async () => {
    await queue.stop({ graceful: false });
    await workerPool.end();
  });

  it('T1: ensuring a declared job queue and an undeclared one creates both with the exclusive policy', async () => {
    const undeclared = uniqueName('cr011.t1');
    await queue.ensureQueue('search.refresh');
    await queue.ensureQueue(undeclared);

    expect(await storedPolicy('search.refresh')).toBe('exclusive');
    expect(await storedPolicy(undeclared)).toBe('exclusive');
  });

  it('a job sent without a retry setting takes its declaration: 5 retries by default, 3 for evidence.process', async () => {
    const undeclared = uniqueName('cr011.retries');
    const evidenceKey = uniqueName('cr011.retries.evidence');
    await queue.enqueue(undeclared, {}, { key: 'k' });
    await queue.enqueue('evidence.process', {}, { key: evidenceKey });

    expect((await jobsIn(undeclared))[0]?.retry_limit).toBe(5);
    const evidenceJob = (await jobsIn('evidence.process')).find(
      (job) => job.singleton_key === evidenceKey,
    );
    expect(evidenceJob?.retry_limit).toBe(3);
  });

  it('T2: ensuring a queue that already exists as standard fails naming the queue, both policies and pnpm db:reset', async () => {
    const name = uniqueName('cr011.t2');
    await createStandardQueue(name);

    const attempt = queue.ensureQueue(name);
    await expect(attempt).rejects.toBeInstanceOf(QueuePolicyMismatchError);
    await expect(attempt).rejects.toThrow(
      new RegExp(
        `queue ${name.replace(/\./g, '\\.')} exists with policy standard, but its declaration says exclusive; run pnpm db:reset`,
      ),
    );
    // Not marked ensured: a second call checks again instead of passing.
    await expect(queue.ensureQueue(name)).rejects.toBeInstanceOf(QueuePolicyMismatchError);
  });

  it('T3: two sends without a key give one job, and two sends with different keys give two jobs', async () => {
    const keyless = uniqueName('cr011.t3.keyless');
    const keyed = uniqueName('cr011.t3.keyed');

    expect(await queue.enqueue(keyless, { n: 1 })).toEqual({ ok: true, data: 'enqueued' });
    expect(await queue.enqueue(keyless, { n: 2 })).toEqual({ ok: true, data: 'deduplicated' });
    await queue.enqueue(keyed, { n: 1 }, { key: 'k1' });
    await queue.enqueue(keyed, { n: 2 }, { key: 'k2' });

    expect(await jobsIn(keyless)).toHaveLength(1);
    expect((await jobsIn(keyed)).map((job) => job.singleton_key)).toEqual(['k1', 'k2']);
  });

  it('T4: a send whose queue row was removed behind the process is job_not_enqueued, and the next ensure re-creates the queue', async () => {
    const name = uniqueName('cr011.t4');
    await removeQueueBehindCache(queue, name);

    expect(await queue.enqueue(name, {}, { key: 'k' })).toEqual({
      ok: false,
      error: { code: 'job_not_enqueued' },
    });
    expect(await storedPolicy(name)).toBeNull();

    await queue.ensureQueue(name);
    expect(await storedPolicy(name)).toBe('exclusive');
    expect(await queue.enqueue(name, {}, { key: 'k' })).toEqual({ ok: true, data: 'enqueued' });
  });

  it('T5: a send on a transaction that rolls back leaves no job, and on one that commits leaves exactly one', async () => {
    const name = uniqueName('cr011.t5');
    await queue.ensureQueue(name);
    const client = await workerPool.connect();
    try {
      await client.query('BEGIN');
      await queue.enqueue(name, { n: 1 }, { key: 'rolled-back', executor: clientExecutor(client) });
      await client.query('ROLLBACK');
      expect(await jobsIn(name)).toHaveLength(0);

      await client.query('BEGIN');
      const sent = await queue.enqueue(
        name,
        { n: 2 },
        { key: 'committed', executor: clientExecutor(client) },
      );
      const again = await queue.enqueue(
        name,
        { n: 3 },
        { key: 'committed', executor: clientExecutor(client) },
      );
      await client.query('COMMIT');

      expect(sent).toEqual({ ok: true, data: 'enqueued' });
      expect(again).toEqual({ ok: true, data: 'deduplicated' });
      expect((await jobsIn(name)).map((job) => job.singleton_key)).toEqual(['committed']);
    } finally {
      client.release();
    }
  });
});

describe('CR-011 queues after a reset (rk_worker)', () => {
  it('T15: after a reset rk_worker can create a queue and send a job, and cannot create a table in pgboss', async () => {
    await runReset(process.env.DATABASE_URL_TEST!);

    const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
    const workerPool = new Pool({ connectionString: workerUrlForTestDb() });
    await queue.start();
    try {
      const name = uniqueName('cr011.t15');
      expect(await queue.enqueue(name, {}, { key: 'k' })).toEqual({ ok: true, data: 'enqueued' });
      expect(await storedPolicy(name)).toBe('exclusive');
      await expect(workerPool.query('create table pgboss.cr011_probe (id int)')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await queue.stop({ graceful: false });
      await workerPool.end();
    }
  }, 60_000);
});
