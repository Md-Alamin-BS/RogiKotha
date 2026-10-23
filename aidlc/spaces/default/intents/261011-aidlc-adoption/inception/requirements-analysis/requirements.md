# Requirements — RogiKotha demo build (AI-DLC adoption)

Transcribed, not re-derived. Every requirement below is the PRD's own text for its ID (`docs/planning/source-extracts/RogiKotha_PRD_v1.0.md`, extracted from `docs/RogiKotha_PRD_v1.0.docx`), with the later binding decisions from `docs/status/decision-log.md` applied on top (FD-045). The PRD IDs are the permanent traceability keys; they are kept exactly and never renumbered. The owner's scope answers at this stage are FD-056..FD-059.

## Intent analysis

- **Goal:** move the RogiKotha demo build, already under way on `main`, onto the AI-DLC process without changing what is being built, then continue the build from CR-009.
- **Product:** a Bangladesh-first, Bengali/English platform for patient-reported doctor and facility experiences. It organises narrative accounts by provider and condition; it never scores quality, diagnoses, or validates evidence.
- **This build:** a locally runnable demo on the local-development composition (FD-031): real Next.js app, PostgreSQL 18, Better Auth, pg-boss worker, filesystem storage, Mailpit, ClamAV, seeded with synthetic data.
- **Type and depth:** brownfield continuation, system-wide, standard complexity; the planning set is complete, so this stage records it rather than eliciting it.

## Sources

- PRD v1.0 extract: `docs/planning/source-extracts/RogiKotha_PRD_v1.0.md` (103 FR, 12 NFR). BRD v1.0 extract: `docs/planning/source-extracts/RogiKotha_BRD_v1.0.md` (53 BR, traced through `docs/planning/01-requirement-baseline.md`).
- Decisions: `docs/status/decision-log.md` D-001..D-007, FD-001..FD-059. Demo scope: `docs/implementation/00-master-plan.md` (§9 out of scope).
- Existing stories: `docs/planning/08-product-backlog.md` (34 stories); matrix: `docs/planning/06-requirement-traceability-matrix.md`.
- Reverse-engineered code: `business-overview.md`, `architecture.md` and `code-structure.md` in `aidlc/spaces/default/codekb/rogikotha/`; team practices: `team-practices.md` from Practices Discovery.
- Readiness check: `docs/planning/research/aidlc-migration-2026-10-23/readiness-report.md`.

## How to read the tables

- **Demo status:** `In` (built as written), `In, changed` / `In, narrowed` (built with the named decision applied), `Deferred` (a later phase; no task builds it), `Retired` (replaced by a decision), `Holds` (a constraint with nothing to build). For NFRs also `In, partly` (some clauses built; what is not built is named in the check column) and `In, local` (built for the local composition only, D11).
- **Story:** the matrix's owning story where its label matches the PRD (FD-045). Every row whose story differs from the matrix, or whose matrix label describes another requirement, is marked ⟲ and listed with its reason in "Re-keyed matrix rows". User Stories confirms these links.
- **Acceptance:** the PRD's own "Acceptance:" lines where it has them. Requirements without one keep the PRD wording; their Given/When/Then criteria are written at User Stories (answer to Q1).

## Functional requirements

### 6.1 Accounts and authentication

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-AUTH-001 | Must | Visitors may search and view public profiles, reviews, comments, sentiment distributions, reported outcomes and processed evidence without an account. Contribution actions require sign-in and confirmed email. **Acceptance:** A logged-out visitor can open a processed evidence viewer. / Write, comment, react, report, bookmark, submit profile and claim actions request authentication. | In | STORY-AUTH-001 |
| FR-AUTH-002 | Must | Registration requires email, password, unique username, public display name, preferred interface language, acceptance of Terms/Privacy and confirmation of age 18+. | In | STORY-AUTH-001 |
| FR-AUTH-003 | Must | Passwords use Argon2id with current OWASP-aligned parameters, unique salts and no plaintext or reversible storage. Minimum length is 10 characters; long passphrases and international characters are allowed. | In | STORY-AUTH-001 ⟲ |
| FR-AUTH-004 | Must | Email verification links expire after 24 hours and support rate-limited resend. Unverified accounts can browse and edit account settings but cannot contribute. | In | STORY-AUTH-001 ⟲ |
| FR-AUTH-005 | Must | Unverified and inactive verified accounts are not automatically deleted by default. Super Admin may enable and configure separate cleanup policies; affected users receive in-app and email notices with reason and scheduled deletion date. | In, narrowed: FD-056: the default (no automatic deletion of unverified or inactive accounts) holds. The optional Super Admin cleanup policy and its notices are deferred. | STORY-AUTH-001 ⟲ |
| FR-AUTH-006 | Must | Normal and administrative sessions last up to 30 days. Users can view active sessions, recent successful logins, failed-login alerts and invoke Logout all sessions. | In, narrowed: FD-057: 30-day sessions, the session list and "Sign out everywhere" (T-101, T-102). Recent successful logins and failed-login alerts are deferred. | STORY-AUTH-002 ⟲ |
| FR-AUTH-007 | Must | New-device administrative login requires email approval and strong-password verification. Phase 1 has no MFA; this is an accepted high-severity risk and a Phase 2 priority. | In | STORY-AUTH-002 |
| FR-AUTH-008 | Must | Repeated login failures trigger progressive delay, suspicious-activity CAPTCHA and severe-activity email/in-app notice. | In, narrowed: FD-058: progressive delay and the severe-activity email/in-app notice are added to T-101/T-502 (carried into Units and Delivery Planning). The suspicious-activity challenge (CAPTCHA) is deferred to production, narrowing FD-013 for the demo. | STORY-AUTH-001 |
| FR-AUTH-009 | Must | Phase 1 recovery is a manual Admin process supported by verified recovery phone and/or verified secondary email. Every reset is audited. Self-service email reset is Phase 2. | In, changed: FD-059: self-service email reset (FD-013, FD-034; T-101/T-102) is the demo's recovery, and every reset is audited. Manual Admin recovery and the recovery phone / secondary email are deferred. | STORY-AUTH-002 ⟲ |

