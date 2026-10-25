# T-408 — Staff notifications triage and versioned configuration views

| Field | Value |
|---|---|
| Story | STORY-NOTIF-001 (staff half), STORY-ADMIN-001, STORY-ADMIN-002 (Beta metrics only, FD-066) |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1.5 h |
| Depends on | T-105 (`config.*` commands, `ConfigValues` schema, `config_changes`), T-405 (`staffNotification.list/ack`), T-406 (shell, stepUp sheet), T-103 (capabilities) |
| Parallel-safe with | T-407, T-409, T-410, T-501 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-066** — The staff dashboard's Beta metrics (FR-ADM-004, FR103) are aggregate counts computed from the product's own tables: accounts, published reviews, open and closed reports, and evidence processed or failed. There is no analytics and no per-user data (FD-019), and `administration` owns the view. Because no other task builds it, this Unit delivers it: Story row, Goal, Read first, Owned paths, Not in scope, the new steps 9–10 (the later steps are renumbered) and new acceptance rows. The counts reach `administration` through the `OperationalCounts` port that the counted modules implement (FD-067); Contract Design pins the port signature and the query name.

## Goal

Port the console's notifications view (kinds, open → route, acknowledge) and the configuration view, replacing the prototype's localStorage thresholds with the real versioned configuration: bounded inputs, report-reason toggles, the capability matrix, apply with reason and password recheck, version history with per-path diffs, rollback, concurrency conflict handling, and read-only rendering for anyone below Super Admin. Also render the Beta metrics view: aggregate counts from the product's own tables, with no analytics and no per-user data (FD-066).

## Read first

1. `docs/implementation/01-conventions.md` §7–§8
2. `docs/implementation/02-data-model.md` §11 (`config_versions`, `config_changes`, the `values` shape and ranges), §12 (`staff_notifications`)
3. `docs/implementation/03-routes-and-contracts.md` §4 "administration" (`config.current/history/propose/apply/rollback` with ranges and `config.invariant`), §4 "notification" (`staffNotification.*`), §2 `Capability`
4. `docs/design/auth-screens-spec.md` §4.4 (step-up sheet)
5. `docs/status/decision-log.md` FD-016, FD-018, FD-020; `ARCHITECTURE-SPINE.md` AD-10
6. Prototype: `admin/app.js` 553–639 (`loadConfig`, `saveConfig`, `renderConfig`: threshold inputs `cfg-five (2–50)`, `cfg-critical (1–168)`, `cfg-standard (1–30)`, retention `cfg-retdef (1–3650)`, `cfg-retmax`, the role × capability `.kv` matrix with `✓`/`—`, current role line) and 640–670 (`renderNotifications`: `.sub` rows with target, when, kind badge, text, open/ack buttons, `admin.done.acked`); fixtures `moderation.thresholds`, `moderation.notifications` (kinds `newReport, evidence, claim, protectedChange, identityReveal, security`)
7. `docs/implementation/05-demo-storyboard.md` steps 24–25
8. `docs/status/decision-log.md` FD-019, FD-066, FD-067; the Administration entry and the `OperationalCounts` port in `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/domain-design/components.md`; AC11.2.1, AC11.2.2 and AC11.2.5 in `.../inception/user-stories/stories.md`

## Owned paths

