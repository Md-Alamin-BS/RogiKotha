---
name: RogiKotha Design — Quiet Clinic (Concept 04b, minimal pass)
description: Equal Bengali and English visual system for calm, narrative-first healthcare experience sharing. Selected direction: Concept 04b — Quiet Clinic (minimal pass).
status: final
selected: Concept 04b — Quiet Clinic (minimal pass)
selected-via: BMad UX Update run 2026-09-06 (FD-027)
selected-by: founder decision FD-027
supersedes: FD-026 (Concept 04 — Quiet Clinic, warm variant); prior "blue teal and white" memlog note; "Calm Clinical Trust" Concept A wording; "no winner selected" Gate 3 state
five-direction-scope: FD-025 (all five directions were built and compared; Concept 04b is now the only patient direction in the live gallery — Concept 04c Editorial and Concept 04d Modern SaaS were archived per FD-028, and Concept 03 Luminous Editorial and Concept 04 warm Quiet Clinic followed on FD-029, 2026-09-08 once the warm-vs-minimal comparison had served its purpose)
motion: CSS-only, five primitives (hero rise, stagger, capsule hover, tab underline, button press); see the "Motion (CSS-only, default set)" block in styles.css
updated: 2026-09-06
sources:
  - ../01-requirement-baseline.md
  - ../06-requirement-traceability-matrix.md
  - ../09-frontend-prototype-plan.md
  - ../../../ui-design-prototype/README.md
  - ../../../ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
colors:
  ink: '#22282B'
  muted-ink: '#626B6F'   # hsl(200 6% 41%): re-floored so it clears 4.5:1 on the darker paper and inset
  paper: '#F4F3F0'       # hsl(40 14% 95%), was 98%: the NHS/Apple recipe - paper page under pure-white cards (1.11:1)
  surface: '#FFFFFF'
  surface-2: '#EBEAE7'   # hsl(40 10% 91.5%), was 96%: inset now 1.20:1 against a panel
  rule: 'hsl(200 14% 14% / 0.22)'        # was 0.07 = 1.14:1, invisible. Now 1.55:1 - the divider band real systems use (GOV.UK 1.57, Radix 1.57)
  rule-hard: 'hsl(200 14% 14% / 0.34)'   # was 0.16 = 1.37:1, which is the NHS DEFAULT edge. Now 2.03:1 for hover/active
  rule-strong: 'hsl(200 14% 14% / 0.50)' # 3.13:1 on a panel: the WCAG 1.4.11 floor for a boundary that identifies a control
  input-border: '#626B6F'                # 5.45:1 on a panel, like NHS grey-1
  keyline: '0 2px 0 {colors.rule}'       # NHS nhsuk-card--clickable: a flat bottom edge, zero blur. An edge, not a shadow
  focus: 'hsl(190 22% 32%)'   # = primary. The focus ring reuses the accent; see the colour section.
  danger: '#C8553D'
  warning: '#B8956A'
  success: '#5C8A6E'
  primary: 'hsl(190 22% 32%)'
  primary-soft: '#E2EEEC'
  primary-ink: '#FFFFFF'
  mixed: '#78664A'        # hsl(36 24% 38%), was 42%: 4.60:1 on the new inset
  negative: '#995348'     # hsl(8 36% 44%), was 46%: 4.63:1 on the new inset
  accent-teal: 'hsl(190 22% 32%)'
  accent-teal-soft: '#E4ECEC'
  coral: '#C8553D'
  coral-soft: '#F5DDD3'
typography:
  display:
    fontFamily: 'ui-rounded, "SF Pro Rounded", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif'
    fontSize: 'clamp(2.25rem, 5vw, 4.5rem)'
    fontWeight: 700
    lineHeight: 1.06
  heading:
    fontFamily: 'ui-rounded, "SF Pro Rounded", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif'
    fontSize: 'clamp(1.35rem, 2.2vw, 2rem)'
    fontWeight: 700
    lineHeight: 1.18
  body:
    fontFamily: 'ui-rounded, "SF Pro Rounded", "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.72
  compact:
    fontFamily: '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: '10px'
  md: '16px'
  lg: '22px'
  pill: '9999px'
  avatar: '50%'
