# RogiKotha technical and policy research report

**Research cut-off:** 2026-08-29  
**Decision status:** Gate 1 evidence; recommendations are provisional until the founder decision frontier is resolved.  
**Detailed evidence:** [frontend and UX digest](research/digests/frontend-ux-r1.md), [security and evidence digest](research/digests/security-evidence-r1.md), and [operations, policy, and model digest](research/digests/ops-policy-models-r1.md).

## Executive conclusion

RogiKotha can be built as a self-hosted, open-source-first TypeScript modular monolith with a separately isolated document worker. The difficult parts are not the review feed or profile pages. They are the trust boundary around uploaded health-adjacent evidence, anonymity and account linkage, moderation under Bangladesh publication law, Bangla/Banglish relevance, and safe operation on one small server.

The provisional technical leader is a patched Next.js 16.3 application on PostgreSQL 18 with a durable job queue, an isolated document-processing worker, and an object-storage abstraction. Better Auth is the stronger new-project candidate than Auth.js, but it must pass an application-specific security and recovery spike. Garage remains a possible FOSS S3 implementation, but a one-node Garage instance is not redundant and must not be represented as a backup. MinIO Community Edition is rejected because its official repository was archived in April 2026.

No public launch should occur before Bangladesh counsel has reviewed the current 2026 Acts and defamation workflow, a Bangladesh healthcare professional has reviewed the safety taxonomy and clinical-content policy, and the team has demonstrated access control, document sanitisation, off-host restore, moderation escalation, and Bangla/Banglish search quality.

## Research method and confidence

The research used current official documentation, official repositories, standards bodies, and Bangladesh government or professional-regulator sources. Search-result summaries, vendor marketing, and community claims were not treated as sufficient evidence for a selection. Version numbers are a dated snapshot, not implementation pins; exact patched releases and advisories must be rechecked when the lockfile is created and before release.

Confidence labels mean:

- **High:** directly supported by a current primary source.
- **Medium:** a reasonable engineering inference from primary evidence that still needs a RogiKotha spike or measurement.
- **Low:** unresolved without local testing, legal interpretation, clinical review, or an authoritative source that was not available.

The Bangladesh legislative index establishes that relevant 2026 Acts exist, but does not by itself establish their consolidated operative wording, commencement, implementing rules, or application to RogiKotha. All legal conclusions remain reserved for Bangladesh counsel.

## Technical selection scorecard

Scores use 1 (poor) to 5 (strong). Weights reflect the Phase 1 constraints: safety and maintainability matter more than feature breadth. This scorecard evaluates the leading candidate in each technical area; the three application shapes are compared directly in [04-architecture-options.md](04-architecture-options.md). The weighted provisional baseline is **4.18/5**, before founder decisions and validation spikes.

| Area | Weight | Preferred candidate | Score | Main reason | Required validation |
|---|---:|---|---:|---|---|
| Application shape | 18 | Next.js modular monolith + isolated worker | 4.4 | Small-team delivery, shared types, server rendering, reversible seams | Prove worker and web cannot share unsafe filesystem/process privileges |
| Database | 12 | PostgreSQL 18 | 4.8 | Transactions, FTS, `pg_trgm`, mature operations, permissive licence | Bangla/Banglish relevance corpus and index-size/load test |
| Authentication | 12 | Better Auth candidate | 3.9 | Active new-project path, database sessions, 2FA/passkey plugins, MIT | Threat model, recovery, session invalidation, privilege step-up, current advisories |
| Evidence storage | 10 | Storage port + S3-compatible production implementation | 3.8 | Avoids coupling public records to local paths or one vendor | Garage conformance/failure spike; independently protected off-host backup |
| Evidence processing | 15 | ClamAV + disposable LibreOffice + image/PDF sanitisation | 3.7 | Fully self-hostable, layered handling | Malicious corpus, sandbox escape controls, redaction proof, resource limits |
| Frontend UI | 8 | React 19.2 + Tailwind 4 + selective shadcn/Radix | 4.4 | Current, owned source, accessible primitives, no hosted dependency | Bundle budget, keyboard/screen-reader test, local component review |
| Internationalisation | 7 | Locale routes + checked-in dictionaries + native `Intl` | 4.7 | Two locales do not need translation SaaS | Bangla typography, truncation, bidi/mixed-script, translation review |
| Analytics/consent | 5 | Matomo self-hosted + minimal native consent UI | 3.5 | Data control and no mandatory SaaS | Legal basis, cookies/off mode, schema minimisation, operational cost |
| Testing | 8 | Vitest + Testing Library + Playwright + axe-core | 4.5 | Local, cross-browser, behaviour and accessibility coverage | Manual accessibility and real Safari/assistive-technology passes |
| Deployment | 5 | Linux containers with least privilege | 3.8 | Reproducible and self-hostable | Restore drill, rootless feasibility, monitoring, patch and rollback drill |

