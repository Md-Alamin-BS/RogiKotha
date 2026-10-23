# User stories — RogiKotha demo build

Transcribed from the approved backlog (`docs/planning/08-product-backlog.md`, 34 stories in 12 epics) and written against `requirements.md` (requirement keys FR1..FR103, NFR1..NFR12). Every story keeps its backlog ID beside its `US` key; keys are frozen once assigned. Acceptance criteria are written from the approved requirements with the binding decisions applied (the owner: "do it the AI-DLC way"); each names its source. Personas are in `personas.md`.

## Sources

- Requirements: `requirements.md` (Requirements Analysis), which carries the PRD text and the decisions FD-001..FD-059.
- Backlog: `docs/planning/08-product-backlog.md` for story identity, epic grouping, scope In/Out and dependencies.
- Reverse-engineered code: `business-overview.md` and `component-inventory.md` in `aidlc/spaces/default/codekb/rogikotha/`; team practices: `team-practices.md` (testing posture, per-Unit validation steps).

## Summary

| Key | Backlog ID | Story | Persona | Priority | Demo status | Requirements |
|---|---|---|---|---|---|---|
| US1.1 | STORY-FOUND-001 | Architecture-enforced application foundation | Staff | Must Have | In demo (local composition; the GlitchTip errors and disk-capacity alerts of NFR10 are production-only and not built; storage is the filesystem adapter, not Garage) | NFR9, NFR10, NFR11 |
| US2.1 | STORY-PROT-001 | Deterministic synthetic demo services | Staff | Must Have | Partial: the synthetic corpus and reset are built; the read-only public composition is deferred (ADR-0010, FD-031) | — |
| US2.2 | STORY-PROT-002 | Three genuinely different design concepts | Staff | Won't Have (this time) | Superseded: FD-025, FD-027 and FD-029 settled the concept comparison; concept 04b (Quiet Clinic, minimal pass) is the chosen direction | — |
| US2.3 | STORY-PROT-003 | Responsive and accessible comparison evidence | Public user | Must Have | Partial: accessibility and viewport evidence on concept 04b only | FR95, NFR1, NFR4, NFR5, NFR6, NFR7 |
| US3.1 | STORY-AUTH-001 | Adult account registration and confirmation | Public user | Must Have | Partial: registration, Argon2id passwords, 24-hour confirmation with rate-limited resend, contribution gating, progressive sign-in delay and severe-activity notice are in the demo; the optional Super Admin account-cleanup policy (FD-056) and the suspicious-activity CAPTCHA (FD-058) are deferred | FR1, FR2, FR3, FR4, FR5, FR8 |
| US3.2 | STORY-AUTH-002 | Recovery, sessions and administrative device approval | Public user | Must Have | Partial: self-service email reset with audit (FD-059), 30-day sessions, the session list and Sign out everywhere (FD-057) and staff new-device approval with password recheck are in the demo; recent successful logins, failed-login alerts, manual Admin recovery and recovery phone/secondary email are deferred | FR6, FR7, FR9 |
| US3.3 | STORY-IDENT-001 | Per-review named, pseudonymous and anonymous identity | Public user | Must Have | In demo | FR10, FR78 |
| US4.1 | STORY-DIR-001 | Transparent doctor profiles | Public user | Must Have | In demo | FR15, FR16, FR17, FR18 |
| US4.2 | STORY-DIR-002 | Community submission, claim and duplicate merge | Provider | Must Have | In demo | FR19, FR20, FR21, FR23 |
| US4.3 | STORY-DIR-003 | Facility organizations and branches | Public user | Must Have | In demo | FR24, FR25, FR26, FR27 |
| US5.1 | STORY-SRCH-001 | Unicode-safe unified search | Public user | Must Have | In demo | FR28, FR29, FR30, FR34 |
| US5.2 | STORY-SRCH-002 | Neutral filters, ranking and result cards | Public user | Must Have | In demo | FR31, FR32, FR33, FR35, FR58, NFR8 |
| US5.3 | STORY-SRCH-003 | Provisional bilingual taxonomy | Public user | Must Have | In demo | FR36, FR37, FR38 |
| US6.1 | STORY-REV-001 | Quick Review wizard | Public user | Must Have | In demo | FR39, FR40, FR43, FR44 |
| US6.2 | STORY-REV-002 | Detailed treatment timeline | Public user | Must Have | In demo | FR39, FR41, FR42, FR45, FR46, FR47, FR55 |
| US6.3 | STORY-REV-003 | Drafts, follow-ups, corrections and deletion | Public user | Must Have | In demo | FR69, FR70, FR71 |
| US6.4 | STORY-REV-004 | Narrative sentiment and outcome summaries | Public user | Must Have | In demo | FR48, FR49, FR50, FR51, FR52 |
| US7.1 | STORY-EVID-001 | Quarantine-first upload and processing | Public user | Must Have | In demo (narrowed by FD-036: JPEG and PNG only; PDF, WebP, HEIC, Office, TXT and RTF intake is Phase 2) | FR60, FR61, FR62, FR66, FR68, NFR2 |
| US7.2 | STORY-EVID-002 | Privacy preview and public processed viewer | Public user | Must Have | In demo (narrowed by FD-036: images only; document page previews, multi-page comparison and PDF download are Phase 2) | FR53, FR54, FR56, FR57, FR59, FR63, FR64, FR65 |
| US7.3 | STORY-EVID-003 | Custody, retention, holds and removal | Staff | Must Have | In demo | FR67, FR86, FR83, FR65 |
| US8.1 | STORY-COM-001 | Comments, flat replies, mentions and advice warning | Public user | Must Have | In demo | FR22, FR72, FR73, FR74, FR75 |
| US8.2 | STORY-COM-002 | Like/dislike engagement | Public user | Must Have | In demo | FR77, FR78 |
| US9.1 | STORY-MOD-001 | Report intake and five-account temporary hide | Public user | Must Have | In demo | FR75, FR79, FR80, FR81 |
| US9.2 | STORY-MOD-002 | Moderation queue and bounded actions | Staff | Must Have | In demo | FR82, FR83, FR73 |
| US9.3 | STORY-MOD-003 | Appeals, blocking and enforcement lifecycle | Staff | Must Have | In demo | FR12, FR84, FR85 |
| US10.1 | STORY-NOTIF-001 | In-app and essential email notifications | Public user | Must Have | In demo | FR87, FR88 |
| US10.2 | STORY-USER-001 | Public profile and activity privacy | Public user | Must Have | In demo | FR10, FR11 |
| US10.3 | STORY-USER-002 | Dashboard, preferences, feedback and data requests | Public user | Must Have | In demo | FR13, FR14, FR89, FR90 |
| US11.1 | STORY-ADMIN-001 | Versioned runtime configuration and capabilities | Staff | Must Have | In demo | FR38, FR100, FR101, FR102, FR45, FR47, FR75 |
| US11.2 | STORY-ADMIN-002 | Operational dashboards and logged bulk actions | Staff | Must Have | In demo | FR103 |
| US12.1 | STORY-PLAT-001 | Equal-language onboarding and accessible policy boundaries | Public user | Must Have | In demo (FR76 is retired by FD-046: the static /emergency page replaces the comment banner; FR-ONB-001 in the backlog block is deferred by FD-048 and not covered) | FR76, FR91, FR92, FR95, NFR6, NFR7 |
| US12.2 | STORY-PLAT-002 | Safe progressive web app | Public user | Must Have | In demo | FR93, FR94 |
| US12.3 | STORY-OPS-001 | Deployment, observability, backup and recovery | Staff | Should Have | Local subset: health probes and scrubbed logs; production deployment, backups and restore drills are out of scope (master plan §9) | NFR1, NFR3, NFR10, NFR12 |
| US12.4 | STORY-OPS-002 | Optional privacy-minimised analytics | Staff | Won't Have (this time) | Deferred: FD-019 (analytics is off in the demo; FR99's no-sensitive-data rule still binds any later analytics work) | FR99 |

## Epic 1 — Foundation with visible value (EPIC-FOUND-001)

### US1.1 — Architecture-enforced application foundation (STORY-FOUND-001)

As a super admin who owns and operates the RogiKotha demo build, I want one strictly typed, boundary-checked codebase whose web and worker compositions build and run from a clean checkout, so that focused agents can deliver features safely without breaking the architecture, leaking private data into logs, or locking the data into one storage or hosting setup.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo (local composition; the GlitchTip errors and disk-capacity alerts of NFR10 are production-only and not built; storage is the filesystem adapter, not Garage)
- **Requirements:** NFR9, NFR10, NFR11
- **Depends on:** none
- **INVEST:** Independent (it is the base story), valuable as the delivery platform, testable through pnpm check; large (L), but it splits along its existing tasks TASK-FOUND-001-A/B. Its value is indirect (the platform), so it has no end-user benefit of its own.

**Acceptance criteria**

- **AC1.1.1** (happy; NFR11) — **Given** a clean checkout with the compose PostgreSQL running, **when** `pnpm check` runs, **then** strict typecheck, lint, unit and integration tests, i18n parity and the build of both the web and worker compositions all pass.
- **AC1.1.2** (happy; NFR11) — **Given** an empty database, **when** the migrations run, **then** every migration applies forward-only from empty with no error, and the web shell renders at `/en` and `/bn`.
- **AC1.1.3** (error; NFR11, D10) — **Given** a package that has source code, **when** coverage is measured in `pnpm check` (from T-010), **then** line coverage below 80% fails the check, and the threshold is not lowered to make it pass.
- **AC1.1.4** (happy; NFR9) — **Given** the evidence storage is reached by the web app and the worker, **when** a file is stored or read, **then** it goes only through the storage port (filesystem adapter in the demo), and neither process keeps request or session state in process memory that another instance would need.
- **AC1.1.5** (error; NFR10, Constraints (scrubbed logs)) — **Given** a log call that passes a field outside the allowlist, such as review text or an evidence filename, **when** the logger port writes the entry, **then** the entry is structured, and the field that is not on the allowlist is dropped or scrubbed, so no health content reaches the log.

## Epic 2 — Comparable public demo (EPIC-PROT-001)

### US2.1 — Deterministic synthetic demo services (STORY-PROT-001)

As a super admin who runs and resets the demo, I want a deterministic synthetic corpus and a one-command reset, with the demo marker always visible, so that the demo can be shown and restored at any time without ever holding or presenting real people, facilities or health data.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** Partial: the synthetic corpus and reset are built; the read-only public composition is deferred (ADR-0010, FD-031)
- **Requirements:** — (no requirement rows; see demo status)
- **Depends on:** US1.1
- **INVEST:** No requirement rows; criteria come from the backlog block (In scope), the Data constraint and FD-031, with no criteria for the deferred read-only composition. Rated Must Have because the synthetic-data-only constraint binds the whole demo. Independent of feature stories and testable through the seed and reset commands.

