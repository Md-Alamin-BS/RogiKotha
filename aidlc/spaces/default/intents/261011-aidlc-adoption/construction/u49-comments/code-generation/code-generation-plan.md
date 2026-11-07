# Code Generation plan — U49 `u49-comments` (T-401 + T-402, FD-105)

## Summary

- Builds: the release-1 Community module: `comment.post` (comment or one-level reply, 30 per hour, author keeps the review's identity, others pseudonymous), `comment.delete` (author only, "Comment deleted" placeholder while live replies exist) and `community.thread` (`ThreadVM`, oldest first, 500-row cap), its repository on the existing `comments` table, the server actions, and the discussion UI behind U47's `<CommentThread reviewPublicId>` slot; the demo comment code is removed in the same Bolt
- Touches: U49's owned paths (`packages/domain/src/community/`, `packages/application/src/modules/community/`, `packages/application/src/ports/repositories/community.ts`, `packages/contracts/src/{schemas/community.ts,view-models/thread.ts}`, `packages/database/src/repositories/community.ts`, `packages/database/src/demo/comments.ts`, `packages/test-support/src/{fakes/community-repository.ts,builders/comment.ts}`, `apps/web/src/components/patient/comments/`, `apps/web/src/server/actions/comments.ts`), the recorded additions of design § 8, and the append-only shared files listed below; no migration
- Tests: domain (`buildThread`, body rules, limits), application with `test-support` fakes (every command and query path and refusal, audit and outbox, persona choice, projection batches, `mine`, the cap), database `community.int.test.ts` (each repository method, the depth trigger), components in `en` and `bn`, the server actions, the moved adversarial cases, one new smoke file plus the replaced demo-slice smoke assertion

## Inputs

- Functional Design (reviewed READY, iteration 1): `construction/u49-comments/functional-design/`: `functional-spec.md` (module surface § 1, WF1–WF3, lifecycle, demo replacement § 6, contract changes § 7, owned paths § 8, tests § 9), `entities.md`, `rules.md` (BR1.1–BR6.1), `frontend-components.md`, `functional-design-questions.md` (Q1–Q9), `traceability.json`, and `reviews/review-01.md` (R-01 to R-09, all written into the design: projection batches of 200, `mine` through `ownsPersona`, the recorded demo-removal files, U11 BR3.1, the 30-post limit, the reused keys and `{minutes}`, the `null` mode as `internal`, the cap counting every listed row).
- Unit entry U49 in `inception/units-generation/unit-of-work.md` (owned paths, release-1 cuts, Depends on U47, U11, U9), the C18 constants table (comment post limit) and the note on `docs/planning/02-data-model.md` § 8.
- Task files `docs/implementation/tasks/T-401-*.md` and `T-402-*.md`, and `main` as merged with U47, U11 and U9.

## Where it runs

- Built in batch 3, after U47 has merged (U11 and U9 are merged before it). The Bolt branch `bolt/u49-comments` is cut from `main` after U47's squash merge, in its own git worktree under the swarm (FD-094).
- The orchestrator assigns one test database; `DATABASE_URL_TEST` in the worktree points at that one only. The database project's reset guard accepts names ending in `_test`, so use the `rogikotha_wN_test` form, as U9 did. Never point at another worktree's database.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).
- There is no GitHub Actions workflow and no CI (FD-102). The gate is local: `pnpm check` and `pnpm smoke` on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths, recorded additions and the listed shared files, after reading `git diff --cached`.
- U49 is not in a high-risk class (unit-of-work risk column `—`): no separate adversarial agent and no owner sign-off step. The existing ownership adversarial cases are moved, never dropped (Step 22).

## Steps (test-after, per the Testing Contract)

**Phase A — baseline and runner**