## Recommended technology baseline

### Web application

Use the current patched Next.js 16.3 line with the React 19.2 patch supported by that release and stable TypeScript 6.0 in strict mode. Pin exact versions only after checking the implementation-day advisories. Next.js is MIT licensed and self-hostable; deployment must avoid assuming that provider-specific Vercel behavior exists on a conventional Node host.

Use the App Router with `/bn/...` and `/en/...` route prefixes, server-loaded checked-in dictionaries, BCP 47 language tags, and native `Intl` formatting. Preserve user-entered text exactly for display while maintaining separate search-normalisation fields. Default to Server Components and add client JavaScript only at interaction boundaries.

Use Tailwind CSS with a small semantic token layer. Adopt shadcn/ui components selectively over pinned Radix primitives for complex widgets; prefer native HTML where it meets the behavior. Use Lucide through named imports. Motion is optional and should be used only where CSS cannot express a valuable interaction; reduced-motion behavior is global and mandatory. Storybook is deferred until the number of reusable states justifies its parallel configuration surface.

### Authentication and privileged access

Do not begin a new integration on the assumption that Auth.js is the preferred current path. Its official repository says Auth.js is now part of Better Auth and recommends Better Auth for new projects except specific gaps. Auth.js remains ISC licensed and receives critical/security fixes, but its v5 Next.js line is still beta and July 2026 advisories affected OAuth checks, email normalisation, and error behavior; only patched releases are supportable.

Evaluate Better Auth as the leading MIT-licensed candidate. It supports database-backed sessions and plugins for passkeys and two-factor authentication. A package feature is not a complete security design. The spike must prove:

- email verification, password reset, account linking, and anti-enumeration behavior;
- password policy aligned with NIST SP 800-63B-4, breached-password screening, and rate limits;
- database session revocation, rotation after privilege changes, inactivity/absolute limits, and device visibility;
- mandatory phishing-resistant or TOTP second factor for privileged roles, recovery codes, lockout recovery, and audited break-glass access;
- CSRF, origin/host validation, cookie attributes, open-redirect protection, and safe proxy configuration;
- current security-advisory response and an upgrade test independent of generated schemas.

Passkeys are desirable for privileged users, but recovery cannot fall back to a weaker unaudited channel. Public-user authentication must remain usable on low-end devices and intermittent connections; passkeys should initially be optional for them.

### Data and Bangla/Banglish search

Use PostgreSQL 18, subject to selecting the current patched minor at implementation. Keep public content, private evidence metadata, identity data, moderation state, and immutable audit events as explicit domains with deny-by-default access. Do not encode workflow meaning only in UI state or ad-hoc JSON.

Start search with PostgreSQL full-text search and `pg_trgm`, not a separate search service. Use a product-owned search document containing original display values, Unicode-normalised keys, structured aliases, and moderation/publication status. Exact native-script matches must outrank aliases and fuzzy matches. The current PostgreSQL distribution has no established official Bengali stemmer that can be assumed to solve Banglish.

Before selection is final, build a locally reviewed corpus of misspellings, Bengali variants, transliterated doctor/facility names, specialties, locations, mixed scripts, and abusive/adversarial inputs. Record expected result sets and rank bands. A separate search engine becomes justified only if measured relevance, latency, or operational isolation fails the acceptance threshold.

