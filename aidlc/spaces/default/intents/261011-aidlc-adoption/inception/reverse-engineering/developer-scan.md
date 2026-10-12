# Developer Code Scan — rogikotha

Scan breadth: full (whole repo, `./`). Depth: Minimal. Commit at scan time: `4f05dc03185113c5dc1bc9f4a5efdae06285a69a` (branch `main`).

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply** (every tracked file listed via `git ls-files`; package manifests, entry points, composition roots, configs, migrations and representative modules read in full; remaining files inventoried by listing and targeted search):
  - `./` (root build and config files)
  - `package.json`
  - `pnpm-workspace.yaml`
  - `pnpm-lock.yaml` (resolved versions only)
  - `tsconfig.base.json`
  - `eslint.config.mjs`
  - `vitest.workspace.ts`
  - `prettier.config.mjs`
  - `.gitattributes`
  - `.npmrc`
  - `apps/web/`
  - `apps/worker/`
  - `packages/adapters/`
  - `packages/application/`
  - `packages/contracts/`
  - `packages/database/`
  - `packages/domain/`
  - `packages/i18n/`
  - `packages/test-support/`
  - `infra/compose/`
- **Skimmed only** (business context, not code analysis):
  - `PRODUCT.md`
  - `README.md` (headings)
  - `docs/architecture/ARCHITECTURE-SPINE.md`
  - `docs/implementation/00-master-plan.md` (sections 1-5)
  - `docs/implementation/01-conventions.md` (sections 1-14)
  - `ui-design-prototype/` (directory listing and README presence; the static prototype the frontend ports)
  - `tools/` (README; prototype-era QA scripts, excluded from lint)
  - `scripts/` (one Python helper for a design doc)
- **Left out** (not opened):
  - `node_modules/`
  - `.next/`
  - `dist/`
  - `.vitest/`
  - `*.tsbuildinfo`
  - `test-results/`
  - `.data/`
  - `.env` (secrets; never read)
  - `_bmad/`
  - `.impeccable/`
  - `.claude/`, `.codex/`, `.agents/`, `aidlc/` (agent tooling and the AI-DLC workspace)
  - `.github/` (contains only third-party agent persona files; no workflows)
  - `docs/` other than the three skimmed files above
  - `DESIGN.md`, `admin-desktop.png`

### Packages Found
- `@rogikotha/web` (`apps/web`) — Next.js 16 App Router application — TypeScript/TSX — patient UI and staff console shell, locale routing, preferences server actions, `/api/health`
- `@rogikotha/worker` (`apps/worker`) — Node process — TypeScript — pg-boss worker: job registry, outbox relay poller, heartbeat, graceful shutdown
- `@rogikotha/contracts` (`packages/contracts`) — library — TypeScript — Result/AppError, 39 error codes, enums, ids, Actor/capabilities, config values, 14 zod schema modules, 19 view-model modules
- `@rogikotha/database` (`packages/database`) — library — TypeScript + SQL — Drizzle schema (58 tables), 7 forward-only migrations, PgOutbox, PgAuditWriter, PgBossQueue (implemented), 13 repository classes + PgSearchIndex (stubs throwing `NotImplemented`)
- `@rogikotha/i18n` (`packages/i18n`) — library — TypeScript + JSON — en/bn dictionaries (parity-checked), next-intl routing/request config, Bengali numeral formatters, generated key list
- `@rogikotha/test-support` (`packages/test-support`) — library + CLI — TypeScript — typed synthetic corpus, builders, in-memory fakes of every port, idempotent `db:seed`
- `@rogikotha/domain` (`packages/domain`) — library — TypeScript — placeholder only (`export {}`)
- `@rogikotha/application` (`packages/application`) — library — TypeScript — placeholder only (`export {}`)
- `@rogikotha/adapters` (`packages/adapters`) — library — TypeScript — placeholder only (`export {}`)
- `infra/compose` — Docker Compose topology — YAML + SQL — PostgreSQL 18, Mailpit, ClamAV; role and extension init scripts

