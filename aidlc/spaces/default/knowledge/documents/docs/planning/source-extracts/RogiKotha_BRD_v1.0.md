> Plain-text extraction of `docs/RogiKotha_BRD_v1.0.docx`, made 2026-10-23 so the AI-DLC knowledge catalog can read it (it has no Word extractor). The `.docx` stays the source of truth; regenerate this file if it changes.

Design direction update — Gate 4 founder decision (FD-027, 2026-09-06): Concept 04b — Quiet Clinic (minimal pass) is the chosen implementation direction. FD-026 (Concept 04 — warm Quiet Clinic) is superseded. Source prototype: ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/. See docs/planning/ux/DESIGN.md for the current visual contract and docs/planning/ux/EXPERIENCE.md for the behavioural contract. Motion is CSS-only (five primitives); killed by the in-app motion-off toggle and prefers-reduced-motion.

ROGIKOTHA

# Business Requirements Document

Condition-specific patient stories about diagnosis and treatment

Version: 1.0

Status: Baseline for product approval and PRD development

Market: Bangladesh first; designed for later international expansion

Prepared for: Founder / Product Owner

Date: 27 August 2026

Document type: Production-oriented BRD

Product promise. Help people understand how a doctor handled a particular condition or treatment episode—without presenting RogiKotha as a medical authority or declaring clinical negligence.

Non-negotiable trust rule. A reviewer may describe or label their own experience, but every disputed-care label and attached document must be clearly attributed to that reviewer and marked as not medically validated.

CONFIDENTIALITY

Working product document. This BRD is not legal or medical advice; launch requires qualified Bangladesh legal, privacy, clinical-safety, and security review.

## Document control

| Item | Decision |
|---|---|
| Owner | Founder / Product Owner |
| Approval | Founder approval establishes the scope baseline for the PRD |
| Change control | Material changes to scope, public claims, rating logic, evidence handling, or moderation require a versioned decision |
| Next document | Product Requirements Document (PRD), followed by interaction design and implementation specifications |

## Contents

- 1. Executive summary

- 2. Business context and opportunity

- 3. Vision, positioning, and principles

- 4. Objectives and success measures

- 5. Stakeholders and user groups

- 6. Product scope and release boundary

- 7. Core business journeys

- 8. Business requirements

- 9. Ratings, evidence, and discovery rules

- 10. Trust, safety, privacy, and governance

- 11. Data and operational requirements

- 12. Business model and commercial guardrails

- 13. Risks and mitigations

- 14. Delivery roadmap and launch gates

- 15. Assumptions, dependencies, and open decisions

- Appendix A. Competitive and standards research

- Appendix B. Glossary

- Appendix C. Source register

## 1. Executive summary

RogiKotha is a bilingual public-interest platform for Bangladesh where patients and direct witnesses can publish condition-specific accounts of a doctor’s diagnosis and treatment. Unlike a conventional doctor directory that reduces a clinician to one general star score, RogiKotha separates the treatment episode, condition, patient-reported outcome, general consultation experience, and facility experience. The purpose is to help future patients find relevant stories and make better-informed choices—not to replace professional advice, adjudicate malpractice, or certify that a treatment was clinically correct.

A reviewer may submit a quick review or a detailed, dated treatment timeline. Evidence such as prescriptions, test reports, or images is optional and displayed only as “Documents attached—not medically validated.” Reviews can be published under a real name, pseudonym, or stable anonymous alias. Doctor profiles require BMDC/admin verification before publication; hospitals, clinics, and diagnostic centres have separate profiles and ratings so facility experience never changes a doctor’s treatment score.

Business outcome. Create a trusted, searchable record of patient-reported treatment experiences by condition, while protecting privacy, preserving fair response rights, and preventing commercial influence over review visibility or ranking.

## 2. Business context and opportunity

### 2.1 Problem statement

Patients often choose a doctor using specialty labels, reputation, proximity, or informal recommendations. Those signals rarely answer the more specific question: “How has this doctor handled cases like mine?” When treatment is delayed, ineffective, costly, or followed by a different diagnosis, the experience is usually scattered across private messages and social media posts, without consistent condition tags, timelines, evidence status, or provider verification.

The opportunity is important but sensitive. WHO identifies diagnostic errors, medication harm, communication failures, and system factors as common sources of patient harm. It also recommends learning systems and patient engagement rather than a simple blame model. RogiKotha therefore needs both transparency and restraint: experiences should be discoverable, but the platform must distinguish patient testimony from clinical validation.

### 2.2 Market gap

| Observed model | Strength | Gap RogiKotha addresses |
|---|---|---|
| Doctor directories and rating sites | Large searchable provider profiles and simple experience ratings | Usually emphasize overall satisfaction; limited condition-specific treatment timelines and before/after evidence grouping |
| Healthcare story platforms | Rich patient narratives and organizational responses | Often organize stories around services rather than a comparable doctor-by-condition discovery model |
| Social media groups | Low-friction local discussion and rapid reach | Unverified profiles, inconsistent structure, weak privacy controls, poor searchability, and limited auditability |
| Official registries | Authoritative registration or facility identity data | Do not provide patient-reported treatment journeys or experiential ratings |

