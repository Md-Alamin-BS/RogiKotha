# CR-006 adversarial tests (high-risk step 5)

A separate agent, not the implementer, wrote these tests for Unit U5 `cr-006-worker-auth-users-grant`. They are regression tests for the least-privilege boundary of `rk_worker`. Each one checks a likely way a later migration could widen that boundary by mistake.

- File: `packages/database/src/cr-006-adversarial.int.test.ts` (5 tests). No other file was changed.
- Method: the tests run catalogue reads and zero-row statements as a real `rk_worker` session against `rogikotha_test`, which the test setup resets from empty. Test 4 reads the column list as the owner, because `rk_worker` cannot see columns it holds nothing on. Test 5 runs the migrator again.
- Date: 2026-10-28. PostgreSQL 18.6 (compose).

## Results

| # | Test | What it guards | Result | Evidence | Goes red when |
|---|---|---|---|---|---|
| 1 | rk_worker has no elevated attribute, no role membership, owns nothing and cannot switch role | `rk_worker` cannot inherit or assume broader rights: it is not superuser and has no CREATEROLE, CREATEDB, REPLICATION or BYPASSRLS. It has no row in `pg_auth_members`, including predefined roles such as `pg_read_all_data`. It owns no relation, schema, function or type. It has no CREATE on any schema or on the database. `SET ROLE` to `rk_app`, `rk_maintenance` and `postgres` is refused. | held | Catalogue: all attributes `false`, 0 memberships, 0 owned objects, 0 schemas with CREATE, database CREATE `false`. `set role postgres` returns `permission denied to set role`. | Any of: `ALTER ROLE rk_worker BYPASSRLS` (or CREATEROLE, and so on), `GRANT rk_app TO rk_worker`, `GRANT pg_read_all_data TO rk_worker`, `ALTER TABLE … OWNER TO rk_worker`, `GRANT CREATE ON SCHEMA public TO rk_worker`, `GRANT CREATE ON DATABASE … TO rk_worker`. |
| 2 | PUBLIC holds no table or column privilege on auth_users, reports, review_versions or any other table | No PUBLIC grant can get around the revoke. All 8 table privileges (MAINTAIN included) and all 4 column privileges are checked for `PUBLIC` on every column of the three tables. A second check covers the whole `public` and `pgboss` schemas: no exploded table or column ACL entry has grantee 0 (PUBLIC). | held | Each `has_table_privilege('public', …)` and `has_column_privilege('public', …)` check returns `false`. 0 PUBLIC ACL entries in `public` or `pgboss`. | `GRANT SELECT ON auth_users TO PUBLIC`, `GRANT SELECT (email) ON auth_users TO PUBLIC`, or any PUBLIC grant on a table in `public` or `pgboss`. |
| 3 | no view, security-definer function or default privilege gives rk_worker a way round the auth_users revoke | (a) No view or materialized view that `rk_worker` can select reads `auth_users`, detected both by `pg_get_viewdef` text and by `pg_depend`. (b) The set of SECURITY DEFINER functions `rk_worker` can execute is exactly `fn_expire_audit(timestamp with time zone)`, and its body does not mention `auth_users`. (c) No SECURITY DEFINER function is attached as a trigger, because a trigger fires without an EXECUTE check on the session role. (d) No `pg_default_acl` entry in `public` or database-wide (`defaclnamespace = 0`) grants anything to `rk_worker`, so a future table stays denied. | held | 0 views. Definer set = `[fn_expire_audit]`, which does not read auth_users. 0 definer triggers. 0 default-ACL rules. The only `rk_worker` default ACLs are in `pgboss`, which is expected (`0006_pgboss_grants.sql`). | A granted view over `auth_users`, any new SECURITY DEFINER function executable by `rk_worker` (even one that does not read `auth_users`, because it widens the reviewed set), a SECURITY DEFINER trigger function, or `ALTER DEFAULT PRIVILEGES FOR ROLE rk_app [IN SCHEMA public] GRANT … TO rk_worker`. |
| 4 | every email-named column rk_worker can read in public is bytea ciphertext or a boolean flag, never text | No address reaches the worker in plain text through a column other than `auth_users.email` (FD-071). The test lists every `%email%` column in `public` (tables, views, matviews, foreign tables) and asserts that each one `rk_worker` can SELECT is `bytea` or `boolean`. It also asserts that `email_deliveries.to_email_enc` (bytea) is among them, so the test cannot pass with an empty list. | held | Readable: `email_deliveries.to_email_enc` (bytea) and `account_preferences.email_security`, `email_moderation`, `email_evidence`, `email_discussion` (boolean). Not readable: `auth_users.email` (text) and `email_verified`. | Adding a text, varchar, citext or jsonb `%email%` column to a worker-readable table. `email_deliveries` is a whole-table grant, so a new column there is readable by `rk_worker` at once. Re-granting `auth_users (email)` also turns it red. |
| 5 | re-running the migrator on the migrated database leaves rk_worker without any privilege on auth_users | `runMigrate(DATABASE_URL_TEST)` runs again on the already-migrated database: the pg-boss install, then the Drizzle migrator. The recorded migration hashes stay identical, `rk_worker` holds no table or column privilege on `auth_users`, and `select email from auth_users where false` is still denied. | held | Hashes before = after (9 rows). 0 privileges. `permission denied` on the zero-row select. | A new or changed migration or install step that re-grants on every run, for example `GRANT SELECT ON ALL TABLES IN SCHEMA public TO rk_worker`, or a change to `installPgBoss` that grants on `public`. Also red if the migrator stops recognising applied migrations (the ISS-092 class): the re-application fails or the hash list changes. |