spacing:
  # 04b does NOT use a fixed step scale, and no --space-* custom properties
  # exist in styles.css. Measured from the shipped file: 29 distinct px values,
  # only 42% of which fall on a 4px grid. The rhythm is hand-tuned per context
  # - tighter inside a card, generous between cards - which is what the
  # generated root DESIGN.md also records. These values describe what ships;
  # they are not a grid to snap new work to.
  panel-padding: 'clamp(18px, 2.8vw, 30px)'
  main-padding: 'clamp(28px, 4vw, 56px)'
  section-margin: '44px above .section-head, 20px below'
  row-gap: '9px-12px'
  common-steps: '6, 8, 10, 12, 14, 16, 18, 20, 22px (most frequent: 12, 10, 16, 8, 14, 18)'
  gutter: 'see main-padding; there is no separate --gutter token'
components:
  app-header:
    surface: '{colors.surface}'
    border: '{colors.rule}'
    background: '{colors.paper}'
    blur: 'none'
  primary-action:
    foreground: '{colors.primary-ink}'
    background: '{colors.primary}'
    radius: '{rounded.pill}'
    minHeight: '2.75rem'
    shadow: 'none'
  search-box:
    surface: '{colors.surface}'
    radius: '{rounded.pill}'
    border: '{colors.rule}'
    shadow: 'none'
  provenance-badge:
    surface: '{colors.surface-2}'
    foreground: '{colors.muted-ink}'
    radius: '{rounded.pill}'
  experience-card:
    surface: '{colors.surface}'
    border: '{colors.rule}'
    radius: '{rounded.md}'
    shadow: 'none'
  treatment-timeline:
    line: '{colors.rule-hard}'
    current: '{colors.success}'
  evidence-tile:
    surface: '{colors.surface}'
    border: '{colors.rule}'
    radius: '{rounded.md}'
    shadow: 'none'
  status-message:
    surface: '{colors.surface-2}'
    radius: '{rounded.md}'
  warning-panel:
    foreground: '{colors.warning}'
    surface: '#F5E6CF'
    radius: '{rounded.md}'
  modal-dialog:
    surface: '{colors.surface}'
    radius: '{rounded.lg}'
    shadow: 'none'
  distribution-capsules:
    layout: 'row-of-separate-outline-capsules'
    fill: 'none'
    border: '{colors.rule-hard}'
    radius: '{rounded.md}'
    status-dot: 'top-right ::before, tinted by status, grows into 2px left rule on hover'
    positive: '{colors.success}'
    mixed: '{colors.warning}'
    negative: '{colors.coral}'
  avatar:
    shape: '{rounded.avatar}'
motion-primitives:
  easing: 'cubic-bezier(.2,.9,.25,1)'
  kill-switch:
    - 'body[data-motion="off"]'
    - 'prefers-reduced-motion: reduce'
  set:
    - 'hero rise (display headline: 10px translateY + opacity, ~700ms, single coordinated entrance)'
    - 'first-screen stagger (top 5 list rows, 60–220ms delays, then settle; below-the-fold rows do not stagger)'
    - 'capsule hover with left-rule grow (distribution row status dot ::before scales from dot to 2px left rule over 350ms, tinted per outcome)'
    - 'tab underline (top-nav tabs gain a 1px underline that fills scaleX(0)→scaleX(1) over 350ms on the active tab, driven by aria-current="page")'
    - 'button press (.btn / .ctl shift translateY(1px) on :active, 80ms)'
---

# Brand & Style

RogiKotha feels like a calm consulting room for reading first-person experiences. It never resembles a score marketplace, entertainment feed, hospital portal, or medical diagnostic tool. Bengali and English have equal hierarchy, space, and polish; script-specific line wrapping is accommodated without treating either language as secondary.

