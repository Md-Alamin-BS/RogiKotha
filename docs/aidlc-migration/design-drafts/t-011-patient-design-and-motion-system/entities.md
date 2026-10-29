# Entities — U45 `t-011-patient-design-and-motion-system`

Source of truth for the shape of the patient design and motion system. This Unit stores nothing and has no domain data: its "entities" are the design-system objects every later patient Unit builds on. They are tokens, preferences, motion primitives, the never-animated elements, view-transition groups and the one font asset. The concrete token values are in `frontend-components.md` § 3. The decision logic that uses these entities is in `rules.md`, and the ordered behaviour is in `functional-spec.md`.

Built from `unit-of-work.md` (U45), `unit-of-work-story-map.md` (US2.4, US2.3), `requirements.md` (NFR13, FR95, NFR1, NFR4, NFR5, NFR6, NFR7), `components.md` (no domain component; presentation lives in `apps/web`), `contract-summary.md` (U45 has no runtime contract; C14 unchanged), FD-091 and the answers in `functional-design-questions.md`. All are answered A: Q1–Q8 on the owner's standing instruction of 2026-10-27, and Q9–Q10 by the agent under the owner's no-questions instruction of 2026-10-29. Refreshed on 2026-10-29 against T-010 as built:
- ENT-001 gains the token-block structure the fail-closed contrast run needs;
- ENT-007 has the corrected consumers and the `data-press` hook;
- ENT-009 is limited to six names, with no morph;
- ENT-010 has its loader module;
- ENT-011 (spacing and layout tokens) is new.

