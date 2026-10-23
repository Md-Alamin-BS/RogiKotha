> Plain-text extraction of `docs/RogiKotha_PRD_v1.0.docx`, made 2026-10-23 so the AI-DLC knowledge catalog can read it (it has no Word extractor). The `.docx` stays the source of truth; regenerate this file if it changes.

Design direction update — Gate 4 founder decision (FD-027, 2026-09-06): Concept 04b — Quiet Clinic (minimal pass) is the chosen implementation direction. FD-026 (Concept 04 — warm Quiet Clinic) is superseded. Source prototype: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/. See docs/planning/ux/DESIGN.md for the current visual contract and docs/planning/ux/EXPERIENCE.md for the behavioural contract. Motion is CSS-only (five primitives); killed by the in-app motion-off toggle and prefers-reduced-motion.

PRODUCT REQUIREMENTS DOCUMENT

RogiKotha

Bangladesh-first patient-reported doctor and healthcare experience platform

| Document | Value |
|---|---|
| Version | 1.0 |
| Status | Approved requirements baseline for implementation planning |
| Date | 29 August 2026 |
| Product owner | Founder / Super Admin |
| Initial market | Bangladesh |
| Interface | Bangla and English; responsive mobile-first web app / PWA |
| Release model | Controlled public beta |

Product position RogiKotha organizes patient-reported treatment experiences by provider and condition. It does not diagnose, validate clinical correctness, or provide medical advice.

Working name: RogiKotha (patient stories). Visual direction: Concept 04b — Quiet Clinic (minimal pass) (founder decision FD-027, 2026-09-06): paper base, teal-gray accent, hairline rules, no decorative linework, no atmospheric veil, no panel shadow; outline-only distribution capsules with a status dot; circular avatars (FD-026 preserved); coral held back for emergencies (FD-026 preserved); the system rounded sans for both UI and headings (deliberate departure from the FD-026 serif/sans contrast). Motion is CSS-only (five primitives); killed by the in-app motion-off toggle and prefers-reduced-motion. Visual tokens are defined in docs/planning/ux/DESIGN.md.

Document purpose

This PRD converts the approved business requirements and discovery decisions into an implementation-ready product specification for the Bangladesh public beta. It defines required behaviour, business rules, acceptance criteria, security and privacy controls, administration, technical constraints, release gates and future scope.

Important legal limitation Product disclaimers and Terms can allocate responsibility and explain that content is user-submitted, but they cannot guarantee zero platform liability. Bangladesh counsel must review the Terms, Privacy Policy, moderation process and evidence handling before public launch.

### Contents

- 1. Executive summary

- 2. Product strategy and success

- 3. Users, identities and permissions

- 4. Phase 1 scope

- 5. Information architecture

- 6. Functional requirements

- 7. Core workflows and state models

- 8. Data model and business rules

- 9. Security, privacy and trust

- 10. Non-functional requirements

- 11. Technical architecture and operations

- 12. Legal and policy requirements

- 13. Testing, release and beta operations

- 14. Metrics, risks and roadmap

- 15. Final acceptance criteria

- Appendices: glossary, decision register and sources

## 1. Executive summary

RogiKotha is a Bangladesh-first platform where patients, guardians, caregivers and treatment witnesses can publish condition-specific accounts of care received from BMDC MBBS/BDS doctors and from hospitals, clinics and diagnostic centres. Each review centers on a treatment episode: symptoms or condition, diagnosis or explanation, tests, medicines, procedures, experience, reported outcome and optional supporting documents.

The product is narrative-first. Phase 1 has no star ratings or calculated medical-quality score. An author may optionally classify an episode as Positive, Mixed or Negative. Doctor and facility pages show distributions, reported outcomes, condition tags and review counts; readers decide by opening the underlying stories. Search ranking is neutral: relevance, relevant-review volume and recency—not sentiment.

Evidence is optional and never medically validated by RogiKotha. Users can separately attach documents from the reviewed treatment and from later or alternative care. Public copies are malware-scanned, sanitized, converted, flattened and privacy-processed. The author may describe that another doctor confirmed a different diagnosis; the platform displays this as the author’s statement, not its own finding.

Phase 1 is a responsive, mobile-first PWA for mobile and desktop browsers. It launches as a controlled public beta, supports Bangla and English interfaces, and uses an open-source-first, single-VPS architecture designed for a solo founder working with AI development agents.

### 1.1 Product promise

Promise Help people find and understand relevant patient experiences for a specific condition, treatment or provider without presenting those experiences as verified medical judgments.

### 1.2 Product principles

- Treatment episode, not permanent verdict: every review is tied to a specific condition or care episode.

- Narrative before score: stories, timelines, documents and outcomes carry more meaning than a single number.

- User claim, clearly attributed: RogiKotha does not convert allegations into platform findings.

- Privacy by warning and processing: users are warned and given redaction tools; technical file security remains mandatory.

- Immediate participation with reactive moderation: eligible text publishes immediately after automated checks; reports and critical safety signals drive review.

- Neutral discovery: sentiment, Likes, Dislikes and evidence do not create a medical-quality ranking.

- Transparent provenance: profiles and administrative changes show their source/status and history.

- Open-source-first delivery: use established FOSS components; do not build cryptography, malware parsing or document rendering engines from scratch.

## 2. Product strategy and success

### 2.1 Problem statement

People in Bangladesh often rely on informal recommendations, chamber cards and generic star ratings when choosing care. Those signals rarely explain which condition was treated, what the clinician diagnosed, what treatment was given, what changed later or whether the reviewer is discussing the doctor, the facility or both. This makes feedback difficult to compare and can unfairly generalize one episode into a judgment about all of a provider’s work.

### 2.2 Goals

- Make treatment experiences searchable by doctor, facility, condition, symptom, treatment, medicine and location.

- Allow quick reviews and detailed chronological treatment stories without blocking users on optional fields.

- Separate doctor-treatment feedback from hospital, clinic and diagnostic-centre service feedback.

- Give readers clear context: relationship to patient, episode date, condition tags, sentiment, outcome and evidence status.

- Preserve original stories while allowing dated corrections and follow-up outcomes.

- Provide privacy, reporting, moderation, audit and legal-response controls suitable for a real public beta.

- Create a Bangladesh data model that can later support additional countries, regulatory systems and languages.

### 2.3 Non-goals

- Diagnosing patients, recommending treatment or replacing professional medical care.

- Medically validating user claims, prescriptions, diagnoses, test results or outcomes.

- Determining negligence, malpractice or legal liability.

- Operating a community vote or clinical panel to decide whether treatment was correct.

- Publishing a single medical-quality score or a Best/Worst doctor leaderboard.

- Offering native Android, iOS or desktop applications in Phase 1.

- Providing private messaging, push/SMS notifications, full self-service recovery or automated OCR redaction in Phase 1.

### 2.4 Beta success measures

| Measure | Phase 1 interpretation |
|---|---|
| Useful published reviews | Reviews meeting minimum content and remaining publicly eligible |
| Condition/provider coverage | Distinct providers and canonical conditions with at least one public review |
| Search success | Searches leading to a relevant profile, review or profile-submission action |
| Evidence completion | Uploads successfully producing a safe public copy |
| Return behaviour | Confirmed users returning to read, update or contribute |
| Trust and safety | Report rate, privacy incidents, unsafe-file events and appeal outcomes |
| Operations | Critical and standard moderation response time; evidence queue delay |

