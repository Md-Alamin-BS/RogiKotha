# Conflicts, assumptions, and founder decision frontier

Status: Founder decision frontier resolved; Gate 1 approved  
Analysis date: 2026-08-30

## Resolution rule

The PRD is dated two days after the BRD and explicitly calls itself the approved implementation baseline. Where the PRD's final decision register or explicit out-of-scope list replaces a BRD concept, this analysis accepts the PRD decision and does not ask the founder to decide it again. Founder confirmation is requested only for unresolved internal ambiguity, a direct clash with a mandatory business/engagement gate, or a risk severe enough to change architecture or public behaviour.

## Founder direction from decision rounds 1–2

| Decision area | Founder direction | Planning effect | Remaining clarification |
|---|---|---|---|
| Public release | Phase 1 is a normal unrestricted public release after basic legal and healthcare review, not a private or controlled Beta. | Design the public path as the primary launch path and record the two external reviews as readiness checks. | None. |
| Evidence formats | Use a narrow Phase 1 allowlist and preserve an expansion path for later phases. | Plan JPEG, PNG, and PDF first; keep HEIC/Office conversion behind an enablement seam. | None. |
| Evidence publication and retention | Do not display a warning that public copies may persist elsewhere. Defaults for originals (90 days) and audit/content versions (180 days) are runtime-changeable. Default changes affect future records; existing records require a separate logged bulk action. Individual legal holds are separately logged. Authors review and confirm the processed public copy before publication. | Model versioned retention policies, affected-record previews, effective dates, actor/reason audit events, legal holds, and scheduled jobs. | None. |
| Authentication | Phase 1 uses confirmed email/password, reset, secure password handling/cookies, basic throttling, and suspicious-attempt challenges; MFA/passkeys are later. | Keep the ordinary flow simple while implementing invisible baseline protections and an extensible authentication boundary. | None. |
| Cost and hosting | Use a public synthetic/read-only USD 0 demo, then a USD 100/month production target; prefer free/open-source software and permit necessary cost. | Keep demo and real-user production topologies explicit and portable. | None. |
| Anonymous identity | Use an alias isolated to one review thread. Super Admin controls normally-disabled Admin/Moderator access to the private account link. Disclose the authorised-access capability only in the Privacy Policy/Terms. | Keep public surfaces unlinkable and audit every permitted staff reveal. | None. |
| Witnessed experience | Allow family members/caregivers to share what they personally witnessed using a simple privacy/experience attestation. | Do not add a consent-verification workflow in Phase 1. | None. |
| Medical-advice handling | Do not classify automatically. Warn authors, provide a report reason, auto-hide after five distinct confirmed-account reports, and allow logged moderator restoration. | Preserve a simple UI and implement the threshold as a reversible moderation state. | None. |
| Product flexibility | Runtime-edit wording, taxonomies, optional fields, retention, report thresholds, and feature visibility. Keep security/data structure deployment-controlled. Analytics is off in the demo and optional/minimal later. | Prefer a short, low-friction UX with operational safeguards behind it. | None. |

## Material BRD/PRD conflicts