### Evidence upload, conversion, and redaction

Treat every upload as hostile. The safe lifecycle is:

1. Stream to a non-public quarantine area under a server-generated identifier.
2. Enforce per-file, per-review, archive/decompression, pixel, page, time, CPU, and memory limits.
3. Validate extension, declared MIME, magic bytes, and parseability; reject mismatches and unsupported active content.
4. Scan with a current ClamAV database; do not describe a clean result as proof of safety.
5. Convert Office files in a disposable, network-denied, non-root LibreOffice sandbox with a read-only base filesystem, bounded writable scratch space, and no shared application credentials.
6. Re-encode accepted images and sanitise/rasterise PDFs according to the approved fidelity policy.
7. Make redaction destructive in the released derivative: overlays alone are not redaction. Remove metadata and embedded objects, flatten the result, and verify the underlying text/object is absent.
8. Publish only an immutable processed derivative. Keep originals private under an explicit retention and legal-hold policy.
9. Persist content hashes, scanner/signature versions, converter versions, decisions, failure reasons, and custody events in the audit trail.

LibreOffice is a converter, not a content-disarm guarantee. PDF.js is a viewer, not a redaction engine. ClamAV is one layer, not an allow decision. The application must remain safe if any of these tools misses a malicious file or crashes.

The proposed broad upload allowlist is too large for a Phase 1 launch without a format-by-format malicious-corpus test. The recommended starting allowlist is JPEG, PNG, and PDF; add HEIC and Office formats only after conversion, fidelity, sandbox, resource-abuse, and redaction tests pass. This is a founder decision because it trades contributor convenience against a major attack and operational surface.

### Object storage and backups

Place all blob access behind a small storage port with operations such as quarantine write, private read, immutable derivative publish, retention transition, and audited delete. Local filesystem storage is acceptable for development only. Production object data must be isolated from the public web root and from document-worker credentials.

Garage 2.3 is an active AGPL-3.0 FOSS S3-compatible candidate designed for modest hardware. Its own quick-start warns that a single-node deployment has no redundancy, and some S3 features such as ACL/policy surfaces are not implemented. A validation deployment must test the exact SDK operations, multipart behavior, encryption approach, object immutability expectations, failure recovery, and upgrade path. AGPL obligations require counsel/maintainer review if Garage is modified or offered over a network.

Do not select MinIO Community Edition for new work: the official repository was archived on 2026-04-25 and states that legacy binaries no longer receive updates. A managed S3-compatible service is a valid fallback if the operational and legal review shows it provides a safer result within budget, but the application must remain provider-portable.

Object replication is not backup. PostgreSQL, analytics data, configuration, and blobs need automated encrypted off-host backups on a separate failure and credential domain, documented RPO/RTO, retention, monitoring, and periodic full restore drills. Docker volumes likewise are persistence, not backup.

### Analytics and consent

Matomo core is GPL-3.0-or-later and can be self-hosted, but it introduces PHP plus MySQL/MariaDB and meaningful patch/backup/monitoring work. Configure first-party, privacy-minimised analytics with IP anonymisation, short retention, no User ID, no raw search text, no review/evidence/medical content, and no session replay. Analytics failure must never affect the application.

Klaro is BSD-3-Clause and self-hostable, but the reviewed repository had weak release provenance and no listed Bengali translation. For a small Phase 1 purpose set, a native accessible preference dialog may be lower risk than adding a consent framework; if Klaro is used, vendor the reviewed version, translate and test it, and do not load analytics before the approved state. Bangladesh counsel must decide whether consent is required and whether any exemption applies to the exact deployment.

### Testing and accessibility

Use stable Vitest and Testing Library for unit/component behavior, MSW only in test/development for network-boundary mocks, and Playwright for critical journeys across its Chromium, Firefox, and WebKit builds. Use axe-core in rendered states, while recognizing its official limitation: automation finds only a subset of WCAG failures.

