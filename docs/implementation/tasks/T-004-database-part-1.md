# T-004 — Database package, part 1 (client, migrations, auth/account/identity/directory/taxonomy/config/audit schema)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-001, T-002, T-003 |
| Parallel-safe with | T-006, T-008 (no shared paths) |

## Goal

Set up Drizzle ORM with `pg`, the migration workflow, and the first half of the schema exactly as the data model specifies: Better Auth's four tables (renamed), accounts and staff, identity, directory, taxonomy, `audit_events`, configuration, the demo clock, and the role-grant migration. Repository files are created with method stubs so later tasks fill them without touching the schema.

## Read first

1. `docs/implementation/02-data-model.md` — header paragraph, §0, §1, §2, §3, §4, §5, §9 (`audit_events` row only), §11, §15, §16, §17 (state machines are domain code, but the enums must exist here)
2. `docs/implementation/01-conventions.md` §1 (database layout), §2, §4 (ids/time), §10 (database tests use `DATABASE_URL_TEST`)
3. `docs/implementation/00-master-plan.md` §3 (Drizzle 0.45.2 / drizzle-kit 0.31.10 exact pins; `pg` 8.23)
4. `docs/implementation/03-routes-and-contracts.md` §3 (repository ports — names only; interfaces live in `application`, which does not exist yet: create the repository classes with `not_implemented` stubs and no interface import; T-104/T-201 etc. wire the `implements` clause)
5. Better Auth docs for the Drizzle adapter's expected columns (`user`, `session`, `account`, `verification`) and `modelName`/`fields` mapping — read the official page for 1.7.x before writing §1 tables

## Owned paths

Create: `packages/database/drizzle.config.ts`, `packages/database/src/client.ts`, `packages/database/src/schema/{enums,auth,account,identity,directory,taxonomy,audit,administration,demo}.ts`, `packages/database/src/schema/index.ts`, `packages/database/src/migrate.ts`, `packages/database/src/reset.ts`, `packages/database/src/migrations/0001_init.sql` (generated) + `0002_grants_part1.sql` (hand-written), `packages/database/src/repositories/{account,identity,directory,taxonomy,config,audit}.ts`, `packages/database/src/audit-writer.ts`, `packages/database/src/index.ts`, `packages/database/src/*.int.test.ts`, `packages/database/vitest.config.ts` (modify from T-001 stub)
Modify: `packages/database/package.json`

## Not in scope

- §6–§8, §10, §12–§14 tables (T-005).
- Any query logic in repositories (stubs only).
- Better Auth configuration itself (T-101) — only its tables.

## Steps

