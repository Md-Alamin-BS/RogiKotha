# Patient-facing UI audit — Concept 04b (Quiet Clinic, minimal pass)

**Date:** 2026-09-06
**Audited artefact:** `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` (the publicly selected direction per FD-027)
**Scope:** Patient-facing UX only. Admin/staff surfaces and admin-only data are noted only where they bleed into patient journeys.

The prototype is a **read-only synthetic demo** (per STORY-PROT-001). Coverage here therefore means "is the surface visible and demonstrably correct in the demo", not "is the production wiring complete".

---

## 1. Coverage table

Rows below only include stories whose acceptance criteria describe something a patient can see or do in the running demo. Internal/admin stories (ADMIN-001/002, FOUND-001, OPS-001/002, PLAT-001/002, IDENT-001) are not patient-facing and are excluded except where the patient UI proves the contract.

| Story ID | Requirement (one line) | Status | Evidence |
|---|---|---|---|
| STORY-DIR-001 | Transparent doctor profile, provenance, registration not verified | ✅ | `app.js:429 renderProfile()`; `app.js:118 notVerified()`; `app.js:440-446` facts list with provenance badges; `styles.css:585-619` `.p-hero`, `.facts`, `.breakdown` |
| STORY-DIR-002 | Community submission, claim, duplicate merge | ⚠️ | Claim intent: `app.js:1514 openSheet(profile.claimThis)` opens a stub sheet. Submit-a-new-doctor form: `app.js:1043-1053` (`#add-doctor-panel`, `#ad-submit` → "pending" sheet). No duplicate-merge flow visible. |
| STORY-DIR-003 | Facility parent/branch model, branch-specific feedback, no score | ✅ | `data.js:855 facilities` (Shefa Health Group with Dhanmondi + Uttara branches); `app.js:883 renderFacility()`; sibling list `app.js:953-960`; non-scored criteria `app.js:914-923` |
| STORY-SRCH-001 | Unicode-safe unified search (Bangla/English/Banglish) | ✅ | `data.js:1271 resolveQuery()`; `app.js:225-233` search form; resolved note + "keep original" `app.js:310-320` |
| STORY-SRCH-002 | Neutral filters, ranking, result cards; "Why can't I sort by best?" | ✅ | Filter panel `app.js:350-354` + `filterFields()` `app.js:187-205`; sort `app.js:341-344`; "why" callout `app.js:346`; neutral ordering in `data.js:1288 search()` (no sentiment/engagement branch) |
| STORY-SRCH-003 | Provisional bilingual taxonomy, `Not sure` | ✅ | `data.js:644 conditions` with aliases incl. Banglish (`dayabetis`, `chulkani`); composer `Not sure` `app.js:1077-1078`; condition page provisional note `app.js:839` |
| STORY-REV-001 | Quick Review wizard, minimum fields, preview, autosave indicator | ✅ | `renderCompose()` `app.js:1006-1152`; preview `app.js:1145, 1188-1206`; saved flag `app.js:1138`; "save and finish later" `app.js:1593` |
| STORY-REV-002 | Detailed treatment timeline, reviewed vs later/alt, month/year only | ✅ | Chapters + spine `app.js:589-602`; later-care callout `app.js:604-606`; period is `{en,bn}` month/year in `data.js:657 reviews` |
| STORY-REV-003 | Drafts, follow-ups, corrections, tombstone, 30-day restore | ⚠️ | Follow-up spine shown `app.js:595-602`; mine drafts tab + 30-day note `app.js:1273-1288`. No tombstone, no version diff, no material-edit re-review visible. |
| STORY-REV-004 | Narrative sentiment + outcome summaries, no combined score | ✅ | `distBlock()` `app.js:130-151` (separate outline capsules + denominator); `outcomeBlock()` `app.js:157-172`; "Limited data" `app.js:149`; no combined score anywhere |
| STORY-EVID-001 | Quarantine-first upload + processing states | ✅ | `evFileHtml()` `app.js:1154-1169`; pipeline states `quarantine → checking → scanning → redact → processing → ready`; fail-closed demo at third file `app.js:1572-1575` |
| STORY-EVID-002 | Privacy preview/redaction canvas + processed viewer + provenance copy | ⚠️ | Canvas `buildRedactDoc()` `app.js:1208-1236`; "Documents attached — not medically validated" callout `app.js:693`; viewer opens button exists `app.js:687`. No zoom/pan/page/rotate/download viewer — only a "View processed copy" button. |
| STORY-EVID-003 | Custody, retention, holds, removal | ❌ | No 90-day copy in patient surfaces; no hold/remove flow visible. The 90-day note appears in account `account.evidenceOnly` `data.js:300` (text only). |
| STORY-COM-001 | Comments, flat replies, mentions, advice warning | ✅ | Thread `app.js:698-719`; mention rendering `app.js:701-703`; external link warning `app.js:713`; dangerous-instruction callout `app.js:711` (`k3` comment) |
| STORY-COM-002 | Like/dislike, idempotent, anonymous review linkage rule | ✅ | `reactBtn()` `app.js:664-668`; anonymous alias privacy via `accountsByAuthor()` `data.js:1419` returning `[]` for anon |
| STORY-MOD-001 | Report reasons + private reporter context + non-accusatory copy | ⚠️ | Report sheet `openReport()` `app.js:1439-1453` with reasons (privacy, threat, unsafeFile, dangerous, factual, spam, impersonation) and "your name is never shown" note. No five-distinct-account auto-hide demonstration in patient UI. |
| STORY-MOD-002 | Moderation queue + bounded actions + audit | ❌ | Not patient-facing (admin). Admin queue data exists in `data.js:1092 moderation.cases` but no admin route/render in `app.js` — the prototype only ships patient-facing views. |
| STORY-MOD-003 | Appeals, blocking | ⚠️ | Appeal entry from the "mine" tab `app.js:1321 open-appeal`; appeal sheet `app.js:1455-1466`. No blocking demonstration in patient UI. |
| STORY-NOTIF-001 | In-app + essential email notifications | ✅ | Mine tab "Notifications" `app.js:1292-1298`; sample set in `data.js:1073-1084` (evidence, discussion, moderation, security, draft) |
| STORY-USER-001 | Public profile + activity privacy, `noindex` | ✅ | Mine page `renderMine()` `app.js:1242-1323`; public contribution list `app.js:1254-1272`; `noindex` not set in `index.html` (line 2 only `lang="en"`) — **gap noted below**. |
| STORY-USER-002 | Dashboard, preferences, feedback, data requests | ⚠️ | Dashboard + drafts + bookmarks + notifications covered (`app.js:1242`). No language/privacy preferences screen (only the lang toggle in masthead), no feedback form, no export/delete UI. |
| STORY-PLAT-001 | Equal-language onboarding, persistent switch, disclaimer, policy links | ✅ | `#lang` toggle `app.js:36-39`; lang persisted `app.js:56`; "Patient-reported accounts. Not medical advice." `app.js:240`; long disclaimer `app.js:637, 1146`; about view `app.js:1371-1398` (5 sections) |
| STORY-PLAT-002 | Safe PWA, install, no sensitive cache | ❌ | No manifest in `index.html` (only stylesheet link); no service worker registration. Demo runs as static page. Out of scope for visual prototype but flagged here. |
| STORY-ONB-001 / NFR-004 | Mobile-first, no horizontal overflow, 44×44 targets | ✅ | Responsive rules `styles.css:1012-1042` (≤1040, ≤720); touch-target floor `styles.css:1061-1071` (44×44 on coarse pointers); `viewport-fit=cover` `index.html:5` |
| STORY-IDENT-001 | Per-review named/pseudonymous/anonymous, public isolation | ✅ | Composer identity radios `app.js:1099-1104`; anon note `app.js:1103`; account margin shows chosen mode `app.js:644-645`; anonymous alias isolated via `data.js:1419` |
| NFR-006/NFR-007 | Accessible, bilingual parity, keyboard | ✅ | Skip link `index.html:11`; lang attribute toggled `app.js:1347`; semantic landmarks (`header/main/footer`); focus ring `styles.css:168`; Bengali rules (e.g. `html[data-lang="bn"] body { font-family: var(--bangla); line-height: 2.0; }`) |

