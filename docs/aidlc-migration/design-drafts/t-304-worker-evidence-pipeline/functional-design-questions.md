# Functional Design — questions (U24 `t-304-worker-evidence-pipeline`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-304-worker-evidence-pipeline/functional-design/`.

Context:
- Unit U24 (kind `service`, size L, **high risk**: evidence) delivers T-304 (`docs/implementation/tasks/T-304-worker-evidence-pipeline.md`, with its FD-070 amendment and the 2026-09-12 images-only scope block) for US7.1 and the evidence part of US10.1. Depends on U23 T-303, U3 T-010 and U4 CR-011 (`unit-of-work-dependency.md`). Responsibilities name ISS-139, ISS-181 and ISS-182.
- Inputs and code read are listed in `functional-spec.md` (opening paragraph and § Sources). Baseline `main` at `9cf860a`. U23 T-303 has no draft yet, so § 6.4 of `functional-spec.md` states what this Unit needs from it.
- Every question below is decided by the recommended option (always A) under the owner's instruction of 2026-10-29 ("dont ask any questions … approve what you think best and recommended"). Questions 1, 2 and 3 change a data boundary or the mechanism of a hard rule; their FD entries are written out in `functional-spec.md` § 18. Each decision is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it, so the owner can still change it.

## Settled before this stage

Decided by FD entries, contracts, an earlier Unit or the owner, and not asked again.

