---
name: RogiKotha Three-Concept Design Contract
description: Equal Bengali and English visual systems for calm, narrative-first healthcare experience sharing.
status: final
updated: 2026-08-30
sources:
  - ../03-research-report.md
  - ../06-requirement-traceability-matrix.md
  - ../09-frontend-prototype-plan.md
colors:
  ink: '#102A43'
  muted-ink: '#486581'
  canvas: '#F8FBFC'
  surface: '#FFFFFF'
  border: '#C9D8E2'
  focus: '#7C3AED'
  danger: '#B42318'
  warning: '#8A4B08'
  success: '#067647'
  concept-a-primary: '#0B6E75'
  concept-a-soft: '#E7F6F6'
  concept-b-primary: '#1463A5'
  concept-b-soft: '#EDF5FC'
  concept-c-primary: '#075E78'
  concept-c-soft: '#E6F3F7'
typography:
  display:
    fontFamily: 'Noto Sans Bengali, Noto Sans, system-ui, sans-serif'
    fontSize: 'clamp(2rem, 5vw, 4.5rem)'
    fontWeight: 700
    lineHeight: 1.12
  heading:
    fontFamily: 'Noto Sans Bengali, Noto Sans, system-ui, sans-serif'
    fontSize: 'clamp(1.35rem, 2.2vw, 2rem)'
    fontWeight: 700
    lineHeight: 1.28
  body:
    fontFamily: 'Noto Sans Bengali, Noto Sans, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.65
  compact:
    fontFamily: 'Noto Sans Bengali, Noto Sans, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: '0.375rem'
  md: '0.75rem'
  lg: '1.25rem'
  xl: '1.75rem'
  full: '9999px'
spacing:
  '1': '0.25rem'
  '2': '0.5rem'
  '3': '0.75rem'
  '4': '1rem'
  '6': '1.5rem'
  '8': '2rem'
  '12': '3rem'
  gutter: 'clamp(1rem, 4vw, 2rem)'
components:
  app-header:
    surface: '{colors.surface}'
    border: '{colors.border}'
  primary-action:
    foreground: '#FFFFFF'
    radius: '{rounded.md}'
    minHeight: '2.75rem'
  search-box:
    surface: '{colors.surface}'
    radius: '{rounded.lg}'
    border: '{colors.border}'
  provenance-badge:
    surface: '{colors.canvas}'
    foreground: '{colors.muted-ink}'
    radius: '{rounded.full}'
  experience-card:
    surface: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  treatment-timeline:
    line: '{colors.border}'
    current: '{colors.concept-a-primary}'
  evidence-tile:
    surface: '{colors.canvas}'
    border: '{colors.border}'
    radius: '{rounded.md}'
  status-message:
    surface: '{colors.canvas}'
    radius: '{rounded.md}'
  warning-panel:
    foreground: '{colors.warning}'
    surface: '#FFF8E8'
    radius: '{rounded.md}'
  modal-dialog:
    surface: '{colors.surface}'
    radius: '{rounded.lg}'
---

# Brand & Style

RogiKotha feels like a calm public-interest service for reading first-person experiences. It never resembles a score marketplace, entertainment feed, hospital portal, or medical diagnostic tool. Bengali and English have equal hierarchy, space, and polish; script-specific line wrapping is accommodated without treating either language as secondary.

The three concepts share trust signals and accessible primitives but make different editorial choices:

- **Concept A — Calm Clinical Trust:** spacious, guided and reassuring; teal anchors, framed sections, conservative motion.
- **Concept B — Narrative Patient Stories:** editorial, human and chronological; stronger story openings, reading progress and generous prose measure.
- **Concept C — Structured Clarity:** compact, comparative and filter-forward; denser information bands, sticky local navigation and explicit metadata.

# Colors

`{colors.canvas}`, `{colors.surface}`, `{colors.ink}` and `{colors.muted-ink}` are the neutral foundation. Each concept uses only its named primary/soft pair for navigation, selection and structural emphasis. Red is reserved for destructive or urgent status, amber for caution, and green for successful completion—not positive/negative episode sentiment. `{colors.focus}` is deliberately distinct from all concept colors and must meet a visible 3:1 component-boundary contrast target. Text/background combinations target WCAG 2.2 AA.

# Typography

Noto Sans Bengali and Noto Sans are equal co-defaults, selected by glyph coverage. Headings use the same semantic ramp in either interface language. Body prose stays between roughly 45 and 75 Latin characters per line, with equivalent comfortable Bengali reading measure determined by visual testing. Do not shrink Bengali to force parity; allow cards and controls to grow.

Concept A uses `{typography.heading}` frequently with short sections. Concept B uses `{typography.display}` for one story-led opening and `{typography.body}` for longer reading. Concept C relies on `{typography.compact}` only for metadata; core content remains `{typography.body}`.

# Layout & Spacing

All concepts start at 360 px and use `{spacing.gutter}`. Concept A centers a calm 72rem shell with 44rem reading columns. Concept B lets the story column dominate and places supporting facts in interruptible side notes on desktop, stacked after the relevant paragraph on mobile. Concept C uses a 12-column desktop grid, a sticky filter rail when space permits, and a single-column mobile sequence.

Touch targets are at least 44 by 44 CSS pixels. Dense metadata may wrap; it never introduces horizontal page scrolling. Evidence canvases may pan inside an explicitly bounded viewer.

# Elevation & Depth

Use borders and tonal surfaces before shadows. Menus/dialogs may use one restrained shadow. Concept B may overlap a story header and first timeline card, but content order remains linear. No glass blur, neon glow, or animated gradient.

# Shapes

Concept A favors `{rounded.lg}`, Concept B mixes `{rounded.sm}` editorial frames with full pills for small labels, and Concept C uses `{rounded.md}` for compact grouping. Pills are only for bounded statuses/tags, never paragraphs or primary navigation.

# Components

- **AppHeader:** single top-level landmark; concept A uses a centered shell, B a magazine masthead, C a compact utility bar.
- **PrimaryAction:** one primary action per region; destructive actions never inherit the concept primary color.
- **SearchBox:** always exposes query label, location control and submit action; suggestions do not silently replace input.
- **ProvenanceBadge:** always textual: Community submitted, Provider confirmed, Admin checked, or Registration not verified.
- **ExperienceCard:** prioritizes episode, condition and narrative; never displays a star or combined score.
- **TreatmentTimeline:** separates reviewed treatment, later/alternative care and follow-up with headings as well as visuals.
- **EvidenceTile:** says documents are reviewer-uploaded and not medically validated; processed-copy status is explicit.
- **StatusMessage:** shared anatomy for loading, empty, error, limited, hidden and tombstone states.
- **WarningPanel:** concise, persistent where required, and never blocks ordinary reading unnecessarily.
- **ModalDialog:** reserved for focused confirmation or explanation; long forms use routes/sheets instead.

# Do's and Don'ts

- Do foreground the episode story and exact denominators; do not rank doctors with engagement, evidence or sentiment.
- Do show provenance beside the fact it qualifies; do not hide trust language in tooltips.
- Do make language switching equally visible in either locale; do not label one language “secondary.”
- Do use moderate expansion/fade transitions under 250 ms; do not delay reading or movement.
- Do render an immediate equivalent state under reduced motion; do not rely on animation to explain chronology.
- Do mark every demo document and entity as synthetic; do not use a real doctor identity for a negative example.
