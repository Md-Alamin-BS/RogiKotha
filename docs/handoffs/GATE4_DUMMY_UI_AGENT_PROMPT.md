# Gate 4 dummy UI execution prompt

You are implementing the runnable RogiKotha design lab in the existing repository. Work autonomously through the sequence below, but do not invent production behavior or begin backend implementation. The outcome must be a polished, fully navigable, synthetic-data UI that the founder can run locally and use to compare five complete design concepts.

## Non-negotiable outcome

Build the public/user interface first. Complete and validate it before starting the admin panel. Every required page must exist in each of five cohesive design concepts, and every concept must have a deliberately designed light mode and dark mode.

This means five complete visual systems and ten theme outputs, not five homepage mockups and not one interface with five color palettes. Each concept must materially differ in layout, navigation, typography, density, component geometry, search experience, profile structure, timeline/evidence presentation, mobile behavior and restrained motion while sharing one behavior, data and accessibility foundation.

The result is a public, read-only, USD 0 demo using deterministic synthetic data. It must not connect to production services or collect real information.

## 1. Establish context before editing

1. Read the root `AGENTS.md` completely and follow it.
2. Inspect `git status`, existing files and the current dependency state. Preserve every unrelated or pre-existing user change. Do not commit unless the user explicitly asks.
3. Read these controlling artifacts in order:
   - `docs/status/current-status.md`
   - `docs/status/decision-log.md`
   - `docs/planning/09-frontend-prototype-plan.md`
   - `docs/planning/ux/DESIGN.md`
   - `docs/planning/ux/EXPERIENCE.md`
   - `docs/architecture/ARCHITECTURE-SPINE.md`
   - `docs/architecture/DEPENDENCY-SELECTIONS.md`
   - `docs/planning/research/technical-ui-component-sources-2026-08-30/research.md`
   - `docs/planning/10-validation-strategy.md`
   - `docs/planning/11-worktree-safe-execution-plan.md`
   - `docs/design/third-party-component-register.md`
4. Reconcile older planning text with founder decision `FD-025`: any reference to only three Gate 4 concepts is superseded. Update the prototype plan, backlog/status records and route examples to five concepts before or alongside implementation. Do not weaken any other founder decision.
5. Treat the visual and experience contracts as minimum requirements. When this prompt is more specific about the number of concepts, ordering or presentation deliverables, this prompt controls Gate 4.

## 2. Research before selecting or copying UI code

Search the current internet using official documentation and primary repositories before installing dependencies or copying components. Do not rely on remembered versions, licences or free-tier terms.

For every candidate, verify:

- current stable version and framework compatibility;
- recent maintenance and known blocking regressions;
- exact licence and permission for commercial use/modification;
- which code is genuinely free versus Pro/paid;
- required dependencies and client-side bundle cost;
- keyboard, screen-reader, contrast and reduced-motion behavior;
- whether it duplicates the selected component foundation.

Read `docs/status/dependency-check-log.md`; reuse a relevant check only if it is less than three days old. Otherwise record a new dated check before implementation. Save material research in `docs/planning/research/`, and record every copied or substantially adapted third-party component in `docs/design/third-party-component-register.md`, including source URL, licence, files, modifications and review status.

Start with these official sources, then expand only where useful:

- shadcn/ui documentation and free blocks: <https://ui.shadcn.com/docs> and <https://ui.shadcn.com/blocks>
- Radix Primitives: <https://www.radix-ui.com/primitives/docs/overview/introduction>
- Tailwind dark mode: <https://tailwindcss.com/docs/dark-mode>
- HyperUI: <https://github.com/markmead/hyperui>
- Flowbite core and licence: <https://flowbite.com/docs/getting-started/introduction/> and <https://flowbite.com/docs/getting-started/license/>
- daisyUI themes: <https://daisyui.com/docs/themes/>
- Magic UI free core: <https://github.com/magicuidesign/magicui>
- Motion Primitives: <https://github.com/ibelick/motion-primitives>
- Tremor admin/dashboard components: <https://github.com/tremorlabs/tremor>
- TanStack Table: <https://tanstack.com/table/latest/docs/overview>
- Recharts: <https://github.com/recharts/recharts>

Preferred direction: one Tailwind + source-owned shadcn/ui + Radix foundation for all concepts. Use HyperUI, free Flowbite core and daisyUI chiefly as pattern/theme references; use Tremor patterns and, only if justified, TanStack Table or Recharts for admin. Use decorative animation libraries very selectively. Do not install five competing UI frameworks. Never use paid, Pro, attribution-required, licence-ambiguous or copied proprietary assets.

If research identifies a better option, document the evidence and trade-off before deviating. Keep the application small and locally runnable.

## 3. Architecture and safety boundaries

