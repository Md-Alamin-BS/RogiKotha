# RogiKotha decision log

**As of:** 2026-10-23  
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

| FD-029 | Concept 03 (Luminous Editorial) and Concept 04 (warm Quiet Clinic) are archived from the live gallery and moved into `ui-design-prototype/.archive/`. The live gallery now shows what is live rather than a side-by-side: Concept 04b (the chosen patient direction) and the staff console. All six earlier patient directions — 01, 02, 03, 04, 04c, 04d — plus Concept 05 remain inspectable in the archive. | Confirmed founder override 2026-09-08 after the staff-console redesign; FD-028's "three directions" framing is retired and FD-027's "comparison stays runnable" clause is discharged — the comparison is now historical rather than live; does not change FD-027's chosen implementation direction or any Phase 1 product rule |

### FD-029 — archive 03 and 04 from the live gallery (rationale)

FD-028 narrowed the live gallery to 03, 04 and 04b on the grounds that the warm-vs-minimal comparison should stay runnable and that 03 should be retained as the editorial reference. Two things have since made that framing obsolete. First, 04b has been the sole implementation direction for two days of build work, so there is no open question for the comparison to answer — a reader arriving at the gallery was being shown three directions and left to infer which one the product actually is. Second, 03's specific justification was that it was the only direction carrying the moderation console; that stopped being true when the console became a standalone artefact at `ui-design-prototype/admin/` with its own surface system (FD-030), so 03's remaining claim on the live page was editorial reference alone, which the archive serves equally well.

The FD-025 five-direction comparison is preserved in full and remains runnable from `ui-design-prototype/.archive/` — nothing was deleted, and the moves were made with `git mv` so file history follows. What changed is the default: the gallery answers "what is this product" rather than "what were the options". `gallery.css` no longer carries the `.t03`/`.c03`/`.t04`/`.c04` thumbnail rules, `index.html` no longer renders their cards, and the STORY-PROT-002 coverage row is annotated with the consequence — the three concepts that story requires are still inspectable, but a first-time reader of the live gallery no longer sees three side-by-side directions, and whether that still satisfies the story needs a product call.

| FD-030 | The staff console at `ui-design-prototype/admin/` adopts its own surface system, **Chart Tray**, and no longer shares Concept 04b's tokens. Four planes — sunken, page, raised, overlay — encode agency: below the page means read-only, raised means workable, and one solid accent fill is the primary action. | Confirmed founder override 2026-09-08 after a three-way shell study; the patient direction (FD-027) is unaffected — this scopes only the staff portal, which FD-025 already treats as a separate surface |

### FD-030 — Chart Tray for the staff console (rationale)

The console was reported as calm but unreadable: nothing drew the eye, gaps did not group, and buttons could not be told from badges. Measurement confirmed all three. The page-to-card surface step was 1.042:1 in light and 1.055:1 in dark, against 1.065/1.093 in GitHub Primer, 1.100/1.196 in IBM Carbon and 1.129/1.319 in Shopify Polaris — and the dark step was a light-mode-sized step used in dark mode, where published token files show dark steps running 1.4x to 2.2x their light counterparts. The hairline sat at 1.14:1 against Primer's 1.43. The shadow was 3% alpha, below perception. All three separation mechanisms were too weak at once. Separately, 89% of text runs sat inside a 3.0px band, `--accent` and `--ink-soft` were the same colour to within ΔL* 0.50, `--ink-faint` carried 39% of all text at 4.05:1 and failed AA everywhere it landed, the queue rendered 36 pill-shaped objects of which 29 were not interactive, the selected row was rendered *weaker* than the hovered row, and the page that exists to record a moderation decision had no commit button at all.

Three directions were built against the same markup and content so the only variable was the visual system: A (Chart Tray, surface-led), B (Ink Ledger, type-led) and C (Signal Ward, colour-led). A was chosen for the console because a moderator works the queue for hours and re-locates position from peripheral vision; a plane boundary is pre-attentive and survives the type inflating 44% in Bengali, where a weight-led hierarchy would not. Its honest cost is recorded: light mode is structurally weaker than dark because white is a ceiling, and the direction keeps its structure in backgrounds, so it degrades under `forced-colors` and in print — the stylesheet carries a `forced-colors` block that re-adds the planes as borders, which is an admission that the structure was never in the markup. B and C are archived at `ui-design-prototype/.archive/admin-shell-studies/`.

