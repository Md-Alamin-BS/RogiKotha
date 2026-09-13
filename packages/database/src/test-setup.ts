// Integration-test bootstrap (task step 16). Runs once per test file's
// setup: resets `DATABASE_URL_TEST` to an empty, freshly migrated schema,
// then exposes `testDb`/`testPool` for the test files to query against.
// `vitest.config.ts` sets `fileParallelism: false` for this project so two
// int test files never reset the same database concurrently.
import { afterAll, beforeAll } from 'vitest';

import './env.js';
import { createDb } from './client.js';
import { runReset } from './reset.js';

const url = process.env.DATABASE_URL_TEST!;

const { db, pool } = createDb(url);
export const testDb = db;
export const testPool = pool;

let reset: Promise<void> | null = null;

beforeAll(async () => {
  reset ??= runReset(url);
  await reset;
}, 60_000);

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