**Acceptance criteria**

- **AC2.1.1** (happy; Constraints (Data), FD-031) — **Given** an empty, freshly migrated database, **when** the seed runs twice, each time from empty, **then** both runs produce the same synthetic corpus, with the same records and identifiers.
- **AC2.1.2** (happy; FD-031, backlog In scope (reset)) — **Given** a demo whose data has changed through real writes (FD-031 enables accounts, writes and uploads), **when** `pnpm demo:reset` runs, **then** the database returns to the deterministic seeded state.
- **AC2.1.3** (happy; Constraints (Data, AD-14)) — **Given** any public, user or staff page in `en` or `bn`, **when** it renders, **then** the synthetic-data marker "Demo — fictional records" is visible in the active language.
- **AC2.1.4** (error; FD-031, AD-14) — **Given** `APP_MODE=production`, **when** migrate, reset or seed is attempted, **then** the command refuses, and no data changes.

### US2.2 — Three genuinely different design concepts (STORY-PROT-002)

As a super admin choosing the production visual system, I want the design-concept comparison settled, with one chosen direction implemented, so that the build follows one decided visual system and no effort goes into comparing concepts again.

- **Persona:** Staff
- **Priority:** Won't Have (this time)
- **Demo status:** Superseded: FD-025, FD-027 and FD-029 settled the concept comparison; concept 04b (Quiet Clinic, minimal pass) is the chosen direction
- **Requirements:** — (no requirement rows; see demo status)
- **Depends on:** US2.1
- **INVEST:** No requirement rows; the A/B/C comparison is superseded, so the criteria only check that the decision holds. Independent and small; its value is avoiding rework. Its guard criterion AC2.2.1 (concept 04b only, plain CSS per FD-032) must still be assigned to a Unit and verified.

**Acceptance criteria**

- **AC2.2.1** (happy; FD-027, Constraints (FD-032)) — **Given** the demo web app, **when** any public or user page renders, **then** it uses the concept 04b styles, ported as plain CSS with the prototype's class names, and no other concept's route system exists in the app.
- **AC2.2.2** (happy; FD-029) — **Given** the live prototype gallery, **when** it is opened, **then** it shows only concept 04b and the staff console.
- **AC2.2.3** (edge; FD-029) — **Given** an earlier concept (01, 02, 03, 04, 04c, 04d or 05), **when** it is looked for, **then** it is missing from the live gallery but can still be opened from `ui-design-prototype/.archive/`.

### US2.3 — Responsive and accessible comparison evidence (STORY-PROT-003)

As a visitor or patient using a phone or assistive technology, in Bengali or English, I want the critical journeys to work at my screen size, with a keyboard or screen reader, in either language, so that I can read and write about care without layout breaking, a mouse, or perfect sight.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** Partial: accessibility and viewport evidence on concept 04b only
- **Requirements:** FR95, NFR1, NFR4, NFR5, NFR6, NFR7
- **Depends on:** US1.1, US2.1, US3.1, US5.1, US6.1, US7.2
- **INVEST:** Depends on the 04b UI, not on the superseded A/B/C concepts of US2.2. Testable through the T-503 Playwright/axe matrix. Large (L); it splits by viewport set and by assistive-technology checks. Formal WCAG certification is out of scope. It verifies the critical journeys, so it runs after the stories that build them.

**Acceptance criteria**

- **AC2.3.1** (happy; NFR4, NFR7) — **Given** each critical journey on concept 04b at 360×800, 390×844, 768×1024, 1280×800 and 1440×900, in both `en` and `bn`, with the longest bilingual fixtures, **when** the journey runs, **then** there is no horizontal overflow and no Bengali text overflow.
- **AC2.3.2** (edge; NFR4, NFR6) — **Given** a critical journey at 200% zoom or with reduced motion enabled, **when** it runs, **then** every step can still be completed.
- **AC2.3.3** (happy; FR95, NFR6) — **Given** each critical journey, **when** it runs keyboard-only and under axe, **then** every control can be reached and used with visible focus, headings, landmarks and labels are present, and axe reports no serious or critical violations.
- **AC2.3.4** (error; FR95, NFR6, NFR7) — **Given** a form in a critical journey, **when** it is submitted with an invalid or missing field, **then** a meaningful error in the active language is programmatically linked to the field and announced to screen readers.
- **AC2.3.5** (happy; NFR5) — **Given** the Playwright Chromium, Firefox and WebKit projects, **when** the journeys run, **then** they pass on all three, and a manual smoke on real Safari/iOS is recorded.
- **AC2.3.6** (edge; NFR1) — **Given** the important public pages, **when** Build and Test runs, **then** their Lighthouse figures are recorded once against the ~3 s reference with no pass/fail gate, and every known issue becomes an `ISS-` row.

## Epic 3 — Access and identity (EPIC-AUTH-001)

### US3.1 — Adult account registration and confirmation (STORY-AUTH-001)

As an adult visitor who wants to contribute accounts of care, I want to browse freely, then register with email and password, confirm my email and sign in, so that public information stays open to everyone while every contribution comes from an accountable, confirmed adult account.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** Partial: registration, Argon2id passwords, 24-hour confirmation with rate-limited resend, contribution gating, progressive sign-in delay and severe-activity notice are in the demo; the optional Super Admin account-cleanup policy (FD-056) and the suspicious-activity CAPTCHA (FD-058) are deferred
- **Requirements:** FR1, FR2, FR3, FR4, FR5, FR8
- **Depends on:** US1.1
- **INVEST:** Independent of other user-facing stories once the foundation exists; valuable on its own; estimable (L); small enough for one Unit though it sits in the high-risk auth class; each criterion is a pass/fail check. Deferred parts of FR5 and FR8 carry no criteria.

**Acceptance criteria**

- **AC3.1.1** (happy; FR1 (FR-AUTH-001)) — **Given** a logged-out visitor, **when** they search, open a doctor or facility profile, read reviews, comments, sentiment distributions and reported outcomes, and open a processed evidence viewer, **then** every page loads without an account, and choosing write, comment, react, report, bookmark, submit profile or claim instead asks them to sign in.
- **AC3.1.2** (happy; FR2 (FR-AUTH-002), FR3 (FR-AUTH-003)) — **Given** a visitor on the registration form, **when** they submit an email, a password of at least 10 characters (a long passphrase with Bengali or other international characters is accepted), a unique username, a public display name, a preferred interface language, acceptance of Terms/Privacy and confirmation that they are 18 or older, **then** an unconfirmed account is created, a confirmation email is sent, and the stored credential is an Argon2id hash with a unique salt, never the plaintext or a reversible form.
- **AC3.1.3** (error; FR2 (FR-AUTH-002), FR3 (FR-AUTH-003), Constraints (equal Bengali/English)) — **Given** a visitor on the registration form, **when** they submit without the 18+ confirmation, without accepting Terms/Privacy, with a username already taken, or with a password shorter than 10 characters, **then** no account is created and each problem is shown as a labelled field error in the active language (Bengali or English) that does not rely on colour alone.
- **AC3.1.4** (edge; FR4 (FR-AUTH-004), FR1 (FR-AUTH-001)) — **Given** a new account that has not confirmed its email, **when** the holder opens the confirmation link within 24 hours, or instead opens it after 24 hours, or tries to contribute before confirming, **then** a link within 24 hours enables contribution; an expired link is refused and offers a resend that is rate-limited; before confirmation the account can browse and edit account settings but every contribution action is refused.
- **AC3.1.5** (error; FR8 (FR-AUTH-008), FD-058, FD-063, FD-013) — **Given** repeated failed sign-in attempts for one email address, whether or not it belongs to an account, **when** the failures continue, **then** from the 3rd failed attempt within 15 minutes each further attempt is delayed, starting at 1 s and doubling to a 30 s cap, with the same delay for an email that has no account; at 10 failures within 15 minutes a real account holder receives an email and an in-app notice; the values are runtime settings; no CAPTCHA is shown in the demo; and neither the response nor its timing reveals whether the email belongs to an account.
- **AC3.1.6** (edge; FR5 (FR-AUTH-005), FD-056) — **Given** an unconfirmed account and a confirmed account that have both been inactive for a long period, **when** the scheduled jobs run, **then** neither account is deleted automatically and no cleanup policy is offered in the demo.

### US3.2 — Recovery, sessions and administrative device approval (STORY-AUTH-002)

As an account holder (a public user, or a staff member on the same account system), I want to reset a forgotten password by email, see and end my sessions, and, as staff, approve any new device before it can sign in, so that I can recover access and stop misuse of my account, and staff accounts get stronger protection while Phase 1 has no MFA.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** Partial: self-service email reset with audit (FD-059), 30-day sessions, the session list and Sign out everywhere (FD-057) and staff new-device approval with password recheck are in the demo; recent successful logins, failed-login alerts, manual Admin recovery and recovery phone/secondary email are deferred
- **Requirements:** FR6, FR7, FR9
- **Depends on:** US3.1
- **INVEST:** Depends on US3.1 accounts; delivers recovery and session control as one testable slice; estimable (L); high-risk auth class; persona is Public user because staff use the same account system (FD-034), and the staff-only criteria name the Staff role. Deferred parts of FR6 and FR9 carry no criteria.

**Acceptance criteria**

- **AC3.2.1** (happy; FR9 (FR-AUTH-009), FD-059, FD-013, FD-034) — **Given** an account holder who has forgotten their password, **when** they request a reset for their email address, **then** the screen shows the same response whether or not the address belongs to an account, and an existing holder receives a single-use, expiring reset link by email.
- **AC3.2.2** (error; FR9 (FR-AUTH-009), FD-059) — **Given** a valid reset link, **when** the holder sets a new password that meets the password rule, **then** the password is changed and the reset is written to the audit log; reopening the same link, or opening it after it expires, is refused and leaves the password unchanged.
- **AC3.2.3** (happy; FR6 (FR-AUTH-006), FD-057) — **Given** a signed-in account holder with sessions on several devices, **when** they open their session list and choose Sign out everywhere, **then** the list shows their active sessions, and after Sign out everywhere every listed session is ended and its next request is treated as signed out.
- **AC3.2.4** (edge; FR6 (FR-AUTH-006), FD-057) — **Given** a normal or administrative session, **when** 30 days have passed since it was created, **then** the session is no longer accepted and the holder must sign in again.
- **AC3.2.5** (error; FR7 (FR-AUTH-007), FD-034, FD-035) — **Given** a staff member (moderator, admin or super admin) signing in from a device not seen before, **when** they enter the correct password, **then** no staff session starts until they open the approval link sent to their email and re-enter their password; an unopened or expired approval link never grants a session, and no MFA step is offered.

