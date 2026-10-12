# Component Inventory — rogikotha

Ten components. Status key: **Implemented**, **Partial** (skeleton or some parts real), **Placeholder** (empty export). Dependency edges are listed in `dependencies.md`, versions in `technology-stack.md`, and public interfaces in `api-documentation.md`.

| Component | Kind | Status | Owning plan tasks |
|---|---|---|---|
| apps/web | Next.js application | Partial | T-008 shell done; feature pages T-102 … T-409 |
| apps/worker | Node worker process | Partial | T-009 skeleton done; handlers T-205, T-304, T-309, T-405, T-410 |
| packages/adapters | Library | Placeholder | T-101 onward |
| packages/application | Library | Placeholder | T-101 onward |
| packages/contracts | Library | Implemented | T-003 (+ CR-002, CR-005) |
| packages/database | Library | Partial | T-004, T-005, T-009; repositories T-101 onward |
| packages/domain | Library | Placeholder | T-003 placeholder; filled by module tasks |
| packages/i18n | Library | Implemented | T-006 (+ T-207a additions) |
| packages/test-support | Library + CLI | Implemented | T-007 (+ CR-008) |
| infra/compose | Container topology | Implemented | T-002 |

### apps/web

- **Responsibility**: the patient UI and the staff console, both under `/{locale}`, plus route handlers and server actions. Hosts the planned web composition root (`src/server/container.ts`, not yet present).
- **Contains**: proxy (`src/proxy.ts`), four layouts, 34 locale pages (29 placeholders), `GET /api/health`, preference server actions. Components: patient (`Masthead`, `Tabs`, `ViewShell`, `Colophon`, `Emergency`, `About`, `Policy`), admin (`Masthead`, `ConsoleNav`, `Crumbs`, `TabBar`, `Colophon`), shared (`DemoMarker`, `Icon`, `LiveRegion`, `Sheet`, `SkipLink`, `ThemeControls`). Plain CSS in `src/styles/`.
- **Depends on**: contracts, i18n (imported); application, adapters, database (declared, unused); next, next-intl, react.
- **Notable gaps**: no auth (Better Auth not installed), no staff guard, no security headers, static health probes.

### apps/worker

- **Responsibility**: the isolated background process. It runs under the `rk_worker` role, with no auth, identity-reveal or deletion code.
- **Contains**: `main.ts` (queue start, job registration, overlap-guarded pollers, heartbeat, signal and IPC shutdown), `container.ts`, `registry.ts` (8 job names, 1 entry), `handlers/outbox-relay.ts` (`RELAY` map, `relayOnce`), `env.ts` (zod-validated env, hard exit without `DATABASE_URL_WORKER`), `logger.ts` (redacting JSON logger), `health.ts` (60 s heartbeat with pending outbox count).
- **Depends on**: database (imported); contracts, application, adapters (declared); dotenv, zod, drizzle-orm.
- **Notable gaps**: no job handlers except the relay; `LOG_LEVEL` is not applied; it uses a system clock, not the demo clock.

### packages/adapters

- **Responsibility (planned)**: non-database adapters: filesystem storage, SMTP mail, clamd scanner, sharp image processing, clock, crypto, rate limiting (`01-conventions.md` §1).
- **Contains**: `src/index.ts` = `export {}` (marker "Filled by T-101").
- **Depends on**: application, contracts (declared).

### packages/application

- **Responsibility (planned)**: commands, queries, port interfaces, authorization, audit helpers.
- **Contains**: `src/index.ts` = `export {}` (marker "Filled by T-101").
- **Depends on**: domain, contracts (declared).

### packages/contracts

- **Responsibility**: the shared vocabulary every other package imports: results, error codes, enums, ids, time, Actor and capabilities, bounded config values, zod input schemas, serializable view models.
- **Contains**: 8 root modules, 14 `schemas/*`, 19 `view-models/*`, 9 test files.
- **Depends on**: zod, uuid (no framework).
- **Notes**: it is the single source of truth for enum value lists, and the database mirrors them. Some schema payloads and view models are still `unknown` or `TODO(T-xxx)`.

