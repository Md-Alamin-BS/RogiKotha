# Frontend-first prototype brief

Status: Gate 4 founder decision: Concept 04b Quiet Clinic (minimal pass) — FD-027, 2026-09-06. Frontend and backend implementation will be built from this direction.  
UX contracts: [DESIGN.md](ux/DESIGN.md) and [EXPERIENCE.md](ux/EXPERIENCE.md)

> **Selected direction (FD-027, 2026-09-06):** Concept 04b Quiet Clinic (minimal pass) is the chosen design direction. Source prototype at `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` (runnable at `http://localhost:4173/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`). Frontend and backend implementation are built from this direction.
>
> **Historical note (superseded):** FD-026 (also 2026-09-06) initially picked Concept 04 — Quiet Clinic (the warm variant). FD-027 supersedes FD-026 and selects the minimal pass instead. FD-026's warm variant (oat + muted teal, serif headings) remains in the live gallery at `ui-design-prototype/concepts/concept-04-quiet-clinic/` as a comparison reference.
>
> **Gate 4 founder override (FD-025):** Five directions explored; FD-027 picks 04b; 03 and 04 remain comparison references in the live gallery; 04c and 04d are archived per FD-028 (2026-09-06). Follow the [Gate 4 execution prompt](../handoffs/GATE4_DUMMY_UI_AGENT_PROMPT.md) where it does not conflict with FD-027 and FD-028.
>
> **Motion on 04b:** Motion on 04b is CSS-only (5 primitives); killed by the in-app motion-off toggle and `prefers-reduced-motion`.

## Outcome

Build one maintainable Next.js prototype with shared domain contracts, deterministic synthetic services, and accessible primitives, then render the **Concept 04b Quiet Clinic (minimal pass)** route composition as the selected direction (FD-027, 2026-09-06). Concept 03 Luminous Editorial is also rendered for runnable comparison under FD-025; Concept 04 (warm Quiet Clinic) remains in the live gallery as the warm-vs-minimal comparator; Concepts 04c (Editorial) and 04d (Modern SaaS) are archived per FD-028 (2026-09-06) since 04b was chosen, with their source in `ui-design-prototype/.archive/`. The prototype is a public read-only USD 0 demo: no real credentials, writes, uploads, patient documents, analytics, or production API.

## Design principles

1. Experience first, not provider verdict: narrative and chronology lead; no stars or quality score.
2. Trust beside the claim: user-reported, provenance, verification and processed-document status appear where they qualify content.
3. Equal languages: Bengali and English have equal information, prominence, route capability and test coverage.
4. Simple first: public reading is open; contribution/admin actions are understandable simulations, not complex policy lectures.
5. Mobile reading survives reality: long Bangla, mixed script, weak bandwidth, interrupted forms and limited data are normal states.
6. Safe by composition: fixtures are synthetic, services are read-only and no component imports fixture data directly.

## Reference-pattern analysis

| Pattern family | Keep | Adapt | Reject |
|---|---|---|---|
| Public-health information | calm hierarchy, plain risk language, visible emergency routing | reduce institutional density; make stories primary | authority styling that implies medical verification |
| Long-form editorial | comfortable measure, chronology, section anchors | add structured provenance and mobile actions | decorative hero layouts that delay search |
| Review/community | discoverability, discussion context, reporting access | replace rating prominence with narrative distributions | stars, leaderboards, popularity-as-quality, infinite engagement feed |
| Evidence viewers | page position, zoom, rotate, download and return point | lead with processed-copy/provenance status | raw-original links, authenticity seals, inaccessible canvas-only controls |
| Government/service forms | clear progress, saved state, error recovery | use warmer language and fewer steps | bureaucratic copy, modal wizards, destructive timeout |

These are pattern categories, not permission to copy components. Every adapted external component requires an entry in `docs/design/third-party-component-register.md`.

## Three concept briefs (historical Gate 3)

> **Historical note.** These three concept briefs are the Gate 3 starting points. FD-027 selects Concept A as the implementation direction; per FD-027, "Concept A" now means the 04b Quiet Clinic (minimal pass) variant, not the original "Calm Clinical Trust" reading. Concept B (Narrative Patient Stories) and Concept C (Structured Clarity) are not implemented; their wireframes remain in `ux/wireframes/.archive/` for historical reference. The Gate 4 prototype adds two surviving live comparison directions — 03 (Luminous Editorial) and 04 (warm Quiet Clinic, FD-026) — alongside the chosen 04b; 04c (Editorial) and 04d (Modern SaaS) were side-by-side comparators during the FD-027 walkthrough and are archived per FD-028; see `design-comparison.md`.

