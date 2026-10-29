# Business rules — U23 `t-303-evidence-intake`

Source of truth for the Unit's decision logic. Built from T-303 (steps, acceptance checks, threat notes, the 2026-09-12 images-only block), `unit-of-work.md` (U23 and the evidence-to-draft open point), `requirements.md` (FR44, FR60–FR62, FR66–FR68, NFR2), `stories.md` (AC7.1.1–AC7.1.6, AC6.1.6), `contract-summary.md` (C8, C14, C15), FD-035, FD-036, FD-037, FD-038, FD-041, FD-067, FD-070, FD-076, FD-079, FD-092, FD-093, FD-094, the project hard rules (`project.md`) and `01-conventions.md` §2–§5, §10, §11. Workflows are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question was decided A by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 14 lists what changes if the owner reverses one. The Unit is high risk: groups BR1 (authorization), BR4 (persistence), BR6 (removal) and BR8 (privacy and audit) are the ones the adversarial tests target (`functional-spec.md` § 12.2).

```yaml
rules:
  # BR1 — Authorization and ownership
  - id: BR1.1
    statement: "Only a signed-in account with a confirmed email and an unrestricted status may upload evidence; this is checked before any part of the request body is read."
    category: authorization
    applies_to: "POST /api/evidence/upload, evidence.intake"
    trigger: "Every upload request"
    logic: "actor = getActor(); IF actor.kind = anonymous THEN 401 (the refusal code defineCommand returns for authenticated) ELSE IF NOT actor.emailVerified THEN 403 auth.email_unverified ELSE IF actor.status IN (restricted, suspended, banned, deleted) THEN 403 forbidden; the order is T-101's requires order (authenticated → verifiedEmail → notRestricted); the request body stream is not consumed (it is cancelled) on refusal"
    violation: "Any byte of an unauthorized request reaching Storage"
    source: "T-303 step 3 and step 4, C8 requires verified, 01 §5, U8 T-101 § 10.1"
  - id: BR1.2
    statement: "The draft named by an upload must be an open draft of the actor; otherwise the whole request is refused before any byte is stored, with the same answer whether the draft is foreign, expired or unknown."
    category: authorization
    applies_to: "evidence.intake, EvidenceDraftAccess port"
    trigger: "After BR1.1, before the first file part is streamed"
    logic: "draft = evidenceDraftAccess.openDraftOf({accountId: actor.accountId, draftId}); IF draft = null (no row, account_id differs, or expires_at <= clock.now()) THEN 404 not_found for the request and every file part is drained unread ELSE keep draft.reviewId (null unless the draft edits a published review) for BR2.4"
    violation: "Uploading into another account's draft (task threat 'Uploading to another user's draft')"
    source: "T-303 step 4, threat notes, Question 2"
  - id: BR1.3
    statement: "The database refuses any evidence item whose draft link names a draft of another account."
    category: constraint
    applies_to: "evidence_items, review_drafts (migration of this Unit)"
    trigger: "Insert or update of evidence_items.review_draft_id"
    logic: "FOREIGN KEY (review_draft_id, uploaded_by_account_id) REFERENCES review_drafts (id, account_id) ON DELETE SET NULL (review_draft_id); MATCH SIMPLE, so a null review_draft_id is not checked; the repository maps the violation (23503) to not_found and the command deletes the stored object (BR4.2)"
    violation: "An item linked to a foreign draft by a bug in any command or job"
    source: "Question 1"
  - id: BR1.4
    statement: "getForAuthor returns items only to their uploader; if any listed id is not an item uploaded by the actor, the whole call is refused and nothing is returned."
    category: authorization
    applies_to: "evidence.getForAuthor"
    trigger: "Every call"
    logic: "requires authenticated; input {itemIds: 1..10 distinct ids}; rows = repository.listForUploader({accountId, itemIds}); IF rows.length < itemIds.length THEN err(forbidden) ELSE map rows (BR7.1); unknown and foreign ids give the same forbidden"
    violation: "A foreign item's state, group or fail reason reaching another account (acceptance row 'Owner only')"
    source: "T-303 step 5, acceptance 'Owner only', Question 8"
  - id: BR1.5
    statement: "Only the uploader may remove an item through evidence.remove; anyone else is refused with no side effect."
    category: authorization
    applies_to: "evidence.remove"
    trigger: "Every call"
    logic: "requires authenticated (no verifiedEmail: an author who lost verification can still withdraw a file); load item; IF item missing OR item.uploaded_by_account_id <> actor.accountId THEN err(forbidden) and nothing is written; staff roles and capabilities grant nothing here (moderator removeFile is U25's)"
    violation: "Removing another account's evidence (acceptance row 'Owner only')"
    source: "T-303 step 6, acceptance 'Owner only', C8 (remove by owner U23, by moderator U25)"
  - id: BR1.6
    statement: "Intake is rate limited to 40 files per account per hour; a replay of an already stored idempotency key does not count."
    category: policy
    applies_to: "evidence.intake"
    trigger: "Each file part after BR2.1–BR2.2 pass and BR4.3 finds no earlier item"
    logic: "rateLimiter.hit('evidence.intake:account:<accountId>', 40, 3600); IF NOT allowed THEN per-file err(rate_limited, retryAfterSec) and the part is drained; the remaining parts of the request get the same refusal"
    violation: "Flooding quarantine (task threat 'Flooding')"
    source: "T-303 step 4, threat notes, 03 §3 RateLimiter"

  # BR2 — Declared type and limits (web tier; no content parsing)
  - id: BR2.1
    statement: "A file is accepted for streaming only when its extension is jpg, jpeg or png and its declared MIME type matches that extension."
    category: validation
    applies_to: "domain evidence/limits.ts checkDeclared, the upload route"
    trigger: "Each file part, before Storage is called"
    logic: "ext = lowercase final extension of the part's filename; ALLOWED = {jpg: image/jpeg, jpeg: image/jpeg, png: image/png}; IF ext NOT IN ALLOWED OR declaredMime <> ALLOWED[ext] THEN evidence.type_rejected and the part is drained; no PDF, HEIC, WebP, Office or other type in Phase 1"
    violation: "A non-image upload reaching quarantine (AC7.1.2)"
    source: "FR60, FR62, FD-036, T-303 scope block and step 1"
  - id: BR2.2
    statement: "A file name that could disguise its type or escape a path is refused."
    category: validation
    applies_to: "checkDeclared"
    trigger: "Each file part"
    logic: "refuse with evidence.type_rejected IF the name is empty, longer than 255 characters after NFC, contains '/', '\\', NUL, any C0 or C1 control character or a bidirectional override (U+202A–U+202E, U+2066–U+2069), or any inner dot-separated segment is a known executable, script, archive, document or markup extension (exe, com, bat, cmd, scr, msi, ps1, sh, js, vbs, jar, apk, dll, zip, rar, 7z, gz, tar, pdf, doc, docx, xls, xlsx, ppt, pptx, html, htm, svg, php); so 'a.pdf.exe', 'a.exe.jpg' and 'x.docx' are refused and 'prescription-1.jpg' passes"
    violation: "A double extension or a right-to-left trick passing the declared-type check"
    source: "T-303 step 1 ('double extension'), threat notes"
  - id: BR2.3
    statement: "One file may be at most 15 MiB (15 × 1024 × 1024 bytes, inclusive); the limit is enforced by counting bytes while streaming, never by a declared size."
    category: validation
    applies_to: "Storage.putQuarantine, checkDeclared"
    trigger: "While a file part streams"
    logic: "maxBytes = min(MAX_BYTES, MAX_TOTAL - existingTotal); the adapter counts bytes and aborts as soon as the count exceeds maxBytes, deleting the partial object; the per-file error is evidence.too_large when the per-file cap was the binding one, else evidence.total_too_large; exactly 15 MiB is accepted"
    violation: "Memory or disk exhaustion through a large upload; a 16 MB file stored (acceptance row 'Limits')"
    source: "FR61, AC7.1.3, T-303 step 2, acceptance 'Limits'"
  - id: BR2.4
    statement: "A draft holds at most 10 files, counting its own items and those of the published review it edits, in every state except rejected and removed."
    category: validation
    applies_to: "evidence.intake"
    trigger: "Before each file part streams, and again inside the persist transaction"
    logic: "existing = items WHERE (review_draft_id = draftId OR (draft.reviewId IS NOT NULL AND review_id = draft.reviewId)) AND state NOT IN (rejected, removed); IF count(existing) >= MAX_FILES THEN evidence.too_many; failed items count until removed"
    violation: "An eleventh file attached (AC7.1.3)"
    source: "FR61, AC7.1.3, Question 12"
  - id: BR2.5
    statement: "The files of a draft (BR2.4's set) may total at most 100 MiB, inclusive."
    category: validation
    applies_to: "evidence.intake"
    trigger: "As BR2.4"
    logic: "existingTotal = sum(original_bytes) over BR2.4's set; the stream limit is MAX_TOTAL - existingTotal (BR2.3); IF existingTotal >= MAX_TOTAL THEN evidence.total_too_large before streaming"
    violation: "More than 100 MiB stored for one draft (AC7.1.3)"
    source: "FR61, AC7.1.3, Question 12"
  - id: BR2.6
    statement: "Every limit is checked before streaming and re-checked with the measured size under a per-draft lock in the persist transaction; the re-check is authoritative."
    category: constraint
    applies_to: "evidence.intake, PgEvidenceRepository.insertIntake"
    trigger: "Persist step of every file"
    logic: "inside the transaction: pg_advisory_xact_lock(hashtextextended('evidence.draft:' || draftId, 0)); recount BR2.4 and BR2.5 with the measured bytes; IF over THEN roll back, delete the stored object, per-file evidence.too_many or evidence.total_too_large"
    violation: "Parallel uploads passing the pre-check and exceeding the limits"
    source: "Question 12"
  - id: BR2.7
    statement: "An empty file is refused."
    category: validation
    applies_to: "evidence.intake"
    trigger: "Stream ended with 0 bytes"
    logic: "IF bytes = 0 THEN delete the object; per-file err(validation, fieldErrors.file = errors.evidence.empty)"
    violation: "A zero-byte item entering the pipeline"
    source: "FR62 (size check)"
  - id: BR2.8
    statement: "The web tier never inspects file content: no magic-byte check, no decoding, no rendering, no serving of an original."
    category: constraint
    applies_to: "apps/web, modules/evidence intake code"
    trigger: "Always"
    logic: "magic bytes, pixel limits, scanning and sanitising are U24's in the worker; no apps/web file calls Storage.readPrivate or head except the routes U25 builds (grep test, BR3.6)"
    violation: "Untrusted bytes parsed in the web process (zip bomb, polyglot)"
    source: "AD-6, AD-7, T-303 goal and threat notes, hard-rule checklist"

  # BR3 — Storage
  - id: BR3.1
    statement: "Storage keys are generated by the server and must match one of the fixed patterns; any other key is refused by every method."
    category: constraint
    applies_to: "adapters/storage-fs, Storage port"
    trigger: "Every Storage call"
    logic: "written keys: quarantine/<itemId uuid>/<object uuid> and private/<itemId uuid>/<name>; readable keys: those two plus the seed's legacy public/<10-char public id>/<name>; name = [A-Za-z0-9][A-Za-z0-9._-]{0,63}; uuid = [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}; public id = [0-9a-hjkmnp-tv-z]{10}; IF no pattern matches THEN the call fails with a key error (a programmer error: thrown in the adapter, converted to internal by the caller)"
    violation: "Path traversal through a key such as '../x' (acceptance row 'Path traversal')"
    source: "T-303 step 2, acceptance 'Path traversal', 01 §4, Question 9"
  - id: BR3.2
    statement: "A key's resolved path must stay under STORAGE_ROOT."
    category: constraint
    applies_to: "adapters/storage-fs"
    trigger: "Every Storage call, after BR3.1"
    logic: "path = resolve(root, key); IF NOT path.startsWith(resolve(root) + sep) THEN refuse; STORAGE_ROOT is resolved against the repository root when relative (ISS-169's rule)"
    violation: "A write or read outside the storage root"
    source: "T-303 threat notes, ISS-169"
  - id: BR3.3
    statement: "Uploads are streamed straight to storage: the adapter writes chunks as they arrive, hashes the plaintext while streaming and never holds a whole file in memory."
    category: constraint
    applies_to: "the upload route, Storage.putQuarantine"
    trigger: "Each accepted file part"
    logic: "route: Readable.fromWeb(request.body) piped into the multipart parser; each file stream is passed as AsyncIterable<Uint8Array> to evidence.intake; adapter: pipeline(source, byteCounter, sha256Tap, cipher, createWriteStream(tmp)) then rename to the final key; returns {key, bytes, sha256}; the first chunk is written before the request body ends"
    violation: "Buffering a file (acceptance row 'Streams, no buffering')"
    source: "T-303 goal, step 2, step 3, acceptance 'Streams, no buffering'"
  - id: BR3.4
    statement: "An aborted, oversized or failed write leaves no file behind."
    category: constraint
    applies_to: "Storage.putQuarantine, putPrivateDerivative"
    trigger: "Byte limit exceeded, source error, client disconnect, disk error"
    logic: "the write goes to <key>.part; on any error the stream is destroyed, the .part file is unlinked, and the method returns {error: too_large | aborted | io}; only a fully written, tag-sealed file is renamed to its key"
    violation: "A partial original in quarantine (acceptance row 'Limits': partial file deleted)"
    source: "T-303 step 2, acceptance 'Limits'"
  - id: BR3.5
    statement: "Every object under quarantine/ and private/ is encrypted at rest with AES-256-GCM under the storage-only key; a read returns bytes only after the authentication tag verifies."
    category: constraint
    applies_to: "adapters/storage-fs"
    trigger: "Every write and read of those prefixes"
    logic: "object = 'RKS1' (4 bytes) || iv (12 random bytes) || ciphertext || tag (16 bytes); key = STORAGE_ENCRYPTION_KEY (32 bytes, base64) read when the adapter is built, never at module load; readPrivate(key, {maxBytes}) reads at most maxBytes + 32 bytes, decrypts, and returns {error: tampered} on a tag failure; bytes and sha256 describe the plaintext; the seed's legacy public/ files are plaintext and read as such"
    violation: "A copied storage folder exposing originals (FR67)"
    source: "FR67, Question 4"
  - id: BR3.6
    statement: "No code path writes a public file or serves a quarantined original."
    category: constraint
    applies_to: "Storage port, apps/web"
    trigger: "Always"
    logic: "the port has no public write; publication is the artifact row flag (U25); a grep test asserts no file under apps/web calls readPrivate or head outside app/api/evidence/items/** and app/api/evidence/artifacts/** (U25's routes)"
    violation: "An original served by mistake (task threat)"
    source: "T-303 threat notes, U24 F5, U25 Question 12, Question 9"
  - id: BR3.7
    statement: "Deleting an object is idempotent and logs its reason without any name."
    category: policy
    applies_to: "Storage.delete"
    trigger: "Every delete"
    logic: "unlink the file; a missing file is ok; log {event: 'storage.deleted', itemId, reason} through the Logger port; the key, the file name and the declared name are never logged"
    violation: "A file name in the logs (AC7.1.6)"
    source: "T-303 step 2, AC7.1.6, 01 §11"

  # BR4 — Intake persistence
  - id: BR4.1
    statement: "An accepted file is recorded in one transaction: the item, its original artifact, the custody event received, the audit row and the outbox event."
    category: constraint
    applies_to: "evidence.intake persist step"
    trigger: "After Storage.putQuarantine returns a key"
    logic: "insert evidence_items {id: itemId (generated before storing), public_id, review_id: null, review_draft_id: draftId, group, state: quarantined, declared_mime, original_bytes, original_sha256, original_filename_enc, page_count: 1, uploaded_by_account_id, idempotency_key}; insert evidence_artifacts {kind: original, storage_key, sha256, bytes, mime: declared, public: false, immutable: true}; custody received {bytes, declaredMime} actor author; audit stream evidence:<itemId> action intake actor author details {group, declaredMime, bytes}; outbox evidence.received {itemId, uploaderAccountId}"
    violation: "An item without its received event or outbox row (acceptance row 'Custody + outbox')"
    source: "T-303 step 4, acceptance 'Custody + outbox', C15, Question 3, Question 11"
  - id: BR4.2
    statement: "If storing fails nothing is inserted; if the transaction fails the stored object is deleted."
    category: constraint
    applies_to: "evidence.intake"
    trigger: "Storage error, or any error in the persist transaction"
    logic: "storage error → per-file err (too_large, total_too_large, internal) and no row; persist error → roll back, Storage.delete(key, {reason: 'intake_rolled_back'}), per-file err with the mapped code"
    violation: "A row without a file or a file without a row"
    source: "T-303 acceptance 'Custody + outbox' (on storage failure nothing is inserted)"
  - id: BR4.3
    statement: "Intake is idempotent per account and client key: a repeated key returns the first result and stores nothing new; keys of different accounts never meet."
    category: policy
    applies_to: "evidence.intake"
    trigger: "Each file part, before the rate limit"
    logic: "scopedKey = crypto.hmac('evidence.intake', accountId + ':' + clientKey); existing = repository.findByIdempotencyKey(scopedKey); IF existing THEN drain the part and return ok({itemId, publicId, state}) of existing; a concurrent duplicate that loses the unique index (23505) deletes its own object and returns the winner's result"
    violation: "Two items or two objects for one key; another account's item returned (acceptance row 'Idempotent')"
    source: "T-303 step 4, 01 §3, acceptance 'Idempotent', Question 10"
  - id: BR4.4
    statement: "The declared file name is stored only encrypted and never leaves the evidence repository."
    category: privacy
    applies_to: "evidence_items.original_filename_enc"
    trigger: "Intake"
    logic: "original_filename_enc = crypto.encrypt(utf8(NFC(declaredName))) with APP_ENCRYPTION_KEY; no repository read used by a query or view model selects it; no log, audit detail, custody detail, outbox payload, error message or view model carries it"
    violation: "An original file name in a view model or log (task threat, AC7.1.6)"
    source: "02 §7, T-303 threat notes, hard-rule checklist"
  - id: BR4.5
    statement: "Processing is started only by the outbox relay."
    category: policy
    applies_to: "evidence.intake"
    trigger: "Commit of BR4.1"
    logic: "no JobQueue.enqueue in the web tier; outbox.relay maps evidence.received to evidence.process (C15)"
    violation: "A second job for one item under a different key"
    source: "FD-038, Question 7, U24 § 6.4"
  - id: BR4.6
    statement: "Each file part's outcome is reported on its own; a refused part never stops the other parts."
    category: policy
    applies_to: "the upload route"
    trigger: "Every request that passes BR1.1 and BR1.2"
    logic: "parts are handled one at a time in arrival order; a refused part is drained (stream resumed to its end, nothing stored) and gets {clientKey, result: err}; the response is 200 {items: [...]} in part order; parts beyond 10 → 400 for the request (Question 13)"
    violation: "Losing the good files of a batch, or a stalled request because a refused stream was not drained"
    source: "T-303 step 3, Question 13, Question 14"

  # BR5 — State machine (domain/evidence/evidence-state.ts, the whole table, written once here)
  - id: BR5.1
    statement: "Evidence state changes follow one table keyed by who acts; any pair not in the table is refused."
    category: state
    applies_to: "transition(from, to, by) in packages/domain"
    trigger: "Every state change by any Unit"
    logic: "by worker: quarantined→validating, validating→scanning, validating→failed, scanning→scanning, scanning→sanitising, scanning→failed, sanitising→preview_ready, sanitising→failed; by author: preview_ready→privacy_confirmed (U25), and each of quarantined, validating, scanning, sanitising, preview_ready, privacy_confirmed, failed → rejected; by publish (review.publish or late confirmation, U25): privacy_confirmed→published; by retention (U29): published→original_expired; by moderator removeFile (U25): every state except rejected and removed → removed; anything else → err(conflict)"
    violation: "An item advancing without the step that should precede it, or published without confirmation"
    source: "02 §17, T-303 step 1, U24 § 5, U25 state diagram, Question 6"
  - id: BR5.2
    statement: "A failure reason is allowed only for the stage that can produce it."
    category: state
    applies_to: "transition to failed"
    trigger: "Every move to failed"
    logic: "validating: type_mismatch, too_large, malformed, unknown, processing_timeout; scanning: malware, scanner_unavailable, unknown, processing_timeout; sanitising: malformed, processing_timeout, unknown; too_many_pages and encrypted are reserved for Phase 2 and refused in Phase 1"
    violation: "A failure shown to the author with a reason the stage cannot have"
    source: "02 §0 and §17, FD-036, U24 § 5"
  - id: BR5.3
    statement: "Every state change is a compare-and-set on the expected state, in the same transaction as its custody, audit and outbox rows."
    category: constraint
    applies_to: "EvidenceRepository.transition and every caller"
    trigger: "Every state change"
    logic: "UPDATE evidence_items SET state = $to, updated_at = now WHERE id = $id AND state = $from [AND further owner conditions] RETURNING id; zero rows → the caller treats the change as lost (author: conflict or idempotent ok; worker: superseded)"
    violation: "An author removal and a worker step both committing on one item"
    source: "U24 WF9, Question 6"
  - id: BR5.4
    statement: "Only published and original_expired items may ever have public artifacts."
    category: constraint
    applies_to: "evidence_artifacts.public (consumers U25, U28)"
    trigger: "Always"
    logic: "intake writes the original with public false; the original_not_public check stays; a new check keeps published and original_expired items tied to a review (state NOT IN (published, original_expired) OR review_id IS NOT NULL)"
    violation: "A public artifact of an unpublished item"
    source: "02 §7 and §17, hard-rule checklist"

  # BR6 — The author's removal
  - id: BR6.1
    statement: "The author may remove an item in any state before publication; it becomes rejected."
    category: state
    applies_to: "evidence.remove"
    trigger: "Owner call (BR1.5)"
    logic: "IF state IN (quarantined, validating, scanning, sanitising, preview_ready, privacy_confirmed, failed) THEN compare-and-set to rejected (BR5.3) ELSE IF state = rejected THEN ok({state: rejected}) with nothing written ELSE err(conflict) (published, original_expired, removed); an item bound to a review is removed the same way"
    violation: "A published file removed through this command (acceptance row 'Remove states': published → conflict)"
    source: "T-303 step 6, acceptance 'Remove states', FR66, Question 6"
  - id: BR6.2
    statement: "A removal writes the custody event removed and an audit row, and no outbox event."
    category: audit
    applies_to: "evidence.remove"
    trigger: "Successful compare-and-set of BR6.1"
    logic: "custody removed {by: author, held: boolean} actor author; audit stream evidence:<itemId> action remove actor author details {fromState, held}; no outbox row (nothing outside Evidence acts on an author's own unpublished file)"
    violation: "A removal with no trail, or an account id in the trail"
    source: "T-303 step 6, 01 §5, Question 11"
  - id: BR6.3
    statement: "Files of a removed item are deleted after the commit unless the item is held; artifact rows are marked deleted in the transaction so a failed deletion can be retried."
    category: policy
    applies_to: "evidence.remove"
    trigger: "After the commit of BR6.1"
    logic: "IF item.hold_id IS NULL THEN in the transaction set evidence_artifacts.deleted_at = now for every artifact of the item; after commit Storage.delete(key, {reason: 'author_removed'}) for each; a failed delete is logged {event: 'evidence.file_delete_failed', itemId} and left for U29's sweep; IF hold_id IS NOT NULL THEN no artifact is marked and no file is deleted"
    violation: "Files left behind with no record, or a held original destroyed (acceptance row 'Remove states': failed → rejected + files deleted)"
    source: "T-303 step 6, FD-021, FD-079 (pattern), T-309 'Hold ≠ visibility'"
  - id: BR6.4
    statement: "For the author a held item looks removed like any other; the hold is never revealed."
    category: privacy
    applies_to: "evidence.remove, evidence.getForAuthor"
    trigger: "Removal of an item whose hold_id is set"
    logic: "same result ok({state: rejected}); the view model never carries hold_id or held"
    violation: "Telling an author that their file is under a legal hold"
    source: "FD-079 (pattern for reviews and comments), Question 6"
  - id: BR6.5
    statement: "Replace is remove followed by a new intake; there is no replace command."
    category: policy
    applies_to: "the composer (U26), evidence.remove, evidence.intake"
    trigger: "The author picks Replace"
    logic: "evidence.remove(old) then upload the new file; the new item has a new id and counts under BR2.4 once the old one is rejected"
    violation: "A second code path that changes an item's original"
    source: "T-303 step 6"
  - id: BR6.6
    statement: "No evidence state ever affects the review text."
    category: constraint
    applies_to: "every command in modules/evidence"
    trigger: "Always"
    logic: "no evidence command or query reads or writes reviews or review_drafts; review publication never waits for an item (U21 BR4.6)"
    violation: "A failed or removed file blocking or hiding the text (FR66, AC7.1.4)"
    source: "FR44, FR66, AC6.1.6, AC7.1.4, hard-rule checklist"

  # BR7 — The author's view model
  - id: BR7.1
    statement: "EvidenceAuthorItemVM carries only the fields the composer needs and never a name, account, key, hash, hold or storage detail."
    category: privacy
    applies_to: "evidence.getForAuthor"
    trigger: "Every mapping"
    logic: "fields: itemId, publicId, group, state, stateKey, failReason?, failKey?, pageCount, previewPages (always [] until U25), privacyConfirmed, canRemove, canReplace; absent by construction: declared name, original_filename_enc, uploaded_by_account_id, storage keys, sha256, bytes, hold_id, review_id, review_draft_id, label"
    violation: "An original file name or account id in a view model (task threat, 03 §2)"
    source: "T-303 step 5 and threat notes, contract privacy rules"
  - id: BR7.2
    statement: "Every state and failure reason maps to a message key in both languages."
    category: presentation
    applies_to: "getForAuthor mapping, packages/i18n"
    trigger: "Every mapping"
    logic: "stateKey = 'ev.state.' + camel(state) for all eleven states; failKey = 'ev.fail.' + camel(failReason) when failReason is set; camel(snake) lower-camel-cases; a test iterates EVIDENCE_STATES and EVIDENCE_FAIL_REASONS and asserts each key exists in en.json and bn.json"
    violation: "A raw enum value or a missing translation on the chip"
    source: "T-303 owned paths (strings), Question 15, ADR 0011"
  - id: BR7.3
    statement: "canRemove and canReplace are true exactly when evidence.remove would succeed."
    category: presentation
    applies_to: "getForAuthor mapping"
    trigger: "Every mapping"
    logic: "canRemove = canReplace = state IN BR6.1's removable set; rejected, published, original_expired, removed → false"
    violation: "A Remove button that leads to a conflict"
    source: "T-303 step 5, BR6.1"
  - id: BR7.4
    statement: "privacyConfirmed is true for privacy_confirmed and published items only; previewPages stays empty in this Unit."
    category: presentation
    applies_to: "getForAuthor mapping"
    trigger: "Every mapping"
    logic: "privacyConfirmed = state IN (privacy_confirmed, published, original_expired); previewPages = [] (U25 fills it for preview_ready and privacy_confirmed)"
    violation: "A preview URL served before U25's author-only preview route exists"
    source: "T-303 step 5 ('T-305 fills')"

  # BR8 — Privacy, audit and the worker boundary
  - id: BR8.1
    statement: "Custody events and audit rows of the author's own actions name the opaque actor author, never an account id."
    category: privacy
    applies_to: "evidence.intake, evidence.remove (and U25's author actions)"
    trigger: "Every custody or audit write for an author action"
    logic: "actor = 'author'; staff keep account:<staffId>, the worker worker, retention system:retention, deletion system:deletion; the link item → account is only evidence_items.uploaded_by_account_id"
    violation: "Staff or the worker linking an account to an anonymous review through custody or audit (U25 F5, S1)"
    source: "Question 11, U25 FD entry (a), FD-015, FD-016"
  - id: BR8.2
    statement: "Audit, custody and log details are allowlisted: ids, enums, counts and booleans only."
    category: privacy
    applies_to: "every write in modules/evidence and adapters/storage-fs"
    trigger: "Every audit row, custody event and log line"
    logic: "audit details: intake {group, declaredMime, bytes}, remove {fromState, held}; custody details: received {bytes, declaredMime}, removed {by, held}; log fields: event, correlationId, itemId, reason, counts, durations; never a name, key, hash of a name, email or body"
    violation: "Free text in an audit row or log (01 §5, §11; AC7.1.6)"
    source: "01 §5, §11, FR68, AC7.1.6"
  - id: BR8.3
    statement: "The worker holds on evidence_items only the column privileges its jobs need."
    category: constraint
    applies_to: "rk_worker, migration of this Unit"
    trigger: "Migration"
    logic: "REVOKE SELECT, INSERT, UPDATE, DELETE ON evidence_items FROM rk_worker; GRANT SELECT (id, public_id, seed_ref, review_id, review_draft_id, group, label_en, label_bn, state, fail_reason, declared_mime, detected_mime, original_bytes, original_sha256, page_count, retention_expires_at, hold_id, published_artifact_id, created_at, updated_at); GRANT UPDATE (state, fail_reason, detected_mime, page_count, updated_at, retention_expires_at); nothing else; probes as a real rk_worker session prove each denial"
    violation: "The worker reading original_filename_enc, uploaded_by_account_id or idempotency_key, or rewriting review_id (ISS-139, ISS-239)"
    source: "02 §16 PR2 and PR3, FD-092, Question 3, U24 F1"
  - id: BR8.4
    statement: "The uploader's account id reaches the worker only in the evidence.received payload."
    category: constraint
    applies_to: "evidence.intake outbox row"
    trigger: "Intake"
    logic: "payload exactly {itemId, uploaderAccountId}; no reviewId (none exists at intake), no group, no name"
    violation: "The worker unable to address its in-app notice (U24 F2), or more data than C15 allows"
    source: "C15, FD-070, Question 3"
  - id: BR8.5
    statement: "Errors never echo user input."
    category: privacy
    applies_to: "the upload route, evidence commands"
    trigger: "Every refusal"
    logic: "AppError carries code, messageKey, fieldErrors keys and correlationId only; never the file name, the client key or the draft id"
    violation: "A file name in an error body or log"
    source: "01 §3, AC7.1.6"

  # BR9 — Build constraints
  - id: BR9.1
    statement: "Each file sits where T-010's boundary matrix allows it."
    category: constraint
    applies_to: "every file of this Unit"
    trigger: "pnpm lint, lint:boundaries"
    logic: "domain/evidence imports nothing; application/modules/evidence imports only domain and contracts and names no Node or library type (streams are AsyncIterable<Uint8Array>); adapters/storage-fs uses node:fs, node:crypto, node:stream; the parser and Readable.fromWeb live in apps/web/src/app/api/evidence/upload/route.ts (web element); adapters are built only in apps/web/src/server/container.ts; components import only server actions"
    violation: "A red pnpm check"
    source: "01 §2, FD-093"
  - id: BR9.2
    statement: "The test pins this Unit's changes move are updated in the same commit."
    category: constraint
    applies_to: "packages/database tests, packages/test-support fakes"
    trigger: "Code Generation"
    logic: "not-implemented.test.ts: PgEvidenceRepository's intake, getForAuthor and remove leave the stub list (the remaining stubs keep their owners); both migration-count pins +1; validator-probes ISS-139 it.fails becomes a passing it; foreign-keys.int.test.ts matches the composite key; repositories-superset and port-fakes tests follow the reshaped fakes"
    violation: "A red pnpm check"
    source: "ISS-294, T-010"
  - id: BR9.3
    statement: "Every package this Unit touches stays at or above 80% line coverage, with untested files counted."
    category: constraint
    applies_to: "domain, application, adapters, database, contracts, test-support, apps/web"
    trigger: "pnpm test:coverage"
    logic: "each new file has its own tests (functional-spec.md § 11)"
    violation: "A red pnpm check"
    source: "D10, FD-093"
  - id: BR9.4
    statement: "Every new user-facing string has an English and a Bengali entry with the same key, in the same commit."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "the keys of functional-spec.md § 8; the Bengali drafts go to the owner's copy review (FD-042)"
    violation: "A key without its Bengali string (project Mandated rule)"
    source: "ADR 0011, FD-024, project.md Mandated"
```

## Summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Verified, unrestricted account; checked before reading the body | authorization |
| BR1.2 | Open draft of the actor, else 404 before any byte | authorization |
| BR1.3 | Composite key ties item, draft and uploader | constraint |
| BR1.4 | getForAuthor: uploader only, all or nothing | authorization |
| BR1.5 | remove: uploader only | authorization |
| BR1.6 | 40 files per hour per account; replays free | policy |
| BR2.1 | jpg/jpeg/png with matching MIME | validation |
| BR2.2 | Safe file names; no inner dangerous extension | validation |
| BR2.3 | 15 MiB per file by byte count | validation |
| BR2.4 | 10 files per draft (and edited review) | validation |
| BR2.5 | 100 MiB per draft | validation |
| BR2.6 | Re-check under a per-draft lock | constraint |
| BR2.7 | Empty file refused | validation |
| BR2.8 | Web tier never inspects content | constraint |
| BR3.1 | Fixed key patterns | constraint |
| BR3.2 | Paths stay under the root | constraint |
| BR3.3 | Streamed, hashed while streaming | constraint |
| BR3.4 | No partial file survives | constraint |
| BR3.5 | Encrypted at rest (storage-only key) | constraint |
| BR3.6 | No public write; no original served | constraint |
| BR3.7 | Idempotent delete, nameless log | policy |
| BR4.1 | One transaction: item, artifact, custody, audit, outbox | constraint |
| BR4.2 | No row without file, no file without row | constraint |
| BR4.3 | Idempotent per account and key | policy |
| BR4.4 | File name encrypted, never projected | privacy |
| BR4.5 | Relay is the only job producer | policy |
| BR4.6 | Per-file outcomes; refused parts drained | policy |
| BR5.1 | One transition table keyed by actor | state |
| BR5.2 | Failure reasons per stage | state |
| BR5.3 | Compare-and-set on every change | constraint |
| BR5.4 | Public artifacts only for published items | constraint |
| BR6.1 | Author removes before publication → rejected | state |
| BR6.2 | Custody and audit, no outbox | audit |
| BR6.3 | Files deleted after commit unless held | policy |
| BR6.4 | A hold is never revealed to the author | privacy |
| BR6.5 | Replace = remove + intake | policy |
| BR6.6 | Evidence never touches the text | constraint |
| BR7.1 | Author view model fields | privacy |
| BR7.2 | Keys for every state and reason | presentation |
| BR7.3 | canRemove matches remove | presentation |
| BR7.4 | privacyConfirmed; no preview yet | presentation |
| BR8.1 | Actor `author` on custody and audit | privacy |
| BR8.2 | Allowlisted details and logs | privacy |
| BR8.3 | Worker column privileges | constraint |
| BR8.4 | Uploader id only in evidence.received | constraint |
| BR8.5 | Errors never echo input | privacy |
| BR9.1 | Boundary placement | constraint |
| BR9.2 | Test pins updated | constraint |
| BR9.3 | 80% coverage | constraint |
| BR9.4 | en and bn keys together | constraint |
