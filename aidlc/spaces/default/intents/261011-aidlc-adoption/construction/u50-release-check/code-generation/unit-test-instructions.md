# Unit test instructions — U50 `u50-release-check`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U50 uses two of them:

- `tooling` (`scripts/vitest.config.ts`, node, `**/*.test.mjs`, 120 s per test): the pure parts of `scripts/wait-for.mjs`, `demo.mjs` and `demo-reset.mjs`, in `scripts/__tests__/`.
- `web` (`apps/web/vitest.config.ts`, jsdom, excludes `e2e/**` and `*.int.test.ts`): the health probes in `apps/web/src/server/health.test.ts` and `env.test.ts`, the health smoke, and the two node-environment files `apps/web/src/e2e-config.test.ts` and `apps/web/src/copy-no-rating.test.ts` (each starts with `// @vitest-environment node`).

Playwright (`@playwright/test` 1.64.1, Chromium only) is used because the design asks for it: the journeys, accessibility, motion, security, log-scan and NFR13 specs in `apps/web/e2e/` are the end-to-end tests of the merged product. They are written in Code Generation and run only after all nine dependencies have merged into `main` and U50 has rebased (BR15.5). `@axe-core/playwright` and `lighthouse` are added as pinned devDependencies of `apps/web` after the dependency check. Coverage uses `@vitest/coverage-v8`.

## Where it runs

Each Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigned to this worktree, never at another worktree's database. The browser suite uses its own `rogikotha_e2e_test` database, port 3107 and the `.data/e2e.lock` lock, so only one `pnpm e2e*` run per machine at a time (R11). There is no CI (FD-102): every command below runs locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`, `pnpm e2e*`). `pnpm e2e*` needs the compose PostgreSQL and Mailpit; the writing journey also needs ClamAV ready (R12).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. Step 5 runs the Vitest commands before any change and records the counts in the plan.

