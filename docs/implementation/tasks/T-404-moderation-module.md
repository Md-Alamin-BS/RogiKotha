# T-404 — Moderation module: queue, decisions, appeals, enforcement, bulk

| Field | Value |
|---|---|
| Story | STORY-MOD-002, STORY-MOD-003, STORY-ADMIN-002 (bulk semantics), STORY-NFR-009 |
| Phase / Lane | 4 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 6–8 h agent; validation 2.5 h |
| Depends on | T-403 (cases, `setState` internals), T-104 (`identity.reveal`), T-103 (roles/capabilities, stepUp), T-105 (config), T-302 (`review.redact`), T-305 (`evidence.remove`) |
| Parallel-safe with | T-405, T-406 (UI can start against the query VMs once step 2 lands — publish the VM file first), T-409, T-410 |

## Goal

Implement everything a moderator, admin or Super Admin does with a case: read the queue and a case tray (reporter always "restricted"), record a reason-coded bounded decision that changes public state through the owning module and never rewrites narrative, restore, handle appeals with a fresh reviewer, apply account enforcement (warn/restrict/suspend/ban) that changes what the Actor may do, run previewed idempotent bulk actions, and reveal a reporter only through the audited identity path.

## Read first

1. `docs/implementation/01-conventions.md` §3–§5, §11, §14
2. `docs/implementation/02-data-model.md` §2 (`enforcements`), §9 (all tables), §10 append-only, §17 case + account state machines
3. `docs/implementation/03-routes-and-contracts.md` §2 (`Capability`), §4 "moderation" (all entries after `report.file`), §4 "identity" (`identity.reveal`), §5 events
4. `docs/status/decision-log.md` FD-016, FD-017, FD-022; `ARCHITECTURE-SPINE.md` AD-2, AD-5, AD-12, AD-16
5. Prototype: `admin/app.js` 269–412 (`renderQueue`, `queueBody`, `caseDetail` — the action list, the audit preview lines, the "no rewrite" callout, reveal/request-access buttons), 671–699 (`relTime`, `auditTimeline`), 700–811 (bulk); fixtures `moderation.cases`, `auditLog` (actions `warn, hide, record, requestAccess, review, note, none, appeal, freshReview, reopen`), `permissions`, `thresholds.appealDays`; patient `app.js` 2485–2501 (`openAppeal`) and the appeal panel inside `renderMine` (the `kv` table: action, policy reason, "no reporter" note)
6. `PRODUCT.md` hard rules

## Owned paths

