# Concept A wireframes — Quiet Clinic (Concept 04b, FD-027)

> Selected direction. Concept A is now **Concept 04b — Quiet Clinic (minimal pass)** per **FD-027 (2026-09-06)**, which supersedes FD-026.
> Visual deltas in [../DESIGN.md](../DESIGN.md); behavioural contracts in [../EXPERIENCE.md](../EXPERIENCE.md).
> Source prototype: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/`.
> Older Concept A wording (Concept 04 — Quiet Clinic under FD-026) is superseded; it is preserved here only as a historical reference.

## Desktop: discover to evidence

```text
┌ Masthead (opaque, sticky, paper-coloured band) — brand · tabs · অ/A · ◐ · ◌ ┐
│                                                                              │
│  Display headline (system rounded sans — no serif/sans contrast)             │
│  Calm, generous spacing; no line illustration, no texture, no veil           │
│  Search shell: round pill, opaque, paper-coloured, query · location · submit │
│  Browse-by-condition: row of separate outline-only capsules with status dot │
│  Emergency lines: coral pills, never teal                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Results: filter rail · doctor list · neutral sort · compare tray ────────────┐
│ filter: profile · condition · location · claim · provenance                  │
│ Doctor entry: circular avatar · name · Registration not verified             │
│   · narrative excerpt · 3 sentiment capsules (outline-only, status dot)      │
│ Compare tray (opaque, bottom): pin up to three providers                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Doctor profile: hero (circular avatar) · side rail (sticky) ─────────────────┐
│ Per-field provenance beside the fact it qualifies                            │
│ Distribution row: separate capsules — outline-only with status dot, no fill │
│ Condition switcher (pill row)                                                │
│ Account filters                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Account detail: story column (66ch) · margin rail (sticky) ──────────────────┐
│ Header: condition · sentiment · outcome · month/year                         │
│ Author strip: relationship · identity mode · other accounts                  │
│ The story: four chapters (system rounded sans; no serif body, no dropped cap) │
│ Provenance in the margin, not interrupting the narrative                     │
│ Reviewer's labels — labelled as the author's claim                           │
│ Timeline spine: reviewed → later/alternative → follow-up                     │
│ Evidence: three groups, processed copy only, "not medically validated"       │
│ Related accounts: same condition across other doctors                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Condition: one condition across every doctor ────────────────────────────────┐
│ Spread · medicines mentioned · treatments mentioned                         │
│ Each frequency rendered as separate outline-only capsules with status dot,   │
│ never a single bar, never a tinted fill                                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Facility: nine service criteria ─────────────────────────────────────────────┐
│ Each criterion: its own distribution (separate outline-only capsules)        │
│ Structured separately from doctor feedback, by rule and by data layer       │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Compose: mode picker · form (left) · live preview + safety (right) ──────────┐
│ Live safety checks (typed, not just on submit)                               │
│ Evidence pipeline (quarantine → process → redact → preview → publish)        │
│ Draft autosave (encrypted server-side, Phase 1)                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌ Mine: tabs · published · drafts (encrypted, with expiry) · bookmarks ────────┐
│ Notifications · appeal path                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile: Quick Review

```text
┌ Masthead (opaque, sticky, paper) · অ/A · ◐ · ◌ ┐
│                                                  │
│  One calm question per section                   │
│  "Who provided the care?"                        │
│  [round pill select, opaque]                     │
│  Relationship + witnessed-experience attestation │
│  Short experience                                │
│  Condition / Not sure                            │
│  Identity: name · pseudonym · anonymous alias     │
│                                                  │
│  Live safety checks (typed, immediate)           │
│  [Read my public preview]                        │
│  Sticky text action, no decorative motion        │
└──────────────────────────────────────────────────┘

On mobile the same CSS-only motion applies: the first-screen
stagger runs in the same order as desktop — it does not intensify,
it does not slow down. Reduced-motion users see no stagger at all.
```

## Distribution as capsules (Quiet Clinic signature)

```text
Helped                  No improvement          Worsened
┌────────────┐          ┌────────────┐          ┌────────────┐
│ ·       28 │          │ ·       11 │          │ ·        4 │
│  Helped    │          │  No        │          │  Worsened  │
│            │          │ improvement│          │            │
└────────────┘          └────────────┘          └────────────┘
  outline only             outline only            outline only
  status dot: teal-gray    status dot: neutral     status dot: coral

of 43 accounts

Not a stacked bar. Each capsule is a quiet outline — no tinted
fill — with a small status dot at top-right tinted by outcome.
The capsules are separated by real space, so the row cannot be
read as a single quality score. On hover, the status dot grows
into a 2px left rule in the same tint.
```

## Avatar, masthead, primary action

- Avatar: **circular** (50% border-radius), used everywhere a person or provider appears. (FD-026 preserved.)
- Masthead: **opaque** (no glass blur, no translucent panel). Sticky. Solid **paper-coloured** band (`hsl(40 14% 98%)`) — neutral, not warm. Hairline rule beneath at `hsl(200 14% 14% / 0.07)`.
- Primary action: **soft pill in teal-gray** (`hsl(190 22% 32%)`), no shadow, no gradient, 1px down on `:active`. Destructive actions never inherit teal-gray.
- Coral: **emergency and danger only**. Never ordinary. (FD-026 preserved.)
- Radii: **10 / 16 / 22 px** (smaller than FD-026's 12 / 20 / 28).
- Type: **system rounded sans for everything** — UI and headings. No serif/sans contrast. This is the deliberate departure from FD-026.

## Motion (CSS-only)

All motion is CSS, scoped to user action, and killed by `body[data-motion="off"]` and `prefers-reduced-motion: reduce`.

1. **Hero rise** — the display headline and search shell rise a few pixels and fade in once on first paint.
2. **First-screen stagger** — capsules and form rows above the fold stagger in (CSS `animation-delay` on `nth-child`). Same order on desktop and mobile.
3. **Capsule hover** — on `:hover` and `:focus-visible`, the small status dot at top-right of a distribution capsule grows into a 2px left rule tinted by outcome (teal-gray for Helped, neutral for No improvement, coral for Worsened).
4. **Tab underline** — the masthead tab underline fills on `aria-current="page"`; no decorative tracking motion.
5. **Button press** — primary and secondary buttons translate 1px down on `:active`; no bounce, no glow.

Easing token: `cubic-bezier(.2, .9, .25, 1)`. Duration ≤ 320ms. No JavaScript animation.

## Signature

Signature: opaque paper surfaces, hairline rules, 10/16/22 px radii, circular avatars, separate-capsule distributions rendered as outline-only with a small status dot, teal-gray accent, coral held back for emergencies, system rounded sans for UI and headings (no serif/sans contrast), CSS-only motion in response to user action.
