---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - docs/planning/01-requirement-baseline.md
  - docs/planning/05-recommended-architecture.md
  - docs/planning/06-requirement-traceability-matrix.md
  - docs/architecture/ARCHITECTURE-SPINE.md
  - docs/status/decision-log.md
status: planned
---

# RogiKotha product backlog

## Product goal and releases

Enable people to share and learn from condition-specific healthcare experiences without presenting those experiences as medical verification. Release sequencing is dependency-led, not a promise of dates.

| Release | Outcome | Epics |
|---|---|---|
| R0 — Public synthetic demo | Anyone can compare three complete, read-only, bilingual concepts with safe synthetic data | EPIC-FOUND-001, EPIC-PROT-001 |
| R1 — Public contribution core | Confirmed users can discover profiles and publish narrative reviews; safe processed evidence follows independently | EPIC-AUTH-001, EPIC-DIR-001, EPIC-REV-001, EPIC-EVID-001 |
| R2 — Community and trust | Discussion, reporting, moderation, workspace, notifications and bounded administration work end to end | EPIC-COM-001, EPIC-MOD-001, EPIC-USER-001, EPIC-ADMIN-001 |
| R3 — Production readiness | Search quality, privacy-minimised operations, recovery and specialist gates make unrestricted public launch supportable | EPIC-SRCH-001, EPIC-OPS-001 |

## Epic list

| Epic | User outcome | Principal coverage | Depends on |
|---|---|---|---|
| EPIC-FOUND-001 Foundation with visible value | A navigable, accessible shell proves the architecture and both languages | NFR-006–010 | — |
| EPIC-PROT-001 Comparable public demo | Founder and test users can compare three representative concepts safely | NFR-004–006, NFR-012, FD-007/012/024 | FOUND |
| EPIC-AUTH-001 Access and identity | Adults can create, confirm, recover and control accounts and presentation identities | FR-AUTH, FR-USER-001/005 | FOUND |
| EPIC-DIR-001 Trustworthy directory | People can view, submit and claim transparent doctor/facility profiles | FR-DOC, FR-FAC | AUTH |
| EPIC-SRCH-001 Neutral discovery | People can search Bengali, English or Banglish without quality-score bias | FR-SRCH, FR-TAG | DIR, REV |
| EPIC-REV-001 Treatment stories | Users can draft, publish, correct and understand narrative episode histories | FR-REV, FR-EDIT, FR-SUM | AUTH, DIR |
| EPIC-EVID-001 Safe supporting documents | Authors can attach reviewed processed copies without exposing originals | FR-FILE, FR-EVD | REV |
| EPIC-COM-001 Contextual discussion | Confirmed users can discuss and react without turning engagement into quality | FR-COM, FR-REA | AUTH, REV |
| EPIC-MOD-001 Reporting and fair enforcement | Users can report; staff can act, appeal and preserve context with audit | FR-MOD | AUTH, REV |
| EPIC-USER-001 Personal workspace | Users can manage public identity, private activity, notifications and data requests | FR-NOT, FR-USER, FR-FDB | AUTH |
| EPIC-ADMIN-001 Bounded operations | Authorized staff can configure and operate the product without bypassing invariants | FR-ADM | all domain epics |
| EPIC-OPS-001 Recoverable public service | The founder can deploy, observe, back up and release the service responsibly | FR-AN, FR-PWA, NFR-001–003/009–011 | all |

The complete one-to-one requirement coverage map is [06-requirement-traceability-matrix.md](06-requirement-traceability-matrix.md). Every story below has one contract/data task, one experience/integration task, and an independent validation task in `backlog.yaml`.

## Story contract

Tests named `domain`, `integration`, `component`, `E2E`, `a11y`, `security`, `performance`, `restore`, or `specialist` are required levels, not suggestions. “Both locales” means equal Bengali and English interface coverage; user content may be Bengali, English, or Banglish. All demo entities are synthetic.

Each story's `Agents/complexity` class is its explicit implementer/validator recommendation: M1 = GPT-5.6 Terra implementation with independent Claude Code Sonnet validation; M2 = Claude Code Sonnet implementation with independent GPT-5.6 Terra validation; M3 = GPT-5.6 Sol implementation with independent Claude Code Sonnet validation plus human approval. Effort, expected context, cost sensitivity and fallback are defined in `07-agent-model-assignment.md`. Task-level overrides in YAML win.

Task suffix `-A` normally owns domain/contracts/data or shared behavior; `-B` owns the adapter/UI/integration slice; extra letters split parallel-safe concept work. `VALIDATE-*` inspects the combined actual diff and reruns risk-focused tests. The resolved YAML entry is part of the readable task contract: YAML anchors supply shared inputs/commands/evidence fields while each task states its own files, output, tests, dependencies, risks, model class and human gate.

### EPIC-FOUND-001 — Foundation with visible value

#### STORY-FOUND-001 — Architecture-enforced application foundation

- **Persona / need / value:** Founder needs one comprehensible deployable system so features can be delivered safely by focused agents without premature services.
- **Sources:** NFR-008–010; ADR-0001/0002/0007/0012. **In:** workspace, domain/application ports, web/worker compositions, CI quality gates. **Out:** product features and production deployment.
- **Dependencies / assumptions:** approved ADRs; Node LTS. **Security/privacy:** strict boundaries, secret-free jobs/logs. **Accessibility:** semantic shell and focus baseline.
- **Acceptance:** **Given** a clean checkout, **when** documented checks run, **then** web and worker compositions build, dependency-direction rules pass, and the shell renders in both locales without importing fixtures directly.
- **Tests/data/states:** architecture, unit, component, a11y; tiny synthetic locale fixtures; default/loading/error shell. **Agents/complexity:** M1; L. **Tasks:** TASK-FOUND-001-A/B, VALIDATE-FOUND-001.
- **DoR:** versions rechecked, folder contract approved. **DoD:** checks pass, decisions linked, actual diff independently inspected, no application secret or attribution committed.