```bash
pnpm infra:up

# Demo scripts (wait-for, demo preflight/services/banner/stop, demo-reset):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project tooling scripts/__tests__/wait-for.test.mjs
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project tooling scripts/__tests__/demo.test.mjs scripts/__tests__/demo-reset.test.mjs

# Health probes, env defaults and the health smoke:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/health.test.ts apps/web/src/server/env.test.ts apps/web/src/server/health.smoke.test.ts

# Suite configuration and the message-file no-rating check:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/e2e-config.test.ts apps/web/src/copy-no-rating.test.ts

# Playwright: list what each project would run (no browser, no database):
timeout 300 pnpm --filter @rogikotha/web exec playwright test --list

# From Step 34 on (all nine dependencies merged, rebased), one spec at a time.
# First build once; the e2e:fast form then skips the build.
timeout 1200 pnpm --filter @rogikotha/web --filter @rogikotha/worker build
timeout 1200 pnpm e2e:fast --project chromium-desktop journeys/reading.spec.ts
timeout 1200 pnpm e2e:fast --project chromium-desktop journeys/contributor.spec.ts
timeout 1800 pnpm e2e:fast --project chromium-desktop journeys/writing.spec.ts
timeout 1200 pnpm e2e:fast --project chromium-desktop journeys/discussion.spec.ts
timeout 1200 pnpm e2e:fast --project chromium-360 journeys/
timeout 1200 pnpm e2e:fast --project chromium-desktop a11y/keyboard.spec.ts a11y/live-region.spec.ts a11y/zoom-and-spacing.spec.ts
timeout 1200 pnpm e2e:fast --project chromium-reduced-motion
timeout 1200 pnpm e2e:fast --project chromium-desktop security/security.spec.ts smoke/motion.spec.ts
timeout 1200 pnpm e2e:fast --project log-scan

# Browser smoke (desktop project) and the cumulative Vitest smoke suite:
timeout 1200 pnpm e2e:smoke
timeout 600 pnpm smoke

# NFR13 (one worker, machine idle); a failing page is rerun once by hand:
timeout 1800 pnpm e2e:perf
timeout 900 pnpm e2e:perf --grep "<page>"

# The gate: two full clean browser runs, then the whole-suite checks:
timeout 3600 pnpm e2e
timeout 3600 pnpm e2e
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
timeout 600 pnpm test:int
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a filter path does not match, pass it in quotes or as the path relative to `apps/web/e2e`, which is the Playwright `testDir`. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## Runner check and counts before any change (plan Step 5, 2026-11-07)

Every command above was checked on `bolt/u50-release-check` at `d3e2d66` and works as written:

- `--project web apps/web/src/server/health.test.ts apps/web/src/server/env.test.ts`: 2 files, 16 tests passed. `health.smoke.test.ts` does not exist yet (Step 18).
- `--project tooling scripts`: 6 files, 121 tests passed. The existing script tests sit directly in `scripts/*.test.mjs`; the tooling glob `**/*.test.mjs` also picks up the new `scripts/__tests__/` files, so no config change is needed.
- `pnpm --filter @rogikotha/web exec playwright test --list`: 17 tests in 2 files (`smoke/motion.spec.ts`, `smoke/demo.spec.ts`) on the old single `chromium` project, with Playwright 1.64.1 and the Chromium builds already installed.

## What to cover (`functional-spec.md` § 10, `rules.md`)

| Group | Tests |
|---|---|
| `wait-for.mjs` (BR8.10) | TCP and HTTP ready before the deadline on a local server bound to port 0; timeout names the target; a wrong HTTP status fails |
| `demo.mjs` (BR8.1–BR8.6, BR8.12) | a busy port is named; `.env` generation gives three keys of the right length, all different, and `.gitignore` holds `.env`; `APP_MODE=production` refused; seed runs for 0 profiles and is skipped for n; the banner lists only release-1 accounts; the stop path uses `taskkill /T /F` on `win32` and a signal elsewhere |
| `demo-reset.mjs` (BR8.8) | production refused; without `--yes` and no confirmation nothing runs; the steps run in the BR8.8 order (fakes) |
| Health (BR9.1–BR9.3) | each probe ok, refused, timed out (2 s) and wrong answer with fake sockets; `ok` true only when db, queue and mail are ok, and a down scanner leaves `ok` true; no error detail in the body; env defaults localhost, 1025, 3310 |
| Suite config (BR1.9) | the five projects, their `testMatch`, engines and viewports; no `*.test.ts` loaded by Playwright; every journey uses `forEachLocale`; no fixed sleep under `apps/web/e2e/`; no e2e workflow file; no `test-support` import under `apps/web/e2e/`; one planted-bad case fails |
| Message files (BR2.10) | every whole-word rating or score value in `en.json` and `bn.json` is in the allowlist; one planted match fails |
| Vitest smoke | `health.smoke.test.ts`: `healthReport` with fakes reports all four probes |
| Browser smoke | `e2e/smoke/release1.smoke.spec.ts`: `/bn` and `/en` with the demo marker, a seeded sign-in, a quick review published and read back, a comment posted |
| End to end | journeys P1–P4 exactly as WF2, in `bn` then `en`; each part has its happy path and at least two refusal or edge cases (P2.8c, P2.9, the P3.12 refusals, the P4.15 length); a11y, motion, security, log-scan and NFR13 per WF3–WF5 |

Each test must be able to fail. Test names read as sentences (the e2e titles follow `P<part>.<step> [<locale>] <sentence>`). Never assert on class names or internal calls; journeys select by role and accessible name from the message files, then by the `data-testid` hooks already on `main`. Waits are condition-based with deadlines; fixed sleeps are forbidden (BR1.7).

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U50 the package that moves is `apps/web` (`health.ts`, `env.ts`); it must stay at or above 80% and is never lowered to pass (D10). `scripts/` and `apps/web/e2e/` are outside the coverage roots; their tests still run in `pnpm check` (`tooling`) and `pnpm e2e`. Record the before and after figures in `code-summary.md`.

## Mocking and test data

- Vitest: fake sockets (`net.Socket` stand-ins or local `net.createServer` on port 0), a fake pool for the queue probe, fake spawn and fake count functions for the demo scripts. In `apps/web` tests use the existing helpers that wrap the `test-support` fakes and builders (for example `server/request-context-test-support.ts`), because nothing in `apps/*` imports `test-support` directly; build inputs with builders, not hand-written fixture objects.
- Playwright: no import from `packages/test-support` (BR7.4). Data comes from the seed (reached by visible names in `e2e/fixtures/seed-facts.ts`, BR7.2) and from per-test helpers (`registerConfirmed`, `publishQuickReview`) that create fresh run-marked data (BR1.5, BR7.1). Evidence fixtures are read by path from `packages/test-support/fixtures/`; the 16 MB PNG is generated in memory (BR7.3). Mail is read from Mailpit by recipient and subject and never deleted (BR6.1, BR6.2).
- Data: synthetic only. Every address uses `example.test`, every name is invented or run-marked (`E2E Doctor <runId>-<n>`, `E2E-TEXT-<runId>`, `E2E-COMMENT-<runId>`), and no real person or facility appears anywhere.
