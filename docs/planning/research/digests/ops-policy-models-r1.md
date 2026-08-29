# Operations, policy, search, analytics, moderation, and model digest (R1)

**Research cut-off / accessed:** 2026-08-29  
**Evidence rule:** Primary and official sources only. This digest is planning input, not legal or clinical advice.  
**Classes:** `FACT` (direct source statement), `INFERENCE` (reasoned conclusion from facts), `RECOMMENDATION` (proposed action), `LEGAL-REVIEW`, `HEALTHCARE-REVIEW`.

## Executive decision summary

1. **Analytics:** Self-host Matomo only if the team accepts operating a separate PHP + MySQL/MariaDB service. Start in a deliberately minimal mode: no user IDs, no custom dimensions containing review/provider/patient text, strong IP masking or removal, short raw-log retention, Do Not Track support, and analytics disabled until a lawful-basis/consent decision is documented. Matomo is GPL-3.0-or-later and has no core licence fee, but self-hosting transfers patching, backups, archiving, database, and incident-response work to the operator.
2. **Consent:** Matomo has tracking-consent enforcement APIs but does **not** provide the notice/choice UI. For a single analytics purpose, a small native first-party preference panel is the lowest-dependency option. If a general CMP is needed, Klaro is BSD-3-Clause and self-hostable, but its official repository lists no Bengali translation and no GitHub releases; pin and vendor an audited build rather than loading a floating CDN asset.
3. **Reviews and abuse:** Treat review submission as a sensitive business flow. Use layered controls: verified account/contact, per-account and per-network velocity limits, payload/attachment limits, duplicate and campaign detection, delayed publication or risk-based premoderation, user reports, immutable moderation audit records, reason codes, appeal/correction, and provider right-of-reply. Automated toxicity scoring may assist prioritisation but must not make final decisions until Bangla/Banglish performance and identity/medical-context bias are measured.
4. **Search:** PostgreSQL full-text search plus `pg_trgm` is the lowest-lock-in baseline. Use weighted `tsvector` + GIN for structured lexical search and trigram indexes for spelling/name variants. Bengali linguistic stemming is not established by the official PostgreSQL material reviewed; begin with `simple` token normalisation plus trigrams, build a Bangla/Banglish relevance set, and add a reviewed dictionary/tokeniser only if evaluation justifies it.
5. **Operations:** Docker Engine/Moby is permissively licensed, but containers do not remove production duties. Keep persistent state in named volumes, maintain database-native backups and off-host copies, restore-test them, monitor capacity/health, patch host and images, restrict daemon access, and evaluate rootless mode. A tar of a live database volume is not accepted here as a consistency guarantee.
6. **Claude Code / Claude models:** The current direct-API lineup is Fable 5, Opus 5, Sonnet 5, and Haiku 4.5. Claude Code aliases vary by provider, can move over time, and newer models require minimum client versions. Pin full IDs for reproducible automation and record the actual model used. This is a metered proprietary service, not a self-hosted model dependency; gateway/provider portability mitigates routing lock-in, not model/vendor lock-in.
7. **Bangladesh launch gate:** Current official listings show the Personal Data Protection Act 2026, National Data Governance Act 2026, Cyber Protection Act 2026, and a July 2026 Cyber Protection amendment. Before collecting or publishing patient-reported reviews, Bangladesh counsel must review the current gazettes and implementing instruments. A healthcare professional must approve medical-content rules and clinical-risk escalation. Do not treat 2025 ordinance text as the consolidated wording of the 2026 Acts.

## Evidence-backed findings

### A. Privacy-safe analytics and consent

#### Claim A1 — Matomo is self-hostable and open source, but it adds a separate database/runtime stack

Matomo’s official repository describes a self-hosted PHP application backed by MySQL or MariaDB, currently requiring PHP 8.1+, MySQL 8.0+ or MariaDB 10.6+, and labels the code GPL v3 or later. The repository also distinguishes the free self-hosted product from paid Cloud/support. Commercial operation is permitted under GPL, but redistribution/modification obligations need normal licence compliance; premium plugins/support can add cost and contractual dependencies.

- **URL:** https://github.com/matomo-org/matomo
- **Publisher:** Matomo project (official repository)
- **Publication/update date:** Repository current; latest release shown by the source as 5.10.0 on 2026-05-03
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, INFERENCE

