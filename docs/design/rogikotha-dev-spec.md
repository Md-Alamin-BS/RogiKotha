# RogiKotha — dev reference

> Practical entry point for engineers picking up the prototype. Pairs with
> `DESIGN.md` (visual system), `PRODUCT.md` (product truth), and the
> `ui-design-prototype/` directory (the runnable artifact).
>
> **This is the only RogiKotha prototype.** Concept 04b Quiet Clinic
> (minimal pass) is the selected direction per FD-027 (2026-09-06) and the
> only patient direction still in `concepts/`. Concepts 01, 02, 03, 04, 04c,
> 04d and 05 are kept in `ui-design-prototype/.archive/` as the record of how
> 04b was arrived at, not as candidates for production — 04c and 04d archived
> per FD-028, 03 and 04 per FD-029 (2026-09-08). The staff console in
> `ui-design-prototype/admin/` belongs to the same prototype but is a separate
> portal on its own surface system — see **Staff console** below.

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
├── index.html                 ← gallery (04b and the staff console)
├── gallery.css
├── shared/
│   └── rogikotha-data.js      ← SINGLE SOURCE OF TRUTH for doctors, conditions,
│                                facilities, reviews, evidence, moderation,
│                                i18n strings — read by 04b and by admin/
├── concepts/
│   └── concept-04b-quiet-clinic-minimal/   ← SELECTED (FD-027)
│       ├── index.html
│       ├── styles.css
│       └── app.js
├── admin/                     ← staff console, Chart Tray surfaces
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .archive/                  ← retired directions + the admin shell studies
└── README.md
```

Editing 04b is the canonical path for the patient UI. The archived directions
read the same data file and copy an earlier CSS/JS skeleton, then diverge on
visual tokens and a few layout choices; they are kept as the design record,
not for review. The staff console shares the data file and nothing else — its
own stylesheet, its own tokens, its own surface system.

## How to run it

Open `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html`
directly in a browser — no server, no build. The shared data file is loaded
with a relative `<script src>`. The staff console is
`ui-design-prototype/admin/index.html`; `ui-design-prototype/index.html` is the
gallery and links both.

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

This section is 04b's system; the staff console has its own, described below.
All tokens are declared in `:root` (light) and `:root[data-theme="dark"]`
(dark) in 04b's `styles.css`. The 04b override block at line ~1060 redefines
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

## Staff console (`admin/`) — Chart Tray

Adopted per FD-030 (2026-09-08). The moderation console is a separate portal,
not a view of 04b. It loads
`shared/rogikotha-data.js` for `RK.moderation` and takes nothing else from the
patient side: its own `styles.css`, its own token set, no patient chrome, and
`<meta name="robots" content="noindex">` in the head. Routes are `#queue`,
`#evidence`, `#providers`, `#notifications`, `#config`.

Its surface system is **Chart Tray**, and its one rule is that elevation
encodes agency — a moderator can tell what is workable from what is read-only
before reading a word:

| Plane | Token | Means |
|---|---|---|
| Sunken | `--surface-sunken` | Read-only — audit timeline, evidence viewer |
| Page | `--surface-page` | Ground |
| Raised | `--surface-raised` | Workable — lane trays, the case tray |
| Overlay | `--surface-overlay` | Sheets, over `--overlay-scrim` |

Solid `--accent` is spent in three places only: one primary fill, the 3px
selection flag, and focus rings. It is never a text colour. Badges and buttons
are kept apart by fill band (`--fill-badge` for read-only, `--fill-secondary`
for pressable), height and radius, so a count can never render heavier than a
control. Radius encodes size class, descending — `--r-plane` (14), `--r-well`
(10), `--r-control` (9), `--r-badge` (4) — and `999px` survives only on the
count pill, which makes full-round a unique signal. Spacing is six steps
(`--sp-1`…`--sp-6`: 4/8/12/24/40/64), type four sizes (`--fs-1`…`--fs-4`:
11.5/13.5/17/22).

Dark mode is not the light ramp re-tinted: the surface steps are roughly 1.7×
the light steps, because a tint that reads on paper all but vanishes on
near-black. Check both modes when touching a plane.

Two structures here have no equivalent in the earlier pass:

- **The dock.** A solid-accent **Record decision** button (`#mod-commit`,
  `admin.commit`) at the foot of the case tray. The console previously had ten
  option buttons, a textarea, and no submit — the page that exists to record a
  moderation decision had no way to finish the job.
- **Grouped navigation.** `NAV_GROUPS` in `app.js` renders Casework (queue,
  evidence, providers) and Oversight (notifications, config) as iconed items
  carrying waiting counts, with a breadcrumb above the view; the queue count
  goes urgent while anything sits in the critical lane. Under 760px the same
  groups render as a bottom tab bar. It replaces five identical unlabelled
  pills.

Chart Tray was variant A of three shell studies — A Chart Tray (surface-led),
B Ink Ledger (type-led), C Signal Ward (colour-led) — built over the same
markup and the same records. All three are kept at
`ui-design-prototype/.archive/admin-shell-studies/`; `docs/design/design-comparison.md`
records what each was testing and what each cost.

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

`/impeccable detect` runs the detector. The historical baseline warnings
were dark-glow on `.search-shell` and body overflow-clip, inherited from the
shared layer. The third — the Inter font warning — was **not** inherited: 04b
declared `Inter` first in its own `--sans` override while the prototype ships
no webfonts, so the name never resolved. `--sans` now matches the compact-UI
stack named in `docs/planning/ux/DESIGN.md` (Segoe UI Variable Display →
Segoe UI → system-ui) and the warning is gone.
`/impeccable audit` is a five-dimension review (accessibility, performance,
responsive, theming, implementation integrity) the design team ran on
2026-09-06 — see `docs/planning/research/impeccable-audit-2026-09-06/`.

The Impeccable detector exit code is non-zero on findings — this is
expected for the prototype as a whole but is **zero** on Concept 04b's own
files when run with `--no-advisory`.

## Known gaps before production

The table below was written before the fixes landed. Every row has since
been resolved or found not to apply to 04b; it is kept as a record.

| ID | Sev | Issue | Status |
|---|---|---|---|
| P0 | Touch targets < 44×44 in coarse-pointer view | Resolved — the `@media (pointer: coarse)` block sets 44px minimums on `.ctl`, `.tabs a`, `.sheet-close`, `.chip`, `.btn`, `.opt`, `.seg button`. `.tray-chip button` stays 32×32 by design. |
| P1 | RAF loop on `opacity: 0` canvas | Not applicable to 04b — the concept has no `requestAnimationFrame` loop and no `Field` canvas. |
| P2 | Body font-size in px (not rem) | Resolved — the 04b block sets `body { font-size: 1rem }`, overriding the shared layer's `16.5px`. |
| P2 | Brand-mark palette drift (coral in 04b) | Resolved — the 04b `:root` block overrides `--hue-a: 190` / `--hue-b: 200`. |
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
