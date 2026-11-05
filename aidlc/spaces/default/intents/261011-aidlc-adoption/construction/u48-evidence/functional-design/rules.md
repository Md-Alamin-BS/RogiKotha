# Business rules — U48 `u48-evidence` (release 1)

The YAML block is the source of truth. The summary table after it is a derived view. Rule IDs are frozen once this design is approved (`project.md` Corrections). Release-1 scope (FD-105): upload of JPEG and PNG images to the author's own published review into private quarantine, the worker's `evidence.process` job (validate, then scan, fail closed), a sweep that ends any item the job could not finish, the author's own list and removal, and the public note with the count. Sanitise, re-encode, preview, redaction, the viewer and retention are release 2. Review 01 changed BR1.3, BR2.2–BR2.5, BR3.5, BR4.1–BR4.6, BR5.3, BR6.1–BR6.4 and BR8.2, and added BR2.7, BR2.8, BR3.6 and BR4.9–BR4.12 (see `functional-design-questions.md` § Review 01 findings).

```yaml
rules:
  # BR1 — Authorization
  - id: BR1.1
    statement: "Only a signed-in account with a confirmed email may upload evidence."
    category: authorization
    applies_to: "POST /api/evidence/upload, evidence.admitUpload, evidence.checkUpload, evidence.intake"
    trigger: "Every upload request, before the body is read"
    logic: "requires {authenticated, verifiedEmail} through defineCommand; IF signed out THEN 401; IF unconfirmed THEN 403"
    violation: "401 or 403; nothing is read or stored"
    source: "C8 release 1 (requires verified), C14 release-1 amendment"
  - id: BR1.2
    statement: "Evidence attaches only to the actor's own published review, resolved from reviewPublicId."
    category: authorization
    applies_to: "evidence.checkUpload, evidence.intake"
    trigger: "Every upload: once in the read-only pre-check (BR2.8), again inside the intake transaction"
    logic: "reviewId = review.reviewIdForPublicId(tx, {publicId}); IF reviewId is null OR NOT review.isReviewAuthor(tx, {reviewId, actor}) OR NOT review.isReviewPublished(tx, {reviewId}) THEN not_found; a malformed, unknown, unpublished or someone else's review answers the same"
    violation: "404 not_found; in the pre-check nothing has been written; in the transaction the quarantined file written for this request is deleted (BR3.4)"
    source: "C8 release 1, C9 seams, C14 amendment, FR60"
  - id: BR1.3
    statement: "The author's list and removal touch only items the actor uploaded on a review the actor wrote, whether or not that review is still published."
    category: authorization
    applies_to: "evidence.getForAuthor, evidence.remove"
    trigger: "Every call"
    logic: "requires {authenticated, verifiedEmail}; reviewId = review.reviewIdForPublicId (list) or the item's review_id (remove); IF reviewId is null OR NOT review.isReviewAuthor(tx, {reviewId, actor}) OR the item's uploaded_by_account_id is not Actor.accountId THEN not_found; isReviewPublished is NOT checked here, so an author can still list and remove their own evidence on a hidden or unpublished review; the public projection still requires published (BR5.2, BR5.5)"
    violation: "getForAuthor returns null (the page renders no author list); remove answers not_found and changes nothing"
    source: "C8 release 1 (getForAuthor, remove by owner), FR66, review 01 R-13"

  # BR2 — Intake validation (web tier, before anything expensive)
  - id: BR2.1
    statement: "Only JPEG and PNG images are accepted, and the file's extension, declared MIME type and magic bytes must agree."
    category: validation
    applies_to: "POST /api/evidence/upload"
    trigger: "After the form is parsed, before the pre-check and before anything is written to disk"
    logic: "IF extension NOT IN {.jpg, .jpeg, .png} OR declaredMime NOT IN {image/jpeg, image/png} OR the magic bytes (PNG: the 8-byte signature followed by an IHDR chunk header; JPEG: SOI FF D8 followed by a marker byte FF) do not match declaredMime OR the extension does not match declaredMime THEN evidence.type_rejected; the full structure check is the worker's (BR4.3)"
    violation: "400 evidence.type_rejected; nothing is written"
    source: "FR60, FR62, FD-036, AC7.1.2"
  - id: BR2.2
    statement: "One file is at most 15 MB and is never empty."
    category: validation
    applies_to: "POST /api/evidence/upload, EvidenceFileWriter.putQuarantined"
    trigger: "After the form is parsed (the file's size) and again while the file is written to quarantine (a byte counter)"
    logic: "IF size > EVIDENCE_MAX_FILE_BYTES (15 728 640) THEN evidence.too_large; the writer's counter stops the write above the same limit and returns too_large; IF size = 0 THEN evidence.type_rejected (no image); U41's Content-Length cap is EVIDENCE_MAX_FILE_BYTES + 64 KB (15 794 176 bytes) and refuses a larger request before its body is read"
    violation: "400 evidence.too_large, with the limit named in the message; a partial file is deleted"
    source: "FR61, C18, AC7.1.3, Q1 (answer B)"
  - id: BR2.3
    statement: "A review holds at most 10 counting items; the check and the insert are serialised per review."
    category: constraint
    applies_to: "evidence.checkUpload (advisory), evidence.intake (authoritative)"
    trigger: "In the pre-check, and inside the intake transaction after the idempotency check (BR2.5) and before the insert"
    logic: "intake takes a transaction-scoped lock keyed on reviewId; count items of the review in COUNTING_STATES {quarantined, validating, scanning, preview_ready, published}; IF count >= EVIDENCE_MAX_PER_REVIEW (10) THEN evidence.too_many; failed, rejected and removed items do not count"
    violation: "400 evidence.too_many, with the limit named; in the transaction the quarantined file is deleted"
    source: "FR61, C18, AC7.1.3, Q1 (answer B)"
  - id: BR2.4
    statement: "The counting items of a review and the new file together stay at or below 100 MB."
    category: constraint
    applies_to: "evidence.checkUpload (advisory), evidence.intake (authoritative)"
    trigger: "Right after BR2.3, in the pre-check and in the intake transaction"
    logic: "IF sum(original_bytes of the review's counting items) + this file's bytes > EVIDENCE_MAX_TOTAL_BYTES (104 857 600) THEN evidence.total_too_large; 10 files of 15 MB exceed 100 MB, so this limit can be the first one hit (for example six 15 MB files and a seventh)"
    violation: "400 evidence.total_too_large, with the limit named; in the transaction the quarantined file is deleted"
    source: "C8 errors, C18, AC7.1.3, Q1 (answer B)"
  - id: BR2.5
    statement: "A repeated upload with the same idempotency key returns the first item and stores nothing new, even when the review has since reached a limit."
    category: constraint
    applies_to: "evidence.checkUpload, evidence.intake"
    trigger: "Right after authorization (BR1.2) and before the count and total checks (BR2.3, BR2.4), in the pre-check and in the transaction"
    logic: "IF an item with idempotency_key = input.idempotencyKey exists for this actor on this review THEN return {itemId, state} of that item; in the pre-check the file is never written; in the transaction the file just written is deleted; the key is a client-generated UUID, required; a key owned by another account, or by this account on another review, answers not_found"
    violation: "none (answers 200 with the existing item)"
    source: "C8 IntakeEvidenceInput.idempotencyKey, evidence_items.idempotency_key unique, review 01 R-05"
  - id: BR2.6
    statement: "The uploaded file name is kept private: only its last path segment, trimmed, at most 200 characters, sealed before storage, and never logged or returned except to its author."
    category: policy
    applies_to: "evidence.intake, evidence.getForAuthor, every log line"
    trigger: "Intake and author list"
    logic: "name = last segment after / or \\, trimmed, cut to 200; store sealed in original_filename_enc; an unreadable seal shows label.notProvided to the author"
    violation: "a filename in a log, event payload, view model for anyone but the author, or the storage key is a defect (S1)"
    source: "FR68, NFR8, AC7.1.6, 02-data-model.md §7"
  - id: BR2.7
    statement: "An account may send at most 30 upload requests per hour."
    category: constraint
    applies_to: "evidence.admitUpload (commands/admit-upload.ts), RateLimiter port (C19)"
    trigger: "Every upload request, after BR1.1 and before the body is read"
    logic: "rateLimiter.hit('evidence.upload:account:<accountId>', EVIDENCE_UPLOAD_LIMIT (30), EVIDENCE_UPLOAD_WINDOW_SEC (3600)); every request counts, refused ones too; IF NOT allowed THEN evidence.rate_limited with retryAfter; in memory per process (C18 rules)"
    violation: "429 evidence.rate_limited, messageKey ev.upload.errors.rateLimited with {minutes} = ceil(retryAfter / 60); nothing is read or stored"
    source: "review 01 R-11, C18 module constants, C19 RateLimiter"
  - id: BR2.8
    statement: "A read-only pre-check refuses a foreign or full review, and answers an idempotent repeat, before the file is written to disk; the intake transaction repeats every check because the pre-check is not serialised."
    category: constraint
    applies_to: "evidence.checkUpload (commands/check-upload.ts)"
    trigger: "After the form is parsed and BR2.1 and BR2.2 pass, before EvidenceFileWriter.putQuarantined"
    logic: "in unitOfWork.read: BR1.2, then BR2.5 (an existing item is answered at once and the body is never written), then BR2.3 and BR2.4 with the parsed file's size; the parsed body is held in memory only, bounded by U41's cap (BR2.2) and BR2.7; two concurrent uploads may both pass, and the per-review lock in the intake transaction decides"
    violation: "the same answers as BR1.2, BR2.3 and BR2.4, with nothing written"
    source: "review 01 R-11"

  # BR3 — Quarantine storage
  - id: BR3.1
    statement: "Each original is stored under a new random key of 128 bits written as 32 lowercase hex characters, never derived from the file name or any user input."
    category: constraint
    applies_to: "storage-fs adapter (EvidenceFileWriter.putQuarantined)"
    trigger: "Every write"
    logic: "key = 16 random bytes as hex; write with exclusive create so an existing key is never overwritten"
    violation: "a collision fails the write (programmer error path, logged, upload answers evidence.upload_failed)"
    source: "FR62, unit-of-work.md U48, demo storage.ts"
  - id: BR3.2
    statement: "Every path the storage adapter opens is the evidence root joined with a key that matches the 32-hex pattern and resolves inside the root."
    category: validation
    applies_to: "storage-fs adapter (put, read, delete)"
    trigger: "Every path resolution"
    logic: "IF key does not match ^[0-9a-f]{32}$ OR the resolved path is not inside the resolved root THEN throw (programmer error); no other method builds paths"
    violation: "the operation throws, nothing is read, written or deleted"
    source: "FR62, adversarial angle A4"
  - id: BR3.3
    statement: "The evidence root lies outside the web app and its public folder, and files are readable and writable by the server user only."
    category: policy
    applies_to: "storage-fs adapter, infra/compose/.env.example (EVIDENCE_STORAGE_DIR)"
    trigger: "Root creation and every write"
    logic: "root = EVIDENCE_STORAGE_DIR or <repo>/var/evidence; directory mode 0700, file mode 0600; the web and worker processes share it"
    violation: "a root inside apps/web or its public/ folder fails start-up"
    source: "FR65, NFR3, demo storage.ts"
  - id: BR3.4
    statement: "A file written for an upload that then fails (any refusal or a failed transaction) is deleted; a delete of a missing key is not an error."
    category: constraint
    applies_to: "evidence.intake"
    trigger: "Any error after the write started"
    logic: "on refusal or rollback: files.delete(key); a failed delete is logged with the error class only and left on disk (S4 row, functional-spec.md § 9)"
    violation: "an orphan file on disk"
    source: "construction.md Error Handling, demo action storeScanAndRecord"
  - id: BR3.5
    statement: "No route, page, action or job ever sends an original's bytes to a client; the original artifact row is never public."
    category: policy
    applies_to: "apps/web, apps/worker, evidence_artifacts"
    trigger: "Always"
    logic: "the web tier holds only EvidenceFileWriter, which has no read method (BR3.6); EvidenceFileReader.readQuarantined is wired only into the worker's processor; evidence_artifacts kind original keeps public = false (database CHECK evidence_artifacts_original_not_public_check)"
    violation: "any response carrying original bytes is S1"
    source: "FR65, C8 public_display, hard rule (originals never public), review 01 R-09"
  - id: BR3.6
    statement: "The storage port is split: the web tier gets a writer with no read method, and only the worker gets the reader."
    category: constraint
    applies_to: "packages/application/src/ports/evidence-storage.ts, packages/adapters/src/storage-fs/, apps/web/src/server/container.ts, apps/worker/src/container.ts"
    trigger: "Composition"
    logic: "EvidenceFileWriter {putQuarantined, delete} is built by createFsEvidenceWriter(root) and passed to createEvidenceModule in the web container; EvidenceFileReader {readQuarantined, delete} is built by createFsEvidenceReader(root) and passed to createEvidenceProcessor and the sweep in the worker container; neither factory returns an object with the other's methods"
    violation: "a web-tier object exposing readQuarantined fails the container test (S1 if it reached a route)"
    source: "review 01 R-09, BR3.5"

  # BR4 — The evidence.process job and the sweep (worker)
  - id: BR4.1
    statement: "Intake appends evidence.received {itemId} in its transaction; the relay's existing map entry routes it to evidence.process with the relay's own singleton key evidence.process:<eventId>."
    category: policy
    applies_to: "evidence.intake, apps/worker/src/handlers/outbox-relay.ts (RELAY, jobKey), packages/database/src/queue/queue-declaration.ts"
    trigger: "Intake commit"
    logic: "outbox evidence.received {itemId} with the internal item id; RELAY['evidence.received'] = ['evidence.process'] already exists on main, so U48 adds no relay entry; job data is the C15 envelope {eventId, name, payload: {itemId}}; singletonKey = jobKey('evidence.process', eventId) = evidence.process:<eventId>, which is one key per item because intake appends exactly one evidence.received per item and an idempotent repeat appends none; queue policy exclusive, retryLimit 3 (four attempts), retryDelay 10 s with backoff, expireInSeconds 300, all from QUEUE_DECLARATION"
    violation: "an item with no job stays quarantined (fails closed) until the sweep ends it (BR4.11)"
    source: "C15 release-1 relay map, C8 job, queue-declaration.ts, review 01 R-01"
  - id: BR4.2
    statement: "Every state change of the job and the sweep is a compare-and-set from the state just read; a removed or already finished item ends the job without change."
    category: constraint
    applies_to: "evidence.process, evidence.sweep"
    trigger: "Each transition"
    logic: "UPDATE ... SET state = to, updated_at = now() WHERE id = itemId AND state = from; IF no row changed THEN stop and succeed (another attempt, the sweep or a removal got there first); a rerun never moves an item backwards; a retry that finds the item in validating or scanning resumes from that state as BR4.9 says, and does not try the quarantined -> validating transition"
    violation: "none"
    source: "C15 (jobs idempotent), demo markScanResult, review 01 R-02"
  - id: BR4.3
    statement: "The worker re-validates the stored bytes before scanning: the sha256 matches, the size is within the limit, the magic bytes match the detected type, and the whole file has a complete PNG or JPEG structure with nothing after its end."
    category: validation
    applies_to: "evidence.process, packages/domain/src/evidence/file-type.ts (imageStructureValid)"
    trigger: "Every attempt, before scanning (also when the attempt resumes an item in scanning)"
    logic: "IF sha256 differs THEN rejected malformed; IF size > EVIDENCE_MAX_FILE_BYTES (15 728 640) THEN rejected too_large; IF magic bytes disagree with detected_mime THEN rejected type_mismatch; IF imageStructureValid fails THEN rejected malformed, where PNG requires: the 8-byte signature; IHDR as the first chunk with length 13 and width and height 1..20000; every chunk's length within the file and its CRC-32 over type and data correct; at least one IDAT; IEND as the last chunk with length 0; and no byte after IEND's CRC; and JPEG requires: SOI FF D8 at offset 0; a marker walk that skips each segment by its length (so an EXIF thumbnail's inner SOI and EOI are never read as markers); a SOF marker (C0-C3, C5-C7, C9-CB, CD-CF) with height and width 1..20000 before the first SOS; at least one SOS; EOI FF D9 reached by the walk; and no byte after that EOI; a truncated file (no IEND or no EOI) and a polyglot (any bytes after IEND or EOI) are therefore malformed"
    violation: "rejected with the reason; the original file is deleted; custody validation_failed with {failReason}"
    source: "FR60, FR62, C8 release-1 job (validate: extension, MIME, magic bytes, size, decode), Q4, review 01 R-04"
  - id: BR4.4
    statement: "A clean ClamAV result ends the release-1 pipeline in preview_ready; a detection rejects the item with malware and deletes the original at once."
    category: policy
    applies_to: "evidence.process (scanning -> preview_ready | rejected)"
    trigger: "Scanner reply"
    logic: "scanner.scan(stream) over clamd INSTREAM; IF reply is exactly OK THEN scanning -> preview_ready with custody scan_clean {scannerVersion} and then custody preview_ready, both in the transition's transaction (preview_ready names the state entered, as the seed and the demo already write it); IF reply is FOUND THEN delete the original file, then scanning -> rejected fail_reason malware with custody scan_detected"
    violation: "none"
    source: "FR62, FR66, C8 release-1 job, Q2, review 01 R-10"
  - id: BR4.5
    statement: "The scan fails closed: any reply that is not a clear OK or FOUND, a connection error or a scan timeout is unavailable; the item stays in scanning and the job retries; on the last attempt the item ends failed with scanner_unavailable."
    category: policy
    applies_to: "evidence.process"
    trigger: "Scanner unavailable"
    logic: "custody scan_unavailable {attempt}; IF NOT lastAttempt (BR4.9) THEN throw ScannerUnavailable so pg-boss retries (item unchanged) ELSE scanning -> failed fail_reason scanner_unavailable with custody scan_unavailable and custody failed {failReason}, delete the original after commit (BR4.10), finish without throwing; the item is never counted, never public, and its author sees ev.status.failed with Remove"
    violation: "an unavailable scan that advances an item is S1"
    source: "FR66, FD-035, C8 release-1 job, project.md Mandated (fail closed), Q3"
  - id: BR4.6
    statement: "A single attempt is bounded: the scan times out after 15 s and the handler's own budget ends the attempt after 120 s; pg-boss's 300 s expiry only catches a hung or crashed worker."
    category: constraint
    applies_to: "evidence.process, scanner-clamd adapter, queue-declaration.ts"
    trigger: "Each attempt"
    logic: "CLAMD_TIMEOUT_MS default 15000 (a scan timeout is unavailable, BR4.5); the handler runs under AbortSignal.any([job.signal, AbortSignal.timeout(EVIDENCE_ATTEMPT_BUDGET_MS = 120000)]); a budget abort is treated as unavailable when it hits the scan and otherwise as an unexpected error, so it retries, or on the last attempt ends failed processing_timeout (BR4.10); expireInSeconds stays 300, written explicitly on the evidence.process entry, so the queue already stored in a database needs no change"
    violation: "as BR4.5 and BR4.10"
    source: "C8 and C15 (120 s per item), queue-declaration.ts, demo clamav.ts, review 01 R-01"
  - id: BR4.7
    statement: "Every state change appends its named custody events and, in the same transaction, evidence.stateChanged {itemId, reviewId, state} with no account id, no file name and no storage key."
    category: policy
    applies_to: "evidence.process, evidence.sweep, evidence.remove"
    trigger: "Each transition"
    logic: "custody values per transition are exactly those in functional-spec.md § 4 (received, validated, scan_started, validation_failed, scan_clean, preview_ready, scan_detected, scan_unavailable, failed, removed); custody actor is worker for the job and the sweep and account:<id> for removal (custody is private); custody details carry only failReason, attempt, bytes, mime, scannerVersion and a cause code; the outbox payload has exactly itemId, reviewId, state; a scan_unavailable that leaves the item in scanning appends no outbox row"
    violation: "a payload field beyond the three is a contract break (C15 release-1 note)"
    source: "C15 release-1 relay map (no uploaderAccountId), FD-070, review 01 R-10"
  - id: BR4.8
    statement: "The worker never reads the uploader's account or the sealed file name and never imports Better Auth or any identity-reveal or deletion command."
    category: policy
    applies_to: "apps/worker/src/handlers/evidence-process.ts, apps/worker/src/handlers/evidence-sweep.ts, the worker's evidence repository methods"
    trigger: "Always"
    logic: "the worker's repository methods select only id, review_id, state, detected_mime, original_bytes, original_sha256, created_at, the original artifact's storage_key and the latest custody event value; a repository test asserts that list; the database does not enforce it, because 0005 grants rk_worker table-wide SELECT on evidence_items (S4 proposal for a column-level grant, functional-spec.md § 9)"
    violation: "a forbidden import fails the worker's forbidden-import test; a selected private column fails the repository column test"
    source: "team.md Code Style (worker boundary), BR2.6, review 01 R-06"
  - id: BR4.9
    statement: "The job knows its attempt from pg-boss's own job metadata, and a retry resumes an item it finds in validating or scanning unless the item is past the processing deadline."
    category: constraint
    applies_to: "packages/database/src/queue/pg-boss-queue.ts (work, JobHandler), apps/worker/src/registry.ts, apps/worker/src/main.ts, evidence.process"
    trigger: "Every attempt"
    logic: "PgBossQueue.work fetches with includeMetadata: true and calls handler(job.data, {jobId, retryCount, retryLimit, signal}); main.ts passes that second argument through as def.handler(payload, ctx, meta); the processor receives {itemId, attempt: retryCount + 1, lastAttempt: retryCount >= retryLimit, signal}; existing handlers ignore the new argument; on load: IF the item is missing or its state is not in {quarantined, validating, scanning} THEN finish; IF created_at is older than EVIDENCE_PROCESSING_DEADLINE_SEC (3600) THEN current state -> failed processing_timeout (BR4.10) and finish; IF state is quarantined THEN quarantined -> validating; IF state is validating or scanning THEN resume from that state: re-read and re-validate the bytes (BR4.3), then validating -> scanning or, from scanning, scan again"
    violation: "a retry that leaves an item in validating or scanning without resuming or failing it is a defect (S2)"
    source: "review 01 R-01, R-02; pg-boss 12.31 JobWithMetadata.retryCount"
  - id: BR4.10
    statement: "The last attempt always leaves the item in a final state, and an item whose quarantined file is missing fails at once; every failed item's original is deleted."
    category: policy
    applies_to: "evidence.process"
    trigger: "A missing file on any attempt; an unexpected error or a budget abort on the last attempt"
    logic: "IF files.readQuarantined(key) answers original_missing THEN current state -> failed fail_reason unknown with custody failed {failReason: unknown, cause: original_missing} and finish (no retry can bring the file back); IF lastAttempt AND the attempt throws anything other than the BR4.5 path, or the budget aborts it THEN in a new transaction current state -> failed fail_reason processing_timeout with custody failed {failReason: processing_timeout}, then finish without rethrowing; IF that write also fails THEN log the error class and rethrow, and the sweep ends the item (BR4.11); after a commit to failed the original file is deleted and the artifact's deleted_at is set; a failed item leaves COUNTING_STATES, so it stops taking one of the review's 10 slots, and its author sees ev.status.failed with Remove"
    violation: "an item left in quarantined, validating or scanning after the job's last attempt finished is a defect (S2)"
    source: "review 01 R-02, FD-035 (fail closed), AC7.1.4, AC7.1.5"
  - id: BR4.11
    statement: "A sweep ends every item still in processing after the deadline, whatever stopped it: a crash or expiry on the last attempt, an event the relay gave up on, or a row the demo slice left behind."
    category: policy
    applies_to: "apps/worker/src/handlers/evidence-sweep.ts (job evidence.sweep), packages/database/src/queue/queue-declaration.ts, apps/worker/src/registry.ts"
    trigger: "Cron */5 * * * * (every 5 minutes)"
    logic: "select up to 100 items in {quarantined, validating, scanning} with created_at older than EVIDENCE_PROCESSING_DEADLINE_SEC (3600), oldest first, FOR UPDATE SKIP LOCKED; per item in one transaction: compare-and-set from the state read -> failed with fail_reason scanner_unavailable when the item's latest custody event is scan_unavailable, else processing_timeout; custody failed {failReason}; outbox evidence.stateChanged; after commit delete the original (a missing key is not an error) and set deleted_at; the deadline is above the worst job lifetime (relay retries, four attempts of at most 300 s each and the backoff, about 25 minutes); the queue is exclusive with no key, so two sweeps never overlap"
    violation: "an item in processing older than the deadline plus one sweep interval is a defect (S2)"
    source: "review 01 R-02 (crash and expiry on the last attempt, relay outbox.dead, demo rows), FD-035"
  - id: BR4.12
    statement: "In release 1 evidence.stateChanged routes to no job."
    category: policy
    applies_to: "apps/worker/src/handlers/outbox-relay.ts (RELAY)"
    trigger: "U48's Bolt"
    logic: "change RELAY['evidence.stateChanged'] from ['notification.deliver'] to [] (one-line shared edit); U48 is the release-1 publisher of the event (C15), and nothing works the notification.deliver queue in release 1, so the current route would only pile up unworked jobs; release 2 (T-405) adds the route back with uploaderAccountId"
    violation: "a release-1 relay map that routes evidence.stateChanged to a job fails the relay map test"
    source: "C15 release-1 relay map (jobs: []), review 01 R-07"

  # BR5 — Public count and public display
  - id: BR5.1
    statement: "PUBLIC_EVIDENCE_STATES is ['preview_ready', 'published']: the release-1 clean end state plus the seeded corpus's published items."
    category: calculation
    applies_to: "packages/domain/src/evidence/states.ts"
    trigger: "Design-time constant"
    logic: "as const satisfies readonly EvidenceState[]; no new enum value"
    violation: "a state outside the list must never be counted"
    source: "C17 release_1 meaning, Q2"
  - id: BR5.2
    statement: "countPublicEvidence(reviewId) counts the review's items in PUBLIC_EVIDENCE_STATES and nothing else; only the Evidence module reads evidence_items; the public section shows a count only for a published review."
    category: calculation
    applies_to: "evidence.countPublicEvidence (C17 port implementation), container.ts binding, EvidenceSection"
    trigger: "Every call"
    logic: "count where review_id = reviewId and state in PUBLIC_EVIDENCE_STATES; quarantined, validating, scanning, failed, rejected, removed and original_expired are never counted; the batched form, if U46's port declares it, returns the same count per id and omits reviews with none; EvidenceSection renders nothing when review.isReviewPublished is false"
    violation: "a count including any other state is S1"
    source: "C17 rules, FR56, review 01 R-13"
  - id: BR5.3
    statement: "The public evidence section reads Documents attached — not medically validated with the count when the count is above zero, and No documents otherwise, never 0."
    category: policy
    applies_to: "<EvidenceSection reviewPublicId>, EvidenceNote"
    trigger: "Every render of the experience page"
    logic: "IF count > 0 THEN the existing key evidence.status plus ev.note.count with the count in the active language's numerals ELSE the existing key label.noDocuments; both keys already carry the required en and bn wording and are not changed"
    violation: "a rendered 0, a missing note or other wording is S1"
    source: "FR56, project.md Mandated (evidence wording, missing value), C17, review 01 R-08"
  - id: BR5.4
    statement: "No copy, key, label or log line describes evidence as verified or approved, and no state name reaches the public."
    category: policy
    applies_to: "packages/i18n ev.* and evidence.* keys, components/patient/evidence/"
    trigger: "Always"
    logic: "a test greps the en and bn ev.* and evidence.* values for verified and approved in English and যাচাইকৃত and অনুমোদিত in Bengali (যাচাই, check, stays allowed: the required wording uses it); the public view model carries only {count}"
    violation: "S1"
    source: "project.md Forbidden (verified or approved)"
  - id: BR5.5
    statement: "A rejected or failed item, its reason and its file name are visible to its author only; the public sees nothing of it."
    category: policy
    applies_to: "EvidenceSection, AuthorEvidence, getForAuthor"
    trigger: "Every render"
    logic: "EvidenceSection receives and renders only the count; AuthorEvidence loads its own list through getForAuthor and renders only when that returns a list"
    violation: "S1"
    source: "FR66, AC7.1.4, C16"

  # BR6 — The author's view
  - id: BR6.1
    statement: "The author sees each item's file name, size and status; an item in processing reads Being checked and no completion time is ever shown or promised."
    category: policy
    applies_to: "evidence.getForAuthor, AuthorEvidence, EvidenceUploader"
    trigger: "Every render for the author"
    logic: "OwnEvidenceFile.status = pending for quarantined, validating, scanning; ready for preview_ready, published; rejected for rejected; failed for failed; removed and original_expired items are not listed; oldest first; copy keys ev.status.pending (Being checked), ev.status.ready (Attached), ev.status.rejected (Not accepted), ev.status.failed (Could not be checked — try again later)"
    violation: "a time estimate or a state literal shown to the author is S2"
    source: "AC7.1.5, NFR2, FR53, FR66"
  - id: BR6.2
    statement: "Each refused or failed item shows a reason in plain words with guidance and a Remove action."
    category: policy
    applies_to: "EvidenceUploader, EvidenceFileRow"
    trigger: "Item in rejected or failed"
    logic: "malware -> ev.reason.malware; type_mismatch, malformed -> ev.reason.notImage; too_large -> ev.reason.tooLarge; scanner_unavailable, processing_timeout, unknown -> ev.reason.couldNotCheck; each with ev.guidance.photograph and the existing ev.failNote; Replace is Remove, then upload again"
    violation: "a missing reason is S2"
    source: "AC7.1.4, FR66, C8 release-1 job, Q5"
  - id: BR6.3
    statement: "The author may remove any of their items that is not already removed; removal deletes the original file and moves the item to removed."
    category: policy
    applies_to: "evidence.remove"
    trigger: "Remove action"
    logic: "state in any non-removed state -> removed (compare-and-set); custody removed; evidence.stateChanged; audit row evidence:<itemId>; delete the original file after commit and set deleted_at"
    violation: "not_found for someone else's item (BR1.3)"
    source: "C8 release 1 (remove by owner), FR66, review 01 R-10"
  - id: BR6.4
    statement: "Every user-facing evidence string is an i18n key with an English and a Bengali value added in the same commit; existing keys are reused where their wording fits; errors are returned as messageKey."
    category: policy
    applies_to: "all U48 copy"
    trigger: "Always"
    logic: "reuse evidence.status, label.noDocuments, label.notProvided, ev.note.count, ev.remove, ev.failNote, ev.upload.* and errors.evidence.{typeRejected,tooLarge,tooMany,totalTooLarge}; change, add and delete ev.* keys and change errors.evidence.tooMany exactly as frontend-components.md § Copy lists them, en and bn in one commit; i18n parity check passes"
    violation: "build failure"
    source: "project.md Mandated and Forbidden (i18n), FD-024, review 01 R-08"

  # BR7 — Logging
  - id: BR7.1
    statement: "Evidence log lines carry only allowlisted fields: itemId, state, failReason code, attempt and error class name."
    category: policy
    applies_to: "web route, module commands, worker handlers, adapters"
    trigger: "Every log call"
    logic: "never the file name, bytes, sha256, storage key, account id or review text; logging goes through the logger port"
    violation: "S1 (private data in logs); U41's scrubbing test also checks it"
    source: "AC7.1.6, NFR8, team.md Code Style (logger port)"

  # BR8 — Replacing the demo slice
  - id: BR8.1
    statement: "U48 binds PublicEvidenceCount to the Evidence implementation in container.ts with an append-only edit and deletes demo/evidence.ts, countReadyEvidence and DEMO_READY_EVIDENCE_STATE(S)."
    category: constraint
    applies_to: "apps/web/src/server/container.ts, packages/database/src/demo/evidence.ts, apps/web/src/server/data.ts re-exports"
    trigger: "U48's Bolt"
    logic: "replace the one interim binding line; remove the evidence re-exports from data.ts; no caller of the deleted names remains"
    violation: "typecheck failure"
    source: "C17 binding, unit-of-work.md U48"
  - id: BR8.2
    statement: "The demo upload action, the web-tier scan and the web-tier storage are replaced in U48's Bolt; the shared demo review helpers are deleted only when nothing calls them any more."
    category: constraint
    applies_to: "apps/web/src/server/{actions/evidence.ts,clamav.ts,storage.ts}, packages/database/src/demo/reviews.ts"
    trigger: "U48's Bolt and its merge"
    logic: "clamav.ts and storage.ts move into packages/adapters/src/{scanner-clamd,storage-fs}/ and are deleted from apps/web; actions/evidence.ts keeps only listOwnEvidenceFiles and removeEvidence, each a thin call into the module, and stops calling demo/reviews.ts; the upload goes through POST /api/evidence/upload; at merge time, for each of getOwnReviewForEdit, personasOf, updateOwnReview, snapshotOf and getReviewByPublicId in demo/reviews.ts: grep apps and packages for callers; delete a function only when the grep shows none, and delete the file when no export is left; make that deletion its own commit followed by pnpm check; a function that still has a caller (U22's or U49's code not merged yet) stays for the next Unit to merge, and U50 removes any leftover; record the grep result and what was deleted in U48's Build and Test record"
    violation: "a scan run in the web tier after U48 is a defect (S2); a deletion that breaks pnpm check is reverted in its own commit"
    source: "unit-of-work.md U48, U47 functional design (demo helpers), review 01 R-12"
  - id: BR8.3
    statement: "Originals of items in preview_ready do not expire in release 1; the gap is recorded as an S4 row in ISSUES.md."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Code Generation"
    logic: "retention_expires_at stays null; retention.originalDays (90) is not enforced (C18); T-309 delivers it in release 2; rejected, failed and removed items lose their original at once (BR4.3, BR4.4, BR4.10, BR6.3)"
    violation: "none"
    source: "C18 (retention.originalDays not enforced), FD-105"
```

