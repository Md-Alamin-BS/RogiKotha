# Code Generation plan — U11 `t-104-identity-module` (T-104, release 1, FD-105)

## Summary

- Builds: the identity module for release 1: the `Persona` domain type, the random thread alias and `publicProjection`; `createIdentityModule` with `createDefaultPersonas`, `personaFor`, `publicProjection(s)`, `publicPersonaIdsByUsername`, `identity.renameNamed` and the private `IdentityOwnership` seam; `PgIdentityRepository` and the branded `PgPrivateIdentityRepository`; one migration for two partial unique indexes and the deferrable `persona_links.review_id` key. No reveal, no `deidentify`, no `accountsOf` (BR5.3)
- Touches: `packages/{domain,contracts,application,database,test-support}`, `apps/web/src/server/container.ts` and `container.test.ts` (identity block only), the shared seed's U11 block, the barrels, and the records (functional-spec § 7)
- Tests: domain alias and projection tests (property and uniformity), application tests with `test-support` fakes, database `*.int.test.ts` against the Bolt's own `DATABASE_URL_TEST`, the `persona_links` allowlist test, web container type tests, one smoke assertion, and 3–5 adversarial tests by a separate agent (high-risk Unit: identity)

## Inputs

- Functional Design (reviewed READY, iteration 1): `construction/t-104-identity-module/functional-design/`: `functional-spec.md` (§§ 1–9, WF1–WF6), `rules.md` (BR1.1–BR6.2), `entities.md`, `functional-design-questions.md` (Q1–Q15), `traceability.json`, and `reviews/review-01.md`.
- `inception/units-generation/unit-of-work.md`, U11 entry (owned paths, "Takes over from T-106", depends on the merged baseline only).
- `inception/contract-design/contract-summary.md`, C4 (identity), C9 (`isReviewAuthor`), C19 (module wiring).
- Task `docs/implementation/tasks/T-104-identity-module.md`, AD-3, FD-015, FD-022, FD-024, FD-040, FD-094, FD-102, FD-105.
- The code on `main` the design names: `packages/database/src/schema/identity.ts`, `migrations/0000_init.sql`, `0001_grants_part1.sql`, `0004_deferred_fks.sql`, `repositories/{identity,account,not-implemented}.ts`, `packages/application/src/modules/account/commands/register.ts`, `packages/test-support/src/seed/seed-content.ts`, `packages/test-support/src/fakes/repositories.ts`, `packages/test-support/src/builders/persona.ts`, `apps/web/src/server/container.ts`.

## Review points carried into this plan

The design's rules already absorb all seven findings of `review-01.md`. The build keeps them as written:

1. **R-01 (Major), indexes in the Drizzle schema.** `personas_anonymous_alias_uq` and `persona_links_account_review_uq` are declared in `packages/database/src/schema/identity.ts` with `uniqueIndex().on(...).where(...)`. The migration is generated from the schema, and only the deferrable key is hand-written SQL appended to it (the `0004_deferred_fks.sql` precedent). An integration test reads both indexes by name from `pg_indexes`, with their `WHERE` clauses, after migrating from empty (Step 9).
2. **R-02 (Major), allowlist.** The BR3.1 allowlist names `demo/comments.ts` (removed by U49) and each FD-040 seed file by name (Step 10).
3. **R-03, raw-string bypass.** The allowlist test also searches non-test source for the text `persona_links` outside comments, and adversarial angle 2 tries that bypass (Steps 10, 17).
4. **R-04, skewed 43rd character.** `newAnonymousAlias` reads only the first 42 characters of each token, and a test proves the 43rd is never read (Step 5).
5. **R-05, exact column list.** The `personas` schema test compares against the exact list `{id, kind, display_name, username, avatar_hue, created_at}` (Step 9).
6. **R-06, seed back-fill.** The seed's `UPDATE persona_links SET review_id` becomes an insert of the link with its `review_id` (BR2.8). The seed does not run in one transaction, so the link is inserted after its review row, which needs no deferral (Step 11).
7. **R-07, register delegation.** `PgAccountRepository.insertDefaultPersonas` delegates to `PgPrivateIdentityRepository.createDefault`, the one allowed exception in BR3.2. `IdentityModule.createDefaultPersonas` has no release-1 caller beyond tests. The C4 amendment is written into the contract-summary block (Step 21).

