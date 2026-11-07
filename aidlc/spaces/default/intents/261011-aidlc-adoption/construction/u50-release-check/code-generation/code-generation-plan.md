# Code Generation plan — U50 `u50-release-check` (T-503 + T-504 + T-505)

## Summary

- Builds: the release-1 Playwright suite (`apps/web/e2e/`: three Chromium journey projects plus `log-scan` and `nfr13`, storyboard Parts 1–4 in `bn` and `en` with axe, keyboard, live-region, zoom, motion, security and log checks, the NFR13 Lighthouse flow), the one-command demo (`scripts/{wait-for,demo,demo-reset}.mjs`, the root `demo*` and `e2e*` scripts, `DEMO.md`), the three real `/api/health` probes, the zero-caller demo-slice deletions, and the release-1 validation documents
- Touches: U50's owned paths only (`apps/web/playwright.config.ts`, `apps/web/e2e/`, `scripts/{wait-for,demo,demo-reset}.mjs` and their tests, `DEMO.md`, `README.md` demo section, `docs/validation/`, the `e2e*` and `demo*` root scripts, zero-caller items in `packages/database/src/demo/`), plus the recorded additions of `functional-spec.md` § 9 (`apps/web/package.json`, `pnpm-lock.yaml`, `.gitignore`, `health.ts`, `env.ts`, two new web test files, the storyboard, the three task files, `ISSUES.md`, the status logs) and the records
- Tests: the scripts' pure parts (`tooling` project), every health probe with fake sockets (`web`), the suite-config and message-file tests (`web`, node environment), one Vitest smoke for the health report, the browser smoke `e2e/smoke/release1.smoke.spec.ts`, and the journeys themselves as end-to-end tests, run twice clean on the rebased `main` after all nine dependencies merged

## Inputs

- Functional Design (reviewed, review 01 R-01 to R-13 settled): `construction/u50-release-check/functional-design/`: `functional-spec.md` (WF1–WF11, §§ 1–16), `rules.md` (BR1.1–BR15.6; BR12.3, BR13.3, BR14.3–BR14.6 and BR14.8 retired with the 7-November cuts and not reused), `entities.md`, `functional-design-questions.md` (Q1–Q26 and the review 01 section), `traceability.json`, `reviews/review-01.md`.
- Unit entry U50 in `inception/units-generation/unit-of-work.md` (owned paths, "Not in release 1", depends on U9, U11, U20, U22, U41, U46, U47, U48, U49).
- Task files `docs/implementation/tasks/T-503-parity-accessibility-e2e.md`, `T-504-demo-composition.md`, `T-505-final-validation-and-docs.md`; `docs/implementation/05-demo-storyboard.md`.

## Cut for the 7 November date (built as cut, not as the task files say)

Not built in U50 (design § 16, each with its ISS row from § 11): deletions beyond zero-caller demo items (R13); the `pnpm screenshots` review set (R14); `tools/coverage.mjs` and `tools/proof-check.mjs` changes (R15); `PRODUCT.md`, `DESIGN.md`, `docs/scope-of-work.md` edits and the full `README.md` rewrite (R16, only the demo section is written); the reduced-motion run of every journey (R17, only Part 1, the P3.11 composer and `motion-switch.spec.ts`); the browser smoke inside `pnpm smoke` (R18, it runs inside `pnpm e2e`). Also not built (FD-105): Firefox, WebKit, the 390, 768 and 1440 px viewports, the staff and workspace journeys, the search page and its NFR13 gate, the PWA checks, `demo:clock` (Q9), `e2e.yml` (FD-102).

## Where it runs

