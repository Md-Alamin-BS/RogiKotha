# Functional Design questions — U23 `t-303-evidence-intake`

Draft written ahead of the stage on 2026-10-29. When the workflow reaches this Unit, the lead finalises it and the reviewer checks it; then the files move to `<record>/construction/t-303-evidence-intake/functional-design/`. Unit U23 is **high risk** (evidence, identity linkage, storage of untrusted bytes).

Every question below was decided by the agent under the owner's no-questions instruction of 2026-10-29 ("just approve what you think best and recommended"). The recommended option is listed first and is the answer. Questions 1, 3, 4 and 11 change a data boundary or a requirement, so `functional-spec.md` § 17 carries the FD entry text the build appends before code.

## Context

Read for this draft (baseline `main` at `9cf860a`, T-010 merged as `14c21a9`, T-011 building on `bolt/t-011-patient-design-and-motion-system`):

- `docs/implementation/tasks/T-303-evidence-intake.md` (with its 2026-09-12 images-only block, FD-036).
- `unit-of-work.md` U23 (depends on U8 T-101 and U3 T-010) and the open point "Evidence-to-draft link … U23 Functional Design"; `unit-of-work-dependency.md`; `unit-of-work-story-map.md` (US7.1 → U23, U24, U26, U28, U41).
- `requirements.md` FR44, FR60–FR62, FR66–FR68, NFR2; `stories.md` US7.1 (AC7.1.1–AC7.1.6) and AC6.1.6.
- `contract-summary.md` C8, C14, C15 and the common rules; `docs/status/decision-log.md` FD-001 to FD-094.
- `01-conventions.md` §1–§5, §10, §11, §13; `02-data-model.md` §0, §6, §7, §10, §16, §17; `03-routes-and-contracts.md` §1, §3, §4, §5.
- Code: `packages/database/src/schema/evidence.ts`, `repositories/evidence.ts` (stubs), `repositories/not-implemented.test.ts`, `migrations/0001`, `0003`, `0005`, `0008`, `validator-probes.int.test.ts` (ISS-139 `it.fails`), `migrations.int.test.ts` (9 migrations), `schema/foreign-keys.int.test.ts`; `packages/contracts/src/{schemas/evidence.ts, view-models/evidence.ts, errors.ts, enums.ts, ids.ts}`; `packages/test-support/{src/fakes/storage.ts, src/fakes/repositories.ts, src/builders/evidence.ts, src/seed/seed-evidence.ts, src/seed/derivatives.ts, fixtures/README.md, scripts/build-fixtures.mjs}`; `apps/web/{package.json, next.config.ts, src/proxy.ts}`; `infra/compose/.env.example`; `packages/i18n/messages/{en,bn}.json`.
- Prototype: `concepts/concept-04b-quiet-clinic-minimal/app.js` `evFileHtml`, `advanceFile`, the `#add-file`, `data-rmfile`, `data-refile` handlers; `shared/rogikotha-data.js` `ev.*` strings.
- Sibling drafts: U8 T-101 (ports, `defineCommand`, `Crypto`, mail-only worker key), U21 T-301 (`EvidenceForPublish`, Question 9 binding, Question 10 persona actor), U24 T-304 (§ 6.4 "What this Unit needs from U23", F1–F20, FD entries), U25 T-305 (F1, F5, FD entry (a), WF4, WF10), U26 T-306 (F13, F30, the upload flow).
- `docs/implementation/ISSUES.md` rows ISS-139, ISS-165, ISS-181, ISS-182, ISS-199, ISS-239, ISS-294; `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` (answers to 2026-10-29).
- npm registry, read 2026-10-29: `@fastify/busboy` 3.2.4 (MIT, ships types); `busboy` 1.6.0 (MIT, no types, last release 2022).

## Settled before this stage

