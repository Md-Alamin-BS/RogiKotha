## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-06T10:48:38Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-summary.md > Gate (lines 94-122) and Final i18n keys (line 22) | The only recorded gate run is from before the rebase. It reports i18n parity of 890 keys. Main after 153a65c has 913 keys (902 before U46, plus U46's 11), so that run did not cover U9's and U11's merged code. The merge-time runs are not recorded: the gate on the rebased branch, the one that caught the S1 brace loss ISS-516, and the `pnpm check` on `main` after the squash (team step 6). The record says this comparison comes at merge, but the merge has happened and nothing was written. Without it, the gate claims describe code that is not what landed. | Record the gate on the rebased branch and the `pnpm check` and `pnpm smoke` run on `main` after the squash: date, exit codes, test and file counts, parity count, migration count and per-package coverage. If they were not run, run them now on `main` before Build and Test. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-summary.md > Issues table (lines 66-86) | The table stops at ISS-515 and omits ISS-516 (S1, the dropped closing brace in patient.css, found and fixed in U46). The "Found and fixed in this Unit" line also omits it. The team rule requires each Unit's record to list the ISS ids found and fixed in it. I confirmed patient.css is intact on main: braces balance to depth 0 and the U46 block is complete. | Add ISS-516 to the table and to the found-and-fixed list. | New |
| R-03 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-summary.md:46 and source-manifest.json:346, :397 | The summary and the manifest list `packages/database/src/reset.ts` and `global-setup.ts` as changed by U46. Commit 153a65c does not touch either file. Both landed with U11 in a135232; U46 changed only one line of `reset-guard.int.test.ts`. Also, `apps/web/src/components/patient/directory.smoke.test.tsx` sits outside U46's owned subfolders but is missing from the outside-owned-paths table. A reviewer who trusts the manifest would check the wrong diff. | Remove reset.ts and global-setup.ts from the manifest. In the summary row, say the reset-guard change merged with U11 and U46 kept only the test line. Add the smoke test file to the outside-owned-paths table. | New |
| R-04 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-generation-plan.md:54 > Step 1 | Step 1 is ticked, but it asks for baseline counts and the per-package coverage table to be recorded. code-summary.md:122 admits they were not. So there is no "before" figure to compare coverage against, and the 80% floor cannot be shown to have held from the baseline. | Mark Step 1 as partly done with a dated note. Take the before figure from the `pnpm check` coverage on main at a135232, the parent of the squash, and record it next to the after table. | New |
| R-05 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/code-generation/code-generation-plan.md:69 > Step 10, and code-summary.md:85 > ISS-514 | Step 10 says that if the FD-101 `explain` shows a scan per row, the expression index goes into the same migration. That check was never run. 0011 is now merged and migrations only move forward, so that option is gone. ISS-514 still points to Build and Test without saying what the fix would be. | Update ISS-514: if Build and Test's `explain` on the topic index and condition totals shows a scan per row, the index goes in a new migration (the next free number after 0011) with its pin updates, owned by a named Unit. | New |
| R-06 | Minor | packages/application/src/modules/directory/index.ts:31 and apps/web/src/server/container.ts:55, :140 | `addMemberDoctor` (FD-100) does no authorization of its own. By design (WF11, BR5.8) it trusts U47's publish to check verified and not restricted first. But it is published on the shared `WebContainer.directory` object next to the public queries. Any future server action can create a published doctor and a pending submission for any account id, with no auth check and no rate limit. The design contract matches the code, so this is a hardening gap, not a defect. The same applies to `ensureProvisionalTerm`. | Keep `addMemberDoctor` off the public `directory` surface: pass the operation only into U47's review factory. Or have U47's publish tests and U50's release check assert that no route or action other than `review.publish` calls it. Record the choice as an ISS row or in C7. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `pnpm typecheck` (on main after 153a65c) | PASS, all workspace packages | No broken imports or types left by the demo deletions |
| `pnpm lint:boundaries` | PASS (fixture: 18 expected violations found) | Boundary rules active; changed files hold the dependency direction (components import no database, adapters or node modules outside test support) |
| vitest, U46 non-database projects (directory, taxonomy, domain, contracts hue, web patient components, doctor-filters) | PASS, 53 files, 503 tests | The rules that live in code and components hold on main |
| en/bn parity script | PASS, 913 keys each, no missing key either side | Full parity; U46 keys present in Bengali with placeholders for active-language numerals |
| patient.css brace balance (comments stripped) | PASS, final depth 0, never negative | ISS-516 fix holds; U46 block complete |
| Migration chain | PASS: 0011 follows 0010_identity_constraints; journal idx 11; snapshot prevId equals 0010 id; pins raised to 12 | Numbering and drizzle chain sound |
| Search for callers of deleted demo code | PASS: only hits are the T-201 dead stubs (`repositories/directory.ts`, `fakes/repositories.ts`, F9/ISS-507) and a fake-module test in `server/data.test.ts` | No caller left |
| Manifest vs commit diff | 2 manifest paths not in commit (reset.ts, global-setup.ts); bracketed routes listed in code-summary | See Minor finding |
| Identity scan of commit diff and author/committer | PASS: human identity only, no tool or model identity or trailer | Clean |
| Integration tests (database) | Not run (DB-backed, shared test DB) | Relied on recorded results plus the presence of query-level tests: facility isolation (review-reads.int.test.ts:91), merged/unpublished doctor (:176), two-connection addMemberDoctor race (directory-module.int.test.ts:236) |

### Summary

The code holds every product hard rule I checked:
- The facility feedback is kept apart structurally: separate `facility_reviews` table, never read by doctor or condition aggregates, with a query-level test.
- No percentage, score or rating, and no "highest rated" sort.
- A missing value renders as "Not provided" or "No documents".
- "Registration not verified" appears on every doctor without a condition.
- "Limited data" is based on account counts.
- Exact counts are shown with their denominators, in active-locale numerals.
- Lists are ordered neutrally.
- The rest checks out too: the C17 port and its interim binding match the contract, migration 0011 chains correctly after 0010, and the demo deletions left no caller.

The main gap is in the records, not the code: the recorded gate predates the rebase onto U9 and U11, and the post-merge `pnpm check` on `main` is not recorded.
