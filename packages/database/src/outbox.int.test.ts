// Task step 14: the implemented PgOutbox repository, plus the worker-role
// insert/read proof the task names for this file specifically.
//
// CR-011 (BR1.2, BR6.4): the two T-009 tests asserted the at-most-once claim
// (`claimBatch` marked rows processed when it claimed them, ISS-144). That
// behaviour is removed on purpose; they are rewritten as T13 against the
// transaction-scoped claim, which locks rows and leaves them unprocessed.
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { clientExecutor } from './queue/sql-executor';
import { PgOutbox } from './repositories/outbox';
import type { OutboxRow } from './repositories/outbox';
import { testDb, testPool, workerUrlForTestDb } from './test-setup';

// Above any number of rows other files can leave unprocessed, so this file's rows are always in reach.
const CLAIM_ALL = 10_000;

async function appendTwo(outbox: PgOutbox, name: string): Promise<void> {
  await testDb.transaction(async (tx) => {
    await outbox.append(tx, name, { id: '1' });
    await outbox.append(tx, name, { id: '2' });
  });
}

function named(rows: OutboxRow[], name: string): OutboxRow[] {
  return rows.filter((row) => row.name === name);
}

describe('PgOutbox', () => {
  it('T13: a claim locks unprocessed rows without marking them, and a rolled-back claim leaves them claimable', async () => {
    const outbox = new PgOutbox();
    const name = `probe.${crypto.randomUUID()}`;
    await appendTwo(outbox, name);

    const holder = await testPool.connect();
    const other = await testPool.connect();
    try {
      await holder.query('BEGIN');
      const claimed = named(await outbox.claimUnprocessed(clientExecutor(holder), CLAIM_ALL), name);
      expect(claimed).toHaveLength(2);
      expect(claimed.every((row) => row.processedAt === null)).toBe(true);

      // While the first transaction holds them, a second claim skips them.
      await other.query('BEGIN');
      expect(named(await outbox.claimUnprocessed(clientExecutor(other), CLAIM_ALL), name)).toHaveLength(0);
      await other.query('ROLLBACK');

      await holder.query('ROLLBACK');
      await other.query('BEGIN');
      expect(named(await outbox.claimUnprocessed(clientExecutor(other), CLAIM_ALL), name)).toHaveLength(2);
      await other.query('ROLLBACK');
    } finally {
      holder.release();
      other.release();
    }
  });

  it('T13: recording a failed attempt adds one attempt and leaves the row claimable; marking it processed or dead ends its claims', async () => {
    const outbox = new PgOutbox();
    const name = `probe.${crypto.randomUUID()}`;
    await appendTwo(outbox, name);
    const client = await testPool.connect();
    const executor = clientExecutor(client);
    try {
      const [first, second] = named(await outbox.claimUnprocessed(executor, CLAIM_ALL), name);
      expect(await outbox.recordFailedAttempt(executor, first!.id)).toBe(1);

      const reclaimed = named(await outbox.claimUnprocessed(executor, CLAIM_ALL), name);
      expect(reclaimed.find((row) => row.id === first!.id)?.attempts).toBe(1);

      await outbox.markProcessed(executor, first!.id);
      await outbox.markDead(executor, second!.id);
      expect(named(await outbox.claimUnprocessed(executor, CLAIM_ALL), name)).toHaveLength(0);
    } finally {
      client.release();
    }
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
