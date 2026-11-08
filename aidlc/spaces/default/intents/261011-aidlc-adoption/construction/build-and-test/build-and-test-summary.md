# Build and Test summary — RogiKotha release 1

Intent `261011-aidlc-adoption`, scope `classic`, Test Strategy **Minimal**, Construction Autonomy
Mode `autonomous`. Run on `main` at `e09b558` (all ten release-1 Units merged and reviewed) in the
worktree `bolt/build-and-test` on 2026-11-08. Evidence: `test-results.md`; requirement coverage:
`cross-unit-traceability.md`.

## Overall status

| Item | Status |
|---|---|
| Build | **green**: `pnpm build`, the web and worker builds, strict typecheck |
| Project gate | **green**: `pnpm check` exit 0 (4504 tests passed, every package at or above 80% lines) |
| Integration and smoke | **green**: `pnpm test:int` 437 passed; `pnpm smoke` 31 files, 60 tests |
| Browser suite | **green**: `pnpm e2e` 231 of 231, 0 flaky, 0 skipped; security specs 15 of 15 |
| Performance | **red**: `pnpm e2e:perf` fails on the LCP-element probe (ISS-812, test harness); every measured figure is within its threshold |
| Unit-scoped commands | 115 of 116 green; No. 069 (U46) fails by construction (ISS-810) |
| Cross-unit traceability | **fail**: 8 release-1 requirement keys uncovered (ISS-811); all release-2 cuts named under FD-105 |
| Stage result | **failed** under the failure predicate (1 command red, 1 target Not Met for the unit command, 1 for traceability, 6 Unverified) — no product defect found |

Prerequisites: Node 24, pnpm 11, Docker Desktop with the compose PostgreSQL 18, Mailpit and ClamAV
(`build-instructions.md`).

## Test types generated

| File | Why at Minimal |
|---|---|
| `build-instructions.md` | always |
| `integration-test-instructions.md` | the project's integration and Playwright suites carry NFR3, NFR4, NFR6, NFR7 and AC12.3.x |
| `performance-test-instructions.md` | NFR13 (FD-091) gates LCP, INP and CLS; NFR1 records figures |
| `security-test-instructions.md` | PRD §9.1 to §9.3 bind the demo; U41 hardening and the high-risk Units' adversarial tests |

Unit tests stay per Unit (`construction/*/code-generation/unit-test-instructions.md`, 19 files).

## Coverage expectations per Unit

The team floor is per package, not per Unit: 80% lines for every package with source code,
measured by `pnpm test:coverage` inside `pnpm check`, never lowered (D10). Each Unit is held to it
through the packages it changes (recorded in each `code-summary.md`). Measured here: domain 99.21%,
contracts 100%, application 92.45%, database 98.29%, adapters 97.30%, i18n 100%, test-support
95.84%, web 96.22%, worker 100% (all 96.10%). The Minimal strategy adds one verifiable test per
requirement at the narrowest level and a happy-path test per component; the cumulative smoke suite
only grows (31 files, 60 tests, as at U50).

## Target Verification Matrix

