# RogiKotha requirement baseline

Status: Gate 1 baseline approved; founder decisions FD-001–024 apply  
Baseline date: 2026-08-29  
Primary source: PRD v1.0 (2026-08-29)  
Business source: BRD v1.0 (2026-08-27)

## How to read this baseline

- **Confirmed requirement** means the PRD states it explicitly and no material internal ambiguity has yet been found.
- **Later explicit decision** means the PRD intentionally replaces an older BRD rule; the older rule is not reintroduced.
- **Founder confirmation required** is historical wording for questions that were later resolved in `02-conflicts-assumptions-questions.md` and `docs/status/decision-log.md`.
- **Implementation recommendation** belongs in research/architecture artifacts and is not silently promoted into a product requirement.
- The PRD contains 100 functional requirement IDs and 12 non-functional requirement IDs. The BRD contains 53 business requirement IDs.

## Business objectives

Sources: BRD sections 1-4; PRD sections 1-2.

- Make Bangladesh patient-reported treatment experiences discoverable by provider, condition, symptom, treatment, medicine, facility, and location.
- Center each story on a specific care/treatment episode rather than a permanent judgment of a provider.
- Support quick and chronological review formats and preserve meaningful original history through dated corrections/follow-ups.
- Keep doctor-treatment, doctor-experience, facility-experience, engagement, evidence presence, sentiment, and outcome signals conceptually separate.
- Provide a real public product with privacy, safety, moderation, legal-response, audit, and operational controls.
- Remain Bangladesh-first while keeping country, registry, locale, taxonomy, emergency-resource, and policy boundaries replaceable for later expansion.
- Use open-source-first technology and avoid building security-sensitive parsers, cryptography, malware scanners, or renderers from scratch.

## Users and roles

Sources: PRD sections 3.1-3.4; BRD section 5.

- Public account roles include patient, parent/guardian, caregiver/family, treatment witness, doctor/dentist, nurse/healthcare professional, facility representative, researcher/student/other/prefer-not-to-say.
- Role labels are descriptive; self-declaration does not authorize medical advice or imply verification.
- Administrative roles are Super Admin, permission-scoped Admin, and permission-scoped Moderator.
- Account role, provider-profile claim/status, and relationship to the patient are separate facts.
- Reporter identity and original-evidence access require separate explicit permissions and audited access.
- Accounts are adult-only (18+); a parent/guardian may review a minor's care. A user may report another adult's care without platform-verified consent, subject to warnings/removal requests. This accepted rule requires legal/privacy confirmation (CQ-09).

## Accounts and identity

Sources: FR-AUTH-001-009, FR-USER-001-005.

- Browsing public content, including processed evidence, does not require an account; contribution actions require a confirmed email account.
- Registration requires email, password, unique username, display name, interface language, Terms/Privacy acceptance, and age confirmation.
- Passwords use Argon2id with current OWASP-aligned parameters, unique salts, international passphrases, and a minimum length of 10.
- Email confirmation expires after 24 hours; resend is rate-limited.
- Users have a unique normally permanent username, mutable non-unique display name, and real-name/pseudonymous/anonymous presentation per review.
- Anonymous presentation uses a stable alias; prior identities remain private to authorized administrators.
- Sessions last up to 30 days; users can inspect sessions/logins and revoke all sessions.
- Administrative new-device login requires email approval and strong-password verification. Phase 1 omits MFA and self-service recovery; both are challenged in CQ-05.
- Public profiles are `noindex`; bookmarks are private; account deletion de-identifies retained public contributions subject to retention/legal holds.
- Blocking prevents direct interaction/mentions while preserving public discussion context.
- Per-review identity, comments, reaction lists, and public-profile contribution linkage contain a material anonymity ambiguity (CQ-04).

## Doctor profiles

Sources: FR-DOC-001-009; PRD appendix B decision register.

