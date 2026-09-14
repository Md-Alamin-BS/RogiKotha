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

## Goal

Port the staff console shell (masthead, grouped iconed counted nav, bottom tab bar, crumbs, live region) and the queue view (lanes, case rows, bulk toolbar, case tray with action chips, reason, audit preview, audit timeline, the docked **Record decision** button, bulk preview sheet) into React on the Chart Tray stylesheet, wired to the real moderation commands and the signed-in staff role.

## Read first

1. `docs/implementation/01-conventions.md` §7 (CSS port — `admin.css` loads only under the admin layout; `body[data-app="admin"]`), §8, §9
2. `docs/implementation/03-routes-and-contracts.md` §1 Staff routes, §4 "moderation"
3. `docs/design/auth-screens-spec.md` §4 (role chip replaces the switcher; step-up sheet)
4. `docs/design/rogikotha-dev-spec.md` "Staff console (`admin/`) — Chart Tray" (planes, the dock, grouped navigation)
5. Prototype — read all of `ui-design-prototype/admin/app.js` and `admin/index.html`; read `admin/styles.css` selectors: `.masthead`, `.staff-badge`, `.bar-nav`, `.top-item`, `.count`, `.count.urgent`, `.nav-sep`, `.tabbar`, `.tab-item`, `.tab-dot`, `.crumbs`, `.wrap`, `.a-head`, `.p-grid`, `.p-side`, `.lane[data-tier]`, `.lane-head`, `.lane-count`, `.target`, `.case-row`, `.case`, `.case-flags`, `.panel`, `.sub`, `.sub-head`, `.kicker`, `.restricted`, `.opt-row`, `.opt`, `.callout`, `.field`, `.audit`, `.dock`, `.btn.primary`, `.overlay`, `.sheet`, `.ico`, `forced-colors` block
6. `tools/` — the jsdom console harness mentioned in `docs/status/current-status.md` (33 checks) if present under `tools/` or `.archive/admin-shell-studies/`; reproduce its assertions as component tests

## Owned paths

- `apps/web/src/app/[locale]/admin/layout.tsx`, `admin/page.tsx` (redirect), `admin/queue/page.tsx`, `admin/queue/[code]/page.tsx`
- `apps/web/src/components/admin/AdminLayout.tsx`, `AdminMasthead.tsx`, `AdminNav.tsx` (top + tab bar from one `NAV_GROUPS` constant), `Crumbs.tsx`, `Icon.tsx` (the five paths from `ICONS`), `PermissionCallout.tsx`, `QueueView.tsx`, `Lane.tsx`, `CaseRow.tsx`, `BulkToolbar.tsx`, `BulkSheet.tsx`, `CaseTray.tsx`, `ActionChips.tsx`, `AuditPreview.tsx`, `AuditTimeline.tsx`, `DecisionDock.tsx`, `RoleChip.tsx`
- `apps/web/src/server/actions/moderation.ts` — `decide`, `restore`, `bulkPreview`, `bulkApply`, `revealReporter`, `requestAccess` (T-403 created the file with `fileReport`; add exports)
- `apps/web/src/components/admin/*.test.tsx`
- `apps/web/src/styles/admin.css` — additions only, `/* added: T-406 */`

## Not in scope

Evidence/providers/notifications/config views (T-407, T-408) — you provide the shell and route stubs (`page.tsx` rendering `<h1>` only) so their tasks can start; the moderation logic (T-404); the patient app.

## Steps

Build in this order and commit after step 3 so T-407/T-408 can start.