## How this Unit runs

- **Own worktree and test database.** The Bolt runs in its own git worktree on `bolt/t-104-identity-module`, branched from `main`. Its `DATABASE_URL_TEST` points at one of `rogikotha_test_w1` to `rogikotha_test_w6`; the orchestrator assigns which one, and every database-touching command in this plan uses it. The compose PostgreSQL is shared and must be running (`pnpm infra:up`). The Bolt never points at another Bolt's database or at the development database.
- **Local gate only.** No GitHub Actions or other CI exist (FD-102, commit `a891313` deleted the workflow). The gate is `pnpm check` and `pnpm smoke` on the Bolt branch, then again on `main` after the squash merge.
- **One database command at a time** within this worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`), because they all reset the same test database.
- Commits carry only the human's own git identity; no tool or model identity anywhere. No `git reset --hard`, `git checkout --` or `git clean` on a dirty tree. Only the owned paths and the listed shared files are committed, after reading `git diff --cached`.

## Steps (test-after, per the Testing Contract)

- [ ] **Step 1** — Baseline in the Bolt worktree on `bolt/t-104-identity-module`. Run `pnpm infra:up`, then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green with this Bolt's `DATABASE_URL_TEST`. Record the file and test counts and the per-package line-coverage table in `code-summary.md`. Read the open `ISSUES.md` rows in the identity, account and seed areas.
- [ ] **Step 2** — Verify the test runner and record the unit-scoped commands in `unit-test-instructions.md`: Vitest 4 through `vitest.workspace.ts` with the projects `domain`, `contracts`, `application`, `database`, `test-support`, `web`, `scripts`. Run one existing test per project by file path to prove the filters work (for example `packages/domain/src/account` and `packages/database/src/migrations.int.test.ts`). No new dependency: Drizzle's `uniqueIndex().where()` is already used in `schema/directory.ts` and `schema/evidence.ts`, so no dependency-check entry is needed; confirm that in `code-summary.md`.
- [ ] **Step 3** — Contracts, implement: `packages/contracts/src/view-models/persona.ts` (`PersonaPublicVM`, a discriminated union by `kind` with exactly the BR1.4 keys; `displayName` nullable on anonymous, BR2.7), `packages/contracts/src/schemas/identity.ts` adds `PersonaForInput`, `RenameNamedInput` (NFC, trimmed, 1–60, `errors.auth.displayNameRequired`) and `PublicProjectionsInput` (at most 200 ids). `RevealIdentityInput` and `AccountsOfInput` stay untouched (BR5.3). Export through the contracts barrel.
- [ ] **Step 4** — Contracts, test: `packages/contracts/src/schemas/identity.test.ts` (rename trims, normalizes NFC, refuses empty and 61 characters with the key; projections refuses 201 ids) and a type-level test that `PersonaPublicVM` has no `id`, `personaId`, `accountId` or timestamp key. Run them.
- [ ] **Step 5** — Domain, implement: `packages/domain/src/identity/persona.ts` (the `Persona` type, `kind` enum from contracts), `alias.ts` (`newAnonymousAlias(randomSource)`, `ALIAS_PATTERN`; BR2.5: first 42 base64url characters per token, keep index < 62, `ALPHABET[i mod 31]`), `projection.ts` (`publicProjection(persona)`, BR1.4, BR1.7, BR2.7). Export from `packages/domain/src/index.ts`.
- [ ] **Step 6** — Domain, test: `alias.test.ts` (prefix and alphabet, length 13, rejection of indices 62 and 63, the 43rd character never read, a new token drawn when one runs out, a chi-square uniformity bound over 10 000 draws, nothing but the random source used), `projection.test.ts` (the exact key set per kind, a property test over 1 000 generated personas against the BR1.4 denylist, legacy "Anonymous" projects `displayName: null`, anonymous hue 0 and never a username). Run them.
- [ ] **Step 7** — Application, implement: `packages/application/src/modules/identity/ports.ts` (`IdentityModulePorts`, `IdentityRepository`, the branded `PrivateIdentityRepository` with a `unique symbol`), `persona-for.ts` (WF2, WF3; up to 5 alias attempts, then `err('internal')` and log `identity.alias_exhausted {attempts}`), `default-personas.ts` (BR1.2), `projection.ts` (WF5; de-duplicate, more than 200 is a programmer error, input order, unknown omitted), `ownership.ts` (`ownsPersona`, `ownPersonaIds` with the 1 000 cap), `commands/rename-named.ts` (`defineCommand`, `requires: { authenticated: true }`, BR4.1), `audit.ts` (`named_persona_created {}` on `account:<accountId>`), `index.ts` (`createIdentityModule`). Export from `packages/application/src/index.ts`. In `modules/account/commands/register.ts` replace only the `TODO(T-104)` comment with a pointer to BR1.2. Then the `test-support` fakes: `FakeIdentityRepository` (replacing the stub mirror) and `FakePrivateIdentityRepository` in `packages/test-support/src/fakes/`, which keep the alias and thread uniqueness and can force `alias_taken` or `thread_taken`; extend `builders/persona.ts` if a kind is missing. The account fake keeps `insertDefaultPersonas`.
- [ ] **Step 8** — Application, test (with the fakes): every `personaFor` branch (named, pseudonymous, missing default created, anonymous found, anonymous created, `thread_taken` re-read, `alias_taken` retried, exhaustion after 5 with nothing written, anonymous without `reviewId` throws), `createDefaultPersonas` idempotent, projections order and omission, `ownsPersona` true, false for another account and for unknown ids, `ownPersonaIds`, `renameNamed` happy path with one audit assertion, unchanged name without audit, validation refusal, anonymous actor refused; the BR3.8 log-capture test over every identity operation. Re-run the existing `register.test.ts`. Run them and the fake tests in `test-support`.
- [ ] **Step 9** — Database, implement: declare both partial unique indexes in `packages/database/src/schema/identity.ts`; generate the migration with drizzle-kit, rename it `<next>_identity_constraints.sql` (today `0010`; renumbered at merge, BR5.4) and append the hand-written `DROP CONSTRAINT` / `ADD CONSTRAINT persona_links_review_id_reviews_id_fk ... ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED`; journal entry with a timestamp later than the previous one, and its snapshot. Replace the stub in `repositories/identity.ts` with `PgIdentityRepository` (`byIds`, `publicIdsByUsername`, BR1.6), add `repositories/identity-private.ts` (`PgPrivateIdentityRepository`: `createDefault`, `createMissingDefault`, `currentOf`, `findAnonymous`, `insertAnonymous` in its own savepoint answering `ok | alias_taken | thread_taken`, `insertNamed`, `owns`, `personaIdsOf`). `repositories/account.ts`: `insertDefaultPersonas` delegates to `createDefault`, and its persona SQL and `personaLinks` import go. `not-implemented.test.ts` drops `PgIdentityRepository` (BR5.3). Export through the database barrel.
- [ ] **Step 10** — Database, test (`*.int.test.ts` against this Bolt's `DATABASE_URL_TEST`): `repositories/identity.int.test.ts` and `identity-private.int.test.ts` (every method; both indexes exist by name with their `WHERE` clauses and are enforced; the exact `personas` column list; persona and link first, review later, one transaction commits; the savepoint leaves the outer transaction usable after `alias_taken`; ten concurrent `personaFor` calls give one persona; `rk_worker` gets `permission denied` on `persona_links`); `account.int.test.ts` still creates both personas through the delegation; `foreign-keys.int.test.ts` expects the key deferrable; the migration counts in `migrations.int.test.ts` and `validator-probes.int.test.ts` go up by one. The BR3.1 allowlist test `packages/database/src/repositories/persona-links-allowlist.test.ts` scans every non-test `.ts`/`.tsx` source under `packages/` and `apps/` for the `personaLinks` import and for `persona_links` outside comments, and allows only the BR3.1 list (each demo file named with its removing Unit). Run them, then `timeout 600 pnpm test:int`.
- [ ] **Step 11** — Seed (shared, U11's block in `packages/test-support/src/seed/seed-content.ts` only): replace the back-fill `UPDATE` of `persona_links.review_id` with an insert of the link carrying its `review_id`, placed after the review row is inserted, and keep `ensureAnonymousPersona`'s idempotency check working (BR2.8). Run the seed integration test (`packages/test-support/src/seed/seed.int.test.ts`) and the demo-slice tests that read seeded anonymous reviews; the seeded corpus and the storyboard data must not change.
- [ ] **Step 12** — Web, implement: `apps/web/src/server/container.ts`, identity block only and append-only: build `PgIdentityRepository`, `PgPrivateIdentityRepository` and `createIdentityModule({ identities, privateIdentities, crypto })`; export the module and `ownership` for the review and community factories that U47 and U49 add. No server action or route changes (BR3.6), and `data.ts` and the demo slice stay as they are (U47 switches them). The worker is not touched: `eslint.boundaries.mjs` already bans `**/modules/identity/**` in worker files and `0001_grants_part1.sql` already revokes `persona_links` from `rk_worker` (BR3.7), so no grants migration.
- [ ] **Step 13** — Web, test: `apps/web/src/server/container.test.ts` adds the `@ts-expect-error` assertions that no other module's ports type accepts the private repository (BR3.2) and that the directory, taxonomy and evidence ports types do not accept `IdentityOwnership` (BR3.5); `apps/web/src/server/identity-boundary.test.ts` asserts no file under `apps/web/src/server/actions/**` or `apps/web/src/app/api/**` imports identity internals (BR3.6). Confirm the existing boundary fixture covers a worker import of `modules/identity` (`pnpm lint:boundaries`). Run them.
- [ ] **Step 14** — UI: none. Release-1 bylines are rendered by U47 and U49; this Unit adds no component, no CSS and no page, so `impeccable detect` and `pnpm contrast` are only run as part of `pnpm check`.
- [ ] **Step 15** — i18n: this Unit adds no user-facing string (BR5.1, BR5.2); `renameNamed` reuses `errors.auth.displayNameRequired`. Confirm that key exists in both `packages/i18n/messages/en.json` and `bn.json`. If the build finds it must add any key, it adds the English and the Bengali entry in the same commit (Bengali marked for the owner's review, FD-042) and `pnpm i18n:check` stays green.
- [ ] **Step 16** — Smoke: `packages/application/src/modules/identity/identity.smoke.test.ts` (BR6.2): `personaFor` returns the same persona twice for one thread and a different alias for another, and the projection carries no username and no id. Run `timeout 600 pnpm smoke`; the suite only grows.
- [ ] **Step 17** — Adversarial tests (high-risk Unit, team practice step 5, BR6.1): a separate agent, which did not write the code, writes and runs 3–5 tests from functional-spec § 8 (cross-thread correlation; linkage leak including the raw `persona_links` string bypass; ownership oracle and the type-level factory check; race and alias exhaustion; reaching an alias by name and rename snapshots). They include the T-106 identity rows and stay in the suite as `*.adversarial.test.ts` (for example `packages/application/src/modules/identity/identity.adversarial.test.ts` and `packages/database/src/repositories/identity-private.adversarial.int.test.ts`). Fix anything they break in production code, never by weakening the test, and record each finding as an `ISS-` row.
- [ ] **Step 18** — Gate: `timeout 1200 pnpm check` (typecheck, lint, boundaries, format, identity check, coverage, i18n parity, contrast, motion, build) and `timeout 600 pnpm smoke`, both green with this Bolt's `DATABASE_URL_TEST`. Every touched package stays at or above 80% lines; record the coverage table before and after. The floor is never lowered.
- [ ] **Step 19** — Rebase for merge (the orchestrator merges one Bolt at a time): if another Bolt merged a migration first, renumber `<next>_identity_constraints.sql`, its snapshot and journal entry to the next free number with a later timestamp, regenerate the snapshot against the merged schema, and re-run Step 18 (BR5.4, the CR-006 lesson).
- [ ] **Step 20** — Delegated sign-off (high-risk Unit): write the sign-off block into `code-summary.md`, agent-written and labelled "delegated by the owner on 2026-11-04", listing the adversarial results, the open `ISS-` rows and the gate results. Add it to `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` so the owner can confirm it.
- [ ] **Step 21** — Records: `ISSUES.md` rows with `Found in U11 t-104-identity-module` (one per outside-owned-path file of functional-spec § 7, Q4, plus every defect, workaround, `ASSUMPTION(U11)` marker and adversarial finding), with severities S1–S4; the C4 release-1 amendment in `inception/contract-design/contract-summary.md` (C4 block only, functional-spec § 7); a `decision-log.md` entry only if the build changes a hard rule or a data boundary (none is planned); the task file's Hand-off. Then `code-summary.md` (files, test counts, coverage, `ISS-` ids found and fixed), `traceability.json` (AC3.3.1–AC3.3.6 and BR ids to files and tests) and `source-manifest.json` (literal paths only, no `[`, `]` or `*`; base `main`).

## Story and rule traceability

| Step | Rules | Stories |
|---|---|---|
| 3–4 | BR1.4, BR1.5, BR2.7, BR4.1, BR5.2, BR5.3 | US3.3 (AC3.3.2, AC3.3.3, AC3.3.6) |
| 5–6 | BR1.4, BR1.7, BR2.5, BR2.7 | US3.3 (AC3.3.1, AC3.3.2, AC3.3.3) |
| 7–8 | BR1.2, BR1.5, BR2.1–BR2.4, BR2.6, BR2.10, BR3.3, BR3.4, BR3.8, BR4.1 | US3.3 (AC3.3.1, AC3.3.2, AC3.3.3) |
| 9–10 | BR1.1, BR1.3, BR1.6, BR2.4, BR2.6, BR2.8, BR2.9, BR3.1, BR3.7, BR5.3, BR5.4 | US3.3 (AC3.3.1, AC3.3.2, AC3.3.3) |
| 11 | BR2.8, BR2.9 | US3.3 (AC3.3.1) |
| 12–13 | BR3.2, BR3.5, BR3.6, BR3.7 | US3.3 (AC3.3.3) |
| 14–15 | BR5.1, BR5.2 | US3.3 (AC3.3.6) |
| 16 | BR6.2 | US3.3 (AC3.3.1, AC3.3.2) |
| 17 | BR6.1 (T-106 identity rows) | US3.3 (AC3.3.1–AC3.3.3) |
| 18–21 | BR5.4, BR6.1, BR6.2 | — |

AC3.3.4 (reactions) is N/A and AC3.3.5 (audited reveal) is deferred to release 2 (FD-105).

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "classic",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: `01-conventions.md` §10 sets per-level test minimums that each task delivers together with its code, and §13's definition of done requires them green before hand-off. In git history, tests land in the same task commit as the implementation (for example T-007 and T-009). No source asks for tests to be written before the code, and test-after is the `org.md` default for the `classic` scope.\n- **Ordering**: Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.\n- Test levels follow `01-conventions.md` §10: domain (every state-transition table and policy function), application (each command's happy path, each authorization refusal and one audit assertion, using `test-support` fakes), database (`*.int.test.ts`, each repository method, migrations apply from empty), component (renders in both `en` and `bn`), and end-to-end with Playwright and axe from T-503.\n- Cumulative smoke suite: each unit adds at least one smoke assertion for what it delivered (`*.smoke.test.ts(x)`, and from T-503 also `apps/web/e2e/smoke/*.spec.ts`). `pnpm smoke` runs the whole suite every time. The suite only grows: removing or skipping a smoke assertion needs a recorded reason.\n- Integration tests: `pnpm test:int` runs the database project against `DATABASE_URL_TEST` (the `rogikotha_test` database, separate from the development database). It resets that database to an empty, freshly migrated schema and runs test files serially. It needs the compose PostgreSQL running.\n- Coverage: an 80% line-coverage floor per package, measured with Vitest `@vitest/coverage-v8` (already installed). T-010 adds the thresholds and the CI run before merge, and raises any package below 80%. Until T-010 lands, the floor cannot be measured: no Vitest config has a coverage block yet. Work before T-010 (CR-009) records \"coverage not measured yet\" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (the empty `domain`, `application` and `adapters` packages are exempt until then). We do not claim a coverage figure we have not measured, and once the floor exists it is never lowered to make a step pass (D10).\n- Existing suites stay green: `pnpm check` (typecheck, lint, unit and integration tests, i18n parity, build) and `pnpm smoke` must pass after every unit, with no assertion removed or skipped. In brownfield work we run the full suite before changing anything, to record a baseline.\n- Test names read as sentences. We use builders, not hand-written fixture objects, and we never assert on implementation details (class names, internal calls). A test must be able to fail.\n- UI units also pass `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` cleanly before they are done (`01-conventions.md` §7.8)."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:eb26df65a70c60644a0bdc6b6fa19a28a2583bae7b61a57b814612d8ad43ebb9",
  "contract_sha256": "sha256:57d068825625cb257445b363810a0b4bbe01d375329dd0df119f640f95c1c9f4"
}
```

Applicable layers: data model and database behaviour (the migration, the two indexes, the deferrable key), repository and data access (`PgIdentityRepository`, `PgPrivateIdentityRepository`), business logic (domain alias and projection, the identity module), API and endpoint (the container wiring only; no action or route is added), and documentation and traceability. There is no frontend behaviour here: U47 and U49 render the bylines.

## Owned paths

- `packages/domain/src/identity/` (`persona.ts`, `alias.ts`, `projection.ts` and their tests)
- `packages/application/src/modules/identity/` (`ports.ts`, `index.ts`, `ownership.ts`, `persona-for.ts`, `default-personas.ts`, `projection.ts`, `audit.ts`, `commands/rename-named.ts`, their tests, `identity.smoke.test.ts`, the adversarial tests)
- `packages/database/src/repositories/identity.ts`, `identity-private.ts` and their `*.int.test.ts`, `persona-links-allowlist.test.ts`
- `packages/contracts/src/view-models/persona.ts`, `packages/contracts/src/schemas/identity.ts` and its test
- `packages/application/src/modules/account/commands/register.ts` (the BR1.2 comment only)
- `packages/application/src/ports/repositories/identity.ts` from the unit list is not created: the ports live in `modules/identity/ports.ts` (C19, Q4).

## Shared files (append-only; each outside-owned-path file gets one `ISS-` row)

- `packages/i18n/messages/en.json` and `bn.json`: expected unchanged (BR5.1); any key goes into both in the same commit.
- `apps/web/src/server/container.ts` (identity block only) and `apps/web/src/server/container.test.ts`; `apps/web/src/server/identity-boundary.test.ts` is new.
- `apps/web/src/server/data.ts` and `apps/web/src/styles/patient.css`: not touched by this Unit.
- Barrels: `packages/domain/src/index.ts`, `packages/contracts/src/index.ts` (and the view-model and schema re-exports it uses), `packages/application/src/index.ts`, the `packages/database` barrel, `packages/test-support/src/fakes/index.ts` and `builders/index.ts`. Exports are only added.
- `packages/database/src/schema/identity.ts` (the two `uniqueIndex` declarations, R-01).
- `packages/database/src/repositories/account.ts` and `account.int.test.ts` (the delegation, WF1); `repositories/not-implemented.test.ts` (drops the identity stub).
- `packages/database/src/migrations/<next>_identity_constraints.sql`, `migrations/meta/_journal.json`, `migrations/meta/<next>_snapshot.json`, `migrations.int.test.ts`, `validator-probes.int.test.ts`, `schema/foreign-keys.int.test.ts`.
- `packages/test-support/src/fakes/repositories.ts` (and new identity fake files), `builders/persona.ts`.
- `packages/test-support/src/seed/seed-content.ts`, U11's block only (the anonymous link insert).
- `docs/implementation/ISSUES.md`, `docs/status/decision-log.md` (only if needed), `inception/contract-design/contract-summary.md` (C4 block), `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.

**Migrations.** One forward-only migration. It takes the next free number when the Bolt is rebased for merge (today `0010`); if U46, U47 or U48 merge a migration first, it is renumbered with a later journal timestamp and the exact-count tests are adjusted (BR5.4, Step 19).

**Shared demo code.** This Unit deletes only the identity stub it replaces (`PgIdentityRepository`'s `notImplemented` methods). The demo slice's persona code (`demo/accounts.ts`, `accounts-create.ts`, `reviews.ts` with `createPseudonymousPersona`, `session.ts`, `comments.ts`) stays: it still has live callers in `apps/web/src/server/actions/review.ts` and `data.ts`. U47 and U49 switch their call sites and remove it; anything still left at release time is removed by U50. Shared demo code is deleted only when a grep shows no caller left.

## Design decisions taken

Q1–Q15 were decided in the Functional Design by the agent under the owner's delegation of 2026-11-04 and are listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. The seven review findings are carried as listed above. High-risk Unit: the sign-off is agent-written and labelled "delegated by the owner on 2026-11-04" (Step 20); it stays on the owner review queue for confirmation.