### 6.2 Public account profiles

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-USER-001 | Must | Users choose real-name, pseudonymous or anonymous presentation per review. The displayed identity is used consistently on that review, comments and public reaction lists. | In, changed: FD-015: an anonymous review uses a stable alias scoped to that one review thread, never publicly linked to the normal profile, reactions, mentions or other anonymous reviews. FD-016/FD-022: staff can reveal the author behind an alias only through an audited capability (Super Admin; Admin/Moderator only when enabled, normally off); every reveal is logged; the capability is disclosed only in the Privacy Policy/Terms. | STORY-IDENT-001, STORY-USER-001 |
| FR-USER-002 | Must | Public profiles show public contributions and reaction activity in RogiKotha, but are marked noindex for search engines. Bookmarks remain private. | In, changed: FD-015: anonymous reviews and their thread activity never appear on the author's public profile or activity list. | STORY-USER-001 |
| FR-USER-003 | Must | Blocking prevents direct interaction, mentions and viewing each other’s nonessential activity while preserving public-content availability where required for discussion integrity. | In | STORY-MOD-003 ⟲ |
| FR-USER-004 | Must | Account deletion de-identifies retained public contributions instead of automatically deleting them. Evidence and legally held data follow retention, privacy objection and legal-hold rules. | In, changed: FD-035: account export (an export bundle job) and orchestrated deletion are real in the demo (T-410). This overrides, for the demo, the PRD's listing of "full data export" as future scope (PRD §14.3). Deletion de-identifies retained contributions and respects legal holds (FD-021). | STORY-USER-002 ⟲ |
| FR-USER-005 | Must | Users may optionally provide exact age or age range, gender and relevant-condition tags; date of birth is not collected. | In | STORY-USER-002 ⟲ |

### 6.3 Doctor profiles

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-DOC-001 | Must | Phase 1 supports community/admin-submitted profiles for BMDC MBBS and BDS doctors. A new profile becomes public only after Admin checks duplicates and obvious abuse; it displays Registration not verified. | In | STORY-DIR-001 |
| FR-DOC-002 | Must | No BMDC verification service is offered in Phase 1. BMDC number and registration status may be entered as profile information but are not presented as verified. | In | STORY-DIR-001 ⟲ |
| FR-DOC-003 | Must | Profile fields are dynamic and individually hideable. Supported fields include professional name, photo, BMDC number/status, degrees, qualifications, medical school, specialties, claimed expertise, years of experience, designation, hospitals/chambers, schedule, new/follow-up fees, languages, gender and appointment phone/link. Empty fields are not shown. | In | STORY-DIR-001 |
| FR-DOC-004 | Must | Every public field shows provenance/status and last update: Community submitted, Provider confirmed or Admin checked. Admin/Moderator-created sourced data records source URL/description, retrieval date and creator. | In | STORY-DIR-001 ⟲ |
| FR-DOC-005 | Must | Community users may suggest a profile photograph; Admin must approve and record its source. A claimed doctor may publish their own photo directly. Otherwise display initials/avatar. | In | STORY-DIR-002 ⟲ |
| FR-DOC-006 | Must | A doctor may claim a profile using a code sent to a publicly listed chamber phone or professional email, with manual evidence review as fallback. Claiming is independent of BMDC verification. | In | STORY-DIR-002 ⟲ |
| FR-DOC-007 | Must | After claim, schedule, fee, booking contact, languages and chamber details publish immediately with history. Identity, BMDC number, degrees and specialty changes require Admin approval. | In | STORY-DIR-002 ⟲ |
| FR-DOC-008 | Must | A claimed provider has no privileged review-response channel. They comment like any user, with the applicable public role/status label, and may not disclose patient identity or private medical information. | In | STORY-COM-001 |
| FR-DOC-009 | Must | Admin can merge confirmed duplicate profiles into one canonical record, transfer reviews/tags/chambers/claims, redirect old URLs and preserve an audit log. | In | STORY-DIR-002 ⟲ |

### 6.4 Facility profiles

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-FAC-001 | Must | Phase 1 supports hospitals, clinics and diagnostic centres. Chains use one parent organization plus one profile per physical branch; reviews belong to the visited branch and the parent may show aggregate summaries. | In | STORY-DIR-003 ⟲ |
| FR-FAC-002 | Must | Facility verification is optional. Unverified profiles show Not verified; claims use public business contact or manual evidence controlled by Admin. | In | STORY-DIR-003 ⟲ |
| FR-FAC-003 | Must | Facility feedback remains separate from doctor-treatment feedback and never modifies a doctor’s sentiment, outcome or review summary. | In | STORY-DIR-003 ⟲ |
| FR-FAC-004 | Must | Facility structured feedback covers staff behaviour/responsiveness, waiting/appointments, cleanliness, billing/value, test/report delivery, patient-perceived report reliability, admission/discharge and recommendation. Reliability is explicitly patient-perceived, not technical accuracy. | In | STORY-DIR-003 ⟲ |

### 6.5 Search, discovery and taxonomy

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-SRCH-001 | Must | One Bangla/English/Banglish search box searches doctor name, BMDC number, specialty, condition, symptom, treatment, medicine and facility; location uses a separate field. | In | STORY-SRCH-001 |
| FR-SRCH-002 | Must | Search supports case-insensitive matching, Bangla/English aliases, Banglish transliteration, spelling tolerance and pg_trgm-style fuzzy matching. Ambiguous Banglish shows Did you mean suggestions without replacing the query. | In | STORY-SRCH-001 |
| FR-SRCH-003 | Must | Results use All, Doctors, Facilities, Conditions/Tags and Reviews tabs. Doctor/facility result-card fields are dynamically configurable; default cards show identity, type/specialty, location, verification/provenance, condition match and review summary. | In | STORY-SRCH-001 ⟲ |
| FR-SRCH-004 | Must | Search filters include provider/facility type, specialty, condition, symptom, treatment, medicine, location, gender, languages, fee/schedule when available, sentiment, reported outcome, evidence status, claimed/status and profile provenance. | In | STORY-SRCH-002 |
| FR-SRCH-005 | Must | Default condition search ordering uses textual/condition relevance followed by relevant public-review count. Users can switch to newest, most reviewed or alphabetical. Sentiment, outcomes, evidence and reactions never influence default ranking. | In | STORY-SRCH-002 ⟲ |
| FR-SRCH-006 | Must | Doctor-profile reviews default to newest. Alternative sorts: most relevant, newest, oldest, Positive first, Negative first and most discussed. These are view options, not provider-quality rankings. | In | STORY-SRCH-002 ⟲ |
| FR-SRCH-007 | Must | Location is manually selected/entered in Phase 1. Device geolocation and Near Me are postponed. | In | STORY-SRCH-001 ⟲ |
| FR-SRCH-008 | Must | Provider profiles, condition pages and public reviews may be indexed. User profiles, drafts, document contents, private activity and evidence OCR are noindex/non-searchable. | In | STORY-SRCH-002 |
| FR-TAG-001 | Must | Each review supports multiple tags in Symptoms, Diagnosis/Condition, Treatment/Procedure, Medicine and Patient-reported outcome groups. At least one condition/symptom/free-text tag or Not sure is required. | In | STORY-SRCH-003 |
| FR-TAG-002 | Must | Unmapped Bangla, English or Banglish tags publish immediately as provisional tags. Admin can later map aliases to a canonical tag while retaining every visible submitted form; clicking any alias opens the canonical page. | In | STORY-SRCH-003 |
| FR-TAG-003 | Must | Super Admin can create, rename, merge, redirect, deactivate and reorder tag groups and values with audit history. | In | STORY-SRCH-003, STORY-ADMIN-001 |

