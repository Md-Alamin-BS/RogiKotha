# Business rules — U45 `t-011-patient-design-and-motion-system`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U45), `unit-of-work-story-map.md` (US2.4, US2.3), `requirements.md` (NFR13, FR95, NFR1, NFR4, NFR5, NFR6, NFR7), `components.md` (no domain component owns presentation), `contract-summary.md` (U45 has no runtime contract), T-011, FD-091, FD-032, FD-030, FD-024, FD-042 and the hard rules in `project.md`. The entities these rules govern are in `entities.md`, the token values in `frontend-components.md` § 3, and the workflows and state transitions in `functional-spec.md`.

Rules that depend on an answer in `functional-design-questions.md` name it in `source`. All ten answers are A: Q1–Q8 on the owner's standing instruction of 2026-10-27, and Q9–Q10 decided by the agent under the owner's no-questions instruction of 2026-10-29. Each answer goes into `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises this draft. `functional-spec.md` § 10 lists what changes under another option. Refreshed 2026-10-29 against T-010 as built: BR1.8, BR3.6, BR6.11, BR6.12, BR9.8 and BR9.9 are new, and BR1.2, BR1.7, BR4.7, BR6.4, BR6.5, BR9.1, BR9.4 and BR9.7 are amended. No ID was renumbered.

```yaml
rules:
  # 1. Colour and tokens
  - id: BR1.1
    statement: "Every patient page takes its colours from the FD-091 'Warm Paper, Soft Depth' roles: warm paper page, white card surface, warm inset, ink, muted and faint ink, one teal primary for links, primary buttons and the current tab, a primary-soft wash, a decoration-only warm accent, hairline rules, input border and a blue focus colour."
    category: constraint
    applies_to: "Patient token block (top of patient.css); every patient class"
    trigger: "Any patient page renders, in en or bn, light or dark"
    logic: "IF a patient rule needs a colour THEN it uses a canonical role token (or its legacy alias) and never a literal colour value outside the token block"
    violation: "A literal colour in a patient rule, or a role outside the set, fails review and AC2.4.1"
    source: "NFR13, FD-091, AC2.4.1, design-direction-research.md §4"
  - id: BR1.2
    statement: "Every text pair reaches 4.5:1, the focus ring, strong boundaries and input borders reach 3:1, card vs page reaches 1.10:1, card vs inset 1.18:1, hairlines 1.5:1 and hover edges 2:1, in light and dark mode."
    category: validation
    applies_to: "All ColourToken pairs of tools/contrast.mjs, plus the --pairs patient set (--focus on --paper, --surface and --surface-2 at 3:1 hard; --primary and --ink on --primary-soft at 4.5:1), read from patient.css by contrast:patient"
    trigger: "pnpm check S8a contrast:patient (node tools/contrast.mjs --tokens apps/web/src/styles/patient.css --pairs patient)"
    logic: "IF any pair is below its floor, OR any pair is skipped for a missing token (T-010 fail-closed --tokens mode) THEN the run exits 1 and the token value is adjusted (or the alias added) until it passes; the floor is never lowered; each adjusted value is noted in the hand-off; without --pairs the tool's pair list is unchanged, so pnpm contrast on tokens.css keeps its exact output"
    violation: "A failing or skipped pair is a red pnpm check; a lowered floor is a D10 breach; a --focus pair added to the shared list would make pnpm contrast fail closed on tokens.css"
    source: "NFR6, FR95, T-011 step 1, team.md Testing Posture (UI units pass pnpm contrast), T-010 BR9.3-BR9.4, functional-spec.md D14"
  - id: BR1.3
    statement: "The warm accent (--decor) is decoration only: never text, never an icon that carries meaning, never a control's only boundary or state."
    category: constraint
    applies_to: "--decor uses (brand mark, hero wash, ornaments, illustration)"
    trigger: "Any rule that uses --decor"
    logic: "IF --decor is used as color, as the only border of a control, or as the only signal of a state THEN it is invalid"
    violation: "Amber text on paper (about 1.9:1) fails WCAG 1.4.3; reviewer rejects"
    source: "FD-091 (decoration-only accent), AC2.4.1, design-direction-research.md §4"
  - id: BR1.4
    statement: "Colour is never the only signal: the current tab, pressed toggles, errors and statuses also differ by text, shape, underline or weight."
    category: constraint
    applies_to: "Tabs, ctl toggles, callouts, badges and links in the patient shell and shared classes"
    trigger: "A state is shown"
    logic: "IF a state differs from its neighbours only by hue THEN add a non-colour cue (aria-current underline bar, pressed fill plus border, icon or text)"
    violation: "WCAG 1.4.1 failure; reviewer rejects"
    source: "NFR6, FR95, design-direction-research.md §1 (NHS: colour is never the only signal)"
  - id: BR1.5
    statement: "The patient tokens are one block at the top of patient.css, written in hsl(), under the canonical FD-091 names plus var() aliases for the names patient.css and the contrast tool already use; the file's earlier token layers and the scheme A/B/C blocks are removed."
    category: policy
    applies_to: "apps/web/src/styles/patient.css"
    trigger: "Code Generation restyles patient.css"
    logic: "IF a token is read anywhere in patient.css or motion.css THEN it is defined in the patient block (so nothing falls through to the staff palette in tokens.css); IF a value is not hsl() THEN the contrast tool cannot read it, so it is rewritten"
    violation: "A token that silently falls back to tokens.css, or a hex value in a checked role, makes the contrast run meaningless"
    source: "functional-design-questions.md Q1 (A), tools/contrast.mjs parsing rules"
  - id: BR1.6
    statement: "The staff console is unchanged: tokens.css, admin.css, the admin layout and every staff page render exactly as before, and nothing from motion.css or the patient token block loads on a staff page."
    category: constraint
    applies_to: "apps/web/src/styles/tokens.css, admin.css, app/[locale]/admin/**"
    trigger: "Any change in this Unit"
    logic: "IF a change would alter a computed style on a staff page THEN it is out of scope and is not made; pnpm contrast (staff palette) keeps its exact output"
    violation: "Any diff in tokens.css or admin.css, or any staff visual change, breaks FD-030 and T-011 Not in scope"
    source: "FD-030, T-011 Not in scope, Q1 (A)"
  - id: BR1.7
    statement: "Dark mode uses the warm 'night paper' palette with the same roles and the same contrast floors; the prefers-color-scheme dark block and the explicit data-theme dark block hold identical values, and an explicit light theme always wins over the system setting."
    category: policy
    applies_to: "Patient token block, dark variants"
    trigger: "Effective theme is dark; pnpm check:motion (M10-tokens compares the two dark blocks)"
    logic: "IF data-theme is dark, OR no explicit theme is set and the system prefers dark THEN the dark values apply; IF data-theme is light THEN light values apply regardless of the system"
    violation: "Diverging dark blocks (check:motion M10-tokens exits 1), or a dark pair below its floor, is a defect"
    source: "functional-design-questions.md Q2 (A), prototype theme toggle, CR-004 WF1"
  - id: BR1.8
    statement: "patient.css holds exactly one column-0 :root[data-theme=\"dark\"] { block, the token block, whose custom properties equal those of the prefers-color-scheme dark block, and no column-0 :root[data-scheme=…] { block; a component's dark rule continues its selector (:root[data-theme=\"dark\"] .x {)."
    category: validation
    applies_to: "apps/web/src/styles/patient.css token structure; every later Unit that appends to patient.css"
    trigger: "pnpm check:motion (M10-tokens)"
    logic: "IF the count of column-0 dark token blocks is not 1, OR their property set differs from the media-query dark block, OR a scheme block exists THEN the check fails, naming the lines"
    violation: "The contrast tool reads only the last dark block and treats scheme blocks as variants, so a second small dark block would check light values as dark ones (a silent pass) and a scheme block adds an unchecked variant"
    source: "tools/contrast.mjs (T-010 --tokens mode: last dark block, scheme variants), functional-spec.md § 11 F5, NFR6"

  # 2. Typography and Bengali
  - id: BR2.1
    statement: "Text uses the FD-091 type scale, mobile first (display 2 rem, H1 1.5, H2 1.25, body 1, small 0.875), with :lang(bn) sizes and line-heights (display 2/1.4, H1 1.5/1.45, H2 1.25/1.5, body 1.0625/1.7, small 0.9375/1.65); display and H1 take one step up from a 48 rem viewport (2.5 rem and 1.75 rem), with line-heights unchanged."
    category: constraint
    applies_to: "TypeRole tokens; h1-h4, .display, body text, small and label classes"
    trigger: "Any patient text renders"
    logic: "IF the element or an ancestor is :lang(bn) THEN the Bengali size and line-height tokens apply ELSE the Latin ones"
    violation: "A Bengali text block with Latin line-height, or a hard-coded font size outside the scale, is a defect"
    source: "FD-091, AC2.4.1, design-direction-research.md §4, functional-design-questions.md Q6 (A)"
  - id: BR2.2
    statement: "Bengali text never gets an uppercase transform or any letter-spacing, in any patient rule, including kickers, labels, buttons and the demo marker."
    category: validation
    applies_to: "All patient rules that set text-transform or letter-spacing"
    trigger: "pnpm check (check:motion carries a Bengali typography scan) and review"
    logic: "IF a rule sets text-transform other than none, or a non-zero letter-spacing, THEN a :lang(bn) rule for the same selector resets both to none and 0"
    violation: "Uppercase or tracked Bengali breaks the project.md Mandated rule and FD-024"
    source: "project.md Mandated (no capital-letter transform in Bengali), FD-024, FD-091"
  - id: BR2.3
    statement: "Body text and Latin headings use the system font stacks; no web font is loaded for body text or for Latin text."
    category: constraint
    applies_to: "--sans and --bangla stacks; body, p, li, form controls"
    trigger: "Any patient text renders"
    logic: "IF a rule needs a font family for body or Latin text THEN it uses the system stack token"
    violation: "A second web font, or a web font for body text, breaks FD-091 and the font byte budget"
    source: "FD-091 (system stack for body text), T-011 Not in scope"
  - id: BR2.4
    statement: "Bengali headings (h1-h3, .display, the brand wordmark) use Hind Siliguri 600 from a self-hosted Bengali-subset WOFF2 with its OFL licence beside it, font-display swap, never preloaded, applied only on the bn locale, with the Bengali system stack as fallback."
    category: policy
    applies_to: "FontAsset; [locale]/layout.tsx font wiring; heading rules under :lang(bn)"
    trigger: "A page renders under /bn"
    logic: "IF the locale is bn THEN the font variable is attached to <html> and :lang(bn) heading rules name it first ELSE it is not attached and the browser never requests the file"
    violation: "An English page that downloads the font, a preload of it, a font fetched from another origin, or a missing licence file is a defect"
    source: "FD-091, T-011 step 7, AC2.4.1 (Bengali headings use the subset font)"
  - id: BR2.5
    statement: "Line-heights are unitless and never below 1.4 for Bengali text, and no fixed height wraps Bengali words."
    category: validation
    applies_to: "Every patient rule with line-height or height on text"
    trigger: "Code Generation and Build and Test (Bengali rendering check)"
    logic: "IF a Bengali text role clips vowel signs or conjuncts at 360 px or 200% zoom THEN its line-height rises by 0.05 until it does not; IF a rule fixes height on a box holding Bengali words THEN it becomes min-height (a glyph-only box may opt out with /* bangla-ok: why */)"
    violation: "Clipped Bengali is an S2 defect against AC2.3.1 and NFR7"
    source: "NFR7, tools/bangla-metrics.mjs (MIN 1.4), Q6 (A)"

  # 3. Shape, depth, targets, focus
  - id: BR3.1
    statement: "Shapes use the FD-091 radii (8 px controls, 16 px cards, 999 px chips) and three elevations: 0 hairline only, 1 for cards, 2 for menus and dialogs only."
    category: constraint
    applies_to: "ShapeToken; .panel, cards, .btn, .ctl, .chip, .sheet, menus"
    trigger: "Any patient surface renders"
    logic: "IF a surface is a card THEN radius 16 px and elevation 1; IF a dialog or menu THEN elevation 2; ELSE elevation 0"
    violation: "A heavy shadow on ordinary content, or a fourth elevation, drifts from FD-091"
    source: "FD-091, AC2.4.1 (card surfaces with soft elevation)"
  - id: BR3.2
    statement: "No glass: no backdrop-filter, blur or translucent surface under text anywhere on the patient side; the masthead is a solid surface with a hairline."
    category: constraint
    applies_to: "patient.css (.panel, .masthead and every other rule)"
    trigger: "Code Generation restyles patient.css"
    logic: "IF a patient rule sets backdrop-filter or a translucent background behind text THEN remove it and use the solid surface token"
    violation: "Glass over text risks WCAG 1.4.3 and costs frames on low-end Android"
    source: "FD-091 (no glass on content), NFR13 performance gate, design-direction-research.md §3"
  - id: BR3.3
    statement: "Every interactive control in the patient shell and the shared patient classes has a hit area of at least 44 by 44 px on every pointer type."
    category: constraint
    applies_to: ".ctl, .btn, .tabs a, .chip, .seg button, .opt, .pillrow button, .sheet-close, skip link, footer links"
    trigger: "Any control renders"
    logic: "IF a control's box is smaller than 44 px in either direction THEN min-width and min-height (or padding) raise it to 44 px"
    violation: "A target below 44 px fails AC2.4.1"
    source: "FD-091, AC2.4.1, AC2.3.3"
  - id: BR3.4
    statement: "Every focusable element shows a 3 px solid --focus outline with a 2 px offset when focused by keyboard; it is never removed, never animated, and reaches 3:1 against what surrounds it."
    category: constraint
    applies_to: ":focus-visible on a, button, input, select, textarea, summary, [tabindex]"
    trigger: "Keyboard focus"
    logic: "IF an element receives :focus-visible THEN draw the ring at once, without transition"
    violation: "A missing, faint or fading focus ring fails FR95, NFR6 and AC2.3.3"
    source: "FR95, NFR6, AC2.3.3, FD-091 (3 px focus ring)"
  - id: BR3.5
    statement: "The restyled shell (demo marker, masthead with tabs and controls, colophon) has no horizontal overflow at 360x800, 390x844, 768x1024, 1280x800 and 1440x900, in en and bn, and at 200% zoom; the masthead wraps instead of scrolling."
    category: validation
    applies_to: "Patient shell"
    trigger: "Build and Test viewport run"
    logic: "IF document scroll width exceeds the viewport width at any listed size, language or zoom THEN the shell rule causing it is fixed (wrap, shrink the brand tagline, never hide a control)"
    violation: "Horizontal overflow is an S2 defect against AC2.3.1"
    source: "NFR4, AC2.3.1, AC2.3.2"
  - id: BR3.6
    statement: "The token block defines a spacing scale (--space-1 4px, --space-2 8px, --space-3 12px, --space-4 16px, --space-5 24px, --space-6 32px, --space-7 48px, --space-8 64px), --grid-min for auto-fit card grids and --measure for the reading width; patient rules, the shell's and later Units', take margins, gaps and paddings from these tokens."
    category: constraint
    applies_to: "Patient token block; every patient rule that sets margin, padding or gap (T-102, T-202, T-203, T-207 and later page sections)"
    trigger: "Any patient rule needs a spacing value"
    logic: "IF a rule sets a margin, padding or gap THEN it uses a --space-* token, a calc() of them, or clamp() between two of them; a literal length outside the token block is rejected in review; a missing step is an ISSUES.md row, never a literal"
    violation: "Literal spacing drifts the rhythm per page; the sibling drafts raise an ISS row and stall"
    source: "FD-091 (generous white space, bento grid), T-202, T-203, T-207 and T-102 drafts (margins from T-011 spacing), functional-spec.md § 11 F7"

  # 4. Motion tokens and allowed properties
  - id: BR4.1
    statement: "Every motion duration comes from the four tokens --dur-instant 100 ms, --dur-fast 160 ms, --dur-base 240 ms and --dur-slow 360 ms, and every easing from --ease-out, --ease-in and --ease-standard; literal durations and easings appear only in the token definitions."
    category: validation
    applies_to: "motion.css"
    trigger: "pnpm check:motion"
    logic: "IF a transition, animation or delay value is a literal time that is not inside a token definition (a calc of tokens and --stagger is allowed) THEN the check fails"
    violation: "check:motion exits non-zero"
    source: "NFR13, AC2.4.2, FD-091"
  - id: BR4.2
    statement: "Only transform and opacity animate: every transition names its properties explicitly from {transform, opacity}, and every keyframe, including those for view-transition pseudo-elements, declares only transform and opacity."
    category: validation
    applies_to: "motion.css and patient.css"
    trigger: "pnpm check:motion"
    logic: "IF a transition lists any other property, uses all, or omits the property (shorthand defaults to all) OR a keyframe declares any other property THEN the check fails"
    violation: "check:motion exits non-zero; a planted transition: width must fail it"
    source: "NFR13, AC2.4.2, AC2.4.6, T-011 step 8"
  - id: BR4.3
    statement: "Movement stays small: rises of 8 to 16 px (token 12 px), a 24 px step slide, scale only between 0.98 and 1.02, and no parallax, zoom, full-screen sweep, rotation sweep or flashing."
    category: validation
    applies_to: "motion.css keyframes and transforms"
    trigger: "pnpm check:motion and review"
    logic: "IF a scale() value is below 0.98 or above 1.02, OR a translate uses a literal distance instead of a distance token, OR a rule ties movement to scroll position beyond the sanctioned reveal and reading bar THEN it is invalid"
    violation: "check:motion exits non-zero, or the reviewer rejects (vestibular risk)"
    source: "NFR13, AC2.4.4, FD-091 choreography rule 4, WCAG 2.3.1 and 2.3.3"
  - id: BR4.4
    statement: "Nothing loops or repeats: every animation runs once, no motion lasts longer than --dur-slow plus five stagger steps, and nothing auto-plays, auto-advances or counts down."
    category: validation
    applies_to: "motion.css; every patient component"
    trigger: "pnpm check:motion and review"
    logic: "IF animation-iteration-count is not 1, OR an animation is infinite or alternate, OR a component starts motion without a user action or a content change THEN it is invalid"
    violation: "Breaks WCAG 2.2.2 and AC2.4.4"
    source: "NFR13, AC2.4.4, FD-091 choreography rules 3 and 11"
  - id: BR4.5
    statement: "Nothing animates on the first paint of a document: entry motion runs only after the client sets data-motion-ready on <html>, so content rendered by the server, including the LCP element, appears at full opacity in its final place."
    category: policy
    applies_to: "All entry primitives (list reveal, sheet entry, publish tick, step slide); route transition (runs only on client navigation)"
    trigger: "Document load and hydration"
    logic: "IF an element exists before data-motion-ready is set THEN no entry rule applies to it; entry rules are gated by :root[data-motion-ready]; scroll reveal hooks are never placed on the first section of a page"
    violation: "An element that fades or rises in on load breaks FD-091 rule 2 and AC2.4.6 (LCP never animated in)"
    source: "AC2.4.6, NFR13, NFR1, FD-091 choreography rule 2"
  - id: BR4.6
    statement: "Motion never delays reading, input or navigation: content is usable during every animation, no state change waits for an animation to end, and the view-transition overlay never captures pointer input."
    category: constraint
    applies_to: "All primitives; ::view-transition"
    trigger: "Any motion runs"
    logic: "IF code listens for animationend or transitionend to change state, OR ::view-transition accepts pointer events THEN it is invalid"
    violation: "Delayed interaction hurts INP and breaks FD-091 rule 2"
    source: "NFR13 (INP), FD-091 choreography rule 2, motion-tech-research.md §2.1"
  - id: BR4.7
    statement: "Every motion declaration of the patient side lives in motion.css; patient.css holds no transition, animation, @keyframes, @starting-style or view-transition rule; later Units use the primitives through their hooks and add no motion rule, and motion.css changes only in a Unit whose task names a new primitive."
    category: policy
    applies_to: "apps/web/src/styles/patient.css, motion.css; every later patient Unit"
    trigger: "pnpm check:motion; review of any later Unit"
    logic: "IF patient.css contains any motion declaration THEN the check fails; IF a later Unit's diff touches motion.css without a task line naming a new primitive THEN the reviewer rejects it and the need becomes an ISSUES.md row"
    violation: "check:motion exits non-zero"
    source: "functional-spec.md § 9 D11 (one motion file), T-011 owned paths (motion.css), T-202, T-203 and T-207 drafts (no motion of their own)"

  # 5. Reduced motion
  - id: BR5.1
    statement: "The effective motion mode is reduced when the operating system asks for reduced motion OR the in-app switch is on; the in-app switch can only reduce motion, never restore it against the operating-system setting."
    category: calculation
    applies_to: "MotionPreference"
    trigger: "Every page view and every switch change"
    logic: "IF prefers-reduced-motion is reduce OR rk.motion is off THEN effective = reduced ELSE effective = full"
    violation: "Motion that runs while either source asks for reduction breaks AC2.4.3"
    source: "AC2.4.3, NFR13, FD-091, functional-design-questions.md Q3 (A)"
  - id: BR5.2
    statement: "The in-app switch reaches the CSS as data-motion=\"reduced\" on <html>, rendered by the [locale] layout from the rk.motion cookie, so it also works without JavaScript; the body's data-motion attribute is unchanged for the staff console."
    category: policy
    applies_to: "[locale]/layout.tsx; #motion toggle (unchanged, silent per CR-004 BR4.4)"
    trigger: "Every server render; the #motion toggle's existing write and refresh"
    logic: "IF rk.motion is off THEN render <html data-motion=\"reduced\"> ELSE omit the attribute; keep <body data-motion=on|off> exactly as today"
    violation: "A switch that does not stop route transitions, or a changed staff console attribute, is a defect"
    source: "Q3 (A), AC2.4.3, FD-091 (in-app reduce-motion switch), 01-conventions.md §7.4"
  - id: BR5.3
    statement: "Every movement rule sits inside both guards: @media (prefers-reduced-motion: no-preference) and a selector beginning :root:not([data-motion=\"reduced\"])."
    category: validation
    applies_to: "motion.css"
    trigger: "pnpm check:motion"
    logic: "IF a rule animates or transitions transform, OR uses a keyframe that changes transform, OR names a view-transition animation, AND it is not inside both guards THEN the check fails; opacity-only transitions of --dur-instant may sit outside the guards"
    violation: "check:motion exits non-zero"
    source: "AC2.4.3, T-011 step 3 and step 8, FD-091 choreography rule 9"
  - id: BR5.4
    statement: "In reduced mode there is no slide, rise, scale, stagger, route movement, scroll reveal or reading-progress motion; view-transition pseudo-elements have no animation, so a route change is an instant swap; only opacity changes of 100 ms or less and non-scaling focus and press states remain; distance, scale and stagger tokens resolve to 0 px, 1 and 0 ms."
    category: policy
    applies_to: "All MotionPrimitives; ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*)"
    trigger: "Effective motion mode is reduced"
    logic: "IF effective = reduced THEN apply the reduced behaviour of each primitive (functional-spec.md § 5) and set animation: none on every view-transition pseudo-element, for both the media query and the data-motion attribute"
    violation: "Any movement under reduced mode fails AC2.4.3; the T-011 smoke expects no route animation"
    source: "AC2.4.3, NFR13, NFR6, motion-tech-research.md §2.1 (the * rule does not reach ::view-transition-*)"
  - id: BR5.5
    statement: "Every step works the same in reduced mode and without any motion support: final states are the static default styles, so no content, control or value depends on an animation running."
    category: constraint
    applies_to: "All patient components that use a primitive"
    trigger: "Reduced mode, unsupported browser, or scripts disabled"
    logic: "IF motion is off or unsupported THEN every element is visible, in place and operable from its first frame"
    violation: "A step that cannot complete without motion fails AC2.4.3 and AC2.3.2"
    source: "AC2.4.3, AC2.3.2, NFR6"

  # 6. Motion primitives
  - id: BR6.1
    statement: "On a client-side change of the locale-free path within the patient app, the outgoing page content fades out (--dur-fast, --ease-in) while the incoming content fades in and rises 12 px (--dur-base, --ease-out); the page group never morphs size or position; back and forward navigation and browsers without view transitions swap plainly; search-parameter changes, theme toggles and server-action refreshes do not animate."
    category: policy
    applies_to: "RouteTransition in (patient)/layout.tsx; view-transition group page"
    trigger: "A patient navigation that changes the locale-free path"
    logic: "IF the path changes inside a React transition AND the browser supports view transitions AND effective = full THEN run the page cross-fade and rise ELSE swap at once"
    violation: "A transition on in-page updates, a page morph, or motion under reduced mode is a defect"
    source: "AC2.4.2, NFR13, FD-091, T-011 step 4, functional-design-questions.md Q4 (A)"
  - id: BR6.2
    statement: "A Reveal list fades in and raises its first 6 children by 12 px with a 40 ms stagger (--dur-base, --ease-out) when they are inserted after motion-ready; children from the 7th on appear at once."
    category: policy
    applies_to: "Reveal component and its children"
    trigger: "Children inserted after data-motion-ready (client navigation, filter results, load more)"
    logic: "IF a child's position is 1 to 6 THEN delay = (position - 1) x --stagger ELSE no animation; nothing animates on first paint (BR4.5)"
    violation: "A stagger beyond 6 items, or a stagger on first paint, fails AC2.4.2 and AC2.4.6"
    source: "AC2.4.2, NFR13, FD-091 (stagger 40 ms, max 6)"
  - id: BR6.3
    statement: "A composer step change slides the incoming step panel 24 px in from the direction of travel with a fade (--dur-base, --ease-standard); the outgoing step leaves at once and the progress marker updates at once."
    category: policy
    applies_to: "Step-slide hook in motion.css; consumed by T-306 (composer)"
    trigger: "Composer moves to the next or previous step"
    logic: "IF the step moves forward THEN the panel enters from the inline end ELSE from the inline start; only the incoming panel moves"
    violation: "A bouncing, longer or wider slide drifts from FD-091"
    source: "AC2.4.2, NFR13, FD-091 (24 px step slide)"
  - id: BR6.4
    statement: "A successful publish shows one tick, drawn in two strokes over --dur-slow by transform only, beside a plain text confirmation; the tick is decorative (aria-hidden) and the text carries the meaning; in reduced mode the complete tick shows at once."
    category: policy
    applies_to: "PublishTick component; consumed by T-306 (composer publish) and T-102 (account confirmations)"
    trigger: "Publish succeeds, or a T-102 confirmation shows"
    logic: "IF publish succeeds THEN render PublishTick with the caller's confirmation text (compose.publishedNote today); the caller keeps responsibility for announcing it through the existing live region"
    violation: "A second live region, animated text, or any extra celebration is a defect"
    source: "AC2.4.2, AC2.4.5, FD-091 choreography rule 5, prototype app.js:1614 (✓ + compose.publishedNote), T-306 step 13, T-102 draft BR11.5"
  - id: BR6.5
    statement: "Press feedback scales a pressable to 0.98 over --dur-instant; hover and active colour changes are instant; no :hover rule sets a transform anywhere on the patient side, so the 13 existing hover-lift rules (emergency cards and lines included) and the tab underline's hover scaleX are removed."
    category: policy
    applies_to: ".btn, .ctl, .chip, .seg button, .opt, .tabs a, .pillrow a, .pillrow button, .browse-card, .doc-entry, .related-card, .react, .mini-row, .c-mode, .case, [data-press]; never an element of the static set"
    trigger: "Pointer press or hover"
    logic: "IF a pressable is pressed AND effective = full AND it is not inside the static set THEN transform: scale(0.98) ELSE no transform; colour, background and border changes never transition; IF a :hover rule declares transform THEN check:motion M9-hover fails"
    violation: "A colour transition, a hover lift, or a press scale on emergency guidance fails check:motion (BR4.2, M9-hover) or FD-091"
    source: "NFR13 (press and focus feedback), functional-design-questions.md Q5 (A), T-202 F7, T-203 F11, T-207 F6 and F15, functional-spec.md § 11 F6 and F8"
  - id: BR6.6
    statement: "Home page sections below the first one may reveal on scroll: a fade and 12 px rise driven by a CSS scroll timeline inside @supports (animation-timeline: view()) and both guards; without support they are static, and the first section (hero, LCP) never carries the hook."
    category: policy
    applies_to: ".reveal hook; consumed by T-207 on the home page"
    trigger: "Section enters the viewport while scrolling"
    logic: "IF the browser supports view timelines AND effective = full AND the section is not the first THEN animate across the entry range ELSE show it statically"
    violation: "A reveal on the hero, parallax, or a reveal without @supports breaks FD-091 rule 8"
    source: "FD-091 choreography rule 8, T-011 step 5, AC2.4.3 (scroll reveals off in reduced mode)"
  - id: BR6.7
    statement: "Sheets, dialogs and menus enter with a fade and 12 px rise (--dur-base, --ease-out) through @starting-style; closing is instant; display is never animated."
    category: policy
    applies_to: ".overlay, .sheet, menus"
    trigger: "A sheet or menu opens"
    logic: "IF a sheet opens AND effective = full THEN run the entry ELSE show it at once; IF it closes THEN hide it at once"
    violation: "An exit animation that needs transition-behavior: allow-discrete on display fails check:motion (BR4.2)"
    source: "NFR13, motion-tech-research.md §2.2 (@starting-style), Sheet.tsx focus behaviour unchanged"
  - id: BR6.8
    statement: "Loading skeletons are static blocks sized to the final layout, used only for loads expected to take more than 1 second; they never shimmer or pulse."
    category: constraint
    applies_to: "Any loading state a later Unit adds (loading.tsx, Suspense fallbacks)"
    trigger: "A load longer than 1 s"
    logic: "IF a skeleton is shown THEN it is static and occupies exactly the final box (no layout shift)"
    violation: "A shimmering skeleton or a size jump breaks FD-091 rule 6 and the CLS gate"
    source: "FD-091 choreography rule 6, NFR13 (CLS)"
  - id: BR6.9
    statement: "The reading-progress bar under the masthead scales horizontally with page scroll inside @supports (animation-timeline: scroll()) and both guards; it is decorative (aria-hidden) and hidden in reduced mode."
    category: policy
    applies_to: ".progress i"
    trigger: "Page scroll"
    logic: "IF scroll timelines are supported AND effective = full THEN scaleX follows scroll ELSE the bar is not shown"
    violation: "A full-width static bar in reduced mode conveys nothing and is removed"
    source: "Existing T-008 shell (.progress), FD-091 choreography rule 1 (motion must explain something)"
  - id: BR6.10
    statement: "Data displays (distribution bars, spectrum segments, frequency tracks, evidence bars, counts and their denominators) never animate: they appear at their final value, and no bar grows from zero."
    category: constraint
    applies_to: ".spectrum span, .outcome-row .track and its fill, .freq-list .track, .ev-bar, count and denominator text"
    trigger: "A page with a distribution renders or updates"
    logic: "IF an element shows a measured value THEN it has no transition or animation (the existing bar-in keyframe is removed)"
    violation: "A bar that grows from 0 shows a false value for its duration, against the exact-count rule"
    source: "project.md Mandated (exact counts and denominators), project.md Forbidden (never render a missing value as 0), FD-091 choreography rule 1"
  - id: BR6.11
    statement: "A later Unit makes a new card, row, chip or control pressable by giving it the data-press attribute, which gets the press primitive from motion.css; it never writes a press, hover or transition rule of its own."
    category: policy
    applies_to: "[data-press] hook; every later patient Unit"
    trigger: "A later Unit adds a pressable element whose class is not in BR6.5's list"
    logic: "IF the element is pressable THEN it carries data-press (and is not inside the static set) ELSE nothing; no motion rule outside motion.css (BR4.7)"
    violation: "A Unit-local press rule fails check:motion M6-file; a missing hook leaves a pressable without feedback (polish S3)"
    source: "NFR13 (press feedback), T-202 F7, T-203 F11, T-207 F15, functional-spec.md D16"
  - id: BR6.12
    statement: "Only six view-transition names exist on the patient side: page and the static groups masthead, demo, colophon, emergency and disclaimer; no per-item name and no shared-element morph in this release."
    category: constraint
    applies_to: "motion.css view-transition rules; RouteTransition; every later Unit"
    trigger: "Any view-transition-name or ViewTransition name prop"
    logic: "IF a CSS rule sets view-transition-name to a value outside the six THEN check:motion M11-vt-name fails; IF a component passes a ViewTransition name other than page THEN the reviewer rejects it; a morph would animate width and height of its group, outside BR4.2"
    violation: "An avatar or card morph breaks BR4.2, AC2.4.2 and AC2.4.6 and adds a captured group per card"
    source: "functional-design-questions.md Q10 (A), FD-091 choreography rule 7 (shared moves only card to story), T-202 Q12, T-203 Q15, functional-spec.md D15"

  # 7. Never-animated elements
  - id: BR7.1
    statement: "The demo marker, the medical-advice disclaimer (colophon and any in-page disclaimer block) and the emergency guidance (the /emergency view, emergency lines and any emergency block) are never animated: no transition, animation, reveal, stagger, press scale or view-transition fade, and they are at full opacity in their final place from the first frame."
    category: constraint
    applies_to: "StaticElement hooks: .demo, .colophon, [data-static=disclaimer], #view-emergency, .emergency-lines, [data-static=emergency] and their descendants"
    trigger: "Any motion anywhere on the page"
    logic: "IF an element matches a static hook THEN animation and transition are none for it and its descendants, and no motion rule selects it"
    violation: "Any movement or fade of these elements breaks AC2.4.4 and the project.md Mandated disclaimer and demo-marker rules"
    source: "AC2.4.4, FD-091 (disclaimer and emergency strip never animated), project.md Mandated (persistent disclaimer, emergency guidance, visible demo marker), T-011 step 6"
  - id: BR7.2
    statement: "During a route transition the masthead, demo marker, colophon and any in-page emergency or disclaimer block keep their own non-animated view-transition groups, painted above the page content: each shows only its new state, at its final place, from the first frame, so no moving element covers them."
    category: policy
    applies_to: "ViewTransitionGroup masthead, demo, colophon, emergency, disclaimer"
    trigger: "A route transition runs (BR6.1)"
    logic: "IF a static group exists in the new state THEN show it at once above the page group ELSE hide its old state at once"
    violation: "A static element that fades, moves, or is painted under the moving page breaks AC2.4.4"
    source: "AC2.4.4, functional-design-questions.md Q8 (A), motion-tech-research.md §4 (header anchored by view-transition-name)"
  - id: BR7.3
    statement: "Each view-transition name appears at most once per page; in-page blocks join a static group only through data-static=\"emergency\" or data-static=\"disclaimer\" (the /emergency view joins through its section id); a duplicate makes the browser skip the transition and swap the page, which is the accepted safe failure."
    category: constraint
    applies_to: "All pages; later Units that add emergency or disclaimer blocks"
    trigger: "A page renders static hooks"
    logic: "IF a page would carry two elements with the same static group THEN only one gets the data-static hook (the first, most prominent); the others stay static by BR7.1 but join no group"
    violation: "A duplicate name silently turns off route transitions on that page; Build and Test watches for the console error"
    source: "Q8 (A), View Transitions API naming rule"
  - id: BR7.4
    statement: "Static elements are never inside a Reveal list, never carry a scroll-reveal hook, and are never selected by a motion rule; check:motion fails if a motion rule's selector names a static hook."
    category: validation
    applies_to: "motion.css; Reveal usage in later Units"
    trigger: "pnpm check:motion and review"
    logic: "IF a motion rule's selector contains .demo, .colophon, .emergency-lines, .emerg-card, #view-emergency or [data-static outside a :not(...) exclusion THEN the check fails (the static block itself is exempt); IF a Reveal list contains a static block THEN the reviewer rejects"
    violation: "check:motion exits non-zero"
    source: "AC2.4.4 (component test and CSS check), T-011 acceptance 'never-animated elements'"

  # 8. No gamification, no dark patterns
  - id: BR8.1
    statement: "No confetti, streak, earned badge, points, score, counter animation, countdown, fake urgency, auto-advancing carousel or motion that nudges anyone towards sharing or reacting, anywhere in patient motion code."
    category: constraint
    applies_to: "apps/web/src (patient motion code, PublishTick, later confirmation states)"
    trigger: "Review and the T-011 acceptance search"
    logic: "IF the search rg -i \"confetti|streak|badge-earn|points\" apps/web/src finds a match in patient motion code, OR a motion draws attention to a share or react control THEN it is invalid"
    violation: "Breaks AC2.4.5, project.md Forbidden (no number stands for quality) and FD-091 rule 11"
    source: "AC2.4.5, project.md Forbidden, FD-091 choreography rules 5 and 11"

  # 9. Checks and process
  - id: BR9.1
    statement: "pnpm check:motion (node scripts/css-motion-check.mjs) runs inside pnpm check as step S8b, after contrast:patient and before build, and fails on any of these: a non-transform/opacity animated property; a transition without an explicit property list; a literal duration outside the tokens; a repeated or infinite animation; a scale outside 0.98-1.02; a movement rule outside the guards; any motion declaration in patient.css; a motion rule that selects a static hook outside :not(); uppercase or letter-spacing on Bengali without a reset; a transform in a :hover rule; a broken dark-token structure; a view-transition name outside the six. Its planted violations, including transition: width, run as Vitest tests in T-010's tooling project."
    category: validation
    applies_to: "scripts/css-motion-check.mjs, scripts/css-motion-check.test.mjs, root package.json check script"
    trigger: "pnpm check (S8b; the tests run in S6 test:coverage), CI on every bolt/** push"
    logic: "IF any listed condition is found in apps/web/src/styles/patient.css or motion.css THEN print file, line and reason, and exit 1 ELSE exit 0; declarations are parsed, not lines, so Prettier's multi-line values are read whole and their first line is reported; attribute selectors are matched with either quote style; IF a test's planted fixture passes the check THEN the test fails"
    violation: "A check that passes a planted violation is itself a defect"
    source: "AC2.4.6 (CSS check), T-011 step 8 and acceptance 'Animated properties', BR4.1-BR4.7, BR5.3, BR7.4, BR2.2, BR6.5, BR1.8, BR6.12, T-010 BR8.4 (appended after contrast), scripts/vitest.config.ts (tooling project)"
  - id: BR9.2
    statement: "The system is plain CSS plus React's own ViewTransition: no Tailwind, CSS-in-JS, animation library or icon library, no new runtime dependency, and no server-rendered style attribute for motion (a strict style-src-attr policy under T-502 would block it)."
    category: constraint
    applies_to: "apps/web package.json, motion components, motion.css"
    trigger: "Code Generation and review"
    logic: "IF a motion value must vary per element THEN use a data attribute or nth-child selector, never style={{...}}; IF a package is proposed THEN it is out of scope without a new FD entry"
    violation: "Breaks FD-032, AC2.4.1 and the T-502 CSP plan"
    source: "FD-032, FD-091, AC2.4.1, motion-tech-research.md §2.4"
  - id: BR9.3
    statement: "This Unit adds no message key: the motion switch label (a11y.motion) and the publish confirmation (compose.publishedNote) already exist in both dictionaries; any key Code Generation finds necessary goes into en.json and bn.json in the same commit, and its Bengali value is flagged for the owner's review."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "IF a new user-facing string is needed THEN add it to both files in one commit, regenerate the key list, and list it for FD-042 review ELSE add nothing"
    violation: "A one-language key, or unflagged Bengali copy, breaks project.md Mandated and FD-042"
    source: "NFR7, project.md Mandated (both dictionaries in one commit), project.md Forbidden (no hard-coded string), FD-042"
  - id: BR9.4
    statement: "Before the Unit is done, all of these hold: npx impeccable detect apps/web/src --no-advisory is clean; pnpm contrast keeps its exact staff output; contrast:patient passes with no pair skipped; component tests pass in en and bn; the Playwright motion smoke passes; pnpm check (eleven steps) and pnpm smoke are green with no assertion removed; the check workflow is green on the pushed Bolt head before the squash merge."
    category: validation
    applies_to: "Code Generation, Build and Test, the merge"
    trigger: "Unit completion and merge"
    logic: "IF any listed check fails, OR CI on bolt/t-011-patient-design-and-motion-system is not green THEN the Unit is not done and does not merge; a check is never weakened to pass"
    violation: "Unit cannot merge (team.md Way of Working, steps 2-3 and 6; T-010 BR10.4)"
    source: "team.md Testing Posture, 01-conventions.md §7.8, T-011 acceptance table, functional-design-questions.md Q7 (A), T-010 Q10 (a Bolt merges only after its branch is green)"
  - id: BR9.5
    statement: "Build and Test records a baseline for the shell, not a gate: Lighthouse on /en and /bn home on the throttled mid-range Android profile (slow 4G, 4x CPU), giving LCP, CLS and total blocking time, plus first-view CSS bytes and the font file size; the gated LCP, INP and CLS run on finished pages belongs to U42 (T-503)."
    category: policy
    applies_to: "Build and Test record, hand-off"
    trigger: "Build and Test"
    logic: "IF a figure is above the NFR13 threshold already on the bare shell THEN record it and raise an ISS row (S2) ELSE record it"
    violation: "Claiming a figure that was not measured breaks D10"
    source: "AC2.4.6 (baseline part), AC2.3.6, NFR13, NFR1, T-011 acceptance 'AC2.4.6 baseline'"
  - id: BR9.6
    statement: "Every motion feature is a progressive enhancement: where view transitions, scroll timelines or @starting-style are missing (older Firefox, Samsung Internet, WebKit gaps), the page shows the same content and controls without motion."
    category: constraint
    applies_to: "All primitives"
    trigger: "Any browser in the NFR5 list"
    logic: "IF a feature is unsupported THEN the static default styles apply and nothing else changes; feature use sits behind @supports or the browser's own no-op"
    violation: "A page that breaks or hides content without a motion feature fails AC2.3.5"
    source: "NFR5, AC2.3.5, motion-tech-research.md §2.2"
  - id: BR9.7
    statement: "The hand-off lists every token and class rename, the final colour values after the contrast run, the font file size, the shell's Lighthouse baseline, any new Bengali copy, each file written outside the owned paths with its reason, and the task-text corrections; Code Generation appends dependency-check entries first for next/font/local and Hind Siliguri, Playwright, React ViewTransition on the pinned React and Next versions, and impeccable, reusing the 2026-10-28 Prettier entry while it is under 3 days old."
    category: policy
    applies_to: "Code Generation plan and hand-off (docs/implementation/handoffs/T-011.md)"
    trigger: "Code Generation start and Unit completion"
    logic: "IF the dependency-check log has no entry under 3 days old for a dependency this Unit uses THEN check it and append an entry before implementing; the Playwright version is one pnpm 11's minimumReleaseAge accepts"
    violation: "Missing entries break the AGENTS.md dependency rule; a missing rename or owned-path list breaks T-011's hand-off section"
    source: "T-011 Hand-off, project.md Mandated (dependency-check log), AGENTS.md, ISS-285 (release-age policy), T-010 hand-off format"
  - id: BR9.8
    statement: "patient.css and motion.css are inside Prettier's scope and pass format:check; tokens.css, globals.css and admin.css stay ignored as verbatim ports, each with its reason in .prettierignore; a CSS override (singleQuote false) keeps double quotes in CSS, so the contrast tool's :root[data-theme=\"dark\"] { pattern still matches."
    category: constraint
    applies_to: ".prettierignore, prettier.config.mjs, apps/web/src/styles/*.css"
    trigger: "pnpm check S4 format:check, CI"
    logic: "IF a patient stylesheet differs from Prettier's output THEN format:check exits 1; IF the CSS override is missing THEN Prettier writes single-quoted attribute selectors and contrast:patient fails closed (no dark block)"
    violation: "Unformatted authored CSS merges, or a reformat silently breaks the contrast run"
    source: "functional-design-questions.md Q9 (A), T-010 .prettierignore ('the FD-091 patient stylesheet, whose layout T-011 decides'), T-010 BR7.2, project.md Code Style (2026-10-27), 01-conventions.md §7.1, functional-spec.md D13 and § 11 F1"
  - id: BR9.9
    statement: "Every new component and module arrives with Vitest tests that render in en and bn and import nothing from test-support. apps/web stays at or above 80% line coverage. The Playwright files stay out of the Vitest web project (exclude e2e/**) and have their own tsconfig. next/font/local is mocked once in vitest.setup.ts."
    category: validation
    applies_to: "components/patient/motion/**, app/fonts/bn-heading.ts, [locale]/layout.tsx changes, apps/web/vitest.config.ts, apps/web/vitest.setup.ts, apps/web/e2e/**"
    trigger: "pnpm check S2 lint, S6 test:coverage; CI"
    logic: "IF apps/web's line coverage falls below 80% THEN test:coverage exits 1 and tests are added, never the floor lowered (D10); IF a web test imports test-support THEN lint fails (FD-040); IF Vitest collects an e2e spec, OR ESLint finds an e2e file in no tsconfig THEN the gate is red, so both are configured before the spec is written"
    violation: "A red pnpm check (S1), or a lowered floor (D10 breach)"
    source: "team.md Testing Posture (component tests in en and bn; 80% floor), FD-040, T-010 BR6.1-BR6.5, eslint.boundaries.mjs, functional-spec.md § 11 F2-F4"