### Build System
- **Type**: pnpm 11 workspace (`packageManager: pnpm@11.20.0`, `engines.node >=24 <25`, `engine-strict=true`); TypeScript compiled by Next (web) and `tsc` (worker build); `tsx` for scripts; drizzle-kit for migration generation
- **Config Files**: `package.json`, `pnpm-workspace.yaml` (with `allowBuilds` for `@parcel/watcher`, `@swc/core`, `esbuild`), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), per-package `tsconfig.json`, `apps/worker/tsconfig.build.json`, `apps/web/next.config.ts`, `packages/database/drizzle.config.ts`, `eslint.config.mjs`, `prettier.config.mjs`, `vitest.workspace.ts` + per-package `vitest.config.ts`, `.npmrc`, `.gitattributes`
- **Build Dependencies**: web -> contracts, i18n (imported); web -> application, adapters, database (declared, not imported); worker -> database (imported), contracts/application/adapters (declared); database -> contracts (imported), application (declared); adapters -> application, contracts (declared); application -> domain, contracts (declared); test-support -> database, contracts (imported), application, domain (declared)

### APIs Discovered
- HTTP route handler — `apps/web/src/app/api/health/route.ts` — 1 (`GET /api/health`, static payload)
- Next.js pages — `apps/web/src/app/[locale]/**` — 40 route files (24 patient pages, 11 admin pages, layouts, root redirect, not-found); 29 render a placeholder naming the owning task
- Server actions — `apps/web/src/server/actions/preferences.ts` — 3 (`setLang`, `setTheme`, `setMotion`)
- Proxy (middleware) — `apps/web/src/proxy.ts` — next-intl locale redirect + `x-pathname` header
- Background jobs — `apps/worker/src/registry.ts` — 8 job names declared, 1 implemented (`outbox.relay`); outbox event catalogue of 21 event names in `handlers/outbox-relay.ts`
- Internal library contracts — `packages/contracts` (zod input schemas per command module, view models per page family); `packages/database` exports (createDb/withTx, PgOutbox, PgAuditWriter, PgBossQueue, repository stubs)

