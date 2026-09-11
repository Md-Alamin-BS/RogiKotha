---
target: ui-design-prototype/admin/
total_score: 36
max_score: 40
na_heuristics: 0
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 3
kind: audit
target_identity: "file:C:\\Users\\BS01395\\Documents\\GitHub\\rogikotha\\ui-design-prototype\\admin"
timestamp: 2026-09-10T15:30:00Z
slug: admin-console-fd030-hover-contrast-fix
---

# /impeccable audit — Admin console (post-FD-030, post hover-contrast fix)

Date: 2026-09-10
Target: `ui-design-prototype/admin/`
Scope: All 5 views (queue, evidence, providers, notifications, configuration) plus decision sheet.
Viewports checked: 1440×900 desktop (this run) and 390×844 mobile (this run).
Method: static source review + live-browser confirmation via puppeteer-core driving the locally-installed chromium binary (no Puppeteer download, no remote URLs). 5 routes captured + 1 hover state.
Assessment A: present.
Assessment B (deterministic detector): not run as part of this critique — `npx impeccable detect ui-design-protector/admin/ --json --no-advisory` was run separately and output saved at `docs/status/impeccable-detector-2026-09-10.json`. See "Detector delta" section.

## Source-context assessment

**Source context.** Static HTML/CSS/JS, no build step, no Node dependencies, no framework. The admin console was rebuilt on the Chart Tray surface system as part of FD-030 (per `docs/design/ai-slop-trim-log.md` and the `state.selCase: 'MOD-2041'` default-load pattern). Token surface now follows the patient scale; type hits the same 13/16/19/34px ladder.

**Target context.** Same audience as the patient app — Bangladeshi moderator on a clinic desktop or mid-range Android phone, often on slow wifi. Touch and keyboard both expected (mod keystroke navigation, touch on tablet).

## Audit findings

### P0 — none
### P1 — none

### P2 — none fixed in this pass

The two P2 findings the detector flagged on 2026-09-10 — admin `[low-contrast] :hover state 1.0:1` — was **a real WCAG AA violation**, confirmed by `tools/hover-probe.mjs` (see "Bug confirmation" below). Both light (2.22:1) and dark (1.67:1) hover states were sub-AA. Fixed by two-line remap of `--surface-hover` and `--surface-selected` from `--accent-soft` (a 10%-alpha fill designed for badges, not text) to `--fill-secondary` (= `--glass-2`, a token already verified to clear AA on `--ink` in both schemes).

### P3 — detector noise, expected

1. **`admin/styles.css:343 [side-tab]` — `border-inline-start: 3px solid transparent`** on `.case-row`. Detector flags the default-state keyword `transparent` as a "thick colored border on one side". The actual border-color is set on `:has(.case[aria-pressed="true"])` (line 365: `border-inline-start-color: var(--accent)`), and only when a row is selected. False positive — same pattern as the patient app's `kind: adapt` finding from 2026-09-06.

2. **`admin/index.html [low-contrast] :hover state 1.0:1` — text `#9ac3cb` on `#9ac3cb`** — the detector doesn't read the live `:hover` state and so still emits the static-analysis warning even though the live probe shows the bug is fixed. Static detector output is informational; the live verification (Assessment A method) is authoritative for hover states. Documented in `docs/status/impeccable-detector-2026-09-10.json`.