- The Unit runs in its own git worktree on its own Bolt branch `bolt/u50-release-check`, cut from `main`, under the swarm (FD-094). `DATABASE_URL_TEST` points at the test database the orchestrator assigned to this worktree (as U9 found, a name ending in `_test`, for example `rogikotha_w1_test`), never at another worktree's database.
- The browser suite uses its own fixed database `rogikotha_e2e_test`, port 3107 and the `.data/e2e.lock` lock (BR1.3, R11): only one `pnpm e2e` run per machine, so never run it while another worktree runs one.
- U50 is the last Unit. Steps 1–33 can be written before every dependency has merged, but every step that RUNS a journey, a11y, security, smoke or NFR13 spec waits until Step 34 has rebased on a `main` holding all nine dependencies (BR15.5). Until then, run only the Vitest steps.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`, `pnpm e2e*`).
- There is no GitHub Actions workflow and no CI (FD-102, BR15.2). The gate is local only: `pnpm check`, `pnpm smoke` and two clean `pnpm e2e` runs on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths and the listed shared files, after reading `git diff --cached`.

## Steps (test-after, per the Testing Contract)

**Phase A — baseline, dependencies and runner**

- [x] **Step 1** — Baseline in the worktree on `bolt/u50-release-check`. Confirm `DATABASE_URL_TEST` names the assigned database. Run `pnpm infra:up`, `pnpm build` once (typed routes for lint), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record the file and test counts and the `apps/web` line coverage in this step's note. Read the open `ISSUES.md` rows ISS-261, ISS-309, ISS-310, ISS-323, ISS-443 and any open `S1` in a release-1 area; an open `S1` stops the Unit. Record which of the nine dependencies (U9, U11, U20, U22, U41, U46, U47, U48, U49) are merged on `main` (BR15.5).
  - Done (2026-11-07, `d3e2d66`): `DATABASE_URL_TEST` names `rogikotha_test_w9` (the worktree's own database). The compose services were already running for the machine, so `pnpm infra:up` was not run. `pnpm build` green; `pnpm check` green: 303 test files, 3362 tests passed plus 2 expected failures; coverage lines 95.34% overall (8028/8420), `apps/web` 95.22% (2690/2825) by the coverage summary. `pnpm smoke` green: 25 files, 47 tests. One lint warning (unused eslint-disable directive in `packages/i18n/src/routing.ts` line 17) is on `main`, not U50's; not an error.
  - Open rows read: ISS-261, ISS-309, ISS-310, ISS-323 and ISS-443 are all still open and are closed by U50 at Step 52. No open `S1`: every `S1` row is fixed or accepted by the owner (ISS-271).
  - Dependencies merged on `main`: U9, U11, U20, U46, U47, U49. Not yet merged: U22, U48, U41 (they are being built in parallel). Steps that run a journey wait for them (Step 34).
- [x] **Step 2** — Dependency check (BR15.6): the `@playwright/test` entry in `docs/status/dependency-check-log.md` is older than 3 days; `@axe-core/playwright` and `lighthouse` are first-time installs. Verify the current stable releases, skim their changelogs and open issues (Lighthouse user flows with an external Chromium through its bundled `puppeteer-core`; axe-core rule changes), and append one dated entry naming the exact versions.
  - Done: entry dated 2026-11-07 appended. Pins: `@playwright/test` stays 1.64.1 (1.65.0 is two days old), `@axe-core/playwright` 4.14.0, `lighthouse` 13.6.0. The firecrawl web tool was out of credits, so the release notes were read through the GitHub API and the versions from the npm registry; no issue-tracker search was done. Lighthouse with an external Chromium is re-checked at Step 39.
- [x] **Step 3** — Append the three FD rows of design § 12 to `docs/status/decision-log.md` with the next free numbers (NFR13 method and pass rule; the release-1 verdict rule; `/api/health` readiness), each "decided by the agent under the owner's delegation of 2026-11-04".
  - Done: FD-120 (NFR13 method and pass rule), FD-121 (release-1 verdict rule), FD-122 (`/api/health` readiness), appended after FD-114. FD-120 to FD-122 are a block reserved for U50 so Units built in parallel (U22, U48, U41) do not collide on numbers; FD-115 to FD-119 stay free for them. On merge keep both sides.
- [x] **Step 4** — Install the pinned devDependencies in `apps/web/package.json` (`pnpm --filter @rogikotha/web add -D -E @axe-core/playwright@<v> lighthouse@<v>`), commit `pnpm-lock.yaml` with it. Run `pnpm --filter @rogikotha/web exec playwright install chromium` if the browser is missing.
  - Done: `@axe-core/playwright` 4.14.0 and `lighthouse` 13.6.0 added as exact devDependencies; `pnpm-lock.yaml` committed with them. The lockfile diff also rewrites peer-resolution suffixes (`supports-color@7.2.0`) on existing entries, which comes with the install; no existing package changed version. Playwright 1.64.1 Chromium builds were already installed, so `playwright install` was not run.
- [x] **Step 5** — Verify the runners and record the exact unit-scoped commands in `unit-test-instructions.md`: Vitest 4 through `vitest.workspace.ts` (`web` jsdom project, `tooling` project for `scripts/**/*.test.mjs`), and Playwright (`pnpm --filter @rogikotha/web exec playwright test --list` on the current config). Run `apps/web/src/server/health.test.ts` and the existing `scripts/*.test.mjs` with their unit-scoped commands and record the counts before any change.
  - Done: counts recorded in `unit-test-instructions.md`: health and env tests 16 passed (2 files); existing script tests 121 passed (6 files); `playwright test --list` 17 tests in 2 files (the old single `chromium` project).
- [x] **Step 6** — Task amendments (BR13.4): add a "Release 1 amendment (FD-105, U50)" section to `docs/implementation/tasks/T-503-parity-accessibility-e2e.md`, `T-504-demo-composition.md` and `T-505-final-validation-and-docs.md` with the § 14 acceptance mapping, the deferred rows "deferred to release 2 (FD-105)", the 5433 port correction (R6) and the removal of T-505's model-id allowance (R8). Nothing in them names a model.
  - Done: the section sits before each file's Hand-off heading. The amendments name no model; the task files' older header rows ("Class → model") were left as history.

**Phase B — data and repository layers**

- [x] **Step 7** — No schema, repository, command or query change. U50 adds no migration, so it takes no migration number (if one were ever needed, it takes the next free number at merge time, not now). `packages/database/src/schema/demo.ts` is never touched (BR14.2). Verify with `git diff --stat main -- packages/contracts packages/domain packages/application packages/adapters packages/database/src/schema packages/database/migrations` (empty). The only database-package change is the zero-caller deletions in Steps 43–44.
  - Done: the diff is empty.

**Phase C — demo tooling (business logic: root scripts)**

- [x] **Step 8** — Implement `scripts/wait-for.mjs` (BR8.10): exported `waitForTcp({host, port, timeoutMs})` and `waitForHttp({url, timeoutMs, expect})`, condition polling with a deadline (no fixed sleep, BR1.7), a CLI form `node scripts/wait-for.mjs tcp|http <target> <seconds>` with exit 0 or 1 and a message naming the target.
  - Done: polling every 500 ms, each attempt cut at 2 s or the deadline. `waitForTcp` also takes `send` and `expect` (ClamAV `zPING\0` and `PONG`); `waitForHttp` takes `expect` (status, default 200) and an optional `accept(response)` body check (the demo's health wait). Rejections read `<tcp|http> <target> not ready after <n> ms (<last reason>)`.
- [x] **Step 9** — Write and run `scripts/__tests__/wait-for.test.mjs`: ready before the deadline (a local `net.createServer` and `http.createServer` on port 0) and timeout with the target named in the error; an HTTP status that does not match fails.
  - Done: 11 tests green (TCP ready, probe reply, wrong reply, nothing listening; HTTP ready, 503 then 200, status 500, body check never passing; CLI parse, exit 0 and exit 1).
- [x] **Step 10** — Implement `scripts/demo.mjs` preflight as exported pure functions plus `main()` (BR8.1): Node 24 and pnpm 11 checks, `docker info`, free ports 3000, 5433, 1025, 8025, 3310 (a busy port is named in the message), `.env` generation from `infra/compose/.env.example` with `APP_MODE=demo` and three fresh random keys when missing (including `MAIL_RECIPIENT_KEY`, ISS-443), refusal of `APP_MODE=production`. Each step prints a timestamp and a done or failed mark; a failed step exits 1.
  - Done: a busy port is a conflict unless its compose service (`docker compose ps --status running --services`) holds it; port 3000 always must be free. The message names the port, the holder command and its output. Keys are 32 random bytes in base64, drawn again on a repeat. ASSUMPTION(U50): `demo:serve` runs the preflight too (BR8.1 names both triggers); ISS-751.
- [x] **Step 11** — Implement `scripts/demo.mjs` services, data and build (BR8.2–BR8.4): `docker compose -f infra/compose/docker-compose.yml [-p $RK_COMPOSE_PROJECT] up -d`; PostgreSQL healthy and Mailpit `/api/v1/info` within 90 s through `wait-for.mjs`; ClamAV `PONG` within 120 s or a warning and continue; `pnpm db:migrate`; `account_profiles` count through `docker compose exec -T postgres psql`, seed only at 0, else print "Existing data kept."; web and worker build unless `--no-build`.
  - Done: PostgreSQL readiness reads the compose healthcheck through `docker inspect` (polled to 90 s); Mailpit and ClamAV go through `wait-for.mjs`.
- [x] **Step 12** — Implement `scripts/demo.mjs` run and banner (BR8.5, BR8.6): one absolute storage folder from the repository root passed as `EVIDENCE_STORAGE_DIR` and `STORAGE_ROOT` to both children; `next start` on 3000 and the built worker as children with cwd the repository root and prefixed output; `.data/demo.pid`; signals forwarded and both stopped together (on Windows `taskkill /pid <pid> /T /F` when a signal cannot reach the tree); the banner once `/api/health` is ok within 120 s, listing only the release-1 accounts. `--serve` (used by `demo:serve`) starts at the run step.
  - Done: the children are `pnpm --filter <app> start` (on Windows through one shell string, so no argument array goes to the shell); elsewhere each leads its own process group and is stopped with `SIGTERM` to the group. `.data/demo.pid` is JSON `{parent, web, worker}`. A requested stop exits 0; a child's own exit stops the other and exits with its code. The banner waits for `/api/health` `ok: true` (120 s), else warns with the probes not ok.
- [x] **Step 13** — Write and run `scripts/__tests__/demo.test.mjs` (BR8.12): port conflict named; `.env` generation (three keys, the right length, different values, `.gitignore` has `.env`); production refused; seed-if-empty for 0 and for n rows (a fake count function); the banner lists only release-1 accounts; the stop path chooses `taskkill` on `win32` and a signal elsewhere (fake spawn).
  - Done: 25 tests green; one also checks that `DEMO.md`'s accounts table matches the banner's accounts.
- [x] **Step 14** — Implement `scripts/demo-reset.mjs` (BR8.8): refuse production; confirm unless `--yes`; stop the processes in `.data/demo.pid`; `pnpm db:reset`; `pnpm db:seed`; empty the absolute storage folder and `var/evidence` when it exists; Mailpit `DELETE /api/v1/messages`; print the done line. Write and run `scripts/__tests__/demo-reset.test.mjs`: production refused, no confirmation means nothing runs, the step order with fakes.
  - Done: 9 tests green. ASSUMPTION(U50): a declined confirmation (or no terminal input) exits 0 with "Reset cancelled; nothing changed." (ISS-751). The reset was not run for real (it would reset the shared dev database).
- [x] **Step 15** — Root `package.json` scripts (BR1.8, BR8.7): `demo`, `demo:serve`, `demo:down` (containers down, volumes kept), `demo:logs`, `demo:reset`, `e2e` (build web and worker, then the journey and `log-scan` projects), `e2e:fast` (no build), `e2e:smoke` (`e2e/smoke/` on `chromium-desktop`), `e2e:perf` (`nfr13`). `smoke` stays Vitest-only (R18). Remove `smoke:e2e` from `apps/web/package.json`. Add `.data/`, `apps/web/test-results/` and `apps/web/playwright-report/` to `.gitignore`. `infra/compose/docker-compose.yml` stays unchanged (BR8.9, R4).
  - Done: also `e2e:ui` (BR1.8). `e2e` is the build then `pnpm e2e:fast`. `.data/` was already ignored. The `apps/web/vitest.config.ts` comment that named `smoke:e2e` now names the root `e2e*` scripts. BR1.8's `e2e:smoke` "No build found" check goes into the global setup at Step 21 (ISS-751). Passing extra `--project` flags to `e2e:fast` adds projects rather than narrowing them (ISS-750). Compose file unchanged.
- [x] **Step 16** — Write `DEMO.md` (BR10.1): at most ten lines of prose, the release-1 accounts table (synthetic, matching the banner), the reset and stop commands, a short "If something fails" list (port busy, ClamAV late, Docker disk growth on Windows), host port 5433 (R6).
  - Done: seven lines of prose. `rafi_c` is described as a contributor with no content yet and r6 as `named_tanvir-ahmed`'s, matching the seed (ISS-261; the storyboard is corrected at Step 46).

**Phase D — health probes (API / endpoint)**

- [x] **Step 17** — Implement the three probes in `apps/web/src/server/health.ts` (BR9.1, BR9.2): queue `select 1 from pgboss.version limit 1` on the shared pool; mail TCP to `SMTP_HOST:SMTP_PORT`, read a `220` line, send `QUIT`; scanner TCP to `CLAMD_HOST:CLAMD_PORT`, send `zPING\0`, read `PONG`; each within 2 s, in parallel; `ok` is true when db, queue and mail are ok (a down scanner is reported, not fatal); no error detail in the body. Add the host and port variables with the worker's defaults (localhost, 1025, 3310) to `apps/web/src/server/env.ts`.
- [x] **Step 18** — Write and run the probe tests (BR9.3) in `apps/web/src/server/health.test.ts` (extended) and `env.test.ts`: each probe ok, refused, timed out and wrong answer with fake sockets; `ok` for every combination of BR9.2; no error text in the body; the env defaults. Add the Vitest smoke `apps/web/src/server/health.smoke.test.ts`: `healthReport` with fakes reports all four probes and `ok: true`.
  - Done: 58 tests green across `health.test.ts`, `health.smoke.test.ts` and `env.test.ts`. Probes take an injectable socket factory; `healthReport` now takes an object of probe overrides (`{db, queue, mail, scanner}`) instead of a single db function. A port that is unset or not 1-65535 falls back to the default. The queue probe against the real `pgboss.version` table was not run here (the real-stack check is the log-scan health spec).

**Phase E — the suite harness (frontend behaviour: test infrastructure)**

- [x] **Step 19** — Rewrite `apps/web/playwright.config.ts` (BR1.1, BR1.2, BR1.6): `testDir 'e2e'`, `testMatch '**/*.spec.ts'`; projects `chromium-360`, `chromium-desktop`, `chromium-reduced-motion` (dark, `reducedMotion: 'reduce'`, Part 1, the P3.11 composer and `motion-switch.spec.ts` only), `log-scan` (depends on the journey projects), `nfr13` (only `perf/**`), each with its own `testMatch`; `webServer` `next start` on 127.0.0.1:3107 with `reuseExistingServer: false`; two workers; `retries: 1`; JSON and list reporters into `apps/web/test-results/`; `globalSetup` and `globalTeardown`.
  - Done, with deviations (ISS-752): Playwright 1.64.1 starts the `webServer` before the global setup, so readiness is `port: 3107`, not `/en` (a first run would get a 500 before the database exists). The server runs through `e2e/helpers/web-server.mjs`, which runs `next start --hostname 127.0.0.1 --port 3107` and writes a fresh `test-results/logs/web.log` (Playwright can only pipe a server's output to its reporter); it also stops with BR1.8's "No build found". `outputDir` is `test-results/artifacts` and the JSON report `test-results/report.json`; `trace: 'on-first-retry'`, `video: 'off'`, test timeout 120 s, expect 10 s, `timezoneId 'Asia/Dhaka'`, workers from `E2E_WORKERS` (default 2, at most 4). `playwright test --list` loads it: 17 tests in 2 files, the old smoke specs on `chromium-desktop` only.
- [x] **Step 20** — Implement `apps/web/e2e/helpers/env.ts` (`E2eEnvironment`, `runId`, repository root by `pnpm-workspace.yaml`, the absolute `.data/e2e-storage` path) and `helpers/database.ts` (create `rogikotha_e2e_test` when missing through the compose superuser, R10; reset, migrate, seed; refuse `APP_MODE=production`; never `rogikotha` or `rogikotha_test`) (BR1.2, BR1.3).
  - Done: `e2eEnvironment()` layers `.env`, the shell and the overrides; `DATABASE_URL`, `DATABASE_URL_WORKER`, `DATABASE_URL_TEST` and `DATABASE_URL_MAINTENANCE` all point at `rogikotha_e2e_test` (same role and host), `NODE_ENV` is dropped. A missing URL stays missing so the setup refuses by name instead of the config failing to load. `database.ts` refuses unless both app and worker URLs name a database ending in `_e2e_test` (never `rogikotha` or `rogikotha_test`) and `APP_MODE` is not production; it checks and creates the database with SQL on `psql`'s stdin through `docker compose ... exec -T postgres psql -U postgres` (`RK_COMPOSE_PROJECT` honoured), then runs `pnpm --filter @rogikotha/database reset` and `pnpm --filter @rogikotha/test-support seed` with the e2e environment. Not run against the real database in this batch.
- [x] **Step 21** — Implement `apps/web/e2e/helpers/global-setup.ts` and `global-teardown.ts`: take `.data/e2e.lock` or stop; wait for PostgreSQL and Mailpit (30 s, `wait-for.mjs`); database; empty the storage folder; open `test-results/logs/web.log` and `worker.log`; spawn the built worker from the repository root and wait for its start line; teardown stops the worker and deletes the lock (BR1.2, BR1.3).
  - Done: the setup checks the build first (BR1.8 "No build found", and the "build is older" warning), takes the lock by exclusive create (JSON `{pid, workerPid}`), waits for PostgreSQL (TCP from `DATABASE_URL`) and Mailpit (`/api/v1/info`) through `wait-for.mjs`, prepares the database, empties `.data/e2e-storage`, starts `apps/worker/dist/main.js` with its output written straight into a fresh `worker.log`, waits up to 30 s for the `"worker.started"` line (failing at once if the worker exits) and publishes `E2E_RUN_ID` (base36 time). `web.log` is opened by `web-server.mjs` (Step 19). The teardown only acts on a lock this run holds (Playwright runs it even when the setup failed): `SIGTERM`, up to 10 s, then `SIGKILL`, then the lock goes.
- [x] **Step 22** — Implement `helpers/locale.ts` (`forEachLocale`, `bn` first, `P<part>.<step> [<locale>]` titles, BR1.4), `helpers/messages.ts` (`msg(locale, key)` from `packages/i18n/messages/*.json`, BR2.6) and `helpers/digits.ts` (`toLatinDigits`).
  - Done: `forEachLocale(id, sentence, body)` hands the body `{page, context, browser, request, locale, open}`; `open(path)` goes to `/<locale><path>` and asserts `lang` and `data-lang` on the first page. `describeEachLocale` is the `describe.serial` form for the one P2.8 group. `msg` fills simple, `plural` and `select` arguments with numbers in the locale's digits and drops rich-text tags; `allMessages` lists every key. `digits.ts` also has `toBengaliDigits`, `formatNumber` (the app's grouping) and `hasAsciiDigit`.
