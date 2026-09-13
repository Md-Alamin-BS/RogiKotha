// `pnpm db:reset` — drops and recreates the `public` schema, re-creates the
// extensions the schema depends on, then migrates from empty. Local/test
// use only; refuses to run when `APP_MODE=production`.
import './env.js';

import { fileURLToPath } from 'node:url';

import { Pool } from 'pg';

import { runMigrate } from './migrate.js';

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
