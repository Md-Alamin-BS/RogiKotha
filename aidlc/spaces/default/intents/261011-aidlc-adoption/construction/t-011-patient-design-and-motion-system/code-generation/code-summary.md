# Code summary — U45 `t-011-patient-design-and-motion-system` (T-011)

Phase C (plan Step 12) completes this file. Phase A wrote the spike record below.

## Spike: `RouteTransition` and the static groups (plan Step 4; WF2, Q4, Q8)

Run on 2026-10-29 against `next build` + `next start` of the Bolt branch, in headless Chrome 157.0.8103.27 (puppeteer-core, the repository's own devDependency), with `document.startViewTransition` wrapped to record each transition and the animations on its pseudo-elements at `ready`.

Result: React's `<ViewTransition>` works on Next 16.3.4 (App Router React `19.3.0-canary-cbb046ab-20260731`) with no configuration. The design's keyed boundary in the patient layout (Q4 A) is kept; the per-page fallback (Q4 B) is not needed.

| Case | Observed |
|---|---|
| First paint of `/en` | No time-based animation; `data-motion-ready` set on `<html>` after hydration |
| Tab click (`/en` → `/en/doctors`) | One view transition: `::view-transition-old(page)` `rk-page-out` 160 ms, `::view-transition-new(page)` `rk-page-in` 240 ms; groups `demo`, `masthead`, `colophon` captured with no animation; root not animated |
| To and from `/emergency` | The same, plus a static `emergency` group (`#view-emergency`); `#view-emergency` computes `animation: none`, `transition: none` |
| Theme toggle (server action in a transition) | No view transition |
| Search-parameter change (`router.push('/en/doctors?q=spike')`) | No view transition (same key) |
| Back and forward across a path change | No view transition: React skips popstate, so the page swaps at once (functional-spec § 7 "Back or forward") |
| Language toggle `#lang` (`/en/write` → `/bn/write`) | A same-document navigation that **does** run the page fade-rise: Next remounts the whole `[locale]` subtree, so React pairs the old and new `page` boundaries even though the locale-free key is the same |
| Language switch carrying the transition type `rk-language` (`router.push('/bn/topics', { transitionTypes: ['rk-language'] })`) | No view transition: `RouteTransition` maps `rk-language` to `none` for enter, exit and share |
| OS `prefers-reduced-motion: reduce`, and `rk.motion=off` (`<html data-motion="reduced">`) | React still starts the transition; no pseudo-element has an animation, so the swap is instant. Reveal, tick, sheet and press run nothing; the overlay keeps its 100 ms opacity fade; `.progress` is `display: none` |
| Reveal list of 8 inserted after motion-ready | Items 1–6: opacity and transform, 240 ms, delays 0, 40, 80, 120, 160, 200 ms; items 7–8: none |
| `PublishTick` markup inserted after motion-ready | Short arm transform 144 ms; long arm transform 216 ms after a 144 ms delay |
| `PublishTick` markup present at first paint | No animation after motion-ready arrives (BR4.5, review R-01) |
| Sheet opened (`.overlay` un-hidden) | Overlay opacity 100 ms; sheet opacity and transform 240 ms |
| Press (`:active`) on `.btn`, `#theme`, a tab | `scale(0.98)` over 100 ms; a colophon link and an emergency card do not scale |
| Console | Only `404 /favicon.ico` (the app ships no favicon; not this Unit) |

Findings that change the plan's assumptions:

1. **Language toggle (review point 3).** Keying by the locale-free path is not enough for "no route transition on a language switch". The working mechanism is a transition type: `RouteTransition` exports `LANGUAGE_SWITCH_TRANSITION = 'rk-language'` and maps it to `none`; the `#lang` link must carry `transitionTypes={['rk-language']}`. next-intl 4.14.4's `Link` forwards unknown props to `next/link` (`BaseLink.js` `...rest`). That link is in `components/shared/ThemeControls.tsx`, which is not in the plan's Files-touched table, so Phase A did not change it; until it does, the language toggle runs the same 160/240 ms page fade as a route change.
2. **Hit testing.** Named static groups (the masthead with its tabs and controls) do not receive pointer input for the transition's duration, at most 240 ms (Next's view-transitions guide). Accepted; noted for U42.
3. **Publish tick drawing.** Scaling an arm from 0 (frontend-components § 5.3) breaks BR4.3 (`scale()` only between 0.98 and 1.02, `M4-scale`). Each arm is drawn instead by sliding its stroke out of a clipped window (a nested `<svg overflow="hidden">`), transform only.
4. **Reading bar.** The old `scaleX(0)` → `scaleX(1)` bar also breaks BR4.3; it now slides `translateX(-100%)` → `none` inside a clipped `.progress`.
