# Code Generation plan — U6 `cr-012-storyboard-seed-correction` (CR-012)

## Summary

- Builds: the storyboard and seed correction of FD-039 (alias isolation on r2, MOD-2041 critical, MOD-2033 padded with `factual`) and the FD-089 expansion to about 10 fictional records per module, regenerated through the corpus port from the prototype data (closes ISS-158, ISS-176, ISS-221, ISS-252)
- Touches: `packages/test-support/scripts/port-corpus.mjs`, `packages/test-support/src/corpus/*` (regenerated), `packages/test-support/src/seed/*`, their tests, `docs/implementation/05-demo-storyboard.md` and the three task files of SC1–SC12, `ISSUES.md`, the CR-012 hand-off
- Tests: corpus tests in the default sweep, the standalone seed integration test (counts DC1–DC22, MOD-2033 reasons, lanes, the r2 alias, referential integrity, idempotency), the rewritten `cr-008-validation.test.ts`, the updated and one new smoke assertion

## Inputs

Design (no Functional Design stage for this `packaging` Unit; the design was drafted and committed): `docs/aidlc-migration/design-drafts/cr-012-storyboard-seed-correction/` — `functional-spec.md` (WF1–WF7, §§ 6–16), `rules.md` (BR1.1–BR7.3), `entities.md`, `functional-design-questions.md` (Q1–Q12 answered A), `traceability.json`. Unit spec `docs/implementation/tasks/CR-012-storyboard-seed-correction.md`; FD-039, FD-086, FD-089; `unit-of-work.md` U6. The prototype `ui-design-prototype/shared/rogikotha-data.js` is the source of truth for data (FD-039).

## Steps (test-after, per the Testing Contract)

- [ ] **Step 1** — Baseline on the Bolt branch: `pnpm infra:up`, `pnpm check`, `pnpm smoke`, `timeout 300 pnpm test:int`; record the counts. Read the open `ISSUES.md` rows in `test-support/seed`, `test-support/corpus` and `docs/storyboard`.
- [ ] **Step 2** — Verify the runner and record the unit-scoped commands in `unit-test-instructions.md`.
- [ ] **Step 3** — Real-person check (BR1.2): check each new doctor (name with specialty and city), each new facility and organisation (name with city) and each new BMDC number against public listings; record the evidence in `code-summary.md`. A real match stops the Unit: write an S1 row for the owner and report.
- [ ] **Step 4** — Data, port fixes (WF2 step 1, spec § 9): pinned persona hues, follow-ups read like `followUpsFor`, one thread persona per anonymous thread, the two Banglish aliases (`shash`, `mathabatha`), a `USER_BOOKMARKS` export and `CorpusBookmark` in `types.ts`.
- [ ] **Step 5** — Data, regenerate (WF2 steps 2–4): `pnpm --filter @rogikotha/test-support port`; compare the new corpus with `main` record by record (read-only, result recorded): every pre-FD-089 record deep-equal (BR1.3), only additions besides the anonymous personas' file order; run the port again, no diff beyond EOL churn (BR2.7).
- [ ] **Step 6** — Data, seed (WF3, WF4, spec § 10): the directory, content, evidence, moderation and notification steps for the new records; the MOD-2033 padding table with a loud failure for any other shortfall (BR4.1, BR4.2); the comment-target appeal path for MOD-2018 (BR3.4); n8 withheld (BR1.7); the months parser and draft idempotency (`ASSUMPTION(CR-012)` markers); `seed.ts` dotenv `quiet: true` (BR3.7).
- [ ] **Step 7** — Documents (WF5): apply SC1–SC12 (spec § 8); run the "No stale names" grep (BR5.3); check every storyboard step other than 7 and 19 is byte-identical.
- [ ] **Step 8** — Tests after implementation (WF6, spec § 11): corpus tests (§ 11.2), the standalone seed integration test (§ 11.1), the rewritten `cr-008-validation.test.ts` with its reason recorded, the smoke update and new assertion (§ 11.3). Run the unit-scoped commands.
- [ ] **Step 9** — Gate (WF1 step 8): `pnpm db:reset && pnpm db:migrate && pnpm db:seed` twice (second run `0 inserted` for every step); the standalone seed test; `pnpm check`, `pnpm smoke`, `timeout 300 pnpm test:int` exit 0; no assertion removed or skipped.
- [ ] **Step 10** — Records (WF7): ISS-158, ISS-176, ISS-221, ISS-252 → fixed in CR-012; new rows F1–F12 from spec § 12 with the next free ids, each `Found in U6 CR-012`; fill the task file's Hand-off and write `docs/implementation/handoffs/CR-012.md` (what changed, owned-path additions, the Bengali review list of § 10.7, the alias-isolation choice and its evidence, ISS ids found and fixed).
- [ ] **Step 11** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (literal paths only).

## Files touched

| Path | Change | In CR-012's owned paths |
|---|---|---|
| `packages/test-support/src/seed/**` | seed steps, padding, appeals, months, quiet dotenv, seed test | yes |
| `packages/test-support/scripts/port-corpus.mjs`, `packages/test-support/src/corpus/*.ts` | port fixes, regenerated corpus | added by Q4 (ISS row F1) |
| `packages/test-support/src/**/*.test.ts` (corpus tests, `cr-008-validation.test.ts`, `test-support.smoke.test.ts`) | tests | yes (tests of owned sources) |
| `docs/implementation/05-demo-storyboard.md` and the three task files named in CR-012 | SC1–SC12 | yes |
| T-401's FD-062 row and T-409 step 11 | SC9, SC12 | added by Q2 (ISS row F1) |
| `docs/implementation/ISSUES.md`, `handoffs/CR-012.md`, the task file's Hand-off | records | yes |

## Story and rule traceability

| Step | Rules |
|---|---|
| 3 | BR1.2 |
| 4–5 | BR1.3, BR2.1–BR2.7 |
| 6 | BR1.5–BR1.7, BR3.1–BR3.7, BR4.1–BR4.4 |
| 7 | BR5.1–BR5.4 |
| 8–9 | BR6.1–BR6.5 |
| 10 | BR7.1–BR7.3 |

This Unit maps to no story (an enabling data Unit); it unblocks T-106, T-401, T-409 and the storyboard walk.

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

Applicable layer: data model / database behaviour (the corpus, the seed and their tests); plus documentation. No repository, business logic, endpoint or frontend changes.

## Design decisions taken in the draft

All decided by the agent on the owner's standing instruction of 2026-10-27 and listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`:

- Q1 alias isolation on r2 / `anon_author_r2`; Q2 correct every r4 mention, including T-401's FD-062 row and T-409 step 11; Q3 new children attach where the prototype puts them; Q4 regenerate through the port (owned paths extended); Q5 take every expanded collection; Q6 n8 not seeded (FD-086); Q7 n6, n7, n10 keep their kind's key until T-405; Q8 storyboard counts updated, steps kept except 7 and 19; Q9 step 19 names MOD-2033 and MOD-2029; Q10 keep the port's naming rule (`anon_author_r4` is k16's commenter); Q11 the "Not provided" gaps are `about` and `address`; Q12 fix ISS-252 here.
- Left for the owner: F2 (reword or remove the prototype's n8), F4 (S2: the storyboard treats `rafi_c` as r6's author; outside FD-039), R3 (a real-name match, if the check finds one).
