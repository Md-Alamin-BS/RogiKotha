# T-403 — Reports, thresholds and the temporary hide

| Field | Value |
|---|---|
| Story | STORY-MOD-001 |
| Phase / Lane | 4 / A (+ a small B slice: the report sheet) |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 4–6 h agent; validation 2 h |
| Depends on | T-401 (comments exist to report), T-302 (review states), T-105 (config: `thresholds`, `reportReasons`), T-104 (identity), T-009 |
| Parallel-safe with | T-405, T-409, T-306–T-308 |

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
- `packages/application/src/ports/repositories/moderation.ts` (report + case methods; T-404 extends it)
- `packages/contracts/src/schemas/moderation.ts` (`FileReportInput`), `view-models/report.ts`
- `packages/database/src/repositories/moderation.ts` (report/case methods), migration adding the `moderation_case_code_seq` sequence if T-005 did not
- `apps/web/src/components/patient/ReportSheet.tsx`, `apps/web/src/server/actions/moderation.ts` (`fileReport`)
- `packages/test-support/src/builders/report.ts`, fakes
- `packages/i18n/messages/{en,bn}.json` — `errors.moderation.*`, `report.sent` exists already

## Not in scope

Queue/case views and decisions (T-404), notifications delivery (T-405 — you emit `report.filed`), the reveal of reporters (T-404 via identity), automated danger/toxicity classification (forbidden by FD-009).

## Steps

1. **Domain `report-policy.ts`** — pure functions with table tests:
   - `isCriticalReason(reason)` → `privacy | threat | unsafeFile`.
   - `hideDecision({reason, distinctReporters, threshold, alreadyHidden, targetState})` → `'hide_now' | 'no_change'`: critical reason ⇒ `hide_now` (if `published`); `factual` ⇒ never; else `distinctReporters >= threshold && !alreadyHidden` ⇒ `hide_now`; a `hide_now` is emitted at most once per case (`auto_hidden` guard).
   - `laneFor(reasons)` → `critical` if any critical or `dangerous` reason, else `standard`.
   - `slaDueAt(lane, openedAt, thresholds)` → `+criticalHours` / `+standardDays` (business days: skip Fri/Sat, Bangladesh weekend — document the assumption with `// ASSUMPTION(T-403)`).
   - `coordinationSignal(reportsInWindow: {createdAt, reporterCreatedAt}[])` → true when ≥ 3 reports within 10 minutes come from accounts younger than 24 h **or** ≥ 5 reports from accounts created in the same ISO week (the MOD-2033 fixture case). Heuristic only; it flags, never hides.
2. **`case-code.ts`**: `MOD-<seq>` from a PostgreSQL sequence starting at 2100 (seed uses fixed codes 2011–2041 — the seed sets the sequence after inserting).
3. **Internal `setState` commands** (`review.setState`, `facilityReview.setState`, `comment.setState`): input `{id, to, reasonCode, caseCode?}`; `requires: { system: true } | { staffRole: any }`; validate with the owning domain's state table; write `hidden_at`/`hidden_reason_code`; audit on the owning stream (`review:<id>`); outbox `review.hidden|restored` / `comment.changed`. `moderation.decide` (T-404) and `report.file` are the only callers — export them from the module index under `internal`.
4. **`report.file` command**: `requires authenticated + verifiedEmail`; reasons must be in `config.reportReasons` (enabled list); target must exist and be `published` or `hidden_pending_review`; insert `reports` (unique violation ⇒ `moderation.duplicate_report`, count unchanged); find or create the open case for `(target_kind, target_id)`; `report_count += 1`, `distinct_reporters = count(distinct reporter)`; upsert `moderation_case_reasons`; `lane = laneFor(all reasons)` (never downgrade critical → standard); `coordinated_signal` via policy (needs reporter account `created_at` — read through the account repository, return nothing else); apply `hideDecision` → call the owning `setState` to `hidden_pending_review` with `reasonCode = 'auto_threshold' | 'auto_critical'`, set `auto_hidden = true`; audit `case:<code>` action `report` actor `reporter:restricted` details `{reason, distinctReporters, hidden: bool}` — **never** the reporter id; staff notification via outbox `report.filed {caseCode, targetKind, targetId, reasons, hidden}`; if `hidden` also outbox `review.hidden`/`comment.changed` (done by setState). Rate limit `report:account:<id>` 20/day.
5. **`report.status` query** `{targetKind, targetId, actor}` → `{alreadyReported: bool}` for the UI's sent state.
6. **Repository**: `insertReport` (returns duplicate flag), `findOpenCase`, `createCase`, `updateCaseCounts`, `upsertCaseReason`, `reportsForCoordination(caseId, windowMinutes)` (joins `account_profiles.created_at` only). Column-level: `reporter_account_id` is never selected by any query outside `moderation.revealReporter` (T-404) and the unique index — add a comment and a test that `CaseTrayVM` never contains it.
7. **Report sheet UI** (`ReportSheet.tsx`, client, uses `components/shared/Sheet`): port `openReport` — title `report.title`, reasons as `.opt` buttons (`aria-pressed`, radio semantics) from the config's enabled list in the prototype's order (`privacy, threat, unsafeFile, dangerous, factual, spam, impersonation`, then any others enabled), `report.factualNote`, detail textarea (`report.detail`), `report.evidence` + `report.evidenceNote` callout, `report.identityNote` warn callout, submit `report.submit`, target line; on success the sheet body becomes `report.sent`; on `moderation.duplicate_report` show `errors.moderation.duplicateReport`. Mount points: `Comment` (T-402 `onReport`), review-level `review.report` button in `ExperiencePage` (T-307), evidence item (T-308), doctor profile "report this profile" if the prototype has one (check `renderProfile` — if absent, do not add).
8. **i18n**: `errors.moderation.duplicateReport` ("You have already reported this. Repeated reports from one account do not count again." / "আপনি এটি আগেই রিপোর্ট করেছেন। এক অ্যাকাউন্ট থেকে বারবার রিপোর্ট আবার গণনা হয় না।"), `errors.moderation.reasonDisabled`.
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
