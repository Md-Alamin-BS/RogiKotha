# T-406 — Staff console shell and queue (Chart Tray port)

| Field | Value |
|---|---|
| Story | STORY-MOD-002, STORY-MOD-003, STORY-ADMIN-002, STORY-NFR-006, STORY-NFR-009 |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 6–8 h agent; validation 2 h |
| Depends on | T-404 (`QueueVM`, `CaseTrayVM`, `moderation.*` commands), T-103 (admin guard, role, stepUp sheet), T-008 (`admin.css` + `tokens.css` ported, root layout attrs), T-405 (staff unread count for nav) |
| Parallel-safe with | T-407, T-408 (they mount into the shell you build — publish `AdminLayout` and `AdminNav` first, in the first commit), T-409, T-410 |

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-088 — appeals, bulk and the notification view deferred** — Release 1 builds the queue and case tray with decide, restore and enforcement only. **Not in scope (FD-088):** the appeals lane and the appeal text in the tray, the bulk toolbar and bulk preview sheet (`BulkToolbar`, `BulkSheet`, the `bulkPreview` and `bulkApply` actions, step 8), and the staff-notification triage view with its nav item. They become follow-up tasks after release 1. Their acceptance rows are marked "deferred, FD-088", not deleted. The queue shows two lanes, critical and standard. The nav shows Queue, Evidence and Providers under Casework and Configuration under Oversight; there is no Notifications item or route stub, and `adminNavCounts` is built without the `notifications` figure (C1 keeps the field for the follow-up). Changes: Goal, Owned paths, steps 3, 5, 7, 8, 9 and 10 and the acceptance rows.
- **FD-087 / FD-088 — no appeal route in decision notices** — The tray and the notices it triggers name no appeal route until appeals exist.
- **FD-080 (C11) — repetition case in the tray** — A case with `flag = 'repeat_episode'` shows the text "Possible repetition of an earlier account by the same author" in the tray, with no link to any earlier review.
- **C1 — `adminNavCounts`** — Built by the query bundle in this task as `{queue, critical, evidence, providers, notifications}: (int | null) each`, read through `OperationalCounts` (metrics `casesOpen`, `casesCriticalOpen`, `evidenceAwaiting`, `providerWorkPending`, `staffNotificationsUnacked`); a figure that cannot be read is `null` and renders "Not provided", never 0. T-406 builds the `OperationalCounts` implementations behind the nav figures (`casesCriticalOpen` in Moderation, `evidenceAwaiting` in Evidence, `providerWorkPending` in Directory, `staffNotificationsUnacked` in Notification); T-408 builds the ones for the Beta metrics.

## Goal

Port the staff console shell (masthead, grouped iconed counted nav, bottom tab bar, crumbs, live region) and the queue view (lanes, case rows, case tray with action chips, reason, audit preview, audit timeline, the docked **Record decision** button; the bulk toolbar and bulk preview sheet are deferred, FD-088) into React on the Chart Tray stylesheet, wired to the real moderation commands and the signed-in staff role.

## Read first

1. `docs/implementation/01-conventions.md` §7 (CSS port — `admin.css` loads only under the admin layout; `body[data-app="admin"]`), §8, §9
2. `docs/implementation/03-routes-and-contracts.md` §1 Staff routes, §4 "moderation"
3. `docs/design/auth-screens-spec.md` §4 (role chip replaces the switcher; step-up sheet)
4. `docs/design/rogikotha-dev-spec.md` "Staff console (`admin/`) — Chart Tray" (planes, the dock, grouped navigation)
5. Prototype — read all of `ui-design-prototype/admin/app.js` and `admin/index.html`; read `admin/styles.css` selectors: `.masthead`, `.staff-badge`, `.bar-nav`, `.top-item`, `.count`, `.count.urgent`, `.nav-sep`, `.tabbar`, `.tab-item`, `.tab-dot`, `.crumbs`, `.wrap`, `.a-head`, `.p-grid`, `.p-side`, `.lane[data-tier]`, `.lane-head`, `.lane-count`, `.target`, `.case-row`, `.case`, `.case-flags`, `.panel`, `.sub`, `.sub-head`, `.kicker`, `.restricted`, `.opt-row`, `.opt`, `.callout`, `.field`, `.audit`, `.dock`, `.btn.primary`, `.overlay`, `.sheet`, `.ico`, `forced-colors` block
6. `tools/` — the jsdom console harness mentioned in `docs/status/current-status.md` (33 checks) if present under `tools/` or `.archive/admin-shell-studies/`; reproduce its assertions as component tests

## Owned paths

