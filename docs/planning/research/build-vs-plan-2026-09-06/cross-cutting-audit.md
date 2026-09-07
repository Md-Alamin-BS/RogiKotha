# RogiKotha prototype — cross-cutting audit (2026‑09‑06)

**Scope.** Cross‑cutting concerns in `ui-design-prototype/` not owned by either app: routing/discoverability, localisation, accessibility, data layer, detector rules, and structural gaps.

**Sources read.** `ui-design-prototype/index.html`, `gallery.css`, `README.md`, `concepts/concept-04b-quiet-clinic-minimal/{index.html,styles.css,app.js}`, `admin/{index.html,styles.css,app.js}`, `shared/rogikotha-data.js`, `.impeccable/config.json`.

**Status.** Read‑only. All file paths and line numbers are verifiable in the working tree as of 2026‑09‑06.

---

## A. Routing / navigation gaps

**Finding.** The patient concepts (`03`, `04`, `04b`) are discoverable from the gallery, but the **admin console has no entry from anywhere inside the prototype**. It is reachable only by typing `ui-design-prototype/admin/` directly. The gallery footer (`index.html:170–178`) mentions three directions and archived variants but never alludes to the admin scope.

**Evidence.**

- `admin/index.html:16` brand link is `href="./index.html"` (self‑link into queue); the only control that returns elsewhere is `[data-i18n="admin.backToGallery"] href="../index.html"` (line 28) — but that link only exists *inside* admin, so it can never be the first hop in.
- Gallery cards (`index.html:73–136`) link only to the three concept folders. `04b/index.html:39` has a sibling `concept.back` button pointing only at `../../index.html`.
- 04b `VIEWS = ['discover','results','profile','account','condition','facility','compose','mine','emergency','about']` (`concept-04b-quiet-clinic-minimal/app.js:82`) and admin `VIEWS = ['queue','evidence','providers']` (`admin/app.js:86`) are routable only via in‑app tab buttons (`concept-04b/index.html:24–33`, `admin/index.html:35–39`). No surface publishes `#account`, `#condition`, `#evidence`, `#queue`, etc.

**Fix list.**

- **P0.** Add a "Staff console · demo" card or footer link on the gallery pointing at `admin/index.html`. The admin surface is explicit in STORY‑PROT‑002 but currently invisible.
- **P1.** Publish a one‑line routes index in the gallery (or README) listing `#discover`, `#profile`, `#account`, `#condition`, `#facility`, `#compose`, `#mine`, `#emergency`, `#about`, `#queue`, `#evidence`, `#providers` so reviewers can deep‑link.
- **P2.** Promote `About` and `Emergency` from footer to a discoverable "More" menu in the 04b header.

---

## B. Localisation (Bengali) gaps

**Finding.** Localisation coverage is mostly strong — every key in the shared strings table (`shared/rogikotha-data.js:35–526+`) has both `en` and `bn` siblings, `RK.applyLang` sets `document.documentElement.lang` correctly (`:1346–1348`), and 04b and admin both switch `font-family` for `html[data-lang="bn"]` to a `--bangla` stack. Two real concerns remain.

**Evidence.**

1. **Gallery is English‑only and undocumented as such.** `index.html` has no `T(...)` calls and no `data-i18n`. Hero copy (`:18–27`), the card indices `03 · the merge / 04 / 04b · minimal pass` (`:81, 105, 126`), and the "How to compare them" list (`:155–161`) are English only. There is no language switch control. Defensible if the gallery is intentionally static, but this is not stated.
2. **No Bengali webfont; Bengali first‑paint is announced as English.**
   - `concept-04b-quiet-clinic-minimal/styles.css:1095` defines `--serif: ui-rounded, 'SF Pro Rounded', 'Segoe UI Variable Text', 'Segoe UI', system-ui, -apple-system, sans-serif;` and a `--bangla` stack (`'Noto Sans Bengali', 'Nirmala UI', 'Shonar Bangla', 'Kalpurush', 'SolaimanLipi'`). `admin/styles.css:60–62` mirrors this.
   - **No `@font-face` declaration exists** in any of the three stylesheets (full‑file grep returns zero). On a non‑Apple, non‑Bangla‑OS device Bengali falls through to `system-ui` and may not have Bengali shapes. `.impeccable/config.json:24–32` and `README.md:118–122` acknowledge this as a design rule ("no webfont, no network request").
   - **Static HTML hard‑codes `lang="en"`.** Both `concept-04b-quiet-clinic-minimal/index.html:2` and `admin/index.html:2` set `<html lang="en" data-lang="en">`. Until `RK.applyLang` runs after page load, screen readers announce Bengali text as English.

