# RogiKotha architecture options

Status: Gate 1 options only; no architecture selected  
Date: 2026-08-29  
Decision prerequisite: founder answers in `02-conflicts-assumptions-questions.md`

## Architecture hard gates

Any option must satisfy all of the following:

- Bangladesh-first Bangla/English interface and Unicode-safe Bangla/English/Banglish content/search.
- Narrative-first, condition/episode-specific domain model with no numeric medical-quality scoring.
- Strong separation between account identity, public persona, provider provenance, and case relationship.
- Secure evidence quarantine, validation, malware scan, isolated conversion, irreversible redaction flattening, processed-copy publication, access audit, and retention/legal hold.
- No medical payload in analytics, ordinary logs, error monitoring, search indexing, or agent/model services.
- WCAG 2.2 AA implementation target for critical journeys, reduced motion, keyboard access, zoom/reflow, and mobile-first performance.
- Open-source/commercially usable dependencies, self-hosting, no hidden paywall for essential controls, and a documented exit path.
- Solo-founder operability and AI-agent navigability: strict module boundaries, small interfaces, deterministic fixtures, and independent validation.
- A prototype service layer that can swap deterministic mocks for real APIs without component rewrites.
- Recovery from a failed deploy, database migration, malicious file, scanner outage, disk exhaustion, and complete VPS loss.

## Shared domain/module spine

The options differ at the process/API boundary, not in product semantics. Both should use these internal modules:

1. Identity and access
2. Public personas and privacy presentation
3. Provider/facility directory and provenance
4. Taxonomy and multilingual search
5. Treatment-episode reviews and timelines
6. Evidence intake, processing, viewing, retention, and legal hold
7. Discussion, reactions, blocking, and notifications
8. Reports, moderation, appeals, and enforcement
9. Administration and safe configuration
10. Audit/content history
11. Privacy-safe product metrics and operational telemetry
12. Policy, consent, emergency, and public information

Each module owns its invariants and database migrations. Cross-module work uses explicit application services/events rather than importing another module's persistence internals.

## Option A — full-stack Next.js modular monolith plus worker

### Shape

- One TypeScript monorepo and one deployable web application using Next.js App Router for SSR/public pages, authenticated UI, and HTTP endpoints.
- One separately runnable TypeScript worker from the same domain/application packages for evidence, notification, cleanup, and summary jobs.
- PostgreSQL as transactional source of truth and initial job coordination.
- S3-compatible object-storage port with separate quarantine/original/processed buckets or prefixes.
- Isolated native-tool containers for malware scan and document/image processing.
- Reverse proxy/TLS, analytics, and observability remain separately deployable services.

### Strengths

- Lowest context switching and deployment complexity for one founder.
- Shared TypeScript types/domain rules reduce drift between UI, endpoints, worker, tests, and agent tasks.
- Next.js SSR/metadata/route model fits public profile/review SEO and the prototype-to-production path.
- A well-defined application/service layer supports deterministic mocks without making React components import fixtures.
- The worker and evidence ports preserve an escape path when one-host processing becomes unsafe.

### Costs and risks

- Without strong module enforcement, UI/server/domain code can collapse into one shallow dependency graph.
- Next.js runtime/cache/server-action behaviour changes can create framework coupling; sensitive mutations should remain explicit HTTP/application commands.
- CPU/memory-heavy evidence work must never execute in the web process.
- Credentials authentication and account recovery remain application-owned and high-risk.
- Scaling web and worker independently requires container/process boundaries from day one even if deployed together.

### Best fit

One founder, TypeScript-heavy agent workflow, frontend-first prototype, moderate initial traffic, and a deliberate modular-monolith discipline.

## Option B — Next.js web plus separate Fastify TypeScript API/worker modular monolith

### Shape

- Next.js owns rendering, routing, PWA shell, and browser-facing composition.
- A separate Fastify TypeScript API owns authentication integration, domain application services, persistence, search, administration APIs, and object-storage authorization.
- A separate worker imports the same backend domain/application packages.
- Web and API communicate through a versioned OpenAPI/typed client contract.

### Strengths

- Clearer security and domain boundary; backend behaviour is not coupled to Next.js route/runtime conventions.
- Web and API can scale/deploy independently and support future native/mobile/public clients.
- API contract makes mock/real substitution explicit and can improve independent agent task boundaries.
- Long-running worker and web lifecycles are naturally separate.

### Costs and risks

- More repositories-within-a-monorepo concepts, deployment units, generated-client discipline, authentication/cookie/CORS/CSRF decisions, and integration tests.
- Duplicated transport models and more versioning overhead before a second client exists.
- Greater operational and cognitive load for a solo founder.
- API boundary does not itself guarantee a deep domain model; it can still become a CRUD service.

### Best fit

Use if founder confirmation makes evidence/security boundaries dominant, a second client/API is expected soon, or Next.js server coupling is considered unacceptable.

## Option C — Next.js web plus Django/Python backend and worker

### Shape

- Next.js provides the public/mobile-first frontend.
- Django/DRF or an equivalent Python modular monolith owns domain/admin/auth APIs; Python workers coordinate file conversion and processing.

### Strengths

- Mature server/admin ecosystem and natural proximity to document-processing automation.
- Strong migrations/ORM/admin capabilities can accelerate operational tools.

### Costs and risks

- Two application languages, duplicated models/contracts, broader dependency/security surface, and higher agent context-switch cost.
- Python proximity does not make unsafe native document parsers safe; conversion still belongs in isolated containers.
- Less alignment with the PRD's selected TypeScript stack and frontend-first plan.

