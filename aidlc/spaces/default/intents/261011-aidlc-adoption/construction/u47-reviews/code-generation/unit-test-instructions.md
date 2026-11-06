# Unit test instructions — U47 `u47-reviews`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U47 uses these:

- `domain` (`packages/domain/vitest.config.ts`, node): the pure review and facility-review rules.
- `contracts` (`packages/contracts/vitest.config.ts`): `DraftPayload`, the publish input, the label codes and the no-score check.
- `application` (`packages/application/vitest.config.ts`): the review module's commands, queries, projection and seams on `test-support` fakes, and the taxonomy `listSpecialties` row.
- `test-support` (`packages/test-support/vitest.config.ts`): the builder and fake rows.
- `database` (`packages/database/vitest.config.ts`, serial, group 1): `review-module.int.test.ts`, U46's `listExperienceCards` filter rows and the demo int tests, against `DATABASE_URL_TEST` reset to a freshly migrated schema.
- `web` (`apps/web/vitest.config.ts`, jsdom): server actions, composer logic, components, slots and page tests. Testing Library renders each component in `en` and `bn`.
- `web-int` (node, serial, group 3): `apps/web/src/**/*.int.test.ts` and `*.int.smoke.test.ts`, the publish-through-the-container test and the anonymity checks.

U47 adds no Playwright test. The design asks for none (end-to-end with Playwright starts at T-503), and the demo end-to-end run on `main` must stay green. Coverage uses `@vitest/coverage-v8`.

## Where it runs

Each Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigned (a name ending in `_test`, such as `rogikotha_w2_test`, because the reset guard refuses other names) and never at another worktree's database. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`, and every `database` or `web-int` command below).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root, after `pnpm infra:up`. Step 5 runs the existing review tests with these filters before any change and records the counts.

