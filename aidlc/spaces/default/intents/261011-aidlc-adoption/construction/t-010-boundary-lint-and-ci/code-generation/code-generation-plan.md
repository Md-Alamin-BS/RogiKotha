# Code Generation plan — U3 `t-010-boundary-lint-and-ci` (T-010)

## Summary

- Builds: the full local gate of `01-conventions.md` §13 and the CI run of NFR11/D10 — `eslint-plugin-boundaries` rules encoding §2 with FD-040 and Questions 1–5, a manifest-driven fixture proof, the 80% line-coverage floor per package (with the tests that bring each package to it), `format:check`, a narrow identity guard, `pnpm contrast --tokens`, and a GitHub Actions workflow on `main` and `bolt/**` (closes ISS-060, ISS-205, ISS-226)
- Touches: root lint, format, Vitest and script configuration, `lint-fixtures/`, `scripts/`, `tools/contrast.mjs`, `.github/workflows/check.yml`, `apps/worker/src/health.ts`, the outbox repository, new test files in the packages below the floor, the one formatting-only commit, `01-conventions.md` §2/§13, the decision log, the dependency-check log, `ISSUES.md`, the T-010 hand-off
- Tests: the fixture proof (`pnpm lint:boundaries`), a `tooling` Vitest project with the smoke assertion and the identity-guard tests, the outbox `countPending` integration test, the coverage-raise unit tests, the mutation check

## Inputs

Design (no Functional Design stage for this `packaging` Unit; the design was drafted and committed): `docs/aidlc-migration/design-drafts/t-010-boundary-lint-and-ci/` — `functional-spec.md` (§ 3 matrix, WF1–WF9, §§ 6–16), `rules.md` (BR1.1–BR12.6), `entities.md`, `functional-design-questions.md` (Q1–Q11 answered A), `traceability.json`. Unit spec `docs/implementation/tasks/T-010-boundary-lint-and-ci.md`; `unit-of-work.md` U3; US1.1 (AC1.1.1–AC1.1.5); NFR6, NFR11, NFR13; FD-040; C13 `worker_import_rule`. CR-011 and CR-012 are merged (`main` at `2b79cdd`), so the § 16 preconditions hold; the § 16 re-measure is Step 1.

## Steps (test-after, per the Testing Contract)

The build runs in three phases. Phases A and C are one developer each; in Phase B the coverage raise is split by package across developers that write **test files only**, each in its own package, so no two touch the same file (one Unit, one branch, serial merge: D13 holds).

**Phase A — rules and measurement**

