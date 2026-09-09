# Frontend-first prototype brief

Status: Gate 4 founder decision: Concept 04b Quiet Clinic (minimal pass) — FD-027, 2026-09-06. Frontend and backend implementation will be built from this direction.  
UX contracts: [DESIGN.md](ux/DESIGN.md) and [EXPERIENCE.md](ux/EXPERIENCE.md)

> **Selected direction (FD-027, 2026-09-06):** Concept 04b Quiet Clinic (minimal pass) is the chosen design direction. Source prototype at `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` (runnable at `http://localhost:4173/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`). Frontend and backend implementation are built from this direction.
>
> **Historical note (superseded):** FD-026 (also 2026-09-06) initially picked Concept 04 — Quiet Clinic (the warm variant). FD-027 supersedes FD-026 and selects the minimal pass instead. FD-026's warm variant (oat + muted teal, serif headings) was kept in the gallery as a comparison reference until 2026-09-08; it is now archived at `ui-design-prototype/.archive/concept-04-quiet-clinic/`.
>
> **Gate 4 founder override (FD-025):** Five directions explored; FD-027 picks 04b; 04c and 04d are archived per FD-028 (2026-09-06), and 03 and 04 followed per FD-029 (2026-09-08), leaving 04b as the only patient direction in the live gallery. Follow the [Gate 4 execution prompt](../handoffs/GATE4_DUMMY_UI_AGENT_PROMPT.md) where it does not conflict with FD-027 and FD-028.
>
> **Motion on 04b:** Motion on 04b is CSS-only (5 primitives); killed by the in-app motion-off toggle and `prefers-reduced-motion`.

## Outcome

Build one maintainable Next.js prototype with shared domain contracts, deterministic synthetic services, and accessible primitives, then render the **Concept 04b Quiet Clinic (minimal pass)** route composition as the selected direction (FD-027, 2026-09-06). Every other direction built under FD-025 — 01, 02, 03, 04, 04c, 04d, 05 — now sits in `ui-design-prototype/.archive/`: 04c and 04d per FD-028 (2026-09-06), then 03 (Luminous Editorial) and 04 (warm Quiet Clinic) on 2026-09-08, once the editorial reference and the warm-vs-minimal comparison were no longer needed. What is live is 04b and the staff console. The prototype is a public read-only USD 0 demo: no real credentials, writes, uploads, patient documents, analytics, or production API.

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

> **Historical note.** These three concept briefs are the Gate 3 starting points. FD-027 selects Concept A as the implementation direction; per FD-027, "Concept A" now means the 04b Quiet Clinic (minimal pass) variant, not the original "Calm Clinical Trust" reading. Concept B (Narrative Patient Stories) and Concept C (Structured Clarity) are not implemented; their wireframes remain in `ux/wireframes/.archive/` for historical reference. The Gate 4 prototype also built 03 (Luminous Editorial) and 04 (warm Quiet Clinic, FD-026) as comparison directions alongside the chosen 04b, and 04c (Editorial) and 04d (Modern SaaS) as side-by-side comparators during the FD-027 walkthrough; all four are now archived — 04c and 04d per FD-028, 03 and 04 on 2026-09-08 — leaving 04b as the only patient direction in the live gallery. See `design-comparison.md`.

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

> **Reconciled 2026-09-07.** The Next.js layout below was the plan; it was never
> built. Gate 4 was delivered as a standalone static tree with no build step, no
> framework and no package workspace. The **as-built** layout is authoritative
> for anyone reading the prototype today; the planned layout is kept because
> ADR-0010 and ARCHITECTURE-SPINE AD-11 still reason about it, and because the
> production `apps/web` build is expected to adopt it.

**As built** (authoritative for the prototype):

```text
ui-design-prototype/
  index.html                      # gallery + hash-route index
  gallery.css
  shared/rogikotha-data.js        # fixtures, i18n dictionary, lookups, search
  concepts/
    concept-04b-quiet-clinic-minimal/   # FD-027 selected direction — the only live one
  admin/                          # staff console, on its own Chart Tray surface system
  .archive/                       # 01, 02, 03, 04, 04c, 04d, 05 + the three admin shell studies
tools/
  coverage.mjs                    # story <-> prototype coverage regenerator
  i18n-audit.mjs                  # missing/unused i18n key audit
```

The concept is a self-contained `index.html` + `styles.css` + `app.js` using
hash routes (`#discover`, `#results`, …), sharing only `shared/rogikotha-data.js`.
There is one admin console, not one per concept.

The staff console does **not** inherit 04b's tokens. It was redesigned onto its
own surface system, **Chart Tray**: four planes — sunken, page, raised, overlay
— where elevation encodes agency. Below the page means read-only (audit log,
evidence viewer), on the page is ground, raised is workable content (lane trays,
the detail tray), and one solid accent fill is the single next action. Lanes
became trays; badge and button are separated by fill band, height (20 px vs
34 px) and radius (4 px vs 9 px) rather than by colour alone; and a docked
"Record decision" commit button was added, since the console that exists to
record a moderation decision previously had no way to finish the job. Dark-mode
surface steps are roughly 1.7× the light steps. The three shell studies that
produced it — A "Chart Tray", B "Ink Ledger", C "Signal Ward" — are archived at
`ui-design-prototype/.archive/admin-shell-studies/`; A was chosen and ported
into the console. `ux/DESIGN.md` remains the patient-side contract only.

**Planned for production `apps/web`** (not built at Gate 4):

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
- [Concept B wireframes](ux/wireframes/.archive/concept-b.md) — archived, historical reference
- [Concept C wireframes](ux/wireframes/.archive/concept-c.md) — archived, historical reference

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
