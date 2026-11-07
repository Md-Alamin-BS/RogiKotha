# Code summary — U47 `u47-reviews`

Completed at plan Step 61 (2026-11-07). Branch `bolt/u47-reviews`, worktree `rk-u47`, cut from `153a65c`. The plan is `code-generation-plan.md`, the trace `traceability.json`, the written paths `source-manifest.json`. Covers T-301 (Review module core), T-306 (composer) and T-307 (experience page, index, author page) for release 1 (FD-105).

## What was built

- **Domain** (Steps 6-8): `packages/domain/src/review/review.ts` (`minimumFieldsMissing`, `tagRuleOutcome`, `periodValid`, `exactDateValid`, `dhakaCalendarDate`, `graphemeLength`, `deriveTitle`) and `facility-review.ts` (nine criteria, no score), with their tests.
- **Contracts** (Steps 9-12): `DraftPayload` (ENT-006), `SaveDraftInput` and the other draft inputs, `ComposerVM`, `DraftSummaryVM`, `OwnReviewVM`, `PreviewVM` and `FacilityPreviewVM`, the slimmed `ExperiencePageVM`, the error code `review.anonymous_new_doctor`, the `review.published` outbox payload.
- **Database** (Steps 13-19): the `ReviewModuleRepository` port (`ports/repositories/review.ts`) and `PgReviewModuleRepository` (`repositories/review-module.ts`: encrypted drafts, publish rows, versions, tags, facility reviews, eligible reads, own lists), U46's `listExperienceCards` extended with `personaIds` and `excludePublicId`; no migration.
- **Test-support** (Step 20): `aDraftPayload()` builders and `fakes/review-repository.ts`.
- **Application** (Steps 21-31): `createReviewModule` (`saveDraft`, `discardDraft`, `getDraft`, `listOwnDrafts`, `preview`, `publish`, `facilityReviewPublish`, `getExperience`, `countExperiences`, `authorCards`, `listOwnReviews`, `hasOwnReviewOfDoctor`), the four seams with the pinned `Tx`-first calling convention plus `lastEditedAt`, the shared projection, `taxonomy.listSpecialties`.
- **Web wiring** (Steps 35-38): U47's block in `server/container.ts`, the actions in `server/actions/review.ts`, the `web-int` module test.
- **Composer** (Steps 39-46): `Composer`, `StepRail`, `PreviewAside`, `DraftList`, `StepCare`, `StepStory`, `StepHowItWent`, `StepCheck`, `TagPicker`, `SafetyChecks`, `NewDoctorFields`, the reducer, autosave and safety checks, all new keys in both languages.
- **Pages and slots** (Steps 47-54): `/write` behind U9's gate, the experience page with `CommentThread`, `EvidenceSection` and `ReviewHistory` slots, the index, the author page, the own-review list on `/me`, U47's block in `patient.css`.
- **Retirement** (Steps 55-58): the demo write path and the demo compose, detail and index components are deleted; the shared tests moved; two new smoke files.
- **Follow-ups** (Step 58a): ISS-517 and ISS-518 fixed (sign-in return locale, narrowed `WebIdentity`).
- **Records** (Step 61): ISS-519 to ISS-546, the dated notes in `contract-summary.md` (C9, C7, C6, C16, C1 and C19), the amendments in the T-301, T-306 and T-307 task files, this summary, `traceability.json`, `source-manifest.json`.

## Gate counts

- Baseline (Step 1, `153a65c`): `pnpm check` 269 test files, 2767 passed plus 2 expected failures; `pnpm smoke` 21 files, 41 tests.
- Final (Step 61, after the Step 60 fix): `pnpm check` green, 288 files, 3146 passed plus 2 expected failures (3148); ESLint 0 errors and the one pre-existing warning (`packages/i18n/src/routing.ts:17`); `format:check`, boundaries, identity, i18n parity (948 keys), `contrast`, `contrast:patient`, `check:motion` and the build all pass. `pnpm smoke` green: 23 files, 44 tests (two files and three tests more than the baseline; no assertion removed or skipped). `pnpm test:int` ran at Step 59: 55 files, 378 passed plus 2 expected failures.
- `npx impeccable detect apps/web/src --no-advisory`: no findings.

## Line coverage before and after (summed per package from `coverage/coverage-summary.json`)

| Package | Before | After |
|---|---|---|
| `packages/domain` | 98.67% (74/75) | 99.48% (191/192) |
| `packages/contracts` | 100% (391/391) | 100% (419/419) |
| `packages/application` | 85.93% (916/1066) | 90.05% (1294/1437) |
| `packages/database` | 97.80% (1109/1134) | 98.09% (1184/1207) |
| `packages/test-support` | 94.56% (1600/1692) | 95.32% (1752/1838) |
| `apps/web` | 96.82% (2069/2137) | 94.99% (2614/2752) |
| `packages/adapters`, `packages/i18n`, `apps/worker` | 100% | 100% |
| total | 95.08% (6506/6842) | 95.22% (7801/8192) |

Every package stays above the 80% floor (D10); `apps/web` fell by 1.8 points because the new composer and page code is larger than the retired demo code.

## Files outside U47's owned paths