- [ ] **Step 1** — Baseline in the worktree on `bolt/u49-comments`. Confirm `DATABASE_URL_TEST` names the assigned database. Run `pnpm infra:up`; on a fresh worktree run `pnpm build` once (typed routes), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record file and test counts, and the line coverage of `packages/domain`, `packages/application`, `packages/database`, `packages/contracts` and `apps/web`. Read the open `ISSUES.md` rows in the comments area (grep `comment`, `T-401`, `T-402`, `community`). An open `S1` there stops the Unit.
- [ ] **Step 2** — Confirm U47's seams on `main`: `ReviewSeams` exports `reviewIdForPublicId`, `isReviewPublished`, `isReviewAuthor` and `authorIdentityModeOf` (C9 additive, Q2); `<CommentThread reviewPublicId>` is mounted on `experiences/[id]/page.tsx`; U11 exports `personaFor`, `publicProjections` and `IdentityOwnership.ownsPersona`. If `authorIdentityModeOf` is missing, stop and record an `ISS-` row: it is agreed in `contract-summary.md` and added by the review module's owner, never by U49. Dependency check: U49 adds no dependency; reuse the latest `next`, `react` and `zod` entry in `docs/status/dependency-check-log.md` if under 3 days old, otherwise append a dated entry. No new FD is needed (FD-046, FD-105 cover it).
- [ ] **Step 3** — Verify the runner (Vitest 4 through `vitest.workspace.ts`; projects `domain`, `contracts`, `application`, `database`, `test-support`, `web`) and record any correction to the commands in `unit-test-instructions.md`. Run the existing comment tests with the unit-scoped command (`apps/web/src/components/patient/comments/`, `server/actions/comments.test.ts`, `packages/database/src/demo/comments.int.test.ts`) and record the count before any change.
- [ ] **Step 4** — Grep every caller that this Unit will touch and record the list in this step's note: `grep -rn "demo.comments\|demo/comments\|comments\.\(addComment\|listComments\|deleteOwnComment\)\|PgCommunityRepository\|CommentPostInput\|CommentDeleteInput\|ThreadVM\|getReviewByPublicId" apps packages --include=*.ts --include=*.tsx`. Expected: design § 6 rows plus `not-implemented.test.ts` and `test-support` `repositories-superset.test.ts` if they name the community stub. Any caller outside that list is recorded as an `ISS-` row before editing.

**Phase B — data model and contracts**

- [ ] **Step 5** — Contracts, `packages/contracts/src/schemas/community.ts`: add `PostCommentInput {reviewPublicId, parentPublicId?, body}`, `DeleteCommentInput {commentPublicId}`, `GetThreadInput {reviewPublicId}` with `PUBLIC_ID_RE` and a body trimmed, NFC-normalised and checked 1–2000 code points (BR1.2; constant from domain `COMMENT_BODY_MAX`, or a mirrored constant if `contracts` may not import `domain`, marked `ASSUMPTION(U49)`). Keep the release-2 schemas (`CommentEditInput`, reactions) that other files still import; drop `CommentPostInput` and `CommentDeleteInput` only if Step 4 found no caller.
- [ ] **Step 6** — Contracts, `packages/contracts/src/view-models/thread.ts`: replace the T-003 stub with `ThreadVM {open, items, truncated}`, `ThreadItemVM {kind, comment?, placeholderPublicId?, replies}`, `CommentVM {publicId, author: PersonaPublicVM, body, postedAt, mine, isReply}` (entities.md). No `likeCount`, `dangerous`, `providerFor`, `edited`, `reviewId` or any internal id (BR3.7, BR4.1). Append exports to `packages/contracts/src/index.ts` only if the barrel does not already re-export these files. Confirm `community.reply_depth` is in `errors.ts` (it is on `main`).
- [ ] **Step 7** — Write and run `packages/contracts/src/schemas/community.test.ts`: body at 0, 1, 2000, 2001 code points, whitespace-only, Bengali text and a combining sequence normalised by NFC; bad public ids refused; extra keys refused (`.strict()`); a `ThreadVM` type test that has no id field beyond public ids.
- [ ] **Step 8** — Data model: no migration (Q5). The `comments` table and `fn_comment_depth` trigger in `packages/database/src/migrations/0003_triggers.sql` already hold release 1. Verify with `git diff --stat main -- packages/database/src/migrations packages/database/src/schema` (empty). If a migration ever proves necessary, it takes the next free number at merge time, not at build time, and gets an `ISS-` row.

**Phase C — domain (business logic, pure)**