Use one shared foundation:

- shared domain/view contracts;
- deterministic Bangladesh-focused synthetic fixture builders;
- typed read-only service interfaces;
- an in-memory/mock adapter;
- shared accessible behavior primitives;
- equal Bengali and English dictionaries;
- shared test support;
- concept-specific tokens, compositions and visual variants.

No component may import raw fixture data directly. Pages consume typed services so the later real backend can replace the adapter without rebuilding the UI.

Do not implement or connect:

- real authentication, accounts, email or sessions;
- a database, production API or external API;
- real form submission, writes, uploads or storage;
- evidence processing or actual patient documents;
- analytics, trackers, telemetry or advertising;
- outbound network calls from the running demo.

Forms and staff actions are explicit simulations with safe local state and reset controls. Prevent accidental writes and outbound requests where practical, and test those boundaries.

Use only fictional people, organizations and documents. No negative story may use a known real doctor or facility. Every synthetic document page must visibly contain this exact notice:

`DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD`

## 4. Five coherent design concepts

Create these as starting directions, then sharpen them through research. Names may be refined, but their differences must remain obvious and defensible.

### Concept A — Calm Clinical Trust

Quiet, reassuring, spacious and highly legible. Guided sections, adjacent provenance cues, calm step cards and a restrained blue/teal clinical palette without implying official medical verification.

### Concept B — Narrative Patient Stories

Editorial and human. Stories and chronology lead, with a strong reading hierarchy, contextual side notes, chapter-like timelines and an unobtrusive reading/action dock.

### Concept C — Structured Modern Clarity

Efficient and scannable. Strong information architecture, compact utility navigation, structured bands, filter-forward search and dense—but still mobile-friendly—metadata.

### Concept D — Warm Community Care

Friendly, familiar and low-friction for broad Bangladeshi use. Approachable language, comfortable rounding, clear progressive disclosure and welcoming community cues. It must not feel childish, gamified, sensational or like social-media engagement bait.

### Concept E — Premium Minimal Healthcare

Elegant, contemporary and highly restrained. Editorial typography, strong whitespace, precise details and a careful balance of narrative and data. It must remain practical, accessible and fast—not luxury decoration at the expense of comprehension.

Each concept needs documented semantic tokens and independent light/dark palettes. Dark mode is not a mechanical inversion. Define surface hierarchy, text, borders, focus, success, warning, danger, links, evidence states and chart colors for each mode. Verify contrast in both modes.

Provide a persistent design-lab switcher for concept, light/dark/system theme, Bengali/English, role, demo state and fixture scenario, plus a reset action. Suggested routing:

- `/design-lab`
- `/design-lab/concept-a/...`
- `/design-lab/concept-b/...`
- `/design-lab/concept-c/...`
- `/design-lab/concept-d/...`
- `/design-lab/concept-e/...`

Equivalent routing is acceptable if every state is directly addressable, reload-safe and easy to compare.

## 5. Public/user UI — complete this first

Implement every item below for all five concepts in light and dark mode. Bengali and English have equal status: neither may be a partial translation, secondary layout or “coming later” experience.

### Discovery and public reading

- home/landing and simple product explanation/onboarding;
- search with Bengali, English and mixed-script queries;
- search results, filters and no-results recovery with provider submission;
- doctor profile;
- facility and branch profile;
- condition/tag page;
- review detail with named, pseudonymous and anonymous variants;
- timeline with short, long and grouped-event examples;
- processed evidence gallery/viewer with provenance, page, zoom, pan, rotate, fullscreen, download simulation and return position;
- comments, one-level replies, mentions, reactions and report entry points;
- warning/emergency resources without automated medical-danger classification.

### Simulated contribution and account journeys

- Quick Review;
- Detailed Review;
- provider/facility submission;
- profile claim;
- email/password registration and sign-in simulation;
- user profile;
- dashboard with drafts, bookmarks, submissions and preferences;
- notifications;
- report flow;
- preview/confirmation states including evidence-publication confirmation.

### Required states

Make loading, skeleton, empty, no-results, success, validation error, service error, permission denied, limited data, hidden, deleted, tombstoned, very long content and mixed-script content directly selectable. Include interrupted form recovery and realistic narrow-mobile behavior.

Do not use star ratings, numeric quality scores, rankings, “best doctor” claims or popularity-as-quality. Narrative, chronology, provenance and optional sentiment/outcome are the product model.

Once the complete public/user matrix is runnable, validate it and fix all critical/high findings before beginning admin work.

## 6. Admin panel — begin only after public validation passes

Build a realistic but entirely simulated admin experience for all five concepts and both themes:

- overview/dashboard with work queues and system status;
- moderation queue, case detail, actions, restoration and appeal history;
- evidence processing/failure queue and processed-copy review;
- provider directory, duplicate merge simulation and profile claims;
- condition/taxonomy and Bengali/English alias management;
- users, roles and capability matrix;
- normally-disabled anonymous-author identity reveal, with Super Admin controls for Admin and Moderator and a visible audit simulation;
- configuration with typed settings, version history, preview, import/export and rollback simulation;
- dynamic 90-day original and 180-day audit/content retention defaults;
- separately logged, previewed bulk action for existing records;
- record-specific legal holds with actor, reason, start, expiry/release and custody log;
- notifications and background-job status;
- audit/content history;
- system health, backup/restore-drill status and privacy-minimized aggregate metrics.

Admin interaction can be denser than the public UI but must remain understandable, responsive and keyboard operable. Destructive-looking actions require clear confirmation and must only alter resettable local demo state.

## 7. Visual, responsive and accessibility quality bar

The experience must be modern, simple and beautiful, with strong visual craft rather than generic scaffolding. Blue, teal and white are allowed but should not make all five concepts look alike. Use real interface copy and realistic synthetic content instead of lorem ipsum.

Design and test at minimum:

- 360 × 800;
- 390 × 844;
- 768 × 1024;
- 1280 × 800;
- 1440 × 900.

Meet a WCAG 2.2 AA foundation: semantic landmarks/headings, logical reading/focus order, visible focus, full keyboard support, accessible names/descriptions, error association, 44px mobile targets, non-color cues, reflow without horizontal page scrolling, correct `lang` handling, contrast in both themes and reduced-motion support. Test Bangla font rendering, long Bangla strings, mixed scripts and 200% zoom. Decorative charts need text/table equivalents.

Prefer responsive composition changes over merely shrinking desktop layouts. Avoid excessive gradients, glass effects, carousels, autoplay, scroll-jacking, infinite feeds and animation that delays reading.

## 8. Validation and comparison evidence

Run and fix, in proportion to the implemented stack:

- formatter/lint;
- typecheck;
- production build;
- component/unit tests;
- main-journey browser tests;
- automated accessibility scans plus keyboard/manual checks;
- reduced-motion checks;
- both-language checks;
- all five viewport checks;
- light and dark checks for every concept;
- forced empty/error/permission/long-content states;
- assertions that the demo performs no real writes, uploads, analytics or external network requests.

Every page must be runnable in every concept. Capture stable, comparable screenshots of the key decision pages in both themes under a structure such as:

`docs/design/screenshots/concept-{a|b|c|d|e}/{light|dark}/`

At minimum capture home, search results, doctor profile, review/timeline/evidence, Quick Review, mobile navigation, admin overview and moderation detail at matched viewports/content. Add more where a concept difference would otherwise be hidden.

Populate `docs/design/design-comparison.md` with side-by-side evidence and concise strengths, risks and maintenance cost for all five concepts. Compare clarity, trust, navigation, mobile usability, narrative readability, timeline/evidence comprehension, accessibility, bilingual suitability, visual appeal, performance, implementation complexity and maintainability. Do not choose the winner for the founder.

## 9. Required execution sequence

1. Inspect repository, controlling documents and dirty worktree.
2. Research current sources; record dependency/licence decisions; reconcile the plan from three to five concepts.
3. Scaffold the shared foundation, deterministic data and safe demo controls.
4. Implement the entire public/user route and state contract for Concepts A–E, each in light and dark.
5. Validate the public/user experience and fix critical/high issues.
6. Implement the entire simulated admin contract for Concepts A–E, each in light and dark.
7. Run the full validation matrix and fix critical/high issues.
8. Capture matched screenshots, finish the comparison document and update status/validation records.
9. Provide exact local run commands and a route index for the founder.
10. Stop for founder selection. Do not consolidate a winner or begin production backend work.

Send concise progress updates during long-running work. If a material ambiguity cannot be resolved from repository evidence and would change product scope, ask one focused question; otherwise make a documented, reversible assumption and continue.

## Completion criteria

Do not declare completion after building a landing page, a static image, an isolated component gallery, only three concepts, only one language or only one theme. Completion requires:

- five materially distinct, fully navigable design concepts;
- all required public/user pages and states in every concept;
- deliberate light and dark modes for every concept;
- complete, equally capable Bengali and English interfaces;
- public/user validation completed before admin implementation;
- all required admin pages in every concept;
- deterministic synthetic Bangladesh-focused data and visible document notices;
- no production backend, external writes, trackers or real personal data;
- dependency/licence/component-source records updated;
- tests/build passing or every remaining limitation clearly documented;
- matched comparison screenshots and a five-concept decision matrix;
- exact run instructions and route index;
- status documents updated without disturbing unrelated worktree changes.