```bash
pnpm infra:up

# Domain rules (Step 8):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/review/

# Contracts (Step 12):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/review.test.ts

# Test support builders and fakes (Step 20):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/builders/builders.test.ts packages/test-support/src/fakes/fakes.test.ts

# Review module on fakes (Steps 32-34) and the taxonomy addition (Step 31):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/review/ packages/application/src/modules/taxonomy/

# Repository against the assigned test database (Steps 18-19), and the moved demo rows (Step 55):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-module.int.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/reviews.int.test.ts packages/database/src/demo/doctors.int.test.ts
# U46's listExperienceCards filter rows (file named in Step 4):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-reads.int.test.ts

# Server actions and the moved adversarial rows (Step 37), container row (Step 35):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/review.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts apps/web/src/server/container.test.ts

# Publish through the container, rollback and anonymity checks (Step 38):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-module.int.test.ts

# Composer logic and components (Steps 41, 46):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/compose/

# Experience components and slots (Step 54):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/ apps/web/src/components/patient/comments/ apps/web/src/components/patient/evidence/ apps/web/src/components/patient/review-history/ apps/web/src/components/patient/profile/

# Pages in U47's own folders, the /me page, the moved signed-out rows, and the shared pages test (Steps 47, 54, 57):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/write/" "apps/web/src/app/[locale]/(patient)/experiences/" "apps/web/src/app/[locale]/(patient)/authors/" "apps/web/src/app/[locale]/(patient)/me/page.test.tsx" "apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts" apps/web/src/app/pages.test.tsx

# The Unit's smoke files (Step 58), then the whole cumulative smoke suite:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-module.int.smoke.test.ts
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/experience-page.smoke.test.tsx
timeout 600 pnpm smoke

# i18n parity and the gate (Steps 39, 59):
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
timeout 600 pnpm test:int
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a bracketed or parenthesised path does not match in the shell, pass it in quotes, as above. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs. If U46 put `listExperienceCards` in another file than `review-reads.ts`, use that file's int test and record the change in `code-generation-plan.md` Step 4.

## What to cover (`functional-spec.md` § 10, `frontend-components.md`)

| Group | Tests |
|---|---|
| Domain | every `minimumFieldsMissing` branch in its order; the tag rule (none, Not sure, 20, 21); period and private exact date; `deriveTitle` with Bengali graphemes; `detectLanguage`; `orderedSections`; `criteriaValid` |
| Contracts | `DraftPayload` lenient parse; `PublishReviewInput` requires `attestation: true`; the three label codes; no numeric judgement field in `DraftPayload`, `ExperiencePageVM` or the criteria |
| Drafts | create, update, another account's draft, expired, unreadable, rate limited, the eleventh live draft refused with `errors.review.draftsFull` while an existing one still saves; discard own and another account's |
| Publish | happy path in each identity mode; unconfirmed, restricted, rate limited, attestation, every `min_fields` item, bad exact date, bad label; five `min_fields` refusals then a valid publish succeeds; anonymous with a new doctor refused with `review.anonymous_new_doctor` and `addMemberDoctor` never called; rollback when `addMemberDoctor` or `ensureProvisionalTerm` fails; one audit assertion with the `persona:` actor; the outbox payload |
| Facility visit | happy path, feature off, anonymous refused, no outbox event |
| Projection | Not provided; Reviewer's label; section order; month and year only; each byline kind; `otherByAuthor` empty for anonymous; a key-denylist deep scan over generated reviews |
| Seams | `reviewIdForPublicId`, `isReviewPublished` on the eligible predicate; `isReviewAuthor` false for another account's anonymous review and for an unknown id, with the same answer; `authorIdentityModeOf` `anonymous`, `null` for an unknown id, never a persona or account id |
| Database | every repository method; publish and rollback in one transaction leave no review, persona, term or doctor; a seeded plaintext draft is unreadable but not deleted; `exact_date_enc` never selected by a public read; the two `listExperienceCards` filters |
| Anonymity (`web-int`) | two anonymous reviews by one account have different aliases and appear neither on the author page nor in each other's related lists; anonymous publish with `newDoctor` leaves `profile_submissions`, `doctors`, `reviews` and `persona_links` unchanged; no `profile_submissions.created_doctor_id` has an anonymous review |
| Actions | each action's `ok` and refusal mapping; signed-out publish writes nothing; a persona of another account is refused; `saveReviewEdit` rows unchanged |
| Composer | reducer toggles; autosave debounce, sequence numbers, backoff and stop while publishing (fake timers); `safety.ts` in both scripts; each step in `en` and `bn`; the anonymous new-doctor state; the missing-fields summary with links; Publish disabled until the four boxes; the draft list and the 10-draft message |
| Experience | `ExperienceBody` page and preview; each byline (never a link or initials for anonymous); Flags with Not provided; edit link only for quick reviews; `AuthorTools` only for the author; the three slots with data, empty and error states; the index pager and empty state; the author page empty state with `noindex`; `/write` gate in each access state with no composer data read |
| Smoke | publish a quick review through the module and read it back through `getExperience`; the experience page renders its three slots |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U47 the packages that move are `domain`, `contracts`, `application`, `database`, `test-support` and `apps/web`; each must stay at or above 80% and none is ever lowered to pass (D10). Record the before (Step 1) and after (Step 59) figures in `code-summary.md`.

## Mocking and test data

- Application ports: the `test-support` fakes and builders (`fakes/review-repository.ts`, `builders/review.ts` with `aReview()` and `aDraftPayload()`, the existing clock, ids, crypto, rate-limiter, audit-writer, outbox and unit-of-work fakes), never hand-written fixture objects. In `apps/web` tests, use the existing helpers that already wrap them (`server/request-context-test-support.ts`, `components/patient/auth/auth-test-support.ts`, `components/patient/experience/experience-test-support.ts`, `components/patient/evidence/evidence-test-support.ts`), because nothing in `apps/*` may import `test-support` directly.
- Async server components, slots and pages: mock `@/server/actions/account` for the gate and `getContainer()` (or `@/server/command-call`) for module reads, as the page tests on `main` already do.
- Time: fake timers for the autosave and the 30-day draft expiry; the clock fake in the module tests.
- Database tests use the assigned `DATABASE_URL_TEST` database only, reset to a freshly migrated schema by the `database` project; `web-int` runs after the seed.
- Data: synthetic only. Every address uses `example.test`, every doctor, facility, person and story is invented, and no real person or facility appears anywhere, least of all in a negative account.