### US3.3 — Per-review named, pseudonymous and anonymous identity (STORY-IDENT-001)

As a patient or caregiver writing a review about my own or a family member's care, I want to choose for each review whether it appears under my real name, a pseudonym or anonymously, so that I can share a sensitive experience without it being publicly linked to my profile or my other reviews.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR10, FR78
- **Depends on:** US3.1
- **INVEST:** Depends on US3.1 accounts; valuable as the privacy guarantee every review relies on; estimable but XL and high-risk (identity), so it may split into projection isolation and staff reveal at Units Generation; every criterion is testable with adversarial identity fixtures. FR10 is shared with US10.2, which owns the public-profile side.

**Acceptance criteria**

- **AC3.3.1** (happy; FR10 (FR-USER-001)) — **Given** a signed-in, confirmed author publishing a review, **when** they choose real name, pseudonym or anonymous for that review, **then** the chosen identity is shown on the review, on the author's comments in that review's thread and in that thread's public reaction lists, with no other identity anywhere in the thread.
- **AC3.3.2** (edge; FR10 (FR-USER-001), FD-015) — **Given** an author who has published two anonymous reviews and comments on both threads, **when** another user reads both threads, **then** each thread shows its own stable alias for the author, the two aliases differ, and nothing on either page links them to each other or to the author's normal profile.
- **AC3.3.3** (edge; FR10 (FR-USER-001), FR78 (FR-REA-002), FD-015) — **Given** an author whose anonymous review thread includes their reactions and mentions of them, **when** anyone views the author's public profile, public activity, mentions or other reviews, **then** none of the anonymous review, its comments, its reactions or its mentions appear there; the reactions appear only on the content itself and on the author's own private dashboard.
- **AC3.3.4** (happy; FR78 (FR-REA-002)) — **Given** reactions on a review, **when** the provider's summaries, list ordering and moderation state are computed, **then** the reaction counts change none of them; they count as engagement only.
- **AC3.3.5** (error; FR10 (FR-USER-001), FD-016, FD-022) — **Given** an anonymous review and staff identity access at its default setting, **when** a Super Admin reveals the author, and an Admin or Moderator tries the same, **then** the Super Admin must state a purpose and the reveal writes an audit event that cannot be changed; the Admin or Moderator is refused unless the Super Admin has enabled access for that role.
- **AC3.3.6** (edge; FD-022, FR10 (FR-USER-001)) — **Given** a published anonymous review, **when** the review page and the writing flow are inspected in both Bengali and English, **then** no banner or warning about staff identity access appears there; the capability is described only in the Privacy Policy/Terms.

## Epic 4 — Trustworthy directory (EPIC-DIR-001)

### US4.1 — Transparent doctor profiles (STORY-DIR-001)

As a visitor or patient looking up a doctor before a visit, I want to see only the doctor information that actually exists, with where each field came from and when it was last updated, so that I can judge how far to trust each fact and am never misled into thinking the platform has verified the doctor's registration.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR15, FR16, FR17, FR18
- **Depends on:** US1.1
- **INVEST:** Independent of other directory stories once the foundation exists; small (M) and testable through projection and component tests; BMDC verification is out of scope (master plan §9, D-003), so no criterion covers it.

**Acceptance criteria**

- **AC4.1.1** (edge; FR15) — **Given** a community- or admin-submitted MBBS or BDS doctor profile that Admin has not yet checked for duplicates and obvious abuse, **when** a visitor searches for it or opens its URL, **then** the profile is not publicly visible; after Admin completes the duplicate and abuse check it becomes public.
- **AC4.1.2** (happy; FR15, FR16, D-003) — **Given** a published doctor profile with a BMDC number and registration status entered, **when** a visitor views it in English or Bengali, **then** the BMDC number and status appear as profile information and the profile shows "Registration not verified" (Bengali equivalent in bn); the word verified is never applied to the registration.
- **AC4.1.3** (edge; FR17) — **Given** a published profile where schedule, fees and photo are empty and one populated field is hidden by its settings, **when** the profile is rendered in either locale, **then** only populated, non-hidden fields render; empty fields are omitted entirely and none is displayed as 0 or a blank label.
- **AC4.1.4** (happy; FR18) — **Given** a published profile whose fields have mixed provenance (Community submitted, Provider confirmed, Admin checked), **when** a visitor views the profile, **then** every public field shows its provenance status as text and its last-update date in the active locale's numerals.
- **AC4.1.5** (error; FR18) — **Given** an Admin or Moderator creating a sourced profile field, **when** they save the field without a source URL or description, **then** the save is refused with a localized message; a saved sourced field records source URL/description, retrieval date and creator.

### US4.2 — Community submission, claim and duplicate merge (STORY-DIR-002)

As a doctor or dentist who wants to take ownership of the profile the community created for me, I want to claim my profile and keep my practical details current, while staff merge duplicates of me into one record, so that patients see accurate schedule and contact details on one stable profile, without my claim being mistaken for registration verification.

- **Persona:** Provider
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR19, FR20, FR21, FR23
- **Depends on:** US3.1, US4.1
- **INVEST:** Large (L) but one coherent ownership lifecycle; mixes provider claim with staff merge and community photo suggestion, which share the same transfer and audit rules; each criterion is independently testable. Claims follow FD-060 (staff-decided, no code step); protected fields follow FD-061.

**Acceptance criteria**

- **AC4.2.1** (happy; FR20 (FR-DOC-006), FD-060, FR16) — **Given** a signed-in doctor on an unclaimed profile, **when** they submit a claim with a claim method and a private evidence note, **then** a pending claim is recorded, the profile is unchanged and still shows "Registration not verified", and the evidence is visible only to staff with the claim capability; no code is sent by phone or email.
- **AC4.2.2** (error; FR20 (FR-DOC-006), FD-060) — **Given** a pending claim, **when** a staff member with the claim capability approves it, or rejects it with a reason, **then** on approval the profile becomes claimed by that doctor and still shows "Registration not verified"; on rejection it stays unclaimed and the claimant sees the reason; both decisions are audited.
- **AC4.2.3** (happy; FR21 (FR-DOC-007), FD-061) — **Given** a claimed profile, **when** the claiming doctor changes schedule, fee, booking contact, languages or chamber details, and separately changes the name, BMDC number, degrees or specialty, **then** the first set publishes immediately with a history entry; the identity, BMDC number, degree and specialty changes stay pending until Admin approves them.
- **AC4.2.4** (edge; FR19) — **Given** a community user suggests a photo for an unclaimed profile, **when** Admin has not yet approved it, **then** the profile keeps showing initials/avatar; after approval with a recorded source the photo shows, while a claimed doctor's own photo publishes directly.
- **AC4.2.5** (happy; FR23, NFR8) — **Given** two profiles that Admin has confirmed as duplicates, **when** Admin merges them into one canonical record, **then** reviews, tags, chambers and claims transfer to the canonical record, the old profile URL redirects to it, and the merge is recorded in the audit log.

### US4.3 — Facility organizations and branches (STORY-DIR-003)

As a patient or family member choosing a hospital, clinic or diagnostic centre, I want to read feedback about the specific branch people visited, kept apart from feedback about doctors, so that I learn how that location actually treated patients without one branch's or one doctor's experiences distorting the other.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR24, FR25, FR26, FR27
- **Depends on:** US4.1
- **INVEST:** Independent once doctor profile patterns exist; medium (M); testable at domain and query level, including the hard rule that facility feedback never enters doctor summaries.

**Acceptance criteria**

- **AC4.3.1** (happy; FR24) — **Given** a chain with one parent organization and two branch profiles, each with reviews, **when** a visitor opens one branch, **then** only reviews of that visited branch appear on it; the parent may show an aggregate summary with exact counts and their denominator and no score or rating.
- **AC4.3.2** (edge; FR25) — **Given** a facility profile that has not been verified, **when** it is viewed in either locale, **then** it shows "Not verified" (Bengali equivalent in bn); a claim on it goes through public business contact or Admin-controlled manual evidence.
- **AC4.3.3** (error; FR26) — **Given** a doctor who has treatment reviews and also practises at a facility that receives negative facility feedback, **when** the doctor's sentiment, outcome and review summaries are computed, **then** they are unchanged by the facility feedback, verified by a query-level test.
- **AC4.3.4** (happy; FR27) — **Given** a reviewer leaving structured facility feedback, **when** they fill in the facility section, **then** it offers staff behaviour/responsiveness, waiting/appointments, cleanliness, billing/value, test/report delivery, report reliability labelled patient-perceived, admission/discharge and recommendation, and no item produces a score.
- **AC4.3.5** (edge; FR24) — **Given** a facility aggregate where an item has no responses, **when** the summary renders, **then** it shows "Not provided" rather than 0, and shows "Limited data" when eligible accounts are below the configured threshold.

## Epic 5 — Neutral discovery (EPIC-SRCH-001)

### US5.1 — Unicode-safe unified search (STORY-SRCH-001)

As a visitor who thinks and types in Bengali, English or Banglish, I want one search box that finds doctors, facilities, conditions and reviews however I spell them, with location chosen separately, so that I can find relevant providers and experiences without knowing the exact English medical term or spelling.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR28, FR29, FR30, FR34
- **Depends on:** US4.1, US4.3, US6.1
- **INVEST:** Extra-large (XL) and may need splitting by query type during planning; real PostgreSQL FTS, trigram and alias search per FD-035; Near Me and geolocation are deferred and get no criteria.

**Acceptance criteria**

- **AC5.1.1** (happy; FR28, FR29, FR30, FD-035) — **Given** the synthetic multilingual corpus, **when** a visitor searches by doctor name, BMDC number, specialty, condition, symptom, treatment, medicine or facility in Bengali or English, in any letter case, **then** matching published results appear in the All tab and in the right Doctors, Facilities, Conditions/Tags or Reviews tab.
- **AC5.1.2** (happy; FR29, FD-035) — **Given** a query that is a Bangla/English alias, a Banglish transliteration or a misspelling of an indexed term, **when** it runs, **then** results for the matching term are returned through alias and fuzzy matching.
- **AC5.1.3** (edge; FR29) — **Given** an ambiguous Banglish query, **when** it runs, **then** Did you mean suggestions are shown and the visitor's query stays exactly as typed in the search box.
- **AC5.1.4** (happy; FR30) — **Given** a doctor or facility result, **when** it renders with the default card configuration, **then** the card shows identity, type/specialty, location, verification/provenance status, condition match and review summary, with no score or rating.
- **AC5.1.5** (edge; FR28, FR34) — **Given** the search page, **when** a visitor wants to narrow by place, **then** location is a separate, manually selected or entered field and no device geolocation or Near Me option is offered.
- **AC5.1.6** (error; FR35, FR15) — **Given** an unpublished, hidden or unmerged-duplicate profile or review matching the query, **when** the search runs, **then** it does not appear in results or suggestions.

