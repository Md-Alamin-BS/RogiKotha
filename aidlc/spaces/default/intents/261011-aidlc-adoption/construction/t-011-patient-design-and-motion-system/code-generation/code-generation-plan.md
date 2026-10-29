# Code Generation plan — U45 `t-011-patient-design-and-motion-system` (T-011)

## Summary

- Builds: FD-091's patient design and motion system — "Warm Paper, Soft Depth" tokens (colour, type with Bengali sizes, shape, depth, spacing), Hind Siliguri 600 for Bengali headings via `next/font/local`, 44 px targets and a 3 px focus ring, one CSS-only motion file (route fade-rise, list stagger, step slide, sheet rise, press squeeze, one drawn publish tick), reduced motion from the OS and the in-app switch, a never-animated demo marker / disclaimer / emergency guidance, and two new gate checks (`contrast:patient`, `check:motion`)
- Touches: `apps/web/src/styles/patient.css`, new `apps/web/src/styles/motion.css`, `components/patient/motion/{RouteTransition,Reveal,PublishTick}.tsx`, the patient layout, the restyled shell parts, `app/fonts/bn-heading.ts` and the font file, `scripts/css-motion-check.mjs` and its tests, `tools/contrast.mjs --pairs patient`, root `package.json` scripts, Prettier config and ignore, `.gitattributes`, web Vitest and Playwright config, tests, records
- Tests: component tests in `en` and `bn` (Reveal, PublishTick, RouteTransition, layout), the CSS check's planted violations in the `tooling` project, `contrast:patient` fail-closed tests, a motion smoke assertion, a Playwright `motion.spec.ts` run at Build and Test

## Inputs

Functional Design (reviewed READY): `construction/t-011-patient-design-and-motion-system/functional-design/` — `functional-spec.md` (WF1–WF8, §§ 4–12), `rules.md` (BR1.1–BR9.9), `entities.md`, `frontend-components.md` (§§ 1–10), `functional-design-questions.md` (Q1–Q10), `traceability.json`; the review `functional-design/reviews/review-01.md` (four minor points, resolved below). Task `docs/implementation/tasks/T-011-patient-design-and-motion-system.md`; FD-091, FD-093; `01-conventions.md` §7, §13; T-010 as merged (`14c21a9`).

## Review points resolved in this plan

1. `PublishTick` animates with `@starting-style` transitions, like `Reveal`, never a keyframe gated by `data-motion-ready`; a test proves a tick present at first paint does not animate (BR4.5).
2. BR3.6 applies to the shell, the shared patient classes and every new rule; page-body classes keep their literal lengths until their page Unit restyles them, and an S4 ISS row lists what is left.
3. The language toggle keeps the path without the locale, so BR6.1 holds: no route transition on a language switch. The spike checks the toggle and back/forward, and functional-spec § 7 and frontend-components § 10 are corrected to match.
4. BR1.8 compares the custom-property names and values of the two dark blocks, matching BR1.7 and `M10-tokens`; a planted fixture with a changed value is added.

## Steps (test-after, per the Testing Contract)

The build runs in three phases inside this one Unit (one branch, serial merge, D13). Phase B splits by file so no two developers touch the same file.

**Phase A — foundation (one developer)**

