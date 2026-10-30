# Code Generation plan — demo slice (`261030-demo-slice`)

## Summary

- Builds: the demo flows in `requirements.md` (FR1–FR7):
  - register, sign in and sign out with Better Auth (email and password, Argon2id);
  - profile edit;
  - home, doctors list and doctor profile;
  - write and edit an experience;
  - JPEG and PNG attachments, scanned with ClamAV and failing closed;
  - the experience page with comments and one reply level.
- Touches: `apps/web` (pages under `app/[locale]/(patient)/`, `server/**`, `components/patient/**`, the auth route), `packages/database/src/demo/**` (new data functions), `packages/i18n/messages/{en,bn}.json`, `apps/web/package.json` and `pnpm-lock.yaml` (better-auth, @node-rs/argon2), and the records.
- Tests: one test per requirement at the narrowest level (express, Minimal strategy), a happy path per component, database `*.int.test.ts` for the data functions, page renders in `en` and `bn`, one demo smoke assertion, and a click-through of every flow on the running app.

## Inputs

- `inception/requirements-analysis/requirements.md` (FR1–FR7, NFR1–NFR6) and `requirements-analysis-questions.md` (Q1–Q7, decided).
- The code knowledge base `aidlc/spaces/default/codekb/rogikotha/` (rescanned 2026-10-30).
- FD-099, FD-036 and FD-091.
- The prototype views in `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/` (`app.js`, `index.html`), the source of the markup and class names.

## Steps (test-after, per the Testing Contract)

Branch `bolt/demo-slice` from `main`. Agents work in parallel only on files they alone own; the integrator owns everything afterwards.

**Phase 1 — foundation (one agent)**

- [ ] **Step 1** — Baseline and runner: `pnpm infra:up`, `timeout 1500 pnpm check` and `timeout 600 pnpm smoke`, both green. Record the counts and the unit-scoped test commands in `unit-test-instructions.md`.
- [ ] **Step 2** — Dependencies: `better-auth` (1.7.x stable) and `@node-rs/argon2` in `apps/web`. Reuse the 2026-10-30 T-101 entry in `docs/status/dependency-check-log.md` if it covers them, otherwise append one.
- [ ] **Step 3** — Server foundation in `apps/web/src/server/`:
  - `db.ts`: the database client;
  - `crypto.ts`: AES-256-GCM with `APP_ENCRYPTION_KEY`, layout `iv|tag|ciphertext`;
  - `auth/instance.ts`: Better Auth on the `auth_*` tables through the Drizzle adapter. Email and password, no verification. Argon2id hashing with the seed's parameters (m=64 MiB, t=3, p=1) so seeded users sign in. httpOnly sameSite=lax cookies;
  - `auth/session.ts`: `getCurrentAccount()`, returning account id, username, display name, locale and current persona ids, or null;
  - `app/api/auth/[...all]/route.ts`.
  Then their tests.
- [ ] **Step 4** — Data-function shapes in `packages/database/src/demo/{accounts,doctors,reviews,evidence,comments}.ts`. Each file exports typed functions whose bodies throw `not built yet`, plus `index.ts`, so the feature agents build against fixed signatures.

**Phase 2 — features (six agents in parallel, each owns its files)**

Each agent puts its new i18n keys in `packages/i18n/messages/_fragments/<feature>.{en,bn}.json`; the integrator merges them.

- [ ] **Step 5** — Auth UI (FR1):
  - the `register` and `sign-in` pages;
  - `server/actions/auth.ts` (register creates the auth user, the `account_profiles` row with `status = active`, and a named persona; neutral messages);
  - `components/patient/auth/**`;
  - the masthead account control.
- [ ] **Step 6** — Profile (FR2): the `me` page, `server/actions/profile.ts`, `demo/accounts.ts` (a display-name change inserts a new named persona; the language preference), and `components/patient/profile/**`.
- [ ] **Step 7** — Home and doctors (FR3, FR7): the home page, `doctors` and `doctors/[id]`, `demo/doctors.ts` (neutral order, "Registration not verified", published counts, the recent experiences), and `components/patient/doctors/**`.
- [ ] **Step 8** — Write and edit (FR4): the `write` page and `experiences/[id]/edit`, `server/actions/review.ts`, `demo/reviews.ts` (create a published quick review with persona and attestation; an owner-only edit writes `review_versions`), and `components/patient/compose/**`.
- [ ] **Step 9** — Attachments (FR5):
  - `server/actions/evidence.ts`;
  - `server/storage.ts`, keeping originals under `var/evidence/` outside the web root;
  - `server/clamav.ts`, using the clamd TCP INSTREAM command against the compose ClamAV and failing closed;
  - `demo/evidence.ts`;
  - `components/patient/evidence/**`.
  The upload checks magic bytes, max 10 MB, and max 5 files.
- [ ] **Step 10** — Experience page and comments (FR6):
  - the pages `experiences/[id]` and `experiences`;
  - `server/actions/comments.ts` and `demo/comments.ts`, with one reply level and owner-only delete as a tombstone;
  - `components/patient/experience/**` and `components/patient/comments/**`.
  The page shows the evidence note through Step 9's component.

**Phase 3 — integrate, verify and harden**

- [ ] **Step 11** — Integration: merge the i18n fragments into `en.json` and `bn.json`, remove `_fragments`, and fix the seams between features. Add one demo smoke assertion. Then `pnpm typecheck`, `pnpm lint`, `pnpm lint:boundaries`, `pnpm format:check`, `pnpm test:int`, and finally `timeout 1500 pnpm check` and `timeout 600 pnpm smoke`, all green.
- [ ] **Step 12** — Run the app (`pnpm build`, `next start`, the worker not needed) and click through every flow in a real browser, in `en` and `bn`:
  - register;
  - sign out, then sign in as a seeded patient;
  - edit the profile;
  - write an experience about a seeded doctor, then edit it;
  - attach a PNG;
  - sign in as another user and comment, then reply.
  Fix what breaks.
- [ ] **Step 13** — Adversarial tests, auth and evidence being high risk. Separate agents try to break the slice: edit or delete someone else's experience or comment; post while signed out; upload a disguised or oversized file; reach an original file publicly. Each attempt becomes a test, and anything that breaks is fixed.

**Phase 4 — records**

- [ ] **Step 14** — `docs/implementation/ISSUES.md` rows (`Found in demo-slice`) for every assumption and finding. Write `code-summary.md`, `traceability.json` (FR1–FR7 and NFR1–NFR6, each mapped to the file that implements it) and `source-manifest.json` (literal paths only, no `[`, `]` or `*`). Add a short demo guide `docs/implementation/handoffs/demo-slice.md`: how to start, the demo accounts, and the click path.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "express",
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
  "input_sha256": "sha256:794bf896e624c2958d123d1ebd3b86f34e419971a5bb95ad87636e803b7a1ce4",
  "contract_sha256": "sha256:29a242cef6f16e2b683108566b700da1fdfca70f7b41e465b1cf95120c258568"
}
```

Applicable layers: repository and data access (`packages/database/src/demo/**`), business logic and API (server actions, the auth route), frontend behaviour (pages and components), and environment configuration. No schema change: the existing tables and seed cover the slice.

## Design decisions taken

Q1–Q7 of `requirements-analysis-questions.md` were decided by the agent under the owner's no-questions instruction, and the owner approved the requirements on 2026-10-30. The slice deliberately skips the layered ports and commands of the full plan (Q7). The full Units (T-101 onward) replace this code when the full plan resumes.