### US5.2 — Neutral filters, ranking and result cards (STORY-SRCH-002)

As a visitor comparing providers for a condition, I want to filter and sort results on understandable criteria while the default order stays neutral, so that I can narrow my options without popularity, sentiment or attached documents being presented as a measure of provider quality.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR31, FR32, FR33, FR35, FR58, NFR8
- **Depends on:** US5.1
- **INVEST:** Large (L); NFR8 is re-linked here from the matrix (server rendering, canonical URLs, merge redirects, noindex) and FR58 from evidence; metamorphic ranking tests make neutrality pass/fail; no highest-rated sort by hard rule.

**Acceptance criteria**

- **AC5.2.1** (edge; FR32) — **Given** two doctors with identical textual and condition relevance and the same relevant public-review count, **when** one gains more positive sentiment, better reported outcomes, attached documents or more reactions, **then** their default condition-search order does not change.
- **AC5.2.2** (happy; FR32) — **Given** condition search results, **when** the visitor opens the sort control, **then** only relevance (default), newest, most reviewed and alphabetical are offered, and no highest-rated option exists.
- **AC5.2.3** (happy; FR33) — **Given** a doctor profile with reviews, **when** it opens, **then** reviews default to newest; most relevant, oldest, Positive first, Negative first and most discussed are available as view options.
- **AC5.2.4** (happy; FR31, FR58) — **Given** search results, **when** the visitor applies filters such as specialty, location, language, sentiment, reported outcome, claimed status, provenance or an evidence filter (no documents, reviewed-treatment, later-treatment, both paths, outcome/follow-up), **then** results narrow to matches, evidence filters are labelled as document presence only and never as verified, and the fee and schedule filters are offered only where that data exists.
- **AC5.2.5** (error; FR35, NFR8) — **Given** a user profile, draft, document content, private activity, evidence OCR text, or auth or staff page, **when** a crawler or the site search requests it, **then** it carries noindex and is not searchable, while provider profiles, condition pages and public reviews are server-rendered with canonical URLs.
- **AC5.2.6** (edge; NFR8, FR23) — **Given** a profile that was merged into a canonical record, **when** its old URL is requested, **then** it redirects to the canonical profile URL.

### US5.3 — Provisional bilingual taxonomy (STORY-SRCH-003)

As a patient or caregiver tagging my review in my own words, I want to tag symptoms, conditions, treatments, medicines and outcomes even when no canonical term exists yet, or to choose Not sure, so that my account is findable straight away and my original wording stays visible when staff later map it.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR36, FR37, FR38
- **Depends on:** US6.1
- **INVEST:** Medium (M); FR38 is shared with US11.1 (STORY-ADMIN-001), where tag group administration screens live; here only its audit and redirect behaviour on tags is covered; taxonomy is never a diagnosis.

**Acceptance criteria**

- **AC5.3.1** (error; FR36) — **Given** a reviewer finishing tags, **when** they submit with no condition, symptom or free-text tag and without choosing Not sure, **then** submission is refused with a localized message; with any one of those, or several tags across the five groups, it is accepted.
- **AC5.3.2** (happy; FR37) — **Given** an unmapped Bengali, English or Banglish tag, **when** the review publishes, **then** the tag publishes immediately as provisional, shown in the reviewer's original wording.
- **AC5.3.3** (happy; FR37) — **Given** Admin maps provisional aliases to a canonical tag, **when** a visitor views a review carrying the alias or clicks it, **then** the submitted wording is still shown on the review and the click opens the canonical tag page.
- **AC5.3.4** (edge; FR38) — **Given** a Super Admin who renames, merges, redirects, deactivates or reorders a tag group or value, **when** the change is saved, **then** an audit history entry records it, and links to a merged or redirected tag land on its target.
- **AC5.3.5** (error; FR38) — **Given** a Moderator or regular Admin without Super Admin rights, **when** they try to create, merge or deactivate a tag group, **then** the action is refused server-side and nothing changes.

## Epic 6 — Treatment stories (EPIC-REV-001)

### US6.1 — Quick Review wizard (STORY-REV-001)

As a patient or family caregiver with a confirmed adult account who wants to share one care episode I lived through or witnessed, I want a short, mobile-friendly step-by-step wizard that asks only for the minimum fields, autosaves my draft and shows me exactly what will be public before I publish, so that I can share a specific experience quickly on my phone without losing work, without being forced to rate the provider, and without exposing private details I did not intend to publish.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR39, FR40, FR43, FR44
- **Depends on:** US3.1, US4.1, US3.3
- **INVEST:** Independent of other review stories once accounts, doctor profiles and identity choice exist; Small enough for one Unit (backlog size L). FR44's file-processing clause touches evidence (US7.1) but only the text-publication behaviour is tested here. Ratings and consent verification stay out (FD-014).

**Acceptance criteria**

- **AC6.1.1** (happy; FR39, FR40 (FR-REV-001, FR-REV-002), FD-014) — **Given** a signed-in confirmed adult account on the Quick Review wizard for a doctor profile, **when** they enter the provider, a short experience description, their relationship to the patient with the experience/privacy attestation, and one condition, symptom or free-text tag (or choose Not sure), leaving sentiment, outcome and evidence empty, and publish from the final preview, **then** the preview shows only the public projection of the review, publication succeeds, and no numerical rating field is offered at any step.
- **AC6.1.2** (edge; FR39 (FR-REV-001)) — **Given** a review draft on step three of the wizard, **when** the user moves Back and Next, or leaves the page and returns later on the same account, **then** the progress indicator shows the current step and every entered field is restored from the server-side autosave of the draft.
- **AC6.1.3** (error; FR40 (FR-REV-002), FD-014) — **Given** a draft that has no tag and no Not sure choice, or no relationship attestation, **when** the user tries to publish, **then** publication is refused, the missing field is named in an error announced to assistive technology in the active language (en or bn), and the draft is kept.
- **AC6.1.4** (edge; FR43 (FR-REV-005), FR44 (FR-REV-006)) — **Given** an account that already published a review of a doctor for one condition, **when** it submits a second review of the same doctor for a distinct condition, and later a review repeating the same episode, **then** the review for the distinct condition publishes; the review repeating the same episode also publishes (text reviews publish after the automated checks) but is flagged as suspicious repetition for moderator review.
- **AC6.1.5** (error; FR44 (FR-REV-006), FD-009) — **Given** review text containing a phone-number pattern or an emergency word, **when** the user submits it for publication, **then** the composer's pattern checks (phone-number personal data, emergency words, duplicates) run before publication and show their finding as a warning the author can act on or dismiss; publication then proceeds, and no automated threat or dangerous-advice classifier is applied.
- **AC6.1.6** (edge; FR44 (FR-REV-006)) — **Given** a review whose text passes the pattern checks and has an attached image still in processing, **when** the review is published, **then** the text review is public at once and the file shows Processing privately to the author, never in the public view, until the technical pipeline approves it.

### US6.2 — Detailed treatment timeline (STORY-REV-002)

As a patient or caregiver documenting a long treatment episode, I want a detailed timeline with optional structured sections, month/year dates and references to later providers, kept clearly separate from the care I am reviewing, so that readers can follow what happened, in order, and tell the reviewed care apart from later or alternative care without my claims being presented as platform findings.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR39, FR41, FR42, FR45, FR46, FR47, FR55
- **Depends on:** US6.1
- **INVEST:** Depends on the Quick Review wizard (US6.1) for the shared minimum and publication path, so not fully Independent; Valuable and Testable alone. Clinical correctness claims are out of scope. Admin configuration of optional fields and labels is covered by US11.1 and not tested here.

**Acceptance criteria**

- **AC6.2.1** (happy; FR39, FR41 (FR-REV-001, FR-REV-003)) — **Given** a confirmed account completing the Detailed Treatment Timeline in the step-by-step wizard, **when** they fill some sections (for example symptoms/context, treatment/procedure and medicines) and leave others empty, then preview and publish, **then** the filled sections appear in chronological order as semantic ordered content, empty sections are omitted with no blank headings, and the publishable minimum is the same as the Quick Review.
- **AC6.2.2** (edge; FR42 (FR-REV-004)) — **Given** a timeline entry with an exact treatment date, **when** the review is published, **then** the public view and public projection show only month and year, while the exact date remains visible only to the author and to moderation.
- **AC6.2.3** (edge; FR45, FR46 (FR-REV-007, FR-REV-008)) — **Given** an author who skips the Positive/Mixed/Negative choice but ticks What went well and What could improve checkboxes, **when** the review is published with default configuration, **then** publication succeeds, the experience shows Not provided rather than a value or 0, the checkboxes appear as selected text, and no numeric score is computed or shown.
- **AC6.2.4** (happy; FR47 (FR-REV-009)) — **Given** an author who adds the suggested label Wrong diagnosis, **when** the review is viewed publicly in en and bn, **then** the label is visibly prefixed Reviewer's label and framed as the author's claim, never as a RogiKotha finding or validation.
- **AC6.2.5** (error; FR55 (FR-EVD-003)) — **Given** a timeline naming one later provider that has a RogiKotha profile and one that does not, **when** the review is published, **then** the first is linked to its profile, the second shows as unlinked text with an offer to submit a profile, both stay separated from the reviewed care, and neither provider's summary changes nor gains a review.

### US6.3 — Drafts, follow-ups, corrections and deletion (STORY-REV-003)

As an author of a published review, I want to correct, follow up on, delete and restore my review with every material change dated and visible, so that I can report how things turned out or withdraw my account, while readers and people in the discussion still understand what was originally said and nothing is silently rewritten.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR69, FR70, FR71
- **Depends on:** US6.1, US6.2
- **INVEST:** Depends on published reviews (US6.1, US6.2); large (XL) but one coherent lifecycle. Draft autosave is FR39, owned and tested in US6.1; the backlog's FR-REV-008/009 sources are re-keyed (FD-045) and not covered here. Legal-hold handling belongs to US7.3.

**Acceptance criteria**

