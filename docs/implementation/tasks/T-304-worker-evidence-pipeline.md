# T-304 — Worker evidence pipeline: validate → scan → sanitise → preview-ready

| Field | Value |
|---|---|
| Story | STORY-EVID-001 (processing half), FR-FILE-001–003/009, FD-002 |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 3–5 h agent; validation 1.5 h |
| Depends on | T-303 |
| Parallel-safe with | T-302, T-306 (composer polls states only), T-307, T-206 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-070** — Notifications that start in the worker (evidence ready, evidence failed, scanner unavailable) are **in-app only**: the worker sends no email, queues no `mail.send` job and writes no `email_deliveries` row, so it never needs an account's address (FD-041 stands). The optional evidence email category sends nothing in the demo, and AC10.1.5 applies to the discussion and moderation categories only. Changes the Goal, steps 1 and 6, Owned paths, Not in scope, the acceptance checks and the hard-rule checklist.

## Amendments — release 1 (FD-105, U48 `u48-evidence`)

These decisions override the text below where they differ; the design is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u48-evidence/functional-design/functional-spec.md`.

- **FD-105: what release 1 builds** — the worker validates, scans and ends the item; there is no sanitiser, no artifact beyond the original and no in-app notification. The pipeline stops at `preview_ready` (the end state of release 1, counted publicly) or ends `rejected` (malformed, type mismatch, too large, malware) or `failed` (`scanner_unavailable`, `unknown`, `processing_timeout`). `sanitising`, `privacy_confirmed` and `published` are release 2 (T-305, ISS-626, ISS-633). Validation is a full structure walk of PNG chunks (CRCs, IHDR first, IEND last, nothing after) and JPEG markers (SOF before SOS, EOI last), not a decode (ISS-627, ISS-628).
- **FD-105: acceptance rows changed** — Stage order: `quarantined → validating → scanning → preview_ready`; Resume: a retry finding `validating` or `scanning` carries on; Fail closed: retries use pg-boss `retryLimit 3` with backoff (not the `startAfter` ladder), the item stays `scanning`, and the last attempt ends it `failed`/`scanner_unavailable`; a new job `evidence.sweep` (cron `*/5 * * * *`) ends any item still in processing an hour after upload (`processing_timeout`, or `scanner_unavailable` when the latest custody event is `scan_unavailable`); Malware: the original is deleted and the item is `rejected`/`malware` (not retained); Type mismatch: `rejected`/`type_mismatch` before any scan; Encrypted PDF, PDF pages, Metadata stripped, Pixel bomb, Artifact rows: not applicable or release 2 (images only, no re-encode); Timeout: a 120 s attempt budget from the handler's own timer, under the 300 s queue expiry; Real clamd: met by the live block in `evidence-process.int.test.ts` (skipped with its reason when clamd is down); Worker boundary: met by `eslint.boundaries.mjs`; FD-070 rows: the only output is the `evidence.stateChanged` outbox row `{itemId, reviewId, state}`, which routes to no job in release 1 (`RELAY['evidence.stateChanged'] = []`); no email, no `notif.evidence.*` keys.
- **FD-105: extra rules** — every item reaches a final state with a reason, and the author sees Remove for `rejected` and `failed` (BR4.9 to BR4.11); the web logger and the worker log only the BR7.1 fields (ISS-642); the worker must resolve a relative `STORAGE_ROOT` against the repo root (ISS-621, open).
- The image-sharp and pdf-pdfjs adapters, the `ImageSanitiser` port and the T-304 fixtures are not built in release 1.

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


This block overrides every mention of PDF, pages, `pdfjs`, `@napi-rs/canvas` and `PdfRasteriser` below.
The pipeline handles **images only**: `validating` (file-type magic must be `image/jpeg` or `image/png`
and equal the declared MIME; dimensions ≤ 40 MP via sharp metadata) → `scanning` (clamd, fail closed)
→ `sanitising` (sharp: `.rotate()` for EXIF orientation, strip all metadata, re-encode — PNG stays PNG,
JPEG re-encodes at quality 85 — one `page_png` artifact with `page_no = 1` plus a 320 px `thumbnail`)
→ `preview_ready`. Do **not** create `packages/adapters/src/pdf-pdfjs/`, the `PdfRasteriser` port or
its fake; do not install `pdfjs-dist` or `@napi-rs/canvas`. Failure mapping: type mismatch →
`type_mismatch`; > 15 MB (defence in depth) → `too_large`; sharp decode error → `malformed`; > 40 MP →
`too_large`; scanner `detected` → `malware`; scanner `unavailable` → stay `scanning`, custody
`scan_unavailable`, retry with backoff; sharp timeout → `processing_timeout`. The malware demo uses
`flagged.jpg` + the custom signature from T-002 (both must pass through a real clamd in the integration
test; skipped with a clear message when clamd is unreachable). Estimate reduced to 3–5 h.

## Goal

The worker job `evidence.process` takes a quarantined item through the exact stage order —
`validating` (magic bytes, page/pixel bounds) → `scanning` (clamd, **fail closed**) → `sanitising`
(image re-encode with metadata stripped, or PDF rasterised to page PNGs) → `preview_ready` — writing
an artifact row with SHA-256 and tool versions for every output, a custody event for every step, and
an in-app notification to the author (no email, FD-070). Every failure maps to one `evidence_fail_reason`. Resources are bounded.
An unreachable scanner never lets a file advance.

## Read first

1. `docs/implementation/01-conventions.md` §3, §4 (Files), §11 (fail closed)
2. `docs/implementation/02-data-model.md` §0 (`evidence_state`, `evidence_fail_reason`, `custody_event`, `artifact_kind`), §7, §17 "Evidence"
3. `docs/implementation/03-routes-and-contracts.md` §3 ports (`MalwareScanner`, `ImageSanitiser`, `PdfRasteriser`, `JobQueue`, `Outbox`), §4 "evidence" job `evidence.process`, §5
4. `docs/planning/05-recommended-architecture.md` "Evidence pipeline" and `ARCHITECTURE-SPINE.md` AD-6, AD-15
5. `docs/implementation/00-master-plan.md` §3 rows: sharp 0.35, pdfjs-dist 6.3 + `@napi-rs/canvas`, file-type 22, ClamAV 1.5.4
6. `docs/implementation/05-demo-storyboard.md` "Fixtures" and Part 3 step 12
7. T-303's `evidence-state.ts`, `EvidenceRepository`, `Storage` adapter, `apps/worker/src/container.ts` (T-009)
8. Prototype `app.js` 1512–1545: the state chips the author sees (`checking`, `scanning`, `processing`, `ready`, `failed` + `ev.failNote`) — your states map onto them in the i18n keys T-303 defined

## Owned paths

- `packages/adapters/src/scanner-clamd/**`, `packages/adapters/src/image-sharp/**`, `packages/adapters/src/pdf-pdfjs/**` (+ tests)
- `packages/application/src/modules/evidence/jobs/process.ts` (the handler as an application service: `processEvidenceItem({itemId, ports, signal})`), `modules/evidence/pipeline.ts` (pure stage sequencing), tests
- `packages/application/src/ports/{scanner,image-sanitiser,pdf-rasteriser}.ts` (create if stubs)
- `apps/worker/src/handlers/evidence-process.ts` (pg-boss binding, timeout, retry policy)
- `packages/test-support/src/fakes/{scanner,image-sanitiser,pdf-rasteriser}.ts`
- `infra/compose/docker-compose.yml` — only the `clamav` service healthcheck tweaks if T-002's are insufficient; `.env.example` `CLAMD_HOST`, `CLAMD_PORT`, `EVIDENCE_MAX_PAGES=30`, `EVIDENCE_MAX_PIXELS=40000000`, `EVIDENCE_TIMEOUT_MS=120000`
- `packages/i18n/messages/{en,bn}.json` — `notif.evidence.ready`, `notif.evidence.failed`, `notif.evidence.scanUnavailable` (in-app copy: "Your document could not be checked yet; we will retry"); no `email.evidence.*` keys (FD-070)

## Not in scope

Redaction, privacy confirmation, public artifacts, derivative PDF (T-305). Retention (T-309). Composer UI (T-306). The notification delivery job itself (T-405) — this task appends outbox events only. Any email about evidence: worker-started notifications are in-app only (FD-070).

## Steps

1. **Pure pipeline** `pipeline.ts`: `nextStage(state) → 'validating'|'scanning'|'sanitising'|'preview_ready'|null` and `failureFor(stage, cause) → evidence_fail_reason`; the handler is a loop `while (stage = nextStage(item.state)) { transition; do stage; }` so a retried job resumes at the current state (idempotent). Stage semantics:
   - **validating**: read the original via `Storage.getPrivate`; `file-type` `fileTypeFromStream` (ESM; `await import('file-type')`); detected MIME must equal the declared MIME (`image/jpeg`, `image/png`, `application/pdf`) else `type_mismatch`; images: sharp `metadata()` → `width*height ≤ EVIDENCE_MAX_PIXELS` else `too_large` (reuse reason; document); PDFs: pdfjs `getDocument({data, password: undefined})` — `PasswordException` → `encrypted`; `numPages > EVIDENCE_MAX_PAGES` → `too_many_pages`; any parse error → `malformed`. Custody `validated {detected_mime, pages|pixels}` or `validation_failed {reason}`.
   - **scanning**: `MalwareScanner.scan(stream)`: `clean` → custody `scan_clean {signatureVersion}`, continue; `detected` → `failed(malware)`, custody `scan_detected {signature}` (never the file name), delete nothing (retained for custody; retention expires it); `unavailable` → custody `scan_unavailable`, **state stays `scanning`**, job rescheduled with backoff (30 s, 2 m, 10 m, then hourly up to 24 h via `startAfter`) — the item never advances and never fails for this cause; in-app author notification `notif.evidence.scanUnavailable` on the first occurrence only (dedupe key; no email, FD-070).
   - **sanitising**: image → `ImageSanitiser.sanitise(bytes, {maxPixels})` → one `page_png` artifact (`page_no 1`) + `thumbnail`; PDF → `PdfRasteriser.rasterise(bytes, {maxPages, dpi: 110})` → one `page_png` per page + `thumbnail` of page 1. Each artifact: `Storage.putDerivative` under `private/<itemId>/…` (**not** `public/` — T-305 moves/marks on publish), `sha256`, `bytes`, `width`, `height`, `sanitiser_version` (`sharp@x.y.z` / `pdfjs@x.y.z`), `public: false`, `immutable: true`. Set `page_count`. Any error/timeout → `failed(processing_timeout|unknown)`.
   - **preview_ready**: custody `preview_ready {pages}`, outbox `evidence.stateChanged {itemId, state}` → in-app notification `notif.evidence.ready` (no email, FD-070).
2. **clamd adapter** `scanner-clamd`: TCP to `CLAMD_HOST:CLAMD_PORT` (default `localhost:3310`); protocol: write the ASCII command `zINSTREAM\0`; then for each chunk write a 4-byte big-endian unsigned length followed by the chunk (≤ 1 MiB chunks); terminate with a 4-byte zero length; read until `\0`; response `stream: OK` → `clean`; `stream: <Signature> FOUND` → `detected {signature}`; `INSTREAM size limit exceeded` or any `ERROR` → treat as `unavailable` (fail closed — never `clean`); connect/idle timeout 30 s → `unavailable`; ECONNREFUSED → `unavailable`. Optional `zVERSION\0` on first use to record `signatureVersion` (parse `ClamAV 1.5.4/…/<date>`). No third-party clamd client; ~80 lines with `node:net`.
3. **sharp adapter** `image-sharp`: `sharp(bytes, {limitInputPixels: maxPixels, failOn: 'error'})` → `.rotate()` (applies EXIF orientation so stripping metadata does not flip the image) → for PNG input or images ≤ 2 MP: `.png()`; for larger photos: `.jpeg({quality: 85, mozjpeg: true})` — **do not** call `withMetadata()`, so EXIF/ICC/XMP are dropped; verify by re-reading `metadata()` and asserting `exif === undefined`; thumbnail `.resize({width: 320, withoutEnlargement: true})`; return `{page: {bytes, mime, width, height}, thumbnail, version: sharp.versions.sharp}`. Reject animated inputs (`pages > 1`) as `malformed`.
4. **pdfjs adapter** `pdf-pdfjs`: `import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'`; `getDocument({data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false, cMapUrl: <node_modules/pdfjs-dist/cmaps/>, standardFontDataUrl: <…/standard_fonts/>, canvasFactory: new NodeCanvasFactory()})` where `NodeCanvasFactory` wraps `@napi-rs/canvas` (`createCanvas`, `getContext('2d')`); per page: `viewport = page.getViewport({scale: 110/72})`, `page.render({canvasContext, viewport}).promise`, `canvas.encode('png')`; cap `Math.max(width,height) ≤ 4096` (scale down); `PasswordException` → `encrypted`; other exceptions → `malformed`; wall-clock per page 20 s. **Windows note:** `@napi-rs/canvas` ships prebuilt binaries for win32-x64-msvc; no Python/Visual Studio needed — if `pnpm install` fails on the optional dependency, run `pnpm install --config.node-linker=hoisted` once and record it in the hand-off. Also exercise the adapter on Linux in the compose-based test if the human runs CI.
5. **Handler** `apps/worker/src/handlers/evidence-process.ts`: `boss.work('evidence.process', {teamSize: 2, teamConcurrency: 1}, …)`; wraps `processEvidenceItem` in `AbortSignal.timeout(EVIDENCE_TIMEOUT_MS)`; on abort → `failed(processing_timeout)` unless the item is in `scanning` with `unavailable` (then reschedule); pg-boss `retryLimit: 3, retryDelay: 30, retryBackoff: true, singletonKey: itemId`; a job that has exhausted retries in `validating|sanitising` → `failed(unknown)` with custody `failed {stage}`. The worker container has **no** auth, identity, reveal or delete commands (assert via the boundary lint rule T-010 added; extend it if missing).
6. **Notifications**: outbox events only; payload `{itemId, state, failReason?}` (ids only, never an address); every notification these events start is in-app only — no `mail.send` job and no `email_deliveries` row, whatever the author's `emailEvidence` preference (FD-070); the author is resolved by T-405's job via `evidence_items.uploaded_by_account_id` (worker has that column? — T-303 revoked it from `rk_worker`; **decision**: keep the revoke; the notification job runs in the worker too, so instead include `accountId` in the outbox payload written by the **web** tier at intake? The worker writes the state change… Resolve as: grant `rk_worker` `SELECT (uploaded_by_account_id)` only, keep `original_filename_enc` revoked; amend the T-303 grants migration in a new migration here and record it in the hand-off).
7. **Integration test rig**: `packages/adapters/src/scanner-clamd/clamd.int.test.ts` connects to `CLAMD_HOST`; if unreachable within 3 s the suite calls `test.skip` with the message `clamd not reachable at <host:port>; start infra (pnpm infra:up) to run scanner tests` — never a silent pass. EICAR via `eicar.pdf` → `detected`. `photo.jpg` → after sanitise, EXIF absent. `prescription.pdf` → 2 page PNGs whose pixels are not all white (sample 1% of pixels). `encrypted.pdf` → `encrypted`. `not-a-png.png` → `type_mismatch`.
8. Strings both locales; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Stage order | `pnpm --filter @rk/application test pipeline` | from `quarantined`, states visited are exactly `validating, scanning, sanitising, preview_ready`; custody has one event per stage in order |
| Resume after crash | same | an item left at `scanning` is resumed at `scanning`, not re-validated |
| Fail closed | same with `FakeScanner.mode = 'unavailable'` | state remains `scanning`; custody `scan_unavailable`; job rescheduled (`startAfter` grows 30 s → 2 m → 10 m → 1 h); after the fake returns `clean` on a later run the item continues; **never** reaches `preview_ready` while unavailable |
| Malware | `FakeScanner.mode = 'detected'` | `failed(malware)`; original still in storage; no artifacts |
| Type mismatch | fixture `not-a-png.png` | `failed(type_mismatch)` before any scan call (`FakeScanner.calls === 0`) |
| Encrypted PDF | fixture | `failed(encrypted)` |
| Metadata stripped | `pnpm --filter @rk/adapters test image-sharp` | output `metadata().exif` undefined; orientation applied (a 90°-tagged fixture comes out rotated) |
| Pixel bomb | 1×1 PNG declaring 30000×30000 via a crafted header (sharp rejects) or `limitInputPixels` fixture | `failed(too_large)` without allocating (test asserts elapsed < 2 s) |
| PDF pages | `pnpm --filter @rk/adapters test pdf-pdfjs` | 2 artifacts for `prescription.pdf`; 31-page fixture → `too_many_pages` at validation |
| Timeout | application test with a fake rasteriser that never resolves and `EVIDENCE_TIMEOUT_MS=200` | `failed(processing_timeout)` |
| Artifact rows | `pnpm --filter @rk/database test evidence.int` | every artifact has `sha256` matching the bytes, `sanitiser_version` non-empty, `public = false` |
| Real clamd (if up) | `pnpm --filter @rk/adapters test clamd.int` | EICAR → `detected`; `photo.jpg` → `clean`; with the container stopped → suite skipped with the explicit message |
| Worker boundary | `pnpm lint` | `apps/worker` importing `modules/identity` or `better-auth` fails lint |
| FD-070: ready is in-app only (AC10.1.1, AC10.1.5 as narrowed) | `pnpm --filter @rk/application test pipeline` with the author's `emailEvidence` preference on, item reaching `preview_ready` | one outbox `evidence.stateChanged` event whose payload holds ids only; no `mail.send` job queued and no `email_deliveries` row written |
| FD-070: failure is in-app only (AC10.1.1) | same, with `FakeScanner.mode = 'detected'` and with `not-a-png.png` | `failed(malware)` / `failed(type_mismatch)` each write one outbox event; no `mail.send` job and no `email_deliveries` row |
| FD-070: scanner outage notice is in-app only | same, with `FakeScanner.mode = 'unavailable'` over three reschedules | one `notif.evidence.scanUnavailable` outbox event (dedupe); no `mail.send` job and no `email_deliveries` row |
| FD-070: the worker needs no address | `pnpm --filter @rk/application test pipeline` plus a grep of `apps/worker/src/handlers/evidence-process.ts` and `modules/evidence/jobs/process.ts` | no read of `auth_users`, `to_email_enc` or any email column; no call to the `Mailer` port |
| Tree | `pnpm check` | green |

## Tests to write

- `pipeline.test.ts` (application, fakes): stage order, resume, every failure mapping, custody events, outbox payloads, dedupe of `scanUnavailable` notification; no `Mailer` call and no `mail.send` job on any path, with `emailEvidence` on (FD-070).
- `clamd.test.ts` (adapter, unit): a tiny in-process `net.createServer` stub speaking the INSTREAM protocol — asserts the exact bytes sent (`zINSTREAM\0`, length prefixes, zero terminator), `OK`/`FOUND`/`ERROR`/timeout/ECONNREFUSED mapping.
- `clamd.int.test.ts` (adapter, real clamd, skip-with-message).
- `image-sharp.test.ts`: EXIF stripped, orientation, thumbnail size, animated rejected, pixel limit.
- `pdf-pdfjs.test.ts`: page count, encrypted, malformed, dimension cap, `isEvalSupported` false asserted via spy on `getDocument` params.
- `evidence-process.handler.test.ts` (worker): timeout → failure; unavailable → reschedule not failure; retry exhaustion mapping.

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Scanner outage used to slip a file through | `unavailable` never advances; only `clean` does | fail-closed test |
| `ERROR`/size-limit reply misread as clean | any non-`OK` reply → `unavailable` | `clamd.test.ts` |
| Polyglot (PDF bytes named .png) | magic bytes vs declared MIME | type-mismatch test |
| Decompression/pixel bomb | `limitInputPixels`, page cap, dimension cap, per-item timeout, `teamConcurrency: 1` | pixel bomb + timeout tests |
| JS in PDF executing during render | `isEvalSupported: false`; rendering to canvas only; no text layer | pdfjs spy test |
| EXIF GPS leaking into the public copy | no `withMetadata()`; assert `exif` undefined | image test |
| Worker credentials reaching auth/identity | separate DB role; boundary lint | grants + lint tests |
| Log leaks file names | custody/log details are allowlisted (bytes, mime, reason) | grep in tests for `original_filename` in logger calls |

## Hard-rule checklist

- [ ] Scanning that cannot run fails closed (state never advances on `unavailable`).
- [ ] Originals never become public; artifacts written `public: false`.
- [ ] Only bounded, sanitised derivatives advance; every artifact has hash + versions.
- [ ] Review text remains independently publishable (no coupling to review state).
- [ ] Worker has no identity/auth/delete capability.
- [ ] Evidence notifications are in-app only; the worker sends no email (FD-070).
- [ ] Both dictionaries updated.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed

Built in U48 (release 1, FD-105) together with T-303: `createClamdScanner` (INSTREAM client, fail closed), `createFsEvidenceReader`, `createProcessEvidence` and `createSweepEvidence` in the application `/worker` subpath, the worker handlers `evidence-process.ts` and `evidence-sweep.ts`, the `attempt` metadata passed from `pg-boss-queue.ts` to handlers, the `evidence.sweep` queue entry, and `PgEvidenceRepository` worker methods. Files and counts are in `construction/u48-evidence/code-generation/code-summary.md`.

### Not done and why

Sanitise and re-encode, preview artifacts, the sharp and pdfjs adapters and in-app notifications: release 2 (FD-105, T-305). The `startAfter` backoff ladder is replaced by pg-boss retries.

### Questions for the human

None open.

### Follow-ups

ISS-621 (worker resolves a relative storage root from its own folder, S2, open), ISS-623 (fixed), ISS-631 (a crash on the last attempt reads Being checked for up to an hour and five minutes), ISS-632 (column-level grant proposal); the rest are in `docs/implementation/ISSUES.md`.

### `pnpm check` output summary

Green at the Unit's Build and Test gate; the numbers are in the code summary.

### Hard-rule evidence

Fail closed: three retries stay `scanning`, the fourth ends `failed`/`scanner_unavailable`, never counted (adversarial A5). A worker killed in the last attempt is ended by the sweep. The worker reads no email column and calls no mailer. The worker container wires the reader and the scanner only; it holds no writer and no `filenameSeal`.