### 6.6 Review creation

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-REV-001 | Must | A confirmed account may submit a Quick Review or Detailed Treatment Timeline using a step-by-step mobile-friendly wizard with progress, Back/Next, final preview and encrypted server-side autosave. | In | STORY-REV-001, STORY-REV-002 |
| FR-REV-002 | Must | Minimum publishable content is provider, short experience description, relationship to patient and at least one condition/symptom/free-text tag or Not sure. Sentiment, ratings, outcomes and evidence remain optional; Phase 1 has no numerical rating. | In, changed: FD-014: family members and caregivers may describe what they personally witnessed, with a simple experience/privacy attestation and no consent-verification workflow. | STORY-REV-001 |
| FR-REV-003 | Must | Detailed review sections include opinion, symptoms/context, diagnosis/explanation, treatment/procedure, medicines, tests, costs, provider and facility, condition tags, reported outcome and evidence. Admin can configure optional structured fields without changing the minimum. | In | STORY-REV-002 |
| FR-REV-004 | Must | Treatment dates display month/year publicly. An exact date may be stored privately for the author and moderation. | In | STORY-REV-002 |
| FR-REV-005 | Must | One account may submit multiple reviews for the same provider only for distinct conditions or treatment episodes. Duplicate/spam detection flags suspicious repetition. | In | STORY-REV-001 ⟲ |
| FR-REV-006 | Must | Text reviews publish immediately after automated checks for personal data patterns, threats, profanity, spam, duplicates and malicious input. If a file is still processing, the text review publishes and the file shows Processing privately until approved by the technical pipeline. | In, changed: FD-009: no automated threat or dangerous-advice classification. The composer's checks are the prototype's pattern checks (phone-number PII, emergency words, duplicates) per T-306. | STORY-REV-001 ⟲ |
| FR-REV-007 | Must | The author may select Positive, Mixed or Negative experience. This classifies the episode, not the provider’s general medical quality. Selection is optional by default and configurable by Super Admin. | In | STORY-REV-002 ⟲ |
| FR-REV-008 | Must | Optional structured checkboxes capture What went well and What could improve for listening, explanation, medicines/tests/risks, respect/empathy, consultation time, cost/value and recommendation. No checkbox generates a numeric score. | In | STORY-REV-002 ⟲ |
| FR-REV-009 | Must | Authors may add suggested or custom labels such as Wrong diagnosis, Wrong treatment or Second opinion differed. Labels are visibly prefixed as Reviewer’s label. Super Admin can configure labels and enable or disable label-approval workflow; RogiKotha does not validate the claim. | In | STORY-REV-002 ⟲ |

### 6.7 Sentiment, outcomes and summaries

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-SUM-001 | Must | Doctor and condition summaries show Positive/Mixed/Negative counts and percentages, Helped/No improvement/Worsened/Uncertain outcome counts and percentages, review count, document count and common condition tags. No combined score exists. | In | STORY-REV-004 |
| FR-SUM-002 | Must | Facility profiles use the same optional sentiment model and non-scored structured feedback. Facility and doctor summaries remain separate. | In | STORY-REV-004 ⟲ |
| FR-SUM-003 | Must | Only public, eligible reviews count. Super Admin may determine eligibility per review through a recorded moderation action; removed reviews do not count. Restoring an eligible review recalculates summaries. | In | STORY-REV-004 ⟲ |
| FR-SUM-004 | Must | When data is sparse, show the exact review count and Limited data. Missing sentiment, outcome or evidence is shown as Not provided/No documents—not zero. | In | STORY-REV-004 |
| FR-SUM-005 | Must | Likes, Dislikes, comments, evidence attachment and outcomes do not weight sentiment, summaries or search ranking. Administrators cannot manually rewrite user sentiment; they may hide ineligible reviews or temporarily freeze a summary during manipulation investigation. | In | STORY-REV-004 |

