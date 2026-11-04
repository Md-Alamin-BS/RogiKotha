import { Pool, type PoolConfig } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from './schema/index';

/**
 * ISS-452: a bounded pool that gives up on a busy pool instead of waiting for ever, so running out
 * of connections fails the request (`internal`) and the process keeps answering.
 */
export const DEFAULT_POOL_OPTIONS = {
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
} as const satisfies PoolConfig;

export type PoolOptions = Pick<PoolConfig, 'max' | 'connectionTimeoutMillis' | 'idleTimeoutMillis'>;

export function createDb(url: string, options: PoolOptions = {}) {
  const pool = new Pool({ ...DEFAULT_POOL_OPTIONS, ...options, connectionString: url });
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