**Implication:** Keep Matomo isolated from the application’s PostgreSQL database. Budget for PHP/MySQL/MariaDB patching, report archiving, backups, monitoring, upgrades, and security review. Do not advertise “no third parties” merely because it is self-hosted; hosting, CDN, geolocation, email, and support choices can still introduce processors.

#### Claim A2 — Privacy-safe Matomo is a configuration outcome, not a product default guarantee

Matomo documents IP masking/anonymisation, avoidance or pseudonymisation of user IDs, deletion of old raw visitor logs, opt-out, Do Not Track, privacy/cookie notices, and anonymisation of previously collected data. It says IP masking is enabled by default, but also distinguishes masking from irreversible anonymisation and notes that masked data may remain re-identifiable. It states self-hosted analytics data resides in the operator’s own MySQL database.

- **URL:** https://matomo.org/faq/general/configure-privacy-settings-in-matomo/
- **Publisher:** Matomo
- **Publication/update date:** Not stated on page; live documentation crawled current on access date
- **Accessed:** 2026-08-29
- **Confidence:** High for product behaviour; Medium for any jurisdictional consequence
- **Class:** FACT, LEGAL-REVIEW

**Implication:** Adopt a data map and an explicit denylist: never send review text, symptom/diagnosis/treatment terms, provider-reply text, email/phone, precise location, account IDs, registration identifiers, or free-form search queries to analytics. Fully remove or strongly mask IPs where feasible; prefer masked IP for geolocation; set raw-log deletion; disable session replay/heatmaps unless separately justified; test outbound connections.

#### Claim A3 — Matomo can prevent tracking until consent, but it has no native consent-notice UI

Matomo’s developer guide distinguishes `requireConsent` (no tracking request and no cookie until consent) from `requireCookieConsent` (requests may still be sent without cookies). It supports remembering, setting, and revoking consent. The guide explicitly says Matomo does not yet display the privacy notice itself.

- **URL:** https://developer.matomo.org/guides/tracking-consent
- **Publisher:** Matomo developer documentation
- **Publication/update date:** Not stated; documentation version 5, live and current on access date
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, LEGAL-REVIEW

**Implication:** If counsel selects consent as the basis, initialise `requireConsent` before any page-view call, offer equal accept/reject paths, store purpose/version/time, make withdrawal as easy as acceptance, and re-test every tag after changes. Cookie-less analytics is not automatically consent-free; lawful basis remains jurisdiction- and configuration-specific.

#### Claim A4 — Klaro is a low-lock-in CMP candidate, with localisation and release-process caveats

Klaro’s official repository says it can be self-hosted, can gate scripts/resources, is BSD-3-Clause, and has no required subscription. The README’s listed built-in languages do not include Bengali. It advises pinning CDN versions and says the floating `latest` tag is not maintained. The GitHub Releases page contains no releases, so release provenance and update cadence are weaker than a conventional tagged-release flow.

- **URL:** https://github.com/kiprotect/klaro
- **Publisher:** KIProtect/Klaro project (official repository)
- **Publication/update date:** Repository page does not expose a reliable latest-commit date; package metadata visible in the source reports 0.7.22; no GitHub releases listed as of access
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, INFERENCE, LEGAL-REVIEW

**Implication:** Prefer a small native first-party consent UI when only Matomo is gated. If Klaro is chosen, vendor a checksum-pinned build, audit dependencies and accessibility, add professionally reviewed Bangla copy, persist a consent-policy version, and test “reject all,” withdrawal, JavaScript failure, subdomains, Safari expiry, and tag leakage. A CMP is evidence/control infrastructure, not a compliance certificate.

### B. Content moderation and abuse prevention

#### Claim B1 — Review posting is a sensitive business flow and needs business-level anti-automation controls

OWASP API6:2023 explicitly uses posting a comment as an example of a business flow that can be harmed by excessive automated access. It recommends identifying vulnerable flows and applying business-aware restrictions; it cautions that device fingerprinting, CAPTCHA, and human-detection mechanisms have weaknesses and should not be the only defence.

- **URL:** https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/
- **Publisher:** OWASP Foundation, API Security Project
- **Publication/update date:** 2023 stable edition (released 2023-06-05)
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Combine verified account/contact, cooldowns, per-provider burst detection, duplicate/similarity checks, coordinated-campaign signals, risk-based publication delay, and moderator review. Do not make CAPTCHA the trust boundary. Preserve privacy by using coarse/rotating abuse signals and short retention where possible.

