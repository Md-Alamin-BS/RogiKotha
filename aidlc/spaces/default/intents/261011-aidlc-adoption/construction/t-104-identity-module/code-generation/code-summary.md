# Code summary — U11 `t-104-identity-module` (T-104, release 1, high risk: identity)

## What was built

- **Domain** (`packages/domain/src/identity/`): the `Persona` type, the random thread alias `patient-xxxx` (no confusable characters; only the first 42 characters of each random token are read, R-04) and `publicProjection`, which never puts an id into the view model and never a username on an anonymous persona (BR1.4, BR1.7, BR2.5, BR2.7).
- **Contracts**: `PersonaPublicVM` (`view-models/persona.ts`; `displayName` may be null for a legacy anonymous row) and `RenameNamedInput`, `PublicProjectionsInput` (`schemas/identity.ts`).
- **Application** (`packages/application/src/modules/identity/`): `createIdentityModule` with `createDefaultPersonas`, `personaFor` (named, pseudonymous, or one anonymous persona per account per review thread, created on first use in the caller's transaction, 5 alias attempts in a savepoint), `publicProjection(s)`, `publicPersonaIdsByUsername`, `identity.renameNamed` (a rename creates a new named persona; old bylines keep their snapshot) and the branded `IdentityOwnership` seam (`ownsPersona`, `ownPersonaIds`) for the review and community modules only. No reveal, `deidentify` or `accountsOf` (BR5.3, FD-105).
- **Database**: `PgIdentityRepository` (public reads) and the branded `PgPrivateIdentityRepository`, the only code that touches `persona_links` (BR3.1). Migration `0010_identity_constraints.sql`: the partial unique indexes `personas_anonymous_alias_uq` and `persona_links_account_review_uq` (also declared in the Drizzle schema, R-01) and `persona_links.review_id` made `DEFERRABLE INITIALLY DEFERRED`, `ON DELETE SET NULL` kept (BR2.9). `newestOf` orders by `created_at`, then `id`, so app-clock skew cannot hide a rename (ISS-473).
- **Register** is routed, not switched: `PgAccountRepository.insertDefaultPersonas` delegates to `PgPrivateIdentityRepository.createDefault` (Q2, the one BR3.2 exception).
- **Seed**: an anonymous review's link is inserted with its `review_id`; the back-fill `UPDATE` is gone (BR2.8). The seeded corpus is unchanged.
- **Web**: `apps/web/src/server/container.ts` builds the identity module once and exposes it as `WebContainer.identity`; no action, route, `data.ts`, worker or grants file changed.
- **Records**: the C4 release-1 amendment in `inception/contract-design/contract-summary.md` (C4 block only), ISS-456..ISS-478, the T-104 task file's Hand-off, the owner review queue row. No `decision-log.md` entry: no hard rule or data boundary changed.

## Files changed

From `git diff --name-only main` (the full list is `source-manifest.json`; no path contains `[`, `]` or `*`, so none is left out).

- Inside owned paths: `packages/domain/src/identity/{persona,alias,projection}.ts` and tests; `packages/application/src/modules/identity/**` (module, ports, ownership, persona-for, default-personas, projection, audit, `commands/rename-named.ts`, their tests, `identity.smoke.test.ts`, `identity.adversarial.test.ts`, `log-capture.test.ts`); `packages/database/src/repositories/{identity,identity-private}.ts`, `identity.int.test.ts`, `identity-private.int.test.ts`, `identity-private.adversarial.int.test.ts`, `persona-links-allowlist.test.ts`, `persona-links-scan.adversarial.test.ts`; `packages/contracts/src/view-models/persona.ts`, `schemas/identity.ts` and its test; `packages/application/src/modules/account/commands/register.ts` (comment only); `packages/database/src/schema/identity.ts` (added to the Unit's list by functional-spec § 7).
- **Outside owned paths** (one `ISS-` row each, Q4):

| Files | ISS |
|---|---|
| `packages/database/src/repositories/account.ts` | ISS-457 (and the S1 fix ISS-456) |
| `packages/database/src/migrations/0010_identity_constraints.sql`, `migrations/meta/0010_snapshot.json`, `migrations/meta/_journal.json`, `migrations.int.test.ts`, `validator-probes.int.test.ts`, `schema/foreign-keys.int.test.ts` | ISS-458 |
| `packages/database/src/repositories/not-implemented.test.ts` | ISS-459 |
| `packages/test-support/src/fakes/{identity,identity.test,index,repositories,repositories.test,repositories-superset.test}.ts`, `builders/persona.ts`, `packages/application/src/fakes-test-support.ts` | ISS-460 |
| `packages/test-support/src/seed/seed-content.ts` (U11 block, one comment beside it) | ISS-461 |
| `apps/web/src/server/container.ts`, `container.test.ts`, `identity-boundary.test.ts`, `identity-boundary.adversarial.test.ts` | ISS-463 |
| `packages/{application,domain,contracts,database}/src/index.ts` (exports added only) | ISS-464 |
| `lint-fixtures/boundary-violation/apps/worker/src/worker-identity.ts`, `lint-fixtures/boundary-violation/manifest.json`, `scripts/check-boundaries-fixture.test.mjs` | ISS-465 |
| `packages/database/src/reset.ts`, `global-setup.ts`, `reset-guard.int.test.ts` (`_test_w<n>` worktree databases) | ISS-466 |
| `docs/implementation/ISSUES.md`, `docs/implementation/tasks/T-104-identity-module.md`, `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`, `inception/contract-design/contract-summary.md` | shared records, append-only |

`packages/i18n/messages/en.json` and `bn.json` are unchanged (BR5.1). `.github/workflows` is untouched.

## Test results

- Identity-scoped (`vitest run identity`, Step 18): 14 files, 111 tests passed.
- Adversarial (Step 17, a separate agent, plus the fix pass): 4 files, 18 tests passed (`identity.adversarial.test.ts` 6, `identity-private.adversarial.int.test.ts` 7 with the ISS-473 regression, `persona-links-scan.adversarial.test.ts` 2, `identity-boundary.adversarial.test.ts` 3).
- Database project after Step 17: 42 files, 305 passed plus 2 expected fails (the existing ISS-139 and ISS-141 probes).
- Smoke: one identity assertion added (`identity.smoke.test.ts`, BR6.2).

### Final gate (Step 21)

Run on 2026-11-06 on the Bolt branch after the Step 17 tests and fix landed, with this Bolt's `DATABASE_URL_TEST` (`rogikotha_test_w2`); before the Step 19 rebase, which reruns it.

- `timeout 300 pnpm format:check`: exit 0, all matched files use Prettier code style.
- `timeout 1500 pnpm check`: **exit 0**. Typecheck clean; lint 0 errors, 1 warning (ISS-472, outside owned paths); boundaries check 18 expected violations found; Prettier clean; identity check found no attribution markers; tests with coverage 235 files, 2407 passed plus 2 expected fails (2409); i18n parity 879 keys; contrast, patient contrast and motion (2 stylesheets, M1–M11) passed; Next.js build compiled.
- `timeout 600 pnpm smoke`: **exit 0**, 18 files, 33 tests.

## Coverage (lines)

After, from the final `pnpm check` (`coverage/coverage-summary.json`), floor 80% per package:

| Package | Lines |
|---|---|
| apps/web | 95.91% (1593/1661) |
| apps/worker | 100% (176/176) |
| packages/adapters | 100% (117/117) |
| packages/application | 99.24% (653/658) |
| packages/contracts | 100% (376/376) |
| packages/database | 97.37% (963/989) |
| packages/domain | 97.62% (41/42) |
| packages/i18n | 100% (54/54) |
| packages/test-support | 97.47% (1347/1382) |
| total | 97.52% (5320/5455) |

Every identity source file is at 100% lines except `packages/database/src/repositories/identity-private.ts` at 97.5%.

ASSUMPTION(U11) (ISS-470): no coverage table was recorded when the Bolt started; the per-package 80% thresholds in `vitest.workspace.ts` stand in for the before table. The floor was not lowered.

## Issues

- Found and fixed in U11: ISS-456 (S1, registration crash from an undeclared field), ISS-471 (Prettier on 9 identity files), ISS-473 (newest persona ordered by the app-clock id).
- Recorded (outside owned paths and design choices): ISS-457, ISS-459, ISS-460, ISS-461, ISS-463, ISS-464, ISS-467.
- Open: ISS-458 (renumber the migration at the Step 19 rebase if needed), ISS-462 (seed not in one transaction), ISS-465 (sum the fixture count at merge), ISS-466 (one copy of the `_test_w<n>` change at merge), ISS-469 (ports-type checks for later modules, U47), ISS-472 (unused `eslint-disable` in `packages/i18n/src/routing.ts`), ISS-474 and ISS-475 (scan gaps, guarded by the stricter adversarial scans), ISS-476 (S3, owner decision), ISS-477 (ownership oracle tested at routes by U47 and U49), ISS-478 (gate unreliable under machine load).
- `ASSUMPTION(U11)` markers: ISS-466 (`reset.ts`), ISS-468 (`ports.ts` logger), ISS-469 (`container.test.ts`), ISS-470 (coverage before table), ISS-477 (no T-106 identity rows).
- ISS numbers: taken as the next free ids on this branch (after ISS-455). Parallel Bolts may take the same numbers; renumber at merge if they collide.

## Delegated sign-off

**Agent-written, delegated by the owner on 2026-11-04.** This is not the owner's own sign-off; it stays on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` for the owner to confirm (team practice step 5).

- **Adversarial results** (BR6.1, a separate agent): 18 tests over functional-spec § 8, all green. Cross-thread correlation (fakes and real tables): one account in two threads gets two unrelated aliases; the only shared values are `kind` and hue 0. Projection fuzz over every kind, junk ids and worst-case legacy rows: no id, account id or username leaks. Ownership oracle: 11 forged or borrowed (account, persona) pairs, including SQL-injection and padded ids, all answer false. `rk_worker` is refused select, count, insert, update, delete, truncate and copy on `persona_links`, sees no `pg_stats` rows and no view on it. Alias exhaustion in a live transaction: exactly 5 draws, an `internal` error, no link written, nothing private logged, and the transaction stays usable. Username lookup: an alias, "Anonymous", wildcards and an empty string find nothing. Rename (including an NFD Bengali name) leaves earlier personas byte-identical.
- **Defects**: no S1 or S2 left open. ISS-456 (S1) was found by the integration tests and fixed in the Bolt. The adversarial pass found one latent ordering defect, fixed with a regression test (ISS-473), two S4 guard gaps now guarded by stricter scans (ISS-474, ISS-475) and one S3 point for the owner (ISS-476).
- **Open `ISS-` rows**: ISS-458, ISS-462, ISS-465, ISS-466, ISS-469, ISS-472, ISS-474, ISS-475, ISS-476, ISS-477, ISS-478.
- **Gate**: see "Final gate" above. Step 19 (rebase and merge) is the orchestrator's and reruns the gate.
- **Hard rules**: no anonymous persona is reachable by username, projection, action or worker; no account-and-persona pair is logged; no new user-facing string; no tool, model or agent identity in any file or commit.
- **For the owner to decide**: ISS-476. Suggested: reject display names that match the alias pattern (a contracts change, both languages for the error text).