| ID | BRD position | PRD position | Impact | Newer / recommended resolution | Founder confirmation |
|---|---|---|---|---|---|
| C-01 | BRD 8.4, 9.1-9.2 and BR-030-035 require 1-5 treatment/general ratings and Bayesian condition ranking. | PRD 1, 4.2, FR-REV-002, FR-SUM-001-005, 8.2, 14.4, appendix B explicitly reject numeric/star/Bayesian scores and select narrative sentiment/outcomes plus neutral relevance/count ranking. | Changes data model, UI, search, summaries, tests, and product meaning. | PRD is an explicit later replacement. Implement no numerical rating or medical-quality score. | No; already decided. |
| C-02 | BRD BR-010-011 and launch measures require BMDC/admin-verified public doctor profiles and verified identity references. | PRD 4.2, FR-DOC-001-002 and appendix B explicitly remove BMDC verification from Phase 1 and publish after duplicate/abuse checks with `Registration not verified`. | Changes trust badges, claim process, directory launch, and legal/misattribution risk. | PRD explicitly replaces the BRD Phase 1 gate. Preserve provenance and prominent unverified status. | No; already decided, but track as high risk. |
| C-03 | BRD BR-011 and journey 7.2 delay profile/review publication until provider identity is verified. | PRD 7.1 delays missing-provider reviews only until duplicate/abuse review; no BMDC verification occurs. | Changes contribution latency and identity assurance. | Apply the PRD's duplicate/obvious-abuse approval gate and unverified label. | No; already decided. |
| C-04 | BRD BR-016 gives verified providers a distinct right to respond publicly. | PRD FR-DOC-008 states there is no privileged response channel; providers comment like ordinary users. | Changes review-page composition, permissions, and moderation. | PRD explicitly narrows the right; verified/claimed status may label the ordinary comment. | No; already decided. |
| C-05 | BRD BR-050 requires comment links, images/documents, nested replies, and mentions in Phase 1. | PRD 4.2 and FR-COM-001 allow text, warned links, flat replies, and mentions; attachments/deep nesting are out. | Reduces file threat surface and discussion complexity. | PRD is the later scoped decision. | No; already decided. |
| C-06 | BRD BR-001 allows verified phone **or** email contribution accounts. | PRD 4.1 and FR-AUTH-001-004 require confirmed email; phone is optional recovery data only. | Changes authentication, operating cost, and accessibility. | Use email confirmation in Phase 1. | No; already decided. |
| C-07 | BRD journeys/BR-060 and evidence policy anticipate automated personal-data screening that can pause uploads. | PRD 4.2, FR-FILE-004-005 and accepted risks explicitly exclude automated OCR/PII redaction and allow a manual-redaction skip. | Directly affects privacy harm, evidence UX, moderation load, and evidence publication safety. | The PRD is newer but the skip path conflicts with the engagement's non-negotiable privacy posture. Require a founder risk decision (CQ-02/CQ-03). | Yes. |
| C-08 | BRD 7.4 states formal appeals are later and initial final decisions are administrative. | PRD FR-MOD-006 adds a founder-led Phase 1 appeal using a fresh checklist. | Adds workflow, notifications, retention, and service target. | Accept the later PRD workflow. | No; already decided. |
| C-09 | BRD 11.3 targets 99.5% monthly availability. | PRD NFR-003 defines best-effort Beta with no uptime SLA. | Changes infrastructure cost, monitoring, and public commitments. | The controlled Beta is the later scope; publish no SLA. Reliability still needs tested recovery. | No; already decided. |
| C-10 | BRD 11.3/14.2 requires MFA for admin access and security launch-gate completion. | PRD FR-AUTH-007 and 9.4 accept no MFA, 30-day admin sessions, and new-device email approval. | High-impact account takeover risk and changes authentication architecture. | Do not silently accept for a public health platform; founder must confirm whether MFA/passkeys move into Phase 1 (CQ-04). | Yes. |
| C-11 | BRD 14.2 makes legal/privacy/medical-safety/security review mandatory before public launch. | PRD 9.4 accepts public Beta before full legal review as a high-severity risk, while PRD 12 also says counsel must review before broad promotion. | Determines whether any public release is permitted and exposes founder/users to severe legal/privacy risk. | Treat review as mandatory before any unrestricted public launch; a private synthetic prototype is unaffected. Founder must set the gate (CQ-01). | Yes. |
| C-12 | BRD 11.3/14.2 requires approved/tested backups and restoration before production. | PRD 4.2/9.4/11.4 accepts founder-run manual local/off-VPS backups and moves automated nightly off-site backup to Phase 2. | Single-host loss could destroy product and evidence data. | At minimum automate encrypted off-site database/object backups before real patient content; founder must confirm cost/scope (CQ-05). | Yes. |
| C-13 | BRD BR-041 requires a facility dimension set and ratings. | PRD FR-FAC-004 keeps the dimensions but makes them non-scored structured feedback. | Changes facility UI and aggregation. | Apply narrative/non-scored PRD model consistently. | No; derivative of C-01. |
| C-14 | BRD BR-052 says reaction lists show each reactor's chosen identity for the item; BR-054 places profile reaction-history visibility in Phase 1.1. | PRD FR-USER-001 ties a review's comments/reaction lists to its selected identity, while FR-REA-001 says reaction identity follows the user's public profile/display identity and FR-USER-002 makes activity public in Phase 1. | Could deanonymize an author or link anonymous/pseudonymous participation across contexts. | Create an explicit per-contribution identity-snapshot rule and privacy-safe profile-link rule (CQ-06). | Yes. |
| C-15 | BRD says urgent privacy leaks, threats, and unsafe files hide immediately and medical-danger warnings are mandatory. | PRD FR-COM-002 lets Super Admin disable the default policy that dangerous instructions remain visible with warning/review; FR-ADM-001 broadly configures warnings. | A configuration switch could remove a safety control or create inconsistent decisions. | Safety-critical behaviour should not be disableable; only wording/escalation parameters should be configurable (CQ-07). | Yes. |