```

## Rules summary

| ID | Category | Rule in one line |
|---|---|---|
| BR1.1 | constraint | Colours come only from the FD-091 role tokens |
| BR1.2 | validation | Text 4.5:1, focus and boundaries 3:1, surface and hairline steps met, light and dark |
| BR1.3 | constraint | The warm accent is decoration only |
| BR1.4 | constraint | Colour is never the only signal |
| BR1.5 | policy | One `hsl()` token block at the top of `patient.css`, canonical names plus aliases; old layers removed |
| BR1.6 | constraint | Staff console unchanged; no patient motion or tokens on staff pages |
| BR1.7 | policy | Warm "night paper" dark palette; both dark blocks identical; explicit light wins |
| BR1.8 | validation | Exactly one column-0 dark token block, equal to the media-query block; no scheme block (`M10-tokens`) |
| BR2.1 | constraint | FD-091 type scale with `:lang(bn)` sizes and line-heights; one desktop step for display and H1 |
| BR2.2 | validation | No uppercase and no letter-spacing on Bengali, anywhere |
| BR2.3 | constraint | System fonts for body and Latin text |
| BR2.4 | policy | Hind Siliguri 600 subset for Bengali headings, self-hosted, swap, no preload, `bn` only |
| BR2.5 | validation | Bengali line-height ≥ 1.4 and no clipping; no fixed height around Bengali words |
| BR3.1 | constraint | Radii 8/16/999; elevations 0/1/2 |
| BR3.2 | constraint | No glass or blur anywhere; solid masthead |
| BR3.3 | constraint | 44 × 44 px targets on every pointer type |
| BR3.4 | constraint | 3 px focus ring, 2 px offset, never animated |
| BR3.5 | validation | No horizontal overflow at the five viewports, both languages, 200% zoom |
| BR3.6 | constraint | Spacing scale `--space-1`…`--space-8`, `--grid-min`, `--measure`; no literal spacing in patient rules |
| BR4.1 | validation | Durations and easings only from tokens |
| BR4.2 | validation | Only `transform` and `opacity` animate; explicit property lists |
| BR4.3 | validation | Small movement only: 8–16 px rise, 24 px slide, scale 0.98–1.02 |
| BR4.4 | validation | Nothing loops, repeats or auto-plays |
| BR4.5 | policy | Nothing animates on first paint; the LCP element never animates in |
| BR4.6 | constraint | Motion never delays reading, input or navigation |
| BR4.7 | policy | All patient motion lives in `motion.css`; later Units add no motion rule |
| BR5.1 | calculation | Reduced = OS reduce OR in-app switch |
| BR5.2 | policy | `<html data-motion="reduced">` from the cookie; body attribute unchanged |
| BR5.3 | validation | Every movement rule inside both guards |
| BR5.4 | policy | Reduced mode: no movement, no view-transition animation, ≤ 100 ms fades only |
| BR5.5 | constraint | Every step works without motion |
| BR6.1 | policy | Route transition: fade out, fade in plus 12 px rise, only on path changes |
| BR6.2 | policy | Reveal: first 6 children stagger 40 ms; the rest appear at once |
| BR6.3 | policy | Composer step slide 24 px from the direction of travel (T-306) |
| BR6.4 | policy | Publish tick: one transform-drawn tick plus plain text (T-306; T-102 reuses it) |
| BR6.5 | policy | Press scale 0.98 on the listed pressables; instant hover colours; no `:hover` transform anywhere (`M9-hover`) |
| BR6.6 | policy | Home scroll reveals below the first section, inside `@supports` (T-207) |
| BR6.7 | policy | Sheets and menus enter with a rise; close at once |
| BR6.8 | constraint | Static skeletons only, for loads over 1 s |
| BR6.9 | policy | Reading-progress bar scales with scroll; hidden in reduced mode |
| BR6.10 | constraint | Data displays never animate; no bar grows from zero |
| BR6.11 | policy | Later Units' pressables carry `data-press`; no Unit-local press or hover rule |
| BR6.12 | constraint | Six view-transition names only; no shared-element morph (`M11-vt-name`) |
| BR7.1 | constraint | Demo marker, disclaimer and emergency guidance are never animated |
| BR7.2 | policy | Static view-transition groups above the moving page during route changes |
| BR7.3 | constraint | One element per group name per page; a duplicate means a plain swap |
| BR7.4 | validation | No motion rule, Reveal or scroll hook touches a static element |
| BR8.1 | constraint | No gamification or dark-pattern motion |
| BR9.1 | validation | `check:motion` as S8b of `pnpm check`, with the listed failure conditions; planted violations in `tooling` tests |
| BR9.2 | constraint | Plain CSS plus React ViewTransition; no library; no motion style attributes |
| BR9.3 | policy | No new keys expected; any new key in both dictionaries, Bengali flagged |
| BR9.4 | validation | impeccable, both contrast runs, en/bn tests, motion smoke, `pnpm check`, `pnpm smoke`, CI green on the Bolt head |
| BR9.5 | policy | Lighthouse baseline for the shell recorded, not gated (U42 gates) |
| BR9.6 | constraint | Every motion feature is a progressive enhancement |
| BR9.7 | policy | Hand-off lists renames, colours, font size, baseline, owned-path additions, task-text corrections; dependency entries first |
| BR9.8 | constraint | Patient CSS in Prettier's scope with a double-quote CSS override; staff and shared CSS ignored |
| BR9.9 | validation | Tests in `en` and `bn`, no `test-support`, `apps/web` ≥ 80% lines, e2e outside Vitest with its own tsconfig, font mocked in setup |