- **Images only (FD-036).** No PDF code, no `PdfRasteriser`, no `pdfjs-dist` or `@napi-rs/canvas`, no `EVIDENCE_MAX_PAGES`; `too_many_pages` and `encrypted` stay unused.
- **Fail closed (FD-035, 01 §11, AD-6).** A scan that cannot run never advances an item.
- **Worker notices are in-app only (FD-070, FD-041).** No `mail.send`, no `email_deliveries` row, no address read, whatever `emailEvidence` says.
- **Retries (FD-076, the owner's CR-011 Q5 answer).** `evidence.process` keeps `retryLimit 3`; jobs are idempotent; the relay is transactional (FD-038).
- **Worker boundary (AD-6, FD-093).** The worker reaches application code only through `@rogikotha/application/worker` and imports no `better-auth`, `drizzle-orm` or `pg`; `application` imports no external package or Node built-in.
- **Separate mail-only worker key (the owner's answer to T-101 R1).** The worker process holds no `APP_ENCRYPTION_KEY`; this Unit never needs it (finding F16).
- **Parallel build (FD-094).** U24 never shares a batch with U23; § 15 of `functional-spec.md` lists its shared files.

## Settled in this design without a question

Each follows directly from the task, a contract or a library fact; none changes a boundary.

- **`teamSize`/`teamConcurrency` do not exist in pg-boss 12.** One job per worker process is `batchSize: 1` with an awaited handler, plus `sharp.concurrency(1)` (BR1.8, finding F6).
- **clamd chunk size 64 KiB, connect timeout 5 s, whole scan 30 s.** The task allows chunks up to 1 MiB and a 30 s connect or idle timeout; smaller chunks keep memory flat and a 5 s connect bound reports a down scanner quickly. Both stay inside the protocol (BR9.1, BR9.3).
- **No `scan_started` custody event.** The enum has it; the scan's own outcome event (`scan_clean`, `scan_detected`, `scan_unavailable`) records each attempt, and the acceptance row "one event per stage" counts one event per stage (BR7.2).
- **The original's storage key comes from its artifact row.** Never from the payload (BR8.5).
- **The intermediate states append no outbox event.** The composer polls them through U23's author query (BR5.2).
- **`ISS-072` is fixed here** as a recorded addition in `infra/compose/README.md` (finding F14).

## Question 1

**How does the worker learn the author's account id?** C15 gives `evidence.stateChanged` an `uploaderAccountId`, and U34 needs a recipient. `evidence.received` carries `{itemId}` only, and PR3 (02 §16) takes `uploaded_by_account_id` away from `rk_worker`. T-304 step 6 proposed granting the worker that one column back.

A. **The web tier puts it in the event** (recommended): U23's intake writes `evidence.received {itemId, uploaderAccountId}`; the job copies it unchanged into the events it appends and never reads the column. C15 already says recipients are resolved in the web tier, and the worker loses both private columns, which AD-6 asks for. Needs U23 (X1).
B. **Grant `SELECT (uploaded_by_account_id)` to `rk_worker`**, as T-304 step 6 says. No change to U23's event, but the worker keeps a direct read of who uploaded which file.
C. **Leave the recipient to U34**, which looks the author up from `itemId` in the web tier. The worker's events carry no account id; U34 needs an extra query and a web-tier hop for every evidence notice.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**How are the worker's privileges on `evidence_items` narrowed (ISS-139)?** `0005_grants_part2.sql` grants `rk_worker` table-level `SELECT, UPDATE` on `evidence_items`. A column-level `REVOKE` (ISS-139's suggestion, T-303 step 8) has no effect in PostgreSQL while the table-level grant exists (finding F1).

A. **Revoke table-level `SELECT, UPDATE`, then grant both on every column except `original_filename_enc` and `uploaded_by_account_id`** (recommended), applied by U23 step 8's migration in this form, or by this Unit's own migration if U23 did not (with the two migration-count pins). The ISS-139 probe turns from `it.fails` into `it`. Every worker query must name its columns (BR8.2).
B. **Column-level `REVOKE` only**, as planned. Simple, but the hole stays open and the probe stays red.
C. **Leave ISS-139 to U23** and build the pipeline on the wide grant. Faster, but this Unit is the first code that runs under that role.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**What happens when the scanner stays down?** T-304 says the item stays in `scanning` and "never fails for this cause". U23's removal refuses items in `scanning`, so the author has no exit while clamd is down, and AC7.1.4 asks that a file whose scan "cannot run" end with a reason and Replace and Remove (finding F8).

A. **Fail with `scanner_unavailable` after 24 hours of outage** (recommended). Retries at 30 s, 2 min, 10 min, then hourly; once 24 h have passed since the first failed attempt, the item fails, the author is told in-app and can replace or remove it. Fail closed still holds, because `failed` never advances. Adds `scanning → failed(scanner_unavailable)` to the state table (FD entry (b)).
B. **Retry hourly forever**, as written. No FD entry, but an item can sit in `scanning` indefinitely and U23's removal must then allow `scanning`.
C. **Let the author remove an item in `scanning`**, and retry forever. Gives an exit, but the author is never told the check gave up, and staff see items stuck for days.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**How is the next scan attempt scheduled without being dropped?** The queue is declared `exclusive`. Under that policy pg-boss refuses a second job with the same key while one is created, retrying **or active** (`job_i6`), so a handler that reschedules its own item under its own key is silently `deduplicated` (finding F3).

A. **Switch `evidence.process` to the `stately` policy with one key per item chain** (`evidence.process:<eventId>`) (recommended). `stately` keeps one job per state per key (`job_i3`), so the follow-up (`created`) sits beside the running job (`active`), and a second follow-up is refused. The stored policy of an existing queue does not change, so a local database needs `pnpm db:reset` once; CI starts empty.
B. **Keep `exclusive` and give each attempt its own key** (`evidence.process:<itemId>:scan-<attempt>`). No reset, but nothing stops a duplicated chain; the compare-and-set is the only guard.
C. **Let pg-boss retry by throwing** on `unavailable`. Its fixed backoff cannot express 30 s → 1 h, it uses up the 3 retries in minutes, and the item then fails as `unknown`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**Which events does the pipeline append, and how does the outage notice travel?** T-304 says `evidence.stateChanged {itemId, state}` for readiness and a notice on the first outage; T-405's routing expects a pseudo-state `scan_unavailable`, which is not an `evidence_state`.

A. **`evidence.stateChanged` for `preview_ready` and `failed` only, plus a new `evidence.scanDelayed` event once per item**, with its relay entry to `notification.deliver` added here (recommended). The state field holds only real states; U34 routes the new event (X3).
B. **`evidence.stateChanged` for every transition, with `state: scan_unavailable` for outages.** One event name, but a payload value outside the enum and five events per clean run.
C. **No outage notice.** Simpler, but drops the FD-070 acceptance row "scanner outage notice".
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**Is `file-type` added for the magic-byte check?** T-304 step 1 calls `fileTypeFromStream` inside the application handler; T-010 forbids any external package in `application` (finding F4).

A. **No new dependency** (recommended): a pure `sniffImageType` in the application for the two magic numbers, and sharp's own header format as a second, independent check behind `ImageSanitiser.inspect`. Two signatures need no library.
B. **Add `file-type` 22 behind an adapter port.** One more dependency and port for two fixed byte sequences; a Phase 2 PDF intake could reuse it.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**What format does the sanitised copy have?** The scope block says "PNG stays PNG, JPEG re-encodes at quality 85"; T-304 step 3 (written before it) says PNG for PNG input or images up to 2 MP, JPEG for larger photos.

A. **Keep the input's format** (recommended): PNG → PNG (`compressionLevel 9`), JPEG → JPEG (quality 85, mozjpeg); the thumbnail in the same format. The scope block overrides step 3, and a document photo keeps its look.
B. **Step 3's size rule.** A small JPEG becomes a PNG several times larger; a large PNG screenshot becomes a lossy JPEG.
C. **Always PNG.** Matches the artifact kind's name, but photos of documents grow three to ten times.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**Where are the page and thumbnail stored?** T-303 step 2's `putDerivative` writes to `public/<itemId>/…`; T-304 says `private/<itemId>/…` until U25 publishes (finding F5).

A. **A new `Storage.putPrivateDerivative(bytes, {itemId, name})` under `private/<itemId>/` with fixed names** (`page-1.<ext>`, `thumbnail-1.<ext>`), written to a temp file and renamed (recommended). A crashed run leaves at most one stale file, which the next run replaces; nothing is under `public/` before the author confirms privacy. Needs U23 (X1).
B. **Use `putDerivative` with `public = false` rows.** No new method, but the files sit under `public/`, against AD-6 and the hard rule.
C. **`private/` with random names.** Every retried run leaves orphan files.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**Are the limits environment variables?** T-304's owned paths list `EVIDENCE_MAX_PIXELS` and `EVIDENCE_TIMEOUT_MS` (and `EVIDENCE_MAX_PAGES`, dropped by FD-036) in `.env.example`.

A. **Constants in the application** (`MAX_PIXELS 40 000 000`, `EVIDENCE_RUN_BUDGET_MS 120 000`, `SCAN_RETRY_WINDOW_MS 24 h`), with tests passing a shorter budget through the use case's input (recommended). The values come from FD-036, 03 and C15; an environment variable would let a deployment weaken them silently.
B. **Environment variables as listed.** Tunable without a release, but a typo or a large value relaxes a security bound with no review.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**Does every run re-check the quarantined bytes against intake?** Intake records `original_bytes` and `original_sha256`.

A. **Yes: length and SHA-256 on every run, before any check; a mismatch fails the item as `unknown` with custody `check: integrity`** (recommended). A resumed run never trusts bytes from an earlier run, and the scanned bytes are the sanitised bytes (BR2.2, BR3.7). Costs one hash of at most 15 MB per run.
B. **Trust intake.** Saves the hash, but a file changed in quarantine would be scanned and sanitised unnoticed.
C. **Re-check, but fail as `malformed`.** The author would be told the file is broken when the cause is on the server side.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**Must a clean scan carry the signature version?** T-304 calls `zVERSION` "optional on first use"; the hard-rule checklist requires hash and versions on every artifact.

A. **Query `zVERSION` on its own connection, cache it 10 minutes, and return `unavailable(version_unknown)` when it fails** (recommended). Every artifact names the signatures it was checked against, and a refreshed signature database shows up within 10 minutes.
B. **Optional version**, as written: a clean scan without a version still advances. Artifacts could lack `signature_version`.
C. **Query once at worker start.** A signature update during a long run is never recorded.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**How does the real-clamd test run, given CI has no ClamAV (ISS-279)?**

A. **CI skips it with the explicit message; Build and Test records one local run with clamd up that did not skip** (recommended). The unit tests (an in-process clamd stub) carry the 80% floor. No CI change, and the acceptance row is still met by a real run.
B. **Add a ClamAV service to CI** with a cached signature volume. Closes ISS-279's ClamAV half, but clamd needs about 1.5 GB of memory and minutes to load signatures on every run.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**Does the pipeline also write `audit_events` rows?**

A. **No: the custody chain is the pipeline's record** (recommended). Custody is append-only and per item; audit rows record human and staff actions (01 §5), and the worker's `INSERT` on `audit_events` is "live, not ratified" (FD-092 (e)).
B. **One audit row per stage as well.** Duplicates custody and leans on an unratified grant.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Who fixes ISS-182** (the seed writes plaintext bytes into `original_filename_enc`, marked `TODO(T-304)`)? The worker cannot: it never reads the column and holds no `APP_ENCRYPTION_KEY`.

A. **Fix it in this Unit through U21 T-301's seed-to-`Crypto` edge (its FD entry (e)) when that is merged at this Unit's baseline; otherwise re-own the row to U21** (recommended). One seed change, using the edge built for drafts; no second boundary exception.
B. **Re-own it to U21 now.** Same result, one Unit later.
C. **Close it as accepted** (synthetic bytes only). The column name keeps promising ciphertext it does not hold.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**Which i18n keys and which notice dedupe?** T-304 names `notif.evidence.ready`, `notif.evidence.failed`, `notif.evidence.scanUnavailable`; the existing `notif.evidenceReady` (prototype n1) describes publication, not readiness for privacy review (prototype n7). T-405's dedupe key `<event>:<targetId>:<accountId>` would swallow a second notice for the same item (finding F10).

A. **`notif.evidence.previewReady`, `notif.evidence.failed`, `notif.evidence.scanDelayed`** with the copy of `functional-spec.md` § 6.5 (no content, no number, no promised time), and U34's dedupe key `<event>:<itemId>:<state>:<accountId>` (recommended; X3). The names match the states and the event, and a later failure or publication is not lost.
B. **The task's key names** with T-405's key. `ready` reads as published, and a failure after a replacement can be swallowed.
C. **Reuse `notif.evidenceReady`.** Tells the author the file is attached when it still waits for their privacy review.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 16

**How does the handler know it is on its last attempt?** `PgBossQueue.work` passes only `job.data`, so "retries exhausted → `failed(unknown)`" (T-304 step 5) cannot be detected (finding F6).

A. **Pass a job context**: `work(name, handler, {includeMetadata: true})` hands the queue handler a `JobContext {jobId, retryCount, retryLimit, signal}`, and the worker's `JobDefinition.handler` becomes `(payload, ctx, job)` (recommended). The last attempt records `failed(unknown)` instead of throwing; the outbox relay ignores the argument.
B. **Count attempts in custody.** No queue change, but a crash before the count is written miscounts, and custody fills with bookkeeping.
C. **Let the job die in pg-boss.** The item stays in its stage with no job and no notice.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 17

**Which state rows and failure mapping does sanitising use?** 02 §17 has no `sanitising → failed(malformed)` row, and T-304 step 1 says sanitising errors map to `processing_timeout|unknown`, while the scope block maps a sharp decode error to `malformed`.

A. **Add `sanitising → failed(malformed)` and `scanning → failed(scanner_unavailable)` to U23's state table** (recorded additions if U23 lacks them; FD entry (b)), and map decode errors to `malformed`, timeouts to `processing_timeout`, pixel-limit hits to `too_large`, everything else to `unknown` (recommended). The author is told the real cause, and a deterministic decode error is not retried.
B. **Keep 02 §17 as it is** and map decode errors to `unknown`. No table change, but the author cannot tell a broken photo from a server fault.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 18

**How are the new adapters exported?** `packages/adapters/package.json` exports only `.`.

A. **Subpath exports `@rogikotha/adapters/scanner-clamd` and `@rogikotha/adapters/image-sharp`**, imported only by the worker's container (recommended). The web tier never loads sharp's native binary, and BR8.4 stays checkable by import.
B. **Export both from the root index.** One import path, but every importer of `@rogikotha/adapters`, the web container included, loads sharp.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 19

**Who owns ISS-164** (the seed's auto-hidden evidence item `e6` has no state to show it is hidden)?

A. **Re-own it to U32 T-403 (moderation)** (recommended). How an auto-hidden evidence item is represented is a moderation decision, not a pipeline step; the pipeline never writes moderation state.
B. **Keep it with this Unit** and add a state or custody event. A product decision outside this Unit's scope.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Decided under the owner's no-questions instruction of 2026-10-29

| Q | Decision | Changes | FD entry |
|---|---|---|---|
| 1 | uploader id travels in `evidence.received` | data boundary (worker loses `uploaded_by_account_id`) | (a) |
| 2 | table-level revoke, column-list grant | data boundary (closes ISS-139) | (a) |
| 3 | fail `scanner_unavailable` after 24 h | hard-rule mechanism (fail closed unchanged) | (b) |
| 4 | `stately` queue policy, one key per item chain | queue declaration; one `pnpm db:reset` locally | — |
| 5 | `stateChanged` for `preview_ready`/`failed`, new `evidence.scanDelayed` | C15 additive | — |
| 6 | no `file-type` | — | — |
| 7 | keep the input's format | — | — |
| 8 | `putPrivateDerivative` under `private/` | Storage port additive (U23) | — |
| 9 | limits as constants | — | — |
| 10 | integrity re-check every run | — | — |
| 11 | signature version required | — | — |
| 12 | clamd test skipped in CI, one local run required | — | — |
| 13 | custody only, no audit rows | — | — |
| 14 | ISS-182 via U21's seed `Crypto` edge, else U21 | — | — |
| 15 | three new keys; U34 dedupe includes the state | U34 (X3) | — |
| 16 | job context with retry metadata | `PgBossQueue.work` additive | — |
| 17 | two state rows, decode error → `malformed` | state table (with (b)) | (b) |
| 18 | adapter subpath exports | — | — |
| 19 | ISS-164 to U32 T-403 | — | — |
