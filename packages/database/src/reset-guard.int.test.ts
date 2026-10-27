// CR-007 (ISS-143) regression tests: the test database is reset once per run
// in `global-setup.ts`, a blocked `DROP SCHEMA` fails fast and names the
// backend holding the lock, and the stale-backend sweep can never run
// against a database that is not a test database.
import { performance } from 'node:perf_hooks';

import { sql } from 'drizzle-orm';
import { Client } from 'pg';
import { describe, expect, inject, it } from 'vitest';

import { isTestDatabaseName, runReset, terminateStaleTestBackends } from './reset';
import { testDb, workerUrlForTestDb } from './test-setup';

const testUrl = process.env.DATABASE_URL_TEST!;

async function publicSchemaOid(): Promise<number> {
  const result = await testDb.execute<{ oid: string }>(
    sql`select oid::text as oid from pg_namespace where nspname = 'public'`,
  );
  return Number(result.rows[0]?.oid);
}

/** `DATABASE_URL_TEST` pointed at a port nothing listens on, under another database name. */
function unreachableUrlFor(database: string): string {
  const u = new URL(testUrl);
  u.hostname = '127.0.0.1';
  u.port = '1';
  u.pathname = `/${database}`;
  return u.toString();
}

/** A connection that ignores the error event its own termination raises. */
async function openClient(url: string): Promise<{ client: Client; pid: number }> {
  const client = new Client({ connectionString: url });
  client.on('error', () => undefined);
  await client.connect();
  const { rows } = await client.query<{ pid: number }>('select pg_backend_pid() as pid');
  return { client, pid: rows[0]!.pid };
}

// Read during collection, before the setup file's hooks run: a reset in those
// hooks would replace the `public` schema and change its oid.
const oidBeforeFileSetup = await publicSchemaOid();

describe('one reset per run', () => {
  it('the global setup reset the test database before any file ran', () => {
    const reset = inject('databaseReset');
    expect(reset.database).toBe(new URL(testUrl).pathname.slice(1));
    expect(isTestDatabaseName(reset.database)).toBe(true);
    expect(reset.publicSchemaOid).toBeGreaterThan(0);
  });

  it("this file's setup hooks did not reset the schema again", async () => {
    expect(await publicSchemaOid()).toBe(oidBeforeFileSetup);
  });
});

describe('terminateStaleTestBackends', () => {
  it('accepts only database names that end in _test or _test_b', () => {
    expect(isTestDatabaseName('rogikotha_test')).toBe(true);
    expect(isTestDatabaseName('rogikotha_test_b')).toBe(true);
    expect(isTestDatabaseName('rogikotha')).toBe(false);
    expect(isTestDatabaseName('rogikotha_test_old')).toBe(false);
    expect(isTestDatabaseName('rogikotha_testing')).toBe(false);
    expect(isTestDatabaseName('test')).toBe(false);
  });

  it('refuses the development database rogikotha without opening a connection', async () => {
    // A connection attempt to port 1 would fail with ECONNREFUSED instead.
    const result = await terminateStaleTestBackends(unreachableUrlFor('rogikotha'));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toMatch(/refusing to end backends on database "rogikotha"/);
  });

  it('runReset with the sweep refuses a non-test database before touching it', async () => {
    await expect(
      runReset(unreachableUrlFor('rogikotha'), { terminateStaleBackends: true }),
    ).rejects.toThrow(/refusing to end backends on database "rogikotha"/);
  });

  it('ends a stale backend of the connecting role on the test database', async () => {
    // Swept as rk_worker so the sweep cannot reach this file's own rk_app pool.
    const stale = await openClient(workerUrlForTestDb());
    try {
      await stale.client.query('BEGIN');
      const result = await terminateStaleTestBackends(workerUrlForTestDb());
      expect(result.ok && result.terminated.map((b) => b.pid)).toContain(stale.pid);
      await expect(stale.client.query('select 1')).rejects.toThrow();
    } finally {
      await stale.client.end().catch(() => undefined);
    }
  });
});

describe('runReset under lock contention', () => {
  it(
    'rejects within 15 s with a lock-timeout error naming the backend that holds the lock',
    async () => {
      // rk_worker's backend is one the rk_app reset could not end even with the sweep on.
      const blocker = await openClient(workerUrlForTestDb());
      try {
        await blocker.client.query('BEGIN');
        await blocker.client.query('select 1 from outbox_events limit 1');
        const started = performance.now();
        await expect(runReset(testUrl)).rejects.toThrow(
          new RegExp(`lock_timeout 10s; blocked by backend pid ${blocker.pid} \\(role rk_worker`),
        );
        expect(performance.now() - started).toBeLessThan(15_000);
      } finally {
        await blocker.client.query('ROLLBACK').catch(() => undefined);
        await blocker.client.end();
      }
      // The failed DROP rolled back: the schema this file started with is still there.
      expect(await publicSchemaOid()).toBe(oidBeforeFileSetup);
    },
    30_000,
  );
});
