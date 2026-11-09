# Test results — RogiKotha release 1 (Build and Test)

Run on 2026-11-08 in the worktree `bolt/build-and-test`, cut from `main` at `e09b558` (all ten
release-1 Units merged and reviewed). Node 24.19.0, pnpm 11.20.0, Windows 11. Shared compose
services `rogikotha-postgres-1` (5433), `rogikotha-mailpit-1`, `rogikotha-clamav-1`, all healthy and
never stopped or recreated; the live demo on port 3000 and its database `rogikotha` were not
touched. Databases used: `rogikotha_test_w9` (Vitest), `rogikotha_e2e_test` (Playwright, port
3107), `rogikotha_bt` (created for the stopped-service probes and the rollback drill, port 3207).
Every command had an outer `timeout`; database-touching commands ran one at a time. Raw logs were
kept outside the repository.

## Result

**Update 2026-11-09: SUCCESS.** The five manual targets were walked on `main` (office computer,
Windows 11 Enterprise), the last fixes landed (FD-123, ISS-818), and `pnpm check` and `pnpm smoke` were
re-run green on `29a2567`. See "Manual checks, 2026-11-09" at the end. The 2026-11-08 result below is
kept as it was recorded.


**FAILED** under the stage's failure predicate only because five manual targets are Unverified,
after the rung-1 fixes below, with no product defect found:

- every build, gate, integration, smoke, browser, security and performance command passes, and
  every unit-scoped command passes as the corrected instructions now state it (ISS-809, ISS-810
  fixed);
- `pnpm e2e:perf` is **green**: 9 of 9, 0 no-LCP retries. The LCP-element probe works (ISS-812
  fixed) and the lost-navigation runs are fixed at their cause (ISS-815 fixed); on all four gated
  pages the LCP element is never animated in and every median is within its threshold;
- four U50 manual checks and the clean-clone rehearsal, which need the demo's own port and
  containers, stay Unverified (ISS-813);
- the cross-unit gate passes after the ISS-811 records decision (eight keys named as deferred to
  release 2 under FD-105).

## Rung-1 fixes

After the first run, the orchestrator decided, under the owner's delegation of 2026-11-04, that
four items were inside this stage's rung-1 remit: the NFR13 probe is "an executable target check",
which the stage's failure ladder names as in remit (ISS-812); U46's coverage command and the stale
paths are test configuration in the Units' instructions (ISS-810, ISS-809); and ISS-811 is a
records decision, not a product change. Each was limited to two attempts, with no product code
changed and no target loosened.

