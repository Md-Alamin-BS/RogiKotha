# Admin / Staff Prototype — Coverage Audit

**Audit date:** 2026-09-06
**Auditor:** Planning-vs-build cross-check
**Prototype under audit:** `ui-design-prototype/admin/` (entry: `index.html`; logic: `app.js`; CSS: `styles.css`; shared data: `../shared/rogikotha-data.js`)
**Planning sources:** `01-requirement-baseline.md`, `08-product-backlog.md`, `06-requirement-traceability-matrix.md`, `05-recommended-architecture.md`.

The admin portal is explicitly a **prototype**. Three hash routes (`#queue`, `#evidence`, `#providers`) cover only what is needed for design review. Stubbing and "permission-as-typography" placeholders (`.restricted` boxes) are intentional, not gaps. The table below distinguishes **fully covered (✅)**, **partially covered / surface only (⚠️)**, and **missing / not surfaced (❌)**.

---

## 1. Coverage table

| Story ID | Requirement summary | Status | Evidence (file + line) |
|---|---|---|---|
| STORY-MOD-001 | Report intake, five-account auto-hide, reporter identity protected, coordination evidence | ⚠️ | Lane triage shows reasons `['dangerous','spam']` and coordinated badge in `rogikotha-data.js:1107`; threshold copy "5 unique confirmed accounts (configurable)" at `rogikotha-data.js:468`; queue rendered at `app.js:130-162`. Reporter identity is *gated, not visible* (see §2). Duplicate-account detection surfaced as a single badge only. |
| STORY-MOD-002 | Queue with priorities, reason-coded actions, no narrative rewrite, audit | ✅ (surface) | Lanes critical / standard / appeals with SLA copy (`app.js:131-134`, `rogikotha-data.js:455-460`); eight action chips `warn, redact, removeFile, lock, hide, remove, restrict, none` (`app.js:165, 192-194`); explicit "no rewrite" callout (`rogikotha-data.js:487`); audit preview box (`app.js:200-211`). |
| STORY-MOD-003 | Fresh-checklist appeal, blocking, enforcement lifecycle (warn/restrict/suspend/ban) | ⚠️ | Appeal lane + appeal text box at `app.js:171` (case MOD-2011). **Missing:** separate "fresh reviewer" selection, blocking UI, distinct `suspend`/`ban` actions (current chips collapse all enforcement into `restrict`). |
| STORY-EVID-003 | Custody, retention (90-day default), holds, removal | ⚠️ | Quarantine panel renders pipeline steps + retention/hold copy (`app.js:220-251`, `rogikotha-data.js:501-505`). **Missing:** controls to set/extend hold, bulk action, retention preview, custody log table. |
| STORY-ADMIN-001 | Versioned runtime configuration (limits, retention, roles, report thresholds, label translations, navigation, sentiment presentation, status labels) | ❌ | No settings/config UI in `index.html` (no `#config` route in `app.js:86`); permission flags live only inside `rogikotha-data.js:1093`. Founder brief calls for *no-deployment* configuration; **completely missing from prototype.** |
| STORY-ADMIN-002 | Operational dashboards + bulk actions (moderation, evidence, directory, user, health views) | ❌ | No health, evidence-queue-by-state aggregation, or directory-filter dashboard. Bulk actions are not surfaced (preview/idempotency not demonstrated). |
| STORY-DIR-002 | Community submission, claim, duplicate merge | ✅ (surface) | Providers view renders `pending`, `claims`, `fieldChanges` (`app.js:255-325`); duplicate merge button toggles on `duplicateOf` (`app.js:282-286`, `rogikotha-data.js:1142-1167`). |
| STORY-IDENT-001 | Per-review named/pseudonymous/anonymous identity; staff reveal is audited and normally off | ✅ (typed correctly) | `RK.moderation.permissions` explicitly sets `reporterIdentity: false` and `originalEvidence: false` (`rogikotha-data.js:1093`); restricted boxes (`app.js:182-186`, CSS `.restricted` at `styles.css:393-401`). |
| STORY-USER-002 | Account/data requests, deletion orchestration | ❌ | No user-search or data-request surface in the three tabs. |
| STORY-NOTIF-001 | In-app + essential email notifications | ❌ | Notifications feed exists in shared data (`rogikotha-data.js:1078-1084`) but **no admin notification view** is rendered anywhere in `app.js`. |
| STORY-OPS-002 | Optional privacy-minimised analytics with aggregate admin views | ❌ | No analytics aggregate surface. |
| STORY-EVID-001 / EVID-002 | Quarantine-first upload, privacy preview, viewer | ✅ (visualization only) | Pipeline stages `received→published` shown (`app.js:223, 242-244`); fail-closed and redaction-waiting badges rendered (`rogikotha-data.js:1131-1139`). **No** author preview / redactor, viewer, or upload surface — those live on the patient side. |
| FR-FDB-001 | Persistent feedback intake | ❌ | No feedback queue UI. |
| FR-TAG-003 | Admin alias / merge of taxonomy terms | ❌ | Not surfaced. |
| FR-EVD-007 | Evidence-processing administration | ⚠️ | Pipeline + retention copy shown; actionable admin commands (`retry`, `release hold`, `force redact`) absent. |
| FR-AN-003 | Admin analytics reporting | ❌ | Not surfaced. |
| BD/Operational — health & capacity | Health dashboard, queue SLAs | ⚠️ | SLA copy present per lane (`criticalTarget`, `standardTarget`, `appealTarget`) but no aggregated queue health, no error rate, no backlog trend. |

