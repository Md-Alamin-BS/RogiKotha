# T-403 — Reports, thresholds and the temporary hide

| Field | Value |
|---|---|
| Story | STORY-MOD-001 |
| Phase / Lane | 4 / A (+ a small B slice: the report sheet) |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 4–6 h agent; validation 2 h |
| Depends on | T-401 (comments exist to report), T-302 (review states), T-105 (config: `thresholds`, `reportReasons`), T-104 (identity), T-009, T-405 (web-tier email queueing, FD-075) |
| Parallel-safe with | T-409, T-306–T-308 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-070 / FD-075 (superseded by FD-087, see the Contract Design amendments)** — When `report.file` hides content, the moderation email to the content's author is queued from the web tier, not by the worker. The internal `setState` command that performs the hide calls T-405's web-tier email queueing directly, in the same transaction as the hide, and `report.file` itself queues nothing. One email per outcome (FD-075): a hide or restore that runs through `review.setState` (or the facility-review and comment `setState` internals) gets its email from that `setState` call only, whoever the caller is; the calling command never queues a second email for the same change. The email is queued for the event where T-405's routing table (step 1) sends moderation email (`review.hidden`, to the review's author). It fills `to_email_enc` through T-405 and applies the author's preferences (FD-047, FD-070). Contract Design names the call. T-405 therefore comes before this task. Changes: Depends on, Parallel-safe with, Not in scope, steps 3 and 4 and a new acceptance row.

- **FD-069** — On account deletion, T-404's de-identify command removes `reporter_account_id` from the reports the account filed and keeps the rows. Step 6's rule on which queries may read that column now names this command too; it matches and clears the column and never returns it. Nothing else in this task changes: the reporter still reads "restricted", and `distinct_reporters` stays as counted.

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-087 (C11) — the deciding command queues the one email** — `report.file` itself queues the moderation email and the in-app notice to the affected author, one of each per outcome, for every target kind except a profile (no notice for a profile target): "Content reported" when the case opens and "Hidden pending review" when it hides; when both happen at once there is one notice and one email. The internal `setState` commands (`review.setState`, `facilityReview.setState`, `comment.setState`) queue no email and create no notice. This supersedes the FD-070/FD-075 amendment above for who calls T-405's `notification.queueEmail`. T-302's FD-075 acceptance row moved here (the hide row below). Changes: step 3, step 4 and the acceptance rows.
- **FD-086 (C11) — no reporter notice** — The reporter gets no notice and no email, and a reporter's account id never appears in any outbox payload, view model, log or notice param. The payload of `report.filed` is `{caseCode, caseOpened: boolean, hidden: boolean, affectedAccountId?}`; the affected author's account id is resolved in the web tier (`RevealTarget` for the target, then `identity.accountsOf` for a persona) and is absent when the target has no account author. Changes: step 4 (outbox) and a new acceptance row.
- **FD-080 (C11) — repeat-episode case job** — T-403 builds the worker job `moderation.openRepetitionCase`. Trigger: `review.published` with `repeatEpisode: true` (any other `review.published` event is a no-op). Payload `{eventId, name, payload: {reviewId, doctorId, repeatEpisode}}`, `singletonKey: repetition:<reviewId>`. It opens a standard-lane case with `origin = repeat_episode` on the review, `report_count` 0, no hide, audit `case:<code>` action `repetitionFlag` actor `system`, and a staff notice `newReport` with key `notif.staff.repetition`; the author is not told. The moderator sees only "Possible repetition of an earlier account by the same author", with no link to the earlier review, which the event never names. New in this task's migration: `moderation_cases.origin` enum `report | repeat_episode` default `report`, and the worker grants `SELECT, INSERT, UPDATE` on `moderation_cases` and `USAGE` on `moderation_case_seq`, nothing on `reports` or `appeals` (a data-boundary change to `02-data-model.md` §16 that FD-080 records). Changes: Owned paths, a new step 6a and new acceptance rows.
- **C11 / C10 / C4 — ports** — T-403 implements Community's `ModerationSignals.dangerousFlags(commentIds)` (a comment is flagged when it has an open case with reason `dangerous`) and Identity's `RevealTarget.resolve` for `targetKind: report` (subject `account`, the restricted `reporter_account_id`), both in `modules/moderation`. `facilityReview.setState` (input `{facilityReviewId, event}`) is built here, and this task extends the threshold events `hideThreshold` and `hideCritical` of the other `setState` commands.

## Goal

Implement `report.file` with every rule from the founder decisions: private reporter, duplicate reports by one account never count, critical reasons hide on first credible report, five distinct confirmed accounts (configurable) hide eligible content once, factual disagreement never hides, a coordination signal, case creation with display codes and SLA, audit with an opaque reporter, and a staff notification. Also the internal `setState` commands the hide transition runs through, and the report sheet UI.