- [x] **Step 23** — Implement `e2e/fixtures/synthetic.ts` (run-marked names, texts, the `E2E-TEXT-<runId>` and `E2E-COMMENT-<runId>` sentinels, the long Bengali title and section, BR7.1) and `e2e/fixtures/seed-facts.ts` (seeded facts by visible name: Dr. Farhana Rahman, d7–d10, r1 title, `shirin_88`, `anon_author_r2`, `WRITE_TARGET_DOCTOR`, BR7.2). Evidence fixtures are read by path from `packages/test-support/fixtures/`; the 16 MB PNG is built in memory (BR7.3); no import from `packages/test-support` (BR7.4).
  - Done: run usernames `e2e<runId><p|d|r><worker><retry><n>` (within `[a-z0-9_]{3,24}`, unique across workers and retries), synthetic run passwords, display names from a fixed en and bn list, the text, file and comment sentinels and their scan prefixes, a mixed Bengali, English and Banglish review text, the 120-character Bengali title and the 1500-character Bengali section. `seed-facts.ts`: the shared password, the four usernames, d1 by name, r1's title, `SPARSE_DOCTOR` d10 (Dr. Lutfun Nahar) and `WRITE_TARGET_DOCTOR` d6 (Dr. Rezaul Karim), both ASSUMPTION(U50) (ISS-752: every d7-d10 row fills every field, so Step 30 confirms what P1.4b reads), and the fixture paths.
