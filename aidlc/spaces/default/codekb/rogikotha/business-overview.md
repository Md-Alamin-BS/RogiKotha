# Business Overview — rogikotha

## Business Domain

RogiKotha (রোগীকথা, "the patient's account") is a public, bilingual (Bengali and English) health platform that publishes structured, evidence-attached patient accounts of doctors and facilities in Bangladesh, with provenance, distributions instead of scores, and a moderation path. It is explicitly not medical advice, not a star-rating app and not a booking portal (source: `PRODUCT.md`).

Audiences:
- **Reader** (primary): a Bangladeshi patient deciding whether to consult a doctor, often on a low-end Android phone, often in Bangla.
- **Patient-author** (secondary): writes or finishes their own account, optionally anonymous or pseudonymous.
- **Staff** (tertiary): moderators, admins and a super admin working in the staff console.

## Purpose of This Codebase

The repository is building a **locally runnable demo** of the finished product (FD-031): the approved 04b "Quiet Clinic" patient UI and the "Chart Tray" staff console, ported from the static prototype in `ui-design-prototype/`, on a real Next.js + PostgreSQL backend with a pg-boss worker, Mailpit and ClamAV. The plan is phased (Phase 0 foundation through Phase 5 hardening) in `docs/implementation/00-master-plan.md`.

**Current state (commit `4f05dc0`)**: Phase 0 foundation is largely in place. The code holds the shared vocabulary, the full data model, the worker skeleton, the bilingual dictionaries, the seeded synthetic corpus and the web shell. No business use case (sign-up, publishing a review, uploading evidence, moderation) is implemented yet: the domain, application and adapters packages are empty, and most pages render a placeholder naming the task that will build them.

## Key Functionality

| Capability | Status in code | Where |
|---|---|---|
| Bilingual shell: locale-prefixed routes `/en`, `/bn`, cookie-remembered language, Bengali numerals | Implemented | `apps/web/src/proxy.ts`, `apps/web/src/app/[locale]/layout.tsx`, `packages/i18n/` |
| Theme and motion preferences (server-rendered, cookie based) | Implemented | `apps/web/src/server/actions/preferences.ts`, `apps/web/src/lib/cookies.ts` |
| Patient chrome, staff console chrome, demo marker, skip link, live region | Implemented | `apps/web/src/components/` |
| Emergency guidance, About, Privacy, Terms pages | Implemented (static config defaults) | `apps/web/src/components/patient/{Emergency,About,Policy}.tsx` |
| Doctor/facility/topic directory, search, experiences, composer, workspace, notifications | Placeholder pages only | `apps/web/src/app/[locale]/(patient)/**` |
| Staff queue, evidence quarantine, providers, notifications, config, device approval | Placeholder pages only; no staff guard | `apps/web/src/app/[locale]/admin/**` |
| Data model for accounts, identity separation, directory, taxonomy, reviews, evidence custody, community, moderation, notifications, search, retention/holds, data requests, config, audit, demo clock | Implemented as schema + migrations | `packages/database/src/schema/`, `packages/database/src/migrations/` |
| Least-privilege database roles (`rk_app`, `rk_worker`, `rk_maintenance`) and append-only tables | Implemented | `infra/compose/postgres-init/`, migrations `0001`, `0003`, `0005`, `0006` |
| Transactional outbox relayed to background jobs | Implemented (relay only; downstream job handlers not yet) | `apps/worker/`, `packages/database/src/repositories/outbox.ts` |
| Synthetic demo corpus and idempotent seed | Implemented | `packages/test-support/src/corpus/`, `src/seed/` |

## Business Rules Visible in Code

These product hard rules are already encoded (as schema, contracts or tests) rather than only in prose:

- **No quality score**: view models carry distributions with `counts`, `total` and `limitedData` (`packages/contracts/src/view-models/doctor.ts`); there is no rating column.
- **Registration not verified**: `DoctorCardVM.registrationNotVerified: true` is a literal type.
- **Attestation required to publish**: `PublishReviewInput.attestation` is `z.literal(true)` (`packages/contracts/src/schemas/review.ts`).
- **Capabilities by staff role**, with identity reveal and original-evidence access off by default for admin and moderator and switchable by config (`packages/contracts/src/actor.ts`).
- **Reporter identity never reaches the worker**: `rk_worker` gets `reports` columns except `reporter_account_id` (`packages/database/src/migrations/0005_grants_part2.sql`).
- **One-level replies**: a database trigger refuses a reply to a reply (`0003_triggers.sql`).
- **Custody and audit are append-only**: triggers block UPDATE/DELETE on six tables, with one audited expiry function (`0003_triggers.sql`).
- **Lawful-key and emergency parity tests** for FD-022 copy placement (`apps/web/src/components/patient/fd-022-*.test.ts(x)`).

## Glossary (code terms)

| Term | Meaning in code |
|---|---|
| Account / review ("account" in copy) | A patient's published experience; `reviews` table, `review_versions` history |
| Persona | Public identity snapshot used on content; private linkage in `persona_links` |
| Evidence item / artifact | Uploaded document in quarantine, and its derivative; custody in `evidence_custody_events` |
| Outbox event | Row in `outbox_events` written in the same transaction as a change; relayed to pg-boss jobs |
| Public id | 10-character Crockford base32 identifier used in URLs (`newPublicId`) |
| `seed_ref` | Stable prototype id (for example `d1`, `r6`) kept on seeded rows for tests |
| Demo clock | Single-row `demo_clock` table allowing time offset in demo/development mode |

Architecture is described in `architecture.md`; component responsibilities in `component-inventory.md`.
