# T-305 — Privacy preview, manual redaction, author confirmation, publication of derivatives

| Field | Value |
|---|---|
| Story | STORY-EVID-002 (backend half), FR-FILE-004–006, FR-EVD-001–004, FD-003, FD-023 |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 3–4 h agent; validation 1.5 h |
| Depends on | T-304 |
| Parallel-safe with | T-306 (consumes the commands through fakes until merged), T-307, T-302 |

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-084 / C8 / C12 — `evidence.presenceForReview`** — T-305 adds the query `evidence.presenceForReview {reviewId}` (kind: query, internal), returning `{groups: EvidenceGroup[]}` for the review's `published` items only. It implements Search's `EvidencePresence` port (`forReview(reviewId)`), which T-205 wired with a no-evidence default. T-305 replaces that default with this implementation in the composition root. Changes: Owned paths, a new step 6a and acceptance rows.
- **FD-084 / C15 — `evidence.stateChanged` triggers search** — The event payload is `{itemId, reviewId?, state, uploaderAccountId}`, and the relay routes it to `notification.deliver` and `search.refresh` (C15). Step 5's `evidence.stateChanged` therefore carries `reviewId` once the item is linked, so a published item refreshes its review's search document. Changes: step 5 and a new acceptance row.

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


This block overrides every mention of PDF assembly, `PdfAssembler`, `@cantoo/pdf-lib` and
`derivative_pdf` below. Phase 1 evidence is **one image per item**: the "current page" is the single
`page_png` artifact (or its redacted replacement). `evidence.confirmPrivacy` does **not** assemble a
PDF; it only moves the item to `privacy_confirmed`. `evidence.getPublic` returns per item
`{pages: [{artifactUrl, width, height}], downloadUrl, label}` where `downloadUrl` is the artifact
route for the current page PNG/JPEG with `Content-Disposition: attachment; filename="rogikotha-processed-<publicId>.png"`.
Do not create `packages/adapters/src/pdf-assemble/` or `ports/pdf-assembler.ts`. Redaction flattening
(sharp composite of filled black rectangles into a **new** PNG, old artifact `superseded_by_id`) is
unchanged and is the core of this task. Estimate reduced to 3–4 h.

## Goal

Let the author see the exact processed copy, flatten black rectangles into it, confirm that
unnecessary personal information has been removed (FD-023), and — only then and only through
`review.publish` — make the immutable derivative public. Expose the two route handlers: the public
artifact route (public artifacts only, immutable caching, download disposition for the PDF) and the
audited original route (capability + step-up + custody event). Originals never become public.

## Read first

1. `docs/implementation/01-conventions.md` §3, §4, §5 (audit), §11
2. `docs/implementation/02-data-model.md` §7 (`evidence_artifacts.public`, `evidence_redactions`), §17 "Evidence" (`preview_ready → privacy_confirmed → published`)
3. `docs/implementation/03-routes-and-contracts.md` §1 route handlers (`/api/evidence/items/{id}/preview/{page}`, `/api/evidence/artifacts/{artifactId}`, `/api/evidence/items/{id}/original`), §3 (`PdfAssembler`, `Storage.putDerivative`), §4 "evidence" (`applyRedaction`, `confirmPrivacy`, `publish`, `getPublic`, `readOriginal`)
4. `docs/scope-of-work.md` §5 (viewer supports zoom/pan/fullscreen/page/rotate/processed-PDF download; originals never public; FD-003: no persistence warning)
5. `PRODUCT.md` hard rules: "Documents attached — not medically validated"; original evidence is a separate audited permission
6. Prototype: `app.js` `buildRedactDoc` 1574–1608 (the drag-to-draw rectangle interaction the canvas must reproduce; rectangles are in **page pixel** coordinates in the product), `compose.redact`, `compose.redactBody`, `compose.redactTool`, `compose.confirm1..3` strings (find them in `rogikotha-data.js` — `confirm2` is the FD-023 sentence), `evidence.status`, `evidence.notice`, `experience.evidenceOnly`, `VIEWER_STRINGS.rxRedacted` (`[ redacted by author ]`)
7. T-301 `review.publish` step 5 (evidence linkage rule) and T-304's artifact layout

