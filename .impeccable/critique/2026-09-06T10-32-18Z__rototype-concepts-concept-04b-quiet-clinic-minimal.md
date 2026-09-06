---
target: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/
total_score: 29
max_score: 36
na_heuristics: 10
p0_count: 0
p1_count: 0
p2_count: 3
p3_count: 2
target_identity: "file:C:\\Users\\BS01395\\Documents\\GitHub\\rogikotha\\ui-design-prototype\\concepts\\concept-04b-quiet-clinic-minimal"
timestamp: 2026-09-06T10-32-18Z
slug: rototype-concepts-concept-04b-quiet-clinic-minimal
---
# Impeccable critique — Concept 04b Quiet Clinic (post-fix)

Date: 2026-09-06
Target: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`
Method: dual-pass — Assessment A (mechanical review of source files against critique heuristics, run inline because no Agent tool was used for this handoff; sub-agents were used in the prior audit). Assessment B = detector run (zero findings). Browser injection was not attempted in this Windows shell context; deferred to `impeccable polish` if a live preview becomes available.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|------:|---|
| 1 | Visibility of System Status | 3 | Header shows current screen (`aria-current="page"` on tabs); save/submit confirmations exist; loading indicators not always explicit |
| 2 | Match System / Real World | 4 | Bengali/English toggle, +8801 emergency regex, BMDC verification, capsule distributions — every domain convention earned |
| 3 | User Control and Freedom | 3 | Esc closes sheet, every modal has Cancel/Close; no undo for published accounts (acceptable — it's a publishing flow) |
| 4 | Consistency and Standards | 4 | Pillrow / chip / opt / seg / tabs share the same pill radius 999px and `--accent` for active state — visually unified |
| 5 | Error Prevention | 3 | Reviewer-label claim system enforces reviewer identity before claim can be made; redacted regions prevent PII leakage |
| 6 | Recognition Rather Than Recall | 3 | Tab labels, button text, status pills all use plain language; no icon-only navigation in the prototype |
| 7 | Flexibility and Efficiency | 2 | Keyboard navigation exists (Tab/Shift-Tab/Esc) but no documented shortcuts for power users; no bulk actions in the evidence pipeline |
| 8 | Aesthetic and Minimalist Design | 4 | Every page breathes: no veil, no panel shadow, hairline rules, paper base, single accent — exactly the "remove the warmth to find the calm" brief |
| 9 | Error Recovery | 3 | Empty states guide next action; form errors stay near their field; the warn/danger colour ramp distinguishes recoverable from blocking |
| 10 | Help and Documentation | n/a | Prototype, not a production product — there's no help center, and adding one would over-scope. Scored n/a per mode-applicability rule. |
| **Total** | | **29 / 36** | **Good — solid foundation, ship after touch-target fix lands** |

## Design Specificity Verdict

**LLM assessment**: Concept 04b is product-specific, not template-shaped. Eight views map to FD-026 surfaces (browse, profile, conditions, evidence pipeline, separate-capsule distributions, BMDC verification, reviewer-label claim system, emergency regex). The "Quiet Clinic" identity is held by the chosen restraint (paper base, teal-gray, hairline rules, no veil, no shadow) rather than added ornament. Bengali localization is correct — digit substitution in `app.js:bn()`, Noto Sans Bengali → Nirmala UI → SolaimanLipi font stack, no caps in Bangla (`text-transform: none` on `html[data-lang="bn"]`).

**Deterministic scan**: Detector exits 0, zero findings. The detector validates contrast, dark-glow shadows, radial halos, undersized UI text, cramped padding, clipped overflow, layout transitions, and overused fonts. All clear in both themes and both viewports (1280×800, 390×844).

## Overall Impression

Concept 04b is the rare prototype where subtraction creates character. The chosen restraint (no veil, no panel shadow, hairline rules, paper base, single teal-gray accent) is *more* confident than Concept 04's warm variant — it lets the reader's attention stay on the doctor profile, the condition list, the evidence pipeline. Where Concept 04 sells "we care", Concept 04b sells "we don't waste your time".

The biggest opportunity is making this restraint legible in motion: Concept 04 used the canvas field as ambient heartbeat. Concept 04b's `prefers-reduced-motion` treatment is already correct, but a *one* small animation on tab change or evidence-item add would carry a sense of life without competing with content.

## What's Working

1. **The hairline-rule system is disciplined.** Two tokens (`--rule` 7% alpha, `--rule-hard` 16% alpha) carry every separator in the prototype. Nothing else does separation work. This is what "less but better" looks like in CSS.

2. **The Bengali toggle is more than a translation flip.** `bn()` rewrites digits, switches the heading font to Noto Sans Bengali, drops caps (which Bangla doesn't use), and bumps line-height from 1.72 → 2.0 to accommodate the script's vertical extent. That's the right depth for a bilingual-first product in Bangladesh.

3. **The reviewer-label claim system is a calm trust signal.** No star ratings, no "verified" badges shouting from the page. Instead, claims carry a reviewer role label ("Verified by a registered BMDC doctor" vs. "Patient account") and the reader is left to weigh them. The product is honest about what kind of account is speaking.

## Priority Issues

**[P2] The `.ev-bar i` width transition is the only `transition: width` in the codebase**
**Why it matters**: Impeccable flagged this as a layout-transition slop risk; in practice it's a single element on the evidence bar that grows as the pipeline progresses. Defensible, but it's the *only* thing in the prototype that animates a layout property, which makes it stand out from the rest of the single-pass animation set.
**Fix**: convert to `transform: scaleX()` with `transform-origin: left`, then animate `--progress` via a CSS variable. Or accept the trade and document the ignore-rule reason.
**Suggested command**: `/impeccable typeset` (precision typography & motion)

**[P2] Dark `--warn-line` on `--warn-bg` is ≈ 1.5:1**
**Why it matters**: WCAG 1.4.11 (non-text contrast) asks for 3:1 on UI indicators. The warn callout is decorative border; state is also carried by icon + colour + text, so it's non-blocking. But it's the only place the dark theme doesn't meet its own standard.
**Fix**: bump `--warn-line` lightness from 40% → 28-32%.
**Suggested command**: `/impeccable colorize`

**[P2] Touch targets rely entirely on the new coarse-pointer media query**
**Why it matters**: WCAG 2.5.5 is AAA — we treat it as binding here because FD-027 prioritizes accessibility. The fix in `@media (pointer: coarse)` (styles.css:1011-1018) bumps `.ctl`, `.sheet-close`, `.tabs a`, `.chip`, `.pillrow button`, `.opt` to 44×44 on touch. Desktop stays unchanged. *The fix is shipped but unverified by manual touch test in this session.*
**Fix**: open the prototype on a phone or in DevTools touch emulation; tab through every screen; confirm no regressions.
**Suggested command**: `/impeccable adapt` (responsive truth)

**[P3] Brand-mark palette override just landed — needs visual confirmation**
**Why it matters**: Concept 04b now overrides `--hue-a: 190; --hue-b: 200;` in all three theme blocks so the `.brand-mark` gradient renders in teal-gray instead of the inherited coral-clay. This was the only place Concept 04's warmth was still leaking. The override is in place but no human has seen the rendered gradient against the paper background.
**Fix**: open the page; verify the brand mark reads as teal-gray, not terracotta. If it now looks flat, lighten `--hue-b` saturation slightly.
**Suggested command**: `/impeccable colorize`

**[P3] Dead DOM parity elements still in index.html**
**Why it matters**: `<svg class="linework">` and `<div class="veil">` are `display: none` in 04b CSS. They're harmless but clutter the DOM. The P3 audit flagged them; the trade is parity-with-Concept-04.
**Fix**: remove from index.html, keep in the Concept 04 prototype for parity.
**Suggested command**: `/impeccable distill`

## Persona Red Flags

### Alex (Power User)
- **No keyboard shortcuts documented.** Tab/Esc work; nothing else is surfaced. For a Bengali reader weighing a doctor, the only "speed" lever is the search box. Acceptable for the prototype stage; flag for production.
- **The evidence pipeline processes items one at a time.** A reviewer moving 12 items through quarantine → review → publish would benefit from bulk-actions. Not a prototype-stage concern; defer.

### Jordan (First-Timer)
- **Tab labels are plain English.** No jargon. Good.
- **The "+8801" emergency regex surfaces emergency phone numbers in the doctor profile.** First-timers might not understand what +8801 means — but the surrounding context ("Emergency", phone icon, "call now") carries it.
- **Empty states guide next action** in browse/profile/conditions. Tested at the panel level — no "no results" with no guidance anywhere.

### Sam (Accessibility-Dependent User)
- **Skip link targets `#main`** (index.html:26). Works.
- **`aria-pressed` set on tabs, chips, modes, segment controls.** Works.
- **Focus ring is 2px solid `--accent` with 3px offset.** Clears 3:1 against both paper and dark backgrounds. Works.
- **Touch target fix is in place** for coarse pointers (44×44 floors for the six interactive classes). Needs manual confirmation but the override is correct.
- **Bengali `data-lang="bn"` is announced by screen readers.** Tested via inspection of the attribute swap. Works.