### packages/database

- **Responsibility**: persistence. It holds the Drizzle schema, forward-only migrations, role grants, triggers and PostgreSQL adapters (repositories, outbox, audit writer, pg-boss queue, search).
- **Contains**: 17 schema modules defining 58 tables in these groups: auth (4), account (8: profiles, preferences, blocks, bookmarks, enforcements, feedback, staff devices, device approvals), identity (3), directory (9), taxonomy (2), audit (1), administration (2), demo clock (1), retention (3), review (6), evidence (4), community (3), moderation (5), notification and outbox (4), search (2), data requests (1). There are 7 migrations (`0000_init`, `0001_grants_part1`, `0002_content`, `0003_triggers`, `0004_deferred_fks`, `0005_grants_part2`, `0006_pgboss_grants`). Scripts: `migrate.ts`, `reset.ts`. Of the 17 adapter classes, 3 are implemented (`PgOutbox`, `PgAuditWriter`, `PgBossQueue`) and 14 are stubs (13 repositories plus `PgSearchIndex`).
- **Depends on**: contracts (imported), application (declared), drizzle-orm, pg, pg-boss, dotenv.
- **Notes**: PostgreSQL 18 features are required (`uuidv7()`, `citext`, `pg_trgm`, `pgcrypto`). Six tables are append-only by trigger.

### packages/domain

- **Responsibility (planned)**: entities, value objects, state machines and pure policies, with zero dependencies.
- **Contains**: `src/index.ts` = `export {}` (marker "Filled by T-003").
- **Depends on**: nothing.

### packages/i18n

- **Responsibility**: equal Bengali and English dictionaries, next-intl routing and request config, locale-aware formatting.
- **Contains**: `messages/en.json`, `messages/bn.json`; `src/format.ts` (Bengali digits, month/year, day dates, relative time), `routing.ts` (`en`/`bn`, prefix always, cookie `rk.lang`), `request.ts` (Asia/Dhaka timezone; a missing key throws outside production), `keys.ts` (generated key union); scripts `check-parity.mjs` (key, empty-value, identical-value, placeholder and ERROR_CODES parity), `gen-keys.mjs`, `port-from-prototype.mjs`.
- **Depends on**: next-intl (peer and dev dependency).

### packages/test-support

- **Responsibility**: deterministic test and demo data. It holds the typed synthetic corpus ported from the prototype, builders, in-memory fakes of every port, binary fixtures and the idempotent seed.
- **Contains**: `corpus/` (accounts, aliases, branches, comments, conditions, config, doctors, evidence, facilities, facility reviews, follow-ups, moderation, notifications, personas, reviews), `builders/` (13 builders), `fakes/` (18 fakes plus 13 repository fakes), `seed/` (seven steps run in order: accounts, config, directory, content, evidence, moderation, notifications), `fixtures/` (jpg, png, pdf), scripts `build-fixtures.mjs`, `port-corpus.mjs`.
- **Depends on**: database, contracts (imported); application, domain (declared); pg, drizzle-orm, sharp, @node-rs/argon2, dotenv, zod.
- **Notes**: the seed writes through Drizzle directly because no command layer exists yet.

### infra/compose

- **Responsibility**: the local runtime dependencies.
- **Contains**: `docker-compose.yml` with three services: `postgres:18` (host port 5433, named volume, health check), `axllent/mailpit:v1.31.1` (1025 SMTP, 8025 UI), and `clamav/clamav:1.5.4` (3310, custom test signature `clamav/rogikotha-test.ndb` mounted read-write). Also `postgres-init/01-roles.sql` (roles `rk_app`, `rk_worker`, `rk_maintenance`, database `rogikotha_test`, ownership to `rk_app`), `postgres-init/02-extensions.sql` (`pg_trgm`, `citext`, `pgcrypto` in both databases), `.env.example`, a local `.gitattributes` (LF for bind-mounted files) and `README.md`.
- **Depends on**: Docker Compose.
- **Notes**: role passwords equal role names (local development only). `01-roles.sql` mentions a migration `0004_roles.sql` that does not exist.