- **AC6.3.1** (happy; FR69 (FR-EDIT-001)) — **Given** a published review, **when** the author edits a non-substantive presentation field, **then** the change is shown with an Edited timestamp and no correction or follow-up entry is created.
- **AC6.3.2** (happy; FR69 (FR-EDIT-001), FD-004, FD-005, FD-020) — **Given** a published review, **when** the author changes its diagnosis, treatment or outcome, **then** the change is published as a dated correction or follow-up, the original account stays readable, and the prior version is retained privately for the configured audit period (default 180 days, applying to future records).
- **AC6.3.3** (error; FR70 (FR-EDIT-002)) — **Given** a review with two follow-ups posted on different dates, **when** anyone views it, and the author tries to mark the older follow-up as current, **then** follow-ups appear chronologically below the original, the newest reported status is summarized at the top, and the attempt to pin the older one as current is refused.
- **AC6.3.4** (happy; FR71 (FR-EDIT-003)) — **Given** one review with comments and one without, **when** the author deletes each, **then** the commented review is replaced by a Review deleted tombstone, the other is removed, and both leave the provider's summaries immediately.
- **AC6.3.5** (edge; FR71 (FR-EDIT-003)) — **Given** a review the author deleted, under a controlled clock, **when** the author restores it on day 29 and tries to restore another on day 31, **then** the day-29 restore succeeds and summaries recalculate to include it, and the day-31 restore is refused because the 30-day window has passed.

### US6.4 — Narrative sentiment and outcome summaries (STORY-REV-004)

As a visitor comparing doctors for my family's condition, I want summaries that show exact counts, percentages and denominators of reported experiences and outcomes, with no score, so that I can judge the pattern of real accounts myself without a number pretending to measure a doctor's quality.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR48, FR49, FR50, FR51, FR52
- **Depends on:** US6.1, US6.3
- **INVEST:** Depends on published and deleted/restored reviews (US6.1, US6.3); Testable with zero/one/sparse/mixed synthetic fixtures. The limited-data threshold uses the placeholder 5 (Assumptions, deferred product decision). Staff freeze and eligibility actions are exercised only for their effect on summaries.

**Acceptance criteria**

- **AC6.4.1** (happy; FR48 (FR-SUM-001)) — **Given** a doctor with 12 eligible public reviews in the synthetic corpus, **when** a visitor opens the doctor or condition summary in en and bn, **then** it shows Positive/Mixed/Negative and Helped/No improvement/Worsened/Uncertain as counts and percentages with their denominators, the review count, the document count and common condition tags, with numerals in the active language and no star, rating or combined score anywhere.
- **AC6.4.2** (edge; FR51 (FR-SUM-004)) — **Given** a doctor with 3 eligible reviews (below the placeholder threshold of 5), two without sentiment or outcome and none with documents, **when** the summary renders, **then** it shows the exact count 3 with Limited data, missing sentiment and outcome as Not provided, and documents as No documents, never as 0.
- **AC6.4.3** (edge; FR49 (FR-SUM-002)) — **Given** a doctor who also works at a facility that has its own feedback, **when** both summaries render, **then** the facility summary uses the same optional sentiment model and non-scored feedback, and no facility feedback is counted in the doctor's summary, checked at query level.
- **AC6.4.4** (error; FR50 (FR-SUM-003)) — **Given** a summary including one review that is then removed and one that a Super Admin marks ineligible through a recorded moderation action, **when** the summary recalculates, and the removed eligible review is later restored, **then** neither counts while removed or ineligible, and the restored eligible review is counted again.
- **AC6.4.5** (error; FR52 (FR-SUM-005)) — **Given** two reviews with the same sentiment where one has many likes, comments and attached evidence, **when** the summary and search ranking are computed, and an administrator looks for a way to change a review's sentiment, **then** both reviews count equally in the distributions and ranking, and no administrator action exists to rewrite user sentiment (only hiding ineligible reviews or temporarily freezing the summary).

## Epic 7 — Safe supporting documents (EPIC-EVID-001)

### US7.1 — Quarantine-first upload and processing (STORY-EVID-001)

As a public user attaching supporting images to my own review, I want to upload JPEG or PNG files that are checked, scanned and cleaned in private before any copy can be published, so that I can support my account with documents without unsafe files or hidden metadata reaching other readers, and my text review stays public even when a file fails.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo (narrowed by FD-036: JPEG and PNG only; PDF, WebP, HEIC, Office, TXT and RTF intake is Phase 2)
- **Requirements:** FR60, FR61, FR62, FR66, FR68, NFR2
- **Depends on:** US6.1
- **INVEST:** Independent of the viewer story; small enough as images-only (FD-036) though XL; testable through the fail-closed pipeline and limit checks; the PRD's document formats are excluded rather than deferred criteria.

**Acceptance criteria**

- **AC7.1.1** (happy; FR60, FR62, FD-036) — **Given** an author adding evidence to a review, **when** they upload a JPEG or PNG whose extension, MIME type and magic bytes agree, **then** the file is stored in private quarantine, scanned with ClamAV, re-encoded with its metadata removed, and only the processed copy becomes eligible for publication.
- **AC7.1.2** (error; FR60, FR62, FD-036) — **Given** an author adding evidence, **when** they upload an executable, script, archive, encrypted or macro-enabled file, a non-JPEG/PNG format, or a file whose extension does not match its MIME type or magic bytes, **then** the file is rejected before processing and no copy of it is ever published.
- **AC7.1.3** (edge; FR61) — **Given** a review that already has 10 files, or an upload that would exceed 15 MB for one file or 100 MB in total, **when** the author tries to add it, **then** the upload is refused before scanning or re-encoding starts, with the limit that was hit stated.
- **AC7.1.4** (error; FR62, FR66, Constraints (fail-closed ClamAV)) — **Given** a file whose malware scan fails, finds malware, or cannot run because the scanner is unavailable, **when** the processing job finishes, **then** the file is not published, the text review stays public, and the author privately sees the exact rejected file, the reason, Replace and Remove actions, and guidance such as photographing the document.
- **AC7.1.5** (edge; NFR2) — **Given** an evidence item whose processing takes longer than the normal 5-minute target, **when** the author views the review, **then** the item shows its current processing status and no completion time is promised.
- **AC7.1.6** (edge; FR68 (FR-FILE-009), FR62 (FR-FILE-003), NFR8, Constraints (PRD §9.2 logs)) — **Given** processed evidence on a published review, **when** the search index, the operational logs and the processed image are inspected, **then** no evidence filename or image metadata appears in the logs or the search index, the processed image carries no embedded metadata, and evidence pages carry noindex.

### US7.2 — Privacy preview and public processed viewer (STORY-EVID-002)

As a public user publishing evidence on my review, or a visitor reading it, I want to preview and redact the exact processed copy before it publishes, and to read published images in a clear viewer grouped by treatment path, so that my personal details are removed before anyone sees them, and readers can follow the treatment timeline without the platform presenting the documents as medically validated.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo (narrowed by FD-036: images only; document page previews, multi-page comparison and PDF download are Phase 2)
- **Requirements:** FR53, FR54, FR56, FR57, FR59, FR63, FR64, FR65
- **Depends on:** US7.1, US6.2
- **INVEST:** Valuable and testable, but large: it joins the author redaction flow and the public viewer; it could split into preview/redaction and viewer stories if Units Generation needs it. Automated PII detection and the persistence warning stay out (FD-003, FD-023).

**Acceptance criteria**

- **AC7.2.1** (happy; FR63, FR64, FD-036) — **Given** an author whose image has finished processing, **when** they open the evidence flow, **then** they see a privacy warning listing patient name/photo, contacts, address, identifiers, record numbers, QR/barcodes and signatures to hide while keeping provider and facility details, plus a preview of the processed image with manual redaction tools.
- **AC7.2.2** (happy; FR63, FD-023) — **Given** an author who has drawn redactions on the processed image, **when** they confirm that unnecessary personal information is removed, **then** the redaction is flattened into the image pixels so the hidden content cannot be recovered, and only that confirmed copy can publish.
- **AC7.2.3** (error; FR63, FD-023) — **Given** an author who has not confirmed the processed copy, **when** they choose Skip privacy editing or try to publish, **then** Skip privacy editing requires an extra confirmation, and nothing publishes until the author has confirmed the processed copy.
- **AC7.2.4** (edge; FR53, FR54, FR59, project.md hard rules) — **Given** a review with evidence attached in some of the Reviewed treatment, Later/alternative treatment and Outcome/follow-up sections, **when** a visitor opens the review, **then** evidence appears in its own section on a chronological timeline, a used Later/alternative treatment section shows its required short description, and empty sections show "No documents" rather than 0.
- **AC7.2.5** (edge; FR56, FR57, project.md hard rules) — **Given** published evidence and a reviewer's statement that a later doctor confirmed a different diagnosis, **when** a visitor reads the review, **then** the evidence reads "Documents attached — not medically validated" with uploaded by reviewer and privacy not independently checked, the statement shows as Reviewer's label with the platform disclaimer, and no "verified", "approved" or Proven wrong treatment label appears.
- **AC7.2.6** (error; FR65, FR59, FD-036, NFR6) — **Given** a visitor in the public viewer, **when** they zoom, pan, go fullscreen, rotate, page between the images of a group, or download, **then** each action works by keyboard as well as pointer, the download returns the processed image, and every request for the original upload is refused.

### US7.3 — Custody, retention, holds and removal (STORY-EVID-003)

As a super admin or authorized staff member responsible for evidence custody, I want original uploads deleted on a predictable logged schedule, with per-record legal holds and previewed bulk changes for existing records, so that authors can trust that originals do not linger, while preservation needed for a legal matter is scoped, accountable and never a silent global extension.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR67, FR86, FR83, FR65
- **Depends on:** US7.1, US7.2, US1.1
- **INVEST:** Testable with a controllable clock and audit assertions; depends on the evidence pipeline and the foundation configuration port; the Admin dashboard story only consumes these commands. Restore from backup is out of scope (master plan §9). Nine criteria: the story is large (custody, retention, holds, removal), so Units Generation may split custody/removal from retention/holds.

**Acceptance criteria**

