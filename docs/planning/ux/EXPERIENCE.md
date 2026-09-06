---
name: RogiKotha Prototype Experience Contract
status: final
selected: Concept 04b — Quiet Clinic (minimal pass)
selected-via: BMad UX Update run 2026-09-06 (FD-027)
selected-by: founder decision FD-027
supersedes: FD-026 (Concept 04 — Quiet Clinic, warm variant)
updated: 2026-09-06
design: ./DESIGN.md
sources:
  - ../01-requirement-baseline.md
  - ../06-requirement-traceability-matrix.md
  - ../08-product-backlog.md
  - ../09-frontend-prototype-plan.md
---

> Selected direction: **Concept 04b — Quiet Clinic (minimal pass)**. Founder decision FD-027, 2026-09-06 (supersedes FD-026 / Concept 04 warm variant).
> Component patterns in this file are realised by the 04b direction; visual deltas in [DESIGN.md](./DESIGN.md).

# Foundation

Responsive web/PWA foundation using source-owned shadcn-style components and Radix primitives, with the visual deltas in [DESIGN.md](DESIGN.md). Gate 4 is a public read-only synthetic demo: components call typed service interfaces, never fixture files. A persistent demo control switches concept, interface language, simulated role and state, and resets deterministic data.

# Inspiration & Anti-patterns

Borrow the calm hierarchy of public health information, the readability of long-form editorial products, the transparent provenance of evidence-oriented services, and the recovery clarity of mature government forms. Reject star marketplaces, feed-first engagement loops, diagnostic dashboards, unexplained verification badges, dense hospital software, consent dark patterns and celebratory motion around health outcomes.

# Information Architecture

| Area | Surfaces | Primary landing |
|---|---|---|
| Understand | Home, onboarding, Terms/Privacy links, emergency warning | `/design-lab/{concept}` |
| Discover | Search results, no results, doctor, facility/branch, condition/tag | `/search`, `/doctors/{slug}` |
| Read | Review detail, treatment timeline, evidence viewer, comments/reactions | `/reviews/{id}` |
| Contribute | Quick/Detailed wizard, provider submission, profile claim, sign-in/register | `/reviews/new` |
| Personal | User profile, dashboard, drafts/bookmarks/submissions, notifications | `/dashboard` |
| Safety | Report flow, advice warning, hidden/deleted/tombstone states | contextual routes/dialogs |
| Operate | Admin overview, moderation queue, evidence failures, config/retention examples | `/admin` |
| Compare | concept index and the same representative workflows A/B/C | `/design-lab` |

Every primary surface is reachable in at most three intentional navigation choices from a concept home. Public reading never requires sign-in. Contribution actions explain simulated sign-in in demo mode without accepting credentials.

# Voice and Tone

Use plain, neutral sentences: “This is one person’s reported experience,” “Documents attached,” and “Registration not verified.” Avoid verdicts such as “best,” “trusted doctor,” “proof,” or “successful treatment.” Warnings state the action: “Only suggest medical steps if you are qualified and sure; otherwise share your experience without advising others.” Emergency copy directs people to configured local help without implying live clinical monitoring.

Bengali and English copy must be reviewed as independent natural-language interfaces, not literal word-for-word substitutions. The lawful-disclosure limitation appears only in Terms/Privacy, per founder decision.

# Component Patterns

| Component | Behavioral contract |
|---|---|
| AppHeader | Exposes home, search, contribute, language and role-aware account entry; mobile navigation returns focus to trigger on close |
| PrimaryAction | Has an explicit verb, pending state, idempotent result and nearby non-destructive escape |
| SearchBox | Keeps typed input, announces suggestion count, treats location separately and never auto-substitutes ambiguous Banglish |
| ProvenanceBadge | Opens an optional plain-language explanation but its core status remains visible text |
| ExperienceCard | Entire card is not one giant link; title is the primary link and actions have distinct names |
| TreatmentTimeline | Uses ordered headings and group labels; collapse preserves focus and current-status summary |
| EvidenceTile | Shows processed/private/failed/public status, group and page count; viewer opens at a stable return point |
| StatusMessage | Contains title, concise cause when safe, and one recovery/next action; announces only meaningful changes |
| WarningPanel | Is persistent when policy requires, non-modal, readable without accepting, and has the relevant report/help action |
| ModalDialog | Traps focus, closes with Escape when safe, restores focus and never contains a multi-step wizard |
| DistributionCapsules | Outline capsules (no fill) carry a small status dot at top-right (`::before`); on hover the dot grows into a 2 px left rule over ~350 ms tinted per outcome, and the capsule border transitions to the harder hairline; the dot never moves, it only scales — focus state mirrors hover so keyboard users see the same affordance |

# State Patterns

Every data surface supports cold loading, empty, error, stale/retry, permission-denied when applicable, long content, mixed script and limited data. Content states additionally support draft, processing, public, temporarily hidden, author-deleted tombstone, moderator-removed, restored and held-private where applicable. Loading skeletons preserve approximate layout and are hidden from assistive technology. Errors preserve user input and do not disclose account or moderation secrets.

The demo-state switch can force loading/error/empty/limited/hidden/deleted without changing fixture files. Reset always returns the documented baseline.

# Interaction Primitives

- Navigation and filters use ordinary URLs so back/forward and deep links work.
- Wizards save after meaningful field changes, expose saved/saving/error status and never move focus automatically on validation failure.
- The public preview is the publication contract: identity, public month/year, narrative, tags and processed documents match what will be shown.
- Report and moderation actions require reason selection; dangerous-looking text is never automatically classified in Phase 1.
- Viewer zoom/pan stays inside the viewer boundary; keyboard controls and processed-PDF download provide alternatives.

