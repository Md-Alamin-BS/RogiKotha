# Functional Design questions — U48 `u48-evidence`

U48 merges T-303 (evidence intake to quarantine) and T-304 (the worker's evidence pipeline) for release 1 (FD-105), narrowed to validate and scan. Every question below was answered by the recommended option, "decided by the agent under the owner's delegation of 2026-11-04". Code Generation adds each decision that changes a requirement, contract or data boundary to `docs/status/decision-log.md` before any code (`project.md` Mandated).

## Settled before this stage (not asked again)

- FD-105 release-1 scope; FD-035 (fail closed); FD-036 (JPEG and PNG only); FD-070 (in-app notices deferred).
- C8 release 1: intake, `getForAuthor`, owner `remove`, the `evidence.process` job (validate and scan, retryLimit 3, 120 s), no public file. On `main` the queue declares `evidence.process` with retryLimit 3 and a 300 s expiry; the design meets C8's 120 s as the handler's own budget under that expiry (Review 01, R-01). C14: the upload route resolves `reviewPublicId`, checks authorship, `404` for a review that is not the actor's. C15: `evidence.received → evidence.process`; `evidence.stateChanged {itemId, reviewId?, state}` without an account id and with no job in release 1. C16: the slots keep their props. C17: `countPublicEvidence(reviewId)`, the binding swap, `PUBLIC_EVIDENCE_STATES` from existing values. C18: 10 files, 15 MB per file, 100 MB per review.
- U47 § 2.1: modules take `Pick<ReviewSeams, …>`; the self-fetching `<EvidenceSection reviewPublicId>` slot and `AuthorEvidence reviewPublicId` mounted in `AuthorTools`.

## Question 1 — Upload limits

C18 and AC7.1.3 name 10 files, 15 MB per file and 100 MB per review. The first dispatch brief and the demo slice on `main` used 10 MB per file and 5 per review.

A. 10 MB per file and 5 per review, total 50 MB (the narrower option).
B. **C18's values: 15 MB, 10 files, 100 MB** (the requirement's values; C18 and AC7.1.3 are binding).
X. Other (please specify)

[Answer]: B — decided by the agent under the owner's delegation of 2026-11-04 — the requirement's values. The earlier answer A came from a mistaken brief and from the demo slice; it is dropped everywhere (ENT-006, BR2.2–BR2.4, BR4.3, the Content-Length cap of 15 MB plus 64 KB, the copy, the tests). With 10 files of up to 15 MB, the 100 MB total can be the first limit hit, so `evidence.total_too_large` keeps its check and gets a test.

## Question 2 — The state that ends the release-1 pipeline

A clean scan must end in an existing `EVIDENCE_STATES` value that means "scanned clean, publishable".

A. **`preview_ready`**: in the full pipeline it means every automatic check passed and the item waits only for the author's privacy step; the demo slice already uses it, so no data changes; `PUBLIC_EVIDENCE_STATES = ['preview_ready', 'published']` (published covers the seeded corpus) (recommended).
B. `published`: misstates release 2's meaning (a processed copy was published) and sits under the retention index.
C. A new enum value such as `scanned`: needs a migration and an FD row.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. T-305 narrows the list to `published` in release 2 (S4 row).

## Question 3 — The fail reason when the scanner stays down

C8 writes `fail_reason scan_unavailable`; `EVIDENCE_FAIL_REASONS` has `scanner_unavailable` (and `scan_unavailable` is a custody event).

A. **Use the existing `scanner_unavailable` value**; C8's wording is read as that value (recommended).
B. Add `scan_unavailable` to the enum.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04.

## Question 4 — "Image decode" in validation without the sanitiser

The decode library arrives with T-305 (deferred).

A. **A structure check in the domain**, no new dependency; ClamAV still scans the bytes (recommended).
B. Add an image library now for a full decode.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. S4 row. Review 01 (R-04) made the check complete, also decided by the agent under the owner's delegation of 2026-11-04: a PNG needs the signature, IHDR first, correct chunk CRCs, and IEND as the last chunk with no byte after it; a JPEG needs SOI, a SOF with width and height 1..20000 before the first SOS, EOI reached by the marker walk, and no byte after EOI (BR4.3).

## Question 5 — Replace, from AC7.1.4

A. **Replace is Remove, then upload again**; the row shows Remove and the uploader stays available (recommended).
B. A separate Replace command.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04.

## Question 6 — Where `reviewPublicId` is resolved

C8 says the route resolves it and passes `reviewId`; BR1.2 wants resolution, authorship and the count check in one transaction.

A. **The command takes `reviewPublicId` and resolves it inside its own transaction** through the seams; the route stays thin (recommended).
B. The route resolves in a read transaction and the command re-checks authorship.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. Contract note on C8. Review 01 (R-11) added a read-only pre-check before the file is written; the transaction still decides (BR2.8).

## Question 7 — Files per request

A. **One file per request**; the uploader sends several files one after another, so a request is at most 15 MB plus form overhead (recommended).
B. Several files per request, streamed with a multipart parser dependency.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. Contract note on C14.

