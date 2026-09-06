# RogiKotha — dev reference

> Practical entry point for engineers picking up the prototype. Pairs with
> `DESIGN.md` (visual system), `PRODUCT.md` (product truth), and the
> `ui-design-prototype/` directory (the runnable artifact).
>
> **This is the only RogiKotha prototype.** Concept 04b Quiet Clinic
> (minimal pass) is the selected direction per FD-027 (2026-09-06). Concepts
> 03 and 04 are kept as live comparators in the gallery, not as candidates
> for production.

## What this prototype is and isn't

| It is | It isn't |
|---|---|
| A runnable demo of every screen, with two languages, dark mode, and review-pipeline UI | A wireframe (every panel has real data and real interactivity) |
| A **design confirmation artifact** for the founder, stakeholders, and dev handoff | A production codebase (no build step, no framework, no auth, no backend) |
| The source of truth for the visual system (tokens, type ramp, spacing) | A finalised backend contract (the data layer in `shared/rogikotha-data.js` is shape-only) |

All data is fictional but plausible. Doctor names, BMDC IDs, and patient
accounts are made up; phone numbers are real Bangladesh hotlines; the
moderation flow simulates what production would do.

## File layout

```
ui-design-prototype/
├── index.html                 ← gallery (shows 03, 04, 04b side by side)
├── shared/
│   └── rogikotha-data.js      ← SINGLE SOURCE OF TRUTH for doctors, conditions,
│                                facilities, reviews, evidence, i18n strings
├── concepts/
│   ├── concept-03-luminous-editorial/
│   ├── concept-04-quiet-clinic/
│   ├── concept-04b-quiet-clinic-minimal/   ← SELECTED (FD-027)
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   └── .archive/              ← retired directions
└── README.md
```

The two live comparators (03, 04) share the data file and copy the 04b
CSS/JS skeleton, then diverge on visual tokens and a few layout choices.
Editing 04b is the canonical path; the others exist for founder review.

## How to run it

Open `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html`
directly in a browser — no server, no build. The shared data file is loaded
with a relative `<script src>`.

For local development with `npx impeccable detect` and `npx impeccable audit`,
the `.claude/skills/impeccable/` skill is already installed under the repo root.

## Data layer (`shared/rogikotha-data.js`)

Exposed as `window.RK` (also reachable as `RK`). Every selector function is
null-safe (`RK.doctorById` returns `undefined` for unknown IDs; callers
guard). All text content is bilingual `{ en: '…', bn: '…' }`; helpers
`RK.t(key, lang)` and `RK.pick(bilingual, lang)` resolve i18n.

### Top-level collections

| Property | Type | Notes |
|---|---|---|
| `RK.doctors` | `Doctor[]` | N = 16. Every doctor has at least one review. |
| `RK.conditions` | `Condition[]` | N = 10. Cross-linked from reviews. |
| `RK.facilities` | `Facility[]` | N = 6. Linked from accounts. |
| `RK.reviews` | `Review[]` | N ≈ 80. Self-reported outcome + sentiment. |
| `RK.evidence` | `Evidence[]` | N ≈ 40. Linked to reviews, has pipeline state. |
| `RK.accounts` | `Account[]` | N = 6. Patient personas with conditions & facilities. |
| `RK.doctorConditions` | `DoctorCondition[]` | Join table for doctor ↔ condition counts. |
| `RK.config` | `object` | Emergency numbers, last-verified dates, etc. |

### Constants

- `RK.SENTIMENTS = ['positive', 'mixed', 'negative']` — same order as
  capsules render. Reviewer sentiment from review.
- `RK.OUTCOMES = ['helped', 'same', 'worsened']` — patient-reported outcome.

### Selectors