### 2.3 Strategic opportunity

- Make condition-specific experience discoverable in Bangla and English.

- Create a verified provider identity layer using BMDC and DGHS references.

- Let users provide optional supporting documents without implying that the platform medically validates them.

- Give doctors and facilities a transparent right to correct profile facts, respond publicly, and report violations.

- Build a defensible trust model in which money can never buy review removal or alter treatment scores.

## 3. Vision, positioning, and principles

### 3.1 Vision

People in Bangladesh can learn from relevant patient experiences, identify providers whose reported experience fits a specific health need, and approach care with better questions and realistic expectations.

### 3.2 Official product claim

RogiKotha helps people share and find patient-reported experiences about a specific diagnosis or treatment episode. It does not diagnose, prescribe, verify clinical correctness, determine negligence, or replace a qualified healthcare professional.

### 3.3 Product principles

| Principle | Meaning |
|---|---|
| Specific over simplistic | Show the condition, treatment episode, outcome, and context instead of one undifferentiated reputation score. |
| Attribution over authority | Labels such as “wrong diagnosis/treatment” are always shown as the reviewer’s claim. |
| Evidence transparency | State whether documents are attached, while never calling them verified proof of clinical error. |
| Privacy by design | Warn, detect, minimize, and rapidly hide personal-data leaks; never expose account verification data. |
| Fair participation | Verified providers may correct facts, respond, and report violations, but cannot suppress criticism by payment. |
| Separate signals | Keep doctor treatment, doctor experience, facility experience, and engagement reactions independent. |
| Bilingual access | Bangla and English are first-class interface languages, not an afterthought. |
| Learning, not blame | Encourage useful timelines and outcomes while retaining action against negligence, abuse, or unsafe conduct. |

## 4. Objectives and success measures

### 4.1 Business objectives

- Enable trustworthy discovery of doctors by condition, location, registration, and relevant patient-reported experience.

- Capture treatment stories in a consistent form that remains understandable without medical expertise.

- Improve transparency while minimizing privacy, defamation, misinformation, harassment, and security risk.

- Establish a scalable provider and condition data model for later international expansion.

- Build sustainable funding options without compromising review integrity or public access.

### 4.2 Success measures

| Measure | Launch target / rule | Why it matters |
|---|---|---|
| Verified provider identity | 100% of public doctor profiles have an admin-confirmed BMDC reference or an explicit verification exception | Avoids duplicate or misidentified clinicians |
| Review specificity | At least 85% of published treatment reviews include a condition or symptom tag and treatment episode date/period | Supports useful condition search |
| Review completion | At least 60% of users who begin the quick review complete it | Tests whether the core contribution flow is usable |
| Privacy response | Confirmed public personal-data leaks are hidden immediately; operational target under 15 minutes after detection/report | Reduces harm from medical documents |
| Moderation service | 90% of non-emergency reports receive a decision within 3 business days | Supports credibility and fairness |
| Profile quality | 90% of approved doctor profiles include registration, specialty, and at least one practice location | Improves discovery quality |
| Search usefulness | At least 70% of sampled condition searches return relevant providers once minimum content coverage is achieved | Measures the primary user value |
| Fairness | Zero paid review removals; all sponsored placements visibly labelled and excluded from organic treatment ranking | Protects independence |

Targets are initial operating baselines and should be reviewed after the first three months of public data. They do not authorize relaxing safety or fairness rules.

## 5. Stakeholders and user groups

| Stakeholder / role | Primary need | Public identity |
|---|---|---|
| Patient | Find relevant experiences; submit and update a treatment story | Real name, pseudonym, or stable anonymous alias |
| Parent / guardian | Describe care for a dependent and protect the patient’s identity | Real name, pseudonym, or stable anonymous alias |
| Family member / caregiver | Describe directly witnessed treatment and later outcome | Real name, pseudonym, or stable anonymous alias |
| Other direct witness | Contribute a first-hand account with relationship disclosed | Real name, pseudonym, or stable anonymous alias |
| Verified MBBS doctor | Maintain accurate profile, participate publicly, respond, and report | Verified professional badge |
| Verified BDS dentist | Maintain accurate profile, participate publicly, respond, and report | Verified professional badge |
| Verified facility representative | Maintain facility facts, respond, and report | Verified facility badge |
| Community member | Read, comment, react, report, and contribute where eligible | Chosen public identity |
| Moderator | Review reports and apply policy consistently | Moderator badge when acting publicly |
| Administrator | Verify profiles, configure fields, govern content, and audit decisions | Administrator badge when acting publicly |
| Regulator / public-interest partner | Understand patterns and provider identity without accessing unnecessary personal data | Not a default public role |

