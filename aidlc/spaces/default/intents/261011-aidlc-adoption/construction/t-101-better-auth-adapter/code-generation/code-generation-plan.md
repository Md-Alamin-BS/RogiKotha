# Code Generation plan — U8 `t-101-better-auth-adapter` (T-101)

## Summary

- Builds: Better Auth 1.7.x behind the application boundary (an `AuthGateway` port, FD-093). Covers register, email verification, resend, sign-in with the per-email and per-network limits and delay schedule, sign out (also everywhere), password reset and change, the session list, `getActor()`, the first `queueEmail` and the worker's `mail.send` with the mail-only recipient key (FD-095), the masked own email (FD-096), text-only feedback (FD-097), and the worker reading the i18n message files (FD-098)
- Touches: `packages/{contracts,domain,application,adapters,database,test-support,i18n}`, `apps/web/src/server/**` and the auth route, `apps/worker/**`, `eslint.boundaries.mjs` and its fixture, `vitest.workspace.ts`, `.github/workflows/check.yml`, `infra/compose/.env.example`, the records (design § 15)
- Tests: domain state tables, application commands with `test-support` fakes (each happy path, each refusal and one audit assertion), database `*.int.test.ts`, web and worker integration projects (`web-int`, `worker-int`), a smoke assertion, and 3–5 adversarial tests by a separate agent (high-risk Unit: auth)

## Inputs

Functional Design (reviewed READY): `construction/t-101-better-auth-adapter/functional-design/`: `functional-spec.md` (WF0–WF16, §§ 5–17), `rules.md`, `entities.md`, `functional-design-questions.md`, `traceability.json`, and the review `functional-design/reviews/review-01.md` (one Major and five Minor findings, all resolved below). Also task `docs/implementation/tasks/T-101-better-auth-adapter.md`, FD-071, FD-093 and FD-095 to FD-098, and T-010 and T-011 as merged on `main` (`f46e116`).

## Review points resolved in this plan

1. **Major, reset password must not equal the email.** Mechanism (a): the reset command first resolves the reset token to its account without consuming it, through a read-only `AccountRepository.findResetTokenAccount(token)` over the library's verification row. It refuses with `auth.password_equals_email` before `AuthGateway.resetPassword` runs. The spike (Step 4) confirms the library's token-row format on the pinned version, and a schema test pins it. If the spike shows tokens are not rows, use mechanism (b): run the check inside the `reset` library scope, in the port-backed `password.hash` path, before hashing. Record the outcome in the hand-off.
2. **Sign-in window.** `signIn.windowMinutes` is narrowed to 15–1440 (default 15). Both the per-email counter (10 failures) and the per-network counter count inside `windowMinutes`, so the severe notice can always fire. BR3.2, BR3.3 and § 5.3 read this way in the code and tests.
3. **Decision log.** FD-095 to FD-098 are already in `docs/status/decision-log.md`. Step 2 only confirms them and appends nothing.
4. **Mail volume.** `requestPasswordReset` and `resendVerification` also get a per-network limit (10 per hour per network key). When it applies they return the same neutral result, and the register existing-email branch uses the same network limit. One test each.
5. **Registration races.**
   - A username unique-violation on insert runs the compensation (`deleteUser`), then returns `auth.username_taken`.
   - A duplicate email from the gateway, when two registrations race, falls through to the existing-email branch: neutral `ok`, same timing floor.
   - One test each.
6. **Worker `Crypto`.** The adapter is built from `{ encryptionKey, macSecret? }`. Calling `hmac` on an instance built without `macSecret` throws a programmer error. The worker's `mailCrypto` has no `macSecret`, and a test proves `hmac` refuses there.

## Steps (test-after, per the Testing Contract)

The Unit runs in two developer phases on one branch, one after the other, then the gate. No two developers touch the same file.

**Phase A — core layers (one developer)**

