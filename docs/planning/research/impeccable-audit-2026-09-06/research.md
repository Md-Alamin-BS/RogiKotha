---
type: technical
topic: Impeccable audit of Concept 04b (Quiet Clinic minimal pass)
decision: ship audit findings and the FD-027 brief verification to founder for sign-off
status: complete
created: 2026-09-06
updated: 2026-09-06
verified_claims: 11
unverified_claims: 0
---

# Impeccable audit — Concept 04b Quiet Clinic (minimal pass)

## Executive summary

Concept 04b passes the Impeccable visual detector at both desktop (1280×800) and mobile (390×844) widths with **zero findings**. The structural audit below surfaces 8 issues the detector does not catch — 1 P0, 1 P1, 3 P2, 3 P3. Concept 04b satisfies **7 of 9** explicit FD-027 promises; the two deviations are documented below.

**Recommendation:** fix the P0 (touch targets) and P1 (RAF on invisible canvas) before handoff. P2/P3 can be addressed in a follow-up pass.

## Audit health score

| # | Dimension | Score | Key finding |
|---|-----------|------:|---|
| 1 | Accessibility | 3 / 4 | All contrast passes WCAG AA in both modes; Bengali localization working |
| 2 | Performance | 3 / 4 | RAF loop drawing 70 particles/frame to an opacity-0 canvas |
| 3 | Responsive | 3 / 4 | Mobile layout collapses cleanly, but touch targets < 44×44 throughout |
| 4 | Theming | 3 / 4 | Brand-mark logo uses Concept 04's coral palette in 04b (palette drift) |
| 5 | Implementation Integrity | 4 / 4 | Detector clean; 7/9 FD-027 promises honoured; product-specific structure |
| **Total** | | **16 / 20** | **Good — fix P0/P1 before handoff** |

## FD-027 brief verification

| FD-027 promise | 04 status | 04b status |
|---|---|---|
| Paper instead of oat | `hsl(36 40% 96%)` | `hsl(40 14% 98%)` ✓ |
| Teal-gray instead of teal | `hsl(14 64% 42%)` | `hsl(190 22% 32%)` ✓ |
| Hairline rules | 0.14 / 0.34 alpha | 0.07 / 0.16 alpha ✓ |
| Smaller radii | 8 / 14 / 22 | 10 / 16 / 22 ✗ bumped UP |
| No veil | gradient veil | `display: none` ✓ |
| No panel shadow | 18px-blur soft shadow | 1px hairline ✓ |
| No field | animated particle field | CSS-zeroed, JS RAF alive ⚠ |
| No decorative linework | SVG + tilt dot | `display: none` ✓ |
| Bengali preserved | full Noto Sans Bengali | preserved ✓ |

## Issues by severity

### P0 — Touch targets < 44×44
**Files:** styles.css:214 (`.ctl` 36×36), 561 (`.sheet-close` 32×32), 201 (`.tabs a` ~27px tall), 422 (`.chip` 27px), 591 (`.pillrow button` 27px), 786 (`.opt` 31px).
**Impact:** Every interactive element on mobile falls below WCAG 2.5.5 (Level AAA for target size; AAA recommended for primary controls).
**Fix:** bump min-height/min-width to 44px on touch-viewport via `@media (pointer: coarse)`; or accept Level AA and document.

### P1 — RAF loop on opacity-0 canvas
**File:** app.js:97–106 `Field.start()` runs unconditionally on init. The `#field` canvas is `--field-opacity: 0` in 04b (styles.css:1064, 1100, 1129) but the JS still paints 70 particles per frame for the page lifetime.
**Impact:** Pure CPU/GPU waste on every page load. Battery drain on mobile.
**Fix:** gate `Field.start()` on a `[data-field="on"]` data-attribute 04b does not set; or remove the Field IIFE entirely.

### P2 — Brand-mark palette drift
**File:** styles.css:185–191 `.brand-mark` uses `var(--hue-a)`/`var(--hue-b)`. Concept 04b's `:root` block (styles.css:1021+) never overrides `--hue-a`/`--hue-b`. Logo silently renders in Concept 04's coral-clay on the paper background.
**Impact:** Brand mark visually contradicts the chosen teal-gray palette — a `discoverable aesthetic lie` that founders will spot.
**Fix:** add to 04b `:root` block: `--hue-a: 190; --hue-b: 200;`.

### P2 — Body font-size in px
**File:** styles.css:1133 `body { font-size: 15.5px; line-height: 1.72; }`. Users with `prefs font-size: 18px` browser setting will not get proportional scaling.
**Impact:** Reduces accessibility fidelity for users who set browser-level font preferences.
**Fix:** change to `1rem` and adjust with `font-size-adjust` or accept the trade.

