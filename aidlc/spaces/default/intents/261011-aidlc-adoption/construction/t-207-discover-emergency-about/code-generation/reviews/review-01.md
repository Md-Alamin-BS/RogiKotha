## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-06T12:43:25Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | apps/web/src/app/[locale]/(patient)/page.tsx > settle(), line 41 | When a home list fails, the warning names only the section (in `kind`) and the correlation id. The cause is thrown away: neither the `err` code nor the thrown exception is logged, so a database outage on the home shows up as three bare warnings with nothing to diagnose it from. The ASSUMPTION says no field fits, but the closed `LogFields` port (packages/application/src/ports/logger.ts:11 and :14) already has `command` ("a command or query name") and `errorCode`. | Log the query name in `command` (for example `taxonomy.listConditions`) and the cause in `errorCode` (the `err` code, or a fixed `thrown` value for a rejected promise). Log a throw at `error` level. Then update the ASSUMPTION comment and ISS-604. No port change is needed. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-207-discover-emergency-about/code-generation/code-generation-plan.md > Step 21 acceptance row "Failure" (line 93) | The row records "the log line has only `section` and `correlationId`" as observed as expected. The code logs `kind`, not `section` (page.tsx:41, ISS-604). The expected-against-observed record does not match what the code does. | Reword the observed result: the event carries `kind` (the section name) and `correlationId`, a recorded deviation under ISS-604. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-207-discover-emergency-about/code-generation/code-summary.md > Issues, line 77; code-generation-plan.md > Step 22 note (line 108) | Both records say ISS-600 to ISS-606 are working numbers to be "renumbered at merge". The squash commit a77d70a merged them unchanged, so `main` now has a gap from ISS-517 to ISS-599. The records no longer describe what happened. | Leave the numbers as they are, because they are already referenced on `main`. Change both notes to say the ISS-600 to ISS-606 numbers are final and the gap is left for U47. | New |
| R-04 | Minor | apps/web/src/app/not-found.tsx > main, lines 17-24 | The root 404 for URLs outside any locale links only to the home pages. The patient 404 deliberately keeps emergency help one link away (BR3.3 comment in (patient)/not-found.tsx), but a reader on this fallback has no link to emergency help. | Add a link to `/en/emergency` on the en line and `/bn/emergency` on the bn line, using the existing `nav.emergency` key from each dictionary, and extend root.test.tsx to cover it. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| vitest (web project, U20-area files: home/, Emergency, About, Policy, fd-022 tests, both smoke files, home-page, not-found, catch-all, emergency, root, pages tests) on main at a77d70a | PASS: 16 files, 352 tests | Confirms that the code-summary test claims hold for the Unit's area |
| pnpm i18n:check | PASS: 919 keys, both locales | Matches the parity count of 919 in code-summary; all six new keys exist in en and bn |
| tsc --noEmit on apps/web | PASS (no output) | No type errors after the ViewName and contracts-barrel changes |
| git grep for the deleted home/ExperienceRow, home/EmergencyPanel, home/format, DiscoverVM and view-models/discover | No importer left | The deletions leave no caller. The remaining `ExperienceRow`, `DemoReviewCard` and `listRecentPublishedReviews` references belong to the experiences page (experience/ExperienceRow.tsx), not the deleted home files |
| Commit identity scan (author, committer, message, added lines) | PASS | Only the human's own git identity is used, and no trailer is present. The one model-name line (T-207 task file:153) is pre-existing T-207a history from fcab15b, not added by U20 |
| Hard-rule scan of the added lines (rating, score, stars, percent, average) | PASS | No quality number. Browse counts are filtered to at least 1, a zero teaser count renders `facility.noVisits`, and no figure appears when feedback is hidden |

### Summary

The code matches the plan and design. All of these hold: the home reads only U46's queries and the ConfigProvider, the shared emergency panel (999, 16263, crisis line, last-verified date, tel: links, data-static) sits directly after the opener, the disclaimer note and the layout's demo marker stay, ordering is neutral, there is no 0 and no rating, Bengali digits come from the formatters, there is no hard-coded copy, the deletions leave no caller, and every file outside the owned paths is recorded. The remaining points are minor: the failure log loses its cause, two records are inaccurate, and the root fallback has no emergency link.