### 6.8 Evidence and treatment comparison

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-EVD-001 | Must | Evidence is optional. Reviews provide separate sections for Reviewed treatment, Later/alternative treatment and Outcome/follow-up evidence. | In | STORY-EVID-002 |
| FR-EVD-002 | Must | Later-treatment context may include provider, month/year, later diagnosis/explanation, treatment and outcome. A short description is required when the section is used; other fields and evidence-purpose labels are optional and admin-configurable. | In | STORY-EVID-002 |
| FR-EVD-003 | Must | If a later provider has a RogiKotha profile, link it. Otherwise show the entered name as unlinked text and offer profile submission. Never create a positive review or change a provider summary automatically. | In | STORY-REV-002 ⟲ |
| FR-EVD-004 | Must | Evidence status is Documents attached. RogiKotha does not authenticate, medically validate or issue confirmation levels. Public copy carries: Uploaded by reviewer; privacy not independently checked; documents are not medically validated. | In | STORY-EVID-002 |
| FR-EVD-005 | Must | Users may write that a later doctor confirmed a different diagnosis. Display it as user-authored text or Reviewer’s label with the platform disclaimer. No system-generated Proven wrong treatment label exists. | In | STORY-EVID-002 ⟲ |
| FR-EVD-006 | Must | Evidence filters distinguish no documents, reviewed-treatment documents, later-treatment documents, both treatment paths documented and outcome/follow-up documents. These are document-presence filters only. | In | STORY-SRCH-002 ⟲ |
| FR-EVD-007 | Must | The review displays a chronological treatment-comparison timeline. Larger screens may offer side-by-side document comparison; small screens use a sequential viewer. | In, narrowed: FD-036: side-by-side comparison applies to images; multi-page document comparison is Phase 2. | STORY-EVID-002 ⟲ |
| FR-FILE-001 | Must | Accept JPEG/JPG, PNG, WebP, HEIC, PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT and RTF. Reject executables, scripts, archives, password-protected/encrypted documents and macro-enabled files. | In, narrowed: FD-036: Phase 1 accepts JPEG and PNG only. WebP, HEIC, PDF, Office, TXT and RTF move to Phase 2 (`07-phase-2-document-evidence.md`). The reject list still applies. | STORY-EVID-001 |
| FR-FILE-002 | Must | Limit each review to 10 files, 15 MB per file and 100 MB total. Limits are enforced before expensive processing. | In | STORY-EVID-001 |
| FR-FILE-003 | Must | Every upload enters private quarantine. Validate extension, MIME type, magic bytes and size; scan with current ClamAV definitions and fail closed; sanitize/convert Office files in isolation; re-encode images and remove metadata; rasterize documents; apply user redaction; flatten; then publish a processed copy. | In, narrowed: FD-036: images only, so the Office sanitising and document rasterising steps are Phase 2. Quarantine, extension/MIME/magic/size checks, fail-closed ClamAV scan, re-encode and metadata strip stay. | STORY-EVID-001 |
| FR-FILE-004 | Must | The default evidence flow shows a privacy warning and page/image preview with manual redaction. Users may choose Skip privacy editing only after an extra confirmation. Manual redaction must flatten into page pixels so underlying text is unrecoverable. | In, narrowed: FD-036: the preview and flattened manual redaction work on images; page previews of documents are Phase 2. FD-023: the author confirms the processed copy before publication. | STORY-EVID-002 |
| FR-FILE-005 | Must | Automatic OCR/redaction is not in Phase 1. The interface warns authors to hide patient name/photo, contacts, address, identifiers, record numbers, QR/barcodes and signatures while preserving provider/facility details. | In | STORY-EVID-002 ⟲ |
| FR-FILE-006 | Must | Public documents use an in-browser viewer with zoom, pan, fullscreen, page navigation and rotation. Readers may download only the processed/redacted PDF; originals are never public. | In, narrowed: FD-036: the viewer pages between the images of a group (zoom, pan, fullscreen, rotate); download returns the processed image, not a PDF. Originals are never public. | STORY-EVID-002 |
| FR-FILE-007 | Must | If malware scanning, conversion or redaction processing fails, do not publish the file. Keep the text review public, identify the exact rejected file and reason privately, and offer Replace/Remove plus guidance such as photographing the document. | In | STORY-EVID-001 ⟲ |
| FR-FILE-008 | Must | Original uploads remain encrypted and private for 90 days by default, configurable by Super Admin, then are permanently deleted unless legal hold applies. Public processed copies follow review retention. | In, changed: FD-004/FD-005: 90-day original default, runtime-changeable with logging. FD-020: a default change applies to future records only; existing records change only through a separately logged bulk action with an affected-record preview, which is super_admin only (FD-051). FD-021: legal hold per record. | STORY-EVID-003 |
| FR-FILE-009 | Must | Extracted document text is never indexed by RogiKotha or search engines and is excluded from product analytics and operational logs. | In | STORY-EVID-001 ⟲ |

### 6.9 Follow-ups, corrections and deletion

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-EDIT-001 | Must | Non-substantive presentation fields may be edited with an Edited timestamp. Material changes to diagnosis, treatment or outcome become dated corrections/follow-ups; the original account remains understandable and private versions are retained for the configured audit period. | In, changed: FD-004: the audit/content-version period defaults to 180 days and is runtime-changeable with logging (FD-005); changes apply to future records only (FD-020). | STORY-REV-003 |
| FR-EDIT-002 | Must | Follow-ups appear chronologically below the original review; the newest reported status is summarized at the top. Authors cannot pin an older update as current. | In | STORY-REV-003 ⟲ |
| FR-EDIT-003 | Must | Authors may delete a review. If discussion context exists, show a Review deleted tombstone; otherwise remove it. Deleted reviews leave summaries immediately. The user may restore within 30 days; Admin may restore an Admin-removed item or act on an author request according to policy. | In | STORY-REV-003 ⟲ |
| FR-EDIT-004 | Must | Comment deletion shows a configurable-retention tombstone when replies/context require it and removes the comment completely otherwise. Deleted text remains only in private history for the configured period. | In | STORY-COM-001 ⟲ |
| FR-EDIT-005 | Must | Comments may be edited anytime with an Edited timestamp and private version history. Admin/Super Admin may permanently delete according to violation-type configuration, confirmation and audit rules. | In | STORY-COM-001 ⟲ |

### 6.10 Comments, reactions and social controls

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-COM-001 | Must | Phase 1 comments support text, warned external links, flat replies and @mentions. Images, document attachments, deep nesting and private messages are out of scope. | In | STORY-COM-001 |
| FR-COM-002 | Must | Any medical discussion is permitted with a persistent disclaimer. Potentially dangerous instructions remain visible with a strong warning and moderator review by default; Super Admin may disable this visibility policy. | In, changed: FD-009 and FD-017: no classifier. Dangerous instructions reach moderator review through the unsafe-advice report reason; the persistent disclaimer stays. | STORY-COM-001, STORY-MOD-001 |
| FR-COM-003 | Must | Emergency language triggers a non-blocking banner: call 999 for immediate danger, go to the nearest emergency department, use 16263 for non-emergency health guidance and show an admin-editable current crisis-support contact with last-verified date. | Retired: FD-046: the emergency-language banner on comments is retired for the demo. The static `/emergency` page (999, 16263, crisis line with last-verified date) covers it, and the review composer keeps the prototype's emergency-word safety check (T-306). Comment edit and delete stay under FR-EDIT-005. | STORY-PLAT-001 ⟲ |
| FR-REA-001 | Must | A confirmed account may Like or Dislike a review or comment, change the reaction and view public reaction lists. Public identity follows the user’s chosen public profile/display identity. | In, changed: FD-015: nothing links an anonymous alias to the author's profile; reaction lists never expose that link. | STORY-COM-002 |
| FR-REA-002 | Must | Reaction activity appears on the content, public user activity and the user’s own dashboard. Reactions affect engagement only—not summaries, ranking or moderation. | In, changed: FD-015: reactions made under an anonymous review thread are not shown on the author's public activity. | STORY-COM-002, STORY-IDENT-001 |

