# Functional specification — U45 `t-011-patient-design-and-motion-system`

| Field | Value |
|---|---|
| Unit | U45 `t-011-patient-design-and-motion-system` (kind `ui`, size XL, not high risk); depends on U3 (T-010); every patient UI Unit depends on it (T-102, T-202, T-203, T-206, T-207, T-306, T-307, T-308, T-402, T-409, T-501) |
| Source | T-011 (`docs/implementation/tasks/T-011-patient-design-and-motion-system.md`) |
| Stories | US2.4 (AC2.4.1–AC2.4.6) and US2.3 (AC2.3.1–AC2.3.6) — `unit-of-work-story-map.md` |
| Requirements | NFR13 (visual and motion quality), FR95 (accessible controls), NFR1 (performance reference), NFR4 (responsive), NFR5 (browsers), NFR6 (accessibility), NFR7 (localization) — `requirements.md` |
| Decisions | FD-091 (redesign and motion), FD-032 (plain CSS, no animation library), FD-030 (staff console keeps Chart Tray), FD-024 (equal languages), FD-042 (Bengali copy review); CR-004 (motion toggle stays silent) |
| Upstream design | `components.md`: no domain component owns presentation. `contract-summary.md`: "FD-091 (patient redesign) and U45 T-011: presentation only. U45 has no runtime contract"; C14 is unchanged |
| Questions | Q1–Q10 in `functional-design-questions.md`, all answered A. Q1–Q8 on the owner's standing instruction of 2026-10-27; Q9–Q10 decided by the agent under the owner's no-questions instruction of 2026-10-29. Each is added to `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises this draft. This specification follows A throughout; § 10 lists what changes under each other option |
| Status | Draft written ahead of the stage from the CR-011 Bolt branch, refreshed on 2026-10-29 against `bolt/t-010-boundary-lint-and-ci` (T-010 built, not yet merged). Code Generation starts from `main` after T-010's squash merge |

This file is the source of truth for the Unit's workflows and state transitions. `entities.md` holds the shape of the design-system objects and `rules.md` the numbered decision rules. Concrete token values are in `frontend-components.md` § 3–4. The entity-relationship view (§ 6) and the rules summary at the end are derived from those files.

**Refreshed 2026-10-29 after T-010.** What changed:
- **Gate order.** `pnpm check` is T-010's nine steps. This Unit adds `contrast:patient` and then `check:motion` after S8 `contrast`, and `build` stays last (WF8, T-010 BR8.4).
- **Contrast.** `contrast:patient` runs T-010's fail-closed `--tokens` mode on `patient.css`, plus a new `--pairs patient` set for the focus ring and the current-tab wash. `pnpm contrast` keeps its exact output, which closes T-011's half of ISS-279 (BR1.2, D14).
- **One dark token block.** `patient.css` gets exactly one column-0 dark token block, identical to the media-query copy, and no scheme block. The CSS check enforces this, because a second block would make the contrast tool check light values as dark ones (BR1.8).
- **Prettier.** `patient.css` and `motion.css` enter Prettier's scope; the staff and shared stylesheets stay ignored. A CSS override keeps double quotes, which the contrast tool's block pattern needs (Q9, BR9.8).
- **Tests and tooling.** The CSS check's planted violations move to a Vitest file in T-010's `tooling` project. `--self-test` is dropped (D11). The Playwright spec is kept out of the Vitest web project and gets its own tsconfig. `next/font/local` is mocked in the web test setup. The new components keep `apps/web` at or above 80% line coverage, with tests in `en` and `bn` that never import `test-support` (BR9.9).
- **Hover and press.** All 13 hover-lift rules are removed, `.emerg-card:hover` included (T-207 F6). The press list covers the sibling drafts' classes. A generic `[data-press]` hook means later Units never add motion rules (BR6.5, BR6.11; T-202 F7, T-203 F11, T-207 F15).
- **Morphs.** No shared-element morph. This decides T-202 Q12 and T-203 Q15 (Q10, BR6.12).
- **Spacing tokens.** Spacing and layout tokens are added, because the T-202, T-203, T-207 and T-102 drafts rely on them (BR3.6). The home hero wash is applied to `.opener`.
- **Records.** `PublishTick`'s consumers are corrected to T-306 (publish) and T-102 (account confirmations); T-308 is the evidence viewer. A Bolt merges only after a green CI run on its `bolt/**` head (BR9.4). New findings are in § 11.

## 1. What changes, in one paragraph

The patient side swaps the 04b "Quiet Clinic" look for FD-091's "Warm Paper, Soft Depth":
- **Look:** warm paper pages, white cards with soft shadows, one teal primary, a warm amber used only as decoration, and a larger type scale with its own Bengali sizes and line-heights.
- **Fonts:** Hind Siliguri 600 for Bengali headings; system fonts for everything else.
- **Controls:** 44 px targets and a 3 px blue focus ring.
- **Motion:** CSS-only, in one file. Pages fade and rise on navigation, lists stagger their first six items, the composer's steps slide, sheets rise in, presses give a small squeeze, and a publish shows one drawn tick. Only `transform` and `opacity` animate, and only after the first paint.
- **Reduced motion:** both the operating-system setting and the existing in-app switch turn all movement off, including route transitions.
- **Never animated:** the demo marker, the medical-advice disclaimer and the emergency guidance; during route changes they never move and are never covered.
- **Staff console:** unchanged.
- **New checks:** `contrast:patient` checks the new palette (fail closed) and `check:motion` checks the patient CSS. Both join `pnpm check` after `contrast`, so they also run in CI on every `bolt/**` push.

## 2. As is (baseline on `main`)

| Element | Where | Today |
|---|---|---|
| Tokens | `tokens.css` (shared with the staff console via `globals.css`); `patient.css` carries its own concept-04 layer, the 04b block and scheme A/B/C blocks that override it on patient pages | 04b teal-grey palette, rounded system faces, radii 10/16/22 |
| Patient motion | `patient.css`, 57 lines with `transition` or `animation` | `.view` rises on every mount; `.display`, `.lede` and first list rows rise 700–800 ms on load; distribution bars grow from 0 in 800 ms; colour transitions on tabs and controls; 13 hover-lift rules (`.ctl`, `.btn`, `.chip`, `.browse-card`, `.emergency-lines a`, `.doc-entry`, `.related-card`, `.react`, `.mini-row`, `.c-mode`, `.opt`, `.case`, `.emerg-card`), two of them on emergency guidance, plus a hover `scaleX` on the tab underline; `backdrop-filter` blur on `.panel` and `.masthead`; two column-0 `:root[data-theme="dark"]` blocks (lines 115 and 1360) |
| Reduced motion | `patient.css` | A blanket `prefers-reduced-motion: reduce` rule (all durations 1 ms) and `body[data-motion="off"]` (animations none); neither reaches `::view-transition-*` |
| Motion switch | `ThemeControls` `#motion`, `rk.motion` cookie `on`/`off`, `<body data-motion>` set by `[locale]/layout.tsx` | Works; silent (CR-004 BR4.4) |
| Fonts | `tokens.css` stacks | No web font |
| Contrast | `pnpm contrast` = `node tools/contrast.mjs --tokens apps/web/src/styles/tokens.css` (T-010) | Checks the staff palette's fixed names in `hsl()`. In `--tokens` mode it fails closed: an unreadable file, no column-0 `:root {` or `:root[data-theme="dark"] {` block, or any pair skipped for a missing token exits 1. It merges every bare `:root {` block, takes only the **last** dark block, and treats every `:root[data-scheme=…] {` block as another variant. `scripts/contrast.test.mjs` pins `tokens.css` to the prototype's results |
| Gate | `pnpm check` (T-010) | Nine steps, fail fast: typecheck → lint (boundaries included) → lint:boundaries → format:check → check:identity → test:coverage (80% lines per package, untested files count) → i18n:check → contrast → build |
| Format | `prettier --check .`, `singleQuote: true`, `.prettierignore` | `apps/web/src/styles/**` is ignored "until T-011 decides for its own CSS"; `apps/`, `scripts/` and the root are in scope |
| Coverage | `vitest.workspace.ts` | `apps/web/src/**/*.{ts,tsx}` counted, tests excluded; `apps/web` 418 / 420 lines (99.5%) after T-010 |
| Lint scope | `eslint.boundaries.mjs` | `apps/web/src/components` is `web-components` (may import `contracts`, `i18n`, server actions, `web-shared` = `src/lib` and `src/i18n`); no Node built-ins outside tests; nothing in `apps/*` imports `test-support`. `apps/web/e2e/**` is outside every element and every tsconfig |
| CI | `.github/workflows/check.yml` | Runs `pnpm check` and `pnpm smoke` on pushes to `main` and `bolt/**`; a Bolt merges only after a green run on its head |
| Browser tests | none | No Playwright in the repository; `pnpm smoke` runs Vitest `*.smoke.test.*`. The Vitest web project uses Vitest's default include, which also matches `*.spec.ts` |

## 3. Workflows

### WF1 — A patient page renders (first paint)

1. The `[locale]` layout renders `<html lang data-lang data-theme>` as today, plus:
   - `data-motion="reduced"` when the `rk.motion` cookie reads `off` (BR5.2);
   - the Hind Siliguri font variable class when the locale is `bn` (BR2.4). The `next/font/local` call sits in its own module, `app/fonts/bn-heading.ts`, so the web test setup can stand in for it (BR9.9).

   `<body data-app data-motion>` is unchanged.
2. The patient layout loads `globals.css` (with the staff palette in `tokens.css`), then `patient.css`, whose token block redefines every token the patient side reads (BR1.5, BR1.6), then `motion.css`.
3. The theme picks light or dark values: an explicit `data-theme` first, otherwise the system colour scheme (BR1.7).
4. Text takes the Latin or the `:lang(bn)` type tokens (BR2.1). Bengali headings name the Hind Siliguri variable first, so only `bn` pages request the font, and the system Bengali face shows until it arrives (`swap`, BR2.4).
5. Everything the server rendered appears at full opacity in its final place. No entry rule applies yet, because `data-motion-ready` is not set (BR4.5). This protects the LCP element.
6. After hydration, `RouteTransition` sets `data-motion-ready` on `<html>`. Only elements inserted from now on can run entry motion.

### WF2 — Route change inside the patient app

1. The reader activates a link (tab, card, footer link) to another locale-free path.
2. Next.js runs the navigation as a React transition. `RouteTransition`'s key changes, so its old boundary exits and the new one enters as the `page` pair (BR6.1).
3. If the browser lacks view transitions, or this is a back or forward navigation, the page swaps at once. Stop.
4. The browser captures the old state. The root and the static groups (`masthead`, `demo`, `colophon`, and `emergency` or `disclaimer` when present) are captured separately from `page` (BR7.2).
5. The DOM updates to the new page; Next.js scrolls as it does today.
6. Effective motion is full:
   - the old `page` image fades out over 160 ms (`--ease-in`);
   - the new `page` image fades in and rises 12 px over 240 ms (`--ease-out`);
   - the `page` group does not morph;
   - the root swaps at once;
   - each static group shows only its new state, above `page`, from the first frame.
   - Pointer input passes through to the new page throughout (BR4.6).
7. Effective motion is reduced: every view-transition pseudo-element has `animation: none`, so the swap is instant (BR5.4).
8. A duplicate static name on the new page makes the browser skip the transition: a plain swap, with a console error that Build and Test watches for (BR7.3).
9. The view announcement (CR-004) runs as today, 150 ms after the view mounts; motion does not change it.

```mermaid
sequenceDiagram
  actor Reader
  participant Link as Patient link
  participant RT as RouteTransition
  participant VT as Browser view transition
  participant Static as Static groups
  participant Page as page group
  Reader->>Link: activate
  Link->>RT: navigation in a transition, new path key
  alt no view transitions, or back or forward
    RT-->>Reader: plain swap
  else supported
    RT->>VT: start, old and new page boundaries
    VT->>Static: capture masthead, demo, colophon, emergency, disclaimer
    VT->>Page: capture old and new content
    alt effective motion full
      Page-->>Reader: old fades out 160 ms, new fades in and rises 12 px in 240 ms
      Static-->>Reader: new state at once, above page
    else effective motion reduced
      VT-->>Reader: no animation, instant swap
    end
  end
```

Text fallback: activate a link → new path key → unsupported or history navigation: plain swap → supported: capture the static groups and the page separately → full motion: page fades out, then fades in and rises, while static groups show at once on top → reduced motion: instant swap.

### WF3 — A list arrives after the first paint

1. A page or a later Unit renders a list inside `Reveal` (`data-reveal-list`).
2. If the list is part of the first paint, nothing animates (BR4.5).
3. If the list's children are inserted after motion-ready (client navigation, filter results, "load more") and motion is full, children 1–6 fade in and rise 12 px over 240 ms. Each starts 40 ms after the one before, so the sixth starts at 200 ms. Children from the 7th on appear at once (BR6.2).
4. In reduced mode all children appear at once (BR5.4).
5. Static blocks are never placed in a `Reveal` list (BR7.4).

### WF4 — Reduced motion: the operating-system setting and the in-app switch

1. Effective mode = reduced if `prefers-reduced-motion: reduce` OR `rk.motion` = `off`; otherwise full (BR5.1).
2. The reader activates `#motion`. The existing handler writes the opposite of the stored value and refreshes, as today. The layout re-renders `<html data-motion="reduced">` (or removes it), and `<body data-motion>` as before (BR5.2). Nothing is announced (CR-004 BR4.4).
3. When the attribute or the media query changes, motion rules stop matching at once. A CSS animation whose rule no longer matches is cancelled and its element shows its final static style; nothing new starts. A view transition already under way can run its remaining time, at most 240 ms.
4. With the operating system asking for reduced motion, the in-app switch cannot restore motion. Its pressed state shows only the app's own setting.

### WF5 — Press, hover and focus feedback

1. Hover: colour, background and border change at once; nothing moves. No `:hover` rule sets a transform, the tab underline included (BR6.5, `check:motion` `M9-hover`).
2. Press (`:active`) with full motion: the pressable scales to 0.98 over 100 ms and back on release. Pressables are the listed shell and shared classes (`frontend-components.md` § 6) and any element a later Unit marks `data-press` (BR6.11). With reduced motion there is a colour change only. Elements in the static set never scale: emergency cards and call links, the colophon's links, the demo marker. The press selector excludes them with `:not(…)` (BR7.1).
3. Keyboard focus: the 3 px `--focus` ring with a 2 px offset appears at once, in every mode (BR3.4).

### WF6 — Publish confirmation (built by T-306 on this primitive; T-102 reuses it)

1. A publish succeeds. T-102 uses the same primitive for its account confirmations, such as a confirmed email or a changed password.
2. T-306 (the composer) renders `PublishTick` with `compose.publishedNote` as its text, and announces the same text through the existing live region (BR6.4).
3. With full motion, the tick's short arm draws over the first 40% of 360 ms and the long arm over the rest, by `transform` only. With reduced motion, the full tick shows at once.
4. Nothing else happens: no confetti, badge, points, streak, counter or nudge to share (BR8.1).

### WF7 — Other primitives

| Primitive | Trigger | Full motion | Reduced | Rules |
|---|---|---|---|---|
| Composer step slide (T-306) | Next or previous step | Incoming panel slides 24 px from the direction of travel with a fade, 240 ms, `--ease-standard`; outgoing leaves at once | Instant | BR6.3 |
| Sheet or menu entry | Opens | Fade and 12 px rise, 240 ms, via `@starting-style`; closing is instant | Instant (scrim may fade in 100 ms) | BR6.7 |
| Home scroll reveal (T-207) | Section after the first enters the viewport | Fade and 12 px rise across the entry range, inside `@supports (animation-timeline: view())` | Static | BR6.6 |
| Reading-progress bar | Scroll | `scaleX` follows scroll, inside `@supports (animation-timeline: scroll())` | Hidden | BR6.9 |
| Skeleton (any later Unit) | Load over 1 s | Static block sized to the final layout | Same | BR6.8 |
| Data displays | Render or update | Appear at final value; no growth from 0 | Same | BR6.10 |

### WF8 — Checks (Code Generation and Build and Test)

1. Before building, Code Generation:
   - appends dependency-check entries: `next/font/local` and Hind Siliguri, Playwright, React `ViewTransition` on React 19.3.0 and Next 16.3.4, and impeccable (BR9.7). The Prettier 3.9.6 entry of 2026-10-28 is reused while it is under 3 days old. The Playwright version must be one that pnpm 11's `minimumReleaseAge` accepts (ISS-285 shows the policy refusing a day-old release);
   - adds `*.woff2 binary` to `.gitattributes` before the font file is committed (ISS-178's lesson);
   - runs the half-day spike on `RouteTransition` (keyed boundary in the layout, Q4) and on the static groups (Q8).
2. `pnpm check` runs eleven steps after this Unit, fail fast (T-010 BR8.1, BR8.4):
   - S1–S7 are T-010's: typecheck, lint, lint:boundaries, format:check, check:identity, test:coverage, i18n:check;
   - S8 `contrast` checks the staff palette, with unchanged output;
   - S8a `contrast:patient` checks the patient palette, fail closed, with `--pairs patient` (BR1.2);
   - S8b `check:motion` (BR9.1);
   - S9 `build`.

   `test:coverage` also runs the CSS check's planted-violation tests in the `tooling` project, so the check proves it can fail on every run (D11). It also holds `apps/web` at 80% lines or more with the new components counted (BR9.9). `format:check` covers `patient.css`, `motion.css`, the new scripts, the Playwright config and spec (BR9.8).
3. `pnpm smoke` runs the cumulative Vitest smoke suite, including the new motion smoke; it stays Vitest-only, as CI runs it. `pnpm --filter @rogikotha/web smoke:e2e` runs the Playwright specs under `apps/web/e2e/` against the built app; this Unit adds `motion.spec.ts`. It runs at Build and Test, and it joins `pnpm check` and CI when T-503 extends the configuration (BR9.4).
4. The Bolt branch `bolt/t-011-patient-design-and-motion-system` is pushed, and CI's `check` workflow must be green on its head before the squash merge. The run URL is recorded in the Build and Test record (T-010 BR10.4, BR9.4).
5. Build and Test then:
   - executes every acceptance row of T-011;
   - runs the Bengali rendering check (BR2.5) and the viewport and zoom run (BR3.5);
   - records the Lighthouse baseline (BR9.5);
   - records `pnpm check`'s wall clock against ISS-298.
6. The hand-off lists renames, final colours, the font size, the baseline, the out-of-owned-path files (§ 11) and the task-text corrections (BR9.7).

## 4. State transitions

### Effective motion mode (per page view)

```mermaid
stateDiagram-v2
  [*] --> Full: OS no-preference and switch on
  [*] --> Reduced: OS reduce or switch off
  Full --> Reduced: OS setting turns to reduce
  Full --> Reduced: in-app switch turned off
  Reduced --> Full: OS no-preference and switch on again
```

| From | Event | To | Effect |
|---|---|---|---|
| (load) | OS `no-preference` and `rk.motion` `on` | Full | All primitives available after motion-ready |
| (load) | OS `reduce` or `rk.motion` `off` | Reduced | Reduced behaviour of every primitive; no view-transition animation |
| Full | OS setting changes to `reduce` | Reduced | Media query stops matching; running CSS animations are cancelled, none starts (WF4 step 3) |
| Full | `#motion` activated (switch off) | Reduced | Refresh renders `data-motion="reduced"` |
| Reduced | Both sources allow motion again | Full | Motion resumes for new events only |

### Document motion readiness

| From | Event | To | Effect |
|---|---|---|---|
| Server-rendered | First paint | Painted, not ready | Every element at full opacity in place; no entry motion (BR4.5) |
| Painted, not ready | Hydration completes; `RouteTransition` mounts | Ready (`data-motion-ready`) | Entry primitives apply to elements inserted from now on |
| Ready | Full page reload | Server-rendered | Mark gone until hydration again |

### Route transition (one navigation)

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Swap: unsupported, history navigation or reduced
  Idle --> Capturing: supported and full motion
  Capturing --> Swap: duplicate static name
  Capturing --> Animating: snapshots taken
  Animating --> Idle: page animations end, at most 240 ms
  Swap --> Idle: new page shown at once
```

Text fallback:

| From | Event | To | Static groups | Page group |
|---|---|---|---|---|
| Idle | Path changes; unsupported, back/forward, or reduced | Swap | — | New content at once |
| Idle | Path changes; supported, full motion | Capturing | Captured separately | Captured |
| Capturing | Two elements share a static name | Swap | — | New content at once (browser skips) |
| Capturing | Snapshots taken | Animating | New state at once, above page; old state hidden | Old fades out 160 ms; new fades in and rises 12 px over 240 ms |
| Animating | Last page animation ends | Idle | Live DOM | Live DOM |

### Effective theme

Unchanged: `light` ↔ `dark` through the existing two-state toggle (CR-004 WF1, `ASSUMPTION(T-008)`). This Unit only supplies the warm light and night-paper values (BR1.7). A theme change is not a route change and runs no motion.

## 5. Motion primitive catalogue

| Primitive | Properties | Duration / easing | Distance | Reduced | Hook | Built here or consumed by |
|---|---|---|---|---|---|---|
| Route transition | opacity, transform | outgoing 160 ms `--ease-in`; incoming 240 ms `--ease-out` | 12 px rise (incoming only) | none (instant) | `RouteTransition`, group `page` | here |
| List reveal | opacity, transform | 240 ms, 40 ms stagger, first 6 | 12 px | none | `Reveal` (`data-reveal-list`) | here; used by list pages |
| Step slide | opacity, transform | 240 ms `--ease-standard` | 24 px | none | `[data-step-dir]` | T-306 |
| Press | transform | 100 ms | scale 0.98 | colour only | `:active` on the listed pressables and on `[data-press]` | here; `[data-press]` for later Units |
| Publish tick | transform | 360 ms | — | full tick at once | `PublishTick` | T-306 (publish), T-102 (account confirmations) |
| Scroll reveal | opacity, transform | scroll-driven | 12 px | static | `.reveal` (after the first section) | T-207 |
| Sheet entry | opacity, transform | 240 ms `--ease-out` | 12 px | at once (scrim ≤ 100 ms fade) | `.sheet`, `.overlay` | here |
| Reading bar | transform | scroll-driven | scaleX | hidden | `.progress i` | here |

No other primitive exists. There is no shared-element morph and no view-transition name other than `page` and the five static groups (Q10, BR6.12). A later Unit uses these primitives through their hooks and adds no motion rule of its own (BR4.7).

## 6. Entity-relationship view (derived from `entities.md`)

```mermaid
erDiagram
  THEME_PREFERENCE ||--|{ COLOUR_TOKEN : "selects light or dark value"
  TYPE_ROLE }o--o| FONT_ASSET : "Bengali headings use"
  MOTION_PREFERENCE ||--|{ MOTION_PRIMITIVE : "governs"
  MOTION_PRIMITIVE }|--|{ MOTION_TOKEN : "uses"
  STATIC_ELEMENT |o--|| VIEW_TRANSITION_GROUP : "owns one static group"
```

Text fallback: the theme preference selects each colour token's light or dark value; Bengali heading roles use the one font asset; the motion preference governs every motion primitive; primitives use motion tokens; each static element owns at most one static view-transition group per page. Shape tokens stand alone. No primitive targets a static element (BR7.4).

## 7. Edge cases and failure behaviour

| Case | Behaviour | Rule |
|---|---|---|
| First visit, cold cache, `/bn` | Headings render in the system Bengali face, then swap to Hind Siliguri; line boxes keep their height; any rewrap shift is measured in the baseline | BR2.4, BR9.5 |
| `/en` visit | The font file is never requested | BR2.4 |
| Font file fails to load | System Bengali face stays; nothing else changes | BR2.4, BR9.6 |
| OS reduce on, in-app switch off as well | Reduced; the switch shows pressed | BR5.1 |
| OS reduce on, in-app switch on | Reduced; the switch shows not pressed and cannot restore motion | BR5.1 |
| Scripts disabled | No hydration, so no motion-ready, no route transitions, no entries; the cookie still renders `data-motion="reduced"`; every page fully usable | BR4.5, BR5.2, BR5.5 |
| Firefox without view-transition types, Samsung Internet, older WebKit | Same-document transitions where supported, otherwise plain swap; scroll reveals static without `view()` support | BR9.6 |
| Back or forward | Plain swap | BR6.1 |
| Search filter or `?page=` change | Same key: no route transition; new results inserted after motion-ready may use Reveal | BR6.1, BR6.2 |
| Theme toggle or server-action refresh | No motion | BR6.1 |
| Language toggle | Locale segment remounts; the new page enters like a route change (or swaps when reduced); CR-004's announcement unchanged | BR6.1 |
| A page with two emergency blocks | Only one carries `data-static="emergency"`; both are static; route transition intact | BR7.3 |
| A page wrongly gives two blocks the same static group | Browser skips the transition: plain swap and a console error; Build and Test logs an `ISS-` row | BR7.3 |
| Navigation while a transition runs | The browser ends the running transition and starts the new one; input still reaches the page | BR4.6 |
| Very slow page (over about 4 s) | The browser may skip the transition; plain swap | BR9.6 |
| 200% zoom at 360 px | Masthead wraps; no horizontal overflow; 44 px targets keep | BR3.5, BR3.3 |
| Long Bengali brand tagline at 360 px | Tagline wraps under the brand name; brand name and all controls stay visible | BR3.5 |
| Staff console pages | No `motion.css`, no `RouteTransition`, no change in look; `<html data-motion="reduced">` may appear but nothing reads it there | BR1.6 |
| A later Unit appends a second column-0 `:root[data-theme="dark"] {` block to `patient.css` | `check:motion` `M10-tokens` fails. Without that check, the contrast tool would take that small block as the whole dark set and check light values as dark ones, a silent pass | BR1.8 |
| A later Unit writes a component's dark rule | Written as `:root[data-theme="dark"] .x {` (the selector continues), so it is not a token block | BR1.8 |
| `patient.css` formatted by Prettier without the CSS quote override | `[data-theme="dark"]` becomes `[data-theme='dark']`; `contrast:patient` finds no dark block and exits 1 (fail closed, not silent) | BR9.8 |
| A later Unit's card, chip or row is pressable but not in the press list | It carries `data-press`; no motion rule is added outside `motion.css` | BR6.11 |

## 8. Acceptance mapping (T-011 acceptance table)

| Check | Expected under this design | Rules |
|---|---|---|
| AC2.4.1: tokens and plain CSS | Token block in `patient.css` (not `tokens.css`, Q1 A) with the § 3 values; `package.json` has no Tailwind, CSS-in-JS or animation library | BR1.1, BR1.5, BR2.1, BR3.1, BR3.3, BR9.2 |
| AC2.4.2: motion on key moments | Playwright motion spec: tab click runs `page` animations from the tokens; Reveal staggers items 1–6 only (run via `smoke:e2e`; `pnpm smoke` runs the Vitest motion smoke) | BR4.1, BR4.2, BR6.1, BR6.2 |
| AC2.4.3: reduced motion | Motion spec with `reducedMotion: 'reduce'` and with `rk.motion=off`: no view-transition animation, no stagger, no slide; every step completes | BR5.1–BR5.5 |
| AC2.4.4: never-animated elements | Component test (no motion hook on static elements), `check:motion` `M7-static` and `M9-hover` (no hover transform, `.emerg-card` included) | BR7.1–BR7.4, BR6.5 |
| AC2.4.5: no gamification | `rg -i "confetti\|streak\|badge-earn\|points" apps/web/src` finds nothing in patient motion code | BR8.1 |
| Animated properties | `pnpm check:motion` passes on the real files; `scripts/css-motion-check.test.mjs` shows a planted `transition: width` failing it (run by `test:coverage` inside `pnpm check`) | BR4.2, BR9.1 |
| Contrast | `pnpm contrast:patient` passes every pair, the `--pairs patient` set included, with no pair skipped; `pnpm contrast` output unchanged and `scripts/contrast.test.mjs` green | BR1.2, BR1.6, BR1.8 |
| Both languages | Component tests in `en` and `bn`; the font variable appears only for `bn`; no uppercase or tracking on Bengali (`M8-bangla`) | BR2.2, BR2.4 |
| AC2.4.6 baseline | Lighthouse on `/en` and `/bn` home (shell) recorded in the hand-off; the gated run is U42's | BR9.5 |
| Gate and CI | `pnpm check` (eleven steps) and `pnpm smoke` green locally; `apps/web` at 80% lines or more; the `check` workflow green on the Bolt head | BR9.4, BR9.8, BR9.9 |

Story coverage, including the US2.3 criteria, is in `traceability.json`. AC2.3.4 (form errors) is N/A here because this Unit adds no form.

## 9. Decisions

**D1 — Patient tokens live in `patient.css`, and `tokens.css` stays the staff palette (Q1 A).** Chosen because `tokens.css` feeds the staff console, and `patient.css` already overrides it on patient pages. Rejected: B, rewriting `tokens.css` and freezing the staff palette in `admin.css`, which touches the staff stylesheet and drops the staff palette from `pnpm check`; C, scoping under `[data-app]`, which the contrast tool cannot read. Consequences:
- The task's acceptance row "inspect `tokens.css`" reads "inspect the `patient.css` token block", and its "Contrast: `pnpm contrast`" row reads "`pnpm contrast:patient`, with `pnpm contrast` unchanged". Both are recorded in the hand-off.
- Because `tokens.css` is untouched, `pnpm contrast` keeps passing and T-010's `scripts/contrast.test.mjs` (`tokens.css` gives the prototype's results) stays green, so ISS-279's T-011 half does not happen.

**D2 — Canonical FD-091 names plus legacy aliases, in `hsl()`.** Chosen so that 2,000+ lines of `patient.css` and the contrast tool's fixed pair list keep working while new code uses role names. Rejected: renaming everywhere (large diff, high regression risk) and keeping only the old names (`--accent` would keep meaning "primary" while FD-091 calls the amber "accent"). The amber is `--decor`.

**D3 — Night-paper dark palette (Q2 A).** Chosen to keep one design across themes. Rejected: the 04b dark palette (two designs) and light only (drops a shipped feature; needs an FD).

**D4 — `data-motion="reduced"` on `<html>` beside the unchanged body attribute (Q3 A).** Chosen because `::view-transition-*` pseudo-elements hang off the root element and the staff console reads the body attribute. Rejected: moving the attribute and editing `admin.css`; keeping only the body attribute, which cannot stop route transitions.

**D5 — One keyed `RouteTransition` in the patient layout (Q4 A).** Chosen so every patient page, now and later, gets the same behaviour from one place. Rejected: per-page wrappers (24 files outside owned paths, easy to forget) and `ViewShell` (shared with staff pages). Reversible: if the spike fails on the pins, fall back to per-page wrappers (Q4 B) and add the wrapper to each later Unit's checklist.

**D6 — Only `transform` and `opacity` ever transition; hover colours are instant (Q5 A).** Chosen to match AC2.4.2, AC2.4.6 and NFR13 word for word and keep `check:motion` a plain allow-list.

**D7 — The design brief's Bengali line-heights, verified in the running app (Q6 A).** Chosen because they are FD-091's adopted values and stay above the 1.4 floor. The safety net is the Build and Test rendering check, raising by 0.05 where clipping appears.

**D8 — Minimal Playwright now (Q7 A).** Chosen because view transitions, scroll timelines and `@starting-style` exist only in real browsers, and T-011 already names a Playwright spec. T-503 extends the same configuration with Firefox, WebKit and axe.

**D9 — Static view-transition groups (Q8 A).** Chosen as the only option that meets "never animated in or out, never covered by a moving element" on `/emergency` and on pages with in-page disclaimers. Cost: up to five extra captured groups per navigation, each with no animation. The safe failure (a duplicate name means a plain swap) is accepted.

**D10 — No first-paint motion (`data-motion-ready`).** Chosen as one global rule that guarantees FD-091 rule 2 (the LCP element is never animated in) for every later Unit, without per-page judgement. Rejected: excluding the LCP element case by case, which is unknowable per viewport.

**D11 — One motion file and a zero-dependency check proven by tests.** Chosen so motion is reviewed in one place: later Units use its hooks and add no motion rule (the sibling drafts T-202, T-203 and T-207 rely on this). Only a Unit whose task names a new primitive changes `motion.css`. Since T-010, `scripts/` is the `tooling` Vitest project (`scripts/vitest.config.ts`, `**/*.test.mjs`). The planted violations therefore live in `scripts/css-motion-check.test.mjs`, as T-010's `contrast.test.mjs` and `check-identity.test.mjs` do. `pnpm check` runs them on every run inside `test:coverage`, and `check:motion` is a plain `node scripts/css-motion-check.mjs`. Rejected: keeping a `--self-test` flag beside the tests (two proofs of one thing).

**D12 — No blur, 44 px targets everywhere, static data displays.** Chosen for the low-end Android performance gate (blur), FD-091's target size on every pointer (not only coarse pointers), and the exact-count rule (a bar growing from 0 shows a false value).

**D13 — The patient CSS enters Prettier's scope; the staff and shared CSS stay out (Q9 A).**
- **Why.** After this Unit, `patient.css` and `motion.css` are authored code, not a port (project.md Code Style, 2026-10-27). About ten later patient Units will append to them, so the gate should catch layout drift. The file is rewritten in this Unit anyway, so formatting it adds no churn commit.
- **The quote override.** Prettier's `singleQuote: true` turns `:root[data-theme="dark"] {` into `:root[data-theme='dark'] {`; this was verified on 2026-10-29 with the installed Prettier 3.9.6 and the repository's configuration. The contrast tool matches only the double-quoted form, so one `overrides` entry keeps double quotes in CSS (the CSS convention, and the staff files' form).
- **Rejected.** B, keeping `apps/web/src/styles/**` ignored: no config change, but authored CSS without a format gate. C, formatting everything: it rewrites the verbatim staff port (`01-conventions.md` §7.1).
- **Reversible.** One ignore line and one override.

**D14 — The patient palette gets its own fail-closed run with extra pairs.** `contrast:patient` is `node tools/contrast.mjs --tokens apps/web/src/styles/patient.css --pairs patient`. The new `--pairs patient` flag appends pairs the shared list lacks:
- `--focus` on `--paper`, `--surface` and `--surface-2` at 3:1, hard;
- `--primary` on `--primary-soft` at 4.5:1 (current tab text);
- `--ink` on `--primary-soft` at 4.5:1.

Without the flag, the tool's pairs are unchanged. `pnpm contrast` and `scripts/contrast.test.mjs` are therefore untouched, and T-010 BR9.4 holds. This is chosen because adding `--focus` to the shared list would make `pnpm contrast` fail closed on `tokens.css`, which has no `--focus`. It replaces the earlier plan of recording the focus pairs by hand in the hand-off. Cost: about ten lines in `tools/contrast.mjs` and one test case, both outside the owned paths (plan approval).

**D15 — No shared-element morph in this release (Q10 A).** This decides T-202 Q12 and T-203 Q15 C:
- FD-091's choreography rule 7 allows shared-element moves "only from card to story", and a doctor profile or a condition page is not a story.
- A morph between boxes of different sizes animates `width` and `height` of `::view-transition-group(...)` through the browser's own keyframes. That is outside "only `transform` and `opacity`" (AC2.4.2, AC2.4.6, BR4.2), and `check:motion` cannot see it.
- Every named card is captured on every navigation, which costs frames on low-end Android.

The one move FD-091 allows, card to story (T-307), is deferred as an S4 row: it would need an FD note on the group's size animation and U42's frame-cost measurement first.

**D16 — Spacing, layout and press hooks for later Units.** The T-202, T-203, T-207 and T-102 drafts take margins and gaps from "T-011 spacing" and raise an `ISSUES.md` row when a token is missing. So the token block adds:
- a spacing scale `--space-1` … `--space-8`;
- `--grid-min` for card grids;
- the existing `--measure` (BR3.6).

Press feedback reaches later classes through `data-press` instead of edits to `motion.css` (BR6.11). The home hero wash is applied to `.opener` here, so T-207 adds no rule for it.

## 10. Option deltas (if the owner changes an answer)

| Question → option | What changes |
|---|---|
| Q1 → B | Tokens move to `tokens.css`; the staff palette's 04b values are copied into a block at the top of `admin.css` (outside owned paths; plan approval); `contrast:patient` is dropped and `pnpm contrast` checks the patient palette; BR1.5 and BR1.6 rewritten |
| Q1 → C | Tokens in `tokens.css` under `[data-app="patient"]`; the contrast tool needs a new `--scope` option (T-010's tool, outside owned paths) or the patient palette goes unchecked |
| Q2 → B | Dark values are the current 04b dark block, renamed onto the canonical roles; BR1.7 says "04b dark" |
| Q2 → C | Theme toggle removed from the patient masthead (`ThemeControls` gains a prop); needs a new FD entry; CR-004's theme announcement no longer applies on the patient side |
| Q3 → B | `<body data-motion>` moves to `<html>` with `on`/`off`; `admin.css`'s three selectors change; BR5.2 rewritten |
| Q3 → C | The in-app switch stops everything except route transitions; AC2.4.3 is then only partly met and needs an FD note |
| Q4 → B | `RouteTransition` is added to each patient `page.tsx` (24 files now; each later Unit adds it to its own pages); keying is per page and no longer needed |
| Q4 → C | `ViewShell` renders `RouteTransition` only when the app is `patient`; `ViewShell.tsx` joins the owned paths |
| Q5 → B | `check:motion` `M1-property` allows `color`, `background-color` and `border-color` at `--dur-instant` on interactive controls; T-503 mirrors the exception |
| Q6 → B | Bengali line-heights stay body 2.0, headings 1.45, display 1.34; the type table in `frontend-components.md` § 3.2 changes |
| Q7 → B | `scripts/motion-smoke.mjs` with `puppeteer-core`; no Playwright config; T-503 later rewrites it |
| Q7 → C | No browser smoke in this Unit; AC2.4.2 and AC2.4.3 are verified by static checks and jsdom, with an S4 `ISS-` row deferring the browser proof to U42 |
| Q8 → B | Only `masthead` and `colophon` are static groups; in-page emergency and disclaimer blocks fade with the page; AC2.4.4 needs an FD note |
| Q8 → C | `RouteTransition` gets an opt-out, and pages with emergency guidance pass it; each later Unit must remember it |
| Q9 → B | `.prettierignore` and `prettier.config.mjs` stay as T-010 left them; `motion.css` is also ignored; BR9.8 says "hand-formatted, single style per file" |
| Q9 → C | All five stylesheets formatted; `01-conventions.md` §7.1 needs an FD note; `scripts/contrast.test.mjs`'s prototype comparison must still pass after `tokens.css` is reflowed |
| Q10 → B | A `Morph` wrapper (`ViewTransition name`, `share` class `rk-morph`) joins `components/patient/motion/`; T-202's `Avatar` and hero take a name hook; an FD note allows `width`/`height` on one group; BR4.2 and `M1-property` gain that exception |
| Q10 → C | The same wrapper, used only by T-307 (experience card to story head) |

## 11. Risks to verify in Code Generation and Build and Test

- **Keyed `ViewTransition` in a layout on Next 16.3.4 / React 19.3.0.** The React reference page still shows canary examples (`motion-tech-research.md` §2.1). The spike confirms enter, exit and share behaviour and that `update: none` keeps in-page transitions still. Fallback: Q4 B.
- **Static groups above `page`.** `z-index` on `::view-transition-group(...)` and the nested-name paint order are browser behaviour. The spike checks Chromium; WebKit and Firefox are checked by U42. If a static group paints under `page` somewhere, that browser shows a fading page over the static element for 160–240 ms; this is logged as an `ISS-` row, not patched by animating the static element.
- **Static capture cost on low-end Android.** Up to six captured groups per navigation. Check frame timing in the throttled profile; if it is poor, drop `demo` from the static groups (the demo marker is above the masthead, and the incoming page rises from below it).
- **CSP (T-502).** React's `ViewTransition` sets `view-transition-name` through the style property, not the style attribute. This is expected to be CSP-safe but unverified (`motion-tech-research.md` §2.1). `RouteTransition` itself writes no style attribute.
- **Font swap shift on `/bn`.** `next/font/local` fallback adjustment targets Latin fallbacks, not Nirmala UI or Noto Sans Bengali. Measure CLS on a cold `/bn` load. If the heading rewrap contributes noticeably, add a manual fallback `@font-face` with `size-adjust` tuned to the Bengali system face, and record it.
- **Masthead at 360 px in `bn`.** Brand, a 44 px compose button and four 44 px controls on one row is tight; tabs wrap below. Verify no overflow at 360 px and 200% zoom (BR3.5).
- **Tokens falling through to the staff palette.** List every `var(--…)` in `patient.css` and `motion.css` and confirm each is defined in the patient block (BR1.5); record the list's count in the hand-off.
- **Owned-path gaps.** `components/patient/shell/**` does not exist. These files need plan approval, each listed with its reason in the hand-off (`frontend-components.md` § 2):
  - the real shell files;
  - `apps/web/playwright.config.ts`, `apps/web/e2e/tsconfig.json`, `apps/web/package.json`, `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts` and `app/layouts.test.tsx`;
  - the `contrast:patient` script line, `tools/contrast.mjs` and `scripts/contrast.test.mjs`;
  - `.prettierignore`, `prettier.config.mjs`, `.gitattributes` and `pnpm-lock.yaml`.
- **Docs that describe the old look or the old gate.** None is in the owned paths; proposed `ISS-` row:
  - `DESIGN.md` (patient sections);
  - `01-conventions.md` §6, §7.1, §7.4, §7.5, §7.7, §7.8 (only `pnpm contrast`) and §13 (nine steps);
  - `PRODUCT.md` line 87 (`body[data-motion="off"]`);
  - `.impeccable/config.json`'s `side-tab` reason.
- **Task-text drift in later tasks.** T-306, T-307 and T-308 say "wrap the pages in `RouteTransition`"; the layout provides it (Q4 A), as the T-202, T-203 and T-207 drafts already note. T-102's draft expects `pnpm smoke` to include `smoke:e2e`; it does not (WF8 step 3). Listed in the hand-off.

### Found in the T-010 re-check (2026-10-29)

Each is designed out below. Rows are proposed for `ISSUES.md`, with ids assigned when the stage finalises, `Found in` U45 T-011.

| # | Severity if built as before | Finding | Designed out by |
|---|---|---|---|
| F1 | S1 (red check) | Bringing `patient.css` into Prettier's scope under `singleQuote: true` rewrites `:root[data-theme="dark"] {` to single quotes; `contrast:patient` then finds no dark block and exits 1 | Q9 A: the CSS override keeps double quotes (BR9.8); the CSS check accepts either quote style |
| F2 | S1 (red check) | The Vitest web project has no `include`, so Vitest's default would collect `apps/web/e2e/smoke/motion.spec.ts`; Playwright's `test()` throws there and `test:coverage` fails | `e2e/**` added to the web project's `exclude` (BR9.9) |
| F3 | S1 (red check) | `apps/web/e2e/**` is in no tsconfig, so ESLint's type-aware project service cannot parse the spec and `pnpm lint` fails | `apps/web/e2e/tsconfig.json`; `typecheck` also runs `tsc -p e2e` (BR9.9) |
| F4 | S1 (red check) | `layouts.test.tsx` (T-010) renders the locale layout. Without Next's build transform, `localFont()` throws (`next/dist/compiled/@next/font/dist/local/index.js`: `throw new Error()`), so a direct call in the layout breaks those tests under Vitest | The font call lives in `app/fonts/bn-heading.ts`; `vitest.setup.ts` mocks `next/font/local` once for every web test (BR9.9) |
| F5 | S2 (contrast hidden) | The contrast tool takes the last column-0 dark block only; `patient.css` has two today, and a later Unit's small dark block would make the dark run check light values, a silent pass | One dark token block, checked by `M10-tokens` (BR1.8) |
| F6 | S2 (hard rule) | 13 hover-lift rules, not 2: `.emerg-card:hover` and `.emergency-lines a:hover` move emergency guidance (T-207 F6); the static set stops transitions, not a hover transform | Every hover transform removed; `M9-hover` (BR6.5) |
| F7 | S2 (storyboard look) | Three sibling drafts take margins and gaps from "T-011 spacing", which the token block did not define | Spacing and layout tokens (BR3.6) |
| F8 | S3 | Press feedback on the sibling drafts' classes (`.pillrow a`, `.doc-entry`, `.browse-card`, `.mini-row`, `.chip`) was not in the list, and later Units may not add motion | Press list extended; `data-press` hook (BR6.11) |
| F9 | S3 | `* text=auto eol=lf` with no `*.woff2` rule; a misdetected font would be corrupted, as `report.pdf` was (ISS-178) | `*.woff2 binary` in `.gitattributes` before the font is committed |
| F10 | S4 | ISS-279 expects T-011 to break `pnpm contrast`; under Q1 A `tokens.css` is untouched | T-011's half of ISS-279 closes at Build and Test; the Mailpit and ClamAV half stays open |
| F11 | S4 | Earlier draft text named T-308 as `PublishTick`'s consumer; it is T-306 (and T-102) | Corrected here (WF6, BR6.4) |
| F12 | S4 | The avatar morph proposal (T-202 Q12, T-203 Q15 C) | Not built (Q10 A, D15); the card-to-story move is deferred to T-307 with an FD note |

## 12. Dependency check status (2026-10-29, log read on the T-010 branch)

| Dependency | Latest log entry | Action for Code Generation |
|---|---|---|
| Hind Siliguri, `next/font/local` | none | New entry: font version and licence, `next/font/local` options on Next 16.3.4 |
| Playwright | 2026-09-10 (1.63.0, origin plan) | Re-check (older than 3 days); pick a release pnpm 11's `minimumReleaseAge` accepts; confirm it installs no browser at `pnpm install` (CI uses `--frozen-lockfile` and runs no Playwright yet) |
| React `ViewTransition`, Next 16.3.4, React 19.3.0 | 2026-09-13 (T-008); research 2026-10-27 is not a log entry | Re-check and log: stable `ViewTransition` on 19.3.0, known issues, the 16.4.3 and 19.3.1 notes |
| impeccable | 2026-09-10 (4.1.0) | Re-check |
| Prettier 3.9.6 (CSS printing, `overrides`) | 2026-10-28 (T-010) | Reuse while under 3 days old; otherwise re-check |

## Rules summary (derived from `rules.md`)

| ID | Rule in one line |
|---|---|
| BR1.1 | Colours come only from the FD-091 role tokens |
| BR1.2 | Text 4.5:1, focus and boundaries 3:1, surface and hairline steps, light and dark |
| BR1.3 | The warm accent is decoration only |
| BR1.4 | Colour is never the only signal |
| BR1.5 | One `hsl()` token block at the top of `patient.css`, canonical names plus aliases |
| BR1.6 | Staff console unchanged |
| BR1.7 | Night-paper dark palette; both dark blocks identical |
| BR1.8 | One column-0 dark token block, no scheme block; checked by `M10-tokens` |
| BR2.1 | FD-091 type scale with `:lang(bn)` sizes and line-heights |
| BR2.2 | No uppercase or letter-spacing on Bengali |
| BR2.3 | System fonts for body and Latin text |
| BR2.4 | Hind Siliguri 600 subset for Bengali headings, `bn` only, swap, no preload |
| BR2.5 | Bengali line-height ≥ 1.4, no clipping, no fixed height around Bengali words |
| BR3.1 | Radii 8/16/999; elevations 0/1/2 |
| BR3.2 | No glass or blur |
| BR3.3 | 44 × 44 px targets everywhere |
| BR3.4 | 3 px focus ring, never animated |
| BR3.5 | No horizontal overflow at five viewports, both languages, 200% zoom |
| BR3.6 | Spacing and layout tokens; later Units use them, never literal spacing |
| BR4.1 | Durations and easings only from tokens |
| BR4.2 | Only `transform` and `opacity` animate |
| BR4.3 | Small movement only |
| BR4.4 | Nothing loops or auto-plays |
| BR4.5 | Nothing animates on first paint |
| BR4.6 | Motion never delays reading or input |
| BR4.7 | All patient motion in `motion.css`; later Units add no motion rule |
| BR5.1 | Reduced = OS reduce OR in-app switch |
| BR5.2 | `<html data-motion="reduced">` from the cookie |
| BR5.3 | Every movement rule inside both guards |
| BR5.4 | Reduced mode: no movement, instant route swap |
| BR5.5 | Every step works without motion |
| BR6.1 | Route transition on path changes only |
| BR6.2 | Reveal staggers the first 6 children |
| BR6.3 | Composer step slide 24 px |
| BR6.4 | Publish tick plus plain text |
| BR6.5 | Press scale 0.98; instant hover; no hover transform anywhere |
| BR6.6 | Home scroll reveals below the first section |
| BR6.7 | Sheets enter with a rise; close at once |
| BR6.8 | Static skeletons only |
| BR6.9 | Reading bar scales with scroll; hidden in reduced mode |
| BR6.10 | Data displays never animate |
| BR6.11 | `data-press` hook for later Units' pressables |
| BR6.12 | Only six view-transition names; no shared-element morph |
| BR7.1 | Demo marker, disclaimer and emergency guidance never animated |
| BR7.2 | Static groups above the moving page |
| BR7.3 | One element per group name per page |
| BR7.4 | No motion rule touches a static element |
| BR8.1 | No gamification or dark-pattern motion |
| BR9.1 | `check:motion` in `pnpm check` after `contrast:patient`; planted violations in the `tooling` tests |
| BR9.2 | Plain CSS plus React ViewTransition; no library; no motion style attributes |
| BR9.3 | No new keys expected; any new key in both dictionaries, flagged |
| BR9.4 | All UI gates green before done, CI green on the Bolt head |
| BR9.5 | Shell Lighthouse baseline recorded, not gated |
| BR9.6 | Motion is progressive enhancement |
| BR9.7 | Hand-off and dependency entries |
| BR9.8 | Patient CSS in Prettier's scope with double quotes; staff and shared CSS ignored |
| BR9.9 | Tests in `en` and `bn`, `apps/web` ≥ 80% lines, no `test-support`, e2e kept out of Vitest |
