import { createDb, type Db } from '@rogikotha/database';

import { requireEnv } from './env';

// One pool per server process. Next's dev server re-evaluates modules on every edit, so the pool
// lives on `globalThis` to avoid leaking a new set of connections per reload. The commands and the
// auth library share it; `DEFAULT_POOL_OPTIONS` bounds it and times out a wait (ISS-452).
const globalForDb = globalThis as typeof globalThis & { __rkDb?: Db };

/** The shared Drizzle client on `DATABASE_URL`, created on first use (not at import, so builds need no database). */
export function getDb(): Db {
  globalForDb.__rkDb ??= createDb(requireEnv('DATABASE_URL')).db;
  return globalForDb.__rkDb;
}
