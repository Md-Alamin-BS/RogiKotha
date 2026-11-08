# Code summary - U50 `u50-release-check` (release 1)

Branch `bolt/u50-release-check`, built 2026-11-07 and 2026-11-08. `main` was merged in at Step 34 (`d73e53a`, all nine dependency Units) and again at Step 42 (`f904e9a`, `main` at `c6153fa` with the ISS-778 fix). Plan: `code-generation-plan.md`. Design: `../functional-design/`. Gate and acceptance mapping: `docs/validation/U50.md` section "Code Generation gate (Step 51)".

## What was built

- **Browser suite** `apps/web/e2e/` and `apps/web/playwright.config.ts`: Chromium only; projects `chromium-360`, `chromium-desktop`, `chromium-reduced-motion`, `log-scan` and `nfr13`. Helpers (`env`, `database`, `global-setup`, `global-teardown`, `web-server.mjs`, `accounts`, `mailpit`, `page-check`, `axe`, `keyboard`, `motion`, `spacing`, `digits`, `messages`, `locale`, `content`, `reading`), fixtures (`seed-facts`, `synthetic`). Journeys: `reading` (Part 1), `contributor` (Part 2), `writing` (Part 3) and `discussion` (Part 4), each in `bn` and `en`. Accessibility: `keyboard`, `live-region`, `motion-switch`, `zoom-and-spacing`. Security: `security`, `health`, `log-scan`. Smoke: `release1.smoke`, plus the kept `motion` and U41's `security-headers`. Performance: `lighthouse-flow.ts` and `nfr13.spec.ts` (run through `pnpm e2e:perf`, which is not part of `pnpm e2e`).
- **Demo tooling** `scripts/{wait-for,demo,demo-reset}.mjs` with tests in `scripts/__tests__/`, the root `demo`, `demo:serve`, `demo:down`, `demo:logs`, `demo:reset`, `e2e`, `e2e:fast`, `e2e:smoke`, `e2e:perf` scripts, `DEMO.md`, the README "Run the demo" section.
- **Health** `apps/web/src/server/health.ts` and `app/api/health/route.ts`: real database, queue, mail and scanner probes; `ok` needs the first three (FD-122, ISS-790). Tests `health.test.ts` and `health.smoke.test.ts`; `env.ts` reads the probe targets.
- **Suite tests** `apps/web/src/e2e-config.test.ts`, `e2e-helpers.test.mjs` and `copy-no-rating.test.ts`.
- **Documents** `docs/validation/{U50,U50-walkthrough,U50-owner-review,RELEASE-1-GATES,RELEASE-1-REVIEW-CHECKLIST}.md`, release-1 amendments in T-503, T-504 and T-505, the storyboard correction (ISS-261), FD-120 to FD-122 in the decision log, the dependency-check entry for Playwright, axe and Lighthouse.
- **Removed** `NotBuiltYet` (`demo/not-built.ts`, ISS-376), `isUsernameTaken` and `removeAuthUserWithoutProfile` with their integration-test rows, and `smoke/demo.spec.ts` (BR14.7). Everything else in `demo/` stays for release 2 (ISS-780, ISS-798).

## Product fixes made because the first browser run failed (`fix: U50`)

`#lang` and the register radios no longer carry `aria-pressed` (ISS-760); the masthead account button's visible text matches its label (ISS-769); error-summary links are at least 24 px (ISS-770); comment deletion announces on the server's answer (ISS-772); long unbroken words in member text wrap at 360 px (ISS-765, ISS-773, ISS-782, ISS-785); the account sheet closes while signed out (ISS-774); the language switch holds both page frames still from the click (ISS-784). ISS-778 (password change signs the page out) was fixed on `main` by its owner Unit and arrived through the merge.

## Suite counts

| Run | Result |
|---|---|
| First browser run (Step 34) | 96 journey tests: 12 passed, 76 failed, 8 skipped; 8 causes, ISS-760 to ISS-767 |
| Step 41 reruns | 92 of 96 passed; the 4 failures were P2.10 on ISS-778 |
| Step 42, `pnpm e2e` run 1, then run 2, both at `751433b` | 231 expected, 0 unexpected, 0 flaky, 0 skipped each (64 `bn` and 64 `en` journey tests; about 6.0 min each, no retry used) |
| `pnpm test:int` (Step 51) | 65 files, 437 passed, 2 expected failures |
| `pnpm smoke` (Step 51 and Step 52) | 31 files, 60 tests (Step 1 baseline 25 files, 47 tests) |

