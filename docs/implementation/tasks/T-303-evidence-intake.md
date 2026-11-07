# T-303 — Evidence intake: streaming upload to quarantine

| Field | Value |
|---|---|
| Story | STORY-EVID-001 (intake half), FR-FILE-001–003/009 |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 4–5 h agent; validation 1.5 h |
| Depends on | T-005 (evidence tables), T-009 (worker skeleton / JobQueue), T-101 (Actor, verified email) |
| Parallel-safe with | T-301, T-302, T-206, T-207 (T-303 owns only the `evidence` module and the upload route) |

## Amendments — release 1 (FD-105, U48 `u48-evidence`)

These decisions override the text below where they differ; the design is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u48-evidence/functional-design/functional-spec.md`.

- **FD-105: what release 1 builds** — upload to quarantine, the author's own list and removal, and the public count. The route is `POST /api/evidence/upload`: one `file` part per request (not busboy), `request.formData()` after a Content-Length cap of 15 MB + 64 KB, then the bytes stream to the writer. The command is `evidence.intake` with `reviewPublicId`; it is attached to a published review of the author, not a draft (`draftId`, `group` and the draft link are gone). The module is `packages/application/src/modules/evidence/`; the table above of owned paths is replaced by U48's owned-paths list in the plan.
- **FD-105: acceptance rows changed** — Streams: the body is bounded in memory by the Content-Length cap and then streamed to the writer (test: "streams the whole file to the writer"); Idempotent: a repeat answers `200` with the existing item, also for the retry of the upload that made the tenth item; Owner only: a foreign `getForAuthor` answers null and a foreign `remove` answers `not_found` (404), not `forbidden`; Remove states: `remove` ends in `removed` (not `rejected`), allowed from every state except `removed`, and answers `not_found` for an item already removed; Limits: no PDF, `.pdf.exe` and `.docx` are refused by the type checks; Worker grants: **not met at grant level** (ISS-139, ISS-632): `rk_worker` has table-wide SELECT, and BR4.8 keeps `original_filename_enc` and `uploaded_by_account_id` out through the worker repository's column list, pinned by `evidence.int.test.ts`; no migration.
- **FD-105: extra rules** — a rate limit of 30 uploads per account per hour (`evidence.upload:account:<accountId>`, `429 evidence.rate_limited`, ISS-630); the writer and reader ports are split so the web tier cannot read an original (BR3.6, tested by the web container test); a refused or repeated upload's quarantined key is deleted (BR3.4); a storage root inside `apps/web` refuses start-up (BR3.3).
- Fixtures, `pnpm fixtures:build`, the `rk_worker` revoke migration (step 8) and the composer polling (step 5) are not built in release 1.

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


This block overrides every mention of PDF below. Phase 1 accepts **JPEG and PNG only** (`.jpg`, `.jpeg`,
`.png`; declared MIME `image/jpeg`, `image/png`). Any other extension or MIME is refused at the route
with `evidence.type_rejected` before a byte is stored. `page_count` is always 1. Limits stay 10 files /
15 MB each / 100 MB total. Fixtures: replace `prescription.pdf` with `prescription-1.jpg` and
`prescription-2.jpg` (two JPEGs, DEMO marker text drawn into the pixels), drop `encrypted.pdf`, keep
`photo.jpg` (EXIF GPS), `not-a-png.png` (JPEG bytes named .png → type mismatch in the worker), add
`broken.jpg` (truncated JPEG → `malformed`), `oversize.png` (16 MB), and `flagged.jpg` (a valid JPEG
with the ASCII string `ROGIKOTHA-MALWARE-TEST-MARKER` inside a COM segment — matched by the custom
ClamAV signature T-002 mounts, so malware detection can be demonstrated without EICAR). PDF, HEIC and
Office intake are Phase 2: `docs/implementation/07-phase-2-document-evidence.md`.

## Goal

Accept JPEG/PNG/PDF from a verified author, stream each file straight into private quarantine under
a server-generated key without buffering whole files in memory, enforce the count/size limits,
record the item with a `received` custody event, enqueue processing, and give the composer a query it
can poll. The web tier never parses, renders or serves the original.

## Read first

1. `docs/implementation/01-conventions.md` §3, §4 (Files), §5, §11
2. `docs/implementation/02-data-model.md` §0 (`evidence_state`, `evidence_fail_reason`, `custody_event`), §7, §16 (roles), §17 "Evidence"
3. `docs/implementation/03-routes-and-contracts.md` §1 route handlers (`/api/evidence/upload`), §3 ports (`Storage`, `JobQueue`, `Outbox`, `RateLimiter`), §4 "evidence" (`intake`, `getForAuthor`, `remove`), §5 events
4. `docs/architecture/ARCHITECTURE-SPINE.md` AD-6, AD-7; `docs/scope-of-work.md` §5
5. `docs/planning/08-product-backlog.md` STORY-EVID-001 (limits: 10 files, 15 MB each, 100 MB total)
6. Prototype: `app.js` `evFileHtml` 1512–1530 (states the UI shows: `quarantine → checking → scanning → redact → processing → ready | failed`; `ev.replace`, `ev.remove`), the `#add-file` / `data-rmfile` / `data-refile` handlers 2704–2725; `ev.state.*`, `ev.failNote` strings
7. `docs/implementation/05-demo-storyboard.md` "Fixtures"