## Rules summary

| Group | IDs | What it covers |
|---|---|---|
| BR1 | BR1.1–BR1.3 | Confirmed account; own published review for upload; own items on the author's own review (published or not) for list and removal; one not_found for every foreign case. |
| BR2 | BR2.1–BR2.8 | JPEG/PNG with agreeing extension, MIME and magic bytes; 15 MB per file; 10 per review, serialised; 100 MB per review; idempotency before the limits; private file name; 30 uploads per account per hour; a read-only pre-check before the file is written. |
| BR3 | BR3.1–BR3.6 | Random 32-hex keys; path containment; root outside the web root; cleanup on failure; originals never served; writer and reader ports split. |
| BR4 | BR4.1–BR4.12 | Outbox to job with the relay's key; compare-and-set; full structure check; clean ends in `preview_ready`; fail closed to `failed`/`scanner_unavailable`; 120 s budget under the 300 s expiry; named custody and the three-field event; worker boundary; attempt from pg-boss metadata and resume; a final state on the last attempt; the sweep; `evidence.stateChanged` routes to no job. |
| BR5 | BR5.1–BR5.5 | `PUBLIC_EVIDENCE_STATES`; the C17 count on a published review; the existing wording keys; no verified/approved; nothing private public. |
| BR6 | BR6.1–BR6.4 | Author statuses with no time promise; reasons and guidance; removal; en and bn keys, reusing existing ones. |
| BR7 | BR7.1 | Log allowlist. |
| BR8 | BR8.1–BR8.3 | Binding swap and demo deletions; demo review helpers deleted only when no caller is left; preview-ready originals do not expire (S4). |
