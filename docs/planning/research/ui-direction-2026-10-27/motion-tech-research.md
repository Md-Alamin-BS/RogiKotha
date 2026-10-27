# Motion and font technology research (patient-side UI)

Date: 2026-10-27. Scope: what motion and fonts the patient UI can use, with current stable versions.
Method: sources were fetched on 2026-10-27. Where a source could not be read, this is said.

## 1. Where the repo is today

| Item | Value | Source |
|---|---|---|
| Next.js | 16.3.4 pinned (npm latest is 16.4.3, published 2026-10-23) | `apps/web/package.json`; https://registry.npmjs.org/next |
| React / React DOM | 19.3.0 pinned (npm latest is 19.3.1) | `apps/web/package.json`; https://github.com/facebook/react/releases |
| TypeScript | ~6.0.3 | `package.json` |
| CSS | Plain CSS: `tokens.css` (11 KB), `patient.css` (120 KB), `admin.css` (33 KB), `globals.css` | `apps/web/src/styles/` |
| Existing motion | 19 `animation:` or `@keyframes` lines in `patient.css`. A scroll-driven progress bar already sits behind `@supports (animation-timeline: scroll())`. | `patient.css` lines 229-231 |
| Reduced motion | A blanket rule sets animation and transition time to 1 ms. A `body[data-motion="off"]` switch removes animation. | `patient.css` lines 1046-1050 |
| Web fonts | None. `tokens.css` uses system stacks. `--bangla` names Noto Sans Bengali, then Nirmala UI and others, but no file is shipped. | `tokens.css` lines 18-22 |
| Rule on libraries | FD-032: Tailwind, shadcn, Radix and Motion "are not adopted in Phase 1". | `docs/status/decision-log.md` line 104 |

Note: FD-032 names Motion explicitly. It says "not adopted in Phase 1", so a later change is a new decision, not a breach.

## 2. What works with no library

### 2.1 View Transitions and React / Next.js

| Item | Status | Source |
|---|---|---|
| React `<ViewTransition>` and `addTransitionType` | Included in stable React 19.3.0 (released 2026-09-09). Latest stable is 19.3.1 (2026-10-14). | https://github.com/facebook/react/releases |
| Next.js guide for view transitions | "View transitions work in the App Router with no configuration. React 19.3 includes the `<ViewTransition>` component and `addTransitionType` API." Route navigations are transitions, so animations run on navigation. | https://nextjs.org/docs/app/guides/view-transitions |
| `<Link transitionTypes={[...]}>` and `router.push(..., {transitionTypes})` | Documented in the same guide. | https://nextjs.org/docs/app/guides/view-transitions |
| `experimental.viewTransition` flag | Not needed per the guide above. The old config page URL now returns 404. | https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition (404) |
| React reference page | Still shows a canary version string in its examples. It may be stale; the release notes say stable. Treat as "stable in 19.3, confirm with a spike". | https://react.dev/reference/react/ViewTransition |

What triggers a React view transition: a Transition, `<Suspense>` or `useDeferredValue`. A plain `setState` does not. The browser back button (popstate) skips the animation. Layouts do not re-enter, so wrap each `page.tsx`, not the layout.
Sources: https://react.dev/reference/react/ViewTransition and the Next.js guide above.

Known limits, from the same pages:

- React does not turn animations off for reduced motion. You must write the `@media (prefers-reduced-motion)` rule.
- While a transition runs, the overlay catches clicks. Add `::view-transition { pointer-events: none; }`.
- Directional slides need transition types. Firefox 144 does not support transition types yet (https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available). On Firefox the slide is skipped and the page simply swaps. That is a safe fallback.
- The Next guide says some animations may behave differently in Safari.
- The repo's blanket reduced-motion rule uses `*`. That does not match `::view-transition-*` pseudo-elements. A separate rule is needed (the Next guide shows one).
- I found no open issues under the "View Transitions" label in the React repo at fetch time (the search returned zero). That is weak evidence, not a guarantee.

