# Scope of Work — RogiKotha (রোগীকথা)

**Version:** 1.0
**Date:** 2026-09-06
**Source-of-truth:** `docs/RogiKotha_PRD_v1.0.docx`, `docs/RogiKotha_BRD_v1.0.docx`,
`docs/architecture/`, `docs/status/decision-log.md`, `docs/planning/`.

---

## Project summary

RogiKotha ("the patient's account") is a public, bilingual (Bengali ⇄ English)
health-platform that publishes structured, evidence-attached patient accounts of
doctors and facilities, with provenance, distributions, and a moderation path.
Nothing in the product is medical advice. The product is the published
account.

The PRD's Phase 1 is a public launch on a single small server. Release 1, the version in this
repository, is the planned local demo on synthetic data (FD-031); its scope is fixed by FD-105,
and moderation and the staff console follow in release 2. The rest of this page describes the
PRD's Phase 1 (USD ≤ 100/month), built with open-source-first components, with Bangladesh as
the primary country and locale. The product is intentionally not a
doctor-rating app, not a clinical decision-support tool, and not a global SaaS.

---

## Functional Scope

### 1. Public reader experience
- Discoverability by provider, condition, symptom, treatment, medicine,
  facility, and location through one Unicode-safe Bangla/English/Banglish
  search field with transliteration, alias, and fuzzy matching.
- Results structured under All, Doctors, Facilities, Conditions/Tags, and
  Reviews tabs with neutral ordering (relevance, most accounts, most recent).
- Provider, condition, facility, and review pages with distributions that
  always carry exact counts and denominators. No combined score, no
  star/Bayesian/outcome-derived quality number — by founder decision.
- Persistent medical-advice disclaimer and non-blocking emergency guidance
  (999, 16263, crisis line, last-verified date) on every applicable page.
- Mobile-first responsive layout tuned for low-end Android on Bangla.

### 2. Patient-author contribution
- Confirmed-account Quick Review and Detailed Treatment Timeline via a
  mobile wizard with back/next/preview and encrypted server-side autosave.
- Minimum publication fields: provider, short experience, relationship, and
  condition/symptom/free-text tag or `Not sure`. Sentiment, outcomes,
  structured feedback, and evidence are optional; numerical ratings do not
  exist in Phase 1.
- Optional Positive / Mixed / Negative sentiment classifying the episode, not
  overall medical quality. Optional `went well` / `could improve` fields that
  never produce a number.
- Custom allegations visibly labeled `Reviewer's label` — framed as the
  author's claim, never as a platform finding.
- Material changes become dated corrections/follow-ups; author-deleted reviews
  use a tombstone when discussion context exists, with a 30-day restore window.

### 3. Doctor and facility profiles
- Phase 1 directory entries for BMDC MBBS/BDS doctors, submitted by
  community/admin and reviewed for duplicate/obvious abuse before publication.
- Every profile carries `Registration not verified` until a lawful BMDC
  verification workflow is approved — this is a founder-binding rule.
- Dynamic fields with explicit provenance: Community submitted, Provider
  confirmed, or Admin checked. Empty fields are omitted; never `0`.
- Facility profiles support parent organization plus physical branch with
  reviews belonging to the visited branch. Facility feedback never touches a
  doctor's summaries — enforced in the data layer.

### 4. Comments, reactions, timelines and follow-ups
- Flat text replies with warned external links and mentions. Attachments,
  deep nesting, and private messaging are out of Phase 1 scope.
- Likes/Dislikes on reviews and comments; engagement signals never weight
  default search or sentiment presentation.
- One coherent chronology per patient episode: reviewed care, later or
  alternative care, outcome/follow-up evidence, and dated updates. The latest
  reported status appears at the top and cannot be pinned by the author.

### 5. Evidence handling and document processing
- Optional evidence grouped into reviewed treatment, later/alternative
  treatment, and outcome/follow-up. Status language is `Documents attached`;
  public copy states reviewer upload, privacy not independently checked, and
  no medical validation.
- Phase 1 allowlist starts narrow (JPEG, PNG, PDF). Extensions (HEIC,
  legacy/current Office, TXT, RTF) are planned but require format-by-format
  malicious-corpus, sandbox, and redaction tests before activation.
- Trust boundaries: every file streams to private quarantine, is
  extension/MIME/magic/size-validated, malware-scanned (fails closed),
  re-encoded and metadata-stripped, and only the processed derivative is
  public. Originals are retained privately under a runtime-configurable
  default (90 days) with individual legal hold.
- Public viewer supports zoom, pan, fullscreen, page navigation, rotation,
  and processed-PDF download. Originals never become public.
- Failed processing keeps the file private and offers replace/remove
  guidance; a failed file never removes otherwise-eligible review text.

### 6. Reporting, moderation and appeals
- Configurable report reasons include privacy, threats, harassment, hate,
  spam, impersonation, dangerous advice, ownership, duplicate, off-topic,
  factual dispute, and other.
- Reporter identity is restricted; the reported party receives generic
  notice and later action/policy/appeal information without reporter identity.
- Privacy leaks, credible threats, and unsafe files hide on first credible
  detection/report. Factual disagreement never auto-hides.
- Other eligible reports temporarily hide after five unique confirmed accounts
  by default (configurable). Coordinated abuse must be detected.
- Beta review targets are 24 hours critical, three business days standard,
  seven business days appeals — not 24/7 guarantees.