- `apps/web/src/app/[locale]/admin/notifications/page.tsx`, `admin/config/page.tsx` (replace stubs)
- `apps/web/src/components/admin/StaffNotifications.tsx`, `StaffNotificationRow.tsx`, `ConfigView.tsx`, `ThresholdFields.tsx`, `RetentionFields.tsx`, `ReportReasonToggles.tsx`, `CapabilityMatrix.tsx`, `ConfigHistory.tsx`, `ConfigDiff.tsx`, `ApplyConfigSheet.tsx`
- `apps/web/src/server/actions/admin-config.ts` (`proposeConfig`, `applyConfig`, `rollbackConfig`), `apps/web/src/server/actions/staff-notifications.ts` (`ackStaffNotification`)
- `apps/web/src/components/admin/*.test.tsx`
- `apps/web/src/styles/admin.css` — additions only, `/* added: T-408 */` (a diff row style may be needed; prefer `.audit`)
- `packages/i18n/messages/{en,bn}.json` — `admin.config.*` additions (`apply`, `reason`, `history`, `version`, `rollback`, `rolledBackFrom`, `conflict`, `readOnly`, `reasons`, `capabilities.note`, `outOfRange`), `admin.notif.empty`, `admin.metrics.*` (FD-066)
- Beta metrics (FD-066): `apps/web/src/components/admin/BetaMetrics.tsx` (+ test); the `administration` Beta metrics query and its view model, and the `OperationalCounts` implementations for the counted modules (accounts, published reviews, reports, evidence) — file names follow the query and port names pinned in Contract Design (FD-067)

## Not in scope

The configuration commands and validation (T-105), notification delivery (T-405), the retention bulk action (T-407), the patient notifications page (T-405), any analytics, tracking or per-user metric (FD-019, FD-066).

## Steps

### Notifications view

1. **Page**: H1 `admin.notif.title`, `PermissionCallout`, `.panel` of `StaffNotificationRow`s from `staffNotification.list` (unacked first, then acked, newest first; cursor "load more"); empty state `admin.notif.empty`.
2. **`StaffNotificationRow`**: `.sub` → `.q-head` with target (`params.caseCode | targetPublicId`), `.size` relative time, kind badge `admin.notif.kind.<kind>`; text from `message_key` + params; actions: **Open** (`admin.notif.action.open`) → `route` (`<Link>`), **Acknowledge** (`admin.notif.action.ack`) → `ackStaffNotification` → `✓ admin.done.acked`; acked rows keep Open only. `announce()` on ack.

### Config view

