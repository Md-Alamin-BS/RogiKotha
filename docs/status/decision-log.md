# RogiKotha decision log

**As of:** 2026-09-06  
**Rule:** A recommendation is not a confirmed product decision. Founder confirmation, source authority, and mandatory specialist sign-offs are recorded separately.

## Confirmed source-authority decisions

| ID | Decision | Basis | Status |
|---|---|---|---|
| D-001 | The PRD controls when it explicitly supersedes the BRD. | PRD authority statement and dated source inventory | Confirmed by source |
| D-002 | Phase 1 uses narrative reviews with optional Positive/Mixed/Negative sentiment and optional outcome; no numeric/star/Bayesian rating or quality score. | PRD explicit supersession | Confirmed by source |
| D-003 | Phase 1 does not claim BM&DC verification; profiles show `Registration not verified` unless a later authorised workflow is approved. | PRD explicit supersession | Confirmed by source |
| D-004 | Providers have no privileged response channel; replies are ordinary moderated comments. | PRD scope | Confirmed by source |
| D-005 | Public Beta starts without real seeded reviews; any synthetic prototype data is visibly separate and never shipped as real content. | PRD launch constraint | Confirmed by source |
| D-006 | Private evidence originals are never public; only approved processed derivatives can be published. | PRD evidence policy | Confirmed by source |
| D-007 | The product supports Bengali and English equally, targets WCAG 2.2 AA, and progressively enhances to a PWA without sensitive offline caching. | PRD requirement as clarified by founder FD-024 | Confirmed with founder override |

## Founder decisions — round 1

| ID | Decision | Scope/status |
|---|---|---|
| FD-001 | Phase 1 launches as an unrestricted public product, not a private or controlled Beta. | Confirmed; associated legal/clinical/publication risks remain recorded |
| FD-002 | Phase 1 uses a narrow evidence allowlist, with later format expansion designed in. | Confirmed; JPEG/PNG/PDF is the planning baseline |
| FD-003 | Do not display public-copy persistence warning text. | Confirmed |
| FD-004 | Original-retention default starts at 90 days and audit/content-version default starts at 180 days; both are runtime-changeable. | Confirmed in principle; role and retroactivity need clarification |
| FD-005 | Administrators may change or extend retention when the change is logged. | Confirmed in principle; audit schema and permissions required |
| FD-006 | Phase 1 authentication is simple email/password. MFA, passkeys, and advanced controls are later-phase work. | Confirmed; invisible minimum security behavior needs clarification |
| FD-007 | Target USD 0 for the demo and USD 100/month afterward; prefer free/open-source software, with necessary spending allowed. | Confirmed in principle; demo submission/data scope needs clarification |
| FD-008 | Explain limits on anonymity against lawful disclosure only in Terms and Conditions. | Confirmed |
| FD-009 | Do not implement automated dangerous-advice/threat classification in Phase 1; show a short warning discouraging uncertain or unqualified advice. | Confirmed in principle; reporting/manual handling needs clarification |
| FD-010 | Keep Phase 1 simple, permissive, and low-friction; defer complex restrictions until usage and trust justify them. | Confirmed product principle |

## Founder decisions — round 2

| ID | Decision | Scope/status |
|---|---|---|
| FD-011 | Launch with unrestricted public access after basic legal and healthcare review; do not require a private Beta. | Confirmed by accepting the recommended option |
| FD-012 | The USD 0 demo is public but synthetic/read-only; real accounts, reviews, and evidence begin on the production topology. | Confirmed |
| FD-013 | Phase 1 email/password includes confirmed email, password reset, secure password hashing/cookies, basic rate limits, and challenge only after suspicious repeated attempts. | Confirmed; still no MFA/passkeys in Phase 1 |
| FD-014 | Allow family members/caregivers to describe what they personally witnessed, with a simple experience/privacy attestation and no separate consent-verification workflow. | Confirmed |
| FD-015 | Anonymous publication uses a stable alias scoped to one review thread and does not publicly link to the normal profile, reactions, mentions, or other anonymous reviews. | Confirmed; staff identity-access disclosure remains unresolved |
| FD-016 | The Super Admin can enable or disable anonymous-author identity access separately for Admin and Moderator roles; access is normally disabled. | Confirmed; every reveal must still be auditable |
| FD-017 | Show a short medical-advice warning, provide an unsafe/misleading-advice report reason, perform no automatic classification, auto-hide after reports from five distinct confirmed accounts, and allow logged moderator restoration. | Confirmed |
| FD-018 | Runtime configuration may cover wording, taxonomies, optional fields, retention periods, report thresholds, and feature visibility; structural security/data boundaries remain deployment-controlled. | Confirmed |
| FD-019 | Analytics is off in the USD 0 demo; minimal self-hosted aggregate analytics may be added to production later. | Confirmed |
| FD-020 | Retention-default changes affect future records; changing existing records requires a separate logged bulk action with an affected-record preview. | Confirmed |
| FD-021 | Individual legal holds pause scheduled deletion for a specific record and log actor, reason, creation time, and expiry/release. | Confirmed |
| FD-022 | Authorised staff identity-access capability for anonymous content is disclosed only in the Privacy Policy/Terms, not through banners or review-page warnings. Super Admin controls normally-disabled Admin/Moderator access and every reveal is logged. | Confirmed |
| FD-023 | Before evidence publication, the author must review the processed public copy and confirm that unnecessary personal information has been removed. | Confirmed; no automated PII detection or extra approval workflow |
| FD-024 | Bengali and English have equal product and interface status; neither is secondary or merely supported by the other. | Confirmed founder override; applies to UX, architecture, backlog, tests, and content operations |

