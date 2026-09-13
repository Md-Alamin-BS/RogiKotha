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
    await migrate(db, { migrationsFolder, migrationsTable: 'drizzle_migrations' });
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
