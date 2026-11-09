# Build and Test summary — RogiKotha release 1

Intent `261011-aidlc-adoption`, scope `classic`, Test Strategy **Minimal**, Construction Autonomy
Mode `autonomous`. Run on `main` at `e09b558` (all ten release-1 Units merged and reviewed) in the
worktree `bolt/build-and-test` on 2026-11-08, then completed on `main` on 2026-11-09 (manual checks, the
clean-clone rehearsal, the fixes FD-123 and ISS-818, and a fresh `pnpm check` and `pnpm smoke` on `29a2567`). Evidence: `test-results.md`; requirement coverage:
`cross-unit-traceability.md`.

## Overall status

| Item | Status |
|---|---|
| Build | **green**: `pnpm build`, the web and worker builds, strict typecheck |
| Project gate | **green**: `pnpm check` exit 0 (2026-11-08: 4504 tests passed; re-run on `main` at `29a2567` on 2026-11-09: 366 files, 4513 passed, 1 skipped, 0 expected failures, lines 96.13%; every package at or above 80% lines) |
| Integration and smoke | **green**: `pnpm test:int` 437 passed (446 after FD-123, on the fix branch); `pnpm smoke` 31 files, 60 tests (re-run 2026-11-09 on `main`: 60 passed) |
| Browser suite | **green**: `pnpm e2e` 231 of 231, 0 flaky, 0 skipped; security specs 15 of 15 |
| Performance | **green**: `pnpm e2e:perf` 9 of 9 with 0 no-LCP retries, after the rung-1 fixes of the probe (ISS-812) and of the lost-navigation runs (ISS-815); on all four gated pages the LCP element is never animated in and every median is within its threshold |
| Unit-scoped commands | **green**: 116 of 116 as the corrected instructions state them (ISS-809, ISS-810 fixed); the first run had No. 069 red |
| Cross-unit traceability | **pass**: no ID uncovered after the ISS-811 records decision; all release-2 cuts named under FD-105 |
| Manual checks and clean clone | **green** (2026-11-09): M3 to M6 walked; M6 found ISS-818 (`demo:reset` deleted the seeded evidence files), fixed and re-walked; clean clone to the banner in 2 min 26 s (target under 6) |
| Stage result | **success**: 47 Met, 0 Not Met, 0 Unverified |

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
| TC-UNIT | TC; stage Step 9.2 | every distinct unit-scoped command green | 116 of 116 exit 0 as the corrected instructions state them (No. 069 replaced by the package-level command: exit 0, 88.70%; five stale paths corrected) | test-results.md "Unit-scoped commands" and "Rung-1 fixes", ISS-809, ISS-810 | Build and Test | Met |
| TC-UI-IMPECCABLE | TC (`01-conventions.md` §7.8) | `npx impeccable detect apps/web/src --no-advisory` 0 findings | 410 files, 0 findings | test-results.md "Project gates" | Build and Test | Met |
| TC-UI-CONTRAST | TC (§7.8) | `pnpm contrast` every pair passes | 150 PASS, 0 FAIL (and `contrast:patient` 70 PASS) | same | Build and Test | Met |
| TC-E2E-CLEAN | U50 BR1.6 | `pnpm e2e` 0 failed, 0 flaky, 0 skipped | 231 expected, 0 unexpected, 0 flaky, 0 skipped | `apps/web/test-results/report.json`; test-results.md "Browser suite" | Build and Test | Met |
| NFR1 | RQ NFR1; AC2.3.6, AC12.3.5 | important public pages recorded against ~3 s, no gate | 5 record-only pages, LCP 807 to 1206 ms in the final run (1226 to 1231 ms before the ISS-815 fix), none over 3 s | `apps/web/test-results/nfr13/record-*.json`; test-results.md "Performance" | Build and Test | Met |
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
| NFR13-LCP | RQ NFR13; AC2.4.6 (FD-091) | median LCP <= 2.5 s on `/en` and `/bn` home and experience pages | final green `pnpm e2e:perf`: `/en` home 913, `/bn` home 891, `/en` r1 1206, `/bn` r1 1206 ms (before the ISS-815 fix: 1224 to 1236 ms, also within) | `apps/web/test-results/nfr13/{en,bn}-{home,r1}.json`; test-results.md "Final run (green)" | Build and Test | Met |
| NFR13-INP | RQ NFR13; AC2.4.6 | median INP <= 200 ms on the same pages | 34, 33, 33, 32 ms | same | Build and Test | Met |
| NFR13-CLS | RQ NFR13; AC2.4.6 | median CLS <= 0.1 on the same pages | 0, 0, 0, 0.019 | same | Build and Test | Met |
| NFR13-LCP-ANIM | AC2.4.6; U50 BR5.4 | the LCP element is never animated in | found at the first frame, 0 animations, no `[data-reveal]` ancestor, opacity 1 on all four: `/en` home `p.lede`, `/bn` home `h1.display` (and `p.lede`), `/en` and `/bn` r1 `h1#experience-title`; `pnpm e2e:perf` exit 0, 0 no-LCP retries | test-results.md "Final run (green)", ISS-812, ISS-815 | Build and Test | Met |
| NFR13-MOTION-CSS | RQ NFR13; AC2.4.2, AC2.4.6 | animated properties only `transform` and `opacity` | `check:motion` 2 stylesheets pass M1 to M11 | `pnpm check` | Build and Test | Met |
| NFR13-REDUCED | AC2.4.3, AC2.4.4 | reduced motion leaves only short fades; disclaimer and emergency guidance never animate | `chromium-reduced-motion` 32 of 32; `A11Y motion` specs passed | `pnpm e2e` | Build and Test | Met |
| SEC-HEADERS-ORIGIN | RQ Constraints (PRD §9); FD-116 | nonce CSP, headers, foreign Origin refused, upload cap before the body | security specs 15 of 15 | test-results.md "Browser suite" | Build and Test | Met |
| SEC-HOST | TN §1 (curl at Build and Test) | a foreign `Host` or `X-Forwarded-Host` is refused | both 403; the right Host 200 | test-results.md "Host probe" | Build and Test | Met |
| SEC-ANALYTICS-COOKIES | AC12.4.1 to AC12.4.3 (FR99) | no third-party or analytics request; only essential cookies | `csp.test.ts` no third-party origin; `holds only the ENT-011 cookies` passed | `pnpm check`, security specs | Build and Test | Met |
| U50-M3 | U50 M3 | Ctrl+C on `pnpm demo` stops web and worker, containers keep running | a console Ctrl+C: the worker logged `worker.stopped` (SIGINT), the demo printed "Stopped. The containers keep running", web and worker exited, the three containers stayed healthy | `docs/validation/U50-walkthrough.md`; test-results.md "Manual checks, 2026-11-09" | Build and Test (2026-11-09) | Met |
| U50-M4 | U50 M4 | port 3000 held: the message names the port and its holder | a second `pnpm demo` stopped at preflight, exit 1, with "Port 3000 (web app) is in use" and the `netstat` command to find its holder | `docs/validation/U50-walkthrough.md`; test-results.md "Manual checks, 2026-11-09" | Build and Test (2026-11-09) | Met |
| U50-M5 | U50 M5 | `pnpm demo` twice keeps data, no duplicates | two runs: doctors 14, reviews 40, accounts 120, comments 73 both times; 0 duplicate doctor names | `docs/validation/U50-walkthrough.md`; test-results.md "Manual checks, 2026-11-09" | Build and Test (2026-11-09) | Met |
| U50-M6 | U50 M6 | `pnpm demo:reset --yes`, then sign in as `shirin_88` | first walk failed (ISS-818: storage emptied after the seed, 0 files); after the fix: 20 files regenerated, Mailpit 0 messages, `shirin_88` signs in and lands on `/en/me` | `docs/validation/U50-walkthrough.md`; test-results.md "Manual checks, 2026-11-09"; ISS-818 | Build and Test (2026-11-09) | Met |
| U50-BR10.4 | U50 clean-clone rehearsal | clean clone to the banner in under 6 minutes with cached images | clone of `main` at `29a2567` to the banner in 146 s with cached images; `/bn`, `/en`, Mailpit 200; rehearsal volumes removed | `docs/validation/U50-walkthrough.md`; test-results.md "Manual checks, 2026-11-09" | Build and Test (2026-11-09) | Met |
| U50-BR10.7 | U50 Bengali body font | the Bengali body font in use on `/bn` is recorded | Nirmala UI (glyph-width probe; `document.fonts.check` is true for all five, ISS-814) | test-results.md "Bengali body font" | Build and Test | Met |
| TR-STEP10 | stage Step 10 | every FR, NFR and AC covered `OK`, or named as deferred | 0 uncovered: 151 covered, 4 verified here, 148 deferred to release 2 by name (8 by the ISS-811 records decision: every citing AC deferred under FD-105), 1 retired, 2 N/A | `cross-unit-traceability.md`, ISS-811 | Build and Test | Met |