WCAG 2.2 AA is a release requirement across responsive variations and both languages. Manual gates include keyboard-only completion, visible focus, 200% zoom and reflow, screen-reader use, target sizes, error identification, accessible authentication, document-viewer controls, language switching, reduced motion, and low-bandwidth recovery. Playwright WebKit is not a substitute for a real supported Safari/device pass.

Noto Sans Bengali is an OFL-1.1 candidate for Bengali typography. Self-host only the required subsets/weights, preserve its licence, and test conjuncts, combining marks, digits, mixed Latin/Bengali runs, line height, truncation, and low-end rendering. Use system font fallbacks rather than blocking first paint on a decorative font.

### Illustration and icon sourcing

Prefer product-owned diagrams, simple CSS decoration, and Lucide icons over a large illustration runtime. unDraw assets can be used and modified in commercial projects without payment or attribution under its published custom licence, but redistribution as packs, service replication, automated scraping/integration, and AI/ML use are restricted. If an unDraw asset is selected later, download the specific asset manually, record its source/licence snapshot, optimise it locally, remove irrelevant metadata, and verify it does not imply clinical endorsement. Avoid third-party medical stock imagery and brand marks unless rights and representational risks are explicitly cleared.

## Security and abuse findings

### Core trust boundaries

The architecture must enforce, rather than merely document, these boundaries:

- anonymous visitors never reach private evidence, identities, moderation notes, or unpublished versions;
- pseudonymous/anonymous publication choices do not erase the platform's private identity linkage or legal-disclosure risk;
- reviewers cannot control canonical doctor/facility identity or verification claims;
- ordinary providers have no privileged channel to reveal patient information; public replies are ordinary moderated content;
- document workers have no network access, database credentials, public-bucket credentials, or reusable host filesystem access;
- moderators see only the private information needed for an assigned action; access itself is audited;
- runtime configuration cannot disable non-negotiable authentication, evidence, audit, retention, or medical-safety invariants;
- public search, feeds, analytics, caches, logs, and error reports exclude unpublished or sensitive content.

### Abuse cases that need acceptance tests

- account farming, email bombing, credential stuffing, password reset abuse, session theft, and recovery-channel takeover;
- coordinated reactions/reports, threshold gaming, brigading, mass profile creation, duplicate reviews, and malicious mentions;
- provider impersonation, fabricated credentials, misleading registration claims, and facility-name squatting;
- allegation laundering, defamation, doxxing, coercion, retaliation, confidential medical disclosure, and false emergency advice;
- decompression bombs, polyglots, parser exploits, malicious macros/embedded objects, pixel/page bombs, and redaction bypass;
- Unicode confusables, invisible characters, mixed-script impersonation, search poisoning, and Banglish evasion;
- cost exhaustion through search, exports, notifications, upload conversion, analytics, and moderation queues;
- audit-log tampering, privilege escalation, unsafe configuration changes, backup deletion, and evidence exfiltration.

Rate limits must be layered by account, verified contact, network/device signals, target entity, and business action. IP-only blocking is insufficient and can harm users behind shared mobile networks. Any automatic visibility threshold must be reversible, reason-coded, monitored for coordination, and followed by bounded human review.

## Bangladesh legal and healthcare review boundary

The official 2026 legislative list records the Personal Data Protection Act 2026, National Data Governance Act 2026, Cyber Protection Act 2026, and a July 2026 Cyber Protection amendment. The exact effects on lawful basis, sensitive/health data, localisation, transfers, retention, breach reporting, processor contracts, user rights, intermediary duties, takedown, disclosure, and regulator interaction require a written current-law opinion.

The BM&DC ethics material makes confidentiality and factual, balanced professional information central. Provider replies must never confirm treatment, attendance, diagnosis, records, family details, or another confidential fact. BM&DC's public registration search uses CAPTCHA and exposes no reviewed bulk API, so Phase 1 must not scrape or imply live endorsement. The PRD's explicit `Registration not verified` status is the safe baseline unless an authorised manual/API workflow is approved.

Bangladesh's Penal Code creates direct defamation exposure for public allegations. Counsel must approve the allegation policy, evidence threshold, provider notice/right of reply, urgent takedown and preservation processes, appeal, identity-disclosure language, and moderator escalation. The product must never promise anonymity from lawful process.