- [x] **Step 1** — Baseline on `bolt/t-010-boundary-lint-and-ci`: `pnpm infra:up`, `timeout 900 pnpm check`, `timeout 600 pnpm smoke`; record counts. Read the open `ISSUES.md` rows ISS-060, ISS-127, ISS-205, ISS-226 and any row in `apps/worker`, `packages/database/src/queue`, `packages/test-support`. Re-measure (§ 16): `prettier --check` with and without `--end-of-line auto`; re-read `test-support` imports after CR-012; next free ISS and FD ids.
- [x] **Step 2** — Verify the runner and record the unit-scoped commands in `unit-test-instructions.md`.
- [x] **Step 3** — Research and dependency check (WF1 step 3, BR12.2): `eslint-plugin-boundaries` latest stable with ESLint 10 flat-config support (fallback `dependency-cruiser`), its current rules and the resolver need; `@vitest/coverage-v8` 4.1.x (`include`, uncovered files, glob thresholds, zero-line globs); Prettier 3.9.x; `actions/checkout`, `actions/setup-node`, `pnpm/action-setup` (release and commit hash); `postgres:18`. One dated entry in `docs/status/dependency-check-log.md`; findings under `docs/planning/research/`.
- [x] **Step 4** — Decision entry (BR12.1): the next free FD row (FD-093 unless taken) with the rulings of Questions 1–5, "decided by the agent on the owner's standing instruction of 2026-10-27; awaiting the owner's confirmation".
- [x] **Step 5** — Boundary rules (WF2, § 3, § 10): install the plugin (and resolver if needed); `eslint.boundaries.mjs` spread into the `// T-010 adds boundaries here` slot; one `no-restricted-imports` block per file set (BR3.7); `lint-fixtures/**` in the root ignores; `pnpm lint` green, each finding handled by BR4.1/BR4.2.
- [x] **Step 6** — ISS-205 (Q3) and the unused devDependency (Q5): `PgOutbox.countPending(db)` with its integration test; `health.ts` uses it; drop `drizzle-orm` from `apps/worker/package.json` and `@rogikotha/test-support` from `apps/web/package.json`.
- [x] **Step 7** — Fixture proof (WF3, § 6): FX1–FX15, the manifest, `scripts/check-boundaries-fixture.mjs`; the `tooling` Vitest project (`scripts/vitest.config.ts` in `vitest.workspace.ts`) with the smoke assertion `scripts/boundaries.smoke.test.mjs` (BR5.5).
- [x] **Step 8** — Identity guard (WF8, Q11): `scripts/check-identity.mjs` and `scripts/check-identity.test.mjs` (refused trailer and footer, a bare model name passes).
- [x] **Step 9** — Contrast (WF7): `--tokens` in `tools/contrast.mjs`, fail-closed in flag mode; a tooling test on a token file without the tokens; a paragraph in `tools/README.md`.
- [x] **Step 10** — Coverage configuration (WF4, § 7): coverage block in `vitest.workspace.ts` with `include` on the nine source roots, the § 7 exclusions with reasons, **no thresholds yet**; `test:coverage` script; measure every package (`database` included); prove the file count per package equals its non-excluded source files (BR6.2); write the per-package figures and zero-coverage file lists into `code-summary.md`.

**Phase B — raise each package below 80% (WF9, Q7)**

- [x] **Step 11** — For each package below 80% from Step 10, one developer adds test files only, in that package, until it is at or above 80%: unit tests through public exports, builders, sentence names, no implementation-detail assertions; each runs only its own package's coverage command. A package that cannot reach 80% without a source change stops with an ISS row for the owner; the floor is never lowered (BR6.5).

**Phase C — gate, format, CI, records**

- [x] **Step 12** — Switch the per-package thresholds on (lines 80, all nine globs); `test:coverage` green; commit the Phase A–C work so far on the Bolt branch.
- [x] **Step 13** — Format (§ 8, Q9): `endOfLine: 'auto'` in `prettier.config.mjs`; `.prettierignore` with reasons; then one commit holding only `prettier --write .` output over the scope, verified by a whitespace-insensitive diff with no token change (BR7.4); `format:check` script.
- [x] **Step 14** — Root scripts and gate (WF5, BR8.1): `lint:boundaries`, `format:check`, `check:identity`, `test:coverage`, `contrast` (with `--tokens`), and `check` as the nine steps in order; `tools:contrast` unchanged; `pnpm check` wall clock recorded (BR8.3).
- [x] **Step 15** — CI (WF6): `.github/workflows/check.yml` per BR10.1–BR10.5 (actions pinned by hash, read-only token, no secrets, `postgres:18` service, init SQL, `db:migrate`, `pnpm check`, `pnpm smoke`).
- [x] **Step 16** — Documents and records (WF1 step 14): `01-conventions.md` §2 and §13; `ISSUES.md` (ISS-205, ISS-226, ISS-060 fixed in U3 T-010; ISS-127 note; F1–F9 with the next free ids, `Found in U3 T-010`); the task file's Hand-off and `docs/implementation/handoffs/T-010.md` (owned-path additions, task-text corrections, the size re-estimate); the team.md Code Style correction of Q4 proposed for the learnings step, not edited.
- [x] **Step 17** — Gate (WF1 step 15): `timeout 900 pnpm check` and `timeout 600 pnpm smoke` green; the manual acceptance rows of § 15; the mutation check (BR5.4: disable one rule block → `pnpm lint:boundaries` exits 1, restored). The CI run on the pushed Bolt head is triggered after the code review request and must be green before the merge (BR10.4).
- [x] **Step 18** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (literal paths only, no `[`, `]` or `*`).

