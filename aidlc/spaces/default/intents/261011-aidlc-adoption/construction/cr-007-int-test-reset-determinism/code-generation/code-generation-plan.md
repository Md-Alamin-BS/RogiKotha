# Code Generation plan — U2 `cr-007-int-test-reset-determinism` (CR-007)

## Summary

- Builds: the integration-test database reset runs once per `pnpm test:int` run (a Vitest `globalSetup`) instead of once per file, and a blocked `DROP SCHEMA` fails within seconds with a lock-timeout error instead of hanging; a guarded sweep ends stale backends on test databases only (closes ISS-143)
- Touches: `packages/database/src/test-setup.ts`, `reset.ts`, `vitest.config.ts`, a new `global-setup.ts` and a new regression test file; `ISSUES.md`; the CR-007 hand-off
- Tests: a regression test for the lock-timeout path and the test-database guard, the 10-run timing evidence, the deliberate-contention scenario, and the ISS-092 idempotency run

## Inputs

`docs/implementation/tasks/CR-007-int-test-reset-determinism.md` (the Unit spec: root cause, suggested fix, acceptance checks), `docs/validation/T-005.md` (ISS-143 evidence), `docs/validation/T-004.md` and ISS-092 (reset idempotency must not regress), `01-conventions.md` §13, `unit-of-work.md` U2. No Functional Design runs for this Unit (an enabling Unit for US1.1, NFR11: a gate that can be trusted).

## Steps (test-after, per the Testing Contract)

- [ ] **Step 1** — Baseline on the Bolt branch: `pnpm infra:up && pnpm check && pnpm smoke`, then `pnpm test:int` 3 times; record the counts and each duration. Count the `DROP SCHEMA` cycles per run today (one per collected int-test file).
- [ ] **Step 2** — Reproduce (task step 1): hold a deliberate blocker on `rogikotha_test` (a second connection with `BEGIN` and a `CREATE TABLE` left idle in transaction, opened by a small throwaway script or `psql` in the compose container), start `pnpm test:int` with an outer timeout (for example `timeout 120`), and confirm it hangs on the drop. Record the output, then release the blocker. Remove any throwaway script before the end.
- [ ] **Step 3** — Verify the runner and record the unit-scoped command in `unit-test-instructions.md` (for example `pnpm test:int reset-guard`, filters straight after the script name).
- [ ] **Step 4** — Implement (database behaviour): in `reset.ts`, run the drop and migrate with `SET lock_timeout = '10s'` and a `statement_timeout` for the drop, so a blocked drop raises an error naming the lock. Add a guarded `terminateStaleTestBackends` step before the drop that ends other backends on the current database **only** when the database name ends in `_test` or `_test_b`, and refuses (returns an error, never runs) on any other name such as `rogikotha`. `db:reset` and `demo:reset` on the development database keep working as they do now (no sweep there), and `migrate`, `reset` and `seed` still refuse `APP_MODE=production`.
- [ ] **Step 5** — Implement (test harness): move the reset to a Vitest `globalSetup` for the `database` project (`packages/database/src/global-setup.ts`, wired in `vitest.config.ts`), so the drop-and-migrate cycle runs once per `pnpm test:int`. `test-setup.ts` keeps only the per-file pool setup. Keep `fileParallelism: false` unless per-file isolation is shown to be unnecessary (record which in the hand-off). Keep ISS-092's idempotent path.
- [ ] **Step 6** — Tests after implementation: a new `packages/database/src/reset-guard.int.test.ts` proving (a) the sweep refuses a non-test database name, (b) a drop blocked by a held lock rejects with a lock-timeout error well inside 15 s instead of hanging (the test holds its own blocker connection and releases it in `finally`), (c) one drop cycle per run (for example a marker the global setup writes, read by a test). Each test must be able to fail. Run the unit-scoped command.
- [ ] **Step 7** — Verify (task steps 3–5): re-run the deliberate-contention scenario and confirm `pnpm test:int` fails in ≲ 15 s naming the blocker; run `pnpm test:int` 10 times back to back and record every duration (no run longer than about 2× the median); one run from a manual `DROP SCHEMA public CASCADE` stays green (ISS-092); the two `it.fails` tripwires in `validator-probes.int.test.ts` stay expected-fail. Check whether the `beforeAll` timeout can interrupt a blocked `pg` query and record the answer (task's fourth bullet).
- [ ] **Step 8** — Checks: `pnpm check` and `pnpm smoke` exit 0, no assertion removed or skipped.
- [ ] **Step 9** — Records: close ISS-143 in `docs/implementation/ISSUES.md` as `fixed in CR-007` with the timing evidence; add an ISS row for any defect, workaround or assumption found (`Found in U2 CR-007`); fill the task file's Hand-off and write `docs/implementation/handoffs/CR-007.md`.
- [ ] **Step 10** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (literal paths only).

## Files touched

| Path | Change | In CR-007's owned paths |
|---|---|---|
| `packages/database/src/reset.ts` | lock and statement timeouts, guarded backend sweep | yes |
| `packages/database/src/test-setup.ts` | per-file pool setup only | yes |
| `packages/database/vitest.config.ts` | `globalSetup` wiring | yes |
| `packages/database/src/global-setup.ts` | new: one reset per run | yes (new file under the package's test setup) |
| `packages/database/src/reset-guard.int.test.ts` | new regression tests | yes (new `*.int.test.ts`) |
| `docs/implementation/ISSUES.md`, `handoffs/CR-007.md`, the task file's Hand-off | records | yes (task step 6) |

## Story and rule traceability

| Step | Story / requirement |
|---|---|
| 4–7 | enabling Unit for US1.1 (NFR11): the integration gate fails fast and runs deterministically, so later Units' database tests can be trusted |

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

Only the data model / database behaviour layer (the reset path) and the environment/build configuration layer (the Vitest project setup) apply; no repository, business logic, endpoint or frontend changes.
