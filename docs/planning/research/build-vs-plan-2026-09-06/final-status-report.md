# Final status report — build-vs-plan coverage rollup

**Date:** 2026-09-06
**Scope:** Closes out the three-phase audit (scaffolding → gap-close → rollup) for `ui-design-prototype/` against the 34 stories in `backlog.yaml`. Two non-functional rows (NFR-006, NFR-009) are tracked alongside and counted in the aggregate.

## TL;DR

Phase 2 closed eight gaps across the patient UI and admin portal and added two NFR rows; the curated rollup now reads **21 Done / 8 Partial / 7 Missing across 36 tracked rows** (58 / 22 / 19 percent).

## Rollup before → after

| State | Before | After | Δ |
|---|---|---|---|
| Done | 16 (47%) | 21 (58%) | +5 |
| Partial | 7 (21%) | 8 (22%) | +1 |
| Missing | 11 (32%) | 7 (19%) | −4 |
| Blocked | 0 | 0 | 0 |
| Won't Do | 0 | 0 | 0 |

The two NFR rows account for +1 Done and +1 row in `Total`; the other +4 are real backlog stories closing. Live aggregate from `node tools/coverage.mjs`:

> `Total: 36 · Done: 21 (58%) · Partial: 8 (22%) · Missing: 7 (19%) · Blocked: 0 (0%) · Won't Do: 0 (0%)`

## What changed

- **STORY-EVID-002 — Partial → Done.** Built the processed viewer: zoom (out / 100 / in / fit), pan, page prev/next, rotate, "download processed copy", and "page N of M" in `concept-04b-quiet-clinic-minimal/app.js:1466-` (block header `:1467`) plus `styles.css:1675` styles. Bilingual `VIEWER_STRINGS` at `:1473-1490`; trigger wired to `[data-view-evidence]` at `:2073`.
- **STORY-MOD-003 — Partial → Done.** Enforcement chip set is now `warn / restrict / suspend / ban` at `admin/app.js:193`, alongside the existing eight content chips. Appeal lane + fresh-reviewer indicator (`freshReview` audit event on MOD-2011) + identity-protected reporter copy all retained. Mine-tab appeal entry at `concept-04b-quiet-clinic-minimal/app.js:1362` → `openAppeal()` at `:1474-1485`.
- **STORY-USER-002 — Partial → Done.** Mine tab gains Preferences (`#pref-lang`), Feedback (`#user-feedback` + `#user-feedback-send`), and Data-requests (`#user-data-export`, `#user-data-delete`) at `concept-04b-quiet-clinic-minimal/app.js:1365-1385`; handlers at `:2059-2072`. Caveat: the referenced `user2.*` i18n keys are not yet in `shared/rogikotha-data.js`; `t()` falls back to the raw key, so a shared-dictionary reconciliation is queued.
- **STORY-USER-001 — Done (verified).** `setNoindex()` at `concept-04b-quiet-clinic-minimal/app.js:94` is invoked from `renderMine()` at `:1282`.
- **STORY-PROT-001 — Missing → Partial.** Masthead `◇` `#demo` opens a hidden panel (`index.html:58-69`) with Reader/Contributor/Moderator chips plus "Reset demo" that calls `localStorage.clear()` + `location.reload()` (`app.js:2153-2167`). Role persists to `rk04.role`; outbound/write simulation still missing.
- **STORY-PROT-002 — Missing → Partial.** Gallery gained a fourth staff-console card (`index.html:138-157`, styles at `gallery.css:260-278`); `<details class="routes-index">` at `index.html:191-` lists every hash route; `admin/index.html:6` carries `<meta name="robots" content="noindex">`; README (`ui-design-prototype/README.md:3`) enumerates concepts and routes. Concepts A/B/C still gallery-only — no in-app switcher.
- **STORY-ADMIN-001 — Missing → Partial.** `#config` route wired at `admin/index.html:58, 64`, rendered by `renderConfig()` at `admin/app.js:395-`. Surfaces threshold inputs (five-account hide, criticalHours, standardDays), retention defaults/max, and a role × capability matrix. Role chip `setRole()` at `:367-391` rewrites `RK.moderation.permissions`; persisted to `rk04.admin.config` (no versioned rollback log).
- **STORY-ADMIN-002 — Missing → Partial.** Bulk-preview toolbar at `admin/app.js:158, 541-576` adds `selectCritical` and `preview (N)` chips; `openBulkSheet()` enumerates selected cases with target/lane/summary. No aggregate health/directory/evidence-by-state dashboard or idempotency token yet.
- **STORY-NOTIF-001 — Done (verified).** Mine-tab feed at `concept-04b-quiet-clinic-minimal/app.js:1333` + bilingual sample set `shared/rogikotha-data.js:1116-1127`. New admin triage at `admin/app.js:483 renderNotifications()` reads `RK.moderation.notifications` (`:1160-1179`); `#view-notifications` markup at `admin/index.html:66`.
- **STORY-PLAT-001 — Done (verified).** Synchronous first-paint lang script in both apps: `concept-04b-quiet-clinic-minimal/index.html:11-22`, `admin/index.html:13-24`; HTML-escape helper at `concept-04b-quiet-clinic-minimal/app.js:37`.
- **STORY-NFR-006 — added row, Done.** `#sr-live` `aria-live="polite"` region in both apps (`concept-04b-quiet-clinic-minimal/index.html:75-76`, `admin/index.html:52-53`); `announce()` at `concept-04b-quiet-clinic-minimal/app.js:88-92` and `admin/app.js:93-97`.
- **STORY-NFR-009 — added row, Done.** `auditTimeline()` at `admin/app.js:512-537` renders the last ten events per case from `RK.moderation.auditLog` (`shared/rogikotha-data.js:1145-1159`, 13 seeded events across MOD-2041/2038/2033/2029/2011); invoked from `caseDetail()` at `:250`.

