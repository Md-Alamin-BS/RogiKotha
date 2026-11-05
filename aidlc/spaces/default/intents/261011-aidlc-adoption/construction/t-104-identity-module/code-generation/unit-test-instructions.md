# Unit test instructions — U11 `t-104-identity-module`

## Framework

Vitest 4 through `vitest.workspace.ts` (a normal Vitest config with `test.projects`, passed with `--config`). The projects this Unit uses:

- `domain`, `contracts`, `application` and `test-support` run the unit tests, with fakes and builders from `packages/test-support`.
- `database` runs the `*.int.test.ts` files and the `persona_links` allowlist test against `DATABASE_URL_TEST`, reset to a freshly migrated schema on every run, files serially.
- `test-support-seed` runs the seed integration test (group 2, after `database`).
- `web` runs `apps/web/src/server/container.test.ts` and `identity-boundary.test.ts`.

Playwright is not used: the design adds no page, component or route, and U47 and U49 render the bylines. Coverage uses `@vitest/coverage-v8`.

## Test database

The Bolt runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigns, one of `rogikotha_test_w1` to `rogikotha_test_w6`, on the shared compose PostgreSQL (`pnpm infra:up`). Never point it at another Bolt's database or at the development database. Run only one database-touching command at a time in the worktree. There is no CI (FD-102): these commands are the gate.

## Run this Unit's tests

Every long command carries an outer `timeout`. Step 2 of the plan runs one existing file per project to prove the filters before the first new test.

```bash
pnpm infra:up
# Contracts:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/identity.test.ts
# Domain (alias, projection):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/identity/
# Application (identity module, rename, ownership, log capture; register still green):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/identity/ packages/application/src/modules/account/commands/register.test.ts
# Fakes and builders:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/ packages/test-support/src/builders/builders.test.ts
# Database integration against this Bolt's DATABASE_URL_TEST:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/identity.int.test.ts packages/database/src/repositories/identity-private.int.test.ts packages/database/src/repositories/account.int.test.ts packages/database/src/repositories/persona-links-allowlist.test.ts packages/database/src/repositories/not-implemented.test.ts packages/database/src/schema/foreign-keys.int.test.ts packages/database/src/migrations.int.test.ts packages/database/src/validator-probes.int.test.ts
# Seed (after the seed edit):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project test-support-seed packages/test-support/src/seed/seed.int.test.ts
# Web container and boundary:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/container.test.ts apps/web/src/server/identity-boundary.test.ts
# Smoke assertion for this Unit:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/identity/identity.smoke.test.ts
# Coverage for one package, for example application:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**' --coverage.thresholds.lines=0
```

The gate commands (`timeout 1200 pnpm check`, `timeout 600 pnpm smoke`, `timeout 600 pnpm test:int`) run at the baseline and the gate steps only, not as this Unit's test commands.

## What to cover (functional-spec § 9)

| Group | Tests |
|---|---|
| Contracts | `RenameNamedInput` NFC, trim, 1–60 with `errors.auth.displayNameRequired`; `PublicProjectionsInput` refuses 201 ids; `PersonaPublicVM` has no id or timestamp key (type-level) |
| Domain | alias prefix, alphabet and length; rejection of indices 62 and 63; only the first 42 characters of a token read; a new token on exhaustion; uniformity over 10 000 draws; projection key set per kind; property test over 1 000 personas against the BR1.4 denylist; legacy "Anonymous" gives `displayName: null`; anonymous hue 0 |
| Application | every `personaFor` branch, the retry and the 5-attempt exhaustion; `createDefaultPersonas` idempotent; projections order, de-duplication and omission; `ownsPersona` and `ownPersonaIds`; `renameNamed` happy path with one audit assertion, unchanged name, validation and anonymous refusal; the BR3.8 log-capture test |
| Database | every repository method; both partial unique indexes by name with their `WHERE` clauses and enforced; exact `personas` columns; the deferred key (persona and link first, review later, one transaction); the savepoint keeps the outer transaction usable; ten concurrent `personaFor` calls give one persona; `rk_worker` denied on `persona_links`; register creates both personas through the delegation; migration counts plus one; the BR3.1 allowlist by import and by raw string |
| Seed | the seed still loads; each anonymous link is inserted with its `review_id` and never updated |
| Web | `@ts-expect-error` assertions for the private repository and `IdentityOwnership` (BR3.2, BR3.5); no action or route imports identity internals (BR3.6) |
| Smoke | `identity.smoke.test.ts`: same persona twice in one thread, a different alias in another, projection without username or id |
| Adversarial | 3–5 tests by a separate agent from functional-spec § 8, kept in the suite |

Each test must be able to fail. Test names read as sentences. Assert on behaviour, never on class names or internal calls. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package, measured with `@vitest/coverage-v8`, for every package this Unit touches (`domain`, `contracts`, `application`, `database`, `test-support`, `web`). The floor is never lowered to make a step pass; record the table before and after.

## Mocking and test data

Application tests use the `test-support` fakes for the ports (`FakeIdentityRepository`, `FakePrivateIdentityRepository`, the account fake, `Crypto`, `Logger`, `AuditWriter`) and builders (`builders/persona.ts`, `builders/account.ts`) rather than hand-written fixture objects. The private-repository fake keeps the alias and thread uniqueness and can be told to answer `alias_taken` or `thread_taken`; a fixed random source drives the exhaustion test. Database tests use real PostgreSQL, never mocks. All data is synthetic: fictional names, `example.test` addresses, generated ids; no real person, doctor or facility.
