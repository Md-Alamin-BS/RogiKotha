// Added by the T-005 **validator**, not by the implementer
// (`04-handoff-and-validation.md` §3.2: "A validator never fixes code. It may
// add test files under the task's test paths and must say so."). See
// `docs/validation/T-005.md`.
//
// Both probes assert the behaviour the specification requires. Neither holds
// today, so both are marked `it.fails` — the run stays green while the
// defect is open, and turns **red** the moment the defect is fixed, which is
// the signal to delete the `.fails` marker and keep the plain assertion.
// Do not "fix" a red result here by weakening the assertion: a red result
// means the ISS row below can be closed.
import { readFileSync } from 'node:fs';

import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { testDb, workerUrlForTestDb } from './test-setup';

describe('T-005 validator probes', () => {
  // ISS-139. `02-data-model.md` §16 lists `evidence_items.original_filename_enc`
  // among `rk_worker`'s **column-level revokes**; `0005_grants_part2.sql`
  // grants the whole table instead, so the worker can read the private
  // filename ciphertext column.
  it.fails('ISS-139: rk_worker cannot read evidence_items.original_filename_enc', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select original_filename_enc from evidence_items limit 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });

  // ISS-141. `fn_block_mutation()`'s escape hatch keys off a plain
  // transaction-local GUC (`rk.audit_expiry`) that any role may set with
  // `set_config()`. `rk_app` holds DELETE on `audit_events` (it owns the
  // table), so the append-only invariant of `02-data-model.md` §10 is one
  // `set_config` call away from being bypassed by the web tier — contrary to
  // `0003_triggers.sql`'s own comment ("every other UPDATE/DELETE ... from
  // every role including the table owner, is still blocked unconditionally").
  it.fails('ISS-141: setting rk.audit_expiry does not let rk_app delete audit_events rows', async () => {
    await testDb.execute(
      sql`insert into audit_events (stream, action, actor, details) values ('validator:iss-141', 'probe', 'system:validator', '{}')`,
    );
    await expect(
      testDb.transaction(async (tx) => {
        await tx.execute(sql`select set_config('rk.audit_expiry', 'on', true)`);
        await tx.execute(sql`delete from audit_events where stream = 'validator:iss-141'`);
      }),
    ).rejects.toThrow(/append_only_violation/i);
  });
});

// CR-006 (FD-041, FD-092): plain probes, not tripwires. Each runs one zero-row
// statement as a real rk_worker session; PostgreSQL checks privileges when the
// statement starts, so a `where false` statement still fails when the
// privilege is missing and still succeeds when it is held. Probe ids follow
// the Unit's functional-spec.md § 11.
const PERMISSION_DENIED = /permission denied/i;

async function asWorker<T>(run: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: workerUrlForTestDb() });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
}