## Owned paths

- `packages/domain/src/evidence/redaction.ts` (rect validation/merging), tests
- `packages/application/src/modules/evidence/commands/{apply-redaction,confirm-privacy,publish,read-original}.ts`, `queries/{get-public,get-preview-page,presence-for-review}.ts`, tests
- `packages/application/src/ports/pdf-assembler.ts`
- `packages/adapters/src/pdf-assemble/**` (`@cantoo/pdf-lib`), `packages/adapters/src/image-sharp/composite.ts` (redaction flattening), tests
- `apps/web/src/app/api/evidence/items/[id]/preview/[page]/route.ts`, `apps/web/src/app/api/evidence/artifacts/[artifactId]/route.ts`, `apps/web/src/app/api/evidence/items/[id]/original/route.ts`, `apps/web/src/server/actions/evidence.ts` (extend)
- `packages/database/src/repositories/evidence.ts` (extend: redactions, `markPublic`, `getPublicByReview`, `artifactForServe`)
- `packages/contracts/src/schemas/evidence.ts` (extend), `view-models/evidence.ts` (`EvidenceGroupVM`, `ViewerDocVM`)
- `packages/test-support/src/fakes/{pdf-assembler,evidence-repository}.ts`
- `packages/i18n/messages/{en,bn}.json` — `errors.evidence.notPreviewable`, `errors.evidence.confirmationRequired`, `ev.derivativeTitle` ("Processed copy — RogiKotha")

## Not in scope

The viewer React component and evidence sections on the experience page (T-308). Composer canvas UI (T-306). Retention/holds/original expiry (T-309). Moderator `removeFile` wiring (T-404 calls `evidence.remove` from T-303).

## Steps