#### Claim B2 — Rate limits must cover cost and workload, not just request count

OWASP’s 2025 Business Logic Abuse guidance identifies missing rate limits, inadequate quotas, input-proportional workloads, mass account creation, scraping, and expensive AI/API calls as operational abuse. It notes that equal request-count limits can still permit denial of service when operations have different costs.

- **URL:** https://owasp.org/www-project-top-10-for-business-logic-abuse/docs/the-top-10/resource-quota-violation.html
- **Publisher:** OWASP Foundation
- **Publication/update date:** 2025 project edition; page copyright/current context 2026
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Enforce maximum review/response length, attachment count/size/type, search complexity, pagination, moderation-inference spend, and per-user/provider/network quotas. Add alerts and circuit breakers for email/SMS/moderation vendors. Use idempotency and queue backpressure. Keep a manual degraded mode if an external moderation service fails.

**Moderation policy recommendation (derived):**

- Publish rules for first-hand experience, conflicts of interest, impersonation, threats/harassment, discriminatory abuse, spam, personal data, patient confidentiality, unverifiable criminal allegations, and dangerous medical instructions.
- Separate **content visibility** from **evidence preservation**: quarantine disputed content; retain only what counsel authorises; log who acted, why, policy version, evidence, and appeal outcome.
- Give reviewers correction/appeal and providers a bounded reply/report channel; prohibit providers from exposing patient records in replies.
- Use automated classifiers only for triage. Bangla/Banglish, transliteration, negation, reclaimed/clinical terms, and identity mentions require a labelled local evaluation set and measured false-positive/false-negative rates before enforcement.
- Route imminent self-harm, violence, abuse, and dangerous clinical claims through procedures approved by Bangladesh counsel and a healthcare professional. Do not present moderators or automated outputs as medical diagnosis.

### C. PostgreSQL full-text search and `pg_trgm`

#### Claim C1 — Native FTS supports structured lexical retrieval and ranking with GIN indexes

PostgreSQL 18 documents `tsvector`/`tsquery`, Boolean and phrase queries, weights for document sections, normalisation through text-search configurations, and GIN/GiST indexes for full-text search. GIN is the documented preferred text-search index type.

- **URL:** https://www.postgresql.org/docs/current/textsearch.html
- **Publisher:** PostgreSQL Global Development Group
- **Publication/update date:** PostgreSQL 18 current documentation; current branch includes 18.6 as of access
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Build a stored/generated weighted vector from verified provider name, specialty, facility, district/city, and carefully selected public fields; use GIN; pass an explicit configuration rather than relying on server defaults; cap result count; inspect plans; tune autovacuum. Do not index private moderation notes, patient identifiers, or removed text into public search.

#### Claim C2 — `pg_trgm` provides fuzzy similarity plus indexed `LIKE`/`ILIKE`

The bundled trusted `pg_trgm` extension provides trigram similarity, word similarity, configurable thresholds, and GiST/GIN operator classes. Current documentation states these indexes also support `LIKE` and `ILIKE`. It is effective for spelling/name variants but similarity thresholds are application-specific and can produce broad matches.

- **URL:** https://www.postgresql.org/docs/18/pgtrgm.html
- **Publisher:** PostgreSQL Global Development Group
- **Publication/update date:** PostgreSQL 18 current documentation; page current in August 2026
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Use trigrams for provider/facility names, transliteration variants, prefix/substring cases, and typo recovery; set minimum query length, hard result limits, deterministic tie-breaks, and benchmark GIN vs GiST. Prevent inference of hidden records by ensuring search queries filter publication/visibility status before ranking.

#### Claim C3 — PostgreSQL is commercially usable with low licence lock-in

The PostgreSQL License permits use, copying, modification, and distribution for any purpose without fee, subject to retaining the licence/copyright/disclaimer text. The project describes it as a liberal BSD/MIT-like open-source licence.

- **URL:** https://www.postgresql.org/about/licence/
- **Publisher:** PostgreSQL Global Development Group
- **Publication/update date:** Copyright text updated through 2026
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT

**Implication:** PostgreSQL FTS avoids a hosted-search paywall and keeps data portable. Lock-in remains at schema/query/index design rather than vendor API level. Operating risk includes index growth, write amplification, vacuum health, relevance tuning, and backups.