The founder may remove the Beta label at their discretion. A non-binding readiness dashboard will show unresolved critical defects, evidence reliability, backup status, moderation load, core-journey stability and real usage.

## 3. Users, identities and permissions

### 3.1 Public user types

All accounts use one common account system. A user may optionally declare one or more roles; role labels are descriptive, not authority to provide medical advice. The Super Admin can add, rename, hide, reorder or disable role options.

| Role | Typical purpose | Public status |
|---|---|---|
| Patient | Reviews their own care | Self-declared unless otherwise confirmed |
| Parent / guardian | Reviews care received by a minor | Self-declared |
| Caregiver / family | Describes witnessed or managed care | Self-declared |
| Treatment witness | Describes directly witnessed care | Self-declared |
| Doctor / dentist | Participates as an ordinary user; may claim a provider profile | Self-declared, Provider confirmed or Admin checked |
| Nurse / healthcare professional | Participates in discussions | Self-declared or Admin checked |
| Facility representative | May claim a facility profile | Provider confirmed or Admin checked |
| Researcher / student / Other / Prefer not to say | Optional context | Self-declared |

### 3.2 Identity modes

- Every account has a unique, normally permanent username used in URLs and @mentions.

- The public display name is non-unique and may change at any time.

- A reviewer chooses real-name, pseudonymous or anonymous presentation for each review.

- Anonymous presentation uses a stable account alias so activity is understandable without exposing the account’s private identity.

- Previous public names remain private to authorized administrators; the Super Admin may correct a username for typo, privacy, impersonation or legal reasons.

- Obvious reserved or deceptive names are blocked; other names publish and may later be reported or administratively renamed.

### 3.3 Age and relationship

- Account creation is limited to people who confirm they are 18 or older.

- A parent or guardian may review care received by a minor.

- A user may review care received by another adult without platform-verified consent; the form warns them to avoid sensitive information, and the patient may request removal.

- Phase 1 does not attempt to verify relationship, consent, incapacity or deceased-patient status.

### 3.4 Administrative roles

| Role | Default authority | Constraint |
|---|---|---|
| Super Admin | All settings, identities, legal access, permissions, audit, enforcement and recovery | Sensitive actions require password confirmation and audit |
| Admin | Operational administration as granted | Cannot grant themselves permissions |
| Moderator | Reports, content actions, provider profiles and user enforcement as granted | Permissions are configurable by Super Admin |

Reporter identity is restricted to Super Admin and specifically authorized users for legal, spam or harassment investigations. It is never public or disclosed to the reported person. Original evidence access is a separate permission and every access is audited.

## 4. Phase 1 scope

### 4.1 In scope

- Controlled public beta open to anyone, visibly labelled Beta and promoted gradually.

- Responsive, mobile-first PWA for current mobile and desktop browsers.

- Bangla and English interface with unrestricted Bangla, English and Banglish content entry.

- Email/password accounts, email confirmation, optional recovery phone and secondary email.

- Doctor, dentist, hospital, clinic, diagnostic-centre organization and physical branch profiles.

- Quick reviews, detailed treatment timelines, follow-ups, sentiment, outcomes and optional evidence.

- Search, filters, canonical tags, profile claims and source provenance.

- Text comments, warned external links, @mentions, Likes/Dislikes and reporting.

- Founder-led administration and moderation, configurable roles and audit logs.

- In-app notifications, bookmarks, consent-based self-hosted analytics and beta feedback.

### 4.2 Explicitly out of scope

- Native mobile/desktop apps; app-store distribution.

- Medical validation, evidence authenticity checking, clinical panels or professional voting.

- BMDC verification workflow; profiles show Registration not verified in Phase 1.

- Numerical ratings, star averages, Bayesian ranking and combined medical-quality scores.

- Private messaging, comment attachments, push notifications, SMS notifications and email notification digests.

- Automated OCR redaction, third-party AI/OCR, translation automation and searchable document OCR.

- Automated nightly/off-site backups, multi-server high availability and formal uptime SLA.

- Public API, payment processing, paid review removal, clinical booking engine and provider subscription billing.

- Formal WCAG 2.2 AA certification, although an accessibility foundation is required.

### 4.3 Future business-model guardrails

Potential future models include donations/non-profit support, paid provider tools, ethical advertising, clearly labelled sponsored listings and appointment-referral commission. Payment must never buy review removal, alter review eligibility, change sentiment summaries or influence neutral search results without an explicit sponsored label.

## 5. Information architecture

### 5.1 Primary navigation

The default mobile navigation contains Home, Search, Write Review, Notifications and Profile. The Super Admin may reorder, rename, hide or replace destinations. Larger screens use an equivalent responsive header/navigation structure; this is not a separate desktop application.

### 5.2 Primary public surfaces

- Home: universal search, browse by condition, latest experiences, recently reviewed providers, newly added providers and comparison-document reviews.

- Search: All, Doctors, Facilities, Conditions/Tags and Reviews tabs plus a separate location field.

- Doctor profile: dynamic professional details, provenance, chambers, condition summaries and treatment reviews.

- Facility parent/branch profile: organization, branches, service feedback and aggregate branch summary.

- Condition/tag page: aliases, related tags, relevant providers and reviews.

- Review page: story, timeline, sentiment, outcomes, evidence, comments, reactions and reports.

- Public account profile: alias, public role/status and public reviews/comments/reactions; no search-engine indexing.

- User dashboard: reviews, drafts, follow-ups, comments, reactions, bookmarks, reports, notifications, submissions, claims, sessions and settings.

- Admin: moderation, provider directory, taxonomy, permissions, configuration, retention, audit, incidents and metrics.

### 5.3 Empty-state behaviour

The launch directory begins empty. Empty sections honestly explain that the Beta is new and offer Add Provider and Write First Review actions. Demonstration profiles must not be mixed with real providers. If search has no exact match, the page first states that no exact result was found, then shows similar matches and an Add this doctor/facility action.

## 6. Functional requirements

### 6.1 Accounts and authentication

FR-AUTH-001 | Must

Visitors may search and view public profiles, reviews, comments, sentiment distributions, reported outcomes and processed evidence without an account. Contribution actions require sign-in and confirmed email.

- Acceptance: A logged-out visitor can open a processed evidence viewer.

- Acceptance: Write, comment, react, report, bookmark, submit profile and claim actions request authentication.

FR-AUTH-002 | Must

Registration requires email, password, unique username, public display name, preferred interface language, acceptance of Terms/Privacy and confirmation of age 18+.

FR-AUTH-003 | Must

Passwords use Argon2id with current OWASP-aligned parameters, unique salts and no plaintext or reversible storage. Minimum length is 10 characters; long passphrases and international characters are allowed.

FR-AUTH-004 | Must

Email verification links expire after 24 hours and support rate-limited resend. Unverified accounts can browse and edit account settings but cannot contribute.

FR-AUTH-005 | Must

