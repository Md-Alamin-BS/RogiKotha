## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-08T01:29:00Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | scripts/demo-reset.mjs > reset(), step "Empty the storage folder" (emptyDir on storageDir(root, fileEnv, processEnv)) | The reset deletes everything inside whatever folder STORAGE_ROOT resolves to. Nothing checks that the folder is inside the repository: an absolute STORAGE_ROOT, or one exported in the shell (the process environment wins over .env through effective()), empties that folder, wherever it is. The confirmation question does not name the folder, and --yes skips the question. scripts/__tests__/demo-reset.test.mjs only tests the default and a configured temporary folder; no test refuses a folder outside the repository. The brief asks that the demo scripts never delete user data, and this deletion cannot be undone. | Refuse to empty a storage folder that does not lie under the repository root (or under .data/), and exit 1 naming the folder. Print the resolved folder in the confirmation question and in the step line. Add a demo-reset test that a STORAGE_ROOT outside the repository is refused and nothing is deleted. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u50-release-check/code-generation/traceability.json > coverage NFR13, AC12.3.2, AC12.3.4 | NFR13 is marked OK, but code-summary.md says pnpm e2e:perf has not run yet, and ISS-756 records that lighthouse-flow.ts and nfr13.spec.ts were written without a browser run. AC12.3.4 (the rollback drill) and the stopped-scanner and stopped-mail cases of AC12.3.2 are also only planned for Build and Test. OK reads as proven, but nothing has measured or exercised these yet. | Mark NFR13 and AC12.3.4 Deferred, with Build and Test as the target (or note "pending first run" in the target), and make sure the Build and Test record carries the first e2e:perf result, the rollback drill and the two stopped-service walks. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u50-release-check/code-generation/code-summary.md > "What was built", bullet "Removed" | The record says U50 removed "the orphan topics.int.test.ts". Commit 039b326 contains no such deletion. git log shows the file was deleted by U46 (commit 153a65c). The other removals (not-built.ts, smoke/demo.spec.ts, isUsernameTaken, removeAuthUserWithoutProfile) are in the diff, and a repository-wide search finds no caller left. | Remove topics.int.test.ts from U50's removal list, or say it arrived already deleted through the merge of main. | New |
| R-04 | Minor | DEMO.md > task table, row "Start again without rebuilding" | That row points the presenter to pnpm demo:serve. demo.mjs skips the Services and Data steps when it runs as serve, so after the documented stop (Ctrl+C, then pnpm demo:down) demo:serve starts the web app and the worker against stopped containers. The presenter then sees only a health warning after 120 s. pnpm demo --no-build is the restart that brings the containers back. | Point the row to pnpm demo --no-build, or say that demo:serve needs the containers running (after Ctrl+C without demo:down). Another option is to let serve start the compose services and wait for them. | New |
| R-05 | Minor | package.json > scripts demo:down and demo:logs | demo.mjs passes -p RK_COMPOSE_PROJECT to every compose call when that variable is set in .env or the shell. demo:down and demo:logs run docker compose without it, so with a project name set they stop or follow a different compose project from the one pnpm demo started. | Run demo:down and demo:logs through demo.mjs (or a small wrapper) that applies the same composeArgs(project), or document that RK_COMPOSE_PROJECT is not supported for the demo. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| pnpm -s typecheck | exit 0, every package, including apps/web tsc -p e2e | The suite and the product changes type-check |
| pnpm -s lint | exit 0, 0 errors, 1 warning in packages/i18n/src/routing.ts | The warning comes from main, as the gate record says; U50 adds none |
| pnpm -s i18n:check | passed, 993 keys, both locales | Matches the recorded figure; no hard-coded copy added by the fixes |
| vitest --project tooling scripts/__tests__ (demo, demo-reset, wait-for) | 3 files, 46 tests passed | Production refusal, port conflicts, env generation, seed-if-empty and the reset order are tested; the storage-folder confinement is not (Major finding) |
| vitest --project web, the 10 changed or added test files plus components/patient/comments | 14 files, 234 tests passed | Health probes (fake sockets, timeouts, ok without the scanner), the RouteTransition store, ThemeControls without aria-pressed, the AccountControl sheet closing and the DeleteCommentButton announcement all pass |
| playwright test --list (the four pnpm e2e projects) | 231 tests: chromium-360 72, chromium-desktop 121, chromium-reduced-motion 32, log-scan 6; journeys 64 bn and 64 en | Matches the 231 and 64/64 claims in code-summary.md and RELEASE-1-GATES.md; every storyboard row of functional-spec WF2 (P1.0 to P4.15b) appears in both locales at both widths |
| Search for skip, fixme, soft, expect(true) and similar in apps/web/e2e | 1 hit, a swallowed view-transition promise in helpers/motion.ts that only waits before the cover check | No test that cannot fail. checkPage asserts visibility before the motion and cover checks, so a missing demo marker fails |
| Identity search of the lines added by 039b326 (outside aidlc/ and the lockfile) | Only the forbidden-word pattern in e2e/helpers/mailpit.ts and the gate row that describes it | No tool or model identity in the diff |
| Search for callers of the removed symbols and scripts (isUsernameTaken, removeAuthUserWithoutProfile, NotBuiltYet, smoke:e2e) | No code, config or CI hit | The deletions leave no caller |
| ISSUES.md rows ISS-750 to ISS-803 and ISS-778 | Every S1 and S2 row reads fixed (ISS-759 keeps the dist/main.js gap on ISS-193, S4, open) | No open S1 or S2 blocks Build and Test or the phase gate; the record is consistent |

### Summary

U50 is implementable and largely holds up. The suite proves the release-1 storyboard in both languages at 360 px and on desktop, with structural no-rating, overflow, motion, CSP and log-scan checks that can fail. The product fixes are small and hard-rule compliant. Production is refused in every demo and e2e entry point, no Docker volume is deleted, and the records do not overclaim the owner's boxes. One Major should be weighed before approval: demo:reset empties whatever folder STORAGE_ROOT names, with no check that it is inside the repository. The rest are record and presenter-doc accuracy points.