- [x] **Step 24** — Implement `helpers/axe.ts` (`expectNoSeriousViolations`, `EXCLUSIONS = []` with the rule-id, selector, reason and ISS shape, BR3.1, BR3.2) and `helpers/motion.ts` (`sampleAnimations`, BR4.1).
  - Done: axe runs with the five WCAG tags, attaches the full result, annotates moderate and minor findings (`axe-minor`) and fails on serious or critical ones not excluded. `sampleAnimations` collects every animation seen over 30 animation frames; `reducedMotionViolations` (anything but opacity, or over 100 ms), `longOrLooping` (BR4.6) and `expectNeverAnimated` (BR4.3: visible within 1 s, no animations in the subtree, transitions 0 s, not covered) sit beside it.
- [x] **Step 25** — Implement `helpers/page-check.ts` `checkPage` (BR2.5, BR3.5, BR3.6, BR4.3): demo marker, disclaimer where the page has one, non-empty CSP header recorded for SEC, axe, `lang` and `data-lang`, no horizontal overflow at 360 px after `document.fonts.ready`, Bengali headings `text-transform: none`, the never-animated elements, and the structural no-rating check (no stars, no rating or highest sort option, no score widget).
  - Done: `checkPage(page, locale, {response, disclaimer, emergency, rules, axe, label})`. The CSP header comes from the navigation response (or one more request) and is appended to `test-results/logs/csp.jsonl` for Step 37. The no-rating check covers BR2.5 (a) to (e) by structure; the card and header scopes and the user-content exclusions are ASSUMPTION(U50) test ids on main (ISS-752). Overflow is checked when the viewport is 360 px wide or less.