- Phase 1 directory entries are for BMDC MBBS/BDS doctors, submitted by community/admin and reviewed for duplicate/obvious abuse before publication.
- The later PRD decision explicitly removes BMDC verification from Phase 1; profiles show `Registration not verified` even when a BMDC number/status is entered.
- Dynamic fields include professional identity, photo, registration details, education, specialty/expertise claims, experience, designation, chambers/schedules/fees, languages, gender, and appointment contact/link; empty fields are omitted.
- Every field shows provenance/status and last update: Community submitted, Provider confirmed, or Admin checked.
- Community-suggested photos require approval/source; claimed providers may publish their own.
- Claims use publicly listed chamber contact or manual evidence and are independent of BMDC verification.
- Claimed providers may directly update operational fields; identity/registration/degree/specialty changes require approval.
- The PRD intentionally removes a privileged review-response channel; claimed providers comment as ordinary users with the applicable status label.
- Duplicate merge transfers reviews, tags, chambers, and claims, redirects old URLs, and preserves audit history.

## Facility profiles

Sources: FR-FAC-001-004.

- Support hospitals, clinics, and diagnostic centres with a parent organization plus physical branch model.
- Reviews belong to the visited branch; parent profiles may aggregate branch summaries.
- Verification is optional; unverified entries show `Not verified`; claims use public business contact or manual evidence.
- Facility feedback remains separate from doctor-treatment feedback.
- Structured, non-scored feedback covers behaviour/responsiveness, waiting, cleanliness, billing/value, delivery time, perceived report reliability, admission/discharge, and recommendation; reliability is explicitly reviewer perception.

## Search and taxonomy

Sources: FR-SRCH-001-008, FR-TAG-001-003.

- One Unicode-safe Bangla/English/Banglish search field covers provider, registration number, specialty, condition, symptom, treatment, medicine, and facility; location is separate.
- Search supports aliases, transliteration, spelling tolerance, and trigram-style fuzzy matching. Ambiguous Banglish produces suggestions without silently replacing the query.
- Results use All, Doctors, Facilities, Conditions/Tags, and Reviews tabs; result-card fields are dynamically configurable.
- Filters cover profile type, specialty, condition/symptom/treatment/medicine, location, gender, languages, fee/schedule, sentiment, reported outcome, evidence status, claim/status, and provenance.
- Default condition ordering is textual/condition relevance then relevant public-review count. Sentiment, outcome, evidence, and engagement do not influence neutral ranking.
- Provider-profile review sorts may include relevance, time, sentiment-first, and discussion views without becoming provider-quality ranking.
- Phase 1 uses manual location entry, not device geolocation.
- Public provider, condition, and review pages may be indexed; user profiles, drafts, private activity, document contents, and evidence OCR are excluded.
- Reviews accept grouped tags and require at least one condition/symptom/free-text tag or `Not sure`.
- Unmapped Bangla/English/Banglish tags publish provisionally; later alias mapping preserves submitted wording and redirects to canonical pages.

## Review creation

Sources: FR-REV-001-009.

- Confirmed accounts choose Quick Review or Detailed Treatment Timeline through a mobile wizard with progress, back/next, final preview, and encrypted server-side autosave.
- Minimum publication fields are provider, short experience, relationship, and condition/symptom/free-text tag or `Not sure`.
- Sentiment, outcomes, structured feedback, labels, and evidence are optional; numerical ratings do not exist in Phase 1.
- Detailed reviews cover opinion, context/symptoms, diagnosis/explanation, treatment/procedure, medicines, tests, costs, provider/facility, tags, outcome, and evidence.
- Public dates are month/year; exact date may remain private.
- Repeated provider reviews require distinct conditions/episodes; suspicious repetition is flagged.
- Eligible text publishes after automated text checks. Evidence processes independently and a failed file does not remove safe text.
- Optional Positive/Mixed/Negative sentiment classifies the episode, not overall medical quality.
- Optional structured `went well` / `could improve` fields never create a number.
- Custom allegations such as `Wrong diagnosis` are visibly labeled `Reviewer's label`; no platform validation is implied.

## Timelines and follow-ups

Sources: FR-EVD-002-003, FR-EVD-007, FR-EDIT-001-005; PRD sections 7.3-7.4.

