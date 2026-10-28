# Code Generation plan — U4 `cr-011-queue-dedup-reset-and-quiet-env` (CR-011)

## Summary

- Builds: a transactional outbox relay whose retries can never enqueue a duplicate job (`exclusive` queues from one declaration, a savepoint per event, C15 key `<job>:<eventId>` and envelope); `db:reset`/`demo:reset` also clear the `pgboss` schema while keeping CR-007's guarantees; the dotenv banner is silenced so the worker's first stdout line is JSON (closes ISS-144, ISS-185, ISS-201, ISS-202, ISS-203)
- Touches: `packages/database/src/queue/` (declaration, `pg-boss-queue.ts`, a new relay store), `repositories/outbox.ts`, `reset.ts`, both `env.ts` files, `apps/worker/src/` (relay handler, startup), their tests, `ISSUES.md`, `dependency-check-log.md`, the CR-011 hand-off
- Tests: T1–T16 integration tests, W1–W6 worker unit tests, the two flipped probes, one new smoke assertion, plus the review's missing-queue test

## Inputs

`functional-design/functional-spec.md` (WF1–WF7, §§ 7–17), `rules.md` (BR1.1–BR7.2), `entities.md`, `functional-design-questions.md` (Q1–Q5 decided A), the design review `functional-design/reviews/review-01.md`, `docs/implementation/tasks/CR-011-queue-dedup-reset-and-quiet-env.md`, FD-038, FD-076, C15. Story US1.1; requirements NFR9, NFR10, NFR11.

## Design review findings handled here

| Finding | How this plan handles it |
|---|---|
| Major: after pg-boss's 60 s cache refresh a missing queue makes `send` throw `Queue X does not exist`; the design treats that as an ordinary per-event failure, so a worker running across a dev reset silently drops jobs after 5 attempts | `enqueue` also clears the ensured mark when `send` throws a missing-queue error, and the relay treats a missing-queue error as a batch-level fault: the batch rolls back with no attempt counted, the next tick re-ensures the queue (WF2 step 2) and relays the events. New test T17: a send that throws because the queue was dropped after the cache refresh leaves the event unprocessed with no attempt counted, and the next batch relays it. |
| Minor: the stated reason for not using `DOTENV_CONFIG_QUIET` is wrong (dotenv 17.4.2 re-reads it) | `quiet: true` stays; the spec's reason is corrected in `code-summary.md`; T16 and W6 capture `console.log` as well as stdout. |
| Minor: the `exclusive` default and the per-job key and policy requirements live only in this Unit's folder | `code-summary.md` and the hand-off list them for the later Units (U8 passes a key, U18 needs `stately` if it coalesces); an S4 ISS row asks for a C15 note or an FD entry at the next contract revision. |
| Minor: a `dead` event is a silent drop (processed, no job, no replay path) | The spec's behaviour stays (kept from T-009); an S4 ISS row records the need for a replay path or a dead-event view. |

## Steps (test-after, per the Testing Contract)