- [x] **Step 26** — Implement `helpers/mailpit.ts` (`latestLink` by recipient, subject and `after`, single app link, never deletes, BR6.1, BR6.2), `helpers/accounts.ts` (`registerConfirmed`, `signIn`) and `helpers/content.ts` (`publishQuickReview` returning the public id) (BR1.5).
  - Done: `latestLink` polls Mailpit's search every 500 ms up to 30 s through `expect.poll` and fails naming the count of links found; `hasNoMessageSince` serves BR3.4. `registerConfirmed` registers through the form, opens the emailed `/verify-email?token=` link and presses Confirm, which signs the account in (U9 WF3). `publishQuickReview` walks the four composer steps (doctor by visible name, first relationship, first period, quick mode, title and story with the text sentinel, Not sure, identity, every attestation) and returns `{publicId, path, title, sentinel}`; its selectors are first exercised at Step 34.
- [x] **Step 27** — Write and run `apps/web/src/e2e-config.test.ts` (`// @vitest-environment node`, BR1.9): the five projects and their `testMatch`, the viewports and engine, `testMatch` never loads `*.test.ts`, every journey file uses `forEachLocale`, no `waitForTimeout` or fixed sleep under `apps/web/e2e/`, no file under `.github/workflows/` named for e2e, no `packages/test-support` import under `apps/web/e2e/`. Include one planted-bad config case so the test can fail.
  - Done: 8 tests green, with a planted config (another engine, a 390 px viewport, a `*.test.ts` pattern) and planted sources (a hand-written locale loop, `waitForTimeout`, a `setTimeout(resolve, ...)` sleep, `test.skip`, a test-support import). The config is loaded by path, because `playwright.config.ts` sits outside `src` and its boundaries. The kept `smoke/motion.spec.ts` had a `waitForTimeout(300)`; its press check now waits for the press transition to finish (first run at Step 36). `smoke/demo.spec.ts` keeps its 1.5 s screenshot cap and is exempt until Step 45 deletes it; the test fails if the exemption outlives the file. Also added (ISS-752): `apps/web/src/e2e-helpers.test.mjs`, 17 tests of the helpers' pure parts (environment, database guard and order with a fake runner, the lock, `msg` plurals and digits, the axe filter, the motion limits, the Mailpit link pick).
- [x] **Step 28** — Write and run `apps/web/src/copy-no-rating.test.ts` (`// @vitest-environment node`, BR2.10): every `en.json` and `bn.json` value naming a rating or score as a whole word must be in the allowlist of "no rating" copy; one planted match proves the test fails.
  - Done: 6 tests green. The allowlist written from main: seven en keys (`compare.notRanking`, `facility.orderNote`, `hero.body`, `how.2.b`, `how.2.t`, `index.doctorsNote`, `sort.whyBody`) and two bn keys (`facility.orderNote`, `index.doctorsNote`), each with its reason; a stale allowlist entry also fails. Planted "Highest rated doctors", "সেরা রেটিং" and "৫ তারকা" fail; "moderated", "underscores", মডারেটর and আন্ডারস্কোর never match.

**Phase F — journeys and checks (frontend behaviour: end-to-end specs; written now, run from Step 34)**

- [x] **Step 29** — `apps/web/e2e/journeys/reading.spec.ts` part 1 (BR2.1, BR3.5): P1.0 language detection and stored choice, P1.1 home, P1.1b emergency, P1.1c policy pages, exactly as WF2 Part 1.
  - Done: written, typechecked, linted and listed (22 tests, `bn` then `en`); not run (no browser run in this batch, Step 34). P1.0 runs once per locale: the browser language is `bn-BD` or `en-US`, then the toggle and `/` prove the stored choice. Shared helpers in the new `e2e/helpers/reading.ts` (toggle with its `#sr-live` announcement, cross-locale number snapshot, "n of m", emergency numbers, open by name or title); seeded facts appended to `seed-facts.ts`. Facility teaser rows are checked per row: the Limited data tag appears exactly when the shown visit count is below 5. Assumptions are in ISS-753.
