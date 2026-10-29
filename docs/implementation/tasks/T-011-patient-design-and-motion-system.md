# T-011 — Patient design and motion system (FD-091)

| Field | Value |
|---|---|
| Story | US2.4 (new, owner 2026-10-27); supports US2.3 |
| Phase / Lane | 0 / B |
| Class | M2 (frontend), with an owner look review at the milestone walk |
| Estimate | 5–7 h agent; validation 1.5 h |
| Depends on | T-010 (lint and CI, so the CSS check runs in `pnpm check`) |
| Blocks | every patient UI Unit: T-102, T-202, T-203, T-206, T-207, T-306, T-307, T-308, T-402, T-409, T-501 |

## Goal

Replace the patient side's look ("Quiet Clinic, minimal", 04b) with the FD-091 design, **"Warm Paper, Soft Depth"**, and add a CSS-first motion system, before any patient page is built. Every later patient Unit then builds its pages on these tokens, components and motion rules instead of porting the 04b styles verbatim (project rule, Code Style, learned 2026-10-27). The prototype stays the source of truth for content, data and behaviour. The staff console keeps Chart Tray (`admin.css`, FD-030) and is not touched.

## Read first

1. `docs/planning/research/ui-direction-2026-10-27/design-direction-research.md` §4: the design brief (colour, type, shape, depth, motion tokens, the 11 choreography rules, release checks). It is the specification for this task.
2. `docs/planning/research/ui-direction-2026-10-27/motion-tech-research.md`: React 19.3 `<ViewTransition>`, `@starting-style`, scroll-driven animations inside `@supports`, reduced-motion rules that also cover `::view-transition-*`, CSP notes, fonts.
3. `docs/status/decision-log.md` FD-032 (plain CSS, no animation library), FD-091, FD-024 (equal languages; no capital-letter transform in Bengali).
4. `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/user-stories/stories.md` US2.4 (AC2.4.1–AC2.4.6) and US2.3.
5. `apps/web/src/styles/tokens.css`, `patient.css`, `globals.css`, and the shell components from T-008 (masthead, tabs, footer, skip link, `#sr-live`, demo marker, the `data-motion` switch).

## Owned paths