- `packages/domain/src/moderation/` — `case-state.ts`, `decision-policy.ts` (action → effect table, role gates), `appeal-policy.ts`, `enforcement.ts`, tests (T-403's `report-policy.ts` stays as is)
- `packages/domain/src/account/enforcement-effect.ts` (+ test) — how enforcements resolve to `account_status`
- `packages/application/src/modules/moderation/**` except `report-file.ts` (queries `queue.ts`, `case.ts`; commands `decide.ts`, `restore.ts`, `appeal-file.ts`, `appeal-decide.ts`, `bulk-preview.ts`, `bulk-apply.ts`, `reveal-reporter.ts`; `authorization.ts` extended)
- `packages/application/src/modules/account/queries/effective-enforcement.ts` and the `Actor` resolution hook that reads it (one function in `packages/application/src/authorization/resolve-actor.ts` — coordinate with T-101's owner; note the hunk)
- `packages/contracts/src/schemas/moderation.ts` (extend), `view-models/queue.ts` (`QueueVM`, `CaseTrayVM`, `BulkPreviewVM`)
- `packages/application/src/ports/repositories/moderation.ts` (extend), `packages/database/src/repositories/moderation.ts` (extend), `packages/database/src/repositories/audit.ts` (`timelineFor(stream, limit)` if not present)
- `packages/test-support/src/fakes/moderation-repository.ts`, builders `case.ts`, `decision.ts`
- `packages/i18n/messages/{en,bn}.json` — `errors.moderation.*`, notification keys `notif.moderation.*`

## Not in scope

Any React (T-406), notification row/email delivery (T-405 — you emit events with the exact params listed below), report intake (T-403), blocking (T-401), the retention/hold commands (T-309), account deletion (T-410).

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
   - `appeal-policy.ts`: `canDecideAppeal({decisionActorId, appealDeciderId, role})` → false when same actor (`moderation.self_appeal_review`) or role ≠ super_admin (Phase 1: founder decides appeals — FD in backlog STORY-MOD-003; `// ASSUMPTION(T-404)` if you relax to admin); checklist shape `{freshRead: bool, policyCited: string, reporterIdentityNotUsed: true, reasonWritten: bool}` — all must be true/non-empty.
   - `enforcement.ts` + `account/enforcement-effect.ts`: `effectiveStatus(enforcements, now)` → `active | restricted | suspended | banned`; `warn` never changes status.
2. **Contracts + VMs.** `QueueVM = { lanes: {critical: CaseRowVM[], standard: …, appeals: …}, thresholds: {fiveAccountHide, criticalHours, standardDays, appealDays} }`; `CaseRowVM = { code, lane, ageHours, reportCount, autoHidden, coordinated, targetKind, summary, slaDueAt, status }`; `CaseTrayVM = { code, lane, status, summary, note, reasons: [{reason, count}], coordinated, target: {kind, publicId, excerpt (≤ 200 graphemes, from the public projection only)}, reporter: 'restricted', reporterRevealed?: {username} (only after a granted reveal in this session), evidenceGate?: {state: 'gated'|'requested'|'granted'}, allowedActions: string[], decisions: DecisionVM[], appeal?: AppealVM, timeline: AuditRowVM[] (≤ 10, newest first: relTime, action, actor (opaque), targetPublicId) }`. **Assert in a test that `CaseTrayVM` JSON never contains a UUID of an account or the string `reporter_account_id`.**
3. **Queries.** `moderation.queue {lane?, status?, page}` (default open cases; appeals lane = cases with an open appeal); `moderation.case {code}`; both `requires capability: reports.read`.
4. **`moderation.decide`**: input `{caseCode, action, reasonCode, reasonToAuthor (10–1000 chars), policyVersion, redaction?: {after}}`; `requires capability: content.act` + role from the table + `stepUp` for `remove|suspend|ban`; validate action allowed for target kind/state; run the owning command inside the same transaction (`ports.application.internal.*`); insert `moderation_decisions` with `public_effect {state_before, state_after}`; case → `decided`; audit `case:<code>` action `<action>` actor `moderator:<opaque id>` details `{action, reasonCode, policyVersion, targetKind, targetPublicId}`; outbox `case.decided {caseCode, action, affectedAccountId (private, for routing only), targetKind, targetId}` — T-405 turns it into notification `moderation` with params `{action, policyReason: reasonCode, caseCode, appealRoute}` and **no** reporter fields; enforcement actions insert `enforcements` and revoke sessions for `suspend|ban` (call `account.signOutEverywhere` internal).
5. **`moderation.restore`** `{caseCode, reasonCode}` → `setState → published`, decision row `action: restore`, audit, outbox `review.restored|comment.changed`.
6. **Appeals.** `appeal.file {caseCode, text}` — requires the actor to be the affected author (resolve via identity's private link; never expose), one open appeal per case, `due_at = now + appealDays`, case → `appealed`, lane view shows it under `appeals`, audit action `appeal` actor `author:restricted`? — no: the appellant is the affected party, use `author:<opaque persona id>`; staff notification via outbox `report.filed`-style event `appeal.filed`. `appeal.decide {appealId, status: upheld|changed, reason, checklist}` — `canDecideAppeal`; `changed` ⇒ `moderation.restore` semantics + enforcement lifted; `upheld` ⇒ case `closed`; audit action `freshReview` then `appeal.<status>`; outbox `appeal.decided`.
7. **Bulk.** `moderation.bulkPreview {caseCodes[], action, reasonCode}` → validates each case against the table, returns `BulkPreviewVM {affected: [{code, targetKind, lane, summary, wouldDo}], skipped: [{code, why}], previewToken}` where `previewToken` = HMAC of the sorted affected set + action + actor + 10-minute expiry (Crypto port). `moderation.bulkApply {previewToken, reasonToAuthor, idempotencyKey}` → recompute the affected set; if different ⇒ `retention.preview_drift`-style error `moderation.preview_drift` (add to contracts); else apply `moderation.decide` per case in one transaction per case (partial failure recorded per case, returned as `results[]`), idempotency by key returns the stored result; audit `stream: bulk:<idempotencyKey>`; security staff notification when an actor runs ≥ 3 bulk actions in 5 minutes (the `nA6` fixture).
8. **Reveal.** `moderation.revealReporter {caseCode, reason}` → `requires capability: identity.reveal + stepUp` → calls `identity.reveal {targetKind: 'report', targetId: <first report id of the case>, reason}`; the result is returned once and never stored on the case; audit `case:<code>` action `requestAccess`/`revealed`; staff notification `identityReveal`. For actors without the capability the command returns `forbidden` **and** writes audit `requestAccess` so the "Request access" button in the prototype maps to a real, logged request.
9. **Actor resolution hook**: `resolve-actor.ts` reads `effective-enforcement` and sets `Actor.status`; `requires.notRestricted` refuses `restricted|suspended|banned` with `errors.auth.accountSuspended`/`accountRestricted`.
10. **Repository + fakes + builders + i18n**; seed alignment: `seed/moderation.ts` maps fixtures (`lane 'appeal'` → `appeals`; `targetKind 'account'` → `review`; audit `actor` strings kept verbatim as opaque labels; `timeMin` → `created_at = seedNow − minutes`). One import line in `seed.ts`.
11. `pnpm check`; hand-off with the action table pasted verbatim into "What changed".

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Role gates | application tests | moderator `remove` → `forbidden`; admin `ban` → `forbidden`; super_admin `ban` + stepUp → ok |
| Narrative lock | test with `redaction.after` adding a word | `moderation.narrative_locked`; subtractive redaction creates a new `review_versions` row |
| Public effect via owner | test | `hide` on a comment calls `comment.setState`, never writes `comments` directly (fake repo call log) |
| Restore | test | `hidden → published`, decision row `restore`, outbox `review.restored` |
| Appeal segregation | test | same actor deciding → `moderation.self_appeal_review`; `changed` restores and lifts enforcement |
| Enforcement | test with FakeClock | `suspend` 30 d → Actor status `suspended`; after 30 d → `active`; sessions revoked |
| Reporter privacy | JSON assertion | `CaseTrayVM` and every outbox payload lack account UUIDs except `affectedAccountId` in `case.decided`; `identity_reveals` row exists after reveal |
| Bulk drift | test | change one case between preview and apply → `moderation.preview_drift`; replay with same idempotency key → stored result, no second decision |
| Timeline | int test | last 10 `audit_events` for `case:MOD-2041`, newest first, includes seed rows |
| Append-only | int test | `UPDATE moderation_decisions` raises `append_only_violation` |

## Tests to write

Domain tables (state, action table per role/kind/state, subtractive redaction 8 cases, appeal policy, enforcement effect with clock); application tests per row above; database tests for timeline, bulk idempotency, append-only.

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
