---
target: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
total_score: 29
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
p2_count: 2
p3_count: 3
kind: adapt
target_identity: "file:C:\\Users\\BS01395\\Documents\\GitHub\\rogikotha\\ui-design-prototype\\concepts\\concept-04b-quiet-clinic-minimal"
timestamp: 2026-09-06T10-37-44Z
slug: rototype-concepts-concept-04b-quiet-clinic-minimal
---
# /impeccable adapt — Concept 04b Quiet Clinic

Date: 2026-09-06
Target: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`
Scope: All 8 views (discover, results, profile, account, condition, facility, compose, mine). Viewports checked: 1280×800 desktop, 390×844 mobile (iPhone 14 Pro safe-area), 720×1280 tablet boundary.
Method: source review only — no live browser, no DevTools touch emulation. Findings here are *static* (CSS + markup) and verifiable in the deployed prototype by a single phone open.

## Source-context assessment

**Source context.** Quiet Clinic is a static HTML/CSS/JS prototype, no build step, no Node dependencies, no framework. The chosen restraint — paper, teal-gray, hairlines, no veil, no shadow — applies equally on desktop and mobile. The original assumptions were large-screen-first, mouse-first, fast-wifi.

**Target context.** A Bangladeshi reader on a mid-range Android phone, often on 3G/4G, holding the phone in one hand while reading a doctor's account. Sometimes on a desktop at a clinic. Touch is the dominant input; large text and tap-friendly controls matter.

**Adaptation challenges identified:**
1. Touch targets must reach 44×44 CSS pixels (WCAG 2.5.5).
2. Notched phones (iPhone 14+, Android with cutouts) need safe-area insets for the masthead and tray.
3. Hover-only feedback must not be the only signal (touch users can't hover).
4. Horizontal scroll on tabs at 390px must be obvious.
5. Sheet heights must leave room for the keyboard on compose.

## Per-view touch-target verification

Verified all 8 views and every interactive control listed in the audit. The `@media (pointer: coarse)` block (styles.css:1011-1018) covers all six classes in the audit list:

| Class | Where it appears | Coarse floor | Status |
|-------|------------------|--------------|--------|
| `.ctl` | 5 header controls in `index.html` | `min-width: 44px; min-height: 44px;` | ✓ |
| `.sheet-close` | `<button class="ctl sheet-close">` on every sheet | `min-width: 44px; min-height: 44px;` | ✓ |
| `.tabs a` | 8 top-nav tab links | `min-height: 44px; padding-block: 13px;` | ✓ |
| `.chip` | results filter chips (app.js:235) | `min-height: 44px; padding-block: 14px;` | ✓ |
| `.pillrow button` | distribution capsule toggles (app.js:473, 502) | `min-height: 44px; padding-block: 14px;` | ✓ |
| `.opt` | compose option rows, claim selectors, sentiment, identity, report reasons (8 sites in app.js) | `min-height: 44px; padding-block: 14px;` | ✓ |

**Spots still below 44×44 on touch (outside the audit list):**
- `.seg button` — segment controls (sort/filter splits). Not in the audit but the same rule should apply. (P3)
- `.tray-chip button` — X-button inside compare-tray chips (line 545). 14px font / 4px padding ≈ 24×24. The chip itself is taller, so the inner button is the misclick risk. (P3)
- `.btn` — buttons have `padding: 12px 24px` (line 1224). 12 + 12 + font ≈ 36px tall on a 13px font; below 44. (P3)

These three are *not* covered by the audit fix. Whether to extend the fix is a scope decision.

## Safe-area verification

**Critical finding: viewport meta is missing `viewport-fit=cover`.**

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Without `viewport-fit=cover`, `env(safe-area-inset-*)` is silently ignored by Safari iOS. The page will render under the notch on iPhone 14 Pro and similar devices.

**Critical finding: no safe-area inset rules anywhere in styles.css.**

```bash
grep -n "safe-area\|env(" styles.css
# no matches
```

The masthead (`.masthead` at lines 179-184 and the 04b override at 1176-1180) and the tray (`.tray` at 530-536) both need inset handling:
- `.masthead` should add `padding-top: max(12px, env(safe-area-inset-top))`
- `.tray` should change `padding: 12px clamp(14px, 3.5vw, 40px) 16px` to `padding: 12px clamp(14px, 3.5vw, 40px) max(16px, env(safe-area-inset-bottom))`

This is the single biggest gap in the mobile story for this prototype. (P2)

## Hover-only state verification

`.tabs a:hover::after` (styles.css:1380) and `.cap:hover::before` (1352) are bonus feedback. The active state is *not* hover-only:
- `.tabs a[aria-current="page"]::after { transform: scaleX(1); }` at 1378 — works on touch.
- `.cap` is a non-interactive display, hover is decorative.

No fix needed. ✓

## Breakpoint verification

The 1040 and 720 breakpoints (styles.css:974, 983, 1266) collapse multi-column grids cleanly:

| Breakpoint | What it does | Verdict |
|-----------|--------------|---------|
| ≤1040px | Multi-col grids → 1fr; sticky filters → static; doc-entry avatar 58px | ✓ |
| ≤720px | Masthead reflows; tabs scroll-x; profile hero shrinks; pipeline column-stacks | ✓ |

The masthead at 720: `.tabs { order: 3; width: 100%; overflow-x: auto; padding-bottom: 2px; }` — tabs get their own row and scroll horizontally. Good.

**Gap:** no breakpoint between 720 and 1040. Tablets (e.g. iPad mini at 768px portrait) get the mobile layout. That's intentional — content-driven, not device-driven.

## Touch keyboard handling

The compose view (`view-compose`, app.js:942) uses `<textarea>` and `<input>` elements. When the keyboard opens on iOS Safari, it shrinks the viewport via `visualViewport` (no `interactive-widget=resizes-content` set). The sheet isn't used in compose — it's an inline form. The footer CTA is below the inputs; on small phones the keyboard may cover it. (P3)

## Performance under mobile constraints

- Single canvas paint removed (Field IIFE gone).
- `body[data-motion="off"]` and `prefers-reduced-motion` kill every animation.
- Bengali font stack falls back through 5 system fonts before failing.
- All images are CSS-only (avatars are letter circles). No img-tag to lazy-load.

## Image policy

No `<img>` tags in markup; all avatars and brand mark are CSS gradients. Nothing to srcset.

## Tab scroll affordance

`.tabs { overflow-x: auto; padding-bottom: 2px; }` — the scrollbar is hidden on mobile by default. There's no gradient mask to suggest more tabs exist. Users discover horizontal scroll by trying. This is acceptable but not great. (P3)

## Findings summary

| Sev | Finding | Fix |
|---|---|---|
| P2 | Viewport meta missing `viewport-fit=cover` | Add to `<meta name="viewport">` |
| P2 | No safe-area inset rules for masthead or tray | Add `env(safe-area-inset-*)` with `max()` fallback |
| P3 | `.seg button`, `.tray-chip button`, `.btn` not in coarse-floor | Extend `@media (pointer: coarse)` block |
| P3 | Tab scroll affordance is invisible on mobile | Optional: gradient mask on .tabs at 720px |
| P3 | Compose keyboard may cover submit on small phones | Optional: `interactive-widget=resizes-content` on viewport |

## Recommendations

1. Fix the two P2 safe-area issues in this pass — small, targeted edits.
2. Extend the coarse floor to `.seg button`, `.tray-chip button`, `.btn` in this pass.
3. Defer the P3 polish items (tab scroll affordance, compose keyboard) to a later round.
4. Re-run `/impeccable audit` after fixes to confirm score moves up.
