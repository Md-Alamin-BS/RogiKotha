# Developer Code Scan: rogikotha

Intent `261030-demo-slice`, full rescan of the repository root (`./`), depth Minimal. Scanned at HEAD `d22b3b911bb0c89a4be659ff233812b124c14c49` on `main`. The brief named `efa6548`, but that id resolves to a git tree object, not a commit, so the commit recorded here is HEAD. The working tree is dirty only under `docs/aidlc-migration/` and `aidlc/`, and the scan read no source change outside git.

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `./` (root manifests: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, `eslint.config.mjs`, `eslint.boundaries.mjs`, `prettier.config.mjs`, `.gitignore`, `.nvmrc`, `.github/workflows/check.yml`)
  - `apps/web/` (every route, layout, proxy, server action, health route and config; components and styles listed and sampled)
  - `apps/worker/` (container, registry, outbox relay, env, package manifest)
  - `packages/database/` (all schema modules, all repository stubs, migrations `0000`–`0008`, queue, migrate and reset scripts)
  - `packages/contracts/` (schemas for account, review, community, evidence, identity, directory; view-model gaps)
  - `packages/test-support/` (seed steps, corpus record counts, fakes and builders listed)
  - `packages/i18n/` (dictionaries by namespace, scripts)
  - `packages/domain/`, `packages/application/`, `packages/adapters/` (each one file, `export {}`)
  - `infra/compose/`
- **Skimmed only**:
  - `scripts/` (gate scripts: identity, boundaries fixture, motion check, contrast test)
  - `tools/` (prototype-era design tooling)
  - `lint-fixtures/` (boundary-violation fixtures for `pnpm lint:boundaries`)
  - `ui-design-prototype/`
  - `docs/` (only `docs/status/dependency-check-log.md` and `docs/implementation/ISSUES.md` by search)
  - `PRODUCT.md`, `DESIGN.md`, `README.md`, `_bmad/`, `.impeccable/`, `.github/agents/` (BMAD agents, not AI-DLC)
- **Left out**:
  - `node_modules/`, `**/.next/`, `coverage/`, `dist/` (dependencies and build output)
  - `.claude/`, `.kiro/`, `.codex/`, `.cursor/`, `.opencode/`, `.aidlc/`, `.agents/`, `aidlc/` (AI-DLC install and workspace)
  - `.data/`, `.env` (git-ignored runtime data and secrets)

### Packages Found
- `@rogikotha/web` (`apps/web`): Next.js app, TypeScript. Patient UI and staff console under `/{locale}`.
- `@rogikotha/worker` (`apps/worker`): Node process, TypeScript. Runs pg-boss and the outbox relay.
- `@rogikotha/contracts`: library, TypeScript. Results, errors, enums, ids, zod input schemas, view models.
- `@rogikotha/database`: library, TypeScript. Drizzle schema (58 tables), 9 migrations, Pg adapters.
- `@rogikotha/i18n`: library, TypeScript. en/bn dictionaries (781 keys each), routing, formatting.
- `@rogikotha/test-support`: library and CLI, TypeScript. Synthetic corpus, builders, fakes, seed.
- `@rogikotha/domain`, `@rogikotha/application`, `@rogikotha/adapters`: libraries, empty (`export {}`).

### Build System
- **Type**: pnpm 11.20 workspaces (`apps/*`, `packages/*`), Node 24, TypeScript 6 project per package, Next build for web, `tsc` build for worker.
- **Config Files**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, per-package `tsconfig.json`, `vitest.workspace.ts`, `apps/web/next.config.ts`, `apps/web/playwright.config.ts`, `packages/database/drizzle.config.ts`.
- **Build Dependencies**: see `dependencies.md` in the staged store for the declared and imported edge list.

### APIs Discovered
- HTTP route handler: `apps/web/src/app/api/health/route.ts`, 1 endpoint (`GET /api/health`, static `unknown` probes).
- Server actions: `apps/web/src/server/actions/preferences.ts`, 3 actions (`setLang`, `setTheme`, `setMotion`; cookies only).
- Pages: 34 locale pages plus the root `app/page.tsx`; 29 locale pages are placeholders naming their owning task.
- Command contracts: zod schemas in `packages/contracts/src/schemas/` (14 modules); no command implementation exists.
- Repository surface: 14 Pg classes with stub methods that throw `NotImplemented`; 3 real adapters (`PgOutbox`, `PgAuditWriter`, `PgBossQueue`) plus `PgOutboxRelayStore`.

### Frameworks & Libraries
- Next.js 16.3.4, React 19.3.0, next-intl ^4.14.4: web app and i18n.
- Drizzle ORM 0.45.2, drizzle-kit 0.31.10, pg ^8.23.0: persistence.
- pg-boss ^12.31.0: job queue.
- zod ^4.6.2, uuid ^13.0.2: contracts.
- @node-rs/argon2 ^2.2.0, sharp ^0.35.4: seed only (password hashes, evidence derivatives).
- Better Auth: **not installed** (only its four tables exist).