| ISS | Change | Attempts | Outcome |
|---|---|---|---|
| ISS-812 | `apps/web/e2e/perf/lighthouse-flow.ts`: read the LCP node from `lcp-breakdown-insight` (old audit id kept as a fallback), and accept a node item listed directly (Lighthouse 13 insights put `{type: 'node', selector}` in the list, not under a `node` key). The check's meaning is unchanged: the element must exist at the first frame, have no animation, sit under no `[data-reveal]` and be fully opaque. There is no unit test of this file to adjust | 2 (the first read the new audit but missed the item shape, still "names no element") | fixed: the selector is found in every completed run |
| ISS-810 | U46's `unit-test-instructions.md`: the coverage line is now the package-level command the floor is defined on (no path filters) | 1 | `pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**'`: exit 0, 51 files, 552 passed, lines 88.70% (1704/1921) |
| ISS-809 | CR-009, T-102 and T-502 `unit-test-instructions.md`: the stale paths replaced by the real ones (the corrected commands below, all green) | 1 | fixed |
| ISS-811 | `cross-unit-traceability.md`: FR22, FR43, FR53, FR54, FR55, FR56, FR57 and FR65 named "deferred to release 2 under FD-105 (every citing AC deferred)", with their citing ACs; no `OK` row added to any Unit's `traceability.json` | 1 | Step 10 gate passes |
| ISS-815 | A second orchestrator decision gave this new failure of the same executable target check its own budget of two attempts, test code only. Attempt 1 (diagnosis): `lighthouse-flow.ts` keeps every run that has no LCP as `apps/web/test-results/nfr13/no-lcp/<time>.json` (the LCP audit with its error, the run warnings and the trace's paint and navigation events). Attempt 2 (cause, then a bounded retry): each run opens the origin (`/api/health`) in its fresh tab before the flow starts; a run that still has no LCP throws `NoLcpError`, and `nfr13.spec.ts` redoes it at most 2 times per page, records every retry in the page JSON (`noLcpRetries`) and in a test annotation, never counts it, and fails the page when the retries run out | 2 | fixed: `pnpm e2e:perf` 9 of 9, 0 retries |

Before these fixes the first run had: No. 069 exit 1, the perf probe failing on every page, and
the traceability gate failing on 8 keys.

## Build

| Command | Exit | Result |
|---|---|---|
| `timeout 1500 pnpm build` | 0 | every package and both apps; the Next.js 16.3.4 route table lists all release-1 routes, `/api/health`, `/api/evidence/upload` and the proxy (16 s, cached) |
| `pnpm --filter @rogikotha/web build` (CR-009) | 0 | web build |
| `pnpm --filter @rogikotha/worker typecheck` (CR-009) | 0 | — |
| `pnpm --filter @rogikotha/web --filter @rogikotha/worker build` (U50, and inside `pnpm e2e` and `pnpm e2e:perf`) | 0 | — |

## Project gates

| Command | Exit | Result |
|---|---|---|
| `timeout 1500 pnpm check` | 0 | 242 s. typecheck (all packages, `apps/web/e2e` included); lint 0 errors, 1 warning (unused `eslint-disable` in `packages/i18n/src/routing.ts`, known as ISS-105); boundaries fixture 18 expected violations; `format:check` clean; `check:identity` no attribution markers; `test:coverage` **366 files, 4504 passed, 2 expected failures, 1 skipped (4507)**; `i18n:check` 993 keys, both locales; `contrast` 150 PASS, 0 FAIL; `contrast:patient` 70 PASS, 0 FAIL; `check:motion` 2 stylesheets pass M1 to M11; build green |
| `timeout 1500 pnpm test:int` | 0 | **65 files, 437 passed, 2 expected failures (439)**, 137 s |
| `timeout 1500 pnpm smoke` | 0 | **31 files, 60 tests, all passed** (U50 recorded 31 and 60: the suite did not shrink) |
| `timeout 600 npx impeccable detect apps/web/src --no-advisory` | 0 | 410 files, 0 findings (regex rules; the element rules need a parsed page, as the tool says) |
| `timeout 300 pnpm contrast` | 0 | 150 PASS, 0 FAIL, both modes: "every text pair clears AA and every 1.4.11 boundary clears 3:1" |

The 2 expected failures are the `it.fails` tripwires for ISS-139 in
`packages/database/src/validator-probes.int.test.ts`; the 1 skip is the POSIX-permission case of
`packages/adapters/src/storage-fs/storage-fs.test.ts`, which skips on win32 by design.

## Coverage (D10: 80% lines per package, never lowered)

From `pnpm check` (`pnpm test:coverage`, v8, `coverage/coverage-summary.json`):

| Package | Files | Lines covered | Line coverage | Floor 80% |
|---|---|---|---|---|
| `packages/domain` | 24 | 501 / 505 | 99.21% | Met |
| `packages/contracts` | 46 | 448 / 448 | 100.00% | Met |
| `packages/application` | 157 | 1776 / 1921 | 92.45% | Met |
| `packages/database` | 63 | 1206 / 1227 | 98.29% | Met |
| `packages/adapters` | 7 | 252 / 259 | 97.30% | Met |
| `packages/i18n` | 4 | 55 / 55 | 100.00% | Met |
| `packages/test-support` | 55 | 2004 / 2091 | 95.84% | Met |
| `apps/web` | 223 | 3076 / 3197 | 96.22% | Met |
| `apps/worker` | 13 | 194 / 194 | 100.00% | Met |
| **All** | 592 | 9512 / 9897 | 96.10% | — |

Statements 94.53%, branches 87.03%, functions 94.40%. The thresholds in `vitest.workspace.ts` are the
80% per-package lines the team set; nothing was changed.

## Unit-scoped commands (Step 9.2)

All 19 `construction/*/code-generation/unit-test-instructions.md` files were read; their commands
were deduplicated (the outer `timeout` stripped for comparison) and each distinct command ran once:
116 commands. Not run separately, because the project-wide run above is the same command:
`pnpm infra:up` (the containers were already healthy and must not be recreated), `pnpm test:int`,
`pnpm smoke`, `pnpm check` and its own steps (`pnpm lint`, `lint:boundaries`, `check:identity`,
`format:check`, `test:coverage`, `i18n:check`, `contrast` and `node tools/contrast.mjs --tokens
...`), `npx impeccable detect`, `pnpm e2e` (U50 lists it twice), `pnpm e2e:perf`, and U50's
per-spec Playwright commands and `pnpm e2e:smoke`, which run the same specs in the same projects as
the full `pnpm e2e` (that run had 0 retries used, so its first attempts are the `--retries=0`
results). `pnpm e2e:perf --grep "<page>"` is the manual rerun of a failing page; its runs are in
"Performance".

Totals over the 116: 115 exit 0, 1 exit 1 (No. 069); 736 test files and 11 047 tests passed, 0
failed, 8 expected failures (the ISS-139 tripwires, counted once per command that includes them);
the 49 skipped are the `-t bn` filter of No. 037 (47) and the win32 skip (2). Six commands matched
no file: Nos. 099 and 101 are pre-change baselines whose files a later Unit removed (expected), and
Nos. 004, 023, 059 and 062 name stale paths; No. 056 has two stale paths of three, and No. 067 one
path U48 retired (ISS-809). Every project-wide run above already includes the stale-path files and
passed; the corrected commands:

| Instead of | Corrected command | Exit | Result |
|---|---|---|---|
| No. 004 (CR-009) | `pnpm --filter @rogikotha/database exec vitest run src/grants.smoke.test.ts` | 0 | 1 file, 2 passed |
| No. 023 (T-102) | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/actions/auth-screens.adversarial.int.test.ts` | 0 | 1 file, 4 passed |
| No. 056 (T-502) | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/security-settings.test.ts apps/web/src/proxy.test.ts apps/web/src/security-cookies.test.ts` | 0 | 3 files, 48 passed |
| No. 059 (T-502) | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/log-scrub.int.test.ts` | 0 | 1 file, 5 passed |
| No. 062 (T-502) | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/security.adversarial.int.test.ts` | 0 | 1 file, 6 passed |
| No. 069 (U46), first rung-1 try (before the orchestrator's decision) | the same with `--coverage.include` for `modules/{directory,taxonomy,review}/**` | 1 | 177 passed; 76.29% lines of those modules, below the package glob threshold |
| No. 069 (U46), as the instructions now state it (ISS-810) | `pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**'` | 0 | 51 files, 552 passed; lines 88.70% (1704/1921), above the 80% package floor |

With the corrected instructions every one of the 116 unit-scoped commands exits 0.

| # | Unit | Command (outer `timeout` as listed in the instructions) | Exit | Files | Tests | Note |
|---|---|---|---|---|---|---|
| 001 | cr-004 | `pnpm --filter @rogikotha/web exec vitest run src/components/shared/ThemeControls.test.tsx src/components/patient/ViewShell.test.tsx src/components/shared/live-region-announcements.smoke.test.tsx` | 0 | 3 passed (3) | 37 passed (37) | 2s |
| 002 | cr-006 | `pnpm test:int validator-probes grants.smoke constraints` | 0 | 3 passed (3) | 33 passed, 2 expected fail (35) | 5s |
| 003 | cr-007 | `pnpm test:int reset-guard` | 0 | 2 passed (2) | 9 passed (9) | 24s |
| 004 | cr-009 | `pnpm --filter @rogikotha/database exec vitest run src/database.smoke.test.ts` | 0 | — | — | no file matched: `database.smoke.test.ts` never existed; the instruction names the fallback recorded in code-summary.md, `src/grants.smoke.test.ts`, which was run: 1 file, 2 passed (ISS-809) |
| 005 | cr-009 | `pnpm --filter @rogikotha/worker typecheck` | 0 | — | — | typecheck exit 0 |
| 006 | cr-009 | `pnpm --filter @rogikotha/web build` | 0 | — | — | next build exit 0 (route table complete) |
| 007 | cr-011 | `pnpm test:int queue outbox reset-guard env validator-probes` | 0 | 12 passed (12) | 69 passed, 2 expected fail (71) | 42s |
| 008 | cr-011 | `pnpm --filter @rogikotha/worker exec vitest run` | 0 | 16 passed (16) | 132 passed (132) | 2s |
| 009 | cr-012 | `pnpm --filter @rogikotha/test-support exec vitest run` | 0 | 14 passed (14) | 252 passed (252) | 2s |
| 010 | cr-012 | `pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts` | 0 | 1 passed (1) | 16 passed (16) | 10s |
| 011 | t-010 | `pnpm exec vitest run --config vitest.workspace.ts --project tooling` | 0 | 9 passed (9) | 182 passed (182) | 7s |
| 012 | t-010 | `pnpm --filter @rogikotha/database exec vitest run src/outbox.int.test.ts` | 0 | 1 passed (1) | 5 passed (5) | 3s |
| 013 | t-011 | `pnpm exec vitest run --config vitest.workspace.ts --project web --coverage --coverage.reportsDirectory "$TMPDIR/cov-web"` | 0 | 155 passed (155) | 2219 passed (2219) | 21s |
| 014 | t-101 | `pnpm exec vitest run --config vitest.workspace.ts --project domain --project application --project adapters --project contracts` | 0 | 99 passed (99) | 1224 passed, 1 skipped (1225) | 1 skipped: `storage-fs.test.ts` POSIX-permission case skips on win32 by design |
| 015 | t-101 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support` | 0 | 14 passed (14) | 252 passed (252) | 2s |
| 016 | t-101 | `pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**' --coverage.thresholds.lines=0` | 0 | 51 passed (51) | 552 passed (552) | 4s |
| 017 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth-form.test.ts` | 0 | 1 passed (1) | 58 passed (58) | 2s |
| 018 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth.test.ts apps/web/src/server/actions/account-access.test.ts` | 0 | 2 passed (2) | 64 passed (64) | 2s |
| 019 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/auth/ apps/web/src/components/patient/Masthead.test.tsx apps/web/src/components/patient/profile/` | 0 | 7 passed (7) | 131 passed (131) | 6s |
| 020 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/register/" "apps/web/src/app/[locale]/(patient)/sign-in/" "apps/web/src/app/[locale]/(patient)/verify-email/" "apps/web/src/app/[locale]/(patient)/reset-password/" "apps/web/src/app/[locale]/(patient)/me/security/" apps/web/src/app/pages.test.tsx` | 0 | 7 passed (7) | 313 passed (313) | 4s |
| 021 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/actions/auth-screens.int.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 5s |
| 022 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/auth/auth-screens.smoke.test.tsx` | 0 | 1 passed (1) | 4 passed (4) | 2s |
| 023 | t-102 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth-screens.adversarial.test.ts` | 0 | — | — | no file matched: the file is `auth-screens.adversarial.int.test.ts` (web-int); corrected command run: 1 file, 4 passed (ISS-809) |
| 024 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/identity.test.ts` | 0 | 1 passed (1) | 11 passed (11) | 1s |
| 025 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/identity/` | 0 | 2 passed (2) | 18 passed (18) | 1s |
| 026 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/identity/ packages/application/src/modules/account/commands/register.test.ts` | 0 | 8 passed (8) | 63 passed (63) | 2s |
| 027 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/ packages/test-support/src/builders/builders.test.ts` | 0 | 9 passed (9) | 226 passed (226) | 2s |
| 028 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/identity.int.test.ts packages/database/src/repositories/identity-private.int.test.ts packages/database/src/repositories/account.int.test.ts packages/database/src/repositories/persona-links-allowlist.test.ts packages/database/src/repositories/not-implemented.test.ts packages/database/src/schema/foreign-keys.int.test.ts packages/database/src/migrations.int.test.ts packages/database/src/validator-probes.int.test.ts` | 0 | 8 passed (8) | 97 passed, 2 expected fail (99) | 11s |
| 029 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support-seed packages/test-support/src/seed/seed.int.test.ts` | 0 | 1 passed (1) | 16 passed (16) | 8s |
| 030 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/container.test.ts apps/web/src/server/identity-boundary.test.ts` | 0 | 2 passed (2) | 19 passed (19) | 2s |
| 031 | t-104 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/identity/identity.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 2s |
| 032 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/pick-chips.test.ts apps/web/src/components/patient/home/teaser-sub.test.ts` | 0 | 2 passed (2) | 17 passed (17) | 2s |
| 033 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/Home.test.tsx` | 0 | 1 passed (1) | 24 passed (24) | 3s |
| 034 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/home-page.test.tsx" apps/web/src/app/pages.test.tsx` | 0 | 2 passed (2) | 243 passed (243) | 3s |
| 035 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/Emergency.test.tsx apps/web/src/components/patient/About.test.tsx apps/web/src/components/patient/Policy.test.tsx apps/web/src/components/patient/fd-022-lawful-placement.test.tsx apps/web/src/components/patient/fd-022-lawful-key-usage.test.ts "apps/web/src/app/[locale]/(patient)/emergency/"` | 0 | 6 passed (6) | 37 passed (37) | 3s |
| 036 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/not-found.test.tsx" "apps/web/src/app/[locale]/(patient)/[...rest]/" apps/web/src/app/root.test.tsx` | 0 | 3 passed (3) | 33 passed (33) | 2s |
| 037 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/ apps/web/src/components/patient/Emergency.test.tsx apps/web/src/components/patient/About.test.tsx apps/web/src/components/patient/Policy.test.tsx -t bn` | 0 | 5 passed, 2 skipped (7) | 26 passed, 47 skipped (73) | the 47 skipped tests are the `-t bn` name filter leaving out the `en` cases |
| 038 | t-207 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/home/home.smoke.test.tsx apps/web/src/components/patient/emergency-about-policy.smoke.test.tsx` | 0 | 2 passed (2) | 4 passed (4) | 2s |
| 039 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/review.test.ts` | 0 | 1 passed (1) | 36 passed (36) | 2s |
| 040 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/review/versioning.test.ts` | 0 | 1 passed (1) | 59 passed (59) | 1s |
| 041 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/repositories-superset.test.ts packages/test-support/src/fakes/repositories.test.ts` | 0 | 2 passed (2) | 98 passed (98) | 2s |
| 042 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/review/commands/correct.test.ts packages/application/src/modules/review/queries/get-own-for-edit.test.ts packages/application/src/modules/review/queries/get-history.test.ts` | 0 | 3 passed (3) | 32 passed (32) | 2s |
| 043 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-correction.int.test.ts` | 0 | 1 passed (1) | 11 passed (11) | 5s |
| 044 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/reviews.int.test.ts` | 0 | 1 passed (1) | 6 passed (6) | 3s |
| 045 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/review-edit.test.ts apps/web/src/server/actions/review.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts "apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts"` | 0 | 4 passed (4) | 78 passed (78) | 3s |
| 046 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-correction.int.test.ts` | 0 | 1 passed (1) | 4 passed (4) | 7s |
| 047 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/compose/EditForm.test.tsx apps/web/src/components/patient/review-history/ "apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/"` | 0 | 5 passed (5) | 58 passed (58) | 4s |
| 048 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/ "apps/web/src/app/[locale]/(patient)/experiences/[id]/page.test.tsx" apps/web/src/app/pages.test.tsx` | 0 | 6 passed (6) | 274 passed (274) | 3s |
| 049 | t-302 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-correction.int.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 4s |
| 050 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/ports/log-policy.test.ts packages/application/src/worker-subpath.test.ts` | 0 | 2 passed (2) | 43 passed (43) | 2s |
| 051 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/logger.test.ts` | 0 | 1 passed (1) | 7 passed (7) | 3s |
| 052 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project worker apps/worker/src/logger.test.ts apps/worker/src/logger.levels.test.ts apps/worker/src/env.load.test.ts apps/worker/src/main.test.ts apps/worker/src/log-scrub.test.ts` | 0 | 5 passed (5) | 58 passed (58) | 2s |
| 053 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project i18n packages/i18n/src/request.test.ts` | 0 | 1 passed (1) | 13 passed (13) | 1s |
| 054 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/i18n/ apps/web/src/server/actions/review.test.ts` | 0 | 2 passed (2) | 27 passed (27) | 3s |
| 055 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/lib/security/` | 0 | 9 passed (9) | 204 passed (204) | 2s |
| 056 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/security-settings.test.ts apps/web/src/proxy.test.ts apps/web/src/server/security-cookies.test.ts` | 0 | 1 passed (1) | 36 passed (36) | two of three paths stale (`apps/web/src/server/security-settings.test.ts`, `.../security-cookies.test.ts`; the files are in `apps/web/src/`); corrected command: 3 files, 48 passed (ISS-809) |
| 057 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/app/api/evidence/upload/` | 0 | 3 passed (3) | 71 passed (71) | 3s |
| 058 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/evidence/` | 0 | 8 passed (8) | 60 passed (60) | 4s |
| 059 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/log-scrub.int.test.ts` | 0 | — | — | no file matched: the file is `apps/web/src/log-scrub.int.test.ts`; corrected command: 1 file, 5 passed (ISS-809) |
| 060 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/proxy.smoke.test.ts` | 0 | 1 passed (1) | 5 passed (5) | 3s |
| 061 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/lib/security/__tests__/security.adversarial.test.ts apps/web/src/app/api/evidence/upload/route.adversarial.test.ts` | 0 | 2 passed (2) | 97 passed (97) | 2s |
| 062 | t-502 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/security.adversarial.int.test.ts` | 0 | — | — | no file matched: the file is `apps/web/src/security.adversarial.int.test.ts`; corrected command: 1 file, 6 passed (ISS-809) |
| 063 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/ids packages/contracts/src/view-models/doctor packages/contracts/src/view-models/facility packages/contracts/src/view-models/condition packages/contracts/src/view-models/experience-card packages/contracts/src/schemas/directory packages/contracts/src/schemas/taxonomy` | 0 | 4 passed (4) | 25 passed (25) | 1s |
| 064 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/directory packages/domain/src/taxonomy packages/domain/src/review/policies` | 0 | 3 passed (3) | 16 passed (16) | 1s |
| 065 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/directory packages/application/src/modules/taxonomy packages/application/src/modules/review` | 0 | 12 passed (12) | 177 passed (177) | 2s |
| 066 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/directory-repositories` | 0 | 1 passed (1) | 9 passed (9) | 1s |
| 067 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/directory-module packages/database/src/repositories/taxonomy-module packages/database/src/repositories/review-reads packages/database/src/repositories/public-evidence-count-interim packages/database/src/repositories/directory.smoke packages/database/src/migrations.int packages/database/src/validator-probes.int packages/database/src/demo/evidence.adversarial packages/database/src/demo/reviews.int packages/database/src/demo/doctors.int packages/database/src/demo/demo-slice.smoke` | 0 | 10 passed (10) | 78 passed, 2 expected fail (80) | `demo/evidence.adversarial` no longer exists (retired by U48, a9a2ffe); the other filters ran |
| 068 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project web 'apps/web/src/app/[locale]/(patient)/doctors/' 'apps/web/src/app/[locale]/(patient)/facilities/' 'apps/web/src/app/[locale]/(patient)/topics/' apps/web/src/app/pages.test apps/web/src/lib/doctor-filters apps/web/src/components/patient/shared apps/web/src/components/patient/doctors apps/web/src/components/patient/facilities apps/web/src/components/patient/topics apps/web/src/components/patient/directory.smoke` | 0 | 15 passed (15) | 306 passed (306) | 4s |
| 069 | u46 | `pnpm exec vitest run --config vitest.workspace.ts --project application --coverage --coverage.include='packages/application/src/**' --coverage.thresholds.lines=0 packages/application/src/modules/directory packages/application/src/modules/taxonomy packages/application/src/modules/review` | 1 | 12 passed (12) | 177 passed (177) | FAILED by construction: tests 177 of 177 green, but a subset run is held to the package glob threshold `packages/application/src/**` 80% and measures 44.56% of the package; rerun with the include scoped to the three modules: 76.29%, still exit 1. The package floor itself is met in `pnpm check` (92.45%) (ISS-810) |
| 070 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/review/` | 0 | 4 passed (4) | 115 passed (115) | 1s |
| 071 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/builders/builders.test.ts packages/test-support/src/fakes/fakes.test.ts` | 0 | 2 passed (2) | 41 passed (41) | 2s |
| 072 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/review/ packages/application/src/modules/taxonomy/` | 0 | 10 passed (10) | 154 passed (154) | 2s |
| 073 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-module.int.test.ts` | 0 | 1 passed (1) | 20 passed (20) | 3s |
| 074 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/reviews.int.test.ts packages/database/src/demo/doctors.int.test.ts` | 0 | 2 passed (2) | 12 passed (12) | 5s |
| 075 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/review-reads.int.test.ts` | 0 | 1 passed (1) | 12 passed (12) | 3s |
| 076 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/review.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts apps/web/src/server/container.test.ts` | 0 | 3 passed (3) | 62 passed (62) | 2s |
| 077 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-module.int.test.ts` | 0 | 1 passed (1) | 6 passed (6) | 7s |
| 078 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/compose/` | 0 | 8 passed (8) | 165 passed (165) | 8s |
| 079 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/ apps/web/src/components/patient/comments/ apps/web/src/components/patient/evidence/ apps/web/src/components/patient/review-history/ apps/web/src/components/patient/profile/` | 0 | 20 passed (20) | 206 passed (206) | 7s |
| 080 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/write/" "apps/web/src/app/[locale]/(patient)/experiences/" "apps/web/src/app/[locale]/(patient)/authors/" "apps/web/src/app/[locale]/(patient)/me/page.test.tsx" "apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts" apps/web/src/app/pages.test.tsx` | 0 | 8 passed (8) | 311 passed (311) | 4s |
| 081 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/review-module.int.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 4s |
| 082 | u47 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/experience/experience-page.smoke.test.tsx` | 0 | 1 passed (1) | 2 passed (2) | 2s |
| 083 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/evidence/` | 0 | 5 passed (5) | 154 passed (154) | 1s |
| 084 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/evidence.test.ts` | 0 | 1 passed (1) | 21 passed (21) | 1s |
| 085 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/port-fakes.test.ts packages/test-support/src/builders/builders.test.ts` | 0 | 2 passed (2) | 66 passed (66) | 2s |
| 086 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project adapters packages/adapters/src/storage-fs/ packages/adapters/src/scanner-clamd/` | 0 | 3 passed (3) | 58 passed, 1 skipped (59) | 1 skipped: `storage-fs.test.ts` POSIX-permission case skips on win32 by design |
| 087 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/` | 0 | 7 passed (7) | 78 passed (78) | 3s |
| 088 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/evidence.int.test.ts packages/database/src/queue/pg-boss-queue.int.test.ts packages/database/src/queue/queue-declaration.test.ts` | 0 | 3 passed (3) | 28 passed (28) | 16s |
| 089 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project worker apps/worker/src/handlers/evidence-process.test.ts apps/worker/src/handlers/evidence-sweep.test.ts apps/worker/src/handlers/outbox-relay.test.ts apps/worker/src/handlers/mail-send.test.ts apps/worker/src/registry.test.ts apps/worker/src/main.test.ts apps/worker/src/container.wiring.test.ts` | 0 | 7 passed (7) | 85 passed (85) | 3s |
| 090 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project worker-int apps/worker/src/handlers/evidence-process.int.test.ts apps/worker/src/handlers/mail-send.int.test.ts` | 0 | 2 passed (2) | 6 passed (6) | 5s |
| 091 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/app/api/evidence/upload/route.test.ts apps/web/src/server/actions/evidence.test.ts apps/web/src/server/container.test.ts apps/web/src/components/patient/evidence/` | 0 | 11 passed (11) | 120 passed (120) | 4s |
| 092 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/upload.int.test.ts` | 0 | 1 passed (1) | 4 passed (4) | 5s |
| 093 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/evidence.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 2s |
| 094 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/evidence-upload.int.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 4s |
| 095 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/evidence.adversarial.test.ts` | 0 | 1 passed (1) | 11 passed (11) | 2s |
| 096 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project adapters packages/adapters/src/storage-fs/storage-fs.adversarial.test.ts` | 0 | 1 passed (1) | 20 passed (20) | 2s |
| 097 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/upload.adversarial.int.test.ts` | 0 | 1 passed (1) | 11 passed (11) | 13s |
| 098 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/clamav.test.ts apps/web/src/server/storage.test.ts apps/web/src/server/storage.adversarial.test.ts apps/web/src/server/actions/evidence.test.ts apps/web/src/server/actions/evidence.adversarial.test.ts apps/web/src/components/patient/evidence/` | 0 | 10 passed (10) | 72 passed (72) | 4s |
| 099 | u48 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/evidence.int.test.ts packages/database/src/demo/evidence.adversarial.test.ts` | 0 | — | — | no file matched: both files were U48's pre-change baseline and were removed by U48 (a9a2ffe); expected |
| 100 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/comments/ apps/web/src/server/actions/comments.test.ts` | 0 | 5 passed (5) | 97 passed (97) | 6s |
| 101 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/comments.int.test.ts` | 0 | — | — | no file matched: U49's pre-change baseline file, removed by U49 (f065c1b); expected |
| 102 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/community.test.ts` | 0 | 1 passed (1) | 19 passed (19) | 2s |
| 103 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/community/` | 0 | 3 passed (3) | 23 passed (23) | 1s |
| 104 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/community.int.test.ts` | 0 | 1 passed (1) | 19 passed (19) | 3s |
| 105 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/` | 0 | 14 passed (14) | 252 passed (252) | 3s |
| 106 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/community/` | 0 | 4 passed (4) | 38 passed (38) | 2s |
| 107 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/comments.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts` | 0 | 2 passed (2) | 53 passed (53) | 2s |
| 108 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/comments/ "apps/web/src/app/[locale]/(patient)/experiences/"` | 0 | 7 passed (7) | 107 passed (107) | 7s |
| 109 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/community/comments.smoke.test.ts` | 0 | 1 passed (1) | 1 passed (1) | 3s |
| 110 | u49 | `pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/demo-slice.smoke.test.ts` | 0 | 1 passed (1) | 2 passed (2) | 3s |
| 111 | u50 | `pnpm exec vitest run --config vitest.workspace.ts --project tooling scripts/__tests__/wait-for.test.mjs` | 0 | 1 passed (1) | 11 passed (11) | 6s |
| 112 | u50 | `pnpm exec vitest run --config vitest.workspace.ts --project tooling scripts/__tests__/demo.test.mjs scripts/__tests__/demo-reset.test.mjs` | 0 | 2 passed (2) | 50 passed (50) | 2s |
| 113 | u50 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/health.test.ts apps/web/src/server/env.test.ts apps/web/src/server/health.smoke.test.ts` | 0 | 3 passed (3) | 65 passed (65) | 1s |
| 114 | u50 | `pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/e2e-config.test.ts apps/web/src/copy-no-rating.test.ts` | 0 | 2 passed (2) | 13 passed (13) | 2s |
| 115 | u50 | `pnpm --filter @rogikotha/web exec playwright test --list` | 0 | — | — | 240 tests in 8 files listed (231 suite + 9 nfr13) |
| 116 | u50 | `pnpm --filter @rogikotha/web --filter @rogikotha/worker build` | 0 | — | — | web and worker build exit 0 |

## Failure details

### No. 069 (U46) — subset coverage run held to the package floor (resolved, ISS-810)

Resolved by the rung-1 fixes: U46's instructions now give the package-level command, which exits 0
at 88.70%. The first run's details:

- Command: `pnpm exec vitest run --config vitest.workspace.ts --project application --coverage
  --coverage.include='packages/application/src/**' --coverage.thresholds.lines=0
  packages/application/src/modules/directory packages/application/src/modules/taxonomy
  packages/application/src/modules/review`
- Tests: 12 files, 177 passed, 0 failed.
- Assertion: `ERROR: Coverage for lines (44.56%) does not meet "packages/application/src/**"
  threshold (80%)`.
- Cause: `vitest.workspace.ts` sets the floor as per-glob thresholds; `--coverage.thresholds.lines=0`
  only clears the global threshold, so a run over three modules is measured against the whole
  package. This is the instruction, not the product: the package's own figure in `pnpm check` is
  92.45%.
- Suspected Unit: U46 (`u46-directory`), its `unit-test-instructions.md`.
- Candidate fix, impact-estimated: replace the command with the package-level form T-101 and T-104
  already use (`--project application --coverage --coverage.include='packages/application/src/**'`,
  no path filters: 88.70% on unit tests alone, exit 0), or read the module figure without a gate.
  Effort: one line in U46's record; cost none; risk none to code; the floor is untouched.

## Browser suite (`pnpm e2e`)

| Command | Exit | Result |
|---|---|---|
| `timeout 3600 pnpm e2e` | 0 | builds web and worker, then the four projects: **231 expected, 0 unexpected, 0 flaky, 0 skipped**, 6.1 min (from `apps/web/test-results/report.json`); no test used its retry |
| per project | — | `chromium-desktop` 121, `chromium-360` 72, `chromium-reduced-motion` 32, `log-scan` 6 |
| per locale | — | 101 `bn` and 101 `en` tests (equal), 29 without a locale tag (security, log scan, health, cookie and per-locale-loop specs) |
| `timeout 1200 pnpm --filter @rogikotha/web exec playwright test --project=chromium-desktop --retries=0 security/security.spec.ts smoke/security-headers.spec.ts` | 0 | **15 passed**, 0 failed, 0 flaky (CSP on the public pages, foreign Origin refused on a server action and on the upload route, upload cap before the body, headers and nonce per load, no CSP violation, only the ENT-011 cookies) |

The `log-scan` project passed: `OPS health every probe is ok` (all four probes `ok` with every
service up, AC12.3.1); no sentinel or run email in `web.log` or `worker.log`, every line JSON
(AC12.3.3); every page the journeys checked carried the CSP.

## Performance (`pnpm e2e:perf`, NFR13 and NFR1)

Throttling: 562.5 ms latency, 1.47 Mbps down, 675 Kbps up, 4x CPU (Lighthouse 13.6.0, headless
Chromium). Gated pages: median of 5 flows. Each `NFR13 <page>` test aborts on the first run
Lighthouse returns without an LCP value, and the file is serial, so a failure stops the rest.

### First run (before the rung-1 fix)

| Command | Exit | Result |
|---|---|---|
| `timeout 3600 pnpm e2e:perf` | 1 | `NFR13 en home` failed, 8 did not run, 65 s |
| per-page reruns `--grep "NFR13 bn home"`, `"NFR13 en r1"`, `"NFR13 bn r1"` | 1 each | the same assertion |
| `--grep "NFR13 record"` | 0 | 5 passed |

All four pages failed `nfr13.spec.ts:170`, "Lighthouse names the LCP element in at least one run"
(received 0): `lighthouse-flow.ts` read `largest-contentful-paint-element`, which Lighthouse 13.6.0
replaced with `lcp-breakdown-insight` (`core/audits/insights/lcp-breakdown-insight.js:28`,
`replacesAudits`). Every one of those 20 flows reported LCP; medians: `/en` home 1225 ms, INP 35,
CLS 0; `/bn` home 1227, 34, 0; `/en` r1 1232, 36, 0; `/bn` r1 1236, 33, 0.019 (ISS-812).

### After the rung-1 fix (ISS-812)

| Command | Exit | Result |
|---|---|---|
| `timeout 3600 pnpm e2e:perf`, fix attempt 1 | 1 | `NFR13 en home` still "names no element": the insight lists the node item directly |
| `timeout 3600 pnpm e2e:perf`, fix attempt 2 | 1 | `NFR13 en home`: "Lighthouse reported no LCP" in one run (16.6 s), 8 did not run |
| `pnpm --filter @rogikotha/web exec playwright test --project nfr13` (no rebuild) | 1 | `en home` and `bn home` **passed**; `en r1`: no LCP in one run; 6 did not run |
| per-page `--grep "NFR13 en r1"` (3 runs) | 1, 0, 1 | one pass (all five runs and every probe clause); two runs ended "no LCP" |
| per-page `--grep "NFR13 bn r1"` (3 runs) | 1, 1, 1 | "no LCP" each time; never completed |
| `--grep "NFR13 record"` | 0 | 5 passed |
| `timeout 3600 pnpm e2e:perf`, final | **1** | `en home` passed; `bn home`: "no LCP" in one run; 7 did not run |

For one check against the change, `en r1` ran once with the original harness: all five runs
reported LCP (it then failed on the missing selector, as before). The fix only changes how the
selector is read after the LCP value is read, so it cannot drop the LCP value; the link stayed
unexplained. The cause was then found in the trace (Lighthouse's `NO_NAVSTART`, ISS-815, below)
and fixed; the final, green run is "Final run (green)".

Gated pages at this point, latest completed measurement of each (superseded by the final run):

| Page | Source run | LCP median (<= 2500 ms) | INP median (<= 200 ms) | CLS median (<= 0.1) | LCP element and probe |
|---|---|---|---|---|---|
| `/en` home | final `pnpm e2e:perf` | 1224 ms | 33 ms | 0 | `section.opener > div.opener-grid > div > p.lede`: found at the first frame, 0 animations, no `[data-reveal]` ancestor, opacity 1 — **not animated in** |
| `/bn` home | the `--project nfr13` rerun | 1228 ms | 34 ms | 0 | `div.page-frame > section#view-discover > section.opener > h1.display`: same four checks pass — **not animated in** |
| `/en/experiences/<r1>` | the passing per-page rerun | 1233 ms (runs 1208 to 3775) | 35 ms | 0 (one run 0.174) | `section#view-account > article.experience > section.a-head > h1#experience-title` in all five runs; the test passed, so every probe clause held — **not animated in** |
| `/bn/experiences/<r1>` | first run (before the fix) | 1236 ms | 33 ms | 0.019 | **not measured**: no run with the fix completed |

Record-only pages against the ~3 s reference (NFR1, AC2.3.6, AC12.3.5), one navigation each, none
over the reference, the same in both runs: `/bn/doctors/<id>` 1226 ms, `/bn/facilities/<id>` 1231
ms, `/bn/topics` 1226 ms, `/bn/register` 1226 ms (CLS 0.002), `/en/doctors` 1227 ms; CLS 0
elsewhere. No S3 row is needed.

### Lighthouse reports no LCP for a run (ISS-815): diagnosis and fix

- **Symptom** (`nfr13.spec.ts`, every gated page at some point): `Lighthouse reported no LCP for
  <url>`, aborting the page after 15 to 17 s and, the file being serial, every later page; 8 of
  12 page attempts after the ISS-812 fix.
- **Diagnosis** (fix attempt 1, two kept reports from `/bn` r1,
  `apps/web/test-results/nfr13/no-lcp/*.json`): the `largest-contentful-paint` audit has
  `scoreDisplayMode: "error"` and `errorMessage` "Something went wrong with recording the trace
  over your page load. Please run Lighthouse again. (NO_NAVSTART)"; no run warnings. The trace
  holds one `navigationStart`, for the tab's initial `about:blank` (empty `documentLoaderURL`,
  navigation id `D93F...`), while `firstContentfulPaint` and two
  `NavStartToLargestContentfulPaint::Candidate` events (text, 27 938 px², `isAnimated: false`, in
  the main frame) belong to the page's own navigation (id `B1CB...`), whose `navigationStart` is
  missing. So the page painted its LCP candidate normally; the trace lost the start of the
  measured navigation. This is Lighthouse's own `NO_NAVSTART` case, not the page. The likely
  mechanism is the first navigation away from a fresh tab's initial `about:blank`, which Chromium
  can commit in a new renderer whose `navigationStart` the trace does not catch; that part is a
  reading of the trace, not proven.
- **Fix** (attempt 2): every flow opens the origin (`GET /api/health`) in its fresh tab before
  `startFlow`, so the measured navigation is a same-site one; then the bounded retry described in
  "Rung-1 fixes" as a safety net (at most 2 per page, recorded, never counted, the page fails when
  they run out). Checked first on the page that failed most: `--grep "NFR13 bn r1"` twice, both
  passed with 0 retries.
- **Effect on the figures**: with the origin opened first, the connection to 127.0.0.1:3107 is
  already open when Lighthouse's navigation starts, which Lighthouse's simulated throttling may
  treat as a reused connection, so the measured load can leave out the first connection's setup.
  The home-page medians fell from about 1225 ms to about 900 ms, the experience pages from about
  1235 ms to about 1206 ms. The thresholds are unchanged, and the medians measured before this
  fix (1224 to 1236 ms) are within them as well, so no verdict depends on the change; a later
  harness change could open the origin on a separate connection to remove the doubt.

### Final run (green)

| Command | Exit | Result |
|---|---|---|
| `timeout 3600 pnpm e2e:perf` | **0** | 9 passed, 3.4 min; **0 no-LCP retries** on every page; no `no-lcp` report written |

| Page | LCP median (<= 2500 ms) | INP median (<= 200 ms) | CLS median (<= 0.1) | Retries | LCP element (probe: found at first frame, 0 animations, no `[data-reveal]` ancestor, opacity 1) |
|---|---|---|---|---|---|
| `/en` home | 913 ms | 34 ms | 0 | 0 | `section.opener > div.opener-grid > div > p.lede` — not animated in |
| `/bn` home | 891 ms | 33 ms | 0 | 0 | `div.page-frame > section#view-discover > section.opener > h1.display`, and in some runs `p.lede` — both not animated in |
| `/en/experiences/<r1>` | 1206 ms | 33 ms | 0 | 0 | `section#view-account > article.experience > section.a-head > h1#experience-title` — not animated in |
| `/bn/experiences/<r1>` | 1206 ms | 32 ms | 0.019 | 0 | `section#view-account > article.experience > section.a-head > h1#experience-title` — **not animated in** |

The first `/en` r1 run of the file is slow (LCP 3771 ms, CLS 0.174, as in the earlier passing set:
3775 ms and 0.174); it is the first experience-page load after the suite's server starts, and the
other four runs are 1206 to 1208 ms with CLS 0. The median is the gate (BR5.4), so this does not
fail it; it is recorded here and in ISS-815.

Record-only pages, final run, against the ~3 s reference, none over it, 0 retries: `/bn/doctors/<id>`
931 ms, `/bn/facilities/<id>` 897 ms, `/bn/topics` 807 ms, `/bn/register` 1206 ms (CLS 0.002),
`/en/doctors` 873 ms; CLS 0 elsewhere.

## Stopped scanner and stopped mail (AC12.3.2, U50 M1 and M2), Host probe

A separate production server (`next start` on `127.0.0.1:3207`, the build of `e09b558`,
`APP_MODE=demo`, database `rogikotha_bt` reset and seeded, storage under a temporary folder) was
started three times; each outage was simulated by pointing that one process at an unused port. No
container was stopped.

| Run | Override | `GET /api/health` | Expected | Verdict |
|---|---|---|---|---|
| normal | — | 200 `{"ok":true,"db":"ok","queue":"ok","mail":"ok","scanner":"ok","mode":"demo"}` | every probe ok (AC12.3.1) | Met |
| scanner down (M1) | `CLAMD_PORT=3399` | 200 `{"ok":true,"db":"ok","queue":"ok","mail":"ok","scanner":"down","mode":"demo"}` | scanner reports failure, `ok` true | Met |
| mail down (M2) | `SMTP_PORT=1099` | 200 `{"ok":false,"db":"ok","queue":"ok","mail":"down","scanner":"ok","mode":"demo"}` | mail reports failure, `ok` false | Met |

M1's second half (a new upload stays "scanning", is never counted, and finishes once clamd is back)
is covered by automated tests, green in `pnpm check` and `pnpm test:int`: the processor's
"unavailable" cases in `packages/application/src/modules/evidence/process-evidence.test.ts` and
the public count of processed items only (`countPublic` in
`packages/database/src/repositories/evidence.int.test.ts`); it was not walked by hand.

Host and forwarded-host probe on the normal run (threat notes §1, "curl with `Host: evil.example`
(Build and Test)"): `/en` 200 and `/bn` 200 with the right Host; `Host: evil.example` → **403**;
`X-Forwarded-Host: evil.example` → **403**. Met.

## Rollback drill (AC12.3.4, NFR12, BR10.5)

Run in this worktree on a throwaway local branch `scratch/rollback-drill` cut from `e09b558`, against
`rogikotha_bt` only (every `DATABASE_URL*` pointed there), never pushed; the branch was deleted
afterwards and `bolt/build-and-test` is back at `e09b558`.

| Step | Observed | Verdict |
|---|---|---|
| A breaking "Bolt" commit (`1b324d2`, the home page throws), `pnpm --filter @rogikotha/web build` | build exit 0; on the server: `/en` **500**, `/bn` **500**, `/en/doctors` 200 | the break is real |
| `git revert --no-edit HEAD` (`ae09e1a`), web and worker build | exit 0; the tree equals `e09b558` (`git diff --quiet e09b558 HEAD`) | — |
| `pnpm db:reset && pnpm db:seed` on `rogikotha_bt` | exit 0, 8.4 s; seed: directory 123, content 915, evidence 106, moderation 78, notifications 9 rows | — |
| The demo runs again | `/en` 200, `/bn` 200, `/api/health` `{"ok":true,"db":"ok","queue":"ok","mail":"ok","scanner":"ok"}` | Met |
| `timeout 1500 pnpm check` on the reverted tree | exit 0: 366 files, 4504 passed, 2 expected failures, 1 skipped; lines 96.13%; every other step green | Met |
| `timeout 900 pnpm smoke` on the reverted tree | exit 0: 31 files, 60 passed | Met |
| Throwaway branch removed | `git branch -D scratch/rollback-drill`; nothing reached `main` | done |

Migrations are forward-only; the reset rebuilt the schema from empty, as the team's Deployment
practice says. The line figure differs by 2 lines from the first `pnpm check` (9514 against 9512 of
9897), a timing-dependent path; both are far above the floor.

## Bengali body font (BR10.7)

On the normal run, Chromium (the Playwright build) opened `/bn` (200) and waited for
`document.fonts.ready`. The body stack is `"Noto Sans Bengali", "Nirmala UI", "Shonar Bangla",
Kalpurush, SolaimanLipi, sans-serif`.

| Font | `document.fonts.check` (walkthrough method) | Installed (glyph-width probe) |
|---|---|---|
| Noto Sans Bengali | true | no |
| Nirmala UI | true | **yes (first installed: the body font in use)** |
| Shonar Bangla | true | yes |
| Kalpurush | true | yes |
| SolaimanLipi | true | no |

`document.fonts.check` answers true for every name because it reports true for a font the page's
FontFaceSet does not hold (system fonts are never in it), so the walkthrough's method cannot tell
which font is in use (ISS-814). The glyph-width probe (the name against serif and against
monospace fallbacks) shows Nirmala UI is the Bengali body font on this machine; it differs by
machine, as the walkthrough says.

## Not run in this stage

| Check | Why | Owner |
|---|---|---|
| U50 manual checks M3 (Ctrl+C on `pnpm demo`), M4 (port 3000 held), M5 (`pnpm demo` twice), M6 (`pnpm demo:reset --yes`, then sign in) | each needs `pnpm demo` or `demo:reset` on port 3000 and the shared containers, which the live demo holds; this stage must not stop or reset it. Automated parts are green: `scripts/__tests__/demo.test.mjs` and `demo-reset.test.mjs` (tooling project), seed determinism in `seed.int.test.ts` (AC2.1.1) | owner, with the demo stopped (ISS-813) |
| Clean-clone rehearsal (BR10.4) | needs `pnpm demo` with its own compose project and a stopped main demo | owner (ISS-813) |
| The hand walk of storyboard step 28 and the owner review boxes OR1 to OR7 | owner-only by U50's record | owner |

## ISS rows from this stage

| ID | Sev | Summary | Status |
|---|---|---|---|
| ISS-809 | S4 | Stale test paths in three Units' `unit-test-instructions.md` (CR-009 `database.smoke.test.ts`; T-102 `auth-screens.adversarial.test.ts`; T-502 four paths under `apps/web/src/server/`); the corrected commands are green | fixed at Build and Test (rung 1): paths corrected in the three files |
| ISS-810 | S4 | U46's subset coverage command exits 1 by construction (package glob threshold on a three-module run) | fixed at Build and Test (rung 1): package-level command, exit 0, 88.70% |
| ISS-811 | S4 | 8 release-1 requirement keys (FR22, FR43, FR53, FR54, FR55, FR56, FR57, FR65) have no `OK` traceability entry and no covered AC | resolved by records decision: deferred to release 2 under FD-105 (every citing AC deferred) |
| ISS-812 | S1 | `pnpm e2e:perf` red: Lighthouse 13.6.0 has no `largest-contentful-paint-element` audit, so the LCP-element probe never runs; the measured figures meet every threshold | fixed at Build and Test (rung 1, 2 attempts): the probe reads `lcp-breakdown-insight`; the LCP element is found and not animated in on all four gated pages |
| ISS-815 | S1 | `pnpm e2e:perf` still red: Lighthouse intermittently returns a run with no LCP value, which aborts the page; `/bn` r1 never completed with the fixed probe | fixed at Build and Test (rung 1, 2 attempts): cause Lighthouse's `NO_NAVSTART` (the trace lost the measured navigation's start); each run opens the origin first, plus a recorded retry of at most 2 per page; `pnpm e2e:perf` 9 of 9, 0 retries |
| ISS-813 | S4 | U50 manual checks M3 to M6 and the clean-clone rehearsal not run at Build and Test (the live demo holds port 3000 and the containers) | open, owner |
| ISS-814 | S4 | The BR10.7 walkthrough method (`document.fonts.check`) is true for every listed font and cannot tell the font in use | open (records) |

Older rows this stage confirms: ISS-752 to ISS-755 (clean browser run, 0 flaky); ISS-756 (the perf
assumptions: (2) and (3) held, the LCP probe did not, see ISS-812 and ISS-815); ISS-805 (the six Deferred to
Build and Test rows now have their run).

## Loop-back log

None: no rung-3 loop-back was taken (no product defect was found).

## Manual checks, 2026-11-09

Walked on `main` (`4ae320e` and `29a2567`) on the office computer, Windows 11 Enterprise
10.0.26300, Node 24.18.0, pnpm 11.20.0, against the dev database `rogikotha` and the main compose
project. The detailed rows are in `docs/validation/U50-walkthrough.md`.

| Target | Observed | Verdict |
|---|---|---|
| U50-M3 Ctrl+C | The demo ran in its own console; a console Ctrl+C reached it. The worker logged `worker.stopping` and `worker.stopped` (signal SIGINT), the demo printed "Stopped. The containers keep running; pnpm demo:down stops them.", the demo, web and worker processes exited, `/api/health` stopped answering, and postgres, clamav and mailpit stayed healthy | Met |
| U50-M4 port 3000 held | A second `pnpm demo` while the first held port 3000 stopped at preflight with exit 1: "Port 3000 (web app) is in use. Free it and run pnpm demo again." and "Find its holder: netstat -ano \| findstr :3000" | Met |
| U50-M5 twice | After the first and the second run: doctors 14, reviews 40, accounts 120, comments 73; 0 doctor names occur twice; the second run's Data step took 9 s | Met |
| U50-M6 reset | First walk: the reset seeded, then emptied the storage folders, leaving 0 files, so the seeded evidence had no files (ISS-818, S2). Fixed in `scripts/demo-reset.mjs` (empty first, then reset and seed; order test updated). Re-walk: exit 0, 20 files regenerated, Mailpit 0 messages, and `shirin_88` signed in through `/en/sign-in` and landed on `/en/me` | Met after ISS-818 |
| U50-BR10.4 clean clone | `git clone` of `main` at `29a2567` into an empty folder, `pnpm install --frozen-lockfile`, `RK_COMPOSE_PROJECT=rogikotha_rehearsal pnpm demo`: the banner after 146 s (clone 7 s, install 29 s, preflight 3 s, services 20 s, data 18 s, build 61 s, start 6 s) with cached images; `/bn`, `/en` and Mailpit 200; health ok; `down -v` removed the rehearsal volumes | Met |
| U50-BR10.7 font (method fix, ISS-814) | Width comparison on `/bn`: the body stack measures 647.6 px for the test sentence, Nirmala UI 647.6 px, the other four names 700.6 px (the `monospace` fallback): Nirmala UI is in use | Met |

Fixes landed before the re-run (each squash-merged on `main`):

- `release-1-security-fixes` (`4ae320e`, FD-123): migration 0012 limits the `rk.audit_expiry` escape
  hatch to an `rk_maintenance` session inside `fn_expire_audit` and pins `search_path` (ISS-141,
  ISS-148); migration 0013 narrows `rk_worker` on `evidence_items` to column grants without
  `original_filename_enc` and `uploaded_by_account_id` (ISS-139, ISS-632, ISS-239); better-auth 1.7.18
  (ISS-704); `packages/application` declares `@types/node` (ISS-817). The two `it.fails` tripwires
  became ordinary passing tests, and new probes cover the narrowed grants. On the fix branch:
  `pnpm check` 4513 passed, `pnpm smoke` 60, `pnpm test:int` 65 files, 446 passed.
- `release-1-demo-reset-order` (`29a2567`): ISS-818.

Re-run on `main` at `29a2567`:

| Command | Exit | Result |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | lockfile unchanged |
| `pnpm check` | 0 | 366 files, 4513 passed, 1 skipped (4514); statements 94.56%, lines 96.13% |
| `pnpm smoke` | 0 | 31 files, 60 passed |

ISS ids found or fixed on 2026-11-09: ISS-139, ISS-141, ISS-148, ISS-239, ISS-632, ISS-704, ISS-813,
ISS-814, ISS-816 (recorded, open S4), ISS-817, ISS-818.