**Bengali-search unknown:** The official material reviewed establishes the `simple` dictionary (lowercase + optional stop words) and configurable dictionaries, but does not establish a bundled Bengali stemmer/tokeniser. Treat Bengali morphology, Banglish transliteration, compound words, spelling variants, and locale/collation behaviour as an evaluation problem. Do not claim “Bengali stemming supported” without a verified extension/dictionary licence and measured corpus results.

### D. Docker self-hosting and operations

#### Claim D1 — Persistent data must live outside container writable layers and be restore-tested

Docker documents volumes as persistent stores independent of container lifecycle and provides example backup/restore/migration procedures. It also warns through its storage model that container writable-layer data is lost when containers are destroyed.

- **URL:** https://docs.docker.com/engine/storage/volumes/
- **Publisher:** Docker, Inc.
- **Publication/update date:** Not stated; live documentation current on access date
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Use named volumes for database/application state, but back up PostgreSQL and MySQL/MariaDB with database-aware procedures or storage snapshots proven consistent. Encrypt off-host copies, define RPO/RTO, automate retention, and perform scheduled full restores. Docker’s tar-volume example alone is not evidence of application-consistent backup for a running database.

#### Claim D2 — Rootless mode reduces daemon/runtime privilege, with operational prerequisites

Docker’s rootless mode runs both daemon and containers in a user namespace without root privileges (apart from subordinate-ID helpers) and is intended to mitigate daemon/runtime vulnerabilities. It requires subordinate UID/GID ranges and has environment/networking/host constraints.

- **URL:** https://docs.docker.com/engine/security/rootless/
- **Publisher:** Docker, Inc.
- **Publication/update date:** Live page updated/crawled 2026-06 (exact page date not stated)
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION

**Implication:** Evaluate rootless Engine for a single-host deployment. Whether rootless or not: do not expose the daemon socket, minimise published ports, run application containers as non-root, drop capabilities, use read-only filesystems where feasible, isolate networks, constrain CPU/memory/PIDs, rotate secrets, scan/pin images by digest, patch host/Engine/images, centralise logs, and monitor disk/volume/backup health.

#### Claim D3 — The underlying Moby engine is Apache-2.0, but branded products and add-ons have separate terms

The official Moby repository identifies the engine project as Apache License 2.0 and shows active 2026 releases. This supports commercial use subject to Apache notice/licence obligations. It does not establish the licence terms of Docker Desktop, hosted registries, support, or every bundled/plugin component.

- **URL:** https://github.com/moby/moby
- **Publisher:** Moby Project (official repository)
- **Publication/update date:** Latest release shown by source: v29.5.2, 2026-05-20
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, LEGAL-REVIEW

**Implication:** Prefer Linux Docker Engine/Moby for a self-hosted server and inventory the licences/terms of Compose, base images, plugins, Docker Desktop (if used by staff), registries, and vendor support separately. Containers reduce environment drift; they do not supply HA, backups, security updates, observability, or incident response.

### E. Current Claude models and Claude Code

#### Claim E1 — Current Anthropic model availability and core limits are materially newer than the 4.x lineup

The current official model table lists Claude Fable 5, Opus 5, Sonnet 5, and Haiku 4.5. It reports text+image input, text output, tool use and multilingual/vision support for all current models; 1M-token context and 128K maximum output for Fable/Opus/Sonnet; 200K/64K for Haiku 4.5; and direct API list prices of $10/$50, $5/$25, $2/$10, and $1/$5 per million input/output tokens respectively. Model availability can vary by platform/account.

- **URL:** https://platform.claude.com/docs/en/models/overview
- **Publisher:** Anthropic, Claude Platform documentation
- **Publication/update date:** Not stated; live model table current on 2026-08-29
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT

**Implication:** Any plan naming older models as “latest” is stale. Re-check model IDs, prices, limits, region/provider availability, deprecations, and data terms at procurement and before each rollout. Cost-model worst-case context/output/tool loops rather than using headline input price alone.

#### Claim E2 — Claude Code aliases are provider-dependent and mutable; pinning is required for reproducibility

Claude Code’s current model configuration maps direct Anthropic API aliases to Opus 5 and Sonnet 5, but maps aliases to older Sonnet/Opus variants on AWS/Bedrock, Google Agent Platform, and Microsoft Foundry. Aliases update over time. The docs give minimum Claude Code versions for newer models, support full IDs, effort/context controls, provider/gateway routing, model allowlists, and automatic fallbacks. Fable 5 is for long autonomous work, is not default, can trigger safety fallback, can require usage credits, and is unavailable under zero-data-retention arrangements.

