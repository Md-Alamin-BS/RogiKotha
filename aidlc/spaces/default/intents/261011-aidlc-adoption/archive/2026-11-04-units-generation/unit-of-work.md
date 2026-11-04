# Units of work — RogiKotha demo build

45 Units, one per remaining task or change request (owner, Q1), including U45 T-011 added on 2026-10-27 for the FD-091 redesign; the storyboard and seed correction is CR-012 (FD-074). Merged work is the baseline every Unit builds on, not a Unit (Q2): T-001..T-009, T-207 Half A, D-001 and CR-002/003/005/008/010 on `main`. T-106, T-503 and T-505 are validation Units of kind `spec` (Q3). Each Unit keeps its task file in `docs/implementation/tasks/` as its specification: owned paths, acceptance table and estimate. Components and architecture decisions are in `domain-design/components.md` and `decisions.md`; the order of work is Delivery Planning's decision, not this document's.

Built from `components.md` and `decisions.md` (Domain Design), `requirements.md` and `stories.md`, and the master plan (`docs/implementation/00-master-plan.md` §5).

## Deployment model

All Units deploy into the existing two runtimes of the modular monolith: the Next.js web app (`apps/web`) and the pg-boss worker (`apps/worker`), with domain code in `packages/*` (ADR-0001, ADR-0007). Every Unit is embedded in that shared deployment; none deploys alone. The demo runs locally only (FD-031, D11). Construction is solo and serial (D13).

## Units