### EPIC-PROT-001 — Comparable public demo

#### STORY-PROT-001 — Deterministic synthetic demo services

- **Persona / need / value:** Founder needs a USD 0 public demo that cannot collect real accounts or health data.
- **Sources:** NFR-012; FD-007/012/019. **In:** typed fixtures, read-only in-memory services, reset and role/state simulation. **Out:** real auth, writes, uploads, analytics.
- **Dependencies / assumptions:** FOUND-001; static hosting feasible. **Security/privacy:** all mutations fail closed; synthetic watermark invariant. **Accessibility:** controls are labelled and keyboard operable.
- **Acceptance:** **Given** demo mode, **when** any write/auth/upload path is attempted, **then** no data is persisted or transmitted and the UI offers a clearly simulated result; reset restores deterministic state.
- **Tests/data/states:** domain, E2E, security; Bangladesh-focused synthetic corpus; all roles/loading/error/empty/hidden. **Agents/complexity:** M1; M. **Tasks:** TASK-PROT-001-A/B, VALIDATE-PROT-001.
- **DoR:** synthetic-data rules approved. **DoD:** outbound/write scan passes, all documents visibly marked demo, validator reproduces reset and denial paths.

#### STORY-PROT-002 — Three genuinely different design concepts

- **Persona / need / value:** Founder needs evidence-based alternatives before choosing a production visual system.
- **Sources:** founder execution brief; UX research. **In:** concept A/B/C route systems sharing types, services and accessible primitives. **Out:** winner selection/consolidation.
- **Dependencies / assumptions:** PROT-001 and UX brief. **Security/privacy:** no real data. **Accessibility:** same critical journeys and states in each concept.
- **Acceptance:** **Given** the design lab, **when** the same workflow is opened in each concept, **then** composition, navigation, typography, density, timeline/evidence presentation and motion differ materially while behavior and content remain comparable.
- **Tests/data/states:** component, E2E, a11y, visual; shared corpus; desktop/mobile and long/limited/error states. **Agents/complexity:** M2; XL. **Tasks:** TASK-PROT-002-A/B/C, VALIDATE-PROT-002.
- **DoR:** design briefs and wireframes approved for implementation. **DoD:** all required routes connected, viewport evidence captured, comparison written, no winning concept silently selected.

#### STORY-PROT-003 — Responsive and accessible comparison evidence

- **Persona / need / value:** Mobile and assistive-technology users need usable critical journeys in either interface language.
- **Sources:** NFR-001/004–007; WCAG 2.2. **In:** viewport matrix, keyboard, screen-reader, reduced-motion, overflow and performance evidence. **Out:** formal certification.
- **Dependencies / assumptions:** PROT-002. **Security/privacy:** screenshots contain synthetic content only. **Accessibility:** WCAG 2.2 AA foundation.
- **Acceptance:** **Given** each target viewport and locale, **when** critical journeys run, **then** there is no unintended overflow, focus/labels/headings/errors work, 200% zoom and reduced motion remain usable, and known issues are recorded.
- **Tests/data/states:** E2E, axe, keyboard, manual screen reader, screenshots, performance; longest bilingual fixtures. **Agents/complexity:** M2; L. **Tasks:** TASK-PROT-003-A/B, VALIDATE-PROT-003.
- **DoR:** journeys and budgets defined. **DoD:** comparable evidence exists for 360×800, 390×844, 768×1024, 1280×800 and 1440×900; independent accessibility review recorded.

### EPIC-AUTH-001 — Access and identity

#### STORY-AUTH-001 — Adult account registration and confirmation

- **Persona / need / value:** Adult contributor needs simple email/password access so public browsing stays open and contributions are accountable.
- **Sources:** FR-AUTH-001–006; FD-006/013. **In:** register, email confirmation, sign-in/out, secure session, age/terms confirmation, rate limits. **Out:** MFA/passkeys/social login.
- **Dependencies / assumptions:** FOUND-001; transactional email available in production. **Security/privacy:** Argon2id, enumeration resistance, CSRF, secure cookies, 30-day maximum. **Accessibility:** labelled forms and non-color errors.
- **Acceptance:** **Given** a valid adult registration, **when** email is confirmed within 24 hours, **then** contribution access is enabled; invalid, reused, expired and rate-limited attempts reveal no unnecessary account facts.
- **Tests/data/states:** domain, integration, E2E, security, a11y; synthetic accounts; default/pending/expired/locked/error. **Agents/complexity:** M3; L. **Tasks:** TASK-AUTH-001-A/B, VALIDATE-AUTH-001.
- **DoR:** auth spike/threat model and mail adapter contract approved. **DoD:** negative matrix passes, sessions/audit verified, cross-vendor and human security approval recorded.

#### STORY-AUTH-002 — Recovery, sessions and administrative device approval