- **URL:** https://code.claude.com/docs/en/model-config
- **Publisher:** Anthropic, Claude Code documentation
- **Publication/update date:** Live documentation current on 2026-08-29; includes client-version requirements through v2.1.236+
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, INFERENCE, RECOMMENDATION

**Implication:** Pin full model IDs and client versions in CI; log the actual model/provider/fallback and usage; enforce tool permissions and spend limits; require human review for legal, clinical, moderation-policy, production-data, destructive, and deployment actions. Claude Code/Claude is a metered hosted dependency—no official self-hosted model weights are documented here. Gateways and alternate cloud providers reduce endpoint/billing concentration but do not remove dependency on Anthropic model availability, terms, safety routing, deprecations, or network access.

### F. Bangladesh privacy, cyber, healthcare, and publication risk

#### Claim F1 — The current baseline is 2026 Acts, not merely the 2025 Ordinances

The Legislative and Parliamentary Affairs Division’s official 2026 list, updated 2026-08-09, records the Personal Data Protection Act 2026 (Act 63), National Data Governance Act 2026 (Act 80), Cyber Protection Act 2026 (Act 81), and Cyber Protection (Amendment) Act 2026 (Act 99, gazetted 2026-07-01).

- **URL:** https://legislativediv.gov.bd/pages/static-pages/69df4f84e252a315b7e6b8db
- **Publisher:** Legislative and Parliamentary Affairs Division, Ministry of Law, Justice and Parliamentary Affairs, Bangladesh
- **Publication/update date:** Last updated 2026-08-09; relevant gazettes 2026-04-10 and 2026-07-01
- **Accessed:** 2026-08-29
- **Confidence:** High for enactment/status; Low for substantive interpretation without the current gazette text and implementing instruments
- **Class:** FACT, LEGAL-REVIEW

**Implication / mandatory Bangladesh-counsel review:** Obtain and interpret the consolidated current Acts, July cyber amendment, commencement/transitional provisions, rules/regulations, regulator guidance, and enforcement status. Counsel must determine:

- controller/fiduciary/processor roles and territorial reach;
- whether review text, provider replies, analytics identifiers, abuse signals, and attachments are personal, sensitive/restricted, or health data;
- lawful bases and valid consent standards, notice language, children/minors, data-subject rights, retention/deletion, processor contracts, breach duties, security standards, localisation and cross-border transfer;
- whether anonymous/pseudonymous public reviews remain identifiable and what verification evidence may be retained;
- content-host/intermediary duties, prohibited content, takedown/preservation/disclosure orders, complaint/appeal timelines, and cyber-incident reporting;
- launch structure if the statutory authority, rules, or approved transfer mechanisms are not yet operational.

**Explicit unknown:** The official list proves current enactments but not the consolidated operative wording. The 2025 ordinance text may differ from the 2026 Acts and must not be used as a substitute.

#### Claim F2 — BM&DC ethics make patient confidentiality and neutral professional information central constraints

The Bangladesh Medical & Dental Council’s official ethics code requires protection of medical-record confidentiality, including after death, subject to law/public interest. Its professional-information provisions require doctor-provided public information to be accurate, factual, objectively verifiable and balanced, and prohibit exaggerated/misleading/comparative/sensational claims, solicitation, commercial promotion, and unrealistic expectations.

- **URL:** https://www.bmdc.org.bd/docs/EthicsBookMakeupfinal.pdf
- **Publisher:** Bangladesh Medical & Dental Council
- **Publication/update date:** Document metadata/indexing indicates approximately 2017; no later revision date established
- **Accessed:** 2026-08-29
- **Confidence:** High for document text; Medium for whether later professional rules supersede or supplement it
- **Class:** FACT, HEALTHCARE-REVIEW, LEGAL-REVIEW

**Implication:** Providers must never “rebut” a review by revealing records, diagnoses, attendance, family details, or other confidential facts. Clearly distinguish patient-reported experience from verified credentials and clinical-quality conclusions. Ban paid review manipulation and undisclosed promotional placement. A Bangladesh healthcare professional and counsel must review provider-reply templates, medical misinformation rules, emergencies, adverse-event escalation, and the meaning of ratings/quality labels.

