# Unit test instructions — U46 `u46-directory`

## Framework

Vitest 4 through `vitest.workspace.ts` (a normal Vitest config passed with `--config`; ISS-004). The projects this Unit uses:

- `domain`, `contracts` and `application` run the unit tests, with fakes and builders from `packages/test-support`.
- `test-support` runs the fakes' own tests (`fakes/directory-repositories.test.ts`).
- `database` runs `src/**/*.test.ts` against `DATABASE_URL_TEST`; its global setup resets that database to a freshly migrated schema once per run.
- `test-support-seed` runs `src/seed/seed.int.test.ts` alone (group 2), resetting and seeding `DATABASE_URL_TEST`.
- `web` runs the page, `lib` and component tests in jsdom, with Testing Library and the real `en` and `bn` dictionaries inside `NextIntlClientProvider`.

Playwright is not used by this Unit: the design asks for no end-to-end test. Build and Test walks the pages by hand beside the prototype (1280 and 390 px) and runs an advisory Lighthouse check on the doctor profile.

Coverage uses `@vitest/coverage-v8`.

## Environment

The Unit runs in its own git worktree. Before any database-touching command, `DATABASE_URL_TEST` must point at the test database the orchestrator assigned, one of `rogikotha_test_w1` .. `rogikotha_test_w6`, never at `rogikotha_test` or the development database. The compose PostgreSQL must be running (`pnpm infra:up`). Run only one database-touching command at a time in this worktree. No CI exists (FD-102): these commands and the local gate are the only test runs.

## Run this Unit's tests

Every long command carries an outer `timeout`. Each command names this Unit's files as Vitest path filters; Step 2 of the plan runs each once on the baseline and records here that the filters match (files found or "no test files" before the code exists).

```bash
pnpm infra:up

# Contracts (stableHue, view models, the directory and taxonomy schemas):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/ids packages/contracts/src/view-models/doctor packages/contracts/src/view-models/facility packages/contracts/src/view-models/condition packages/contracts/src/view-models/experience-card packages/contracts/src/schemas/directory packages/contracts/src/schemas/taxonomy

# Domain (policies, directory, taxonomy):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/directory packages/domain/src/taxonomy packages/domain/src/review/policies

# Application (Directory and Taxonomy modules, the Review stub and queries):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/directory packages/application/src/modules/taxonomy packages/application/src/modules/review

# The new fakes (eligibility, superset check against the new repository files):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/directory-repositories

# Database (new repositories, migration pins, the two moved checks, the demo tests that change):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/directory-module packages/database/src/repositories/taxonomy-module packages/database/src/repositories/review-reads packages/database/src/repositories/public-evidence-count-interim packages/database/src/repositories/directory.smoke packages/database/src/migrations.int packages/database/src/validator-probes.int packages/database/src/demo/evidence.adversarial packages/database/src/demo/reviews.int packages/database/src/demo/doctors.int packages/database/src/demo/demo-slice.smoke

# Seed counts (BR8.6):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project test-support-seed packages/test-support/src/seed/seed.int.test.ts

# Web: page tests, the filter helper, the shared pages test, components and the component smoke:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web 'apps/web/src/app/[locale]/(patient)/doctors/' 'apps/web/src/app/[locale]/(patient)/facilities/' 'apps/web/src/app/[locale]/(patient)/topics/' apps/web/src/app/pages.test apps/web/src/lib/doctor-filters apps/web/src/components/patient/shared apps/web/src/components/patient/doctors apps/web/src/components/patient/facilities apps/web/src/components/patient/topics apps/web/src/components/patient/directory.smoke

# Coverage for one package, for example application (repeat with domain, contracts, database, test-support, web).
# The 80% floor is per package (D10), so the run covers the whole project, never a path subset (ISS-810):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**'
```

If Step 2 shows that a bracketed route filter does not match, use the unbracketed segment instead (for example `'(patient)/doctors/'`) and record the working form here.

The gate (Step 16 of the plan), run only after the unit-scoped commands are green:

```bash
timeout 1200 pnpm check
timeout 600 pnpm smoke
npx impeccable detect apps/web/src --no-advisory
```

## What to cover (design § 10, frontend-components § 9)

| Group | Tests |
|---|---|
| Contracts | `stableHue` equals the prototype's `hash` for fixed ids; schema edge values accepted and refused |
| Domain | `distribution` (all keys zero, unknown ignored, not provided); `isLimitedData` at 4 of 5, 5 of 5, 0; `omitEmptyFields`; `registrationNotVerified`; `branchNames` (three cases); `normalizeAliasKey` (composed and decomposed Bengali, punctuation, vowel signs) |
| Application | each query's happy path in `en` and `bn`; facts omitted with provenance; feedback off calls no facility method; no locale-suffixed, private or percentage field; anonymous byline; no Directory or Taxonomy import of Review; `createProvisional` happy path, refusals with nothing written, the 31st call `rate_limited`, idempotent repeat, key shape; the operation with a persona actor; `addMemberDoctor` validation, reuse, create, audit and outbox only on create, no BMDC number in the result |
| Test-support | hidden and soft-deleted reviews not counted (ISS-222); each new fake a superset of its new repository file |
| Database | every repository read; facility isolation both ways; hidden, soft-deleted and unpublished reviews; merged and unpublished doctor (review R-03); FD-101 match; member-added mark; two-connection races for `addMemberDoctor` and the provisional key; branch names and the both-or-neither and hue checks; migration from empty with the new pinned count; the moved FD-035 and FD-100 checks with unchanged expected values (review R-01) |
| Seed | per-condition totals from the corpus (c8 at 0; r2, r21, r8 unmatched); f1 own name, label and hue; f2 no own name; `listSuggested` order; 10 conditions |
| Web pages | 404 for a malformed id without a container call; 307 for a foreign condition; metadata titles in both locales |
| Components | both locales; hard-rule renderings ("Registration not verified", "Not provided", "No documents", no `%`, no `0` for a missing value); profile block order; filters and one announcement; nine criteria; separation callout; siblings; facility names; feedback off; topic index with zero topics; places and `FreqList`; compact emergency panel |
| Smoke | `repositories/directory.smoke.test.ts` and `components/patient/directory.smoke.test.tsx`; the demo-slice smoke assertions moved, none removed |

Each test must be able to fail. Test names read as sentences. Never assert on implementation details (class names, internal calls). Nothing in `apps/*` imports from `@rogikotha/test-support`: web tests use the builders in `components/patient/doctors/directory-test-support.ts`.

## Coverage

An 80% line floor per package, enforced by `pnpm check` (`test:coverage`, thresholds in `vitest.workspace.ts`). It is never lowered to make a step pass (D10). Record each package's figure before (Step 1) and after (Step 16) in `code-summary.md`; do not claim a figure that was not measured.

## Mocking and test data

- Application tests use the `test-support` fakes: the new `fakes/directory-repositories.ts` and `fakes/directory-ports.ts`, plus the existing clock, config provider, rate limiter, audit writer, outbox and unit-of-work fakes. Build inputs with builders, never hand-written fixture objects.
- Database tests run against the assigned `DATABASE_URL_TEST` and insert their own rows through builders; seed-based assertions live only in `seed/seed.int.test.ts` and take their counts from the corpus.
- Web tests mock `@/server/container` and `@/server/auth`, and `@/i18n/routing` as a plain anchor.
- All data is synthetic: fictional doctors, facilities, personas and accounts, `example.test` addresses, no real person or facility named in a negative account.