1. **Domain** `redaction.ts`: `Rect {x, y, w, h}` integers in page pixels; `validateRects(rects, {width, height})` → clamps to bounds, rejects zero-area, merges overlaps (union of boxes is acceptable — each rect is drawn independently, merging is only to bound the count ≤ 50 per page).
2. **`evidence.getPreviewPage {itemId, pageNo}`** query (owner) → the **current** page artifact (after any redaction) as bytes + mime; state must be `preview_ready` or `privacy_confirmed`, else `evidence.not_previewable`. Route handler `/api/evidence/items/{id}/preview/{page}` streams it with `Cache-Control: private, no-store` and `X-Robots-Tag: noindex`.
3. **`evidence.applyRedaction {itemId, pageNo, rects}`** · owner · state `preview_ready` (a confirmed item must be un-confirmed first — refuse with `conflict`; the UI hides the tool after confirmation) · load current page artifact → `composite.ts`: `sharp(png).composite(rects.map(r => ({input: {create: {width: r.w, height: r.h, channels: 3, background: '#000'}}, left: r.x, top: r.y})))` → `.png()`; **new** `page_png` artifact row (`immutable`, `public: false`, `sanitiser_version` + `redaction: true`); previous artifact stays private (custody/history) but is no longer "current" — model "current" as `evidence_artifacts.superseded_by_id` (add nullable column via a migration in this task) so `getPreviewPage`, assembly and publish use `superseded_by_id IS NULL`; insert `evidence_redactions {rects, applied_to_artifact_id}`; custody `redaction_applied {pageNo, count}`; regenerate the thumbnail if `pageNo === 1`.
4. **`evidence.confirmPrivacy {itemId, confirmed: true}`** · owner · `preview_ready → privacy_confirmed`; `confirmed !== true` → `evidence.confirmation_required`; assembles the derivative PDF **now** (so preview download and publish are identical bytes): `PdfAssembler.assemble(currentPagesInOrder)` → `adapters/pdf-assemble`: `@cantoo/pdf-lib` `PDFDocument.create()`, per page `embedPng`, page size = image size in points at 110 dpi (`px * 72 / 110`), `drawImage` full-bleed, `setTitle(ev.derivativeTitle en)`, `setProducer('RogiKotha')`, no author/creator/keywords, no text layer, no JavaScript, no attachments, no metadata from the source; save with `useObjectStreams: false` → artifact `derivative_pdf` (`public: false` until publish); custody `privacy_confirmed`. An `unconfirm` is **not** offered; to change redactions after confirming, the author removes and re-uploads (matches prototype `ev.replace`).
5. **`evidence.publish` (internal)** — called only by `review.publish` (T-301 step 5) inside its transaction with the `reviewId`: for each item in `privacy_confirmed`: set `review_id`, state `published`, mark current `page_png`, `thumbnail`, `derivative_pdf` artifacts `public = true`, `retention_expires_at = clock.now() + retention.currentPolicy().originalDays` (T-309 owns the policy; until merged use the config default 90 from `ConfigProvider`), custody `published`, outbox `evidence.stateChanged {itemId, reviewId, state, uploaderAccountId}` (FD-084, C15). Items not `privacy_confirmed` are untouched and the review still publishes. `original` artifacts are never marked public — enforce in the repository method `markPublic(itemId)` with a `WHERE kind <> 'original'` **and** a domain assertion.
6. **`evidence.getPublic {reviewId}`** query → requires the review to be `published` (via `ReviewRepository.stateOf`) → groups in `EVIDENCE_GROUPS` order (`reviewed`, `later`, `outcome`) → items in `published` state only → `{publicId, label, pageCount, pages: [{pageNo, url: '/api/evidence/artifacts/<artifactId>', width, height}], thumbnailUrl, derivativePdfUrl, group}`; `failed` items are **not** projected publicly (the prototype showed a failed item with its reason on the public page — that was demo storytelling; in the product failed items are visible only to the author via `getForAuthor` — record as `// ASSUMPTION(T-305)` and raise in Questions). VM carries `noticeKey: 'evidence.notice'` and `statusKey: 'evidence.status'`.
6a. **`evidence.presenceForReview {reviewId}`** (internal query, FD-084): returns `{groups}` listing each `EVIDENCE_GROUPS` value that has at least one `published` item of that review; items in any other state count for nothing; exposes no item ids, filenames or keys. It implements Search's `EvidencePresence` port; wire it in the composition root in place of T-205's no-evidence default.
7. **Artifact route** `/api/evidence/artifacts/{artifactId}`: repository `artifactForServe(id)` returns only rows with `public = true`; anything else → 404 (not 403 — do not reveal existence); `Cache-Control: public, max-age=31536000, immutable`; `ETag = sha256`; `Content-Type` from the row; for `derivative_pdf` add `Content-Disposition: attachment; filename="<itemPublicId>-processed.pdf"`; `X-Content-Type-Options: nosniff`; `Content-Security-Policy: sandbox` for the PDF response.
8. **Original route** `/api/evidence/items/{id}/original`: `evidence.readOriginal {itemId, reason}` · requires `capability: evidence.original` **and** `stepUp` (5-minute step-up cookie from T-103; missing → `auth.step_up_required` 403) · `reason` required (≥ 10 chars) · custody `original_accessed {actor, reason}` + audit `evidence:<id>` + staff notification `security`? — use `staff_notifications.kind = 'security'` with `message_key notif.staff.originalAccessed` · streams `Storage.getPrivate(original.storage_key)` with `Cache-Control: private, no-store` and `Content-Disposition: attachment`. Signed-out or non-staff → 404.
9. Strings both locales; migration for `superseded_by_id`; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Redaction flattened | `pnpm --filter @rk/adapters test composite` | sample 20 pixels inside each rect → all `#000000`; pixels outside unchanged (compare with input) |
| New artifact, old kept | `pnpm --filter @rk/application test apply-redaction` | two `page_png` rows for the page; old has `superseded_by_id`; old `public` stays false forever (publish test) |
| Confirm required | `… test confirm-privacy` | `confirmed: false` → `evidence.confirmation_required`; success builds `derivative_pdf` |
| Derivative has no text/JS | `pnpm --filter @rk/adapters test pdf-assemble` | parse output with pdfjs: `getTextContent()` items length 0 on every page; `getJSActions()` null; metadata `Title` = "Processed copy — RogiKotha", no `Author`; page count matches |
| Publish marks derivatives only | application + db tests | after `evidence.publish`, `SELECT public FROM evidence_artifacts WHERE kind='original'` → all false; current page/thumb/pdf true |
| Unconfirmed stays private | `… test publish` | a `preview_ready` item on the same draft is untouched and the review publishes |
| Artifact route | `pnpm --filter @rk/web test artifacts.route` | public artifact → 200 immutable headers; private artifact id → 404; original id → 404; PDF → `Content-Disposition: attachment` |
| Original route | `… test original.route` | anonymous → 404; staff without capability → 404; with capability but no step-up → 403 `auth.step_up_required`; with both → 200 and one `original_accessed` custody row + audit row |
| Public VM has no original | `… test get-public` | JSON of VM contains no `storage_key`, no `original`, no `quarantine`, no filename |
| Unpublished review | same | `getPublic` for a `draft`/`hidden` review → `[]`? → `not_found` |
| FD-084: presence for a review (C8, C12) | `pnpm --filter @rk/application test presence-for-review` | a review with one published `reviewed` item and one `preview_ready` `outcome` item returns `groups = [reviewed]`; a review with no published item returns `[]`; the result carries no item id or filename |
| FD-084: search document gets the groups | integration test: publish the review above, run the relay and `search.refresh` | the review's `search_documents.evidence_groups` is `{reviewed}` and its doctor's `has_documents` is true; before publish both were empty/false |
| FD-084: `evidence.stateChanged` routes to search (C15) | publish an evidence item and read the relay's event map | the published `evidence.stateChanged` carries `reviewId`, and the relay enqueues both `notification.deliver` and `search.refresh` for it |
| Tree | `pnpm check` | green |