Unverified and inactive verified accounts are not automatically deleted by default. Super Admin may enable and configure separate cleanup policies; affected users receive in-app and email notices with reason and scheduled deletion date.

FR-AUTH-006 | Must

Normal and administrative sessions last up to 30 days. Users can view active sessions, recent successful logins, failed-login alerts and invoke Logout all sessions.

FR-AUTH-007 | Must

New-device administrative login requires email approval and strong-password verification. Phase 1 has no MFA; this is an accepted high-severity risk and a Phase 2 priority.

FR-AUTH-008 | Must

Repeated login failures trigger progressive delay, suspicious-activity CAPTCHA and severe-activity email/in-app notice.

FR-AUTH-009 | Must

Phase 1 recovery is a manual Admin process supported by verified recovery phone and/or verified secondary email. Every reset is audited. Self-service email reset is Phase 2.

### 6.2 Public account profiles

FR-USER-001 | Must

Users choose real-name, pseudonymous or anonymous presentation per review. The displayed identity is used consistently on that review, comments and public reaction lists.

FR-USER-002 | Must

Public profiles show public contributions and reaction activity in RogiKotha, but are marked noindex for search engines. Bookmarks remain private.

FR-USER-003 | Must

Blocking prevents direct interaction, mentions and viewing each other’s nonessential activity while preserving public-content availability where required for discussion integrity.

FR-USER-004 | Must

Account deletion de-identifies retained public contributions instead of automatically deleting them. Evidence and legally held data follow retention, privacy objection and legal-hold rules.

FR-USER-005 | Must

Users may optionally provide exact age or age range, gender and relevant-condition tags; date of birth is not collected.

### 6.3 Doctor profiles

FR-DOC-001 | Must

Phase 1 supports community/admin-submitted profiles for BMDC MBBS and BDS doctors. A new profile becomes public only after Admin checks duplicates and obvious abuse; it displays Registration not verified.

FR-DOC-002 | Must

No BMDC verification service is offered in Phase 1. BMDC number and registration status may be entered as profile information but are not presented as verified.

FR-DOC-003 | Must

Profile fields are dynamic and individually hideable. Supported fields include professional name, photo, BMDC number/status, degrees, qualifications, medical school, specialties, claimed expertise, years of experience, designation, hospitals/chambers, schedule, new/follow-up fees, languages, gender and appointment phone/link. Empty fields are not shown.

FR-DOC-004 | Must

Every public field shows provenance/status and last update: Community submitted, Provider confirmed or Admin checked. Admin/Moderator-created sourced data records source URL/description, retrieval date and creator.

FR-DOC-005 | Must

Community users may suggest a profile photograph; Admin must approve and record its source. A claimed doctor may publish their own photo directly. Otherwise display initials/avatar.

FR-DOC-006 | Must

A doctor may claim a profile using a code sent to a publicly listed chamber phone or professional email, with manual evidence review as fallback. Claiming is independent of BMDC verification.

FR-DOC-007 | Must

After claim, schedule, fee, booking contact, languages and chamber details publish immediately with history. Identity, BMDC number, degrees and specialty changes require Admin approval.

FR-DOC-008 | Must

A claimed provider has no privileged review-response channel. They comment like any user, with the applicable public role/status label, and may not disclose patient identity or private medical information.

FR-DOC-009 | Must

Admin can merge confirmed duplicate profiles into one canonical record, transfer reviews/tags/chambers/claims, redirect old URLs and preserve an audit log.

### 6.4 Facility profiles

FR-FAC-001 | Must

Phase 1 supports hospitals, clinics and diagnostic centres. Chains use one parent organization plus one profile per physical branch; reviews belong to the visited branch and the parent may show aggregate summaries.

FR-FAC-002 | Must

Facility verification is optional. Unverified profiles show Not verified; claims use public business contact or manual evidence controlled by Admin.

FR-FAC-003 | Must

Facility feedback remains separate from doctor-treatment feedback and never modifies a doctor’s sentiment, outcome or review summary.

FR-FAC-004 | Must

Facility structured feedback covers staff behaviour/responsiveness, waiting/appointments, cleanliness, billing/value, test/report delivery, patient-perceived report reliability, admission/discharge and recommendation. Reliability is explicitly patient-perceived, not technical accuracy.

### 6.5 Search, discovery and taxonomy

FR-SRCH-001 | Must

One Bangla/English/Banglish search box searches doctor name, BMDC number, specialty, condition, symptom, treatment, medicine and facility; location uses a separate field.

FR-SRCH-002 | Must

Search supports case-insensitive matching, Bangla/English aliases, Banglish transliteration, spelling tolerance and pg_trgm-style fuzzy matching. Ambiguous Banglish shows Did you mean suggestions without replacing the query.

FR-SRCH-003 | Must

Results use All, Doctors, Facilities, Conditions/Tags and Reviews tabs. Doctor/facility result-card fields are dynamically configurable; default cards show identity, type/specialty, location, verification/provenance, condition match and review summary.

FR-SRCH-004 | Must

Search filters include provider/facility type, specialty, condition, symptom, treatment, medicine, location, gender, languages, fee/schedule when available, sentiment, reported outcome, evidence status, claimed/status and profile provenance.

FR-SRCH-005 | Must

Default condition search ordering uses textual/condition relevance followed by relevant public-review count. Users can switch to newest, most reviewed or alphabetical. Sentiment, outcomes, evidence and reactions never influence default ranking.

FR-SRCH-006 | Must

Doctor-profile reviews default to newest. Alternative sorts: most relevant, newest, oldest, Positive first, Negative first and most discussed. These are view options, not provider-quality rankings.

FR-SRCH-007 | Must

Location is manually selected/entered in Phase 1. Device geolocation and Near Me are postponed.

FR-SRCH-008 | Must

Provider profiles, condition pages and public reviews may be indexed. User profiles, drafts, document contents, private activity and evidence OCR are noindex/non-searchable.

#### Tag model

FR-TAG-001 | Must

Each review supports multiple tags in Symptoms, Diagnosis/Condition, Treatment/Procedure, Medicine and Patient-reported outcome groups. At least one condition/symptom/free-text tag or Not sure is required.

FR-TAG-002 | Must

Unmapped Bangla, English or Banglish tags publish immediately as provisional tags. Admin can later map aliases to a canonical tag while retaining every visible submitted form; clicking any alias opens the canonical page.

FR-TAG-003 | Must

Super Admin can create, rename, merge, redirect, deactivate and reorder tag groups and values with audit history.

### 6.6 Review creation

FR-REV-001 | Must

A confirmed account may submit a Quick Review or Detailed Treatment Timeline using a step-by-step mobile-friendly wizard with progress, Back/Next, final preview and encrypted server-side autosave.

FR-REV-002 | Must

Minimum publishable content is provider, short experience description, relationship to patient and at least one condition/symptom/free-text tag or Not sure. Sentiment, ratings, outcomes and evidence remain optional; Phase 1 has no numerical rating.

FR-REV-003 | Must

Detailed review sections include opinion, symptoms/context, diagnosis/explanation, treatment/procedure, medicines, tests, costs, provider and facility, condition tags, reported outcome and evidence. Admin can configure optional structured fields without changing the minimum.