| Unit ID | Name | Directory | Source | Unit | Kind | Size | High risk | Stories |
|---|---|---|---|---|---|---|---|---|
| U1 | cr-009-database-extensionless-imports | u1-cr-009-database-extensionless-imports | CR-009 | Make `packages/database` importable from `apps/web` under Turbopack | library | S | — | — |
| U2 | cr-007-int-test-reset-determinism | u2-cr-007-int-test-reset-determinism | CR-007 | Make `pnpm test:int` deterministic (reset once per project, fail fast on lock contention) | packaging | S | — | US1.1 |
| U3 | t-010-boundary-lint-and-ci | u3-t-010-boundary-lint-and-ci | T-010 | Boundary lint, `pnpm check`, CI workflow, contrast tool | packaging | S | — | US1.1 |
| U4 | cr-011-queue-dedup-reset-and-quiet-env | u4-cr-011-queue-dedup-reset-and-quiet-env | CR-011 | Queue de-duplication, pg-boss reset and quiet dotenv (T-009 follow-ups) | library | M | — | US1.1 |
| U5 | cr-006-worker-auth-users-grant | u5-cr-006-worker-auth-users-grant | CR-006 | Resolve the `rk_worker` → `auth_users` grant contradiction | library | S | yes | US1.1 |
| U6 | cr-012-storyboard-seed-correction | u6-cr-012-storyboard-seed-correction | CR-012 | Storyboard and seed correction (FD-039) | packaging | S | — | — |
| U7 | cr-004-live-region-announcements | u7-cr-004-live-region-announcements | CR-004 | Live-region announcements: decide the language policy, then finish the port | ui | S | — | US12.1 |
| U8 | t-101-better-auth-adapter | u8-t-101-better-auth-adapter | T-101 | Better Auth adapter: email/password, verification, reset, sessions, Actor | library | XL | yes | US3.1, US3.2 |
| U9 | t-102-patient-auth-screens | u9-t-102-patient-auth-screens | T-102 | Patient auth screens: register, sign-in, verify, reset, security, account entry, gates | ui | L | yes | US3.1, US3.2 |
| U10 | t-103-staff-access-and-devices | u10-t-103-staff-access-and-devices | T-103 | Staff access: roles, capabilities, console guard, staff sign-in, device approval, step-up | library | XL | — | US3.2, US11.1 |
| U11 | t-104-identity-module | u11-t-104-identity-module | T-104 | Identity module: personas, thread-scoped anonymous alias, private linkage, audited reveal | library | L | yes | US3.3 |
| U12 | t-105-runtime-configuration | u12-t-105-runtime-configuration | T-105 | Runtime configuration module: versioned bounded settings, apply, rollback, history | library | M | — | US11.1 |
| U13 | t-106-auth-identity-validation | u13-t-106-auth-identity-validation | T-106 | Phase 1 validation: auth, staff access, identity, configuration (cross-vendor) | spec | M | yes | US3.1, US3.2, US3.3, US11.1 |
| U14 | t-201-directory-and-taxonomy-modules | u14-t-201-directory-and-taxonomy-modules | T-201 | Directory and taxonomy modules (queries, repositories, view models) | library | M | — | US4.1, US4.3, US5.3, US6.4 |
| U15 | t-202-doctor-index-and-profile | u15-t-202-doctor-index-and-profile | T-202 | Doctor index and doctor profile pages (port) | ui | L | — | US4.1, US6.4, US4.2 |
| U16 | t-203-facility-and-condition-pages | u16-t-203-facility-and-condition-pages | T-203 | Facility index/profile and condition index/page (port) | ui | L | — | US4.3, US5.3, US6.4 |
| U17 | t-204-provider-submission-claim-field-change | u17-t-204-provider-submission-claim-field-change | T-204 | Provider submission, claim, field change, merge (commands + patient entry points) | library | M | — | US4.2 |
| U18 | t-205-search-module | u18-t-205-search-module | T-205 | Search module (PostgreSQL FTS + trigram + aliases, neutral ranking) | library | XL | — | US5.1, US5.2, US5.3 |
| U19 | t-206-search-page | u19-t-206-search-page | T-206 | Search page, filters, neutral sort, compare tray and sheet (port) | ui | L | — | US5.1, US5.2 |
| U20 | t-207-discover-emergency-about | u20-t-207-discover-emergency-about | T-207 | Discover (home), Emergency, About, Terms and Privacy pages (port) | ui | M | — | US12.1, US5.1, US4.3 |
| U21 | t-301-review-module-core | u21-t-301-review-module-core | T-301 | Review module core: drafts, publish, projection, aggregates | library | XL | — | US6.1, US6.2, US6.4, US3.3, US4.3 |
| U22 | t-302-review-changes-and-tombstones | u22-t-302-review-changes-and-tombstones | T-302 | Review changes: corrections, follow-ups, versioning, tombstones, restore, redaction | library | L | — | US6.2, US6.3 |
| U23 | t-303-evidence-intake | u23-t-303-evidence-intake | T-303 | Evidence intake: streaming upload to quarantine | library | L | yes | US7.1 |
| U24 | t-304-worker-evidence-pipeline | u24-t-304-worker-evidence-pipeline | T-304 | Worker evidence pipeline: validate → scan → sanitise → preview-ready | service | L | yes | US7.1 |
| U25 | t-305-privacy-preview-redaction-publish | u25-t-305-privacy-preview-redaction-publish | T-305 | Privacy preview, manual redaction, author confirmation, publication of derivatives | library | M | yes | US7.2 |
| U26 | t-306-composer-wizard | u26-t-306-composer-wizard | T-306 | Composer wizard port (`/write`) | ui | XL | — | US6.1, US6.2, US7.1, US3.3, US5.3 |
| U27 | t-307-experience-page-and-index | u27-t-307-experience-page-and-index | T-307 | Experience page and experiences index port (`/experiences`, `/experiences/{publicId}`) | ui | L | — | US6.2, US6.3, US6.4, US3.3, US10.2 |
| U28 | t-308-evidence-viewer | u28-t-308-evidence-viewer | T-308 | Processed-document viewer and evidence sections port | ui | M | yes | US7.2, US7.1 |
| U29 | t-309-retention-holds-custody | u29-t-309-retention-holds-custody | T-309 | Retention policy, expiry job, legal holds, previewed bulk action, custody log, demo clock | library | L | yes | US7.3 |
| U30 | t-401-community-module | u30-t-401-community-module | T-401 | Community module: comments, replies, mentions, reactions, blocks | library | L | — | US8.1, US8.2 |
| U31 | t-402-discussion-ui | u31-t-402-discussion-ui | T-402 | Discussion UI on the experience page | ui | M | — | US8.1, US8.2 |
| U32 | t-403-reports-and-thresholds | u32-t-403-reports-and-thresholds | T-403 | Reports, thresholds and the temporary hide | library | L | — | US9.1 |
| U33 | t-404-moderation-module | u33-t-404-moderation-module | T-404 | Moderation module: queue, decisions, appeals, enforcement, bulk | library | XL | yes | US9.2, US9.3, US11.2 |
| U34 | t-405-notifications | u34-t-405-notifications | T-405 | Notifications: outbox relay, in-app rows, essential email, patient page | library | L | — | US10.1 |
| U35 | t-406-staff-shell-and-queue | u35-t-406-staff-shell-and-queue | T-406 | Staff console shell and queue (Chart Tray port) | ui | XL | — | US9.2, US9.3, US11.2 |
| U36 | t-407-staff-evidence-and-providers | u36-t-407-staff-evidence-and-providers | T-407 | Staff evidence quarantine and providers views | ui | L | yes | US7.3, US4.2, US11.2 |
| U37 | t-408-staff-notifications-and-config | u37-t-408-staff-notifications-and-config | T-408 | Staff notifications triage and versioned configuration views | ui | L | — | US10.1, US11.1, US11.2 |
| U38 | t-409-personal-workspace | u38-t-409-personal-workspace | T-409 | Personal workspace, saved, public profile | ui | L | — | US10.2, US10.3, US6.3, US9.3 |
| U39 | t-410-export-and-deletion | u39-t-410-export-and-deletion | T-410 | Account data export and orchestrated deletion | library | L | yes | US10.3, US6.3, US7.3 |
| U40 | t-501-pwa | u40-t-501-pwa | T-501 | PWA: manifest, icons, safe shell caching, sign-out purge | ui | M | — | US12.2, US12.1 |
| U41 | t-502-security-hardening | u41-t-502-security-hardening | T-502 | Security hardening: CSP, origin checks, rate limiting, upload limits, cookies, log scrubbing | library | L | — | US12.3, US3.1, US7.1, US12.4 |
| U42 | t-503-parity-accessibility-e2e | u42-t-503-parity-accessibility-e2e | T-503 | Bilingual parity, accessibility and viewport E2E | spec | XL | — | US2.3, US12.1, US2.2 |
| U43 | t-504-demo-composition | u43-t-504-demo-composition | T-504 | Demo composition: one-command up, reset, demo clock, storyboard walk-through | packaging | M | — | US2.1, US1.1 |
| U44 | t-505-final-validation-and-docs | u44-t-505-final-validation-and-docs | T-505 | Final validation matrix and documentation close-out | spec | M | — | US2.3, US1.1 |
| U45 | t-011-patient-design-and-motion-system | u45-t-011-patient-design-and-motion-system | T-011 | Patient design and motion system (FD-091): tokens, restyled shell, CSS-first motion, reduced motion, CSS motion check | ui | XL | — | US2.4, US2.3 |

Size: S ≤ 2 h, M ≤ 4 h, L ≤ 6 h, XL > 6 h of agent time, from the task file's estimate. High risk (auth, identity, evidence, moderation, retention, deletion) runs with collaborators on, 3–5 adversarial tests and the owner's written sign-off (team practices).