**Contradiction noted (planning docs):** `06-requirement-traceability-matrix.md` row FR-EVD-002 lists `STORY-EVID-002` as owning "Reviewed/later evidence groups". The patient UI does show all three groups (`reviewed/later/outcome` via `data.js:1353 EVIDENCE_GROUPS`) inside the composer and account detail, so that aspect is fine. However `08-product-backlog.md` STORY-EVID-002 description says "manual flattened redaction" must be flattened and immutable — the prototype's redact canvas stores masks in DOM but never demonstrates flatten, original-side-by-side, or download of processed PDF.

---

## 2. Missing or weak stories

- **STORY-EVID-003 (custody/retention/holds).** No 90-day countdown, no legal-hold copy in patient surfaces, no author-facing removal/tombstone. Only a textual note in `data.js:300`.
- **STORY-EVID-002 (processed viewer).** Privacy canvas + provenance copy are present, but the processed-viewer contract (zoom, pan, fullscreen, page navigation, rotation, processed-PDF download) reduces to a single "View processed copy" button — none of the controls are implemented.
- **STORY-MOD-002 (admin queue).** The moderation data set exists (`data.js:1092-1168`) but no `renderAdmin` route exists in `app.js` and no `#view-admin` section exists in `index.html`. Patient UI alone cannot prove the bounded-action contract.
- **STORY-USER-002 (preferences/feedback/data requests).** No language preference beyond the masthead toggle, no feedback form, no export/delete flow.
- **STORY-PROT-001 demo reset / demo state switch.** `EXPERIENCE.md` calls for a demo control that "switches concept, interface language, simulated role and state, and resets deterministic data." The masthead has language/theme/motion and a "back to gallery" link (`index.html:39`), but no in-app role simulation (reader/contributor/moderator/admin) and no explicit reset button. Story PROT-001's "demo explains that production requires confirmed email" line is achieved only by the demo banner — there is no simulated sign-in surface.
- **STORY-REV-003 (tombstone, material-edit re-review).** Edit/delete buttons in mine tab (`app.js:1266-1268`) are stubs; no tombstone state, no version history, no re-review gate.
- **STORY-MOD-001 (five-account auto-hide).** Report reasons and identity protection are shown; the threshold/coordinated-abuse demo state lives only in the moderation dataset, not in any patient view.
- **STORY-PLAT-002 (PWA).** No manifest, no install affordance, no offline shell — appropriate for a static demo but the story is not addressed.
- **CQ-04 (anonymity ambiguity).** The `IDENT-001` data-side fix in `accountsByAuthor` only blocks "other reviews by the same anonymous author" — it does not block the same author commenting elsewhere under a stable alias. The UI never surfaces this risk.