### 6.11 Reporting and moderation

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-MOD-001 | Must | Confirmed users may report reviews, comments, evidence, profiles and accounts using dynamically configurable reasons including privacy, threats, harassment, hate, spam, impersonation, dangerous advice, copyright/ownership, duplicate, off-topic, factual dispute and Other. | In | STORY-MOD-001 |
| FR-MOD-002 | Must | Reporter identity is visible only to Super Admin and users with explicit permission. The reported person receives a generic Content reported notice; after a decision, they receive action, policy reason and appeal path without reporter identity. | In | STORY-MOD-001 |
| FR-MOD-003 | Must | Privacy leaks, credible threats and unsafe files hide immediately on first credible detection/report. Factual disagreement never auto-hides. Other eligible policy reports temporarily hide content at five unique confirmed accounts by default; threshold is configurable and coordinated-report abuse is detected. | In, changed: FD-009 and FD-017: there is no automated detection, so "first credible detection" means the first credible report. Five distinct confirmed accounts auto-hide; factual disagreement never auto-hides. | STORY-MOD-001 |
| FR-MOD-004 | Must | Critical reports target review within 24 hours, standard reports within three business days and appeals within seven business days. These are Beta targets, not 24/7 guarantees. | In | STORY-MOD-002 ⟲ |
| FR-MOD-005 | Must | Admin may redact private identifiers, remove unsafe files, add warnings or hide content but never rewrite the author’s substantive medical story. Ask the author to revise substantive content. | In | STORY-MOD-002 |
| FR-MOD-006 | Must | The founder handles Phase 1 appeals using a fresh checklist, appeal text and new evidence, recording a new written reason. Independent second review is a future capability. | In | STORY-MOD-003 |
| FR-MOD-007 | Must | Enforcement supports content warning, temporary restriction, feature restriction, temporary suspension and permanent account ban. Super Admin configures available actions and durations; every action is audited. | In | STORY-MOD-003 ⟲ |
| FR-MOD-008 | Must | Legal hold publicly hides relevant content while temporarily retaining encrypted data, evidence and audit records. Legal preservation overrides ordinary deletion schedules. | In, changed: FD-021: an individual legal hold pauses scheduled deletion for one record and logs actor, reason, creation time and expiry/release. | STORY-EVID-003 ⟲ |

### 6.12 Notifications, bookmarks and feedback

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-NOT-001 | Must | Phase 1 includes an in-app notification centre retained for 90 days. Events include review publication/failure, evidence processing, comments/replies/mentions, reactions, reports/decisions/appeals, provider profile approval/claim, account security and deletion notices. | In | STORY-NOTIF-001 |
| FR-NOT-002 | Must | Full notification previews, push, SMS and general email notifications are future scope. Phase 1 email is used for verification, security, recovery, legal/policy and scheduled-deletion notices. | In, changed: FD-047: the optional email categories (discussion, evidence, moderation) are Phase 1. Essential email stays content-free. Push, SMS and full previews stay future scope. | STORY-NOTIF-001 ⟲ |
| FR-NOT-003 | Must | Bookmarks are private. Provider/review following and follow-up reminders are future scope. | In | STORY-USER-002 ⟲ |
| FR-FDB-001 | Must | A persistent Feedback action collects an admin-configurable category, description, optional screenshot and permission to contact. Screenshots receive a warning not to include sensitive medical data. | In | STORY-USER-002 |

### 6.13 Internationalization, PWA and accessibility

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-I18N-001 | Must | Detect browser language for the first interface render, provide a persistent Bangla \| English switch and remember the user’s override. Interface choice never restricts content language or mixed Bangla/English/Banglish writing. | In | STORY-PLAT-001 ⟲ |
| FR-I18N-002 | Must | Preserve author text in its original language. Optional author-written translation is supported; automated translation is future scope. | In | STORY-PLAT-001 ⟲ |
| FR-PWA-001 | Must | The responsive website is optionally installable as a PWA without app-store distribution. Show installation suggestion after meaningful use, such as a second visit or several viewed pages. | In | STORY-PLAT-002 |
| FR-PWA-002 | Must | Offline mode shows a branded fallback and may cache previously viewed non-sensitive public pages. Never cache evidence, drafts, authentication data or sensitive account content for offline use. | In | STORY-PLAT-002 |
| FR-A11Y-001 | Must | Phase 1 provides semantic headings/landmarks, form labels, keyboard operation, visible focus, reasonable contrast, meaningful errors and screen-reader-friendly controls. Formal WCAG 2.2 AA certification is Phase 2. | In | STORY-PLAT-001, STORY-PROT-003 ⟲ |
| FR-ONB-001 | Must | New accounts receive an optional, skippable three-step introduction to reviews, privacy and evidence labels with Back, Skip and Finish. | Deferred: FD-048: a PRD Must that is deferred from the demo; no task delivers it. | — (deferred, FD-048) ⟲ |

### 6.14 Analytics and consent

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-AN-001 | Must | Use self-hosted Matomo for product analytics and Klaro for cookie consent. Consent offers equal Accept, Reject and Customize choices, remembers preference for 12 months and permits later withdrawal. | Deferred: FD-019 and master plan §9: analytics is off in the demo. | STORY-OPS-002 |
| FR-AN-002 | Must | Essential security/session cookies remain active. Analytics starts only after consent under the Phase 1 policy. | Deferred: FD-019: no analytics, so there is no consent banner; essential cookies only. | STORY-OPS-002 |
| FR-AN-003 | Must | Track product events and aggregate usage only. Never send medical text, search strings, aliases, evidence filenames, document contents or patient/provider identifiers to analytics. | Holds: FD-019: no analytics runs in the demo, so nothing is sent. The rule still binds any later analytics work. | STORY-OPS-002 ⟲ |

### 6.15 Administrative configuration

| ID | Pri | Requirement (PRD) | Demo status | Story |
|---|---|---|---|---|
| FR-ADM-001 | Must | Without deployment, Super Admin can configure feature visibility, profile/form fields, categories, labels/translations, limits, retention, report thresholds, warnings, emergency contacts, navigation, roles, permissions, sentiment presentation, browser-support display and public status labels. | In | STORY-ADMIN-001 |
| FR-ADM-002 | Must | Settings have change history and export/import. Safe settings may be restored to a prior value. Security-critical logging cannot be completely disabled. | In | STORY-ADMIN-001 ⟲ |
| FR-ADM-003 | Must | All administrative configuration changes record actor, timestamp, previous value, new value and result. Sensitive changes require password re-confirmation. | In | STORY-ADMIN-001 |
| FR-ADM-004 | Must | Admin dashboard provides moderation queues, evidence failures, provider profiles, taxonomy, users, claims, permissions, notifications, content eligibility, audit/content history, retention, health checks and Beta metrics. | In | STORY-ADMIN-002 |

## Non-functional requirements

Each keeps the PRD wording; "How the demo checks it" names the existing check from the validation strategy and task plan, with no new numeric targets (answer to Q2).