describe('CR-006: rk_worker privilege boundary', () => {
  describe('auth_users and the recipient path (FD-041, FD-071)', () => {
    it('P1: rk_worker cannot read id and email from auth_users', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id, email from auth_users limit 1')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P2: rk_worker cannot read even the id column of auth_users', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id from auth_users limit 1')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P3: the catalogue shows no privilege for rk_worker on auth_users or on any of its columns', async () => {
      // Read the column list as the owner: information_schema hides columns
      // from a role that holds nothing on them, which would make the loop empty.
      const columns = await testDb.execute<{ column_name: string }>(
        sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'auth_users'`,
      );
      const columnNames = columns.rows.map((row) => row.column_name);
      expect(columnNames).toEqual(expect.arrayContaining(['id', 'email']));

      await asWorker(async (pool) => {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
          const { rows } = await pool.query<{ granted: boolean }>(
            `select has_table_privilege('rk_worker', 'public.auth_users', $1) as granted`,
            [privilege],
          );
          expect(rows[0]?.granted, `table ${privilege}`).toBe(false);
        }
        for (const column of columnNames) {
          for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) {
            const { rows } = await pool.query<{ granted: boolean }>(
              `select has_column_privilege('rk_worker', 'public.auth_users', $1, $2) as granted`,
              [column, privilege],
            );
            expect(rows[0]?.granted, `${column} ${privilege}`).toBe(false);
          }
        }
        const { rows } = await pool.query<{ n: number }>(
          `select count(*)::int as n from information_schema.column_privileges
           where grantee = 'rk_worker' and table_schema = 'public' and table_name = 'auth_users'`,
        );
        expect(rows[0]?.n).toBe(0);
      });
    });

    it('P4: rk_worker still cannot read auth_sessions, auth_accounts or auth_verifications', async () => {
      await asWorker(async (pool) => {
        for (const table of ['auth_sessions', 'auth_accounts', 'auth_verifications']) {
          await expect(pool.query(`select 1 from ${table} limit 1`), table).rejects.toThrow(PERMISSION_DENIED);
        }
      });
    });

    it('P5: rk_worker can read a delivery id and its encrypted recipient from email_deliveries', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id, to_email_enc from email_deliveries limit 1')).resolves.toBeDefined();
      });
    });

    it('P6: rk_worker is a member of no other role and cannot switch to rk_app', async () => {
      await asWorker(async (pool) => {
        const { rows } = await pool.query<{ app: boolean; maintenance: boolean; memberships: number }>(
          `select pg_has_role('rk_worker', 'rk_app', 'MEMBER') as app,
                  pg_has_role('rk_worker', 'rk_maintenance', 'MEMBER') as maintenance,
                  (select count(*)::int from pg_auth_members where member = 'rk_worker'::regrole) as memberships`,
        );
        expect(rows[0]).toEqual({ app: false, maintenance: false, memberships: 0 });
        await expect(pool.query('set role rk_app')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P7: no view rk_worker can select and no security-definer function it can execute reads auth_users', async () => {
      await asWorker(async (pool) => {
        const views = await pool.query<{ name: string }>(
          `select c.oid::regclass::text as name
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where c.relkind in ('v', 'm')
             and n.nspname not in ('pg_catalog', 'information_schema')
             and has_table_privilege('rk_worker', c.oid, 'SELECT')
             and pg_get_viewdef(c.oid) ilike '%auth_users%'`,
        );
        expect(views.rows).toEqual([]);
        const functions = await pool.query<{ name: string }>(
          `select p.oid::regprocedure::text as name
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where p.prosecdef
             and n.nspname not in ('pg_catalog', 'information_schema')
             and has_function_privilege('rk_worker', p.oid, 'EXECUTE')
             and p.prosrc ilike '%auth_users%'`,
        );
        expect(functions.rows).toEqual([]);
      });
    });

    it('P8: every journal entry is applied, so 0007 and 0008 were not skipped', async () => {
      const journal = JSON.parse(
        readFileSync(new URL('./migrations/meta/_journal.json', import.meta.url), 'utf8'),
      ) as { entries: { tag: string }[] };
      const applied = await testDb.execute(sql`select id from drizzle_migrations`);
      expect(journal.entries.map((entry) => entry.tag)).toEqual(
        expect.arrayContaining(['0007_revoke_worker_auth_users', '0008_worker_grant_review']),
      );
      expect(applied.rows).toHaveLength(journal.entries.length);
      expect(applied.rows).toHaveLength(9);
    });
  });

  describe('FD-050 rulings (FD-092)', () => {
    it('P10: rk_worker can update the state and deleted_at of a review', async () => {
      await asWorker(async (pool) => {
        await expect(
          pool.query('update reviews set state = state, deleted_at = deleted_at where false'),
        ).resolves.toBeDefined();
      });
    });

    it('P11: rk_worker cannot update any other review column, such as the title', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('update reviews set title = title where false')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P12: rk_worker cannot insert a review version', async () => {
      await asWorker(async (pool) => {
        // The inserted rows come from no table, so only the INSERT privilege is checked.
        await expect(
          pool.query('insert into review_versions (review_id) select null::uuid where false'),
        ).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P13: rk_worker can read and update comments', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id from comments limit 1')).resolves.toBeDefined();
        await expect(pool.query('update comments set state = state where false')).resolves.toBeDefined();
      });
    });

    it('P14: rk_worker cannot delete a comment', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('delete from comments where false')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P15: rk_worker cannot read any reports column, reporter_account_id included', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id, reason from reports limit 1')).rejects.toThrow(PERMISSION_DENIED);
        await expect(pool.query('select reporter_account_id from reports limit 1')).rejects.toThrow(PERMISSION_DENIED);
      });
    });

    it('P16: rk_worker can read the five granted account_profiles columns', async () => {
      await asWorker(async (pool) => {
        await expect(
          pool.query('select id, username, display_name, locale, status from account_profiles limit 1'),
        ).resolves.toBeDefined();
      });
    });

    it('P17: rk_worker cannot read account_profiles.auth_user_id', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select auth_user_id from account_profiles limit 1')).rejects.toThrow(
          PERMISSION_DENIED,
        );
      });
    });

    it('P18: rk_worker can read legal holds', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('select id from legal_holds limit 1')).resolves.toBeDefined();
      });
    });

    it('P19: rk_worker cannot write a legal hold', async () => {
      await asWorker(async (pool) => {
        await expect(pool.query('update legal_holds set released_at = released_at where false')).rejects.toThrow(
          PERMISSION_DENIED,
        );
      });
    });

    it('P20: rk_worker can read an account locale and email preference from account_preferences', async () => {
      await asWorker(async (pool) => {
        await expect(
          pool.query('select account_id, interface_locale, email_moderation from account_preferences limit 1'),
        ).resolves.toBeDefined();
      });
    });
  });
});
