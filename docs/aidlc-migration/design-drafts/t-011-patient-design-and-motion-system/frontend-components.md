# Frontend components — U45 `t-011-patient-design-and-motion-system`

Component-level design for `functional-spec.md` (workflows WF1–WF8) and `rules.md` (BR1.1–BR9.9). It follows answer A to all ten questions in `functional-design-questions.md` (Q9–Q10 decided under the owner's no-questions instruction of 2026-10-29); the deltas for other options are in `functional-spec.md` § 10. Refreshed on 2026-10-29 against T-010 as built: see the files table (§ 2), spacing tokens (§ 3.4), press and hover (§ 6), the check (§ 8) and the tests (§ 9). Upstream: `unit-of-work.md` U45, `unit-of-work-story-map.md` US2.4 and US2.3, `requirements.md` NFR13, FR95, NFR1, NFR4, NFR5, NFR6, NFR7, `components.md` (no domain component), `contract-summary.md` (U45 has no runtime contract; C14 unchanged). There are no server actions, routes, contracts, schema changes or message keys.

The snippets below are interface-level sketches, not code to copy.

## 1. Hierarchy

```text
app/[locale]/layout.tsx         <html lang data-lang data-theme data-motion="reduced"? class=font-var (bn only)>
│                               <body data-app data-motion=on|off>            (body unchanged)
├── LiveRegion                  #sr-live                                       (unchanged)
└── app/[locale]/(patient)/layout.tsx      imports globals.css, patient.css, motion.css (new)
    ├── SkipLink                .skip                                          (restyled)
    ├── DemoMarker              p.demo[role=note]       static group "demo"    (restyled)
    ├── Masthead                header.masthead          static group "masthead" (restyled)
    │   ├── Tabs                nav.tabs a[aria-current]                       (restyled)
    │   └── ThemeControls       #lang #theme #motion .ctl                      (restyled; logic unchanged)
    ├── div.progress > i        reading bar                                    (restyled; motion moves)
    ├── main#main
    │   └── RouteTransition     (new, client)  ViewTransition name "page", keyed by locale-free path
    │       └── div.page-frame
    │           └── page → ViewShell section.view#view-<view>                  (unchanged)
    └── Colophon                footer.colophon          static group "colophon" (restyled)

components/patient/motion/
├── RouteTransition.tsx         (new)
├── Reveal.tsx                  (new)
└── PublishTick.tsx             (new)

app/fonts/
├── bn-heading.ts               (new) the one localFont() call; exports the variable class
├── HindSiliguri-SemiBold-bengali.woff2
└── OFL.txt
```

The staff layout (`app/[locale]/admin/layout.tsx`) does not import `motion.css` and does not render `RouteTransition`, so the staff console gets neither (BR1.6).

## 2. Files

| Path | Change | In T-011's owned paths |
|---|---|---|
| `apps/web/src/styles/patient.css` | Token block at the top (§ 3), replacing the concept-04 layer, the 04b identity block and the scheme A/B/C blocks; every patient class restyled on the tokens; every motion declaration removed (moved to `motion.css`, BR4.7) | yes |
| `apps/web/src/styles/motion.css` | New: motion tokens, guards, primitives, view-transition rules, reduced-mode overrides, static set (§ 6) | yes |
| `apps/web/src/styles/tokens.css` | **No change** (staff palette, Q1 A) | yes, untouched |
| `apps/web/src/app/[locale]/layout.tsx` | `data-motion="reduced"` on `<html>` when `rk.motion` is off; the Hind Siliguri font variable class on `<html>` for `bn` only | yes ("fonts and motion wiring only") |
| `apps/web/src/app/[locale]/(patient)/layout.tsx` | Import `motion.css` after `patient.css`; wrap `{children}` inside `<main>` with `RouteTransition` | yes |
| `apps/web/src/app/fonts/HindSiliguri-SemiBold-bengali.woff2`, `apps/web/src/app/fonts/OFL.txt` | New: Bengali subset at weight 600 and its licence | yes |
| `apps/web/src/app/fonts/bn-heading.ts` | New: the `localFont()` call (element `web`), imported by `[locale]/layout.tsx` | yes (`app/fonts/`) |
| `apps/web/src/components/patient/motion/{RouteTransition,Reveal,PublishTick}.tsx` and their tests | New. Element `web-components`: imports `react`, `@/i18n/routing` (`web-shared`) and nothing under `server/` except actions | yes |
| `scripts/css-motion-check.mjs` | New: the CSS check (§ 8), no flags | yes |
| `scripts/css-motion-check.test.mjs` | New: planted-violation tests in T-010's `tooling` project (§ 8) | **no** (sits beside the owned script): listed |
| root `package.json` | Scripts `contrast:patient` and `check:motion`, inserted in `check` after `contrast` and before `build` (T-010 BR8.4) | `check:motion` yes; `contrast:patient` is listed for approval (Q1 A) |
| `tools/contrast.mjs`, `scripts/contrast.test.mjs` | `--pairs patient` (about ten lines, D14) and one test case for it; the default pairs and the existing three tests unchanged | **no**: listed |
| `.prettierignore`, `prettier.config.mjs` | `apps/web/src/styles/**` becomes `apps/web/src/styles/tokens.css`, `globals.css` and `admin.css`, each with its reason; one `overrides` entry `{ files: '*.css', options: { singleQuote: false } }` (Q9 A) | **no**: listed |
| `.gitattributes` | `*.woff2 binary` (F9) | **no**: listed |
| `apps/web/e2e/smoke/motion.spec.ts` | New Playwright smoke (§ 9) | yes |
| `apps/web/playwright.config.ts`, `apps/web/e2e/tsconfig.json`, `apps/web/package.json` (`@playwright/test` dev dependency; `smoke:e2e`; `typecheck` becomes `tsc --noEmit && tsc --noEmit -p e2e`), `pnpm-lock.yaml` | New or changed (Q7 A, F3); CI installs with `--frozen-lockfile`, so the lockfile is committed with the dependency | **no**: listed |
| `apps/web/vitest.config.ts` | `exclude` gains `'e2e/**'` (F2) | **no**: listed |
| `apps/web/vitest.setup.ts` | `vi.mock('next/font/local', …)` returning `{ className, variable, style }` (F4) | **no**: listed |
| `apps/web/src/app/layouts.test.tsx` (T-010) | Two cases added: `<html data-motion="reduced">` only with `rk.motion=off`; the font variable class only on `bn`. No existing assertion changes, because `<body data-motion>` is unchanged | **no**: listed |
| `apps/web/src/components/patient/{Masthead,Tabs,Colophon}.tsx`, `components/shared/{DemoMarker,SkipLink,ThemeControls,Sheet}.tsx` | Restyle only. No markup change is expected; if one is needed (for example a wrapper for a 44 px hit area), it is listed | T-011 names `components/patient/shell/**`, which does not exist; the plan lists these real files (proposed ISS row) |
| `packages/i18n/messages/{en,bn}.json` | **No change expected** (BR9.3) | yes, only if a key proves necessary |
| `docs/implementation/01-conventions.md` §7.8, §13; `docs/implementation/ISSUES.md`; `docs/implementation/handoffs/T-011.md`; `docs/status/dependency-check-log.md` | §7.8 names both contrast runs, §13 the eleven steps; records | records; §7.8 and §13 listed |

## 3. Tokens (the patient token block in `patient.css`)

### 3.1 Colour

All values are in `hsl()`. "Alias" is the existing name kept as `var()` of the canonical one, so `patient.css` rules and the contrast tool keep working (BR1.5). The ratios were computed on 2026-10-28 with the contrast tool's own formula; Code Generation confirms them with `contrast:patient`.

| Canonical | Alias(es) | Light | Dark | Role |
|---|---|---|---|---|
| `--paper` | `--bg`, `--pagehead-bg` (transparent stays) | `hsl(40 33% 95%)` | `hsl(30 12% 9%)` | Page background |
| `--surface` | `--glass`, `--card-bg`, `--callout-bg`, `--field-bg`, `--masthead-bg` | `hsl(0 0% 100%)` | `hsl(30 10% 13%)` | Cards, masthead, fields |
| `--surface-2` | `--glass-2`, `--aside-bg` | `hsl(38 24% 91%)` | `hsl(30 9% 18%)` | Insets, side boxes |
| `--ink` | `--byline-accent` | `hsl(194 23% 15%)` | `hsl(40 25% 93%)` | Text |
| `--ink-muted` | `--ink-soft` | `hsl(194 12% 33%)` | `hsl(38 10% 74%)` | Secondary text |
| `--ink-faint` | — | `hsl(194 9% 39%)` | `hsl(36 8% 64%)` | Meta text (still 4.5:1) |
| `--primary` | `--accent`, `--eyebrow` | `hsl(175 75% 24%)` | `hsl(170 45% 60%)` | Links, primary buttons, current tab |
| `--primary-2` | `--accent-2` | `hsl(175 75% 19%)` | `hsl(170 45% 70%)` | Hover and pressed primary |
| `--primary-ink` | `--accent-ink` | `hsl(0 0% 100%)` | `hsl(30 12% 9%)` | Label on a primary button |
| `--primary-soft` | `--accent-soft` | `hsl(167 33% 92%)` | `hsl(170 30% 18%)` | Tags, current-tab wash |
| `--decor` | — (new) | `hsl(40 73% 55%)` | `hsl(40 70% 60%)` | Decoration only (BR1.3) |
| `--rule` | — | `hsl(38 14% 73%)` | `hsl(40 25% 93% / 0.18)` | Hairlines |
| `--rule-hard` | — | `hsl(38 12% 62%)` | `hsl(40 25% 93% / 0.28)` | Hover edge |
| `--rule-strong` | — | `hsl(194 8% 52%)` | `hsl(40 25% 93% / 0.42)` | Control boundary (1.4.11) |
| `--input-border` | — | `hsl(194 9% 39%)` | `hsl(36 8% 56%)` | Field border |
| `--focus` | — (new) | `hsl(218 78% 47%)` | `hsl(214 90% 70%)` | Focus ring |
| `--positive`, `--mixed`, `--negative` | — | `hsl(160 40% 28%)`, `hsl(34 60% 30%)`, `hsl(6 58% 40%)` | `hsl(160 35% 62%)`, `hsl(36 55% 64%)`, `hsl(8 70% 72%)` | Distribution labels |
| `--neutral` | — | `hsl(194 8% 80%)` | `hsl(30 6% 32%)` | "Not stated" capsule fill (non-text) |
| `--warn-bg`, `--warn-line`, `--warn-ink` | — | `hsl(42 70% 93%)`, `hsl(38 45% 68%)`, `hsl(28 60% 24%)` | `hsl(36 24% 14%)`, `hsl(36 35% 45%)`, `hsl(40 70% 80%)` | Demo marker, warnings |
| `--danger-bg`, `--danger-line`, `--danger-ink` | — | `hsl(8 70% 95%)`, `hsl(8 50% 68%)`, `hsl(6 58% 33%)` | `hsl(8 30% 15%)`, `hsl(8 40% 50%)`, `hsl(8 75% 82%)` | Errors, emergency emphasis |
| `--overlay-scrim` | — | `hsl(194 30% 10% / 0.45)` | `hsl(30 20% 3% / 0.62)` | Behind sheets |
| `--redact-ink` | — | `hsl(0 0% 7%)` | `hsl(0 0% 4%)` | Redaction masks (unchanged meaning) |
| `--hero-wash` | — (new) | `linear-gradient(180deg, var(--primary-soft), var(--paper) 70%)` | same expression | Static wash, home hero only |
| `--hue-a`, `--hue-b` | — | `175`, `40` | `170`, `40` | Brand mark: teal plus the warm accent |

The design brief's hex values were converted and tuned. Paper is a step darker than `#FAF8F4`, so a card stands out from the page at 1.10:1. The hairline is darker than `#E4DFD6`, which measured 1.33:1 on a card, below the tool's 1.5 band. An inset and a faint-ink role were added.

Key ratios (light / dark): ink on paper 13.25 / 15.52; muted ink on paper 6.57 / 9.71; faint ink on inset 4.78 / 5.49; primary on paper 5.76 / 8.91; primary on card 6.34 / 7.97; button label on primary 6.34 / 8.91; primary on primary-soft 5.49 / 5.96; focus on paper 5.23 / 7.41 and on inset 4.79 / 5.59; card vs paper 1.10 / 1.12; card vs inset 1.20 / 1.19; hairline on card 1.87 / 1.71 and on inset 1.55 / 1.70; strong boundary on card 3.59 / 3.61; demo marker text 8.76 / 10.81. The tool's shared pair list does not include `--focus` or `--primary-soft`. `contrast:patient` adds them with `--pairs patient` (D14), so they are checked on every run instead of by hand.

`contrast:patient` resolves every pair of the shared list through the aliases: `--bg`, `--glass`, `--glass-2`, `--ink-soft`, `--accent`, `--accent-ink`, `--eyebrow`, `--byline-accent`, `--aside-bg`, `--masthead-bg`, `--callout-bg`. Each alias is written exactly as `var(--canonical)`, with no fallback argument, because the tool follows only that form. A missing alias is now a failed run, not a `SKIP` (T-010 BR9.3).

The dark values are written twice, identically: in `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` and in `:root[data-theme="dark"] { … }` at column 0. The tool merges every column-0 `:root {` block for light and takes only the last column-0 `:root[data-theme="dark"] {` block for dark. So `patient.css` holds exactly one such dark block and no `:root[data-scheme=…] {` block. `check:motion` `M10-tokens` enforces this and compares the two dark copies, replacing the reviewer's manual comparison (BR1.7, BR1.8).

### 3.2 Type

| Role | Latin size / line-height | Bengali size / line-height (`:lang(bn)`) | Weight Latin / Bengali | Bengali family |
|---|---|---|---|---|
| Display | 2 rem / 1.2 (2.5 rem from 48 rem) | 2 rem / 1.4 (2.5 rem from 48 rem) | 700 / 600 | Hind Siliguri 600 |
| H1 | 1.5 / 1.25 (1.75 from 48 rem) | 1.5 / 1.45 (1.75 from 48 rem) | 700 / 600 | Hind Siliguri 600 |
| H2 | 1.25 / 1.3 | 1.25 / 1.5 | 700 / 600 | Hind Siliguri 600 |
| H3 | 1.125 / 1.35 | 1.125 / 1.5 | 600 / 600 | Hind Siliguri 600 |
| Body | 1 / 1.55 | 1.0625 / 1.7 | 400 / 400 | system `--bangla` |
| Small | 0.875 / 1.5 | 0.9375 / 1.65 | 400 / 400 | system `--bangla` |
| Label (kicker, field label) | 0.8125 / 1.4, uppercase with 0.08em tracking (Latin only) | 0.875 / 1.5, no transform, no tracking | 700 / 600 | system `--bangla` |

H3 and Label are not in the brief; they fill the steps between body and H2 that existing classes use. Tokens are named `--fs-<role>` and `--lh-<role>` and are set again under `:lang(bn)`, so a block marked `lang="bn"` inside an English page also gets Bengali metrics (BR2.1). Today's `html[data-lang="bn"]` rules in `patient.css` become `:lang(bn)` rules. Each Bengali reset of `text-transform` and `letter-spacing` stays beside its Latin rule (BR2.2); the existing `.kicker` Bengali `letter-spacing: .02em` becomes 0.

Fonts:
- `--sans` is the system UI stack, unchanged.
- `--bangla` is the system Bengali stack, unchanged.
- `--font-bn-heading` is the `next/font/local` variable for Hind Siliguri 600 (`display: 'swap'`, `preload: false`, the Bengali `unicode-range` in `entities.md` ENT-010). It is attached only when the locale is `bn`.
- Heading rules use `font-family: var(--font-bn-heading, var(--bangla))` under `:lang(bn)`, so English pages never request the font (BR2.4).

### 3.3 Shape and depth

| Token | Value | Use |
|---|---|---|
| `--radius-control` (alias `--r-sm`) | 8px | Buttons, fields, `.ctl` |
| `--radius-card` (aliases `--r-md`, `--r-lg`) | 16px | Panels, cards, sheets |
| `--radius-chip` | 999px | Chips, pills, tab pills |
| `--elev-0` | none (a 1px `--rule` border carries the edge) | Flat surfaces |
| `--elev-1` (alias `--shadow`) | light `0 1px 2px hsl(194 23% 15% / .06), 0 2px 8px hsl(194 23% 15% / .05)`; dark `0 0 0 1px var(--rule), 0 2px 8px hsl(0 0% 0% / .35)` | Cards |
| `--elev-2` | light `0 4px 16px hsl(194 23% 15% / .10)`; dark `0 0 0 1px var(--rule-hard), 0 8px 24px hsl(0 0% 0% / .45)` | Menus, sheets only |
| `--keyline`, `--keyline-hover` | `0 1px 0 var(--rule)`, `0 1px 0 var(--rule-hard)` | Kept for list rows that use them |
| `--target` | 44px | Minimum hit area, every pointer (BR3.3) |
| `--focus-ring` | `3px solid var(--focus)`, offset 2px | `:focus-visible` (BR3.4) |

`backdrop-filter` is removed from every patient rule (BR3.2). The masthead becomes `--surface` with a bottom `--rule` and `--elev-0`.

### 3.4 Spacing and layout (BR3.6)

| Token | Value | Use |
|---|---|---|
| `--space-1` | 4px | Icon gaps, hairline offsets |
| `--space-2` | 8px | Chip and pill gaps, label to field |
| `--space-3` | 12px | List-row gaps, small paddings |
| `--space-4` | 16px | Card padding (mobile), paragraph spacing |
| `--space-5` | 24px | Card padding (desktop), section heading to content |
| `--space-6` | 32px | Between panels |
| `--space-7` | 48px | Between page sections |
| `--space-8` | 64px | Hero padding (desktop) |
| `--grid-min` | 16rem | `repeat(auto-fit, minmax(var(--grid-min), 1fr))` card grids (browse, topic, related cards) |
| `--measure` | 72ch (kept: today's effective value, `patient.css` line 1105; read by `.opener-grid`, `.search`, `.a-grid`) | Reading width |

Fluid spacing uses `clamp()` between two steps, for example `clamp(var(--space-5), 5vw, var(--space-8))` for the opener. The sibling drafts' inline margins (`margin-top: 22px`, `18px`, `14px`, `26px`) map to `--space-5`, `--space-4`, `--space-3` and `--space-6`. The `.opener` (home hero) takes `background: var(--hero-wash)` here, so T-207 adds no rule for it.

## 4. Motion tokens (`motion.css`)

| Token | Value | Reduced value | Use |
|---|---|---|---|
| `--dur-instant` | 100ms | 100ms | Press, the only fades allowed in reduced mode |
| `--dur-fast` | 160ms | 100ms | Outgoing page, small fades |
| `--dur-base` | 240ms | 100ms | Incoming page, cards, step, sheet |
| `--dur-slow` | 360ms | 100ms | Publish tick (upper limit) |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | same | Entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | same | Leaving |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | same | Moving on screen |
| `--rise` | 12px | 0px | Route, reveal, sheet, scroll reveal |
| `--slide-step` | 24px | 0px | Composer step |
| `--press-scale` | 0.98 | 1 | Press feedback |
| `--stagger` | 40ms | 0ms | Reveal, first 6 children |

The reduced values are set inside `@media (prefers-reduced-motion: reduce) { :root { … } }` and `:root[data-motion="reduced"] { … }`. They are a second line of defence; the guards (BR5.3) are the first.

## 5. Components

### 5.1 `RouteTransition` (`components/patient/motion/RouteTransition.tsx`, client)

**Props:** `children` only.

**Behaviour (WF2; BR6.1, BR4.5, Q4 A):**
- It renders React 19.3's `ViewTransition` around one `div.page-frame`, so exactly one DOM node carries the name `page`.
- It is keyed by `usePathname()` from `@/i18n/routing`, which is locale-free. A change of path remounts the boundary: the old content exits and the new content enters as the shared `page` pair. Search-parameter changes, theme or motion toggles and server-action refreshes keep the same key, and the boundary's `update` is `none`, so they do not animate.
- It maps the enter, exit and share cases to one view-transition class, `rk-page`, which `motion.css` styles (§ 6.3).
- On mount it sets `document.documentElement.dataset.motionReady = ''` (the motion-ready mark, BR4.5). This is a DOM property write, not a style attribute, so it is CSP-safe.

```text
RouteTransition({children}):
  path = usePathname()                       // locale-free
  effect once: <html>.dataset.motionReady = ''
  return ViewTransition(key=path, name='page', class='rk-page', update='none')
           > div.page-frame > children
```

The exact prop spelling (`default`, `enter`, `exit`, `share`, `update`) follows the React 19.3 reference. Code Generation's spike confirms it on the pins and records it in the dependency-check entry.

### 5.2 `Reveal` (`components/patient/motion/Reveal.tsx`, server-compatible)

**Props:** `as?: 'ul' | 'ol' | 'div' | 'section'` (default `ul`), `className?: string`, `children`.

**Behaviour (WF3; BR6.2):** it renders the element with `data-reveal-list`. All timing is in CSS through `:nth-child`, so no per-child props and no `style` attributes are needed (BR9.2):

```text
:root[data-motion-ready] [data-reveal-list] > :nth-child(-n+6)   entry: opacity 0→1, translateY(var(--rise))→0
  delay  = (index − 1) × var(--stagger)    via :nth-child(2)…(6)
  :nth-child(n+7)                          no entry, visible at once
```

It must never wrap a static block (BR7.4); a dev-time warning is not needed because the reviewer checks it.

### 5.3 `PublishTick` (`components/patient/motion/PublishTick.tsx`, server-compatible)

**Props:** `children`, the confirmation text the caller passes (today `t('compose.publishedNote')`).

**Behaviour (WF6; BR6.4, BR8.1):**
- It renders `span.publish-tick` with an inline SVG (`aria-hidden="true"`, `focusable="false"`) holding two strokes, then the children as plain text.
- Stroke 1, the short arm, scales from 0 to 1 along its own axis over the first 40% of `--dur-slow`; stroke 2, the long arm, over the rest. Both use `transform` with `transform-box: fill-box` and the origin at the joint.
- In reduced mode or before motion-ready, the complete tick shows at once.
- It does not announce. The caller (T-306 for publish; T-102 for its account confirmations) speaks the same text through the existing `useAnnounce()` live region, so a second live region is never added (CR-004 BR4.3).

### 5.4 Hooks for later Units (no component)

| Hook | Primitive | Consumer |
|---|---|---|
| `[data-step-dir="forward" \| "back"]` on the incoming composer step panel | Step slide, 24 px from the inline end or start (BR6.3) | T-306 |
| `.reveal` on a home section after the first | Scroll reveal (BR6.6) | T-207 |
| `data-static="emergency"` or `data-static="disclaimer"` on one in-page block | Static group (BR7.2, BR7.3) | T-207, T-202, T-203, T-306, T-307 (any page that shows those blocks) |
| `.sheet`, `.overlay`, menus | Entry via `@starting-style` (BR6.7) | Existing `Sheet.tsx` and later menus |
| `data-press` on a pressable whose class is not in § 6's list | Press scale 0.98 (BR6.11) | Every later Unit; it never writes a press rule |

No morph hook exists (Q10 A, BR6.12). `ViewTransition` takes `name="page"` in `RouteTransition` only.

## 6. `motion.css` structure

1. **Tokens** (§ 4), with the reduced values.
2. **Static set** (BR7.1): `.demo, .colophon, #view-emergency, .emergency-lines, [data-static]` and their descendants get `animation: none !important; transition: none !important`. This is the only `!important` block, and the static set wins over everything.
3. **View-transition rules:**
   - `::view-transition { pointer-events: none }` (BR4.6).
   - `::view-transition-group(root), ::view-transition-old(root), ::view-transition-new(root) { animation: none }`: the root never animates.
   - `.masthead`, `.demo`, `.colophon`, `#view-emergency` and `[data-static="emergency"]`, and `[data-static="disclaimer"]` get the names `masthead`, `demo`, `colophon`, `emergency` and `disclaimer`. Their groups get `animation: none` and a `z-index` above `page`; their `::view-transition-old(...)` gets `opacity: 0` (old state hidden at once) and `animation: none` (BR7.2).
   - `::view-transition-group(page) { animation: none }`: no morph.
   - Inside both guards, `::view-transition-old(*.rk-page)` fades out over `--dur-fast` with `--ease-in`, and `::view-transition-new(*.rk-page)` fades in and rises from `--rise` over `--dur-base` with `--ease-out` (BR6.1).
   - Reduced mode, for both the media query and `:root[data-motion="reduced"]`: `::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important }` (BR5.4).
4. **Primitives**, each inside `@media (prefers-reduced-motion: no-preference)` with selectors that start `:root:not([data-motion="reduced"])`, and entry primitives also needing `[data-motion-ready]`:
   - Reveal (`[data-reveal-list]` children, `@starting-style`).
   - Step slide (`[data-step-dir]`, `@starting-style`).
   - Sheet entry (`.sheet`, `.overlay`, `@starting-style`). The overlay's opacity fade may run at `--dur-instant` in reduced mode too.
   - Press: `:active` scale on `.btn, .ctl, .chip, .seg button, .opt, .tabs a, .pillrow a, .pillrow button, .browse-card, .doc-entry, .related-card, .react, .mini-row, .c-mode, .case, [data-press]`. This covers the sibling drafts' `a.chip`, `a.browse-card`, `a.mini-row`, `.pillrow a` and `.doc-entry` (whose `:active` matches when its inner link is pressed). The selector ends `:not(.demo *, .colophon *, #view-emergency *, [data-static] *, .emerg-card, .emergency-lines a)`, so nothing in the static set scales. `M7-static` exempts names inside `:not()`.
   - Publish tick (`.publish-tick` strokes).
   - Scroll reveal (`.reveal` inside `@supports (animation-timeline: view())`).
   - Reading bar (`.progress i` inside `@supports (animation-timeline: scroll())`). It gets `display: none` in reduced mode.

Removed from `patient.css` and not carried over (each breaks a rule):

| Today | Breaks | Now |
|---|---|---|
| `.view { animation: rise }` | BR4.5 (first paint) | Route motion comes only from `RouteTransition` |
| `.display`, `.lede`, `.story-lead`, `.opener p` `qc-rise` (700–800 ms, on load) | BR4.1, BR4.5 (LCP animated in) | Static |
| List rows `qc-rise` with `nth-of-type` delays | BR4.5, BR6.2 | `Reveal` where a later Unit wants it |
| `.spectrum span`, outcome bars `bar-in` 800 ms | BR6.10, BR4.1 | Static at final value |
| `.tray` `tray-in` `translateY(100%)` | BR4.3 (large pan) | Sheet-entry rise |
| `.sheet` `sheet-in` `scale(.98)` 320 ms | BR4.1 | Sheet-entry rise, tokens |
| `.skip` `transition: top` | BR4.2 | Shown at once on focus |
| `.tabs a`, `.ctl` colour transitions; `.mini-row` `transition: border-color 200ms, transform 260ms` | BR4.2, Q5 A | Instant colour |
| The 13 hover lifts: `.ctl`, `.btn`, `.chip`, `.browse-card`, `.emergency-lines a`, `.doc-entry`, `.related-card`, `.react`, `.mini-row`, `.c-mode`, `.opt`, `.case` and `.emerg-card` (`patient.css` 224, 286, 436, 445, 458, 524, 717, 730, 754, 770, 807, 931, 1553), plus the later `transform: none` overrides at 1474, 1477 and 1864 | BR6.5, BR7.1 (`.emerg-card` and `.emergency-lines a` are emergency guidance; T-207 F6) | No hover lift; `M9-hover` fails any `:hover` transform |
| `.tabs a:hover::after { transform: scaleX(.4) }` and its current-tab twin (2057–2058) | BR6.5 | The current tab's bar is static at full width; hover changes colour only |
| `.panel`, `.masthead` `backdrop-filter` | BR3.2 | Solid surfaces |
| `body[data-motion="off"]` and the blanket `prefers-reduced-motion` rule in `patient.css` | BR4.7, BR5.4 | Replaced by the guards and reduced overrides in `motion.css` |

## 7. Restyled shell parts (no markup change expected)

| Part | Class | Look under FD-091 |
|---|---|---|
| Demo marker | `.demo` | `--warn-bg` band, `--warn-ink` text, Latin uppercase label tracking 0.08em, Bengali none; never animated; static group `demo` |
| Masthead | `.masthead`, `.brand*` | Solid `--surface`, bottom `--rule`; the brand mark is a teal disc with a small `--decor` arc (decoration); the wordmark is in Hind Siliguri 600 on `bn` |
| Tabs | `.tabs a[aria-current]` | Pill (`--radius-chip`), 44 px tall; current tab is `--primary` text on `--primary-soft` with a 2 px `--primary` underline bar (non-colour cue, BR1.4) |
| Controls | `.ctl` (`#account`, `#lang`, `#theme`, `#motion`) | 44 × 44 px, `--radius-control`, `--rule-strong` border; pressed toggles get the `--primary-soft` fill plus a `--primary` border; press scale 0.98 |
| Compose CTA | `.btn.cta-write` | Primary button: `--primary` fill, `--primary-ink` label, `--primary-2` on hover, 44 px |
| Reading bar | `.progress i` | 2 px `--primary`, scroll-scaled; hidden in reduced mode |
| Colophon | `.colophon`, `.foot-nav`, `.foot-demo` | `--surface-2` band; disclaimer in `--ink-muted` body size (not small print: 1 rem, line-height per language); never animated; static group `colophon` |
| Skip link | `.skip` | `--primary` fill, shown at once on focus, 44 px |
| Panels and cards | `.panel` and card classes | `--surface`, `--radius-card`, `--elev-1`, 1px `--rule` |
| Sheet | `.overlay`, `.sheet` | `--overlay-scrim`, `--surface`, `--elev-2`, entry rise; focus trap unchanged |

No class is renamed. New classes and attributes (`page-frame`, `publish-tick`, `data-reveal-list`, `data-step-dir`, `data-static`, `data-motion-ready`, `data-motion="reduced"` on `<html>`) are listed in the hand-off. Every rule added to `patient.css` for this Unit carries the comment `/* added: T-011 <reason> */` (team.md Code Style).

## 8. `scripts/css-motion-check.mjs`

- **Zero dependencies**, like T-010's `scripts/check-identity.mjs`: a brace-aware scanner that tracks the at-rule stack (`@media`, `@supports`, `@starting-style`, `@keyframes`) and the selector of each rule. It is linted (`scripts/**/*.mjs` with Node globals) and formatted by Prettier, like the other root scripts. It exports its scan function, so the tests call it on fixture text without spawning a process.
- **Parsing:** declarations, not lines. A value Prettier splits over several lines (a multi-value `transition`, a long `box-shadow`) is read whole, and the finding reports its first line. Attribute selectors match with either quote style. Numbers match with or without a leading zero (`.98` and `0.98`).
- **Default inputs:** `apps/web/src/styles/patient.css` and `apps/web/src/styles/motion.css`. Explicit file arguments replace the defaults.
- **Findings** (each prints `file:line  <code>  <reason>`; exit 1 if any, 0 otherwise):

| Code | Fails when | Rule |
|---|---|---|
| `M1-property` | A transition lists a property outside `transform`, `opacity`, uses `all`, or omits the property; a keyframe declares anything but `transform`, `opacity` | BR4.2 |
| `M2-duration` | A literal time in `transition*`, `animation*` or a delay outside a `--dur-*` or `--stagger` definition (`calc()` of tokens allowed) | BR4.1 |
| `M3-iteration` | `animation-iteration-count` other than 1, `infinite`, or `alternate` | BR4.4 |
| `M4-scale` | A `scale(...)` value below 0.98 or above 1.02 | BR4.3 |
| `M5-guard` | A rule that moves (transform transition, transform keyframe, view-transition animation) outside `@media (prefers-reduced-motion: no-preference)` or without a selector starting `:root:not([data-motion="reduced"])` | BR5.3 |
| `M6-file` | Any motion declaration in `patient.css` | BR4.7 |
| `M7-static` | A motion rule whose selector names `.demo`, `.colophon`, `.emergency-lines`, `.emerg-card`, `#view-emergency` or `[data-static` outside a `:not(...)`. Exempt: the static block itself (`animation: none`, `transition: none`) and the rules that give the static groups their `view-transition-name` | BR7.4 |
| `M8-bangla` | A rule sets uppercase or non-zero letter-spacing and no `:lang(bn)` rule resets it for the same selector | BR2.2 |
| `M9-hover` | A rule whose selector contains `:hover` declares `transform`, `translate`, `scale` or `rotate` | BR6.5 |
| `M10-tokens` | `patient.css` has not exactly one column-0 `:root[data-theme="dark"] {` block; its custom-property names or values differ from the `prefers-color-scheme: dark` block's; or a column-0 `:root[data-scheme=` block exists | BR1.7, BR1.8 |
| `M11-vt-name` | A `view-transition-name` value other than `page`, `masthead`, `demo`, `colophon`, `emergency`, `disclaimer` or `none` | BR6.12 |

- **Proof that it can fail:** `scripts/css-motion-check.test.mjs`, in T-010's `tooling` Vitest project. It has one planted fixture per code, including `transition: width` (the acceptance row), a Prettier-formatted multi-line `transition`, and a single-quoted guard. It also has one clean fixture that must pass. `pnpm check` runs it on every run inside `test:coverage`, so `check:motion` itself is a plain `node scripts/css-motion-check.mjs` (team.md: "A test must be able to fail"; D11).
- **Smoke:** the Unit's smoke assertion is the Vitest `motion.smoke.test.tsx` (§ 9). The check needs no smoke file of its own.
- **Non-goals:** it does not judge the LCP element or runtime behaviour, which Lighthouse and the smoke cover. It does not see the browser's own view-transition keyframes, which is one reason for Q10 A.

### 8.1 `tools/contrast.mjs --pairs patient` (D14)

- **The flag** appends a pair set after the shared `PAIRS`:
  - `['--focus','--paper','focus ring on page',3,true]`, and the same pair on `--surface` and `--surface-2`;
  - `['--primary','--primary-soft','current tab text',4.5]`;
  - `['--ink','--primary-soft','text on primary wash',4.5]`.
- **Without the flag**, the pair list, thresholds and output are unchanged (T-010 BR9.1, BR9.4).
- **A missing token** in the extra set is a skip, so in `--tokens` mode it fails the run like any other (T-010 BR9.3).
- **Test:** one new case in `scripts/contrast.test.mjs` runs the flag on a temporary stylesheet that lacks `--focus` and expects exit 1 naming it. The existing three cases stay as they are.

## 9. Tests (test-after, per `team.md` Testing Posture)

Component tests (Vitest, jsdom), each in `en` and `bn`, inside the translation provider:

| Test | Asserts | Rules |
|---|---|---|
| RouteTransition sets the motion-ready mark | After mount, `<html>` has `data-motion-ready`; children render inside `div.page-frame` | BR4.5, BR6.1 |
| RouteTransition keys by locale-free path | Same path under `/en` and `/bn` gives the same key; a new path a new key | BR6.1 |
| Reveal renders the list hook | `data-reveal-list` on the chosen element; no `style` attribute on any child; 8 children all render | BR6.2, BR9.2 |
| PublishTick renders text and a hidden tick | Text equals the caller's string in each language; SVG has `aria-hidden="true"`; no live region added | BR6.4, BR8.1 |
| Shell renders in both languages | Masthead, tabs, controls, demo marker and colophon render; `html` gets the font variable only for `bn`; `data-motion="reduced"` appears only when the cookie is off. These are two new cases in T-010's `app/layouts.test.tsx`, using its `givenRequest` builder and its `@/i18n/routing` mock (which already supplies `usePathname`) | BR2.4, BR5.2, BR7.1 |
| Static elements carry no motion hook | `.demo` and `.colophon` have no `data-reveal-list` ancestor and no `.reveal` | BR7.4 |

Test rules (BR9.9):
- **Languages and fixtures.** Every component test renders in `en` and `bn` inside the translation provider, with messages read from `packages/i18n/messages`, as `layouts.test.tsx` does. Nothing in `apps/web` imports `test-support` (FD-040; lint fails otherwise). Test names read as sentences, and no test asserts on a class name or an internal call.
- **Font mock.** `vitest.setup.ts` mocks `next/font/local` once, returning `{ className: 'font-bn-heading', variable: 'font-bn-heading-var', style: { fontFamily: 'Hind Siliguri' } }`. `localFont()` throws without Next's build transform (F4), and every web test that renders the locale layout needs the stand-in.
- **Coverage.** `apps/web` is at 418 / 420 lines after T-010. The three components, `bn-heading.ts` and the layout lines are counted (`apps/web/src/**`), and the tests above cover each branch: motion-ready set, the `data-motion` attribute present and absent, the font class for `bn` and absent for `en`. A drop below 80% is answered with tests, never an exclusion (T-010 BR6.4–BR6.5).
- **Load stability.** If a new test file times out on its first test under load, it takes T-010's `beforeAll` warm-up pattern (ISS-296, ISS-297); no per-test timeout is raised.

CSS-level checks:
- `pnpm check:motion`, with its planted fixtures in `scripts/css-motion-check.test.mjs`;
- `pnpm contrast` (staff palette, unchanged output; `scripts/contrast.test.mjs` unchanged and green);
- `pnpm contrast:patient` (with `--pairs patient`, and its new test case).

Smoke:
- One Vitest `motion.smoke.test.tsx` beside the motion components asserts that the shell renders `RouteTransition`'s frame and the static set, in both languages.
- One Playwright `apps/web/e2e/smoke/motion.spec.ts` (Q7 A, Chromium, against the built app) covers four cases:
  1. **Motion on:** clicking a tab runs animations on `::view-transition-new(page)` (seen through `document.getAnimations()`), lasting no longer than `--dur-base`, and none on the static groups.
  2. **`reducedMotion: 'reduce'`:** the same click runs no view-transition animation, and the new page shows its heading.
  3. **`rk.motion=off` cookie:** the same as case 2.
  4. **Reveal:** a list of 8 items inserted after load animates items 1–6 only.

  The spec does not assert pixels.

  Playwright files and how they run:
  - `apps/web/playwright.config.ts` has `testDir: 'e2e'`, one Chromium project, and a `webServer` that runs `next start` on the built app. Later Units' specs (T-102's `auth.spec.ts`) run under the same `smoke:e2e`.
  - The spec is linted with its own `apps/web/e2e/tsconfig.json` and type-checked by `typecheck`'s second `tsc -p e2e`.
  - It is excluded from the Vitest web project.
  - Prettier formats it. ESLint's boundary rules do not cover it, because it is outside `apps/*/src`.
  - The browser binary comes from `npx playwright install chromium`, recorded in `unit-test-instructions.md`. It is not run in CI until T-503.

Existing tests: no assertion is removed or skipped. Tests that match on class names stay valid because no class is renamed.

UI gates: `npx impeccable detect apps/web/src --no-advisory`. The `side-tab` ignore entry for `patient.css` in `.impeccable/config.json` gives "byte-for-byte port" as its reason, which is no longer true; if the restyle removes the pattern, the entry is stale (proposed ISS row).

## 10. Interaction by locale and motion mode

| Action | Full motion (`en` and `bn` alike) | Reduced (OS or switch) |
|---|---|---|
| Open another tab or page | Old content fades out in 160 ms, new fades in and rises 12 px in 240 ms; masthead, demo marker, colophon and emergency blocks stay still | Instant swap |
| Back or forward | Instant swap (browser skips view transitions on history traversal) | Instant swap |
| Theme or motion toggle | No page motion; colours change at once | Same |
| Language toggle | Locale change remounts the layout; the new page enters like a route change | Instant swap |
| Press a button or control | Scales to 0.98 over 100 ms | Colour change only |
| Open a sheet | Fades in and rises 12 px over 240 ms | Appears at once (scrim may fade in 100 ms) |
| A list arrives after load | First 6 items rise and fade with a 40 ms stagger | Appear at once |
| Publish succeeds (T-306), or a T-102 confirmation shows | Tick draws over 360 ms beside the text | Complete tick and text at once |
| Hover a card, chip or control | Colour, background or border changes at once; nothing lifts | Same |
| Scroll the home page (T-207) | Sections after the first fade and rise as they enter | Static |
| Keyboard focus | 3 px ring appears at once | Same |

In `bn`, headings switch to Hind Siliguri 600 once the font arrives (`swap`). Line-heights are unitless multiples of fixed sizes, so the swap cannot change line-box height; it can only rewrap a line whose width changes, and that shift is measured in the Lighthouse baseline (BR9.5).