- **Persona / need / value:** User needs safe password recovery and session control; staff need stronger new-device checks without Phase 1 MFA.
- **Sources:** FR-AUTH-007–009; FD-013. **In:** reset, session list/revoke-all, staff new-device email approval and password recheck. **Out:** MFA/passkeys.
- **Dependencies / assumptions:** AUTH-001. **Security/privacy:** single-use expiring tokens, rotation, no session metadata leakage. **Accessibility:** recovery works without time-pressure traps.
- **Acceptance:** **Given** a recovery or unknown staff device, **when** the verified flow completes, **then** credentials/sessions rotate as specified and all security events are logged without exposing whether an arbitrary email exists.
- **Tests/data/states:** integration, E2E, security; known/unknown devices and expired/replayed tokens. **Agents/complexity:** M3; L. **Tasks:** TASK-AUTH-002-A/B, VALIDATE-AUTH-002.
- **DoR:** recovery policy and break-glass owner approved. **DoD:** replay/enumeration/revocation tests pass; human security approval.

#### STORY-IDENT-001 — Per-review named, pseudonymous and anonymous identity

- **Persona / need / value:** Reviewer needs control over public presentation without accidental cross-linkage.
- **Sources:** FR-REV-006, FR-REA-002, FR-USER-001; FD-015/016/022. **In:** review-thread alias, public projection isolation, role-gated staff reveal. **Out:** guaranteed anonymity against lawful disclosure.
- **Dependencies / assumptions:** AUTH-001. **Security/privacy:** Super Admin reveal is audited; Admin/Moderator reveal normally off and separately toggled. **Accessibility:** identity state explained in plain language.
- **Acceptance:** **Given** an anonymous review, **when** public profile, reactions, mentions, feeds and other reviews are inspected, **then** no account linkage appears; **when** authorized staff reveal, **then** policy, purpose and immutable access event are required.
- **Tests/data/states:** domain, integration, E2E, security; linked and deliberately adversarial identity fixtures. **Agents/complexity:** M3; XL. **Tasks:** TASK-IDENT-001-A/B, VALIDATE-IDENT-001.
- **DoR:** data-flow/threat model and Terms/Privacy placement approved. **DoD:** leakage suite passes, capability matrix proven, cross-vendor plus human privacy approval.

### EPIC-DIR-001 — Trustworthy directory

#### STORY-DIR-001 — Transparent doctor profiles

- **Persona / need / value:** Visitor needs useful doctor information with provenance and no false verification claim.
- **Sources:** FR-DOC-001–005. **In:** MBBS/BDS profile fields, dynamic omission, provenance/status/time, branch/chamber data. **Out:** Phase 1 BM&DC verification.
- **Dependencies / assumptions:** FOUND-001. **Security/privacy:** public fields only, abuse review. **Accessibility:** definition lists/tables reflow and statuses have text.
- **Acceptance:** **Given** a published profile, **when** viewed in either locale, **then** only populated fields render with provenance and update date and registration is labelled not verified.
- **Tests/data/states:** domain, component, E2E, a11y; synthetic doctors only; unclaimed/claimed/limited/merged. **Agents/complexity:** M1; M. **Tasks:** TASK-DIR-001-A/B, VALIDATE-DIR-001.
- **DoR:** field registry and copy approved. **DoD:** projection and responsive states pass; no real negative doctor fixture.

#### STORY-DIR-002 — Community submission, claim and duplicate merge

- **Persona / need / value:** Contributor/provider needs to add or maintain a profile while users keep stable links and history.
- **Sources:** FR-DOC-006–009. **In:** submission, photo/source approval, claim evidence, mutable-field rules, merge/redirect/audit. **Out:** automated registry scrape.
- **Dependencies / assumptions:** AUTH-001, DIR-001. **Security/privacy:** claim evidence private; redirect cannot leak rejected profile. **Accessibility:** multi-step status and errors announced.
- **Acceptance:** **Given** a duplicate or claim, **when** staff approve the reason-coded action, **then** allowed fields/relationships transfer, old URLs redirect, restricted changes remain pending and audit history is preserved.
- **Tests/data/states:** domain, integration, E2E, security; duplicate/claim synthetic corpus. **Agents/complexity:** M1; L. **Tasks:** TASK-DIR-002-A/B, VALIDATE-DIR-002.
- **DoR:** claim/merge policy approved. **DoD:** transfer matrix and authorization tests pass; staff workflow reviewed.

#### STORY-DIR-003 — Facility organizations and branches

- **Persona / need / value:** Visitor needs feedback tied to the location actually visited.
- **Sources:** FR-FAC-001–004. **In:** parent/branch model, branch reviews, aggregate summaries, non-scored facility feedback/claims. **Out:** universal facility verification.
- **Dependencies / assumptions:** DIR-001 patterns. **Security/privacy:** contact/claim evidence minimised. **Accessibility:** branch relationships navigable by headings and links.
- **Acceptance:** **Given** a multi-branch facility, **when** a branch or parent is viewed, **then** branch-specific experiences stay separate and parent aggregates disclose their denominator without a score.
- **Tests/data/states:** domain, component, E2E; synthetic facilities; single/multi-branch/unverified/limited. **Agents/complexity:** M1; M. **Tasks:** TASK-DIR-003-A/B, VALIDATE-DIR-003.
- **DoR:** branch vocabulary approved. **DoD:** aggregate ownership and claim states pass in both locales.

### EPIC-SRCH-001 — Neutral discovery

#### STORY-SRCH-001 — Unicode-safe unified search

- **Persona / need / value:** Visitor needs to find providers, facilities, tags and reviews using Bengali, English or Banglish.
- **Sources:** FR-SRCH-001–003. **In:** normalized aliases, FTS/trigrams, suggestions, tabs, location. **Out:** semantic/vector search.
- **Dependencies / assumptions:** DIR-001/003, REV-001. **Security/privacy:** visibility filter precedes ranking; raw queries excluded from logs/analytics. **Accessibility:** suggestions/tabs keyboard and screen-reader operable.
- **Acceptance:** **Given** the reviewed multilingual corpus, **when** exact, variant, typo and ambiguous queries run, **then** eligible results/suggestions meet agreed bands without silently replacing input or exposing hidden records.
- **Tests/data/states:** domain, integration, performance, security, a11y; locally reviewed corpus. **Agents/complexity:** M1; XL. **Tasks:** TASK-SRCH-001-A/B, VALIDATE-SRCH-001.
- **DoR:** corpus and relevance bands approved. **DoD:** relevance/latency/leakage evidence passes with query plans recorded.

