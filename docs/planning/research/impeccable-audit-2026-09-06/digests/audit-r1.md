# Audit digest — Concept 04b (Quiet Clinic minimal pass)

Date: 2026-09-06
Tool: `npx impeccable detect … --json --no-advisory`
Method: detector + manual verification of contrast (HSL→RGB luminance), touch targets (CSS), JS execution paths (app.js reading), FD-027 brief satisfaction (file:line diff against Concept 04).

## Detector pass

Both viewports exit 0, zero findings. The detector validates: low-contrast text, dark-glow shadows, radial-halos, undersized UI text, cramped padding, clipped overflow, layout transitions, overused fonts. All clean.

## Accessibility — 3 / 4

**Contrast (manual HSL→RGB):** All text and UI in the concept-04b override block (styles.css:1021–1131) clears WCAG AA in both themes:
- Light: `--ink` (200 14% 14%) on `--bg` (40 14% 98%) ≈ 13.5:1; `--ink-soft` ≈ 9.5:1; `--ink-faint` ≈ 6.0:1.
- Dark: `--ink` (40 14% 94%) on `--bg` (200 14% 8%) ≈ 13:1; `--ink-soft` ≈ 9.0:1; `--ink-faint` ≈ 5.5:1.
- Accent vs bg in both themes ≥ 6.2:1.
- Status pills (positive/mixed/negative) all ≥ 5.2:1.
- One soft fail: dark `--warn-line` on `--warn-bg` ≈ 1.5:1, used only for dashed borders paired with icon+colour+text. Non-blocking.
- `--rule-hard` at 16% alpha on bg ≈ 1.8:1, used only as decorative separators, never as sole state indicator.

**Motion sensitivity:** styles.css:994–1002 kills animations to 1ms under `prefers-reduced-motion` and `body[data-motion="off"]`; state changes (`:hover`, `aria-pressed`, `:focus`) still occur. `progress` bar restored to 100% width in motion-off — scroll state preserved. ✓

**ARIA / roles / keyboard:** Skip link at index.html:26 targeting `#main`; `<nav aria-label="Screens">` at index.html:39; `role="dialog" aria-modal="true" aria-labelledby="sheet-title"` at index.html:85. All tab buttons set `aria-pressed` (multiple app.js sites, e.g. 482, 539, 598); tabs set `aria-current="page"` at app.js:163. Focus ring `2px solid var(--accent)` with 3px offset at styles.css:164, clears 3:1.

**Semantic HTML / forms:** `<header>`, `<main>`, `<nav>`, `<footer>` landmarks present; heading hierarchy correct per view; composer inputs all have explicit `<label for>` (app.js:1014, 1038, 1046–1049, 1061); search/textarea use `sr-only` labels (app.js:291, 680).

**Bengali localization:** `app.js:41–45 bn()` rewrites digits; `setLang` flips `html[data-lang]` and persists to localStorage; dates via `P(r.period)` data-driven bn/en.

**P2 — Touch targets:** `.ctl` 36×36 (styles.css:214), `.sheet-close` 32×32 (561), pills/tags 26–31px tall. Below WCAG 2.5.5 (44×44).

**P3 — Dark `--warn-line` on `--warn-bg`** ≈ 1.5:1; mitigated by icon+colour+text.

## Performance — 3 / 4

**Detector at desktop + mobile:** 0 findings.

**Animations:** No `animation: infinite` anywhere. All animations single-pass with `both`. Verified across styles.css:226, 234, 376, 389, 461, 531, 556, 1259, 1268–69, 1276.

**`will-change`:** Not used anywhere. Correct call for a single-pass animation set.

**Scroll-driven animations:** `@supports (animation-timeline: scroll())` guards modern path; static fallback elsewhere (styles.css:225–228, 459–464). Good.

**P1 — RAF loop on opacity-0 canvas.** `Field.start()` at app.js:97–106 runs unconditionally on init, attaches a `requestAnimationFrame` loop drawing 70 particles per frame to a `#field` canvas that is `--field-opacity: 0` in 04b (styles.css:1064, 1100, 1129). Browser still composites the offscreen layer. Wasted paint for the page lifetime. Fix: gate `Field.start()` on a data-attribute 04b sets to off, or remove the Field IIFE and its `setMotion` consumer at app.js:140.

**P3 — `transition: width` on `.ev-bar i`** at styles.css:843 — single element at a time, fine.

## Responsive — 3 / 4

**Detector at 390×844:** 0 findings. No horizontal overflow in `.brief`, `.how-to`, `.opener-grid`, `.p-grid`, `.a-grid`, `.c-grid`, `.results-body`, `.filters`.

**Fixed widths:** None on layout containers. `clamp()` and `max-width: 1300px` everywhere.