3. **Page**: H1 `admin.config.title`, `PermissionCallout`, `.panel` with the three prototype `.sub`s in order — thresholds, retention, roles — plus a fourth `.sub` **Report reasons** (new: `ReportReasonToggles`, one `.opt` per `report_reason` enum value with `aria-pressed` = enabled; `factual` and the three critical reasons cannot be disabled — render them pressed and disabled with `title = admin.config.reasons.fixed`), then **history**. Data from `config.current` + `config.history`. The whole form is `readOnly` unless `actor.capabilities` includes `config.write`; read-only renders values as text with `admin.config.readOnly` note.
4. **`ThresholdFields`**: `cfg-five` (`admin.config.threshold.five`, 2–50), `cfg-critical` (1–168), `cfg-standard` (1–30), `cfg-appeal` (`admin.config.threshold.appealDays`, 1–30 — the prototype lacked this input; add the key), `cfg-limited` (`admin.config.threshold.limitedData`, 1–50 — add). Native `min/max` plus server validation; out-of-range renders `admin.config.outOfRange` inline.
5. **`RetentionFields`**: `cfg-retdef` (originalDays 1–3650), `cfg-audit` (auditDays 30–3650 — replaces the prototype's `retentionMaxDays`, which is not a config value in §11; keep the label `admin.config.retention.maxDays` **only** if you keep a max — do not; use `admin.config.retention.auditDays` (add)), `cfg-notif` (notificationDays, add key).
6. **`CapabilityMatrix`**: `.kv` table, rows `sa | admin | mod`, columns `reports, actions, identity, originalEvidence`; `sa` row fixed `✓` (code, not config); `admin`/`mod` rows: `reports` and `actions` fixed `✓`, `identity` and `originalEvidence` are checkboxes bound to `values.capabilities.<role>.<cap>` (labelled `admin.config.cap.identity` etc. + role for screen readers); current role line `admin.role.current: <role>` from the actor.
7. **Apply flow**: any change enables **Apply** (`admin.config.apply`, the view's single `.btn.primary`); click → `proposeConfig` → `ApplyConfigSheet` shows the diff (`ConfigDiff`: path, before → after using `.audit`-style rows), a required reason field, `expectedVersion` hidden; **Continue** → stepUp sheet (T-103 component) → `applyConfig` → success: `announce`, re-render with the new version banner `admin.config.version {n}`; `conflict` → `admin.config.conflict` ("Someone else changed the configuration; review the new values") with a reload link; `config.invariant`/`config.out_of_range` → field errors from `fieldErrors`.
8. **`ConfigHistory`**: list of versions newest first: version, effective from, actor role (opaque — `actor` shown as role + username of staff is acceptable in the console; confirm the `config.history` VM already limits to `{version, effectiveFrom, actorLabel, reason, rolledBackFrom, changes[]}`), reason, `admin.config.rolledBackFrom {n}` badge, expandable per-path diffs; **Roll back to this version** (`admin.config.rollback`) on every non-current version → reason → stepUp → `rollbackConfig` → new version.
### Beta metrics view (FD-066)

9. **Query**: the `administration` Beta metrics query (name pinned in Contract Design) returns exact aggregate counts only — accounts, published reviews, open reports, closed reports, evidence processed, evidence failed — each read from the owning module's own tables through the `OperationalCounts` port (FD-067). No analytics source, no event tracking, and no per-user data: the view model holds counts only, with no account id, username, email or per-user breakdown (FD-019). Whether reports are counted per report row or per moderation case, and which staff capability may read the view, are decided in Contract Design; the server refuses any other actor. Where the view sits in the console is set in this Unit's Code Generation plan.
10. **`BetaMetrics`**: `.panel` with one `.kv` row per count, label from `admin.metrics.*` and the exact number in the active language's numerals; a count that could not be computed renders the existing "Not provided" copy, never `0` (hard rule); no chart, score, rating or ranking.
11. **Tests**: read-only for admin/moderator; ranges enforced client-side; fixed reasons disabled; diff sheet lists exactly the changed paths; conflict message; rollback produces a new version row in history; notifications ack; Beta metrics counts, refusal and missing count (FD-066); both locales.
12. `impeccable detect`, `pnpm contrast`, `pnpm check`; hand-off with new keys listed.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Storyboard 24 | manual as `sa_founder` | 5 → 3 with reason + password → version 2 with one diff row; rollback → version 3 copying v1 values; moderator identity toggle off by default |
| Read-only | component test as `admin_nadia` | inputs rendered as text; no Apply |
| Invariants | test: submit an unknown key via devtools-style tampering (action test) | `config.invariant` surfaced; nothing applied |
| Conflict | action test with stale `expectedVersion` | `admin.config.conflict` rendered |
| Notifications | manual storyboard 25 | open routes to the case; ack persists after reload |
| Design checks | `impeccable detect`, `pnpm contrast` | clean |
| FD-066: Beta metrics counts | integration test against the seeded demo database | each of the six counts equals a direct `count(*)` on the owning table with the same filter; the view-model JSON holds only those counts — no account id, username or email (AC11.2.1) |
| FD-066: No analytics | page test and network check | rendering the view loads no analytics script and makes no request outside the app |
| FD-066: Refused role | action test as an actor without the capability named in Contract Design | `forbidden`; no count reaches the client (AC11.2.2) |
| FD-066: Missing count and locale | component test `en`/`bn` with one count unavailable | that row reads "Not provided" in the active language, never `0`; the other counts use the active language's numerals (AC11.2.5) |

## Tests to write

Component tests in step 11; action tests for `proposeConfig` diff shape and error mapping; the Beta metrics query and component tests (FD-066).

## Hard-rule checklist

- [ ] Super Admin capabilities fixed in code; Admin/Moderator reveal and original access default off and toggle only here.
- [ ] Structural/security settings are not editable (no schema, no auth, no audit toggles rendered).
- [ ] Every apply/rollback has reason + password recheck + version row.
- [ ] Retention default change is labelled prospective.
- [ ] Both locales; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