## Owned paths

- `packages/domain/src/evidence/evidence.ts`, `evidence-state.ts`, `limits.ts`, `index.ts`, tests
- `packages/application/src/modules/evidence/commands/{intake,remove}.ts`, `queries/get-for-author.ts`, `authorization.ts`, `index.ts`, tests
- `packages/application/src/ports/repositories/evidence.ts`, `ports/storage.ts` (create if T-003 left a stub)
- `packages/adapters/src/storage-fs/**` (+ tests)
- `packages/database/src/repositories/evidence.ts` (+ int tests)
- `apps/web/src/app/api/evidence/upload/route.ts`, `apps/web/src/server/actions/evidence.ts` (only `getForAuthor`, `remove`)
- `packages/contracts/src/schemas/evidence.ts`, `view-models/evidence.ts` (author-side VM: `EvidenceAuthorItemVM`)
- `packages/test-support/src/fakes/{storage,evidence-repository}.ts`, `packages/test-support/fixtures/**` + `scripts/build-fixtures.ts` (`pnpm fixtures:build`)
- `packages/i18n/messages/{en,bn}.json` — `errors.evidence.*`, `ev.state.quarantined|validating|scanning|sanitising|previewReady|privacyConfirmed|published|failed`, `ev.fail.<reason>` for each `evidence_fail_reason`

## Not in scope

Magic-byte detection, scanning, sanitising (T-304). Redaction, privacy confirmation, public
artifacts, viewer (T-305, T-308). Retention/holds (T-309). Composer UI (T-306).

## Steps