1. `pnpm --filter @rogikotha/database add drizzle-orm@0.45.2 pg@^8.23.0 && pnpm --filter @rogikotha/database add -D drizzle-kit@0.31.10 @types/pg@^8`. **Exact pins** for drizzle-orm/drizzle-kit (pre-1.0; the 1.0 RC train must not be picked up). Confirm `pnpm ls drizzle-orm drizzle-kit` shows 0.45.2 / 0.31.10.
2. `drizzle.config.ts`: `dialect: 'postgresql'`, `schema: './src/schema/index.ts'`, `out: './src/migrations'`, `dbCredentials: { url: process.env.DATABASE_URL }`, `casing: 'snake_case'`, `migrations: { table: 'drizzle_migrations' }`. Load `.env` from the repo root with `dotenv` (`pnpm --filter @rogikotha/database add dotenv@^17`) via a small `env.ts` that resolves `../../.env` relative to the package — Windows: use `fileURLToPath(import.meta.url)` + `path.resolve`, never string concatenation.
3. `client.ts`: `createDb(url: string)` → `{ db: drizzle(pool, { schema, casing: 'snake_case' }), pool }`; `withTx(db, fn)` wrapping `db.transaction`; `closeDb()`. Export a `Db` type and a `Tx` type (`Parameters<Parameters<Db['transaction']>[0]>[0]`).
4. `schema/enums.ts`: `pgEnum` for every enum in data-model §0, values copied from `@rogikotha/contracts` arrays (`pgEnum('account_status', ACCOUNT_STATUSES)`), so the two cannot drift. Enum names in snake_case as in §0.
5. `schema/auth.ts` (§1): Better Auth's Drizzle adapter needs, for 1.7.x: `user(id text pk, name text, email text unique, email_verified boolean, image text, created_at, updated_at)`, `session(id text pk, expires_at, token text unique, created_at, updated_at, ip_address, user_agent, user_id fk)`, `account(id, account_id, provider_id, user_id fk, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at)`, `verification(id, identifier, value, expires_at, created_at, updated_at)`. Name the tables `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` and export the Drizzle objects as `authUsers`, `authSessions`, `authAccounts`, `authVerifications`. Add a comment block with the exact `modelName`/`fields` mapping T-101 must pass to the adapter (e.g. `user: { modelName: 'auth_users', fields: { emailVerified: 'email_verified', createdAt: 'created_at', updatedAt: 'updated_at' } }`). Verify column names against the installed Better Auth docs; if 1.7.3 expects additional columns, add them and note it in the hand-off.
6. `schema/account.ts` (§2): `account_profiles` (`username citext unique` — use `customType` for citext), `account_preferences`, `staff_devices`, `staff_device_approvals`, `enforcements` (fk to `moderation_decisions` is **deferred**: declare the column as plain `uuid` now and let T-005's migration add the FK constraint once that table exists — note this in a comment), `feedback`, `bookmarks` (fk to `reviews` also deferred to T-005), `blocks`.
7. `schema/identity.ts` (§3): `personas`, `persona_links` (fk `review_id` deferred to T-005), `identity_reveals`.
8. `schema/directory.ts` (§4) and `schema/taxonomy.ts` (§5): all tables and columns as listed; `field_provenance jsonb` typed with `.$type<Record<string, { source: Provenance; updatedAt: string }>>()`; `public_id` columns `text unique not null`; `seed_ref text` nullable with a unique partial index `where seed_ref is not null`. Self-references (`merged_into_id`, `canonical_id`) via the `AnyPgColumn` pattern.
9. `schema/audit.ts`: `audit_events` (§9) only, with an index on `(stream, created_at desc)`. `schema/administration.ts` (§11): `config_versions` (`values jsonb` typed `ConfigValues`), `config_changes`. `schema/demo.ts` (§15): `demo_clock` with a check constraint `id = 1`.
10. Common column helpers in `schema/_common.ts`: `id()` (uuid pk, default `sql\`uuidv7()\``), `timestamps()`, `publicId()`.
11. Generate: `pnpm --filter @rogikotha/database generate` (script `drizzle-kit generate --name init`) → `0001_init.sql`. Inspect the SQL: enums first, then tables; no `serial`; all FKs present except the deferred ones.
12. Hand-write `0002_grants_part1.sql` — grants for the tables that exist now, per §16: `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rk_app; REVOKE ALL ON auth_users, auth_sessions, auth_accounts, auth_verifications, persona_links, identity_reveals, blocks, bookmarks FROM rk_worker; GRANT SELECT ON personas, doctors, facilities, facility_branches, taxonomy_terms, taxonomy_aliases, config_versions TO rk_worker; GRANT INSERT ON audit_events TO rk_worker; GRANT USAGE ON ALL SEQUENCES …; ALTER DEFAULT PRIVILEGES …` (default privileges so T-005's tables inherit sensible grants, then T-005 tightens). Register it with drizzle-kit's journal (`meta/_journal.json`) so `migrate` applies it in order — drizzle-kit supports custom migrations via `drizzle-kit generate --custom --name grants_part1`; use that instead of editing the journal by hand.
13. `migrate.ts` (script `migrate`): runs `migrate(db, { migrationsFolder })` against `DATABASE_URL` using a **superuser or owner** connection for DDL — the `rk_app` role owns the database (T-002), so `DATABASE_URL` works. `reset.ts` (script `reset`): drops schema `public` cascade, recreates it, re-creates the extensions (`pg_trgm`, `citext`, `pgcrypto`), then migrates. Both refuse to run when `APP_MODE=production`.
14. `audit-writer.ts`: `class PgAuditWriter { write(tx, { stream, action, actor, targetKind, targetId, details }) }` inserting into `audit_events` — this one is **implemented**, not stubbed, because every later command uses it. `details` is passed through `assertAllowlisted(details)` which throws if any value is a string longer than 200 chars or if a key is in `['email','body','text','filename','password','token']`.
15. Repositories: `repositories/<module>.ts` exporting `class Pg<Module>Repository` with every method name from the command catalogue's needs (e.g. `PgAccountRepository`: `findByAuthUserId`, `findByUsername`, `createProfile`, `updateStatus`, `listDevices`, `upsertDevice`, `createDeviceApproval`, `consumeDeviceApproval`, `savePreferences`, `insertFeedback`, `addBookmark`, `removeBookmark`, `listBookmarks`, `setBlock`, `unsetBlock`, `isBlocked`; `PgIdentityRepository`: `createPersona`, `linkPersona`, `findPersonaFor(accountId, reviewId?, mode)`, `publicProjection`, `recordReveal`; `PgDirectoryRepository` / `PgTaxonomyRepository` / `PgConfigRepository` (`currentVersion`, `history`, `insertVersion`) similarly). Each method body: `throw new NotImplemented('T-1xx')` naming the owning task from the master plan. This makes ownership explicit and lets T-005 and later tasks add the `implements <Port>` clause without renaming.
16. `vitest.config.ts`: `test.name = 'database'`, `include: ['src/**/*.int.test.ts']`, `setupFiles: ['./src/test-setup.ts']` which reads `DATABASE_URL_TEST`, runs `reset` once, and exposes `testDb`. Write `migrations.int.test.ts`: "migrations apply from an empty database" (all §1–§5, §9, §11, §15 tables exist), "audit writer inserts an allowlisted row and rejects a disallowed key", "rk_worker cannot select from persona_links" (connect with `DATABASE_URL_WORKER`… against the test DB — construct the URL by swapping credentials; expect `permission denied`).
17. `pnpm --filter @rogikotha/database typecheck && pnpm test:int` (needs `pnpm infra:up`). Commit: `T-004: drizzle client, migrations, schema part 1, audit writer`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Exact pins | `pnpm ls --filter @rogikotha/database drizzle-orm drizzle-kit` | `0.45.2`, `0.31.10` |
| Migrate from empty | `pnpm db:reset && pnpm db:migrate` | exit 0; `drizzle_migrations` has 2 rows |
| Tables present | `psql $DATABASE_URL -c "\dt"` (via docker exec) | 24 tables incl. `auth_users`, `account_profiles`, `personas`, `persona_links`, `doctors`, `taxonomy_terms`, `audit_events`, `config_versions`, `demo_clock` |
| Enums present | `psql … -c "\dT"` | every §0 enum |
| Worker grants | integration test "rk_worker cannot select from persona_links" | passes |
| Integration tests | `pnpm test:int` | green |
| Typecheck | `pnpm typecheck` | exit 0 |
| Production guard | `APP_MODE=production pnpm db:reset` | refuses, exit 1 |

## Tests to write

- `src/migrations.int.test.ts`: "migrations apply from an empty database", "every enum from contracts exists in the database with identical values" (query `pg_enum` and compare to the contracts arrays), "audit writer inserts an allowlisted row", "audit writer rejects a details object containing an email key", "rk_worker cannot select from persona_links".
- `src/client.int.test.ts`: "withTx rolls back when the callback throws".

## Hard-rule checklist

- [ ] Reporter identity / private linkage never reaches the worker role (grants tested).
- [ ] No number stands for quality — no `rating`/`score` column anywhere (`grep -rn "rating\|score" packages/database/src/schema` → none).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