- Moderators may redact identifiers, remove unsafe files, warn, or hide —
  but may not rewrite substantive medical narrative. Founder conducts
  Phase 1 appeals with a fresh checklist and written reason.

### 7. User, role and configuration management
- Registration requires email, password, unique username, display name,
  interface language, Terms/Privacy acceptance, and age confirmation. Sessions
  last up to 30 days with revoke-all visibility.
- Administrative roles: Super Admin, permission-scoped Admin, and
  permission-scoped Moderator. Sensitive configuration changes require
  password confirmation and full audit logging.
- Super Admin runtime configuration covers wording, taxonomies, optional
  fields, retention periods, report thresholds, and feature visibility.
  Structural security and data boundaries remain deployment-controlled.
- Default rate limits: 5 reviews/day, 30 comments/hour, 100 reactions/hour,
  5 profile submissions/day/account.

---

## Integration Scope

The product is a self-contained modular monolith on a single VPS with a
separately isolated document-processing worker. Phase 1 integration surface is
intentionally small:

- **Transactional email** for verification, security, recovery, policy, and
  deletion messages. No marketing or digest email.
- **Object storage** behind a small storage port with quarantine write,
  private read, immutable derivative publish, retention transition, and
  audited delete operations.
- **Isolated document-processing worker** for Office conversion, image
  re-encoding, PDF rasterisation, redaction flattening, and malware scanning.
  No shared filesystem or shared credentials with the web tier.
- **Reverse proxy** terminating TLS, applying CSP, and forwarding requests.
- **Self-hosted analytics (optional)** behind explicit consent; analytics is
  off in the demo and not required for production. Medical text, raw search,
  aliases, evidence names or contents, and patient/provider identifiers are
  excluded from analytics by construction.
- **Database** (PostgreSQL) holding public content, private evidence metadata,
  identity data, moderation state, and immutable audit events as explicit
  domains with deny-by-default access.

Phase 1 contains **no** BMDC verification integration, **no** clinical system
integration, **no** payment processing, **no** public API, **no** native
mobile app, **no** device geolocation, and **no** provider subscriptions or
paid ranking. Adding any of these is a Phase 2 decision that requires its own
scope, security review, and founder sign-off.

---

## Hard rules and product constraints

These are binding on every implementation choice and are not negotiable inside
Phase 1:

- No number ever stands for quality. Distributions always carry exact counts
  and denominators.
- Missing values read `Not provided` / `No documents`, never `0`.
- `Limited data` appears with exact review count whenever the sample is sparse.
- Registration is not verified in Phase 1. Every doctor carries
  `Registration not verified`.
- Evidence reads `Documents attached — not medically validated`. Never
  `verified` or `approved`.
- User claims render as `Reviewer's label` — framed as the author's claim,
  never a platform finding.
- Facility feedback never touches a doctor's summaries — enforced in the
  data layer, not just the copy.
- Reporter identity is never shown to the reported person; in the console
  it appears as restricted, never blank.
- Original evidence is a separate, audited permission. Scanning that cannot
  run fails closed.
- Bengali and English have equal product status; numerals follow language;
  the type scale rebuilds for Bengali and the Latin cap is dropped.
- `prefers-reduced-motion` and `body[data-motion="off"]` are honoured
  everywhere; every state remains reachable with motion disabled.

---

## Expected outcome

When Phase 1 is delivered, a Bangladeshi reader can find, read, and weigh a
patient account of a doctor or facility on their own phone in their own
language; a patient-author can publish a structured account with optional
evidence and follow-up updates; a moderator can review reports and act on
violations; and an operator can run the platform on one small server with
encrypted off-host backups, audit trails, and a documented recovery path.
The build is automated, the dependency tree is pinned, the architecture spine
is enforced by lint, and bilingual parity is verified end-to-end. No clinical
or rating product is being shipped; the scope boundaries
(below) record what Phase 1 deliberately leaves out, so the boundary is not
moved without a new scope decision.

---

## Phase 1 scope boundaries

- Diagnosis, treatment recommendation, medical validation, or
  negligence/malpractice determination. No clinical panels or community voting.
- Numeric, star, Bayesian, or combined medical-quality scoring or
  outcome-derived rating.
- Native mobile apps or app-store release.
- BMDC verification service or integration.
- Private messaging, comment attachments, deep nesting, push/SMS/general
  email digests.
- Automated OCR/PII redaction, automated translation, or searchable
  evidence OCR.
- Public API, payment processing, provider subscriptions, paid review
  removal, undisclosed paid ranking, or clinical booking engine.
- Device geolocation or "Near Me" search.
- Full status page, formal independent appeal review, multi-server high
  availability, or a production staging environment.

---

## Source of truth

This Scope of Work is the one-page entry point. The full product, business,
architecture, and decision material live in:

- Product Requirements: `docs/RogiKotha_PRD_v1.0.docx`
- Business Requirements: `docs/RogiKotha_BRD_v1.0.docx`
- Requirement baseline: `docs/planning/01-requirement-baseline.md`
- Architecture as built: `README.md` (Architecture)
- Architecture decisions: `docs/architecture/decisions/` (ADR-001 → ADR-013)
- Dependency checks: `docs/status/dependency-check-log.md`
- Founder decisions: `docs/status/decision-log.md` (FD-001 → FD-123)
- Units of work: `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/units-generation/unit-of-work.md`
- Build and Test results: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/build-and-test/build-and-test-summary.md`
- Release 2 roadmap: `README.md` (Roadmap) and FD-105 in the decision log