- **AC7.3.1** (happy; FR67, FD-004) — **Given** an original upload with the default 90-day retention and no legal hold, **when** its retention deadline passes and the retention job runs, **then** the encrypted original is permanently deleted, the deletion is logged, and the public processed copy stays under review retention.
- **AC7.3.2** (edge; FR67, FD-005, FD-020) — **Given** a super admin who changes the original-retention default, **when** the change is saved, **then** the old value, new value, actor and result are logged, the new default applies only to records created afterwards, and existing records keep their deadlines.
- **AC7.3.3** (happy; FR67, FD-020, FD-051) — **Given** existing records whose retention should change, **when** a super admin runs the bulk retention action, **then** they first see a preview of the exact affected records, the change applies only after confirmation, and it is logged as a separate bulk action.
- **AC7.3.4** (error; FR67, FD-051, Constraints (server-side authorization)) — **Given** an admin or moderator who is not super admin, **when** they attempt a bulk retention action, **then** the server refuses it and no deadline changes.
- **AC7.3.5** (edge; FR86, FD-021) — **Given** a record placed under an individual legal hold, **when** its scheduled deletion date passes, **then** the content is hidden publicly, its encrypted data, evidence and audit records are kept, deletion is paused for that record only, and actor, reason, creation time and expiry are logged.
- **AC7.3.6** (edge; FR86, FR67, FD-021) — **Given** a record whose legal hold is released or has expired, **when** the retention job next runs, **then** the release is logged and the ordinary deletion schedule applies again to that record, while other records are unaffected.
- **AC7.3.7** (happy; project.md Mandated (original evidence is a separate, audited permission), Constraints (PRD §9.2)) — **Given** a staff member who holds the original-evidence permission, **when** they open an original upload and state a purpose, **then** the original is shown only to them, and a custody event recording actor, time, item and purpose is written.
- **AC7.3.8** (error; project.md Mandated, FR65 (FR-FILE-006: originals are never public), Constraints (PRD §9.2)) — **Given** a staff member without the original-evidence permission, or any public user, **when** they request an original upload, including by its direct URL, **then** the server refuses it, nothing of the original is returned, and the refused attempt is logged.
- **AC7.3.9** (edge; FR83 (FR-MOD-005), FR86) — **Given** a published processed image that staff remove as unsafe, **when** the removal is saved with its reason code, **then** the public copy is no longer served, the review shows the item as removed, and the removal is written to the custody log and the audit trail.

## Epic 8 — Contextual discussion (EPIC-COM-001)

### US8.1 — Comments, flat replies, mentions and advice warning (STORY-COM-001)

As a confirmed public user (patient or caregiver) taking part in a review discussion, I want to comment on a review with text, warned external links, one level of replies and @mentions, and to edit or delete my comments, while a persistent advice warning stays in view, so that I can share and ask about real care experiences in context, while readers stay aware that comments are not professional medical advice and can report unsafe advice.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR22, FR72, FR73, FR74, FR75
- **Depends on:** US3.1, US6.1
- **INVEST:** Independent of other comment features once accounts and reviews exist; valuable and testable. Large (L): edit history, tombstones and provider labelling could be split if estimation demands. FR75's moderator-review half is shared with US9.1, which owns the report-driven hide; FR-COM-003 emergency banner is retired (FD-046) and not covered.

**Acceptance criteria**

- **AC8.1.1** (happy; FR74) — **Given** a confirmed user viewing a review's discussion, **when** they post a comment with text and an external link, and another user replies to it, **then** the comment shows the text, the link is shown with an external-link warning, the reply appears one level under the comment, and the reply offers no further nested reply level.
- **AC8.1.2** (happy; FR75, FD-009, FD-017) — **Given** a user composing or reading comments on a review, **when** the comment area is displayed, **then** a persistent, non-modal medical-advice disclaimer is visible, no automated classification or professional verification is applied to the text, and an unsafe/misleading-advice report reason is reachable from each comment.
- **AC8.1.3** (happy; FR73) — **Given** a user's published comment, **when** they edit it, **then** the comment shows an Edited timestamp, the previous text is kept only in private version history, and the public view shows only the current text.
- **AC8.1.4** (edge; FR72) — **Given** a user deletes a comment, **when** the comment has replies that depend on it, or has none, **then** with replies a tombstone takes its place for the configured retention period; without replies it is removed completely; in both cases the deleted text is not publicly visible and stays only in private history for the configured period.
- **AC8.1.5** (happy; FR22 (FR-DOC-008), FR81) — **Given** a provider who has claimed a profile, **when** they comment on a review of their own profile, **then** the comment is created through the same comment flow as any user, carries the applicable public role/status label, and no separate review-response channel or extra placement exists; a provider comment that discloses patient identity or private medical information can be reported under the privacy reason and is hidden on that first report.
- **AC8.1.6** (error; FR74) — **Given** a comment containing images, document attachments, a reply to a reply, or an attempt to send a private message, **when** the user tries to submit it, **then** the action is not offered or is refused with a localized message in the active language, and nothing is stored.

### US8.2 — Like/dislike engagement (STORY-COM-002)

As a confirmed public user reading reviews and comments, I want to Like or Dislike a review or comment, change or remove my reaction, and see who reacted, so that I can give lightweight feedback on helpful discussion without that feedback turning into a quality score or changing how doctors are summarized or ranked.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR77, FR78
- **Depends on:** US3.1, US3.3
- **INVEST:** Small, independent once accounts and identity modes exist; each criterion is pass/fail. FR78 is shared with US3.3, which owns the anonymous-alias projection itself; this story tests that reactions respect it. Comments take Like and Dislike (FD-062), so the data model changes in Domain Design.

**Acceptance criteria**

- **AC8.2.1** (happy; FR77 (FR-REA-001), FD-062) — **Given** a confirmed user who has not reacted to a comment, **when** they press Like, then press Dislike, **then** exactly one current reaction (Dislike) is stored for that user and content, the Like count drops by one and the Dislike count rises by one.
- **AC8.2.2** (edge; FR77) — **Given** the same user submits the same reaction twice, or two concurrent requests for it, **when** both requests are processed, **then** one reaction remains and the displayed count is accurate (not double-counted).
- **AC8.2.3** (edge; FR77, FR78, FD-015) — **Given** a review published under an anonymous per-thread alias, **when** anyone views the public reaction list on that thread, or the author's public activity, **then** reactions made in that thread show only the alias, the list exposes no link to the author's normal profile, and those reactions do not appear on the author's public activity.
- **AC8.2.4** (happy; FR77, FR78) — **Given** a user who reacted under their chosen public identity, **when** they open the content, their public activity and their own dashboard, **then** the reaction appears on the content, on public activity (outside anonymous threads) and on their dashboard, using their chosen display identity.
- **AC8.2.5** (edge; FR78) — **Given** a doctor whose reviews receive many Likes or Dislikes, **when** the doctor's summaries, search ranking and moderation queue are computed, **then** they are unchanged by the reactions, and no reaction count is shown as a rating or score.
- **AC8.2.6** (error; FR77; Constraints (PRD §9 rate limits)) — **Given** an account that is not confirmed, or that has reached the 100 reactions/hour limit, **when** it tries to react, **then** the reaction is refused server-side with a localized message and counts are unchanged.

## Epic 9 — Reporting and fair enforcement (EPIC-MOD-001)

### US9.1 — Report intake and five-account temporary hide (STORY-MOD-001)

As a confirmed public user who sees harmful or unsafe content, I want to report a review, comment, evidence item, profile or account with a reason, knowing my identity stays restricted, so that broadly reported or dangerous content is limited quickly without an automated classifier, and I am not exposed to the person I reported.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR75, FR79, FR80, FR81
- **Depends on:** US3.1, US6.1, US8.1
- **INVEST:** Testable and valuable; Extra large (XL) and high-risk (moderation), so it runs with collaborators and adversarial tests. Could be split into intake/notice and threshold-hide if needed. FR75 is shared with US8.1, which owns the disclaimer; here only the report-driven moderator review.

**Acceptance criteria**

- **AC9.1.1** (happy; FR79, FR75, FD-017, FR81 (unsafe file)) — **Given** a confirmed user viewing a review, comment, evidence item, profile or account, **when** they open the report flow, **then** they can choose from the currently configured reasons (including privacy, threats, unsafe file, harassment, hate, spam, impersonation, dangerous advice, copyright/ownership, duplicate, off-topic, factual dispute and Other), submit, and a report with the reason is recorded.
- **AC9.1.2** (happy; FR80) — **Given** a report on a user's content, **when** the reported person views their notices, and later a decision is made, **then** they first receive a generic Content reported notice, then the action, policy reason and appeal path, and neither notice nor any public projection shows the reporter's identity.
- **AC9.1.3** (error; FR80; Constraints (hard rules, PRD §9)) — **Given** a staff user without explicit reporter-identity permission opening the report, **when** the report detail is shown, **then** the reporter field reads "restricted" (never blank), while Super Admin or a user with explicit permission sees the identity and that access is logged.
- **AC9.1.4** (happy; FR81 (FR-MOD-003), FD-017) — **Given** an eligible policy report reason other than factual dispute, **when** reports from five distinct confirmed accounts accumulate (repeat reports from one account count once, and the threshold is configurable), **then** the content is temporarily hidden exactly once, a reason-coded moderation queue item and an audit event are created, and authorized staff can restore it with a logged reason; when the reports show a coordinated pattern, the case carries a coordination signal for the moderator.
- **AC9.1.5** (edge; FR81) — **Given** content reported only as factual dispute, by any number of accounts, **when** the reports are processed, **then** the content is never auto-hidden and stays visible pending moderator review.
- **AC9.1.6** (edge; FR81 (FR-MOD-003), FD-009, FD-017) — **Given** a first report whose reason is privacy, threat or unsafe file, **when** it is submitted by a confirmed account, **then** the content is hidden immediately, without waiting for the five-account threshold and without any automated detection, and a critical moderation case is opened.

### US9.2 — Moderation queue and bounded actions (STORY-MOD-002)

As a moderator or Admin working the moderation queue, I want a prioritized queue of reports with review targets and a bounded set of reason-coded actions (redact identifiers, remove unsafe files, add warnings, hide or restore), so that I can resolve harmful content quickly and reversibly without ever rewriting a patient's own medical story.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR82, FR83, FR73
- **Depends on:** US9.1
- **INVEST:** Testable and valuable; XL and high-risk (moderation). Depends on US9.1 for queue items. Targets in FR82 are Beta goals, tested as displayed priorities/due times, not as service guarantees.

**Acceptance criteria**

