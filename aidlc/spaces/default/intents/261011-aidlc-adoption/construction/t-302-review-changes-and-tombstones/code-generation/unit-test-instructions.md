# Unit test instructions — U22 `t-302-review-changes-and-tombstones`

## Framework

Vitest 4 through `vitest.workspace.ts`, which lists the workspace projects (`packages/*/vitest.config.ts`, `apps/*/vitest.config.ts`, plus `web-int`). U22 uses these:

- `domain` (node): `packages/domain/src/review/versioning.test.ts`.
- `contracts` (node): `packages/contracts/src/schemas/review.test.ts`.
- `application` (node): the command and query tests under `packages/application/src/modules/review/`, on `test-support` fakes.
- `test-support` (node): the fake superset and fake tests after the review fake gains its methods.
- `database` (node, serial, group 1): `*.int.test.ts` under `packages/database/src/`, against `DATABASE_URL_TEST` (reset once per run to a freshly migrated schema).
- `web` (jsdom): the server action, component and page tests. Testing Library renders each component in `en` and `bn`.
- `web-int` (node, serial): `*.int.test.ts` and `*.int.smoke.test.ts` under `apps/web/src`, against `DATABASE_URL_TEST`.

U22 adds no Playwright test; the design asks for none. Coverage uses `@vitest/coverage-v8`.

## Where it runs

The Unit runs in its own git worktree, built in batch 3 after U47 merges. `DATABASE_URL_TEST` points at the test database the orchestrator assigned to this worktree (a name ending in `_test`, as U9 recorded), never at another worktree's database. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`, and the `database` and `web-int` commands below).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. Step 3 runs the baseline forms on U47's existing files and records the counts in the plan.

```bash
pnpm infra:up

# Contracts: CorrectReviewInput, CORRECTION_FIELDS, view models:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/review.test.ts

# Domain: versioning.ts (normaliseContent, validators, classifyChange, toVersionSnapshot, readCorrected, toHistory):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/review/versioning.test.ts

# Fake and its superset check (after the port gains its methods):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/repositories-superset.test.ts packages/test-support/src/fakes/repositories.test.ts

# Application: the command and the two queries:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/review/commands/correct.test.ts packages/application/src/modules/review/queries/get-own-for-edit.test.ts packages/application/src/modules/review/queries/get-history.test.ts

# Database: the new repository methods, against the assigned test database:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-correction.int.test.ts

# Database: the demo rows moved or removed in Step 19:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/reviews.int.test.ts

# Server action and the moved demo-protection rows:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/review-edit.test.ts apps/web/src/server/actions/review.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts "apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts"

# web-int: concurrency and anonymity against the real database:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-correction.int.test.ts

# Components and the edit page:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/compose/EditForm.test.tsx apps/web/src/components/patient/review-history/ "apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/"

# The edit-link change (U47's files) and the shared pages test (checked, edited only if a row fails because of U22):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/ "apps/web/src/app/[locale]/(patient)/experiences/[id]/page.test.tsx" apps/web/src/app/pages.test.tsx

# The Unit's smoke file, then the whole cumulative smoke suite:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-correction.int.smoke.test.ts
timeout 600 pnpm smoke

# i18n parity and the gate:
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
timeout 600 pnpm test:int
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a bracketed or parenthesised path does not match in the shell, pass it in quotes, as above. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## What to cover (`functional-spec.md` § 9, `frontend-components.md` § 6)

| Group | Tests |
|---|---|
| Contracts | `CorrectReviewInput` accepts quick and detailed; refuses an extra key (doctor, identity mode, tags, persona, account), `expectedVersion` 0, a title over 120 graphemes, a mixed kind, duplicate claims |
| Domain | `classifyChange` for each field and kind, title-only (empty `corrected`), claims as sets, no-op; `normaliseContent` drops empty sections and derives the title; story and section length bounds; kind mismatch; new free-text label refused, stored label kept or removed; `toHistory` for author and non-author; the original is the version before each material correction, none after a title-only edit; a row without `corrected` reads as `[]`; a partial seed snapshot gives an original without the missing keys, never "Not provided" or 0 |
| Application | `correct` happy path for quick and detailed with one audit assertion (`persona:` actor, no account id, action `review.corrected`) and one `review.changed` event, no mail; identical `not_found` for another account's named review, another account's anonymous review and an unknown id; `not_found` for an ineligible review; `validation` for kind mismatch, extra key, short story, empty sections, a new free-text label; `conflict` for a stale version; `rate_limited` on the 31st correction; `forbidden` for unconfirmed and restricted; a no-op writes nothing and reserves no slot; a rolled-back correction releases its slot. `getOwnForEdit` and `getHistory`: versions only for the author; the non-author result equal for anonymous and named reviews; the original readable by every reader after a material correction, by none after a title-only edit; no actor, persona, account or reason in any result |
| Database | each new repository method; `updateContent` leaves the never-changed columns alone; a correction's `actor_id` equals `reviews.author_persona_id`, never an `account_profiles.id`; `listVersions` never returns `actor_id` or `reason` and returns content only for versions followed by a material correction; a failure after the update leaves no version row and no change; a second lock waits and reads the new version |
| Action | each result mapped to its key; redirect per locale; `internal` logged with allowlisted fields only; the moved demo-protection rows (another account's review `not_found`, a signed-out save writes nothing) |
| web-int | two parallel corrections with the same `expectedVersion` give one `ok` and one `conflict`; account B's answers for A's anonymous review are identical for the real and a forged public id |
| Components and pages (`en` and `bn`) | `EditForm` quick and detailed with field errors, the conflict message and reload link, the limit message; edit page `notFound` for a non-author, `noindex`, one `h1`, signed-out redirect with `returnTo`; `ReviewHistory` empty, edited only, with corrections and Show original (closed, `lang` on the original), title-only, author's version list, fallback on failure; the edit link shown for a detailed review |
| Smoke | correct the outcome of a synthetic detailed review through the module and read back through `getHistory` the Edited date, the correction line naming `outcome` and the original |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). The packages U22 moves are `domain`, `contracts`, `application`, `database`, `test-support` and `apps/web`; each must stay at or above 80% and the floor is never lowered to pass (D10). Record the before (Step 1) and after (Step 31) figures in `code-summary.md`.

## Mocking and test data

- Application and domain tests: the `test-support` fakes (`fakes/review-repository.ts`, the unit-of-work, audit-writer, outbox, rate-limiter and clock fakes) and builders (`builders/review.ts`, `builders/account.ts`), never hand-written fixture objects.
- In `apps/web` tests, use the existing helpers that wrap the fakes (`components/patient/experience/experience-test-support.ts`, `components/patient/compose/compose-test-support.ts`, `server/request-context-test-support.ts`), because nothing in `apps/*` may import `test-support` directly. Async server components: mock `@/server/container` or the module call, as U47's page tests do.
- Database and `web-int` tests: build synthetic rows in the test against the assigned test database; never read the development database.
- Memory: with other worktrees running, `eslint .` can die with a Node out-of-memory error under the default heap. Prefix long gate commands with `NODE_OPTIONS=--max-old-space-size=6144` (for example `NODE_OPTIONS=--max-old-space-size=6144 timeout 1200 pnpm check`), and lint only the changed files while building (`pnpm exec eslint <files>`).
- Baseline (Step 1, `f3eec20`): `pnpm smoke` 24 files and 46 tests; `pnpm test:coverage` 291 files and 3219 tests, overall lines 95.21%. U47's review tests run before any change (Step 3): 11 files, 179 tests.
- Data: synthetic only. Every address uses `example.test`, every person, doctor and facility is invented, and no real person or facility appears anywhere.
