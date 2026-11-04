# Units of work — RogiKotha demo build

Revision of 2026-11-04 for FD-105: release 1 is the backlog's R1 (`docs/planning/08-product-backlog.md`, "R1 — Public contribution core") plus simple comments, built as 10 active Units, in parallel where they do not collide (FD-094). Unit IDs are frozen (project.md Corrections), so no ID is renumbered or reused:

- **Merged on `main` (9):** U1–U7, U8 T-101 and U45 T-011. They are kept exactly as they were and are the baseline the active Units build on, together with the earlier merged work (T-001..T-009, T-207 Half A, D-001, CR-002/003/005/008/010) and the demo slice (FD-099, FD-100, FD-101).
- **Active in release 1 (10):** U9 T-102, U11 T-104 (narrowed), U20 T-207, U22 T-302 (narrowed), U41 T-502 (narrowed), and five new Units that each combine several tasks: U46 directory, U47 reviews, U48 evidence, U49 comments and U50 release check.
- **Merged into a new Unit (13):** U14, U15, U16 into U46; U21, U26, U27 into U47; U23, U24 into U48; U30, U31 into U49; U42, U43, U44 into U50. Their task files remain the specification of the parts they bring into the new Unit.
- **Deferred to release 2 (18):** U10, U12, U13, U17, U18, U19, U25, U28, U29, U32, U33, U34, U35, U36, U37, U38, U39, U40. They keep their IDs and task files; the order of work is Delivery Planning's decision.

Each active Unit keeps the task file(s) in `docs/implementation/tasks/` as its specification: owned paths, acceptance table and estimate. Where FD-105 narrows a task, the Unit details below say which parts of the task file are in release 1. Rows of the acceptance table that belong to a deferred part are recorded as "deferred to release 2 (FD-105)" at Build and Test, not executed. Components and architecture decisions are in `domain-design/components.md` and `decisions.md`.

Built from `components.md` and `decisions.md` (Domain Design), `requirements.md` and `stories.md`, the master plan (`docs/implementation/00-master-plan.md` §5), FD-094..FD-105 in `docs/status/decision-log.md`, and the T-201 Functional Design review of 2026-11-04 (`.aidlc-engine/reviews/functional-design/units/t-201-directory-and-taxonomy-modules/`).

## Deployment model

All Units deploy into the existing two runtimes of the modular monolith: the Next.js web app (`apps/web`) and the pg-boss worker (`apps/worker`), with domain code in `packages/*` (ADR-0001, ADR-0007). Every Unit is embedded in that shared deployment; none deploys alone. The demo runs locally only (FD-031, D11), and no CI runs on push (FD-102): the local gate is `pnpm check` and `pnpm smoke`. Construction is solo, stage-major, with `Construction Execution: swarm` (FD-094): Units with no dependency path between them and no overlapping owned paths are built at the same time, each in its own worktree, Bolt branch and test database, and merged one at a time. Release 1 is not for unrestricted public launch, because moderation is deferred (FD-105).

## Units