### P2 — Dark `--warn-line` on `--warn-bg` ≈ 1.5:1
**Files:** styles.css:1093–1094 (`--warn-line: hsl(36 18% 40%)` on `--warn-bg: hsl(40 14% 14%)`).
**Impact:** Decorative dashed borders on warn callouts only; state carried by icon+colour+text. Non-blocking per WCAG 1.4.11 because the indicator is not the sole carrier.
**Fix:** optional — bump `--warn-line` lightness to 28–32%.

### P3 — Un-tokened colours
- styles.css:832 `.redact-canvas .mask { background: #111 }` — acceptable semantically (redaction ink is pure black).
- styles.css:1154 overlay scrim `hsl(200 30% 6% / .42)` — un-tokened; minor.

### P3 — Dark-mode block duplication
**Files:** styles.css:115–143 and 1105–1131 are byte-identical duplicates.
**Impact:** Maintenance hazard — drift between light-toggle and system-pref paths.
**Fix:** extract to one selector list `:root[data-theme="dark"], :root:not([data-theme="light"]) @media (prefers-color-scheme: dark)`.

### P3 — Dead DOM parity elements
**File:** index.html:11–23 keeps `<svg class="linework">` and `<div class="veil">` "for parity" with Concept 04. Both are `display: none` in 04b CSS.
**Impact:** Pure DOM overhead; harmless but clutter.
**Fix:** remove from index.html (the audit-before-PR detector ignores won't catch this).

### P3 — `.ev-bar i` `transition: width`
**File:** styles.css:843 single element. Already suppressed in `.impeccable/config.json` ignoreRules with reason.

## Patterns & systemic issues

- **Brand-mark palette not overriden in 04b:** the only place Concept 04's warm tokens leak into 04b. Symptomatic of the inheritance model: 04b doesn't fully decouple from the shared component layer, it only overrides the most obvious slop.
- **JS-only dead code (Field):** the canvas field is an interesting case — visually silenced, mechanically alive. The two-state model (visible vs invisible) wasn't propagated from CSS to JS.
- **Byte-identical dark-mode blocks:** the duplication is a smell. CSS has the right primitive (selector list), and the chosen direction is more honest about light/dark than most — this is just an opportunity to consolidate.

## Positive findings

- Contrast verification clean in both themes (no detectable WCAG AA failures except the warn-line soft fail).
- Bengali localization complete: digit substitution, font stack with 5 fallbacks (`Noto Sans Bengali` → `Nirmala UI` → `Shonar Bangla` → `Kalpurush` → `SolaimanLipi`), per-script type ramp, no caps in Bangla (correct Latin device dropped).
- Product-specific structure: eight views map to FD-026 surfaces; BMDC verification, evidence pipeline with quarantine states, separate-capsule distributions, `+8801` emergency regex, reviewer-label claim system — none of this is template-shaped.
- `prefers-reduced-motion` and `body[data-motion="off"]` honour both, preserving state changes and restoring scroll feedback.
- `@supports (animation-timeline: scroll())` guards modern path; static fallback elsewhere — proper progressive enhancement.
- FD-027 satisfied on 7/9 axes including the substantive ones (paper, teal-gray, hairline rules, no veil, no panel shadow, no linework, Bengali).

## Recommendations for next commands

1. **Fix P0 + P1 manually** (touch targets + RAF). These are small targeted edits; running `/impeccable layout` would over-touch.
2. **`/impeccable polish`** as the final visual pass after the P0/P1 fixes.
3. **`/impeccable critique`** for UX heuristics (hierarchy, clarity, resonance) — a separate dimension the detector does not cover.
4. **Re-run `/impeccable audit`** after fixes; expect score to move to 18–19/20.

## Staleness map

This audit is bound to the file state on 2026-09-06. It will become stale on:
- Any change to styles.css beyond lines 1021–1131 (the 04b override block).
- Any change to app.js Field module or render dispatch.
- Any change to index.html structure.
- Any change to .impeccable/config.json (ignores).

Re-run cadence: weekly during the next iteration, then before each production handoff.

## Sources

1. [WCAG 2.2 Understanding Docs — w3.org](https://www.w3.org/WAI/WCAG22/Understanding/) — contrast and target-size criteria.
2. [Impeccable detector rules — impeccable.style](https://impeccable.style/slop) — what the visual detector covers and does not.
3. [Impeccable audit reference — .claude/skills/impeccable/reference/audit.md](https://github.com/pbakaus/impeccable) — five-dimension scoring.
4. [WCAG 2.5.5 Target Size — w3.org](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) — 44×44 CSS pixel minimum.
5. [RogtKotha Decision Log FD-027 — docs/status/decision-log.md](../../status/decision-log.md) — the brief under audit.