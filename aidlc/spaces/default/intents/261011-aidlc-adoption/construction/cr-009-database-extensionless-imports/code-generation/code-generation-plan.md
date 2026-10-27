# Code Generation plan — U1 `cr-009-database-extensionless-imports` (CR-009)

## Summary

- Builds: extensionless relative imports across `packages/database/src` and `@rogikotha/database` in `transpilePackages`, so `apps/web` can import the database package under Turbopack (closes ISS-183)
- Touches: every `packages/database/src/**` file (import specifiers only), `apps/web/next.config.ts` (one line), `ISSUES.md`, `06-change-requests.md`, the CR-009 hand-off
- Tests: no new tests; existing suites with identical counts, a build probe and a mutation test

## Inputs

`docs/implementation/tasks/CR-009-database-extensionless-imports.md` (the Unit spec; Functional Design was skipped for this Unit: a mechanical build change), `docs/implementation/tasks/CR-005-contracts-extensionless-imports.md` (the same fix done before), `unit-of-work.md` U1, `01-conventions.md` §2. Story: none (enabling Unit).

## Steps (test-after, per the Testing Contract)

- [x] **Step 1** — Baseline on the Bolt branch: run `pnpm infra:up && pnpm check && pnpm smoke` and `pnpm test:int`; record every count (typecheck packages, test totals, i18n keys, route rows). Count the `.js`-suffixed relative specifiers under `packages/database/src` and the total relative-specifier count (the task file expected 124 and 124; record the real numbers).
- [x] **Step 2** — Reproduce: add the throwaway `apps/web/src/app/[locale]/dbprobe/page.tsx` (imports `doctors` from `@rogikotha/database`; ordinary folder name, not `_dbprobe`), run `pnpm --filter @rogikotha/web build`, keep the `Module not found` output.
- [x] **Step 3** — Implement: strip the `.js` suffix from every relative specifier under `packages/database/src`, including `./*.js`, `../*.js` and directory-index forms (`./search/index.js` → `./search`), changing nothing else on any line.
- [x] **Step 4** — Implement: add `'@rogikotha/database'` to `transpilePackages` in `apps/web/next.config.ts`; nothing else in that file.
- [x] **Step 5** — Verify after implementation: the probe build compiles; mutation test: put one `.js` back on one export line in `packages/database/src/index.ts`, confirm the build fails with `Module not found`, restore it, confirm it compiles again. Record both outputs.
- [x] **Step 6** — Remove the probe page. Run `pnpm check`, `pnpm smoke`, `pnpm test:int`, `pnpm --filter @rogikotha/worker typecheck`: all green with counts identical to Step 1. Grep: 0 suffixed relative specifiers left, total unchanged. Diff check: every changed line in `packages/database/` is an `import` or `export … from` line.
- [x] **Step 7** — Records: close `ISS-183` in `docs/implementation/ISSUES.md` as fixed in CR-009 (how); add the `CR-009` row to `docs/implementation/06-change-requests.md`; fill the task file's Hand-off and write `docs/implementation/handoffs/CR-009.md`.
- [x] **Step 8** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json`.

## Files touched

| Path | Change | In CR-009's owned paths |
|---|---|---|
| `packages/database/src/**` | import and export specifiers only | yes |
| `apps/web/next.config.ts` | `transpilePackages` entry | yes |
| `apps/web/src/app/[locale]/dbprobe/page.tsx` | throwaway probe, removed before the end | yes (temporary) |
| `docs/implementation/ISSUES.md`, `06-change-requests.md`, `handoffs/CR-009.md`, the task file's Hand-off | records | yes (task step 7) |

## Story and rule traceability

| Step | Story / requirement |
|---|---|
| 1–6 | enabling Unit for US1.1's architecture-enforced foundation (NFR11): `web → database` is a sanctioned edge (`01-conventions.md` §2) |

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

Only the environment/build configuration layer applies: no behaviour changes, so no layer gains a new test; the existing suites with identical counts are the check (the CR-009 smoke assertion requirement is met by the build probe and the mutation test, recorded in `code-summary.md`; no smoke assertion is removed).