| ID | Area | Requirement (PRD) | Demo status | How the demo checks it | Story |
|---|---|---|---|---|---|
| NFR-001 | Performance | Important public pages become usable in approximately 3 seconds on an ordinary Bangladesh mobile connection, excluding large evidence downloads. | In, partly | Not gated. T-503 records Lighthouse figures once in its hand-off with no pass/fail (T-503 "Not in scope"); the PRD's ~3 s target is the reference. | STORY-OPS-001, STORY-PROT-003 |
| NFR-002 | Evidence | Normal evidence processing targets 5 minutes; delayed items show status without a completion guarantee. | In | T-304 worker pipeline: bounded retries and explicit failure states; T-308 shows the pipeline state chips while an item is delayed. | STORY-EVID-001 |
| NFR-003 | Availability | Best-effort Beta with monitoring and recovery; no contractual uptime SLA. | In, local | Local demo only (D11): `/api/health` reports db, queue, mail and scanner probes (T-008, T-009, T-101, T-304). No SLA. | STORY-OPS-001 (local subset) ⟲ |
| NFR-004 | Responsive UI | Support phone widths first, then tablet and desktop browsers with no horizontal overflow in primary journeys. | In | T-503: 360×800, 390×844, 768×1024, 1280×800, 1440×900, no horizontal overflow, no Bengali overflow, 200% zoom. | STORY-PROT-003 |
| NFR-005 | Browsers | Current and previous major Chrome, Edge, Firefox and Safari plus modern Android/iOS browsers; list is admin-configurable. | In | T-503: Playwright Chromium, Firefox and WebKit projects; real Safari/iOS is a manual smoke (`10-validation-strategy.md`). | STORY-PROT-003 |
| NFR-006 | Accessibility | Keyboard, labels, focus, contrast, semantic structure and error association across critical flows. | In | T-503: axe with no serious or critical violations, keyboard-only and reduced-motion runs; `pnpm contrast` and `npx impeccable detect` on UI Units. | STORY-PLAT-001, STORY-PROT-003 |
| NFR-007 | Localization | All interface strings externalized; Bangla and English parity; user content Unicode-safe. | In | `pnpm i18n:check` key parity (T-006), component tests in both `en` and `bn`, T-503 journeys in both locales. | STORY-PLAT-001, STORY-PROT-003 ⟲ |
| NFR-008 | SEO | Server-rendered public profiles/reviews with canonical URLs, redirects after merge and evidence/user noindex controls. | In | Server-rendered public pages; `noindex` on user, auth and staff surfaces (T-008, T-102, T-103); merge redirects (T-204). | STORY-SRCH-002 ⟲ |
| NFR-009 | Scalability | Stateless web/worker design and S3-compatible storage interfaces allow later horizontal migration without rewriting domain data. | In, local | Stateless web and worker; evidence behind the storage port (ADR-0006) with the filesystem adapter in the demo. Garage is out of scope (master plan §9). | STORY-FOUND-001 ⟲ |
| NFR-010 | Observability | Structured scrubbed logs, GlitchTip errors, queue/scan/storage/database health and disk-capacity alerts. | In, partly | Logger port with allowlisted fields and log scrubbing (T-502), health probes. GlitchTip and disk-capacity alerts belong to the production composition and are not built. | STORY-FOUND-001, STORY-OPS-001 (local subset) ⟲ |
| NFR-011 | Maintainability | TypeScript strict mode, migrations, automated tests, documented configuration and dependency register. | In | `pnpm check` (strict typecheck, lint, tests, i18n parity, build), forward-only migrations, `docs/status/dependency-check-log.md`, 80% line coverage from T-010 (D10). | STORY-FOUND-001 ⟲ |
| NFR-012 | Recoverability | Previous application image retained; migration recovery instructions and manual database/object backup before production release. | Deferred | Production release only (master plan §9: backups and restore drills). The demo rolls back by reverting the squash commit and `pnpm db:reset && pnpm db:seed` (team practices, Deployment). | STORY-OPS-001 ⟲ |

## Count check

- 103 functional + 12 non-functional = 115 requirements, every PRD ID present once (FD-045). The old check of "100 + 12" came from the matrix, which omits FR-I18N-001, FR-I18N-002 and FR-A11Y-001.
- Functional demo status: In 76, In, narrowed 8, In, changed 14, Retired 1, Deferred 3, Holds 1.

## Constraints

- **Composition:** local-development composition only (FD-031, D11); the read-only USD 0 public demo of ADR-0010/FD-012 stays unbuilt. No staging or production environment in this intent.
- **Stack:** pinned in `00-master-plan.md` §3 (Next.js 16, React 19, TypeScript 6 strict, PostgreSQL 18, Drizzle, Better Auth 1.7, pg-boss 12, Vitest 4, Playwright); trimmed monorepo per FD-033; plain-CSS port of the prototype, no Tailwind or component kit (FD-032).
- **Evidence:** JPEG and PNG only (FD-036).
- **Data:** synthetic corpus only; no real person or facility (PRODUCT.md, conventions §14). The demo marker stays visible (AD-14).
- **Product hard rules:** the Forbidden and Mandated lists in `aidlc/spaces/default/memory/project.md` bind every requirement (no score, missing ≠ 0, "Registration not verified", evidence never "verified", facility feedback separate, reporter identity restricted, equal Bengali/English).
- **Security, privacy and audit (PRD §9.1–§9.3):** binds the demo as written. That covers secure, HttpOnly, SameSite cookies; Argon2id; CSRF and origin checks; server-side authorization on every protected action; input validation and parameterized queries; a strict nonce CSP; the per-account rate limits (5 reviews/day, 30 comments/hour, 100 reactions/hour, 5 profile submissions/day); fail-closed ClamAV scanning; minimal data collection; scrubbed logs with no health content; logged, permissioned access to reporter identity and evidence originals; `noindex` user profiles; and the split between the audit log and the encrypted content-version store. These are built in tasks including T-101, T-103, T-303, T-305, T-403, T-404 and T-502, and in the audit tables of `02-data-model.md`. The exceptions, each with its source:
  - TLS and HSTS: the demo runs on local http (T-101 sets no `Secure` cookie flag on http; T-502 leaves TLS and the reverse proxy out of scope).
  - Garage buckets: replaced by the storage port with the filesystem adapter, which keeps quarantine, original and processed locations separate (ADR-0006, T-303; Garage is out of scope in master plan §9).
  - Office conversion: Phase 2 (FD-036).
  - Docker Compose secrets mount: production secrets management is out of scope (T-502); the demo uses local development values in `.env` only. The rule that secrets are never committed to the repository still binds the demo.
  - Dependency and container scanning in a release pipeline: there is no release pipeline in this intent (D11). The dependency register is `docs/status/dependency-check-log.md` (AGENTS.md); no vulnerability scanning is planned for the demo.
  - GlitchTip: production composition only (see NFR-010).
- **Process:** no tool or model identity in any committed file (AGENTS.md, D8); solo, serial Construction (D13).

## Assumptions