- [ ] **Step 1** — Baseline on the Bolt branch: `pnpm infra:up`, then `pnpm check`, `pnpm smoke`, `timeout 300 pnpm test:int`; record the counts. Read open `ISSUES.md` rows in `database/queue`, `database/outbox`, `database/reset`, `worker/*`.
- [ ] **Step 2** — Dependency check (BR7.2): verify pg-boss and dotenv's current stable releases and known issues for `send({ db })`, the `exclusive` policy and `quiet`; append a dated entry to `docs/status/dependency-check-log.md`. The pin stays 12.31.0.
- [ ] **Step 3** — Verify the runner and record the unit-scoped commands in `unit-test-instructions.md`.
- [ ] **Step 4** — Data access, queue module (BR3.1–BR3.9, BR6.6): the job declaration (policy `exclusive`, FD-076 retries), `ensureQueue` with the fail-closed policy check, `enqueue` with declaration defaults, an optional executor, the `null` confirmation, and the review's missing-queue handling; correct the `EnqueueOptions.key` comment.
- [ ] **Step 5** — Data access, outbox repository (BR1.2, BR7.1): transaction-scoped claim without marking, mark processed, record a failed attempt, mark dead; remove the at-most-once `claimBatch`.
- [ ] **Step 6** — Data access, relay store in `packages/database/src/queue/` (spec § 10): one transaction per call, bounded, a savepoint per event, outcomes returned after commit, a missing-queue error rolls back the batch.
- [ ] **Step 7** — Business logic, worker (BR1.11, BR1.12, BR2.1–BR2.5): routes unchanged; plan function (key, envelope), retry-or-dead decision, outcome logging after commit; startup ensures every routed queue; correct the comment at `outbox-relay.ts:115-116`.
- [ ] **Step 8** — Database behaviour, reset (BR4.1–BR4.5): drop `pgboss` and `public` in one transaction; widen the blocker lookup to both schemas; keep CR-007's once-per-run reset, lock timeouts, guarded sweep and production refusal.
- [ ] **Step 9** — Environment (BR5.1–BR5.3): `quiet: true` in both loaders.
- [ ] **Step 10** — Tests after implementation (spec § 11): T1–T16, T17 (the review's missing-queue case), W1–W6, the two probes flipped from `it.fails` to `it` with bodies unchanged and the header comment updated, the new smoke assertion `queue/pg-boss-queue.smoke.test.ts`; the T-009 tests that encode the old claim or key are rewritten with the reason recorded (BR6.4). Run the unit-scoped commands, then `timeout 300 pnpm test:int`.
- [ ] **Step 11** — Checks: `pnpm check`, `pnpm smoke`, `timeout 300 pnpm test:int` exit 0; no assertion removed or skipped. Manual check: `timeout 30 pnpm --filter @rogikotha/worker exec tsx src/main.ts`, where the first stdout line parses as JSON. Time a 50-event batch against the 5 s statement timeout and record it.
- [ ] **Step 12** — Records: close ISS-144, ISS-185, ISS-201, ISS-202, ISS-203 as fixed in CR-011; add the rows of spec § 17 plus the review's two rows (cross-Unit queue requirements; dead-event replay); every row `Found in U4 CR-011`. Fill the task file's Hand-off and write `docs/implementation/handoffs/CR-011.md`.
- [ ] **Step 13** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (literal paths only).

## Files touched

| Path | Change | In CR-011's owned paths |
|---|---|---|
| `packages/database/src/queue/*` (declaration, `pg-boss-queue.ts`, relay store, their tests, the new smoke file, `validator` probes) | queue and relay | yes |
| `packages/database/src/repositories/outbox.ts`, `outbox.int.test.ts` | transaction-scoped claim | added by Q2 (ISS row) |
| `packages/database/src/reset.ts`, `reset-guard.int.test.ts` | `pgboss` drop, blocker lookup | `reset.ts` yes; the test added (ISS row) |
| `packages/database/src/env.ts`, `apps/worker/src/env.ts`, new `packages/database/src/env.int.test.ts` | `quiet: true` | env files yes; the test added (ISS row) |
| `apps/worker/src/**` | relay handler, startup, tests | yes |
| `docs/status/dependency-check-log.md`, `docs/implementation/ISSUES.md`, `handoffs/CR-011.md`, the task file's Hand-off | records | yes (project rules, task steps) |

## Story and rule traceability

| Step | Story / requirement | Rules |
|---|---|---|
| 4–7 | US1.1 (AC1.1.1, AC1.1.2), NFR9, NFR10 | BR1.1–BR1.12, BR2.1–BR2.5, BR3.1–BR3.9 |
| 8 | US1.1, NFR11 | BR4.1–BR4.7 |
| 9 | US1.1 (AC1.1.5) | BR5.1–BR5.3 |
| 10–11 | US1.1 | BR6.1–BR6.6 |
| 2, 12 | — | BR7.1, BR7.2 |

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

Applicable layers: database behaviour (reset), repository / data access (queue, outbox, relay store), business logic (the worker's relay planning and failure decision), and environment configuration (dotenv). No endpoint or frontend changes.