The selected design direction is **Concept 04b — Quiet Clinic (minimal pass)**, chosen via BMad UX Update run on 2026-09-06 (founder decision FD-027). It supersedes FD-026 (the warm Quiet Clinic variant, Concept 04). Five directions were compared under FD-025; Concept 04b was selected for the calm-consulting-room posture expressed without the warm "consulting-room" skin. Concept 04b is now the only patient direction in the live gallery, at `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`. Concepts 01, 02, 03, 04, 04c, 04d, and 05 are all archived under `ui-design-prototype/.archive/` — 04c and 04d per FD-028 (2026-09-06), then 03 and 04 on 2026-09-08 once the editorial reference and the warm-vs-minimal comparison had served their purpose. They stay inspectable there; they are no longer runnable comparisons.

This file is the visual contract for the patient-facing product. It does not govern the staff console at `ui-design-prototype/admin/`, which was redesigned onto its own surface system — **Chart Tray** — and shares none of the tokens below; see `../09-frontend-prototype-plan.md`.

Quiet Clinic (minimal pass) keeps the FD-026 identity — circular avatars, separate-capsule distributions, opaque surfaces, coral held back for emergencies — and applies the published 2025–2026 healthcare-UX research findings: paper background instead of warm oat, teal-gray instead of teal, hairline rules, no decorative linework, no atmospheric veil, no panel shadow, smaller radii, and an outline-only capsule row with a status dot rather than tinted fills. Roundness is carried by shape — radii, pills, circles — with `ui-rounded` as progressive enhancement on Apple platforms.

> Historical note: FD-026 (2026-09-06, superseded by FD-027) selected the warm Quiet Clinic variant — oat canvas, muted teal primary, 12/20/28 px radii, serif body against a sans interface, distribution capsules with status-tinted fills. FD-027 retains FD-026's identity contract (circular avatars, separate-capsule distributions, opaque surfaces, coral reserved for emergencies) and rewrites the visual deltas to the minimal-pass variant described above. Concept A = Concept 04b from FD-027 onward.

# Colors

The Quiet Clinic (minimal pass) palette is verified against WCAG AA by computing contrast from the tokens as they ship in the file (`tools/contrast.mjs`, which now fails the build if a text pair or a 1.4.11 boundary regresses). **All text pairs clear 4.5:1 in both modes on every surface tier** (lowest: `{colors.muted-ink}` on the inset at 4.53:1, the mixed-outcome label on the inset at 4.60:1), the focus ring clears 3:1, and **every boundary that identifies a control clears 3:1** (`{colors.rule-strong}` 3.13:1, `{colors.input-border}` 5.45:1).

> Correction (2026-09-08). An earlier revision of this paragraph waived 3:1 for the rules as "decorative dividers" and claimed darkening them would undo the thinner-rules identity. The founder's verdict on the running build — *everything looks the same, no division* — was measured and upheld: page-vs-panel sat at 1.04:1 and the divider at 1.14:1, below every restrained system checked (NHS 1.11 / border 1.37; GOV.UK border 1.57; Apple separator 1.71; Material 3 outline-variant 1.70; Radix slate7 1.57). In a design with no fills and no shadows the rules are not decoration, they are the *only* structure, so they were raised into the 1.5–2.1 band those systems use. The thinner-rules clause of FD-027 is superseded by this; the rest of the identity (paper, one accent, opaque, no veil, no drop shadow) stands.

The neutral foundation is paper (`{colors.paper}`, `hsl(40 14% 95%)`) under pure-white panels (`{colors.surface}`) — the NHS grey-5 / Apple grouped-background recipe, a 1.11:1 step — with an inset well (`{colors.surface-2}`) one further step down at 1.20:1. The single primary is a muted teal-gray (`{colors.primary}`, `hsl(190 22% 32%)`). Structure is carried by three rule weights: `{colors.rule}` (`/ 0.22`, 1.55:1) for dividers and resting card edges, `{colors.rule-hard}` (`/ 0.34`, 2.03:1) for hover and active edges, and `{colors.rule-strong}` (`/ 0.50`, 3.13:1) for any boundary that identifies a control. Form controls use `{colors.input-border}`. Clickable cards carry `{colors.keyline}` — a flat 2px bottom edge with zero blur, taken from NHS `nhsuk-card--clickable`; it is an edge, not the panel shadow FD-027 rejected. There are no decorative fills, no atmospheric veil, and no drop shadow.