Required external sign-offs before public launch:

- Bangladesh counsel: current law, privacy notice/terms, lawful basis/consent, retention, cross-border processing, defamation, evidence disclosure, takedown, and incident duties.
- Bangladesh healthcare professional: taxonomy, dangerous advice, emergencies, misinformation, adverse-event escalation, provider replies, confidentiality, and user-facing limitations.
- Security reviewer: auth/recovery, authorisation matrix, upload isolation, dependency and container posture, logging, backups, and incident exercises.
- Accessibility reviewer or equivalent documented manual assessment: both locales and critical journeys on representative devices/assistive technology.

## Model and agent-work allocation

Model identifiers and prices change rapidly. Recheck official model pages, provider availability, data terms, and the actual runtime allowlist before implementation. Model output is never an approval authority for clinical, legal, moderation, production-data, destructive, or deployment decisions.

### Available Codex model families

| Work class | Recommended model | Reason | Escalate when |
|---|---|---|---|
| Architecture invariants, security-sensitive changes, difficult review | GPT-5.6-Sol | Strongest available reasoning/coding option; official direct API snapshot $4 input/$20 output per million tokens | Always require human approval for high-impact decisions |
| Normal feature implementation, tests, refactors, documentation | GPT-5.6-Terra | Balanced capability and cost; snapshot $2/$12 | Escalate novel security/domain changes to Sol |
| Mechanical edits, inventory, formatting, bounded checks | GPT-5.6-Luna | Low-cost high-volume path; snapshot $0.20/$1.20 | Escalate ambiguity, failures, or cross-module impact |

The official pages list a 1.05M context window and 128K maximum output for these three families, with a 2026-02-16 knowledge cut-off. Context size does not replace source verification. Pin the concrete model/version where reproducibility matters and record task, inputs, tests, and human approval—not promotional claims.

### Available Claude model families

| Work class | Recommended model | Direct API price snapshot | Operational note |
|---|---|---:|---|
| Long autonomous but bounded implementation/review | Claude Fable 5 | $10/$50 per million input/output tokens | Highest cost; safety fallback, account/provider, and data-retention constraints may apply |
| Deep architecture or adversarial analysis | Claude Opus 5 | $5/$25 | Use selectively where a second independent reasoning path is valuable |
| General implementation and review | Claude Sonnet 5 | $2/$10 | Practical default if the configured provider exposes the current model |
| Mechanical bounded work | Claude Haiku 4.5 | $1/$5 | Smaller 200K context and 64K output in the official table |

Claude Code aliases are provider-dependent and mutable. For repeatable automated work, pin full model IDs and client versions, log the actual provider/model/fallback, cap spend/tool permissions, and prohibit silent fallback on acceptance-critical work. No reviewed official source describes self-hosted Claude model weights, so this remains a hosted dependency.

### Worktree safety protocol

- One worktree and one narrowly scoped task per concurrent worker.
- Never let two workers edit the same file set; declare ownership before starting.
- Begin from a recorded commit, inspect dirty state, and preserve user changes.
- Give every task explicit allowed paths, forbidden actions, acceptance checks, and source links.
- Require small reviewable commits attributed only to the configured human identity; never inject tool/model attribution.
- Integrate in dependency order, rebase/merge deliberately, rerun affected checks, and stop on ambiguous conflicts.
- Keep legal, clinical, moderation-policy, secrets, production data, deployment, and destructive actions behind human approval.

## Selection status and rejected/deferred choices