Role separation. Account role, provider verification, and relationship to a specific patient are separate facts. A doctor can write as a patient or family member, but the review must disclose that case relationship.

## 6. Product scope and release boundary

### 6.1 Bangladesh launch scope

| In scope for public launch | Explicitly out of the initial public launch |
|---|---|
| Bangla and English responsive web interface; account verification; public identity choice | Medical advice, telemedicine, prescribing, diagnosis, or emergency treatment |
| BMDC MBBS/BDS doctor profiles; hospital, clinic, and diagnostic-centre profiles | Other health professionals until a suitable verification registry and taxonomy are approved |
| Doctor and facility discovery by name, condition, specialty, and location | International provider verification and country-specific legal workflows |
| Quick review and detailed treatment timeline with optional documents | Platform or crowd determination of malpractice, negligence, or clinical correctness |
| Condition-specific and general experience ratings; separate facility ratings | A single “best doctor” or “accuracy/success” score |
| Comments, nested replies, mentions, links, documents, Like/Dislike, and public reaction lists | Paid removal, paid score improvement, or hidden sponsored ranking |
| Profile claims, public provider responses, reports, moderation, and private audit history | Unmoderated direct contact between patients and providers |

### 6.2 Phased capability plan

| Release | Capability boundary |
|---|---|
| Public Launch (Phase 1) | Core profiles, search, treatment reviews, optional evidence, ratings, comments/replies, reactions, provider claim/response, reports, admin verification/moderation, privacy and file screening |
| Phase 1.1 | Advanced duplicate/fraud detection, community temporary-hide thresholds, richer facility workflows, improved tag mapping, moderation analytics, provider dashboards |
| Phase 2 | Mutual-consent private messaging, configurable custom profile-field types, live or automated registry synchronization, appointment/referral integration, internationalization framework |
| Future | Research-grade aggregate insights, carefully governed expert review programmes, country-specific deployments, non-profit partnerships |

## 7. Core business journeys

### 7.1 Find care by condition

- Visitor searches in Bangla or English using a condition, symptom, doctor, specialty, facility, or location.

- System maps recognized user terms to a standard concept while preserving the original wording; unmapped tags remain searchable free text.

- Results show verified identity, relevant condition review count, adjusted condition score, patient-reported outcome distribution, location, and a “Limited data” warning when applicable.

- Visitor opens a doctor profile and sees general experience separately from treatment-by-condition summaries and separate facility links.

- Visitor reads original reviews, dated follow-ups, evidence status, provider responses, comments, and reaction lists before making their own decision.

### 7.2 Submit a treatment review

- Reviewer signs in through a verified phone or email account and chooses real name, pseudonym, or stable anonymous alias for public display.

- Reviewer selects an existing verified doctor or proposes a new profile for admin verification; treatment review publication waits until the provider identity is resolved.

- Reviewer chooses Quick Review or Detailed Timeline and states their relationship to the patient.

- Reviewer adds the condition/symptom, episode date, diagnosis/treatment description, patient-reported outcome, condition rating, and general experience ratings.

- Reviewer may mark the episode “wrong diagnosis” or “wrong treatment”; the interface renders “Reviewer marked this as …”.

- Reviewer may attach original-care and later-care documents. A privacy warning requires them to hide names, age/date of birth, contact details, IDs, addresses, report numbers, and other unnecessary personal details.

- Automated screening checks personal data, threats, profanity, spam, duplicates, and suspicious files. Clear submissions publish immediately; flagged submissions pause for correction or review.

- Reviewer may later append dated follow-ups. Original content remains visible and version history remains private to authorized staff.

### 7.3 Provider claim and response

- Doctor or facility representative creates an account and requests a verified role/profile claim.

- Administrator checks identity and authority using BMDC, facility records, and appropriate supporting information.

- Verified claimant may correct profile facts, maintain practice information, respond publicly, comment as a user, and report a policy violation.

- Provider cannot edit a reviewer’s content, see private account credentials, remove reviews, pay for removal, or privately contact a reviewer without mutual consent in a later release.

### 7.4 Report and moderate content

- Any signed-in user reports a review, comment, reaction abuse, profile error, or unsafe file using a reason category and optional explanation.

- Privacy leaks, threats, and unsafe files are hidden immediately. Factual or clinical disputes normally remain visible with a dispute marker during review.

- Potentially dangerous medical instructions receive a strong warning and priority moderator review; a moderator may remove content that violates policy.

- Moderator records the evidence reviewed, policy basis, action, reason, and timestamp. Administrator makes the final decision for the initial release.

- The affected user receives a clear decision reason. A formal appeal workflow is a later release; legal correction requests remain available through support.

## 8. Business requirements

Priorities use MoSCoW: Must is required for safe public launch; Should is expected shortly after launch or may be enabled only when operational capacity is ready; Could is a later enhancement.