## Files touched

| Path | Change | In T-010's owned paths |
|---|---|---|
| `eslint.boundaries.mjs`, `eslint.config.mjs`, `lint-fixtures/boundary-violation/**`, `scripts/check-boundaries-fixture.mjs`, `.github/workflows/check.yml`, root `package.json`, `tools/contrast.mjs`, `tools/README.md`, the task file hand-off | create / modify | yes |
| `pnpm-lock.yaml`, `vitest.workspace.ts`, `scripts/vitest.config.ts`, `scripts/*.test.mjs`, `scripts/check-identity.mjs`, `prettier.config.mjs`, `.prettierignore` | configuration and tooling | added (spec § 12) |
| files rewritten by the formatting-only commit | formatting only | added (Q9) |
| new `*.test.ts(x)` files in packages below the floor | tests only | added (Q7) |
| `apps/worker/src/health.ts`, `apps/worker/package.json`, `packages/database/src/repositories/outbox.ts`, its integration test, `apps/web/package.json` | ISS-205, unused dependency | added (Q3, Q5) |
| `docs/implementation/01-conventions.md`, `docs/status/decision-log.md`, `docs/status/dependency-check-log.md`, `docs/implementation/ISSUES.md`, `docs/implementation/handoffs/T-010.md`, `docs/planning/research/**` | records | added (spec § 12) |

## Story and rule traceability

| Step | Rules | Story |
|---|---|---|
| 3–4 | BR12.1, BR12.2 | — |
| 5–6 | BR1.1–BR1.4, BR2.1–BR2.6, BR3.1–BR3.8, BR4.1–BR4.2 | US1.1 AC1.1.1 |
| 7 | BR5.1–BR5.5 | US1.1 AC1.1.1 |
| 8 | BR11.1–BR11.2 | US1.1 |
| 9 | BR9.1–BR9.4 | US1.1 |
| 10–12 | BR6.1–BR6.7 | US1.1 AC1.1.3 |
| 13 | BR7.1–BR7.4 | US1.1 |
| 14 | BR8.1–BR8.4 | US1.1 AC1.1.4 |
| 15, 17 | BR10.1–BR10.5 | US1.1 AC1.1.2, AC1.1.5 |
| 16 | BR12.3–BR12.5 | — |

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

Applicable layers: repository / data access (`countPending`), environment / build configuration (lint, coverage, format, scripts, CI), plus documentation; the coverage raise adds tests to existing layers without changing source. No endpoint or frontend behaviour changes.

## Design decisions taken in the draft

All decided by the agent on the owner's standing instruction of 2026-10-27 and listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`:

- Q1 components may import server actions only; Q2 the worker imports application code only through a future `@rogikotha/application/worker` entry (type-only root imports allowed); Q3 forbid `drizzle-orm`/`pg` in the worker and fix ISS-205 here; Q4 encode the merged design (`contracts` → `zod`, `uuid`; `i18n` → `next-intl`), §2 corrected under the FD entry; Q5 test files may import Node built-ins, package tests may import `test-support`, app tests never; Q6 manifest-driven fixture with 10 violations and 5 controls; Q7 every package with code under the floor, raised in this Unit (size S → M–L); Q8 exclude only non-source files; Q9 code and configuration in the Prettier scope, git owns line endings, one formatting-only commit; Q10 CI on `main` and `bolt/**`, a Bolt merges only after its branch head is green; Q11 a narrow identity guard (ISS-060).
- The owner's attention: Q7 (the Unit grows) and Q10 (every later Bolt waits for a green CI run; the run overlaps the code review so it adds little wall time).
