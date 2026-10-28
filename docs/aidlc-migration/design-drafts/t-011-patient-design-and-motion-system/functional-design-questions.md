# Functional Design — questions (U45 `t-011-patient-design-and-motion-system`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit's Functional Design; until then it lives in `docs/aidlc-migration/design-drafts/t-011-patient-design-and-motion-system/`.

Context:
- Unit U45 (kind `ui`, size XL, not high risk) delivers T-011 (`docs/implementation/tasks/T-011-patient-design-and-motion-system.md`) for stories US2.4 and US2.3. Inputs read: `unit-of-work.md` (U45), `unit-of-work-story-map.md` (US2.4 → U45, U42; US2.3 → U42, U44, with U45 listing it), `requirements.md` (NFR13, FR95, NFR1, NFR4, NFR5, NFR6, NFR7), `stories.md` (AC2.4.1–AC2.4.6, AC2.3.1–AC2.3.6), `components.md` (no domain component owns presentation) and `contract-summary.md` ("FD-091 and U45: presentation only. U45 has no runtime contract"; C14 unchanged).
- Decisions read: FD-091 (the redesign), FD-032 (plain CSS, no animation library), FD-030 (staff console keeps Chart Tray), FD-024 (equal languages), FD-042 (Bengali copy review).
- Research read: `docs/planning/research/ui-direction-2026-10-27/design-direction-research.md` §4 (the design brief) and `motion-tech-research.md`.
- Code read on the CR-011 Bolt branch (no file in this Unit's area differs from `main`): `apps/web/src/styles/{tokens,globals,patient,admin}.css`, `app/[locale]/layout.tsx`, `app/[locale]/(patient)/layout.tsx`, `app/[locale]/admin/layout.tsx`, the shell components (`Masthead`, `Tabs`, `Colophon`, `ViewShell`, `Emergency`, `DemoMarker`, `SkipLink`, `Sheet`, `ThemeControls`), `lib/cookies.ts` (`Motion = 'on' | 'off'`), `tools/contrast.mjs`, `tools/bangla-metrics.mjs`, the root and `apps/web` `package.json`, `.impeccable/config.json`, `DESIGN.md`, `docs/implementation/01-conventions.md` §6–§7 and `docs/status/dependency-check-log.md`.

## What the code shows that the task file does not

These facts shape the questions below.

1. **`tokens.css` is shared with the staff console.** Both nested layouts import `globals.css`, which imports `tokens.css`, and `admin.css` maps its whole palette onto `tokens.css` (`--surface-page: var(--bg)` and so on). Replacing the values in `tokens.css`, as T-011 step 1 says, would restyle the staff console, which T-011 and FD-030 keep unchanged.
2. **The patient side does not get its colours from `tokens.css`.** `patient.css` carries its own token layers (the prototype's shared concept-04 layer at the top, then the 04b block and the scheme A/B/C blocks further down), which override `tokens.css` on patient pages.
3. **`pnpm contrast` checks fixed token names written in `hsl()`.** After T-010 it runs `tools/contrast.mjs --tokens apps/web/src/styles/tokens.css`. The tool reads only bare `:root {` blocks and the last `:root[data-theme="dark"] {` block, parses only `hsl()` values, and checks a fixed list of names (`--bg`, `--glass`, `--glass-2`, `--ink`, `--ink-soft`, `--ink-faint`, `--accent`, `--accent-ink`, `--rule*`, `--input-border`, warn and danger and the role hooks). A token it cannot find is reported as `SKIP` and does not fail the run. Hex values or new names would pass it without being checked.
4. **The in-app motion switch is `body[data-motion="off"]`.** `::view-transition-*` pseudo-elements hang off the root element, so a `body` attribute cannot switch them off. The staff console's `admin.css` also reads `body[data-motion="off"]`.
5. **There is no Playwright in the repository.** `pnpm smoke` runs Vitest `*.smoke.test.*` files only. Team practice adds Playwright from T-503, the last validation Unit. T-011 lists `apps/web/e2e/smoke/motion.spec.ts` as an owned path.
6. **The current patient motion breaks FD-091.** `.display`, `.lede` and the first list rows rise for 700–800 ms on first paint, which animates the LCP element. `.view` rises on every mount. `.skip` transitions `top`. Tabs and controls transition colours. `.ctl:hover` and `.emergency-lines a:hover` lift by 2 px (the second one moves emergency guidance). `.panel` and `.masthead` use `backdrop-filter` blur.
7. **No dark palette exists for "Warm Paper".** The design brief gives light values only, but the patient masthead ships a working theme toggle (prototype behaviour, CR-004).
8. **No new copy is needed.** The motion switch label (`a11y.motion`: "Reduce animation" / "অ্যানিমেশন কমান") and the publish confirmation text (`compose.publishedNote`, which the prototype shows after a `✓`) already exist in both dictionaries.

## Settled before this stage

- **The look itself**: FD-091 chose "Warm Paper, Soft Depth", CSS-first motion with no library, Hind Siliguri 600 for Bengali headings only, system fonts for body text, reduced-motion support plus the existing in-app switch, and the release checks LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. Not asked again.
- **The staff console keeps Chart Tray** (FD-030, T-011 "Not in scope").
- **Bengali copy review**: any new key is drafted in this Unit and flagged for the owner's bilingual review (FD-042). This design expects no new key (fact 8).

## Settled in this design without a question

These follow from FD-091, the hard rules or the code, so they are design decisions, not open points. `functional-spec.md` § 9 explains each.

- **Token names.** The FD-091 role names are canonical (`--paper`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--ink-faint`, `--primary`, `--primary-2`, `--primary-ink`, `--primary-soft`, `--decor`, `--rule`, `--rule-hard`, `--rule-strong`, `--input-border`, `--focus`). The names `patient.css` and the contrast tool already use (`--bg`, `--glass`, `--accent`, …) stay as aliases that point at them. The brief's warm "accent" is named `--decor`, because `--accent` already means the primary link and button colour in more than 2,000 lines of `patient.css`.
- **Values in `hsl()`.** The contrast tool parses nothing else (fact 3).
- **No first-paint motion.** Nothing animates on the first paint of a document. Entry motion starts only after the client marks motion as ready, so the LCP element is never animated in (FD-091 choreography rule 2).
- **One motion file.** Every `transition`, `animation`, `@keyframes`, `@starting-style` and `view-transition-*` rule of the patient side lives in `motion.css`; `patient.css` holds none. One file is easy to check and easy for later Units to extend.
- **No blur anywhere.** FD-091 allows at most one small blurred header. This design uses none: the masthead becomes a solid surface with a hairline, which also helps the low-end Android performance gate.
- **44 px targets on every pointer type,** not only on coarse pointers as today.
- **Lists stagger only their first 6 items.** Items from the 7th on appear at once, with no animation.
- **Hind Siliguri through `next/font/local`,** with the subset WOFF2 and its OFL licence committed under `apps/web/src/app/fonts/`. The build then needs no network.
- **No new message keys** (fact 8). If Code Generation finds one is needed, it goes into both dictionaries in one commit and is flagged for the owner (FD-042).
- **Scheme A/B/C blocks removed** from `patient.css`. Nothing in `apps/web` sets `data-scheme` (`01-conventions.md` §7.4 dropped the scheme controls).

## Question 1

Where do the FD-091 patient tokens live, given that `tokens.css` is shared with the staff console (facts 1–3)?

A. **In one token block at the top of `patient.css`** (recommended). It replaces that file's existing token layers, uses the canonical names plus the aliases, and is written in `hsl()`. `tokens.css` stays as it is, so the staff console renders exactly as today. A second contrast run, `contrast:patient` (`node tools/contrast.mjs --tokens apps/web/src/styles/patient.css`), joins `pnpm check` beside `check:motion`, so the new tokens are really checked. `pnpm contrast` keeps checking the staff palette. Both files are in T-011's owned paths, and the extra script line sits next to the `check:motion` line T-011 already adds.
B. **In `tokens.css`, as T-011 step 1 says literally,** with the staff console's current 04b values copied into a staff-only block at the top of `admin.css`, so the console keeps its look. `pnpm contrast` then checks the patient tokens, but the staff palette is no longer checked by `pnpm check`, and `admin.css` sits outside T-011's owned paths and FD-030's "not touched".
C. **In `tokens.css`, scoped under `[data-app="patient"]`.** The staff console is untouched, but the contrast tool reads only bare `:root {` blocks, so the patient tokens would go unchecked.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

What does the patient side look like in dark mode? FD-091's brief gives light values only, but the theme toggle ships (fact 7).

A. **A warm "night paper" palette** in the same family (recommended): warm charcoal page `hsl(30 12% 9%)`, raised card `hsl(30 10% 13%)`, warm off-white ink, a lighter teal primary `hsl(170 45% 60%)`, and the same roles and checks as light mode. The values in `frontend-components.md` § 3 pass every pair of the contrast tool in both modes (computed on 2026-10-28; Code Generation re-runs `contrast:patient`).
B. **Keep the 04b dark palette** for the patient side. This costs nothing, but light and dark would then be two different designs, cool teal-grey at night and warm paper by day.
C. **Light only.** Remove the theme toggle from the patient masthead. This drops shipped prototype behaviour and CR-004's theme announcement, so it needs a new FD entry.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

How does the in-app reduce-motion switch reach the CSS? Today it is `body[data-motion="off"]` (fact 4).

A. **Add `data-motion="reduced"` to `<html>`** when the `rk.motion` cookie reads `off`, and leave it off otherwise (recommended). The `[locale]` layout renders it on the server, so it also works without JavaScript and needs no cookie migration. The `body` attribute stays exactly as it is, because the staff console's `admin.css` reads it. The patient CSS uses only `:root[data-motion="reduced"]`, the form T-011 step 3 names, and that form reaches the `::view-transition-*` pseudo-elements.
B. **Move the attribute to `<html>` with the values `on` / `off`** and update `admin.css` to match. This means one attribute instead of two, but it touches the staff stylesheet, which this Unit keeps unchanged.
C. **Keep only `body[data-motion="off"]`.** The in-app switch could then not stop route transitions; only the operating-system setting could, which breaks AC2.4.3 ("or the app's own reduce-motion switch").
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Where is `RouteTransition` mounted?

A. **Once, in `(patient)/layout.tsx`, around the page inside `<main>`,** as a boundary keyed by the locale-free path (recommended). Every patient page gets the route transition with no change to the 24 existing page files, and later Units cannot forget it. Keying by path means only a change of page animates; search-parameter changes, theme toggles and server-action refreshes do not. The staff console has its own layout, so it never gets the transition. The research note "wrap each `page.tsx`, not the layout" is about an unkeyed boundary that never re-enters; the key makes it re-enter. Code Generation confirms this in a short spike on the pinned Next 16.3.4 and React 19.3.0, and falls back to B if it fails.
B. **In each patient `page.tsx`** (24 files today, all outside T-011's owned paths), with every later patient Unit required to add it to its own pages.
C. **Inside `ViewShell`.** Every page uses it, but staff pages use it too, so it would need a check for which app it is in, and `ViewShell` is not in T-011's owned paths.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

May hover and press colour changes fade (a "100 ms colour shift", design brief §2), or does nothing but `transform` and `opacity` ever transition?

A. **Nothing but `transform` and `opacity` transitions** (recommended). Hover and active colour changes are instant, and press feedback is a `scale(0.98)` over 100 ms. This matches AC2.4.2, AC2.4.6 and NFR13 word for word, so `check:motion` can be a simple allow-list. An instant colour change on hover reads as crisp, not broken.
B. **Allow `color`, `background-color` and `border-color` transitions of 100 ms or less** on interactive controls, as an exception in `check:motion`. Slightly softer, but it conflicts with the AC text, so T-503 would have to apply the same exception.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

Which Bengali line-heights? The two research files disagree: the design brief proposes body 1.7 and headings 1.4–1.5 (marked as untested starting points), while `motion-tech-research.md` §5.3 says to keep today's values (body 2.0 in `patient.css`).

A. **The design brief's values** (recommended): display 1.4, H1 1.45, H2 1.5, body 1.7, small 1.65, all above the 1.4 floor that `tools/bangla-metrics.mjs` uses. Build and Test checks them in the running app: `/bn` shell and the existing `/bn` pages at 360 px and at 200% zoom, with no clipped vowel signs or conjuncts. Any role that clips is raised to the next 0.05 step and recorded in the hand-off. These are the values FD-091 adopts by reference.
B. **Keep today's values** (body 2.0, headings 1.45, display 1.34). This is known to render well, but the text looks loose next to the new type scale, and display 1.34 is tighter than the brief.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

How is motion checked in a real browser before T-503 brings in Playwright (fact 5)? jsdom has no view transitions, scroll timelines or `@starting-style`.

A. **Add Playwright now, in its smallest form** (recommended): `@playwright/test` as an `apps/web` dev dependency, a `playwright.config.ts` with one Chromium project that starts the built app, a `smoke:e2e` script, and the one spec T-011 already lists (`apps/web/e2e/smoke/motion.spec.ts`). It runs at Build and Test; it joins `pnpm check` and CI when T-503 adds Firefox, WebKit and axe to the same configuration. Cost: about one hour, plus a dependency-check entry, because the log's Playwright entry dates from 2026-09-10.
B. **A Puppeteer script** using the `puppeteer-core` already in the root dev dependencies (as `tools/hover-probe.mjs` does). This adds no dependency, but it needs a local Chrome path, and T-503 would later rewrite it in Playwright.
C. **Static checks and jsdom tests only.** The real-browser run moves to T-503, and AC2.4.2 and AC2.4.3 stay unproven in a browser until the last Unit.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

During a route transition, how are the never-animated elements (demo marker, medical-advice disclaimer, emergency guidance) kept still and uncovered (AC2.4.4)? By default a view transition fades the whole page, so they would fade along with it.

A. **Static groups** (recommended). The masthead, the demo marker, the colophon (which carries the disclaimer), the emergency guidance block and an in-page disclaimer block each get their own view-transition group that never animates. Each shows its new state at its final place from the first frame and hides its old state at once, and the groups paint above the moving page. Only the page content (`page`) fades and rises. Each name appears at most once per page; if a page broke that rule, the browser would skip the transition and simply swap the page, which is a safe failure. Later Units mark new emergency or disclaimer blocks with `data-static="emergency"` or `data-static="disclaimer"`.
B. **Let in-page emergency and disclaimer blocks fade with the page,** and anchor only the masthead and colophon. This is simpler, but on `/emergency` the guidance would fade in over 240 ms, which breaks "never animated in" and "readable at once".
C. **No route transition at all on pages that contain emergency guidance.** This is safe, but `/emergency`, the composer and the home page would feel different from every other page, and each later Unit would have to remember the exception.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)
