# RogiKotha — two UI/UX directions

> Exploration only. Nothing in this folder is production UI.

Two directions on one product. Both render the **same fictional records** and obey the **same
product rules**, so the only thing that differs between them is the design. The numbering is kept
from the wider set they were chosen out of; the others are in `.archive/`.

Open [`index.html`](index.html) for the gallery.

```powershell
python -m http.server 4173
# then http://localhost:4173/ui-design-prototype/
```

No build step, no dependencies, nothing loaded from the network.

## The directions

| | Direction | Material | Distribution shown as |
| --- | --- | --- | --- |
| 03 | **Luminous Editorial** | Warm earth tones: bone and clay, espresso in dark, terracotta anchor | A sentence of counts, with a spectrum rule as a second reading |
| 04 | **Quiet Clinic** | Oat and muted teal, sage and taupe, coral held back for emergencies; opaque, soft, no glass | A row of separate capsules, each with its own count and label |

**03** pairs an editorial structure — typographic hierarchy, a reading measure for long patient
stories, provenance in the margin — with a warm, deliberately simple skin: roughly 60% warm neutral,
25% terracotta, 15% split between a sage counterpoint and an espresso grounding tone. One accent
instead of a gradient pair, two background washes instead of three. It is the only direction
carrying the **moderation console**.

**04** is the calm consulting room: a neutral base, one calming primary, and a single accent held
back for emergencies; opaque surfaces, large radii, circular avatars and no glass anywhere.

## Screens

Eight public screens in both directions, plus three staff screens in 03.

| Screen | What is in it |
| --- | --- |
| **Discover** | Search, browse-by-condition with counts, emergency guidance, a way into facilities |
| **Results** | Doctors / Facilities tabs, filters, neutral sort, compare tray (pin up to three) |
| **Doctor** | Per-field provenance, condition switcher, distributions, condition breakdown, account filters |
| **Account** | *The body* — 13 sections, see below |
| **Condition** | One condition across every doctor: spread, medicines and treatments mentioned with frequencies |
| **Facility** | Nine service criteria with their own distributions, structurally separate from doctors |
| **Write** | Add-a-doctor panel, live safety checks, evidence pipeline, draft autosave |
| **Mine** | Published, encrypted drafts with expiry, private bookmarks, notifications, appeal path |
| **Moderation** *(03)* | Report lanes, evidence quarantine, providers and claims |

### The account screen

This is where the product actually lives, and it is what the earlier four-screen version was
missing. Thirteen sections, in the order a reader needs them:

1. Header — condition, sentiment, outcome, episode month/year
2. Author strip — relationship to patient, identity mode, their other accounts
3. The story — four chapters in detailed mode
4. Reviewer's labels — framed as the author's claim, never a platform finding
5. Timeline spine
6. Evidence — three groups, processed copy only, with the warnings
7. Follow-up chain — dated, newest marked **current status**
8. Later or alternative care elsewhere — never creates a review for that provider
9. Discussion — flat replies, @mentions, external-link warning, a comment carrying the
   dangerous-instruction warning, and a claimed doctor taking part as an ordinary member
10. Reactions, with the engagement-only note
11. Report
12. **Related accounts** — same condition across other doctors, and other accounts about this doctor
13. Disclaimer

## Rules every direction obeys

These come from the PRD, not from taste. A direction that breaks one is wrong regardless of how it
looks.

- No number ever stands for quality. Positive / Mixed / Negative and Helped / No improvement /
  Worsened / Uncertain distributions, always with **exact counts and denominators**.
- **Limited data** when the sample is sparse. The threshold here is a demo value — the real one is a
  deferred product decision.
- Missing values read **Not provided** / **No documents**, never `0`.
- Ordering is neutral: relevance, most accounts, most recent. There is deliberately no "highest
  rated" sort, and each direction explains why when asked.
- **Registration not verified** on every doctor — Phase 1 has no BMDC verification.
- Evidence reads **Documents attached — not medically validated**. Never "verified".
- User claims render as **Reviewer's label**.
- **Facility feedback never touches a doctor's summaries** — enforced in the data layer, not just
  in the copy.
- Reporter identity is never shown to the reported person; in the console it appears as
  *restricted* rather than blank, so it is obvious something exists that the account cannot open.
- Original evidence is a separate, audited permission. Scanning that cannot run **fails closed**.
- Persistent disclaimer; non-blocking emergency guidance (999, 16263, crisis line, last verified).

## Layout

```text
index.html                     gallery — two cards
gallery.css
shared/rogikotha-data.js       the fictional bilingual dataset, shared by both
concepts/
  concept-03-luminous-editorial/    index.html + styles.css + app.js, + moderation console
  concept-04-quiet-clinic/
.archive/                      five earlier directions, dropped from the gallery
```

Both concepts share a component vocabulary and the dataset; each owns its own material. That is
deliberate — it isolates the comparison to the design.

## Bilingual, themed, motion-safe

- **অ / A** toggles Bangla and English live, numerals included. Bengali has no capitals and needs far
  more leading, so each direction rebuilds its type scale for the script rather than swapping strings
  into a Latin one — and the dropped cap, a Latin device, is dropped for Bengali. Worth checking on
  every screen.
- **◐** toggles light and dark. Both ship both modes.
- **◌** turns motion off; `prefers-reduced-motion` is honoured too. With motion off every state is
  still reachable and no information is lost — only decoration stops.

## Browser support

Signature effects sit behind `@supports` guards with a static, fully usable default, because roughly
16% of traffic lacks scroll-driven animations (baseline in Chrome/Edge 115+, Firefox 132+,
Safari 18+). Where a 2D canvas context is unavailable the particle field is dropped rather than
breaking the page. Bengali uses a system font stack — no webfont, no network request.

## Direction 04, and where it came from

04 was built from researched healthcare-identity conventions, not from a specific reference: a
neutral base, one calming primary, and a single accent reserved for action; rounded shapes and soft
transitions; generous whitespace with line illustration; serif headings against a sans interface.
The Dribbble shot that prompted it could not be retrieved — Dribbble serves it as a JavaScript app
behind bot protection and it is not mirrored anywhere indexed — so 04 is aimed at the category, and
a correction pass against the actual reference is expected.

One honest limit: there are no webfonts here by rule, and a genuinely rounded typeface is only
reachable through the `ui-rounded` generic on Apple platforms. So roundness is carried by shape —
radii, pills, circles — with `ui-rounded` as progressive enhancement.

## Colour is verified, not asserted

Each palette is checked against WCAG AA **from the tokens as they ship in the file**, merging the
shared layer and the identity override the way the cascade does. Body text clears 4.5:1 and UI
boundaries clear 3:1, in both modes and both directions.

## Everything here is fictional

No real doctor, facility, patient, BMDC number or document is represented. Provider marks are
deterministic generated geometry derived from a name hash — never a photograph or likeness of a
person.