Coral (`{colors.coral}`) is reserved strictly for emergency and danger states — emergency hotlines, danger panels, and the limited negative-outcome indicator. It is never used for ordinary actions, primary buttons, or accents. The distribution capsule row is **outline-only**: a 1px border in `{colors.rule-hard}`, no fill, with a small status dot at top-right (`::before`) tinted by status (success / warning / coral). The dot grows into a 2px left rule on hover — see the Motion subsection.

Semantic colors map to Quiet Clinic vocabulary: `{colors.success}` (sage-deep) for positive outcomes, `{colors.warning}` (warm sand) for mixed outcomes and cautions, `{colors.danger}` (coral) for negatives and errors. `{colors.focus}` **is** the primary: the focus ring ships as `outline: 2px solid var(--accent)` and there is deliberately no separate focus hue. Measured from the shipped tokens it clears 6.75:1 against the page in light mode and 9.61:1 in dark — comfortably past the 3:1 non-text target. An earlier draft of this file specified a distinct `#3F6F75`; that was never implemented, and the single-accent ring is the confirmed direction.

> Historical note: the FD-026 palette used an oat canvas (`#F2EDE3`), muted teal (`#6FA8A1`), sage/taupe counterpoints, and tinted capsule fills. Those tokens are replaced by the paper / teal-gray / hairline tokens above; FD-026 capsule tints become outline borders with a status dot in 04b.

# Typography

Quiet Clinic (minimal pass) sets **headings and body in the same system rounded sans stack** (`ui-rounded` → `SF Pro Rounded` → `Segoe UI Variable Text` → `Segoe UI` → system-ui). The deliberate departure from FD-026 is dropping the serif body / sans heading contrast — the minimal-pass variant is one continuous voice, not two. The compact UI typography stays in `Segoe UI Variable Display` → `Segoe UI` → system-ui.

Bengali headings and body stay in `Noto Sans Bengali` (no strong serif fallback is shipped for Bengali conjuncts; per FD-024 the system Bengali stack is the equal-language peer of the English stack, and no webfonts ship by rule in this direction).

The display scale (`{typography.display}`) is used for one story-led opening per screen. Section headings use `{typography.heading}`. Long body prose targets roughly 45–75 Latin characters per line with equivalent comfortable Bengali reading measure; do not shrink Bengali to force parity; allow cards and controls to grow.

# Layout & Spacing

Layout starts at 360 px and uses `{spacing.gutter}`. Quiet Clinic centers a calm 72rem shell with 66ch reading columns for long patient stories. The masthead is opaque and sticky, separating from the page with a 1 px hairline rule (`{colors.rule}`) — no frosted glass, no translucent blur, no panel shadow.

Touch targets are at least 44 × 44 CSS pixels. Generous whitespace; long Bangla, mixed script, weak bandwidth, interrupted forms, and limited data are normal states. Evidence canvases may pan inside an explicitly bounded viewer.

The account-detail screen uses a two-column reading grid: a comfortable story column with a sticky margin rail for provenance, distribution, and report action. Below 1040 px the rail stacks under the story.

# Elevation & Depth

Use rules, tonal surfaces and a keyline — never a drop shadow. Quiet Clinic (minimal pass) surfaces are **opaque** — no `backdrop-filter`, no glass blur, no translucent panels. A card is a distinct plane *at rest*: white on paper, a 1 px border in `{colors.rule}` (1.55:1), and for clickable cards the flat `{colors.keyline}` edge (0 2px 0, zero blur). Callouts carry their meaning on a 4 px left keyline in a ≥3:1 colour (NHS inset-text), not on a tinted fill. **No drop shadow** anywhere. The masthead and tray are solid bands of `{colors.paper}`, not frosted strips. Menus/dialogs use no shadow. No animated gradient, no neon glow, no glass.

# Shapes

Quiet Clinic (minimal pass) is round by shape, but tighter than FD-026: `{rounded.sm}` is 10 px, `{rounded.md}` is 16 px, `{rounded.lg}` is 22 px, and a full pill (`{rounded.pill}` = 9999 px) is used for tags, chips, search shell, buttons, segmented controls, and pills. Avatars are circular (`{rounded.avatar}` = 50%), used for doctor, person, and brand marks.