Not verified: whether React's `<ViewTransition>` writes anything that a strict `style-src` would block. It likely sets `view-transition-name` through the style property, which CSP does not block (see 2.4), but this must be tested under the T-502 policy.

### 2.2 Browser support

| Feature | Chrome / Edge | Safari | Firefox | Other | Source |
|---|---|---|---|---|---|
| Same-document view transitions | 111+ | 18.0+ | 144+ (Baseline Newly available since 2025-10-14) | Samsung 23+. 92.9% global use. | https://caniuse.com/view-transitions ; https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available |
| Cross-document (`@view-transition`) | 126+ | 18.2+ | Partial from 144 | Samsung Internet: no. 88.8% global use. | https://caniuse.com/cross-document-view-transitions |
| Scroll-driven animations | 115+ | 26+ | Technology Preview only | Needs `@supports` | https://developer.chrome.com/docs/css-ui/scroll-driven-animations |
| `@starting-style` | Baseline 2024 (since Aug 2024) | yes | yes | | https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style |
| `transition-behavior: allow-discrete` | 117+ | 17.4+ | 129+ but "partial" | 93.1% global use | https://caniuse.com/mdn-css_properties_transition-behavior |
| `interpolate-size` | 129+ | no | no | Chrome for Android 156+, Samsung 28+. 71.7% global use. | https://caniuse.com/mdn-css_properties_interpolate-size |

Android WebView: I found no separate table. WebView follows the Chromium version, so the Chrome column is the best guide. This is an inference, not a fetched fact. Test on a real low-end Android phone.

Use in this product:

- Same-document view transitions: safe as an enhancement. Without support the page works as today.
- Cross-document view transitions: not needed. Next.js navigates inside the app (client routing), so React view transitions cover it. Samsung Internet lacks cross-document support, which is a further reason to skip it.
- Scroll-driven animations: use only as decoration, always inside `@supports`. The repo already does this for the progress bar. Firefox stable has no support, so nothing important may depend on it.
- `@starting-style` plus `allow-discrete`: good for dialogs, popovers and disclosure panels. The fallback is "appears instantly".
- `interpolate-size: allow-keywords`: Chromium only. Use for accordion height as a bonus; the fallback is an instant open. Do not rely on it.

### 2.3 Cost

CSS-only motion costs 0 KB of JavaScript. View transitions run in the browser, not in our code. This fits the "about 3 s to usable" budget on low-end Android better than any library.

### 2.4 CSP (nonces, T-502)

- Next.js nonces need dynamic rendering. "All pages must be dynamically rendered", static optimization and ISR are off, and "Partial Prerendering (PPR) is incompatible" with nonce CSP. Source: https://nextjs.org/docs/app/guides/content-security-policy. This is a T-502 consequence, not a motion issue, but it makes every KB and every server render matter more.
- `style-src-attr` blocks `style="..."` attributes, `setAttribute("style")` and `cssText`. It does not block `element.style.x = value`. Source: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr
- So CSS files, `@keyframes`, view-transition rules and the Web Animations API are CSP-safe. Server-rendered `style={{...}}` props produce `style` attributes, which a strict policy blocks. This applies to any approach, library or not.

## 3. Libraries

### 3.1 Motion (was Framer Motion)