- The limited-data threshold is a deferred product decision (PRODUCT.md hard rule, Mandated list in `project.md`). The demo uses the placeholder 5 declared in `packages/contracts/src/config-values.ts` (`limitedDataThreshold: 5`), served by the runtime configuration T-105 builds and read by T-301. Owner: product owner.
- The 53 BRD requirements are fully represented through `01-requirement-baseline.md`; where the PRD supersedes the BRD, the PRD controls (D-001).
- The PRD's Beta-launch, legal-review and production-operations sections (§11–§13) apply to a future production release, not to this local demo, except where a requirement above is marked `In`.

## Out of scope

- Master plan §9: production deployment topology, encrypted off-host backups and restore drills, analytics, Garage object storage, PDF/HEIC/Office evidence (Phase 2, `07-phase-2-document-evidence.md`), BMDC verification, MFA/passkeys, the read-only public demo composition, native apps, public API.
- Deferred or retired here: FR-ONB-001 (FD-048), the optional account-cleanup policy (FD-056), recent logins and failed-login alerts (FD-057), the sign-in challenge (FD-058), manual Admin recovery and recovery contacts (FD-059), FR-AN-001/002 (FD-019), NFR-012 (production only), FR-COM-003 (retired, FD-046).
- PRD future scope stays future: push/SMS notifications, following and reminders, automated translation, Near Me, independent second appeal review, formal WCAG 2.2 AA certification.

## Open questions

- None blocks Requirements. Carried to later stages: the progressive delay and severe-activity notice that FD-058 adds to T-101/T-502 (Units and Delivery Planning update those tasks), the storyboard and seed correction (FD-039), the D-001 auth-screen review gate on T-102/T-103 (FD-053), the owner's bilingual review of new Bengali copy (FD-042, `ISS-050`), and the worker grant review in CR-006 (FD-041, FD-050).

### Task headers that cite old matrix meanings

These task files trace to IDs in the old matrix sense. Units Generation and Delivery Planning correct their headers to the meanings above:

- T-303, T-304: FR-FILE-009 used as "processing status/failure"; that is FR-FILE-007 and NFR-002 here.
- T-305, T-308: FR-EVD-003 used as "evidence status/provenance"; that is FR-EVD-004 here.
- T-302: FR-EDIT-004/005 are the comment deletion and edit rules (owned with T-401), not review rules.
- T-309: FR-FILE-007 used as "originals never public" (FR-FILE-006 here) and FR-EVD-005–007 used as custody, removal and processing administration (see the table below).
- T-404, T-406: STORY-NFR-009 used as auditability; NFR-009 is scalability here, and auditability is FR-ADM-003, FR-MOD-007, FR-DOC-009 and the append-only audit tables.

## Re-keyed matrix rows

Rows of `06-requirement-traceability-matrix.md` whose label describes a different requirement than the PRD gives that ID. The PRD meaning wins and the story was re-linked (FD-045).

