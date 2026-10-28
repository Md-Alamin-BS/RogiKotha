// Vitest `globalSetup` for the `database` project (CR-007, ISS-143). Resets
// `DATABASE_URL_TEST` to an empty, freshly migrated schema once per Vitest
// run, before any test file starts, so no file's pool is open yet when the
// stale-backend sweep runs. Test files only open their pools (`test-setup.ts`).
import './env';

import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

import { isTestDatabaseName, runReset } from './reset';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseReset: { database: string; publicSchemaOid: number };
  }
}

async function readPublicSchemaOid(url: string): Promise<number> {
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<{ oid: string }>(
      `select oid::text as oid from pg_namespace where nspname = 'public'`,
    );
    return Number(rows[0]?.oid);
  } finally {
    await pool.end();
  }
}

export default async function setup(project: TestProject): Promise<void> {
  const url = process.env.DATABASE_URL_TEST;
  if (url === undefined || url === '') {
    throw new Error(
      'DATABASE_URL_TEST is not set; the database project needs its own test database',
    );
  }
  const database = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!isTestDatabaseName(database)) {
    throw new Error(
      `DATABASE_URL_TEST names "${database}"; the database project only resets a database whose name ends in _test or _test_b`,
    );
  }
  await runReset(url, { terminateStaleBackends: true });
  project.provide('databaseReset', { database, publicSchemaOid: await readPublicSchemaOid(url) });
}
