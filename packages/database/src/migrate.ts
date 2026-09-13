// `pnpm db:migrate` — applies every migration in `src/migrations` to
// `DATABASE_URL` (the `rk_app`-owned database; T-002 makes `rk_app` the
// database owner, so this connection has DDL rights).
import './env.js';

import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { closeDb, createDb } from './client.js';

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrate(url: string): Promise<void> {
  if (process.env.APP_MODE === 'production') {
    throw new Error('db:migrate refuses to run with APP_MODE=production');
  }
  const { db, pool } = createDb(url);
  try {
    // migrationsSchema defaults to a separate `drizzle` schema if omitted,
    // which then survives `DROP SCHEMA public CASCADE` in reset.ts and lets
    // a later reset skip re-applying migrations it thinks already ran
    // (ISS-092). Keeping the bookkeeping table in `public` means one drop
    // clears both the real tables and the migration history together.
    await migrate(db, {
      migrationsFolder,
      migrationsTable: 'drizzle_migrations',
      migrationsSchema: 'public',
    });
  } finally {
    await closeDb(pool);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runMigrate(process.env.DATABASE_URL!).catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