#### STORY-SRCH-002 — Neutral filters, ranking and result cards

- **Persona / need / value:** Visitor needs understandable filtering without popularity becoming provider quality.
- **Sources:** FR-SRCH-004–008. **In:** configurable cards, filters, neutral ordering, provider review sorts, SEO eligibility. **Out:** recommendation/personalization.
- **Dependencies / assumptions:** SRCH-001. **Security/privacy:** no private exact dates/evidence text in index. **Accessibility:** filter names, counts and clear-all work without pointer.
- **Acceptance:** **Given** identical textual relevance, **when** engagement/evidence/outcome changes, **then** default neutral rank does not change; filters and alternate sorts disclose their basis.
- **Tests/data/states:** domain, integration, E2E, performance; tie and sparse fixtures. **Agents/complexity:** M1; L. **Tasks:** TASK-SRCH-002-A/B, VALIDATE-SRCH-002.
- **DoR:** ranking contract frozen. **DoD:** metamorphic neutrality tests and indexability matrix pass.

#### STORY-SRCH-003 — Provisional bilingual taxonomy

- **Persona / need / value:** Contributor needs to use familiar wording even before a canonical term exists.
- **Sources:** FR-TAG-001–003. **In:** grouped tags, `Not sure`, provisional terms, alias mapping/redirect. **Out:** automated medical ontology decisions.
- **Dependencies / assumptions:** REV-001. **Security/privacy:** taxonomy is not diagnosis or medical verification. **Accessibility:** chips have removable text controls and language metadata.
- **Acceptance:** **Given** an unmapped Bengali/English/Banglish term, **when** published then later mapped, **then** original wording remains visible, canonical discovery improves, and links redirect without changing review meaning.
- **Tests/data/states:** domain, integration, component; reviewed synthetic taxonomy. **Agents/complexity:** M1; M. **Tasks:** TASK-SRCH-003-A/B, VALIDATE-SRCH-003.
- **DoR:** taxonomy governance approved. **DoD:** mapping/version/redirect tests pass; healthcare reviewer flags misleading terms.

### EPIC-REV-001 — Treatment stories

#### STORY-REV-001 — Quick Review wizard

- **Persona / need / value:** Contributor needs a low-friction mobile path to share a specific witnessed episode.
- **Sources:** FR-REV-001/002/005/006; FD-014. **In:** autosave, provider, short experience, relationship attestation, tag/Not sure, identity, preview/publish. **Out:** ratings and consent-verification workflow.
- **Dependencies / assumptions:** AUTH-001, DIR-001, IDENT-001. **Security/privacy:** exact date/private metadata excluded publicly; server authorization. **Accessibility:** progress, errors, back/next and recovery announced.
- **Acceptance:** **Given** a confirmed adult, **when** minimum fields and attestation are completed, **then** preview shows the exact public projection and publication succeeds without requiring optional sentiment/outcome/evidence.
- **Tests/data/states:** domain, component, E2E, a11y; named/pseudonymous/anonymous synthetic episodes; draft/offline-like/error/published. **Agents/complexity:** M2; L. **Tasks:** TASK-REV-001-A/B, VALIDATE-REV-001.
- **DoR:** public/private field map approved. **DoD:** mobile recovery and minimum/optional matrix pass in both locales.

#### STORY-REV-002 — Detailed treatment timeline

- **Persona / need / value:** Contributor needs a chronology that separates reviewed care from later/alternative care.
- **Sources:** FR-REV-003/004/007. **In:** structured optional sections, month/year public dates, timeline ordering and later provider references. **Out:** clinical correctness claims.
- **Dependencies / assumptions:** REV-001. **Security/privacy:** free text sanitized; exact dates private. **Accessibility:** timeline is semantic ordered content, not visual-only.
- **Acceptance:** **Given** a long episode, **when** previewed/published, **then** reviewed and later care remain explicitly separated and understandable with sections omitted cleanly when empty.
- **Tests/data/states:** domain, component, E2E, a11y; short/long/mixed-locale timelines. **Agents/complexity:** M2; L. **Tasks:** TASK-REV-002-A/B, VALIDATE-REV-002.
- **DoR:** timeline vocabulary/schema approved. **DoD:** ordering/private-date/long-content tests pass.

#### STORY-REV-003 — Drafts, follow-ups, corrections and deletion

- **Persona / need / value:** Author needs to recover work and update outcomes without erasing meaningful history or discussion.
- **Sources:** FR-REV-008/009, FR-EDIT-001–004. **In:** encrypted autosave, dated corrections/follow-ups, latest status, versioning, tombstone, 30-day restore. **Out:** silent rewrite.
- **Dependencies / assumptions:** REV-001/002. **Security/privacy:** legal hold and retention orchestrated; search/cache removed promptly. **Accessibility:** changed/current status is announced.
- **Acceptance:** **Given** published content with discussion, **when** materially edited or deleted, **then** the original remains understandable to authorized history, public projections show dated update/tombstone, summaries/search update, and restore expires after 30 days unless hold policy applies.
- **Tests/data/states:** domain, integration, E2E, security; clock-controlled histories. **Agents/complexity:** M3; XL. **Tasks:** TASK-REV-003-A/B, VALIDATE-REV-003.
- **DoR:** transition/deletion matrix and counsel review points approved. **DoD:** clock/concurrency/cache/search/hold tests pass; human privacy approval.