Verified: page-to-card is now 1.094:1 light and 1.171:1 dark; tray-to-well is 1.199/1.306; selection is 1.173 against hover 1.078; every text pair and every control border clears AA and WCAG 2.2 SC 1.4.11 on every plane in both themes; a jsdom harness boots the console and passes 33 behaviour checks with no runtime errors. Not verified: anything visual — no screenshot of the ported console was taken, and the sub-760px tab bar has not been seen rendering.

## Founder decisions — round 4 (2026-09-10, demo implementation planning)

Recorded during the planning session that produced `docs/implementation/`. Each was put to the founder as an explicit choice with a recommendation and confirmed in that session.

| ID | Decision | Scope/status |
|---|---|---|
| FD-031 | The local demo is built on the **local-development composition** of the architecture: a real Next.js application, PostgreSQL 18 in Docker, Better Auth email/password with confirmed email, a pg-boss worker, filesystem evidence storage, and Mailpit as the mail sink. Real accounts, writes and uploads are enabled; the seed is the synthetic corpus. The read-only USD 0 public demo of ADR-0010/FD-012 remains a separate, unbuilt composition. | Confirmed 2026-09-10; does not change AD-14 — demo markers stay on and production still requires production configuration |
| FD-032 | The product frontend **ports the approved prototype CSS and tokens as plain CSS** into React components, class names verbatim. Tailwind CSS, shadcn, Radix and Motion are **not adopted** in Phase 1. Pixel fidelity to 04b and Chart Tray outranks framework conformance. | Confirmed 2026-09-10; supersedes the Styling, Accessible primitives, Component source and Motion rows of `docs/architecture/DEPENDENCY-SELECTIONS.md`; ADR-0002 (Next.js/TypeScript/PostgreSQL) unchanged |
| FD-033 | The first implementation uses a **trimmed monorepo**: `apps/web`, `apps/worker`, `packages/{contracts,domain,application,database,adapters,i18n,test-support}`. The spine's `auth`, `evidence`, `search` and `ui` packages fold into `adapters`, `database` and `apps/web`; every port stays an interface in `application` so they can be extracted later. | Confirmed 2026-09-10; refines the Structural Seed of `ARCHITECTURE-SPINE.md` without changing any AD rule |
| FD-034 | Sign-up, sign-in, email confirmation, password reset, session control, staff sign-in, staff new-device approval and password recheck are **specified now** in `docs/design/auth-screens-spec.md` and get a **prototype pass** (D-001) before implementation. Staff use the **same account system** with a staff role; the console's role switcher is replaced by real roles and three seeded staff accounts. | Confirmed 2026-09-10; closes the gap that STORY-AUTH-001/002 had no screens or design |
| FD-036 | Phase 1 evidence upload accepts **JPEG and PNG images only**. PDF intake, rasterisation, derivative-PDF assembly and the multi-page viewer, then HEIC and Office formats, are planned as a separate Phase 2 (`docs/implementation/07-phase-2-document-evidence.md`) with their own malicious-corpus validation. FD-002's "narrow allowlist with later expansion designed in" is satisfied more narrowly than the JPEG/PNG/PDF planning baseline. | Confirmed 2026-09-12 (CR-001); the storage/scanner/sanitiser ports are unchanged so Phase 2 adds adapters, not architecture |
| FD-035 | In the demo the following are **real, not stubbed**: PostgreSQL search (FTS + trigram + Bangla/Banglish aliases), staff new-device approval, retention and legal-hold jobs with a demo clock, account export and orchestrated deletion, and a PWA with a safe public-shell cache. ClamAV runs as a container that is **optional at start-up but fail-closed at scan time**: a scan that cannot run never advances an evidence item. | Confirmed 2026-09-10; consistent with FD-002/004/005/020/021/023 and AD-6/AD-7 |
| FD-037 | `rk_worker`'s table privileges flip to **default-deny**: T-005's grants migration changes T-004's `ALTER DEFAULT PRIVILEGES` (`0001_grants_part1.sql`) so new tables grant the worker nothing by default, then GRANTs only the access the worker actually needs, table by table. Resolves `ISS-107`. | Confirmed 2026-09-13; T-005 due Phase 0 gate |