## Tests to write

- `redaction.test.ts` (domain): clamp, zero-area, merge, count cap.
- `composite.test.ts` (adapter): pixel sampling as above with a generated fixture.
- `pdf-assemble.test.ts` (adapter): properties above; 30-page assembly under 5 s.
- `apply-redaction.test.ts`, `confirm-privacy.test.ts`, `publish.test.ts`, `get-public.test.ts`, `read-original.test.ts` (application).
- `artifacts.route.test.ts`, `original.route.test.ts`, `preview.route.test.ts` (web).
- `evidence.int.test.ts` additions: `markPublic` never touches originals (attempt with a crafted call → 0 rows).

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Guessing artifact ids to fetch private pages/originals | UUIDv7 ids, `public = true` filter, 404 for everything else | artifact route test |
| Redaction that can be undone (overlay layer) | pixels are composited into a new PNG; no vector layer; PDF built from images only | composite + pdf-assemble tests |
| Redacted text surviving in the PDF text layer | assembled from PNGs; `getTextContent` empty | pdf-assemble test |
| Author skips privacy confirmation | `privacy_confirmed` required for linkage in `review.publish` | T-301 + `publish.test.ts` |
| Staff reads originals silently | capability + step-up + custody + audit + staff notification | original route test |
| Original metadata (title/author) copied into derivative | new document, explicit title/producer only | pdf-assemble test |
| Old (unredacted) artifact served after redaction | `superseded_by_id` filter in serve/publish | apply-redaction + publish tests |

## Hard-rule checklist

- [ ] Originals never public; separate audited capability for original access.
- [ ] Author confirms removal of unnecessary personal information before publication (FD-023 wording from `compose.confirm2`).
- [ ] Public copy is immutable; every artifact hashed.
- [ ] Evidence copy: "Documents attached — not medically validated"; no "verified"/"approved" anywhere in keys or VMs.
- [ ] No persistence warning text (FD-003).
- [ ] Both dictionaries updated.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