## Material PRD ambiguities and architecture-driving risks

| ID | Ambiguity/risk | Source | Why it matters | Recommendation | Founder decision |
|---|---|---|---|---|---|
| A-01 | Whether `anonymous` means unlinkable between contributions or merely a stable public alias. | PRD 3.2, FR-USER-001-002, FR-REA-001-002 | Determines public profile, reaction lists, mentions, blocking, and data-model snapshots. | Stable alias per account is acceptable only if the UI never connects it to a real/pseudonymous profile without explicit consent. Prefer a stable per-account anonymous alias with a separate anonymous public profile. | CQ-06 |
| A-02 | Original medical upload retention defaults to 90 days even after a safe processed copy exists. | FR-FILE-008, PRD 8.4 | Increases breach impact and legal/data-subject exposure. | Default to deletion immediately or within 7 days after successful processing; retain longer only for explicit dispute/legal hold with strict access. | CQ-03 |
| A-03 | Authors may skip privacy editing, yet no OCR/PII detection exists and public copies say privacy was not independently checked. | FR-FILE-004-005, FR-EVD-004 | A technically safe file may still expose patient/third-party data. A disclaimer does not mitigate that harm. | For public Beta, require author preview/confirmation and either mandatory redaction completion or moderator approval for skipped documents. | CQ-02 |
| A-04 | Broad Office/RTF/TXT/HEIC input support requires many native parsers/converters and greatly expands testing/operations. | FR-FILE-001-003 | Increases attack surface, converter failures, resource exhaustion, and solo-founder workload. | Launch with JPEG/PNG/WebP/PDF; treat HEIC and Office families as staged enablements after isolated fixtures pass. | CQ-03 |
| A-05 | Processed PDFs are downloadable by any visitor. | FR-AUTH-001, FR-FILE-006 | Download makes redistribution/scraping easier even after redaction. | Default to viewer-only or explicit author opt-in for download; use rate limits and visible synthetic/public watermarking where lawful. | CQ-03 |
| A-06 | Another adult's care can be reviewed without verified consent. | PRD 3.3 | Could expose highly sensitive health details and create removal disputes. | Allow only direct-witness, minimized accounts; add a dedicated patient privacy objection fast path; obtain Bangladesh counsel approval before real data. | CQ-08 |
| A-07 | Audit/content history default is 180 days while legal disputes and provider correction may emerge later. | PRD 8.4, 9.3, 12.3 | Too short can defeat due process; too long increases sensitive-data risk. | Make the default a counsel-approved schedule by record class rather than one dynamic period. | CQ-09 |
| A-08 | `Super Admin can configure` a very large share of product structure at runtime. | FR-ADM-001-004 | Creates a generic form/CMS platform, schema/version complexity, translation gaps, and unbounded test matrices. | Phase 1 should permit configuration only for enumerated content, thresholds, visibility, and safe field definitions; structural workflow changes remain deployment-controlled. | CQ-10 |
| A-09 | Five-user report auto-hide can be gamed, while founder moderation has limited hours. | FR-MOD-003-004, accepted risk table | Coordinated reporting can suppress lawful criticism; failure to hide can expose harm. | Keep immediate hide only for privacy/threat/file categories; use risk-weighted quarantine or rate/anomaly checks for ordinary thresholds. | CQ-11 |
| A-10 | A single VPS is expected to run web, database, object store, converters, scanner, analytics, and error monitoring under USD 100/month. | PRD 11.1-11.5 | Heavy conversion/scanning can exhaust CPU/RAM/disk and affect public traffic. | Preserve one-host deployability but make the worker/object/observability boundaries movable; conduct staged load/resource tests before evidence is enabled. | CQ-05 |
| A-11 | No persistent staging environment despite destructive migrations/evidence processing. | PRD 13.1 | Raises release and recovery risk. | Use ephemeral CI integration environments plus a production-like local validation stack; add a small staging host before real patient data if affordable. | CQ-05 |
| A-12 | Matomo/Klaro are mandated before confirming whether Phase 1 analytics provides enough value to justify consent and operational burden. | FR-AN-001-003 | Adds cookies, a data processor surface, maintenance, and consent logic. | Prefer a no-analytics prototype; for Beta, consider strictly aggregate cookieless first-party metrics or consented Matomo after counsel review. | CQ-12 |