| Dimension | A — Calm Clinical Trust *(→ 04b minimal pass)* | B — Narrative Patient Stories *(not implemented)* | C — Structured Clarity *(not implemented)* |
|---|---|---|---|
| Composition | centered guided sections and trust rail | editorial story column with contextual side notes | dense grid, sticky local navigation and comparison bands |
| Navigation | calm header + mobile bottom actions | masthead + reading/action dock | compact utility bar + mobile command sheet |
| Typography | balanced headings/body | strongest display/story hierarchy | compact metadata with normal-size narrative |
| Search | prominent guided search with suggested examples | question-led narrative search | filter-forward search with visible query grammar |
| Profile | overview sections with provenance adjacent | latest stories lead, facts interrupt carefully | facts/branches/tags in scannable bands |
| Timeline | calm step cards | editorial chapters and current-status opening | compact grouped event rail/table hybrid |
| Evidence | reassuring tiles and viewer sheet | inline chapter attachments | structured document tray with status columns |
| Motion | short fades/expansion *(→ CSS-only five primitives in 04b)* | reading-progress and restrained chapter reveal | near-instant filter/list transitions |
| Main risk | too generic/clinical | slower scanning | intimidating density on mobile |

FD-027 selects Concept A → Concept 04b (minimal pass). Comparison criteria were clarity, trust, navigation, mobile usability, review/timeline/evidence readability, accessibility, visual appeal, performance, complexity, bilingual suitability and maintainability.

## Route and state inventory

Each concept implements the same route contract under `/design-lab/concept-{a|b|c}`: home, search, no results, doctor, facility/branch, condition/tag, review, timeline, evidence viewer, quick/detailed wizards, provider submission, claim, registration/sign-in simulation, user profile, dashboard, notifications, report, emergency/advice warnings, and admin overview/moderation/evidence/config examples. Hidden, deleted, tombstone, empty, loading, error, permission-denied, long-content and limited-data states are addressable with a demo-state query/control.

## Shared prototype architecture

```text
apps/web/
  app/design-lab/                 # index and concept routes
  features/                       # behavior/domain-oriented UI
  design-systems/concept-a|b|c/   # tokens, compositions, variants
  services/                       # service interfaces + demo adapter
packages/
  contracts/                      # view models and schemas
  ui/                             # accessible behavior primitives
  i18n/                           # equal Bengali/English dictionaries
  test-support/                   # deterministic synthetic builders/corpus
```

Concepts may not fork contracts, services, fixtures, validation rules or accessibility semantics. They may own route composition, visual tokens, component variants and motion. Any shared-file change during parallel concept work requires coordination.

## Synthetic data contract

Include fictional Bangladesh-focused doctors, facilities/branches and locations; Bengali, English and Banglish queries; all sentiment/outcome values; short/long timelines; evidence/no-evidence; named/pseudonymous/anonymous authors; sparse/hidden/deleted states. Names must be generated and collision-reviewed. No negative story uses a known real clinician or facility. Every document page contains `DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD` in visible pixels.

## Wireframe handoff

- [Concept A wireframes](ux/wireframes/concept-a.md)
- [Concept B wireframes](ux/wireframes/concept-b.md)
- [Concept C wireframes](ux/wireframes/concept-c.md)

Wireframes cover the same search → profile → review/timeline/evidence journey and Quick Review on desktop and mobile. All other surfaces are spine-defined; Gate 4 may add a visual reference only when composition remains ambiguous.

## Gate 4 build order

1. Scaffold foundation and read-only demo services; prove no writes/outbound analytics.
2. Implement shared semantics, language/state/role/concept controls and design-lab index.
3. Freeze route behavior and shared fixtures, then implement A/B/C in separate directories in parallel-safe worktrees.
4. Connect every required surface and state; add component/unit tests during each task.
5. Run the validation matrix, capture comparable screenshots and populate design comparison/known issues.
6. Stop for founder selection. Do not consolidate a winner or start production backend/auth/evidence.

## Approval checkpoint

Gate 3 approves design direction and implementation instructions, not a visual winner. Gate 4 begins only with explicit implementation approval and ends with a founder choice: concept A, B, C, a specified combination, or requested revisions.
