# T-404 — Moderation module: queue, decisions, appeals, enforcement, bulk

| Field | Value |
|---|---|
| Story | STORY-MOD-002, STORY-MOD-003, STORY-ADMIN-002 (bulk semantics), STORY-NFR-009 |
| Phase / Lane | 4 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 6–8 h agent; validation 2.5 h |
| Depends on | T-403 (cases, `setState` internals), T-104 (`identity.reveal`), T-103 (roles/capabilities, stepUp), T-105 (config), T-302 (`review.redact`), T-305 (`evidence.remove`), T-405 (web-tier email queueing, FD-075) |
| Parallel-safe with | T-406 (UI can start against the query VMs once step 2 lands — publish the VM file first), T-409 (T-410 comes after this task, FD-069) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-070 / FD-075 (superseded by FD-087, see the Contract Design amendments)** — The moderation email for a decided case, a restore and an appeal outcome is queued from the web tier by this task's commands, not by the worker and not by T-405 alone. `moderation.decide` and `appeal.decide` call T-405's web-tier email queueing directly, in the same transaction as their change. One email per outcome (FD-075): a hide or restore that runs through `review.setState` (or the facility-review and comment `setState` internals) gets its email from that `setState` call only, whoever the caller is; the calling command never queues a second email for the same change. So `moderation.restore` queues nothing itself, and `moderation.decide` queues the `case.decided` email only for actions that do not run `setState` (for example redact or remove); for a hide it relies on the `setState` email. It fills `to_email_enc` through T-405 and applies the affected author's or appellant's preferences (FD-047, FD-070). Contract Design names the call. Changes: Depends on, Parallel-safe with, Not in scope, steps 4, 5 and 6, and a new acceptance row.