- **Images only** (FD-036, the task's scope block): JPEG and PNG, extensions `.jpg`, `.jpeg`, `.png`; every mention of PDF in the task body is overridden. Limits 10 files, 15 MB each, 100 MB total (FR61).
- **Quarantine first, fail closed** (FD-035, AD-6, AD-7): the web tier stores untrusted bytes and never parses, renders or serves them; magic bytes, scanning and sanitising are U24's.
- **Worker boundary** (FD-037, FD-041, FD-092, `02-data-model.md` §16): every change to `rk_worker`'s privileges needs an FD entry; PR2 and PR3 are planned removals assigned to this Unit's step 8.
- **Worker-started notices are in-app only** (FD-070); recipients travel in event payloads (C15).
- **Pending files bind privately to the new review** (U21 T-301 Question 9 A): `EvidenceForPublish.itemsOfDraft` and `bindToReview` are built by this Unit if it can (U25 T-305 Question 1).
- **Moderator `removeFile` and original access are U25's** (C8; T-305 F11). This Unit builds only the author's own removal.
- **Construction may run in parallel** (FD-094): this Unit has no edge to U21 T-301, so it must not edit T-301's files; every review-side piece it needs goes into new files.
- **No numbers stand for quality, Bengali and English equal** (project hard rules): no string here holds a quality figure; every new key has both languages.
- **Owner's answers that touch this Unit:** separate mail-only worker key (T-101, the pattern Question 4 follows); masked own email and "Former member" (no effect here).

Decisions made without a question (each explained in `functional-spec.md` § 13): fixtures stay as T-007 built them; author removal of a held item looks normal and keeps the files (FD-079's pattern); removal sends no outbox event; the domain limits are a second copy of `EVIDENCE_LIMITS`, pinned equal by a test.

## Question 1

**How is an evidence item linked to the draft it was uploaded for?** `evidence_items.review_id` is `NOT NULL` with a foreign key to `reviews`, but intake happens before any review exists, so the task's insert with `review_id: null` fails (U24 F7, U25 F1). The task says "no new column: the draft payload lists `evidenceItemIds`"; then the server cannot count a draft's files or bytes (FR61, AC7.1.3), and U21's `itemsOfDraft` can only check the uploader, not the draft.

A. **New column `review_draft_id`, `review_id` nullable, and a composite foreign key** (recommended): `(review_draft_id, uploaded_by_account_id) → review_drafts (id, account_id) ON DELETE SET NULL (review_draft_id)`, backed by a new unique key `review_drafts (id, account_id)`. The database itself refuses an item linked to another account's draft. A check keeps `published` and `original_expired` items tied to a review. Deleting or purging a draft clears the link and leaves the item for U29's sweep. One forward-only migration; touches `review_drafts` only with the unique key, in SQL.
B. **New column with a plain foreign key to `review_drafts (id)`**, ownership checked only in the application. Simpler SQL; a bug in one command could link an item to a foreign draft.
C. **The task's form: `review_id` nullable only, no draft column.** Limits cannot be enforced per draft on the server; concurrent uploads and a forged `evidenceItemIds` list are bounded only by the hourly rate limit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**How does intake check, before storing any byte, that the draft is the actor's own open draft?** Drafts belong to Review (U21), which sits above Evidence; this Unit has no dependency edge to U21 and may be built beside it (FD-094).

A. **Evidence declares an `EvidenceDraftAccess` port; this Unit implements it on the Review side in new files** (recommended): `modules/evidence/ports.ts` declares `openDraftOf({accountId, draftId}) → {reviewId: string | null} | null`; `modules/review/evidence-draft-access.ts` implements it over a new `PgReviewDraftAccess` (`packages/database/src/repositories/review-draft-access.ts`) that reads `review_drafts (id, account_id, review_id, expires_at)` only. FD-067's direction (lower module declares, higher implements); no file U21 owns is touched; Question 1's key is the second net.
B. **Read `review_drafts` inside `PgEvidenceRepository`.** Fewer files; Evidence code reads another module's table, against the module data rule.
C. **No pre-check; rely on the foreign key at insert.** A foreign draft is refused only after up to 15 MB were written to quarantine and then deleted.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**What does the worker keep on `evidence_items`, and how does it learn the uploader?** Task step 8 plans a column-level `REVOKE`, which PostgreSQL ignores while the table-level `SELECT` of `0005` exists (U24 F1), so ISS-139 would stay open. C15's `evidence.stateChanged` needs `uploaderAccountId`, which the worker cannot read after PR3 (U24 F2).

A. **Column lists, narrowed** (recommended): revoke all four table-level privileges; grant `SELECT` on every column except `original_filename_enc`, `uploaded_by_account_id` and `idempotency_key`; grant `UPDATE` only on `state`, `fail_reason`, `detected_mime`, `page_count`, `updated_at`, `retention_expires_at`; no `INSERT`, no `DELETE` (no job inserts items, and rows are never deleted because custody is append-only). The web tier writes `evidence.received {itemId, uploaderAccountId}`, which the worker carries on. Closes ISS-139 and ISS-239; U24 drops its own FD entry (a).
B. **U24's form**: `SELECT` and `UPDATE` on every column except the two private ones; `INSERT` and `DELETE` kept. Matches the U24 draft word for word; the worker could still rewrite `review_id` or delete rows.
C. **Keep the worker's read of `uploaded_by_account_id`** and revoke only the filename. The event payload needs no new field, but the worker keeps a bulk account-to-evidence (and through `review_id`, account-to-review) map.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**Are originals encrypted at rest?** FR67 says originals "remain encrypted and private"; the task's filesystem adapter writes plain bytes (U25 F20, U24 F16). The worker must read originals but has no `APP_ENCRYPTION_KEY` (U8 removes it from the worker's process).

A. **The storage adapter encrypts every object under `quarantine/` and `private/` with AES-256-GCM, using a storage-only key `STORAGE_ENCRYPTION_KEY`** given to the web tier and the worker (recommended). Encryption happens while streaming; reads verify the tag before returning a byte; `sha256` is of the plaintext. The same pattern as the owner's separate mail-only worker key. New secret, so an FD entry (it changes `01-conventions.md` §11's worker environment).
B. **No encryption in release 1**: FR67 narrowed to "private" for the local demo by an FD entry. Faster; a copied storage folder exposes every original.
C. **Encrypt with `APP_ENCRYPTION_KEY`**: the worker would need the application key, against U8's rule.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**Which multipart parser streams the upload?** Next's `request.formData()` buffers each file, which breaks "stream to quarantine" (task step 3).

A. **`@fastify/busboy` 3.2.4** (recommended): a maintained fork of busboy (it is what `undici` uses), MIT, ships its own types, yields one stream per file part. Its constructor and event signatures differ from busboy 1.x; Code Generation reads its README and records the dependency check.
B. **`busboy` 1.6.0** as the task says, plus `@types/busboy`. Stable but unmaintained since 2022.
C. **`request.formData()`**: no dependency; buffers whole files in memory (refused by the task's own acceptance row).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**In which states may the author remove an item?** The prototype shows Replace and Remove on every chip, whatever its stage. `02-data-model.md` §17 allows `preview_ready|failed → rejected`; the task adds `quarantined` and `privacy_confirmed`. U24's draft assumed removal is refused while scanning (its F8).

A. **Every state before publication**: `quarantined`, `validating`, `scanning`, `sanitising`, `preview_ready`, `privacy_confirmed`, `failed` → `rejected` (recommended). Matches the prototype and FR66; every transition is a compare-and-set, so the worker's next write fails and it removes its own files (U24 WF9). Removing an item already `rejected` returns `ok` (retry-safe). `published`, `original_expired` and `removed` → `conflict`.
B. **The task's set** (`quarantined`, `preview_ready`, `failed`, `privacy_confirmed`). The author waits for the pipeline before a mistaken upload can go.
C. **§17's set only.** Narrowest; an item stuck in `quarantined` cannot be removed.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**Does intake enqueue `evidence.process` directly as a fast path?** Task step 4 enqueues it after the commit as well as writing the outbox row; the relay then enqueues a second job under a different key (U24 § 6.4 item 1).

A. **Outbox only** (recommended): the relay (every 2 s, FD-038) is the single producer, so every job carries the envelope and the relay's key. Adds at most about 2 seconds before processing starts, inside NFR2's 5-minute target.
B. **Both, with the relay's key** computed in the web tier. Two producers to keep in step.
C. **Direct enqueue only.** Loses the transactional outbox (FD-038).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**What does `evidence.getForAuthor` take?** The contracts stub has `{draftId}` (03 §4); the task and U26 use `{itemIds}`; U25 adds a `{reviewId}` form for items bound to a published review.

A. **`{itemIds}` (1 to 10 ids)**, all of which must be the actor's (recommended). Works for draft and bound items alike, matches U26's polling; any foreign or unknown id refuses the whole call with `forbidden`. U25 adds `{reviewId}` additively.
B. **`{draftId}`**, listing the draft's items. Needs no client list; does not cover items bound to a published review.
C. **Both forms now.** More surface than any caller needs in this Unit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**What shape does the `Storage` port take, and which keys are valid?** Task step 2 has `putDerivative` writing to `public/`; U24 needs private derivatives (F5), U25 publishes by a row flag with no file move (its Question 12 A) and every artifact needs a `sha256` (U25 F14). The seed's derivatives use `public/<itemPublicId>/…`, which the task's key pattern refuses (U24 F13).

A. **`putQuarantine`, `putPrivateDerivative`, `readPrivate`, `head`, `delete`; no public write** (recommended). Writes return `{key, bytes, sha256}`. Keys written by this adapter are `quarantine/<uuid>/<uuid>` and `private/<uuid>/<name>`; the read side also accepts the seed's legacy `public/<publicId>/<name>`. Every key is checked against the patterns and its resolved path must stay under `STORAGE_ROOT`.
B. **The task's shape** with `putDerivative` to `public/`; U24 and U25 each add methods. Two Units reshape this Unit's port.
C. **Re-key the seed now** to the uuid form. Touches the seed, which U24 replaces anyway (its "re-seed through the pipeline" TODO).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**How is the idempotency key scoped?** `evidence_items.idempotency_key` is unique across all accounts. The task returns "the existing item" for a known key, so a second account sending the same key would receive the first account's item id and state.

A. **Store `Crypto.hmac('evidence.intake', accountId + ':' + clientKey)`** (recommended). Two accounts can never collide; the stored value reveals neither the account nor the client key; the lookup is by the computed value only.
B. **Store the client key, look it up with the uploader.** A key already used by another account fails the unique index with a confusing `conflict`.
C. **Store `<accountId>:<clientKey>`.** Writes the account id into a column (the worker could read it under option B of Question 3).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**Who is the actor on the custody events and audit rows of the author's own actions?** `02-data-model.md` §7 and the seed write `account:<id>`. The worker reads custody and staff read it in the quarantine view, so once an item is bound to an anonymous review, the custody actor links the account to that review without `identity.reveal` (U25 F5, S1).

A. **The opaque actor `author`** for intake and author removal, as U25 T-305's FD entry (a) sets for every author action (recommended). This Unit is the first writer, so it appends that FD entry; U25 drops it. The uploader stays only in `evidence_items.uploaded_by_account_id`.
B. **`account:<id>` for draft items, `author` once bound.** Two rules; the binding happens after the custody rows were written.
C. **Keep `account:<id>`.** The S1 link stays.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**What counts toward the 10-file and 100 MB limits, and how are races closed?**

A. **Items of the draft, plus the items of the review the draft edits, in any state except `rejected` and `removed`** (recommended). A failed item counts until the author removes or replaces it. The route pre-checks before streaming; the persist transaction takes a per-draft advisory lock, counts again and refuses (deleting the stored object) if a concurrent upload got there first.
B. **Only items still processing or ready count.** A failed file stops counting while still shown to the author.
C. **Pre-check only.** Two parallel uploads can both pass and leave 11 files.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**What does the upload route answer?** C14 lists `200 [{itemId, state}]` and `400` for the evidence codes; the task answers per file; U41 T-502 plans `413`/`415`.

A. **Per-file results in a `200` body for a well-formed request; whole-request statuses only for whole-request faults** (recommended): `{items: [{clientKey, result}]}` where `result` is `Result<{itemId, publicId, state}>`; `401` anonymous; `403` unverified or restricted; `404` not the actor's open draft; `400` malformed multipart, missing or invalid `draftId` or `group`, or more than 10 file parts; `413` when `Content-Length` exceeds 101 MB (T-502 adds the origin check). C14 and T-502's rows are corrected to this.
B. **Fail the whole request on the first bad file.** The author loses the good files of a batch.
C. **One file per request.** Simpler route; the composer sends N requests.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**How does each file part carry its idempotency key?** The task sends `idempotencyKey` fields "then files"; pairing a field with the next file is fragile.

A. **The file part's field name is `file:<idempotencyKey>`** (recommended), the key a UUID the client generates; a part with any other name, or a repeated key in one request, gets a per-file `validation`. The key is also the response's `clientKey`.
B. **A field `idempotencyKey` immediately before each file.** Order-dependent.
C. **A JSON manifest field listing keys in file order.** One more field to keep in step.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**Which state and failure keys does the author see, and in what words?** The task names enum-based keys; the prototype's keys use other names (`quarantine`, `checking`, `redact`, `processing`, `ready`), and "Making the public copy" would describe `sanitising`, which makes a private copy (U24 F12, U26 F30).

A. **One key per enum value, `ev.state.<camelState>` and `ev.fail.<camelReason>`**, copied from the prototype where the meaning matches; `sanitising` reads "Preparing a private copy" (recommended). The prototype's keys stay in the message files for U26 to drop when it ports the chip. Every failure key names what to do next (FR66, AC7.1.4).
B. **Map the enum onto the prototype's keys.** Fewer keys; `sanitising` and `privacy_confirmed` have no truthful match.
C. **Rename the prototype's keys in place.** Breaks the parity with the prototype's string table that U26 reads.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