---

## 3. Stories the prototype has that the backlog doesn't

These elements are present in the prototype but do not trace to a backlog story. They are either implicit platform work, scoped UX decisions, or possible scope creep:

- **`#view-emergency`** (`app.js:1329-1365`, `styles.css:1359-1465`) — Bangladesh national hotlines (999/16263/09612-119911) plus a BMDC register card. Backlog has no dedicated emergency story; it appears as a copy requirement inside FR-ONB-001 / Discover screen only. The dedicated `#emergency` route and `.emerg-card` system go beyond what any single story mandates.
- **`#view-about`** (`app.js:1371-1398`, `styles.css:1414-1465`) — five-section methodology page (moderation, reviewer labels, privacy, limits, contact). Methodology copy exists in `aboutview.*` strings but no `STORY-ABOUT-001` story owns it; it is implicit in PLAT-001 but the depth here is wider than the contract.
- **Compare tray + sheet** (`app.js:404-414, 1413-1437`, `styles.css:536-582`) — up to three pinned doctors side-by-side with a "This is not a ranking" callout. Not directly traced; it sits across SRCH-002 but adds significant new UI.
- **Discover "From the latest accounts" rail** (`app.js:275-276, accountRow`) and **`discover.browse` condition tiles** (`app.js:249-253`) — additional editorial merchandising not specified in SRCH-001/002.
- **Condition page "Where this condition is treated"** (`app.js:792-806`, `styles.css:1467-1544`) — adds a hospital/area/city aggregate ("Usually seen by" tag pills, places list). Backlog mentions condition pages via DIR/REV but does not call out a "treated at" view.
- **In-text composition "Automatic checks" (PII / emergency / duplicate)** (`app.js:986-1004 safetyChecks()`, `app.js:1115-1128`) — automated safety-check UX is not owned by any story; it is implementation of FR-REV/FR-FILE as if the rule "eligible text publishes immediately" exists, but no `STORY-REV-005` or `STORY-COM-003` covers the checks.
- **Add-doctor inline form during compose** (`app.js:1042-1053`) — combined submit-and-publish flow. The plan splits this across DIR-001 and REV-001 but the inline composer pattern is its own implementation choice.
- **Redaction canvas with drawn masks** (`app.js:1208-1236`, `styles.css:843-849`) — pure UX pattern; no story calls for a click-and-drag mask.
- **Saved-state flag and draft recovery indicator** (`app.js:1138, 1593-1596`) — microcopy beyond what FR-REV-009 requires.
- **Five motion primitives (hero rise, stagger, capsule hover, tab underline, button press)** (`styles.css:1546-1674`) — fully invented motion language in the design file; no story owns it.
- **Mine → Appeal CTA inside the "My contributions" tab** (`app.js:1314-1322`) — surfaces the appeal flow inside the user's own dashboard, which is consistent with the spec but not explicitly drawn in any story.