Pills are only for bounded statuses, tags, and controls — never for paragraphs or primary navigation. The distribution pattern uses **separate outline capsules** (each carrying its own count and label) rather than a stacked bar; the capsules are **outline-only with no fill**, and a small status dot at top-right (`::before`) carries the outcome tint. This is the core distribution decision in Quiet Clinic (minimal pass).

# Components

- **AppHeader:** single top-level landmark; sticky, opaque, with brand mark + tabs + language/theme/motion controls. Tabs have a CSS-only underline that fills on the active tab (see Motion).
- **PrimaryAction:** one primary action per region; soft pill in teal-gray; no shadow; destructive actions never inherit the primary color. Buttons press down 1 px on `:active` (see Motion).
- **SearchBox:** opaque pill shell with a soft ring focus; query label, location control, and submit action all visible; suggestions do not silently replace input.
- **ProvenanceBadge:** always textual: Community submitted, Provider confirmed, Admin checked, or Registration not verified.
- **ExperienceCard:** title first, then the **Byline** as the second line, then episode and doctor on a meta line in accent; never displays a star or combined score; white on paper with a 1 px rule and the keyline.
- **Byline:** the only component that renders an author, on every surface (list row, detail lead, comment, own-writing, compose preview). Avatar (initials; `@`+initial for a username; a filled neutral disc for anonymous) → "Written by" → **the name at body size in full ink** (16 px / 650, 18 px on the detail head) → an identity chip whose *text* and *border style* differ for Real name / Username / Anonymous (never colour alone, WCAG 1.4.1) → relationship → date. Anonymous is never a control and never accent-coloured (ADR-0008). On the detail page it sits directly under the H1, above the story, on every viewport. Reads to a screen reader as one sentence in DOM order.
- **DistributionCapsules:** a flex row of separate **outline** capsules, one per outcome (Positive, Mixed, Negative — or Good/Poor where appropriate). Each capsule has a 1 px border in `{colors.rule-hard}`, **no tinted fill**, and a small status dot at top-right (`::before`) tinted by sentiment. Each capsule carries its own count and label, separated by real space. The row cannot be read as a single quantity. On hover the status dot grows into a 2 px left rule tinted per outcome (~350 ms; see Motion).
- **TreatmentTimeline:** separates reviewed treatment, later/alternative care, and follow-up with headings as well as visuals; circular current-status marker in success color.
- **EvidenceTile:** says documents are reviewer-uploaded and not medically validated; processed-copy status is explicit; each tile is opaque, no glass, hairline border, no panel shadow.
- **StatusMessage:** shared anatomy for loading, empty, error, limited, hidden, and tombstone states.
- **WarningPanel:** concise, persistent where required, never blocks ordinary reading unnecessarily.
- **ModalDialog:** reserved for focused confirmation or explanation; long forms use routes/sheets instead; no shadow.
- **EmergencyLines:** coral pills; the only place coral appears as a normal-readable control surface.

# Motion

Motion in Concept 04b is **CSS-only** — no JS, no GSAP, no Web Animations API. There are exactly five primitives, sourced from the 2025–2026 healthcare / SaaS motion research (Sep 2026): one-time entrance, then stillness; every motion is in response to a user action; no decorative looping. All five use the same easing token: `cubic-bezier(.2,.9,.25,1)` (fast-out, soft settle).

1. **Hero rise.** The display headline on every screen reveals once on first paint: 10 px rise + opacity, ~700 ms, single coordinated moment. Subtitle/lede lifts a beat later, then the rest of the opener. After that, the headline is still.
2. **First-screen stagger.** Each row in the first viewport of a list (`.doc-entry`, `.related-card`, `.browse-card`, `.acct`, `.chapters li`, `.compare-col`, `.comment`) reveals in turn with 60–220 ms delays. Capped at 5 rows, then settles. Below-the-fold rows reveal when scrolled into view via the global keyframes — no scroll-driven animation is added here.
3. **Capsule hover with left-rule grow.** On the distribution row, the existing status dot (`::before`, top-right) scales from a small dot into a 2 px left rule over ~350 ms on hover, tinted per outcome. The capsule's border color also animates to `{colors.rule-hard}`. The dot never changes shape — it grows into a rule by changing position and size on the same element.
4. **Tab underline.** Top-nav tabs (`AppHeader` nav) gain a 1 px underline via `::after` that fills from `scaleX(0)` to `scaleX(1)` over ~350 ms when the tab becomes active (`aria-current="page"`). On inactive tabs the underline pre-fills to ~40 % on hover as an affordance.
5. **Button press.** `.btn` and `.ctl` shift `translateY(1px)` on `:active` over 80 ms — the cheapest physical press feedback.

