# Component Inventory: rogikotha

Ten components. Status key: **Implemented**, **Partial** (some parts real), **Placeholder** (empty export). Dependency edges are in `dependencies.md`, versions in `technology-stack.md`, and interfaces in `api-documentation.md`.

| Component | Kind | Status | Owning plan tasks |
|---|---|---|---|
| apps/web | Next.js application | Partial | T-008 shell, T-011 design and motion done; feature pages T-102 to T-409 |
| apps/worker | Node worker process | Partial | T-009 relay done; handlers T-205, T-304, T-309, T-405, T-410 |
| packages/adapters | Library | Placeholder | T-101 onward |
| packages/application | Library | Placeholder | T-101 onward |
| packages/contracts | Library | Implemented | T-003, CR-002, CR-005 |
| packages/database | Library | Partial | T-004, T-005, T-009, CR-006; repositories T-101 onward |
| packages/domain | Library | Placeholder | filled by module tasks |
| packages/i18n | Library | Implemented | T-006, T-207a, T-011 |
| packages/test-support | Library + CLI | Implemented | T-007, CR-008, CR-012 |
| infra/compose | Container topology | Implemented | T-002 |

### apps/web

- **Responsibility**: the patient UI and the staff console under `/{locale}`, plus route handlers and server actions. It will host the web composition root `src/server/container.ts`, which does not exist yet.
- **Contains**: `src/proxy.ts`; four layouts (root, `[locale]`, `(patient)`, `admin`); 34 locale pages, 29 of them placeholders (owners listed in `code-structure.md`); `GET /api/health`; preference server actions. Patient components: `Masthead`, `Tabs`, `ViewShell`, `Colophon`, `Emergency`, `About`, `Policy`, and `motion/{RouteTransition,Reveal,PublishTick}` (T-011). Admin components: `Masthead`, `ConsoleNav`, `Crumbs`, `TabBar`, `Colophon`. Shared: `DemoMarker`, `Icon`, `LiveRegion`, `Sheet`, `SkipLink`, `ThemeControls`. Styles: `tokens.css`, `patient.css` (FD-091), `motion.css`, `admin.css` (verbatim prototype port), `globals.css`. Bengali heading font Hind Siliguri 600 (`app/fonts/`).
- **Demo-slice gaps**: no Better Auth, no session or `Actor`, no forms. The pages `register`, `sign-in`, `verify-email`, `me`, `doctors/[id]`, `write` and `experiences/[id]` are placeholders. Static health probes.

### apps/worker

- **Responsibility**: the isolated background process. It runs as `rk_worker` and contains no auth, identity-reveal or deletion code (enforced by the boundary lint).
- **Contains**: `main.ts` (queue start, registry loop, overlap-guarded pollers, heartbeat, signal and IPC shutdown), `container.ts` (db, `PgOutbox`, `PgOutboxRelayStore`, `PgBossQueue`, `JsonLogger`, `SystemClock`), `registry.ts` (8 job names, 1 entry), `handlers/outbox-relay.ts`, `env.ts`, `logger.ts`, `health.ts`.
- **Demo-slice gaps**: no `evidence.process` handler, so no scan and no derivatives, and no `mail.send` handler for verification mail.

### packages/adapters

- **Responsibility (planned)**: non-database adapters: filesystem storage, SMTP mail, clamd scanner, sharp image processing, clock, crypto, rate limiting.
- **Contains**: `src/index.ts` = `export {}` ("Filled by T-101").
- **Demo-slice gaps**: crypto (for the `*_enc` columns), storage, scanner, image and mail adapters are all needed.

### packages/application

- **Responsibility (planned)**: commands (`defineCommand`), queries, port interfaces, authorization, audit helpers.
- **Contains**: `src/index.ts` = `export {}` ("Filled by T-101").

### packages/contracts

- **Responsibility**: the shared vocabulary: `Result`, error codes, enums, ids (UUIDv7 and public ids), time, `Actor` and capabilities, bounded config values, zod input schemas (14 modules), view models (19).
- **Depends on**: zod, uuid.
- **Notes**: the single source of enum lists; the database mirrors them. Open shapes are listed in `code-quality-assessment.md`.

