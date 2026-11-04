// Implemented, not stubbed (task step 13) — T-009's worker skeleton needs a
// real outbox relay the moment its migration lands. It implements the
// application `Outbox` port (T-101); the relay methods below stay local.
//
// CR-011 (FD-038, ISS-144, ISS-185): the relay's operations run on the relay
// transaction's own connection (`SqlExecutor`), so claiming, enqueuing and
// marking commit or roll back together.
import type { Outbox, Tx as AppTx } from '@rogikotha/application';
import { count, isNull } from 'drizzle-orm';

import type { Db, Tx } from '../client';
import { outboxEvents } from '../schema/index';
import type { SqlExecutor } from '../queue/sql-executor';
import { executorOf } from '../unit-of-work';

export interface OutboxRow {
  id: string;
  name: string;
  payload: unknown;
  createdAt: Date;
  processedAt: Date | null;
  attempts: number;
}

interface OutboxRecord {
  id: string;
  name: string;
  payload: unknown;
  created_at: Date;
  processed_at: Date | null;
  attempts: number;
}

const CLAIM_SQL = `
  select id, name, payload, created_at, processed_at, attempts
  from outbox_events
  where processed_at is null
  order by created_at asc
  limit $1
  for update skip locked`;

function toOutboxRow(record: OutboxRecord): OutboxRow {
  return {
    id: record.id,
    name: record.name,
    payload: record.payload,
    createdAt: record.created_at,
    processedAt: record.processed_at,
    attempts: record.attempts,
  };
}

export class PgOutbox implements Outbox {
  /**
   * Appended in the same transaction as the change it announces. Takes the application's opaque
   * `Tx` (commands) or a Drizzle transaction (the relay's tests); both are the same object.
   */
  async append(tx: AppTx | Tx, name: string, payload: object): Promise<void> {
    await executorOf(tx as AppTx)
      .insert(outboxEvents)
      .values({ name, payload });
  }

  /**
   * Locks up to `limit` unprocessed rows, oldest first, skipping rows another
   * transaction holds, and leaves them unprocessed: they stay locked until the
   * caller's transaction ends, and a rollback makes them claimable again (BR1.2).
   */
  async claimUnprocessed(sql: SqlExecutor, limit: number): Promise<OutboxRow[]> {
    const { rows } = await sql.executeSql(CLAIM_SQL, [limit]);
    return (rows as OutboxRecord[]).map(toOutboxRow);
  }

  async markProcessed(sql: SqlExecutor, id: string): Promise<void> {
    await sql.executeSql('update outbox_events set processed_at = now() where id = $1', [id]);
  }

  /** Adds one failed attempt and returns the new count. */
  async recordFailedAttempt(sql: SqlExecutor, id: string): Promise<number> {
    const { rows } = await sql.executeSql(
      'update outbox_events set attempts = attempts + 1 where id = $1 returning attempts',
      [id],
    );
    const updated = (rows as { attempts: number }[])[0];
    if (updated === undefined) {
      throw new Error(`outbox event ${id} not found`);
    }
    return updated.attempts;
  }

  /** Ends retrying: processed with no job, told apart by its attempts and the `outbox.dead` log (BR1.6). */
  async markDead(sql: SqlExecutor, id: string): Promise<void> {
    await sql.executeSql('update outbox_events set processed_at = now() where id = $1', [id]);
  }

  /** Rows not yet relayed; dead events count as processed, because `markDead` sets `processed_at`. */
  async countPending(db: Db): Promise<number> {
    const [row] = await db
      .select({ pending: count() })
      .from(outboxEvents)
      .where(isNull(outboxEvents.processedAt));
    return row?.pending ?? 0;
  }
}