FR-REV-004 | Must

Treatment dates display month/year publicly. An exact date may be stored privately for the author and moderation.

FR-REV-005 | Must

One account may submit multiple reviews for the same provider only for distinct conditions or treatment episodes. Duplicate/spam detection flags suspicious repetition.

FR-REV-006 | Must

Text reviews publish immediately after automated checks for personal data patterns, threats, profanity, spam, duplicates and malicious input. If a file is still processing, the text review publishes and the file shows Processing privately until approved by the technical pipeline.

FR-REV-007 | Must

The author may select Positive, Mixed or Negative experience. This classifies the episode, not the provider’s general medical quality. Selection is optional by default and configurable by Super Admin.

FR-REV-008 | Must

Optional structured checkboxes capture What went well and What could improve for listening, explanation, medicines/tests/risks, respect/empathy, consultation time, cost/value and recommendation. No checkbox generates a numeric score.

FR-REV-009 | Must

Authors may add suggested or custom labels such as Wrong diagnosis, Wrong treatment or Second opinion differed. Labels are visibly prefixed as Reviewer’s label. Super Admin can configure labels and enable or disable label-approval workflow; RogiKotha does not validate the claim.

### 6.7 Sentiment, outcomes and summaries

FR-SUM-001 | Must

Doctor and condition summaries show Positive/Mixed/Negative counts and percentages, Helped/No improvement/Worsened/Uncertain outcome counts and percentages, review count, document count and common condition tags. No combined score exists.

FR-SUM-002 | Must

Facility profiles use the same optional sentiment model and non-scored structured feedback. Facility and doctor summaries remain separate.

FR-SUM-003 | Must

Only public, eligible reviews count. Super Admin may determine eligibility per review through a recorded moderation action; removed reviews do not count. Restoring an eligible review recalculates summaries.

FR-SUM-004 | Must

When data is sparse, show the exact review count and Limited data. Missing sentiment, outcome or evidence is shown as Not provided/No documents—not zero.

FR-SUM-005 | Must

Likes, Dislikes, comments, evidence attachment and outcomes do not weight sentiment, summaries or search ranking. Administrators cannot manually rewrite user sentiment; they may hide ineligible reviews or temporarily freeze a summary during manipulation investigation.

### 6.8 Evidence and treatment comparison

FR-EVD-001 | Must

Evidence is optional. Reviews provide separate sections for Reviewed treatment, Later/alternative treatment and Outcome/follow-up evidence.

FR-EVD-002 | Must

Later-treatment context may include provider, month/year, later diagnosis/explanation, treatment and outcome. A short description is required when the section is used; other fields and evidence-purpose labels are optional and admin-configurable.

FR-EVD-003 | Must

If a later provider has a RogiKotha profile, link it. Otherwise show the entered name as unlinked text and offer profile submission. Never create a positive review or change a provider summary automatically.

FR-EVD-004 | Must

Evidence status is Documents attached. RogiKotha does not authenticate, medically validate or issue confirmation levels. Public copy carries: Uploaded by reviewer; privacy not independently checked; documents are not medically validated.

FR-EVD-005 | Must

Users may write that a later doctor confirmed a different diagnosis. Display it as user-authored text or Reviewer’s label with the platform disclaimer. No system-generated Proven wrong treatment label exists.

FR-EVD-006 | Must

Evidence filters distinguish no documents, reviewed-treatment documents, later-treatment documents, both treatment paths documented and outcome/follow-up documents. These are document-presence filters only.

FR-EVD-007 | Must

The review displays a chronological treatment-comparison timeline. Larger screens may offer side-by-side document comparison; small screens use a sequential viewer.

#### Accepted files and limits

FR-FILE-001 | Must

Accept JPEG/JPG, PNG, WebP, HEIC, PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT and RTF. Reject executables, scripts, archives, password-protected/encrypted documents and macro-enabled files.

FR-FILE-002 | Must

Limit each review to 10 files, 15 MB per file and 100 MB total. Limits are enforced before expensive processing.

FR-FILE-003 | Must

Every upload enters private quarantine. Validate extension, MIME type, magic bytes and size; scan with current ClamAV definitions and fail closed; sanitize/convert Office files in isolation; re-encode images and remove metadata; rasterize documents; apply user redaction; flatten; then publish a processed copy.

FR-FILE-004 | Must

The default evidence flow shows a privacy warning and page/image preview with manual redaction. Users may choose Skip privacy editing only after an extra confirmation. Manual redaction must flatten into page pixels so underlying text is unrecoverable.

FR-FILE-005 | Must

Automatic OCR/redaction is not in Phase 1. The interface warns authors to hide patient name/photo, contacts, address, identifiers, record numbers, QR/barcodes and signatures while preserving provider/facility details.

FR-FILE-006 | Must

Public documents use an in-browser viewer with zoom, pan, fullscreen, page navigation and rotation. Readers may download only the processed/redacted PDF; originals are never public.

FR-FILE-007 | Must

If malware scanning, conversion or redaction processing fails, do not publish the file. Keep the text review public, identify the exact rejected file and reason privately, and offer Replace/Remove plus guidance such as photographing the document.

FR-FILE-008 | Must

Original uploads remain encrypted and private for 90 days by default, configurable by Super Admin, then are permanently deleted unless legal hold applies. Public processed copies follow review retention.

FR-FILE-009 | Must

Extracted document text is never indexed by RogiKotha or search engines and is excluded from product analytics and operational logs.

### 6.9 Follow-ups, corrections and deletion

FR-EDIT-001 | Must

Non-substantive presentation fields may be edited with an Edited timestamp. Material changes to diagnosis, treatment or outcome become dated corrections/follow-ups; the original account remains understandable and private versions are retained for the configured audit period.

FR-EDIT-002 | Must

Follow-ups appear chronologically below the original review; the newest reported status is summarized at the top. Authors cannot pin an older update as current.

FR-EDIT-003 | Must

Authors may delete a review. If discussion context exists, show a Review deleted tombstone; otherwise remove it. Deleted reviews leave summaries immediately. The user may restore within 30 days; Admin may restore an Admin-removed item or act on an author request according to policy.

FR-EDIT-004 | Must

Comment deletion shows a configurable-retention tombstone when replies/context require it and removes the comment completely otherwise. Deleted text remains only in private history for the configured period.

FR-EDIT-005 | Must

Comments may be edited anytime with an Edited timestamp and private version history. Admin/Super Admin may permanently delete according to violation-type configuration, confirmation and audit rules.

### 6.10 Comments, reactions and social controls

FR-COM-001 | Must

Phase 1 comments support text, warned external links, flat replies and @mentions. Images, document attachments, deep nesting and private messages are out of scope.

FR-COM-002 | Must

Any medical discussion is permitted with a persistent disclaimer. Potentially dangerous instructions remain visible with a strong warning and moderator review by default; Super Admin may disable this visibility policy.

FR-COM-003 | Must

Emergency language triggers a non-blocking banner: call 999 for immediate danger, go to the nearest emergency department, use 16263 for non-emergency health guidance and show an admin-editable current crisis-support contact with last-verified date.

FR-REA-001 | Must