All five primitives are killed by the existing `body[data-motion="off"]` rule (collapses every transition to 1 ms and disables `animation`) and by `@media (prefers-reduced-motion: reduce)` (same effect via the universal-selector rule at the top of `styles.css`). Only 04b carries this default set; motion was never added to Concepts 03 and 04, and both are now archived.

# Do's and Don'ts

- Do foreground the episode story and exact denominators; do not rank doctors with engagement, evidence, or sentiment.
- Do show provenance beside the fact it qualifies; do not hide trust language in tooltips.
- Do make language switching equally visible in either locale; do not label one language "secondary."
- Do use moderate transitions under 250 ms; do not delay reading or movement.
- Do render an immediate equivalent state under reduced motion; do not rely on animation to explain chronology.
- Do mark every demo document and entity as synthetic; do not use a real doctor identity for a negative example.
- Do keep all surfaces opaque; do not introduce `backdrop-filter`, glass blur, or translucent panels.
- Do use the three rule weights (`{colors.rule}` rest, `{colors.rule-hard}` hover, `{colors.rule-strong}` control boundaries) and the flat `{colors.keyline}` on clickable cards; do not introduce drop shadows, decorative linework, an atmospheric veil, or a rule below 1.5:1 that is expected to be seen.
- Do render the author through the Byline component only, at body size in full ink with a labelled identity chip; do not put a name in accent unless it is a link to a page that exists, and never link an anonymous author.
- Do keep distribution capsules outline-only with a status dot; do not tint capsule fills.
- Do reserve coral for emergency and danger only; do not let coral compete with the teal-gray primary.
- Do carry roundness through shape (radii, pills, circular avatars); do not depend on a webfont for roundness.
- Do apply motion only via the five 04b primitives; do not add a sixth.

# How this was selected

1. Five design directions were built per FD-025 (Concept 01 Bioluminescent Depth, Concept 02 Editorial Futurism, Concept 03 Luminous Editorial, Concept 04 Quiet Clinic, Concept 05 Operator Console).
2. The founder reviewed the live gallery at `http://localhost:4173/ui-design-prototype/` and selected Concept 04 Quiet Clinic (recorded as FD-026 on 2026-09-06).
3. The Quiet Clinic prototype was then extended with two additional directions for explicit side-by-side comparison: 04c (Editorial — Substack / Stripe Press / Scroll.in reference) and 04d (Modern SaaS — Linear / Stripe / Notion reference).
4. All four variants (Concept 04 warm, 04b minimal pass, 04c Editorial, 04d Modern SaaS) were reviewed side by side on 2026-09-06. The founder selected Concept 04b — Quiet Clinic (minimal pass) as the implementation direction, recorded as FD-027. FD-026 is superseded.
5. Concept A's identity contract is now "the 04b minimal-pass variant of Quiet Clinic"; Concept A's archived Concept B / Concept C wireframes in `wireframes/.archive/` remain historical references only. Per FD-028 (2026-09-06), Concept 04c (Editorial) and Concept 04d (Modern SaaS) were archived in `ui-design-prototype/.archive/` once 04b was chosen as the implementation direction; Concept 03 (Luminous Editorial) and Concept 04 (warm) were kept a while longer as the editorial reference and the warm-vs-minimal comparison, then archived beside them on 2026-09-08. The live gallery now shows one patient direction — Concept 04b — beside the staff console.
6. DESIGN.md and EXPERIENCE.md were finalized against the 04b prototype tokens, components, and motion primitives via a BMad UX Update run on 2026-09-06. The BMad-UX skill walked Discovery → Finalize, surfaced the FD-026 warm-variant tokens as conflicts, and resolved them through FD-027.