#### STORY-REV-004 — Narrative sentiment and outcome summaries

- **Persona / need / value:** Visitor needs transparent distributions without a provider-quality score.
- **Sources:** FR-SUM-001–005. **In:** eligible counts/percentages/denominators, common tags, limited-data state. **Out:** stars, combined/Bayesian score, engagement weighting.
- **Dependencies / assumptions:** REV-001/003. **Security/privacy:** only eligible public reviews count. **Accessibility:** text equivalents and denominators accompany visuals.
- **Acceptance:** **Given** eligible and ineligible reviews, **when** visibility or optional values change, **then** distributions recalculate transactionally, missing values remain not provided, and no combined score appears.
- **Tests/data/states:** domain, integration, component; zero/one/sparse/mixed fixtures. **Agents/complexity:** M1; M. **Tasks:** TASK-REV-004-A/B, VALIDATE-REV-004.
- **DoR:** limited-data threshold configured. **DoD:** aggregation/metamorphic copy tests pass in both locales.

### EPIC-EVID-001 — Safe supporting documents

#### STORY-EVID-001 — Quarantine-first upload and processing

- **Persona / need / value:** Author needs optional evidence without unsafe files entering public delivery.
- **Sources:** FR-FILE-001–003/009; FD-002. **In:** JPEG/PNG/PDF, 10 files, 15 MB each/100 MB total, magic/MIME validation, quarantine, scan, raster/re-encode, fail-closed jobs. **Out:** HEIC/Office/TXT/RTF and archives.
- **Dependencies / assumptions:** REV-001, worker/storage ports. **Security/privacy:** untrusted bytes never reach public origin; bounded resources. **Accessibility:** status and recovery do not rely on progress animation.
- **Acceptance:** **Given** safe, mismatched, malicious, encrypted, oversized and parser-failure files, **when** processed, **then** only bounded safe derivatives advance and review text remains independently publishable.
- **Tests/data/states:** domain, integration, security, performance; curated non-sensitive malicious/edge corpus. **Agents/complexity:** M3; XL. **Tasks:** TASK-EVID-001-A/B, VALIDATE-EVID-001.
- **DoR:** threat model/corpus/isolation limits approved. **DoD:** fail-closed and resource-exhaustion tests pass; cross-vendor plus human security approval.

#### STORY-EVID-002 — Privacy preview and public processed viewer

- **Persona / need / value:** Author needs to inspect/redact the exact public copy; visitor needs an understandable processed-document viewer.
- **Sources:** FR-FILE-004–006, FR-EVD-001–004; FD-003/023. **In:** manual flattened redaction, author confirmation, groups, provenance copy, zoom/pan/fullscreen/page/rotate/download. **Out:** automated PII detection and persistence warning.
- **Dependencies / assumptions:** EVID-001, REV-002. **Security/privacy:** originals never served; confirmation required. **Accessibility:** keyboard viewer, page text labels, non-canvas fallback/download.
- **Acceptance:** **Given** a processed derivative, **when** the author confirms unnecessary personal data is removed, **then** only that immutable copy can publish in its correct timeline group with user-reported/not-medically-verified language.
- **Tests/data/states:** domain, component, E2E, security, a11y; multi-page synthetic marked documents. **Agents/complexity:** M3; XL. **Tasks:** TASK-EVID-002-A/B, VALIDATE-EVID-002.
- **DoR:** redaction/viewer prototype and copy approved. **DoD:** original-access and redaction-flattening attacks fail; both-locale viewer passes; human privacy approval.

#### STORY-EVID-003 — Custody, retention, holds and removal

- **Persona / need / value:** Author/staff need predictable deletion and scoped preservation with accountable access.
- **Sources:** FR-FILE-007/008, FR-EVD-005–007; FD-004/005/020/021. **In:** 90-day original default, 180-day audit/content default, future-only config, previewed bulk action, record hold, custody log, removal/tombstone. **Out:** silent global extension.
- **Dependencies / assumptions:** EVID-001/002 and the foundation configuration port; the later Admin story consumes these commands. **Security/privacy:** purpose-bound audited original access; hold overrides scheduled physical deletion only within scope. **Accessibility:** retention/action summaries use plain language.
- **Acceptance:** **Given** expiring records, **when** retention, bulk change, hold/release or removal occurs, **then** exact affected records and actor/reason/version are logged, public access follows visibility policy, and ordinary config cannot silently rewrite existing deadlines.
- **Tests/data/states:** domain, integration, security, clock, restore; held/released/expired/bulk-preview fixtures. **Agents/complexity:** M3; XL. **Tasks:** TASK-EVID-003-A/B, VALIDATE-EVID-003.
- **DoR:** deletion/hold matrix and counsel owner approved. **DoD:** time/authorization/idempotency/audit tests pass; cross-vendor, counsel and human security approval.

### EPIC-COM-001 — Contextual discussion

#### STORY-COM-001 — Comments, flat replies, mentions and advice warning