### Version pins taken with these decisions

TypeScript stays on 6.x (TypeScript 7 breaks the lint toolchain until 7.1), pnpm on 11.x, Vitest on 4.1.x; Better Auth moves to the now-stable 1.7.3 line (ADR-0003's "exclude 1.7 prereleases" is satisfied); `pdf-lib` is replaced by the maintained `@cantoo/pdf-lib` fork; MinIO is no longer a candidate for anything. Evidence and sources: `docs/status/dependency-check-log.md` (2026-09-10).

### Model routing taken with these decisions

`docs/planning/research/model-assignment-2026-09-10/research.md` and `docs/implementation/00-master-plan.md` §7 replace the 2026-08-30 assignment classes for the demo build: Sonnet 5 / GPT-5.6 Terra for routine and frontend-port work, Opus 5 (alternate Sol) for high-risk work with cross-vendor validation and founder approval, Luna / Haiku 4.5 for mechanical ports, Fable 5.1 not used for implementation.

## Delegated decisions — round 5 (2026-10-11, AI-DLC migration)

Each decided by delegation from the owner, 2026-10-11 (`docs/aidlc-migration/RUNBOOK.md` §B). The owner can overturn any of them later.

| ID | Decision | Reason / status |
|---|---|---|
| FD-038 | `CR-011` / `ISS-201`: the outbox relay becomes **transactional** — it enqueues with pg-boss `send(..., { db })` inside the same transaction that sets `processed_at`; `singletonKey` stays; handlers stay idempotent. | Removes the duplicate window instead of narrowing it. Verified: pg-boss 12.31.0 `SendOptions = JobOptions & QueueOptions & ConnectionOptions`, `ConnectionOptions.db?: IDatabase` (`dist/types.d.ts:425,459`). Decided by delegation from the owner, 2026-10-11; applied in the CR-011 unit (with `ISS-202`, `ISS-203`) |
| FD-039 | `ISS-158` + `ISS-176` + `ISS-221`: **correct the storyboard to match the data** (the code is right). The alias-isolation proof uses an anonymous review (r2/r8/r12); MOD-2041 is in the critical lane; MOD-2033's three extra reports cite `factual`, so the case reads as the factual disagreement its summary describes. Verify against the prototype data before changing the seed. | The prototype is the source of truth for demo data (`rogikotha-dev-spec.md`). Decided by delegation from the owner, 2026-10-11; applied in a small storyboard/seed unit in the delivery plan |
| FD-040 | `ISS-226`: seed files may import `@rogikotha/database` as a **dev-only edge**: `packages/test-support/src/seed/** → database`, written into `01-conventions.md` §2 and T-010's boundary lint. Nothing in `apps/*` may import `test-support`. | Seeding writes the database by definition; this is the narrow, reversible option. Decided by delegation from the owner, 2026-10-11; applied in the T-010 unit |
| FD-041 | `ISS-140` / `CR-006`: **revoke** `rk_worker`'s `SELECT (id, email)` on `auth_users` in a forward-only migration; the worker reads recipients from `email_deliveries.to_email_enc` as designed. | Matches `02-data-model.md` §16 and `01-conventions.md` §11 (least privilege). Decided by delegation from the owner, 2026-10-11; applied in the CR-006 unit |
| FD-042 | `CR-004`: the theme/language toggle announcements to `#sr-live` are **localized**. Bengali copy is drafted in the unit and flagged for the owner's bilingual review at the phase gate, together with `ISS-050`. | The equal-language rule (ADR 0011) forbids English-only strings. Decided by delegation from the owner, 2026-10-11; applied in the CR-004 unit |
| FD-043 | `CR-007` (`test:int` hang): **queued** as its own unit. | The cause is known; no product decision is needed. Decided by delegation from the owner, 2026-10-11; applied in the delivery plan |
| FD-044 | `ISS-135`: Terms/Privacy keep `nav.about` as their kicker; closed as **won't fix**. | Matches the ported prototype, which is the visual source of truth; ships either way. Decided by delegation from the owner, 2026-10-11 |

## Owner decisions — round 6 (2026-10-23, AI-DLC readiness check)

Taken on the readiness check of the documents the AI-DLC Inception stages transcribe (`docs/planning/research/aidlc-migration-2026-10-23/readiness-report.md`). FD-045..FD-047 were chosen by the owner directly; FD-048..FD-055 are the check's recommendations, which the owner accepted as a set. FD-056..FD-059 were chosen by the owner at the Requirements Analysis gate, FD-060..FD-063 at User Stories, and FD-064..FD-066 at Domain Design. Any of them can be revisited at the AI-DLC gate where it comes up.

| ID | Decision | Reason / status |
|---|---|---|
| FD-045 | Each requirement ID's meaning comes from the **PRD text** (`docs/planning/source-extracts/RogiKotha_PRD_v1.0.md`, extracted from the `.docx`) with later FD decisions applied on top. The set is **115 requirements: 103 FR + 12 NFR**, original IDs kept. Where a `06-requirement-traceability-matrix.md` label disagrees with the PRD for its ID, the PRD wins and the owning story is re-linked. | The matrix labels drifted from the PRD for at least 35 IDs, and it omits FR-A11Y-001, FR-I18N-001 and FR-I18N-002. Owner, 2026-10-23 |
| FD-046 | **FR-COM-003** (emergency-language banner) is **retired for the demo**: the static `/emergency` page covers it. Comment edit and delete stay under FR-EDIT-005. | FD-009/FD-017 rule out a content classifier. Owner, 2026-10-23 |
| FD-047 | The optional email categories (`emailDiscussion`, `emailEvidence`, `emailModeration`) are **Phase 1**, overriding the PRD's FR-NOT-002 "future scope". Essential email stays content-free. | Already in `packages/database/src/schema/account.ts`, `packages/contracts/src/schemas/account.ts`, STORY-NOTIF-001 and T-405. Owner, 2026-10-23 |
| FD-048 | **FR-ONB-001** (optional three-step intro) is a PRD Must **deferred from the demo**; no task delivers it. FR-I18N-001/002 map to STORY-PLAT-001; FR-A11Y-001 maps to STORY-PLAT-001 and STORY-PROT-003. | STORY-PLAT-001 cited FR-ONB-001 but describes FR-I18N-001. Owner accepted, 2026-10-23 |
| FD-049 | An author's soft-delete is **domain-only state**: the stored publication state is unchanged and `deleted_at`/`restore_until` are set (T-302). `ISS-147` (add a `deleted` enum value) is closed. | Fits the existing columns; no migration. Owner accepted, 2026-10-23 |
| FD-050 | `rk_worker`'s grants beyond `02-data-model.md` §16 (`0005_grants_part2.sql`: reviews `UPDATE(state, deleted_at)`, `review_versions` INSERT, comments SELECT/UPDATE, column SELECT on reports and account_profiles, `legal_holds` SELECT) are a **known deviation, reviewed in CR-006** together with FD-041. | The reviews UPDATE sits uneasily with AD-6. Owner accepted, 2026-10-23 |
| FD-051 | Retention bulk actions stay **super_admin only**, as `03-routes-and-contracts.md` and `packages/contracts/src/actor.ts` already have it; T-103's task text is corrected. | Destructive action; contract and code agree. Owner accepted, 2026-10-23 |
| FD-052 | `dataRequest.created` is **routed by the request's kind** (export or delete), fixed in the T-410 unit (`ISS-188`). Today the relay queues both jobs. | Owner accepted, 2026-10-23 |
| FD-053 | The D-001 auth-screen review (both locales, both themes, 360 px) is an **explicit gate on the T-102 and T-103 units**. | Nothing records its approval. Owner accepted, 2026-10-23 |
| FD-054 | `ISSUES.md` **stays live** (owner, 2026-10-15, `team.md`), amending RUNBOOK D15: it gets no "frozen" banner, and the delivery plan links open S1/S2 rows per unit instead of copying them. | Owner accepted, 2026-10-23 |
| FD-055 | Reverse Engineering is **not redone**. The engine's "something it used changed" prompt is a false positive from the path case (`rogikotha` on the work PC, `RogiKotha` here); the scanned code is unchanged. | Owner accepted, 2026-10-23 |
| FD-056 | **FR-AUTH-005**: the demo keeps "no automatic deletion" of unverified or inactive accounts (the PRD default). The optional Super Admin cleanup policy and its in-app/email notices are **deferred** to a later phase. | No task builds it; the default already holds. Owner, 2026-10-23 (Requirements Analysis) |
| FD-057 | **FR-AUTH-006**: the demo ships 30-day sessions, the session list and "Sign out everywhere" (T-101, T-102). Recent successful logins and failed-login alerts are **deferred**. | No task builds them. Owner, 2026-10-23 (Requirements Analysis) |
| FD-058 | **FR-AUTH-008**: progressive delay on repeated sign-in failures and the severe-activity email/in-app notice are **added to the demo** (T-101/T-502, carried into Units and Delivery Planning). The suspicious-activity challenge (CAPTCHA) is **deferred** to the production release; this narrows FD-013's "challenge only after suspicious repeated attempts" for the demo only. | Today only a fixed limit exists (the 11th attempt in a minute is refused). Owner, 2026-10-23 (Requirements Analysis) |
| FD-059 | **FR-AUTH-009**: self-service email reset (FD-013, FD-034; T-101/T-102) is the demo's account recovery, and every reset is audited. The PRD's manual Admin recovery and the verified recovery phone / secondary email are **deferred** to a later phase. | No decision had dropped the manual path and no task builds it. Owner, 2026-10-23 (Requirements Analysis) |
| FD-060 | **FR-DOC-006 (doctor claim)**: staff decide every claim from the submitted method and evidence (`directory.claimProfile` → `directory.decideClaim`), as the design and storyboard have it. The PRD's code sent to a publicly listed chamber phone or professional email is **deferred**. | The demo has no SMS channel; the route contract has no code step. Owner, 2026-10-24 (User Stories) |
| FD-061 | **FR-DOC-007 (protected fields)**: after a claim, changes to identity (name), BMDC number, **degrees and specialty** need Admin approval, as the PRD says. Schedule, fee, booking contact, languages and chamber details still publish immediately with history. Contract Design widens the protected-field list beyond `name` and `bmdc_number`. | Safer for trust; the contract under-specified it. Owner, 2026-10-24 (User Stories) |
| FD-062 | **FR-REA-001 (reactions)**: comments take **Like and Dislike**, as reviews do, following the PRD. The data model's "comments accept `like` only" (`02-data-model.md` §8) and the prototype's like-only comments change in Domain Design / Contract Design. | Owner chose the PRD over the design, 2026-10-24 (User Stories) |
| FD-063 | **FR-AUTH-008 numbers (with FD-058)**: the progressive delay and the severe-activity threshold are **runtime settings** (FD-018). Demo defaults: the delay doubles from 1 s after the 3rd failed sign-in in 15 minutes, capped at 30 s; 10 failures in 15 minutes count as severe and send the email/in-app notice. | No source gave the values. Owner, 2026-10-24 (User Stories) |
| FD-064 | **Retention ownership**: the `retention` module owns `retention_policies`, `legal_holds` and `retention_bulk_actions` (the `retention.*` commands in `03-routes-and-contracts.md`). Evidence, review and community call it to check holds and expiry. This moves them out of `02-data-model.md` §7 (Evidence) in ownership only; the tables are unchanged. | Legal holds cover reviews and comments too (FR86, FD-021). Owner, 2026-10-24 (Domain Design) |
| FD-065 | **Cross-cutting records**: `administration` owns `audit_events` (AD-10). Every module appends through one audit port, and moderation's case timeline is a stream within it. `notification` owns `outbox_events`, as `02-data-model.md` §12 has it; every module writes outbox rows in the same transaction as its change. | Owner, 2026-10-24 (Domain Design) |
| FD-066 | **Beta metrics (FR-ADM-004)**: the staff dashboard shows aggregate counts computed from the product's own tables (accounts, published reviews, open and closed reports, evidence processed or failed), with no analytics and no per-user data (FD-019). `administration` owns the view. | The PRD names "Beta metrics" without defining them. Owner, 2026-10-24 (Domain Design) |

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