- [ ] **Step 1** — Baseline on `bolt/t-101-better-auth-adapter`. Run `pnpm infra:up`, then `timeout 1200 pnpm check` (eleven steps) and `timeout 600 pnpm smoke`, both green. Record the counts and the per-package coverage table.
- [ ] **Step 2** — Confirm that FD-095 to FD-098 are in the decision log as written (review point 3). Then do the dependency check (BR7.8): Better Auth 1.7.x, nodemailer and `@node-rs/argon2`, each on the current stable release, with advisories and Next 16.3.4 peers checked. Append the entry to `docs/status/dependency-check-log.md`.
- [ ] **Step 3** — Verify the test runner and record the unit-scoped commands in `unit-test-instructions.md`.
- [ ] **Step 4** — Spike, time-boxed to 45 minutes (design § 16 and WF0 step 4). Install the libraries, build, and run one `signUpEmail` from a script. Confirm the listed library capabilities and the reset-token format (review point 1). Record the results in `code-summary.md`.
- [ ] **Step 5** — Contracts (WF0 step 5): `03-routes-and-contracts.md` §2, `errors.ts`, `config-values.ts` (`signIn` with the narrowed ranges, `windowMinutes` 15–1440), `schemas/account.ts`, `actor.ts`, `view-models/security.ts`. Write and run their tests.
- [ ] **Step 6** — Domain: `account/account-state.ts`, `account/mask-email.ts`. Write and run the state-table and masking tests.
- [ ] **Step 7** — Application (WF0 step 7): ports, `command.ts`, `audit/*` (closes ISS-108), `authorization/capabilities.ts`, `modules/account/**`, `modules/notification/internal/queue-email.ts`, `modules/notification/send-email-delivery.ts`, `src/worker.ts` and the `./worker` export. Include review points 1, 2, 4 and 5. Then the `test-support` fakes (WF0 step 10), and the application tests from § 11 using those fakes.
- [ ] **Step 8** — Adapters: `crypto` (review point 6), `password-argon2` with the bench script, `rate-limit-memory`, `mail-smtp`. Write and run their tests.
- [ ] **Step 9** — Database (WF0 step 9): the migration, `unit-of-work.ts`, `PgAccountRepository` (with `findResetTokenAccount`), the email-delivery repository methods, `audit-writer.ts`, `not-implemented.ts`, and the schema test. Then the `*.int.test.ts` tests against `DATABASE_URL_TEST`.

**Phase B — web, worker, configuration (one developer)**

- [ ] **Step 10** — Web (WF0 step 11): `server/env.ts`, `instrumentation.ts`, `server/better-auth/**`, `server/container.ts`, `server/auth.ts`, `server/after-response.ts`, `server/client-address.ts`, `server/health.ts` and the health route, `server/actions/account.ts`, and `app/api/auth/[...all]/route.ts`. Add the `web-int` tests.
- [ ] **Step 11** — Worker (WF0 step 12): `env.ts`, `container.ts`, `handlers/mail-send.ts`, the registry entry, the relay-map change, `package.json`, the tsconfig JSON imports. Add the `worker-int` tests.
- [ ] **Step 12** — i18n keys in both `en.json` and `bn.json` (Bengali marked for the owner's review, FD-042), and the `@rogikotha/i18n` message exports (WF0 step 13). Then the boundary rules for FD-098: `eslint.boundaries.mjs`, the fixture and its manifest, and `01-conventions.md` §2 (WF0 step 14).
- [ ] **Step 13** — Test projects and CI (WF0 step 15): `vitest.workspace.ts` (`web-int`, `worker-int`), `test:int`, `check.yml` (Mailpit, the third secret), `infra/compose/.env.example`. Add one smoke assertion for sign-in.

**Phase C — gate, adversarial tests and records**

- [ ] **Step 14** — `timeout 1200 pnpm check`, `timeout 600 pnpm smoke` and `pnpm test:int`, all green. `domain`, `application` and `adapters` must each reach 80% lines.
- [ ] **Step 15** — Adversarial tests (high-risk Unit, team practice step 5): a separate agent writes and runs 3–5 tests from design § 12.2 (enumeration by timing or response, the token replay, a session after a refused verification, the rate limiter bypassed through the library route, a mail-key leak to the worker). Fix anything they break.
- [ ] **Step 16** — Records: reference-document corrections (BR10.2), `ISSUES.md` rows (BR10.3, `Found in U8 T-101`), the task file's Hand-off and `docs/implementation/handoffs/T-101.md` (Argon2 median, timing floors, spike results, coverage before and after). Write `code-summary.md`, `traceability.json` and `source-manifest.json` (literal paths only, no `[`, `]` or `*`).

## Files touched

As listed in design § 15 (owned paths plus the recorded additions), plus `packages/database/src/repositories/account.ts` (`findResetTokenAccount`, review point 1).

## Story and rule traceability

| Step | Rules | Stories |
|---|---|---|
| 5–7 | BR1–BR5, BR7.4, BR7.11 | US1.1–US1.3 (register, verify, sign in), US1.4 (reset), US11.1 (sign-in limits) |
| 7, 9, 11 | BR6 (email delivery), FD-071, FD-095 | US1.1, US1.4 |
| 8 | BR7.5–BR7.8 | NFR (password hashing, rate limits) |
| 10 | BR7.9–BR7.12, FD-093 | US1.3, US1.5 (sessions) |
| 12 | BR8, FD-098 | — |
| 13–16 | BR9, BR10 | — |

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

Applicable layers: data model and database behaviour (the migration, the repositories), business logic (domain, application), API and endpoint (server actions, the auth route, the worker handler), and environment and build configuration. There is no frontend behaviour here: T-102 builds the screens.

## Design decisions taken

Q1–Q14 were answered in the Functional Design, under the owner's standing instruction of 2026-10-27 and the no-questions instruction of 2026-10-29, and are listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. The six review points above were decided by the agent under the no-questions instruction. High-risk Unit: the owner's written sign-off stays on the owner review queue.