| Function | Returns | Use |
|---|---|---|
| `RK.doctorById(id)` | `Doctor \| undefined` | Profile page lookup |
| `RK.conditionById(id)` | `Condition \| undefined` | Condition page |
| `RK.facilityById(id)` | `Facility \| undefined` | Facility page |
| `RK.reviewById(id)` | `Review \| undefined` | Evidence pipeline lookup |
| `RK.reviewsFor(doctorId)` | `Review[]` | Doctor profile |
| `RK.evidenceFor(reviewId)` | `Evidence[]` | Evidence pipeline on review |
| `RK.conditionsFor(doctorId)` | `{ condition, count }[]` | Doctor profile breakdown |
| `RK.sentimentOf(reviews)` | `Distribution` | Doctor profile capsule row |
| `RK.outcomeOf(reviews)` | `Distribution` | Doctor profile outcome rows |

### i18n

| Function | Returns | Use |
|---|---|---|
| `RK.t(key, lang)` | `string` | Look up `STRINGS[key][lang]` |
| `RK.pick({en, bn}, lang)` | `string` | Render a bilingual field |
| `RK.applyLang(root, lang)` | `void` | Walks the DOM and replaces `data-i18n` text |

The `STRINGS` table is exhaustive — every `data-i18n="…"` attribute in the
HTML must have a key, and every key has both EN and BN. Adding a key in
either layer without the other is a build-time-visible bug.

### Emergency numbers

`RK.config.emergency` holds the canonical hotlines. The prototype renders
them in the **emergency** view and on every doctor profile (`emergencyPanel()`
fragment). If these change, update both `shared/rogikotha-data.js` and
the `STRINGS.emergview.*` translations together.

## Screens

Hash-routed — `#discover`, `#results`, `#profile/d1`, etc. `route()` in
`app.js` reads `location.hash`, mutates `state`, and toggles
`#view-<name>` visibility. `body[data-view]` is the single source of truth
for CSS view-scoped rules.

| View | Hash | Render fn | Notes |
|---|---|---|---|
| Discover | `#discover` | `renderDiscover` | Hero search, browse cards, safety info |
| Results | `#results` | `renderResults` | Tabs (doctors/conditions/facilities), filter rail, compare tray |
| Profile (doctor) | `#profile/<id>` | `renderProfile` | Distribution capsules, outcomes, reviews, evidence pipeline |
| Account (patient) | `#account/<id>` | `renderAccount` | Patient story, conditions, facilities used |
| Condition | `#condition/<id>` | `renderCondition` | Condition summary, doctors who treat it |
| Facility | `#facility/<id>` | `renderFacility` | Facility profile |
| Compose | `#compose` | `renderCompose` | Three-mode composer (detailed/short/photo-first) |
| Mine | `#mine` | `renderMine` | Published/drafts/quarantine tabs |
| **Emergency** | `#emergency` | `renderEmergency` | Eight Bangladesh hotlines as `tel:` links |
| **About** | `#about` | `renderAbout` | Moderation, reviewer labels, privacy, limits, contact |
| About overlay (sheet) | n/a | `openSheet` | Methodology + comparison inside the results sheet |
| Compare tray | n/a | `renderTray` | Pinned doctors in a bottom tray; opens compare sheet |

**Footer-nav only views** (Emergency, About) are intentionally absent from
the top tab bar to keep it calm. Both are reachable from the colophon.

## State

Single mutable `state` object at the top of `app.js`. Resets on reload —
no persistence beyond `localStorage` for language/theme/motion preferences.
Mutations are explicit (no observer pattern, no proxy); every mutation
calls a render fn or `renderAll()`.

## Visual system — what's available as CSS

All tokens are declared in `:root` (light) and `:root[data-theme="dark"]`
(dark) in `styles.css`. The 04b override block at line ~1060 redefines
the shared component tokens — never edit `:root` directly in 04b, edit
the override block.

Key tokens: `--bg`, `--ink`, `--ink-soft`, `--ink-faint`, `--glass`,
`--glass-2`, `--rule`, `--rule-hard`, `--shadow`, `--accent`, `--accent-2`,
`--accent-soft`, `--positive`, `--mixed`, `--negative`, `--neutral`,
`--warn-bg/-line/-ink`, `--danger-bg/-line/-ink`.

Radii: `--r-sm` (10), `--r-md` (16), `--r-lg` (22). Pills: `999px`.
Type: `--serif` (round display), `--sans` (UI), `--bangla` (Bengali),
`--mono` (counts). Spacing: inner panel `clamp(18, 2.8vw, 30)px`,
outer main `clamp(18, 3.5vw, 40)px`.