- `apps/web/src/app/[locale]/admin/layout.tsx`, `admin/page.tsx` (redirect), `admin/queue/page.tsx`, `admin/queue/[code]/page.tsx`
- `apps/web/src/components/admin/AdminLayout.tsx`, `AdminMasthead.tsx`, `AdminNav.tsx` (top + tab bar from one `NAV_GROUPS` constant), `Crumbs.tsx`, `Icon.tsx` (the five paths from `ICONS`), `PermissionCallout.tsx`, `QueueView.tsx`, `Lane.tsx`, `CaseRow.tsx`, `CaseTray.tsx`, (`BulkToolbar.tsx` and `BulkSheet.tsx` are not built, FD-088) `ActionChips.tsx`, `AuditPreview.tsx`, `AuditTimeline.tsx`, `DecisionDock.tsx`, `RoleChip.tsx`
- `apps/web/src/server/actions/moderation.ts` — `decide`, `restore`, `revealReporter`, `requestAccess` (`bulkPreview` and `bulkApply` deferred, FD-088) (T-403 created the file with `fileReport`; add exports)
- `apps/web/src/components/admin/*.test.tsx`
- `apps/web/src/styles/admin.css` — additions only, `/* added: T-406 */`

## Not in scope

Evidence/providers/notifications/config views (T-407, T-408) — you provide the shell and route stubs (`page.tsx` rendering `<h1>` only) so their tasks can start; the moderation logic (T-404); the patient app.

## Steps

Build in this order and commit after step 3 so T-407/T-408 can start.