- Reviewed care, later/alternative care, outcome/follow-up evidence, and dated updates form one coherent chronology.
- Later care may reference a linked RogiKotha provider or unlinked text and may prompt profile submission; it never auto-creates a review.
- Material changes become dated corrections/follow-ups; original meaning remains understandable and private versions follow retention.
- Latest reported status is summarized at the top; the author cannot pin an older update as current.
- Author-deleted reviews use a tombstone when discussion context exists, immediately leave summaries, and have a 30-day restore window.
- Comment deletion similarly preserves a tombstone only when context requires it.

## Sentiment and outcome presentation

Sources: FR-SUM-001-005; PRD section 8.2 and appendix B.

- Narrative-first presentation is a later explicit PRD decision replacing BRD star ratings and Bayesian scoring.
- Optional sentiment values are Positive, Mixed, Negative; optional outcome values are Helped, No improvement, Worsened, Uncertain.
- Provider/condition summaries show counts, percentages/denominators, review count, document count, and common tags—never a combined score.
- Missing values are `Not provided`/`No documents`, not zero.
- Only public eligible reviews count; recorded eligibility changes recalculate summaries.
- Likes, Dislikes, discussion, evidence presence, and outcomes never weight sentiment or default search.
- `Limited data` always shows exact review count; the precise sparse-data threshold remains a founder/product decision (CQ-11).

## Evidence and document processing

Sources: FR-EVD-001-007, FR-FILE-001-009; PRD section 7.2.

- Evidence is optional, grouped into reviewed treatment, later/alternative treatment, and outcome/follow-up.
- Status language is `Documents attached`; public copy states reviewer upload, privacy not independently checked, and no medical validation.
- Presence filters never imply authenticity or clinical correctness.
- Accepted Phase 1 types currently include images, HEIC, PDF, legacy/current Office documents, TXT, and RTF; executables, scripts, archives, encrypted/password-protected, and macro-enabled files are rejected. Breadth and risk are challenged in CQ-07.
- Limits are 10 files/review, 15 MB/file, and 100 MB total, enforced before expensive processing.
- Every file enters private quarantine; extension/MIME/magic/size are validated; malware scanning fails closed; Office conversion is isolated; images are re-encoded/metadata-stripped; documents are rasterized; redaction is flattened; only the processed copy is public.
- Authors receive a privacy preview/manual redaction flow and may currently skip it after confirmation. The lack of automated PII detection plus skip path is challenged in CQ-06.
- Public viewer supports zoom, pan, fullscreen, page navigation, rotation, and processed-PDF download; originals never become public.
- Failed processing keeps the file private and offers replace/remove guidance.
- Original retention defaults to 90 days unless legal hold; document text is never indexed or sent to analytics/logs.

## Comments and reactions

Sources: FR-COM-001-003, FR-REA-001-002, FR-USER-003.

- Phase 1 comments are text with warned external links, flat replies, and mentions. Attachments, deep nesting, and private messaging are later scope.
- Medical discussion carries a persistent disclaimer. Dangerous advice is warned and reviewed; the configurable ability to weaken this behaviour is challenged in CQ-08. ⚠ The PRD's `FR-COM-003` (¶355–356) — an emergency-language banner offering 999 / 16263 — is not represented in this baseline; its ID was reused for comment edit/delete. See [Known ID collision](06-requirement-traceability-matrix.md#known-id-collision-fr-com-003). Note this is distinct from FD-009/FD-017, which forbid automated dangerous-advice classification.
- Confirmed accounts can Like/Dislike reviews/comments, change reaction, and view public lists.
- Reactions are engagement only and appear on content, public activity, and the user's dashboard.
- Identity behaviour across anonymous reviews, reaction lists, and public profiles requires clarification (CQ-04).

## Reporting and moderation

Sources: FR-MOD-001-008; PRD section 7.5.