### 8.1 Accounts, identity, and roles

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-001 | A user must verify a phone number or email address before posting a review, comment, reaction, report, or profile submission. | Must | Phase 1 |
| BR-002 | A user must choose a public identity mode: real name, pseudonym, or stable generated anonymous alias. Private verification data must never be public. | Must | Phase 1 |
| BR-003 | The platform must display verified role badges for MBBS doctors, BDS dentists, facility representatives, moderators, and administrators. | Must | Phase 1 |
| BR-004 | A review must record the author’s relationship to the patient: patient, parent/guardian, family/caregiver, or other direct witness. | Must | Phase 1 |
| BR-005 | Account role and case relationship must be stored and displayed independently. | Must | Phase 1 |
| BR-006 | Users must be able to change their general public display identity without exposing prior private identity; audit history remains restricted. | Should | Phase 1.1 |

### 8.2 Provider and facility profiles

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-010 | Public doctor profiles must be limited initially to BMDC-registered MBBS and BDS professionals, subject to admin verification. | Must | Phase 1 |
| BR-011 | Users may propose doctor or facility profiles, but a profile must not become public until BMDC/DGHS/admin identity verification is complete. | Must | Phase 1 |
| BR-012 | Doctor profiles may contain name, photograph, BMDC number/status, qualifications, school, specialty, claimed expertise, experience, designation, practice locations, schedules, fees, languages, gender, and appointment contact/link. | Must | Phase 1 |
| BR-013 | Missing optional profile fields must not appear as empty labels on public pages. | Must | Phase 1 |
| BR-014 | Administrators must control field visibility and requiredness by profile type without changing code; verified identity fields remain protected. | Should | Phase 1.1 |
| BR-015 | Duplicate provider submissions must be detected or merged before publication without losing reviews or audit history. | Must | Phase 1 |
| BR-016 | Verified providers must be able to claim a profile, correct factual information, respond to reviews, and report violations. | Must | Phase 1 |

### 8.3 Review creation and lifecycle

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-020 | Reviewer must be able to choose a Quick Review or Detailed Treatment Timeline. | Must | Phase 1 |
| BR-021 | Every treatment review must identify a condition/symptom and a distinct treatment episode; one account may post multiple reviews for a doctor only for distinct conditions or episodes. | Must | Phase 1 |
| BR-022 | Detailed timelines must support symptoms/reason for visit, first diagnosis/tests/treatment, subsequent change, later diagnosis/treatment, current outcome, and reviewer conclusion. | Must | Phase 1 |
| BR-023 | Evidence is optional and must be grouped as original/disputed-care documents and later-care/outcome documents. | Must | Phase 1 |
| BR-024 | Every evidence-bearing review must show “Documents attached—not medically validated.” | Must | Phase 1 |
| BR-025 | A user-selected “wrong diagnosis/treatment” label must be rendered as the reviewer’s claim, never a platform finding. | Must | Phase 1 |
| BR-026 | A cleared submission must publish immediately after the warning and automated checks; flagged content must pause for correction or moderation. | Must | Phase 1 |
| BR-027 | Reviewers must be able to edit presentation fields, append dated follow-ups, and delete public content while authorized staff retain a private audit record subject to retention policy. | Must | Phase 1 |
| BR-028 | Follow-ups must preserve the original review and show their dates and edit status. | Must | Phase 1 |

### 8.4 Ratings, search, and ranking

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-030 | Each review must capture patient-reported outcome: Helped, No improvement, Worsened, or Uncertain. | Must | Phase 1 |
| BR-031 | Each review must capture a 1–5 condition-specific treatment rating and a separate overall experience rating. | Must | Phase 1 |
| BR-032 | General experience must support: listening, diagnosis explanation, medicine/test/risk explanation, respect/empathy, consultation time, cost/value, and recommendation. | Must | Phase 1 |
| BR-033 | Doctor, condition, and facility scores must remain separate; the platform must not calculate a medical accuracy, success, or negligence score. | Must | Phase 1 |
| BR-034 | Ratings may appear from the first review with the review count and a prominent “Limited data” warning when sample size is small. | Must | Phase 1 |
| BR-035 | Condition search must use an adjusted score that considers average condition rating and review count; exact parameters must be transparent and versioned. | Must | Phase 1 |
| BR-036 | Search must support Bangla and English terms, aliases, and location filters. | Must | Phase 1 |
| BR-037 | Recognized user tags must map to a standard concept where possible; unmapped user wording must remain searchable and visible. | Must | Phase 1 |

### 8.5 Facility reviews

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-040 | Hospitals, clinics, and diagnostic centres must have separate profiles and reviews. | Must | Phase 1 |
| BR-041 | Facility ratings must cover staff behavior, waiting/appointments, cleanliness, billing transparency/value, test/report delivery time, perceived report reliability, admission/discharge, and overall recommendation. | Must | Phase 1 |
| BR-042 | Facility ratings must never affect doctor treatment or experience scores. | Must | Phase 1 |
| BR-043 | “Perceived test/report reliability” must be labelled as reviewer perception, not laboratory validation. | Must | Phase 1 |