| ID | Matrix label | Matrix story | Story here | Reason | The old label's capability now lives in |
|---|---|---|---|---|---|
| FR-AUTH-003 | Confirmation and resend behavior | STORY-AUTH-001 | STORY-AUTH-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-AUTH-004 |
| FR-AUTH-004 | Sign-in, sign-out and password reset | STORY-AUTH-001 | STORY-AUTH-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-AUTH-001 (sign-in), FR-AUTH-009 (reset, FD-059) |
| FR-AUTH-005 | Session/device behavior | STORY-AUTH-002 | STORY-AUTH-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-AUTH-006, FR-AUTH-007 |
| FR-AUTH-006 | Account status and deletion path | STORY-AUTH-002, STORY-USER-002 | STORY-AUTH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-USER-004, FR-AUTH-005 |
| FR-AUTH-009 | Role/capability enforcement | STORY-AUTH-002 | STORY-AUTH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-ADM-001 (roles and permissions), FD-016 |
| FR-USER-003 | Dashboard/drafts/bookmarks/submissions | STORY-USER-002 | STORY-MOD-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-REA-002 (own dashboard), FR-REV-001 (drafts), FR-NOT-003 (private bookmarks) |
| FR-USER-004 | Preferences/language/privacy | STORY-USER-002 | STORY-USER-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-I18N-001 (language), FR-USER-005 (optional profile data) |
| FR-USER-005 | Account/data requests | STORY-USER-002 | STORY-USER-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-USER-004 with FD-035 (export and deletion) |
| FR-DOC-002 | Publish unverified doctor after duplicate/abuse review | STORY-DIR-001 | STORY-DIR-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-001 |
| FR-DOC-004 | Doctor locations/facilities/specialties | STORY-DIR-001, STORY-DIR-002 | STORY-DIR-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-003 |
| FR-DOC-005 | Profile correction/suggestion | STORY-DIR-003 | STORY-DIR-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-005 (photo), FR-DOC-007 (field changes) |
| FR-DOC-006 | Duplicate/merge handling | STORY-DIR-003 | STORY-DIR-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-009 |
| FR-DOC-007 | Claim request | STORY-DIR-003 | STORY-DIR-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-006 |
| FR-DOC-009 | Profile status/provenance | STORY-DIR-003 | STORY-DIR-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-DOC-004 |
| FR-FAC-001 | Facility and branch profiles | STORY-DIR-002 | STORY-DIR-003 | Label matches; the matrix uses the older story number (facilities are STORY-DIR-003 in the backlog). | — |
| FR-FAC-002 | Facility submission | STORY-DIR-002 | STORY-DIR-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | No PRD ID of its own; facility profiles are FR-FAC-001 and facility claims FR-FAC-002 (STORY-DIR-003) |
| FR-FAC-003 | Branch/location relationships | STORY-DIR-002 | STORY-DIR-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-FAC-001 |
| FR-FAC-004 | Non-scored structured facility feedback | STORY-REV-002 | STORY-DIR-003 | Label matches; facility feedback belongs to the facility story STORY-DIR-003 (matrix: older numbering). | — |
| FR-SRCH-003 | Registration/specialty/location search | STORY-SRCH-001 | STORY-SRCH-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-SRCH-001 |
| FR-SRCH-005 | Suggestions/aliases | STORY-SRCH-002 | STORY-SRCH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-SRCH-002 |
| FR-SRCH-006 | No-results provider submission path | STORY-SRCH-002, STORY-DIR-001 | STORY-SRCH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EVD-003 (offer profile submission), FR-DOC-001 |
| FR-SRCH-007 | Published-only search | STORY-SRCH-001 | STORY-SRCH-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-SRCH-008, FR-SUM-003 |
| FR-REV-005 | Relationship to patient/witnessed experience | STORY-REV-001 | STORY-REV-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-REV-002 (FD-014) |
| FR-REV-006 | Named/pseudonymous/anonymous publication | STORY-IDENT-001, STORY-REV-001 | STORY-REV-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-USER-001 |
| FR-REV-007 | Reviewed vs later/alternative treatment separation | STORY-REV-002, STORY-EVID-002 | STORY-REV-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EVD-001, FR-EVD-002 |
| FR-REV-008 | Follow-up updates | STORY-REV-003 | STORY-REV-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EDIT-001, FR-EDIT-002 |
| FR-REV-009 | Draft/recovery/publication states | STORY-REV-003 | STORY-REV-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-REV-001 (autosave), FR-REV-006 (publication) |
| FR-SUM-002 | Optional outcome distribution | STORY-REV-004 | STORY-REV-004 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-SUM-001 |
| FR-SUM-003 | No quality/medical certainty claim | STORY-REV-004 | STORY-REV-004 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-SUM-001 (no combined score), FR-REV-007, FR-EVD-004 |
| FR-EVD-003 | Evidence status/provenance | STORY-EVID-002 | STORY-REV-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EVD-004 |
| FR-EVD-005 | Evidence access/custody audit | STORY-EVID-003 | STORY-EVID-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | The Mandated hard rule in project.md (original evidence is a separate, audited permission), FR-FILE-008, FR-MOD-008; built as the T-309 custody log |
| FR-EVD-006 | Evidence removal/tombstone | STORY-EVID-003 | STORY-SRCH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-MOD-005 (remove unsafe files), FR-FILE-008 |
| FR-EVD-007 | Evidence-processing administration | STORY-ADMIN-002 | STORY-EVID-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-ADM-004 (evidence failures dashboard) |
| FR-FILE-005 | Author privacy confirmation | STORY-EVID-002 | STORY-EVID-002 | Label drift only ("Author privacy confirmation" is FD-023 under FR-FILE-004); story unchanged. | FR-FILE-004 (FD-023) |
| FR-FILE-007 | Originals never public | STORY-EVID-001, STORY-EVID-003 | STORY-EVID-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-FILE-006 (originals are never public), D-006 |
| FR-FILE-009 | Processing status/failure | STORY-EVID-001 | STORY-EVID-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-FILE-007, NFR-002 |
| FR-EDIT-002 | Edit history | STORY-REV-003 | STORY-REV-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EDIT-001 (private versions), FR-EDIT-005 |
| FR-EDIT-003 | Material edit re-review | STORY-REV-003, STORY-MOD-002 | STORY-REV-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EDIT-001 (the PRD has no separate re-review rule) |
| FR-EDIT-004 | Delete/tombstone behavior | STORY-REV-003 | STORY-COM-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-EDIT-003 |
| FR-EDIT-005 | Admin correction with audit | STORY-MOD-002 | STORY-COM-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-MOD-005, FR-ADM-003 |
| FR-COM-003 | Comment edit/delete/moderation — see Known ID collision in `docs/planning/06-requirement-traceability-matrix.md` | STORY-COM-001, STORY-MOD-002 | STORY-PLAT-001 | The matrix marks this ID collision open; FD-045 (the PRD meaning wins) and FD-046 (the banner is retired) settle it. | FR-EDIT-004, FR-EDIT-005 |
| FR-MOD-004 | Queue/priorities/status | STORY-MOD-002 | STORY-MOD-002 | Label drift only (the PRD gives review-time targets, not queue status); story unchanged. | FR-ADM-004 (moderation queues) |
| FR-MOD-007 | Blocking and interaction effects | STORY-MOD-003 | STORY-MOD-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-USER-003 |
| FR-MOD-008 | Abuse controls/coordination evidence | STORY-MOD-001 | STORY-EVID-003 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-MOD-003 (distinct confirmed accounts), FR-REV-005 (duplicate/spam flags) |
| FR-NOT-002 | Email notification preferences | STORY-NOTIF-001 | STORY-NOTIF-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-NOT-002 with FD-047 |
| FR-NOT-003 | Notification read/history behavior | STORY-NOTIF-001 | STORY-USER-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-NOT-001 |
| FR-I18N-001 | — | — | STORY-PLAT-001 | Not in the matrix. | — |
| FR-I18N-002 | — | — | STORY-PLAT-001 | Not in the matrix. | — |
| FR-A11Y-001 | — | — | STORY-PLAT-001, STORY-PROT-003 | Not in the matrix. | — |
| FR-ONB-001 | Simple onboarding and disclaimers | STORY-PLAT-001 | — (deferred, FD-048) | Deferred (FD-048); STORY-PLAT-001 cites it but describes FR-I18N-001. | — |
| FR-AN-003 | Admin analytics reporting | STORY-OPS-002 | STORY-OPS-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | Deferred with FR-AN-001 (FD-019) |
| FR-ADM-002 | Roles/capabilities including identity reveal | STORY-ADMIN-001, STORY-IDENT-001 | STORY-ADMIN-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | FR-ADM-001, FR-USER-001 (FD-016/FD-022) |
| NFR-003 | Best-effort monitored/recoverable service | STORY-OPS-001 | STORY-OPS-001 (local subset) | Label matches; STORY-OPS-001 is out of demo scope (master plan §9), so only its local subset (health probes) applies; User Stories confirms the owner. | — |
| NFR-007 | Equal Bengali/English behavior | STORY-I18N-001 | STORY-PLAT-001, STORY-PROT-003 | The matrix owner STORY-I18N-001 does not exist. | — |
| NFR-008 | Security/privacy baseline | all security-sensitive stories | STORY-SRCH-002 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | PRD §9.1–§9.2, which binds the demo (Constraints: "Security, privacy and audit"), plus FR-AUTH-003/006/008, FR-FILE-003, FR-SRCH-008 and the hard rules in project.md |
| NFR-009 | Auditability | STORY-ADMIN-001, STORY-OPS-001 | STORY-FOUND-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | PRD §9.3 (Constraints: "Security, privacy and audit"), FR-ADM-003, FR-MOD-007, FR-DOC-009 and the append-only audit tables (02-data-model.md) |
| NFR-010 | Maintainability/observability | STORY-FOUND-001, STORY-OPS-001 | STORY-FOUND-001, STORY-OPS-001 (local subset) | Label matches; as NFR-003, only the local subset of STORY-OPS-001 applies. | NFR-010, NFR-011 |
| NFR-011 | Backup/recovery | STORY-OPS-001 | STORY-FOUND-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | NFR-012 (deferred) |
| NFR-012 | Synthetic demo/prototype safety | STORY-PROT-001 | STORY-OPS-001 | Matrix label describes a different requirement; story re-linked from the PRD meaning. | Constraints (synthetic data, demo marker AD-14), STORY-PROT-001 |

59 rows listed. Every requirement whose story here differs from the matrix, or whose matrix label describes another requirement, is in this table; every other row keeps the matrix story.