3. **`concepts/concept-04b-quiet-clinic-minimal/styles.css:1797 [side-tab] — border-left: 4px solid var(--rule-strong`** — the explicit NHS callout-keyline pattern documented in the source comment two lines above (line 1795: "NHS carries the meaning on one left keyline instead of a fill"). Contrast verified by `tools/contrast.mjs` (`--rule-strong` clears 1.4.11's 3:1 boundary in every scheme). Intentional design — not a finding.

## Bug confirmation

The impeccable detector's static finding pointed at a class of issue rather than a precise file:line. To confirm or refute, I wrote `tools/hover-probe.mjs`, which uses puppeteer-core to:

1. Navigate to the admin queue view at http://localhost:8137/ui-design-prototype/admin/
2. Switch to light and dark themes via `document.documentElement.setAttribute('data-theme', t)`
3. Hover every `.btn.primary`, `.btn.ghost`, `.top-item`, `.case-row`, `.tab`, `.side-tab`, etc.
4. Read `getComputedStyle(...).backgroundColor` and `.color` on hover
5. Compute WCAG relative-luminance contrast for each pair

**Pre-fix run (2026-09-10T14:55Z):** 20 LOW-contrast hover states. Both `.top-item:hover` and `.case-row:hover` failed in both schemes (2.14-2.22:1 light, 1.62-1.67:1 dark).

**Root cause:** `admin/styles.css:52` set `--surface-hover: var(--accent-soft)`. `--accent-soft` is a 10%-alpha teal fill (`hsl(190 22% 32% / 0.10)` in light, `hsl(190 32% 70% / 0.10)` in dark). When laid over the lane background (`--surface-sunken = --glass-2`), the effective colour stayed too close to the `--ink` text colour in both schemes. The token was always intended as a fill (badges, highlights), not a text surface — re-using it as a hover background was the bug.

**Post-fix run (2026-09-10T15:25Z):** 0 LOW-contrast hover states. Both `.top-item` and `.case-row` now render at ≥11.7:1 (light) and ≥12.4:1 (dark) on `--fill-secondary` (= `--glass-2`, `rgb(235,234,231)` light / `rgb(40,46,49)` dark). Verified text-grade.

A second bug class surfaced during investigation: the *selected* row state (`.case-row:has(.case[aria-pressed="true"])`) used `--surface-selected: var(--accent-soft)` — same root cause. Default state pre-loads `state.selCase = 'MOD-2041'` (`admin/app.js:23`), so the queue view **always** shipped with one row in the broken selected-tint state. Same one-line remap applied. Both fixes in `admin/styles.css:52,57`.

## Detector delta

| Run | Findings | Status |
|---|---|---|
| 2026-09-06 baseline (pre-FD-030) | (stale; pre-rebuild) | (not re-run here) |
| 2026-09-10 14:55Z | 1 low-contrast (`admin/index.html`, hover state) + 2 side-tab (admin + concept-04b callout) = 3 total | **1 real, 2 false-positive** |
| 2026-09-10 15:25Z (after fix) | 1 low-contrast + 2 side-tab = 3 total | **0 real, 3 false-positive** |

The detector's `low-contrast` finding is a static-CSS scan that doesn't follow `:hover` rules to their resolved values, so it continues to emit the original warning after the fix is applied. The live-browser verification (`tools/hover-probe.mjs`) is the authoritative check. The detector output at `docs/status/impeccable-detector-2026-09-10.json` should be read alongside `tools/hover-probe.mjs` output, not in isolation.

## Coverage matrix impact

- **STORY-ADMIN-001** (config view): unaffected by this fix
- **STORY-MOD-002** (lanes — critical / standard / appeals): unaffected
- **STORY-MOD-003** (audit timeline): unaffected

None of the existing matrix entries were affected. The hover/selected-state text contrast is implicit in the design intent (every interactive surface must clear WCAG AA), not tracked as a dedicated story — though the bug suggests the matrix could grow a `NFR-AA-HOVER-001` line item.

## Tools added in this session

- `tools/screenshots.mjs` — capture screenshots via puppeteer-core + locally-installed chromium. Hard-codes `localhost:8137` only. Writes to `%TEMP%\rogikotha-screens\`.
- `tools/hover-probe.mjs` — hover every interactive admin element, compute WCAG contrast for hover state, report LOWs.
- `tools/resolve-token.mjs` — read a token's resolved value from a running browser, light and dark.
- `tools/inspect-caserow.mjs` — dump computed styles + ancestor backgrounds for the case-row element (used during investigation, retained for future row-state debugging).

All four are read-only on the prototype (they launch headless chromium against `localhost:8137`). They are not wired into `npm run check` because they require the prototype to be served (`npm start`) and a chromium binary to be present.

## Recommendations

1. **Wire `npx impeccable detect ui-design-prototype/ --no-advisory` into `npm run check`** — mechanical, no LLM cost, catches AI-slop regressions before they accumulate. Exit code 2 on findings already works as a CI gate.
2. **Wire `tools/hover-probe.mjs` into `npm run check`** after the static detector — covers the hover-state class that the static detector cannot. Same chromium requirement; same pre-condition (server up).
3. **Document this class of bug in the design notes** — `--accent-soft` is a fill, not a text surface. Future token additions should distinguish "fill" from "surface" semantically, or fail-fast in a token-validator. (Out of scope for this PR.)
4. **Defer further `/impeccable audit` re-runs** until the matrix grows to cover admin surfaces (currently no admin-specific NFR story).
5. **Run `/impeccable adapt ui-design-prototype/admin/` next** — first responsive-truth pass on the admin console since the FD-030 rebuild. The detector's `side-tab` (transparent-keyword) finding on `.case-row` is exactly the kind of thing `adapt` would triage.