- **Persona / need / value:** Confirmed user needs contextual discussion with a clear boundary against uncertain medical advice.
- **Sources:** FR-COM-001–003; FD-009/017. **In:** text, warned external links, one reply level, mentions, edits/deletes/tombstones, persistent warning/report route. **Out:** attachments, DMs, automated classification.
- **Dependencies / assumptions:** AUTH-001, REV-001. **Security/privacy:** sanitize links/text; blocking and anonymous linkage respected. **Accessibility:** warning persistent but non-modal; mention suggestions keyboard usable.
- **Acceptance:** **Given** a user composes a comment, **when** they encounter the warning, **then** they can continue without classification or professional verification and can report unsafe/misleading advice; deleted context tombstones only when needed.
- **Tests/data/states:** domain, component, E2E, security, a11y; safe/unsafe-looking text without automated judgments. **Agents/complexity:** M1; L. **Tasks:** TASK-COM-001-A/B, VALIDATE-COM-001.
- **DoR:** warning and link policy approved. **DoD:** sanitization, nesting, mention, block and tombstone tests pass.

#### STORY-COM-002 — Like/dislike engagement

- **Persona / need / value:** Confirmed user needs lightweight feedback without engagement becoming clinical or ranking authority.
- **Sources:** FR-REA-001–002. **In:** mutually exclusive reactions, change/remove, counts and permitted lists. **Out:** quality scoring.
- **Dependencies / assumptions:** AUTH-001, IDENT-001. **Security/privacy:** anonymous review alias never links via reaction lists. **Accessibility:** pressed state/name/count announced.
- **Acceptance:** **Given** repeated/concurrent reactions, **when** a user changes choice, **then** one idempotent current reaction and accurate count remain and neutral search/sentiment are unchanged.
- **Tests/data/states:** domain, integration, component, security; concurrency and anonymous fixtures. **Agents/complexity:** M1; M. **Tasks:** TASK-COM-002-A/B, VALIDATE-COM-002.
- **DoR:** public-list identity rule frozen. **DoD:** idempotency, linkage and rank-neutrality tests pass.

### EPIC-MOD-001 — Reporting and fair enforcement

#### STORY-MOD-001 — Report intake and five-account temporary hide

- **Persona / need / value:** User needs a simple report path that protects privacy and can limit broadly reported harm without a classifier.
- **Sources:** FR-MOD-001–003/008; FD-017. **In:** configurable reasons, private reporter context, distinct confirmed-account threshold, coordination evidence, temporary hide. **Out:** factual-dispute auto-hide and automated danger classification.
- **Dependencies / assumptions:** AUTH-001, REV/COM. **Security/privacy:** reporter identity restricted; duplicate/Sybil resistance. **Accessibility:** report flow is labelled, recoverable, and non-accusatory.
- **Acceptance:** **Given** reports, **when** five distinct confirmed accounts meet the configured eligible threshold, **then** content hides temporarily once, a reason-coded queue item/audit event is created, and authorized staff can restore it with a logged reason.
- **Tests/data/states:** domain, integration, E2E, security/concurrency; duplicate/coordinated/factual-dispute fixtures. **Agents/complexity:** M3; XL. **Tasks:** TASK-MOD-001-A/B, VALIDATE-MOD-001.
- **DoR:** reason/threshold/abuse policy approved. **DoD:** concurrency/Sybil/reporter-leak tests pass; human trust-and-safety approval.

#### STORY-MOD-002 — Moderation queue and bounded actions

- **Persona / need / value:** Moderator needs prioritized context and reversible reason-coded actions without rewriting a patient's narrative.
- **Sources:** FR-MOD-004/005, FR-EDIT-003/005. **In:** priority/status, redact identifiers, remove file, warn/hide/restore, re-review, audit. **Out:** substantive narrative rewrite.
- **Dependencies / assumptions:** MOD-001. **Security/privacy:** least privilege, sensitive-data access separately authorized. **Accessibility:** queue usable by keyboard and status not color-only.
- **Acceptance:** **Given** a queue item, **when** an authorized action is taken, **then** policy version/reason/evidence/public effect are recorded and substantive medical narrative cannot be edited through moderation commands.
- **Tests/data/states:** domain, integration, E2E, security; critical/standard/reviewed/restore cases. **Agents/complexity:** M3; XL. **Tasks:** TASK-MOD-002-A/B, VALIDATE-MOD-002.
- **DoR:** permission/action matrix and checklist approved. **DoD:** privilege/escalation/audit/projection tests pass; human approval.

#### STORY-MOD-003 — Appeals, blocking and enforcement lifecycle

- **Persona / need / value:** Affected user needs a fresh appeal; users need blocking; staff need consistent enforcement history.
- **Sources:** FR-MOD-006/007 and enforcement policy. **In:** fresh checklist/reason, founder appeal decision, block interaction effects, warning/restrict/suspend/ban. **Out:** private messaging.
- **Dependencies / assumptions:** MOD-002, NOTIF-001. **Security/privacy:** appellant never learns reporter identity; new reviewer perspective recorded. **Accessibility:** appeal reasons and deadlines are understandable.
- **Acceptance:** **Given** an eligible appeal, **when** independently reconsidered, **then** a written reason and resulting visibility/enforcement transition are logged; blocking stops direct interaction while preserving public context.
- **Tests/data/states:** domain, integration, E2E, security; upheld/changed/expired/block fixtures. **Agents/complexity:** M3; L. **Tasks:** TASK-MOD-003-A/B, VALIDATE-MOD-003.
- **DoR:** appeal/checklist/notification policy approved. **DoD:** segregation, identity and state-transition tests pass; founder workflow review.

### EPIC-USER-001 — Personal workspace

#### STORY-NOTIF-001 — In-app and essential email notifications

