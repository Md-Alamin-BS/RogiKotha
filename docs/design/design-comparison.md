# Design comparison and selection

Status: Selected direction confirmed. Concept 04b Quiet Clinic (minimal pass) chosen via FD-027 (2026-09-06), supersedes FD-026. The staff console is a separate comparison with its own outcome — variant A, Chart Tray, of three admin shell studies.

## Selected direction

**Concept 04b Quiet Clinic (minimal pass)** is the chosen Gate 4 design direction. Source prototype: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`. The selection was made via a BMad UX Update run on 2026-09-06 and recorded as founder decision **FD-027** in `docs/status/decision-log.md`. FD-027 supersedes FD-026 (same date), which had initially picked Concept 04 — Quiet Clinic (the warm variant).

Rationale (from FD-027):

- Paper base (`hsl(40 14% 98%)`) and teal-gray accent (`hsl(190 22% 32%)`) with hairline rules at `hsl(200 14% 14% / 0.07)` — quiet, paper-like, no decorative linework, no atmospheric veil, no panel shadow.
- Distributions render as outline-only separate capsules (each with its own count and label and a status dot at top-right tinted by outcome), removing the risk of being read as a single quality score.
- Roundness carried by 10/16/22 px radii and circular avatars, not by a contrasting typeface — the system rounded sans serves as both headings and body.
- Coral is reserved strictly for emergency and danger states so the accent never competes with ordinary actions.
- Motion is CSS-only and limited to five primitives (hero rise, first-screen stagger, capsule hover with left-rule grow, tab underline, button press); eased by `cubic-bezier(.2,.9,.25,1)` and killed by `body[data-motion="off"]` and `prefers-reduced-motion: reduce`.

## Five-direction comparison (FD-025)

The Gate 4 founder override (FD-025) required five materially different, complete design concepts. All five were built; their current status reflects FD-025's "five-direction comparison" scope together with the archive passes that followed it — FD-028 (2026-09-06) narrowed the live gallery to three directions, and on 2026-09-08 Concepts 03 and 04 were archived as well, leaving 04b as the only patient direction in `ui-design-prototype/concepts/`:

| # | Direction | Status |
|---|---|---|
| 01 | Bioluminescent Depth | Archived (`ui-design-prototype/.archive/concept-01-bioluminescent-depth/`, on branch `archive/full-project-2026-11-09`) |
| 02 | Editorial Futurism | Archived (`ui-design-prototype/.archive/concept-02-editorial-futurism/`, on branch `archive/full-project-2026-11-09`) |
| 03 | Luminous Editorial | Archived (`ui-design-prototype/.archive/concept-03-luminous-editorial/`, on branch `archive/full-project-2026-11-09`); the editorial reference through the FD-027 and FD-028 walkthroughs, archived from the live gallery on 2026-09-08 |
| 04 | Quiet Clinic (warm variant) | Archived (`ui-design-prototype/.archive/concept-04-quiet-clinic/`, on branch `archive/full-project-2026-11-09`); the FD-026 pick, superseded by FD-027 in favour of the minimal pass; served as the warm-vs-minimal comparator until it was archived on 2026-09-08 (FD-029) |
| 04b | **Quiet Clinic (minimal pass)** | **Selected via FD-027 (2026-09-06); chosen implementation of Concept A, and the only direction left in `concepts/`. Source prototype:** `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`, runnable at `http://localhost:4173/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` |
| 04c | Quiet Clinic (Editorial sibling) | Archived (`ui-design-prototype/.archive/concept-04c-quiet-clinic-editorial/`, on branch `archive/full-project-2026-11-09`); built for side-by-side comparison with 04b during the FD-027 walkthrough; per FD-028 (2026-09-06), moved to archive once 04b was chosen |
| 04d | Quiet Clinic (Modern SaaS sibling) | Archived (`ui-design-prototype/.archive/concept-04d-quiet-clinic-saas/`, on branch `archive/full-project-2026-11-09`); built for side-by-side comparison with 04b during the FD-027 walkthrough; per FD-028 (2026-09-06), moved to archive once 04b was chosen |
| 05 | Operator Console | Archived (`ui-design-prototype/.archive/concept-05-operator-console/`, on branch `archive/full-project-2026-11-09`) |

The runnable gallery at `http://localhost:4173/ui-design-prototype/` now surfaces two artefacts rather than a side-by-side of directions: **04b Quiet Clinic (minimal pass)**, the chosen patient direction, and the **staff console** at `ui-design-prototype/admin/`. Every other direction — 01, 02, 03, 04, 04c, 04d and 05 — was archived under `ui-design-prototype/.archive/`, which is kept on branch `archive/full-project-2026-11-09`. They remain inspectable there for any future revisit, and they are the record of how 04b was arrived at, but none of them is live and none is a candidate for production.

## Staff console shell studies (A / B / C)

The staff console was rebuilt on its own surface system instead of inheriting 04b's tokens. Three complete shells were built over the same markup and the same fictional records, each answering the same four measured faults through a different primary mechanism: a surface ramp roughly half the strength of every shipped system (light page→card 1.042:1 against Primer's 1.065 and Polaris's 1.129, with a light-mode-sized step used in dark mode), gaps that did not group (lane boundary vs row gap at 1.58×, then cancelled by an identical hairline on both), a type ramp narrower than one type step (89% of text runs inside a 3.0px band), and no visible difference between a badge and a button (36 pill-shaped objects in the queue, 29 of them not interactive, the read-only one rendering heavier).

| Variant | Primary mechanism | Status |
|---|---|---|
| A | **Chart Tray** — surface planes | **Chosen; ported into `ui-design-prototype/admin/`.** Source study archived at `ui-design-prototype/.archive/admin-shell-studies/variant-a.html`, on branch `archive/full-project-2026-11-09` |
| B | Ink Ledger — type and ink density | Archived (`ui-design-prototype/.archive/admin-shell-studies/variant-b.html`, on branch `archive/full-project-2026-11-09`); badges lose their box entirely, a 2.24× type ramp, best under forced-colors — but it leans on a font stack the prototype does not ship, and Bengali's weight ladder collapses on Nirmala UI |
| C | Signal Ward — chroma budget | Archived (`ui-design-prototype/.archive/admin-shell-studies/variant-c.html`, on branch `archive/full-project-2026-11-09`); severity rides on fill inversion, glyph and rail width rather than hue, since red and amber collide under deuteranopia at every legible pair — but it is the loudest of the three and the easiest to break |

The side-by-side write-up, including the full comparison table, is at `ui-design-prototype/.archive/admin-shell-studies/index.html` on branch `archive/full-project-2026-11-09`.

Chart Tray's one rule is that **elevation encodes agency**. Four planes — sunken, page, raised, overlay — carry the structure that hairlines used to: below the page means you cannot act on it (the audit timeline, the evidence viewer), on the page is ground, raised is workable content (the lane trays, the case tray), and one solid accent fill is the thing to do next. Each lane becomes a tray, which took hairlines from about nineteen per screen to eight. Badges and buttons are separated by fill band, height and radius, so a read-only count can no longer render heavier than a control. A docked **Record decision** button commits the moderation decision — the previous pass had ten option buttons, a textarea and no submit anywhere. Dark-mode surface steps are roughly 1.7× the light steps, because a tint that reads on paper all but vanishes on near-black; the cost is that light mode is the weaker of the two modes, and that the system dies in forced-colors, where backgrounds are stripped.

The console's five identical unlabelled nav pills were replaced at the same time by a grouped, iconed, counted top nav — Casework (queue, evidence, providers) and Oversight (notifications, config) — with a breadcrumb above the view and a bottom tab bar under 760px.

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