1. **Domain** `evidence.ts` (`EvidenceItem`, `Artifact`, `CustodyEvent` types), `evidence-state.ts` (full table from `02-data-model.md` §17 "Evidence" — this task uses only `quarantined`, `rejected`, `removed`; T-304/T-305 use the rest but the table is written once, here, with a full table test), `limits.ts`: `MAX_FILES = 10`, `MAX_BYTES = 15 * 1024 * 1024`, `MAX_TOTAL = 100 * 1024 * 1024`, `ALLOWED = {jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf'}`; `checkDeclared({name, mime, bytes, existingCount, existingTotal}) → Result<void>` with error codes `evidence.too_many`, `evidence.too_large`, `evidence.total_too_large`, `evidence.type_rejected` (extension not allowed, or declared MIME not matching the extension, or double extension like `.pdf.exe`).
2. **Storage port** `ports/storage.ts` as in `03` §3; **fs adapter** `adapters/storage-fs`: root from `STORAGE_ROOT`; `putQuarantine(stream, {itemId})` writes to `quarantine/<itemId>/<uuid>` via `pipeline(stream, createWriteStream)` with a byte counter that destroys the stream and deletes the partial file when `MAX_BYTES` is exceeded; returns `{key, bytes, sha256}` (hash computed while streaming); `getPrivate(key)`; `putDerivative(bytes, {itemId, kind, page})` → `public/<itemId>/<uuid>.<ext>` (T-305 uses); `delete(key, {reason})` logs the reason via `Logger`; keys are validated against `^(quarantine|private|public)/[0-9a-f-]{36}/[^/]+$` — anything else is refused (path traversal).
3. **Upload route** `POST /api/evidence/upload` (multipart). Decision: use **`busboy`** (add to `apps/web` deps) — Next's `request.formData()` buffers each file into memory/blob, which violates "stream to quarantine"; busboy yields per-file streams from the raw `request.body` (convert the web stream with `Readable.fromWeb`). Add `export const runtime = 'nodejs'` and disable body size limits for this route (`export const maxDuration = 60`). Fields: `draftId`, `group` (`reviewed|later|outcome`), `idempotencyKey` (per file, client-generated `uuid`), then files. For each file: `checkDeclared` → on error respond per-file `{ok:false, error}` and drain the stream; on ok call `evidence.intake` with the stream. Response: `{ items: [{ clientKey, result: Result<{itemId, publicId, state}> }] }`. Actor from `getActor()`; refuse `anonymous`/unverified with 401/403 before reading the body.
4. **`evidence.intake` command**: requires `verifiedEmail` + `notRestricted`; owner of `draftId`; `rateLimiter.hit('evidence.intake:account:<id>', 40, 3600)`; idempotency: existing `evidence_items.idempotency_key` → return the existing item; `Storage.putQuarantine` → insert `evidence_items {state: 'quarantined', declared_mime, original_bytes, original_sha256, original_filename_enc: Crypto.encrypt(name), uploaded_by_account_id, group, review_id: null (draft-linked via `review_drafts` payload — store `draft_id` in a new nullable column? **No new column**: the draft payload lists `evidenceItemIds`; the command returns the id and the composer adds it to the draft on the next autosave; ownership is by `uploaded_by_account_id`)}` + `evidence_artifacts {kind: original, storage_key, sha256, bytes, mime: declared, public: false, immutable: true}` + custody `received {bytes, declared_mime}` + outbox `evidence.received {itemId}` in one transaction; **then** `JobQueue.enqueue('evidence.process', {itemId}, {singletonKey: itemId, retryLimit: 3})` (the outbox relay also does this; enqueueing directly is the fast path and is idempotent by `singletonKey`).
5. **`evidence.getForAuthor {itemIds}`** query · owner (`uploaded_by_account_id`) → `[{itemId, publicId, label, group, state, stateKey: 'ev.state.<state>', failReason?, failKey?, pageCount, previewPages: [{pageNo, url:'/api/evidence/items/<id>/preview/<n>'}] (T-305 fills), privacyConfirmed, canRemove, canReplace}]`. The composer polls this via a server action every 2 s while any item is in flight (`quarantined|validating|scanning|sanitising`).
6. **`evidence.remove {itemId}`** · owner while state ∈ {`quarantined`, `preview_ready`, `failed`, `privacy_confirmed`} → state `rejected` (author removal maps to `rejected` per §17; `removed` is moderator-only), custody `removed {by: 'author'}`, storage delete of original + any artifacts, audit. "Replace" in the UI = `remove` + new intake; no separate command.
7. **Fixtures script** `pnpm fixtures:build` generates (never commits binaries > 1 MB): `prescription.pdf` (2 pages, each with the text `DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD`, via `@cantoo/pdf-lib`), `photo.jpg` (sharp-generated 1600×1200 with EXIF GPS via `withMetadata({exif})`), `encrypted.pdf` (`@cantoo/pdf-lib` `encrypt`), `not-a-png.png` (PDF bytes renamed), `eicar.pdf` (a valid one-page PDF whose content stream embeds the EICAR test string as a literal), `oversize.png` (16 MB PNG — generated on demand, `.gitignore`d).
8. **Roles**: verify `rk_worker` can `SELECT/UPDATE evidence_items`, `INSERT evidence_artifacts/custody` but cannot read `original_filename_enc`? It can — the worker needs nothing from it; add a column-level `REVOKE` for `original_filename_enc` and `uploaded_by_account_id` from `rk_worker` in the T-004 roles migration **via a new migration in this task** (`00xx_evidence_worker_grants.sql`).
9. Strings both locales; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Streams, no buffering | `pnpm --filter @rk/web test upload.route` with a 14 MB fixture and `--max-old-space-size=64`? — instead assert via a counting stream that `putQuarantine` receives chunks before the request body has ended (mock storage records first-chunk time vs body-end time) | first chunk written before body end |
| Limits | same | 11th file → `evidence.too_many`; 16 MB → `evidence.too_large` and partial file deleted; total > 100 MB → `evidence.total_too_large`; `.pdf.exe` and `.docx` → `evidence.type_rejected` |
| Idempotent | `pnpm --filter @rk/application test intake` | same `idempotencyKey` twice → one item, one storage object |
| Custody + outbox | same | `received` event and `evidence.received` outbox row in the same transaction; on storage failure nothing is inserted |
| Path traversal | `pnpm --filter @rk/adapters test storage-fs` | key `../x` refused; `quarantine/<uuid>/a` accepted |
| Owner only | application tests | foreign `getForAuthor` → `forbidden`; foreign `remove` → `forbidden` |
| Remove states | same | `remove` from `published` → `conflict`; from `failed` → `rejected` + files deleted |
| Worker grants | `pnpm --filter @rk/database test grants` | `rk_worker` `SELECT original_filename_enc FROM evidence_items` → permission denied |
| Tree | `pnpm check` | green |