### 8.6 Discussion, reactions, and communication

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-050 | Reviews and comments must support text, links, images/documents, nested replies, and mentions subject to safety policy. | Must | Phase 1 |
| BR-051 | Signed-in users must be able to Like or Dislike each review and comment; only one active reaction per account per item is allowed and can be changed. | Must | Phase 1 |
| BR-052 | Reaction counts and public lists must show each reactor’s chosen public name, pseudonym, or stable anonymous alias and verified role badge. | Must | Phase 1 |
| BR-053 | Likes and Dislikes must be engagement only and must not change ratings, organic ranking, or moderation decisions. | Must | Phase 1 |
| BR-054 | A user profile may show reaction history, with a user-controlled visibility setting; hiding profile history does not remove the identity from an item’s public reaction list. | Should | Phase 1.1 |
| BR-055 | Verified doctors and other users may discuss medical topics with a clear disclaimer and the same moderation rules as everyone else. | Must | Phase 1 |
| BR-056 | Private messages may be enabled only with mutual consent and additional abuse controls. | Could | Phase 2 |

### 8.7 Moderation and safety

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-060 | Automated checks may pause content for personal data, threats, profanity, spam, duplicates, or suspicious files. | Must | Phase 1 |
| BR-061 | Reported privacy leaks, threats, and unsafe files must be hidden immediately; factual and clinical disputes should remain visible with a dispute status during review. | Must | Phase 1 |
| BR-062 | Potentially dangerous medical instructions must receive a strong warning and priority moderator review; moderators retain authority to remove policy violations. | Must | Phase 1 |
| BR-063 | Emergency or self-harm language must trigger an immediate “do not delay care” banner with verified Bangladesh emergency options. | Must | Phase 1 |
| BR-064 | Moderation actions must record reporter category, evidence, policy reason, actor, action, time, and notification. | Must | Phase 1 |
| BR-065 | Community thresholds may temporarily hide content, but an administrator must make the final decision. | Should | Phase 1.1 |
| BR-066 | Administrators must be able to restore content, correct moderation errors, and preserve an audit trail. | Must | Phase 1 |

### 8.8 Language, accessibility, and public information

| ID | Business requirement | Priority | Release |
|---|---|---|---|
| BR-070 | The public interface must support Bangla and English with a persistent language switch. | Must | Phase 1 |
| BR-071 | User-generated content must retain its original language; optional translation must be clearly labelled as machine- or user-provided. | Should | Phase 1.1 |
| BR-072 | Core journeys must target WCAG 2.2 AA, keyboard use, readable contrast, clear errors, and correct language metadata. | Must | Phase 1 |
| BR-073 | Every review page must display plain-language disclaimers that content is patient-reported and not medical advice. | Must | Phase 1 |
| BR-074 | Emergency, report, privacy, and evidence-status messages must be available in both languages. | Must | Phase 1 |

## 9. Ratings, evidence, and discovery rules

### 9.1 Score architecture

| Signal | Public presentation | Must not be interpreted as |
|---|---|---|
| Condition treatment rating | 1–5 average for a named condition/episode type, review count, and Limited data status | Clinical accuracy or success rate |
| Patient-reported outcome | Helped / No improvement / Worsened / Uncertain distribution | Causal proof that the doctor produced the outcome |
| General doctor experience | Separate dimension averages and overall experience | Treatment effectiveness |
| Facility experience | Separate facility scorecard | Doctor performance |
| Like / Dislike | Counts and public participant lists | Quality, truth, ranking, or moderation verdict |
| Evidence status | Documents attached—not medically validated | Authenticated evidence or proof of negligence |

### 9.2 Adjusted condition score

Organic condition ranking uses a confidence-adjusted average so a single five-star review does not automatically outrank a provider with many strong reviews. The business-approved model is a Bayesian weighted rating:

Adjusted score = (v / (v + m)) × R + (m / (v + m)) × C

Where R is the doctor’s mean condition rating, v is the number of condition reviews, C is the platform-wide mean for that condition, and m is the minimum review-count confidence parameter. The PRD must define initial values, cold-start handling, update frequency, and public methodology text. Sponsored placement must never change this score or appear inside the organic order without explicit separation.

### 9.3 Evidence policy

- Evidence is optional; no reviewer should be blocked solely for lacking documents.

- Original/disputed-care and later-care/outcome files are visually separated.

- Allowed types, size limits, malware scanning, signature validation, renamed storage, download controls, and access logging are required for public launch.

- The uploader receives a specific warning to remove patient and third-party personal details before upload.

- If automated screening detects likely personal data or a suspicious file, publication pauses. The user can replace/redact the file or request review.

- No badge may say “verified,” “proven,” “confirmed,” or equivalent unless a future governed validation programme is approved.

## 10. Trust, safety, privacy, and governance

### 10.1 Content status model