1. **`AdminLayout` + `layout.tsx`**: guard via `getActor()` — no `staffRole` → redirect `/admin/sign-in?next=`; render `<body data-app="admin" data-view="<segment>">` attrs through the root layout's slot (the root layout owns `<html>`/`<body>`; pass `dataApp` up as in T-008's mechanism — read its README section), skip link, `.demo` marker (`demo.banner` + `admin.demoNote`), `AdminMasthead`, `<div class="progress">`, `<main id="main"><div class="wrap"><LiveRegion/><Crumbs/>{children}</div></main>`, `AdminNav` tab bar, `Sheet` host, colophon (`admin.staffOnlyNote`, `admin.permissionNote`). `metadata.robots = noindex`.
2. **`AdminMasthead`**: brand (`brand.name`, `admin.portal`), `.staff-badge`, `<AdminNav variant="top"/>`, controls: lang `অ` (link to other locale), theme `◐` (server action cookie), **`RoleChip`** (`SA`/`AD`/`MO`, `title = staff.role.chipTitle`, opens a small menu: `/admin/security`, sign out), back-to-site `↗` → `/`. No role switching.
3. **`AdminNav`**: `NAV_GROUPS` constant (Casework: queue/evidence/providers; Oversight: config; the notifications item is deferred, FD-088) with counts from a server query bundle `adminNavCounts()` = `{queue: open cases, critical: open critical, evidence: items not published/removed, providers: pending submissions + claims + protected changes}` (the `notifications` figure is not shown, FD-088); `.count.urgent` when `critical > 0`; `aria-current="page"` from the pathname; `.nav-sep` between groups; tab bar variant iterates the same groups (first word of the label, `.tab-dot`). Real `<Link>`s.
4. **`Crumbs`**: `admin.portal / <group label bn/en> / <b>item</b>`.
5. **`QueueView`** (`/admin/queue?lane=`): `a-head` H1, `PermissionCallout` (keep the prototype's callout but its text is real: show `admin.permission` + the actor's actual capabilities — reuse the keys, drop the demo sentence), `admin.threshold` note with the live threshold value (`{count}` param), (`BulkToolbar` deferred, FD-088), two `Lane`s (critical, standard) from `QueueVM` (skip empty lanes as the prototype does; the appeals lane is deferred, FD-088), `.p-side` aside with `<CaseTray/>` when a `[code]` is selected (route `/admin/queue/[code]` renders the same page with the tray populated; the case button is a `<Link aria-pressed>`).
6. **`CaseRow`**: checkbox `data-bulk-check` (client state in `QueueView` client wrapper), `.case` link with `.id`, `.age` (`admin.age` + hours via `formatNumber`), summary, flags: target kind badge, `admin.autoHidden`/`admin.stillVisible`, report count badge, `admin.coordinated` badge.
7. **`CaseTray`**: port `caseDetail` block by block: kicker + code, summary `h2`, note, (appeal text callout deferred, FD-088), the repetition flag text when `flag = 'repeat_episode'`, reasons as `.tag`s (`report.<reason>`), coordinated callout, **permissions sub**: `.restricted` reporter box (`admin.reporterMasked` + `admin.reporterNote`) with **Reveal (audited)** button only when `actor.capabilities` includes `identity.reveal` → stepUp sheet → `revealReporter` → on success show `reporterRevealed.username` inline once (not persisted); for others the box has no button (the prototype showed nothing for non-SA — keep); evidence gate box when `target.kind === 'evidence'`: capability holders get **Reveal (audited)** → T-407's original-access route; others get **Request access** → `requestAccess` (logged) → `admin.done.requested`; **decision sub**: `ActionChips` from `allowedActions` (`.opt`, `aria-pressed`, `admin.act.<a>`), `admin.noRewrite` callout, reason textarea `mod-reason` (`admin.reasonToAuthor`), redaction editor appears only when `redact` is selected (textarea prefilled with the target excerpt; the server enforces subtractive); **audit preview** `.audit` block computed from real values (`case=`, `actor=<role>:<username>`, `action=`, `object=<kind>:<publicId>`, `result=pending|recorded`, `reason=<written above>`, `reporter_identity=not_accessed|accessed`, `original_evidence=not_accessed|accessed`); `AuditTimeline` (≤ 10 rows: relTime via `formatRelative`, `<b>action</b> · actor · code`, target public id); **`DecisionDock`**: `.dock` with `.note` "`admin.case` code · **action**" and `.btn.primary#mod-commit` (`admin.commit`) → `decide` action; disabled until an action and a reason (≥ 10 chars) exist; after success re-render with `admin.recorded` callout and the new timeline row; `announce(admin.recorded)`.
8. **Deferred, not built in release 1 (FD-088).** Bulk: `BulkToolbar` (`admin.bulk.toolbar`, select-critical, preview `(n)` disabled at 0), `BulkSheet` (title `admin.bulk.preview (n)`, list from `bulkPreview` result with skipped reasons, cancel/confirm → `bulkApply` → `admin.bulk.done` callout + `announce`), selection state client-side only.
9. **Route stubs** for evidence/providers/config (the notifications stub is deferred, FD-088) (`<h1 class="display">` + `PermissionCallout`) so nav works end to end.
10. **Tests**: port the console harness checks that apply to the shell/queue (nav renders 4 items with counts; urgent class when a critical case exists; tab bar order matches groups; the repetition flag text shows without a link; crumbs; selecting a case shows the tray; action chips filtered by role; commit disabled without reason; recorded state; reveal button absent for moderator; the bulk preview test is deferred, FD-088); both locales.
11. `npx impeccable detect apps/web/src/components/admin --no-advisory` and `pnpm contrast` clean; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Guard | manual / e2e smoke | signed-out `/admin/queue` → `/admin/sign-in`; contributor account → `staff.notStaff` |
| Counts | component test with builders | nav shows live counts; urgent when a critical case is open |
| Tray parity | component test | every block of `caseDetail` present in order, except the deferred appeal callout (FD-088); reporter reads `admin.reporterMasked` for all roles |
| FD-088: deferred parts not built | list the files this task adds and render the nav and queue | no `BulkToolbar`, `BulkSheet`, `bulkPreview`/`bulkApply` action, appeals lane or Notifications nav item exists; the queue shows critical and standard lanes only |
| FD-080: repetition flag in the tray | component test with `flag: 'repeat_episode'` | the flag text renders in both locales; the tray holds no link, id or title of an earlier review |
| C1: nav counts as `null` | component test with `adminNavCounts` returning `null` for evidence | the Evidence count reads "Not provided", not 0 |
| Record decision | manual as `mod_rashid` | storyboard step 19: timeline gains a row, author notified |
| Role filtering | component test | moderator sees no `remove/restrict/suspend/ban` chips; super_admin sees all |
| Bulk | deferred, FD-088 | storyboard step 21 is not run in release 1 |
| Tab bar | Playwright at 360 px (T-503 later; here a component test on the `variant="tab"` render) | four tabs in group order (the notifications tab is deferred, FD-088) |
| Design checks | `impeccable detect`, `pnpm contrast` | clean |

## Tests to write

Component tests in step 10; action tests that `decide` maps `Result` errors (`moderation.narrative_locked`, `forbidden`, `auth.step_up_required`) to rendered messages.

## Hard-rule checklist

- [ ] Reporter identity reads "restricted" for every role; reveal only through the audited command with step-up.
- [ ] Action list is what the server allows; the UI never offers narrative editing.
- [ ] One solid accent fill per view (the dock); badges and buttons remain distinct (no new classes that blur them).
- [ ] `noindex`; no patient chrome; Bengali and English both render; numerals follow language.
- [ ] Live region announces view changes and recorded decisions.
- [ ] No attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
