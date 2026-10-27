# Patient-side UI direction: research (2026-10-27)

Purpose: find a "rich, modern, animated" look for the patient side that stays trustworthy, fast and accessible. This is research, not a decision. The owner decides.

## How to read the evidence

- Claims with a link were read in a fetch for this report.
- "Practitioner judgement" means an engineering opinion, not a cited fact. Test it before relying on it.
- Gaps: Zocdoc and Practo blocked fetching. Awwwards gave only a list of names. The W3C Bengali layout pages timed out. So the Bengali line-height numbers below are untested starting points.

## 1. What "rich but trustworthy" looks like for health products now

Evidence from fetched pages:

| Source | What it shows | Link |
|---|---|---|
| NHS design system | Trust through restraint. Off-white page background (#f0f4f5) to reduce glare. Colour is never the only signal. 4.5:1 text contrast, aims higher where possible. WCAG 2.2. | https://service-manual.nhs.uk/design-system/styles/colour |
| Headspace home page | Soft blue/teal base, warm yellow accent, geometric soft-edged illustration, subtle gradients, layered cards with light shadow, rounded corners, generous space. | https://www.headspace.com/ |
| Oscar Health home page | White surfaces, one blue accent, big plain-language headlines, warm human photography (hands, eyes), scroll reveals. | https://www.oscarhealth.com/ |
| Nielsen Norman Group on credibility | Four trust factors: design quality, upfront disclosure, comprehensive and current content, links to outside sources. Asking for personal details before letting people explore hurts trust. Typos and broken links hurt it fast. | https://www.nngroup.com/articles/trustworthy-design/ |
| Awwwards health category | Lists current health sites (for example Bevel Health, Function Health, HEVA Health, Calmlyss). Shows the category rewards bold type and motion, but the page gave no design detail. | https://www.awwwards.com/websites/health/ |

Pattern read-across (practitioner judgement): the "rich" feeling in health products comes from soft depth, one confident accent, large type, real human imagery and calm reveal motion. It does not come from neon, heavy glass or big gradients. Futuristic styling is a trust risk when the content is about someone's illness.

### Three candidate directions

All three keep: no scores, no stars, the disclaimer and emergency strip visible, WCAG 2.2 AA.

#### A. "Warm Paper, Soft Depth" (calm-rich)

| Item | Idea |
|---|---|
| Palette | Warm off-white paper (#FAF8F4), deep ink text (#1D2A2E), teal-green primary (#0F6B63), one warm accent for decoration (soft saffron #E0A93B, never for text on light). Tinted neutrals, not grey. |
| Type | Latin: Inter or a similar neutral sans. Bengali: Hind Siliguri for UI and body, Noto Serif Bengali for long narrative accounts (reading comfort). |
| Surface | Rounded cards (16 px), two soft shadow levels, subtle gradient wash on hero only. Bento grid on the home page. No glass over text. |
| Motion personality | Gentle and confident. Fade plus small rise on reveal, soft press, calm page transition. |
| Trust | Fits well. Close to the NHS and Headspace read. Risk is low. Risk: can drift into "generic wellness app" if the accent is timid. |

#### B. "Clinic Glass" (futuristic-clean)

| Item | Idea |
|---|---|
| Palette | Cool white and pale mist (#F3F7F9), deep teal-navy ink, electric teal accent (#12B5A6) with a gradient to blue on hero only. |
| Type | Latin: geometric sans with tight headlines. Bengali: Noto Sans Bengali (variable) or Anek Bangla for display headlines. |
| Surface | Frosted translucent panels, thin luminous borders, gradient mesh backgrounds, bento tiles. |
| Motion personality | Fast, crisp, a little sci-fi: depth effects, glow on focus. |
| Trust | Highest "wow", highest risk. Glass and glow read as a tech product, not as care. Blur is costly on low-end phones (section 3). Low contrast over translucent layers risks WCAG 1.4.3. Not recommended as the base. |

#### C. "Editorial Stories" (narrative-first)

| Item | Idea |
|---|---|
| Palette | Cream paper, near-black ink, one rich accent (deep teal), plus muted per-topic tints for tags. |
| Type | Large serif headlines in both scripts: Noto Serif Bengali with a Latin serif; sans for UI. Tiro Bangla only for short pull quotes. |
| Surface | Mostly flat, big type, hairline rules, pull-quote cards, generous white space. Almost no shadow. |
| Motion personality | Quiet storytelling: text reveals, line-by-line fades, a shared-element move from a card into its story. |
| Trust | Very strong. Fits narrative accounts best and is cheapest to run. Risk: close to today's Quiet Clinic, so it may not feel like enough change for the owner. |

### Bengali font options and licences

All are SIL Open Font License 1.1, so free for commercial use and self-hosting. Sizes are the raw TTF files in the Google Fonts repository (WOFF2 plus subsetting will be much smaller; measure it).

| Font | Licence and owner | Form | Raw size | Use |
|---|---|---|---|---|
| Hind Siliguri | OFL 1.1, Indian Type Foundry | Static: Light, Regular, Medium, SemiBold, Bold | about 250 KB per weight | UI and body. Load 2 weights only. |
| Noto Sans Bengali | OFL 1.1, Noto Project | Variable (width, weight) | about 464 KB | Neutral body or UI. |
| Noto Serif Bengali | OFL 1.1, Noto Project | Variable (width, weight) | about 982 KB | Narrative text. Heavy. Subset it. |
| Anek Bangla | OFL 1.1, Anek Project | Variable (width, weight) | about 1.34 MB | Display headlines only. Heaviest. Subset or skip. |
| Tiro Bangla | OFL 1.1, Indigo Project | Regular and Italic only | about 324 KB | Literary look, short quotes. No heavy weights. |

Sources (licence files and file lists in the Google Fonts repository):
- https://github.com/google/fonts/blob/main/ofl/hindsiliguri/OFL.txt
- https://github.com/google/fonts/tree/main/ofl/hindsiliguri
- https://github.com/google/fonts/tree/main/ofl/anekbangla
- https://github.com/google/fonts/tree/main/ofl/notoserifbengali
- https://github.com/google/fonts/tree/main/ofl/notosansbengali
- https://github.com/google/fonts/tree/main/ofl/tirobangla
- Tiro Bangla description (manuscript-inspired, literary): https://raw.githubusercontent.com/google/fonts/main/ofl/tirobangla/DESCRIPTION.en_us.html

Bengali notes (practitioner judgement, test on real devices): about 1.7 line-height for Bengali body text and 1.5 for Latin; no letter-spacing on Bengali; no uppercase transform (the project already forbids it); avoid light weights below 16 px; no faux italic for Bengali.

Font loading rules (https://web.dev/articles/font-best-practices): WOFF2 only, subset with `unicode-range`, preload only the one critical font, limit the number of fonts, consider system fonts for body text. To avoid layout shift, use `font-display: optional` or `swap` plus `size-adjust` and metric overrides on the fallback (https://web.dev/articles/optimize-cls).

## 2. Motion design principles

### Where motion earns its place

| Interaction | Benefit | Suggested treatment |
|---|---|---|
| Page and route change | Keeps orientation | Short cross-fade, or a shared-element move from card to story (View Transitions). |
| List reveal | Shows structure arriving | Small rise plus fade, staggered 30 to 40 ms, first 6 items only. |
| Composer steps | Shows progress and direction | Slide 16 to 24 px with fade; progress marker moves. No bounce. |
| Publish or submit success | Confirms a high-stakes action | One calm tick draw and a text confirmation. No confetti, no points. |
| Skeleton loading | Reduces perceived wait | Static skeleton. Only for page loads of about 2 to 10 seconds. |
| Hover and press | Immediate feedback | 100 ms colour shift or scale 0.98 on press. |
| Home page scroll story | Explains the idea | Light reveals only; no parallax. |

Evidence: Nielsen Norman Group says skeletons suit full-page loads of 2 to 10 seconds, are unnecessary under 1 second, mislead if only a frame is shown, and pulsing effects can be distracting or an accessibility problem. https://www.nngroup.com/articles/skeleton-screens/

### Durations and easing

From the Nielsen Norman Group animation guide (https://www.nngroup.com/articles/animation-duration/):

- Simple feedback: about 100 ms. Moderate changes such as a modal: 200 to 300 ms. Most animation: 100 to 400 ms. At 500 ms animation starts to feel like a drag.
- Entering: ease-out. Exiting: ease-in. Avoid linear.

I could not read the Material 3 token page, so the token values in section 4 are my own set, within these ranges.

### What to avoid

- WCAG 2.3.3 Animation from Interactions (Level AAA): motion animation triggered by interaction can be disabled unless essential. The Understanding page names parallax scrolling as often non-essential, says scroll-triggered element movement can trigger vestibular reactions (dizziness, nausea, headaches, in severe cases needing bed rest), and offers three ways to comply: avoid unnecessary animation, give a control to turn it off, or honour the OS reduce-motion setting. https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- WCAG 2.2.2 Pause, Stop, Hide (Level A): moving, blinking or scrolling content that starts automatically and lasts more than 5 seconds needs a way to pause, stop or hide it; auto-updating content needs the same. The page text I fetched confirmed the structure and the "starts automatically" definition; the 5-second figure is from the criterion itself, which I could not re-fetch in full. https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- MDN lists scaling animations, panning large objects and rapid direction changes as vestibular risks. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- Also avoid flashing (WCAG 2.3.1, three flashes), looping decorative animation, and motion that delays reading or a form.

2.3.3 is AAA, so it is not required by the AA target. The owner's brief says to respect reduced motion, so treat it as a project rule. It is cheap to meet.

### prefers-reduced-motion patterns

From web.dev (https://web.dev/articles/prefers-reduced-motion) and MDN (link above):

- Reduce, do not always remove. Keep small feedback motion; drop decorative motion such as parallax.
- Write motion inside `@media (prefers-reduced-motion: no-preference)`, so motion is opt-in.
- Replace large movement with a short opacity fade (MDN swaps a scale pulse for a dissolve).
- Listen for changes with `matchMedia('(prefers-reduced-motion: reduce)')` for JS-driven motion.
- Android 9+ exposes this as "Remove animations" in Accessibility (MDN table).
- Practitioner judgement: also offer a visible in-app "Reduce motion" toggle, stored locally. Many Android users do not know the OS setting, and WCAG 2.3.3 accepts a site control.

## 3. Performance on low-end Android and South Asian networks

### Context

- Bangladesh, January 2025: 77.7 million internet users, 185 million mobile connections, about 64.9% on 3G, 4G or 5G, median mobile download about 28 Mbps (https://datareportal.com/reports/digital-2025-bangladesh). The median hides a long tail, so budget for the tail.
- 2026 test-device guidance is a Galaxy A24 4G class phone, with the global 75th percentile network at 9 Mbps down and 100 ms RTT. For reach to low-end audiences, target P90 to P95, not P75 (https://infrequently.org/2025/11/performance-inequality-gap-2026/).

### Budgets

For a 3-second load, that source gives (two TLS connections):

| Page type | Total | JavaScript |
|---|---|---|
| JS-light | 2.0 MiB | 0.3 MiB |
| JS-heavy | 1.2 MiB | 0.62 MiB |

Four connections cut the 3-second budget by about 350 KiB. Those figures are for a global P75 network. Our users have a longer tail, so I suggest stricter targets (practitioner judgement; start here, tighten with field data):

| Item | Target for important pages |
|---|---|
| Total transferred, first view | 500 KB or less, compressed |
| JavaScript, first view | 100 KB or less compressed |
| Fonts | 2 to 3 WOFF2 files, about 60 KB or less each after subsetting; one preloaded |
| Images above the fold | One, AVIF or WebP, about 40 KB or less, `fetchpriority="high"` |
| LCP | 2.5 s or less at the 75th percentile |
| INP | 200 ms or less; aim for 150 ms or less |
| CLS | 0.1 or less |

Thresholds from web.dev, all at the 75th percentile: LCP good 2.5 s, poor above 4 s; INP good 200 ms, poor above 500 ms; CLS good 0.1, poor above 0.25. https://web.dev/articles/vitals and https://web.dev/articles/inp. The LCP time split to aim for is about 40% server response, under 10% resource delay, 40% resource download, under 10% render delay: https://web.dev/articles/optimize-lcp

### Which motion is cheap and which is costly

| Technique | Cost | Notes and source |
|---|---|---|
| CSS `transform` and `opacity` | Cheap | The only two properties that skip layout and paint. Animating `top`, `left`, `box-shadow` and similar triggers layout or paint and hurts low-end devices. Each promoted layer uses memory, so do not give everything `will-change`. https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count and https://web.dev/articles/optimize-cls |
| CSS transitions with `@starting-style` | Cheap | Entry animations without JS. Baseline 2024. https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style |
| Same-document View Transitions | Cheap to moderate | Chrome 111+, Edge 111+, Firefox 144+, Safari 18+. https://developer.chrome.com/docs/web-platform/view-transitions |
| Cross-document View Transitions | Moderate | Chrome and Edge 126+, Safari 18.2+, no Firefox. Opt in with `@view-transition { navigation: auto; }`. Slow pages skip the transition after about 4 seconds. Render-blocking can hurt vitals, so measure. https://developer.chrome.com/docs/web-platform/view-transitions/cross-document |
| Scroll-driven animations (`animation-timeline`) | Cheap; can run off the main thread | Chrome and Edge 115+, Safari 26+, Firefox preview only per the Chrome doc. MDN marks it not Baseline. Use as progressive enhancement behind `@supports`. https://developer.chrome.com/docs/css-ui/scroll-driven-animations and https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline |
| Animating height to `auto` (`interpolate-size`) | Layout cost; limited support | Chrome and Edge 129+, not Firefox or Safari. Avoid on long lists. https://developer.chrome.com/docs/css-ui/animate-to-height-auto |
| `backdrop-filter: blur()` and large glass areas | Costly | Baseline 2024, but GPU-heavy. MDN's page gives no numbers, so this rating is practitioner judgement. Test on a real low-end phone. https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter |
| Animated gradients, large animated shadows, canvas or WebGL backgrounds, Lottie, JS animation libraries | Costly | Practitioner judgement. Do not ship on the patient side. |
| Looping skeleton shimmer | Moderate; also an accessibility concern | Use a static skeleton or a very slow opacity change. |

Rule of thumb: the motion budget is zero KB of JavaScript. Use CSS and the browser's own APIs.

## 4. Recommendation

Choose **Direction A, "Warm Paper, Soft Depth"**, borrowing the story-reading quality of C for narrative pages. Reasons: it is clearly richer and warmer than Quiet Clinic, it matches what trusted health products do (NHS, Headspace, Oscar), and it avoids the contrast and performance risks of glass. It can be built with CSS only.

Owner decision points: (1) Hind Siliguri plus Noto Serif Bengali for narrative text, or one font only to save bytes; (2) whether an in-app "Reduce motion" toggle is wanted; (3) whether the home page scroll story is in scope for the first release.

### Design brief for the frontend agent

Colour (check every pair for 4.5:1 text and 3:1 UI before use; values are proposals, not yet contrast-tested):

| Token | Value | Use |
|---|---|---|
| `--paper` | #FAF8F4 | Page background |
| `--surface` | #FFFFFF | Cards |
| `--ink` | #1D2A2E | Text |
| `--ink-muted` | #4A5A5F | Secondary text (check contrast) |
| `--primary` | #0F6B63 | Links, primary buttons |
| `--primary-soft` | #E3F1EE | Tags, hover wash |
| `--accent` | #E0A93B | Decoration only, never text on light |
| `--rule` | #E4DFD6 | Hairlines |
| `--focus` | #1B5FD6 | 3 px focus ring, 2 px offset |
| Emergency strip | Own high-contrast style, never animated | Disclaimer and 999 guidance |

Type (rem, mobile first, size / line-height):

| Role | English | Bengali |
|---|---|---|
| Display | 2 / 1.2 | 2 / 1.4 |
| H1 | 1.5 / 1.25 | 1.5 / 1.45 |
| H2 | 1.25 / 1.3 | 1.25 / 1.5 |
| Body | 1 / 1.55 | 1.0625 / 1.7 |
| Small | 0.875 / 1.5 | 0.9375 / 1.65 |

Fonts: Latin Inter or system UI; Bengali Hind Siliguri 400 and 600 for UI and body; Noto Serif Bengali (subset) and a Latin serif only on story pages. Self-hosted WOFF2 with `unicode-range`, `font-display: swap`, matched fallback metrics. No letter-spacing and no uppercase on Bengali. Use `:lang(bn)` rules for size and line-height.

Shape and depth:

| Token | Value |
|---|---|
| Radius | 8 px controls, 16 px cards, 999 px chips |
| Elevation 0 | hairline border only |
| Elevation 1 | `0 1px 2px rgba(29,42,46,.06), 0 2px 8px rgba(29,42,46,.05)` |
| Elevation 2 | `0 4px 16px rgba(29,42,46,.10)` (menus, dialogs only) |
| Touch target | 44 px minimum (WCAG 2.5.8 requires 24 px at AA) |
| Glass or blur | None on content. At most one small blurred header with a solid fallback. |

Motion tokens (CSS variables; animate only `transform` and `opacity`):

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 100 ms | Press, toggle, hover |
| `--dur-fast` | 160 ms | Chips, tooltips, small fades |
| `--dur-base` | 240 ms | Cards, route fade, composer step |
| `--dur-slow` | 360 ms | Hero reveal, shared-element move (upper limit) |
| `--ease-out` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Entering |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Leaving |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Moves on screen |
| `--stagger` | 40 ms, max 6 items | List reveal |
| Distances | 8 to 16 px rise; 24 px slide for composer steps | No scale above 1.02 |

Choreography rules:

1. Motion explains change (arrival, order, progress, confirmation). If it explains nothing, remove it.
2. Content is readable at once. Nothing waits for an animation to finish. The LCP element is never animated in.
3. Never loop. Nothing auto-plays for more than 5 seconds (WCAG 2.2.2).
4. No parallax, no zoom, no full-screen sweeps, no flashing.
5. Publish success: one tick draw (about 360 ms) and a plain text confirmation. No confetti, streaks, badges or points on medical content.
6. Skeletons: static blocks sized to the final layout (no CLS); only when a load takes over 1 second.
7. Route changes: cross-document View Transitions as an enhancement with a plain fallback. Shared-element moves only from card to story.
8. Home page scroll story: CSS scroll-driven reveals inside `@supports (animation-timeline: view())`, otherwise static.
9. Wrap all motion in `@media (prefers-reduced-motion: no-preference)`. Under `reduce`: keep opacity changes of 100 ms or less and focus and press states; remove slides, scale, stagger, view-transition movement and scroll reveals. Add the in-app toggle (`data-motion="reduced"` on `<html>`) if the owner agrees.
10. The disclaimer and emergency strip are always present, never animated away, never covered by a moving element.
11. No dark patterns: no fake urgency, no countdowns, no auto-advancing carousels, no animated nudges toward sharing.

Checks before release:

- Throttled mid-range Android profile (slow 4G, 4x CPU slowdown): LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less on `/en` and `/bn` home, search and story pages.
- Axe and contrast checks, with reduced motion on and off.
- Bengali rendering check for clipped conjuncts and vowel signs at the set line-heights.
- First-view JS and font bytes measured against the section 3 targets.

## Sources list

- https://service-manual.nhs.uk/design-system/styles/colour
- https://www.headspace.com/
- https://www.oscarhealth.com/
- https://www.awwwards.com/websites/health/
- https://www.nngroup.com/articles/trustworthy-design/
- https://www.nngroup.com/articles/skeleton-screens/
- https://www.nngroup.com/articles/animation-duration/
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- https://web.dev/articles/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://web.dev/articles/vitals
- https://web.dev/articles/inp
- https://web.dev/articles/optimize-lcp
- https://web.dev/articles/optimize-cls
- https://web.dev/articles/font-best-practices
- https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- https://developer.chrome.com/docs/web-platform/view-transitions
- https://developer.chrome.com/docs/web-platform/view-transitions/cross-document
- https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- https://developer.chrome.com/docs/css-ui/animate-to-height-auto
- https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- https://infrequently.org/2025/11/performance-inequality-gap-2026/
- https://datareportal.com/reports/digital-2025-bangladesh
- Google Fonts repository links in the font section