#### Claim F3 — Public verification should be anchored to the official professional register

BM&DC provides an official registration-profile search by full registration number and practitioner type, with a channel for detailed verification. The public interface uses CAPTCHA and is not documented as a bulk API.

- **URL:** https://verify.bmdc.org.bd/
- **Publisher:** Bangladesh Medical & Dental Council
- **Publication/update date:** Not stated; service live on access date
- **Accessed:** 2026-08-29
- **Confidence:** High
- **Class:** FACT, RECOMMENDATION, LEGAL-REVIEW

**Implication:** Store source, registration number, practitioner type, verification timestamp, and status separately from patient claims. Do not scrape/bypass CAPTCHA or imply a live endorsement; seek permission/API or use an authorised manual verification workflow. Define re-verification cadence and correction/dispute process. Facility licensing needs a separate authoritative source and remains unresolved.

#### Claim F4 — Defamation exposure is a direct publication risk

Bangladesh’s official Penal Code text defines defamation broadly for imputations that harm reputation, extends it to companies/associations, includes exceptions such as truth where publication is for public good and certain good-faith/public-interest communications, and provides criminal penalties under sections 500–502.

- **URL:** https://bdlaws.minlaw.gov.bd/act-11/act-chapter-print-24.html
- **Publisher:** Laws of Bangladesh, Legislative and Parliamentary Affairs Division
- **Publication/update date:** Penal Code enacted 1860; official online text current as accessed (page revision date not stated)
- **Accessed:** 2026-08-29
- **Confidence:** High for statutory text; Low for applying exceptions/platform liability to particular reviews
- **Class:** FACT, LEGAL-REVIEW

**Implication / mandatory Bangladesh-counsel review:** Counsel must approve allegation rules, evidence handling, prepublication thresholds, provider notice/right-of-reply, urgent restraint/takedown handling, preservation, reviewer identity disclosure, appeal, and distinction between opinion, first-hand fact, and accusation. Do not promise reviewers anonymity against lawful process. Moderators should not decide that the statutory “truth/public good/good faith” exceptions apply without escalation.

## Recommended implementation gates

### Gate 1 — Before private alpha

- Complete data inventory and threat/abuse model; define public/private/moderation/analytics fields.
- Obtain Bangladesh counsel’s written current-law memo covering the issues in F1 and F4.
- Obtain healthcare-professional sign-off on taxonomy, rating interpretation, dangerous medical content, provider replies, and escalation.
- Define moderation policy, reason codes, audit schema, appeals, provider disputes, evidence access, retention, and staff safety.
- Establish database-native encrypted off-host backups and prove a full restore.

### Gate 2 — Before collecting real reviews

- Verify consent/lawful-basis flow, withdrawal, privacy notice, data-subject request handling, and breach runbook.
- Instrument abuse controls and cost circuit breakers; test mass account/review/report/reply/search attacks.
- Validate official credential workflow and show verification timestamp/source without endorsement language.
- Security test access control, unpublished/deleted-record search leakage, uploads, admin/moderator actions, logs, secrets, and daemon exposure.

### Gate 3 — Before public launch

- Run a Bangla/Banglish search relevance set and moderation fairness/error evaluation with documented acceptance thresholds.
- Conduct a legal/clinical sample review of high-risk content and provider replies.
- Exercise takedown, appeal, evidence preservation, breach notification, backup restore, dependency outage, and moderator escalation drills.
- Re-check official Bangladesh gazettes/rules, BM&DC guidance, Matomo/Klaro releases, PostgreSQL/Docker security updates, and Anthropic model/pricing/deprecation pages.

## Explicit unknowns and follow-up owners

