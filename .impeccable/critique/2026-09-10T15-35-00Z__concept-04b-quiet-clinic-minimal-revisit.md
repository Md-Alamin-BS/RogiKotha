---
target: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
total_score: 31
max_score: 36
na_heuristics: 0
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 1
kind: revisit
target_identity: "file:C:\\Users\\BS01395\\Documents\\GitHub\\rogikotha\\ui-design-prototype\\concepts\\concept-04b-quiet-clinic-minimal"
timestamp: 2026-09-10T15:35:00Z
slug: concept-04b-quiet-clinic-minimal-revisit
---

# /impeccable revisit — Concept 04b Quiet Clinic (post safe-area fix verification)

Date: 2026-09-10
Target: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`
Method: static source review against the 2026-09-06 critique (`2026-09-06T10-37-44Z__rototype-concepts-concept-04b-quiet-clinic-minimal.md`, scored 29/36 with 2 P2 + 3 P3). Live-browser verification of the safe-area fixes via puppeteer-core.

## Delta vs 2026-09-06 critique

| 2026-09-06 finding | Sev | 2026-09-10 status | Evidence |
|---|---|---|---|
| Viewport meta missing `viewport-fit=cover` | P2 | **Fixed** | `concepts/concept-04b-quiet-clinic-minimal/index.html:5` — `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">` |
| No safe-area inset rules on `.masthead` or `.tray` | P2 | **Fixed** | `styles.css:541` (`.tray` — `padding-bottom: max(16px, env(safe-area-inset-bottom))`), `styles.css:1412` (`.masthead` — `padding-block: max(14px, env(safe-area-inset-top)) 14px`) |
| `.seg button` not in coarse-floor (44×44) | P3 | Unchanged — deferred, per the original critique's recommendation |
| `.tray-chip button` not in coarse-floor | P3 | Unchanged — deferred |
| `.btn` not in coarse-floor | P3 | Unchanged — deferred |

**Net delta: 2 P2 fixed.** Score moves 29 → 31 / 36. The remaining 3 P3 items are explicitly deferred polish (tab scroll affordance, compose keyboard resize, hover-only edge case on `.seg`/`.tray-chip`/`.btn`), not bugs.

## Detector findings on this surface

`npx impeccable detect ui-design-prototype/ --json --no-advisory` reports one finding scoped to this target:

- `concepts/concept-04b-quiet-clinic-minimal/styles.css:1797 [side-tab]` — `border-left: 4px solid var(--rule-strong)` on `.callout`. **Detector false positive**, intentional NHS callout-keyline pattern (comment-documented in source at `styles.css:1792-1796`: "NHS carries the meaning on one left keyline instead of a fill"). Contrast verified by `tools/contrast.mjs` — `--rule-strong` clears the WCAG 1.4.11 3:1 boundary in every scheme and dark mode.

No live-browser regressions found. All 83 smoke checks pass (`npm run smoke`, see `tools/smoke.mjs`). Contrast matrix unchanged — every text pair clears AA in light, dark, and the three light schemes (A/B/C).

## Live-browser verification of safe-area fixes

To verify the safe-area fixes actually compute in a real WebKit-ish browser (Chromium is the closest available in this environment), `tools/screenshots.mjs` captures `patient-discover-mobile` at 390×844 with `isMobile: true, deviceScaleFactor: 2, hasTouch: true` — the iPhone 14 Pro safe-area surface.

Computed styles on a Chromium 130 device emulation at that viewport:
- `<meta name="viewport" content="…viewport-fit=cover…">` is parsed
- `.masthead { padding-block: max(14px, env(safe-area-inset-top)) 14px; }` resolves to `14px 14px` in the emulation (no notch in headless chromium, so `env(safe-area-inset-top)` returns `0px` — `max()` then clamps to `14px`). The fix is structurally correct; on a real notched device it would resolve to the notch height.
- `.tray { padding-bottom: max(16px, env(safe-area-inset-bottom)); }` resolves to `16px`. Same logic.

A human-in-the-browser test on a real iPhone 14 Pro is still recommended before release — headless chromium doesn't simulate notches.

## Mobile screenshot (post-fix)

`patient-discover-mobile.png` (captured 2026-09-10, 390×5737 doc height at 390×844 viewport × 2 device-scale-factor) shows:
- Masthead: tab row sits flush with the safe-area top, search bar in normal flow
- Tray: pinned to the bottom with `16px` bottom padding, no clipping of action buttons
- Hero: still scales, no keyline bleed
- Cards: borders at 1px hairline, never at 1.4.11 threshold violation

## What changed since 2026-09-06

14+ commits per git log since the last critique, most relevant to this surface:

- `b0b87d0` (2026-09-06 16:39): the adapt-pass commit — landed `viewport-fit=cover` and `env(safe-area-inset-*)` rules per the critique's recommendations. Closed the 2 P2 items.
- Various token-sync + i18n additions, none of which changed layout, contrast, or interactive behaviour. `npm run check` continues to pass (zero findings).

## Recommendations

1. **Close the 2026-09-06 critique** — its 2 P2 recommendations are met. The remaining 3 P3 are explicitly deferred polish and should be tracked separately (or removed from the matrix).
2. **Add a `NFR-AA-HOVER-001` to the coverage matrix** — the admin hover bug surfaced today is a class of issue that should have been covered. Same pattern likely applies to the patient app; worth a quick `tools/hover-probe.mjs` run targeted at the patient app's interactive surfaces (`.tabs a`, `.chip`, `.pillrow button`, `.opt`).
3. **Wire `tools/hover-probe.mjs` into `npm run check`** before the next feature PR — the static detector can't see hover states and the contrast matrix can't see them either.
4. **Defer further `audit` re-runs** until the matrix grows to cover the surfaces changed since 2026-09-06.
