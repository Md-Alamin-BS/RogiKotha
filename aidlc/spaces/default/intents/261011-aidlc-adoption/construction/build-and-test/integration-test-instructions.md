# Integration test instructions — RogiKotha release 1

The active Test Strategy is Minimal. The project already carries integration and end-to-end suites
that every Unit extended, and the release-1 targets (NFR3, NFR4, NFR6, NFR7, AC12.3.x) are checked
through them, so this file records how to run them. Build first (`build-instructions.md`).

## Framework and configuration

| Suite | Runner | Configuration | Database |
|---|---|---|---|
| Database integration (`packages/database/src/**/*.int.test.ts`) | Vitest 4.1, project `database`, group 1 | `packages/database/vitest.config.ts` | `DATABASE_URL_TEST`, reset to an empty, freshly migrated schema once per run |
| Seed integration (`packages/test-support/src/seed/seed.int.test.ts`) | Vitest project `test-support-seed`, group 2 | `vitest.workspace.ts` | seeds `DATABASE_URL_TEST` after group 1 |
| Web integration (`apps/web/src/**/*.int.test.ts`, `*.int.smoke.test.ts`) | Vitest project `web-int`, group 3, serial | `vitest.workspace.ts` | the seeded `DATABASE_URL_TEST`, real Mailpit |
| Worker integration (`apps/worker/src/**/*.int.test.ts`) | Vitest project `worker-int`, group 3, serial | `vitest.workspace.ts` | the seeded `DATABASE_URL_TEST`, real Mailpit and ClamAV (the scanner block skips with a message when clamd is down) |
| Cross-unit browser journeys | Playwright, Chromium only (NFR5 narrowed; Firefox and WebKit are release 2) | `apps/web/playwright.config.ts` | `rogikotha_e2e_test`, created and seeded by the global setup, port 3107, lock `.data/e2e.lock` |

Playwright projects: `chromium-360` (360 px phone: journeys, keyboard, live region, motion switch),
`chromium-desktop` (1280 px: journeys, every a11y spec, the browser smoke specs, the security spec),
`chromium-reduced-motion` (phone, dark theme, `reducedMotion: 'reduce'`: Part 1, P3.11 and the motion
switch) and `log-scan` (after the other three: health and the log scan). Retries are 1 in the full
suite; a test that passes only on its retry is reported as flaky and is not a clean pass (BR1.6).

## How to run

```bash
pnpm test:int                         # database + web-int + worker-int (seed group included by test:coverage)
pnpm test:int <substring> ...         # positional filters, e.g. `pnpm test:int reset-guard`
pnpm exec vitest run --config vitest.workspace.ts --project web-int <file>   # one web-int file
pnpm smoke                            # the cumulative smoke suite (*.smoke.test.*), which only grows
pnpm e2e                              # builds web and worker, then the four browser projects
pnpm --filter @rogikotha/web exec playwright test --project=chromium-desktop --retries=0 journeys/reading.spec.ts
pnpm e2e:smoke                        # the browser smoke specs on chromium-desktop
```

`pnpm e2e:fast` pins all four projects; to run one project, call Playwright directly with
`--project=<name>` (ISS-750). The JSON report is `apps/web/test-results/report.json`; logs of the
suite's web server and worker are in `apps/web/test-results/logs/`.

## Cross-unit interactions covered

- Register, Mailpit confirmation and sign-in (U8/U9) feeding every contributor journey (U47, U48, U49).
- Named, pseudonymous and anonymous authorship (U11) on reviews (U47), edits and versions (U22) and
  comments (U49).
- The directory (U46) read by the composer (U47) and the experience page.
- Evidence upload through the route (U41 guard, U48 intake), the outbox relay, the pg-boss job and
  the worker's ClamAV scan (U48), with the public count only for processed items.
- Health probes (`/api/health`: db, queue, mail, scanner) and the log scan over the web and worker
  logs the run wrote (U41, U50).

## Coverage expectations

Minimal strategy plus the team floor: every package with source code at or above 80% line coverage
(`pnpm test:coverage` inside `pnpm check`, never lowered, D10); `pnpm test:int` and `pnpm smoke`
green with no assertion removed or skipped; the browser suite with 0 unexpected, 0 flaky and 0
skipped tests (BR1.6).

## Test data and environment

- Synthetic data only: the seed's fictional corpus (`packages/test-support/src/seed`), the e2e
  fixtures in `apps/web/e2e/fixtures/`, and per-run accounts made by the suite.
- The suite never touches `rogikotha` or `rogikotha_test` (`PROTECTED_DATABASES` in
  `apps/web/e2e/helpers/env.ts`) and never uses the demo's port 3000.
- Simulated outages (AC12.3.2): start a separate server process with `CLAMD_PORT` or `SMTP_PORT`
  pointed at an unused port; never stop the shared containers.
