# Code Generation plan — U5 `cr-006-worker-auth-users-grant` (CR-006, high risk)

## Summary

- Builds: revoke every `rk_worker` privilege on `auth_users` (FD-041, migration 0007); apply the FD-050 rulings, revoking `review_versions` INSERT and `reports` SELECT (migration 0008); prove the decided state as the real `rk_worker` role; make `02-data-model.md` §16 the complete worker-grant list (closes ISS-140)
- Touches: two new migrations and their drizzle journal and snapshot entries, comment-only edits in `0005_grants_part2.sql`, `validator-probes.int.test.ts`, `grants.smoke.test.ts`, one assertion in `constraints.int.test.ts`, `02-data-model.md` §16, `decision-log.md` (FD-092), `ISSUES.md`, the CR-006 hand-off
- Tests: 20 integration probes (P1–P20) as the real role, 1 smoke assertion, 1 rewritten assertion, then 3–5 adversarial tests by a separate agent (high-risk step 5)

## Inputs

`functional-design/functional-spec.md` (WF1–WF5, §§ 6, 10–12, 15, 16), `rules.md` (BR1.1–BR6.2), `entities.md` (WG1–WG18, PA1–PA3, PR1–PR3), `functional-design-questions.md` (Q1–Q8 answered A), the design review `functional-design/reviews/review-01.md`, `docs/implementation/tasks/CR-006-worker-auth-users-grant.md`, FD-041, FD-050, FD-071, FD-077, FD-079, FD-080, FD-090. Story US1.1; requirement NFR11.

## Design review findings handled here