## Accessibility — what the detector already enforces

- WCAG AA contrast: 4.5:1 body, 3:1 UI boundaries, verified in both modes.
- Bengali digit substitution: `bn()` replaces `0–9` with `০–৯` when `lang=bn`.
- Bengali caps are dropped: `text-transform: none` in `html[data-lang="bn"]`.
- Bengali line-height: 1.95–2.0 (vs 1.72 Latin).
- Touch targets ≥ 44×44px on `pointer: coarse`.
- `prefers-reduced-motion` and `body[data-motion="off"]` both kill all motion.
- Skip link, focus ring (`--accent`, 2px, 3px offset), safe-area insets.

## Adding a screen

1. Add a `<section class="view" id="view-<name>" hidden></section>` in
   `index.html` between the existing views.
2. Add the name to the `VIEWS` array in `app.js`.
3. Add a `render<Name>()` function that populates `#view-<name>.innerHTML`.
4. Call it from `renderAll()` and from `route()` (when `v === '<name>'`).
5. Add i18n strings to `STRINGS` in `shared/rogikotha-data.js` (both EN and BN).
6. Add CSS rules to `styles.css` — use existing tokens, never declare new
   colours or font stacks inline.
7. If it's a top-level screen, add a tab to the masthead `.tabs` and a
   `nav.<name>` string. If it's secondary, add a footer link instead.

## Adding a doctor / condition / facility

Append to the relevant collection in `shared/rogikotha-data.js`. The minimum
to make a doctor visible:

```js
{
  id: 'd17',
  name: { en: 'Dr. …', bn: 'ডা. …' },
  specialty: { en: 'Cardiology', bn: 'হৃদরোগ চিকিৎসা' },
  city: { en: 'Dhaka', bn: 'ঢাকা' },
  bmdc: 'A-12345',            // required; non-BMDC docs render "Not verified"
  verified: true,             // controls the .badge on profile cards
  qualifications: 'MBBS, FCPS',
  about: { en: '…', bn: '…' }
}
```

…plus ≥ 1 review (or the profile will render "Not provided" for sentiment).
Reviews can attach evidence files in any of three states: `ready`,
`hold`, `quarantine`. State controls the badge colour and the available
moderation actions.

## Audit and polish

`/impeccable detect` runs the detector (3 pre-existing baseline warnings
about Inter font, dark-glow on `.search-shell`, body overflow-clip — all
inherited from the shared layer; safe to ignore for 04b).
`/impeccable audit` is a five-dimension review (accessibility, performance,
responsive, theming, implementation integrity) the design team ran on
2026-09-06 — see `docs/planning/research/impeccable-audit-2026-09-06/`.

The Impeccable detector exit code is non-zero on findings — this is
expected for the prototype as a whole but is **zero** on Concept 04b's own
files when run with `--no-advisory`.

## Known gaps before production

These are documented in the audit and intentionally deferred:

| ID | Sev | Issue |
|---|---|---|
| P0 | Touch targets < 44×44 in coarse-pointer view | Bump `.ctl`, `.tabs a`, `.sheet-close`, `.chip` etc. |
| P1 | RAF loop on `opacity: 0` canvas | Gate `Field.start()` on a `data-field="on"` attribute or remove |
| P2 | Body font-size in px (not rem) | Convert to `1rem` for proportional scaling |
| P2 | Brand-mark palette drift (coral in 04b) | Override `--hue-a` / `--hue-b` in 04b `:root` block |
| P3 | Dark-mode block duplication | Extract to a single selector list |

See `docs/planning/research/impeccable-audit-2026-09-06/research.md` for
the full audit.

## See also

- `DESIGN.md` — visual system, type ramp, motion, copy rules
- `PRODUCT.md` — product truth, audience, anti-references
- `docs/design/design-comparison.md` — FD-027 selection rationale
- `docs/design/ai-slop-trim-log.md` — trim pass that got us to 04b
- `docs/planning/research/impeccable-audit-2026-09-06/research.md` — Audit's structural findings
- `docs/status/decision-log.md` — FD-027 itself