- Configurable report reasons include privacy, threats, harassment, hate, spam, impersonation, dangerous advice, ownership/copyright, duplicate, off-topic, factual dispute, and other.
- Reporter identity is restricted; the reported person receives generic report notice and later action/policy/appeal information without reporter identity.
- Privacy leaks, credible threats, and unsafe files hide on first credible detection/report. Factual disagreement never auto-hides.
- Other eligible reports temporarily hide at five unique confirmed accounts by default; threshold is configurable and coordinated abuse must be detected.
- Beta review targets are 24 hours critical, three business days standard, seven business days appeals—not 24/7 guarantees.
- Moderators may redact identifiers, remove unsafe files, warn, or hide, but may not rewrite substantive medical narrative.
- Founder conducts Phase 1 appeals with a fresh checklist and written reason.
- Enforcement includes warnings, restrictions, suspension, and bans; every action is audited.
- Legal hold hides content publicly while preserving scoped encrypted records.

## Notifications

Sources: FR-NOT-001-003, FR-FDB-001.

- In-app notifications cover publishing/evidence, interactions, reports/appeals, profiles/claims, security, and deletion and retain for 90 days.
- Phase 1 email is limited to verification, security, recovery, legal/policy, and deletion messages.
- Push/SMS/general digests, following, and reminders are future scope.
- Bookmarks are private.
- Persistent feedback supports category, description, optional screenshot, contact permission, and a sensitive-data warning.

## Administration

Sources: FR-ADM-001-004.

- Super Admin can configure product visibility, fields, categories, labels/translations, limits, retention, report thresholds, warnings, emergency contacts, navigation, roles/permissions, sentiment presentation, browser-support display, and status labels without deployment.
- Settings have history and export/import; safe values may roll back; security logging cannot be fully disabled.
- Every configuration change records actor, time, prior/new values, and result; sensitive changes require password confirmation.
- Admin surfaces cover moderation, evidence failures, directory/taxonomy, users/claims/permissions, notifications, eligibility, audit/content history, retention, health, and Beta metrics.

## Privacy and security

Sources: PRD sections 9, 12, 13; FR-FILE requirements; BRD section 10.

- TLS, secure cookies, CSRF protection, server authorization, validation/encoding, parameterized access, CSP, rate limits, private object storage, least privilege, scanning, isolation, secrets management, dependency/container scanning, and scrubbed monitoring are required.
- Collect minimum account/treatment metadata; exclude medical content, alias mappings, raw queries, filenames, document contents, and identifiers from analytics/logs.
- Separate audit-event metadata from encrypted content-version history and access-control both.
- Reporter identity/original evidence access are explicit, audited privileges.
- Default rate limits are configurable: 5 reviews/day, 30 comments/hour, 100 reactions/hour, and 5 profile submissions/day/account.
- PRD accepts several high-severity risks—no admin MFA, single VPS, manual backup, founder moderation, postponed legal review—that require founder confirmation before architecture/backlog approval (CQ-05, CQ-10).

## Accessibility

Sources: FR-A11Y-001, NFR-004-007; BR-072-074.

- Mobile-first responsive critical journeys require no horizontal overflow, semantic landmarks/headings, labels, keyboard operation, visible focus, contrast, meaningful errors, language metadata, and screen-reader-friendly controls.
- Formal WCAG 2.2 AA certification/audit is later, but the implementation foundation and automated/manual validation are Phase 1 requirements.
- Reduced motion, zoom/reflow, Bangla typography, touch targets, and target viewport verification are added by the founder execution brief and current standards research.

## Internationalization

Sources: FR-I18N-001-002, NFR-007.

- Detect browser language on first render, provide persistent Bangla/English switch, remember override, and externalize all UI strings.
- Interface language never constrains user-content language; Bangla, English, and Banglish may mix.
- Preserve original author text; author-written translation is optional; automated translation is later.
- Safety, privacy, evidence, emergency, and policy copy require bilingual parity and human review.

## Analytics

Sources: FR-AN-001-003; PRD section 14.1.

- Current PRD selects self-hosted Matomo and Klaro, with equal Accept/Reject/Customize and later withdrawal.
- Essential security/session cookies remain active; analytics begins only after consent under the stated Phase 1 policy.
- Only aggregate product/operational events are permitted; medical text, raw search, aliases, evidence names/content, and patient/provider identifiers are prohibited.
- Exact consent/legal basis still requires Bangladesh counsel; a simpler cookieless/aggregate first-release option is evaluated in research.

