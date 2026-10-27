// Integration-test bootstrap, run in every test file: exposes
// `testDb`/`testPool` on `DATABASE_URL_TEST` for the test files to query
// against. The reset to an empty, freshly migrated schema runs once per
// Vitest run in `global-setup.ts` (CR-007), not here: a per-file reset
// repeated the whole drop-and-migrate cycle for every file (ISS-143).
import { afterAll } from 'vitest';

import './env';
import { createDb } from './client';

const url = process.env.DATABASE_URL_TEST!;

const { db, pool } = createDb(url);
export const testDb = db;
export const testPool = pool;

afterAll(async () => {
  await pool.end();
});

/** `DATABASE_URL_TEST` with its credentials swapped for `rk_worker`'s. */
export function workerUrlForTestDb(): string {
  const u = new URL(url);
  u.username = 'rk_worker';
  u.password = 'rk_worker';
  return u.toString();
}