### Test Coverage
- **Test Directories**: co-located `*.test.ts(x)`, `*.int.test.ts` (database project), `*.smoke.test.ts(x)`, `apps/web/e2e/smoke/*.spec.ts` (Playwright, not in CI), `scripts/*.test.mjs`.
- **Test Frameworks**: Vitest 4.1, Testing Library, jsdom, Playwright 1.64.1.
- **Coverage Config**: present. `@vitest/coverage-v8` with an 80% line threshold per package in `vitest.workspace.ts`; `pnpm check` runs `test:coverage`.

### Code Quality Indicators
- **Linting**: ESLint 10 flat config (`eslint.config.mjs`) plus `eslint-plugin-boundaries` 7.3.0 rules (`eslint.boundaries.mjs`), proven by `lint-fixtures/` through `pnpm lint:boundaries`; Prettier `format:check` is in `pnpm check`.
- **CI/CD**: `.github/workflows/check.yml` runs `pnpm check` on pushes to `main` and `bolt/**` with a PostgreSQL 18 service.
- **Documentation**: extensive header comments citing tasks, decisions and ISS rows; `README.md`, `infra/compose/README.md`, `tools/README.md`.

### Technical Debt Signals
- 43 `TODO(` markers, 46 `ASSUMPTION(` markers and 10 `eslint-disable` lines in source (`apps`, `packages`, `scripts`, `tools`, `infra`).
- Every repository except the outbox is a stub (`packages/database/src/repositories/*.ts`); `PgSearchIndex` is a stub too.
- Contracts carry `z.unknown()` where the owning task has not decided the shape: `SaveDraftInput.payload`, `CorrectReviewInput.fields`, `ListExperiencesInput.filters` (`packages/contracts/src/schemas/review.ts`), and `ComposerVM.payload`.
- The seed writes rows directly through Drizzle because no command layer exists (`packages/test-support/src/seed/seed.ts` header).
- The `bytea` custom type is duplicated in `schema/review.ts`, `schema/evidence.ts` and `schema/notification.ts`.
- The worker uses a system clock, not a demo clock (`apps/worker/src/container.ts`, ASSUMPTION(T-009)).

## Handoff Summary
- **Intent-relevant finding**: the demo path has its schema, seed, copy and page routes, but nothing between the page and the database. `packages/application`, `packages/domain` and `packages/adapters` are empty (`src/index.ts` is `export {}`), Better Auth is not a dependency, `apps/web/src/server/` holds only `actions/preferences.ts` (no `auth.ts`, no `container.ts`), and every page the demo walks is a placeholder: `register`, `sign-in`, `verify-email` (T-102), `me` (T-409), `doctors/[id]` (T-202), `write` (T-306), `experiences/[id]` (T-307). The repositories it needs throw `NotImplemented`: `PgAccountRepository` (16 methods), `PgDirectoryRepository` (15), `PgReviewRepository` (21), `PgEvidenceRepository` (12), `PgCommunityRepository` (6). The tables already exist: `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` (`schema/auth.ts`), `account_profiles`, `account_preferences`, `personas`, `persona_links`, `reviews`, `review_versions`, `review_drafts`, `evidence_items`, `evidence_artifacts`, `evidence_custody_events`, `comments`. The seed loads 48 accounts (45 patients, 3 staff), all with the password `demo-pass-2026!`, plus 38 personas, 10 doctors, 24 reviews, 49 comments and 12 evidence records.
- **Risks / follow-up**:
  - Seeded credentials are Argon2id hashes (`seed-accounts.ts`, m=64 MiB, t=3, p=1). Better Auth hashes with scrypt by default, so its `emailAndPassword.password.hash/verify` must be wired to the same Argon2id parameters, or seeded users cannot sign in.
  - New accounts default to `status = 'pending_verification'` (`schema/account.ts`). The demo must either send verification mail through Mailpit or decide to skip verification. This is an open point for the owner.
  - Evidence accepts only `image/jpeg` and `image/png` (FD-036, CHECK constraints in `schema/evidence.ts`). "Document files" in the intent therefore means images unless a new FD entry changes it. Publishing needs the worker's `evidence.process` job, which is named in `registry.ts` but not registered, plus clamd, sharp and storage adapters; none exists. The fail-closed rule applies.
  - `review_drafts.payload_enc`, `evidence_items.original_filename_enc` and `reviews.exact_date_enc` are encrypted `bytea`, so a crypto adapter using `APP_ENCRYPTION_KEY` is a precondition for writing an experience or attaching a document.
  - Profile edit has no contract: `UpdatePreferencesInput` exists, but nothing covers changing the display name, and `account_profiles` has no bio column. The persona rule says a rename creates a new `personas` row (`schema/identity.ts`).
  - Editing an experience maps to `review.correct` (`CorrectReviewInput.fields` is `unknown`) and a `review_versions` row; `rk_worker` cannot insert there (`0008_worker_grant_review.sql`), so edits must run in the web tier.
  - T-101 (application ports, adapters, Better Auth) already has an approved Functional Design and a code plan in intent `261011-aidlc-adoption` (commit `d22b3b9`). The demo slice should build on it, not duplicate it.