### Frameworks & Libraries
- Next.js — 16.3.4 (a second copy 16.3.5 is resolved as a peer of i18n's dev dependency) — web framework
- React / React DOM — 19.3.0 — UI
- next-intl — 4.14.4 — locale routing and messages
- TypeScript — 6.0.3 — language
- zod — 4.6.2 (3.25.76 also present transitively) — validation
- uuid — 13.0.2 — UUIDv7 / public-id randomness
- drizzle-orm — 0.45.2; drizzle-kit — 0.31.10 — ORM and migrations
- pg — 8.23.0 — PostgreSQL driver
- pg-boss — 12.31.0 — job queue on PostgreSQL
- dotenv — 17.4.2 — env loading
- sharp — 0.35.4; @node-rs/argon2 — 2.2.1 — fixture build and seeded password hashing (test-support)
- tsx — 4.23.13 — script runner
- Vitest — 4.1.11; @vitest/coverage-v8 — 4.1.11; @testing-library/react — 16.3.3; jsdom — 27.4.0 (root) and 30.0.1 (web); @vitejs/plugin-react — 5.2.0 — tests
- ESLint — 10.10.0; typescript-eslint — 8.70.0; eslint-config-prettier; Prettier — 3.9.6 — lint/format
- puppeteer-core — 25.12.0 — prototype QA tools only
- Docker images: postgres:18, axllent/mailpit:v1.31.1, clamav/clamav:1.5.4

### Test Coverage
- **Test Directories**: co-located `src/**/*.test.ts(x)`; integration `*.int.test.ts` (database, test-support seed); smoke `*.smoke.test.ts(x)` in most packages. 45 test files, about 174 test cases (web 15 files, contracts 9, database 9, test-support 7, worker 4, i18n 3)
- **Test Frameworks**: Vitest 4 (projects via `vitest.workspace.ts`), Testing Library + jsdom for web
- **Coverage Config**: absent — `@vitest/coverage-v8` is installed at the root but no `coverage` block exists in any Vitest config and no script runs it

### Code Quality Indicators
- **Linting**: ESLint flat config at `eslint.config.mjs` (recommendedTypeChecked, `consistent-type-imports`, `no-floating-promises`, `no-console` except warn/error; Prettier compat). Boundary rules not yet present (comment `// T-010 adds boundaries here`)
- **CI/CD**: none — no `.github/workflows/`; `pnpm check` (typecheck, lint, test, i18n parity, build) is the local gate
- **Documentation**: extensive header comments citing task IDs, conventions sections and `ISS-`/`CR-` ids; `ASSUMPTION(T-xxx)` markers record deliberate deviations; root `README.md`, `infra/compose/README.md`, `packages/test-support/fixtures/README.md`

### Technical Debt Signals
- `packages/domain`, `packages/application`, `packages/adapters` are empty placeholders; no port interfaces exist, so no repository has an `implements` clause (`packages/database/src/repositories/*.ts` headers)
- 114 repository/search methods throw `NotImplemented('<task>')` (`packages/database/src/repositories/`, `search/index.ts`)
- 29 of 35 page routes render `shell.placeholder` (e.g. `apps/web/src/app/[locale]/(patient)/doctors/page.tsx:15`)
- No staff guard on the admin console (`apps/web/src/app/[locale]/admin/layout.tsx:19-21`, TODO T-103)
- `/api/health` returns hard-coded `unknown` probes (`apps/web/src/app/api/health/route.ts`)
- Emergency page reads static `DEFAULT_CONFIG_VALUES` instead of live config (`apps/web/src/app/[locale]/(patient)/emergency/page.tsx:9-19`)
- Worker uses a local `SystemClock`; no demo-clock adapter (`apps/worker/src/container.ts:16-30`)
- `dataRequest.created` fans out to both `data.export` and `data.delete` (`apps/worker/src/handlers/outbox-relay.ts:53-82`)
- `LOG_LEVEL` is validated but never applied by `JsonLogger` (`apps/worker/src/env.ts:22`, `logger.ts`)
- Seed writes through direct Drizzle inserts, not application commands (`packages/test-support/src/seed/seed.ts:1-7`)
- Two Next.js copies in the lockfile (16.3.4 for web, 16.3.5 via `packages/i18n` devDependency `next-intl` peer, `pnpm-lock.yaml:201`)
- jsdom version split (root `^27.0.0`, web `^30.0.1`)
- Stale comment: `infra/compose/postgres-init/01-roles.sql:5` names migration `0004_roles.sql`; grants actually live in `0001_grants_part1.sql`, `0005_grants_part2.sql`, `0006_pgboss_grants.sql`
- Import style inconsistent: contracts uses extensionless relative imports, database/worker/test-support use `.js` suffixes
- No Prettier script in root `package.json`; formatting is not checked by `pnpm check`
- `PRODUCT.md` "Technical context" still says no Next.js workspace exists

## Handoff Summary
- **Intent-relevant finding**: The repo is a Phase 0 foundation, not a feature-complete app. The workspace layout matches FD-033's trimmed monorepo exactly (`apps/web`, `apps/worker`, `packages/{adapters,application,contracts,database,domain,i18n,test-support}`, `infra/compose`). Implemented today: contracts vocabulary, the full database schema and migrations with role grants and append-only triggers, the outbox -> pg-boss relay (`apps/worker/src/handlers/outbox-relay.ts`, `packages/database/src/repositories/outbox.ts`), the bilingual i18n package, the seeded synthetic corpus, and the web shell (locale routing, theme/motion cookies, chrome, Emergency/About/Policy pages). The domain, application and adapters layers are empty (`packages/*/src/index.ts` = `export {}`), so the spine's command pipeline (AD-2) exists only as a contract, not as code.
- **Risks / follow-up**: (1) Dependency direction is not enforced by lint yet (T-010); only `apps/worker/src/container.test.ts` greps for forbidden imports. (2) Code deviations from `01-conventions.md` to preserve: `contracts` depends on `uuid` as well as zod (ISS-073); `test-support` depends on `database`, `pg`, `sharp`, `@node-rs/argon2`; `data-view` is set client-side by `ViewShell` rather than derived by the layout (§7.3); seed bypasses commands. (3) Spine stack table (Better Auth, Tailwind, shadcn, Lucide, Playwright, axe, MSW) is not reflected in code: Better Auth is not installed although `auth_*` tables exist; Tailwind/shadcn are superseded by FD-032. (4) No CI and no coverage measurement, while the classic scope's org default asks for an 80% line-coverage floor and CI before merge.
