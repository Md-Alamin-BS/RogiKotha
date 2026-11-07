## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-11-07T18:31:16Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u48-evidence/code-generation/code-summary.md > Sign-off | U48 is a high-risk Unit (evidence). The project's Mandated rule asks for the owner's own written sign-off for such Units, but the sign-off here was written by the agent under the 2026-11-04 delegation. Nothing asks the owner to sign later either: `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` mentions U48 only in row 107, about demo-code deletion. U8 has a row that says "owner sign-off needed before the phase gate" (row 102); U48 has no such row. Only the Bengali copy (ISS-640) is queued for the owner. | Before the phase gate, either add your own written sign-off line under Sign-off, or add a U48 row to `OWNER-REVIEW-QUEUE.md` marked "owner sign-off needed before the phase gate" that names A1 to A5, ISS-620 and ISS-621. | New |
| R-02 | Minor | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u48-evidence/code-generation/code-summary.md > Sign-off > Open ISS rows and Verdict | The sign-off says ISS-621 (S2, the worker's storage root) is still open and is the only remaining break. The "Merge with main" section and the ISS-621 row in `docs/implementation/ISSUES.md` both record it as fixed at merge (`resolveStorageRoot` in `apps/worker/src/env.ts`). So the sign-off does not cover the merge-time fix or the gate run after the merge (338 files, 3961 passed). | Update the sign-off so it states that ISS-621 is fixed at merge, names the post-merge gate counts, and says whether the sign-off covers the merge-time change in `apps/worker/src/env.ts`. | New |
| R-03 | Minor | packages/i18n/messages/bn.json > `ev.status.pending`, `ev.status.failed`, `ev.reason.couldNotCheck`, `ev.reason.malware`, `ev.upload.checking`, `ev.upload.hint` | The Bengali copy renders "checked" as যাচাই. The same word carries the hard-rule wording elsewhere: `evidence.status` "কাগজপত্র যুক্ত — চিকিৎসাগতভাবে যাচাই করা হয়নি" and "রেজিস্ট্রেশন যাচাই করা হয়নি". An author who sees "যাচাই হচ্ছে" and then "যুক্ত হয়েছে" can read it as "being verified" and then "attached as verified", which comes close to the rule that evidence is never described as verified. The English ("Being checked", "Attached") is fine. ISS-640 already queues the Bengali for the owner, but it does not name this risk. | Add this risk to ISS-640 / the owner review queue. At the U50 copy review, consider a word for the malware check that is not used for verification, for example স্ক্যান or পরীক্ষা. | New |
| R-04 | Minor | packages/application/src/modules/evidence/jobs/process-evidence.ts > `processEvidence` deadline branch | BR4.9 says an item past `EVIDENCE_PROCESSING_DEADLINE_SEC` goes to `failed` with `processing_timeout`. The code uses `sweepReason(facts.latestCustody)`, so it can record `scanner_unavailable` instead. The code comment explains the choice, but there is no `ASSUMPTION(U48)` marker and no ISS row. The author sees no difference, because both reasons map to `ev.reason.couldNotCheck`. | Either make the deadline branch use `processing_timeout` as BR4.9 says, or mark it `ASSUMPTION(U48)`, record an S4 ISS row, and amend BR4.9 to say the reason follows the latest custody event, as in BR4.11. | New |
| R-05 | Minor | packages/application/src/modules/evidence/commands/intake-evidence.ts > lock before `existingForKey` (ISS-620 fix) | `evidence_items.idempotency_key` is unique across the whole table, but the advisory lock covers only one review. Two requests with the same key sent at the same instant for different reviews hold different locks, so both pass `existingForKey`. The second insert then breaks the unique index and the route answers `500 evidence.upload_failed` (its file is deleted), when BR2.5 asks for `not_found`. Only a crafted client can trigger this, and nothing leaks, but ISS-620 fixed only the same-review case. | Map a unique-violation on the idempotency key inside intake to `not_found`, or re-read the key after the conflict, with a test. If you defer it, add an S4 ISS row. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `pnpm -s typecheck` | PASS (exit 0, every package) | No type errors on merged `main` |
| `pnpm -s lint` | PASS (0 errors, 1 warning) | The one warning is the known unused disable directive in `packages/i18n/src/routing.ts`; U48 did not cause it |
| `pnpm -s i18n:check` | PASS: 993 keys, both locales, no placeholder or ERROR_CODES mismatch | Bengali/English parity holds for every new `ev.*` and `errors.evidence.*` key |
| `vitest --project application --project domain --project adapters` over the evidence module, domain evidence, `storage-fs` and `scanner-clamd` | PASS: 15 files, 288 passed, 1 skipped | The unit-level A1, A3 and A5 tests and the adapter fail-closed tests run green. The database, web-int and worker-int projects were not run, as the brief instructed |
| Source manifest against `git show a9a2ffe --name-status` (non-deleted, outside `aidlc/`) | PASS: no difference either way | Every written path is claimed; the deleted files are left out as the summary states |
| Commit identity scan (author, committer, message and diff for tool or model names and trailers) | PASS | Author and committer are the human's identity; no trailer or tool name. "a separate agent" appears only as a role description |

### Summary

The design holds up architecturally, and the hard rules are kept in the code:
- **Fail closed:** any scanner reply other than an exact OK or FOUND is `unavailable`. The item stays `scanning`, is never in `PUBLIC_EVIDENCE_STATES`, and ends `failed` on the last attempt or through the sweep.
- **Originals:** the web tier gets a writer only, and no route reads an original.
- **Storage keys:** keys are random 32-hex values checked against the root, so a file name never reaches a path.
- **Transactions and privacy:** custody, outbox and audit rows are written in the same transaction as the state change, and the worker's SQL leaves out the sealed file name and the uploader's account.
- **Adversarial tests:** they exercise what they claim, on the real route, container and repository.

The main item for you before approving is that the high-risk sign-off is delegated and agent-written, with no queue row asking for your own sign-off. The rest are minor: correcting the sign-off text, a Bengali wording risk around যাচাই, a small difference from BR4.9, and a cross-review idempotency race that answers 500.