1. **`AdminLayout` + `layout.tsx`**: guard via `getActor()` — no `staffRole` → redirect `/admin/sign-in?next=`; render `<body data-app="admin" data-view="<segment>">` attrs through the root layout's slot (the root layout owns `<html>`/`<body>`; pass `dataApp` up as in T-008's mechanism — read its README section), skip link, `.demo` marker (`demo.banner` + `admin.demoNote`), `AdminMasthead`, `<div class="progress">`, `<main id="main"><div class="wrap"><LiveRegion/><Crumbs/>{children}</div></main>`, `AdminNav` tab bar, `Sheet` host, colophon (`admin.staffOnlyNote`, `admin.permissionNote`). `metadata.robots = noindex`.
2. **`AdminMasthead`**: brand (`brand.name`, `admin.portal`), `.staff-badge`, `<AdminNav variant="top"/>`, controls: lang `অ` (link to other locale), theme `◐` (server action cookie), **`RoleChip`** (`SA`/`AD`/`MO`, `title = staff.role.chipTitle`, opens a small menu: `/admin/security`, sign out), back-to-site `↗` → `/`. No role switching.
3. **`AdminNav`**: `NAV_GROUPS` constant (Casework: queue/evidence/providers; Oversight: notifications/config) with counts from a server query bundle `adminNavCounts()` = `{queue: open cases, critical: open critical, evidence: items not published/removed, providers: pending submissions + claims + protected changes, notifications: unacked staff notifications}`; `.count.urgent` when `critical > 0`; `aria-current="page"` from the pathname; `.nav-sep` between groups; tab bar variant iterates the same groups (first word of the label, `.tab-dot`). Real `<Link>`s.
4. **`Crumbs`**: `admin.portal / <group label bn/en> / <b>item</b>`.
5. **`QueueView`** (`/admin/queue?lane=`): `a-head` H1, `PermissionCallout` (keep the prototype's callout but its text is real: show `admin.permission` + the actor's actual capabilities — reuse the keys, drop the demo sentence), `admin.threshold` note with the live threshold value (`{count}` param), `BulkToolbar`, three `Lane`s from `QueueVM` (skip empty lanes as the prototype does), `.p-side` aside with `<CaseTray/>` when a `[code]` is selected (route `/admin/queue/[code]` renders the same page with the tray populated; the case button is a `<Link aria-pressed>`).
6. **`CaseRow`**: checkbox `data-bulk-check` (client state in `QueueView` client wrapper), `.case` link with `.id`, `.age` (`admin.age` + hours via `formatNumber`), summary, flags: target kind badge, `admin.autoHidden`/`admin.stillVisible`, report count badge, `admin.coordinated` badge.
7. **`CaseTray`**: port `caseDetail` block by block: kicker + code, summary `h2`, note, appeal text callout (when `appeal`), reasons as `.tag`s (`report.<reason>`), coordinated callout, **permissions sub**: `.restricted` reporter box (`admin.reporterMasked` + `admin.reporterNote`) with **Reveal (audited)** button only when `actor.capabilities` includes `identity.reveal` → stepUp sheet → `revealReporter` → on success show `reporterRevealed.username` inline once (not persisted); for others the box has no button (the prototype showed nothing for non-SA — keep); evidence gate box when `target.kind === 'evidence'`: capability holders get **Reveal (audited)** → T-407's original-access route; others get **Request access** → `requestAccess` (logged) → `admin.done.requested`; **decision sub**: `ActionChips` from `allowedActions` (`.opt`, `aria-pressed`, `admin.act.<a>`), `admin.noRewrite` callout, reason textarea `mod-reason` (`admin.reasonToAuthor`), redaction editor appears only when `redact` is selected (textarea prefilled with the target excerpt; the server enforces subtractive); **audit preview** `.audit` block computed from real values (`case=`, `actor=<role>:<username>`, `action=`, `object=<kind>:<publicId>`, `result=pending|recorded`, `reason=<written above>`, `reporter_identity=not_accessed|accessed`, `original_evidence=not_accessed|accessed`); `AuditTimeline` (≤ 10 rows: relTime via `formatRelative`, `<b>action</b> · actor · code`, target public id); **`DecisionDock`**: `.dock` with `.note` "`admin.case` code · **action**" and `.btn.primary#mod-commit` (`admin.commit`) → `decide` action; disabled until an action and a reason (≥ 10 chars) exist; after success re-render with `admin.recorded` callout and the new timeline row; `announce(admin.recorded)`.
8. **Bulk**: `BulkToolbar` (`admin.bulk.toolbar`, select-critical, preview `(n)` disabled at 0), `BulkSheet` (title `admin.bulk.preview (n)`, list from `bulkPreview` result with skipped reasons, cancel/confirm → `bulkApply` → `admin.bulk.done` callout + `announce`), selection state client-side only.
9. **Route stubs** for evidence/providers/notifications/config (`<h1 class="display">` + `PermissionCallout`) so nav works end to end.
10. **Tests**: port the console harness checks that apply to the shell/queue (nav renders 5 items with counts; urgent class when a critical case exists; tab bar order matches groups; crumbs; selecting a case shows the tray; action chips filtered by role; commit disabled without reason; recorded state; bulk preview lists selected; reveal button absent for moderator); both locales.
11. `npx impeccable detect apps/web/src/components/admin --no-advisory` and `pnpm contrast` clean; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Guard | manual / e2e smoke | signed-out `/admin/queue` → `/admin/sign-in`; contributor account → `staff.notStaff` |
| Counts | component test with builders | nav shows live counts; urgent when a critical case is open |
| Tray parity | component test | every block of `caseDetail` present in order; reporter reads `admin.reporterMasked` for all roles |
| Record decision | manual as `mod_rashid` | storyboard step 19: timeline gains a row, author notified |
| Role filtering | component test | moderator sees no `remove/restrict/suspend/ban` chips; super_admin sees all |
| Bulk | manual | storyboard step 21 |
| Tab bar | Playwright at 360 px (T-503 later; here a component test on the `variant="tab"` render) | five tabs in group order |
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
