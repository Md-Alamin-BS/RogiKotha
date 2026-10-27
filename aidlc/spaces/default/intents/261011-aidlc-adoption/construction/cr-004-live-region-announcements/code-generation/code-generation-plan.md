# Code Generation plan — U7 `cr-004-live-region-announcements` (CR-004)

## Summary

- Builds: localized screen-reader announcements for the theme toggle, the language toggle (announced on arrival in the new language, Q1 = A) and view changes, in both languages (FD-042)
- Touches: `ThemeControls.tsx`, `ViewShell.tsx`, `en.json`, `bn.json`, regenerated `keys.ts`, their tests and one new smoke test
- Tests: about 10 component tests (each in `en` and `bn`) and 1 smoke assertion

## Inputs

`functional-design/functional-spec.md`, `frontend-components.md`, `rules.md` (BR1.1–BR4.5), the design review `functional-design/reviews/review-01.md`, `docs/implementation/tasks/CR-004-live-region-announcements.md`, FD-042. Story US12.1; requirements FR91, FR95, NFR6, NFR7.

## Design review findings handled here

| Finding | How this plan handles it |
|---|---|
| Major: the arrival announcement may be written into a freshly mounted `#sr-live` in the same commit, so a screen reader may not speak it | `ViewShell` schedules the arrival announcement (language or view) after mount with a short delay (about 150 ms, cleared on unmount), so the live region is already in the page before its text changes. This stays inside `ViewShell.tsx`; `lib/announce.ts` is not changed. The running-app check is a Build and Test row (screen reader or Playwright reading `#sr-live` after a real locale switch). |
| Minor: Back then Forward within 30 s repeats "Language" | the note is deleted right after the language message is announced (BR2.2 tightened), so it is spoken once |
| Minor: effect dependencies not pinned | the `ViewShell` effect depends only on primitives: `view`, `locale`, `path` and the two message strings |
| Minor: tests to adjust | `ThemeControls.test.tsx`'s `setTheme` mock returns a resolved promise (and a rejected one for the failure test); tests that pass a literal string `view` use a `ViewName` member |
| Minor: traceability targets | `code-generation/traceability.json` maps AC12.1.2 to BR2.2/BR2.5 (language toggle) instead of BR2.4, and records AC12.1.6 as partly covered (live-region parts only; landmarks and axe stay with U42) |

## Steps (test-after, per the Testing Contract)

- [ ] **Step 1** — Baseline: `pnpm infra:up && pnpm check && pnpm smoke` green on the Bolt branch before any change; read `ISSUES.md` rows ISS-122 and ISS-050. (team practice step 1)
- [ ] **Step 2** — Verify the runner and record the unit-scoped command in `unit-test-instructions.md`: `pnpm --filter @rogikotha/web exec vitest run src/components/shared/ThemeControls.test.tsx src/components/patient/ViewShell.test.tsx src/components/shared/live-region-announcements.smoke.test.tsx`.
- [ ] **Step 3** — i18n keys (BR4.1, BR4.5; FD-042): add `a11y.announce.language`, `a11y.announce.themeDark`, `a11y.announce.themeLight`, `a11y.announce.view` (`{view}` placeholder) to `packages/i18n/messages/en.json` and `bn.json` in the same change, with the texts in `frontend-components.md` § 5; regenerate `packages/i18n/src/keys.ts` with the package's `keys` script (generated file, outside CR-004's listed paths: needed because the parity check fails when it is stale). Run `pnpm i18n:check`.
- [ ] **Step 4** — Frontend, `ThemeControls.tsx` (WF1, WF2; BR1.1–BR1.3, BR2.1, BR2.4, BR2.5, BR4.4): theme handler announces the new theme in the active locale only after the write succeeds; language handler writes the per-tab pending note (target locale, locale-free path, time), storage errors ignored; motion handler unchanged. Export the two note helpers (`writeNote`, `decideArrival`) from this file.
- [ ] **Step 5** — Frontend, `ViewShell.tsx` (WF3; BR2.2, BR2.3, BR3.1–BR3.3): `view` narrowed to `ViewName`; localized view name through `titleForView` (fallback `nav.discover`); after mount, schedule one announcement: the language message when `decideArrival` returns `'language'` (then delete the note), otherwise the view message. Effect depends on primitives only.
- [ ] **Step 6** — Frontend tests after implementation (test-after): component tests in `en` and `bn` for every row of `frontend-components.md` § 7, rendered in the translation provider with the real dictionaries and the live region; adjust `ThemeControls.test.tsx` and `ViewShell.test.tsx` as noted above; no assertion removed or skipped. Run the unit-scoped command.
- [ ] **Step 7** — Smoke (CR-004 step 4): new `apps/web/src/components/shared/live-region-announcements.smoke.test.tsx` asserting the theme toggle fills `#sr-live` with non-empty text in both locales and the view announcement holds no raw view identifier. Run `pnpm smoke`.
- [ ] **Step 8** — Records: close `ISS-122` in `docs/implementation/ISSUES.md` as fixed in CR-004 (option (a), FD-042); add an S4 row: a failed preference write gives the user no feedback (predates CR-004, found in U7 Functional Design); add an S3 row: the new Bengali announcement strings await the owner's bilingual review with ISS-050 (FD-042); add an S4 row: CR-004's "Bengali" acceptance row reads differently for the language toggle under Q1 = A (announced on arrival).
- [ ] **Step 9** — Checks: `pnpm check`, `pnpm smoke`, `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`; all green.
- [ ] **Step 10** — Step 5 files: `code-summary.md`, `traceability.json`, `source-manifest.json` (every source path created or changed).

## Files touched

| Path | Change | In CR-004's owned paths |
|---|---|---|
| `apps/web/src/components/shared/ThemeControls.tsx` | theme announcement, language note, note helpers | yes |
| `apps/web/src/components/patient/ViewShell.tsx` | localized view name, delayed arrival announcement | yes |
| `packages/i18n/messages/en.json`, `bn.json` | four keys, same change | yes (option a) |
| `packages/i18n/src/keys.ts` | regenerated | no: generated file the parity check requires |
| `apps/web/src/components/shared/ThemeControls.test.tsx`, `apps/web/src/components/patient/ViewShell.test.tsx` | tests | no: implied by CR-004 step 3 |
| `apps/web/src/components/shared/live-region-announcements.smoke.test.tsx` | new smoke test | no: CR-004 step 4 |
| `docs/implementation/ISSUES.md` | close ISS-122, add rows | no: team practice (every defect gets a row) |

`apps/web/src/lib/announce.ts` is not changed.

## Story and rule traceability

| Step | Story / AC | Rules |
|---|---|---|
| 3 | US12.1 (AC12.1.4) | BR4.1, BR4.5 |
| 4 | US12.1 (AC12.1.2) | BR1.1–BR1.3, BR2.1, BR2.4, BR2.5, BR4.4 |
| 5 | US12.1 (AC12.1.2, AC12.1.6) | BR2.2, BR2.3, BR3.1–BR3.3 |
| 6–7 | US12.1 | BR4.2, BR4.3 |

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

Only the frontend layer applies to this Unit: no data model, repository, business-logic module or endpoint changes.