### packages/database

- **Responsibility**: persistence: Drizzle schema, forward-only migrations, role grants, triggers, PostgreSQL adapters.
- **Contains**: 17 schema modules defining 58 tables (auth 4, account 8, identity 3, directory 9, taxonomy 2, audit 1, administration 2, demo clock 1, retention 3, review 6, evidence 4, community 3, moderation 5, notification and outbox 4, search 2, data requests 1). Nine migrations `0000_init` to `0008_worker_grant_review`. Scripts `migrate.ts` and `reset.ts` (both refuse `APP_MODE=production`). Real adapters: `PgOutbox`, `PgAuditWriter`, `PgBossQueue`, `PgOutboxRelayStore`. 14 stub classes.
- **Demo-relevant tables**: `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` (text ids, Better Auth mapping documented in `schema/auth.ts`); `account_profiles` (username citext unique, displayName, locale, status default `pending_verification`, staffRole, age and terms timestamps; no bio column); `account_preferences`; `personas` (kind, displayName snapshot, username); `persona_links` (private, `review_id` for anonymous personas); `reviews` (doctor, branch, kind, relationship, identityMode, sentiment, outcome, period, title, body or sections, claims, language, state, version, `exact_date_enc`); `review_versions`; `review_drafts` (`payload_enc`, 30-day expiry); `evidence_items` (JPEG/PNG CHECK, sha256, `original_filename_enc`, state, failReason); `evidence_artifacts`; `evidence_custody_events` (append-only); `comments` (parentId with a one-level trigger, tombstone).

### packages/domain

- **Responsibility (planned)**: entities, value objects, state machines, pure policies; zero dependencies.
- **Contains**: `src/index.ts` = `export {}`.

### packages/i18n

- **Responsibility**: equal en/bn dictionaries (781 keys each), next-intl routing and request config, locale-aware formatting.
- **Contains**: `messages/{en,bn}.json`; `src/{format,routing,request,keys}.ts`; scripts `check-parity.mjs`, `gen-keys.mjs`, `port-from-prototype.mjs`.
- **Notes**: copy for the demo already exists (namespaces `auth` 68 keys, `compose` 74, `experience` 38, `profile` 22, `mine` 18, `viewer` 39, `evidence`/`ev` 16, `errors` 39).

### packages/test-support

- **Responsibility**: deterministic test and demo data: the corpus generated from the prototype, builders, in-memory fakes of every port and repository, binary fixtures, and the idempotent seed.
- **Corpus records**: 48 accounts (45 patients, 3 staff), 38 personas, 33 aliases, 10 doctors, 7 facilities, 10 branches, 10 conditions, 24 reviews, 31 follow-ups, 19 facility reviews, 49 comments, 12 evidence records, 66 moderation records, 34 notifications.
- **Seed**: seven steps, each in its own transaction (accounts, config, directory, content, evidence, moderation, notifications). Accounts are seeded with `emailVerified = true` and an Argon2id hash of `demo-pass-2026!`. Evidence derivatives are generated with sharp into `STORAGE_ROOT/{public,private}`.
- **Fixtures**: `photo.jpg`, `prescription-1.jpg`, `prescription-2.jpg`, `flagged.jpg`, `broken.jpg`, `not-a-png.png`, `report.pdf`.

### infra/compose

- **Responsibility**: local runtime dependencies.
- **Contains**: `postgres:18` (host 5433), `axllent/mailpit:v1.31.1` (1025 SMTP, 8025 UI), `clamav/clamav:1.5.4` (3310, custom test signature `clamav/rogikotha-test.ndb`); `postgres-init/01-roles.sql` (`rk_app`, `rk_worker`, `rk_maintenance`, `rogikotha_test`), `02-extensions.sql` (`pg_trgm`, `citext`, `pgcrypto`); `.env.example`.
- **Notes**: role passwords equal the role names (local only).