---

## 2. Permissions / RBAC coverage

The planning docs (`01-requirement-baseline.md:181-188`, `05-recommended-architecture.md:106-113`) define three staff roles: **Super Admin**, **permission-scoped Admin**, and **permission-scoped Moderator**. Reporter identity and original-evidence access are *separate, audited* privileges. The prototype models a single assumed viewer whose permission flags are hard-coded in the data layer:

```js
// rogikotha-data.js:1093
permissions: { reports: true, contentActions: true, reporterIdentity: false, originalEvidence: false }
```

| Capability (per planning) | Visible in prototype? | Where | Verdict |
|---|---|---|---|
| Reporter identity | Hidden behind a `.restricted` box with explanatory copy | `app.js:182-183`, `rogikotha-data.js:472-473` | ✅ correctly gated. Reveal is *acknowledged as restricted*, no actual reveal control exists (intentional for prototype). |
| Original (un-redacted) evidence | Per-case `.restricted` box with a "Request access" button (no-op) | `app.js:184-186`, `rogikotha-data.js:474-476` | ✅ correctly gated. |
| Approve / reject provider claims | Buttons rendered for both approve and reject | `app.js:300-302` | ✅ surface only — buttons do nothing (`app.js:331-345` does not wire these). |
| Approve protected-field changes | Buttons only shown when `x.protected === true` | `app.js:318-320`, `rogikotha-data.js:1158-1167` | ✅ conditional rendering matches `01-requirement-baseline.md:62-65`. |
| Non-protected operational field changes | No approve/reject — note that operational fields do not require approval | `app.js:321` | ✅ matches policy. |
| Merge duplicates | Only rendered when `duplicateOf` is set; reveals the canonical record's BMDC | `app.js:267-287`, `rogikotha-data.js:1147` | ✅ matches STORY-DIR-002. |
| Settings / capability matrix (Super Admin) | **Not present anywhere.** No role-switcher, no settings tab. | — | ❌ |
| Anything *meant to be hidden* shown? | None. Reporter identity text is never rendered in any branch. | grep `'admin\\.reporterMasked'` only inside the restricted box (`app.js:182`). | ✅ no leakage. |

Role-switching is absent — the prototype assumes one staff role. Adding a role chip or query-string `?role=super-admin` would expose identity-reveal flows for design review without code changes.

---

## 3. Audit-log coverage

The audit preview box in the case-detail panel (`app.js:200-211`) renders a six-line plaintext block:

```
case=MOD-2041
actor=moderator:you
action=<selected action or —>
object=comment:k3
result=pending|recorded
reason=<written above>
reporter_identity=not_accessed
original_evidence=not_accessed
```

Compare this to the planning contract (`01-requirement-baseline.md:184-188`, `05-recommended-architecture.md:111`, STORY-ADMIN-001 acceptance criteria "actor, time, prior/new values, and result"):

| Field planning requires | In prototype audit box? |
|---|---|
| Actor | `actor=moderator:you` ✅ (placeholder) |
| Time / timestamp | ❌ (no timestamp; `done` flips to "recorded" but no clock) |
| Target content ID | `object=comment:k3` ✅ |
| Action | `action=…` ✅ |
| Reason | `reason=<written above>` ✅ (placeholder, captures intent only) |
| Result (succeeded/pending) | `result=pending|recorded` ✅ |
| Prior / new values | ❌ for moderation; present in protected-fields audit (`app.js:317`) but only `was → now` for field edits, not full diff |
| Reporter identity access | `reporter_identity=not_accessed` ✅ explicit, never blank |
| Original evidence access | `original_evidence=not_accessed` ✅ explicit |
| Policy version | ❌ not surfaced |
| Correlation / request ID | ❌ not surfaced |

