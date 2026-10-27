// `pnpm db:reset` — drops and recreates the `public` schema, re-creates the
// extensions the schema depends on, then migrates from empty. Local/test
// use only; refuses to run when `APP_MODE=production`.
import './env';

import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';

import { runMigrate } from './migrate';

export async function runReset(url: string): Promise<void> {
  if (process.env.APP_MODE === 'production') {
    throw new Error('db:reset refuses to run with APP_MODE=production');
  }
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await pool.query('CREATE EXTENSION IF NOT EXISTS citext');
    await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    // Defensive cleanup for ISS-092: migrate.ts now keeps drizzle-orm's
    // migration bookkeeping table inside `public` (so this same DROP wipes
    // it too), but a database reset before that fix landed can still have a
    // stray `drizzle` schema left over with hashes recorded against tables
    // this DROP just removed — which would make migrate() skip re-applying
    // them. Clear it every time so a reset is always a true reset.
    await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
  } finally {
    await pool.end();
  }
  await runMigrate(url);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runReset(process.env.DATABASE_URL!).catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