## Read first

1. `docs/implementation/01-conventions.md` §3–§5, §11
2. `docs/implementation/02-data-model.md` §0 (`report_reason`, critical reasons), §9 (`reports`, `moderation_cases`, `moderation_case_reasons`, `audit_events`), §11 config `values.thresholds`, §17 publication state machine
3. `docs/implementation/03-routes-and-contracts.md` §4 "moderation" (`report.file`), §5 (`report.filed`)
4. `docs/architecture/ARCHITECTURE-SPINE.md` AD-5, AD-12; `docs/status/decision-log.md` FD-017
5. Prototype: `app.js` 2469–2484 (`openReport`), handlers 2644–2648 (`data-report`, `#rep-send`, `data-reason`); fixtures `shared/rogikotha-data.js` `moderation.cases` (MOD-2041 hidden by two reports because dangerous+spam matched, MOD-2038 privacy hidden on one, MOD-2033 six factual reports **not** hidden with `coordinated: true`), `thresholds`
6. `PRODUCT.md` hard rules: reporter identity, no automated classification

## Owned paths

- `packages/domain/src/moderation/report-policy.ts` (+ tests), `case.ts`, `case-code.ts`
- `packages/application/src/modules/moderation/commands/report-file.ts`, `queries/report-status.ts`, `authorization.ts` (report part), tests
- `packages/application/src/modules/review/commands/set-state.ts`, `.../facility-review/set-state.ts`, `.../community/commands/set-state.ts` (internal commands; `actor.kind = 'system'` or staff only)
- `packages/application/src/modules/moderation/jobs/open-repetition-case.ts`, `apps/worker/src/handlers/open-repetition-case.ts` (FD-080), `modules/moderation/signals.ts` and `reveal-target.ts` (C11)
- `packages/database/src/migrations/*_moderation_case_origin_and_worker_grant.sql` — forward-only: `moderation_cases.origin`, the worker grants on `moderation_cases` and `moderation_case_seq` (FD-080)
- `packages/application/src/ports/repositories/moderation.ts` (report + case methods; T-404 extends it)
- `packages/contracts/src/schemas/moderation.ts` (`FileReportInput`), `view-models/report.ts`
- `packages/database/src/repositories/moderation.ts` (report/case methods), migration adding the `moderation_case_code_seq` sequence if T-005 did not
- `apps/web/src/components/patient/ReportSheet.tsx`, `apps/web/src/server/actions/moderation.ts` (`fileReport`)
- `packages/test-support/src/builders/report.ts`, fakes
- `packages/i18n/messages/{en,bn}.json` — `errors.moderation.*`, `report.sent` exists already

## Not in scope

Queue/case views and decisions (T-404), notification rows and the worker's email send (T-405 — you emit `report.filed`, and you call T-405's web-tier email queueing for the hide email, FD-075), the reveal of reporters (T-404 via identity), automated danger/toxicity classification (forbidden by FD-009).

## Steps

1. **Domain `report-policy.ts`** — pure functions with table tests:
   - `isCriticalReason(reason)` → `privacy | threat | unsafeFile`.
   - `hideDecision({reason, distinctReporters, threshold, alreadyHidden, targetState})` → `'hide_now' | 'no_change'`: critical reason ⇒ `hide_now` (if `published`); `factual` ⇒ never; else `distinctReporters >= threshold && !alreadyHidden` ⇒ `hide_now`; a `hide_now` is emitted at most once per case (`auto_hidden` guard).
   - `laneFor(reasons)` → `critical` if any critical or `dangerous` reason, else `standard`.
   - `slaDueAt(lane, openedAt, thresholds)` → `+criticalHours` / `+standardDays` (business days: skip Fri/Sat, Bangladesh weekend — document the assumption with `// ASSUMPTION(T-403)`).
   - `coordinationSignal(reportsInWindow: {createdAt, reporterCreatedAt}[])` → true when ≥ 3 reports within 10 minutes come from accounts younger than 24 h **or** ≥ 5 reports from accounts created in the same ISO week (the MOD-2033 fixture case). Heuristic only; it flags, never hides.
