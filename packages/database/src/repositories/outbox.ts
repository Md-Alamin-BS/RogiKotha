// Implemented, not stubbed (task step 13) — T-009's worker skeleton needs a
// real outbox relay the moment its migration lands. `application`'s
// `Outbox`/`JobQueue` ports do not exist yet; this class gets an
// `implements` clause when they do (T-009 onward), same as every other
// repository in this package.
import { eq, inArray, sql } from 'drizzle-orm';

import type { Db, Tx } from '../client.js';
import { outboxEvents } from '../schema/index.js';

export interface OutboxRow {
  id: string;
  name: string;
  payload: unknown;
  createdAt: Date;
  processedAt: Date | null;
  attempts: number;
}

export class PgOutbox {
  /** Appended in the same transaction as the change it announces. */
  async append(tx: Tx, name: string, payload: Record<string, unknown>): Promise<void> {
    await tx.insert(outboxEvents).values({ name, payload });
  }

  /**
   * Locks up to `limit` unprocessed rows (`FOR UPDATE SKIP LOCKED` — so two
   * concurrent relays never claim the same row), marks them processed in
   * the same transaction, and returns them. A row a `markFailed` call later
   * resets to unprocessed can be claimed again.
   */
  async claimBatch(db: Db, limit: number): Promise<OutboxRow[]> {
    return db.transaction(async (tx) => {
      const claimed = await tx.execute<{ id: string }>(sql`
        select id from ${outboxEvents}
        where ${outboxEvents.processedAt} is null
        order by ${outboxEvents.createdAt} asc
        limit ${limit}
        for update skip locked
      `);
      const ids = claimed.rows.map((r) => r.id);
      if (ids.length === 0) {
        return [];
      }
      const rows = await tx
        .update(outboxEvents)
        .set({ processedAt: sql`now()` })
        .where(inArray(outboxEvents.id, ids))
        .returning();
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        payload: r.payload,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
        attempts: r.attempts,
      }));
    });
  }

  /** Idempotent explicit confirmation — a no-op if `claimBatch` already marked the row. */
  async markProcessed(db: Db, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    await db
      .update(outboxEvents)
      .set({ processedAt: sql`now()` })
      .where(inArray(outboxEvents.id, ids));
  }

  /** Resets the row to unprocessed and records the retry so a later `claimBatch` picks it up again. */
  async markFailed(db: Db, id: string): Promise<void> {
    await db
      .update(outboxEvents)
      .set({ processedAt: null, attempts: sql`${outboxEvents.attempts} + 1` })
      .where(eq(outboxEvents.id, id));
  }
}