- [ ] **Step 9** — Implement `packages/domain/src/community/limits.ts` (`COMMENT_BODY_MAX = 2000`, `COMMENT_POST_LIMIT = 30`, `COMMENT_POST_WINDOW_SEC = 3600`, `THREAD_CAP = 500`), `comment.ts` (`normaliseBody`, `isLive(row)`), `deletion.ts` (`tombstoneOnDelete(liveReplies)`, BR2.3), `thread.ts` (`buildThread(rows)` exactly as WF3's pseudocode, BR3.3; `capRows(rows)` returning `{rows, truncated}` over every listed row, BR3.6) and `index.ts`. Append `export * from './community'` to `packages/domain/src/index.ts`.
- [ ] **Step 10** — Write and run `packages/domain/src/community/thread.test.ts`, `comment.test.ts` and `limits.test.ts`: live top-level with live replies; deleted top-level with live replies → placeholder; deleted top-level without live replies → omitted; last live reply deleted → placeholder gone; deleted reply never listed; hidden states never listed; order oldest first by `created_at`, then id; 500 vs 501 rows with tombstones counted; `tombstoneOnDelete(0)` and `(1)`; the limit values pinned.

**Phase D — repository and fakes (data access)**

- [ ] **Step 11** — Port `packages/application/src/ports/repositories/community.ts`: `CommunityRepository { byPublicId(tx, {reviewId?, publicId}), insert(tx, row), countLiveReplies(tx, commentId), markDeleted(tx, {commentId, at, tombstone}), threadRows(tx, {reviewId, limit}) }` with row types (functional-spec § 1). Append its export to `packages/application/src/ports/index.ts` (or the `ports/repositories/index.ts` barrel U11/U47 created).
- [ ] **Step 12** — Implement `packages/database/src/repositories/community.ts`: replace the `NotImplemented` stub with `PgCommunityRepository implements CommunityRepository`, reading and writing `comments` only, never joining `persona_links` or `reviews`. `threadRows` orders by `created_at, id` with `LIMIT 501`. `insert` sets `has_external_link` as the demo does and maps the `fn_comment_depth` raise to `community.reply_depth`. If `not-implemented.test.ts` lists the old stub methods, remove only those rows (recorded addition).
- [ ] **Step 13** — Write and run `packages/database/src/repositories/community.int.test.ts` (database project, assigned test database): each method; `byPublicId` scoped by review; `countLiveReplies` ignores deleted replies; `markDeleted` with and without tombstone; `threadRows` order and limit; the depth trigger refuses a reply to a reply with `community.reply_depth`. Move here the useful cases of `demo/comments.int.test.ts` (it is deleted in Step 23). Seed rows through the existing database test helpers and `test-support` builders, synthetic only.
- [ ] **Step 14** — `packages/test-support/src/fakes/community-repository.ts` (in-memory `CommunityRepository`, same depth refusal) and `builders/comment.ts` (update to the release-1 row shape: `published`, `deleted_tombstone`, `parentId`, `authorPersonaId`, `createdAt`). Append exports to `fakes/index.ts` and `builders/index.ts`. Leave the old community fake in `fakes/repositories.ts` untouched unless `repositories-superset.test.ts` fails on it; then edit only the community lines and record it. Run `timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/` green.

**Phase E — application (business logic)**

- [ ] **Step 15** — Implement `packages/application/src/modules/community/commands/post-comment.ts` (`postCommentCommand` with `defineCommand`): parse, authorize BR1.1, review resolved and published BR1.3, parent check BR1.4, limiter `comment.post:account:<accountId>` BR1.5 after every check, persona choice BR1.6 (`null` mode for the author → `internal`, logger `community.author_mode_missing`, nothing written), insert plus audit `comment.posted` (actor `persona:<id>`) plus outbox `comment.posted {commentId, reviewId}` in one transaction BR1.7. Result `{publicId}`.
- [ ] **Step 16** — Implement `commands/delete-comment.ts` (`deleteCommentCommand`): account actor, `byPublicId`, `ownsPersona` for every found comment, not own / unknown / already deleted → the same `not_found` (BR2.1, BR2.2, BR4.2); `countLiveReplies`, `markDeleted` with `tombstoneOnDelete`; audit `comment.deleted {tombstone}`, no outbox, no limiter (BR2.4). Result `{placeholder}`.
- [ ] **Step 17** — Implement `queries/get-thread.ts` (`getThreadQuery` with `defineQuery`): BR3.1 closed empty thread; `threadRows(limit 501)`, `capRows`, `buildThread`; `publicProjections` in batches of at most 200 distinct persona ids, missing projection → anonymous byline (BR3.4); `ownsPersona` once per distinct live author only for a signed-in viewer (BR3.5); map to `ThreadVM` with public ids only. Then `modules/community/index.ts` with `createCommunityModule(deps): {postComment, deleteComment, getThread}` and the `CommunityModulePorts` type (§ 1). Append the module export to `packages/application/src/index.ts`.
- [ ] **Step 18** — Write and run `commands/post-comment.test.ts`: comment and reply happy paths; unauthenticated, unconfirmed, restricted; unknown and unpublished review (same `not_found`); missing and deleted parent; reply to a reply; rate limited after 30 valid posts with `retryAfterSec`; refusals do not hit the limiter; author of a named and of an anonymous review gets the review's mode; another account is pseudonymous; the `null` mode case writes nothing; one audit and one outbox assertion.
- [ ] **Step 19** — Write and run `commands/delete-comment.test.ts` and `queries/get-thread.test.ts`: delete own with and without live replies; not own, unknown and already deleted return identical `not_found`; audit row with persona actor and no outbox. Thread: closed for unknown and unpublished; 201 distinct authors read in two `publicProjections` batches; signed-out viewer makes no `ownsPersona` call, signed-in makes one per distinct author; 501 rows with tombstones cut to 500 with `truncated`; `ThreadVM` JSON contains no account, persona or internal id; an anonymous author's comment shows the thread alias and the same account's alias differs in another thread (AC3.3.2).

**Phase F — web server (API / endpoint)**

- [ ] **Step 20** — `apps/web/src/server/container.ts`: append U49's block that builds `PgCommunityRepository` and `createCommunityModule({comments, review: reviewModule, identity: identityModule, ownership: identityModule.ownership})`, exposed as `community` (C19). `CommandPorts` is not touched.
- [ ] **Step 21** — Rewrite `apps/web/src/server/actions/comments.ts` on `runCommand` (`postComment`, `deleteComment`) with the error mapping of `frontend-components.md` § Server actions, `{minutes} = ceil(retryAfterSec / 60)`, revalidation of `/en` and `/bn` experience paths, the kept `CommentActionState` type, no `requireAccount` and no demo binding, public ids only in results. Keep the U9 `requireContributor` gate only if it is still called there and the command's own BR1.1 check agrees; record the choice.
- [ ] **Step 22** — Write and run `server/actions/comments.test.ts` (rewritten: each mapping, body kept on refusal, revalidation on success) and move the forged-delete and forged-persona cases of `server/actions/ownership.adversarial.test.ts` onto the new actions, none dropped; edit only the comment lines (U48 edits the evidence lines in the same batch).

**Phase G — demo removal (same Bolt, BR6.1)**

- [ ] **Step 23** — Delete `packages/database/src/demo/comments.ts` and `demo/comments.int.test.ts`; remove `export * as comments` from `demo/index.ts` and `export const comments = bindDb(demo.comments)` from `apps/web/src/server/data.ts` (one line each, keep U48's evidence lines on rebase). Remove the `demo/comments.ts` entry from U11's `persona_links` boundary-test allowlist (BR3.1; find the file with `grep -rn "demo/comments" packages`). Stop calling `demo/reviews.ts` `getReviewByPublicId`; delete it from U47's file only if a grep on the rebased branch shows no caller left (U22, U48), otherwise leave it for the last of them or U50. `DemoComment`, `DemoCommentThread` and `DemoAddCommentInput` in contracts stay for U50. Re-run the Step 4 grep: no `demo.comments` caller left.

**Phase H — i18n and UI (frontend behaviour)**

- [ ] **Step 24** — Add the six new keys to `packages/i18n/messages/en.json` and `bn.json` in the same commit: `disclaimer.comments` (wording from `frontend-components.md`), `experience.noComments`, `experience.discussionClosed`, `experience.threadTruncated`, `experience.deleteConfirm`, `experience.deleteCancel`. Bengali copy is flagged for the owner's copy review at U50. Regenerate `packages/i18n/src/keys.ts` with its script (and after every rebase). Run `timeout 300 pnpm i18n:check`.
- [ ] **Step 25** — Implement the server components in `apps/web/src/components/patient/comments/`: `CommentThread.tsx` (slot props frozen; `getThread`, `getContributionAccess` when open, closed and fallback states, never throws, BR5.5), `CommentDisclaimer.tsx` (always first, BR5.1), `CommentThreadView.tsx` (takes `ThreadVM`, includes `CommentItem`, truncation note), `CommentPlaceholder.tsx` (no author, date or actions). Body rendered as text only.
- [ ] **Step 26** — Implement the client components: `CommentForm.tsx` (`useActionState(postComment)`, `maxLength` 2000, body kept on error, `aria-describedby`, reply variant with hidden `parentPublicId`), `CommentActions.tsx` (Reply toggle with focus in and back, `canReply` top-level and live only, BR5.3), `DeleteCommentButton.tsx` (confirm step, pending disabled, CR-004 live region). No like, report, mention or edit control. Styles only with existing classes; a new class goes in U49's section of `apps/web/src/styles/patient.css` with `/* added: U49 reason */`.
- [ ] **Step 27** — Write and run the component tests in `en` and `bn`: `CommentThread.test.tsx` (rewritten: comments, replies and a placeholder; empty; closed; truncated; each gate state; fallback with the disclaimer still shown), `CommentThreadView.test.tsx` (own comment shows delete, others do not; a reply has no reply button; rendered HTML has no account, persona or internal id), `CommentForm.test.tsx` (extended: keeps the body on refusal, reply variant), `DeleteCommentButton.test.tsx`. Mock `@/server/actions/comments` and `@/server/actions/account`; mock the container's `community.getThread` as U47's slot test does. Run the experience page test unchanged; it must stay green.

**Phase I — smoke, gate and records**

- [ ] **Step 28** — Smoke: add `packages/application/src/modules/community/comments.smoke.test.ts` (fakes): a confirmed account posts a comment and a reply, deletes the parent, and the thread shows the placeholder with the reply. In `packages/database/src/demo/demo-slice.smoke.test.ts` replace the "a comment shows on it" assertion with one through `PgCommunityRepository` (insert, then `threadRows` lists it); record the reason in `code-summary.md` (the demo function is gone; the suite only grows). Run `timeout 600 pnpm smoke`: file and test counts at or above Step 1.
- [ ] **Step 29** — Gate: `timeout 1200 pnpm check` and `timeout 600 pnpm smoke` green, plus `timeout 600 pnpm test:int`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. Every touched package at or above 80% lines, never lowered (D10). Run the T-401 and T-402 release-1 acceptance rows (design `traceability.json`, OK rows) and record expected against observed for Build and Test.
- [ ] **Step 30** — Docs and contracts: update the comments note in `docs/planning/02-data-model.md` § 8 (FD-062's Like and Dislike, reactions are release 2, FD-105); update U49's C10 provider block in `inception/contract-design/contract-summary.md` (public-id inputs, `{placeholder}`, `ThreadVM`, 30 per hour); add the U49 amendments and Hand-off to the T-401 and T-402 task files.
- [ ] **Step 31** — Records: `docs/implementation/ISSUES.md` rows for every defect, workaround or `ASSUMPTION(U49)` found in Steps 1–29, each with a severity and `Found in U49 u49-comments`, plus one `S4` row for the C18 constants in `domain/community/limits.ts` (move to T-105 in release 2); take the next free `ISS-` numbers at merge time. Write `construction/u49-comments/code-generation/code-summary.md` (files, counts, coverage before and after, the smoke replacement reason, the `ISS-` ids found and fixed for the Build and Test record), `traceability.json` (step → BR → AC) and `source-manifest.json` (literal paths only; the bracketed experience route, if touched, is listed in `code-summary.md`).

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–4 | — (baseline, seams, runner, caller list) | — |
| 5–7 | BR1.2, BR3.7, BR4.1 | US8.1 (AC8.1.6), US3.3 (AC3.3.3) |
| 8 | BR1.4 (trigger backstop) | US8.1 (AC8.1.1) |
| 9–10 | BR1.2, BR1.5, BR2.3, BR3.2, BR3.3, BR3.6 | US8.1 (AC8.1.4) |
| 11–14 | BR1.4, BR2.3, BR3.2, BR3.6, BR4.1 | US8.1 (AC8.1.1, AC8.1.4) |
| 15, 18 | BR1.1–BR1.7, BR4.1 | US8.1 (AC8.1.1, AC8.1.6), US3.3 (AC3.3.1, AC3.3.2) |
| 16, 19 | BR2.1–BR2.4, BR4.2 | US8.1 (AC8.1.4), US3.3 (AC3.3.2) |
| 17, 19 | BR3.1–BR3.7, BR4.1 | US8.1 (AC8.1.4), US3.3 (AC3.3.1–AC3.3.3) |
| 20–22 | BR1.1, BR1.5, BR2.1, BR4.1, BR4.2 | US8.1 (AC8.1.1, AC8.1.6), US3.3 (AC3.3.2) |
| 23 | BR6.1 | — |
| 24 | BR5.4 | US8.1 (AC8.1.2, AC8.1.6) |
| 25–27 | BR3.3, BR5.1–BR5.5 | US8.1 (AC8.1.1, AC8.1.2, AC8.1.4, AC8.1.6), US3.3 (AC3.3.3) |
| 28 | BR2.3, BR3.3, BR6.1 | US8.1 (AC8.1.4) |
| 29 | all | US8.1, US3.3 |
| 30–31 | BR1.5 (S4 constants), BR6.1 | — |

Not covered by U49 (design `traceability.json`): AC8.1.3 (editing), AC8.1.5 (provider label), AC3.3.4 (reactions) and AC3.3.5 (staff reveal) are release 2 (FD-105); AC3.3.6 is U47's.

## Owned paths

- `packages/domain/src/community/`
- `packages/application/src/modules/community/`
- `packages/application/src/ports/repositories/community.ts`
- `packages/contracts/src/schemas/community.ts` (and its new test), `packages/contracts/src/view-models/thread.ts`
- `packages/database/src/repositories/community.ts`, `community.int.test.ts`
- `packages/database/src/demo/comments.ts` (deleted)
- `packages/test-support/src/fakes/community-repository.ts`, `packages/test-support/src/builders/comment.ts`
- `apps/web/src/components/patient/comments/`
- `apps/web/src/server/actions/comments.ts`

Recorded additions (design § 8): `demo/comments.int.test.ts` (deleted), the comments line in `demo/index.ts` and in `server/data.ts`, the comment assertion in `demo/demo-slice.smoke.test.ts`, the comment cases in `server/actions/ownership.adversarial.test.ts`, `server/actions/comments.test.ts`, U49's block in `server/container.ts`, the allowlist line in U11's `persona_links` boundary test, the community rows of `repositories/not-implemented.test.ts` and of the `test-support` community fake if Step 4 finds them.

Not touched: the experience page and its test (U47), `components/patient/auth/` (U9), the review and identity modules, `demo/reviews.ts` except the conditional delete in Step 23.

## Shared files (append-only)

| File | U49 use |
|---|---|
| `packages/i18n/messages/en.json`, `packages/i18n/messages/bn.json` | append six keys (Step 24) |
| `packages/i18n/src/keys.ts` | generated; regenerate after every rebase, never merge by hand |
| `packages/domain/src/index.ts`, `packages/application/src/index.ts`, `packages/application/src/ports/index.ts`, `packages/contracts/src/index.ts`, `packages/test-support/src/{fakes,builders}/index.ts` | append U49's exports |
| `apps/web/src/server/container.ts` | append U49's block (Step 20) |
| `apps/web/src/server/data.ts`, `packages/database/src/demo/index.ts` | remove the one comments line only; U48 edits other lines in the same batch |
| `apps/web/src/server/actions/ownership.adversarial.test.ts` | comment cases only (Step 22) |
| `packages/database/src/demo/demo-slice.smoke.test.ts` | the comment assertion only (Step 28) |
| `apps/web/src/styles/patient.css` | U49's section, only if a new class is needed |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of rows U49 fixes |
| `docs/status/dependency-check-log.md` | append only if Step 2 needs a fresh entry |
| `docs/planning/02-data-model.md` | § 8 comments note (Step 30) |
| `inception/contract-design/contract-summary.md` | U49's C10 provider block (Step 30) |
| `docs/implementation/tasks/T-401-*.md`, `T-402-*.md` | amendments and Hand-off |

Merge rules: rebase on `main` before the squash merge; keep both sides of every append-only file and regenerate `keys.ts`. Whichever of U48 and U49 merges second edits only its own lines in `data.ts`, `demo/index.ts` and `ownership.adversarial.test.ts`. U49 adds no migration; if one were ever needed it takes the next free number at merge time. Shared demo code is deleted only when a grep on the rebased branch shows no caller left; otherwise it stays and U50 removes it.

Applicable layers of the Testing Contract: data model (Step 8, no change), repository and data access (Steps 11–14), business logic (Steps 9–10, 15–19), API and endpoint (Steps 20–22), frontend behaviour (Steps 24–27). Environment and build configuration: none beyond the regenerated `keys.ts`. Documentation and traceability: Steps 30–31.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "classic",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: `01-conventions.md` §10 sets per-level test minimums that each task delivers together with its code, and §13's definition of done requires them green before hand-off. In git history, tests land in the same task commit as the implementation (for example T-007 and T-009). No source asks for tests to be written before the code, and test-after is the `org.md` default for the `classic` scope.\n- **Ordering**: Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.\n- Test levels follow `01-conventions.md` §10: domain (every state-transition table and policy function), application (each command's happy path, each authorization refusal and one audit assertion, using `test-support` fakes), database (`*.int.test.ts`, each repository method, migrations apply from empty), component (renders in both `en` and `bn`), and end-to-end with Playwright and axe from T-503.\n- Cumulative smoke suite: each unit adds at least one smoke assertion for what it delivered (`*.smoke.test.ts(x)`, and from T-503 also `apps/web/e2e/smoke/*.spec.ts`). `pnpm smoke` runs the whole suite every time. The suite only grows: removing or skipping a smoke assertion needs a recorded reason.\n- Integration tests: `pnpm test:int` runs the database project against `DATABASE_URL_TEST` (the `rogikotha_test` database, separate from the development database). It resets that database to an empty, freshly migrated schema and runs test files serially. It needs the compose PostgreSQL running.\n- Coverage: an 80% line-coverage floor per package, measured with Vitest `@vitest/coverage-v8` (already installed). T-010 adds the thresholds and the CI run before merge, and raises any package below 80%. Until T-010 lands, the floor cannot be measured: no Vitest config has a coverage block yet. Work before T-010 (CR-009) records \"coverage not measured yet\" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (the empty `domain`, `application` and `adapters` packages are exempt until then). We do not claim a coverage figure we have not measured, and once the floor exists it is never lowered to make a step pass (D10).\n- Existing suites stay green: `pnpm check` (typecheck, lint, unit and integration tests, i18n parity, build) and `pnpm smoke` must pass after every unit, with no assertion removed or skipped. In brownfield work we run the full suite before changing anything, to record a baseline.\n- Test names read as sentences. We use builders, not hand-written fixture objects, and we never assert on implementation details (class names, internal calls). A test must be able to fail.\n- UI units also pass `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` cleanly before they are done (`01-conventions.md` §7.8)."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:eb26df65a70c60644a0bdc6b6fa19a28a2583bae7b61a57b814612d8ad43ebb9",
  "contract_sha256": "sha256:57d068825625cb257445b363810a0b4bbe01d375329dd0df119f640f95c1c9f4"
}
```

## Design decisions taken

Q1 to Q9 and the review points R-01 to R-09 were decided in the Functional Design under the owner's delegation of 2026-11-04 and are built as written. U49 is not a high-risk Unit, so no delegated sign-off is recorded.