```yaml
entities:
  - id: ENT-001
    name: ColourToken
    description: "One colour role of the patient palette, defined once for light and once for dark, in hsl() notation (the only notation the contrast tool parses)."
    attributes:
      - { name: name, type: string, required: true, unique: true, constraints: "canonical FD-091 role name, e.g. --paper, --primary, --decor" }
      - { name: role, type: enum, required: true, allowed: [page, card, inset, text, text-muted, text-faint, primary, primary-strong, primary-ink, primary-soft, decor, rule, rule-hard, rule-strong, input-border, focus, positive, mixed, negative, warn-bg, warn-ink, warn-line, danger-bg, danger-ink, danger-line, overlay-scrim, redact-ink] }
      - { name: light_value, type: "hsl colour", required: true }
      - { name: dark_value, type: "hsl colour", required: true }
      - { name: legacy_alias, type: string, required: false, constraints: "existing name kept as var() alias, e.g. --bg for --paper; null for --decor and --focus" }
      - { name: carries_text, type: boolean, required: true, constraints: "false for decor, rule, rule-hard and overlay-scrim" }
      - { name: min_contrast, type: number, required: false, min: 1.10, constraints: "4.5 for text roles; 3 for focus, rule-strong and input-border; 1.5 for rule; 2.0 for rule-hard; 1.10 card vs page; 1.18 card vs inset" }
    constraints:
      - "decor has carries_text false and is never a control's only boundary"
      - "the media-query dark block and the explicit dark block hold identical dark_value sets"
      - "light values sit in column-0 :root { blocks; dark values in exactly one column-0 :root[data-theme=\"dark\"] { block; no :root[data-scheme=…] { block (BR1.8, checked by check:motion M10-tokens)"
      - "legacy_alias is written exactly var(--canonical), with no fallback argument, so tools/contrast.mjs resolves it; every name of the tool's pair list resolves, or contrast:patient fails closed"
    relationships:
      - { to: ThemePreference, cardinality: "many-to-one", direction: "ThemePreference selects light_value or dark_value" }

  - id: ENT-002
    name: TypeRole
    description: "One step of the type scale, with separate size and line-height for Latin and Bengali."
    attributes:
      - { name: role, type: enum, required: true, unique: true, allowed: [display, h1, h2, h3, body, small, label] }
      - { name: size_en_rem, type: number, required: true, min: 0.8125, max: 2.5 }
      - { name: line_height_en, type: number, required: true, min: 1.15, constraints: "unitless" }
      - { name: size_bn_rem, type: number, required: true, constraints: "greater than or equal to size_en_rem" }
      - { name: line_height_bn, type: number, required: true, min: 1.4, constraints: "unitless; tools/bangla-metrics.mjs floor" }
      - { name: weight_en, type: integer, required: true, allowed: [400, 600, 700] }
      - { name: weight_bn, type: integer, required: true, allowed: [400, 600], constraints: "600 for headings that use the Hind Siliguri asset" }
      - { name: family_en, type: enum, required: true, allowed: [system-sans], default: system-sans }
      - { name: family_bn, type: enum, required: true, allowed: [system-bangla, hind-siliguri-600] }
      - { name: desktop_step_rem, type: number, required: false, constraints: "only display and h1; applies from 48rem viewport width" }
      - { name: uppercase_allowed, type: boolean, required: true, constraints: "always false under :lang(bn)" }
      - { name: letter_spacing_bn, type: number, required: true, default: 0, min: 0, max: 0 }
    relationships:
      - { to: FontAsset, cardinality: "many-to-one, optional", direction: "Bengali heading roles use the font asset" }

  - id: ENT-003
    name: ShapeToken
    description: "Radius, elevation, touch-target and focus-ring values."
    attributes:
      - { name: name, type: string, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed: [radius, elevation, target, focus-ring] }
      - { name: value, type: string, required: true }
      - { name: use, type: string, required: true }
    constraints:
      - "radius: 8px controls, 16px cards, 999px chips"
      - "elevation: 0 hairline only; 1 cards; 2 menus and dialogs only"
      - "target: 44px minimum on every pointer type"
      - "focus-ring: 3px solid --focus, 2px offset, never animated"

  - id: ENT-004
    name: MotionToken
    description: "A duration, easing, distance, scale or stagger value. Every duration and distance a motion rule uses comes from one of these."
    attributes:
      - { name: name, type: string, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed: [duration, easing, distance, scale, stagger] }
      - { name: value, type: string, required: true }
      - { name: reduced_value, type: string, required: true, constraints: "distances 0px, press scale 1, stagger 0ms; durations at most 100ms" }
    constraints:
      - "duration values are exactly 100, 160, 240 and 360 ms"
      - "distance values are 8 to 16 px for rises and 24 px for the step slide"
      - "scale values are between 0.98 and 1.02"
      - "stagger is 40 ms and applies to at most 6 items"

  - id: ENT-005
    name: MotionPreference
    description: "The effective motion mode of one page view, derived from the operating-system setting and the in-app switch."
    attributes:
      - { name: os_setting, type: enum, required: true, allowed: [no-preference, reduce], constraints: "prefers-reduced-motion media query" }
      - { name: app_switch, type: enum, required: true, allowed: ["on", "off"], default: "on", constraints: "rk.motion cookie, existing Motion type" }
      - { name: html_attribute, type: enum, required: false, allowed: [reduced], constraints: "data-motion on <html>; present only when app_switch is off" }
      - { name: body_attribute, type: enum, required: true, allowed: ["on", "off"], constraints: "data-motion on <body>; unchanged, read by the staff console" }
      - { name: effective, type: enum, required: true, allowed: [full, reduced], constraints: "derived: reduced when os_setting is reduce or app_switch is off" }
      - { name: motion_ready, type: boolean, required: true, default: false, constraints: "data-motion-ready on <html>; set by the client after the first paint" }
    relationships:
      - { to: MotionPrimitive, cardinality: "one-to-many", direction: "governs every primitive's behaviour" }

  - id: ENT-006
    name: ThemePreference
    description: "Existing light or dark preference (rk.theme cookie, data-theme on <html>); this Unit only gives it new values to select."
    attributes:
      - { name: explicit_theme, type: enum, required: false, allowed: [light, dark], constraints: "null means follow the system" }
      - { name: effective_theme, type: enum, required: true, allowed: [light, dark] }

  - id: ENT-007
    name: MotionPrimitive
    description: "One sanctioned kind of motion, with its trigger, tokens and reduced-mode behaviour. Later Units use these primitives and add no other kind."
    attributes:
      - { name: id, type: enum, required: true, unique: true, allowed: [route-transition, list-reveal, step-slide, press, publish-tick, scroll-reveal, sheet-entry, reading-progress] }
      - { name: trigger, type: string, required: true }
      - { name: properties, type: "set of enum", required: true, allowed: [transform, opacity] }
      - { name: duration_token, type: string, required: true, references: MotionToken }
      - { name: easing_token, type: string, required: true, references: MotionToken }
      - { name: distance_token, type: string, required: false, references: MotionToken }
      - { name: reduced_behaviour, type: string, required: true }
      - { name: hook, type: string, required: true, constraints: "component, class or data attribute later Units use; press also answers to [data-press] for later Units' pressables (BR6.11)" }
      - { name: built_by, type: enum, required: true, allowed: [U45, later-unit], constraints: "step-slide is consumed by T-306, publish-tick by T-306 (publish) and T-102 (account confirmations), scroll-reveal hooks by T-207; later Units add no primitive and no motion rule (BR4.7)" }
      - { name: first_paint, type: boolean, required: true, default: false, constraints: "always false: no primitive runs on a document's first paint" }
      - { name: iterations, type: integer, required: true, default: 1, min: 1, max: 1 }
    relationships:
      - { to: MotionToken, cardinality: "many-to-many", direction: "primitive uses tokens" }
      - { to: StaticElement, cardinality: "none", direction: "a primitive never targets a static element" }

  - id: ENT-008
    name: StaticElement
    description: "An element that is never animated: the demo marker, the medical-advice disclaimer and the emergency guidance."
    attributes:
      - { name: id, type: enum, required: true, unique: true, allowed: [demo-marker, disclaimer-colophon, disclaimer-inline, emergency-guidance] }
      - { name: hook, type: string, required: true, constraints: ".demo; .colophon; [data-static=disclaimer]; #view-emergency, .emergency-lines or [data-static=emergency]" }
      - { name: view_transition_group, type: string, required: true, references: ViewTransitionGroup }
      - { name: animated, type: boolean, required: true, default: false, constraints: "constant false: no transition, animation, reveal, stagger, press scale or view-transition fade" }
      - { name: max_per_page, type: integer, required: true, default: 1 }

  - id: ENT-009
    name: ViewTransitionGroup
    description: "A named view-transition group used during a patient route change."
    attributes:
      - { name: name, type: enum, required: true, unique: true, allowed: [page, masthead, demo, colophon, emergency, disclaimer] }
      - { name: animated, type: boolean, required: true, constraints: "true only for page" }
      - { name: paints_above_page, type: boolean, required: true, constraints: "true for every static group" }
      - { name: shows_old_state, type: boolean, required: true, constraints: "false for static groups: the old state is hidden at once" }
      - { name: max_per_page, type: integer, required: true, default: 1, constraints: "a duplicate name makes the browser skip the transition (plain swap)" }
    constraints:
      - "root group never animates"
      - "the page group never morphs size or position"
      - "no other name exists: no per-item name and no shared-element morph in this release (Q10 A, BR6.12, check:motion M11-vt-name)"
    relationships:
      - { to: StaticElement, cardinality: "one-to-zero-or-one", direction: "a static group is owned by at most one static element per page" }

  - id: ENT-010
    name: FontAsset
    description: "The one web font: Hind Siliguri SemiBold, Bengali subset, for Bengali headings."
    attributes:
      - { name: family, type: string, required: true, default: "Hind Siliguri" }
      - { name: weight, type: integer, required: true, default: 600 }
      - { name: format, type: enum, required: true, allowed: [woff2] }
      - { name: unicode_range, type: string, required: true, default: "U+0964-0965, U+0980-09FF, U+200C-200D, U+25CC" }
      - { name: display, type: enum, required: true, allowed: [swap] }
      - { name: preload, type: boolean, required: true, default: false }
      - { name: locale, type: enum, required: true, allowed: [bn] }
      - { name: licence, type: string, required: true, default: "SIL Open Font License 1.1, licence file committed beside the font" }
      - { name: size_bytes, type: integer, required: true, max: 80000, constraints: "about 74,784 B for the Google Fonts Bengali subset at 600 (motion-tech-research.md §5.2); Code Generation measures the committed file" }
      - { name: source_path, type: string, required: true, default: "apps/web/src/app/fonts/" }
      - { name: loader_module, type: string, required: true, default: "apps/web/src/app/fonts/bn-heading.ts", constraints: "the only localFont() call; vitest.setup.ts mocks next/font/local for tests (BR9.9)" }
      - { name: git_attribute, type: string, required: true, default: "*.woff2 binary", constraints: "in .gitattributes before the file is committed" }

  - id: ENT-011
    name: SpacingToken
    description: "One step of the spacing scale, or a layout width, that patient rules use for margins, gaps, paddings and grids."
    attributes:
      - { name: name, type: string, required: true, unique: true, constraints: "--space-1 … --space-8, --grid-min, --measure" }
      - { name: kind, type: enum, required: true, allowed: [space, grid-min, measure] }
      - { name: value, type: string, required: true, constraints: "space: 4, 8, 12, 16, 24, 32, 48, 64 px; grid-min 16rem; measure 72ch" }
    constraints:
      - "a patient rule's margin, padding or gap uses a token, a calc() of tokens, or clamp() between two tokens; never a literal length (BR3.6)"
      - "later Units ask for a missing step through an ISSUES.md row, never a literal"
```