| Unknown | Why it matters | Owner / required reviewer |
|---|---|---|
| Consolidated operative text, commencement, rules, authority and enforcement posture for the 2026 data/governance/cyber Acts and July cyber amendment | Determines lawful basis, notices, rights, retention, localisation/transfers, incidents, intermediary duties and penalties | Bangladesh counsel |
| Facility/clinic authoritative register, reuse/API terms and re-verification process | Prevents false facility claims; BM&DC register covers practitioners, not necessarily facilities | Bangladesh counsel + health regulator liaison |
| Whether and how a platform may verify a patient encounter without retaining excessive health/identity data | Central tension between authenticity, minimisation, anonymity and disclosure risk | Bangladesh counsel + privacy/security lead + healthcare professional |
| Legal meaning of anonymous/pseudonymous reviews, reviewer identity disclosure, provider notice, defamation exceptions and evidence thresholds | Direct civil/criminal/publication risk | Bangladesh counsel |
| Current BM&DC ethics amendments/supplemental rules and application to platform profiles, ratings, replies, sponsored placement and telemedicine | May constrain promotion and confidentiality beyond the reviewed code | Healthcare professional + Bangladesh counsel |
| Bangla/Banglish toxicity, harassment, medical-misinformation and identity-bias performance | No reviewed official model establishes safe local-language enforcement | Trust & safety lead + healthcare professional; local labelled evaluation |
| Bengali stemming/tokenisation/transliteration quality and third-party dictionary licences | Determines search relevance and licence/security footprint | Search engineer + local-language reviewer |
| Matomo lawful basis/consent exemption for the exact deployment | Cookie-less/self-hosted does not decide the legal question | Bangladesh counsel/privacy adviser |
| Klaro maintenance provenance, dependency audit, Bengali copy and accessibility | Repository has no GitHub releases and no listed Bengali translation | Frontend/security/accessibility owners |
| Production scale, RPO/RTO, HA need and operator on-call capacity | Determines whether single-host Docker is acceptable | Operations owner |
| Claude provider/region availability, data terms, ZDR compatibility, model fallback and total cost at procurement time | Fast-changing proprietary dependency | Procurement/security/engineering; re-check official docs |

## Source freshness and lock-in snapshot

| Component | Licence / commercial use | Self-host / paywall | Lock-in and freshness risk |
|---|---|---|---|
| Matomo core | GPL-3.0-or-later; commercial use with GPL compliance | Free self-host; paid cloud, support and premium features available | Low data/API lock-in, medium operational burden; core release visible 2026-05-03 |
| Klaro | BSD-3-Clause | Free self-host; optional vendor services/CDN | Low code lock-in; weaker release provenance, no listed Bengali translation |
| PostgreSQL + `pg_trgm` | PostgreSQL Licence; no commercial fee | Self-host | Low vendor lock-in; relevance/schema/index lock-in; current v18 docs |
| Docker Engine/Moby | Apache-2.0 for Moby engine; inventory other components separately | Self-host; branded Desktop/hosted services have separate terms | Medium operational/ecosystem coupling; active 2026 engine releases |
| Claude models / Claude Code | Proprietary service terms; usage/subscription/credits | Hosted/provider-routed, not model-weight self-hosting in reviewed docs | High model/vendor and network dependency; aliases/prices/availability change quickly |

## Primary-source register (18 sources)

1. Matomo official repository — https://github.com/matomo-org/matomo
2. Matomo privacy settings — https://matomo.org/faq/general/configure-privacy-settings-in-matomo/
3. Matomo tracking consent — https://developer.matomo.org/guides/tracking-consent
4. Klaro official repository — https://github.com/kiprotect/klaro
5. OWASP API6:2023 — https://owasp.org/API-Security/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/
6. OWASP BLA7:2025 — https://owasp.org/www-project-top-10-for-business-logic-abuse/docs/the-top-10/resource-quota-violation.html
7. PostgreSQL full-text search — https://www.postgresql.org/docs/current/textsearch.html
8. PostgreSQL `pg_trgm` — https://www.postgresql.org/docs/18/pgtrgm.html
9. PostgreSQL licence — https://www.postgresql.org/about/licence/
10. Docker volumes — https://docs.docker.com/engine/storage/volumes/
11. Docker rootless mode — https://docs.docker.com/engine/security/rootless/
12. Moby official repository — https://github.com/moby/moby
13. Anthropic current models — https://platform.claude.com/docs/en/models/overview
14. Claude Code model configuration — https://code.claude.com/docs/en/model-config
15. Bangladesh 2026 Acts list — https://legislativediv.gov.bd/pages/static-pages/69df4f84e252a315b7e6b8db
16. BM&DC Code of Medical Ethics — https://www.bmdc.org.bd/docs/EthicsBookMakeupfinal.pdf
17. BM&DC registration verification — https://verify.bmdc.org.bd/
18. Bangladesh Penal Code, Chapter XXI — https://bdlaws.minlaw.gov.bd/act-11/act-chapter-print-24.html