## Founder decisions — round 3

| ID | Decision | Scope/status |
|---|---|---|
| FD-025 | Gate 4 must present five materially different, complete design concepts for every public/user and admin page, each with deliberate light and dark modes. Build and validate the public/user interface first, then the admin panel. | Confirmed founder override; supersedes older Gate 4 references to three concepts without changing the shared read-only synthetic-demo boundary |
| FD-026 | Concept 04 — Quiet Clinic is the selected Gate 4 design direction. Frontend and backend implementation will be built from this direction. Other directions remain as comparison references only. | Confirmed founder override 2026-09-06 via BMad UX Update run; supersedes the prior UX memlog "blue teal and white" shared-direction note and the "no winner selected" decision; supersedes the Concept A "Calm Clinical Trust" wording in DESIGN.md; does not change FD-025's five-direction comparison scope |

### FD-026 — Quiet Clinic selection (rationale)

Quiet Clinic was selected because it (a) uses an opaque oat + muted-teal material with no glass blur, matching the calm-consulting-room posture the product rules require; (b) replaces stacked-bar distributions with a row of separate capsules that carry their own count and label, removing the risk of being read as a single quality score; (c) uses circular avatars and large radii to carry roundness through shape rather than through a typeface that we cannot ship; (d) reserves coral strictly for emergency and danger states so the accent never competes with ordinary actions; and (e) renders serif headings against a sans interface, matching established healthcare-identity conventions.

The five-direction comparison from FD-025 is preserved. Concepts 01–03 and 05 remain in `ui-design-prototype/.archive/` as historical comparison; Concept 03 (Luminous Editorial) remains in the live gallery alongside Concept 04 (Quiet Clinic) so the comparison remains runnable. The selection is the answer to FD-025's "founder choice" step, not a replacement of its scope.

| FD-027 | Concept 04b — Quiet Clinic (minimal pass) is the chosen implementation direction. Concept 04 (warm Quiet Clinic), Concept 04c (Editorial), and Concept 04d (Modern SaaS) were alternative directions built for side-by-side comparison during the prototype walkthrough. FD-026 is superseded; Concept A's identity contract is rewritten to mean "the minimal-pass variant of Quiet Clinic" rather than the original warm variant. FD-028 (2026-09-06) later archived 04c and 04d; only Concept 03 and Concept 04 remain in the live gallery alongside Concept 04b. | Confirmed founder override 2026-09-06 via BMad UX Update run; supersedes FD-026; preserves FD-025's five-direction comparison scope and the FD-024 bilingual peer status rule; does not change the Phase 1 product rules (no numeric scoring, no star ratings, BMDC-not-verified in Phase 1, evidence not medically validated, etc.) |

### FD-027 — Quiet Clinic (minimal pass) selection (rationale)

The minimal-pass variant of Quiet Clinic was selected after the runnable Gate 4 prototype was extended with two additional directions for explicit comparison: 04c (Editorial — Substack / Stripe Press / Scroll.in reference) and 04d (Modern SaaS — Linear / Stripe / Notion reference). All four variants were reviewed side by side. Concept 04 (the original warm Quiet Clinic) was retained for comparison but reads too "calm clinic" in the SaaS context of 2025–2026; Concept 04c (Editorial) was strong on stories but reduced the product affordances; Concept 04d (Modern SaaS) was visually precise but lost the clinic posture that the product rules require. The minimal-pass variant (04b) keeps the FD-026 identity — circular avatars, separate-capsule distributions, opaque surfaces, coral held back for emergencies — and applies the published 2025–2026 healthcare-UX research findings: paper background instead of warm oat, teal-gray instead of teal, thinner rules, no decorative linework, no atmospheric veil, no panel shadow, smaller radii (10 / 16 / 22 instead of 12 / 20 / 28), and an outline-only capsule row with a status dot rather than tinted fills. The result is the calm of FD-026 expressed without the warm "consulting-room" skin, which the founder confirmed as the chosen direction after the prototype walkthrough.