The box is a *preview only* — clicking **Record decision** (`app.js:212, 336`) flips a local boolean and shows a confirmation callout. Nothing persists, nothing is exportable. For a prototype this is acknowledged ("Fictional cases" — `rogikotha-data.js:451`); for backlog coverage the box demonstrates the *shape* of an audit event but does not implement it. STORY-ADMIN-001 "append-only audit" is therefore ⚠️.

---

## 4. Missing or weak stories

- **STORY-MOD-003 (appeals / enforcement lifecycle)** — only an appeal text and lane exist; no fresh-reviewer selection, no separate `suspend`/`ban` chips, no block UI. ⚠️
- **STORY-ADMIN-001 (versioned runtime configuration)** — no settings tab, no capability matrix, no retention/threshold editors. ❌
- **STORY-ADMIN-002 (operational dashboards, bulk actions, export)** — no aggregate views, no bulk preview, no CSV/JSON export. ❌
- **STORY-EVID-003 (holds, retention edits, bulk removal)** — pipeline renders but no actionable admin commands. ⚠️
- **STORY-USER-002 (data requests, deletion orchestration)** — no user search or request list. ❌
- **STORY-NOTIF-001 (notifications surface)** — feed exists in data but no admin notification triage. ❌
- **STORY-OPS-002 (analytics aggregate view)** — not surfaced. ❌
- **FR-TAG-003 (admin taxonomy aliases)** — not surfaced. ❌
- **FR-FDB-001 (feedback triage)** — no feedback queue. ❌
- **Queue health / SLA dashboard** — only per-case SLA copy; no aggregate health. ⚠️
- **Identity reveal flow (Super Admin)** — represented as restricted text only; no actual reveal-with-reason flow. ⚠️ (intentional for prototype).
- **Translation label editor / label history** — not surfaced. ❌
- **Audit log viewer (separate page)** — the case-detail audit box is the *only* audit surface; no list/timeline view. ❌

---

## 5. Concrete next steps (highest-value)

1. **Add `#audit` hash route** — render a timeline list of every audit event (case, actor, time, action, result) with filter by actor/date/reason. Demo with the same five synthetic cases. Adds: STORY-ADMIN-001 audit visibility, NFR-009.
2. **Add `#config` route** — Super Admin settings screen: report threshold (5), retention default (90d), label translation toggle, capability matrix per role. Adds: STORY-ADMIN-001 surface, FR-ADM-001/002/003.
3. **Distinguish enforcement actions** — split `restrict` into `warn`, `restrict`, `suspend`, `ban` chips to mirror `01-requirement-baseline.md:168`. Adds: STORY-MOD-003 enforcement lifecycle.
4. **Add appeal-detail view** — render `c.appealText`, `c.originalDecision` (new fixture field), "different reviewer" toggle, deadline countdown. Adds: STORY-MOD-003 fresh-checklist requirement.
5. **Add evidence action bar** — per-file `retry`, `release hold`, `force redact`, `remove` for items in `quarantine`. Adds: STORY-EVID-003 custody, FR-EVD-007.
6. **Role switcher chip** — header dropdown (`Moderator` / `Admin` / `Super Admin`) that mutates `RK.moderation.permissions` for design review. Lets the same prototype demo permission-as-typography without code branching. Adds: FR-ADM-002.
7. **Bulk moderation preview** — multi-select checkboxes on queue, then a "preview affected (5)" modal before commit. Adds: STORY-ADMIN-002.
8. **Notification triage surface** — render the existing `notifications` feed with kind filters; add "send policy note to author" action. Adds: STORY-NOTIF-001 admin side.
9. **Tag alias editor** — list of `provisionalTerms`, mapping to canonical term, redirect preview. Adds: FR-TAG-003, STORY-SRCH-003.
10. **Data request queue** — list of export/delete requests, status pill, ownership check, hold-aware action. Adds: STORY-USER-002 admin side.

Together these 10 additions move the prototype from "3 demonstration routes" to "covers every admin-titled story at surface level", leaving only the real auth, audit persistence, and production-style command authorization for implementation.