| Finding | How this plan handles it |
|---|---|
| Major: FD-092 and §16 would "keep" the whole-table `reviews` SELECT (WG12) while R1 says it exposes `exact_date_enc` and is undecided | FD-092 and §16 rule only on the FD-050 grants (WG2–WG8). WG9–WG12 (the grants outside FD-050's list, `reviews` SELECT among them) are listed in §16 as **live, not ratified**, each with the job that uses it and, for WG12, a pointer to the open R1 row. Nothing in FD-092 ratifies them. |
| Minor: WG6 keep (`account_profiles`) rests on T-410's worker export, which R4 says may not run as written | FD-092 and §16 mark WG6 as kept **provisionally**, re-judged in T-410's Functional Design (the R4 row names the trigger). |
| Minor: "§16 agrees with the live database" cannot hold while PR1–PR3 are live | The acceptance row is recorded as "§16 agrees with the live database, except the listed planned removals PR1–PR3, each named with its owning Unit". |
| Minor: P3 must check every `auth_users` column, not only the table | P3 asserts `has_column_privilege` false for every column of `auth_users` (read from `information_schema.columns`) and zero `column_privileges` rows. |
| Minor: record that nothing reads `reports` or inserts `review_versions` as the worker | Step 1 runs that search before 0008 and `code-summary.md` records the command and its result. |

## Steps (test-after, per the Testing Contract)

- [x] **Step 1** — Baseline on the Bolt branch: `pnpm infra:up && pnpm check && pnpm smoke` and `pnpm test:int`; record the counts. Read the open `ISSUES.md` rows ISS-139, ISS-140, ISS-141, ISS-148. Search `apps/worker/src` and `packages/*/src` for any worker reader of `reports` or writer of `review_versions`; record the result (spec § 16).
- [x] **Step 2** — Verify the runner and record the unit-scoped command in `unit-test-instructions.md`: `pnpm test:int -- validator-probes grants.smoke constraints` (or the package's equivalent filter, recorded as run).
- [x] **Step 3** — Decision entry first (BR2.3): append FD-092 (or the next free number) to `docs/status/decision-log.md`: the ruling on each FD-050 grant WG2–WG8 with its one-line reason (WG6 provisional), the §16 completeness ruling (Q8, with WG9–WG12 "live, not ratified"), the four raised items R1–R4 left undecided, and "decided by the agent on the owner's standing instruction of 2026-10-27; awaiting the owner's confirmation".
- [x] **Step 4** — Data model, migration 0007 (WF2): generate `0007_revoke_worker_auth_users` as a custom drizzle-kit migration from `packages/database`; write `REVOKE ALL ON auth_users FROM rk_worker;` with a header comment citing FD-041, ISS-140 and §16 note 3; check `meta/_journal.json` `when` > `1789331720026`.
- [x] **Step 5** — Data model, migration 0008 (WF3): generate `0008_worker_grant_review`; write the `reports` and `review_versions` INSERT revokes, header comment citing FD-050 and FD-092 and listing the five grants kept and why. Apply both with `pnpm db:migrate` on the development database (0000–0006 reported as already applied) and through the integration reset.
- [x] **Step 6** — Comment-only edits in `0005_grants_part2.sql` (BR2.2): the comments above the `review_versions`, `reports` and `auth_users` grants say which migration and FD entry revoked them. No statement changes.
- [x] **Step 7** — Data model tests after implementation (WF4, § 11): probes P1–P20 in a CR-006 block in `validator-probes.int.test.ts` (P3 over every column), the P9 smoke assertion in `grants.smoke.test.ts`, the rewritten `constraints.int.test.ts` assertion ("is denied on every reports column, reporter_account_id included"). Run the unit-scoped command, then `pnpm test:int`.
- [x] **Step 8** — Documents (WF5): rewrite `02-data-model.md` §16's `rk_worker` bullet as the complete list (§ 12 outline, with the review's "live, not ratified" and "provisional" wording), correct the stale file names, keep note 3. `01-conventions.md` §11 needs no edit.
- [x] **Step 9** — Issue register: close ISS-140 as `fixed in CR-006 — option (a), FD-041`; add rows F1–F7, R1, R2 (spec § 12) with severities and `Found in U5 CR-006`.
- [x] **Step 10** — Checks: `pnpm check`, `pnpm smoke`, `pnpm test:int` exit 0; no existing assertion removed or skipped (the one rewritten assertion is recorded with its reason).
- [x] **Step 11** — Records: fill the CR-006 task file's Hand-off and write `docs/implementation/handoffs/CR-006.md` (the § 6 table, § 7 split, § 8 planned list, the owned-path additions and why, the ISS ids found and fixed).
- [x] **Step 12** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json`.

High-risk step 5 runs after this plan: a separate agent writes and runs 3–5 adversarial tests from the angles in spec § 11; the owner's written sign-off is recorded as pending in the Unit's record.

## Files touched

| Path | Change | In CR-006's owned paths |
|---|---|---|
| `packages/database/src/migrations/0007_revoke_worker_auth_users.sql`, `0008_worker_grant_review.sql`, `meta/_journal.json`, `meta/0007_snapshot.json`, `meta/0008_snapshot.json` | new migrations (generated, then filled) | yes |
| `packages/database/src/migrations/0005_grants_part2.sql` | comments only | yes (task step 4) |
| `packages/database/src/validator-probes.int.test.ts`, `grants.smoke.test.ts` | probes, smoke assertion | yes |
| `packages/database/src/constraints.int.test.ts` | one assertion rewritten | no: owned-path addition forced by Q4, recorded in the hand-off |
| `docs/implementation/02-data-model.md` §16 | rewrite | yes |
| `docs/status/decision-log.md` | FD-092 | no: the project rule requires the FD entry before the SQL |
| `docs/implementation/ISSUES.md`, `handoffs/CR-006.md`, the task file's Hand-off | records | yes |

## Story and rule traceability

| Step | Story / AC | Rules |
|---|---|---|
| 3 | US1.1 (AC1.1.1) | BR2.3, BR3.1–BR3.5 |
| 4 | US1.1 (AC1.1.1, AC1.1.2), NFR11 | BR1.1–BR1.4, BR2.1, BR2.4 |
| 5–6 | US1.1, NFR11 | BR2.2, BR3.4, BR4.1–BR4.7 |
| 7 | US1.1 | BR5.1–BR5.5 |
| 8 | US1.1 | BR6.1, BR6.2 |

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

Only the data model / database behaviour layer applies: the Unit changes grants and their tests; no repository, business logic, endpoint or frontend changes.