A confirmed account may Like or Dislike a review or comment, change the reaction and view public reaction lists. Public identity follows the user’s chosen public profile/display identity.

FR-REA-002 | Must

Reaction activity appears on the content, public user activity and the user’s own dashboard. Reactions affect engagement only—not summaries, ranking or moderation.

### 6.11 Reporting and moderation

FR-MOD-001 | Must

Confirmed users may report reviews, comments, evidence, profiles and accounts using dynamically configurable reasons including privacy, threats, harassment, hate, spam, impersonation, dangerous advice, copyright/ownership, duplicate, off-topic, factual dispute and Other.

FR-MOD-002 | Must

Reporter identity is visible only to Super Admin and users with explicit permission. The reported person receives a generic Content reported notice; after a decision, they receive action, policy reason and appeal path without reporter identity.

FR-MOD-003 | Must

Privacy leaks, credible threats and unsafe files hide immediately on first credible detection/report. Factual disagreement never auto-hides. Other eligible policy reports temporarily hide content at five unique confirmed accounts by default; threshold is configurable and coordinated-report abuse is detected.

FR-MOD-004 | Must

Critical reports target review within 24 hours, standard reports within three business days and appeals within seven business days. These are Beta targets, not 24/7 guarantees.

FR-MOD-005 | Must

Admin may redact private identifiers, remove unsafe files, add warnings or hide content but never rewrite the author’s substantive medical story. Ask the author to revise substantive content.

FR-MOD-006 | Must

The founder handles Phase 1 appeals using a fresh checklist, appeal text and new evidence, recording a new written reason. Independent second review is a future capability.

FR-MOD-007 | Must

Enforcement supports content warning, temporary restriction, feature restriction, temporary suspension and permanent account ban. Super Admin configures available actions and durations; every action is audited.

FR-MOD-008 | Must

Legal hold publicly hides relevant content while temporarily retaining encrypted data, evidence and audit records. Legal preservation overrides ordinary deletion schedules.

### 6.12 Notifications, bookmarks and feedback

FR-NOT-001 | Must

Phase 1 includes an in-app notification centre retained for 90 days. Events include review publication/failure, evidence processing, comments/replies/mentions, reactions, reports/decisions/appeals, provider profile approval/claim, account security and deletion notices.

FR-NOT-002 | Must

Full notification previews, push, SMS and general email notifications are future scope. Phase 1 email is used for verification, security, recovery, legal/policy and scheduled-deletion notices.

FR-NOT-003 | Must

Bookmarks are private. Provider/review following and follow-up reminders are future scope.

FR-FDB-001 | Must

A persistent Feedback action collects an admin-configurable category, description, optional screenshot and permission to contact. Screenshots receive a warning not to include sensitive medical data.

### 6.13 Internationalization, PWA and accessibility

FR-I18N-001 | Must

Detect browser language for the first interface render, provide a persistent Bangla | English switch and remember the user’s override. Interface choice never restricts content language or mixed Bangla/English/Banglish writing.

FR-I18N-002 | Must

Preserve author text in its original language. Optional author-written translation is supported; automated translation is future scope.

FR-PWA-001 | Must

The responsive website is optionally installable as a PWA without app-store distribution. Show installation suggestion after meaningful use, such as a second visit or several viewed pages.

FR-PWA-002 | Must

Offline mode shows a branded fallback and may cache previously viewed non-sensitive public pages. Never cache evidence, drafts, authentication data or sensitive account content for offline use.

FR-A11Y-001 | Must

Phase 1 provides semantic headings/landmarks, form labels, keyboard operation, visible focus, reasonable contrast, meaningful errors and screen-reader-friendly controls. Formal WCAG 2.2 AA certification is Phase 2.

FR-ONB-001 | Must

New accounts receive an optional, skippable three-step introduction to reviews, privacy and evidence labels with Back, Skip and Finish.

### 6.14 Analytics and consent

FR-AN-001 | Must

Use self-hosted Matomo for product analytics and Klaro for cookie consent. Consent offers equal Accept, Reject and Customize choices, remembers preference for 12 months and permits later withdrawal.

FR-AN-002 | Must

Essential security/session cookies remain active. Analytics starts only after consent under the Phase 1 policy.

FR-AN-003 | Must

Track product events and aggregate usage only. Never send medical text, search strings, aliases, evidence filenames, document contents or patient/provider identifiers to analytics.

### 6.15 Administrative configuration

FR-ADM-001 | Must

Without deployment, Super Admin can configure feature visibility, profile/form fields, categories, labels/translations, limits, retention, report thresholds, warnings, emergency contacts, navigation, roles, permissions, sentiment presentation, browser-support display and public status labels.

FR-ADM-002 | Must

Settings have change history and export/import. Safe settings may be restored to a prior value. Security-critical logging cannot be completely disabled.

FR-ADM-003 | Must

All administrative configuration changes record actor, timestamp, previous value, new value and result. Sensitive changes require password re-confirmation.

FR-ADM-004 | Must

Admin dashboard provides moderation queues, evidence failures, provider profiles, taxonomy, users, claims, permissions, notifications, content eligibility, audit/content history, retention, health checks and Beta metrics.

## 7. Core workflows and state models

### 7.1 Review publication

- User selects an existing provider or submits a missing provider. A missing provider must pass duplicate/abuse review before the linked review can publish; the review remains an encrypted draft.

- User chooses Quick or Detailed, supplies minimum content, chooses identity presentation and optionally adds sentiment/outcome/labels/evidence.

- Client and server validate required fields; automated text checks identify privacy patterns, threats, profanity, spam and duplicates.

- User sees final preview, disclaimer and Publish action.

- Eligible text publishes immediately. Evidence remains private while processing.

- Successful public copies attach to the review. Failed files produce an author notification and replacement action without removing the text review.

- Review becomes searchable/indexable according to SEO rules and updates profile/tag summaries.

### 7.2 Evidence processing

- Receive into private quarantine with opaque storage key.

- Enforce count/size; validate extension, MIME and magic bytes.

- Run ClamAV with current definitions; fail closed when scanning is unavailable.

- Sanitize and convert Office documents with isolated LibreOffice; re-encode images with Sharp/libvips and strip metadata.

- Rasterize pages and create preview; present manual redaction with skip confirmation.

- Flatten final pages into a processed PDF with no recoverable underlying redacted text.

- Store processed public copy separately; publish viewer/download URL with access controls.

- Delete encrypted original after configured retention unless legal hold applies.

### 7.3 Review lifecycle

| State | Public behaviour | Transitions |
|---|---|---|
| Draft | Not public; encrypted; may be accessible to authorized Admin with audit | Publish, expire after 30 days, author delete |
| Published | Public and eligible unless separately excluded | Edit, follow-up, report, author delete, Admin hide |
| Temporarily hidden | Tombstone/status as policy requires; excluded from summary | Restore, remove, appeal |
| Author deleted | Tombstone if discussion exists; excluded | Author restore within 30 days, purge schedule |
| Admin removed | Policy tombstone; excluded | Appeal, Admin restore, retention purge |
| Legal hold | Publicly hidden; encrypted preservation | Release hold, restore/remove under legal process |

### 7.4 Treatment timeline example