| Candidate | Status | Reason |
|---|---|---|
| Next.js modular monolith + isolated worker | Provisional leader | Best small-team/reversibility fit; still needs boundary spike |
| Separate Fastify API | Migration option | Useful when independent scaling/clients justify the extra contract and deployment surface |
| Django/Python backend | Deferred | Strong document/ML ecosystem, but a second language is not yet justified |
| Better Auth | Provisional leader | Active new-project recommendation and needed features; security/recovery spike required |
| Auth.js | Not preferred for new integration | Maintenance transition, v5 beta, and official new-project recommendation points elsewhere |
| PostgreSQL FTS + `pg_trgm` | Provisional leader | Lowest operational burden; relevance must be measured locally |
| Dedicated search engine | Deferred | Adds operational cost before a measured need |
| Garage | Conditional candidate | Active FOSS S3 API; one node has no redundancy and compatibility gaps must be tested |
| MinIO Community Edition | Rejected | Official repository archived; legacy binaries no longer updated |
| Broad Office upload allowlist | Deferred by recommendation | Unsafe until each format passes conversion/sandbox/redaction tests |
| Matomo | Conditional candidate | Strong privacy control but adds a second database/runtime stack |
| Klaro | Conditional/defer | Localisable and permissive, but weak release provenance; native UI may be simpler |
| Mandatory Storybook | Deferred | Add only when component-state surface earns its maintenance cost |
| Heavy animation library by default | Rejected | Performance and accessibility cost without a defined user benefit |

## Validation spikes before architecture lock

1. **Authentication:** implement a throwaway local flow for registration, verification, session revocation, privileged 2FA/passkey, account recovery, and audit events; threat-model every downgrade path.
2. **Evidence:** process a malicious/edge corpus through quarantine, AV, conversion, re-encoding, redaction, and derivative verification under strict CPU/memory/time/network controls.
3. **Storage:** run the exact S3 operation set against Garage, simulate disk/process/host failure, restore from independent backup, and confirm SDK/version compatibility.
4. **Search:** score a locally reviewed Bangla/English/Banglish relevance corpus and measure index/latency behavior at projected scale.
5. **Accessibility:** prototype review creation and evidence privacy editing in both locales; test keyboard, screen reader, zoom/reflow, low bandwidth, and reduced motion.
6. **Operations:** install, patch, back up, restore, and roll back the full container set on the target VPS class; measure idle/peak memory and disk pressure.
7. **Policy:** table-top defamation, doxxing, dangerous advice, provider confidentiality, identity disclosure, takedown, appeal, and breach scenarios with counsel/clinical reviewers.

## Primary-source register

Every item below was accessed on 2026-08-29. Dates shown in the detailed digests are the publication/release dates available from each source.

The register is intentionally complete enough to audit each material selection. The detailed digests carry claim class, confidence, maintenance, licence, and decision implications.

### Application, language, UI, and testing

1. Next.js releases and security updates — https://nextjs.org/blog
2. Next.js official repository and MIT licence — https://github.com/vercel/next.js
3. Next.js internationalisation guide — https://nextjs.org/docs/app/guides/internationalization
4. React current versions — https://react.dev/versions
5. TypeScript official repository and Apache-2.0 licence — https://github.com/microsoft/TypeScript
6. Web.dev service-worker guidance — https://web.dev/learn/pwa/service-workers
7. Unicode CLDR transforms and normalisation — https://unicode.org/reports/tr35/tr35-general.html
8. WCAG 2.2 — https://www.w3.org/TR/WCAG22/
9. shadcn/ui — https://github.com/shadcn-ui/ui
10. Radix Primitives — https://github.com/radix-ui/primitives
11. Tailwind CSS — https://github.com/tailwindlabs/tailwindcss
12. Motion — https://www.npmjs.com/package/motion
13. Lucide — https://github.com/lucide-icons/lucide
14. Storybook — https://www.npmjs.com/package/storybook
15. Playwright — https://www.npmjs.com/package/@playwright/test
16. axe-core — https://github.com/dequelabs/axe-core
17. Vitest — https://www.npmjs.com/package/vitest
18. Testing Library query guidance — https://testing-library.com/docs/queries/about/
19. MSW — https://www.npmjs.com/package/msw
20. Noto Bengali — https://github.com/notofonts/bengali
21. unDraw licence — https://undraw.co/license

### Authentication, uploads, documents, and storage