- [x] **Step 30** — `reading.spec.ts` part 2: P1.3 doctor index, P1.4 doctor profile (with the in-test cross-locale digit comparison), P1.4b sparse doctor.
  - Done: as Step 29. P1.4b expects Not provided for the doctor's "about" text (no seeded doctor has one), d10 stays the sparse doctor (ISS-752, ISS-753).
- [x] **Step 31** — `reading.spec.ts` part 3: P1.5 facility, P1.5b topics, P1.6 experience r1 (with the original-URL probe), P1.7 author pages.
  - Done: as Step 29. r1 stores no claim, so the Reviewer's label is read on r4 after r1's other checks (ISS-753). The original-URL probe passes on a 404 until U48 merges the route.
- [x] **Step 32** — `apps/web/e2e/journeys/contributor.spec.ts` (BR2.2, BR3.4, BR6.3): the serial group `P2.8 register, confirm, sign in, reset` (P2.8, P2.8b, P2.10b), plus P2.8c invalid form, P2.9 same email, P2.10 security page.
  - Done: written, typechecked, linted and listed; not run (no browser run in this batch, Step 34). Helpers extended: `fillRegistration`, `signOut`, `secondDevice` (accounts), `waitForMessage` and `expectCleanMail` for BR6.3 (mailpit). The mail checks are subject in the account's language, sender `MAIL_FROM`, no tool identity. Assumptions are in ISS-754.
- [x] **Step 33** — `apps/web/e2e/journeys/writing.spec.ts` and `discussion.spec.ts` (BR2.3, BR2.4, BR4.5): P3.11 compose and publish, P3.11b member-added doctor, P3.12 attach and scan (120 s bounded polls per item), P3.13 correction, P3.14 signed-out view; P4.15 comment, reply, delete (with the 2001-character refusal), P4.15b gate.
  - Done: written, typechecked, linted and listed (137 tests in the four journey files); not run. Runs after Step 34 rebase: P3.12 (U48: `ev.status.*` values, `ev.reason.*`, the upload route) and P3.13 (U22: history slot, Show original, edit form); the rest runs on `main` as it is. `content.ts` gained `chooseDoctor`, `chooseIdentityAndAttest`, `escapeRegExp` and the `newDoctorName` option; the spec fails at the start with the ClamAV message unless `E2E_ALLOW_NO_SCANNER=1`, which skips only the scan outcomes. Assumptions are in ISS-754.
- [ ] **Step 34** — Rebase on `main` once all nine dependencies have merged (BR15.5); rerun `pnpm check` and `pnpm smoke`. Then run the journeys project by project with the unit-scoped commands (`--project chromium-desktop journeys/reading.spec.ts`, then contributor, writing, discussion, then `chromium-360`). Elements a sibling Unit deferred are not asserted and are noted "release 2" for the walk-through (BR2.7).
- [ ] **Step 35** — `apps/web/e2e/a11y/keyboard.spec.ts` (BR3.3) and `live-region.spec.ts` (BR3.7); run both on `chromium-desktop` and `chromium-360`.
- [ ] **Step 36** — `apps/web/e2e/a11y/zoom-and-spacing.spec.ts` (BR3.8) and `motion-switch.spec.ts` (BR4.1–BR4.3, BR4.6, ISS-323 mid-session switch). Run them, plus Part 1 and P3.11 under `chromium-reduced-motion`, and the kept `e2e/smoke/motion.spec.ts` under `chromium-desktop`.
- [ ] **Step 37** — `apps/web/e2e/security/security.spec.ts` (Host refused, Origin refused on a server action and on `/api/evidence/upload`, upload cap before the full body, CSP on every page `checkPage` saw), `security/health.spec.ts` (BR2.9) and `security/log-scan.spec.ts` (no sentinel or run email in `web.log` or `worker.log`, every line JSON) (BR2.8). Run them.
- [ ] **Step 38** — Smoke: `apps/web/e2e/smoke/release1.smoke.spec.ts`, one assertion per part in `en` and `bn` without the scanner: `/bn` and `/en` render with the demo marker; a seeded account signs in; a quick review publishes and reads back; a comment posts. Run `pnpm e2e:smoke`, then `timeout 600 pnpm smoke` (Vitest; it grows by the Step 18 file).
- [ ] **Step 39** — `apps/web/e2e/perf/lighthouse-flow.ts` (BR5.2, BR5.3): Playwright's Chromium launched through Lighthouse's own bundled `puppeteer-core` (never the root copy); `startFlow`; navigation step with the default mobile config and simulated throttling; timespan with DevTools throttling and at least one interaction; read LCP, CLS, INP, the LCP element and `benchmarkIndex`.
- [ ] **Step 40** — `apps/web/e2e/perf/nfr13.spec.ts` (BR5.1, BR5.4–BR5.6): r1's public id from `/en/experiences`; the four pages × five runs; medians into `apps/web/test-results/nfr13/<page>.json`; the LCP element checked never animated; a failing median fails the test (no automatic rerun); the record-only pages measured once. Run `timeout 1800 pnpm e2e:perf`; a failing page is rerun once by hand on an idle machine; still failing is an S1 row.
- [ ] **Step 41** — Fixes found by the suite (BR15.1): each fix of one hour or less inside `apps/web/src/components/**` or `apps/web/src/styles/*.css`, marked `fix: U50` (a missing `data-testid` hook is such a fix); larger ones become ISS rows for the owning Unit. i18n: U50 adds no user-facing string unless a fix needs one, and then both `packages/i18n/messages/en.json` and `bn.json` in the same commit, `packages/i18n/src/keys.ts` regenerated with its script, and `timeout 300 pnpm i18n:check` green (BR15.4).
- [ ] **Step 42** — Two consecutive full runs: `timeout 3600 pnpm e2e`, twice, each with 0 failed, 0 flaky, 0 skipped (BR1.6); record the counts from the JSON report. A flaky pass is an S3 row and a third clean pair.