Original — March 2026 Reviewer reports that Doctor A attributed a leg problem to diabetes or the spine and provided injections. Outcome selected: Worsened. Reviewed-treatment documents attached.

Later care — April 2026 Reviewer reports that Doctor B identified a leg-nerve problem and prescribed medicine and a custom shoe. Later-treatment documents attached.

Follow-up — June 2026 Reviewer reports improved walking but incomplete recovery. Latest status summarized at the top; original statements remain unchanged.

The platform may show Both treatment paths documented, but does not state that either diagnosis was medically verified or that one doctor was legally/clinically wrong.

### 7.5 Reporting and appeal

- Confirmed user selects target, reason and optional private report evidence.

- Critical privacy/threat/file signals hide immediately; ordinary reports count toward the configurable threshold; factual disputes stay visible.

- Authorized moderator applies checklist, views only permissions needed and records action/reason.

- Reported author receives decision and appeal path; reporter receives status without private enforcement detail.

- Appeal triggers a fresh founder review and a new written reason.

## 8. Data model and business rules

### 8.1 Core entities

| Entity | Purpose | Key relationships |
|---|---|---|
| Account | Private login, status, recovery, settings | PublicProfile, Session, Role, Contribution |
| PublicProfile | Username, display name, alias and public role/status | Reviews, comments, reactions |
| Doctor | Canonical provider identity and dynamic fields | Chambers, claims, reviews, tags |
| FacilityOrganization | Chain/parent organization | FacilityBranch |
| FacilityBranch | Physical care location | Facility reviews, doctor chambers |
| ProfileFieldValue | Value, visibility, provenance, source and history | Doctor or Facility |
| Review | Treatment/facility episode and public identity | TimelineEvent, sentiment, outcomes, tags, evidence |
| TimelineEvent | Original, correction or dated follow-up | Review, provider/facility references |
| EvidenceAsset | Quarantine/original/processed states and retention | Review, timeline event, report |
| Tag / TagAlias | Canonical taxonomy and submitted aliases | Reviews and search |
| Comment / Reaction | Discussion and engagement | Review/comment, public identity |
| Report / Appeal | Policy workflow and private reporter identity | Content, account, evidence, decisions |
| AuditEvent | Actor/action/object/result without medical payload | Admin/security operations |
| ContentVersion | Encrypted substantive history | Review/comment/profile value |
| ConfigValue | Dynamic behaviour, thresholds and retention | Config history |

### 8.2 Sentiment and outcome rules

- Sentiment values are Positive, Mixed and Negative; optional and user-selected.

- Outcome values are Helped, No improvement, Worsened and Uncertain; optional and separate for reviewed versus later treatment.

- Missing values are excluded from the relevant denominator and labelled Not provided.

- Percentages always show counts and denominator; Limited data appears for sparse results.

- No star score, Bayesian score, combined clinical-quality score or outcome-weighted score is calculated.

- Sentiment and outcomes do not affect neutral search ranking.

### 8.3 Review eligibility

A review is summary-eligible only when it is public, not deleted/hidden, not marked duplicate/spam, and not excluded by a recorded Super Admin eligibility decision. Evidence presence, sentiment direction and provider claim status do not determine eligibility. Eligibility changes are audited and recalculate affected summaries.

### 8.4 Retention defaults

| Data | Default | Configuration / exception |
|---|---|---|
| Evidence originals | 90 days | Admin-configurable; legal hold overrides |
| Processed public evidence | While review is retained | Removed with review/evidence policy |
| Encrypted drafts | 30 days | User may delete earlier |
| Audit log | 180 days | Admin-configurable; legal need may override |
| Content versions | Same dynamic period as audit | Encrypted; access controlled |
| In-app notifications | 90 days | System cleanup |
| Author-deleted restore window | 30 days | Then ordinary retention/purge |
| Cookie preference | 12 months | User may change anytime |
| Accounts | No automatic deletion | Configurable cleanup with advance notice |

## 9. Security, privacy and trust

### 9.1 Security requirements

- TLS for all external traffic; HSTS after validation; secure, HttpOnly, SameSite cookies.

- Argon2id password hashing; CSRF protection; server-side authorization for every protected action.

- Input validation, output encoding, parameterized database access and strict Content Security Policy.

- Rate limits: initial defaults of 5 reviews/day, 30 comments/hour, 100 reactions/hour and 5 profile submissions/day per account, with risk-based adjustment and admin configuration.

- Uploads stored outside webroot in private Garage buckets using opaque keys, least-privilege access and separate quarantine/original/processed locations.

- ClamAV definitions updated with freshclam; scanning failure blocks file publication.

- Office conversion isolated with resource/time limits; no macros, password-protected files, archive extraction or active content.

- Secrets mounted through Docker Compose secrets and never committed to the repository.

- Dependency and container scanning in release pipeline; vulnerability/dependency register; replace or fork abandoned open-source dependencies.

- GlitchTip error monitoring scrubs medical fields, request bodies, aliases, filenames and secrets.

### 9.2 Privacy requirements

- Collect the minimum account and treatment metadata needed for the product.

- Patient identifiers are warned against and manually redacted; provider identity remains visible where relevant.

- No evidence text, medical story, private alias mapping or search query appears in analytics.

- Operational logs exclude health content and direct identifiers wherever possible; log stable internal IDs, event type, result and reason code.

- Reporter identity and evidence originals require explicit permissions; access is logged and reviewable.

- Public user profiles are noindex; document contents are never indexed.

- Account deletion de-identifies public contributions; patient privacy objections and legal orders may require additional removal.

### 9.3 Audit versus content history

Audit log Records who performed which action, on what object, when, result and reason code. It does not contain full medical stories or document contents.

Encrypted content-version store Stores prior substantive versions needed for disputes, appeals and restoration. It has separate access control, retention and access audit.

### 9.4 Accepted Phase 1 risks

| Risk | Accepted decision | Required mitigation |
|---|---|---|
| No automated OCR redaction | Manual warning/redaction; user may skip | Technical file security, flattened redaction, report-and-hide privacy path |
| Single VPS | App, database, files and support services share host | Health/disk alerts, restart policies, capacity monitoring, recovery runbook |
| Manual local backups | No automated off-site backup in Phase 1 | Pre-release and scheduled founder checklist; verify restore periodically |
| No Admin MFA | 30-day Admin session | New-device email approval, strong password, session management, audit |
| Founder moderation | Defined daily hours, no 24/7 staff | Critical prioritization, published targets, feature throttles and threshold controls |
| Legal review postponed | Public Beta may begin before full counsel review | Prominent accepted high-severity risk; law overrides product policy |

