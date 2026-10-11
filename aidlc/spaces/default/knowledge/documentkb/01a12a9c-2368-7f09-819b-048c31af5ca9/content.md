# Validation strategy

Status: Gate 2–4 validation contract  
Rule: A green command is evidence for a stated scenario, not automatic product approval.

## Verdict contract

Every validation record includes task/story and requirement IDs, exact diff/commit range, environment and dependency versions, commands with exit codes, expected and observed results, reviewer/session/model identifier kept outside product attribution, limitations and remaining risk. The only verdicts are:

- `PASS`: acceptance is demonstrated and no required work remains.
- `PASS WITH FOLLOW-UP`: acceptance is demonstrated; a bounded non-blocking risk has an owner and due gate.
- `FAIL`: acceptance is missing, contradicted, unrepeatable or blocked by a critical/high finding.

The implementer cannot be the sole validator. High-risk work defined in `07-agent-model-assignment.md` requires cross-vendor inspection of the actual diff and tests, a threat/risk note, automated negative tests, and named human approval.

## Validation layers

| Layer | Proves | Typical evidence | Cannot prove alone |
|---|---|---|---|
| Static/architecture | type and dependency-direction consistency | lint, strict typecheck, import-boundary check, migration lint | runtime policy or usability |
| Domain | invariants and state transitions | table/property/clock/concurrency tests | adapter wiring |
| Integration | database, auth, jobs, storage and service contracts | real PostgreSQL, fake/scoped ports, migration tests | browser experience |
| Component | user-observable UI behavior | Testing Library, locale/state matrix | full navigation/browser behavior |
| E2E | critical journeys and system composition | Playwright Chromium/Firefox/WebKit | real Safari/iOS or specialist judgment |
| Security/privacy | misuse, leakage and failure safety | threat cases, authorization matrix, malicious corpus, network/log/cache scan | legal adequacy |
| Accessibility | WCAG foundation in context | axe, keyboard, screen reader, zoom/reflow, contrast, reduced motion | certification from automation |
| Performance/resilience | measured budgets and recovery | representative data/load, query plans, resource/failure tests | unknown production scale |
| Specialist | legal/clinical/local-language adequacy | signed checklist and scenario notes | software correctness |

## Gate 2 — Planning integrity

Required checks:

1. Extract all `FR-*` and `NFR-*` IDs from the PRD inventory/trace matrix and prove exactly 100 functional plus 12 non-functional IDs.
2. Prove each maps to at least one story that exists in both Markdown and YAML.
3. Prove every YAML story task reference resolves, every task has required resolved fields, and every validation task depends on implementation work.
4. Prove every founder decision FD-001–024 has a story, architecture rule or release gate.
5. Scan for legacy project terminology, unequal language positioning, ratings, automated danger classification, broad evidence formats, or real-data demo claims.
6. Validate YAML parse, local Markdown links, ADR status/links, architecture spine lint and terminology consistency.

Pass evidence is recorded in `docs/status/validation-log.md`. A missing requirement/task is a Gate 2 failure.

## Gate 3 — Design direction readiness

The final UX pair and prototype brief must demonstrate:

- every required surface appears in the IA/route inventory;
- all ten shared behavioral components have matching visual and experience contracts;
- empty/loading/error/limited/permission/hidden/deleted/long/mixed-script states are assigned;
- concept A/B/C differ in composition, navigation, hierarchy, density, search, profile, timeline, evidence, mobile behavior and motion—not merely color;
- representative desktop/mobile wireframes cover the same search→profile→review/timeline/evidence and Quick Review flows;
- Bengali and English are equal throughout; warning/legal-copy placement follows founder decisions;
- all external component use is empty or registered with licence/accessibility/performance information.

## Gate 4 — Runnable concept matrix

For each concept run:

| Family | Minimum matrix |
|---|---|
| Build quality | clean install, lint, strict typecheck, unit/component tests, production build |
| Journeys | understand product; search/no results; doctor/facility; review/timeline/evidence; quick/detailed review; report; dashboard; admin simulation |
| Locales | every journey once in Bengali and English; mixed Banglish search/content probes |
| Roles | signed-out, contributor, provider, moderator, admin, Super Admin simulation |
| Forced states | loading, empty, error, limited, hidden, deleted/tombstone, permission denied, long content |
| Viewports | 360×800, 390×844, 768×1024, 1280×800, 1440×900 |
| Browsers | current/previous Chromium, Firefox, WebKit automation; manual real Safari/iOS smoke |
| Accessibility | axe, keyboard-only, focus restoration, screen reader sample, 200% zoom/reflow, text spacing, reduced motion |
| Safety | no mutation/persistence, no analytics, no real auth/upload, synthetic marker and outbound-network scan |
| Visual comparison | same fixtures/routes/screenshots; design-comparison evidence and known issues |

A concept with a critical accessibility, privacy, synthetic-data or trust-language issue cannot be selected until fixed.

## Production capability gates

### Authentication and identity

Test enumeration, confirmation/reset expiry and replay, session fixation/rotation/revoke-all, CSRF/origin/cookie settings, rate limits, new staff-device approval, ownership and capability matrices. Use adversarial cross-surface fixtures to test anonymous aliases in profiles, feeds, reactions, mentions, notifications, URLs, caches, exports and logs. Human security/privacy approval is mandatory.

### Evidence

Maintain a legally safe malicious/edge corpus: MIME/extension mismatch, polyglot, scanner detection, encrypted/malformed/truncated files, decompression/page/pixel/resource bombs, timeout, scanner/converter outage, repeated jobs and direct URL probes. Inspect resulting pixels and PDF extraction after manual redaction; prove public derivative immutability and original isolation. Do not put real medical data in the corpus.

### Moderation and legal response

Test duplicate/concurrent reports, five-account threshold, ineligible factual disagreement, coordinated abuse signals, reporter identity boundaries, hide/restore, forbidden narrative rewrite, appeal segregation, blocking and enforcement. Counsel/healthcare reviewers run defamation, doxxing, confidentiality, unsafe-advice, evidence disclosure, takedown, hold and breach scenarios before public release.

### Retention, deletion and recovery

Use a controllable clock to test 90/180-day defaults, prospective config, preview drift, retroactive bulk action, individual hold/release/expiry, partial deletion failure, repeated requests, tombstones, de-identification, search/cache removal and retained audit expiry. Run a clean-environment database/blob/config restore and reconcile checksums/counts/public projections to the stated RPO/RTO.

### Search and language

A locally reviewed Bengali/English/Banglish corpus defines exact, alias, typo, ambiguous and no-result expectations. Record recall/precision bands, neutral ranking metamorphic tests, hidden-record probes, P95 latency, index size and query plans. Human bilingual review covers system copy meaning, Bangla shaping, line breaks and truncation.

## Evidence locations

```text
docs/status/validation-log.md              # concise completed verdict index
docs/validation/<story-or-gate>/           # transcripts, matrices, reports
docs/design/screenshots/<concept>/         # comparable Gate 4 images
docs/design/design-comparison.md            # founder comparison evidence
docs/security/                              # threat/risk reviews
docs/operations/                            # load, backup, restore and incident drills
```

Generated logs must be scrubbed and bounded; never commit secrets, private identifiers, real patient content, raw evidence, raw searches or provider credentials.

## Release stop conditions

Stop release on an unresolved critical/high security or privacy finding; missing legal/clinical approval; failed restore; public access to an original; anonymous linkage; hidden/deleted search or cache leak; incomplete Bengali/English critical journey; automated classification introduced contrary to scope; or a demo that accepts/transmits real data.