- **AC9.2.1** (happy; FR82) — **Given** open critical and standard reports and pending appeals in the queue, **when** a moderator opens the queue, **then** critical items show a 24-hour review target, standard items three business days and appeals seven business days, ordered by priority, with priority and status conveyed by text and not by color alone.
- **AC9.2.2** (happy; FR83) — **Given** a reported review containing a private identifier, **when** an Admin redacts the identifier with a reason, **then** only the identifier is replaced in the public view, the action, reason and public effect are recorded in the audit log, and the rest of the narrative is unchanged.
- **AC9.2.3** (happy; FR83) — **Given** a reported item, **when** an Admin removes an unsafe file, adds a warning, hides it or restores it, **then** each action requires a reason, is recorded with actor, reason and public effect, and the public projection reflects it.
- **AC9.2.4** (error; FR83) — **Given** an Admin who wants to change the substantive medical story of a review, **when** they look for or attempt an edit of the narrative through moderation, **then** no moderation command changes the narrative text; the only option is to ask the author to revise, and the attempt leaves the narrative unchanged.
- **AC9.2.5** (error; FR83; Constraints (server-side authorization, PRD §9)) — **Given** a user without moderation permission, **when** they call any moderation action directly, **then** the server refuses it, nothing changes and the refusal is audited.
- **AC9.2.6** (edge; FR73 (FR-EDIT-005)) — **Given** a comment that breaks a rule whose violation type allows permanent deletion, **when** an Admin or Super Admin with that capability permanently deletes it and confirms, **then** the comment is removed for good, the deletion is recorded in the audit trail with its violation type, and a staff member without the capability is refused.

### US9.3 — Appeals, blocking and enforcement lifecycle (STORY-MOD-003)

As a founder (Super Admin) deciding appeals and applying enforcement, serving users who appeal or block others, I want to reconsider appeals with a fresh checklist and written reason, apply configured enforcement actions with audit, and let users block each other, so that affected users get a fair second look, enforcement is consistent and traceable, and users can stop unwanted interaction without breaking public discussion.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR12, FR84, FR85
- **Depends on:** US9.2, US10.1
- **INVEST:** Testable; L and high-risk (moderation). Blocking (FR12) is a user-facing behaviour bundled here per the backlog; could split into its own Public user story if estimation needs it. Independent second appeal review is future scope and not covered.

**Acceptance criteria**

- **AC9.3.1** (happy; FR84) — **Given** an affected user with an eligible appeal containing appeal text and new evidence, **when** the founder reconsiders it, **then** a fresh checklist is completed, a new written reason is recorded, the resulting visibility or enforcement transition is applied and logged, and the appellant is told the outcome.
- **AC9.3.2** (error; FR84, FR80) — **Given** an appellant viewing their appeal and its outcome, **when** any appeal screen or notice is shown, **then** the reporter's identity is never shown.
- **AC9.3.3** (happy; FR85) — **Given** Super Admin has configured the available enforcement actions and durations, **when** staff apply a content warning, temporary restriction, feature restriction, temporary suspension or permanent ban, **then** only configured actions and durations are offered, the action takes effect, and an audit record with actor and reason is written.
- **AC9.3.4** (error; FR85) — **Given** an enforcement action not enabled in configuration, or a duration outside the configured set, **when** staff try to apply it, **then** the server refuses it and no state changes.
- **AC9.3.5** (edge; FR12) — **Given** user A blocks user B, **when** B tries to reply to, mention or view A's nonessential activity, and others view the shared discussion, **then** B's direct interaction and mention are refused, A's nonessential activity is hidden from B (and B's from A), and public content in the discussion stays available to everyone else.

## Epic 10 — Personal workspace (EPIC-USER-001)

### US10.1 — In-app and essential email notifications (STORY-NOTIF-001)

As a signed-in user who has written reviews, comments or reports, I want to receive status and security notices in an in-app notification centre and only content-free emails, so that I know what happened to my contributions and my account without medical details leaking through my email.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR87, FR88
- **Depends on:** US3.1
- **INVEST:** Depends on US3.1 accounts and the job runner (not a backlog story, so not mapped); valuable alone; estimable (L); testable with retry, preference and retention fixtures. Push, SMS and full previews are future scope and carry no criteria.

**Acceptance criteria**

- **AC10.1.1** (happy; FR87 (FR-NOT-001)) — **Given** a signed-in user, **when** one of their review publications or failures, evidence processing steps, comments, replies, mentions, reactions, report decisions or appeals, provider profile approvals or claims, account security events or deletion notices occurs, **then** an item for it appears in their in-app notification centre and can be marked read.
- **AC10.1.2** (error; FR87 (FR-NOT-001)) — **Given** a notification job that is delivered more than once after a retry, **when** the user opens the notification centre, **then** exactly one item for that event is shown.
- **AC10.1.3** (edge; FR87 (FR-NOT-001)) — **Given** notification items older than 90 days, **when** the user opens the notification centre, **then** those items are no longer kept or shown, and items 90 days old or newer still are.
- **AC10.1.4** (happy; FR88 (FR-NOT-002), FD-047) — **Given** an essential event (verification, security, recovery, legal or policy, scheduled deletion), **when** its email is sent, **then** the email and its job payload carry identifiers and minimal copy only, with no review narrative, medical content or document data.
- **AC10.1.5** (edge; FR88 (FR-NOT-002), FD-047) — **Given** a user who has turned an optional email category (discussion, evidence or moderation) off, **when** an event in that category occurs, **then** no email is sent and the in-app item still appears; with the category on, the email is sent and is content-free.

### US10.2 — Public profile and activity privacy (STORY-USER-001)

As a contributor with a mix of named, pseudonymous and anonymous activity, I want a public profile that shows my public contributions and reactions and nothing else, so that other users can see my public record while my anonymous reviews and private bookmarks stay unlinked and hidden.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR10, FR11
- **Depends on:** US3.3, US8.2
- **INVEST:** Depends on US3.3 identity and US8.2 reactions; valuable as the public-profile surface; estimable (M); testable with mixed-identity fixtures in both locales. FR10 is shared with US3.3, which owns the per-review choice and staff reveal; here it covers only the profile projection.

**Acceptance criteria**

- **AC10.2.1** (happy; FR11 (FR-USER-002), FR10 (FR-USER-001)) — **Given** a user with public reviews, comments and reactions, **when** anyone opens their public profile, **then** it shows their username and display name with those public contributions and reactions, each under the identity shown on the content itself.
- **AC10.2.2** (happy; FR11 (FR-USER-002)) — **Given** a public profile page, **when** its response is inspected, **then** it is marked noindex for search engines.
- **AC10.2.3** (error; FR11 (FR-USER-002), FR10 (FR-USER-001), FD-015) — **Given** a user who also has anonymous reviews and activity in those anonymous threads, **when** their public profile and activity list are requested, **then** none of the anonymous reviews or their thread activity appear.
- **AC10.2.4** (error; FR11 (FR-USER-002)) — **Given** a user with saved bookmarks, **when** another user or a logged-out visitor views their public profile, **then** no bookmark appears.
- **AC10.2.5** (edge; FR11 (FR-USER-002), Constraints (equal Bengali/English, missing value never 0)) — **Given** a user with no public contributions, **when** their public profile is viewed in Bengali and in English, **then** an empty state is shown in the active language instead of a blank page or a zero count.

### US10.3 — Dashboard, preferences, feedback and data requests (STORY-USER-002)

As a signed-in user managing my own account and data, I want one private dashboard for my bookmarks, optional profile details, feedback, data export and account deletion, so that I control my own data and can leave without my retained public contributions still pointing to me.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR13, FR14, FR89, FR90
- **Depends on:** US3.2, US6.3
- **INVEST:** Depends on US3.2 and US6.3; valuable as the user's control point; XL and high-risk (deletion, retention), so it may split into data requests and dashboard/feedback at Units Generation; each criterion is testable with held/unheld and private/public fixtures. Following and reminders (FR89) are future scope and carry no criteria.

**Acceptance criteria**

- **AC10.3.1** (happy; FR13 (FR-USER-004), FD-035) — **Given** a signed-in user, **when** they request an account export, **then** an export request with a visible status is created and an export bundle job produces a bundle that contains only that user's own data.
- **AC10.3.2** (error; FR13 (FR-USER-004), FD-035) — **Given** a signed-in user, **when** they try to open or download another user's export or data request, **then** the request is refused and nothing of the other user's data is returned.
- **AC10.3.3** (edge; FR13 (FR-USER-004), FD-035, FD-021) — **Given** a user with published reviews and comments, some records under an individual legal hold, **when** they request account deletion and the deletion runs, **then** a traceable request with status is created, their retained public contributions are de-identified rather than deleted, and records under an active legal hold are not deleted until the hold is released.
- **AC10.3.4** (happy; FR14 (FR-USER-005)) — **Given** a user editing their optional profile details, **when** they set or leave blank an exact age or age range, gender and relevant-condition tags, **then** each field can be saved or left empty, and no date-of-birth field is offered.
- **AC10.3.5** (edge; FR89 (FR-NOT-003)) — **Given** a user with saved bookmarks, **when** they open their dashboard, **then** their bookmarks are listed there and visible only to them, and no follow or follow-up reminder option is offered.
- **AC10.3.6** (happy; FR90 (FR-FDB-001)) — **Given** any page with the persistent Feedback action, **when** a user submits feedback with a category from the admin-configured list, a description, an optional screenshot and their permission choice for contact, **then** the feedback is saved with those fields, and the screenshot step shows a warning not to include sensitive medical data before upload.

## Epic 11 — Bounded operations (EPIC-ADMIN-001)

### US11.1 — Versioned runtime configuration and capabilities (STORY-ADMIN-001)

As a super admin who runs the platform's settings, I want to change wording, taxonomy, limits, retention, roles and other bounded settings at runtime, with history, export/import and restore, so that the product can adapt without a deployment while every change stays accountable and the platform's security and data boundaries cannot be switched off.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR38, FR100, FR101, FR102, FR45, FR47, FR75
- **Depends on:** US1.1
- **INVEST:** Valuable and testable per setting type, but large (XL); FR38 is shared with US5.3, which owns the taxonomy model, and this story owns its Super Admin management. Structural schema, security and audit settings stay deployment-controlled (FD-018).

**Acceptance criteria**