## Summary

| Entity | What it is | Owned by this Unit |
|---|---|---|
| ColourToken | One palette role, light and dark, in `hsl()`, with its legacy alias and contrast floor | yes (`patient.css` token block) |
| TypeRole | One type step with Latin and Bengali size and line-height | yes |
| ShapeToken | Radius, elevation, 44 px target, 3 px focus ring | yes |
| SpacingToken | Spacing scale 4–64 px, card-grid minimum, reading measure | yes (`patient.css` token block) |
| MotionToken | Durations 100/160/240/360 ms, three easings, rise and slide distances, press scale, 40 ms stagger | yes (`motion.css`) |
| MotionPreference | Effective motion mode: operating-system setting or the in-app switch, plus the motion-ready mark | wiring only (`[locale]/layout.tsx`, `RouteTransition`) |
| ThemePreference | Existing light or dark preference; unchanged, gains new values | no (existing) |
| MotionPrimitive | The eight sanctioned kinds of motion and their reduced behaviour; no morph | yes; three are consumed by later Units, press also through `data-press` |
| StaticElement | Demo marker, disclaimer, emergency guidance: never animated | hooks only; the elements already exist or arrive with later Units |
| ViewTransitionGroup | `page` (animated) and five static groups | yes (`motion.css`) |
| FontAsset | Hind Siliguri 600, Bengali subset WOFF2, `bn` only | yes (`app/fonts/`) |

No entity is persisted, and none crosses a runtime contract (`contract-summary.md`: U45 has none).
