# Design comparison and selection

Status: Selected direction confirmed. Concept 04b Quiet Clinic (minimal pass) chosen via FD-027 (2026-09-06), supersedes FD-026.

## Selected direction

**Concept 04b Quiet Clinic (minimal pass)** is the chosen Gate 4 design direction. Source prototype: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`. The selection was made via a BMad UX Update run on 2026-09-06 and recorded as founder decision **FD-027** in `docs/status/decision-log.md`. FD-027 supersedes FD-026 (same date), which had initially picked Concept 04 — Quiet Clinic (the warm variant).

Rationale (from FD-027):

- Paper base (`hsl(40 14% 98%)`) and teal-gray accent (`hsl(190 22% 32%)`) with hairline rules at `hsl(200 14% 14% / 0.07)` — quiet, paper-like, no decorative linework, no atmospheric veil, no panel shadow.
- Distributions render as outline-only separate capsules (each with its own count and label and a status dot at top-right tinted by outcome), removing the risk of being read as a single quality score.
- Roundness carried by 10/16/22 px radii and circular avatars, not by a contrasting typeface — the system rounded sans serves as both headings and body.
- Coral is reserved strictly for emergency and danger states so the accent never competes with ordinary actions.
- Motion is CSS-only and limited to five primitives (hero rise, first-screen stagger, capsule hover with left-rule grow, tab underline, button press); eased by `cubic-bezier(.2,.9,.25,1)` and killed by `body[data-motion="off"]` and `prefers-reduced-motion: reduce`.

## Five-direction comparison (FD-025)

The Gate 4 founder override (FD-025) required five materially different, complete design concepts. All five were built; their current status reflects FD-025's "five-direction comparison" scope together with the FD-028 archive decision (which narrowed the live gallery to the three surviving directions):

| # | Direction | Status |
|---|---|---|
| 01 | Bioluminescent Depth | Archived (`ui-design-prototype/.archive/concept-01-bioluminescent-depth/`) |
| 02 | Editorial Futurism | Archived (`ui-design-prototype/.archive/concept-02-editorial-futurism/`) |
| 03 | Luminous Editorial | Live in gallery (`ui-design-prototype/concepts/concept-03-luminous-editorial/`); kept as the editorial reference |
| 04 | Quiet Clinic (warm variant) | Live in gallery as comparison reference (`ui-design-prototype/concepts/concept-04-quiet-clinic/`); the FD-026 pick, superseded by FD-027 in favour of the minimal pass; kept as the warm-vs-minimal comparator |
| 04b | **Quiet Clinic (minimal pass)** | **Selected via FD-027 (2026-09-06); chosen implementation of Concept A. Source prototype:** `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`, runnable at `http://localhost:4173/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` |
| 04c | Quiet Clinic (Editorial sibling) | Archived (`ui-design-prototype/.archive/concept-04c-quiet-clinic-editorial/`); built for side-by-side comparison with 04b during the FD-027 walkthrough; per FD-028 (2026-09-06), moved to archive once 04b was chosen |
| 04d | Quiet Clinic (Modern SaaS sibling) | Archived (`ui-design-prototype/.archive/concept-04d-quiet-clinic-saas/`); built for side-by-side comparison with 04b during the FD-027 walkthrough; per FD-028 (2026-09-06), moved to archive once 04b was chosen |
| 05 | Operator Console | Archived (`ui-design-prototype/.archive/concept-05-operator-console/`) |

The runnable gallery at `http://localhost:4173/ui-design-prototype/` surfaces three directions: **03 Luminous Editorial** (the editorial reference), **04 Quiet Clinic warm** (the warm-vs-minimal comparator), and **04b Quiet Clinic (minimal pass)** (the chosen implementation). 04c and 04d were side-by-side comparators during the FD-027 walkthrough and are archived under `ui-design-prototype/.archive/`; they remain inspectable for any future revisit but are no longer part of the live side-by-side.

## Per-criterion scorecard (superseded)

The original Gate 3 scorecard (clarity, trust, ease of navigation, mobile usability, review/timeline/evidence readability, accessibility, visual appeal, performance, implementation complexity, Bengali/English suitability, long-term maintainability) is no longer the basis of selection. Concept 04b was selected through founder decision after a side-by-side prototype walk-through that included 03, 04, 04c, 04d, and 04b, not by aggregating scores. The scorecard remains historically valid as Gate 3 evidence; it is not used to justify the FD-027 choice. (FD-026 originally picked Concept 04 Quiet Clinic; FD-027 supersedes FD-026 in favour of the 04b minimal pass.)

| Criterion | Concept A (04b minimal pass) | Concept B | Concept C | Evidence / notes |
|---|---:|---:|---:|---|
| Clarity | — | — | — | 04b selected via FD-027 (supersedes FD-026); criteria scoring superseded; side-by-side walkthrough included 03 / 04 / 04c / 04d / 04b |
| Trust | — | — | — | |
| Ease of navigation | — | — | — | |
| Mobile usability | — | — | — | |
| Review readability | — | — | — | |
| Timeline readability | — | — | — | |
| Evidence clarity | — | — | — | |
| Accessibility | — | — | — | |
| Visual appeal | — | — | — | |
| Performance | — | — | — | |
| Implementation complexity | — | — | — | |
| Bengali/English suitability | — | — | — | |
| Long-term maintainability | — | — | — | |

No winner was selected in planning. The winner was selected by founder decision after running the runnable Gate 4 prototype, not by this scorecard.