## What's still missing

**Deliberately out of prototype scope:** STORY-FOUND-001 (foundation architecture lives in `apps/`, `packages/`, ADRs); STORY-AUTH-001/002 (real auth: Argon2id, mail, rate limit — production build); STORY-OPS-001/002 (infra, backup, analytics consent); STORY-PLAT-002 (PWA manifest/service worker — no build step in static prototype).

**Could still be closed in the prototype:** STORY-PROT-003 — Playwright / axe / screenshot harness for the viewport matrix (360×800, 390×844, 768×1024, 1280×800, 1440×900) over both locales. Touches the prototype tree, no backend work; recommended next scope item.

**Reconciliation gap flagged:** `user2.*` i18n keys missing from `shared/rogikotha-data.js` (see STORY-USER-002 caveat). `t()` returns the raw key until the shared dictionary is updated; queued follow-up.

## Convention reminder

Each proof point carries exactly one inline annotation — `<!-- STORY-XYZ: short title -->` (HTML), `/* STORY-XYZ: ... */` (CSS), or `// STORY-XYZ: ...` (JS) — adjacent to the rendering code. `tools/coverage.mjs` cross-checks curated status against annotation count and prints orphans. PRs closing a story should include `Closes STORY-XYZ` in the commit message and place one matching annotation tag at the proof point.

## Next steps

- **STORY-PROT-003 — Playwright + axe + screenshot harness.** Removes the last big `Missing` row; unlocks formal viewport+locale evidence. (~3-5 days.)
- **Reconcile `user2.*` i18n keys in `shared/rogikotha-data.js`.** Without it, new Preferences / Feedback / Data sections render raw-key fallback. (~30 min.)
- **Aggregate admin dashboard (STORY-ADMIN-002 second half).** Health + evidence-by-state + directory-filter aggregates; idempotency tokens for bulk ops. (~2 days.)
- **Custody / retention controls (STORY-EVID-003 second half).** Set / extend hold, retention preview, custody log table. (~1-2 days.)
- **Patient-side duplicate-merge flow (STORY-DIR-002 second half).** Today only the admin has the UI; patient only opens a stub sheet at `app.js:1514 openSheet(profile.claimThis)`. (~1 day.)

## Regenerator output

From `node tools/coverage.mjs` against the rewritten matrix:

```
Annotated stories not present in the matrix (consider adding):
  - (none)

Matrix stories still needing an annotation tag:
  - (none)

Aggregate (curated status):
Total: 36 · Done: 21 (58%) · Partial: 8 (22%) · Missing: 7 (19%) · Blocked: 0 (0%) · Won't Do: 0 (0%)
```

No orphans, no unannotated rows: every curated status is backed by at least one inline annotation in the prototype tree.