**Breakpoints:** Three functional breakpoints in concept CSS:
- styles.css:970 `(max-width: 1040px)` — multi-column grids → 1fr; sticky filter/side panels → static; doc-entry avatar 58px.
- styles.css:979 `(max-width: 720px)` — masthead reflow, tabs scroll-x, profile hero shrinks.
- styles.css:1234 `(max-width: 720px)` — capsules min-width 88px, font 19px.
Plus `prefers-color-scheme: dark` × 2 and `prefers-reduced-motion: reduce` × 1.

**P0 — Touch targets under 44×44.** Header controls (.ctl), tabs (.tabs a), chips (.chip), pills (.pillrow button), opts (.opt) all 26–36px tall. WCAG 2.5.5 violation. Affects every screen on mobile.

**P2 — Body font-size in px** at styles.css:1133 (15.5px). Reduces 18px-root user preference fidelity. Convert to rem.

**P3 — `.case` and `.compare-col` rely on border colour alone** for state changes. Add icon or text reinforcement.

## Theming — 3 / 4

**Detector:** 0 findings.

**Hard-coded colour violations:**
- app.js:87–91 constructs HSL strings per particle — `hues` are Concept 04's `--hue-a/b/c` (coral/clay/sage). Canvas invisible in 04b; if ever re-enabled, would clash with teal-gray palette. Fix the hues to neutral grays if Field ever comes back.
- styles.css:832 `.redact-canvas .mask { background: #111 }` — un-tokened; acceptable for redaction ink (pure black is correct semantically).
- styles.css:1154 overlay scrim `hsl(200 30% 6% / .42)` — un-tokened; minor.

**Dark mode:** `:root:not([data-theme="light"])` correctly gates the `prefers-color-scheme` block (styles.css:78, 1069). `[data-theme="dark"]` blocks at 115–143 and 1105–1131 are byte-identical duplicates of the dark block — maintenance hazard (P3).

**Bengali toggle:** `app.js:1529` flips `data-theme` correctly; `app.js:118–125` flips `html[data-lang]` and persists to localStorage. Fonts, line-height, numerals, font-feature-settings all applied per-script at styles.css:1134, 1186, 1189, 1196.

**P2 — Brand-mark palette drift.** styles.css:185–191 `.brand-mark` uses `var(--hue-a)`/`var(--hue-b)` which 04b never overrides (line 1021+). Logo silently renders in Concept 04's coral-clay on a paper background. Override `--hue-a: 190; --hue-b: 200;` in the 04b `:root` block.

## Implementation Integrity — 4 / 4

**Detector:** 0 findings.

**FD-027 brief verification:**

| FD-027 promise | 04 status | 04b status |
|---|---|---|
| Paper instead of oat | `hsl(36 40% 96%)` | `hsl(40 14% 98%)` ✓ |
| Teal-gray instead of teal | `hsl(14 64% 42%)` | `hsl(190 22% 32%)` ✓ |
| Hairline rules | 0.14 / 0.34 alpha | 0.07 / 0.16 alpha ✓ |
| Smaller radii | 8/14/22 | 10/16/22 — bumped UP ✗ |
| No veil | gradient veil | `display: none` ✓ |
| No panel shadow | 18px-blur soft shadow | 1px hairline ✓ |
| No field | animated | CSS-zeroed, JS still alive ⚠ |
| No linework | SVG + tilt dot | `display: none` ✓ |
| Bengali preserved | full | preserved ✓ |

**Structural drift:** None — eight views map to FD-026 product surfaces; BMDC verification, conditions, evidence pipeline, separate-capsule distributions, reviewer-label claim system, `+8801` emergency regex, Bengali digit substitution. Product-specific, not template-shaped.

**Dead DOM:** index.html:11–23 keeps `<svg class="linework">` and `<div class="veil">` "for parity" with Concept 04. Both are `display: none` in 04b CSS — pure overhead. Remove.

## Severity summary

| Sev | Count | Where |
|---|---|---|
| P0 | 1 | Touch targets < 44×44 — every header control, tab, chip, pill, opt |
| P1 | 1 | RAF loop on opacity-0 canvas (app.js:97–106) |
| P2 | 3 | Body font in px; brand-mark palette drift; dark `--warn-line` low contrast |
| P3 | 3 | Un-tokened redact mask + overlay scrim; dark-mode block duplication; dead DOM parity elements; `.ev-bar i` transition width |

## FD-027 satisfaction score

7 / 9 explicit promises honoured. 2 deviations:
1. **Radii larger than Concept 04** — likely deliberate (rounder-but-quieter), worth confirming.
2. **Particle field canvas JS-alive** — pure waste, should be removed.
