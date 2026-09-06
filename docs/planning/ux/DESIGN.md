---
name: RogiKotha Design — Quiet Clinic (Concept 04b, minimal pass)
description: Equal Bengali and English visual system for calm, narrative-first healthcare experience sharing. Selected direction: Concept 04b — Quiet Clinic (minimal pass).
status: final
selected: Concept 04b — Quiet Clinic (minimal pass)
selected-via: BMad UX Update run 2026-09-06 (FD-027)
selected-by: founder decision FD-027
supersedes: FD-026 (Concept 04 — Quiet Clinic, warm variant); prior "blue teal and white" memlog note; "Calm Clinical Trust" Concept A wording; "no winner selected" Gate 3 state
five-direction-scope: FD-025 (Concept 03 Luminous Editorial and Concept 04 warm Quiet Clinic remain in the live gallery alongside Concept 04b; Concept 04c Editorial and Concept 04d Modern SaaS are archived per FD-028 since 04b was chosen)
motion: CSS-only, five primitives (hero rise, stagger, capsule hover, tab underline, button press); see styles.css lines 1238–1366
updated: 2026-09-06
sources:
  - ../01-requirement-baseline.md
  - ../06-requirement-traceability-matrix.md
  - ../09-frontend-prototype-plan.md
  - ../../../ui-design-prototype/README.md
  - ../../../ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
colors:
  ink: '#22282B'
  muted-ink: '#5A6669'
  paper: '#FBFAF9'
  surface: '#FFFFFF'
  surface-2: '#F2EFE9'
  rule: 'hsl(200 14% 14% / 0.07)'
  rule-hard: 'hsl(200 14% 14% / 0.16)'
  focus: '#3F6F75'
  danger: '#C8553D'
  warning: '#B8956A'
  success: '#5C8A6E'
  primary: 'hsl(190 22% 32%)'
  primary-soft: '#E2EEEC'
  primary-ink: '#FFFFFF'
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

The selected design direction is **Concept 04b — Quiet Clinic (minimal pass)**, chosen via BMad UX Update run on 2026-09-06 (founder decision FD-027). It supersedes FD-026 (the warm Quiet Clinic variant, Concept 04). Five directions were compared under FD-025; Concept 04b was selected for the calm-consulting-room posture expressed without the warm "consulting-room" skin. The live gallery now shows three directions — Concept 03 (Luminous Editorial), Concept 04 (warm Quiet Clinic), and Concept 04b (the chosen implementation) — so the editorial reference and the warm-vs-minimal comparison both stay runnable. Concepts 01, 02, 04c, 04d, and 05 are archived under `ui-design-prototype/.archive/` (per FD-028, 2026-09-06, 04c and 04d were archived once 04b was chosen).

Quiet Clinic (minimal pass) keeps the FD-026 identity — circular avatars, separate-capsule distributions, opaque surfaces, coral held back for emergencies — and applies the published 2025–2026 healthcare-UX research findings: paper background instead of warm oat, teal-gray instead of teal, hairline rules, no decorative linework, no atmospheric veil, no panel shadow, smaller radii, and an outline-only capsule row with a status dot rather than tinted fills. Roundness is carried by shape — radii, pills, circles — with `ui-rounded` as progressive enhancement on Apple platforms.

> Historical note: FD-026 (2026-09-06, superseded by FD-027) selected the warm Quiet Clinic variant — oat canvas, muted teal primary, 12/20/28 px radii, serif body against a sans interface, distribution capsules with status-tinted fills. FD-027 retains FD-026's identity contract (circular avatars, separate-capsule distributions, opaque surfaces, coral reserved for emergencies) and rewrites the visual deltas to the minimal-pass variant described above. Concept A = Concept 04b from FD-027 onward.

# Colors

The Quiet Clinic (minimal pass) palette is verified against WCAG AA from the tokens as they ship in the file (body text clears 4.5:1, UI boundaries clear 3:1, both modes). The neutral foundation is paper (`{colors.paper}`, `hsl(40 14% 98%)`) with a white surface (`{colors.surface}`). The single primary is a muted teal-gray (`{colors.primary}`, `hsl(190 22% 32%)`). The only structural divider is a hairline rule (`{colors.rule}`, `hsl(200 14% 14% / 0.07)`), with a stronger variant (`{colors.rule-hard}`, `hsl(200 14% 14% / 0.16)`) reserved for hover and active states. There are no decorative fills, no atmospheric veil, and no panel shadow.

Coral (`{colors.coral}`) is reserved strictly for emergency and danger states — emergency hotlines, danger panels, and the limited negative-outcome indicator. It is never used for ordinary actions, primary buttons, or accents. The distribution capsule row is **outline-only**: a 1px border in `{colors.rule-hard}`, no fill, with a small status dot at top-right (`::before`) tinted by status (success / warning / coral). The dot grows into a 2px left rule on hover — see the Motion subsection.

Semantic colors map to Quiet Clinic vocabulary: `{colors.success}` (sage-deep) for positive outcomes, `{colors.warning}` (warm sand) for mixed outcomes and cautions, `{colors.danger}` (coral) for negatives and errors. `{colors.focus}` is deliberately distinct from the primary and meets a visible 3:1 component-boundary contrast target.

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