`pnpm e2e:perf` (NFR13) has not run yet: it is part of Build and Test on the final `main` (ISS-756, ISS-794).

## Gate (Step 51 on `40adadd`, repeated at Step 52 on the final tree)

| Command | Result |
|---|---|
| `pnpm check` | exit 0: 366 files, 4489 passed, 2 expected failures, 1 skipped; boundaries fixture 18 expected violations; `i18n:check` 993 keys; both contrast runs and `check:motion` green; web build green; 1 lint warning, from `main` (`packages/i18n/src/routing.ts`) |
| `pnpm format:check` | clean |
| `npx impeccable detect apps/web/src --no-advisory` | no findings in 410 files |
| `pnpm contrast` | 150 pairs pass, 0 fail |
| `git diff --stat main -- .github` | empty (BR15.2) |
| Identity grep of U50's added lines (BR15.3) | no hit |

## Coverage, lines per package (v8)

| Package | After (Step 52 run) |
|---|---|
| apps/web | 96.22% (3076/3197) |
| apps/worker | 100% |
| packages/adapters | 94.59% |
| packages/application | 92.45% |
| packages/contracts | 100% |
| packages/database | 98.29% |
| packages/domain | 99.21% |
| packages/i18n | 100% |
| packages/test-support | 95.84% |
| total | 96.03% (9505/9897) |

Before (Step 1 baseline, `d3e2d66`, with only U9, U11, U20, U46, U47 and U49 merged): total 95.34% (8028/8420), `apps/web` 95.22% (2690/2825). The Step 1 record keeps no other per-package figure. Every package is above the 80% floor and none was lowered (D10).

## Files outside U50's owned paths

Each edit is minimal, marked `fix: U50` where it changes behaviour, and has its ISS row:

- `apps/web/src/components/patient/auth/{AccountControl,PendingPanel,RegisterForm}.tsx` and `AccountControl.test.tsx` (ISS-760, ISS-769, ISS-774, ISS-785); `components/patient/comments/DeleteCommentButton.tsx` (ISS-772); `components/patient/motion/RouteTransition.tsx` and its test, `components/shared/ThemeControls.tsx` and its test (ISS-760, ISS-784); `styles/patient.css` (ISS-765, ISS-770, ISS-773, ISS-782, ISS-785).
- `apps/web/src/app/root.test.tsx` (the health route test, ISS-758), `apps/web/vitest.config.ts`, `apps/web/package.json` and `pnpm-lock.yaml` (Playwright, axe and Lighthouse pins), root `package.json` scripts, `.gitignore`.
- `packages/database/src/demo/{accounts,accounts-create,index}.ts` and `accounts-create.int.test.ts` (zero-caller deletions, ISS-780).
- `docs/implementation/{ISSUES.md,05-demo-storyboard.md,tasks/T-503,T-504,T-505}`, `docs/status/{decision-log,dependency-check-log}.md`.

No path in the diff contains `[`, `]` or `*`, so `source-manifest.json` lists every file added or changed outside `aidlc/`, `.claude/` and `.agents/` (85 paths). Deleted files are not listed.

## ISS ids for the Build and Test record

- **Found in U50:** ISS-750 to ISS-785 (steps) and ISS-786 to ISS-803 (design section 11 rows R1 to R18).
- **Fixed in U50:** ISS-750, ISS-758, ISS-759 (suite and demo script), ISS-760 to ISS-774, ISS-777, ISS-779, ISS-782, ISS-784, ISS-785, ISS-790, ISS-791, ISS-793. Older rows closed by U50: ISS-261, ISS-309, ISS-310, ISS-323, ISS-376 and ISS-443. ISS-778 was fixed on `main` by U9's owner.
- **Open (S4, accepted or for Build and Test):** ISS-751, ISS-756, ISS-757 (confirm while filling the walk-through), ISS-775, ISS-776, ISS-780, ISS-781, ISS-783 (owner review OR2), ISS-789, ISS-795, ISS-796, ISS-797, ISS-803; ISS-752 to ISS-755 are confirmed by the clean runs.
- **Deferred to release 2:** ISS-786, ISS-787, ISS-788, ISS-792, ISS-794 (accepted), ISS-798 to ISS-802.