## Mutation check

Tests 2, 3 and 4 were also shown to fail. Their detection queries ran inside one `BEGIN … ROLLBACK` transaction as `rk_app` on `rogikotha_test`, with these mutations applied:

- `GRANT SELECT (email) ON auth_users TO PUBLIC`
- a view `v_mut` over `auth_users`, granted to `rk_worker`
- a SECURITY DEFINER function `f_mut()` granted to `rk_worker`
- `ALTER DEFAULT PRIVILEGES … IN SCHEMA public GRANT SELECT ON TABLES TO rk_worker`
- `ALTER TABLE email_deliveries ADD to_email_plain text`

Every mutation was detected: PUBLIC column grant `t` (1 ACL entry), view `v_mut`, the extra definer `f_mut()`, 1 default-ACL rule, and `to_email_plain text` readable by the worker. After the rollback nothing remained (`v_mut` count 0). Tests 1 and 5 were not mutated:

- Test 1's mutations need superuser or ADMIN on the roles, and they change the whole cluster.
- Test 5 would need a migration file.

For both, the red conditions are listed in the table above.

## Commands and counts

| Command | Result |
|---|---|
| `pnpm infra:up` | postgres, mailpit and clamav containers running |
| `pnpm test:int cr-006-adversarial` | 1 file, 5 passed, 0 failed |
| `pnpm test:int` (full) | 10 files passed. 61 tests: 57 passed, 4 expected fail (the existing `it.fails` tripwires, including ISS-139 and ISS-141), 0 failed. Before this file: 56 tests, 52 passed. |
| `npx eslint` / `npx prettier --check` on the new file, `pnpm --filter @rogikotha/database typecheck` | clean |

## Boundary breaks and proposed ISS rows

None. Every test held, so no `it.fails` marker was added and no new ISS row is proposed.

## Observation for the owner (not a break of this Unit's boundary)

`rk_worker` holds SELECT/INSERT/UPDATE/DELETE on every `pgboss` table, `pgboss.job.data` (jsonb) included. Job payloads are written by the web tier. A payload that carried a plain email address would reach the worker outside the `auth_users` revoke. Today FD-071 routes recipients only through `email_deliveries.to_email_enc`, and these tests do not cover job payloads.

- Option A: leave it to the outbox and mail Units (T-405) to assert that no job payload carries an address.
- Option B: add an S4 row now, so the gap is recorded until such a test exists.

Suggestion: B. The row is cheap, and the test belongs with the mail job's Unit.