- **FD-069** — T-404 builds the Moderation de-identify command that account deletion calls: it removes `reporter_account_id` from the reports the account filed and `appellant_account_id` from the appeals it filed, and keeps the rows. Legal holds still apply (FD-021), but T-410 checks them through the retention module (T-309) before it calls the command (ADR-006), as for T-204's Directory command; the command itself does no hold check and is idempotent. T-410 owns `packages/application/src/modules/moderation/deletion-participant.ts`, the file that calls it. Contract Design names the command. Changes: new step 10, Owned paths, Not in scope, Read first, Tests to write and three new acceptance rows. The reporter still reads "restricted", never blank, after de-identification (hard rule).

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-088 — appeals and bulk deferred** — Release 1 builds only the report queue and case tray with decide, restore and enforcement. **Not in scope (FD-088):** `appeal.file`, `appeal.decide`, `moderation.myAppealable`, the appeals lane, `appeal-policy.ts`, steps 6 (appeals) and 7 (bulk), `moderation.bulkPreview`, `moderation.bulkApply` and `BulkPreviewVM`. They become follow-up tasks after release 1. Their acceptance rows are marked "deferred, FD-088" below, not deleted. The appeals table and its `appellant_account_id` column stay, so the de-identify command still clears that column. Decision notices name no appeal route until appeals exist: the `appealRoute` param is dropped from `notif.moderation.*`.
- **FD-087 (C11) — one email per outcome, from the deciding command** — `moderation.decide` queues exactly one moderation email and one in-app notice to the affected author for every target kind, including hides, because `review.setState`, `facilityReview.setState` and `comment.setState` queue none. `moderation.restore` queues one email and one notice as well. This supersedes the FD-070/FD-075 amendment above, which gave the email to the `setState` call. T-302's restore row moved here (see the FD-087 rows below). The deferred `appeal.decide` would queue its own pair when it is built. Changes: Not in scope, steps 4 and 5 and the acceptance rows.
- **FD-078 (C11) — nullable reporter and appellant** — A forward-only migration in this task makes `reports.reporter_account_id` and `appeals.appellant_account_id` nullable. `moderation.deidentify` (kind: internal, deletion step, web tier; input `{accountId}`) sets both to `NULL`. The reporter still reads "restricted", never blank, and the unique index on `reports` keeps working because `NULL` values do not collide. This settles the open points in step 10: nullable columns, a web-process step, and legal holds checked by T-410 through T-309 (an active account hold also pauses this step, FD-079). Changes: Owned paths, step 10 and the FD-069 rows.
- **C1 — `audit.stream`** — T-404 builds the internal query `audit.stream {stream: string, limit <= 50}` inside `modules/administration` (FD-065), returning `[{action, actor: opaque, targetKind?, targetId?, details, createdAt}]`. `moderation.case` reads its timeline through it for stream `case:<code>`, and no longer through `audit.ts` directly. Changes: Owned paths and step 3.
- **C11 / FD-080 — repetition cases in the tray** — A case with `origin = repeat_episode` (opened by T-403's job) shows only the flag text "Possible repetition of an earlier account by the same author", with no link, id or title of the earlier review. `CaseTrayVM` carries a `flag?: 'repeat_episode'` field and no earlier-review field.
- **C5 / C7 — internals built here** — `account.applyEnforcement` (input `{accountId, kind: warn | restrict | suspend | ban, reasonCode, noteToUser, endsAt?, decisionId, actor}`; caller `moderation.decide`) in `modules/account`, and `directory.setProfileState` (input `{targetKind: doctor | facility | branch, targetId, event: hide | restore}`; callers `moderation.decide` and `moderation.restore`) in `modules/directory`.
- **C11 — events** — `case.decided {caseCode, action, affectedAccountId?}`; `moderation.restore` appends `case.decided {caseCode, action: restore, affectedAccountId?}`. `affectedAccountId` is resolved in the web tier and is the only account id in any payload (FD-086).

## Goal

Implement everything a moderator, admin or Super Admin does with a case: read the queue and a case tray (reporter always "restricted"), record a reason-coded bounded decision that changes public state through the owning module and never rewrites narrative, restore, handle appeals with a fresh reviewer, apply account enforcement (warn/restrict/suspend/ban) that changes what the Actor may do, run previewed idempotent bulk actions, and reveal a reporter only through the audited identity path.

## Read first

1. `docs/implementation/01-conventions.md` §3–§5, §11, §14
2. `docs/implementation/02-data-model.md` §2 (`enforcements`), §9 (all tables), §10 append-only, §17 case + account state machines
3. `docs/implementation/03-routes-and-contracts.md` §2 (`Capability`), §4 "moderation" (all entries after `report.file`), §4 "identity" (`identity.reveal`), §5 events
4. `docs/status/decision-log.md` FD-016, FD-017, FD-022, FD-069; `ARCHITECTURE-SPINE.md` AD-2, AD-5, AD-12, AD-16; ADR-006 and ADR-012 in `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/domain-design/decisions.md` (FD-069)
5. Prototype: `admin/app.js` 269–412 (`renderQueue`, `queueBody`, `caseDetail` — the action list, the audit preview lines, the "no rewrite" callout, reveal/request-access buttons), 671–699 (`relTime`, `auditTimeline`), 700–811 (bulk); fixtures `moderation.cases`, `auditLog` (actions `warn, hide, record, requestAccess, review, note, none, appeal, freshReview, reopen`), `permissions`, `thresholds.appealDays`; patient `app.js` 2485–2501 (`openAppeal`) and the appeal panel inside `renderMine` (the `kv` table: action, policy reason, "no reporter" note)
6. `PRODUCT.md` hard rules

## Owned paths

- `packages/domain/src/moderation/` — `case-state.ts`, `decision-policy.ts` (action → effect table, role gates), `appeal-policy.ts`, `enforcement.ts`, tests (T-403's `report-policy.ts` stays as is)
- `packages/domain/src/account/enforcement-effect.ts` (+ test) — how enforcements resolve to `account_status`
- `packages/application/src/modules/moderation/**` except `report-file.ts` and `deletion-participant.ts` (T-410 owns it, FD-069) (queries `queue.ts`, `case.ts`; commands `decide.ts`, `restore.ts`, `reveal-reporter.ts`, and the account-deletion de-identify command `deidentify.ts` (`moderation.deidentify`, FD-069, FD-078); `appeal-file.ts`, `appeal-decide.ts`, `bulk-preview.ts` and `bulk-apply.ts` are not built (FD-088); `authorization.ts` extended)
- `packages/application/src/modules/account/queries/effective-enforcement.ts` and the `Actor` resolution hook that reads it (one function in `packages/application/src/authorization/resolve-actor.ts` — coordinate with T-101's owner; note the hunk)
- `packages/contracts/src/schemas/moderation.ts` (extend), `view-models/queue.ts` (`QueueVM`, `CaseTrayVM`; `BulkPreviewVM` deferred, FD-088)
- `packages/application/src/modules/administration/queries/audit-stream.ts` (`audit.stream`, C1), `packages/application/src/modules/account/commands/apply-enforcement.ts` (C5), `packages/application/src/modules/directory/commands/set-profile-state.ts` (C7)
- `packages/database/src/migrations/*_moderation_account_columns_nullable.sql` — forward-only: `reports.reporter_account_id` and `appeals.appellant_account_id` nullable (FD-078)
- `packages/application/src/ports/repositories/moderation.ts` (extend), `packages/database/src/repositories/moderation.ts` (extend), `packages/database/src/repositories/audit.ts` (`timelineFor(stream, limit)` if not present, reached through `audit.stream`)
- `packages/test-support/src/fakes/moderation-repository.ts`, builders `case.ts`, `decision.ts`
- `packages/i18n/messages/{en,bn}.json` — `errors.moderation.*`, notification keys `notif.moderation.*`

## Not in scope

Any React (T-406), notification rows and the worker's email send (T-405 — you emit events with the exact params listed below, and you call T-405's web-tier email queueing for the case decided, restore and appeal outcome emails, FD-075), report intake (T-403), blocking (T-401), the retention/hold commands (T-309), the account-deletion orchestration and its `moderation/deletion-participant.ts` (T-410) — T-404 builds only the de-identify command that file calls (FD-069).

## Steps

1. **Domain.**
   - `case-state.ts`: `open → decided → closed`; `decided → appealed`; `appealed → decided` (appeal decision) → `closed`; `closed → open` only via `reopen` (Super Admin). Table + `transition()` + tests.
   - `decision-policy.ts`: the **action → effect** table (this is the contract T-406 and validators check):

     | action | target kinds | public effect (owning command) | account effect | min role |
     |---|---|---|---|---|
     | `warn` | any | none | notification only | moderator |
     | `redact` | review, facility_review, comment | `review.redact` / `comment.redact` — identifiers only, new version | — | moderator |
     | `removeFile` | evidence | `evidence.remove` | — | moderator |
     | `lock` | review, facility_review | `review.lockDiscussion` (no new comments) | — | moderator |
     | `hide` | review, facility_review, comment, evidence | `*.setState → hidden` | — | moderator |
     | `remove` | review, facility_review, comment, profile | `*.setState → deleted_tombstone` (profile → `rejected`) | — | admin |
     | `restrict` | any (acts on the author account) | — | `enforcements.kind = restrict` (cannot post; can read/edit own) | admin |
     | `suspend` | any | — | `suspend` with `ends_at` (default 30 d) | admin |
     | `ban` | any | — | `ban`, no end | super_admin |
     | `none` | any | none (case decided, no change) | — | moderator |
     | `restore` | hidden content | `*.setState → published` | — | moderator |

     `allowedActions(role, targetKind, currentState)` returns the chips T-406 shows. `redact` is the **only** text-changing action and it may only remove; the domain function `redactionIsSubtractive(before, after)` (every token of `after` occurs in `before`, in order) guards it — anything else is `moderation.narrative_locked`.
   - (Deferred, FD-088; do not build) `appeal-policy.ts`: `canDecideAppeal({decisionActorId, appealDeciderId, role})` → false when same actor (`moderation.self_appeal_review`) or role ≠ super_admin (Phase 1: founder decides appeals — FD in backlog STORY-MOD-003; `// ASSUMPTION(T-404)` if you relax to admin); checklist shape `{freshRead: bool, policyCited: string, reporterIdentityNotUsed: true, reasonWritten: bool}` — all must be true/non-empty.
   - `enforcement.ts` + `account/enforcement-effect.ts`: `effectiveStatus(enforcements, now)` → `active | restricted | suspended | banned`; `warn` never changes status.
2. **Contracts + VMs.** `QueueVM = { lanes: {critical: CaseRowVM[], standard: …, appeals: …}, thresholds: {fiveAccountHide, criticalHours, standardDays, appealDays} }`; `CaseRowVM = { code, lane, ageHours, reportCount, autoHidden, coordinated, targetKind, summary, slaDueAt, status }`; `CaseTrayVM = { code, lane, status, summary, note, reasons: [{reason, count}], coordinated, target: {kind, publicId, excerpt (≤ 200 graphemes, from the public projection only)}, reporter: 'restricted', reporterRevealed?: {username} (only after a granted reveal in this session), evidenceGate?: {state: 'gated'|'requested'|'granted'}, allowedActions: string[], decisions: DecisionVM[], appeal?: AppealVM, timeline: AuditRowVM[] (≤ 10, newest first: relTime, action, actor (opaque), targetPublicId) }`. **Assert in a test that `CaseTrayVM` JSON never contains a UUID of an account or the string `reporter_account_id`.**
3. **Queries.** `moderation.queue {lane?, status?, page}` (default open cases; appeals lane = cases with an open appeal); `moderation.case {code}`; both `requires capability: reports.read`.
4. **`moderation.decide`**: input `{caseCode, action, reasonCode, reasonToAuthor (10–1000 chars), policyVersion, redaction?: {after}}`; `requires capability: content.act` + role from the table + `stepUp` for `remove|suspend|ban`; validate action allowed for target kind/state; run the owning command inside the same transaction (`ports.application.internal.*`); insert `moderation_decisions` with `public_effect {state_before, state_after}`; case → `decided`; audit `case:<code>` action `<action>` actor `moderator:<opaque id>` details `{action, reasonCode, policyVersion, targetKind, targetPublicId}`; outbox `case.decided {caseCode, action, affectedAccountId (private, for routing only), targetKind, targetId}` — T-405 turns it into notification `moderation` with params `{action, policyReason: reasonCode, caseCode}` and **no** reporter fields and no appeal route (FD-088); the outbox payload is `{caseCode, action, affectedAccountId?}` (FD-086, C11); in the same transaction the command itself queues exactly one email and one in-app notice for the affected author, for every target kind, through T-405's `notification.queueEmail` for the `moderation` category (FD-087; the `setState` calls queue none), which fills `to_email_enc` and applies their preferences (FD-047, FD-070), with content-free params and no reporter fields; enforcement actions insert `enforcements` and revoke sessions for `suspend|ban` (call `account.signOutEverywhere` internal).
5. **`moderation.restore`** `{caseCode, reasonCode}` → `setState → published`, decision row `action: restore`, audit, outbox `review.restored|comment.changed`; this command queues the one email and one notice itself, through `notification.queueEmail`, and appends `case.decided {caseCode, action: restore, affectedAccountId?}` (FD-087, C11); the `setState` call queues none.
6. **Deferred, not built in release 1 (FD-088).** Appeals. `appeal.file {caseCode, text}` — requires the actor to be the affected author (resolve via identity's private link; never expose), one open appeal per case, `due_at = now + appealDays`, case → `appealed`, lane view shows it under `appeals`, audit action `appeal` actor `author:restricted`? — no: the appellant is the affected party, use `author:<opaque persona id>`; staff notification via outbox `report.filed`-style event `appeal.filed`. `appeal.decide {appealId, status: upheld|changed, reason, checklist}` — `canDecideAppeal`; `changed` ⇒ `moderation.restore` semantics + enforcement lifted; `upheld` ⇒ case `closed`; audit action `freshReview` then `appeal.<status>`; outbox `appeal.decided`; in the same transaction, call T-405's web-tier email queueing for the `moderation` category, addressed to the appellant (FD-075).
7. **Deferred, not built in release 1 (FD-088).** Bulk. `moderation.bulkPreview {caseCodes[], action, reasonCode}` → validates each case against the table, returns `BulkPreviewVM {affected: [{code, targetKind, lane, summary, wouldDo}], skipped: [{code, why}], previewToken}` where `previewToken` = HMAC of the sorted affected set + action + actor + 10-minute expiry (Crypto port). `moderation.bulkApply {previewToken, reasonToAuthor, idempotencyKey}` → recompute the affected set; if different ⇒ `retention.preview_drift`-style error `moderation.preview_drift` (add to contracts); else apply `moderation.decide` per case in one transaction per case (partial failure recorded per case, returned as `results[]`), idempotency by key returns the stored result; audit `stream: bulk:<idempotencyKey>`; security staff notification when an actor runs ≥ 3 bulk actions in 5 minutes (the `nA6` fixture).
8. **Reveal.** `moderation.revealReporter {caseCode, reason}` → `requires capability: identity.reveal + stepUp` → calls `identity.reveal {targetKind: 'report', targetId: <first report id of the case>, reason}`; the result is returned once and never stored on the case; audit `case:<code>` action `requestAccess`/`revealed`; staff notification `identityReveal`. For actors without the capability the command returns `forbidden` **and** writes audit `requestAccess` so the "Request access" button in the prototype maps to a real, logged request.
9. **Actor resolution hook**: `resolve-actor.ts` reads `effective-enforcement` and sets `Actor.status`; `requires.notRestricted` refuses `restricted|suspended|banned` with `errors.auth.accountSuspended`/`accountRestricted`.
10. **Account-deletion de-identify (FD-069).** An internal command, named in Contract Design, that only the data-requests participant calls (`requires: { system: true }`, exported under `internal` like `setState`). For one account it removes `reporter_account_id` from every report the account filed and `appellant_account_id` from every appeal it filed, and keeps each row with its reason, text, case and the case's counts; `moderation_decisions` and audit rows are untouched. The command does no hold check and does not call Retention: T-410's moderation participant asks the retention module (T-309) in `plan()` and again before `execute()`, marks a held record `retain_under_hold` (FD-021, FD-064, ADR-006), and calls this command only for the records it found not held, as T-204 does for Directory. The command takes the report and appeal ids it is given and re-running it changes nothing (idempotent). Add the read-only query that lists those report and appeal ids for the participant's `plan()`. Decided in Contract Design (FD-078, FD-079): the link is removed by making both columns nullable in a forward-only migration and setting them to `NULL`; the command runs in the web process (`rk_worker` has no privilege on `reports.reporter_account_id`, `02-data-model.md` §16); there is no per-report or per-appeal hold, and an active account hold pauses the whole deletion, which T-410 checks through T-309 before it calls this command. After de-identification the case tray still reads `reporter: 'restricted'`, never blank, and `moderation.revealReporter` returns no identity for those reports (its outcome code decided in Contract Design) while still writing its audit row.
11. **Repository + fakes + builders + i18n**; seed alignment: `seed/moderation.ts` maps fixtures (`lane 'appeal'` → `appeals`; `targetKind 'account'` → `review`; audit `actor` strings kept verbatim as opaque labels; `timeMin` → `created_at = seedNow − minutes`). One import line in `seed.ts`.
12. `pnpm check`; hand-off with the action table pasted verbatim into "What changed".

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Role gates | application tests | moderator `remove` → `forbidden`; admin `ban` → `forbidden`; super_admin `ban` + stepUp → ok |
| Narrative lock | test with `redaction.after` adding a word | `moderation.narrative_locked`; subtractive redaction creates a new `review_versions` row |
| Public effect via owner | test | `hide` on a comment calls `comment.setState`, never writes `comments` directly (fake repo call log) |
| Restore | test | `hidden → published`, decision row `restore`, outbox `review.restored` |
| Appeal segregation | deferred, FD-088 | not run in release 1 (appeals are a follow-up task) |
| Enforcement | test with FakeClock | `suspend` 30 d → Actor status `suspended`; after 30 d → `active`; sessions revoked |
| Reporter privacy | JSON assertion | `CaseTrayVM` and every outbox payload lack account UUIDs except `affectedAccountId` in `case.decided`; `identity_reveals` row exists after reveal |
| Bulk drift | deferred, FD-088 | not run in release 1 (bulk preview/apply is a follow-up task) |
| Timeline | int test | last 10 `audit_events` for `case:MOD-2041`, newest first, includes seed rows |
| Append-only | int test | `UPDATE moderation_decisions` raises `append_only_violation` |
| FD-069: De-identify keeps the rows | int test: account A filed two reports and one appeal; run the de-identify command for A | the three rows still exist with their reason, text and case; none holds A's account id; the case's `report_count` and `distinct_reporters` are unchanged (AC10.3.3) |
| FD-069: Reporter still "restricted" | application test after de-identification | `CaseTrayVM.reporter` is `'restricted'`, never blank or missing; `moderation.revealReporter` returns no account identity and writes its audit row (AC9.1.3, AC9.3.2) |
| FD-069: Idempotency, no hold logic here | int test: run the command twice for A's report and appeal ids; and a test that the command module imports nothing from `retention` | the second run changes nothing; the command reads no `legal_holds` row and calls no Retention query. Holds are checked by T-410 before it calls this command, and T-410's own FD-069 row covers a held record that stays untouched (AC10.3.3) |
| FD-075 (superseded by FD-087; see the FD-087 rows below) | application test: `moderation.decide`, `moderation.restore` and `appeal.decide`, with the affected author's or appellant's `emailModeration` preference off, then on | exactly one email per outcome: `appeal.decide` and a non-`setState` decision queue it themselves, while a hide or `moderation.restore` gets it from the `setState` call only, so a moderator's hide or restore of a review yields one `email_deliveries` row, never two. Off → no `email_deliveries` row, in-app item still appears; on → one row with `to_email_enc` filled (encrypted, not plaintext) and content-free params, and the worker's `mail.send` delivers it with the decrypted address (AC10.1.4, AC10.1.5) |
| FD-087: decide queues one email and one notice (C11) | application test: `moderation.decide` with action `hide` on a synthetic review, comment, facility review, evidence item and doctor profile, `emailModeration` on | for the first four the author gets exactly one `email_deliveries` row and one in-app notice from the command (`setState` queued none); the profile hide gives none; `to_email_enc` is filled and params are content-free |
| FD-087: restore queues one email and one notice (C11; moved from T-302's FD-075 row) | application test: `moderation.restore` of a hidden review, `emailModeration` off, then on; then the worker's `mail.send` is run | off: no `email_deliveries` row, in-app notice still appears; on: exactly one row and one notice, never two, and the worker sends it from the decrypted address (AC10.1.4, AC10.1.5) |
| FD-087: no reporter fields (C11, FD-086) | JSON check over the `case.decided` payloads and email params | keys are exactly `caseCode, action, affectedAccountId` (and `appeal` params absent); no reporter id appears |
| FD-088: no appeal route in notices | read the `notif.moderation.*` params and both dictionaries | no `appealRoute` param and no appeal link text; a hide notice names the policy reason only |
| FD-088: deferred parts not built | list the files this task adds | no `appeal-file`, `appeal-decide`, `bulk-preview`, `bulk-apply`, `appeal-policy` or `BulkPreviewVM`; `moderation.myAppealable` does not exist; the queue has no appeals lane |
| FD-078: nullable columns (C11) | int test after the migration | `reports.reporter_account_id` and `appeals.appellant_account_id` accept `NULL`; `moderation.deidentify` for account A sets them to `NULL` on A's rows only and deletes no row; a second report by another account on the same target still inserts, and the unique index still rejects a duplicate from a live reporter |
| C1: `audit.stream` (timeline) | int test | `audit.stream {stream: 'case:MOD-2041', limit: 10}` returns the newest ten rows newest first with opaque actors; `limit: 51` is a validation error; `moderation.case` calls it and not the audit table directly |
| FD-080: repetition case view (C11) | application test on a case with `origin = repeat_episode` | `CaseTrayVM.flag = 'repeat_episode'`, the flag text renders in both locales, and the VM holds no id, title or link of the earlier review |
| C5/C7: internals | application test | `account.applyEnforcement` records one enforcement and `directory.setProfileState` hides and restores a doctor profile with audit; neither is callable by a non-system actor |

## Tests to write

Domain tables (state, action table per role/kind/state, subtractive redaction 8 cases, appeal policy, enforcement effect with clock); application tests per row above; database tests for timeline, bulk idempotency, append-only, and the de-identify command (FD-069).

## Threat notes

- **Privilege escalation via the action list**: the server recomputes `allowedActions`; never trust the chip the UI sent.
- **Narrative rewrite** disguised as redaction: subtractive check + version row + audit; validators try inserting a word, reordering, and replacing a medicine name.
- **Appeal decided by the original actor** or by a moderator: refused; test both.
- **Reporter leak** through audit details, notification params, bulk results, error messages, logs: grep + JSON assertions; the reveal path is the only exit and it is audited.
- **Bulk replay / drift**: preview token bound to actor + set + action + expiry; idempotency key stored with the result.
- **Enforcement bypass**: a suspended user's existing session must fail on the next command (Actor resolution reads enforcements every request; sessions revoked on suspend/ban).

## Hard-rule checklist

- [ ] Moderators cannot rewrite substantive narrative; redaction is subtractive and versioned.
- [ ] Reporter identity: "restricted" in the console; reveal only via audited `identity.reveal`.
- [ ] Every action reason-coded, audited, append-only; public effect through the owning module.
- [ ] Threshold hide is reversible (`restore`) and never deletes.
- [ ] Appeals get a fresh reviewer and a written reason.
- [ ] Both locales for new keys; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
