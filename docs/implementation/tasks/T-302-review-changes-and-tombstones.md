# T-302 — Review changes: corrections, follow-ups, versioning, tombstones, restore, redaction

| Field | Value |
|---|---|
| Story | STORY-REV-002 (later care), STORY-REV-003, FR-EDIT-001–005 |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-301, T-405 (web-tier email queueing, FD-075) |
| Parallel-safe with | T-303, T-304, T-306 (composer reads only T-301 commands), T-207 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-049** — An author's soft delete is domain-only state: `deleted` exists in the domain state union only, the stored `state` is unchanged, and `deleted_at` and `restore_until` are set. No `deleted` value is added to the database enum and no migration is written (`ISS-147` is closed). Changes Step 4 (state machine), Step 8 (repository reads) and Acceptance checks.
- **FD-073** — This task builds no legal-hold check. T-309, which comes after this task, adds the review hold check (Retention's `RetentionSubject` port) into the `review.delete` path. Changes Step 5 (`review.delete`) and Not in scope.
- **FD-070 / FD-075 (superseded for this task by FD-087, see the Contract Design amendments)** — The moderation email for a hide or a restore of a review is queued from the web tier, not by the worker. `review.setState` calls T-405's web-tier email queueing directly, in the same transaction as the state change, for the events where T-405's routing table (step 1) sends moderation email (`review.hidden` and `review.restored`, to the review's author). It fills `to_email_enc` through T-405 and applies the author's preferences (FD-047, FD-070). Contract Design names the call. T-405 therefore comes before this task. Changes: Depends on, Step 5 (`review.setState`) and a new acceptance row.

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-087 (C9) — no email from `review.setState`** — `review.setState` queues no email and creates no notice, and the author's own `review.delete` and `review.restore` queue none either. The deciding moderation command queues the one email: `report.file` (T-403) for a hide, `moderation.decide`, `moderation.restore` and `appeal.decide` (T-404). This supersedes the FD-070/FD-075 amendment above for this task. T-302's FD-075 acceptance row moves to T-403 and T-404 (marked moved below, matching rows added there). The Depends on edge to T-405 stays only as build order. Changes: step 5 (`review.setState`, `review.delete`, `review.restore`) and the acceptance rows.
- **C9 `review.setState`** — Input `{reviewId, event: hideThreshold | hideCritical | hide | restore | remove}`; callers are `report.file` (T-403), `moderation.decide`, `moderation.restore` and `appeal.decide` (T-404); outbox `review.hidden` and `review.restored`, which route to no notice (C15). T-403 extends the threshold events.
- **FD-077 / C9 — `review.deletionStep`** — T-302 builds the review module's deletion step commands, which T-410 wires in `modules/review/deletion-participant.ts`. Input `{accountId, keepHeld: true}`. Web tier: delete the account's drafts and its facility reviews (tombstone when discussion exists), skipping held rows. Worker entry: tombstone when discussion exists, else soft delete, each review of the account, skipping held rows. The hold lookup itself is T-309's `retention.activeHold`; until T-309 lands the step treats no row as held. Changes: Owned paths, a new step 5 command and acceptance rows.
- **FD-079 / C3 — held items look deleted** — An author's `review.delete` of a held review behaves exactly as an unheld delete for the author: gone from every public view and the author's list, and the author is never told of the hold. T-309 adds the check; this task's `delete` must not branch on a hold or expose one in its result.

## Amendments — release 1 (FD-105, FD-049 corrections part)

These decisions are binding and override the text below where they differ. Release 1 builds only the corrections part of this task, inside Unit U22 `t-302-review-changes-and-tombstones` (record: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-302-review-changes-and-tombstones/`).

- **FD-105 — what release 1 builds** — the author corrects their own published review (FR69): `review.correct`, `review.getOwnForEdit` (a recorded additive query) and `review.getHistory`, the pure `packages/domain/src/review/versioning.ts`, the edit route and `EditForm` for quick and detailed reviews, `correctReviewAction` in `apps/web/src/server/actions/review-edit.ts`, and the internals of U47's `<ReviewHistory reviewPublicId>` slot. Follow-ups, `delete`, tombstones, `restore`, `setState`, `redact` and `review.deletionStep` are release 2, so the acceptance rows "Latest on top", "Tombstone vs delete", "Restore window", "Redaction only", "Grapheme safety", the FD-049, FD-087, FD-077 and FD-079 rows and the follow-up and delete events are deferred. FD-049's soft-delete rule stays binding for the release-2 build.
- **Material change** — a correction to the story, a section, the sentiment, the outcome or the Reviewer's labels is material (`CORRECTION_FIELDS`); it writes a version row whose snapshot lists `corrected`, shows "Edited" and a dated correction line, and keeps the version just before it readable to every reader under "Show original" (AC6.3.2). A title-only edit writes a version row with `corrected: []`: "Edited" is shown, but no correction line and no original. No follow-up row is written for a correction in release 1. This replaces the row "Material edit creates version + dated correction".
- **Not editable** — a review that is not published (and eligible) answers `not_found`, not `review.not_editable`; another account's review and an unknown id answer the same (BR1.1). This replaces the row "Hidden not editable".
- **Repository** — the release-1 methods are on U47's `packages/database/src/repositories/review-module.ts` (`lockForCorrection`, `updateContent`, `findOwnForEdit`, `listVersions`, U47's `insertVersion`); the projection is not extended, and the T-302 stubs in `packages/database/src/repositories/review.ts` stay for U50 (review R-08). No table, column, migration or worker code. Step 8 is narrowed accordingly.
- **Audit, events and limits** — the audit action is `review.corrected` with the author persona as actor, and `review_versions.actor_id` is the persona (FD-113); the outbox event is `review.changed {reviewId, doctorId, branchId}`; corrections send no email and take no reason; at most 30 committed corrections per account in 24 hours (`errors.review.correctionsLimit`); a stale `expectedVersion` answers `conflict` (`errors.review.editConflict`, with a reload link).
- **Acceptance commands as built** — the `@rk/...` filters do not exist; run the unit-scoped commands of `construction/t-302-review-changes-and-tombstones/code-generation/unit-test-instructions.md` (`pnpm exec vitest run --config vitest.workspace.ts --project domain|contracts|application|database|web|web-int …`; run `--project test-support-seed` first against a fresh test database).

## Goal

Everything that changes a published account after publication without erasing history: dated
corrections with versions and the `(edited)` marker, follow-ups and later care with "latest status
on top" that the author cannot pin, author deletion that leaves a tombstone when discussion exists,
a 30-day restore window driven by the `Clock` port, and the moderator-only `review.redact` command
that can remove identifiers but never rewrite narrative. Outbox and search effects for each.

## Read first

1. `docs/implementation/01-conventions.md` §3, §4, §5, §10
2. `docs/implementation/02-data-model.md` §6 (`review_versions`, `review_follow_ups`, `restore_until`), §17 (publication transitions incl. `deleted_tombstone`, `deleted`, author restore)
3. `docs/implementation/03-routes-and-contracts.md` §4 "review" (`addFollowUp`, `correct`, `delete`, `restore`), "moderation" (`review.redact` is called by `moderation.decide`; `moderation.narrative_locked`), §5 events
4. `docs/scope-of-work.md` §2 last bullet and §4 (chronology; latest reported status on top; cannot be pinned)
5. Prototype: `app.js` `renderAccount` 848–866 (spine + later-care rendering, `current` is the last element), `renderMine` 1624–1660 (delete → restorable tombstone; `mine.deleteNote` promises 30 days), `label.edited`, `label.followUp`, `experience.currentStatus`, `experience.currentNote`, `experience.laterCare`, `experience.laterCareNote` strings in `rogikotha-data.js`; `followUps` and `laterCare` fixtures (note: `laterCare` is one entry per review with a `provider` free-text)
6. T-301's `projection.ts` and `review-state.ts` (you extend both)

## Owned paths

- `packages/domain/src/review/follow-up.ts`, `packages/domain/src/review/versioning.ts`, `packages/domain/src/review/redaction.ts`, updates to `review-state.ts` and `policies.ts`
- `packages/application/src/modules/review/commands/{add-follow-up,correct,delete,restore,redact,set-state,deletion-step}.ts` + tests (`deletion-step.ts`: FD-077, wired by T-410)
- `packages/application/src/modules/review/projection.ts` (extend: followUps, laterCare, `editedAt`, tombstone branch)
- `packages/application/src/modules/review/queries/get-experience.ts` (tombstone branch), `get-history.ts` (authorised history)
- `packages/application/src/ports/repositories/review.ts` (extend)
- `packages/database/src/repositories/review.ts` (extend) + int tests
- `packages/contracts/src/schemas/review.ts` (extend), `view-models/experience.ts` (extend)
- `packages/test-support/src/fakes/review-repository.ts`, `fakes/clock.ts` (if not present), builders
- `packages/i18n/messages/{en,bn}.json` — `errors.review.notEditable`, `errors.review.restoreExpired`, `errors.moderation.narrativeLocked`, `experience.tombstone`, `experience.tombstoneWhy`, `experience.editedOn`

## Not in scope

Moderation cases, reports, the `moderation.decide` command itself (T-404 calls `review.redact` and `review.setState`). Workspace UI (T-409). Search index refresh job (T-205; this task emits events). Facility review edits beyond delete/restore (mirror `delete`/`restore` only). Legal-hold checks: this task builds none; T-309 adds the review hold check (Retention's `RetentionSubject` port) into the `review.delete` path after this task merges (FD-073).

## Steps

1. **Follow-ups** `follow-up.ts`: `FollowUp {id, kind: follow_up|correction|later_care, dated: PeriodMonth, body, laterProvider?, createdAt}`; `orderForDisplay(followUps)` → sorted by `dated` desc then `createdAt` desc; `latestStatusOf` (from T-301) re-exported; `later_care` entries are rendered as the "Later or alternative care" callout — at most the newest one is `laterCare` in the VM, older ones stay in the spine with a `later_care` kind label.
2. **Versioning** `versioning.ts`: `snapshotOf(review)` (title, body, sections, claims, tags), `diffMaterial(before, after)` → `true` when title/body/sections/claims changed (tags alone are not material); `isEdited(review)` → `version > 1`.
3. **Redaction** `redaction.ts`: `applyRedaction(text, ranges: [{start, end}])` — replaces each grapheme-aligned range with `[redacted]` (i18n key `label.redacted` resolved at render time; store the literal token `⁣[redacted]⁣` so both locales can substitute); overlapping ranges merged; ranges outside bounds → `err('validation')`. Anything else is not a redaction.
4. **State machine**: add events `deleteWithDiscussion → deleted_tombstone`, `deleteWithoutDiscussion → deleted`. `deleted` is domain-only state (FD-049): add it to the domain state union only, never to the database `publication_state` enum, and write no migration for it (`ISS-147` is closed). Persist `state = 'deleted_tombstone'` when discussion exists; otherwise keep the stored `state` unchanged and set `deleted_at` and `restore_until` (FD-049). The projection filter treats `deleted_at IS NOT NULL` without a tombstone as not published (§17). Record this mapping in the `review-state.ts` header comment, citing FD-049. `authorRestore` allowed from both while `clock.now() <= restore_until`.
5. **Commands**:
   - `review.addFollowUp {reviewId, kind, datedYear, datedMonth, body, laterProvider?, laterDoctorPublicId?}` · owner · `dated` may not be in the future (Clock) · inserts `review_follow_ups`, recomputes `latest_status`, `version += 1`? **No** — follow-ups are additive, not versions; only `correct` bumps `version`. Outbox `review.changed`. Audit `review:<id>` `follow_up_added {kind}`.
   - `review.correct {reviewId, title?, body?, sections?, claims?, tags?}` · owner · refused when state ∉ {`published`, `hidden_pending_review`} (`review.not_editable`) · writes `review_versions` (previous snapshot, `change_kind correction`, `actor_kind author`) · when `diffMaterial` is true, also inserts a `correction` follow-up dated `clock.now()` with the author's `reason` (required in that case) · `version += 1` · outbox `review.changed` · audit.
   - `review.delete {reviewId}` · owner · `CommunityRepository.countComments(reviewId) > 0` (port method; T-401 implements; fake returns 0/N) → `deleted_tombstone` else soft delete (stored `state` unchanged, FD-049) · `deleted_at = now`, `restore_until = now + 30 d` · no legal-hold check here; T-309 adds it to this command (FD-073) · outbox `review.deleted` · audit · evidence items of the review are **not** touched here (retention/deletion orchestration owns them — T-309/T-410); public artifacts become unreachable because `evidence.getPublic` requires the review to be `published` (add that check to the port contract now, T-305 implements).
   - `review.restore {reviewId}` · owner · `clock.now() <= restore_until` else `review.restore_expired` · back to `published` · outbox `review.restored` · audit.
   - `review.redact {reviewId, ranges: {field: 'title'|'body'|'sections.<key>', start, end}[], reasonCode}` · requires `capability content.act` (called by `moderation.decide` — also callable directly by staff for tests) · applies `applyRedaction` per field · `review_versions` row with `change_kind moderation_redaction`, `actor_kind moderator` · any input carrying replacement text or a field other than the allowed ones → `moderation.narrative_locked` · audit stream `review:<id>` **and** `case:<code>` when `caseCode` is passed.
   - `review.setState {reviewId, event}` · internal (staff or system actor) · used by moderation/report threshold; runs the state machine; outbox `review.hidden|restored`; queues no email and creates no notice (FD-087). The deciding moderation command (T-403's `report.file`, T-404's `moderation.decide`, `moderation.restore` and `appeal.decide`) queues the one email. The author's own `review.delete` and `review.restore` send nothing either (FD-087).
6. **Projection**: `followUps: orderForDisplay(...)` with `isCurrent` on the first; `laterCare` = newest `later_care` with `{providerText, body}`; `editedAt` (month/year) when `version > 1`; `history` is **not** in the public VM. Tombstone: `review.getExperience` returns `{kind: 'tombstone', title: null, message: 'experience.tombstone', threadSlot: reviewId, related: []}` for `deleted_tombstone` — the thread still renders (T-402) so replies keep context; soft-deleted (`deleted_at` set, no discussion) → `not_found`.
7. **History query** `review.getHistory {reviewId}` · owner or staff `content.act` → versions with snapshots and change kinds (T-409/T-406 may use later; keep it minimal).
8. **Repository**: `insertFollowUp`, `listFollowUps`, `insertVersion`, `listVersions`, `updateFields`, `markDeleted`, `markRestored`, `setState`; `getByPublicId` must now return `deleted_tombstone` rows (the query decides the branch) but never `deleted_at IS NOT NULL` without tombstone. Because a soft-deleted row keeps `state = 'published'` (FD-049), every published-only read in `review.ts`, including T-201's aggregate and card reads, also requires `deleted_at IS NULL`.
9. Strings in both dictionaries; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Latest on top, no pinning | `pnpm --filter @rk/domain test follow-up` | given follow-ups dated May, Aug, Jun inserted in that order, display order is Aug, Jun, May and `isCurrent` is Aug regardless of insertion order; there is no API to set `isCurrent` |
| Material edit creates version + dated correction | `pnpm --filter @rk/application test correct` | after `correct({body})` → `review_versions.length === 1`, one `correction` follow-up, `version === 2`, VM `editedAt` set; `correct({tags})` alone → version row but no follow-up and `editedAt` still set? → **`editedAt` set only for material edits**; assert |
| Tombstone vs delete | `… test delete` | with 1 comment → `deleted_tombstone`, `getExperience` returns tombstone VM; with 0 comments → `not_found` |
| Restore window | `… test restore` | `FakeClock` at +29 d → restored; at +31 d → `review.restore_expired` |
| Redaction only | `… test redact` | ranges replaced by token; a payload with `replacement: 'x'` or `field: 'sentiment'` → `moderation.narrative_locked`; overlapping ranges merged |
| Grapheme safety | `pnpm --filter @rk/domain test redaction` | redacting inside a Bengali conjunct snaps to grapheme boundaries (assert with `Intl.Segmenter`) |
| Events | application tests | `review.changed` on follow-up/correct, `review.deleted`, `review.restored`, `review.hidden` on `setState(autoHide)` |
| Hidden not editable | `… test correct` | state `hidden` → `review.not_editable` |
| DB | `pnpm --filter @rk/database test review.int` | versions append-only trigger fires on UPDATE attempt (expect `append_only_violation`) |
| FD-049: soft delete is domain-only state (AC6.3.4) | `pnpm --filter @rk/database test review.int` | deleting a `published` review with 0 comments leaves the stored `state = 'published'`, sets `deleted_at` and `restore_until = deleted_at + 30 d`; the database `publication_state` enum has no `deleted` value and this task adds no migration |
| FD-049: soft-deleted review leaves summaries (AC6.3.4) | `pnpm --filter @rk/database test review.int` | after the soft delete, `publishedForDoctor`, `review.sentimentDistribution`, `review.outcomeDistribution` and `listRecentCards` no longer include the review, and `getExperience` returns `not_found`; after `restore` it is included again (AC6.3.5) |
| FD-075: Hide and restore email from the web tier (AC10.1.4, AC10.1.5) | moved to T-403 and T-404 (FD-087); not run in this task | see T-403 (`report.file` hide) and T-404 (`moderation.decide`, `moderation.restore`, `appeal.decide`) |
| FD-087: `review.setState` sends nothing (C9) | application test: `review.setState` through `hideThreshold`, `hide`, `restore` and `remove` for a synthetic author with `emailModeration` on | state changes and `review.hidden` / `review.restored` outbox rows are written; zero `email_deliveries` rows, zero `mail.send` jobs and zero notice rows come from the command |
| FD-087: author's own delete and restore send nothing (C9) | same, with `review.delete` then `review.restore` by the author | no `email_deliveries` row, no `mail.send` job and no notice for either command |
| FD-077: deletion step skips held rows (C9) | application test of `review.deletionStep` with a fake hold lookup marking review R2 held: account has drafts, a facility review, R1 (no discussion), R2 (held) and R3 (with discussion) | web entry removes the drafts and facility review; worker entry soft-deletes R1, tombstones R3 and leaves R2 untouched; running it twice changes nothing more |
| FD-079: held delete looks normal to the author (C3) | after T-309 lands, delete a held review as its author | the result and the author's list are identical to an unheld delete; the data stays; no message or field mentions a hold |
| Tree | `pnpm check` | green |

## Tests to write

- `follow-up.test.ts`, `versioning.test.ts`, `redaction.test.ts` (domain, incl. Bengali fixtures and empty ranges).
- `add-follow-up.test.ts` (owner refusal, future date refusal, later_care provider text stored, latest_status recomputed).
- `correct.test.ts`, `delete.test.ts`, `restore.test.ts`, `redact.test.ts`, `set-state.test.ts` (each with audit + outbox assertions).
- `get-experience.test.ts` tombstone branch: VM contains no title/body/author; `threadSlot` present.
- `review.int.test.ts` additions: append-only trigger; `restore_until` stored as `timestamptz`; tombstone row still returned by `getByPublicId`; soft delete keeps the stored `state` and drops the review from every published-only read (FD-049).

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Author "edits" a negative account into a different story after replies exist | versions kept; material edit surfaces `editedAt` + dated correction | `correct.test.ts` |
| Moderator rewrites narrative via redaction | `redact` accepts ranges only; any replacement text refused | `redact.test.ts` |
| Author pins an old "everything was fine" follow-up on top | ordering is by date desc, no pin field | `follow-up.test.ts` |
| Delete to dodge a moderation case, then restore after the case closes | state machine: `deleted_tombstone` from `hidden` keeps `hidden_reason_code`; restore from a moderator-hidden state is refused (`authorRestore` allowed only when `hidden_at IS NULL`) — add this rule and test | `restore.test.ts` |
| Restore after 30 d via clock skew | `Clock` port only; DB `restore_until` compared server-side | `restore.test.ts` |
| Tombstone leaks author/title | tombstone VM has no author/title/body | `get-experience.test.ts` |

## Hard-rule checklist

- [ ] Latest reported status on top; author cannot pin.
- [ ] Material changes become dated corrections; history preserved in `review_versions`.
- [ ] Tombstone only when discussion context exists; 30-day restore.
- [ ] Moderation cannot rewrite substantive narrative (`narrative_locked`).
- [ ] Tombstone projection carries no identity or narrative.
- [ ] Both dictionaries updated.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

Built in release 1 by Unit U22 `t-302-review-changes-and-tombstones` (branch `bolt/t-302-review-changes-and-tombstones`, 2026-11-07), corrections part only; the full record is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-302-review-changes-and-tombstones/code-generation/`.

### What changed
- Domain `packages/domain/src/review/versioning.ts` (`normaliseContent`, `classifyChange`, `toVersionSnapshot`, `toHistory`); contracts `CorrectReviewInput`, `GetOwnForEditInput`, `GetHistoryInput`, `CORRECTION_FIELDS`, `EditReviewVM`, `ReviewHistoryVM`.
- Review module: `review.correct`, `review.getOwnForEdit` (recorded addition) and `review.getHistory`; repository methods `lockForCorrection`, `updateContent`, `findOwnForEdit`, `listVersions` on `review-module.ts` and the fake; no migration.
- Web: the edit route and `EditForm` for quick and detailed reviews, `correctReviewAction` in `server/actions/review-edit.ts`, the `<ReviewHistory>` slot internals with `OriginalText` and `VersionList`, the edit link for every review kind; the demo edit code only U22 called is removed.
- i18n: the `history.*` keys, `compose.edit.reload`, `compose.edit.correctionNote`, `errors.review.correctionsLimit`, `errors.review.editConflict` in en and bn.

### Not done and why
- Follow-ups, delete, tombstones, restore, `setState`, `redact` and `review.deletionStep`: release 2 (FD-105). Tags cannot be corrected, and the author's version list shows no texts (design § 10).
- The shared demo items (`getOwnReviewForEdit`, `personasOf`, `getReviewByPublicId`, the `server/data` reviews binding, `DemoReviewEditRow`, `DemoUpdateReviewFields`, `demo/reviews.ts`) are deleted at merge only when no caller is left (plan Step 33); leftovers go to U50.

### Questions for the human
- The Bengali copy of the new keys awaits review at U50 (FD-042).
- A material correction keeps the earlier wording public, so an author cannot remove their own earlier text by correcting it until delete lands in release 2. Confirm this is acceptable for the demo.

### Follow-ups
- Proposed `ISS-` rows (U22's range ISS-720–749, numbered at merge, plan Step 32): ISS-720 (S4, the original's `lang` comes from its script; add the content language to `OriginalTextVM` in release 2), ISS-721 (S4, tooling: a fresh worktree needs `next typegen` or a build before `pnpm check`'s lint), ISS-725 (S4, the two `errors.review.*` keys are field-error-only keys), and the five S4 rows of the design's § 10.

### `pnpm check` output summary
- Green on the Bolt branch (plan Step 31): 302 test files, 3384 passed plus 2 expected failures; lint 0 errors; coverage lines 95.50% overall (domain 99.65%, contracts 100%, application 90.62%, database 98.11%, test-support 95.38%, apps/web 95.47%). `pnpm smoke`: 25 files, 47 tests. `pnpm test:int`: 58 files, 393 passed plus 2 expected failures.

### Hard-rule evidence
- No score and Not provided: `versioning.test.ts`, `packages/contracts/src/schemas/review.test.ts`. Reviewer's label framing: `OriginalText.test.tsx`. Persona, never account, as the version and audit actor: `correct.test.ts`, `review-correction.int.test.ts` (`web-int`). Anonymity (same `not_found` for a real and a forged id): `correct.test.ts`, `get-history.test.ts`, `review-correction.int.test.ts`. Both dictionaries: `pnpm i18n:check`. No agent or tool attribution: `pnpm check:identity`. Acceptance rows executed expected against observed: plan Step 31.