Source abbreviations: **TC** = the `## Testing Contract` of every
`construction/*/code-generation/code-generation-plan.md` (identical team posture in all 19, from
`team.md` Testing Posture); **RQ** = `inception/requirements-analysis/requirements.md`,
Non-functional requirements; **US** = `inception/user-stories/stories.md`; **U50** =
`docs/validation/U50-walkthrough.md` and U50's `code-summary.md` "Left for Build and Test";
**TN** = `docs/security/local-demo-threat-notes.md` §1. There are no `nfr-requirements/` or
`nfr-design/` artifacts in this intent. No later validation stage is scheduled (the `classic` scope
skips Operation), so Build and Test owns every row.

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| TC-COV-domain | TC; team.md Testing Posture (D10) | `packages/domain` >= 80% lines | 99.21% (501/505) | `pnpm check`, `coverage/coverage-summary.json`; test-results.md "Coverage" | Build and Test | Met |
| TC-COV-contracts | TC (D10) | `packages/contracts` >= 80% | 100.00% (448/448) | same | Build and Test | Met |
| TC-COV-application | TC (D10) | `packages/application` >= 80% | 92.45% (1776/1921) | same | Build and Test | Met |
| TC-COV-database | TC (D10) | `packages/database` >= 80% | 98.29% (1206/1227) | same | Build and Test | Met |
| TC-COV-adapters | TC (D10) | `packages/adapters` >= 80% | 97.30% (252/259) | same | Build and Test | Met |
| TC-COV-i18n | TC (D10) | `packages/i18n` >= 80% | 100.00% (55/55) | same | Build and Test | Met |
| TC-COV-test-support | TC (D10) | `packages/test-support` >= 80% | 95.84% (2004/2091) | same | Build and Test | Met |
| TC-COV-web | TC (D10) | `apps/web` >= 80% | 96.22% (3076/3197) | same | Build and Test | Met |
| TC-COV-worker | TC (D10) | `apps/worker` >= 80% | 100.00% (194/194) | same | Build and Test | Met |
| TC-CHECK | TC; AC1.1.1 | `pnpm check` exit 0 | exit 0; 366 files, 4504 passed, 2 expected failures, 1 skipped | test-results.md "Project gates" | Build and Test | Met |
| TC-SMOKE | TC | `pnpm smoke` green; no smoke assertion removed (>= 31 files, 60 tests) | exit 0; 31 files, 60 tests | test-results.md "Project gates" | Build and Test | Met |
| TC-INT | TC | `pnpm test:int` green | exit 0; 65 files, 437 passed, 2 expected failures | test-results.md "Project gates" | Build and Test | Met |
| TC-UNIT | TC; stage Step 9.2 | every distinct unit-scoped command green | 115 of 116 exit 0; No. 069 (U46) exit 1 by construction | test-results.md "Unit-scoped commands", ISS-810 | Build and Test | Not Met |
| TC-UI-IMPECCABLE | TC (`01-conventions.md` §7.8) | `npx impeccable detect apps/web/src --no-advisory` 0 findings | 410 files, 0 findings | test-results.md "Project gates" | Build and Test | Met |
| TC-UI-CONTRAST | TC (§7.8) | `pnpm contrast` every pair passes | 150 PASS, 0 FAIL (and `contrast:patient` 70 PASS) | same | Build and Test | Met |
| TC-E2E-CLEAN | U50 BR1.6 | `pnpm e2e` 0 failed, 0 flaky, 0 skipped | 231 expected, 0 unexpected, 0 flaky, 0 skipped | `apps/web/test-results/report.json`; test-results.md "Browser suite" | Build and Test | Met |
| NFR1 | RQ NFR1; AC2.3.6, AC12.3.5 | important public pages recorded against ~3 s, no gate | 5 record-only pages, LCP 1226 to 1231 ms, none over 3 s | `apps/web/test-results/nfr13/record-*.json`; test-results.md "Performance" | Build and Test | Met |
| NFR2 | RQ NFR2 | bounded retries and explicit failure states; a delayed item shows its status | processor and sweep tests green; the scan journey (P3.12) reaches Ready in both locales | `process-evidence.test.ts`, `pnpm e2e` | Build and Test | Met |
| NFR3-AC12.3.1 | RQ NFR3; AC12.3.1 | `/api/health` reports db, queue, mail, scanner ok | all four `ok` (suite server and the 3207 server) | `OPS health every probe is ok`; test-results.md "Stopped scanner" | Build and Test | Met |
| NFR3-AC12.3.2 | AC12.3.2; U50 M1, M2 | stopped scanner or mail: that probe reports a failure | scanner `down` with `ok` true; mail `down` with `ok` false | test-results.md "Stopped scanner and stopped mail" | Build and Test | Met |
| NFR4-AC2.3.1 | RQ NFR4; AC2.3.1 (narrowed: 360 px and 1280 px, FD-105) | no horizontal or Bengali overflow on the critical journeys, both locales | `chromium-360` 72 and `chromium-desktop` 121 passed, overflow checked in `checkPage` | `pnpm e2e` | Build and Test | Met |
| NFR4-AC2.3.2 | AC2.3.2 | every step completes at 200% zoom and with reduced motion | `A11Y zoom` and `A11Y spacing` passed; `chromium-reduced-motion` 32 of 32 | `pnpm e2e` | Build and Test | Met |
| NFR5 | RQ NFR5; AC2.3.5 (narrowed: Chromium, FD-105) | the journeys pass in Chromium | 231 of 231 in Chromium; Firefox, WebKit and Safari/iOS release 2 (ISS-787, ISS-788) | `pnpm e2e` | Build and Test | Met |
| NFR6-AC2.3.3 | RQ NFR6; AC2.3.3 | keyboard-only reachable, axe no serious or critical violation | `A11Y keyboard` passed; no blocking axe violation on any checked page | `pnpm e2e` | Build and Test | Met |
| NFR6-AC2.3.4 | AC2.3.4 | invalid form: error in the active language linked and announced | `P2.8c [bn]` and `[en]` passed | `pnpm e2e` | Build and Test | Met |
| NFR7 | RQ NFR7 | key parity; journeys in both locales | `i18n:check` 993 keys; 101 `bn` and 101 `en` browser tests, all passed | `pnpm check`, `report.json` | Build and Test | Met |
| NFR8 | RQ NFR8 (narrowed: merge redirects release 2) | server-rendered pages; `noindex` on user, auth, staff and API surfaces | `headers.test.ts` and `security-headers.spec.ts` passed | `pnpm check`, security specs | Build and Test | Met |
| NFR9 | RQ NFR9; AC1.1.4 | storage only through the port; no per-process state | the storage-port and outbox tests green | `pnpm check` | Build and Test | Met |
| NFR10-AC12.3.3 | RQ NFR10; AC12.3.3, AC1.1.5 | structured, allowlisted logs; no review text, filename or run email in a log line | log scan of `web.log` and `worker.log`: no sentinel, every line JSON; log-policy tests green | `log-scan` project; `pnpm check` | Build and Test | Met |
| NFR11 | RQ NFR11; AC1.1.1 to AC1.1.3 | strict typecheck, lint, tests, i18n parity, build; migrations from empty; 80% floor | `pnpm check` exit 0; `migrations.int.test.ts` green; all packages >= 80% | `pnpm check`, `pnpm test:int` | Build and Test | Met |
| NFR12-AC12.3.4 | RQ NFR12 (demo rollback); AC12.3.4; U50 BR10.5 | revert a breaking squash commit, `db:reset && db:seed`, the demo runs, `pnpm check` and `pnpm smoke` green | break gave `/en` 500; after revert, reset and seed `/en` and `/bn` 200, health ok, check and smoke exit 0 | test-results.md "Rollback drill" | Build and Test | Met |
| NFR13-LCP | RQ NFR13; AC2.4.6 (FD-091) | median LCP <= 2.5 s on `/en` and `/bn` home and experience pages | 1225, 1227, 1232, 1236 ms | `apps/web/test-results/nfr13/{en,bn}-{home,r1}.json` | Build and Test | Met |
| NFR13-INP | RQ NFR13; AC2.4.6 | median INP <= 200 ms on the same pages | 35, 34, 36, 33 ms | same | Build and Test | Met |
| NFR13-CLS | RQ NFR13; AC2.4.6 | median CLS <= 0.1 on the same pages | 0, 0, 0, 0.019 | same | Build and Test | Met |
| NFR13-LCP-ANIM | AC2.4.6; U50 BR5.4 | the LCP element is never animated in | not measured: Lighthouse 13.6.0 names no LCP element through the audit the harness reads; `pnpm e2e:perf` exit 1 | test-results.md "Performance", ISS-812 | Build and Test | Unverified |
| NFR13-MOTION-CSS | RQ NFR13; AC2.4.2, AC2.4.6 | animated properties only `transform` and `opacity` | `check:motion` 2 stylesheets pass M1 to M11 | `pnpm check` | Build and Test | Met |
| NFR13-REDUCED | AC2.4.3, AC2.4.4 | reduced motion leaves only short fades; disclaimer and emergency guidance never animate | `chromium-reduced-motion` 32 of 32; `A11Y motion` specs passed | `pnpm e2e` | Build and Test | Met |
| SEC-HEADERS-ORIGIN | RQ Constraints (PRD §9); FD-116 | nonce CSP, headers, foreign Origin refused, upload cap before the body | security specs 15 of 15 | test-results.md "Browser suite" | Build and Test | Met |
| SEC-HOST | TN §1 (curl at Build and Test) | a foreign `Host` or `X-Forwarded-Host` is refused | both 403; the right Host 200 | test-results.md "Host probe" | Build and Test | Met |
| SEC-ANALYTICS-COOKIES | AC12.4.1 to AC12.4.3 (FR99) | no third-party or analytics request; only essential cookies | `csp.test.ts` no third-party origin; `holds only the ENT-011 cookies` passed | `pnpm check`, security specs | Build and Test | Met |
| U50-M3 | U50 M3 | Ctrl+C on `pnpm demo` stops web and worker, containers keep running | not run: needs `pnpm demo` on port 3000 | ISS-813 | Build and Test (owner's walk) | Unverified |
| U50-M4 | U50 M4 | port 3000 held: the message names the port and its holder | not run: port 3000 belongs to the live demo | ISS-813 | Build and Test (owner's walk) | Unverified |
| U50-M5 | U50 M5 | `pnpm demo` twice keeps data, no duplicates | not run by hand; seed determinism green in `seed.int.test.ts` | ISS-813 | Build and Test (owner's walk) | Unverified |
| U50-M6 | U50 M6 | `pnpm demo:reset --yes`, then sign in as `shirin_88` | not run: would reset the live demo | ISS-813 | Build and Test (owner's walk) | Unverified |
| U50-BR10.4 | U50 clean-clone rehearsal | clean clone to the banner in under 6 minutes with cached images | not run: needs `pnpm demo` with its own compose project and the main demo stopped | ISS-813 | Build and Test (owner's walk) | Unverified |
| U50-BR10.7 | U50 Bengali body font | the Bengali body font in use on `/bn` is recorded | Nirmala UI (glyph-width probe; `document.fonts.check` is true for all five, ISS-814) | test-results.md "Bengali body font" | Build and Test | Met |
| TR-STEP10 | stage Step 10 | every FR, NFR and AC covered `OK`, or named as deferred | 8 release-1 FR keys uncovered | `cross-unit-traceability.md`, ISS-811 | Build and Test | Not Met |

Verdict counts: **39 Met, 2 Not Met (TC-UNIT, TR-STEP10), 6 Unverified (NFR13-LCP-ANIM, U50-M3,
U50-M4, U50-M5, U50-M6, U50-BR10.4)**; no row is Pending.

## Readiness assessment

| Readiness | Assessment |
|---|---|
| Build-ready | **Yes.** The build, the strict typecheck and `pnpm check` are green on `main`. |
| Test-ready | **Partly.** Every functional, integration, browser, accessibility and security suite is green, coverage meets the floor in every package, and the rollback drill passed. Open: the NFR13 perf harness (ISS-812, S1 as a red check, one line in test code) and one unit-scoped command that cannot pass as written (ISS-810). |
| Deployment-ready (local demo) | **Not yet signed off.** The demo runs from this code (shown on a separate server and by the drill), but the owner's manual checks M3 to M6 and the clean-clone rehearsal are still to be walked (ISS-813), and the traceability gap needs a records decision (ISS-811). Release 1 is not for unrestricted public launch (moderation is release 2, FD-105). |

## Known limitations and outstanding items

- ISS-812 (S1): fix `apps/web/e2e/perf/lighthouse-flow.ts:127` to read `lcp-breakdown-insight`, then
  rerun `pnpm e2e:perf`; this is U50 test code, outside this stage's remit.
- ISS-810, ISS-809, ISS-811, ISS-814 (S4): records fixes in U46's, CR-009's, T-102's, T-502's
  instructions, in U47/U48/U49 traceability, and in the BR10.7 walkthrough method.
- ISS-813 (S4): the owner walks M3 to M6 and the clean-clone rehearsal with the live demo stopped.
- Not built in release 1 and named in the traceability file: Firefox, WebKit, Safari/iOS; the 390,
  768 and 1440 px viewports; the search page and its NFR13 gate; everything else FD-105 defers.
- U50's close-out documents (the `RELEASE-1-GATES.md` verdict cells, `U50-walkthrough.md` rows,
  `current-status.md`, `validation-log.md` and the owner's OR1 to OR7) were not edited by this stage;
  their evidence is in `test-results.md`.