| Item | Finding | Source |
|---|---|---|
| Package | `motion` on npm. `framer-motion` is published at the same version. | https://registry.npmjs.org/motion ; https://registry.npmjs.org/framer-motion/latest |
| Latest on npm | 14.6.0 (2026-10-22), MIT licence. The changelog on GitHub already lists 14.7.0 (2026-10-23), not yet on npm at fetch time. | https://registry.npmjs.org/motion/latest ; https://raw.githubusercontent.com/motiondivision/motion/main/CHANGELOG.md |
| Release pace | 14.0.0 on 2026-10-02, then 14.1 to 14.7 by 2026-10-23. Seven minor versions in three weeks. Each lists bug fixes (layout jumps, drag, AnimatePresence). | changelog above |
| React support | Peer dependency `react ^18 \|\| ^19`. | https://registry.npmjs.org/motion/latest |
| Sizes | `motion` component about 43 KB. `m` with `LazyMotion` about 5 KB, plus `domAnimation` +24 KB, or `domMax` +38 KB. `useAnimate` mini 3.3 KB. `animate()` mini 3.2 KB, hybrid 22 KB. Sizes are as stated by the vendor (compression not stated). | https://motion.dev/docs/react-reduce-bundle-size ; https://motion.dev/docs/animate |
| Server rendering | Vendor says components are compatible with server rendering. Motion components need a client boundary (`"use client"`); this is my inference, the vendor page does not describe RSC. | https://motion.dev/docs/react-motion-component |
| CSP | A 2022 issue, "Content Security Policy blocks inline styles" (#1727), was closed as `wontfix`. Motion writes styles through the style property in the browser (not blocked), but server-rendered initial state is `style=""` attributes (blocked by a strict policy). Treat as a real risk to test. | https://github.com/motiondivision/motion/issues?q=is%3Aissue+CSP+nonce ; rule in section 2.4 |
| Reduced motion | Offered through a config component (`MotionConfig`). The vendor pages I fetched did not cover it; check before adoption. | not verified |

What Motion gives that CSS cannot: springs and velocity hand-off, drag and gestures, shared-layout animation of elements that stay mounted, exit animation for React unmounts, and sequences.
The patient side described so far (page changes, list reveals, disclosure panels, hover and press feedback, progress) does not need these.

### 3.2 Alternatives

| Library | Version | Licence | Size | Fit |
|---|---|---|---|---|
| `@formkit/auto-animate` | 0.10.0 (2026-07-10) | MIT | Not stated on its site; not verified | One-line add, remove and move animation. Respects reduced motion automatically. Pre-1.0. Little gain over `@starting-style` plus view transitions. Sources: https://auto-animate.formkit.com/ ; https://registry.npmjs.org/@formkit/auto-animate/latest |
| `gsap` | 3.15.0 (2026-04-13) | "Standard no charge" licence. The licence page banner says "GSAP is now free for everyone, thanks to Webflow's support". I could not read the full terms. Read them before adoption. | npm package unpacked 6.3 MB (all plugins); core gzip size not verified | Timeline and SVG tool. Overkill, larger, not React-first. Sources: https://registry.npmjs.org/gsap/latest ; https://gsap.com/standard-license/ |

### 3.3 Cost versus CSS-only

| Option | JS added | Needs client JS | CSP risk | Churn risk | Covers |
|---|---|---|---|---|---|
| CSS plus React `<ViewTransition>` | 0 KB (React already ships it) | no | low | low (platform) | Page change, shared element, reveals, disclosure, hover, scroll decoration |
| Motion `animate` mini | about 3 KB | yes, small island | low (uses native animations and the style property) | medium | Springs, imperative sequences |
| Motion `m` + `LazyMotion` + `domAnimation` | about 29 KB (5 + 24) | yes | medium (SSR style attributes) | medium-high (7 minors in 3 weeks) | Gestures, exit animation. `layout` needs `domMax` (about 43 KB) |
| Motion full `motion` | about 43 KB | yes | medium | medium-high | Everything |
| auto-animate | not verified | yes | low | medium (pre-1.0) | List add, remove, reorder |
| GSAP | not verified | yes | low | low | Timelines, SVG |

## 4. Recommendation

1. Build a CSS-first motion system. No new package.
2. FD-032 does not need to change for this. Its text already allows CSS motion. Add one short new decision ("Patient motion system is CSS-first") that records the tokens below and the rules for view transitions.
3. Tokens in `tokens.css` as CSS custom properties:
   - Durations: `--motion-fast` 120 ms, `--motion-base` 200 ms, `--motion-slow` 360 ms, `--motion-page` 400 ms (the Next guide uses 150, 210 and 400 ms for exit, enter and move).
   - Easings: `--ease-out`, `--ease-in-out`, and one `linear()` spring-like curve for press feedback.
   - Distances: `--motion-shift` 8 px for reveals, 60 px at most for page slides.
   - Rule: animate only `opacity`, `transform` and `translate`. Never width, height or top.
4. Reduced motion, three layers:
   - Keep the existing blanket rule and the `data-motion="off"` switch.
   - Add a rule for `::view-transition-old(*)`, `::view-transition-new(*)` and `::view-transition-group(*)` that sets duration to 0.
   - Cross-fades of opacity may stay under reduced motion; remove all positional movement.
5. Use these platform features:
   - `<ViewTransition>` in each `page.tsx`, with `transitionTypes` for forward and back, the header anchored by `view-transition-name`, and `::view-transition { pointer-events: none }`.
   - `@starting-style` plus `transition-behavior: allow-discrete` for dialogs, popovers and menus.
   - `animation-timeline: view()` for scroll reveals, inside `@supports`, with content visible by default.
   - `interpolate-size: allow-keywords` for accordions, as a Chromium-only extra.
   - None of these needs `"use client"`, so server components stay server components.
6. Limits to stay fast on low-end Android: at most two named view-transition elements per navigation, no blur filters on large areas (the Next demo uses `filter: blur(3px)`; test the cost on a real phone), and no animation on first paint of the largest content.
7. Is any library justified? Not now. The only gaps CSS leaves are spring physics, drag and shared-layout animation of elements that stay mounted. If the design later needs one of them:
   - Use `motion@14.6.0` (exact pin), or the first 14.x release that has stayed unchanged for two to four weeks. Today's churn argues for waiting.
   - Import only `animate` from the mini entry (about 3.2 KB) inside one small client component, or `m` with `LazyMotion` and `domAnimation` (about 29 KB) if gestures are needed.
   - Avoid server-rendered initial animation state (`initial={false}`, or no `initial`), so no `style` attributes are produced under the T-502 policy. Test with the real CSP.
   - Decision-log change: a new FD entry that supersedes only the "Motion" clause of FD-032, naming the package, the pinned version, the allowed entry points, a size budget (for example 5 KB on first load) and the CSP test. FD-032's ban on Tailwind and the others stays.
   - Before installing, add a dated entry to `docs/status/dependency-check-log.md` (the 3-day rule in AGENTS.md).
8. Version note: Next.js 16.4.3 and React 19.3.1 are newer than the repo's pins. The 16.4.3 notes list font URL and Turbopack fixes (https://github.com/vercel/next.js/releases). I found no view-transition fixes in them. A bump is a separate decision. Run the spike on the pinned 16.3.4 first.

Suggested spike (half a day): wrap two patient pages in `<ViewTransition>`, add the reduced-motion rule, run with the T-502 CSP, and check Chrome on Android, Samsung Internet, Safari on iOS and Firefox. Record what fails.

## 5. Fonts for Bengali and Latin

### 5.1 What next/font does

Source: https://nextjs.org/docs/app/api-reference/components/font (last updated 2026-09-24).

- Google fonts are downloaded at build time and self-hosted. The browser makes no request to Google. This suits a strict `font-src 'self'`.
- Google fonts are subset automatically. `subsets` only chooses what is preloaded. Preload with no subset gives a warning.
- `display` defaults to `swap`. Other values: `auto`, `block`, `fallback`, `optional`.
- `preload` defaults to true and applies to all files from one call.
- `adjustFontFallback` defaults to true for Google fonts. It reduces layout shift.
- A variable font needs no `weight`. Non-variable fonts need weights listed.
- Preload follows where the font function is called: root layout means every route, a page means that route. Load the Bengali font only on the path for `bn` if possible, so English visitors do not preload it. Whether the `[locale]` layout can do this needs a spike.
- The docs advise few fonts: each one is another download.

### 5.2 Measured file sizes (woff2 from the Google Fonts CSS API, fetched 2026-10-27)

| Family | Bengali subset | latin-ext | latin |
|---|---|---|---|
| Noto Sans Bengali, variable weight 100-900 (one file for all weights) | 107,720 B | 13,616 B | 25,604 B |
| Hind Siliguri, weight 400 | 71,076 B | 8,272 B | 14,472 B |
| Hind Siliguri, weight 600 | 74,784 B | 8,544 B | 14,724 B |
| Noto Serif Bengali, variable weight 100-900 | 191,284 B | 14,832 B | 28,144 B |
| Inter, variable (for comparison) | none | 85,068 B | 48,256 B |

Source of the numbers: `https://fonts.googleapis.com/css2?family=...` and the Content-Length of each woff2 file URL it returned. Woff2 is already compressed.

Reading the table:

- Bengali glyph sets are large. One variable Noto Sans Bengali is about 108 KB plus about 26 KB Latin, so about 133 KB.
- Hind Siliguri at two weights is about 146 KB of Bengali alone, more than the variable Noto file. Use the variable file if more than one weight is needed.
- Arithmetic, not a measured test: 133 KB is about 1,064 kbit, so about 2.7 s at a steady 400 kbit/s. That alone could use most of the 3 s budget on a slow connection. A web font must never block first render.

### 5.3 Recommendation

1. Keep the system stack for body text. It costs 0 bytes, and the current `--bangla` stack already names Noto Sans Bengali first, then Nirmala UI.
2. If the richer UI needs a distinct typeface for Latin headings, load one small variable family only for headings. Inter's Latin file alone is 48 KB, so prefer a smaller family.
3. For Bengali, if a consistent look is needed, add `Noto_Sans_Bengali` with `subsets: ['bengali', 'latin']`, `display: 'swap'` and `preload: false`, applied only on the `bn` locale. This avoids blocking first render and keeps glyph shapes consistent once cached. Confirm on a throttled Android phone before keeping it. The names `bengali` and `latin` are the subset labels the Google Fonts API returns; check they match the typed list in `next/font/google`.
4. Do not use `display: optional` for Bengali without testing: on a first visit the web font would not be used at all, so the fallback must look acceptable on every target device.
5. Serve fonts from the same origin so `font-src 'self'` holds. Add the font files to the PWA cache.
6. The Bengali rules in the current CSS (line-height 1.95, no letter spacing, no uppercase transform) stay as they are when a font is added.

## 6. Open points for the owner

| # | Question | Options | Suggestion |
|---|---|---|---|
| 1 | Allow a motion library? | A: none. B: `motion` mini entry (about 3 KB). C: `m` + `LazyMotion` (about 29 KB). | A. Revisit after the spike. |
| 2 | Bump to Next 16.4.3 and React 19.3.1? | Now, or later as its own task. | Later, as its own task, after the spike on the current pins. |
| 3 | Load a Bengali web font? | System only, or variable Noto Sans Bengali (about 133 KB total) loaded lazily. | System only first; test the lazy font on a real phone. |
| 4 | Dynamic rendering for nonces | Accept, or look at the hash-based experimental option (`experimental.sri`). | Accept for now; note the cost in T-502. |

## 7. Sources not read or only partly read

- gsap.com licence terms: only the banner was readable.
- caniuse tables for scroll-driven animations and `@starting-style`: the table did not come through. Support for those two comes from Chrome's and MDN's pages.
- Android WebView: no direct source.
- Motion RSC and reduced-motion docs: not found in the pages fetched.
- The Next.js and Motion release pages were summarised by the fetch tool; spot-check before relying on exact dates.