## Tests to write

- `evidence-state.test.ts` full table; `limits.test.ts` matrix (each extension/MIME combo; boundary bytes 15 MB exactly = allowed).
- `storage-fs.test.ts`: streaming write, hash correctness (compare with `sha256sum` of fixture), oversize abort deletes partial, key validation.
- `intake.test.ts`, `remove.test.ts`, `get-for-author.test.ts` (application, fakes).
- `upload.route.test.ts` (web; use `undici` `FormData` + `Request` to the route handler; multipart with 3 files including one rejected — response has per-file results and the rejected stream was drained).
- `evidence.int.test.ts` (database): repository + grants.

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Memory exhaustion via huge upload | streaming + byte counter abort at 15 MB; route `maxDuration` | `storage-fs.test.ts`, route test |
| Zip bomb / polyglot | not parsed in web tier; type check by magic bytes happens in the worker (T-304); web only checks extension + declared MIME | `limits.test.ts` |
| Path traversal in storage keys | server-generated keys; regex validation | `storage-fs.test.ts` |
| Original served by mistake | no route serves `quarantine/*`; `Storage.getPrivate` is used only by worker and the audited original route (T-305) | grep test: `apps/web` contains no `getPrivate` call outside `api/evidence/items/[id]/original` |
| Uploading to another user's draft | owner check on `draftId` | `intake.test.ts` |
| Flooding | rate limit 40 intakes/hour/account | `intake.test.ts` |
| Original filename leaks | encrypted at rest; never in VM or logs | `get-for-author.test.ts` asserts absence; logger allowlist |

## Hard-rule checklist

- [ ] Untrusted bytes go only to private quarantine under server keys; web never parses or serves originals.
- [ ] Limits enforced (10 / 15 MB / 100 MB; JPEG/PNG/PDF only).
- [ ] Custody events append-only; every intake has `received`.
- [ ] Original filename private (encrypted, never projected).
- [ ] Failed/removed files never affect review text publishability (no coupling in this module).
- [ ] Both dictionaries updated for every state and fail reason.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed

Built in U48 (release 1, FD-105) together with T-304: domain `evidence/` (limits, states, transitions, file type and structure checks, file-name cleaning), the `evidence` application module (admit, check, intake, remove, get-for-author, count-public), `PgEvidenceRepository`, `createFsEvidenceWriter`, the upload route, the slimmed server actions, the uploader and file row, and the deletion of the demo evidence path. Files and counts are in `construction/u48-evidence/code-generation/code-summary.md`.

### Not done and why

Fixtures and `pnpm fixtures:build`, the `rk_worker` column revoke, the composer polling and the PDF paths: release 2 or images-only (FD-105, CR-001). `getForAuthor` has no preview pages (T-305).

### Questions for the human

None open. The Bengali copy awaits the owner's review at U50 (ISS-640).

### Follow-ups

ISS-621 (worker storage root, S2, open), ISS-624 to ISS-632 and ISS-633 to ISS-641 (S4, see `docs/implementation/ISSUES.md`).

### `pnpm check` output summary

Green at the Unit's Build and Test gate; the numbers are in the code summary.

### Hard-rule evidence

Adversarial A1 to A5 (disguised files, size and count limits, foreign accounts, path traversal, scanner outage) held after ISS-620 was fixed; no route reads an original; the file name is sealed and never in a log line or answer.