The five-direction comparison from FD-025 is preserved. Concepts 01, 02, 03, 04c, 04d, and 05 remain in `ui-design-prototype/.archive/`; Concepts 03 (Luminous Editorial) and 04 (warm Quiet Clinic) remain in the live gallery alongside Concept 04b so the warm-vs-minimal comparison stays runnable. The decision-log frontier moves forward, not sideways — Concept A's identity contract is now "the 04b minimal-pass variant of Quiet Clinic", and Concept A's archived Concept B / Concept C wireframes remain historical references only.

| FD-028 | Concept 04c (Editorial) and Concept 04d (Modern SaaS) are archived from the live gallery and moved into `ui-design-prototype/.archive/`. The live gallery now shows the three surviving directions — 03 Luminous Editorial, 04 warm Quiet Clinic, and 04b Quiet Clinic (minimal pass, the chosen implementation). 04c and 04d remain inspectable in the archive for future reference but are no longer part of the live side-by-side. | Confirmed founder override 2026-09-06 after the prototype walkthrough; FD-027's "comparison stays runnable" clause is narrowed to the warm-vs-minimal comparison of 04 and 04b; 03 stays as the editorial reference; does not change FD-027's chosen implementation direction or any Phase 1 product rule |

### FD-028 — archive 04c and 04d from the live gallery (rationale)

After the FD-027 walkthrough confirmed 04b as the chosen implementation, the live gallery still presented four directions (03, 04, 04c, 04d) alongside it. The 04c (Editorial — Substack / Stripe Press / Scroll.in reference) and 04d (Modern SaaS — Linear / Stripe / Notion reference) variants were built specifically as side-by-side comparators during the 04b selection. With that decision made, their continued presence in the live gallery added noise without adding signal — neither was a candidate for production, and the live page was reading as "five directions" when the actual choice had narrowed to "04 vs 04b" with 03 retained as the editorial reference. They are now archived alongside Concepts 01, 02, and 05. Their CSS, webfonts (Hind Siliguri, Source Serif 4, Inter, Inter Display, Baloo Da 2, Noto Serif Bengali), and capsule-row variants stay in the archive for any future revisit; the live `gallery.css` no longer carries their thumbnail rules; the live `index.html` no longer renders their cards. The "three directions" framing of the gallery is now accurate.

## Provisional technical recommendations

| ID | Recommendation | Why it leads | Confirmation needed |
|---|---|---|---|
| R-001 | Next.js modular monolith plus an isolated document worker | Lowest small-team coordination cost while preserving extraction seams | Founder architecture approval + boundary spike |
| R-002 | PostgreSQL 18 with FTS and `pg_trgm` first | Strong transactions/search baseline without another service | Search relevance and load spike |
| R-003 | Evaluate Better Auth rather than beginning a new Auth.js integration | Auth.js's official project recommends Better Auth for most new projects | Auth/recovery/security spike + founder security decisions |
| R-004 | Put blobs behind a storage port; conditionally evaluate Garage | Keeps provider choice reversible; Garage is active FOSS | S3 compatibility/failure/backup spike + licence review |
| R-005 | Begin the public upload allowlist with JPEG, PNG, and PDF | Reduces untrusted-parser surface | Founder evidence-scope decision + malicious-corpus spike |
| R-006 | Make legal, healthcare, security, restore, and accessibility review release gates | The product handles health-adjacent allegations, identities, and hostile files | Founder approval and named reviewers |
| R-007 | Keep safety/auth/audit invariants outside runtime feature configuration | Prevents one privileged toggle from defeating core protections | Founder configuration/safety decisions |
| R-008 | Use privacy-minimised Matomo only if its extra runtime is justified; prefer a small native consent UI | Avoids unnecessary operational and accessibility surface | Founder analytics decision + counsel review |

## Founder decision frontier status

All `CQ-01` through `CQ-12` questions in [the conflicts and assumptions register](../planning/02-conflicts-assumptions-questions.md) are resolved. The founder explicitly approved Gate 1 and authorized the final architecture, ADR, dependency, backlog, frontend, design-concept and worktree-safe planning artifacts on 2026-08-30.

## Specialist decisions reserved

- Bangladesh counsel decides legal interpretation, not the architecture or moderation implementation alone.
- A Bangladesh healthcare professional decides clinical-safety adequacy, not automated classification alone.
- Security review decides whether demonstrated controls satisfy the agreed threat model, not a library feature list.
- Accessibility conformance requires documented manual assessment in addition to automated scans.
