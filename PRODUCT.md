# RogiKotha — Product Truth

> Durable product context for anyone, person or agent, who changes this product.
> Source-of-truth: `docs/RogiKotha_PRD_v1.0.docx`, `docs/RogiKotha_BRD_v1.0.docx`,
> `docs/status/decision-log.md` (founder decisions), and `docs/architecture/`.

## What it is

RogiKotha (রোগীকথা — "the patient's account") is a public, bilingual (Bengali ⇄ English)
health-platform that publishes structured, evidence-attached patient accounts of
doctors and facilities, with provenance, distributions, and a moderation path.
Nothing in the product is medical advice. The product is the published account.

## Who it's for

- **Primary:** A Bangladeshi reader weighing whether to consult a doctor. Reads on
  mobile, often on a low-end Android, on Bangla. Wants signal, not noise.
- **Secondary:** A patient-author writing or finishing their own account.
- **Tertiary:** A moderator or operator working in the admin console.

The reader is not "a user of a SaaS dashboard." They are a person making a
real-world healthcare decision in their own language.

## Voice

- **Calm.** Not friendly-chatbot, not corporate. A measured consulting-room voice.
- **Specific.** Every number carries a denominator. Every claim carries provenance.
- **Bilingual as a first-class concern.** Bengali is not a localization pass over
  English. Each direction rebuilds its type scale for the script and drops the
  cap, a Latin device that does not exist in Bangla.
- **Honest about limits.** "Not provided" / "No documents" never "0". "Limited
  data" when the sample is sparse. No "highest rated" sort — by founder decision.
- **No medical advice.** Persistent disclaimer. Emergency guidance is non-blocking
  and visible.

## What it is not

- Not a doctor-rating app with stars. Stars are anti-pattern: a single quality score
  on a small sample is a category error and is forbidden in the data layer.
- Not a clinical decision-support tool. It is patient accounts, surfaced honestly.
- Not a global SaaS. The visual material is deliberately not a generic "tech
  startup dashboard" — the audience and the cultural context don't fit that world.

## The anti-references

The product must not look like, sound like, or behave like:

- Generic "AI-generated" SaaS landing pages — purple-to-blue radial hero gradients,
  glow shadows on dark, identical three-up card grids, gradient text.
- Doctor-booking portals with star ratings and a "Book Now" CTA above patient voice.
- Health-info sites with stock photography of smiling white-coated actors and
  emoji-as-icon sets.
- Crypto/Web3 "decentralised health" pitches. No tokenization, no buzzwords
  (*transform, empower, unleash, world-class, supercharge, seamless*).
- Platforms that hide counts, denominators, or sample size behind authentication.

## Design references

Two design artefacts are the reference:

- **04b Quiet Clinic (minimal pass)** *(selected via FD-027, 2026-09-06)* —
  the patient UI. Paper base, teal-gray accent, hairline rules, no decorative
  linework, no atmospheric veil, no panel shadow. Calm carried by shape (radii,
  pills, circles) rather than by a contrasting typeface.
- **The staff console** *(FD-030, 2026-09-08)* — its own surface system,
  **Chart Tray**, no longer sharing 04b's tokens. Four planes — sunken, page,
  raised, overlay — where elevation encodes agency: below the page means
  read-only, raised means workable, one solid accent fill is the primary
  action. Chosen from three shell studies (A Chart Tray, B Ink Ledger,
  C Signal Ward).

Since FD-091 (2026-10-27) the shipped patient UI follows its own redesign, "Warm Paper, Soft
Depth", with its own design and motion tokens in `apps/web/src/styles/`. The 04b prototype stays
the source of truth for content, data and behaviour.

The directions 04b was chosen against were archived. They are no longer on `main`; they are on
branch `archive/full-project-2026-11-09`:

- **03 Luminous Editorial** — warm earth tones, terracotta anchor, editorial
  reading measure, provenance in the margin. It carried a moderation console of
  its own; the console that shipped is the standalone one above. Archived per
  FD-029, 2026-09-08.
- **04 Quiet Clinic (warm variant)** — oat + muted teal + sage + taupe, coral
  held for emergencies only, opaque surfaces, no glass anywhere. Archived per
  FD-029, 2026-09-08.
- **01**, **02**, **04c**, **04d** and **05** were archived earlier, as were the
  three admin shell studies.

Every patient direction rebuilds the type scale for Bengali and drops the cap.
All of them, and the console, honour `prefers-reduced-motion` and
`body[data-motion="off"]` with every state still reachable.

## Hard rules (from PRD/BRD + founder decisions)

- No number ever stands for quality. Distributions always carry exact counts
  and denominators. (FD binding.)
- Missing values read **Not provided** / **No documents**, never `0`.
- "Limited data" appears when the sample is sparse. Threshold is a deferred
  product decision; demo uses a placeholder value.
- Registration is not verified in Phase 1. Every doctor carries
  **Registration not verified** until BMDC verification exists.
- Evidence reads **Documents attached — not medically validated**. Never
  "verified" or "approved."
- User claims render as **Reviewer's label** — framed as the author's claim,
  never a platform finding.
- Facility feedback never touches a doctor's summaries — enforced in the data
  layer, not just in the copy.
- Reporter identity is never shown to the reported person; in the console it
  appears as *restricted*, never blank.
- Original evidence is a separate, audited permission. Scanning that cannot run
  **fails closed**.
- Persistent disclaimer; non-blocking emergency guidance (999, 16263, crisis
  line, last verified).
- Ordering is neutral: relevance, most accounts, most recent. There is
  deliberately no "highest rated" sort.
- Bengali and English have equal product status. Numerals follow language.

## Technical context

- Release 1 is built: a Next.js web app and a pg-boss worker on PostgreSQL 18,
  run locally on synthetic data with `pnpm demo`. See `README.md` for the
  architecture and `DEMO.md` for the demo. The staff console, moderation,
  search and the other FD-105 items are release 2.
- The static prototype at `ui-design-prototype/index.html` stays as the design
  reference: the 04b patient prototype and the staff console. It is
  dependency-free (no build step, no webfonts, no network); serve the folder
  with any static file server, for example `python -m http.server 4173`.
- Architecture decisions are in `docs/architecture/decisions/`; where an older
  document disagrees with the code on layout or stack, the code wins.

## How to use this file

When an AI coding agent is asked to change something in this product:

1. Honor the brief. Pin the design direction — 04b in the patient UI, Chart
   Tray in the staff console — and do not redirect toward the agent's taste.
2. Refinement preserves incumbent identity, behavior, copy, and everything
   outside scope. Ask before replacing factual copy or adding claims.
3. Bengali and English must both still work after the change. Test the Bangla
   toggle (`অ`) — the line-height, the cap-drop, the numerals, the
   font fallback chain (`Noto Sans Bengali` → `Nirmala UI` → `Shonar Bangla`
   → `Kalpurush` → `SolaimanLipi`).
4. No number may stand for quality. No emoji as icon. No `0` for missing.
5. Decorations must earn their place — every gradient, shadow, and accent
   must do work that the surface couldn't do without it.

## See also

- `DESIGN.md` — the visual system
- `docs/RogiKotha_PRD_v1.0.docx` — full product requirements
- `docs/RogiKotha_BRD_v1.0.docx` — business requirements
- `docs/status/decision-log.md` — founder decisions, FD-001 through FD-123
- `docs/design/design-comparison.md` — Gate 3 scorecard + FD-027 selection
- `ui-design-prototype/README.md` — the static prototype itself