### Best fit

Only if a Python-native capability becomes essential and cannot remain an isolated evidence-processing adapter. It is currently a credible fallback, not a leading option.

## Comparative matrix

Scores are provisional: 5 is strongest for RogiKotha under the current requirement frame. They will be refreshed after founder decisions and final source verification.

| Criterion | Weight | A: Next.js full-stack + worker | B: Next.js + Fastify API/worker | C: Next.js + Python backend |
|---|---:|---:|---:|---:|
| Solo-founder development effort | 15 | 5 | 3 | 2 |
| AI-agent navigability | 10 | 4, if boundaries enforced | 5 | 3 |
| Mobile/browser/SSR support | 8 | 5 | 5 | 5 |
| Accessibility/i18n fit | 8 | 5 | 5 | 5 |
| Security boundary clarity | 12 | 3 | 5 | 5 |
| Evidence-processing feasibility | 12 | 4 | 5 | 5 |
| Testing/contract burden | 8 | 5 | 3 | 2 |
| Deployment/operations | 10 | 5 | 3 | 2 |
| Initial operating cost | 5 | 5 | 4 | 3 |
| Independent scaling | 5 | 4 | 5 | 5 |
| Maintainability for current team | 5 | 5 | 4 | 2 |
| Vendor/framework lock-in | 2 | 3 | 4 | 4 |
| **Weighted total / 5** | **100** | **4.45** | **4.15** | **3.55** |

The current provisional leader is Option A, but it is only acceptable with explicit architectural enforcement: domain/application packages independent of React/Next.js, a real worker process, transport-independent application commands/queries, and ports for object storage, mail, analytics, search, malware scan, and conversion. Option B becomes the leader if the founder chooses an evidence-heavy public Beta with strong service isolation from the first release or confirms near-term non-web clients.

## Shared data and integration decisions to validate

### PostgreSQL and search

- Use PostgreSQL for transactions, aliases/canonical tags, search documents, and trigram similarity.
- Use the `simple` text-search configuration for mixed-language tokens rather than English stemming on Bangla/Banglish.
- Normalize Unicode, case, spacing, punctuation, and selected transliterations at ingestion/query time while preserving original display text.
- Maintain curated aliases/transliterations with provenance; suggestions never silently rewrite an ambiguous query.
- Hide search implementation behind a query port so an external engine can be added without changing domain records or page contracts.

### Evidence processing

- The web process only creates an intake record and an opaque private upload authorization.
- A worker moves assets through explicit states: quarantined, validated, scanned, converted, preview-ready, redaction-required, flattened, published, rejected, expired, held.
- Native tools run with no network, read-only inputs where possible, writable scratch space, resource/time limits, non-root identity, and disposable containers/processes.
- Originals and processed copies use distinct object keys/permissions/retention and never share a public bucket policy.
- Publication is an explicit state transition after all required gates; scanner/converter unavailability fails closed for the file.

### Authentication

- Do not build session, CSRF, password hashing, token signing, or WebAuthn primitives from scratch.
- Keep account/recovery/admin step-up policy in the application domain even when an authentication library supplies sessions/adapters.
- Separate public persona IDs from private account IDs in URLs, snapshots, and activity feeds.
- Better Auth is the provisional new-project candidate: Auth.js's official repository now recommends Better Auth for most new projects, while Auth.js remains a security/critical-fix path and its Next.js v5 line remains beta.
- Final library selection remains open until a local spike proves verification, account linking, session revocation, privileged MFA/passkeys, recovery, anti-enumeration behavior, and current-advisory handling against the founder's policy decisions.

### Runtime and deployment

- One-host deployment is a topology, not a code boundary: web, worker, database, storage, scanner, converter, proxy, and optional analytics/monitoring remain separate services.
- Evidence processing receives explicit CPU/RAM/concurrency/disk budgets and backpressure.
- Automated encrypted off-host backup and a restore drill are a provisional release gate before real patient data even if other multi-host services remain deferred.
- Production configuration is validated from resolved Compose output; secrets are mounted and least-privilege networks/users are enforced.
- Garage remains a conditional FOSS S3 candidate, but its own documentation states that one node has no redundancy and documents S3 compatibility gaps. It must pass the exact operation/failure/upgrade spike and still have an independent off-host backup.
- MinIO Community Edition is not a candidate for new work because its official repository was archived in April 2026 and legacy binaries no longer receive updates.

## Reversibility and migration path

- Option A to B: extract existing transport-independent application modules behind an OpenAPI boundary; web continues using the same service contracts.
- PostgreSQL search to external search: publish sanitized index documents from domain events; never export evidence text/private identities.
- Single VPS to split hosts: move worker/scanner/converter and object storage first; then database/observability as load and recovery needs justify.
- Object storage provider change: S3-compatible port, object inventory, checksums, retention metadata, and migration tooling prevent bucket-vendor assumptions.
- Analytics removal/change: all events flow through a privacy-filtering analytics port and default to a no-op implementation.

## Decisions deliberately deferred

- Final architecture recommendation and ADRs.
- Authentication library and admin step-up design.
- Garage versus another S3-compatible implementation.
- Exact evidence input types and original-retention policy.
- Matomo/Klaro versus no analytics/cookieless aggregate analytics.
- Runtime-configurable field system scope.
- Persistent staging and production host topology.

These decisions move to `05-recommended-architecture.md` only after founder confirmation.
