# Code summary — U22 `t-302-review-changes-and-tombstones` (T-302, release 1)

## What was built

An author can now correct a published experience, and every reader sees an honest history of it. No table and no migration were added.

- **Correct a review** (`review.correct`): the owner of a published review changes the title, the story or the four sections, sentiment, outcome and claims. A title-only change is presentation: it writes a version and the "Edited" mark, with no correction line. Any other change is a material correction: it writes a dated correction line and keeps the earlier wording readable. A save that changes nothing writes nothing and uses no rate-limit slot. A new free-text label is refused; a stored label may be kept or removed. A stale `expectedVersion` gives `conflict`. The 31st correction in 24 hours gives `rate_limited` (the slot is released on any refusal or rollback). Each correction writes one version row (actor is the author persona), one `review.corrected` audit row and one `review.changed` outbox event, and sends no email.
- **Edit read** (`review.getOwnForEdit`): returns the editor view model to the author only; every other caller, signed in or not, gets the same `not_found`.
- **History read** (`review.getHistory`): returns `editedAt`, the corrections oldest first with their originals, and the author-only version list. No result holds an actor, persona, account or reason.
- **Rules** (`packages/domain/src/review/versioning.ts`): `normaliseContent`, `validateCorrectionContent`, `validateClaims`, `classifyChange`, `toVersionSnapshot`, `readCorrected`, `toHistory`, `toOriginalText`.
- **Repository**: `lockForCorrection`, `updateContent`, `findOwnForEdit` and `listVersions` on the port, the fake and `PgReviewModuleRepository`.
- **Web**: `correctReviewAction` (`server/actions/review-edit.ts`), the rewritten edit route and `EditForm`, the `ReviewHistory` slot with `OriginalText` and `VersionList`, and the edit link for every review kind. The demo edit code that only U22 called is deleted.
- **i18n**: the `history.*` object, `compose.edit.reload`, `compose.edit.correctionNote`, `errors.review.correctionsLimit` and `errors.review.editConflict` in `en` and `bn`; `compose.edit.intro` changed. 975 keys.

## Files

The full list of changed paths is in `source-manifest.json`. Paths with brackets are not listed there (the manifest holds literal paths only):