| Status | Public behavior | Decision owner |
|---|---|---|
| Published | Visible immediately after successful screening | System under approved rules |
| Flagged before publication | Not public; user may correct or moderator reviews | System then moderator |
| Disputed | Normally remains visible with status and provider response | Moderator / administrator |
| Temporarily hidden | Unavailable while urgent privacy, threat, file, or community-threshold review occurs | System or community threshold; administrator final |
| Removed | Public content unavailable; reason sent to affected user; audit history retained | Administrator |
| User deleted | Public content unavailable; limited audit data retained per policy | User, subject to legal holds |
| Restored | Visible with appropriate edit/restoration history | Administrator |

### 10.2 Moderation principles

- Moderate policy violations, not negative opinions merely because they are negative.

- Differentiate a personal account (“this did not help me”) from an unsupported universal claim (“this doctor always harms patients”).

- Protect patients, children, third parties, and provider staff from unnecessary identification.

- Give providers a visible right to respond, but prohibit coercion, retaliation, doxxing, or inducements to change a review.

- Use the least restrictive proportionate action: warning, redaction request, attachment removal, comment lock, temporary hide, removal, or account restriction.

- Publish community rules and high-level moderation methodology in both languages.

### 10.3 Privacy and data protection

Health-related narratives and documents can expose sensitive personal data about patients and third parties. Before launch, RogiKotha must complete a Bangladesh-specific legal review and privacy impact assessment using the current operative law—not a superseded draft or ordinance. The product must implement data minimization, purpose limitation, access control, retention schedules, deletion handling, breach response, and vendor governance.

Public identity is not account identity. A stable anonymous alias protects public presentation but is not absolute anonymity. RogiKotha retains verified contact and audit data privately and must explain this honestly in the privacy notice.

### 10.4 Defamation, fairness, and due process

Because reviews may damage professional reputation, launch counsel must review Bangladesh defamation exposure, intermediary obligations, notice-and-action procedures, evidence preservation, response rights, and court/law-enforcement request handling. The design reduces risk by attributing disputed-care labels to reviewers, prohibiting platform clinical conclusions, preserving version history, keeping factual disputes visible during review, and applying consistent published rules. These controls reduce risk but do not replace legal advice.

### 10.5 Medical safety

- Do not present community content as a diagnosis, prescription, or substitute for care.

- Do not allow ratings to become claims of clinical accuracy or negligence.

- Show an emergency banner when content suggests urgent medical or self-harm risk, using verified and periodically reviewed Bangladesh help information.

- Prominently warn that individual outcomes vary and that documents are not medically validated.

- Establish a clinical-safety advisory process for policy and high-risk content patterns before scaling.

## 11. Data and operational requirements

### 11.1 Core business entities

| Entity | Purpose / essential relationships |
|---|---|
| Account | Private verification, status, role claims, consent, moderation state, audit references |
| Public identity | Real name, pseudonym, or stable anonymous alias; profile and reaction-history settings |
| Doctor profile | BMDC identity, qualifications, expertise claims, practice locations, profile claimant |
| Facility profile | Hospital/clinic/diagnostic-centre identity, DGHS/admin reference, services and locations |
| Condition concept | Bangla/English labels, standard mapping where available, synonyms, unmapped user tags |
| Treatment episode review | Doctor, condition, relationship, timeline, ratings, outcome, labels, evidence groups, visibility |
| Facility review | Facility dimensions, overall rating, recommendation, visit context |
| Evidence file | Owner, group, type, scan status, privacy status, storage reference, access log, public status |
| Comment / reply | Parent item, author public identity, content, attachments, moderation status |
| Reaction | Account, public identity snapshot, target item, Like/Dislike state, timestamp |
| Report / moderation case | Reporter, reason, target, evidence, actions, policy basis, decision, timestamps |
| Audit event | Immutable record of material profile, review, identity, moderation, and deletion changes |

### 11.2 Operational capabilities

- A bilingual moderation console with queues for privacy, threats, unsafe files, spam/duplicates, impersonation, factual disputes, medical-risk warnings, and profile corrections.

- Profile verification procedures for BMDC doctors and DGHS/admin-verified facilities, including duplicate resolution and re-verification when registration changes.

- A transparent public methodology page covering score separation, Limited data, adjusted ranking, evidence status, sponsorship, and moderation.

- Operational dashboards for volume, publication delays, privacy flags, report aging, reversals, provider claims, and reviewer retention.

- Incident response for security breach, mass doxxing, coordinated review abuse, malicious uploads, or emergency-content failures.

### 11.3 Non-functional business requirements

| Area | Requirement |
|---|---|
| Availability | Target 99.5% monthly availability at public launch, excluding planned maintenance; emergency/report paths receive priority monitoring. |
| Performance | Core public pages should meet contemporary mobile web performance targets on typical Bangladesh connections; PRD to define measurable budgets. |
| Security | Encryption in transit and at rest, least privilege, multi-factor admin access, secure file pipeline, rate limits, logging, dependency and vulnerability management. |
| Privacy | Data minimization, consent and notice, retention/deletion, restricted audit access, vendor review, breach response, and privacy-impact assessment. |
| Accessibility | WCAG 2.2 AA target for core journeys, including keyboard, labels, contrast, focus, errors, zoom, and language metadata. |
| Scalability | Country, registry, language, taxonomy, and policy configuration must not assume Bangladesh forever. |
| Auditability | Material content and moderation changes must be attributable and time-stamped; audit logs must be protected from ordinary editing. |
| Recoverability | Backups and restoration objectives must be approved before production; deletion and legal holds must remain traceable. |

