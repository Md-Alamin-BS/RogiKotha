import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { createDb, DEFAULT_POOL_OPTIONS, withTx } from './client';
import { auditEvents } from './schema/index';
import { testDb } from './test-setup';

describe('createDb pool (ISS-452)', () => {
  it('uses a bounded pool with an acquire timeout by default', () => {
    const { pool } = createDb(process.env.DATABASE_URL_TEST!);

    expect(pool.options).toMatchObject(DEFAULT_POOL_OPTIONS);
    expect(DEFAULT_POOL_OPTIONS.connectionTimeoutMillis).toBeGreaterThan(0);
    return pool.end();
  });

  it('fails a query fast when every connection is taken, and recovers once one is free', async () => {
    const { db, pool } = createDb(process.env.DATABASE_URL_TEST!, {
      max: 1,
      connectionTimeoutMillis: 1_000,
    });
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let held: Promise<void> = Promise.resolve();
    try {
      // Opens the one connection first, so the timeout below measures only the wait for it.
      await db.execute(sql`select 1`);
      let begun: () => void = () => undefined;
      const holding = new Promise<void>((resolve) => {
        begun = resolve;
      });
      held = db.transaction(async () => {
        begun();
        await gate;
      });
      await Promise.race([holding, held]);
      const startedAt = Date.now();

      const refused = await db.execute(sql`select 1`).then(
        () => null,
        (error: unknown) => error,
      );

      expect(Date.now() - startedAt).toBeLessThan(5_000);
      // Drizzle wraps the driver's error; the pool's own message is its cause.
      const cause = refused instanceof Error ? refused.cause : null;
      expect(cause instanceof Error ? cause.message : String(refused)).toMatch(/timeout/i);
      release();
      await held;
      await expect(db.execute(sql`select 1`)).resolves.toBeDefined();
    } finally {
      release();
      await held.catch(() => undefined);
      await pool.end();
    }
  });
});

describe('withTx', () => {
  it('rolls back when the callback throws', async () => {
    const stream = 'account:withtx-rollback-test';
    await expect(
      withTx(testDb, async (tx) => {
        await tx.insert(auditEvents).values({
          stream,
          action: 'test_action',
          actor: 'system:test',
          details: {},
        });
        throw new Error('deliberate rollback');
      }),
    ).rejects.toThrow('deliberate rollback');

    const rows = await testDb
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.stream} = ${stream}`);
    expect(rows).toHaveLength(0);
  });
});
