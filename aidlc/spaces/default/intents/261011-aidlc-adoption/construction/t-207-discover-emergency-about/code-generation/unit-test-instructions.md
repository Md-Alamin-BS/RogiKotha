# Unit test instructions — U20 `t-207-discover-emergency-about`

## Framework

Vitest 4 through `vitest.workspace.ts`, which lists the workspace projects. U20 uses one of them:

- `web` (`apps/web/vitest.config.ts`, jsdom): the pure home helpers, the `(patient)/page.tsx` data path, the component tests, the page and 404 tests, and the smoke file. Testing Library renders each component in `en` and `bn` with `describe.each(['en', 'bn'])`, so `-t bn` selects the Bengali set (ISS-151).

U20 adds no integration test (no database change) and no Playwright test: the design asks for none, and the axe and Lighthouse runs on the home are U50's release check. The demo end-to-end run on `main` must stay green. Coverage uses `@vitest/coverage-v8`.

## Where it runs

Each Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigned (the `rogikotha_wN_test` form the reset guard accepts), never at another worktree's database. U20's own tests do not touch it, but `pnpm check` and `pnpm smoke` do. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. Step 3 runs the existing-area command before any change and records the count.

```bash
pnpm infra:up

# Pure home helpers (pickChips, browseConditions, teaserSub):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/pick-chips.test.ts apps/web/src/components/patient/home/teaser-sub.test.ts

# Home components (Home, TeaserRow):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/Home.test.tsx

# Home page data path with a mocked container, and the shared pages test (only its "/" row changes):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/home-page.test.tsx" apps/web/src/app/pages.test.tsx

# Half A pages (Emergency, About, Policy, FD-022 placement and key usage, emergency page parity):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/Emergency.test.tsx apps/web/src/components/patient/About.test.tsx apps/web/src/components/patient/Policy.test.tsx apps/web/src/components/patient/fd-022-lawful-placement.test.tsx apps/web/src/components/patient/fd-022-lawful-key-usage.test.ts "apps/web/src/app/[locale]/(patient)/emergency/"

# 404 (patient not-found, catch-all, root fallback):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/not-found.test.tsx" "apps/web/src/app/[locale]/(patient)/[...rest]/" apps/web/src/app/root.test.tsx

# The Bengali set only, across the Unit's files:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/ apps/web/src/components/patient/Emergency.test.tsx apps/web/src/components/patient/About.test.tsx apps/web/src/components/patient/Policy.test.tsx -t bn

# The Unit's smoke files, then the whole cumulative smoke suite:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/home.smoke.test.tsx apps/web/src/components/patient/emergency-about-policy.smoke.test.tsx
timeout 600 pnpm smoke

# i18n parity and the gate:
timeout 300 pnpm i18n:check
timeout 300 pnpm format:check
timeout 1200 pnpm check
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a bracketed or parenthesised path does not match in the shell, pass it in quotes, as above. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## What to cover (`frontend-components.md` § 5, `functional-spec.md` § 8)

| Group | Tests |
|---|---|
| `pickChips`, `browseConditions` | zero topics dropped; most accounts first; a tie broken by name with the `en` and the `bn` collator; at most 5; an empty input gives `[]`; the grid keeps the query order |
| `teaserSub` | count above 0 → type · place · `facility.visitCount` in the active digits; count 0 → `facility.noVisits`, never `0`; feedback hidden → type · place only; absent `area` left out |
| `Home`, `TeaserRow` | block order and one `h1`; three browse links in a nav named by `discover.browseAll`; chips link to `/topics/{id}`; grid plural counts; Limited data tag from `TeaserRow`; `facility.separation`; Bengali digits in step figures and counts; `data-static` on the note and the panel; no `.reveal` in the opener; anonymous `AccountRow` unnamed; `null` sections absent with their headings; `[]` latest shows `discover.latestEmpty` |
| `(patient)/page.tsx` | the four calls made once each with `{page: 1, pageSize: 3}` and `{limit: 4}`; each list failing (an `err` and a throw) omits only its section; the log line has exactly `section` and `correlationId`; the opener and emergency panel still render |
| Emergency | the provider's numbers in both digit sets; `tel:` hrefs with label and number in the accessible name; `emergview.bmdcShort`; last-verified line; no `style` attribute |
| Policy and FD-022 | Terms has six sections, the lawful one last; Privacy unchanged; the lawful section on `/terms` and `/privacy`, absent from `/`, `/about` and `/emergency`; lawful keys referenced only from `Policy.tsx` |
| 404 | the patient 404 in the request's locale with home and emergency links; the catch-all calls `notFound`; the root fallback in both languages, `lang` on each line, no `style` |
| Smoke | the home's `h1`, the configured emergency numbers and the three browse links, in `en` and `bn` |

Each test must be able to fail. Test names read as sentences. Never assert on class names used only for styling or on internal calls; the `.reveal` and `data-static` checks are the motion contract of T-011 and stay. No snapshots.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U20 the package that moves is `apps/web`; it must stay at or above 80% and is never lowered to pass (D10). `packages/contracts` loses one stub file and stays at or above 80%. Record the before and after figures in `code-summary.md`.

## Mocking and test data

- View models: the builders in the web-local `apps/web/src/components/patient/doctors/directory-test-support.ts` (U46 extends it), which wrap the `test-support` builders; never hand-written fixture objects, and nothing in `apps/*` imports `@rogikotha/test-support` directly.
- The home page: mock `@/server/container` (`getContainer` returning the module queries, `ports.config` and the logger port fakes); never the `server/data` demo module.
- Async server components: mock `next-intl/server` as the existing page tests on `main` do; mock `@/i18n/routing` (ISS-053); mock `next/navigation` `notFound` in the catch-all test.
- Configuration: `DEFAULT_CONFIG_VALUES` through the defaults-only provider, or a fake provider with different synthetic numbers to prove the page reads the provider.
- Data: synthetic only. Every name, topic, facility and account is invented; no real person or facility appears anywhere.
