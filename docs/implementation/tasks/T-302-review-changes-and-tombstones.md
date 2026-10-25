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
- **FD-070 / FD-075** — The moderation email for a hide or a restore of a review is queued from the web tier, not by the worker. `review.setState` calls T-405's web-tier email queueing directly, in the same transaction as the state change, for the events where T-405's routing table (step 1) sends moderation email (`review.hidden` and `review.restored`, to the review's author). It fills `to_email_enc` through T-405 and applies the author's preferences (FD-047, FD-070). Contract Design names the call. T-405 therefore comes before this task. Changes: Depends on, Step 5 (`review.setState`) and a new acceptance row.

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
- `packages/application/src/modules/review/commands/{add-follow-up,correct,delete,restore,redact,set-state}.ts` + tests
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
   - `review.setState {reviewId, event}` · internal (staff or system actor) · used by moderation/report threshold; runs the state machine; outbox `review.hidden|restored`; in the same transaction, call T-405's web-tier email queueing for the `moderation` category, addressed to the review's author, with content-free params (FD-075). Callers (T-403's `report.file`, T-404's `moderation.decide` and `moderation.restore`) never queue a second email for the same hide or restore (FD-075). The author's own `review.restore` is not a moderation outcome; whether it queues anything is left to Contract Design and T-405's routing table.
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
| FD-075: Hide and restore email from the web tier (AC10.1.4, AC10.1.5) | application test: `review.setState` to `hidden` and back to `published` for a synthetic author, with `emailModeration` off, then on; then the worker's `mail.send` is run | the command queues the email through T-405's web-tier queueing in the same transaction as the state change: off → no `email_deliveries` row, in-app item still appears; on → one row per outcome with `to_email_enc` filled (encrypted, not plaintext) and content-free params (no review text), and the worker sends it from the decrypted address |
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

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
