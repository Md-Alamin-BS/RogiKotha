// `pnpm db:reset` — drops the `pgboss` and `public` schemas together,
// recreates `public` and the extensions it depends on, then migrates from
// empty (which reinstalls `pgboss` as `rk_app` and re-grants `rk_worker`).
// Local/test use only; refuses to run when `APP_MODE=production`.
import './env';

import { fileURLToPath } from 'node:url';

import { Pool, type PoolClient } from 'pg';

import { runMigrate } from './migrate';

// CR-007 (ISS-143): without these a DROP queued behind an `idle in
// transaction` backend waited forever, and Vitest's hook timeout cannot
// cancel a pg query that is already waiting on a lock.
const LOCK_TIMEOUT = '10s';
const DROP_STATEMENT_TIMEOUT = '60s';

const TEST_DATABASE_NAME = /_test(_b)?$/;

/** True only for a database name ending in `_test` or `_test_b`. */
export function isTestDatabaseName(name: string): boolean {
  return TEST_DATABASE_NAME.test(name);
}

export interface BackendInfo {
  pid: number;
  role: string | null;
  application: string | null;
  state: string | null;
}

export type SweepResult = { ok: true; terminated: BackendInfo[] } | { ok: false; reason: string };

export interface ResetOptions {
  /** End this role's other backends on the database first. Test databases only. */
  terminateStaleBackends?: boolean;
}

// The name check is repeated in SQL so the statement matches no row on any
// other database, whatever the URL says.
const SWEEP_SQL = `
  select pid, usename as role, application_name as application, state,
         pg_terminate_backend(pid, 5000) as terminated
  from pg_stat_activity
  where datname = current_database()
    and current_database() ~ '_test(_b)?$'
    and pid <> pg_backend_pid()
    and backend_type = 'client backend'
    and pg_has_role(usesysid, 'MEMBER')
  order by pid`;

// The schemas the reset drops, in one transaction (CR-011, BR4.1).
const DROPPED_SCHEMAS = ['pgboss', 'public'] as const;

// Every granted lock on a dropped schema itself or on a relation inside it
// conflicts with the ACCESS EXCLUSIVE locks `DROP SCHEMA ... CASCADE` needs.
// Matched by name, so a schema that does not exist matches nothing (BR4.3).
const LOCK_HOLDERS_SQL = `
  select distinct l.pid, a.usename as role, a.application_name as application, a.state
  from pg_locks l
  left join pg_stat_activity a on a.pid = l.pid
  left join pg_class c on l.locktype = 'relation' and c.oid = l.relation
  left join pg_namespace rn on rn.oid = c.relnamespace
  left join pg_namespace ln on l.locktype = 'object'
                           and l.classid = 'pg_namespace'::regclass::oid
                           and ln.oid = l.objid
  where l.granted
    and l.pid <> pg_backend_pid()
    and l.database = (select oid from pg_database where datname = current_database())
    and (rn.nspname = any($1::text[]) or ln.nspname = any($1::text[]))
  order by l.pid`;

function databaseNameOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

function describeBackends(backends: BackendInfo[]): string {
  return backends
    .map(
      (b) =>
        `pid ${b.pid} (role ${b.role ?? 'unknown'}, application "${b.application ?? ''}", state ${b.state ?? 'unknown'})`,
    )
    .join(', ');
}

/**
 * Ends every other client backend on the database that the connecting role
 * may signal. Refuses, without opening a connection, unless the database
 * name ends in `_test` or `_test_b`.
 */
export async function terminateStaleTestBackends(url: string): Promise<SweepResult> {
  const name = databaseNameOf(url);
  if (!isTestDatabaseName(name)) {
    return {
      ok: false,
      reason: `refusing to end backends on database "${name}": only a database whose name ends in _test or _test_b may be swept`,
    };
  }
  const pool = new Pool({ connectionString: url });
  try {
    const { rows } = await pool.query<BackendInfo & { terminated: boolean }>(SWEEP_SQL);
    return {
      ok: true,
      terminated: rows
        .filter((r) => r.terminated)
        .map(({ pid, role, application, state }) => ({ pid, role, application, state })),
    };
  } finally {
    await pool.end();
  }
}

/** `url` with `lock_timeout` set for every session opened from it. */
function withLockTimeout(url: string): string {
  const u = new URL(url);
  const existing = u.searchParams.get('options');
  const setting = `-c lock_timeout=${LOCK_TIMEOUT}`;
  u.searchParams.set('options', existing ? `${existing} ${setting}` : setting);
  return u.toString();
}

function isLockOrStatementTimeout(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  // 55P03 lock_not_available (lock_timeout), 57014 query_canceled (statement_timeout).
  return code === '55P03' || code === '57014';
}

// Both schemas or neither: dropping `pgboss` alone would leave
// `0006_pgboss_grants.sql` recorded as applied in `public`, so the reinstalled
// schema would get no `rk_worker` grants (BR4.1, BR4.4).
async function dropSchemas(client: PoolClient): Promise<void> {
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL statement_timeout = '${DROP_STATEMENT_TIMEOUT}'`);
    // IF EXISTS: a run killed while its DROP was queued leaves that DROP to
    // run later on the server, so a schema can already be gone (ISS-244).
    for (const schema of DROPPED_SCHEMAS) {
      await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (!isLockOrStatementTimeout(error)) {
      throw error;
    }
    // The blockers still hold their locks, so they can be named now.
    const { rows } = await client.query<BackendInfo>(LOCK_HOLDERS_SQL, [DROPPED_SCHEMAS]);
    const blockers =
      rows.length > 0
        ? `blocked by backend ${describeBackends(rows)}`
        : 'the backend holding the lock could not be identified';
    throw new Error(
      `db:reset could not lock schemas ${DROPPED_SCHEMAS.join(' and ')} within lock_timeout ${LOCK_TIMEOUT}; ${blockers}`,
      { cause: error },
    );
  }
}

export async function runReset(url: string, options: ResetOptions = {}): Promise<void> {
  if (process.env.APP_MODE === 'production') {
    throw new Error('db:reset refuses to run with APP_MODE=production');
  }
  if (options.terminateStaleBackends === true) {
    const sweep = await terminateStaleTestBackends(url);
    if (!sweep.ok) {
      throw new Error(`db:reset ${sweep.reason}`);
    }
    if (sweep.terminated.length > 0) {
      console.warn(
        `db:reset ended ${sweep.terminated.length} stale backend(s) on ${databaseNameOf(url)}: ${describeBackends(sweep.terminated)}`,
      );
    }
  }
  const guardedUrl = withLockTimeout(url);
  const pool = new Pool({ connectionString: guardedUrl });
  try {
    const client = await pool.connect();
    try {
      await dropSchemas(client);
    } finally {
      client.release();
    }
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
  await runMigrate(guardedUrl);
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  runReset(process.env.DATABASE_URL!).catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