## Unit details

### U1 — Make `packages/database` importable from `apps/web` under Turbopack

- **Source:** CR-009 (`docs/implementation/tasks/CR-009-database-extensionless-imports.md`)
- **Kind:** library · **Size:** S (1–2 h agent (mechanical, but touches most files in the package)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Rewrites every import in packages/database/src; nothing else may touch that package in the same Bolt.
- **Stories:** — (enabling Unit; no story of its own)
- **Depends on:** the merged baseline only

### U2 — Make `pnpm test:int` deterministic (reset once per project, fail fast on lock contention)

- **Source:** CR-007 (`docs/implementation/tasks/CR-007-int-test-reset-determinism.md`)
- **Kind:** packaging · **Size:** S (1–2 h agent) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Integration-test reset determinism (the test:int hang); FD-043.
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U3 — Boundary lint, `pnpm check`, CI workflow, contrast tool

- **Source:** T-010 (`docs/implementation/tasks/T-010-boundary-lint-and-ci.md`)
- **Kind:** packaging · **Size:** S (1.5–2 h agent; validation 0.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Boundary lint, format check, 80% coverage floor and CI (D10, FD-040 test-support seed edge, ISS-205).
- **Stories:** US1.1
- **Depends on:** U1 (CR-009), U2 (CR-007)

### U4 — Queue de-duplication, pg-boss reset and quiet dotenv (T-009 follow-ups)

- **Source:** CR-011 (`docs/implementation/tasks/CR-011-queue-dedup-reset-and-quiet-env.md`)
- **Kind:** library · **Size:** M (1.5–2.5 h agent; validation 0.5–1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Transactional outbox relay (FD-038) and queue follow-ups ISS-144, ISS-185, ISS-201..203; due before the first real job handler.
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U5 — Resolve the `rk_worker` → `auth_users` grant contradiction

- **Source:** CR-006 (`docs/implementation/tasks/CR-006-worker-auth-users-grant.md`)
- **Kind:** library · **Size:** S (0.5–1 h agent once the founder has decided (the decision is the long pole)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Revoke rk_worker's auth_users grant in a forward-only migration (FD-041) and review the other worker grants (FD-050). The mail.send handler is T-101's, not T-405's (FD-071).
- **Decision changes:** FD-050, FD-071, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U6 — Storyboard and seed correction (FD-039)

- **Source:** CR-012 (`docs/implementation/tasks/CR-012-storyboard-seed-correction.md`)
- **Kind:** packaging · **Size:** S (1–2 h agent; validation 0.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Correct the storyboard, the seed and the T-106/T-401/T-409 acceptance rows to match the prototype data (FD-039, FD-074): ISS-158, ISS-176, ISS-221.
- **Decision changes:** FD-039, written into the task file with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** — (enabling Unit; no story of its own)
- **Depends on:** U1 (CR-009)

### U7 — Live-region announcements: decide the language policy, then finish the port

- **Source:** CR-004 (`docs/implementation/tasks/CR-004-live-region-announcements.md`)
- **Kind:** ui · **Size:** S (≤ 1 h agent once the founder answers the question below) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Localized live-region announcements for the theme and language toggles (FD-042); Bengali copy flagged for the owner's review with ISS-050.
- **Stories:** US12.1
- **Depends on:** the merged baseline only

### U8 — Better Auth adapter: email/password, verification, reset, sessions, Actor

- **Source:** T-101 (`docs/implementation/tasks/T-101-better-auth-adapter.md`)
- **Kind:** library · **Size:** XL (5–7 h agent; validation 2 h (plus T-106)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Builds the worker's mail.send handler, reading the recipient from email_deliveries.to_email_enc (FD-071, FD-041). Builds the FD-058 progressive delay and severe-activity email through the ConfigProvider port with the FD-063 values as defaults; the in-app notice is an outbox event T-405 consumes (FD-072). FD-059 self-service reset only; creates the ConfigProvider interface if it is still missing, adds the FD-058 keys with their defaults to the contracts config schema and wires a defaults-only provider until T-105 replaces it. ISS-112, ISS-223.
- **Decision changes:** FD-056, FD-057, FD-058, FD-059, FD-063, FD-071, FD-072, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US3.1, US3.2
- **Depends on:** U5 (CR-006), U4 (CR-011), U3 (T-010)

### U9 — Patient auth screens: register, sign-in, verify, reset, security, account entry, gates

- **Source:** T-102 (`docs/implementation/tasks/T-102-patient-auth-screens.md`)
- **Kind:** ui · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Gated on the D-001 auth-screen review (FD-053). FD-057: session list and sign out everywhere only.
- **Decision changes:** FD-053, FD-057, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US3.1, US3.2
- **Depends on:** U8 (T-101), U3 (T-010), U45 (T-011)

### U10 — Staff access: roles, capabilities, console guard, staff sign-in, device approval, step-up

- **Source:** T-103 (`docs/implementation/tasks/T-103-staff-access-and-devices.md`)
- **Kind:** library · **Size:** XL (5–7 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Gated on the D-001 auth-screen review (FD-053). Retention bulk stays super_admin only (FD-051).
- **Decision changes:** FD-051, FD-053, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US3.2, US11.1
- **Depends on:** U8 (T-101), U3 (T-010)

### U11 — Identity module: personas, thread-scoped anonymous alias, private linkage, audited reveal

- **Source:** T-104 (`docs/implementation/tasks/T-104-identity-module.md`)
- **Kind:** library · **Size:** L (4–6 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Identity personas, thread aliases, audited reveal (FD-015, FD-016, FD-022); RevealTarget returns persona or restricted account id.
- **Stories:** US3.3
- **Depends on:** U8 (T-101), U10 (T-103), U3 (T-010)

### U12 — Runtime configuration module: versioned bounded settings, apply, rollback, history

- **Source:** T-105 (`docs/implementation/tasks/T-105-runtime-configuration.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Versioned runtime configuration; retention periods are not config values (FD-068); registers the FD-063 brute-force settings T-101 already reads with defaults (FD-072).
- **Decision changes:** FD-063, FD-068, FD-072, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US11.1
- **Depends on:** U10 (T-103), U3 (T-010)

### U13 — Phase 1 validation: auth, staff access, identity, configuration (cross-vendor)

- **Source:** T-106 (`docs/implementation/tasks/T-106-auth-identity-validation.md`)
- **Kind:** spec · **Size:** M (3–4 h agent; human 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Auth and identity negative-matrix validation; acceptance text uses the corrected seed (FD-039).
- **Stories:** US3.1, US3.2, US3.3, US11.1
- **Depends on:** U8 (T-101), U9 (T-102), U10 (T-103), U11 (T-104), U12 (T-105), U6 (CR-012)

### U14 — Directory and taxonomy modules (queries, repositories, view models)

- **Source:** T-201 (`docs/implementation/tasks/T-201-directory-and-taxonomy-modules.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Directory and taxonomy modules; ISS-222.
- **Decision changes:** FD-067, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US4.1, US4.3, US5.3, US6.4
- **Depends on:** U3 (T-010)

### U15 — Doctor index and doctor profile pages (port)

- **Source:** T-202 (`docs/implementation/tasks/T-202-doctor-index-and-profile.md`)
- **Kind:** ui · **Size:** L (4–5 h agent; validation 1–1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US4.1, US6.4, US4.2
- **Depends on:** U14 (T-201), U3 (T-010), U45 (T-011)

### U16 — Facility index/profile and condition index/page (port)

- **Source:** T-203 (`docs/implementation/tasks/T-203-facility-and-condition-pages.md`)
- **Kind:** ui · **Size:** L (4–5 h agent; validation 1–1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Facility feedback never enters doctor aggregates (hard rule).
- **Stories:** US4.3, US5.3, US6.4
- **Depends on:** U14 (T-201), U15 (T-202), U3 (T-010), U45 (T-011)

### U17 — Provider submission, claim, field change, merge (commands + patient entry points)

- **Source:** T-204 (`docs/implementation/tasks/T-204-provider-submission-claim-field-change.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Staff-decided claims (FD-060); protected fields include degrees and specialty (FD-061); builds the Directory de-identify command account deletion calls (FD-069).
- **Decision changes:** FD-060, FD-061, FD-069, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US4.2
- **Depends on:** U14 (T-201), U8 (T-101), U10 (T-103), U12 (T-105), U3 (T-010)

### U18 — Search module (PostgreSQL FTS + trigram + aliases, neutral ranking)

- **Source:** T-205 (`docs/implementation/tasks/T-205-search-module.md`)
- **Kind:** library · **Size:** XL (5–7 h agent; validation 1.5–2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Search refresh job runs on the transactional relay.
- **Stories:** US5.1, US5.2, US5.3
- **Depends on:** U14 (T-201), U17 (T-204), U3 (T-010), U4 (CR-011)

### U19 — Search page, filters, neutral sort, compare tray and sheet (port)

- **Source:** T-206 (`docs/implementation/tasks/T-206-search-page.md`)
- **Kind:** ui · **Size:** L (4–6 h agent; validation 1–1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US5.1, US5.2
- **Depends on:** U18 (T-205), U15 (T-202), U16 (T-203), U3 (T-010), U45 (T-011)

### U20 — Discover (home), Emergency, About, Terms and Privacy pages (port)

- **Source:** T-207 (`docs/implementation/tasks/T-207-discover-emergency-about.md`)
- **Kind:** ui · **Size:** M (2–3 h agent; validation 0.5–1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Half B only (Discover home); Half A is merged. Carries ISS-151, ISS-152, ISS-120.
- **Stories:** US12.1, US5.1, US4.3
- **Depends on:** U15 (T-202), U16 (T-203), U19 (T-206), U14 (T-201), U3 (T-010), U45 (T-011)

### U21 — Review module core: drafts, publish, projection, aggregates

- **Source:** T-301 (`docs/implementation/tasks/T-301-review-module-core.md`)
- **Kind:** library · **Size:** XL (5–7 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US6.1, US6.2, US6.4, US3.3, US4.3
- **Depends on:** U11 (T-104), U12 (T-105), U14 (T-201), U3 (T-010)

### U22 — Review changes: corrections, follow-ups, versioning, tombstones, restore, redaction

- **Source:** T-302 (`docs/implementation/tasks/T-302-review-changes-and-tombstones.md`)
- **Kind:** library · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Queues the moderation email for hide and restore outcomes through T-405 in the web tier (FD-070, FD-075).
- **Decision changes:** FD-049, FD-070, FD-073, FD-075, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US6.2, US6.3
- **Depends on:** U21 (T-301), U34 (T-405), U3 (T-010)

### U23 — Evidence intake: streaming upload to quarantine

- **Source:** T-303 (`docs/implementation/tasks/T-303-evidence-intake.md`)
- **Kind:** library · **Size:** L (4–5 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. JPEG and PNG only (FD-036).
- **Stories:** US7.1
- **Depends on:** U8 (T-101), U3 (T-010)

### U24 — Worker evidence pipeline: validate → scan → sanitise → preview-ready

- **Source:** T-304 (`docs/implementation/tasks/T-304-worker-evidence-pipeline.md`)
- **Kind:** service · **Size:** L (3–5 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Worker image pipeline; fail-closed ClamAV; worker-started notifications are in-app only (FD-070). ISS-139, ISS-181, ISS-182.
- **Decision changes:** FD-070, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US7.1
- **Depends on:** U23 (T-303), U3 (T-010), U4 (CR-011)

### U25 — Privacy preview, manual redaction, author confirmation, publication of derivatives

- **Source:** T-305 (`docs/implementation/tasks/T-305-privacy-preview-redaction-publish.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US7.2
- **Depends on:** U24 (T-304), U3 (T-010)

### U26 — Composer wizard port (`/write`)

- **Source:** T-306 (`docs/implementation/tasks/T-306-composer-wizard.md`)
- **Kind:** ui · **Size:** XL (6–8 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US6.1, US6.2, US7.1, US3.3, US5.3
- **Depends on:** U21 (T-301), U23 (T-303), U9 (T-102), U17 (T-204), U14 (T-201), U3 (T-010), U45 (T-011)

### U27 — Experience page and experiences index port (`/experiences`, `/experiences/{publicId}`)

- **Source:** T-307 (`docs/implementation/tasks/T-307-experience-page-and-index.md`)
- **Kind:** ui · **Size:** L (5–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US6.2, US6.3, US6.4, US3.3, US10.2
- **Depends on:** U22 (T-302), U15 (T-202), U16 (T-203), U9 (T-102), U3 (T-010), U45 (T-011)

### U28 — Processed-document viewer and evidence sections port

- **Source:** T-308 (`docs/implementation/tasks/T-308-evidence-viewer.md`)
- **Kind:** ui · **Size:** M (3–4 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US7.2, US7.1
- **Depends on:** U25 (T-305), U27 (T-307), U3 (T-010), U45 (T-011)

### U29 — Retention policy, expiry job, legal holds, previewed bulk action, custody log, demo clock

- **Source:** T-309 (`docs/implementation/tasks/T-309-retention-holds-custody.md`)
- **Kind:** library · **Size:** L (5–6 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Retention owns policies, holds and bulk actions (FD-064); retention_policies is the only source (FD-068); builds the RetentionSubject hold checks for evidence, reviews and comments and wires them into the review and community delete paths (FD-073). ISS-141.
- **Decision changes:** FD-064, FD-068, FD-073, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US7.3
- **Depends on:** U24 (T-304), U12 (T-105), U22 (T-302), U30 (T-401), U3 (T-010), U4 (CR-011)

### U30 — Community module: comments, replies, mentions, reactions, blocks

- **Source:** T-401 (`docs/implementation/tasks/T-401-community-module.md`)
- **Kind:** library · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Comments take Like and Dislike (FD-062); the comment hold check arrives with T-309 (FD-073); queues discussion email through T-405 in the web tier (FD-070, FD-075).
- **Decision changes:** FD-046, FD-062, FD-070, FD-073, FD-075, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US8.1, US8.2
- **Depends on:** U22 (T-302), U11 (T-104), U12 (T-105), U34 (T-405), U3 (T-010), U6 (CR-012)

### U31 — Discussion UI on the experience page

- **Source:** T-402 (`docs/implementation/tasks/T-402-discussion-ui.md`)
- **Kind:** ui · **Size:** M (3–4 h agent; validation 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US8.1, US8.2
- **Depends on:** U30 (T-401), U27 (T-307), U9 (T-102), U3 (T-010), U45 (T-011)

### U32 — Reports, thresholds and the temporary hide

- **Source:** T-403 (`docs/implementation/tasks/T-403-reports-and-thresholds.md`)
- **Kind:** library · **Size:** L (4–6 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Queues moderation email for its outcomes through T-405 in the web tier (FD-070, FD-075); the FD-069 de-identify command may read reporter_account_id.
- **Decision changes:** FD-069, FD-070, FD-075, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US9.1
- **Depends on:** U30 (T-401), U22 (T-302), U12 (T-105), U11 (T-104), U34 (T-405), U3 (T-010)

### U33 — Moderation module: queue, decisions, appeals, enforcement, bulk

- **Source:** T-404 (`docs/implementation/tasks/T-404-moderation-module.md`)
- **Kind:** library · **Size:** XL (6–8 h agent; validation 2.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Builds the Moderation de-identify command for the reports and appeals an account filed, which account deletion calls after T-410 has checked holds (FD-069, ADR-006); T-410 owns the participant file. Queues moderation email for decisions and appeals through T-405 in the web tier (FD-070, FD-075).
- **Decision changes:** FD-069, FD-070, FD-075, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US9.2, US9.3, US11.2
- **Depends on:** U32 (T-403), U11 (T-104), U10 (T-103), U12 (T-105), U22 (T-302), U25 (T-305), U34 (T-405), U3 (T-010)

### U34 — Notifications: outbox relay, in-app rows, essential email, patient page

- **Source:** T-405 (`docs/implementation/tasks/T-405-notifications.md`)
- **Kind:** library · **Size:** L (4–5 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Email is queued from the web tier only; worker deliver is in-app only (FD-070); optional email categories (FD-047); AC10.1.5 applies to the discussion and moderation categories only, as FD-070 makes the evidence category inert. Extends T-101's mail.send handler (FD-071) and consumes its severe-activity event for the in-app notice (FD-072). ISS-206.
- **Decision changes:** FD-047, FD-052, FD-065, FD-070, FD-071, FD-072, FD-075, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US10.1
- **Depends on:** U8 (T-101), U9 (T-102), U3 (T-010), U4 (CR-011), U5 (CR-006)

### U35 — Staff console shell and queue (Chart Tray port)

- **Source:** T-406 (`docs/implementation/tasks/T-406-staff-shell-and-queue.md`)
- **Kind:** ui · **Size:** XL (6–8 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US9.2, US9.3, US11.2
- **Depends on:** U33 (T-404), U10 (T-103), U34 (T-405), U3 (T-010)

### U36 — Staff evidence quarantine and providers views

- **Source:** T-407 (`docs/implementation/tasks/T-407-staff-evidence-and-providers.md`)
- **Kind:** ui · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US7.3, US4.2, US11.2
- **Depends on:** U35 (T-406), U29 (T-309), U17 (T-204), U25 (T-305), U3 (T-010)

### U37 — Staff notifications triage and versioned configuration views

- **Source:** T-408 (`docs/implementation/tasks/T-408-staff-notifications-and-config.md`)
- **Kind:** ui · **Size:** L (4–5 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Beta metrics are own-table counts (FD-066).
- **Decision changes:** FD-066, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US10.1, US11.1, US11.2
- **Depends on:** U12 (T-105), U34 (T-405), U35 (T-406), U10 (T-103), U3 (T-010)

### U38 — Personal workspace, saved, public profile

- **Source:** T-409 (`docs/implementation/tasks/T-409-personal-workspace.md`)
- **Kind:** ui · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US10.2, US10.3, US6.3, US9.3
- **Depends on:** U22 (T-302), U30 (T-401), U11 (T-104), U9 (T-102), U33 (T-404), U3 (T-010), U6 (CR-012), U45 (T-011)

### U39 — Account data export and orchestrated deletion

- **Source:** T-410 (`docs/implementation/tasks/T-410-export-and-deletion.md`)
- **Kind:** library · **Size:** L (5–6 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. dataRequest.created routed by kind (FD-052, ISS-188); adds the Directory and Moderation participants, which call the de-identify commands of T-204 and T-404 (FD-069); the worker gets no privilege on auth_users (FD-041) and sends no email (FD-070).
- **Decision changes:** FD-041, FD-052, FD-069, FD-070, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US10.3, US6.3, US7.3
- **Depends on:** U29 (T-309), U30 (T-401), U22 (T-302), U25 (T-305), U11 (T-104), U10 (T-103), U34 (T-405), U17 (T-204), U33 (T-404), U18 (T-205), U3 (T-010), U4 (CR-011)

### U40 — PWA: manifest, icons, safe shell caching, sign-out purge

- **Source:** T-501 (`docs/implementation/tasks/T-501-pwa.md`)
- **Kind:** ui · **Size:** M (2–3 h agent; validation 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file.
- **Stories:** US12.2, US12.1
- **Depends on:** U9 (T-102), U20 (T-207), U3 (T-010), U45 (T-011)

### U41 — Security hardening: CSP, origin checks, rate limiting, upload limits, cookies, log scrubbing

- **Source:** T-502 (`docs/implementation/tasks/T-502-security-hardening.md`)
- **Kind:** library · **Size:** L (4–5 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Builds no FD-058 code: adds adversarial tests of the progressive delay and severe-activity notice T-101 builds (FD-072); the US12.4 no-analytics guard. Kind library, as it carries runtime logic (CSP, origin checks, rate limits, log scrubbing).
- **Decision changes:** FD-072, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US12.3, US3.1, US7.1, US12.4
- **Depends on:** U8 (T-101), U10 (T-103), U23 (T-303), U30 (T-401), U32 (T-403), U34 (T-405), U39 (T-410), U40 (T-501), U3 (T-010)

### U42 — Bilingual parity, accessibility and viewport E2E

- **Source:** T-503 (`docs/implementation/tasks/T-503-parity-accessibility-e2e.md`)
- **Kind:** spec · **Size:** XL (6–8 h agent; validation 2 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Also verifies the US2.2 guard (concept 04b plain CSS only); its live-region spec asserts what CR-004 delivers.
- **Stories:** US2.3, US12.1, US2.2
- **Depends on:** U7 (CR-004), U9 (T-102), U15 (T-202), U16 (T-203), U19 (T-206), U20 (T-207), U26 (T-306), U27 (T-307), U28 (T-308), U31 (T-402), U35 (T-406), U36 (T-407), U37 (T-408), U38 (T-409), U40 (T-501), U41 (T-502), U3 (T-010)

### U43 — Demo composition: one-command up, reset, demo clock, storyboard walk-through

- **Source:** T-504 (`docs/implementation/tasks/T-504-demo-composition.md`)
- **Kind:** packaging · **Size:** M (3–4 h agent; validation 1.5 h (the validator repeats the walk-through from a clean clone)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Its task file depends on every task T-001..T-410, which includes the T-106 validation Unit.
- **Stories:** US2.1, US1.1
- **Depends on:** U39 (T-410), U40 (T-501), U41 (T-502), U42 (T-503), U3 (T-010), U13 (T-106)

### U44 — Final validation matrix and documentation close-out

- **Source:** T-505 (`docs/implementation/tasks/T-505-final-validation-and-docs.md`)
- **Kind:** spec · **Size:** M (3–4 h agent; founder review 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Final validation and docs.
- **Stories:** US2.3, US1.1
- **Depends on:** U42 (T-503), U43 (T-504), U41 (T-502)

### U45 — Patient design and motion system (FD-091)

- **Source:** T-011 (`docs/implementation/tasks/T-011-patient-design-and-motion-system.md`), new on 2026-10-27
- **Kind:** ui · **Size:** XL (5–7 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Replaces the 04b look of the patient side with the FD-091 "Warm Paper, Soft Depth" tokens and a CSS-first motion system (React 19 `<ViewTransition>`, `@starting-style`, scroll reveals inside `@supports`, reduced-motion overrides including `::view-transition-*`), with no animation library (FD-032), and adds the `check:motion` CSS check to `pnpm check`. The staff console keeps Chart Tray.
- **Decision changes:** FD-091 (written into its task file from the start)
- **Stories:** US2.4, US2.3
- **Depends on:** U3 (T-010)

## Task headers to correct

Requirements Analysis found task headers that cite old matrix meanings (T-302, T-303, T-304, T-305, T-308, T-309, T-404, T-406). Each of those Units corrects its own header as part of its Code Generation; the meanings are in `requirements.md`.

## Decision changes per Unit

The owner decisions FD-039 and FD-045..FD-075 that change a Unit's scope are written into that Unit's task file (FD-074): an `## Amendments — owner decisions (FD-045..FD-075)` section after the header table, in-place corrections marked `(FD-0nn)`, and new acceptance rows whose first cell starts `FD-0nn:`. Build and Test executes those rows with the rest of the table. CR-012 is a new task file written from FD-039. Decisions that change no Unit's scope (FD-045, FD-048, FD-054, FD-055) are not listed; FD-067 (ports) is pinned in Contract Design.

| Unit | Decisions | Task text corrected because it contradicted a decision |
|---|---|---|
| U5 (CR-006) | FD-050, FD-071 | it assigned mail.send to T-405; T-101 builds it (FD-071) |
| U6 (CR-012) | FD-039 | — |
| U8 (T-101) | FD-056, FD-057, FD-058, FD-059, FD-063, FD-071, FD-072 | — |
| U9 (T-102) | FD-053, FD-057 | — |
| U10 (T-103) | FD-051, FD-053 | — |
| U12 (T-105) | FD-063, FD-068, FD-072 | — |
| U14 (T-201) | FD-067 | Directory and Taxonomy queries read the review repository directly; they read through the ProviderExperience and ConditionStats ports (FD-067) |
| U17 (T-204) | FD-060, FD-061, FD-069 | — |
| U22 (T-302) | FD-049, FD-070, FD-073, FD-075 | — |
| U32 (T-403) | FD-069, FD-070, FD-075 | — |
| U24 (T-304) | FD-070 | — |
| U29 (T-309) | FD-064, FD-068, FD-073 | holds covered evidence only; reviews and comments too (FD-064, FD-073) |
| U30 (T-401) | FD-046, FD-062, FD-070, FD-073, FD-075 | comments were like-only; they take Like and Dislike (FD-062) |
| U33 (T-404) | FD-069, FD-070, FD-075 | — |
| U34 (T-405) | FD-047, FD-052, FD-065, FD-070, FD-071, FD-072, FD-075 | the worker queued email, including the export-ready email; the worker is in-app only (FD-070) |
| U37 (T-408) | FD-066 | — |
| U39 (T-410) | FD-041, FD-052, FD-069, FD-070 | step 2 gave the worker DELETE on auth_users (against FD-041); removed, and how the auth user is removed is an open point for Contract Design |
| U41 (T-502) | FD-072 | it held the FD-058 delay checks; T-101 builds them and T-502 tests them (FD-072) |
| U42 (T-503) | FD-091 | its "no gate" for Lighthouse is overridden for the `/en` and `/bn` home, search and experience pages: NFR13 gates LCP ≤ 2.5 s, INP ≤ 200 ms (measured with a Lighthouse timespan or a Playwright interaction trace) and CLS ≤ 0.1 on a throttled mid-range Android profile, and it runs `check:motion` |
| U45 (T-011) | FD-091 | new Unit; written with the decision |

## Deletion and export participants (ADR-006)

ADR-006 needs every participating module to offer an export and a delete-or-de-identify command, inside that module. T-410 owns the data-request module and, inside each participating module, one owner-scoped export query (`queries/for-export.ts`) and one thin `deletion-participant.ts`: account, identity, review, community, evidence, notification, search, and (FD-069) directory and moderation. Each participant calls the module's own command where the module's Unit builds one; otherwise T-410 writes the step in that participant file, inside the module, and never touches another module's tables.

| Module | Delete or de-identify step | Notes |
|---|---|---|
| account | written by U39 (T-410) | the auth user is removed without any worker privilege on auth_users (FD-041); the mechanism is an open point for Contract Design |
| identity | de-identify built in U11 (T-104) | persona links deleted; personas keep their snapshots |
| review | delete and tombstone built in U22 (T-302) | holds checked through T-309 (FD-073) |
| community | delete and tombstone built in U30 (T-401) | holds checked through T-309 (FD-073) |
| evidence | `evidence.remove` built in U25 (T-305) | originals removed unless held |
| notification | written by U39 (T-410) | notifications, preferences and email deliveries |
| search | written by U39 (T-410) | documents removed through the search module built in T-205 |
| directory | de-identify built in U17 (T-204) | submissions, claims and field changes; called after T-410 checks holds (FD-069) |
| moderation | de-identify built in U33 (T-404) | reports and appeals; called after T-410 checks holds; the reporter still reads "restricted" (FD-069) |

## Open points carried forward

The Domain Design open points that were not settled there, each with the place that resolves it.

| Open point (Domain Design) | Resolved in |
|---|---|
| Port signatures for the FD-067 cycle breaks (OperationalCounts, RecipientDirectory, RevealContact, RevealTarget, RetentionSubject, ConditionStats, ProviderExperience, ProfileMergeParticipant, DiscussionPresence, ModerationSignals) | Contract Design; each port is built by the Unit of the implementing module |
| Recipients in outbox payloads: publishing commands resolve the account ids to notify in the web tier and put them in the payload; notification.deliver takes them from there and never reads persona links | Contract Design adds the fields; filled in U22 (T-302), U30 (T-401), U32 (T-403) and U33 (T-404), read in U34 (T-405) |
| config.applied recorded only in Administration's audit stream (no outbox row) | Contract Design (confirm); built in U12 (T-105) |
| Evidence-to-draft link: evidence_items has no draft column, and publish must check the items belong to the draft and its author | U23 (T-303) Functional Design; the publish check in U21 (T-301) |
| Search evidence filters: presence read from Evidence or denormalised into search_documents | Contract Design; built in U18 (T-205) |
| Worker boundary versus data.delete: per-module step commands the worker may import, and how the auth user is removed (FD-041) | Contract Design; built in U39 (T-410) |
| Audit expiry and legal holds: fn_expire_audit needs the held targets as a parameter (AC7.3.5), and Administration owns audit_events (FD-065), so Retention passes the held targets to Administration's audit expiry instead of running the function itself | Contract Design; built in U29 (T-309) |
| FD-069 de-identify: submitted_by_account_id, claimant_account_id and proposed_by_account_id are NOT NULL in the directory schema, and whether doctors.claimed_by_account_id is cleared too | Contract Design; built in U17 (T-204) (with any migration it needs) |
| FD-073: an author's delete of a held review or comment is refused, or hides it publicly while the data stays (AD-17) | Contract Design; built in U29 (T-309) |
| FD-067 and ADR-010: profile merge re-points reviews and unblocks drafts through Directory's ProfileMergeParticipant port, which Review implements, instead of T-204 writing review rows | Contract Design; built in U17 (T-204), whose owned paths change accordingly |
| FD-069 de-identify in Moderation: reports.reporter_account_id and appeals.appellant_account_id are NOT NULL with a foreign key, and rk_worker has no privilege on reporter_account_id, so the step may need a migration and cannot run in the worker as granted today | Contract Design; built in U33 (T-404) and U39 (T-410) |
| Legal holds on de-identified rows: legal_holds.target_kind covers review, facility_review, comment, evidence and profile only, so the FD-069 rule that holds still apply cannot reach reports, appeals, submissions, claims or field changes; and how a held review's persona link is treated when identity links are deleted | Contract Design; built in U29 (T-309) and U39 (T-410) |
| Web-tier email queueing (FD-070, FD-075): the commands that publish discussion and moderation events (T-302, T-401, T-403, T-404) call T-405's queueing directly and come after T-405 | Contract Design names the call; built in U34 (T-405), called in U22 (T-302), U30 (T-401), U32 (T-403) and U33 (T-404) |
| Audit ownership (FD-065): T-404 owns the moderation case timeline query over audit_events, which Administration owns | Contract Design; built in U33 (T-404) |
| Beta metrics: open and closed reports counted per report row or per case; the severe sign-in notice's message key; sign-in counter address normalisation | Contract Design; built in U37 (T-408), U8 (T-101) and U41 (T-502) |
| CR-006: its planned migration 0006_revoke_worker_auth_users.sql collides with the existing 0006_pgboss_grants.sql, and rk_worker's SELECT on account_preferences is not in FD-050's list | U5 (CR-006) (next free migration number; the owner rules on the extra grant in its FD-050 review) |
| Review set-state.ts: T-302 builds review.setState and T-403 extends the same file for threshold hides. One email per outcome: the setState call queues the hide or restore email for every caller, and report.file, moderation.decide and moderation.restore never queue a second one (moderation.decide queues case.decided only for actions that do not run setState) | U22 (T-302), U32 (T-403) and U33 (T-404); Contract Design names the call |
| Email for an author's own restore of a deleted review: T-405's routing table sends review.restored as moderation email, which would also cover the author's own restore | Contract Design; built in U22 (T-302) and U34 (T-405) |
| apps/web/src/server/container.ts does not exist on main yet; the first Unit that needs it (T-101, for the defaults-only ConfigProvider) creates it | U8 (T-101) |
| Repeat-episode flag (AC6.1.4): Moderation opens the case in the worker (extra grants) or Review stores the flag | Contract Design; built in U32 (T-403) |
| Schema gaps: AC10.3.4 optional profile details and AC10.3.6 feedback fields (Account) | U38 (T-409) (profile details) and U8 (T-101) (feedback), in their Functional Design |
| Schema gaps: AC5.3.4 and AC11.1.5 tag-group rename and reorder (fixed enum), and the suggested-term flag (Taxonomy) | U14 (T-201) Functional Design |
| Schema gaps: AC6.4.4 ineligible marking and AC6.4.5 summary freeze (Review, Moderation) | U33 (T-404) Functional Design, with U22 (T-302) |
| FD-061 protected fields widen to degrees and specialty (directory.proposeFieldChange) | Contract Design; built in U17 (T-204) |
| FD-070 follow-ups: the export-ready email is dropped or queued from the web tier; email_deliveries.category needs a discussion value | Contract Design; built in U34 (T-405) and U39 (T-410) |
| FD-068: the retention block in the runtime configuration is a read-only mirror or is dropped | Contract Design; built in U12 (T-105) and U29 (T-309) |
| FD-072: the severe-activity outbox event and the brute-force setting keys are named | Contract Design; built in U8 (T-101), U12 (T-105) and U34 (T-405) |

## Documentation follow-ups

- `02-data-model.md` §7 still lists `retention_policies`, `legal_holds` and `retention_bulk_actions` under Evidence; their owner is Retention (FD-064, ADR-002). U29 (T-309) updates the ownership note in its Code Generation.
- `02-data-model.md` §8 still says comments accept `like` only; FD-062 retires that rule. U30 (T-401) updates the note in its Code Generation.
- `02-data-model.md` §11 still describes a retention block in the configuration values; FD-068 makes `retention_policies` the only source. U12 (T-105) updates the note once Contract Design decides mirror or drop.
