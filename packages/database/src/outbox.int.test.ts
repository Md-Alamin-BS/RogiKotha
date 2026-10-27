// Task step 14: the implemented PgOutbox repository, plus the worker-role
// insert/read proof the task names for this file specifically.
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { PgOutbox } from './repositories/outbox';
import { testDb, workerUrlForTestDb } from './test-setup';

describe('PgOutbox', () => {
  it('claimBatch returns unprocessed rows once and marks them', async () => {
    const outbox = new PgOutbox();
    const name = `probe.${crypto.randomUUID()}`;
    await testDb.transaction(async (tx) => {
      await outbox.append(tx, name, { id: '1' });
      await outbox.append(tx, name, { id: '2' });
    });

    const first = await outbox.claimBatch(testDb, 10);
    const claimed = first.filter((r) => r.name === name);
    expect(claimed).toHaveLength(2);
    expect(claimed.every((r) => r.processedAt !== null)).toBe(true);

    // Calling claimBatch again does not return the same rows a second time.
    const second = await outbox.claimBatch(testDb, 10);
    expect(second.filter((r) => r.name === name)).toHaveLength(0);
  });

  it('markFailed resets a row so a later claimBatch can pick it up again', async () => {
    const outbox = new PgOutbox();
    const name = `probe.${crypto.randomUUID()}`;
    await testDb.transaction(async (tx) => {
      await outbox.append(tx, name, {});
    });
    const [claimed] = (await outbox.claimBatch(testDb, 50)).filter((r) => r.name === name);
    expect(claimed).toBeDefined();

    await outbox.markFailed(testDb, claimed!.id);

    const reclaimed = (await outbox.claimBatch(testDb, 50)).filter((r) => r.name === name);
    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0]?.attempts).toBe(1);
  });

  describe('rk_worker role', () => {
    it('can insert outbox rows but cannot read reports.reporter_account_id', async () => {
      const pool = new Pool({ connectionString: workerUrlForTestDb() });
      try {
        await expect(
          pool.query("insert into outbox_events (name, payload) values ('worker.probe', '{}')"),
        ).resolves.toBeDefined();
        await expect(pool.query('select reporter_account_id from reports')).rejects.toThrow(/permission denied/i);
      } finally {
        await pool.end();
      }
    });
  });
});