---

## 4. Concrete next steps (5–10, prioritized by backlog rank)

1. **Wire `STORY-MOD-002` admin surfaces** — add `#view-admin` (route + render) with the moderation dataset already in `data.js`. Without it, patients cannot see what their report triggers, and founder sign-off on FD-009/017 has no UI proof. High-impact; unblocks CQ-08.
2. **Add a real evidence viewer** — replace the "View processed copy" stub with zoom/pan/fullscreen/page nav/rotation + processed-PDF download (`STORY-EVID-002`). Highest-value patient-facing gap because the viewer is part of every reviewed-treatment climax.
3. **Implement tombstone + edit/delete flows** (`STORY-REV-003`) — material-edit re-review gate, version history visible to the author, 30-day restore window with explicit countdown. Author deletion today is a stub button.
4. **Build the simulated contributor/role-switch and demo reset control** (`STORY-PROT-001`) — a masthead chip that toggles reader/contributor/moderator and a "reset demo" button. Required to demonstrate account-required contribution and the five-account auto-hide climax.
5. **Add the preferences + feedback + data-request panel** (`STORY-USER-002`) — language preference, feedback form, export/delete, settings history. Today the mine tab is the only private surface.
6. **Bring in the five-distinct-account auto-hide demo state** (`STORY-MOD-001`) — a forced demo state that temporarily hides a review and shows the threshold copy. The data is in `data.js`; only the patient UI needs to switch into it.
7. **Surface 90-day retention, hold, and removal in patient UI** (`STORY-EVID-003`) — author-facing retention countdown, tombstone copy, and a "this was held for legal preservation" panel.
8. **Add minimal sign-in / register screens in demo mode** (`STORY-AUTH-001`) — even if no real auth, a stub form that explains production requirements matches the founder decision FD-006 and the discover-screen promise.
9. **Add a PWA manifest + install affordance** (`STORY-PLAT-002`) — required for the `installable progressive enhancement` acceptance criterion and for mobile-only Bangladesh test users.
10. **Tighten the "noindex + no leakage" projection** (`STORY-USER-001`) — add `<meta name="robots" content="noindex">` to public profile/mine routes; verify reaction lists and mentions cannot cross-link anonymous aliases. The data-side rule exists but the UI does not visually prove it.

---

## Audit methodology

- Planning sources: `docs/planning/01-requirement-baseline.md`, `docs/planning/08-product-backlog.md`, `docs/planning/06-requirement-traceability-matrix.md`, `docs/planning/ux/DESIGN.md`, `docs/planning/ux/EXPERIENCE.md`.
- Prototype sources: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/{index.html, app.js, styles.css}` and `ui-design-prototype/shared/rogikotha-data.js` for the dataset.
- Read-only; no code changes.
- Coverage = visible patient-side behaviour, not production wiring.