| Unit ID | Name | Directory | Source | Unit | Kind | Size | High risk | Stories | Status |
|---|---|---|---|---|---|---|---|---|---|
| U1 | cr-009-database-extensionless-imports | u1-cr-009-database-extensionless-imports | CR-009 | Make `packages/database` importable from `apps/web` under Turbopack | library | S | — | — | merged on `main` |
| U2 | cr-007-int-test-reset-determinism | u2-cr-007-int-test-reset-determinism | CR-007 | Make `pnpm test:int` deterministic (reset once per project, fail fast on lock contention) | packaging | S | — | US1.1 | merged on `main` |
| U3 | t-010-boundary-lint-and-ci | u3-t-010-boundary-lint-and-ci | T-010 | Boundary lint, `pnpm check`, CI workflow, contrast tool | packaging | S | — | US1.1 | merged on `main` |
| U4 | cr-011-queue-dedup-reset-and-quiet-env | u4-cr-011-queue-dedup-reset-and-quiet-env | CR-011 | Queue de-duplication, pg-boss reset and quiet dotenv (T-009 follow-ups) | library | M | — | US1.1 | merged on `main` |
| U5 | cr-006-worker-auth-users-grant | u5-cr-006-worker-auth-users-grant | CR-006 | Resolve the `rk_worker` → `auth_users` grant contradiction | library | S | yes | US1.1 | merged on `main` |
| U6 | cr-012-storyboard-seed-correction | u6-cr-012-storyboard-seed-correction | CR-012 | Storyboard and seed correction (FD-039) | packaging | S | — | — | merged on `main` |
| U7 | cr-004-live-region-announcements | u7-cr-004-live-region-announcements | CR-004 | Live-region announcements: decide the language policy, then finish the port | ui | S | — | US12.1 | merged on `main` |
| U8 | t-101-better-auth-adapter | u8-t-101-better-auth-adapter | T-101 | Better Auth adapter: email/password, verification, reset, sessions, Actor | library | XL | yes | US3.1, US3.2 | merged on `main` |
| U9 | t-102-patient-auth-screens | u9-t-102-patient-auth-screens | T-102 | Patient auth screens: verify email, reset, security page, account entry, gates | ui | L | yes | US3.1, US3.2 | active (release 1) |
| U10 | t-103-staff-access-and-devices | u10-t-103-staff-access-and-devices | T-103 | Staff access: roles, capabilities, console guard, staff sign-in, device approval, step-up | library | XL | — | US3.2, US11.1 | deferred to release 2 (FD-105) |
| U11 | t-104-identity-module | u11-t-104-identity-module | T-104 | Identity module: named and pseudonymous personas, thread-scoped anonymous alias, private linkage (no reveal) | library | M | yes | US3.3 | active (release 1, narrowed) |
| U12 | t-105-runtime-configuration | u12-t-105-runtime-configuration | T-105 | Runtime configuration module: versioned bounded settings, apply, rollback, history | library | M | — | US11.1 | deferred to release 2 (FD-105) |
| U13 | t-106-auth-identity-validation | u13-t-106-auth-identity-validation | T-106 | Phase 1 validation: auth, staff access, identity, configuration (cross-vendor) | spec | M | yes | US3.1, US3.2, US3.3, US11.1 | deferred to release 2 (FD-105); its checks move into the Build and Test of U9 and U11 |
| U14 | t-201-directory-and-taxonomy-modules | u14-t-201-directory-and-taxonomy-modules | T-201 | Directory and taxonomy modules (queries, repositories, view models) | library | M | — | US4.1, US4.3, US5.3, US6.4 | merged into U46 (FD-105) |
| U15 | t-202-doctor-index-and-profile | u15-t-202-doctor-index-and-profile | T-202 | Doctor index and doctor profile pages (port) | ui | L | — | US4.1, US6.4, US4.2 | merged into U46 (FD-105) |
| U16 | t-203-facility-and-condition-pages | u16-t-203-facility-and-condition-pages | T-203 | Facility index/profile and condition index/page (port) | ui | L | — | US4.3, US5.3, US6.4 | merged into U46 (FD-105) |
| U17 | t-204-provider-submission-claim-field-change | u17-t-204-provider-submission-claim-field-change | T-204 | Provider submission, claim, field change, merge (commands + patient entry points) | library | M | — | US4.2 | deferred to release 2 (FD-105) |
| U18 | t-205-search-module | u18-t-205-search-module | T-205 | Search module (PostgreSQL FTS + trigram + aliases, neutral ranking) | library | XL | — | US5.1, US5.2, US5.3 | deferred to release 2 (FD-105) |
| U19 | t-206-search-page | u19-t-206-search-page | T-206 | Search page, filters, neutral sort, compare tray and sheet (port) | ui | L | — | US5.1, US5.2 | deferred to release 2 (FD-105) |
| U20 | t-207-discover-emergency-about | u20-t-207-discover-emergency-about | T-207 | Discover (home), Emergency, About, Terms and Privacy pages (port) | ui | M | — | US12.1, US4.3 | active (release 1) |
| U21 | t-301-review-module-core | u21-t-301-review-module-core | T-301 | Review module core: drafts, publish, projection, aggregates | library | XL | — | US6.1, US6.2, US6.4, US3.3, US4.3 | merged into U47 (FD-105) |
| U22 | t-302-review-changes-and-tombstones | u22-t-302-review-changes-and-tombstones | T-302 | Review changes: corrections with versions (tombstones, restore and follow-ups deferred) | — | M | — | US6.3, US6.2 | active (release 1, narrowed) |
| U23 | t-303-evidence-intake | u23-t-303-evidence-intake | T-303 | Evidence intake: streaming upload to quarantine | library | L | yes | US7.1 | merged into U48 (FD-105) |
| U24 | t-304-worker-evidence-pipeline | u24-t-304-worker-evidence-pipeline | T-304 | Worker evidence pipeline: validate → scan → sanitise → preview-ready | service | L | yes | US7.1 | merged into U48 (FD-105) |
| U25 | t-305-privacy-preview-redaction-publish | u25-t-305-privacy-preview-redaction-publish | T-305 | Privacy preview, manual redaction, author confirmation, publication of derivatives | library | M | yes | US7.2 | deferred to release 2 (FD-105) |
| U26 | t-306-composer-wizard | u26-t-306-composer-wizard | T-306 | Composer wizard port (`/write`) | ui | XL | — | US6.1, US6.2, US7.1, US3.3, US5.3 | merged into U47 (FD-105) |
| U27 | t-307-experience-page-and-index | u27-t-307-experience-page-and-index | T-307 | Experience page and experiences index port (`/experiences`, `/experiences/{publicId}`) | ui | L | — | US6.2, US6.3, US6.4, US3.3, US10.2 | merged into U47 (FD-105) |
| U28 | t-308-evidence-viewer | u28-t-308-evidence-viewer | T-308 | Processed-document viewer and evidence sections port | ui | M | yes | US7.2, US7.1 | deferred to release 2 (FD-105) |
| U29 | t-309-retention-holds-custody | u29-t-309-retention-holds-custody | T-309 | Retention policy, expiry job, legal holds, previewed bulk action, custody log, demo clock | library | L | yes | US7.3 | deferred to release 2 (FD-105) |
| U30 | t-401-community-module | u30-t-401-community-module | T-401 | Community module: comments, replies, mentions, reactions, blocks | library | L | — | US8.1, US8.2 | merged into U49 (FD-105) |
| U31 | t-402-discussion-ui | u31-t-402-discussion-ui | T-402 | Discussion UI on the experience page | ui | M | — | US8.1, US8.2 | merged into U49 (FD-105) |
| U32 | t-403-reports-and-thresholds | u32-t-403-reports-and-thresholds | T-403 | Reports, thresholds and the temporary hide | library | L | — | US9.1 | deferred to release 2 (FD-105) |
| U33 | t-404-moderation-module | u33-t-404-moderation-module | T-404 | Moderation module: queue, decisions, appeals, enforcement, bulk | library | XL | yes | US9.2, US9.3, US11.2 | deferred to release 2 (FD-105) |
| U34 | t-405-notifications | u34-t-405-notifications | T-405 | Notifications: outbox relay, in-app rows, essential email, patient page | library | L | — | US10.1 | deferred to release 2 (FD-105) |
| U35 | t-406-staff-shell-and-queue | u35-t-406-staff-shell-and-queue | T-406 | Staff console shell and queue (Chart Tray port) | ui | XL | — | US9.2, US9.3, US11.2 | deferred to release 2 (FD-105) |
| U36 | t-407-staff-evidence-and-providers | u36-t-407-staff-evidence-and-providers | T-407 | Staff evidence quarantine and providers views | ui | L | yes | US7.3, US4.2, US11.2 | deferred to release 2 (FD-105) |
| U37 | t-408-staff-notifications-and-config | u37-t-408-staff-notifications-and-config | T-408 | Staff notifications triage and versioned configuration views | ui | L | — | US10.1, US11.1, US11.2 | deferred to release 2 (FD-105) |
| U38 | t-409-personal-workspace | u38-t-409-personal-workspace | T-409 | Personal workspace, saved, public profile | ui | L | — | US10.2, US10.3, US6.3, US9.3 | deferred to release 2 (FD-105) |
| U39 | t-410-export-and-deletion | u39-t-410-export-and-deletion | T-410 | Account data export and orchestrated deletion | library | L | yes | US10.3, US6.3, US7.3 | deferred to release 2 (FD-105) |
| U40 | t-501-pwa | u40-t-501-pwa | T-501 | PWA: manifest, icons, safe shell caching, sign-out purge | ui | M | — | US12.2, US12.1 | deferred to release 2 (FD-105) |
| U41 | t-502-security-hardening | u41-t-502-security-hardening | T-502 | Security hardening: security headers and CSP, origin checks, upload limits, cookie flags, log scrubbing | library | M | yes | US12.3, US12.4, US3.1, US7.1 | active (release 1, narrowed) |
| U42 | t-503-parity-accessibility-e2e | u42-t-503-parity-accessibility-e2e | T-503 | Bilingual parity, accessibility and viewport E2E | spec | XL | — | US2.3, US12.1, US2.2 | merged into U50 (FD-105) |
| U43 | t-504-demo-composition | u43-t-504-demo-composition | T-504 | Demo composition: one-command up, reset, demo clock, storyboard walk-through | packaging | M | — | US2.1, US1.1 | merged into U50 (FD-105) |
| U44 | t-505-final-validation-and-docs | u44-t-505-final-validation-and-docs | T-505 | Final validation matrix and documentation close-out | spec | M | — | US2.3, US1.1 | merged into U50 (FD-105) |
| U45 | t-011-patient-design-and-motion-system | u45-t-011-patient-design-and-motion-system | T-011 | Patient design and motion system (FD-091): tokens, restyled shell, CSS-first motion, reduced motion, CSS motion check | ui | XL | — | US2.4, US2.3 | merged on `main` |
| U46 | u46-directory | u46-directory | T-201 + T-202 + T-203 | Directory: directory and taxonomy modules, doctor, facility and topic pages on the module queries, FD-100 member-added doctors | — | XL | — | US4.1, US4.2, US4.3, US5.3, US6.4, US2.4 | active (release 1, new) |
| U47 | u47-reviews | u47-reviews | T-301 + T-306 + T-307 | Reviews: review module core, composer, experience page and index; replaces the demo slice's review code | — | XL | — | US6.1, US6.2, US6.3, US6.4, US3.3, US4.2, US4.3, US5.3, US10.2, US12.1, US2.4 | active (release 1, new) |
| U48 | u48-evidence | u48-evidence | T-303 + T-304 | Evidence: intake to quarantine and the worker's validate and scan, fail closed; public pages show only the note and the count | — | XL | yes | US7.1 | active (release 1, new) |
| U49 | u49-comments | u49-comments | T-401 + T-402 | Comments: comments with one reply level and owner delete | — | L | — | US8.1, US3.3 | active (release 1, new) |
| U50 | u50-release-check | u50-release-check | T-503 + T-504 + T-505 | Release check: bilingual end-to-end walk of the release-1 storyboard, demo composition and reset, final validation and docs | spec | XL | — | US1.1, US2.1, US2.2, US2.3, US2.4, US12.1, US12.3 | active (release 1, new) |

Size: S ≤ 2 h, M ≤ 4 h, L ≤ 6 h, XL > 6 h of agent time, from the task file's estimate, adjusted for the parts FD-105 adds or removes. High risk (auth, identity, evidence, moderation, retention, deletion) runs with collaborators on, 3–5 adversarial tests and the owner's written sign-off (team practices). U41 is marked high risk in this revision because it changes the session cookie attributes and guards the evidence upload path, both in the high-risk classes. Kind `—` means untagged: U22 and U46–U49 each carry a domain module and its pages, so they get the full Functional Design artifact set (entities, rules, functional spec and frontend components).

## Unit details

### U1 — Make `packages/database` importable from `apps/web` under Turbopack

