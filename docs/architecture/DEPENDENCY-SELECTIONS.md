# RogiKotha dependency selections

> **2026-09-10 (FD-032/FD-033, demo build).** For the local demo implementation the Styling (Tailwind), Accessible primitives (Radix), Component source (shadcn) and Motion rows are **not adopted**; the frontend ports the approved prototype's plain CSS and tokens. Pins actually used, with the reasons for departing from the newest releases (TypeScript 6 not 7, pnpm 11 not 12, Vitest 4 not 5, Better Auth 1.7.3, `@cantoo/pdf-lib`, no MinIO), are in `docs/implementation/00-master-plan.md` §3 and `docs/status/dependency-check-log.md` (2026-09-10). Everything else in this table stands.

Status: Approved planning baseline; re-check exact patches immediately before installation  
Snapshot: 2026-08-30  
Principle: Prefer native platform capabilities and maintained open-source components. A listed dependency is not installed by this planning phase.

## Selected baseline

| Concern | Selection | Planning version | Licence / cost | Why selected | Important constraint |
|---|---|---:|---|---|---|
| Runtime | Node.js LTS | 24.20.0 | MIT; free | Supported production line rather than the newer current line | Re-check active LTS before scaffold |
| Web application | Next.js App Router | 16.3.3 | MIT; free | One deployable TypeScript application, server rendering, route handlers | Keep domain/application code framework-independent |
| UI runtime | React | 19.2.7 | MIT; free | Current supported React line for selected Next.js | Minimise client boundaries |
| Language | TypeScript | 6.0.3 | Apache-2.0; free | Strict contracts across application and worker | Use strict mode; no unchecked external payloads |
| Database | PostgreSQL | 18.6 | PostgreSQL Licence; free | Transactions, JSON, FTS, `pg_trgm`, mature backups | Public visibility predicate must be applied before ranking |
| SQL mapping | Drizzle ORM | 0.45.2 released line | Apache-2.0; free | Thin typed SQL layer with inspectable migrations | Pin ORM and migration tool separately after compatibility spike |
| Authentication | Better Auth | 1.6.22 | MIT; free | Maintained credentials/session foundation | Keep password, recovery, identity-linking policy in application-owned adapter; exclude 1.7 prereleases |
| Password hashing | Argon2id via maintained Node binding | implementation-day pin | Open source; free | OWASP-aligned memory-hard password hashing | Benchmark memory/time settings on target VPS before pin |
| Jobs | pg-boss | 12.26.0 released line | MIT; free | Durable PostgreSQL-backed jobs without another broker | Jobs carry IDs, not secrets or medical content |
| Styling | Tailwind CSS | 4.3.1 | MIT; free | Token-driven responsive styling with low bespoke CSS overhead | Exact patch and browser output re-check at scaffold |
| Accessible primitives | Radix UI primitives | 1.x per-package stable pins | MIT; free | Tested interaction primitives without prescribing visual identity | Do not assume assembled components are accessible without review |
| Component source | shadcn CLI/source | 4.11.0 line | MIT; free | Source-owned components are adaptable and auditable | Track copied/adapted sources; no floating registry pulls |
| Icons | Lucide | 1.27.0 | ISC; free | Consistent, lightweight SVG icon set | Icons supplement, never replace, labels |
| Motion | Motion for React | 12.23.12 line | MIT; free | Optional restrained transitions | Load only where useful; reduced-motion equivalent is mandatory |
| Forms/schema | React Hook Form + Zod | stable pins at scaffold | MIT; free | Accessible form orchestration and boundary validation | Server validation remains authoritative |
| PDF viewing | PDF.js | 6.1.200 | Apache-2.0; free | Maintained browser viewer foundation | Public derivatives only; isolate and CSP-harden viewer |
| Malware scan | ClamAV | 1.5.4 stable; 1.4.6 LTS fallback | GPL-2.0; free | Established scanner with maintained engine/signatures | Fail closed; signature freshness and scan health are release checks |
| Document conversion | LibreOffice headless | 26.2.5 production branch | MPL-2.0; free | Open document conversion; later format expansion | Phase 1 JPEG/PNG/PDF does not require Office parsing; isolated worker only when enabled |
| Object storage | Local filesystem adapter for demo; Garage conditional for production | Garage 2.3.x candidate | AGPL-3.0; free software | Storage port keeps deployment choice reversible | Single-node storage is not redundancy; licence/operations review before adoption |
| Unit/component tests | Vitest + Testing Library | stable pins at scaffold | MIT; free | Fast TypeScript and user-observable UI tests | Avoid implementation-detail assertions |
| Browser tests | Playwright | stable pin at scaffold | Apache-2.0; free | Cross-browser journeys, screenshots, keyboard checks | Real Safari/iOS smoke remains manual/device evidence |
| Accessibility automation | axe-core | stable pin at scaffold | MPL-2.0; free | Finds common accessibility failures | Cannot replace keyboard/screen-reader/manual review |
| Component workshop | Storybook | stable pin after prototype need is proven | MIT; free | Useful for states and visual review | Conditional: omit if route-based design lab is sufficient |
| API mocking | Native service adapters; MSW only if network interception is needed | conditional stable pin | MIT; free | Avoid fixture imports from components | Prefer an in-memory service implementation for the first prototype |
| Analytics | None in demo; conditional self-hosted Matomo | 5.10.x candidate | GPL-3.0-or-later; core free | Optional aggregate product measurement | Separate PHP/MySQL operations, counsel decision, consent and event allowlist required |

## Explicit non-selections

- No external search engine in Phase 1; PostgreSQL must first fail a measured Bangla/English/Banglish relevance or capacity threshold.
- No Redis or message broker; PostgreSQL-backed jobs are sufficient until measured contention says otherwise.
- No office-document ingestion in the initial allowlist; conversion tooling remains an isolated later capability.
- No automated medical-danger, threat, or toxicity classifier in Phase 1.
- No third-party hosted analytics, authentication, evidence storage, or proprietary UI dependency is required for the USD 0 synthetic demo.
- No component registry item is accepted without a licence, accessibility, performance, and adaptation entry in `docs/design/third-party-component-register.md`.

## Pinning rule

The numbers above are an authoring snapshot, not a lockfile. Before a task adds a dependency, read `docs/status/dependency-check-log.md`; if the relevant check is at least three days old, verify the current stable release, compatibility, changelog, security advisories, licence, and paid-feature boundary, then append the result before installation.