**Phase G — demo-slice leftovers (WF10, cut)**

- [ ] **Step 43** — Inventory (BR14.1): for every export of `packages/database/src/demo/*.ts`, every `export *` line of `demo/index.ts` and every `bindDb` binding of `apps/web/src/server/data.ts`, grep the callers on the rebased branch (`git grep -n "<name>" -- apps packages ':!packages/database/src/demo'`) and write the table into a new `docs/validation/U50.md` § "Demo-slice inventory".
- [ ] **Step 44** — Delete only the zero-caller items with their own `*.int.test.ts` rows (the orphan `topics.int.test.ts` first, if its grep stays empty), one commit each, `timeout 1200 pnpm check` after each (BR14.2). An item used by `demo-slice.smoke.test.ts`, an adversarial test or any file outside `demo/` stays, under R13. Edit `demo/index.ts` and `data.ts` only to drop a line whose whole module has gone.
- [ ] **Step 45** — Map each assertion of `apps/web/e2e/smoke/demo.spec.ts` to a journey or smoke test (table in `U50.md`), then delete the file (BR14.7); `motion.spec.ts` stays.

**Phase H — documents written in Code Generation**

- [ ] **Step 46** — Correct `docs/implementation/05-demo-storyboard.md` to the seed for r6's author (BR10.6, ISS-261).
- [ ] **Step 47** — Create `docs/validation/U50-walkthrough.md` (BR10.2–BR10.5, BR10.7): one row per storyboard step 1–28 and locale with expected, observed, evidence and verdict columns, the journey test each row cites, the § 13 "release 2 (FD-105, <Unit>)" marks, and empty sections for the manual checks, the clean-clone rehearsal, the rollback drill and the Bengali body font. Observed values are filled at Build and Test (WF8).
- [ ] **Step 48** — Create `docs/validation/U50-owner-review.md` (BR12.1, BR12.2): OR1–OR7 of design § 7 with URLs or files, languages, themes, widths, minutes, an unticked box each, the FD-042 `bn` key list for OR4, and the line "a finding becomes an ISS row with Found in `U50 owner review`". The agent never ticks a box.
- [ ] **Step 49** — Create the skeletons of `docs/validation/RELEASE-1-GATES.md` (header, part A tables per Unit in the order of § 6 with every acceptance row and `FD-0nn:` row, parts B and C, BR11.1, BR11.3) and `docs/validation/RELEASE-1-REVIEW-CHECKLIST.md` (every release-1 URL in `en` and `bn` plus the four negative probes, BR11.5). Observed values are re-executed on the final `main` at Build and Test, never copied (BR11.2).
- [ ] **Step 50** — `README.md`: add one "Run the demo" section pointing at `DEMO.md` and the documentation entry points; nothing else changes (R16).

**Phase I — gate and records**

- [ ] **Step 51** — Gate on the Bolt branch: `timeout 1200 pnpm check` (includes `format:check`, `check:identity`, `test:coverage`, `i18n:check`, contrast and `check:motion`, BR4.4), `timeout 600 pnpm smoke`, `timeout 600 pnpm test:int`, `npx impeccable detect apps/web/src --no-advisory`, `timeout 300 pnpm contrast`, and the two clean `pnpm e2e` runs of Step 42 on the same commit. `apps/web` stays at or above 80% lines (never lowered, D10). Grep the Unit's files for tool or model identity (BR15.3) and confirm `git diff --stat main -- .github` is empty (BR15.2). Record the counts and the acceptance mapping of design § 14 as expected against observed.
- [ ] **Step 52** — Records:
  - `docs/implementation/ISSUES.md`: rows R1–R18 of design § 11 plus every defect, workaround, flaky test, kept leftover or `ASSUMPTION(U50)` found in Steps 1–51, each with a severity and `Found in U50 u50-release-check`; close ISS-261, ISS-309, ISS-310, ISS-323 and ISS-443 with `Status` naming U50 when the build fixes them. Take the next free `ISS-` numbers at merge time.
  - `construction/u50-release-check/code-generation/code-summary.md` (files, counts, coverage before and after, the ISS ids found and fixed in U50 for the Build and Test record), `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`).
  - The close-out of WF9 (gate matrix filled, verdict, `U50.md` summary, `current-status.md`, `validation-log.md`, `risk-register.md`, the coverage matrix statuses, `docs/implementation/README.md` §5, `00-master-plan.md` §5, `OWNER-REVIEW-QUEUE.md`) runs at Build and Test on the final `main`, not here.

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–5 | BR15.5, BR15.6 | — (baseline) |
| 6 | BR13.4, BR15.3 | US2.3, US1.1 |
| 7 | BR14.2 (schema untouched) | — |
| 8–9 | BR8.10, BR1.7 | US2.1 |
| 10–13 | BR8.1–BR8.6, BR8.12 | US2.1 (AC2.1.1, AC2.1.4), US1.1 (AC1.1.2) |
| 14 | BR8.8, BR8.11 | US2.1 (AC2.1.1, AC2.1.2, AC2.1.4) |
| 15 | BR1.8, BR8.7, BR8.9 | US2.1 |
| 16 | BR10.1 | US2.1 |
| 17–18 | BR9.1–BR9.3 | US12.3 (AC12.3.1, AC12.3.2) |
| 19–26 | BR1.1–BR1.5, BR1.7, BR2.5, BR2.6, BR3.1, BR3.2, BR3.5, BR3.6, BR4.1, BR4.3, BR6.1, BR6.2, BR7.1–BR7.4 | US2.3 (AC2.3.1), US2.1 (AC2.1.3), US12.1 (AC12.1.1, AC12.1.2) |
| 27 | BR1.9, BR15.2 | US2.3 |
| 28 | BR2.10 | US2.1 (AC2.1.3) |
| 29–31, 34 | BR2.1, BR2.5–BR2.7, BR3.5 | US12.1 (AC12.1.1, AC12.1.2, AC12.1.5, AC12.1.6), US2.1 (AC2.1.3), US2.3 (AC2.3.1) |
| 32 | BR2.2, BR3.4, BR6.1–BR6.3 | US12.1, US2.3 (AC2.3.4) |
| 33 | BR2.3, BR2.4, BR4.5, BR7.1, BR7.3 | US12.1 (AC12.1.3), US2.4 (AC2.4.5) |
| 35–36 | BR3.3, BR3.7, BR3.8, BR4.1–BR4.3, BR4.6 | US2.3 (AC2.3.2, AC2.3.3), US2.4 (AC2.4.2–AC2.4.4) |
| 37 | BR2.8, BR2.9 | US1.1 (AC1.1.5), US12.3 (AC12.3.1, AC12.3.3) |
| 38 | BR1.8 | US2.1, US12.1 |
| 39–40 | BR5.1–BR5.6 | NFR13, US2.4 (AC2.4.6), US2.3 (AC2.3.6), US12.3 (AC12.3.5) |
| 41 | BR15.1, BR15.4 | US12.1 (AC12.1.4) |
| 42 | BR1.6 | US2.3 (AC2.3.1) |
| 43–45 | BR14.1, BR14.2, BR14.7 | US2.4 (AC2.4.2, motion.spec kept) |
| 46–50 | BR10.1–BR10.7, BR11.1, BR11.3, BR11.5, BR12.1, BR12.2 | US2.1 (AC2.1.2), US12.3 (AC12.3.4), US2.2 (AC2.2.2, AC2.2.3) |
| 51–52 | BR4.4, BR11.2, BR13.5, BR15.2, BR15.3 | US1.1 (AC1.1.1, AC1.1.3, AC1.1.4), US2.4 (AC2.4.1), US12.1 (AC12.1.4) |