2. **`case-code.ts`**: `MOD-<seq>` from a PostgreSQL sequence starting at 2100 (seed uses fixed codes 2011–2041 — the seed sets the sequence after inserting).
3. **Internal `setState` commands** (`review.setState`, `facilityReview.setState`, `comment.setState`): input `{id, to, reasonCode, caseCode?}`; `requires: { system: true } | { staffRole: any }`; validate with the owning domain's state table; write `hidden_at`/`hidden_reason_code`; audit on the owning stream (`review:<id>`); outbox `review.hidden|restored` / `comment.changed`; they queue no email and create no notice (FD-087); the deciding command does. `moderation.decide` (T-404) and `report.file` are the only callers — export them from the module index under `internal`.
4. **`report.file` command**: `requires authenticated + verifiedEmail`; reasons must be in `config.reportReasons` (enabled list); target must exist and be `published` or `hidden_pending_review`; insert `reports` (unique violation ⇒ `moderation.duplicate_report`, count unchanged); find or create the open case for `(target_kind, target_id)`; `report_count += 1`, `distinct_reporters = count(distinct reporter)`; upsert `moderation_case_reasons`; `lane = laneFor(all reasons)` (never downgrade critical → standard); `coordinated_signal` via policy (needs reporter account `created_at` — read through the account repository, return nothing else); apply `hideDecision` → call the owning `setState` to `hidden_pending_review` with `reasonCode = 'auto_threshold' | 'auto_critical'`, set `auto_hidden = true`; audit `case:<code>` action `report` actor `reporter:restricted` details `{reason, distinctReporters, hidden: bool}` — **never** the reporter id; staff notification via outbox `report.filed {caseCode, caseOpened, hidden, affectedAccountId?}` (ids, booleans only; no reporter id, FD-086); if `hidden` also outbox `review.hidden`/`comment.changed` (done by setState); then, in the same transaction, `report.file` queues the affected author's one in-app notice and one moderation email per outcome through T-405's `notification.queueEmail` (FD-087: "Content reported" when the case opens, "Hidden pending review" when it hides, one of each when both happen at once; none for a profile target; content-free params, no reporter fields); the reporter gets nothing (FD-086). Rate limit `report:account:<id>` 20/day.
5. **`report.status` query** `{targetKind, targetId, actor}` → `{alreadyReported: bool}` for the UI's sent state.
6. **Repository**: `insertReport` (returns duplicate flag), `findOpenCase`, `createCase`, `updateCaseCounts`, `upsertCaseReason`, `reportsForCoordination(caseId, windowMinutes)` (joins `account_profiles.created_at` only). Column-level: `reporter_account_id` is never selected by any query outside `moderation.revealReporter` (T-404), the account-deletion de-identify command (T-404, which only matches and clears it and never returns it, FD-069) and the unique index — add a comment and a test that `CaseTrayVM` never contains it.
7. **Report sheet UI** (`ReportSheet.tsx`, client, uses `components/shared/Sheet`): port `openReport` — title `report.title`, reasons as `.opt` buttons (`aria-pressed`, radio semantics) from the config's enabled list in the prototype's order (`privacy, threat, unsafeFile, dangerous, factual, spam, impersonation`, then any others enabled), `report.factualNote`, detail textarea (`report.detail`), `report.evidence` + `report.evidenceNote` callout, `report.identityNote` warn callout, submit `report.submit`, target line; on success the sheet body becomes `report.sent`; on `moderation.duplicate_report` show `errors.moderation.duplicateReport`. Mount points: `Comment` (T-402 `onReport`), review-level `review.report` button in `ExperiencePage` (T-307), evidence item (T-308), doctor profile "report this profile" if the prototype has one (check `renderProfile` — if absent, do not add).
8. **i18n**: `errors.moderation.duplicateReport` ("You have already reported this. Repeated reports from one account do not count again." / "আপনি এটি আগেই রিপোর্ট করেছেন। এক অ্যাকাউন্ট থেকে বারবার রিপোর্ট আবার গণনা হয় না।"), `errors.moderation.reasonDisabled`.
6a. **`moderation.openRepetitionCase` job (FD-080)**: worker handler for `review.published` events. When `repeatEpisode` is false it does nothing. Otherwise it opens one standard-lane case on the review (`origin = repeat_episode`, `report_count = 0`, no `setState`, no hide), allocates the code from `moderation_case_seq`, writes audit `case:<code>` action `repetitionFlag` actor `system`, and appends a staff notification `newReport` with message key `notif.staff.repetition` (both locales). `singletonKey` is `repetition:<reviewId>`, so a replay opens no second case. It reads and writes only `moderation_cases` (and the sequence); it never touches `reports` or `appeals`, and it sends nothing to the author.
9. `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Five distinct accounts | application test with 5 reporter builders | 4 reports → `published`; 5th → `hidden_pending_review`, `auto_hidden = true`, exactly one `setState` call |
| Duplicate | same | reporter_1 twice → second returns `moderation.duplicate_report`; `distinct_reporters` unchanged |
| Factual | 6 factual reports | stays `published`; case exists in `standard` lane |
| Critical | 1 privacy report | `hidden_pending_review` immediately, lane `critical`, `sla_due_at = +24h` |
| Threshold from config | config `fiveAccountHide = 3` | hide on the 3rd |
| Coordination | 5 reports from accounts created the same week | `coordinated_signal = true`, not hidden if factual |
| Reporter privacy | grep + test | `reports.reporter_account_id` appears in no view model; audit details lack it |
| FD-069: Column readers | grep test over `packages/` | `reporter_account_id` is read only by the report insert and unique index, `moderation.revealReporter` and the de-identify command (both T-404); no query returns it to a caller other than the reveal path (AC9.1.3) |
| FD-087: Hide email from `report.file` (AC10.1.4, AC10.1.5; moved from T-302's FD-075 row) | application test: a 5th distinct reporter hides a synthetic review, with the author's `emailModeration` preference off, then on; then the worker's `mail.send` is run | `report.file` (not `review.setState`) queues the email through T-405's `queueEmail` in the same transaction as the hide: off → no `email_deliveries` row, in-app item still appears; on → exactly one row with `to_email_enc` filled (encrypted, not plaintext) and params carrying no reporter field, and the worker sends it from the decrypted address; a 6th report adds no second email |
| FD-087: one notice and one email per outcome (C11) | application test, synthetic review with `emailModeration` on: 1st report (standard reason) opens the case; later the 5th distinct report hides it; then a critical-reason report on a fresh review | 1st report: one in-app notice and one email "Content reported"; 5th report: one more notice and email "Hidden pending review"; the critical report on the fresh review opens and hides at once and produces one notice and one email, not two |
| FD-087: `setState` is silent (C11) | application test calling `review.setState`, `facilityReview.setState` and `comment.setState` directly with `hideThreshold`, `hide` and `restore` | the state changes; zero `email_deliveries`, zero `mail.send` jobs, zero notices |
| FD-087: every target kind (C11) | application test: reports on a review, facility review, comment and evidence item, each by a critical reason; then on a doctor profile | the first four each give the author one notice and one email; the profile gives none |
| FD-086: no reporter notice, no reporter id in payloads (C11) | application test, then grep of the outbox rows and `email_deliveries.params` after 3 reports | the reporters have no notice or email; `report.filed` has exactly the keys `caseCode, caseOpened, hidden, affectedAccountId`; no reporter account id appears in any outbox payload, notice param, audit detail or log line |
| FD-080: repetition case opened by the worker (C11) | worker test as `rk_worker`: deliver `review.published {repeatEpisode: true}` twice | exactly one new case with `origin = repeat_episode`, standard lane, `report_count = 0`, review still `published`, one audit row `repetitionFlag` with actor `system`, one staff notice `notif.staff.repetition`, no author notice or email; the replay adds nothing |
| FD-080: no-op for ordinary publish | worker test: deliver `review.published {repeatEpisode: false}` | no case, no audit row, no notice |
| FD-080: worker grant is narrow (C11) | `pnpm --filter @rk/database test validator-probes` as `rk_worker` | `select`, `insert` and `update` on `moderation_cases` and `nextval('moderation_case_seq')` succeed; `select` on `reports` and `appeals` and `delete` on `moderation_cases` are denied |
| FD-080: moderator sees only the flag text | staff view model test for a repetition case (view built by T-404) | the case carries the flag text "Possible repetition of an earlier account by the same author" and no link, id or title of the earlier review |
| C11: `ModerationSignals` | application test | `dangerousFlags([k1, k2])` returns k1 when it has an open case with reason `dangerous` and not k2 |
| Concurrency | int test: 5 parallel `report.file` | one hide, no duplicate case rows (unique open case per target) |
| Sheet | component test | reasons from config, sent state, duplicate message |

## Tests to write

Domain tables for every policy function; application tests for each row above; database tests for the unique constraints and the open-case lookup under concurrency; component test for the sheet in both locales.

## Threat notes

- Sybil: same person with two accounts counts twice — accepted for Phase 1; the coordination signal and `account_profiles.created_at` join are the mitigation. Record as residual risk.
- Reporter leak channels to check: audit details, outbox payloads, notification params (T-405 must never receive reporter ids), error messages, logs.
- Report against hidden content to re-trigger hide: guard with `auto_hidden` once-only.
- Reasons outside the enabled list: refuse; the config cannot enable a reason not in the enum.
- Rate limit key by account, not IP (shared mobile networks).

## Hard-rule checklist

- [ ] Reporter identity never shown to the reported party or any projection; console reads "restricted" (T-404 renders it; you must not provide it).
- [ ] Factual disagreement never auto-hides.
- [ ] Privacy/threat/unsafe file hide on first credible report.
- [ ] Five distinct confirmed accounts, configurable; duplicates never count.
- [ ] No automated classification of content.
- [ ] Every transition through the owning module's command with audit.
- [ ] Both locales; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