## 12. Business model and commercial guardrails

RogiKotha launches as a free public platform. The long-term operating model may combine donations or non-profit support, paid provider tools, appointment/referral or booking commission, ethical advertising, and clearly labelled sponsored listings. The model remains deliberately diversified until user trust, compliance cost, and operating economics are understood.

| Permitted future model | Guardrail |
|---|---|
| Donations / non-profit support | Donor terms must not influence moderation, rankings, provider coverage, or public research conclusions. |
| Paid provider tools | Payment may fund workflow, analytics, scheduling, or profile management; core factual corrections and response rights remain free. |
| Booking/referral commission | Commercial relationship must be disclosed; commission must not alter organic treatment ranking. |
| Ethical advertising | No deceptive medical claims, predatory products, or targeting based on sensitive health details without explicit lawful consent. |
| Sponsored listings | Clearly labelled, visually separated from organic results, and never represented as a treatment recommendation. |

Absolute prohibition. RogiKotha will never accept payment to remove, suppress, rewrite, or reduce the visibility of a lawful review, or to change a treatment rating or organic condition ranking.

## 13. Risks and mitigations

| Risk | Business impact | Required mitigation |
|---|---|---|
| Personal data exposed in medical documents | Patient harm, legal liability, loss of trust | Pre-upload warning, screening/quarantine, safe file pipeline, immediate hide, retention and breach procedures |
| False or defamatory allegations | Provider harm, legal disputes, platform credibility loss | Attribution language, structured first-hand accounts, response right, notice-and-action, audit history, counsel-reviewed policy |
| Medical misinformation or dangerous instructions | Delayed or harmful care | Disclaimers, warning state, priority moderation, emergency banner, clinical-safety governance |
| Review manipulation or coordinated attacks | Unfair scores and distrust | Verified account, episode limits, duplicate/spam checks, rate limits, anomaly review, transparent adjustments |
| Provider impersonation or duplicate profiles | Misattribution and fraud | BMDC/DGHS checks, admin approval, claim verification, merge process, protected identity fields |
| Small-sample distortion | Misleading ranking | Review count, Limited data warning, confidence-adjusted score, outcome distribution |
| Commercial conflict of interest | Loss of independence | No paid removal, separation of sponsored/organic content, disclosures, governance records |
| Moderation overload | Slow response to dangerous content | Queue priority, service levels, rate controls, phased launch, staffing trigger thresholds |
| Security attack through uploads | Malware, data breach, service disruption | Allowlist, signature/type validation, renamed storage, malware scanning, isolated storage, size limits, access control |
| Bilingual ambiguity | Misunderstood conditions, policies, or warnings | Terminology governance, human review of critical copy, original-language preservation, correct language tags |

## 14. Delivery roadmap and launch gates

### 14.1 Product stages

| Stage | Outcome |
|---|---|
| BRD approval | Business scope, principles, requirements, and risks are accepted as the baseline. |
| PRD and policy design | Detailed user stories, acceptance criteria, data model, content policy, moderation playbooks, analytics, and release plan. |
| Validated prototype | Bangla/English discovery, review/evidence submission, provider response, and admin moderation tested with representative users. |
| Private beta | Real operational workflow tested with limited users and non-public or tightly controlled data. |
| Public Bangladesh launch | Production controls and launch gates passed; monitored rollout begins. |
| Scale and expansion | Coverage, operations, commercial models, and country framework grow without compromising trust principles. |

### 14.2 Mandatory public-launch gates

- Bangladesh legal review completed for data protection, defamation, platform liability, consumer protection, record retention, and law-enforcement requests.

- Privacy impact assessment completed; privacy notice, consent, retention, deletion, processor/vendor agreements, and breach plan approved.

- Medical-safety policy, disclaimer language, dangerous-content handling, and emergency resources reviewed by qualified professionals.

- Security review and testing completed, including authentication, administrator controls, uploads, storage, access logs, rate limits, and incident response.

- Content policy, reporting reasons, moderation playbooks, decision templates, service levels, and administrator training complete in Bangla and English.

- BMDC and facility verification procedures tested; duplicate and correction workflows operational.

- Ratings methodology and sponsored-content separation published; Limited data and evidence-status labels verified in usability testing.

- Accessibility review of all core journeys completed against WCAG 2.2 AA target.

- Backup, restoration, monitoring, logging, analytics, and operational ownership tested.

- No unresolved critical or high-severity defect affecting privacy, safety, security, identity, moderation, or data loss.

