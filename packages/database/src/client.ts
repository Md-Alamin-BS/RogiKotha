import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema/index.js';

export function createDb(url: string) {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>['db'];
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Runs `fn` inside one transaction; rolls back when `fn` throws or rejects. */
export function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

export async function closeDb(pool: Pool): Promise<void> {
  await pool.end();
}