22. NIST SP 800-63B-4 — https://pages.nist.gov/800-63-4/sp800-63b.html
23. Auth.js official repository, transition notice, ISC licence — https://github.com/nextauthjs/next-auth
24. Auth.js security advisories/support policy — https://github.com/nextauthjs/next-auth/security
25. Better Auth official repository and MIT licence — https://github.com/better-auth/better-auth
26. Better Auth passkey documentation — https://better-auth.com/docs/plugins/passkey
27. OWASP File Upload Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html
28. ClamAV documentation — https://docs.clamav.net/
29. ClamAV official repository and GPL-2.0 licence — https://github.com/Cisco-Talos/clamav
30. LibreOffice security advisories — https://www.libreoffice.org/about-us/security/advisories/
31. LibreOffice official repository/licensing — https://github.com/LibreOffice/core
32. PDF.js official repository and Apache-2.0 licence — https://github.com/mozilla/pdf.js
33. Garage documentation — https://garagehq.deuxfleurs.fr/
34. Garage single-node quick start and compatibility notes — https://garagehq.deuxfleurs.fr/documentation/quick-start/
35. Garage official mirror and AGPL-3.0 licence — https://github.com/deuxfleurs-org/garage
36. MinIO Community Edition official archived repository — https://github.com/minio/minio

### Data, operations, analytics, abuse, policy, and models

37. PostgreSQL full-text search — https://www.postgresql.org/docs/current/textsearch.html
38. PostgreSQL `pg_trgm` — https://www.postgresql.org/docs/18/pgtrgm.html
39. PostgreSQL licence — https://www.postgresql.org/about/licence/
40. Matomo official repository and GPL licence — https://github.com/matomo-org/matomo
41. Matomo privacy settings — https://matomo.org/faq/general/configure-privacy-settings-in-matomo/
42. Matomo consent guide — https://developer.matomo.org/guides/tracking-consent
43. Klaro official repository and BSD-3-Clause licence — https://github.com/kiprotect/klaro
44. OWASP API6 sensitive business flows — https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/
45. OWASP resource quota abuse — https://owasp.org/www-project-top-10-for-business-logic-abuse/docs/the-top-10/resource-quota-violation.html
46. Docker volume documentation — https://docs.docker.com/engine/storage/volumes/
47. Docker rootless mode — https://docs.docker.com/engine/security/rootless/
48. Moby official repository and Apache-2.0 licence — https://github.com/moby/moby
49. Bangladesh Legislative Division 2026 Acts list — https://legislativediv.gov.bd/pages/static-pages/69df4f84e252a315b7e6b8db
50. BM&DC Code of Medical Ethics — https://www.bmdc.org.bd/docs/EthicsBookMakeupfinal.pdf
51. BM&DC registration verification — https://verify.bmdc.org.bd/
52. Bangladesh Penal Code, Chapter XXI — https://bdlaws.minlaw.gov.bd/act-11/act-chapter-print-24.html
53. OpenAI current model index — https://developers.openai.com/api/docs/models
54. OpenAI model-selection guidance — https://developers.openai.com/api/docs/guides/latest-model
55. GPT-5.6-Sol official model page — https://developers.openai.com/api/docs/models/gpt-5.6-sol
56. Anthropic current models — https://platform.claude.com/docs/en/models/overview
57. Claude Code model configuration — https://code.claude.com/docs/en/model-config

## Remaining unknowns

- Consolidated operative text and implementation of Bangladesh's 2026 privacy, governance, and cyber laws.
- Facility/clinic authoritative register and lawful API/reuse path.
- Safe encounter-verification design that does not retain excessive health or identity data.
- Acceptable Bangla/Banglish relevance, abuse detection, and clinical-misinformation performance.
- Exact public/private identity linkage and disclosure policy for anonymous reviews.
- Supported upload formats, original retention, processed-download policy, and legal holds.
- Privileged MFA/session/recovery requirements and operator break-glass process.
- Target RPO/RTO, staging topology, on-call capacity, and whether the stated monthly budget can support safe production operations.
- Exact Matomo lawful basis/consent mode and whether its operational footprint is justified in Phase 1.

These are captured as founder decisions in [02-conflicts-assumptions-questions.md](02-conflicts-assumptions-questions.md) and must be resolved before the final architecture, ADR set, implementation backlog, frontend brief, and agent-execution plan are approved.