- **Persona / need / value:** User needs timely status/security messages without exposing medical content through email.
- **Sources:** FR-NOT-001–003. **In:** durable in-app events, read/history, preferences, limited essential email, 90-day notification retention. **Out:** push/SMS/digests/following.
- **Dependencies / assumptions:** AUTH-001, jobs. **Security/privacy:** payload IDs/minimal copy; idempotent delivery. **Accessibility:** announcements and preferences labelled.
- **Acceptance:** **Given** a notification-producing event, **when** delivery retries, **then** one user-visible item remains, email obeys allowed categories/preferences, and no sensitive narrative/document data enters the job or mail payload.
- **Tests/data/states:** domain, integration, E2E, security; retries/preferences/read/unread/expired. **Agents/complexity:** M1; L. **Tasks:** TASK-NOTIF-001-A/B, VALIDATE-NOTIF-001.
- **DoR:** event/mail allowlist approved. **DoD:** retry/idempotency/payload/retention tests pass.

#### STORY-USER-001 — Public profile and activity privacy

- **Persona / need / value:** User needs a useful public presence while private/anonymous activity stays unlinked.
- **Sources:** FR-USER-001/002. **In:** username/display name, public contributions/reactions as allowed, noindex. **Out:** anonymous review linkage and private bookmarks/drafts.
- **Dependencies / assumptions:** IDENT-001, COM-002. **Security/privacy:** projection allowlist. **Accessibility:** readable activity grouping and empty state.
- **Acceptance:** **Given** mixed public/private/anonymous activity, **when** the public profile is requested, **then** only allowlisted identity-consistent items appear and the page is marked noindex.
- **Tests/data/states:** integration, component, E2E, security; mixed-identity fixtures. **Agents/complexity:** M1; M. **Tasks:** TASK-USER-001-A/B, VALIDATE-USER-001.
- **DoR:** projection matrix approved. **DoD:** linkage/indexing tests pass in both locales.

#### STORY-USER-002 — Dashboard, preferences, feedback and data requests

- **Persona / need / value:** User needs one private place to manage drafts, bookmarks, submissions, settings, feedback, export and deletion.
- **Sources:** FR-USER-003–005, FR-FDB-001. **In:** private dashboard, language/privacy preferences, feedback warning, export/deletion orchestration. **Out:** automated legal determination.
- **Dependencies / assumptions:** AUTH-002, REV-003. **Security/privacy:** ownership checks; delete never blind-cascades through holds/public context. **Accessibility:** data requests explain status and consequences.
- **Acceptance:** **Given** an authenticated user, **when** they export or request deletion, **then** only their authorized data is included, a traceable plan/status is created, and retained public context is pseudonymized/tombstoned according to policy.
- **Tests/data/states:** domain, integration, E2E, security; held/unheld and private/public fixtures. **Agents/complexity:** M3; XL. **Tasks:** TASK-USER-002-A/B, VALIDATE-USER-002.
- **DoR:** export/deletion/hold matrix and counsel checkpoints approved. **DoD:** authorization/format/clock/hold tests pass; human privacy approval.

### EPIC-ADMIN-001 — Bounded operations

#### STORY-ADMIN-001 — Versioned runtime configuration and capabilities

- **Persona / need / value:** Super Admin needs flexible wording/taxonomy/limits/retention/roles without deployment or silent safety bypass.
- **Sources:** FR-ADM-001–003; FD-016/018/020–022. **In:** typed bounded settings, preview, history/export/import/rollback, password recheck, capability matrix. **Out:** structural schema/security/audit disablement.
- **Dependencies / assumptions:** FOUND-001 and domain setting contracts. **Security/privacy:** append-only-until-expiry audit; reveal/retention actions purpose-bound. **Accessibility:** complex forms expose validation summaries.
- **Acceptance:** **Given** a proposed setting change, **when** validated and confirmed, **then** a new version applies only within its declared scope, old/new/actor/result are logged, and prohibited invariant changes are rejected.
- **Tests/data/states:** domain, integration, E2E, security; valid/invalid/rollback/future-only/bulk-preview. **Agents/complexity:** M3; XL. **Tasks:** TASK-ADMIN-001-A/B, VALIDATE-ADMIN-001.
- **DoR:** settings/capability registry and invariant list approved. **DoD:** privilege/schema/rollback/concurrency tests pass; human security/privacy approval.

#### STORY-ADMIN-002 — Operational dashboards and logged bulk actions

- **Persona / need / value:** Authorized staff need actionable moderation, evidence, directory, user and health views without direct database surgery.
- **Sources:** FR-ADM-004, FR-EVD-007. **In:** bounded dashboards, filters, queue health, previewed/idempotent bulk commands, export evidence. **Out:** arbitrary SQL/admin shell.
- **Dependencies / assumptions:** domain epics. **Security/privacy:** least privilege and sensitive field redaction. **Accessibility:** dense tables reflow/have captions and keyboard actions.
- **Acceptance:** **Given** an authorized bulk operation, **when** preview is confirmed, **then** the same affected set or an explicit drift warning is used, each result is recorded, retries are idempotent, and unauthorized fields never render.
- **Tests/data/states:** integration, E2E, security, a11y; large synthetic queues and partial failures. **Agents/complexity:** M3; XL. **Tasks:** TASK-ADMIN-002-A/B, VALIDATE-ADMIN-002.
- **DoR:** dashboard permissions and bulk semantics approved. **DoD:** leakage/drift/idempotency/performance tests pass; staff walkthrough.

### EPIC-OPS-001 — Recoverable public service

#### STORY-PLAT-001 — Equal-language onboarding and accessible policy boundaries

