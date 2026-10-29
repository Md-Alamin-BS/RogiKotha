# Business rules — U25 `t-305-privacy-preview-redaction-publish`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U25), `unit-of-work-story-map.md` (US7.2), `requirements.md` (FR53–FR57, FR59, FR62–FR68, FR83, FR86), `stories.md` (AC7.2.1–AC7.2.6, AC7.3.7, AC7.1.6), `contract-summary.md` (C2, C3, C8, C9, C12, C14, C15), T-305 with its amendments, the decision log (FD-003, FD-004, FD-016, FD-022, FD-023, FD-035, FD-036, FD-067, FD-068, FD-082, FD-084, FD-093), the project hard rules (`project.md`) and `01-conventions.md` §2, §3, §5, §10, §11. The workflows that apply these rules are in `functional-spec.md` (WF ids); the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question was decided A by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 14 lists what changes if the owner reverses one. This Unit is high risk: every authorization and audit rule is spelled out, and BR9.6 names the extra gates.

```yaml
rules:
  - id: BR1.1
    statement: "Only the uploader sees the processed preview, and only while the item is preview_ready or privacy_confirmed."
    category: authorization
    applies_to: "evidence.getPreviewPage, GET /api/evidence/items/{id}/preview/{page}"
    trigger: "Any preview request"
    logic: "IF actor is authenticated AND evidence_items.uploaded_by_account_id = actor.accountId THEN continue ELSE forbidden (route: 404); IF pageNo <> 1 OR no current page_png THEN not_found; IF state NOT IN (preview_ready, privacy_confirmed) THEN evidence.not_previewable (route: 404)"
    violation: "A preview served to anyone but the uploader, or of a failed or unscanned item, is an S1 private-data defect"
    source: "C14 preview route, T-305 step 2, FR63"
  - id: BR1.2
    statement: "applyRedaction requires a signed-in uploader, in any account status, and is limited to 120 calls per hour per account."
    category: authorization
    applies_to: "evidence.applyRedaction, server action applyRedaction"
    trigger: "Every call"
    logic: "requires: authenticated, owner(uploaded_by_account_id = actor.accountId) ELSE forbidden; rateLimiter.hit('evidence.redact:account:<id>', 120, 3600) refused THEN rate_limited with nothing written; unverified and restricted accounts may redact (it only reduces exposure)"
    violation: "Another account redacting an item, or unlimited CPU-heavy re-encodes, fails the authorization and abuse tests"
    source: "Question 11, T-305 step 3, F21"
  - id: BR1.3
    statement: "confirmPrivacy requires a signed-in, verified, unrestricted uploader, limited to 60 calls per hour."
    category: authorization
    applies_to: "evidence.confirmPrivacy, server action confirmPrivacy"
    trigger: "Every call"
    logic: "requires: authenticated, verifiedEmail, notRestricted, owner ELSE forbidden; rateLimiter.hit('evidence.confirm:account:<id>', 60, 3600) refused THEN rate_limited"
    violation: "A restricted account publishing evidence into a review through a late confirmation bypasses the publish restriction"
    source: "Question 11, review.publish requires (C9)"
  - id: BR1.4
    statement: "Publication and binding run only inside review.publish's transaction, or inside confirmPrivacy for an already bound item; they are never server actions."
    category: authorization
    applies_to: "EvidenceForPublish.publish, EvidenceForPublish.bindToReview, itemsOfDraft"
    trigger: "Any call"
    logic: "callable only with the caller's tx; not exported from server/actions; itemsOfDraft returns only items whose id is listed AND uploaded_by_account_id = the publishing account AND review_id IS NULL; Review refuses missing ids with validation"
    violation: "A publish path reachable from the browser, or an item of another account linked to a review, is an S1 defect"
    source: "C8, T-301 BR3.10 and Question 9, Question 1"
  - id: BR1.5
    statement: "getPublic and presenceForReview are internal queries that return public data only."
    category: authorization
    applies_to: "evidence.getPublic, evidence.presenceForReview"
    trigger: "Any call"
    logic: "no actor requirement; reached through review.getExperience / review.preview (web) and Search's EvidencePresence (worker); never a server action of their own"
    violation: "A direct server action would let a browser enumerate items of unpublished reviews"
    source: "C8, C12, FD-084"
  - id: BR1.6
    statement: "The public artifact route needs no session and serves only publicly servable artifacts."
    category: authorization
    applies_to: "GET /api/evidence/artifacts/{artifactId}"
    trigger: "Every request"
    logic: "no authentication; serve IF isPubliclyServable (BR5.6) ELSE 404; a signed-in staff member gets nothing more from this route"
    violation: "Any private artifact served by id fails the 'Artifact route' acceptance row"
    source: "C14, T-305 step 7, FR65"
  - id: BR1.7
    statement: "Opening an original requires a staff role, the evidence.original capability, an approved staff device and a live step-up, at most 20 times per hour per staff account."
    category: authorization
    applies_to: "evidence.authorizeOriginal, server action authorizeOriginal"
    trigger: "Every call"
    logic: "requires (U8 order): authenticated, staffRole IN (super_admin, admin, moderator), capability evidence.original (present in the Actor only with an approved rk_staff_device, T-103), stepUp (rk_stepup within 5 minutes, same session) ELSE forbidden or auth.step_up_required; rateLimiter.hit('evidence.original:account:<id>', 20, 3600) refused THEN rate_limited; admin and moderator hold the capability only when config.capabilities.<role>.originalEvidence is true"
    violation: "Original access without every gate breaks the PRODUCT.md hard rule (original evidence is a separate, audited permission) and AC7.3.7"
    source: "PRODUCT.md, FD-016, 03 §2, C8, C14, T-103 BR1.2-BR1.3 and BR7.3"
  - id: BR1.8
    statement: "The original route serves bytes only for a valid, unexpired, unused ticket presented by the account and session it was issued to, which still hold the capability and a live step-up."
    category: authorization
    applies_to: "GET /api/evidence/items/{id}/original?ticket="
    trigger: "Every request"
    logic: "Crypto.verifyClaims('evidence.original', ticket) valid AND claims.i = route id AND claims.a = actor.accountId AND claims.s = current session id AND claims.u > now AND actor.capabilities includes evidence.original AND actor.stepUp present AND rateLimiter.hit('evidence.original.ticket:<claims.e>', 1, 60) allowed THEN stream ELSE refuse (BR1.11)"
    violation: "A replayed, shared or stale ticket that streams bytes is an S1 defect"
    source: "Question 5, FD entry (c)"
  - id: BR1.9
    statement: "removeFile and purgeOriginal are internal operations: removeFile only from moderation.decide, purgeOriginal only from retention and deletion."
    category: authorization
    applies_to: "evidence.removeFile, evidence.purgeOriginal"
    trigger: "Any call"
    logic: "removeFile(tx, {itemId, actorAccountId, caseCode}) is called after moderation.decide has checked content.act; purgeOriginal(tx, {itemId, by}) is called by retention.expire (U29) and the evidence deletion participant (U39); neither is a server action nor exported to components"
    violation: "A browser-reachable removal or purge path is an S1 defect"
    source: "Question 13, C8, T-404 step 73, unit-of-work.md deletion participants"
  - id: BR1.10
    statement: "The worker may call presenceForReview and purgeOriginal and nothing else of this Unit."
    category: authorization
    applies_to: "@rogikotha/application/worker exports, apps/worker/src/container.ts"
    trigger: "Build and lint"
    logic: "worker.ts exports presenceForReview (search.refresh) and purgeOriginal (retention.expire and the worker steps of data.delete); applyRedaction, confirmPrivacy, authorizeOriginal, removeFile, getPreviewPage and the ticket code are not exported to the worker"
    violation: "A worker import of original access fails the worker boundary (T-010, FD-093)"
    source: "eslint.boundaries.mjs, T-304 step 5, FD-093"
  - id: BR1.11
    statement: "Commands refuse a foreign item with forbidden; route handlers answer every refusal with 404, except a missing or stale step-up, which is 403 auth.step_up_required."
    category: authorization
    applies_to: "the three route handlers; evidence commands"
    trigger: "Any refusal"
    logic: "command results: forbidden for a non-owner (as U23 does for remove); routes: signed-out, non-owner, non-staff, no capability, bad, expired or reused ticket, private or unknown artifact, malformed id -> 404 with no body detail; stepUp missing -> 403 {code: auth.step_up_required}"
    violation: "A 403 for a private artifact or a non-staff caller tells the caller the item exists"
    source: "Question 7, T-305 acceptance rows, C14 (amended), storyboard step 6 (amended)"
  - id: BR2.1
    statement: "A redaction rectangle is four integers in page pixels of the current page; the input carries 1 to 200 rectangles."
    category: validation
    applies_to: "ApplyRedactionInput"
    trigger: "Parse"
    logic: "rects: array(1..200) of {x, y, w, h} each z.number().int() with |value| <= 100000; pageNo int = 1; else validation"
    violation: "Fractions, NaN or huge values reaching sharp crash or mis-place the redaction"
    source: "02-data-model.md §7 (page pixels), T-305 step 1, T-306 step 7"
  - id: BR2.2
    statement: "Rectangles are clamped to the page; those with no area after clamping are dropped; none left means validation."
    category: calculation
    applies_to: "domain normaliseRects"
    trigger: "Decide step of applyRedaction"
    logic: "x0 = max(0, min(x, x+w)), x1 = min(width, max(x, x+w)); same for y; keep IF x1 - x0 >= 1 AND y1 - y0 >= 1; result empty THEN validation"
    violation: "A rectangle outside the image passed to sharp fails the composite"
    source: "T-305 step 1"
  - id: BR2.3
    statement: "Duplicate rectangles and rectangles fully inside another are dropped; rectangles are never merged into a larger box."
    category: calculation
    applies_to: "domain normaliseRects"
    trigger: "After BR2.2"
    logic: "drop r IF another kept rectangle s contains r (s.x0 <= r.x0 AND s.y0 <= r.y0 AND s.x1 >= r.x1 AND s.y1 >= r.y1); keep the first of identical rectangles; overlapping rectangles stay separate"
    violation: "A bounding-box merge would black out content the author meant to keep (doctor and facility details, FR64)"
    source: "Question 9"
  - id: BR2.4
    statement: "At most 50 rectangles per call after normalisation."
    category: validation
    applies_to: "domain normaliseRects"
    trigger: "After BR2.3"
    logic: "IF count > 50 THEN validation (fieldErrors rects); the author may apply again for more"
    violation: "An unbounded composite list is a CPU abuse path"
    source: "T-305 step 1, Question 9"
  - id: BR2.5
    statement: "Flattening composites opaque black into the raster and re-encodes a new image in the source format with no metadata."
    category: constraint
    applies_to: "ImageRedactor.flatten (adapters/image-sharp/redactor.ts)"
    trigger: "Every applyRedaction"
    logic: "sharp(bytes, {limitInputPixels: EVIDENCE_MAX_PIXELS, failOn: 'error'}) -> ensure opaque (flatten alpha onto white is NOT used; the black overlay is 4-channel with alpha 255) -> composite black rectangles -> PNG source: .png(); JPEG source: .jpeg({quality: 85, mozjpeg: true}); never withMetadata(); width and height unchanged; thumbnail = resize({width: 320, withoutEnlargement: true}) of the composited raster; returns version sharp@x.y.z"
    violation: "Any recoverable pixel under a rectangle, or EXIF/ICC/XMP in the output, breaks AC7.2.2 and FR63"
    source: "FR63, AC7.2.2, Question 8, T-304 step 3"
  - id: BR2.6
    statement: "A redaction writes a new current page and a new current thumbnail and marks both old ones superseded; old rows stay private for ever and are never deleted by this Unit."
    category: constraint
    applies_to: "applyRedaction persist step"
    trigger: "Successful redaction"
    logic: "insert page_png and thumbnail (immutable true, public false, page_no 1, sha256 and bytes from Storage, sanitiser_version); oldPage.superseded_by_id = newPage.id; oldThumb.superseded_by_id = newThumb.id; never update public on old rows"
    violation: "An old thumbnail left current would publish the unredacted image in miniature (finding F4, S1)"
    source: "T-305 step 3, finding F4"
  - id: BR2.7
    statement: "Each item has exactly one current page_png and one current thumbnail per page; current means superseded_by_id is null and deleted_at is null."
    category: constraint
    applies_to: "evidence_artifacts; migration <n>_evidence_current_artifact_unique.sql"
    trigger: "Every insert or update of an artifact"
    logic: "create unique index evidence_artifacts_current_uq on evidence_artifacts (item_id, kind, page_no) where superseded_by_id is null and deleted_at is null and kind in ('page_png', 'thumbnail'); every read of 'current' uses the same predicate (domain isCurrent, repository SQL)"
    violation: "Two current pages would both be published (finding F9, S1)"
    source: "02-data-model.md §7, findings F4 and F9"
  - id: BR2.8
    statement: "A redaction commits only if the item is still preview_ready and its current page is the one the image work started from; otherwise it returns conflict and deletes the files it wrote."
    category: constraint
    applies_to: "applyRedaction persist step"
    trigger: "Commit"
    logic: "in tx: select item for update; IF state <> preview_ready OR currentPage.id <> P.id THEN rollback, then Storage.delete(newPageKey), Storage.delete(newThumbKey) (best effort, logged evidence.redaction_orphan_deleted {count}), return conflict"
    violation: "A lost update forks the current page or redacts an item the author has just confirmed"
    source: "finding F9"
  - id: BR2.9
    statement: "Redaction is allowed only in preview_ready; a confirmed item refuses it with conflict, every other state with evidence.not_previewable."
    category: constraint
    applies_to: "evidence.applyRedaction"
    trigger: "Load step"
    logic: "state = preview_ready THEN continue; state = privacy_confirmed THEN conflict; else evidence.not_previewable"
    violation: "A redaction after confirmation would change a copy the author already approved"
    source: "T-305 step 3, 02 §17"
  - id: BR2.10
    statement: "Each redaction is recorded with its normalised rectangles and the page it was applied to."
    category: constraint
    applies_to: "evidence_redactions"
    trigger: "Successful redaction"
    logic: "insert {item_id, page_no: 1, rects: normalised, applied_to_artifact_id: P.id (the superseded source page)}; the successor is found through P.superseded_by_id"
    violation: "Missing history breaks custody review and the skip check (BR3.2)"
    source: "02-data-model.md §7"
  - id: BR2.11
    statement: "Redactions are cumulative and cannot be undone; there is no un-confirm; to start over the author removes the item and uploads again."
    category: policy
    applies_to: "evidence module"
    trigger: "Design"
    logic: "no reset or un-confirm command exists; ev.replace in the UI = remove (U23) + new intake"
    violation: "A reset that restores the sanitised base would bring back pixels the author chose to hide"
    source: "T-305 step 4, prototype ev.replace"
  - id: BR3.1
    statement: "Confirmation must be explicit: confirmed must be true."
    category: validation
    applies_to: "evidence.confirmPrivacy"
    trigger: "Every call"
    logic: "ConfirmPrivacyInput.confirmed is boolean; IF confirmed !== true THEN evidence.confirmation_required"
    violation: "Treating an absent or false confirmation as consent breaks FD-023"
    source: "FD-023, AC7.2.3, finding F6"
  - id: BR3.2
    statement: "An item with no redaction can be confirmed only with the Skip privacy editing acknowledgement."
    category: validation
    applies_to: "evidence.confirmPrivacy"
    trigger: "Decide step"
    logic: "redactionCount = count(evidence_redactions WHERE item_id); IF redactionCount = 0 AND skipEditing !== true THEN evidence.confirmation_required; custody details record {redactions: redactionCount, skippedEditing: redactionCount = 0}"
    violation: "Skipping privacy editing with a single click breaks FR63 and AC7.2.3"
    source: "FR63, AC7.2.3, Question 10"
  - id: BR3.3
    statement: "Confirmation moves preview_ready to privacy_confirmed; confirming a confirmed item is a no-op success; any other state is conflict."
    category: constraint
    applies_to: "evidence.confirmPrivacy"
    trigger: "Load and persist steps"
    logic: "preview_ready -> privacy_confirmed with custody privacy_confirmed and audit privacy_confirmed (actor author); privacy_confirmed -> ok, nothing written; published, failed, removed, rejected, processing states -> conflict"
    violation: "A failed or unscanned item reaching privacy_confirmed could be published"
    source: "02 §17, FD-023"
  - id: BR3.4
    statement: "Only a privacy_confirmed item can become published."
    category: constraint
    applies_to: "EvidenceForPublish.publish, late publication"
    trigger: "Publish"
    logic: "IF state <> privacy_confirmed THEN the item is skipped and stays private"
    violation: "Publishing an unconfirmed copy breaks FD-023 and AC7.2.2"
    source: "FD-023, AC7.2.2, AC7.2.3, 03 §4 review.publish"
  - id: BR3.5
    statement: "Confirming an item that is already bound to a review publishes it into that review in the same transaction."
    category: policy
    applies_to: "evidence.confirmPrivacy"
    trigger: "Persist step, item.review_id is not null"
    logic: "after privacy_confirmed, run the publish operation (BR4.2-BR4.5) for this item with reviewId = item.review_id; the review's own visibility is checked at read time (BR5.6), not here"
    violation: "Without it, items still processing at publish time (T-301 Question 9) could never publish"
    source: "Question 2, T-301 Question 9 and BR4.6, AC6.1.6"
  - id: BR4.1
    statement: "Evidence never blocks the review: a skipped item is logged and the review still publishes."
    category: policy
    applies_to: "EvidenceForPublish.publish"
    trigger: "Any item that fails BR4.2"
    logic: "skip the item; log evidence.publish_skipped {count}; return ok"
    violation: "A text review refused because of a file breaks FR66 and AC7.1.4"
    source: "FR66, AC7.1.4, T-301 BR4.6"
  - id: BR4.2
    statement: "An item publishes only if, under its row lock, it is privacy_confirmed and either unlinked or already linked to the same review."
    category: constraint
    applies_to: "EvidenceForPublish.publish"
    trigger: "Per item"
    logic: "select for update; IF state = privacy_confirmed AND (review_id IS NULL OR review_id = reviewId) THEN publish ELSE skip (BR4.1)"
    violation: "Publishing an item into another review, or after a concurrent removal, mislinks evidence"
    source: "C8, T-305 step 5"
  - id: BR4.3
    statement: "Publishing marks public only the current page and the current thumbnail; an original, superseded or deleted artifact is never marked public."
    category: constraint
    applies_to: "repository markCurrentPublic, domain assertPublishable, database check"
    trigger: "Publish"
    logic: "domain assertPublishable(artifacts) throws IF any kind = original OR superseded_by_id IS NOT NULL OR deleted_at IS NOT NULL; SQL: UPDATE evidence_artifacts SET public = true WHERE item_id = $1 AND kind IN ('page_png','thumbnail') AND superseded_by_id IS NULL AND deleted_at IS NULL; database check evidence_artifacts_original_not_public_check refuses public originals"
    violation: "A public original or superseded copy is an S1 hard-rule breach"
    source: "PRODUCT.md, T-305 step 5, hard-rule checklist"
  - id: BR4.4
    statement: "A published item records its review, its published page and the retention deadline of its original."
    category: calculation
    applies_to: "EvidenceForPublish.publish"
    trigger: "Per published item"
    logic: "review_id = reviewId; state = published; published_artifact_id = currentPage.id; retention_expires_at = clock.now() + originalDays days, with originalDays = await OriginalRetentionPolicy.originalDays(tx) (interim 90, ASSUMPTION(T-305), FD-004; U29 wires retention.currentPolicy); the deadline is set once and never changed by this Unit"
    violation: "A missing deadline lets an original linger past FR67's 90 days"
    source: "FR67, FD-004, FD-020, FD-068, FD-082, Question 14"
  - id: BR4.5
    statement: "Each published item writes one custody event and one evidence.stateChanged event with exactly four keys."
    category: constraint
    applies_to: "EvidenceForPublish.publish, late publication"
    trigger: "Per published item"
    logic: "custody published {pageCount: 1} actor author; outbox evidence.stateChanged {itemId, reviewId, state: 'published', uploaderAccountId}; the relay routes it to notification.deliver and search.refresh"
    violation: "Missing events leave search without evidence groups (FD-084)"
    source: "FD-084, C15"
  - id: BR4.6
    statement: "Binding links a still-pending item to the review privately and writes nothing else."
    category: constraint
    applies_to: "EvidenceForPublish.bindToReview"
    trigger: "review.publish with pending items"
    logic: "FOR items in (quarantined, validating, scanning, sanitising, preview_ready) with review_id IS NULL: SET review_id = reviewId; no public flag, no custody (no state change), no outbox; failed, rejected and removed items are ignored"
    violation: "A bound item made public before confirmation breaks FD-023"
    source: "T-301 Question 9, Question 1"
  - id: BR4.7
    statement: "Derivative files are not moved between storage prefixes at publish."
    category: policy
    applies_to: "EvidenceForPublish.publish, Storage"
    trigger: "Publish"
    logic: "public-ness is the row flag plus BR5.6; storage keys stay as written (private/<itemId>/... from U24, public/<itemId>/... from the seed); no web route serves STORAGE_ROOT directly"
    violation: "A move outside the transaction can leave rows pointing at missing files"
    source: "Question 12, T-304 step 1"
  - id: BR5.1
    statement: "An item is publicly visible in two states: published and original_expired."
    category: calculation
    applies_to: "getPublic, presenceForReview, artifactForServe; U14's document counts"
    trigger: "Any public read"
    logic: "PUBLIC_EVIDENCE_STATES = [published, original_expired] (contracts enum); every public read uses it"
    violation: "Testing published alone hides evidence once retention purges the original (finding F15, AC7.3.1)"
    source: "02-data-model.md §17, AC7.3.1, finding F15"
  - id: BR5.2
    statement: "getPublic returns evidence only for a publicly visible review; otherwise not_found."
    category: constraint
    applies_to: "evidence.getPublic"
    trigger: "Every call"
    logic: "IF ReviewVisibility.isPublic(reviewId) (state published AND deleted_at IS NULL) THEN project ELSE not_found"
    violation: "Evidence of a hidden, draft or deleted review in a view model fails the 'Unpublished review' row"
    source: "T-305 step 6, finding F16"
  - id: BR5.3
    statement: "The public evidence view model carries public ids, labels, page sizes and artifact URLs only."
    category: constraint
    applies_to: "EvidenceSectionVM, EvidenceGroupVM, EvidenceItemVM, ViewerDocVM"
    trigger: "Mapping"
    logic: "allowed: publicId, label (label_en/label_bn by actor.locale), pageCount, pages[{pageNo, artifactUrl, width, height}], thumbnailUrl, downloadUrl, group, labelKey, hasDocuments, statusKey 'evidence.status', noticeKey 'evidence.notice'; forbidden: internal ids, storage keys, original anything, quarantine, filenames, uploader, state, fail reason, hashes, custody"
    violation: "Any forbidden field fails the 'Public VM has no original' row and the privacy rules of contract-summary.md"
    source: "03 §2, contract-summary.md privacy rules, T-305 acceptance"
  - id: BR5.4
    statement: "Failed, removed, rejected and unconfirmed items are never projected publicly."
    category: constraint
    applies_to: "getPublic, presenceForReview"
    trigger: "Mapping"
    logic: "only PUBLIC_EVIDENCE_STATES; a failed item is visible only to its author through getForAuthor"
    violation: "Showing a failed item's reason publicly (as the prototype did for e5) discloses private processing detail"
    source: "02-data-model.md §7, T-305 step 6"
  - id: BR5.5
    statement: "presenceForReview lists each evidence group that has at least one publicly visible item, and nothing else."
    category: calculation
    applies_to: "evidence.presenceForReview (Search.EvidencePresence.forReview)"
    trigger: "search.refresh"
    logic: "SELECT DISTINCT group FROM evidence_items WHERE review_id = $1 AND state IN PUBLIC_EVIDENCE_STATES, ordered as EVIDENCE_GROUPS; result {groups}; no ids, counts or names"
    violation: "Presence counting unconfirmed items misleads the document filter (FR58)"
    source: "FD-084, C12, T-305 step 6a"
  - id: BR5.6
    statement: "An artifact is publicly servable only if it is a current page or thumbnail marked public, its item is in a public state and its review is publicly visible now."
    category: constraint
    applies_to: "domain isPubliclyServable, repository artifactForServe, artifact route"
    trigger: "Every artifact request"
    logic: "public = true AND kind IN (page_png, thumbnail) AND superseded_by_id IS NULL AND deleted_at IS NULL AND item.state IN PUBLIC_EVIDENCE_STATES AND ReviewVisibility.isPublic(item.review_id) THEN serve ELSE 404; U29 adds any hold-based hiding to this one predicate"
    violation: "Evidence of a hidden, deleted or removed review still served by URL is an S1 private-data defect (finding F3)"
    source: "Question 4, FD entry (b), FR83, FR86"
  - id: BR5.7
    statement: "Public artifact responses are revalidated every five minutes, never sniffed, never indexed, and downloadable as the processed image."
    category: constraint
    applies_to: "artifact route"
    trigger: "Every 200 or 304"
    logic: "Content-Type from the row; ETag \"<sha256>\"; If-None-Match equal THEN 304; Cache-Control: public, max-age=300; X-Content-Type-Options: nosniff; X-Robots-Tag: noindex; Content-Security-Policy: sandbox; default-src 'none'; Cross-Origin-Resource-Policy: same-origin; download=1 on a page_png THEN Content-Disposition: attachment; filename=\"rogikotha-processed-<itemPublicId>.<png|jpg by mime>\""
    violation: "A year of immutable caching defeats hides; a missing noindex breaks AC7.1.6"
    source: "Question 4, FR65, AC7.1.6, AC7.2.6, NFR8"
  - id: BR5.8
    statement: "The author's preview is never cached and never indexed."
    category: constraint
    applies_to: "preview route"
    trigger: "Every 200"
    logic: "Cache-Control: private, no-store; X-Robots-Tag: noindex; X-Content-Type-Options: nosniff; Content-Security-Policy: sandbox; default-src 'none'; Cross-Origin-Resource-Policy: same-origin; no ETag"
    violation: "A cached preview could be read from a shared device after sign-out"
    source: "T-305 step 2, C14"
  - id: BR5.9
    statement: "Evidence groups always appear in the order reviewed, later, outcome, each present even when empty; items are ordered by publication time."
    category: calculation
    applies_to: "evidence.getPublic"
    trigger: "Mapping"
    logic: "groups = EVIDENCE_GROUPS.map(g => ({group: g, labelKey: 'evidence.group.' + g, items})); items ordered by the published custody event time, then publicId; hasDocuments = any items"
    violation: "A missing empty group stops the viewer showing 'No documents' for that section (AC7.2.4)"
    source: "AC7.2.4, FR53, FR59, project.md (render a missing value as 'No documents')"
  - id: BR5.10
    statement: "The experience page and the composer preview get their evidence only from getPublic."
    category: constraint
    applies_to: "review.getExperience, review.preview (modules/review)"
    trigger: "Projection"
    logic: "ExperiencePageVM.evidenceGroups = getPublic(reviewId).groups; hasDocuments from it; a draft preview has no public item, so evidenceGroups shows three empty groups"
    violation: "A second evidence projection would drift from the public rule set"
    source: "T-301 ExperiencePageVM ('U25'), FD-067"
  - id: BR6.1
    statement: "An original-access request states a purpose from a closed list and a reason of 10 to 500 characters."
    category: validation
    applies_to: "AuthorizeOriginalInput"
    trigger: "Parse"
    logic: "purpose IN (moderation_case, legal_request, author_request, security_review); reason = trim(reason), 10 <= length <= 500; else validation"
    violation: "An access with no stated purpose fails AC7.3.7"
    source: "AC7.3.7, T-305 step 8, Question 17"
  - id: BR6.2
    statement: "Only an existing, not yet purged original can be opened."
    category: constraint
    applies_to: "evidence.authorizeOriginal"
    trigger: "Load step"
    logic: "the item's artifact kind = original AND deleted_at IS NULL ELSE not_found (seeded items have none; purged originals have deleted_at)"
    violation: "A ticket for a missing file streams nothing and misleads the custody log"
    source: "02-data-model.md §7, ISS-181"
  - id: BR6.3
    statement: "An original is opened only if the item passed a clean malware scan."
    category: constraint
    applies_to: "domain originalAccessAllowed"
    trigger: "Load step"
    logic: "allowed IF a custody event scan_clean exists for the item AND NOT (state = failed AND fail_reason = malware) ELSE conflict; quarantined, validating and scanning items have no scan_clean and are refused"
    violation: "Serving an unscanned or infected file to a staff machine breaks FD-035's fail-closed rule"
    source: "Question 6, FD-035"
  - id: BR6.4
    statement: "A granted access writes one custody event, one audit row and one staff-notice event in one transaction, then returns a one-time ticket."
    category: constraint
    applies_to: "evidence.authorizeOriginal"
    trigger: "Granted request"
    logic: "custody original_accessed {purpose, reason, staffRole} actor account:<staffId>; audit stream evidence:<itemId> action original_access details {purpose, step_up: true}; outbox evidence.originalAccessed {itemId, custodyEventId} (notification.deliver: staff kind security, message notif.staff.originalAccessed, target_code item public id); result {url}"
    violation: "A silent original read breaks the PRODUCT.md hard rule"
    source: "PRODUCT.md, AC7.3.7, T-305 step 8, C14"
  - id: BR6.5
    statement: "Every refused original-access request by a signed-in account is audited."
    category: constraint
    applies_to: "evidence.authorizeOriginal onRefused"
    trigger: "Any refusal after authenticated"
    logic: "onRefused writes audit evidence:<itemId> action original_access_refused details {code} in its own committed transaction (U8 defineCommand); no custody row; signed-out attempts are not audited (no account) and get 404"
    violation: "Unrecorded probing of originals hides misuse"
    source: "C14 ('a refusal is logged'), T-101 defineCommand"
  - id: BR6.6
    statement: "The ticket is signed with its own key purpose, lasts 60 seconds, is bound to item, account, session and custody event, and works once."
    category: constraint
    applies_to: "original-ticket.ts, Crypto port"
    trigger: "Issue and redeem"
    logic: "issue: Crypto.signClaims('evidence.original', {i, a, s, e, u: now + 60}); redeem: BR1.8; a second redemption of the same e within 60 s is refused by the RateLimiter; the reason never appears in the URL"
    violation: "A reusable or transferable link lets a file leave the audited path"
    source: "Question 5, T-103 Question 11 (signClaims)"
  - id: BR6.7
    statement: "An original is streamed only as a private attachment named by the item's public id."
    category: constraint
    applies_to: "original route"
    trigger: "Granted redemption"
    logic: "Storage.readPrivate(storage_key); Content-Type = detected_mime or declared_mime; Content-Disposition: attachment; filename=\"original-<itemPublicId>.<jpg|png>\"; Cache-Control: private, no-store; X-Robots-Tag: noindex; X-Content-Type-Options: nosniff; Content-Security-Policy: sandbox; default-src 'none'; the uploaded filename is never used"
    violation: "An inline or cached original, or the uploaded filename, leaks private data"
    source: "T-305 step 8, 03 §2 (no original filenames)"
  - id: BR7.1
    statement: "A moderator's file removal moves the item to removed from every state except rejected, including one still processing."
    category: constraint
    applies_to: "evidence.removeFile"
    trigger: "moderation.decide action removeFile"
    logic: "preview_ready, privacy_confirmed, published, original_expired, failed -> removed; removed -> ok (idempotent); quarantined, validating, scanning, sanitising -> removed (U24's compare-and-set then loses and deletes its own derivative files, F18); rejected -> conflict; fallback if U24 as merged does not stop on removed: those four states -> conflict and an ISS row"
    violation: "A removal that leaves the file public breaks FR83"
    source: "02 §17 ('any -> removed'), FR83, Question 13"
  - id: BR7.2
    statement: "A removed item has no public artifact; its files stay private until retention removes them."
    category: constraint
    applies_to: "evidence.removeFile"
    trigger: "Removal"
    logic: "UPDATE evidence_artifacts SET public = false WHERE item_id; no Storage.delete; custody removed {by: 'moderator', caseCode} actor account:<staffId>; outbox evidence.stateChanged {itemId, reviewId?, state: 'removed', uploaderAccountId}"
    violation: "Deleting files at removal would destroy what a later hold or review of the case needs"
    source: "FR83, FR86, T-309 acceptance ('evidence.remove on a held item still sets removed')"
  - id: BR7.3
    statement: "Purging an original marks its row deleted and returns the storage key; the caller deletes the file after commit."
    category: constraint
    applies_to: "evidence.purgeOriginal"
    trigger: "retention.expire (by retention) or the deletion participant (by deletion)"
    logic: "original.deleted_at = now; by retention: custody original_expired actor system:retention AND a published item moves to original_expired; by deletion: custody removed {part: 'original'} actor system:deletion; return {storageKey}; hold checks are the caller's (U29 wires them, FD-073)"
    violation: "A purge that changes public visibility of the processed copy breaks AC7.3.1"
    source: "FR67, AC7.3.1, C3, unit-of-work.md deletion participants"
  - id: BR7.4
    statement: "Files are deleted from storage only after the transaction that stopped referencing them commits, and deletion is idempotent."
    category: constraint
    applies_to: "applyRedaction (orphans), purge callers"
    trigger: "After commit or rollback"
    logic: "Storage.delete(key, {reason}) after commit; a missing file is success; a failure is logged and leaves an unreferenced private file"
    violation: "Deleting inside the transaction loses files on rollback"
    source: "finding F9, 01-conventions §3"
  - id: BR8.1
    statement: "Custody and audit actors: author actions are 'author', staff 'account:<staffId>', worker 'worker', retention 'system:retention', deletion 'system:deletion'."
    category: constraint
    applies_to: "every custody event and audit row this Unit writes"
    trigger: "Every write"
    logic: "applyRedaction, confirmPrivacy, publish, late publication -> actor author; authorizeOriginal, removeFile -> account:<staffId>; purgeOriginal -> system:retention or system:deletion; never account:<uploaderId>"
    violation: "An uploader's account id in a staff-readable record links an anonymous review to an account (finding F5, S1)"
    source: "Question 3, FD entry (a), FD-015, FD-016, FD-022"
  - id: BR8.2
    statement: "Every state-changing evidence command writes one allowlisted audit row on the stream evidence:<itemId>."
    category: constraint
    applies_to: "applyRedaction, confirmPrivacy, authorizeOriginal"
    trigger: "Commit"
    logic: "redaction_applied {pageNo, count}; privacy_confirmed {redactions, skippedEditing}; original_access {purpose, step_up: true}; original_access_refused {code}; never rects, reason text, filenames, storage keys or account ids of the uploader; built with T-101's allowlist builders"
    violation: "Free text or ids in audit details break 01-conventions §5"
    source: "01-conventions §5, T-101 audit allowlist"
  - id: BR8.3
    statement: "Custody details are allowlisted per event."
    category: constraint
    applies_to: "evidence_custody_events.details"
    trigger: "Every custody write"
    logic: "redaction_applied {pageNo, count}; privacy_confirmed {redactions, skippedEditing}; published {pageCount}; original_accessed {purpose, reason, staffRole} (the one staff-written text, never logged); removed {by, caseCode?, part?}; original_expired {}"
    violation: "Unlisted keys in append-only custody cannot be removed later"
    source: "02-data-model.md §7 (allowlisted details), FD entry (c)"
  - id: BR8.4
    statement: "This Unit appends evidence.stateChanged only for published and removed, and evidence.originalAccessed for a granted original access."
    category: constraint
    applies_to: "outbox writes"
    trigger: "Publication, removal, granted access"
    logic: "stateChanged {itemId, reviewId?, state, uploaderAccountId} exactly; originalAccessed {itemId, custodyEventId}; no event for redaction or confirmation; U25 adds the relay route evidence.originalAccessed -> notification.deliver and the staff mapping security / notif.staff.originalAccessed"
    violation: "Events for private steps would create notices nobody needs and refresh search for nothing"
    source: "C15, FD-084, Question 15"
  - id: BR8.5
    statement: "Logs carry ids, counts and codes only."
    category: constraint
    applies_to: "Logger calls in this Unit"
    trigger: "Every log line"
    logic: "allowed: itemId, custodyEventId, count, code, state; never filenames, storage keys, reasons, rect coordinates, ticket values, account ids of uploaders"
    violation: "A filename or reason in logs breaks FR68 and 01-conventions §11"
    source: "FR68, AC7.1.6, 01-conventions §11, ISS-206"
  - id: BR8.6
    statement: "Evidence copy reads 'Documents attached — not medically validated' and never 'verified' or 'approved'; every new string exists in English and Bengali."
    category: constraint
    applies_to: "view models, i18n keys"
    trigger: "Build"
    logic: "statusKey evidence.status, noticeKey evidence.notice; no key name or VM field contains verified or approved (grep test); notif.staff.originalAccessed added to en.json and bn.json in one commit; no persistence warning (FD-003)"
    violation: "Breaks the PRODUCT.md hard rules and ADR 0011"
    source: "PRODUCT.md, FD-003, FD-024, AC7.2.5"
  - id: BR9.1
    statement: "Image work and ticket signing sit behind ports; application code imports no external package or Node built-in."
    category: constraint
    applies_to: "packages/application, packages/adapters, containers"
    trigger: "Lint"
    logic: "ImageRedactor (adapters/image-sharp/redactor.ts) and Crypto (adapters/crypto) are built only in apps/web/src/server/container.ts; domain imports nothing; database does not import domain, so the current predicate is written in SQL and in domain separately and both are tested"
    violation: "pnpm lint fails (FD-093)"
    source: "eslint.boundaries.mjs, FD-093, 01-conventions §2"
  - id: BR9.2
    statement: "Review visibility, retention days and search presence cross module lines only through ports."
    category: constraint
    applies_to: "modules/evidence/ports.ts, modules/review/review-visibility.ts, worker container"
    trigger: "Design and lint"
    logic: "Evidence declares ReviewVisibility and OriginalRetentionPolicy; Review implements ReviewVisibility (built here); Evidence implements Search.EvidencePresence and Review.EvidenceForPublish; Evidence never imports modules/review or ReviewRepository"
    violation: "A direct import makes a dependency cycle (FD-067)"
    source: "FD-067, finding F16"
  - id: BR9.3
    statement: "One forward-only migration adds the current-artifact unique index, and the migration-count pins move with it."
    category: constraint
    applies_to: "packages/database/src/migrations, migrations.int.test.ts, validator-probes.int.test.ts"
    trigger: "Build"
    logic: "next free number; if U23 did not make evidence_items.review_id nullable, the same migration does (ALTER COLUMN review_id DROP NOT NULL); both count pins updated in the same commit"
    violation: "A stale pin turns pnpm test:int red"
    source: "T-010 migration pins, findings F1 and F12"
  - id: BR9.4
    statement: "The repository stubs this Unit fills stop throwing, and not-implemented.test.ts lists only what remains."
    category: constraint
    applies_to: "repositories/evidence.ts, not-implemented.test.ts, fakes"
    trigger: "Build"
    logic: "applyRedaction, confirmPrivacy, publish, remove, getPublic, readOriginal stubs replaced by the methods of functional-spec.md WF1-WF9; listForStaff stays a T-407 stub; the fake evidence repository stays a superset (repositories-superset.test.ts)"
    violation: "A green stub test that still lists real methods fails (ISS-294)"
    source: "ISS-294, ISS-091"
  - id: BR9.5
    statement: "Tests cover every rule, add a smoke assertion and keep the 80% line floor."
    category: constraint
    applies_to: "the Unit's test files"
    trigger: "Build and Test"
    logic: "functional-spec.md § 11; at least one smoke assertion (evidence-public.smoke.test.ts); 80% per package with untested files counted; tests read as sentences and can fail (each pixel test is proven by a mutation that skips the composite)"
    violation: "Breaks team.md Testing Posture and D10"
    source: "team.md Testing Posture, D10"
  - id: BR9.6
    statement: "The Unit runs the high-risk gates."
    category: policy
    applies_to: "U25"
    trigger: "Construction"
    logic: "collaborators on; a separate agent writes and runs 3-5 adversarial tests (functional-spec.md § 9.2); the owner's written sign-off in the Unit's record before the phase gate; reviewer reads the full diff for authorization, audit rows, Bengali/English parity, import boundaries, private data in view models or logs, files outside owned paths and tool or model identity"
    violation: "Merging without them breaks team.md Way of Working step 5"
    source: "team.md, team-allocation.md (Bolt 28 high risk)"
  - id: BR9.7
    statement: "Every finding, workaround and assumption gets an ISS row linked to U25."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Build"
    logic: "functional-spec.md § 10 rows with Found in 'U25 T-305'; ASSUMPTION(T-305) markers for the interim retention days and the per-process ticket limiter; the Build and Test record lists the ISS ids found and fixed"
    violation: "Breaks the project.md Mandated rule on ISS rows"
    source: "project.md Mandated, team.md"
```