## Adversarial angles (high-risk Unit, 3–5 tests by a separate agent)

A1 a disguised file, a truncated file and polyglots; A2 an oversize file, an eleventh file (also sent concurrently) and a file past the 100 MB total; A3 someone else's review or item; A4 path traversal in the storage key or file name; A5 the scanner down and a worker killed on the last attempt, plus a check that no route serves an original. Details in `functional-spec.md` § 8.

## Review 01 findings

Each decision below was decided by the agent under the owner's delegation of 2026-11-04.

| Finding | Decision | Where |
|---|---|---|
| Limits (not counted by the reviewer) | Question 1 answer B: 15 MB, 10 files, 100 MB; `total_too_large` kept with a test. | ENT-006, BR2.2–BR2.4, BR4.3, WF1, frontend-components.md |
| R-01 job mechanics | The attempt comes from pg-boss's own job metadata: `PgBossQueue.work` fetches with `includeMetadata: true` and passes `{jobId, retryCount, retryLimit, signal}` to the handler; the last attempt is `retryCount >= retryLimit`. Chosen over counting custody events because pg-boss's count also includes attempts that crashed or expired without writing anything, so "last attempt" in the handler matches the moment pg-boss stops retrying. The singleton key is the relay's `evidence.process:<eventId>` (one per item). The expiry stays at the declared 300 s; C8's 120 s is the handler's own budget. `queue-declaration.ts`, `pg-boss-queue.ts`, `registry.ts` and `main.ts` are listed as shared edits. | ENT-011, BR4.1, BR4.6, BR4.9, spec § 2, § 5, § 7, WF2 |
| R-02 end state after a crash or expiry | A retry resumes an item in `validating` or `scanning`; an item past a 3600 s deadline fails `processing_timeout`; a missing file fails `unknown` at once; the last attempt turns any other error into `failed`/`processing_timeout`; a new `evidence.sweep` job every 5 minutes ends whatever no attempt could (a crash or expiry on the last attempt, a relay `outbox.dead`, demo rows). A failed item leaves the counting states, so it frees its slot, and the author sees a final status and Remove. | BR4.2, BR4.9–BR4.11, WF2, WF2b, § 4, § 8 |
| R-03 C16 props | `EvidenceSection({reviewPublicId})` renders only the public note and count; `AuthorEvidence({reviewPublicId})` loads its own list and stays in U47's `AuthorTools`; the WF3 hedge is removed. `EvidenceUploader` keeps `OwnEvidenceList`; its status union only widens (`failed`) and files gain an optional `reasonKey`, which is safe because `AuthorEvidence` is its only caller. | ENT-008, ENT-009, WF3, WF3b, frontend-components.md |
| R-04 structure check | The full PNG and JPEG rules above; truncated files and polyglots are `rejected`/`malformed`; A1 tests them. | BR4.3, § 8 |
| R-05 idempotency order | The idempotency check runs right after authorization and before the count and total, in the pre-check and in the transaction; the retry of the tenth upload is tested. | BR2.5, WF1 |
| R-06 worker grants | Confirmed: 0001 and 0005 cover the job and the sweep; no migration. The wrong comment in `schema/evidence.ts` is corrected at Code Generation. A column-level grant is recorded as an S4 proposal, not a migration now; BR4.8 is held by the repository column list and its test. | BR4.8, spec § 5, § 9, § 10 R2 |
| R-07 relay map | `evidence.received` already routes to `evidence.process`, so nothing is added. U48 is the release-1 publisher of `evidence.stateChanged` and changes its route to `[]`, as C15's release-1 map says. | BR4.12, spec § 6, § 7 |
| R-08 i18n | Reuse `evidence.status`, `label.noDocuments` and `label.notProvided`; the old `ev.status` values and the `ev.upload.done.*`, `pendingNote` and `rejectedNote` copy that describe a scan during the request are changed or deleted in one commit; every new key has its Bengali text. | BR5.3, BR6.4, frontend-components.md § Copy |
| R-09 storage port | Split into `EvidenceFileWriter` (web) and `EvidenceFileReader` (worker), with a container test. | BR3.5, BR3.6, spec § 5 |
| R-10 custody events | Every transition names its exact values, including `removed`, `failed` and `preview_ready` (written after `scan_clean`, as the seed and the demo do). | BR4.4, BR4.7, ENT-003, § 4 |
| R-11 order and rate limit | A read-only pre-check of authorship, idempotency, count and total runs before the file is written; uploads are limited to 30 per account per hour through the existing `RateLimiter`, with `ev.upload.errors.rateLimited`. | BR2.7, BR2.8, WF1 |
| R-12 demo cleanup | All five demo review helpers and `demo/reviews.ts` are listed; at merge a helper is deleted only when a grep shows no caller left, in its own commit followed by `pnpm check`; otherwise it stays for the next Unit, and U50 removes leftovers. | BR8.2, spec § 7, WF5 |
| R-13 hidden reviews | List and removal check authorship and uploader, not publication; the public section still requires a published review; a test covers removal on an unpublished review. | BR1.3, BR5.2, § 8 |

## Assumptions & Open Questions

None.