**Fix list.**

- **P0.** In both apps, set the initial `<html lang>` from a sync read of `localStorage` in a tiny inline script before `<body>`. Otherwise the first paint is announced as English for Bengali defaulters.
- **P1.** Either add a language switch to the gallery or document `index.html` as a one‑locale doc explicitly in `README.md`.
- **P2.** Document per‑OS Bengali font expectations (Android ships `Noto Sans Bengali`; iOS `Bangla Sangam MN`; Windows `Nirmala UI`/`Vrinda`/`Shonar Bangla`) so reviewers know which devices render Bengali as designed vs. fallback.

---

## C. Accessibility gaps

**Finding.** The two i18n shells are consistent on basic primitives. A few semantic‑heading and live‑region gaps remain.

**Evidence.**

**Already in good shape:**

- Skip link `href="#main"` with focus reveal: `concept-04b-quiet-clinic-minimal/styles.css:166` and `admin/styles.css:152`.
- `aria-pressed` on every toggle button: `concept-04b-quiet-clinic-minimal/app.js:54` (`#lang`), `:72` (`#motion`), `:334/335` (results tabs), `:474` (condition pills), `:1029/1031` (compose mode), `:1529` (report reasons). Admin wires `aria-pressed` per tab (`admin/app.js:94`).
- `aria-current="page"` on the active nav tab: `concept-04b-quiet-clinic-minimal/app.js:98–99`.
- Theme toggle sets `aria-pressed` to the *currently visible* effective state — not just the user's stored pick (`admin/app.js:70, 372–374`). This is the convention the recent admin UX research recommended.

**Gaps actually present:**

1. **No `aria-live` region for dynamic content in either app.** Queue updates after picking a case (`admin/app.js:334`), compare tray add/remove (04b `:411`), and lang/theme applications re‑render `innerHTML` with no polite/assertive announcement. Zero `aria-live`/`role="status"` in any HTML or app file.
2. **Theme button has no initial `aria-pressed`.** The static markup `<button type="button" id="theme" …><span>◐</span></button>` (`concept-04b-quiet-clinic-minimal/index.html:37`, `admin/index.html:27`) has no `aria-pressed` until JS sets it after `init()`. Between first paint and JS ready, the attribute is `undefined` — minor SR regression.
3. **Admin case‑detail skips H3.** `caseDetail()` (`admin/app.js:164–215`) renders an outer `<h1 class="display">` (`:125`), an `<h2>` for the case heading (`:168`), and then `class="sub-head"` rendered as `<h4>` (`:201`). There is no `<h3>` between H2 and H4; outline is shallow but uneven.

**Fix list.**

- **P0.** Add a `<div id="sr-live" class="sr-only" aria-live="polite" role="status"></div>` to both shells; announce view/lang/theme changes after each `route()` and toggle.
- **P1.** Set `aria-pressed` on the `#theme` button at markup time based on the persisted preference, or omit the attribute and let JS set it before the button can receive focus.
- **P2.** Normalise admin sub‑panel headings to H3.

---

## D. Data layer gaps

**Finding.** Every `RK.*` selector referenced by either app maps cleanly to the exported `global.RK` surface (`shared/rogikotha-data.js:1472–1522`). One real bug surfaces and one structural gap.

**Evidence.**

- All 04b `RK.*` references (`app.js:32, 33, 53, 123, 154, 158, 163, 189–192, 214–215, 234, 258–263, 276, 280–282, 307–308, 364–366, 380, 385–386, 400, 409, 421, 425, 432–438, 451, 491, 503, 538, 556, 558–565, 671, 676, 722, 737–743, 778, 852, 867, 886–890, 916–919, 935, 948, 957, 995–998, 1039, 1082, 1089, 1096, 1101, 1191, 1245, 1256–1261, 1291, 1303, 1305, 1317, 1332, 1361–1362, 1419–1428`) map to keys present in `global.RK`.
- Admin `RK.*` references (`admin/app.js:30, 31, 52, 135, 140, 233, 258, 268, 294, 311, 363`) likewise.
- **Dead guard · `RK.evidenceFor ?`** at `concept-04b-quiet-clinic-minimal/app.js:123` — `evidenceFor` is always defined, so the ternary always takes the truthy branch. Looks like a legacy fork; harmless but misleading.
- **`T(k, lang)` returns the key silently** when the string is missing (definition around `shared/rogikotha-data.js:1280–1340`). Concrete dynamic‑key call sites in `admin/app.js`:151 (`T('target.' + c.targetKind)`), :175 (`T('report.' + r)`), :193 (`T('admin.act.' + a)`), :237–240 (`T('ev.state.' + q.state)`), :243 (`T('admin.pl.' + s)`). If a moderation case is added with an unknown `targetKind`, the queue card renders the literal `target.<unknown>`. Acceptable for a prototype; not acceptable for production.
- **Duplicate conditionById** is exposed twice — once internally around `shared/rogikotha-data.js:1207` and once as an inline arrow in `global.RK` at `:1515`. Drift risk.
- **Gallery is decoupled from `RK`.** `index.html` does not load `shared/rogikotha-data.js`, so gallery copy drift is undetectable.