## 10. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-001 | Performance | Important public pages become usable in approximately 3 seconds on an ordinary Bangladesh mobile connection, excluding large evidence downloads. |
| NFR-002 | Evidence | Normal evidence processing targets 5 minutes; delayed items show status without a completion guarantee. |
| NFR-003 | Availability | Best-effort Beta with monitoring and recovery; no contractual uptime SLA. |
| NFR-004 | Responsive UI | Support phone widths first, then tablet and desktop browsers with no horizontal overflow in primary journeys. |
| NFR-005 | Browsers | Current and previous major Chrome, Edge, Firefox and Safari plus modern Android/iOS browsers; list is admin-configurable. |
| NFR-006 | Accessibility | Keyboard, labels, focus, contrast, semantic structure and error association across critical flows. |
| NFR-007 | Localization | All interface strings externalized; Bangla and English parity; user content Unicode-safe. |
| NFR-008 | SEO | Server-rendered public profiles/reviews with canonical URLs, redirects after merge and evidence/user noindex controls. |
| NFR-009 | Scalability | Stateless web/worker design and S3-compatible storage interfaces allow later horizontal migration without rewriting domain data. |
| NFR-010 | Observability | Structured scrubbed logs, GlitchTip errors, queue/scan/storage/database health and disk-capacity alerts. |
| NFR-011 | Maintainability | TypeScript strict mode, migrations, automated tests, documented configuration and dependency register. |
| NFR-012 | Recoverability | Previous application image retained; migration recovery instructions and manual database/object backup before production release. |

## 11. Technical architecture and operations

### 11.1 Selected stack

| Layer | Phase 1 selection | Notes |
|---|---|---|
| Web | Next.js App Router + TypeScript | Responsive PWA, SSR/SEO, one product codebase |
| Database | PostgreSQL | Transactional data, FTS, pg_trgm and initial job queue |
| Authentication | Auth.js + credentials + Argon2id | Use established session/CSRF components; application owns password lifecycle |
| Object storage | Garage S3-compatible | Same VPS initially; private versioned/encrypted buckets |
| Evidence | ClamAV, LibreOffice, PDF.js, Poppler, Sharp/libvips | Private quarantine and isolated processing |
| Analytics/consent | Matomo On-Premise + Klaro | Consent-based, product events only |
| Monitoring | GlitchTip | Self-hosted and aggressively scrubbed |
| Deployment | Docker Compose on one VPS | Local development and production only |
| Email | Transactional provider free tier | Verification/security/legal messages |
| Source | Private repository using licence-compatible OSS dependencies | Paid only for approved exceptions |

### 11.2 Service boundaries

- web: Next.js application and server endpoints

- worker: asynchronous evidence, notification, summary and cleanup jobs

- postgres: transactional source of truth and job queue

- garage: quarantine, encrypted originals and processed public objects

- clamav: malware scanning with fresh definitions

- document-converter: isolated LibreOffice/Poppler/Sharp processing

- matomo: consent-based analytics isolated from product medical content

- glitchtip: scrubbed errors and alerts

- reverse-proxy: TLS termination, request limits, security headers and routing

### 11.3 Deployment and secrets

Use separate development and production Compose configurations, immutable application images, restart policies, health checks, least-privilege networks/users, persistent named volumes and per-service secrets. Inspect the resolved Compose configuration before deployment. Production deploys retain the prior image and include a database migration check, manual backup checkpoint and rollback/recovery instructions.

### 11.4 Backup and recovery

Phase 1 uses founder-downloaded manual backups. At minimum, the operations checklist prompts a database and object snapshot before every production release and on a configured recurring schedule. Backups must be encrypted, stored outside the VPS by the founder and periodically test-restored. Automated nightly restic backups to off-site storage are the highest Phase 2 infrastructure priority.

### 11.5 Capacity

The VPS must be sized after a staging-equivalent local load test of PostgreSQL, Garage, ClamAV, conversion, Matomo and GlitchTip. Storage alerts are mandatory because evidence and logs can exhaust disk. The approved infrastructure budget may reach USD 100/month. If one host cannot maintain safe scanning and responsive public traffic, evidence processing or observability services must move to a separate host before promotion increases.

## 12. Legal and policy requirements

### 12.1 Required public policies

- Terms of Service, Privacy Policy, Community/Review Guidelines, Evidence and Privacy Notice, Copyright/Ownership reporting, Moderation and Appeals policy, Cookie notice and Emergency disclaimer.

- Terms and Privacy acceptance is versioned at registration; material changes require renewed acceptance.

- The medical-content disclaimer appears at first review, after material changes and as a short reminder beside Publish; timing is admin-configurable.

- Policies state that authors are responsible for claims/uploads, RogiKotha does not validate clinical accuracy, user content is not RogiKotha’s opinion, and the service is not medical advice.

- Policies cannot promise immunity from platform obligations. Bangladesh counsel must review before broad promotion.

### 12.2 User warranties and notices

- Author believes the account is honest and based on personal/witnessed experience.

- Author has the right to submit the story and files and must remove unrelated patient identifiers.

- Author understands that false, defamatory, threatening, copyrighted or privacy-violating material may create personal consequences and removal/enforcement.

- Documents attached—not medically validated; privacy not independently checked.

- Do not delay emergency care or change treatment based solely on RogiKotha content.

### 12.3 Legal response capability

Super Admin can preserve relevant records, restrict access, record legal requests, export a scoped case package, apply legal hold and document release. The product must never promise automatic disclosure; requests are evaluated under applicable law and counsel. Defamation, privacy and medical-record exposure are high-severity launch risks.

## 13. Testing, release and beta operations

### 13.1 Environments

Phase 1 maintains local development and production only. The absence of staging is an accepted risk. CI must create isolated test services with Docker Compose; production-like evidence processing is exercised before release without using real patient documents.

### 13.2 Release gates

- Unit and integration suites pass.

- Critical end-to-end journeys pass in Bangla and English.

- Dependency, container and secret scans pass with no unresolved critical finding.

- Database migration forward path and recovery instructions are verified.

- Evidence pipeline passes safe, malicious, oversized, mismatched, unsupported and failure-path fixtures.

- Manual production backup checkpoint completes.

- Previous deployable image remains available.

- Accessibility audit has no unresolved critical issue in core journeys.

- Privacy/analytics test confirms no medical payload in events, errors or logs.

### 13.3 Mandatory end-to-end journeys

- Register, verify, sign in, new-device Admin approval and manual recovery.

- Search in Bangla, English and Banglish; filter; no-result provider submission.

- Create/approve/merge doctor and facility profiles; claim and update profile.

- Quick review, detailed timeline, anonymous presentation, draft expiry and final preview.

- Safe evidence, manual redaction, skip confirmation, processing, viewer/download and rejection replacement.

- Sentiment/outcome summary calculation and eligibility recalculation.

- Follow-up, material correction, author delete/tombstone and restore.

- Comment, edit/delete tombstone, mention, Like/Dislike and blocking.

- Critical report hide, five-report threshold, factual dispute, decision and appeal.

- Language switching, cookie consent, PWA install/offline and no sensitive caching.

### 13.4 Beta launch sequence

- Complete technical and policy release gates; record accepted risks.

- Deploy with Beta label, empty provider directory and search-first empty states.

- Invite a small known group, then allow anyone to register while promotion remains limited.

- Monitor evidence failures, storage, search failures, privacy reports and moderation load daily.

- Use Feedback categories and known-issues/changelog page to prioritize fixes.

- Expand promotion only when founder workload and critical metrics remain manageable.

### 13.5 Public operational communication

Publish a simple changelog and known-issues page. A full live status page is Phase 2. Moderation targets are published as targets, not guarantees. Emergency contacts show a last-verified date and are reviewed on an admin-configurable schedule.