Not covered by U50 Code Generation: AC2.2.1 (retired by FD-091), AC2.3.5 (Firefox, WebKit and the real Safari smoke deferred to release 2, R2, R3). BR11.4 (verdict) and BR13.1–BR13.2 (close-out documents) are filled at Build and Test (WF9).

## Owned paths

- `apps/web/playwright.config.ts`
- `apps/web/e2e/` (helpers, fixtures, journeys, a11y, security, perf, smoke; `smoke/motion.spec.ts` kept, `smoke/demo.spec.ts` deleted in Step 45)
- `scripts/wait-for.mjs`, `scripts/demo.mjs`, `scripts/demo-reset.mjs` and `scripts/__tests__/` (`demo-clock.mjs` is not created, Q9)
- `DEMO.md`, `README.md` (the demo section only)
- `docs/validation/` (`U50.md`, `U50-walkthrough.md`, `U50-owner-review.md`, `RELEASE-1-GATES.md`, `RELEASE-1-REVIEW-CHECKLIST.md`)
- the `e2e*` and `demo*` scripts of the root `package.json` (no `screenshots` script in release 1)
- `infra/compose/docker-compose.yml` (owned, not changed, BR8.9)
- the close-out entries in `docs/status/` and `docs/planning/09-coverage-matrix.md` (Build and Test)
- zero-caller items in `packages/database/src/demo/`

Never touched: `.github/workflows` (FD-102); feature code of another Unit beyond a marked `fix: U50`; `packages/database/src/schema/demo.ts`; `tools/`, `PRODUCT.md`, `DESIGN.md`, `docs/scope-of-work.md`.

## Shared files (append-only)

| File | U50 use |
|---|---|
| `apps/web/package.json` | add `@axe-core/playwright` and `lighthouse` (exact pins); remove `smoke:e2e` (Steps 4, 15) |
| `pnpm-lock.yaml` | from the install only |
| `.gitignore` | append `.data/`, `apps/web/test-results/`, `apps/web/playwright-report/` |
| `apps/web/src/server/health.ts`, `health.test.ts`, `env.ts`, `env.test.ts` | the three probes and their variables (Steps 17–18) |
| `apps/web/src/e2e-config.test.ts`, `copy-no-rating.test.ts`, `server/health.smoke.test.ts` | new test files |
| `apps/web/src/server/data.ts`, `packages/database/src/demo/index.ts` | remove a line only when its whole module has zero callers (Step 44) |
| `packages/i18n/messages/en.json`, `bn.json`, `packages/i18n/src/keys.ts` | only for a fix, both files in one commit; `keys.ts` regenerated, never merged by hand |
| `apps/web/src/components/**`, `apps/web/src/styles/*.css` | fixes of one hour or less, marked `fix: U50` |
| `docs/implementation/05-demo-storyboard.md` | the ISS-261 correction |
| `docs/implementation/tasks/T-503-*.md`, `T-504-*.md`, `T-505-*.md` | the release-1 amendment |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of rows U50 closes |
| `docs/status/decision-log.md` | append the three § 12 FD rows (Step 3) |
| `docs/status/dependency-check-log.md` | append one entry (Step 2) |

Merge rules: on rebase keep both sides of every append-only file and regenerate `keys.ts`. U50 adds no migration; one would take the next free number at merge time. Shared demo code is deleted only when a grep on the rebased branch shows no caller left; as the last Unit, U50 removes those zero-caller items itself (Steps 43–44), and every item with a caller stays for release 2 under R13.

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

Applicable layers: data model and repository have no change (Step 7; the only database-package change is the zero-caller deletions, Steps 43–44, checked by `pnpm check`). Business logic is the demo tooling in `scripts/` (Steps 8–14, implemented then tested). API and endpoint is the `/api/health` probes (Steps 17–18). Frontend behaviour is the suite harness and its own Vitest tests (Steps 19–28) and the end-to-end specs, which are themselves the tests of the merged product (Steps 29–42). Environment and build configuration: the root scripts, `.gitignore` and devDependencies (Steps 4, 15). Documentation and traceability: Steps 6, 16, 46–50, 52.

## Design decisions taken

Q1–Q26 and review 01 R-01 to R-13 were decided in the Functional Design under the owner's delegation of 2026-11-04, including the 7-November cuts (§ 16). U50 is not in the high-risk class, so no adversarial test pass or written sign-off is planned; the owner's own reviews (OR1–OR7) are listed for the owner and never ticked by the agent (BR12.2).