**Fix list.**

- **P1.** Inside `t()` add `if (!strings[k]) { console.warn('missing i18n key:', k); }` so future typos surface in DevTools.
- **P2.** Either delete the dead `RK.evidenceFor ?` guard at `app.js:123` or annotate it as legacy.

---

## E. Detector / quality gates

**Finding.** `.impeccable/config.json` carries six global `ignoreRules`, one gallery `ignoreFiles`, and three `ignoreValues`. The two `inter` lookups are honest acknowledgements; the blanket `low-contrast *` for the admin folder is a category‑level mute.

**Evidence.**

- `.impeccable/config.json:3–10` lists six ignored detectors: `radial-halo`, `dark-glow`, `repeating-stripes-gradient`, `gpt-thin-border-wide-shadow`, `layout-transition`, `clipped-overflow-container`. None of these surface in any source file I read; they read as global noise filters.
- `.impeccable/config.json:11–13` ignores the gallery `index.html` entirely. Reasonable for a static doc.
- `.impeccable/config.json:14–23` `overused-font: inter` for `concept-04b-quiet-clinic-minimal/**` — references the real declaration at `styles.css:1096`. Honest.
- `:24–32` same rule for `admin/**` — references `styles.css:61`. Honest.
- `:33–42` **blanket `low-contrast: *` for `admin/**`**. The reason ("manually verified") is hand‑waving at the file level, not the selector level. If a future visual addition slips below AA, the detector will not catch it. This is the only mute that hides a real category of regression.

**Fix list.**

- **P0.** Narrow the `low-contrast *` ignore on `admin/**` to specific token pairs (e.g. `--accent-2 on --accent-soft`, both modes), and add an `expiresAt`.
- **P1.** Annotate the six global `ignoreRules` with one‑line reasons each.

---

## F. What's missing structurally

**Finding.** A no‑build static prototype is acceptable for Gate 4, but a few structural items bite a reviewer the first time they try to use the prototype.

**Evidence.**

- **README drift.** `ui-design-prototype/README.md:22–33` describes only directions `03` and `04`. 04b — the chosen implementation direction per FD‑027 (`index.html:23–26`) — is never mentioned. The admin console is never mentioned either.
- **No tests.** Acceptable for a prototype; flagged for completeness.
- **Hash routes are undocumented.** `concept-04b-quiet-clinic-minimal/app.js:82` declares 10 view names; `admin/app.js:86` declares 3. Neither list is published in any HTML/README surface, so reviewers cannot deep‑link to e.g. `#account` or `#evidence`.
- **No dead routes.** Both 04b's `#emergency` (`:1330`) and `#about` (`:1372`) render real content. No route returns an empty view.
- **Gallery is English‑only** by markup (see §B) — fine if documented, undocumented currently.

**Fix list.**

- **P0.** Update `ui-design-prototype/README.md` to enumerate `03`, `04`, **and `04b`** with a note that 04b supersedes 04 per FD‑027. Add an admin section.
- **P1.** Add a routes index to the gallery or README listing all 10 patient hashes plus 3 admin hashes.
- **P2.** Optional `package.json` with `npm start` running a local server so the README's command is reproducible.

---

## Cross‑cutting priorities, ranked

1. **P0 — Hidden admin console.** Zero in‑prototype entry to `ui-design-prototype/admin/index.html`. Add a gallery card or footer link.
2. **P0 — Bengali first‑paint `lang`.** Static `<html lang="en">` is set on both apps; until `RK.applyLang` runs, SR users get English‑announced Bengali. Inline script fix.
3. **P0 — Narrow the blanket `low-contrast *` ignore on `admin/**`.** Other ignores are narrow and honest; this one mutes a whole class of regression.
4. **P1 — `aria-live` for dynamic regions.** A single `<div role="status">` per shell, paired with announcements on route/lang/theme change, covers the entire gap.
5. **P1 — README drift + routes index.** README mentions two directions; the prototype ships three. A half‑screen routes block helps reviewers discover deep links.