## 15. Assumptions, dependencies, and open decisions

### 15.1 Assumptions

- The first public market is Bangladesh and the initial provider scope is BMDC MBBS/BDS doctors plus hospitals, clinics, and diagnostic centres.

- Most users will access through mobile devices and may prefer Bangla, English, or mixed-language search terms.

- Evidence remains optional and is not medically validated by the platform.

- The platform has enough moderation capacity to honor urgent-hide and report-response commitments before scaling traffic.

- International expansion requires separate registry, taxonomy, emergency, privacy, defamation, and moderation configuration for each market.

### 15.2 Dependencies

- Reliable BMDC verification and access to current provider registration information.

- DGHS facility registry and/or administrator-verifiable facility evidence.

- Secure identity, file scanning/storage, email/SMS, translation, monitoring, and moderation tooling vendors.

- Qualified Bangladesh legal, privacy, medical-safety, and security review.

- Condition terminology governance using ICD-11 concepts where appropriate without forcing unmappable user language.

### 15.3 Decisions deferred to the PRD or policy programme

| Decision | Required owner / output |
|---|---|
| Exact low-data threshold and Bayesian parameters | Product + data methodology |
| Allowed upload types, limits, viewing/download behavior, and retention | Security + privacy + product |
| Exact emergency text detection and help-resource maintenance | Medical safety + operations |
| Moderation categories, sanctions, administrator override, and formal appeal release | Trust & safety + legal |
| Profile field requiredness and custom-field release boundary | Product + operations |
| Initial commercial model and organizational form | Founder + finance/legal |
| Public API, research access, and aggregate-data governance | Founder + privacy + ethics |

## Appendix A. Competitive and standards research

Research was used to identify established patterns and gaps; RogiKotha does not copy any one service. Key findings are summarized below.

| Reference | Relevant lesson for RogiKotha |
|---|---|
| Healthgrades | Provider discovery, profile claims, patient reviews, review counts, and methodology transparency are established user expectations. |
| Care Opinion | Structured patient storytelling and visible provider response can create learning value beyond simple star ratings. |
| RateMDs | Anonymous reviews and moderation are common, but RogiKotha requires verified private accounts and condition-specific structure. |
| WHO patient safety | Diagnostic and medication harm are material concerns; systems thinking and patient engagement should coexist with accountability. |
| AHRQ CAHPS | Listening, clear explanation, respect, time, and overall provider rating are validated patient-experience dimensions. |
| BMDC / DGHS | Official identity sources support profile verification but do not replace human duplicate and exception handling. |
| OWASP file upload guidance | Uploads require allowlisting, content/signature checks, safe names/storage, access control, limits, and malicious-file protection. |
| WCAG 2.2 / W3C | A bilingual health platform needs proper language metadata, keyboard access, understandable errors, contrast, and semantic structure. |
| ICD-11 | A standard condition concept layer improves multilingual discovery, while original user wording should be preserved. |

## Appendix B. Glossary

| Term | Definition in this BRD |
|---|---|
| Treatment episode | A distinct period of care for a condition or health concern, potentially including more than one visit. |
| Condition-specific review | A review attached to a doctor and a named condition/symptom or treatment episode. |
| Patient-reported outcome | The reviewer’s selected result: Helped, No improvement, Worsened, or Uncertain. |
| General experience | Communication, respect, time, explanation, value, recommendation, and overall consultation experience. |
| Evidence | Optional uploaded documents or images; evidence presence does not mean medical validation. |
| Stable anonymous alias | A persistent public label that does not reveal private verified account details. |
| Verified provider | A doctor or facility identity checked by an administrator using approved sources; not an endorsement. |
| Limited data | A warning that a score is based on too few reviews for strong confidence. |
| Organic ranking | Unpaid ordering based on published relevance and scoring rules. |
| Sponsored listing | Paid placement that is clearly labelled and separated from organic ranking. |

## Appendix C. Source register

- World Health Organization — Patient safety. Accessed 27 August 2026.

- Bangladesh Medical & Dental Council — registration verification. Accessed 27 August 2026.

- Bangladesh DGHS — Facility Registry. Accessed 27 August 2026.

- Bangladesh Laws — current legislation repository (operative privacy text to be confirmed by counsel). Accessed 27 August 2026.

- Bangladesh Penal Code — defamation chapter. Accessed 27 August 2026.

- AHRQ — CAHPS Clinician & Group Survey measures. Accessed 27 August 2026.

- WHO — ICD-11. Accessed 27 August 2026.

- OWASP — File Upload Cheat Sheet. Accessed 27 August 2026.

- W3C — WCAG 2.2 language of parts. Accessed 27 August 2026.

- Healthgrades — doctor reviews. Accessed 27 August 2026.

- Healthgrades — community review guidelines. Accessed 27 August 2026.

- Care Opinion — tell your story. Accessed 27 August 2026.

- RateMDs — rating system and moderation. Accessed 27 August 2026.