## Left for Build and Test (WF9)

The final-`main` rerun of the gate commands and a second `pnpm check`, `pnpm e2e:perf`, the hand walk and manual checks M1 to M6, the clean-clone rehearsal, the rollback drill, the Bengali body-font check, every verdict cell and the owner's OR1 to OR7 boxes (the agent ticks none), and the close-out documents (`U50.md` summary, `current-status.md`, `validation-log.md`, `risk-register.md`, coverage matrix, `README.md` section 5, `00-master-plan.md` section 5, `OWNER-REVIEW-QUEUE.md`). ISS numbers above are provisional until the merge: take the next free numbers if `main` has used any of ISS-786 to ISS-803.

## Review fixes (review-01)

Branch `bolt/u50-review-fixes`, cut from `main` at `6a1a4ce`. The owner delegated the choices to the agent (2026-11-04).

| Finding | Fix | ISS |
|---|---|---|
| R-01 (Major) `demo:reset` empties any folder `STORAGE_ROOT` names | `scripts/demo-reset.mjs`: `realPathOf` resolves links and junctions (a missing tail is appended to its nearest existing parent; a broken link is `null`) and `folderRefusal` refuses a folder outside the repository, the repository root, a folder in `.git` or a broken link. Both folders (storage and `var/evidence`) are checked before the question and before any step, so `--yes` cannot pass the refusal; exit 1 with a message naming the folder (and the real path when a link leads elsewhere). The question and the step line name both folders | ISS-804 |
| R-02 (Minor) traceability marks unrun checks OK | `traceability.json`: NFR13, AC12.3.2 (stopped scanner and mail) and AC12.3.4 (rollback drill) read Deferred to Build and Test, waiting for their first run; AC2.3.6, AC2.4.6 and AC12.3.5, which rest on the same unrun `nfr13.spec.ts`, too | ISS-805 |
| R-03 (Minor) `topics.int.test.ts` claimed as a U50 removal | Removed from "What was built"; U46 deleted it (`153a65c`) | ISS-806 |
| R-04 (Minor) `DEMO.md` restart row points to `demo:serve` | The row points to `pnpm demo --no-build` (already parsed and tested in `demo.mjs`); a second row says `pnpm demo:serve` works only while the containers still run; a troubleshooting line explains the reset refusal | ISS-807 |
| R-05 (Minor) `demo:down` and `demo:logs` ignore `RK_COMPOSE_PROJECT` | Root `package.json` runs `node scripts/demo.mjs down` and `logs`; `composeTaskArgs` builds them on the same `composeArgs(project)` as `pnpm demo` (the shell winning over `.env`), `down` never takes `-v`, an unknown task throws; `readEnvFile` reads `.env` without creating it. The functional-design logic line in `rules.md` ("demo:down = docker compose ... down") keeps its effect; only the call path changed | ISS-808 |

Tests added: 9 in `scripts/__tests__/demo-reset.test.mjs` (absolute path outside, `../` path outside, shell `STORAGE_ROOT` outside over a valid `.env`, the repository root, `.git`, a junction leading outside, a broken link, `.data/storage` emptied and named in the question, a not-yet-existing folder inside) and 6 in `scripts/__tests__/demo.test.mjs` (task parsing, default and named compose project, no `-v`, unknown task, the `package.json` routing, `readEnvFile`). The refusal tests use the real `emptyDir` on real folders and check that the file outside survives. Tooling project: 3 files, 61 tests (46 before).

Gate on the final tree of the fix branch:

| Command | Result |
|---|---|
| `pnpm format:check` | clean |
| `pnpm check` | exit 0: 366 files, 4504 passed, 2 expected failures, 1 skipped; boundaries fixture 18 expected violations; `i18n:check` 993 keys; contrast and `check:motion` green; web build green; total line coverage 96.1% (9512/9897); 1 lint warning, from `main` (`packages/i18n/src/routing.ts`) |
| `pnpm smoke` | 31 files, 60 tests |

A fresh worktree needed `pnpm exec next typegen` in `apps/web` and `NODE_OPTIONS=--max-old-space-size=6144` before `eslint .` was clean (ISS-721, not a code defect). No browser run, no demo command and no compose command was used: a live demo was running from the main checkout.