## Infrastructure

Sources: NFR-001-012; PRD section 11.

- PRD stack hypothesis: Next.js App Router/TypeScript, PostgreSQL, credentials authentication, S3-compatible object storage, isolated evidence tools, self-hosted analytics/monitoring, Docker Compose, transactional email.
- Logical services are web, worker, PostgreSQL, object storage, malware scanner, document converter, analytics, monitoring, and reverse proxy.
- Development and production configurations are separate; CI creates isolated test services. No persistent staging environment in Phase 1.
- Deployment uses immutable images, health/restart policies, least-privilege networks/users, persistent volumes, mounted secrets, migration checks, backup checkpoint, prior image, and recovery instructions.
- The PRD accepts one VPS up to USD 100/month, subject to load testing and mandatory disk/capacity alerts; evidence/observability move first if unsafe.
- Architecture options will compare a full-stack TypeScript modular monolith with a separated API modular monolith before recommendation.

## Operations

Sources: PRD sections 8.4, 10-13.

- Performance target: important public pages usable in about three seconds on an ordinary Bangladesh mobile connection; evidence target about five minutes with honest delayed state.
- Browser target: current and previous major Chrome, Edge, Firefox, Safari, plus modern Android/iOS browsers.
- Structured scrubbed logs, queue/scan/storage/database health, disk alerts, error monitoring, dependency register, migrations, automated tests, and documented configuration are required.
- Manual encrypted external backups must run before releases and on a schedule and be test-restored. Automation is currently Phase 2 but challenged in CQ-10.
- Public Beta communications include a changelog, known issues, accurate service-target wording, and last-verified emergency resources.

## Legal and policy requirements

Sources: PRD section 12; BRD sections 10 and 14.2.

- Required public policies: Terms, Privacy, Community/Review Guidelines, Evidence/Privacy Notice, copyright/ownership report process, Moderation/Appeals, Cookie notice, and Emergency disclaimer.
- Terms/Privacy acceptance is versioned; material changes require renewed acceptance.
- Policies clearly attribute claims to users, reject medical validation/advice, describe author responsibilities, and do not promise immunity from platform obligations.
- Legal-response capability supports scoped preservation, access restriction, request records, case export, legal hold, and documented release subject to applicable law/counsel.
- Bangladesh counsel, privacy, medical-safety, and security review requirements remain launch-critical. The PRD's accepted postponement conflicts with the BRD mandatory gate (CQ-10).

## Explicitly excluded Phase 1 features

Sources: PRD sections 2.3, 4.2, 14.4.

- Diagnosis, treatment recommendation, medical validation, negligence/malpractice determination, clinical panels, or professional/community voting.
- Numeric/star/Bayesian/combined medical-quality scoring or outcome-derived rating.
- Native apps/app-store release.
- BMDC verification service/integration.
- Private messaging, comment attachments, deep nesting, push/SMS/general email digests.
- Automated OCR/PII redaction, automated translation, searchable evidence OCR.
- Public API, payment processing, provider subscriptions, paid review removal, undisclosed paid ranking, and clinical booking engine.
- Device geolocation/Near Me.
- Full status page, formal independent appeal review, multi-server HA, and a production staging environment.

## Later-phase features

Sources: PRD section 14.3 and the founder execution brief.

- Self-hosted OCR/PII-assisted redaction after accuracy/privacy/security validation.
- Automated nightly encrypted off-site backups and off-site object storage.
- Admin MFA/passkeys, shorter privileged sessions, and self-service recovery.
- Staging, multi-host separation, stronger availability/incident response.
- Notification preferences, push/email, reminders/following, and mutual-consent messaging.
- Reviewed automated translation.
- Lawful, authoritative BMDC integration if a maintainable method becomes available.
- Formal WCAG 2.2 AA audit/certification, full data export, and expanded rights tooling.
- Country/regulator/locale framework and native apps only when evidence justifies them.

## Baseline acceptance condition

This baseline is not approved until the founder resolves the decision frontier in `02-conflicts-assumptions-questions.md` and explicitly confirms that the resulting understanding is correct.
