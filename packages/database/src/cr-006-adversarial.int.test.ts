// CR-006 high-risk step 5: adversarial regression tests, written by a separate
// agent from the implementer. Each test tries one way rk_worker's boundary on
// auth_users could be widened by a later migration. They issue only catalogue
// reads and zero-row statements, except test 5, which re-runs the migrator.
// See code-generation/adversarial-tests.md in the Unit's record.
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { runMigrate } from './migrate';
import { testDb, workerUrlForTestDb } from './test-setup';

const PERMISSION_DENIED = /permission denied/i;
const TABLE_PRIVILEGES = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'TRUNCATE',
  'REFERENCES',
  'TRIGGER',
  'MAINTAIN',
];
const COLUMN_PRIVILEGES = ['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'];
const SYSTEM_SCHEMAS = `('pg_catalog', 'information_schema', 'pg_toast')`;

async function asWorker<T>(run: (pool: Pool) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: workerUrlForTestDb() });
  try {
    return await run(pool);
  } finally {
    await pool.end();
  }
}

describe('CR-006 adversarial: rk_worker cannot be widened by mistake', () => {
  it('rk_worker has no elevated attribute, no role membership, owns nothing and cannot switch role', async () => {
    await asWorker(async (pool) => {
      const role = await pool.query<Record<string, boolean>>(
        `select rolsuper, rolcreaterole, rolcreatedb, rolreplication, rolbypassrls
         from pg_roles where rolname = 'rk_worker'`,
      );
      expect(role.rows).toEqual([
        {
          rolsuper: false,
          rolcreaterole: false,
          rolcreatedb: false,
          rolreplication: false,
          rolbypassrls: false,
        },
      ]);

      // Covers predefined roles too, such as pg_read_all_data.
      const memberships = await pool.query<{ role: string }>(
        `select roleid::regrole::text as role from pg_auth_members where member = 'rk_worker'::regrole`,
      );
      expect(memberships.rows).toEqual([]);

      // An owner holds every privilege on its object regardless of grants.
      const owned = await pool.query<{ n: number }>(
        `select (select count(*) from pg_class where relowner = 'rk_worker'::regrole)
              + (select count(*) from pg_namespace where nspowner = 'rk_worker'::regrole)
              + (select count(*) from pg_proc where proowner = 'rk_worker'::regrole)
              + (select count(*) from pg_type where typowner = 'rk_worker'::regrole) as n`,
      );
      expect(Number(owned.rows[0]?.n)).toBe(0);

      const create = await pool.query<{ schema: string }>(
        `select nspname as schema from pg_namespace where has_schema_privilege('rk_worker', oid, 'CREATE')`,
      );
      expect(create.rows).toEqual([]);
      const database = await pool.query<{ granted: boolean }>(
        `select has_database_privilege('rk_worker', current_database(), 'CREATE') as granted`,
      );
      expect(database.rows[0]?.granted).toBe(false);

      for (const target of ['rk_app', 'rk_maintenance', 'postgres']) {
        await expect(pool.query(`set role ${target}`), target).rejects.toThrow(PERMISSION_DENIED);
      }
    });
  });

  it('PUBLIC holds no table or column privilege on auth_users, reports, review_versions or any other table', async () => {
    await asWorker(async (pool) => {
      for (const table of ['public.auth_users', 'public.reports', 'public.review_versions']) {
        for (const privilege of TABLE_PRIVILEGES) {
          const { rows } = await pool.query<{ granted: boolean }>(
            `select has_table_privilege('public', $1, $2) as granted`,
            [table, privilege],
          );
          expect(rows[0]?.granted, `PUBLIC ${privilege} on ${table}`).toBe(false);
        }
        const columns = await pool.query<{ name: string }>(
          `select attname as name from pg_attribute
           where attrelid = $1::regclass and attnum > 0 and not attisdropped`,
          [table],
        );
        expect(columns.rows.length, `${table} has columns`).toBeGreaterThan(0);
        for (const { name } of columns.rows) {
          for (const privilege of COLUMN_PRIVILEGES) {
            const { rows } = await pool.query<{ granted: boolean }>(
              `select has_column_privilege('public', $1, $2, $3) as granted`,
              [table, name, privilege],
            );
            expect(rows[0]?.granted, `PUBLIC ${privilege} on ${table}.${name}`).toBe(false);
          }
        }
      }

      // Grantee oid 0 is PUBLIC in an exploded ACL.
      const tableGrants = await pool.query<{ grant: string }>(
        `select c.oid::regclass::text || ' ' || a.privilege_type as grant
         from pg_class c join pg_namespace n on n.oid = c.relnamespace, aclexplode(c.relacl) a
         where n.nspname in ('public', 'pgboss') and a.grantee = 0`,
      );
      expect(tableGrants.rows).toEqual([]);
      const columnGrants = await pool.query<{ grant: string }>(
        `select c.oid::regclass::text || '.' || t.attname || ' ' || a.privilege_type as grant
         from pg_attribute t
         join pg_class c on c.oid = t.attrelid
         join pg_namespace n on n.oid = c.relnamespace, aclexplode(t.attacl) a
         where n.nspname in ('public', 'pgboss') and a.grantee = 0`,
      );
      expect(columnGrants.rows).toEqual([]);
    });
  });

  it('no view, security-definer function or default privilege gives rk_worker a way round the auth_users revoke', async () => {
    await asWorker(async (pool) => {
      // Views run with their owner's privileges, so a granted view over auth_users bypasses the revoke.
      const views = await pool.query<{ name: string }>(
        `select c.oid::regclass::text as name
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where c.relkind in ('v', 'm')
           and n.nspname not in ${SYSTEM_SCHEMAS}
           and has_table_privilege('rk_worker', c.oid, 'SELECT')
           and (pg_get_viewdef(c.oid) ilike '%auth_users%'
                or exists (select 1 from pg_rewrite r join pg_depend d
                             on d.classid = 'pg_rewrite'::regclass and d.objid = r.oid
                           where r.ev_class = c.oid
                             and d.refclassid = 'pg_class'::regclass
                             and d.refobjid = 'public.auth_users'::regclass))`,
      );
      expect(views.rows).toEqual([]);

      // fn_expire_audit is the one ruled exception (0003_triggers.sql); any new one must be reviewed.
      const definers = await pool.query<{ name: string; readsAuthUsers: boolean }>(
        `select p.oid::regprocedure::text as name, p.prosrc ilike '%auth_users%' as "readsAuthUsers"
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where p.prosecdef
           and n.nspname not in ${SYSTEM_SCHEMAS}
           and has_function_privilege('rk_worker', p.oid, 'EXECUTE')`,
      );
      expect(definers.rows).toEqual([
        { name: 'fn_expire_audit(timestamp with time zone)', readsAuthUsers: false },
      ]);

      // A trigger function fires without an EXECUTE check on the session role.
      const definerTriggers = await pool.query<{ name: string }>(
        `select t.tgrelid::regclass::text || ' ' || p.oid::regprocedure::text as name
         from pg_trigger t join pg_proc p on p.oid = t.tgfoid
         where not t.tgisinternal and p.prosecdef`,
      );
      expect(definerTriggers.rows).toEqual([]);

      // defaclnamespace 0 is a database-wide default that also covers public.
      const defaults = await pool.query<{ rule: string }>(
        `select case when d.defaclnamespace = 0 then '(all schemas)' else d.defaclnamespace::regnamespace::text end
                || ' ' || d.defaclobjtype::text
                || ' ' || a.privilege_type as rule
         from pg_default_acl d, aclexplode(d.defaclacl) a
         where a.grantee = 'rk_worker'::regrole
           and (d.defaclnamespace = 0 or d.defaclnamespace = 'public'::regnamespace)`,
      );
      expect(defaults.rows).toEqual([]);
    });
  });

  it('every email-named column rk_worker can read in public is bytea ciphertext or a boolean flag, never text', async () => {
    // Read the columns as the owner: the worker cannot see columns it holds nothing on.
    const columns = await testDb.execute<{ table_name: string; column_name: string; type: string }>(
      sql`select c.relname as table_name, a.attname as column_name, format_type(a.atttypid, a.atttypmod) as type
          from pg_attribute a
          join pg_class c on c.oid = a.attrelid
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
            and a.attnum > 0 and not a.attisdropped and a.attname ilike '%email%'`,
    );
    expect(columns.rows.length).toBeGreaterThan(0);

    const readable = await asWorker(async (pool) => {
      const result: { column: string; type: string }[] = [];
      for (const row of columns.rows) {
        const { rows } = await pool.query<{ granted: boolean }>(
          `select has_column_privilege('rk_worker', format('public.%I', $1::text), $2, 'SELECT') as granted`,
          [row.table_name, row.column_name],
        );
        if (rows[0]?.granted)
          result.push({ column: `${row.table_name}.${row.column_name}`, type: row.type });
      }
      return result;
    });

    // Guards against a vacuous pass: the recipient ciphertext must be among the readable columns.
    expect(readable).toContainEqual({ column: 'email_deliveries.to_email_enc', type: 'bytea' });
    expect(readable.filter(({ type }) => type !== 'bytea' && type !== 'boolean')).toEqual([]);
  });

  it('re-running the migrator on the migrated database leaves rk_worker without any privilege on auth_users', async () => {
    const url = process.env.DATABASE_URL_TEST;
    if (!url) throw new Error('DATABASE_URL_TEST is not set');
    const before = await testDb.execute<{ hash: string }>(
      sql`select hash from drizzle_migrations order by id`,
    );

    await runMigrate(url);

    const after = await testDb.execute<{ hash: string }>(
      sql`select hash from drizzle_migrations order by id`,
    );
    expect(after.rows).toEqual(before.rows);

    await asWorker(async (pool) => {
      const granted = await pool.query<{ grant: string }>(
        `select 'table ' || p as grant from unnest($1::text[]) p
         where has_table_privilege('rk_worker', 'public.auth_users', p)
         union all
         select a.attname || ' ' || p from pg_attribute a, unnest($2::text[]) p
         where a.attrelid = 'public.auth_users'::regclass and a.attnum > 0 and not a.attisdropped
           and has_column_privilege('rk_worker', 'public.auth_users', a.attname, p)`,
        [TABLE_PRIVILEGES, COLUMN_PRIVILEGES],
      );
      expect(granted.rows).toEqual([]);
      await expect(pool.query('select email from auth_users where false')).rejects.toThrow(
        PERMISSION_DENIED,
      );
    });
  }, 60_000);
});