- `apps/web/src/styles/tokens.css` (patient tokens: replace the 04b values; keep token names other files use, or rename them everywhere in owned files)
- `apps/web/src/styles/patient.css` (restyle; keep class names the shell and later Units rely on, or note each rename in the hand-off)
- `apps/web/src/styles/motion.css` (new: duration, easing, distance and stagger tokens, keyframes, `@starting-style` entries, view-transition rules, reduced-motion overrides)
- `apps/web/src/components/patient/motion/` (new: `RouteTransition` around page content using React's `<ViewTransition>`, `Reveal` for staggered lists capped at 6 items, `PublishTick`)
- `apps/web/src/components/patient/shell/**` (restyle only)
- `apps/web/src/app/[locale]/layout.tsx` and `(patient)/layout.tsx` (fonts and motion wiring only)
- `apps/web/src/app/fonts/` (new: Hind Siliguri 600 WOFF2 subset for Bengali headings)
- `scripts/css-motion-check.mjs` (new) and its `package.json` script `check:motion`, added to `pnpm check`
- `apps/web/e2e/smoke/motion.spec.ts` (new) and component tests under `apps/web/src/components/patient/motion/`
- `packages/i18n/messages/{en,bn}.json`: new keys only (the reduce-motion switch label and the publish confirmation text, if missing)

## Not in scope

- Any page body: the pages arrive with their own Units, built on this system.
- The staff console (`admin.css`, Chart Tray).
- Any animation library, Tailwind, CSS-in-JS or icon library (FD-032).
- A web font for Bengali body text, or a serif for story pages (FD-091 keeps the system stack for body text).

## Steps

1. **Tokens.** Write the colour, type, radius, elevation and touch-target tokens from the design brief into `tokens.css`, with `:lang(bn)` sizes and line-heights. Check every text and UI colour pair for contrast (4.5:1 text, 3:1 UI) with `pnpm contrast`; adjust a value that fails and note it.
2. **Patient styles.** Restyle the shell and the shared patient classes in `patient.css` on the new tokens: paper base, card surfaces with soft elevation, one primary colour, decoration-only accent, hairline rules, 44 px targets, visible 3 px focus ring. No glass on content. No letter-spacing or uppercase on Bengali.
3. **Motion tokens and rules** in `motion.css`: `--dur-instant` 100 ms, `--dur-fast` 160 ms, `--dur-base` 240 ms, `--dur-slow` 360 ms; the three easings; 8–16 px rise, 24 px step slide, scale at most 1.02; stagger 40 ms capped at 6 items. Animate only `transform` and `opacity`. Wrap every movement in `@media (prefers-reduced-motion: no-preference)` and in `:root:not([data-motion="reduced"])`. Under reduce, keep fades of 100 ms or less and focus and press states only, and include `::view-transition-*` pseudo-elements.
4. **Components.** `RouteTransition` wraps page content in React's `<ViewTransition>`, with a cross-fade and a short rise, and a plain swap where unsupported. `Reveal` staggers list children. `PublishTick` draws one tick over about 360 ms next to a plain text confirmation; no confetti, badge, streak or points.
5. **Home page scroll reveals** as CSS scroll-driven animations inside `@supports (animation-timeline: view())`, static otherwise. Never on the LCP element.
6. **Never animated:** the medical-advice disclaimer, the emergency guidance and the demo marker. Nothing loops or auto-plays for more than 5 seconds. No parallax, zoom sweeps or flashing.
7. **Fonts.** Self-host Hind Siliguri 600 (subset WOFF2, `font-display: swap`, `preload: false`) for Bengali headings on the `bn` locale only; the system stack stays for body text.
8. **CSS motion check** (`scripts/css-motion-check.mjs`): fail when a `transition` or `@keyframes` in the patient styles animates anything but `transform` or `opacity`, or when a movement rule sits outside the reduced-motion guard.
9. **Tests and checks:** component tests in `en` and `bn`; a Playwright smoke that a route change runs a view transition with motion on and none with reduced motion; `pnpm check`, `pnpm smoke`, `pnpm contrast`, `npx impeccable detect apps/web/src --no-advisory`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| AC2.4.1: tokens and plain CSS | `pnpm check`; inspect `tokens.css`, `patient.css` | the FD-091 tokens are in place; no Tailwind, CSS-in-JS or animation library in `package.json` |
| AC2.4.2: motion on key moments | `pnpm smoke` (motion spec) | a route change runs a view transition; a list reveal staggers at most 6 items; durations come from the tokens |
| AC2.4.3: reduced motion | motion spec with `prefers-reduced-motion: reduce`, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; fades of 100 ms or less only; every step still works |
| AC2.4.4: never-animated elements | component test and CSS check | the disclaimer, emergency guidance and demo marker have no animation or transition |
| AC2.4.5: no gamification | `rg -i "confetti\|streak\|badge-earn\|points" apps/web/src` | no match in patient motion code |
| Animated properties | `pnpm check:motion` | passes; a planted `transition: width` fails it |
| Contrast | `pnpm contrast` | every new token pair passes |
| Both languages | component tests | shell renders in `en` and `bn`; Bengali headings use the subset font; no uppercase transform in Bengali |
| AC2.4.6 baseline | Lighthouse on `/en` and `/bn` home (shell only) | figures recorded in the hand-off; the gated run on finished pages is T-503's |

## Hand-off

List every token and class rename, the final colour values after the contrast check, and the font file sizes. Record new Bengali copy for the owner's review (FD-042).

**Done 2026-10-29** (Bolt `bolt/t-011-patient-design-and-motion-system`; full record in [handoffs/T-011.md](../handoffs/T-011.md)).

- **Renames:** none. Class names are unchanged; the shell restyle changes only rule bodies in `patient.css`. New classes: `.ctl .ico` and the motion hooks in `motion.css` (`RouteTransition`, `Reveal`, `PublishTick`, `.progress i`), each with an `added: T-011` comment.
- **Final colours after the contrast check (light / dark):** paper `hsl(40 33% 95%)` / `hsl(30 12% 9%)`; surface `hsl(0 0% 100%)` / `hsl(30 10% 13%)`; ink `hsl(194 23% 15%)` / `hsl(40 25% 93%)`; ink-muted `hsl(194 12% 33%)` / `hsl(38 10% 74%)`; primary `hsl(175 75% 24%)` / `hsl(170 45% 60%)`; primary-soft `hsl(167 33% 92%)` / `hsl(170 30% 18%)`; decor `hsl(40 73% 55%)` / `hsl(40 70% 60%)`; focus `hsl(218 78% 47%)` / `hsl(214 90% 70%)`. `pnpm contrast:patient` passes every text pair at AA and every 1.4.11 boundary at 3:1 in both modes.
- **Font:** Hind Siliguri 600, Bengali subset only, `HindSiliguri-SemiBold-bengali.woff2` 74,784 bytes (OFL, `OFL.txt` beside it), loaded with `next/font/local` for Bengali headings.
- **Bengali copy:** no new strings; nothing to review for FD-042.
- **Owner's look review in `en` and `bn`:** waiting (owner review queue).
- **Issues:** ISS-303 to ISS-320.

