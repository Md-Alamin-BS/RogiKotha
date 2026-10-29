// Cumulative smoke suite: CR-011's assertion (BR6.3). Like
// `grants.smoke.test.ts`, it needs the compose PostgreSQL: the de-duplication
// is a unique index in the `pgboss` schema, so only the real database proves it.
import { describe, expect, it } from 'vitest';

import { workerUrlForTestDb } from '../test-setup';
import { PgBossQueue } from './pg-boss-queue';
import { jobsIn, silentLogger, uniqueName } from './queue-test-support';

describe('queue smoke', () => {
  it('the same key sent twice to a fresh queue gives one job (rk_worker, exclusive policy)', async () => {
    const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
    await queue.start();
    try {
      const name = uniqueName('cr011.smoke');
      expect(await queue.enqueue(name, { n: 1 }, { key: 'k' })).toEqual({
        ok: true,
        data: 'enqueued',
      });
      expect(await queue.enqueue(name, { n: 1 }, { key: 'k' })).toEqual({
        ok: true,
        data: 'deduplicated',
      });
      expect(await jobsIn(name)).toHaveLength(1);
    } finally {
      await queue.stop({ graceful: false });
    }
  }, 30_000);
});