- **Status:** merged on `main`
- **Source:** CR-009 (`docs/implementation/tasks/CR-009-database-extensionless-imports.md`)
- **Kind:** library · **Size:** S (1–2 h agent (mechanical, but touches most files in the package)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Rewrites every import in packages/database/src; nothing else may touch that package in the same Bolt.
- **Stories:** — (enabling Unit; no story of its own)
- **Depends on:** the merged baseline only

### U2 — Make `pnpm test:int` deterministic (reset once per project, fail fast on lock contention)

- **Status:** merged on `main`
- **Source:** CR-007 (`docs/implementation/tasks/CR-007-int-test-reset-determinism.md`)
- **Kind:** packaging · **Size:** S (1–2 h agent) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Integration-test reset determinism (the test:int hang); FD-043.
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U3 — Boundary lint, `pnpm check`, CI workflow, contrast tool

- **Status:** merged on `main`
- **Source:** T-010 (`docs/implementation/tasks/T-010-boundary-lint-and-ci.md`)
- **Kind:** packaging · **Size:** S (1.5–2 h agent; validation 0.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Boundary lint, format check, 80% coverage floor and CI (D10, FD-040 test-support seed edge, ISS-205).
- **Stories:** US1.1
- **Depends on:** U1 (CR-009), U2 (CR-007)

### U4 — Queue de-duplication, pg-boss reset and quiet dotenv (T-009 follow-ups)

- **Status:** merged on `main`
- **Source:** CR-011 (`docs/implementation/tasks/CR-011-queue-dedup-reset-and-quiet-env.md`)
- **Kind:** library · **Size:** M (1.5–2.5 h agent; validation 0.5–1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Transactional outbox relay (FD-038) and queue follow-ups ISS-144, ISS-185, ISS-201..203; due before the first real job handler.
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U5 — Resolve the `rk_worker` → `auth_users` grant contradiction

- **Status:** merged on `main`
- **Source:** CR-006 (`docs/implementation/tasks/CR-006-worker-auth-users-grant.md`)
- **Kind:** library · **Size:** S (0.5–1 h agent once the founder has decided (the decision is the long pole)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Revoke rk_worker's auth_users grant in a forward-only migration (FD-041) and review the other worker grants (FD-050). The mail.send handler is T-101's, not T-405's (FD-071).
- **Decision changes:** FD-050, FD-071, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US1.1
- **Depends on:** U1 (CR-009)

### U6 — Storyboard and seed correction (FD-039)

- **Status:** merged on `main`
- **Source:** CR-012 (`docs/implementation/tasks/CR-012-storyboard-seed-correction.md`)
- **Kind:** packaging · **Size:** S (1–2 h agent; validation 0.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Correct the storyboard, the seed and the T-106/T-401/T-409 acceptance rows to match the prototype data (FD-039, FD-074): ISS-158, ISS-176, ISS-221.
- **Decision changes:** FD-039, written into the task file with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** — (enabling Unit; no story of its own)
- **Depends on:** U1 (CR-009)

### U7 — Live-region announcements: decide the language policy, then finish the port

- **Status:** merged on `main`
- **Source:** CR-004 (`docs/implementation/tasks/CR-004-live-region-announcements.md`)
- **Kind:** ui · **Size:** S (≤ 1 h agent once the founder answers the question below) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Localized live-region announcements for the theme and language toggles (FD-042); Bengali copy flagged for the owner's review with ISS-050.
- **Stories:** US12.1
- **Depends on:** the merged baseline only

### U8 — Better Auth adapter: email/password, verification, reset, sessions, Actor

- **Status:** merged on `main`
- **Source:** T-101 (`docs/implementation/tasks/T-101-better-auth-adapter.md`)
- **Kind:** library · **Size:** XL (5–7 h agent; validation 2 h (plus T-106)) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Builds the worker's mail.send handler, reading the recipient from email_deliveries.to_email_enc (FD-071, FD-041). Builds the FD-058 progressive delay and severe-activity email through the ConfigProvider port with the FD-063 values as defaults; the in-app notice is an outbox event T-405 consumes (FD-072). FD-059 self-service reset only; creates the ConfigProvider interface if it is still missing, adds the FD-058 keys with their defaults to the contracts config schema and wires a defaults-only provider until T-105 replaces it. ISS-112, ISS-223.
- **Decision changes:** FD-056, FD-057, FD-058, FD-059, FD-063, FD-071, FD-072, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US3.1, US3.2
- **Depends on:** U5 (CR-006), U4 (CR-011), U3 (T-010)

### U9 — Patient auth screens: verify email, reset, security page, account entry, gates

- **Status:** active (release 1)
- **Source:** T-102 (`docs/implementation/tasks/T-102-patient-auth-screens.md`)
- **Kind:** ui · **Size:** L (4–6 h agent; validation 1.5 h) · **High risk:** yes (auth) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file, on top of the register and sign-in forms the demo slice and U8 already put on `main` (FD-103: registering redirects to sign-in; this Unit's "check your email" screen takes that place). Verify-email and reset-password screens, the `/me/security` page (session list and sign out everywhere only, FD-057; the holder's masked address, FD-096), the account entry in the masthead, and the gate sheet and callout that ask a signed-out or unconfirmed visitor to sign in or confirm before writing or commenting. Gated on the D-001 auth-screen review (FD-053). Styles on the T-011 tokens (FD-091).
- **Owned paths:** `apps/web/src/app/[locale]/(patient)/{register,sign-in,verify-email,reset-password,me/security}/`, `apps/web/src/components/patient/auth/`, `apps/web/src/components/patient/Masthead.tsx` (account entry only), the Security link in `apps/web/src/components/patient/profile/ProfileWorkspace.tsx`, `apps/web/src/server/actions/{account,auth,auth-form}.ts`. `terms/` and `privacy/` in T-102's list were delivered by T-207 Half A and stay U20's.
- **Not in release 1:** nothing of T-102 is dropped. The gate callout inside the composer is mounted by U47, which imports this Unit's gate component instead of U9 editing the composer.
- **Takes over from T-106 (deferred):** the auth rows of T-106's negative matrix (enumeration, unconfirmed account cannot publish or comment, reset token reuse, signed-out access to `/me/security`) are executed in this Unit's Build and Test.
- **Decision changes:** FD-053, FD-057, FD-096, FD-103, written into the task file's amendments section with `FD-0nn:` acceptance rows (FD-074)
- **Stories:** US3.1, US3.2
- **Depends on:** the merged baseline only (U8 T-101, U3 T-010, U45 T-011)

### U10 — Staff access: roles, capabilities, console guard, staff sign-in, device approval, step-up

- **Status:** deferred to release 2 (FD-105). The staff console is release 2. Nothing in release 1 needs a staff capability: U11 drops the audited reveal that needed `capability` and `stepUp`, and U41 hardens the existing admin layout as it stands.
- **Source:** T-103

### U11 — Identity module: named and pseudonymous personas, thread-scoped anonymous alias, private linkage

- **Status:** active (release 1, narrowed by FD-105)
- **Source:** T-104 (`docs/implementation/tasks/T-104-identity-module.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1.5 h) · **High risk:** yes (identity) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** AD-3 as T-104 designs it, without the reveal. The `Persona` domain type and `publicProjection` (no account field ever reaches a projection); `identity.createDefaultPersonas` called by register (replacing the direct persona inserts in `register.ts`); `identity.personaFor` returning the named or pseudonymous persona, or the anonymous alias scoped to one review thread (same alias for the same account in the same thread, a different one in another thread); `identity.publicProjection`; `identity.renameNamed`; and the `PrivateIdentityRepository`, injected only where T-104 says. This Unit only builds the commands: the demo slice's `createPseudonymousPersona` (in `packages/database/src/demo/reviews.ts`, called from `apps/web/src/server/actions/review.ts`) stays in place, and U47 switches that call site to `identity.personaFor` and deletes the demo function. U11 edits neither file.
- **Owned paths:** `packages/domain/src/identity/`, `packages/application/src/modules/identity/`, `packages/application/src/ports/repositories/identity.ts`, `packages/database/src/repositories/{identity,identity-private}.ts`, `packages/contracts/src/view-models/persona.ts`, `packages/contracts/src/schemas/identity.ts`, `packages/application/src/modules/account/commands/register.ts` (persona creation only), and an identity grants migration only if T-004's grants lack the revokes.
- **Not in release 1:** the audited identity reveal (`identity.reveal`, `identity_reveals` writes, the `apps/web/src/server/actions/identity.ts` console action and its `staff_notifications` row), and `identity.deidentify`, whose only caller is T-410. Both are deferred to release 2 (FD-105) with U10 and U39.
- **Takes over from T-106 (deferred):** the identity rows of T-106's negative matrix (no account id, email or link in any public projection; anonymous alias stable within a thread and different across threads; `persona_links` unreachable from public code) are executed in this Unit's Build and Test.
- **Stories:** US3.3
- **Depends on:** the merged baseline only (U8 T-101, U3 T-010). The T-103 edge is cut: see `unit-of-work-dependency.md`.

### U12 — Runtime configuration module: versioned bounded settings, apply, rollback, history

- **Status:** deferred to release 2 (FD-105). Its settings stay constants in code; see "Constants that stand in for T-105" below.
- **Source:** T-105

### U13 — Phase 1 validation: auth, staff access, identity, configuration (cross-vendor)

- **Status:** deferred to release 2 (FD-105). Its auth checks run in U9's Build and Test and its identity checks in U11's; its staff-access and configuration checks are deferred with U10 and U12.
- **Source:** T-106

### U14 — Directory and taxonomy modules (queries, repositories, view models)

- **Status:** merged into U46 (FD-105)
- **Source:** T-201. Its Functional Design (`construction/t-201-directory-and-taxonomy-modules/functional-design/`, reviewer verdict READY with two Major and two Minor findings) is the starting draft for U46's Functional Design.

### U15 — Doctor index and doctor profile pages (port)

- **Status:** merged into U46 (FD-105)
- **Source:** T-202

### U16 — Facility index/profile and condition index/page (port)

- **Status:** merged into U46 (FD-105)
- **Source:** T-203

### U17 — Provider submission, claim, field change, merge (commands + patient entry points)

- **Status:** deferred to release 2 (FD-105). FD-100's "Add a doctor who isn't listed" stays in release 1 through U46's directory command and U47's composer; staff review of submissions, claims, photo suggestions, field changes and merges are release 2.
- **Source:** T-204

### U18 — Search module (PostgreSQL FTS + trigram + aliases, neutral ranking)

- **Status:** deferred to release 2 (FD-105). Release 1 is browsed through the doctor, facility and topic indexes.
- **Source:** T-205

### U19 — Search page, filters, neutral sort, compare tray and sheet (port)

- **Status:** deferred to release 2 (FD-105). `/search` keeps the "not built yet" notice it has on `main`.
- **Source:** T-206

### U20 — Discover (home), Emergency, About, Terms and Privacy pages (port)

- **Status:** active (release 1)
- **Source:** T-207 (`docs/implementation/tasks/T-207-discover-emergency-about.md`)
- **Kind:** ui · **Size:** M (2–3 h agent; validation 0.5–1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** Half B (the Discover home) on top of the demo slice's home on `main`, switched from the demo-slice reads to the module queries U46 builds (`taxonomy.listConditions`, `directory.listFacilities`, `review.listExperienceCards`) and U46's shared primitives (`EmergencyPanel`, `BrowseCard`, `AccountRow`, `Avatar`, `MiniList`). Half A (Emergency, About, Terms, Privacy) is merged; this Unit keeps those pages, re-checks them in both languages and closes ISS-151, ISS-152 and ISS-120. The emergency numbers come from the configuration defaults (see "Constants that stand in for T-105").
- **Owned paths:** `apps/web/src/app/[locale]/(patient)/page.tsx`, `apps/web/src/app/[locale]/(patient)/{emergency,about,terms,privacy}/`, `apps/web/src/components/patient/home/`, `apps/web/src/components/patient/{Emergency,About,Policy}.tsx`.
- **Not in release 1:** the search box on the home (T-206 is deferred); the home shows browse entry points to doctors, facilities and topics in its place.
- **Stories:** US12.1, US4.3
- **Depends on:** U46

### U21 — Review module core: drafts, publish, projection, aggregates

- **Status:** merged into U47 (FD-105)
- **Source:** T-301

### U22 — Review changes: corrections with versions

- **Status:** active (release 1, narrowed by FD-105)
- **Source:** T-302 (`docs/implementation/tasks/T-302-review-changes-and-tombstones.md`)
- **Kind:** untagged · **Size:** M (3–4 h agent; validation 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** FR69 on the review module U47 builds: non-substantive presentation edits show an "Edited" date; material changes to diagnosis, treatment or outcome become dated corrections, with the original account still readable; every saved version is kept and the author sees the history (`review.correct`, `queries/get-history.ts`, the `versioning.ts` domain rules, the projection's `editedAt` and corrections). The demo slice's edit page (`/experiences/[id]/edit`, `getOwnReviewForEdit`, `updateOwnReview`) is replaced by this command, and this Unit deletes those two demo functions. The experience page needs no edit: U47 links to this Unit's edit route and mounts the self-fetching `<ReviewHistory reviewPublicId>` slot, whose internals this Unit replaces with the edited mark and the corrections and version list.
- **Review module files:** U22 is the only level-3 Unit that edits the review module, its repository and its contracts (U48 and U49 only import U47's `isReviewAuthor` and `isReviewPublished`), so these extensions collide with no Unit built at the same time.
- **Owned paths:** `packages/domain/src/review/versioning.ts`, `packages/application/src/modules/review/commands/correct.ts`, `packages/application/src/modules/review/queries/get-history.ts`, the extensions of `modules/review/projection.ts`, `ports/repositories/review.ts`, `packages/database/src/repositories/review.ts` and `packages/contracts/src/{schemas/review.ts,view-models/experience.ts}`, `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/`, `apps/web/src/components/patient/compose/EditForm.tsx`, `apps/web/src/components/patient/review-history/` (handed over by U47).
- **Not in release 1:** follow-ups, review deletion and its tombstone, restore within 30 days, staff redaction and `review.setState` (its hide and restore outcomes belong to moderation), the deletion step for T-410, and every email T-302 queues through T-405 (FD-070, FD-075). All are deferred to release 2 (FD-105).
- **Decision changes:** FD-049 (corrections part), written into the task file's amendments section; FD-070, FD-073 and FD-075 apply to deferred parts only.
- **Stories:** US6.3, US6.2
- **Depends on:** U47

### U23 — Evidence intake: streaming upload to quarantine

- **Status:** merged into U48 (FD-105)
- **Source:** T-303

### U24 — Worker evidence pipeline: validate → scan → sanitise → preview-ready

- **Status:** merged into U48 (FD-105)
- **Source:** T-304

### U25 — Privacy preview, manual redaction, author confirmation, publication of derivatives

- **Status:** deferred to release 2 (FD-105). No processed copy is published in release 1, so U48's pipeline ends after the scan.
- **Source:** T-305

### U26 — Composer wizard port (`/write`)

- **Status:** merged into U47 (FD-105)
- **Source:** T-306

### U27 — Experience page and experiences index port (`/experiences`, `/experiences/{publicId}`)

- **Status:** merged into U47 (FD-105)
- **Source:** T-307

### U28 — Processed-document viewer and evidence sections port

- **Status:** deferred to release 2 (FD-105). Public pages show only the evidence note and the count (U48).
- **Source:** T-308

### U29 — Retention policy, expiry job, legal holds, previewed bulk action, custody log, demo clock

- **Status:** deferred to release 2 (FD-105). In release 1 originals stay in private quarantine storage with no expiry job; U48 records this as an `S4` row in `ISSUES.md`.
- **Source:** T-309

### U30 — Community module: comments, replies, mentions, reactions, blocks

- **Status:** merged into U49 (FD-105)
- **Source:** T-401

### U31 — Discussion UI on the experience page

- **Status:** merged into U49 (FD-105)
- **Source:** T-402

### U32 — Reports, thresholds and the temporary hide

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-403

### U33 — Moderation module: queue, decisions, appeals, enforcement, bulk

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-404

### U34 — Notifications: outbox relay, in-app rows, essential email, patient page

- **Status:** deferred to release 2 (FD-105). Release 1 sends only the account emails U8 already sends (verification, reset, severe sign-in activity). No release-1 command queues a notification; the evidence state shows on the author's own evidence list instead.
- **Source:** T-405

### U35 — Staff console shell and queue (Chart Tray port)

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-406

### U36 — Staff evidence quarantine and providers views

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-407

### U37 — Staff notifications triage and versioned configuration views

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-408

### U38 — Personal workspace, saved, public profile

- **Status:** deferred to release 2 (FD-105). The demo slice's `/me` page (display name, language, own reviews) stays as it is on `main`; U47 switches its own-review list to the review module, and U9 adds the Security link.
- **Source:** T-409

### U39 — Account data export and orchestrated deletion

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-410

### U40 — PWA: manifest, icons, safe shell caching, sign-out purge

- **Status:** deferred to release 2 (FD-105)
- **Source:** T-501

### U41 — Security hardening: security headers and CSP, origin checks, upload limits, cookie flags, log scrubbing

- **Status:** active (release 1, narrowed by FD-105)
- **Source:** T-502 (`docs/implementation/tasks/T-502-security-hardening.md`)
- **Kind:** library · **Size:** M (3–4 h agent; validation 1.5 h) · **High risk:** yes (session cookies, evidence upload) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the security headers and a nonce-based CSP (`apps/web/src/proxy.ts`, `lib/security/csp.ts`, `next.config.ts` `headers()`, `poweredByHeader: false`, the nonce read in the locale and admin layouts); origin checks (`lib/security/origin.ts` for route handlers, `serverActions.allowedOrigins` from `APP_ALLOWED_ORIGINS`, unknown `Host` refused); upload limits (request size refused before the body is read, plus adversarial tests of U48's per-file and per-review limits on the real upload route); the session cookie attributes and `trustedOrigins` in `server/auth.ts`; log scrubbing in the web and worker loggers with a test that review text, evidence filenames and email addresses never appear; and the threat notes `docs/security/local-demo-threat-notes.md`. The CSP allows no third-party origin, which is the release-1 guard for FR99 (no analytics).
- **Owned paths:** `apps/web/src/proxy.ts`, `apps/web/src/lib/security/`, `apps/web/next.config.ts`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/admin/layout.tsx`, `apps/web/src/server/auth.ts` (cookie attributes and trusted origins only), `apps/web/src/server/logger.ts`, `apps/worker/src/logger.ts`, the origin check in `apps/web/src/app/api/evidence/upload/route.ts`, `infra/compose/.env.example` (`APP_ALLOWED_ORIGINS`, `APP_URL`), `docs/security/`.
- **Not in release 1:** the per-command rate-limit table and the `defineCommand` change (`RATE_LIMITS`, `network-key.ts`), `assertAppMode()`, the FD-072 sign-in-delay adversarial test (U8 already ran adversarial tests on the delay), and the CSP for `sw.js` and the manifest (T-501). All are deferred to release 2 (FD-105). Release-1 Units that need a limit use T-101's in-memory `RateLimiter` port with a constant (see "Constants that stand in for T-105").
- **Decision changes:** FD-072 applies to a deferred part only.
- **Stories:** US12.3, US12.4, US3.1, US7.1
- **Depends on:** U48

### U42 — Bilingual parity, accessibility and viewport E2E

- **Status:** merged into U50 (FD-105)
- **Source:** T-503

### U43 — Demo composition: one-command up, reset, demo clock, storyboard walk-through

- **Status:** merged into U50 (FD-105)
- **Source:** T-504

### U44 — Final validation matrix and documentation close-out

- **Status:** merged into U50 (FD-105)
- **Source:** T-505

### U45 — Patient design and motion system (FD-091)

- **Status:** merged on `main`
- **Source:** T-011 (`docs/implementation/tasks/T-011-patient-design-and-motion-system.md`), new on 2026-10-27
- **Kind:** ui · **Size:** XL (5–7 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the scope, owned paths and acceptance table of its source file. Replaces the 04b look of the patient side with the FD-091 "Warm Paper, Soft Depth" tokens and a CSS-first motion system (React 19 `<ViewTransition>`, `@starting-style`, scroll reveals inside `@supports`, reduced-motion overrides including `::view-transition-*`), with no animation library (FD-032), and adds the `check:motion` CSS check to `pnpm check`. The staff console keeps Chart Tray.
- **Decision changes:** FD-091 (written into its task file from the start)
- **Stories:** US2.4, US2.3
- **Depends on:** U3 (T-010)

### U46 — Directory: directory and taxonomy modules, doctor, facility and topic pages

- **Status:** active (release 1, new; FD-105)
- **Source:** T-201, T-202 and T-203 (their task files are the specification, read together); FD-067, FD-100, FD-101
- **Kind:** untagged · **Size:** XL (9–12 h agent; validation 2–3 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the Directory and Taxonomy modules (domain, queries, repositories, view models), the `ProviderExperience` and `ConditionStats` ports with their read-only Review implementations (FD-067, C6, C7; the ports-only Review stub of the T-201 amendment), and the doctor index and profile, facility index and branch profile, and topic index and page, all on the module queries. Built on the demo slice's pages on `main` (FD-099), not beside them: it retires `packages/database/src/demo/doctors.ts`, `demo/facilities.ts` and the demo topic functions, and switches the `/doctors`, `/facilities` and `/topics` routes to the modules, so `main` keeps one eligibility predicate and one topic-counting rule. The hard rules apply as T-201's design states them: no number for quality, exact counts with denominators, "Limited data" under the threshold, "Not provided" never `0`, "Registration not verified" on every doctor, neutral ordering, and facility feedback kept out of every doctor figure at query level.
- **Absorbs FD-100 (member-added doctors):** the directory command that creates a member-added doctor (`published` with `community` provenance plus a `pending` `profile_submissions` row; a matching published doctor is reused when the specialties agree or one is blank, after removing a "Dr."/"Prof."/"ডাঃ"/"ডা." title and with at least three letters; the typed BMDC number stays in the submission payload) is built in the Directory module. This Unit only builds the command: the demo slice's `createQuickReviewWithNewDoctor` (in `packages/database/src/demo/reviews.ts`, called from `apps/web/src/server/actions/review.ts`) stays in place, and U47 switches that call site to the new command and deletes the demo function. U46 edits neither file. `DoctorCardVM` and `DoctorProfileVM` gain a field such as `memberAddedNotConfirmed`, derived in SQL from a pending `profile_submissions.created_doctor_id`, so the list and profile keep showing "Added by a member — not confirmed" next to "Registration not verified", with a rule in BR2 and a database test (T-201 review, Major 2).
- **Absorbs FD-101 (facility and topic pages):** the pages keep what FD-101 put on `main` and gain T-203's per-criterion distributions and the symptom, medicine, treatment and place summaries. FD-101's free-text topic match (a free-text condition tag equal to a term's name in either language or one of its aliases, ignoring case and outer spaces) carries into the taxonomy counting rules (BR3.2, BR4.4), because FD-101 is binding and dropping it would change the counts on merged pages; dropping it needs a new FD entry first (T-201 review, Major 1). The facility branch label change (T-201 design Question 9 C) is made together with the facility pages and the seed in this Unit, so no merged page reads the column with its old meaning; the branch label ("Dhanmondi branch") stays visible (T-201 review, Major 1).
- **Public evidence count (seam for U48):** document counts on doctor cards and profiles are read only through the `PublicEvidenceCount` port (`countPublicEvidence(reviewId)`; U46's Functional Design may add a batched form for profile totals), which this Unit declares in `packages/application/src/ports/public-evidence-count.ts`. Until U48 lands, `container.ts` binds the port to an interim implementation that keeps today's behaviour (the demo slice's `countReadyEvidence` with `DEMO_READY_EVIDENCE_STATE`, in `packages/database/src/demo/evidence.ts`, which U48 owns and does not change until then). The directory module and its repository never query `evidence_items` directly; the SQL count in `demo/doctors.ts` goes when this Unit retires that file. U48 implements the port and swaps the binding.
- **Carries the T-201 review's Minor findings:** no CI gate (FD-102): the gate is `pnpm check` (eleven steps) and `pnpm smoke`; the baseline is current `main` (`defineQuery` already exists; migration `0009` is taken, so this Unit takes the next free number at merge time, see `unit-of-work-dependency.md`); the provisional-term limiter key follows T-101's `RateLimitKey` shape (`taxonomy.createProvisional:account:<accountId>`) and the 30-per-hour limit is per process, as T-101's in-memory limiter is.
- **Owned paths:** `packages/domain/src/{directory,taxonomy}/`, `packages/domain/src/review/policies.ts` (only `isLimitedData` and `distribution`), `packages/application/src/modules/{directory,taxonomy}/`, the read-side Review stub in `packages/application/src/modules/review/` (`queries/{sentiment-distribution,outcome-distribution,criteria-distribution,list-experience-cards}.ts` and the two port implementations), `packages/application/src/ports/repositories/{directory,taxonomy}.ts` and the read methods of `review.ts`, `packages/contracts/src/view-models/{doctor,facility,condition,experience-card}.ts`, `packages/database/src/repositories/{directory,taxonomy}.ts` and the read methods of `review.ts`, its migration, `packages/database/src/demo/{doctors,facilities}.ts` and the demo topic functions, `packages/application/src/ports/public-evidence-count.ts` (the port only; its signature is frozen once U46 merges), `packages/test-support/src/seed/seed-directory.ts`, `apps/web/src/app/[locale]/(patient)/{doctors,facilities,topics}/`, `apps/web/src/components/patient/{doctors,facilities,topics}/`, `apps/web/src/components/patient/shared/` (new: the shared primitives of T-202).
- **Not in release 1:** T-202's claim sheet and T-203's facility account composer entry points that need T-204, and anything that needs search (filters from search, compare tray). Deferred to release 2 (FD-105).
- **Decision changes:** FD-067, FD-100, FD-101, and the T-201 amendments for FD-076..FD-090, from the three task files' amendments sections.
- **Stories:** US4.1, US4.2 (FD-100's member-added doctor only), US4.3, US5.3, US6.4, US2.4
- **Depends on:** the merged baseline only (U3 T-010, U45 T-011)

### U47 — Reviews: review module core, composer, experience page and index

- **Status:** active (release 1, new; FD-105)
- **Source:** T-301, T-306 and T-307 (their task files are the specification, read together)
- **Kind:** untagged · **Size:** XL (14–18 h agent; validation 3–4 h; the largest Unit, see the open points) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the Review module core (drafts, publish, projection, aggregates, facility visit accounts; T-301), the composer at `/write` (Quick and detailed modes, condition tags through U46's taxonomy, "Add a doctor who isn't listed" through U46's FD-100 command, the persona choice through U11's `identity.personaFor`, and U9's gate for signed-out or unconfirmed writers; T-306), and the experience page and experiences index (T-307), with bylines that never link an anonymous author to a profile (FD-015). It replaces the demo slice's review code (`packages/database/src/demo/reviews.ts`, the review bindings in `apps/web/src/server/data.ts`) on `/write`, `/experiences`, `/experiences/[id]`, the author page `/authors/[username]` (public contributions only, anonymous ones excluded, `noindex`) and the own-review list on `/me`. Publish refuses an unconfirmed account in the application layer, not only in the UI. Author text is stored and shown exactly as written (FR92).
- **Seams it ships for level 3 (U22, U48, U49):** this Unit leaves the experience page and the review module in a shape that U22, U48 and U49 never need to edit, so they can be built at the same time.
  - **Comments:** `experiences/[id]/page.tsx` mounts a self-fetching `<CommentThread reviewPublicId>` slot and no longer fetches comments itself. This Unit converts the existing `CommentThread` to take only `reviewPublicId` and load its own data through the demo comments binding, keeping today's behaviour; after this Unit merges, U49 owns `apps/web/src/components/patient/comments/` and replaces the internals.
  - **Evidence:** the page mounts a self-fetching `<EvidenceSection reviewPublicId>` slot instead of passing `readyEvidenceCount` into `EvidenceNote`. This Unit creates `apps/web/src/components/patient/evidence/EvidenceSection.tsx`, which reads the count through the `PublicEvidenceCount` port U46 declared (today's behaviour through the interim container binding); after this Unit merges, U48 owns it. The composer reaches evidence only through the components under `components/patient/evidence/` and `apps/web/src/server/actions/evidence.ts`, mounted with their current props. The review projection and the experience cards never query `evidence_items` directly; the SQL count in `demo/reviews.ts` goes when this Unit retires that file.
  - **Corrections:** the page links to the edit route `experiences/[id]/edit/`, which U22 owns, and shows that link when `isReviewAuthor` says so; it no longer calls `getOwnReviewForEdit`. The page mounts a self-fetching `<ReviewHistory reviewPublicId>` slot, which this Unit creates in `apps/web/src/components/patient/review-history/` showing the "Edited" date only; after this Unit merges, U22 owns that folder. The demo slice's `getOwnReviewForEdit` and `updateOwnReview` stay in `demo/reviews.ts` for the edit route until U22 replaces them (Q21).
  - **Queries:** the review module exports `isReviewAuthor(reviewId, actor)` and `isReviewPublished(reviewId)` (`modules/review/queries/{is-review-author,is-review-published}.ts`), which U48 and U49 import. They add no review query of their own.
- **Call sites it switches:** `apps/web/src/server/actions/review.ts` already exists on `main`. This Unit switches its calls to U11's `identity.personaFor` and U46's member-added doctor command, and deletes the demo slice's `createPseudonymousPersona` and `createQuickReviewWithNewDoctor` from `demo/reviews.ts`.
- **Owned paths:** `packages/domain/src/review/` (except U46's two policy functions and U22's `versioning.ts`), `packages/application/src/modules/review/` (except U46's read-side stub), `packages/application/src/ports/repositories/review.ts` (write side), `packages/database/src/repositories/review.ts` (write side), `packages/contracts/src/schemas/review.ts`, `packages/contracts/src/view-models/{experience,composer}.ts`, `packages/test-support/src/{builders/review.ts,fakes/review-repository.ts}`, its migration if it needs one (the FD-090 drafts grant), `packages/database/src/demo/reviews.ts`, `apps/web/src/app/[locale]/(patient)/{write,authors}/`, `apps/web/src/app/[locale]/(patient)/experiences/` (except `[id]/edit/`), `apps/web/src/components/patient/{compose,experience}/` (except U22's `EditForm.tsx`, edited mark and version list), `apps/web/src/components/patient/profile/OwnReviewList.tsx`, `apps/web/src/server/actions/review.ts` (exists on `main`), and, until its merge hands them over, the seam files `components/patient/evidence/EvidenceSection.tsx`, `components/patient/comments/CommentThread.tsx` and `components/patient/review-history/`.
- **Not in release 1:** follow-ups, deletion and tombstones (U22's deferred parts); the composer's evidence redaction and privacy-confirmation steps (T-305); the later-provider profile-submission offer (T-204); review-level reactions and bookmarks (T-401, T-409). Deferred to release 2 (FD-105).
- **Stories:** US6.1, US6.2, US6.3 (drafts), US6.4, US3.3, US4.2 (the composer's add-doctor entry), US4.3 (facility visits), US5.3 (condition tags), US10.2 (the author page), US12.1 (text as written), US2.4
- **Depends on:** U46, U11, U9

### U48 — Evidence: intake to quarantine and the worker's validate and scan, fail closed

- **Status:** active (release 1, new; FD-105)
- **Source:** T-303 and T-304 (their task files are the specification, read together); FD-035, FD-036, FD-070
- **Kind:** untagged · **Size:** XL (6–8 h agent; validation 2–3 h) · **High risk:** yes (evidence) · **Deployment:** embedded in the shared web/worker deployment (an upload route in the web app and a job handler in the worker)
- **Responsibilities:** the Evidence module's streaming upload into private quarantine (T-303: JPEG and PNG only, FD-036; the per-file and per-review limits enforced before any expensive processing, FR61; the author's own evidence list and removal), and the worker's `evidence.process` job (T-304) running validate (extension, MIME type, magic bytes, size, image decode) and the ClamAV scan through the `scanner-clamd` adapter. It fails closed: when the scanner cannot run, the item never advances and the job retries, and a rejected item shows its reason privately to its author with Remove (FR66, FD-035). It replaces the demo slice's web-tier scan (`apps/web/src/server/clamav.ts`), its storage wiring (`apps/web/src/server/storage.ts`, into `packages/adapters/src/storage-fs/`) and `packages/database/src/demo/evidence.ts`. Evidence attaches to the author's own review by `review_id`, and the intake checks authorship with U47's `isReviewAuthor(reviewId, actor)`; it adds no review query. Originals are never served by any route (FR65). Public pages show only the "Documents attached — not medically validated" note and the number of items that passed the scan (FR56); no file, preview or processed copy is shown publicly in release 1.
- **Owns the public evidence count:** the evidence module's `countPublicEvidence(reviewId)` implements the `PublicEvidenceCount` port U46 declared, and the "passed the scan" state constant lives in `packages/domain/src/evidence/`. This Unit swaps the interim binding in `container.ts` (append-only shared) to its implementation and deletes `countReadyEvidence` and `DEMO_READY_EVIDENCE_STATE(S)` with `demo/evidence.ts`. U46's and U47's pages pick up the new meaning through the port without being edited.
- **Seam it takes over:** the self-fetching `<EvidenceSection reviewPublicId>` slot U47 mounts on the experience page; this Unit replaces its internals and does not edit the page.
- **Owned paths:** `packages/domain/src/evidence/`, `packages/application/src/modules/evidence/`, `packages/application/src/ports/{repositories/evidence.ts,storage.ts,scanner.ts}`, `packages/adapters/src/{storage-fs,scanner-clamd}/`, `packages/database/src/repositories/evidence.ts`, `packages/database/src/demo/evidence.ts`, `packages/contracts/src/{schemas,view-models}/evidence.ts`, `packages/test-support/src/fakes/{storage,evidence-repository,scanner}.ts`, `packages/test-support/src/seed/seed-evidence.ts`, the evidence fixtures in `packages/test-support/fixtures/`, `apps/worker/src/handlers/evidence-process.ts`, `apps/web/src/app/api/evidence/` (U41 later adds only the origin check), `apps/web/src/server/actions/evidence.ts`, `apps/web/src/server/{clamav,storage}.ts`, `apps/web/src/components/patient/evidence/`, and the `CLAMD_*` and evidence limit variables in `infra/compose/.env.example`.
- **Not in release 1:** sanitise and re-encode, preview rendering, manual redaction, author privacy confirmation and publication of processed copies (T-305), the viewer and the public evidence sections (T-308), the PDF rasteriser (out of scope already by FD-036), the custody log, retention expiry and legal holds (T-309), and the worker's in-app evidence notifications (T-405, FD-070). All are deferred to release 2 (FD-105). The pipeline ends after a clean scan; U48's Functional Design names the state that ends it from the existing `evidence_items` states, without a new enum value where possible.
- **Decision changes:** FD-036, FD-070 (in-app part deferred), written into the task files' amendments sections.
- **Stories:** US7.1
- **Depends on:** U47

### U49 — Comments: comments with one reply level and owner delete

- **Status:** active (release 1, new; FD-105)
- **Source:** T-401 and T-402 (their task files are the specification, read together)
- **Kind:** untagged · **Size:** L (4–6 h agent; validation 1.5 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the Community module for comments on a published review: a signed-in, confirmed account posts a plain-text comment or a reply to a top-level comment (one reply level); the author of a comment deletes it, which leaves a "Comment deleted" placeholder when it has replies and removes it otherwise (FR72); comment authors appear through U11's personas, and an anonymous review author commenting in their own thread appears under that thread's alias. The persistent medical-advice disclaimer stays above the thread (FR75). It replaces the demo slice's comment code (`packages/database/src/demo/comments.ts`, the comment binding in `apps/web/src/server/data.ts`) behind the self-fetching `<CommentThread reviewPublicId>` slot U47 mounts on the experience page, so this Unit does not edit the page. Whether the review is published comes from U47's `isReviewPublished(reviewId)`; this Unit adds no review query.
- **Owned paths:** `packages/domain/src/community/`, `packages/application/src/modules/community/`, `packages/application/src/ports/repositories/community.ts`, `packages/contracts/src/{schemas/community.ts,view-models/thread.ts}`, `packages/database/src/repositories/community.ts`, `packages/database/src/demo/comments.ts`, `packages/test-support/src/{fakes/community-repository.ts,builders/comment.ts}`, `apps/web/src/components/patient/comments/`, `apps/web/src/server/actions/comments.ts`.
- **Not in release 1:** mentions, reactions (Like and Dislike, FD-062), blocks and the `blocks-between` query, comment editing and its history, warned external links (URLs stay plain text), the dangerous-instruction warning and moderator review, `community.setState` and the deletion step, the `ModerationSignals` and `DiscussionPresence` ports, bookmarks, and the discussion email (FD-070, FD-075). All are deferred to release 2 (FD-105).
- **Decision changes:** FD-046 applies as written; FD-062, FD-070, FD-073 and FD-075 apply to deferred parts only.
- **Stories:** US8.1, US3.3
- **Depends on:** U47, U11, U9

### U50 — Release check: bilingual end-to-end walk, demo composition and reset, final validation and docs

- **Status:** active (release 1, new; FD-105)
- **Source:** T-503, T-504 and T-505 (their task files are the specification, read together)
- **Kind:** spec · **Size:** XL (7–9 h agent; validation 2 h; the owner's review 1 h) · **Deployment:** embedded in the shared web/worker deployment
- **Responsibilities:** the Playwright suite for the release-1 storyboard parts, each walked in `en` and `bn` (reading: home, doctor, facility and topic pages, an experience; contributor: register, confirm through Mailpit, sign in, reset, security page; writing: compose, publish, correct, attach an image and see it scanned; discussion: comment, reply, delete), with axe (no serious or critical violation) on every walked page, keyboard-only runs of register, sign-in and the composer, a reduced-motion project and `check:motion`, and the NFR13 gate (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, throttled mid-range Android) on the `/en` and `/bn` home and experience pages. The demo composition (`pnpm demo`, `demo:reset`, `DEMO.md`, the storyboard walk-through record), the release-1 gate matrix and close-out docs, and the removal of demo-slice read functions that have no caller left. The CR-004 live-region announcements are asserted on the walked pages.
- **Owned paths:** `apps/web/playwright.config.ts`, `apps/web/e2e/`, `scripts/{demo,demo-reset,demo-clock,wait-for}.mjs`, `DEMO.md`, `README.md`, `docs/validation/`, the `e2e`, `demo*` and `screenshots` scripts of the root `package.json`, `infra/compose/docker-compose.yml`, the close-out entries in `docs/status/` and `docs/planning/09-coverage-matrix.md`, and leftover functions in `packages/database/src/demo/`.
- **Not in release 1:** the Firefox and WebKit projects and the full viewport matrix (Chromium at 360 px and desktop only), the screenshot capture of every page, the zoom, text-spacing and Bengali-overflow suites for deferred pages, the staff and workspace journeys (storyboard Parts 5 and 6), the search page, and the GitHub Actions `e2e.yml` (FD-102). All are deferred to release 2 (FD-105). Storyboard steps that need a deferred Unit are marked "release 2" in the walk-through record, not failed.
- **Stories:** US1.1, US2.1, US2.2, US2.3, US2.4, US12.1, US12.3
- **Depends on:** U9, U11, U20, U22, U41, U46, U47, U48, U49

## Constants that stand in for T-105

T-105 (U12) is deferred, so every setting a release-1 Unit reads stays a constant in code. Settings in the configuration schema are read through the defaults-only `ConfigProvider` U8 wired in `apps/web/src/server/container.ts`, with the values of `DEFAULT_CONFIG_VALUES` in `packages/contracts/src/config-values.ts`; limits that are not in that schema are named constants in their module. Each Unit records the constants it reads as an `S4` row in `ISSUES.md`, so release 2 can move them into T-105.

| Setting | Value in release 1 | Read by | Where it lives |
|---|---|---|---|
| `limitedDataThreshold` | 5 (placeholder; the real threshold is a deferred product decision) | U46, U47 | `DEFAULT_CONFIG_VALUES` through the defaults-only `ConfigProvider` |
| `emergency.*` (999, 16263, crisis line, last verified 2026-08-21) | as in `DEFAULT_CONFIG_VALUES` | U20, U46 (profile emergency panel) | `DEFAULT_CONFIG_VALUES` |
| `featureVisibility.facilityAccounts` | `true` | U46 | `DEFAULT_CONFIG_VALUES` |
| `signIn.*` (FD-063 delay values) | as in `DEFAULT_CONFIG_VALUES` | U8 (merged) | `DEFAULT_CONFIG_VALUES` |
| Sentiment choice optional by default (FR45) | optional | U47 | review domain constant |
| Reviewer's label suggestions (FR47) | the prototype's list | U47 | `as const` list in `packages/contracts` |
| Provisional taxonomy term limit (T-201 BR5.6) | 30 per account per hour, per process | U46 | taxonomy module constant on T-101's `RateLimiter` |
| Review publish and draft-save limits | set in U47's Functional Design | U47 | review module constant on T-101's `RateLimiter` |
| Comment post limit | set in U49's Functional Design | U49 | community module constant on T-101's `RateLimiter` |
| Evidence limits (FR61: 10 files, 15 MB per file, 100 MB per review) | as FR61 | U48, U41 | `packages/domain/src/evidence/limits.ts` |
| `retention.originalDays` | 90, not enforced (no expiry job until T-309) | none | `DEFAULT_CONFIG_VALUES`; recorded by U48 as an `S4` row |

`thresholds.*`, `reportReasons`, `capabilities.*`, `retention.auditDays`, `retention.notificationDays` and `featureVisibility.compareTray` have no release-1 reader.

## Task headers to correct

Requirements Analysis found task headers that cite old matrix meanings (T-302, T-303, T-304, T-305, T-308, T-309, T-404, T-406). Each active Unit corrects the headers of its own task files as part of its Code Generation (U22 for T-302, U48 for T-303 and T-304); the deferred ones are corrected when their Units run in release 2. The meanings are in `requirements.md`.

## Decision changes per Unit

The owner decisions FD-039 and FD-045..FD-075 that change a Unit's scope are written into that Unit's task file (FD-074): an `## Amendments — owner decisions (FD-045..FD-075)` section after the header table, in-place corrections marked `(FD-0nn)`, and new acceptance rows whose first cell starts `FD-0nn:`. Build and Test executes those rows with the rest of the table. FD-105 adds one more amendment to each active Unit's task files at its Code Generation: an `## Amendments — release 1 (FD-105)` section listing the parts deferred to release 2, whose acceptance rows Build and Test records as "deferred to release 2 (FD-105)". Decisions that change no Unit's scope (FD-045, FD-048, FD-054, FD-055) are not listed; FD-067 (ports) is pinned in Contract Design.

| Unit | Decisions | Task text corrected because it contradicted a decision |
|---|---|---|
| U5 (CR-006) | FD-050, FD-071 | it assigned mail.send to T-405; T-101 builds it (FD-071) |
| U6 (CR-012) | FD-039 | — |
| U8 (T-101) | FD-056, FD-057, FD-058, FD-059, FD-063, FD-071, FD-072 | — |
| U9 (T-102) | FD-053, FD-057, FD-096, FD-103, FD-105 | registering no longer signs in (FD-103); terms and privacy pages are T-207 Half A's, already merged |
| U11 (T-104) | FD-015, FD-016, FD-022, FD-105 | the reveal and `deidentify` are deferred (FD-105) |
| U20 (T-207) | FD-046, FD-105 | the home search box is dropped while T-206 is deferred (FD-105) |
| U22 (T-302) | FD-049, FD-070, FD-073, FD-075, FD-105 | only corrections with versions are in release 1; the T-405 email calls are dropped (FD-105) |
| U41 (T-502) | FD-072, FD-102, FD-105 | rate limits, `assertAppMode`, the FD-072 test and the PWA CSP are deferred (FD-105) |
| U46 (T-201, T-202, T-203) | FD-067, FD-076..FD-090 (T-201 amendments), FD-100, FD-101, FD-102, FD-105 | Directory and Taxonomy queries read the review repository directly; they read through the ProviderExperience and ConditionStats ports (FD-067); the CI gate is gone (FD-102) |
| U47 (T-301, T-306, T-307) | FD-015, FD-090, FD-100, FD-105 | T-306's add-doctor panel came from T-204; it calls U46's FD-100 command (FD-105); `limitedDataThreshold` comes from the configuration defaults, not T-105 (FD-105) |
| U48 (T-303, T-304) | FD-035, FD-036, FD-070, FD-105 | the pipeline ends after the scan; sanitise, preview and the in-app notifications are deferred (FD-105) |
| U49 (T-401, T-402) | FD-046, FD-062, FD-070, FD-073, FD-075, FD-105 | comments were like-only; they take Like and Dislike (FD-062), and reactions are deferred to release 2 (FD-105) |
| U50 (T-503, T-504, T-505) | FD-091, FD-102, FD-105 | its "no gate" for Lighthouse is overridden for the `/en` and `/bn` home and experience pages (NFR13, FD-091); the search page leaves the gate while T-206 is deferred; no `e2e.yml` (FD-102) |
| U45 (T-011) | FD-091 | new Unit; written with the decision |

The rows for the deferred Units U10, U12, U17, U24's in-app part, U29, U32, U33, U34, U37 and U39 are unchanged in their task files and apply when those Units run in release 2.

## Deletion and export participants (ADR-006)

ADR-006 needs every participating module to offer an export and a delete-or-de-identify command, inside that module. T-410 (U39), which owns the data-request module and the participant files, is deferred to release 2 (FD-105), and so are the participant commands: `identity.deidentify` (T-104), the review and community deletion steps (T-302, T-401), `evidence.remove` for originals under retention (T-305), and the directory and moderation de-identify commands (T-204, T-404). Release 1 has no account export or account deletion. The release-1 modules are built so that the participants can be added inside them later: each module owns its tables, and no release-1 Unit writes another module's tables.

| Module | Delete or de-identify step | Notes |
|---|---|---|
| account | deferred with U39 (T-410) | the auth user is removed without any worker privilege on auth_users (FD-041); the mechanism is an open point for Contract Design |
| identity | deferred with U39 (T-410); `deidentify` dropped from U11 | persona links deleted; personas keep their snapshots |
| review | deferred with U39 (T-410) and U22's tombstone part | holds checked through T-309 (FD-073) |
| community | deferred with U39 (T-410) | the author's own delete exists in release 1 (U49); holds checked through T-309 (FD-073) |
| evidence | deferred with U39 (T-410) and U25 (T-305) | the author's own removal exists in release 1 (U48) |
| notification | deferred with U39 (T-410) | notifications, preferences and email deliveries |
| search | deferred with U18 (T-205) and U39 (T-410) | — |
| directory | deferred with U17 (T-204) and U39 (T-410) | submissions, including FD-100's member-added ones, keep the submitter's account id until then |
| moderation | deferred with U33 (T-404) and U39 (T-410) | — |

## Open points carried forward

The Domain Design open points that were not settled there, each with the place that resolves it. Points whose Unit is deferred move to release 2 with it.

| Open point (Domain Design) | Resolved in |
|---|---|
| Port signatures for the FD-067 cycle breaks (OperationalCounts, RecipientDirectory, RevealContact, RevealTarget, RetentionSubject, ConditionStats, ProviderExperience, ProfileMergeParticipant, DiscussionPresence, ModerationSignals) | ConditionStats and ProviderExperience: U46 (pinned in Contract Design as C6, C7). The others: release 2 with their Units |
| Recipients in outbox payloads for notification.deliver | release 2 with U34 (T-405); no release-1 command publishes a notification event |
| config.applied recorded only in Administration's audit stream (no outbox row) | release 2 with U12 (T-105) |
| Evidence-to-draft link: evidence_items has no draft column, and publish must check the items belong to the draft and its author | U48 Functional Design: evidence attaches to the author's own review by `review_id`, and the intake checks authorship with U47's `isReviewAuthor(reviewId, actor)`; U47 publishes without evidence and U48 attaches to the review |
| Search evidence filters | release 2 with U18 (T-205) |
| Worker boundary versus data.delete; how the auth user is removed (FD-041) | release 2 with U39 (T-410) |
| Audit expiry and legal holds (AC7.3.5, FD-065) | release 2 with U29 (T-309) |
| FD-069 de-identify in Directory and Moderation, and legal holds on de-identified rows | release 2 with U17, U33, U29 and U39 |
| FD-073: an author's delete of a held review or comment | release 2 with U29 (T-309); release 1 has no legal holds |
| FD-067 and ADR-010: profile merge through ProfileMergeParticipant | release 2 with U17 (T-204) |
| Web-tier email queueing (FD-070, FD-075) | release 2 with U34 (T-405); no release-1 command queues discussion or moderation email |
| Audit ownership (FD-065): the moderation case timeline | release 2 with U33 (T-404) |
| Beta metrics; the severe sign-in notice's message key; sign-in counter address normalisation | release 2 with U37 (T-408) and U34; the sign-in parts were settled in U8 (T-101) |
| CR-006 migration number and the extra grant | settled in U5 (CR-006), merged |
| Review set-state.ts and one email per outcome | release 2 with U22's deferred part, U32 and U33 |
| Email for an author's own restore of a deleted review | release 2 with U22's deferred part and U34 |
| apps/web/src/server/container.ts creation | settled in U8 (T-101), merged |
| Repeat-episode flag (AC6.1.4) | release 2 with U32 (T-403); U47 stores nothing for it |
| Schema gaps: AC10.3.4 optional profile details and AC10.3.6 feedback fields (Account) | release 2 with U38 (T-409); feedback is text only (FD-097, built in U8) |
| Schema gaps: AC5.3.4 and AC11.1.5 tag-group rename and reorder, and the suggested-term flag (Taxonomy) | U46 Functional Design (the suggested-term flag); rename and reorder in release 2 with U12 and U37 |
| Schema gaps: AC6.4.4 ineligible marking and AC6.4.5 summary freeze | release 2 with U33 (T-404) and U22's deferred part |
| FD-061 protected fields widen to degrees and specialty | release 2 with U17 (T-204) |
| FD-070 follow-ups: export-ready email; email_deliveries.category discussion value | release 2 with U34 and U39 |
| FD-068: the retention block in the runtime configuration | release 2 with U12 and U29 |
| FD-072: the severe-activity outbox event and the brute-force setting keys | the keys and event were named in U8 (T-101), merged; their consumers are release 2 (U12, U34) |
| Demo-slice code retired by several Units (FD-105) | each Unit retires the demo functions in its owned paths once nothing outside them calls them; U50 removes any left without a caller |

## Documentation follow-ups

- `02-data-model.md` §7 still lists `retention_policies`, `legal_holds` and `retention_bulk_actions` under Evidence; their owner is Retention (FD-064, ADR-002). U29 (T-309) updates the ownership note in its Code Generation, in release 2.
- `02-data-model.md` §8 still says comments accept `like` only; FD-062 retires that rule. U49 updates the note in its Code Generation, saying that reactions are release 2 (FD-105).
- `02-data-model.md` §11 still describes a retention block in the configuration values; FD-068 makes `retention_policies` the only source. U12 (T-105) updates the note in release 2.
- `docs/implementation/README.md` §5 tracker and `docs/implementation/00-master-plan.md` §5: U50 records the FD-105 release split (release 1 Units, merged-into Units, deferred Units) in its close-out.