- **AC11.1.1** (happy; FR100, FR102, FD-018, FR45, FR47, FR75) — **Given** a super admin changing a configurable setting such as a label translation, limit, report threshold, warning, emergency contact, feature visibility, whether sentiment is optional, the label-approval workflow, or the dangerous-advice visibility policy, **when** they save it, **then** the new value takes effect without a deployment, and actor, timestamp, previous value, new value and result are recorded.
- **AC11.1.2** (error; FR102) — **Given** a super admin changing a sensitive setting such as roles, permissions or retention, **when** they submit the change, **then** they must re-enter their password, and a wrong or missing password leaves the setting unchanged with the failed attempt recorded.
- **AC11.1.3** (error; FR101, FD-018) — **Given** a proposed change that would fully disable security-critical logging or alter a structural security or data boundary, **when** the super admin tries to save it, **then** the change is rejected and the current value stays in force.
- **AC11.1.4** (edge; FR101, FR102) — **Given** a safe setting with earlier versions in its change history, **when** the super admin restores a prior value, or exports and then imports the settings, **then** the restored or imported value applies as a new logged version and the history keeps every earlier version.
- **AC11.1.5** (happy; FR38 (FR-TAG-003), FR37 (FR-TAG-002)) — **Given** a super admin managing the taxonomy, **when** they create, rename, merge, redirect, deactivate or reorder a tag group or value, **then** the change applies and appears in the taxonomy's audit history, and every visible submitted form of a merged or aliased tag still opens the canonical page.
- **AC11.1.6** (error; FR100, Constraints (server-side authorization)) — **Given** an admin or moderator who is not super admin, **when** they attempt any of these configuration changes, **then** the server refuses the change and nothing is written.

### US11.2 — Operational dashboards and logged bulk actions (STORY-ADMIN-002)

As an admin or moderator with the matching capability (super admin for retention bulk actions), I want bounded dashboards for moderation queues, evidence failures, profiles, taxonomy, users, claims, notifications, retention and health, with previewed bulk actions, so that I can find and resolve operational work quickly without direct database access, and only see the data my role permits.

- **Persona:** Staff
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR103
- **Depends on:** US4.2, US5.3, US7.3, US9.2, US10.1
- **INVEST:** Depends on the domain epics whose commands it surfaces, so it is not fully independent; testable through permission, preview-drift and idempotency checks; arbitrary SQL or an admin shell is out of scope. "Beta metrics" (FR103): no source defines them and analytics is off (FD-019); carried to Domain Design as an open point.

**Acceptance criteria**

- **AC11.2.1** (happy; FR103) — **Given** an authorized staff member, **when** they open the admin dashboard, **then** they can reach moderation queues, evidence failures, provider profiles, taxonomy, users, claims, permissions, notifications, content eligibility, audit/content history, retention and health checks permitted to their role.
- **AC11.2.2** (error; FR103, Constraints (server-side authorization), project.md Forbidden (reporter identity)) — **Given** a staff member whose role lacks a capability, **when** they open or request that dashboard section or field, **then** the server refuses it and the unauthorized fields never render; reporter identity reads "restricted", never blank.
- **AC11.2.3** (happy; FR103, backlog In scope (previewed bulk commands), FD-020) — **Given** an authorized bulk action, **when** the staff member reviews the preview and confirms, **then** the action runs on the previewed set, or shows an explicit drift warning if the set changed, and records each item's result.
- **AC11.2.4** (edge; FR103, backlog In scope (idempotent bulk commands)) — **Given** a bulk action that partly failed, **when** it is retried, **then** items already done are not applied twice and only the remaining items are processed and logged.
- **AC11.2.5** (edge; FR103, NFR3, project.md hard rules (missing value never 0)) — **Given** the dashboard's health view, **when** a database, queue, mail or scanner probe fails, **then** the failing probe is shown as unhealthy rather than hidden or shown as zero.

## Epic 12 — Recoverable public service (EPIC-OPS-001)

### US12.1 — Equal-language onboarding and accessible policy boundaries (STORY-PLAT-001)

As a new visitor who reads Bengali or English, I want the site to open in my language, remember my choice, and show what RogiKotha is and is not with equal clarity in both languages, so that I understand the service, its limits and where to get emergency help, without either language being second-class.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo (FR76 is retired by FD-046: the static /emergency page replaces the comment banner; FR-ONB-001 in the backlog block is deferred by FD-048 and not covered)
- **Requirements:** FR76, FR91, FR92, FR95, NFR6, NFR7
- **Depends on:** US1.1
- **INVEST:** Independent of other features and testable by locale, parity and accessibility checks. FR76 stays in covers, but only its static /emergency replacement (FD-046) gets a criterion. FR-ONB-001 appears in the backlog block but is deferred (FD-048) and not in this story's rows, so it gets no criterion.

**Acceptance criteria**

- **AC12.1.1** (happy; FR91, FD-024) — **Given** a first visit from a browser whose preferred language is Bengali, **when** the first page renders, **then** the interface is in Bengali with `lang="bn"`, and the Bangla | English switch is visible.
- **AC12.1.2** (edge; FR91) — **Given** a visitor who switched to English although the browser prefers Bengali, **when** they come back later, **then** the interface opens in English, so the stored override wins over browser detection.
- **AC12.1.3** (happy; FR91, FR92) — **Given** the English interface, **when** a user writes mixed Bengali/English/Banglish text, with an optional author-written translation, **then** the text is accepted and shown exactly as written in its original language, any translation is labelled as the author's, and nothing is auto-translated.
- **AC12.1.4** (error; NFR7, FD-024) — **Given** a message key with an English string and no Bengali string (or the reverse), **when** `pnpm i18n:check` runs, **then** the check fails and blocks the build.
- **AC12.1.5** (happy; FR76, FD-046) — **Given** the `/emergency` page in either locale, without signing in, **when** it is opened, **then** it shows 999, 16263 and the crisis-support line with its last-verified date in the active language, and no flow requires visiting it first.
- **AC12.1.6** (happy; FR95, NFR6, NFR7) — **Given** the onboarding and policy pages (Terms, Privacy, disclaimer, emergency) in `en` and `bn`, **when** they are tested keyboard-only and with axe, **then** each has the correct `lang`, landmarks, headings and visible focus, and axe reports no serious or critical violations in either locale.

### US12.2 — Safe progressive web app (STORY-PLAT-002)

As a mobile visitor or patient on an unreliable connection, I want to install the site optionally and get a branded offline page or previously viewed public pages, so that I can keep using RogiKotha on a weak connection, and none of my private health-related content stays on the device.

- **Persona:** Public user
- **Priority:** Must Have
- **Demo status:** In demo
- **Requirements:** FR93, FR94
- **Depends on:** US12.1
- **INVEST:** Independent apart from the bilingual shell and testable by inspecting the cache inventory. Medium size. Its privacy value rests on the cache allowlist.

**Acceptance criteria**

- **AC12.2.1** (edge; FR93) — **Given** a supported browser on a first visit, **when** the page loads, **then** the web app manifest and icons make the site installable, but no install suggestion is shown.
- **AC12.2.2** (happy; FR93) — **Given** a visitor on a second visit or after viewing several pages, **when** the install suggestion appears, **then** it can be dismissed, and dismissing or ignoring it does not block any use.
- **AC12.2.3** (happy; FR94) — **Given** a device that is offline, **when** the visitor opens a public page they viewed before, then a page they never viewed, **then** the viewed non-sensitive public page loads from cache, and the unviewed page shows the branded offline fallback in the active language.
- **AC12.2.4** (error; FR94) — **Given** a signed-in user who opened their dashboard, a review draft, an evidence item and the auth screens, **when** every cache is inventoried, **then** none of those responses, and no authentication data, is in any cache.
- **AC12.2.5** (edge; FR94, backlog In scope (logout purge)) — **Given** a signed-in user, **when** they sign out, **then** no user-specific response is left in any cache.

### US12.3 — Deployment, observability, backup and recovery (STORY-OPS-001)

As a super admin operating the local demo, I want health probes for each dependency, scrubbed structured logs and a documented way to roll the demo back, so that I can see quickly what is broken and restore a working demo, and logs never expose private content.

- **Persona:** Staff
- **Priority:** Should Have
- **Demo status:** Local subset: health probes and scrubbed logs; production deployment, backups and restore drills are out of scope (master plan §9)
- **Requirements:** NFR1, NFR3, NFR10, NFR12
- **Depends on:** none
- **INVEST:** Narrowed to the local subset, so it is small and testable. NFR12 is deferred; only the rollback stated in its row gets a criterion. The backlog's 'production stories' dependency names no story, so dependsOn is empty.

**Acceptance criteria**

- **AC12.3.1** (happy; NFR3) — **Given** the running local demo with all compose services up, **when** `/api/health` is requested, **then** it reports the status of the database, queue, mail and scanner probes, and there is no uptime SLA.
- **AC12.3.2** (error; NFR3, NFR10) — **Given** the ClamAV scanner (or the mail sink) stopped, **when** `/api/health` is requested, **then** that probe reports a failure instead of healthy.
- **AC12.3.3** (error; NFR10, Constraints (scrubbed logs)) — **Given** web and worker actions that handle review text, evidence filenames or reporter identity, **when** the logs are inspected, **then** entries are structured with allowlisted fields only, and none of that content appears.
- **AC12.3.4** (edge; NFR12 (demo rollback), team Deployment) — **Given** a Bolt squash commit on `main` that broke the demo, **when** the commit is reverted and `pnpm db:reset && pnpm db:seed` runs, **then** the demo runs again, with `pnpm check` and `pnpm smoke` green.
- **AC12.3.5** (happy; NFR1) — **Given** the important public pages, **when** performance is measured, **then** the figures are recorded against the ~3 s reference without a pass/fail gate.

### US12.4 — Optional privacy-minimised analytics (STORY-OPS-002)

As a super admin who may later want aggregate product insight, I want analytics to stay entirely off in the demo, so that no medical text, search, alias or identifier ever leaves the app, and no consent banner is needed.

- **Persona:** Staff
- **Priority:** Won't Have (this time)
- **Demo status:** Deferred: FD-019 (analytics is off in the demo; FR99's no-sensitive-data rule still binds any later analytics work)
- **Requirements:** FR99
- **Depends on:** US12.3
- **INVEST:** Deferred: FR97/FR98 analytics and consent get no criteria. The criteria only check that the deferral holds (FR99 still binds), so the story is small and testable through network and cookie inventory. FR97 and FR98 are deferred (FD-019) and traced as N/A; AC12.4.2 stays as a guard that only essential cookies are set. Its guard criteria AC12.4.1–AC12.4.3 (no analytics traffic, nothing sent to third parties; FR99 still binds) must still be assigned to a Unit and verified.

**Acceptance criteria**

- **AC12.4.1** (happy; FR99, FD-019) — **Given** the demo, **when** the full storyboard runs in `en` and `bn`, signed in and signed out, **then** no request goes to any analytics endpoint.
- **AC12.4.2** (edge; FR98, FD-019) — **Given** any page in the demo, **when** its cookies are inspected, **then** only essential security and session cookies are set, and no consent banner is shown.
- **AC12.4.3** (error; FR99, FD-019) — **Given** a search, a review with medical text, or an evidence upload, **when** outbound traffic is captured, **then** no search string, medical text, alias, evidence filename or patient/provider identifier is sent to any third party.