- **Persona / need / value:** New visitor needs to understand what RogiKotha is and is not in their chosen interface language.
- **Sources:** FR-ONB-001, NFR-006/007, FD-024. **In:** browser detection, persistent switch, externalized strings, disclaimers/warnings/emergency resources, policy links. **Out:** automated user-content translation.
- **Dependencies / assumptions:** FOUND-001. **Security/privacy:** lawful-disclosure statement only in Terms/Privacy; no banner/review warning. **Accessibility:** correct `lang`, parity, focus and readable Bangla typography.
- **Acceptance:** **Given** either locale, **when** the critical onboarding and policy-boundary flows are compared, **then** meaning, capabilities and prominence are equivalent and switching does not lose task state.
- **Tests/data/states:** dictionary, component, E2E, a11y, human bilingual review; long strings/mixed script. **Agents/complexity:** M2; L. **Tasks:** TASK-PLAT-001-A/B, VALIDATE-PLAT-001.
- **DoR:** bilingual glossary and reviewed safety copy available. **DoD:** parity/overflow/lang tests and human bilingual approval pass.

#### STORY-PLAT-002 — Safe progressive web app

- **Persona / need / value:** Mobile visitor needs installable progressive enhancement without private health-adjacent content cached offline.
- **Sources:** FR-PWA-001/002. **In:** manifest, icons, safe public shell caching, update/fallback behavior. **Out:** offline drafts/private pages/evidence.
- **Dependencies / assumptions:** PLAT-001. **Security/privacy:** explicit cache allowlist and logout purge. **Accessibility:** install is optional and never blocks use.
- **Acceptance:** **Given** a supported browser, **when** installed or offline, **then** only allowlisted public shell assets are available and private/dashboard/review-draft/evidence responses are absent from all caches.
- **Tests/data/states:** E2E, security, cache inventory; signed-in/out/update/offline. **Agents/complexity:** M1; M. **Tasks:** TASK-PLAT-002-A/B, VALIDATE-PLAT-002.
- **DoR:** cache data classification approved. **DoD:** cache inventory and update/offline tests pass across target browsers.

#### STORY-OPS-001 — Deployment, observability, backup and recovery

- **Persona / need / value:** Founder/operator needs a supportable public service under the USD 100 target with evidence of recovery.
- **Sources:** NFR-001–003/009–011; FD-001/007/011. **In:** immutable Compose topology, least privilege, health/capacity alerts, scrubbed logs, deploy/rollback, database/blob backup, restore drill, release gates. **Out:** claimed HA/24×7 guarantee.
- **Dependencies / assumptions:** production stories; one VPS allowed only after load/restore evidence. **Security/privacy:** mounted secrets, no daemon exposure/content logs. **Accessibility:** operational status copy remains understandable.
- **Acceptance:** **Given** target workload and a clean recovery environment, **when** load, failure, deploy, rollback and full restore drills run, **then** budgets/RPO/RTO or explicit failure thresholds are evidenced and legal/clinical/security/accessibility approvals gate unrestricted launch.
- **Tests/data/states:** performance, failure, restore, security, specialist; synthetic production-scale data. **Agents/complexity:** M3; XL. **Tasks:** TASK-OPS-001-A/B, VALIDATE-OPS-001.
- **DoR:** budget, RPO/RTO, alert owners and release checklist approved. **DoD:** reproducible drills pass, runbooks reviewed, human operations and specialist sign-offs recorded.

#### STORY-OPS-002 — Optional privacy-minimised analytics

- **Persona / need / value:** Founder may need aggregate product insight without collecting medical text or identifiers.
- **Sources:** FR-AN-001–003; FD-019. **In:** disabled demo, production feature gate, strict event allowlist, native accessible consent/preferences, aggregate admin views. **Out:** raw queries, health text, replay, user IDs, evidence metadata.
- **Dependencies / assumptions:** OPS-001; analytics can remain absent. **Security/privacy:** outbound payload tests, withdrawal, short retention; counsel decides lawful basis. **Accessibility:** Accept/Reject/Customize equal prominence.
- **Acceptance:** **Given** analytics disabled or consent absent, **when** journeys run, **then** no analytics request/cookie occurs; **when** enabled lawfully, only allowlisted aggregate fields leave the app and withdrawal stops future tracking.
- **Tests/data/states:** integration, E2E, security/privacy, specialist; consent/version/withdrawal fixtures. **Agents/complexity:** M3; L. **Tasks:** TASK-OPS-002-A/B, VALIDATE-OPS-002.
- **DoR:** operational value case and counsel decision approved. **DoD:** network/payload/consent tests pass; human privacy approval; otherwise story closes as intentionally not enabled.

## Sequencing and safe parallelism

1. FOUND-001 precedes all implementation. PROT-001 can then run beside PLAT-001 and early domain contract spikes.
2. In the prototype release, concept A/B/C implementation may run in parallel only after shared services, fixtures, behavior contract and wireframes freeze; each concept owns a separate route/style directory.
3. AUTH-001 precedes contribution stories. DIR-001 and directory taxonomy contracts may proceed beside AUTH-002. REV-001 precedes evidence, comments and review-derived summaries.
4. EVID-001–003 are sequential because each tightens the same custody boundary. IDENT-001 precedes any public activity/reaction implementation.
5. MOD-001–003 are sequential. ADMIN stories begin only after the affected commands/capabilities exist; they must call application services, never duplicate domain logic.
6. Search corpus construction can run beside directory/review work; search integration waits for stable public projections. Operations foundations can run beside features, but release drills wait for a production-like composition.

## Gate 2 completion rule

Gate 2 passes only when the trace matrix and YAML mechanically agree on all 112 PRD IDs, every story has implementation and independent validation work, high-risk work has cross-vendor plus human gates, and no task assumes production backend work is authorized before the founder selects a Gate 4 concept.