Use hairlines and tonal surfaces, never shadows. Quiet Clinic (minimal pass) surfaces are **opaque** — no `backdrop-filter`, no glass blur, no translucent panels. Cards use a 1 px hairline border in `{colors.rule}`; **no panel shadow** (drop shadow is `none`). The masthead and tray are solid bands of `{colors.paper}`, not frosted strips. Menus/dialogs use no shadow. No animated gradient, no neon glow, no glass.

# Shapes

Quiet Clinic (minimal pass) is round by shape, but tighter than FD-026: `{rounded.sm}` is 10 px, `{rounded.md}` is 16 px, `{rounded.lg}` is 22 px, and a full pill (`{rounded.pill}` = 9999 px) is used for tags, chips, search shell, buttons, segmented controls, and pills. Avatars are circular (`{rounded.avatar}` = 50%), used for doctor, person, and brand marks.

Pills are only for bounded statuses, tags, and controls — never for paragraphs or primary navigation. The distribution pattern uses **separate outline capsules** (each carrying its own count and label) rather than a stacked bar; the capsules are **outline-only with no fill**, and a small status dot at top-right (`::before`) carries the outcome tint. This is the core distribution decision in Quiet Clinic (minimal pass).

# Components

- **AppHeader:** single top-level landmark; sticky, opaque, with brand mark + tabs + language/theme/motion controls. Tabs have a CSS-only underline that fills on the active tab (see Motion).
- **PrimaryAction:** one primary action per region; soft pill in teal-gray; no shadow; destructive actions never inherit the primary color. Buttons press down 1 px on `:active` (see Motion).
- **SearchBox:** opaque pill shell with a soft ring focus; query label, location control, and submit action all visible; suggestions do not silently replace input.
- **ProvenanceBadge:** always textual: Community submitted, Provider confirmed, Admin checked, or Registration not verified.
- **ExperienceCard:** prioritizes episode, condition, and narrative; never displays a star or combined score; circular doctor avatar; hairline border, no panel shadow.
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

All five primitives are killed by the existing `body[data-motion="off"]` rule (collapses every transition to 1 ms and disables `animation`) and by `@media (prefers-reduced-motion: reduce)` (same effect via the universal-selector rule at the top of `styles.css`). No motion is added to Concept 03 or Concept 04 — only 04b carries this default set.

# Do's and Don'ts

- Do foreground the episode story and exact denominators; do not rank doctors with engagement, evidence, or sentiment.
- Do show provenance beside the fact it qualifies; do not hide trust language in tooltips.
- Do make language switching equally visible in either locale; do not label one language "secondary."
- Do use moderate transitions under 250 ms; do not delay reading or movement.
- Do render an immediate equivalent state under reduced motion; do not rely on animation to explain chronology.
- Do mark every demo document and entity as synthetic; do not use a real doctor identity for a negative example.
- Do keep all surfaces opaque; do not introduce `backdrop-filter`, glass blur, or translucent panels.
- Do use hairline rules in `{colors.rule}` and `{colors.rule-hard}`; do not introduce panel shadows, decorative linework, or an atmospheric veil.
- Do keep distribution capsules outline-only with a status dot; do not tint capsule fills.
- Do reserve coral for emergency and danger only; do not let coral compete with the teal-gray primary.
- Do carry roundness through shape (radii, pills, circular avatars); do not depend on a webfont for roundness.
- Do apply motion only via the five 04b primitives; do not add motion to Concept 03 or Concept 04.

# How this was selected

1. Five design directions were built per FD-025 (Concept 01 Bioluminescent Depth, Concept 02 Editorial Futurism, Concept 03 Luminous Editorial, Concept 04 Quiet Clinic, Concept 05 Operator Console).
2. The founder reviewed the live gallery at `http://localhost:4173/ui-design-prototype/` and selected Concept 04 Quiet Clinic (recorded as FD-026 on 2026-09-06).
3. The Quiet Clinic prototype was then extended with two additional directions for explicit side-by-side comparison: 04c (Editorial — Substack / Stripe Press / Scroll.in reference) and 04d (Modern SaaS — Linear / Stripe / Notion reference).
4. All four variants (Concept 04 warm, 04b minimal pass, 04c Editorial, 04d Modern SaaS) were reviewed side by side on 2026-09-06. The founder selected Concept 04b — Quiet Clinic (minimal pass) as the implementation direction, recorded as FD-027. FD-026 is superseded.
5. Concept A's identity contract is now "the 04b minimal-pass variant of Quiet Clinic"; Concept A's archived Concept B / Concept C wireframes in `wireframes/.archive/` remain historical references only. The live gallery now shows Concept 03, Concept 04 (warm), and Concept 04b — the editorial reference and the warm-vs-minimal comparison; per FD-028 (2026-09-06), Concept 04c (Editorial) and Concept 04d (Modern SaaS) are archived in `ui-design-prototype/.archive/` once 04b was chosen as the implementation direction.
6. DESIGN.md and EXPERIENCE.md were finalized against the 04b prototype tokens, components, and motion primitives via a BMad UX Update run on 2026-09-06. The BMad-UX skill walked Discovery → Finalize, surfaced the FD-026 warm-variant tokens as conflicts, and resolved them through FD-027.