## Rules summary

| Id | Rule | Category |
|---|---|---|
| BR1.1 | Preview only for the uploader, in preview_ready or privacy_confirmed | authorization |
| BR1.2 | Redaction: signed-in uploader, any status, 120/h | authorization |
| BR1.3 | Confirmation: verified, unrestricted uploader, 60/h | authorization |
| BR1.4 | Publish and bind only inside review.publish or a bound confirmation | authorization |
| BR1.5 | getPublic and presence are internal, public data only | authorization |
| BR1.6 | Artifact route: no session, servable only | authorization |
| BR1.7 | Original: staff, capability, device, step-up, 20/h | authorization |
| BR1.8 | Original route: valid one-time ticket of the same account and session | authorization |
| BR1.9 | removeFile and purgeOriginal internal only | authorization |
| BR1.10 | Worker gets presenceForReview and purgeOriginal only | authorization |
| BR1.11 | forbidden in commands, 404 on routes, 403 only for step-up | authorization |
| BR2.1 | Rectangles are integers; 1–200 per input | validation |
| BR2.2 | Clamp, drop zero area | calculation |
| BR2.3 | Drop duplicates and contained; never expand | calculation |
| BR2.4 | At most 50 rectangles per call | validation |
| BR2.5 | Opaque black, same format, no metadata | constraint |
| BR2.6 | New page and thumbnail; old ones superseded | constraint |
| BR2.7 | One current page and thumbnail per item (unique index) | constraint |
| BR2.8 | Compare-and-set commit; orphans deleted | constraint |
| BR2.9 | Redaction only in preview_ready | constraint |
| BR2.10 | Redaction rows record normalised rectangles | constraint |
| BR2.11 | No undo, no un-confirm | policy |
| BR3.1 | confirmed must be true | validation |
| BR3.2 | No redaction needs the skip acknowledgement | validation |
| BR3.3 | preview_ready → privacy_confirmed; idempotent | constraint |
| BR3.4 | Only privacy_confirmed publishes | constraint |
| BR3.5 | Confirming a bound item publishes it | policy |
| BR4.1 | Evidence never blocks the review | policy |
| BR4.2 | Publish under lock, same review only | constraint |
| BR4.3 | Only current page and thumbnail become public | constraint |
| BR4.4 | Review link, published page, retention deadline | calculation |
| BR4.5 | One custody event and one four-key event per item | constraint |
| BR4.6 | Binding is private and writes nothing else | constraint |
| BR4.7 | No file moves at publish | policy |
| BR5.1 | Public states: published, original_expired | calculation |
| BR5.2 | getPublic only for a visible review | constraint |
| BR5.3 | Public VM fields allowlisted | constraint |
| BR5.4 | Failed and unconfirmed items never public | constraint |
| BR5.5 | Presence lists groups only | calculation |
| BR5.6 | Servable predicate with live review visibility | constraint |
| BR5.7 | 300 s revalidated cache, noindex, nosniff, attachment download | constraint |
| BR5.8 | Preview never cached or indexed | constraint |
| BR5.9 | Three groups in order; chronological items | calculation |
| BR5.10 | Experience page evidence only from getPublic | constraint |
| BR6.1 | Purpose from a closed list; reason 10–500 | validation |
| BR6.2 | Only an existing, unpurged original | constraint |
| BR6.3 | Only after a clean scan | constraint |
| BR6.4 | Custody, audit and staff notice in one transaction; ticket | constraint |
| BR6.5 | Refusals audited | constraint |
| BR6.6 | Ticket: own key, 60 s, bound, once | constraint |
| BR6.7 | Private attachment named by public id | constraint |
| BR7.1 | Moderator removal: every state but rejected → removed | constraint |
| BR7.2 | Removed: nothing public, files kept | constraint |
| BR7.3 | Purge marks the original deleted; caller deletes the file | constraint |
| BR7.4 | Storage deletes after commit, idempotent | constraint |
| BR8.1 | Actor forms; author is 'author' | constraint |
| BR8.2 | Allowlisted audit rows on evidence:<itemId> | constraint |
| BR8.3 | Allowlisted custody details | constraint |
| BR8.4 | Events only for published, removed, original access | constraint |
| BR8.5 | Logs: ids, counts, codes | constraint |
| BR8.6 | Evidence wording; bilingual keys | constraint |
| BR9.1 | Ports for image work and signing | constraint |
| BR9.2 | Ports across module lines (FD-067) | constraint |
| BR9.3 | One migration; count pins move | constraint |
| BR9.4 | Stub list updated (ISS-294) | constraint |
| BR9.5 | Tests, smoke, coverage | constraint |
| BR9.6 | High-risk gates | policy |
| BR9.7 | ISS rows | policy |