## 14. Metrics, risks and roadmap

### 14.1 Privacy-safe analytics events

| Event family | Examples | Prohibited properties |
|---|---|---|
| Acquisition | page_view, signup_started/completed, pwa_install | Search text, referral containing medical query |
| Discovery | search_submitted, result_opened, filter_used, no_result | Raw query, provider/patient identifier |
| Contribution | review_started/published, evidence_started/succeeded/failed | Story text, tags if individually sensitive, filename |
| Engagement | comment_created, reaction_changed, bookmark_changed | Comment text, public alias |
| Trust | report_submitted, content_hidden, appeal_submitted | Report text, reporter identity, evidence |
| Operations | queue_delay_bucket, scan_failure_type, storage_threshold | Document content or object key |

### 14.2 Principal risks

| Risk | Impact | Response |
|---|---|---|
| Defamation/legal complaint | High | Clear attribution, report/takedown, audit, legal hold, counsel review |
| Patient privacy leak | Critical | Warning/redaction, immediate hide, access control, processed copies |
| Malicious upload | Critical | Quarantine, validation, ClamAV fail-closed, isolation, no active formats |
| Coordinated reviews/reports | High | Confirmed accounts, limits, duplicate signals, threshold abuse detection |
| Sentiment misinterpreted as quality | High | Episode wording, no score, counts/denominators, Limited data |
| Founder overload | High | Reactive queues, automation, dynamic throttles, limited promotion |
| Single-host loss | Critical | Manual external backups, restore tests; automate off-site in Phase 2 |
| Open-source maintenance | Medium | Dependency register, updates, replace/fork abandoned components |
| Low directory coverage | Medium | No-result profile submission, honest empty states, organic growth |

### 14.3 Phase 2 backlog

- Automated OCR/PII detection and self-hosted redaction assistance.

- Automated nightly encrypted restic backups and off-site object storage.

- Admin MFA/passkeys, shorter privileged sessions and self-service email recovery.

- Staging environment, multi-host separation, stronger availability and incident-response plan.

- Email/push notification preferences, reminders, following and optional mutual-consent messaging.

- Automated translation using self-hosted LibreTranslate or another reviewed component.

- BMDC verification integration if an authoritative, lawful and maintainable method becomes available.

- Formal WCAG 2.2 AA audit, full data export and expanded privacy-rights tooling.

- Native apps only if evidence shows the PWA is insufficient; no current commitment.

- International country/regulator/locale model after Bangladesh workflows are stable.

### 14.4 Explicitly rejected roadmap items

- Community doctor voting to validate treatment correctness.

- Platform medical confirmation levels or evidence authenticity certification.

- Automatic conversion of outcomes into provider ratings.

- Paid review removal or undisclosed paid ranking.

## 15. Final acceptance criteria

- A visitor can find a doctor/facility by Bangla, English or Banglish term and understand that results are patient-reported.

- A confirmed adult account can publish a minimum Quick Review without sentiment, outcome or evidence.

- A detailed review can show reviewed care, later care and follow-ups as a coherent timeline.

- The platform never presents a user allegation or two document sets as its own medical finding.

- Doctor/facility pages show non-numeric, condition-specific sentiment and outcome distributions with counts and Limited data.

- No summary or default search order is influenced by Likes, Dislikes, sentiment direction, outcomes or evidence.

- An unsafe or failed upload never becomes public, while the safe text review can remain public.

- A redacted public copy contains no recoverable redacted text layer and the original is never downloadable.

- Critical privacy/threat/file reports hide promptly; factual disputes remain visible during review.

- Reporter identity and original-evidence access are permission-controlled and audited.

- Admin can configure agreed fields, labels, navigation, limits, thresholds and retention without deployment.

- Core mobile journeys have no horizontal overflow and work with keyboard, labels and visible focus.

- Production release gates, backup checkpoint and rollback instructions pass.

- Terms/Privacy/medical notices are versioned, accepted and reviewed for Bangladesh launch risk.

Approval state The requirements interview is complete. Changes to the narrative-first sentiment model, medical-validation boundary, evidence processing, moderation thresholds or retention rules require an explicit product decision and PRD revision.

## Appendix A. Glossary

| Term | Meaning in RogiKotha |
|---|---|
| Treatment episode | A distinct condition/care encounter reviewed separately |
| Sentiment | Optional Positive/Mixed/Negative classification of one experience |
| Outcome | Patient-reported Helped/No improvement/Worsened/Uncertain |
| Reviewer’s label | User-selected/custom claim displayed as the reviewer’s wording |
| Evidence | User-uploaded documents; not authenticated or medically validated |
| Processed copy | Sanitized, converted, flattened public/downloadable version |
| Original | Encrypted private upload retained temporarily and never public |
| Tombstone | Placeholder showing that removed content once occupied a discussion position |
| Canonical tag | Admin-managed concept receiving multiple visible aliases |
| Profile provenance | Community submitted, Provider confirmed or Admin checked source status |
| Eligible review | Public review included in distributions under policy |
| PWA | The same responsive website optionally installable from a browser |

## Appendix B. Final decision register

| Area | Approved decision |
|---|---|
| Market | Bangladesh first; international later |
| Platform | Responsive mobile-first PWA; no native app commitment |
| Directory | Starts empty; user/Admin/Moderator creation with provenance |
| Verification | No BMDC verification Phase 1; optional claims independent of BMDC |
| Review model | Narrative-first; optional Positive/Mixed/Negative; no numeric rating |
| Medical claims | User-authored; RogiKotha never validates |
| Evidence | Optional; Documents attached only; separate treatment sections |
| Publication | Text immediate after automated checks; evidence after safe processing |
| Moderation | Reactive; critical first detection, ordinary threshold five, factual dispute stays |
| Identity | Real/pseudonymous/anonymous; confirmed email account |
| Language | Bangla/English UI; Bangla/English/Banglish content unrestricted |
| Infrastructure | One Docker Compose VPS, PostgreSQL, Garage, manual external backup |
| Economics | Open-source-first; limited approved paid exceptions |

## Appendix C. Research and standards sources

S1. AHRQ — What Is Patient Experience?

S2. AHRQ — Patient narrative item sets

S3. AHRQ PSNet — Diagnostic errors

S4. AHRQ — Special considerations for measuring diagnostic safety

S5. WHO — Diagnostic errors and safer primary care

S6. WHO — Patient safety fact sheet

S7. OWASP — File Upload Cheat Sheet

S8. OWASP — Password Storage Cheat Sheet

S9. OWASP — Logging Cheat Sheet

S10. OWASP — User Privacy Protection Cheat Sheet

S11. Next.js — Self-hosting guidance

S12. Docker — Compose in production

S13. Docker — Manage secrets in Compose

S14. Matomo — On-Premise self-hosting

S15. Care Opinion — Independent patient-story feedback platform

S16. Bangladesh Laws — Penal Code section 499 (defamation)

S17. Bangladesh Laws — Penal Code chapter XXI / section 500

S18. Web.dev — Progressive Web Apps

S19. W3C — Internationalization techniques

Research informs product safeguards and terminology; it does not replace Bangladesh legal advice, medical review or a technical security assessment.