Verdict counts: **47 Met, 0 Not Met, 0 Unverified**; no row is Pending. On 2026-11-08 the count was
42 Met, 0 Not Met, 5 Unverified (U50-M3, U50-M4, U50-M5, U50-M6, U50-BR10.4); those five were walked on
2026-11-09. Before the rung-1 fixes: 39 Met, 2 Not Met (TC-UNIT,
TR-STEP10), 6 Unverified; after the first fixes, before ISS-815: 41 Met, 0 Not Met, 6 Unverified.

## Readiness assessment

| Readiness | Assessment |
|---|---|
| Build-ready | **Yes.** The build, the strict typecheck and `pnpm check` are green on `main`. |
| Test-ready | **Yes.** Every functional, integration, browser, accessibility, security and performance suite is green, coverage meets the floor in every package, every unit-scoped command passes as corrected, and the rollback drill passed. |
| Deployment-ready (local demo) | **Yes.** The demo runs from a clean clone in 2 min 26 s, the manual checks M1 to M6 pass, and reset, restart and Ctrl+C behave as specified (ISS-813 closed). Release 1 is not for unrestricted public launch (moderation is release 2, FD-105). |

## Known limitations and outstanding items

- Fixed in this stage's rung-1 fixes: ISS-812 (the LCP-element probe), ISS-815 (Lighthouse's
  `NO_NAVSTART` runs: the origin is opened first, plus a recorded retry of at most 2 per page),
  ISS-810 (U46's coverage command), ISS-809 (stale paths); ISS-811 resolved by the records decision.
- Caveat on ISS-815's fix: opening the origin first leaves an open connection, which Lighthouse's
  simulated throttling may treat as reused, so the medians fell (home about 1225 to about 900 ms).
  The thresholds are unchanged and the earlier figures were within them too; a later harness change
  could open the origin on a separate connection.
- The first experience-page run after the suite's server starts is slow (LCP about 3.8 s, CLS 0.174
  on `/en` r1); the median gate is not affected (ISS-815). The story map's
  "Requirements" rows for FR22, FR43, FR53 to FR57 and FR65 still say release 1.
- Fixed on 2026-11-09: ISS-139, ISS-141, ISS-148, ISS-239, ISS-632 (FD-123: the audit escape hatch
  needs the `rk_maintenance` retention path; the worker loses the encrypted original filename and the
  uploader columns), ISS-704 (better-auth 1.7.18), ISS-817 (`packages/application` declares
  `@types/node`), ISS-818 (`demo:reset` order, found at M6). ISS-813 (manual checks) and ISS-814 (the
  font method is now a width comparison) are closed.
- Open, recorded: ISS-816 (S4): `rk_app` owns the append-only tables, so it could disable their
  triggers; a separate migration-owner role closes it before any deployment.
- Not built in release 1 and named in the traceability file: Firefox, WebKit, Safari/iOS; the 390,
  768 and 1440 px viewports; the search page and its NFR13 gate; everything else FD-105 defers.
- `docs/validation/U50-walkthrough.md` now holds the manual checks, the clean clone, the rollback
  drill and the font check (2026-11-09). The other U50 close-out documents (`RELEASE-1-GATES.md`,
  `current-status.md`, `validation-log.md`, the owner's OR1 to OR7) were not edited; their evidence
  is in `test-results.md`.