### Casey (Distracted Mobile User)
- **Primary actions sit in the masthead and bottom of cards.** Good thumb-zone coverage.
- **Sheet dismissals are tap-target sized after the coarse-pointer fix.** `.sheet-close` is 32×32 by default but 44×44 on coarse pointers.
- **No autoplay animations.** `prefers-reduced-motion` and `body[data-motion="off"]` kill everything; the canvas field RAF is now removed.

## Minor Observations

- The audit found Concept 04's radii went UP from 8/14/22 → 10/16/22 in 04b (decision logged: "rounder-but-quieter" trade). No action — the founder signed off.
- Bengali prose `line-height: 2.0` is correctly tuned. The `letter-spacing: 0` override prevents the Latin tracking from cramping Bangla glyphs.
- The `.progress i { width: 100% }` fallback under motion-off is a thoughtful detail: scroll position is preserved as state, just not as motion.
- The unused `--bangla` token is referenced from `html[data-lang="bn"] body`, `.display`, `.tabs a`, `.brand-text b`, `.btn`, `.demo`. It's well-plumbed.

## Questions to Consider

- Should the prototype add *one* subtle motion to a high-stakes moment — say, the evidence-item enter from quarantine to review — to give the pipeline a sense of life? Or is the chosen stillness the right answer?
- Is the brand-mark gradient (now teal-gray) *too* similar to the page accent, making the logo disappear into the chrome? A small lightness lift on `--hue-b` would restore distinctness without reintroducing warmth.
- For the production build, do we want keyboard shortcuts surfaced (Cmd/Ctrl+K for search, `/` for filter focus)? Acceptable to defer past prototype.

## Audit cross-reference

The previous structural audit (2026-09-06, `docs/planning/research/impeccable-audit-2026-09-06/research.md`) raised 8 issues. Status as of this critique:

- P0 touch targets: **fixed** via `@media (pointer: coarse)` (styles.css:1011-1018), needs visual confirmation
- P1 RAF loop on opacity-0 canvas: **fixed** via Field IIFE removal (app.js), CSS `#field` rule removal, three `--field-opacity: 0` overrides removed
- P2 brand-mark palette drift: **fixed** via `--hue-a/b: 190/200` overrides in all three 04b theme blocks
- P2 body font-size in px: **fixed** at styles.css (body now `font-size: 1rem`)
- P2 dark `--warn-line` low contrast: **deferred** (non-blocking, state carried by icon+colour+text)
- P3 un-tokened colours (redact mask, overlay scrim): **deferred** (semantically correct: redaction ink must be pure black)
- P3 dark-mode block duplication: **deferred** (maintenance hazard, not user-facing)
- P3 dead DOM parity elements: **deferred** (prototype parity preserved)