Shared files changed additively, as the plan lists them: `packages/i18n/messages/{en,bn}.json`, `packages/i18n/src/keys.ts` (generated), `apps/web/src/styles/patient.css`, `apps/web/src/server/container.ts`, `app/[locale]/(patient)/me/page.tsx`, the U46 files for the two optional card filters (`packages/contracts/src/schemas/directory.ts`, `repositories/review-reads.ts`, `directory-module.ts` exports, `directory-repositories.ts`), `taxonomy/index.ts` and `ports/repositories/taxonomy.ts`, `ports/outbox.ts`, `contracts/src/errors.ts`, the package barrels, `demo/doctors.ts`, `fakes/repositories-superset.test.ts`, `docs/status/decision-log.md` (FD-109 to FD-112), `docs/implementation/01-conventions.md` (dated note in §5), `docs/implementation/ISSUES.md`, and the three task files.

Not listed in the plan, each recorded as an owned-path addition:

- `docs/implementation/03-routes-and-contracts.md` § 2: one line adds `review.anonymous_new_doctor` to the `ErrorCode` union (the header of `errors.ts` requires it).
- `packages/i18n/scripts/check-parity.mjs`: seven keys appended to `FIELD_ERROR_ONLY_KEYS` (ISS-536).
- `apps/web/src/server/actions/review-slots.ts` (new, not a `'use server'` file) and the `publicEvidence` field of the container (ISS-540).
- `apps/web/src/components/patient/compose/FormErrorSummary.tsx`: one optional prop `onField` (ISS-538).
- `apps/web/src/server/auth/session.ts` and its test, `ContributionGate.tsx` (comment), `CommentThreadView.tsx`, `server/container.test.ts`, `identity-boundary*.test.ts` and `signed-out.adversarial.test.ts` (Step 58a, ISS-517 and ISS-518).
- `apps/web/src/app/pages.test.tsx`, `contribution-access.adversarial.int.test.ts`, `ownership.adversarial.test.ts`, `edit/page.test.tsx` and `EditForm.test.tsx`: mock lines and rows that named deleted code (ISS-541).

## Paths not listed in `source-manifest.json`

Paths under `aidlc/`, `.claude/` and `.agents/` are excluded by rule; U47 changed only the plan and `unit-test-instructions.md` beside this file, `traceability.json`, `source-manifest.json`, this summary, and `contract-design/contract-summary.md`. Paths with `[` or `]` are excluded too; the bracketed route files are:

- `apps/web/src/app/[locale]/(patient)/write/page.tsx` and `page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/page.tsx`, `page.test.tsx` and `loading.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/page.tsx` and `page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/page.test.tsx` (mock lines only)
- `apps/web/src/app/[locale]/(patient)/authors/[username]/page.tsx` and `page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/me/page.tsx` and `page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts`

Deleted files are also left out of the manifest: `compose/ComposeForm.tsx`, `ComposeForm.test.tsx`, `ComposePreview.tsx`, `experience/ExperienceDetail.tsx`, `ExperienceDetail.test.tsx`, `ExperienceIndex.tsx`, `ExperienceIndex.test.tsx` and `experience/ExperienceRow.tsx`.

## ISS ids for the Build and Test record

Rows ISS-519 to ISS-546 are new in `docs/implementation/ISSUES.md`.

- **Found and fixed in U47:** ISS-517 (S2, sign-in return locale), ISS-518 (S2, narrowed identity), ISS-542 (S4, plan ordering), ISS-543 (S2, step slide hook), ISS-545 part 2 (S4, acceptance commands restated in the three task files).
- **Open, for the owner:** ISS-530 (S3, whether U+200C and U+200D are allowed in long text), ISS-533 (S4, `personaIds` on the web-facing card schema).
- **Open, closing in a later Unit:** ISS-521 and ISS-522 (U22), ISS-528, ISS-523, ISS-532, ISS-536 (U50), ISS-540 (U48 and U49), ISS-520 (T-309), ISS-519 (T-105).
- **Open, release 2 or recorded:** ISS-524 to ISS-527, ISS-529, ISS-531.
- **Assumption or process rows, recorded:** ISS-534 to ISS-541, ISS-544, ISS-546.
- Row ISS-269 keeps its draft part open (ISS-524). ISS-200 (S1, repo/lint) looks stale, because lint is green; the integrator can close it or re-check.

## Hand-off to the merge

- `main` now also carries T-207 (and later commits), so the squash merge meets `patient.css`, `en.json`, `bn.json`, `container.ts`, `pages.test.tsx` and `ISSUES.md` appends: keep both sides, then regenerate `packages/i18n/src/keys.ts` (`pnpm --filter @rogikotha/i18n keys`) and run `pnpm i18n:check`.
- FD numbers FD-109 to FD-112 and ISS numbers ISS-519 to ISS-546 are taken on this branch; renumber at merge if another Bolt took them (U47's reserved range is ISS-517 to ISS-599).
- The plan and `unit-test-instructions.md` exist as untracked copies in the main checkout; remove or replace them before the merge, or git refuses to overwrite them.
- The seams (`ReviewSeams`, `Tx` first), the slot props (`{reviewPublicId}`) and the `authorIdentityModeOf` seam freeze at this merge (BR6.8).
- A fresh worktree needs `pnpm build` once before `pnpm lint` (ISS-544).
- Bengali copy for the new keys is drafted and awaits the owner's review at U50 (FD-042).