## Motion (CSS-only, 04b default)

Motion is CSS-only in Concept 04b — no JS, no GSAP, no Web Animations API — and is limited to a fixed set of five primitives: (1) hero rise, (2) first-screen stagger, (3) capsule hover with left-rule grow, (4) tab underline, (5) button press. All use the same easing token, `cubic-bezier(.2,.9,.25,1)`. Every animation is one-shot or in direct response to a user action; there is no decorative looping. All motion is killed by `body[data-motion="off"]` (collapses every transition to 1 ms and disables `animation`) and by `@media (prefers-reduced-motion: reduce)` via the universal-selector rule at the top of the stylesheet; under either state, every interaction becomes an immediate equivalent. No motion is added to Concept 03 or Concept 04 — only 04b carries this default set. Visual deltas for the five primitives live in [DESIGN.md](./DESIGN.md) (Motion subsection); styles.css lines 1238–1366 are the source of truth.

# Responsive & Platform

At 360/390 px, navigation is a bottom or compact sheet pattern chosen per concept, filters use a labelled sheet, wizards are one-column and timelines never alternate sides. At 768 px, optional split panes may appear only when reading order remains obvious. At 1280/1440 px, supporting rails may become sticky without trapping keyboard users or hiding content under headers.

Validate 360×800, 390×844, 768×1024, 1280×800 and 1440×900; current and previous major Chrome, Edge, Firefox and Safari; modern Android/iOS browsers. A real Safari/iOS smoke test remains manual evidence.

# Accessibility Floor

- Semantic landmarks, one descriptive `h1`, ordered headings, correct `lang` on interface and mixed-language passages where known.
- Keyboard access and visible `{colors.focus}` ring for every action; touch targets at least 44×44 CSS pixels.
- WCAG 2.2 AA contrast, 200% zoom, 320 CSS-pixel reflow, text spacing tolerance and no page-level horizontal overflow.
- Form labels, instructions before input, error summary plus field association, status announcements and no timeout without extension.
- Charts/distributions include text values and denominators; timelines/provenance/sentiment never depend on color or position alone.
- Automated axe checks plus manual keyboard, screen-reader, reduced-motion and bilingual overflow review. Automation is not a conformance claim.

# Product-specific trust rules

Public content always distinguishes user report, provider/facility directory fact, provenance, claim state and administrative action. Evidence presence never signals medical correctness. Named, pseudonymous and anonymous presentation have explicit previews. Anonymous public surfaces never link to the normal profile, other anonymous reviews, reactions or mentions.

# Key Flows

## Journey 1 — Rina finds a relevant experience

1. Rina opens the Bengali interface on a 390 px phone and reads the one-sentence product boundary.
2. She searches a Banglish spelling and keeps her original query while suggestions appear.
3. She filters by location and condition, then opens a doctor profile labelled `Registration not verified`.
4. **Climax:** she opens a condition-specific review and understands the narrative, reported outcome, denominator and provenance without seeing a quality score.
5. She opens processed evidence, returns to the exact timeline position, and reads the not-medically-verified copy.
6. Failure path: no results offers provider submission and a cleared-filter alternative without implying the provider does not exist.

## Journey 2 — Arif shares a witnessed Quick Review

1. Arif enters the simulated contributor role; the demo explains that production requires confirmed email and age/terms confirmation.
2. He selects Quick Review, provider, relationship and `Not sure` for the condition, then writes only what he witnessed.
3. He chooses an anonymous thread identity and sees that it will not link to his public profile.
4. **Climax:** the preview shows exactly what becomes public and the witnessed-experience/privacy attestation.
5. Demo publication returns a deterministic simulated success and can be reset; it never stores the entry.
6. Failure path: interrupted/validation states retain entered synthetic content and focus the error summary.

## Journey 3 — Nusrat builds a detailed follow-up timeline

1. Nusrat starts a Detailed Review and moves through optional context, treatment, medicine, test and cost sections.
2. She adds later/alternative care separately and sees public month/year while exact date remains private.
3. She attaches a synthetic processed PDF to a follow-up group and enters privacy preview/redaction simulation.
4. **Climax:** she confirms the exact processed public copy has unnecessary personal data removed; reviewed and later care remain distinct.
5. The published simulation summarizes the latest reported status above dated history.
6. Failure path: a processing failure keeps the narrative publishable and offers replace/remove without exposing an original.

## Journey 4 — Farhana reports unsafe-looking advice

1. Farhana reads a comment and sees the persistent advice boundary.
2. She opens Report, selects unsafe/misleading advice and adds private context.
3. **Climax:** confirmation explains that staff will review it without claiming automated danger detection or revealing her identity.
4. A forced threshold state demonstrates temporary hiding after five distinct confirmed accounts and logged restoration.
5. Failure path: duplicate submission is idempotent and factual disagreement does not show as automatic danger handling.

## Journey 5 — Saad reviews an admin decision

1. Saad simulates Moderator and opens a queue item with only permitted private context.
2. He sees reason, policy version, prior state and available bounded actions; rewrite controls do not exist.
3. **Climax:** he restores temporarily hidden content with a written reason and sees the audit result.
4. Switching to Admin shows anonymous-author reveal unavailable by default; Super Admin can simulate enabling it separately.
5. Failure path: permission denial contains no hidden identity and returns focus to the queue.

Spines win if a wireframe or later mock conflicts with these contracts.