- [x] **Step 1** — Baseline on `bolt/t-011-patient-design-and-motion-system`: `pnpm infra:up`, `timeout 1200 pnpm check`, `timeout 600 pnpm smoke`; record counts and wall clock. Read the open `ISSUES.md` rows for `apps/web` styles, motion and contrast (ISS-272..302, incl. ISS-279 and ISS-298).
- [x] **Step 2** — Verify the runner and record the unit-scoped commands in `unit-test-instructions.md`.
- [x] **Step 3** — Dependency check (BR9.7): `next/font/local` with Hind Siliguri (licence, `.woff2` subset), Playwright (a version pnpm's `minimumReleaseAge` accepts), React `ViewTransition` on React 19.3 and Next 16.3.4, impeccable; one dated entry in `docs/status/dependency-check-log.md`. Add `*.woff2 binary` to `.gitattributes` before the font is committed.
- [x] **Step 4** — Spike (half a day at most; WF2, Q4, Q8): the keyed `RouteTransition` in the patient layout; static view-transition groups for the demo marker, disclaimer and emergency guidance; the language toggle (no transition) and back/forward. Record the result in `code-summary.md`. If React `ViewTransition` is not usable on this stack, take the design's documented fallback and say so.
- [x] **Step 5** — Tokens (frontend-components § 3; BR1, BR2, BR3): one patient token block in `patient.css` (colour, type with Bengali sizes and line-heights, shape, depth, spacing `--space-1` to `--space-8`, `--grid-min`, `--measure`), exactly one dark block and no scheme block (BR1.7, BR1.8); `tokens.css` untouched; the font through `app/fonts/bn-heading.ts`.
- [x] **Step 6** — `motion.css` (§ 6) and the motion components (§ 5): `RouteTransition` (client, in the patient layout), `Reveal`, `PublishTick` (`@starting-style`), the `data-press` hook and the press list, reduced motion from the OS and the in-app switch, `data-motion-ready` after first paint. Only `transform` and `opacity` animate, and the never-animated parts stay still.

**Phase B — in parallel, by file**

- [x] **Step 7 (B1, tooling)** — `scripts/css-motion-check.mjs` (§ 8, rules M1–M10 incl. `M9-hover` and `M10-tokens`) with planted-violation tests in `scripts/css-motion-check.test.mjs` (the `tooling` project); `tools/contrast.mjs --pairs patient` (§ 8.1) with tests in `scripts/contrast.test.mjs`; root scripts `contrast:patient` and `check:motion`; Prettier: `patient.css` and `motion.css` in scope with a CSS `singleQuote: false` override, while `tokens.css`, `globals.css` and `admin.css` stay ignored.
- [x] **Step 8 (B2, shell restyle)** — the restyled shell parts of frontend-components § 7 on the new tokens, in `patient.css` only (masthead, tab bar, colophon, sheets, buttons, chips, cards, focus ring, 44 px targets); remove every hover lift, including `.emerg-card:hover`; no markup change unless § 7 says so.
- [x] **Step 9 (B3, tests and config)** — component tests in `en` and `bn` for `RouteTransition`, `Reveal`, `PublishTick` (first-paint no-animate), the patient layout and reduced motion (§ 9); mock `next/font/local` once in `apps/web/vitest.setup.ts`; exclude `apps/web/e2e/**` from the web Vitest project; `apps/web/playwright.config.ts`, `apps/web/e2e/tsconfig.json`, `apps/web/e2e/motion.spec.ts` and the `smoke:e2e` script; keep `apps/web` at 80% lines or more; one smoke assertion for the motion system. No test in `apps/*` imports `test-support`.

**Phase C — gate and records (one developer)**

- [x] **Step 10** — `pnpm check` as eleven steps (`contrast:patient` and `check:motion` after `contrast`, `build` last); `timeout 1200 pnpm check` and `timeout 600 pnpm smoke` green; `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` clean (UI Unit rule); the Lighthouse baseline and the wall clock recorded.
- [x] **Step 11** — Records: `01-conventions.md` §7.8 and §13; `ISSUES.md` rows for the design's findings (next free ids after ISS-302, `Found in U45 T-011`), incl. the BR3.6 page-body remainder; the task file's Hand-off and `docs/implementation/handoffs/T-011.md` (renames, final colours, font size, baseline, out-of-owned-path files, task-text corrections, the owner's look review in `en` and `bn`).
- [x] **Step 12** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (literal paths only, no `[`, `]` or `*`).

## Files touched

| Path | Change | In T-011's owned paths |
|---|---|---|
| `apps/web/src/styles/patient.css`, `apps/web/src/styles/motion.css`, `apps/web/src/components/patient/**`, the patient layout, `apps/web/src/app/fonts/**` | tokens, motion, components, shell restyle | yes |
| `tools/contrast.mjs`, `scripts/contrast.test.mjs`, `scripts/css-motion-check.mjs`, `scripts/css-motion-check.test.mjs`, root `package.json` | gate checks | added (design § 11) |
| `.prettierignore`, `prettier.config.mjs`, `.gitattributes`, `pnpm-lock.yaml` | formatting scope, binary font, Playwright | added (design § 11) |
| `apps/web/vitest.config.ts`, `apps/web/vitest.setup.ts`, `apps/web/playwright.config.ts`, `apps/web/package.json`, `apps/web/e2e/**`, `apps/web/src/app/layouts.test.tsx` and new tests | test config and tests | added (design § 11) |
| `docs/implementation/01-conventions.md`, `docs/status/dependency-check-log.md`, `docs/implementation/ISSUES.md`, `docs/implementation/handoffs/T-011.md`, the task file | records | added |

## Story and rule traceability

| Step | Rules | Story |
|---|---|---|
| 3–4 | BR9.7, BR6.1–BR6.4 | US2.4 |
| 5 | BR1.1–BR1.8, BR2.1–BR2.5, BR3.1–BR3.6 | US2.3 AC2.3.1–AC2.3.6 |
| 6 | BR4.1–BR4.6, BR5, BR6 | US2.4 AC2.4.1–AC2.4.6 |
| 7 | BR9.1–BR9.3, BR1.2 | US2.3 |
| 8 | BR3, BR6.11 | US2.3 |
| 9 | BR9.4, BR9.8, BR9.9 | US2.3, US2.4 |
| 10–12 | BR9.5, BR9.6 | — |

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

Applicable layers: frontend behaviour (styles, motion components, layout), environment and build configuration (gate scripts, Prettier, Vitest, Playwright), plus documentation. No repository, business logic or endpoint changes.

## Design decisions taken

Q1–Q10 answered A in the Functional Design (on the owner's standing instruction of 2026-10-27 and the no-questions instruction of 2026-10-29), listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. The owner's look review of the restyled patient shell in `en` and `bn` stays on the queue (FD-091).