- `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/page.tsx` (rewritten)
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/page.test.tsx` (rewritten)
- `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts` (edit-page rows moved to the new command)

No file was deleted. The route paths above are the bracketed ones the plan asked to be named.

### Files outside the owned paths

Append-only or removal-only edits to shared files, as the plan's shared-files table allows:

| File | Change |
|---|---|
| `packages/i18n/messages/en.json`, `bn.json`, `src/keys.ts` | U22 keys; `keys.ts` regenerated |
| `packages/i18n/scripts/check-parity.mjs` | two `FIELD_ERROR_ONLY_KEYS` entries (ISS-725) |
| `apps/web/src/styles/patient.css` | U22 section, 7 classes, no motion |
| `packages/domain/src/index.ts` | one export line (there is no `review/index.ts`) |
| `packages/application/src/modules/review/audit.ts`, `limits.ts`, `module.ts` | `reviewCorrected`, the two limit constants, three module methods |
| `packages/application/src/ports/outbox.ts` | `review.changed` payload (not in the shared-files table; the worker relay already routes it; ISS-730) |
| `packages/database/src/schema/review.ts` | the `actor_id` comment only |
| `apps/web/src/components/patient/experience/ExperiencePage.tsx`, `AuthorTools.tsx` (one doc comment), `experience.test.tsx`, `slots.test.tsx` | the quick-only edit-link condition removed; one row moved to `ReviewHistory.test.tsx` |
| `apps/web/src/server/actions/review.ts`, `review.test.ts`, `review-slots.ts` | demo edit code and rows removed; `loadReviewHistory` replaces `loadLastEditedAt` |
| `packages/database/src/demo/reviews.ts`, `reviews.int.test.ts`; `packages/contracts/src/view-models/demo.ts`; `ownership.adversarial.test.ts` | `updateOwnReview`, `snapshotOf`, `DemoUpdateReviewFields` and their rows removed or moved |
| `docs/implementation/ISSUES.md`, `docs/implementation/tasks/T-302-review-changes-and-tombstones.md` | rows ISS-720 to ISS-737; amendments and Hand-off |
| `inception/contract-design/contract-summary.md` | dated C9 note |

## Tests and gate

Step 1 baseline (on `f3eec20`) against the Step 31 gate:

| Measure | Step 1 | Step 31 |
|---|---|---|
| `pnpm test:coverage` files / tests | 291 / 3219 (+2 expected fail) | 302 / 3384 (+2 expected fail) |
| `pnpm smoke` files / tests | 24 / 46 | 25 / 47 |
| `pnpm test:int` | not run | 58 files, 393 passed (+2 expected fail) |
| Lines, overall | 95.21% | 95.50% |

Line coverage per package at Step 31 (from `coverage/coverage-summary.json`): domain 99.65%, contracts 100%, application 90.62%, database 98.11%, test-support 95.38%, apps/web 95.47%, worker 100%, adapters 100%, i18n 100%. The Step 1 run printed no per-package split, so there is no per-package "before"; the overall figure rose and no package is below the 80% floor (D10).

New tests: `versioning.test.ts` (52), `review.test.ts` (extended, 31 in file), `correct.test.ts` (17), `get-own-for-edit.test.ts` (6), `get-history.test.ts` (7), `review-correction.int.test.ts` in `database` (11) and in `web-int` (4), `review-edit.test.ts` (17), `EditForm.test.tsx` (19), edit `page.test.tsx` (9), `ReviewHistory.test.tsx` (10), `OriginalText.test.tsx` (10), `VersionList.test.tsx` (4), fake tests (6 new), and the smoke `review-correction.int.smoke.test.ts` (1). Acceptance rows AC6.2.1 to AC6.2.4, AC6.3.1 and AC6.3.2 are recorded as expected against observed in Step 31 of the plan.

Final gate run for this Step: see the Step 32 note in the plan.

## Key implementation decisions

- `correct` is `libraryFirst`: its handler opens the one unit of work, so a failed commit can release the rate-limit slot (BR1.4, R-07).
- A thrown error and any unmapped code give `errors.common.internal` and one log line with `errorCode` and `correlationId` only.
- The history shows month and year only (privacy); the version list shows no text (ISS-734).
- The original of a material correction is read from the version before it; earlier wording stays public (ISS-735).

## ISS ids for the Build and Test record

Found in U22 (all S4, all in `docs/implementation/ISSUES.md`): ISS-720 (original language guessed from script), ISS-721 (fresh worktree: `next typegen` and heap before lint), ISS-722 (shell heredoc), ISS-723 (snapshot without title, release-2 row kinds), ISS-724 (`auth.email_unverified` not in BR5.4), ISS-725 (field-error-only keys), ISS-726 (claim bounds), ISS-727 (`getOwnForEdit` without a gate), ISS-728 (small history and form choices), ISS-729 (no follow-up row, `not_found` for an unpublished review), ISS-730 (port and command deviations), ISS-731 (Bengali copy awaits the owner, FD-042), ISS-732 (demo correction rows), ISS-733 (tags), ISS-734 (version list without text), ISS-735 (earlier wording stays public), ISS-736 (browser walks not run), ISS-737 (shared demo code until Step 33).

Fixed in U22: none (no earlier row was closed). No `S1`, `S2` or `S3` row was found. Open for Build and Test: ISS-736. Open for merge: ISS-737.

## Merge with main

`main` (`d3e2d66`: U47 review fixes `1924f24` with FD-114, ISS-547 and ISS-548; U49 comments `f065c1b` with ISS-660 to ISS-678) was merged into the Bolt branch. No FD or ISS number clashed, so nothing was renumbered: U22 adds no FD entry and its rows stay ISS-720 to ISS-737.

Conflicts and how they were resolved:

| File | Resolution |
|---|---|
| `packages/application/src/ports/outbox.ts` | both payloads kept: U22's `review.changed` and U49's `comment.posted` (the worker relay already routes both) |
| `apps/web/src/server/actions/review-slots.ts` | U49 removed `loadCommentThread` and U22 removed `loadLastEditedAt`; both stay removed, so only `loadReviewHistory` imports `runCommand` and `ReviewHistoryVM` |
| `apps/web/src/components/patient/experience/slots.test.tsx` | the comment cases (moved by U49 to `CommentThread.test.tsx`) and the old edited-mark case (replaced by U22's `ReviewHistory.test.tsx`) both stay removed; the evidence cases remain |
| `apps/web/src/server/actions/review.ts` | U22's version: the old `saveReviewEdit` form, which main had switched to `hasControlOrFormatExceptJoiners`, stays retired; the correction lives in `review-edit.ts` |
| `apps/web/src/server/actions/ownership.adversarial.test.ts` | U22's `review.correct` stand-in and U49's `comment.post` and `comment.delete` stand-ins are both installed in the container; the demo comment and `updateOwnReview` mocks stay removed; `correctReviewAction` stays in `WRITE_ACTIONS` (sign-in redirect) beside U49's new `COMMENT_ACTIONS` (forbidden state) |
| `docs/implementation/ISSUES.md` | both blocks kept unchanged, in number order: ISS-660 to ISS-678, then ISS-720 to ISS-737 |

Merge fixes (FD-114 applied to the correction path):

- `CorrectReviewInput.title` in `packages/contracts/src/schemas/review.ts` now uses the joiner-tolerant check (`plainText(..., { joiners: true })`), as the draft title does. The story and sections already used `longText`, which main switched to `hasControlOrFormatExceptJoiners`.
- `validateCorrectionContent` in `packages/domain/src/review/versioning.ts` checked title, story and sections with a strict `[\p{Cc}\p{Cf}]` pattern, so a Bengali word with ZWJ would have passed the contract and then been refused by the domain. The pattern now skips U+200C and U+200D, the same rule as `hasControlOrFormatExceptJoiners` (repeated, because the domain imports nothing).
- New tests: `review.test.ts` (contracts) accepts a correction whose title, story and sections hold a Bengali word with ZWJ or ZWNJ and still refuses a bidi override in the title; `versioning.test.ts` (domain) accepts the same words in a quick and a detailed correction.
- `source-manifest.json` is unchanged: the merged branch changes the same 52 files against `main`.

Gate on the merged tree: `pnpm --filter @rogikotha/i18n keys` regenerated 982 keys with no change; `pnpm format:check` green; `pnpm check` green (`pnpm test:coverage` 314 files, 3529 passed and 2 expected fail; i18n parity 982 keys; build compiled); `pnpm smoke` 26 files, 48 tests green. The one lint warning (an unused disable directive in `packages/i18n/src/routing.ts`) comes from `main` and is outside this branch.

## Review fixes (review-01)

The owner delegated the decisions to the agent on 2026-11-04, so each finding takes the fix the review recommends. Built on `bolt/u22-review-fixes`, cut from `main` after U22's squash merge (`16fd56b`).

| Finding | What changed | Tests | ISS |
|---|---|---|---|
| R-01 (Major) Show original wrong for seeded reviews | Both sides. `seed-content.ts` writes the version-1 snapshot in U47's publish shape: `kind`, `title`, `body` (quick) or `sections` (detailed), `sentiment`, `outcome`, `claims`. `toOriginalText` now reads a snapshot without `kind` as detailed whenever its sections are non-empty, so the summary body a legacy seed row holds beside its sections is not shown. A demo database seeded before the fix reads with the right kind until `pnpm demo:reset` | `versioning.test.ts`: a legacy seed snapshot with a summary body and sections is detailed (Bengali, through `toHistory`); a legacy quick one with no sections is quick; a complete seed snapshot reads its kind, sentiment, outcome and labels. `seed.int.test.ts`: every seeded review's version-1 snapshot carries the review's kind, title, sentiment, outcome and claims, sections and no body for detailed, body and no sections for quick, and no `corrected` | ISS-738 |
| R-02 (Major) empty earlier values vanished | `toOriginalText(snapshot, corrected)` keeps a sentiment or outcome the snapshot holds as null, and a label list it holds empty, as `null` or `[]` when the correction names that field; it still leaves out a key the snapshot lacks, and an empty field the correction does not name. `OriginalTextVM.sentiment` and `outcome` accept `null`; `toOriginalVM` passes `null` through. `OriginalText.tsx` renders `experience.sentimentLabel` / `experience.outcomeLabel` / `label.reviewerLabel` with `label.notProvided`, as `Flags` does on the page | `versioning.test.ts`: empty earlier values are kept only for named fields; a named field a legacy snapshot lacks stays out; `toHistory` passes the fields. `get-history.test.ts`: an outcome removed and then added again reads `null` in the second original. `OriginalText.test.tsx` (en and bn): Not provided for sentiment, outcome and labels, no 0; no line for a key the snapshot lacks | ISS-739 |
| R-03 (Minor) heading untrue from the second correction | `history.originalHeading`: "Wording before this correction" / "এই সংশোধনের আগের লেখা". The key is unchanged, so `keys.ts` was not regenerated. The Bengali joins the owner's review (ISS-731) | existing `OriginalText.test.tsx` heading row, en and bn | ISS-740 |
| R-04 (Minor) published check before the lock | `correct.ts` runs `isReviewPublished` again right after `lockForCorrection`, with the same `not_found`. The release-2 gap that moderation redaction must also cover the older originals `listVersions` returns is a new deferred row | `correct.test.ts`: a review hidden while the lock is taken gives `not_found`, writes no version, audit or event, and keeps no rate-limit slot | ISS-741 (fixed), ISS-742 (deferred → release 2) |
| R-05 (Minor) hard-coded label codes | `OriginalText.tsx` takes its list from `REVIEWER_LABEL_CODES` in `@rogikotha/contracts` | `OriginalText.test.tsx` (en and bn): every contract code renders by its name, never as the raw code | ISS-743 |

Files changed: `packages/domain/src/review/versioning.ts` and its test, `packages/contracts/src/view-models/experience.ts`, `packages/application/src/modules/review/queries/get-history.ts` and its test, `packages/application/src/modules/review/commands/correct.ts` and its test, `apps/web/src/components/patient/review-history/OriginalText.tsx` and its test, `packages/i18n/messages/en.json` and `bn.json`, `docs/implementation/ISSUES.md`. Outside the owned paths, as the shared-files table allows for the seed: `packages/test-support/src/seed/seed-content.ts` (the version-1 insert only) and `seed.int.test.ts` (one test added). The approved design's i18n paragraph (`functional-design/functional-spec.md`) still quotes the old heading; ISS-740 records the new wording.

ISS ids of the review fixes: ISS-738 to ISS-743. Fixed here: ISS-738, ISS-739, ISS-740, ISS-741, ISS-743. Deferred to release 2: ISS-742. ASSUMPTION(U22) noted in ISS-739: a section that was empty before a section correction is not shown as Not provided.

Gate on the fix branch: `pnpm build` (a fresh worktree has no `.next`, ISS-721); `pnpm format:check` green; `pnpm check` green (`pnpm test:coverage` 314 files, 3566 passed and 2 expected fail, lines 95.58%; i18n parity 984 keys; build compiled); `pnpm smoke` 26 files, 48 tests green. The one lint warning (`packages/i18n/src/routing.ts`) comes from `main`.