## Confirmed implementation assumptions

These are reasonable planning assumptions derived from explicit requirements. They remain visible rather than being treated as hidden facts.

- IA-01: Work before founder approval is documentation/research only; no application code or production backend is authorized.
- IA-02: The frontend prototype uses entirely synthetic Bangladesh-focused data and visibly synthetic evidence documents.
- IA-03: The prototype may model states that the production backend cannot yet execute; its data access is behind replaceable service interfaces.
- IA-04: The architecture starts as a modular monolith with explicit domain boundaries and a separately runnable worker process, unless current research invalidates it.
- IA-05: PostgreSQL is the source of truth; search begins with PostgreSQL FTS/trigrams/alias tables and preserves an external-search migration seam.
- IA-06: Evidence originals, processed artifacts, and metadata are separate resources with separate access policies and retention.
- IA-07: No medical content is sent to third-party AI, analytics, error monitoring, logs, or prototype tooling.
- IA-08: Safety-critical policy defaults are code/policy invariants; runtime configuration may tighten them but not silently disable them.
- IA-09: Public product policies and emergency information require qualified Bangladesh legal/healthcare review; planning artifacts are not legal or medical advice.
- IA-10: A dependency is not selected until current maintenance, licence/commercial use, accessibility, performance, security, self-hosting, and exit path are recorded.

## Provisional recommendations (not founder decisions)

- R-01: Preserve the PRD's narrative-first, non-scored experience model.
- R-02: Use a TypeScript modular monolith with a separate job worker and PostgreSQL; keep object storage and evidence processing behind ports.
- R-03: Treat evidence as a separately gated capability, with safe image/PDF types first and Office formats enabled only after operational validation.
- R-04: Require automated encrypted off-site backup and counsel/clinical/security review before unrestricted real-user launch. Phase 1 MFA/passkeys were explicitly deferred; the accepted account-risk controls are recorded in FD-013.
- R-05: Keep the prototype fully synthetic and no-analytics unless prototype research itself requires aggregate local measurement.
- R-06: Make anonymous contribution identity a separate public persona, not a hidden link from the ordinary profile.

## Founder decision frontier

Questions were grouped by prerequisite and answered across the founder decision rounds. Stable IDs link the final answers to the decision log and backlog.

- CQ-01: **Answered** — normal unrestricted public release after basic legal and healthcare review; no private Beta requirement.
- CQ-02: **Answered** — narrow allowlist; author reviews the processed public copy and confirms unnecessary personal information was removed before publication.
- CQ-03: **Answered in principle** — narrow formats now, public processed derivative, dynamic 90-day original default, no public-copy persistence warning; later formats preserved.
- CQ-04: **Answered** — email/password only with confirmed email, reset, secure hashing/cookies, basic throttling, and suspicious-attempt challenge; MFA/passkeys later.
- CQ-05: **Answered** — public synthetic/read-only USD 0 demo, then real-user production under a USD 100 target with necessary exceptions.
- CQ-06: **Answered** — alias isolated per review thread; Super Admin controls normally-disabled Admin/Moderator identity access; every reveal is logged; capability is disclosed only in Privacy Policy/Terms.
- CQ-07: **Answered** — no automated classifier; author warning, dedicated report reason, five-confirmed-account auto-hide, and logged manual restoration.
- CQ-08: **Answered** — allow personally witnessed family/caregiver experiences with an attestation and no verified-consent workflow.
- CQ-09: **Answered** — dynamic 90/180-day defaults; default changes apply prospectively; existing records require a logged bulk action; individual legal holds are separately logged.
- CQ-10: **Answered** — wording, taxonomies, optional fields, bounded thresholds, retention, and feature visibility are runtime-configurable; security/data structure remains deployment-controlled.
- CQ-11: **Answered** — five distinct confirmed-account reports auto-hide pending logged moderation, with restoration available.
- CQ-12: **Answered** — analytics off in the demo; minimal self-hosted aggregate analytics may be added later.

## Decisions intentionally not reopened

- No numeric/star/Bayesian provider rating in Phase 1.
- No BMDC verification service in Phase 1; registration remains explicitly unverified.
- No privileged provider response channel; provider participation uses ordinary comments with status/provenance.
- No comment attachments, deep nesting, private messaging, native apps, automated translation, automated OCR redaction, or public API in Phase 1.
- Search remains neutral and is not weighted by sentiment, outcomes, evidence, Likes, or Dislikes.
