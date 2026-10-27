// Task step 9 (three tests). Runs against the compose PostgreSQL
// (`DATABASE_URL_TEST`, reset/migrated once per run by `global-setup.ts` —
// which now also installs the `pgboss` schema as `rk_app`, via
// `migrate.ts`'s new `installPgBoss` step). Connects as `rk_worker`
// (`workerUrlForTestDb()`) with `migrate: false` — the same restricted-role
// path the real worker uses — to prove that path actually works, not just
// the `rk_app`-privileged one.
import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';

import { PgBossQueue } from './pg-boss-queue';
import type { QueueLogger } from './pg-boss-queue';
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

  it(
    'enqueue then work runs the handler once',
    async () => {
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
    },
    20_000,
  );

  it(
    'a thrown handler error is retried (retryLimit 1, two invocations)',
    async () => {
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
    },
    25_000,
  );

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
