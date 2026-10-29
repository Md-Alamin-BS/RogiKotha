# Functional Design questions — U25 `t-305-privacy-preview-redaction-publish`

## Context

- Unit U25 (kind `library`, size M, **high risk**: evidence) delivers T-305 (`docs/implementation/tasks/T-305-privacy-preview-redaction-publish.md`, with its FD-084 amendment and the CR-001/FD-036 images-only scope change) for US7.2 (AC7.2.1–AC7.2.6), the original-access part of AC7.3.7 and the noindex part of AC7.1.6. It depends on U24 T-304 and U3 T-010 in the record; Question 18 adds the edges it really needs.
- Read: `unit-of-work.md` (U25, the deletion participants), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `bolt-plan.md` (Bolt 28), `stories.md` (US7.1–US7.3), `requirements.md` (FR53–FR57, FR59, FR62–FR68, FR83, FR86), `contract-summary.md` (C2, C3, C8, C9, C12, C14, C15), `decision-log.md` up to FD-094, `01-conventions.md` §2, §3, §5, §10, §11, `02-data-model.md` §7, §16, §17, `03-routes-and-contracts.md` §1–§5, the schema, contracts, repository stub, seed and `eslint.boundaries.mjs` on `main`, the prototype (`compose.redact*`, `compose.confirm1..3`, `evidence.status`, `evidence.notice`, `buildRedactDoc`), the U8, U10, U14, U21, U22 and U24 drafts (U23 T-303 has none yet), ISS-139, ISS-164, ISS-181, ISS-182, ISS-239, ISS-291, ISS-294 (no open row names T-305), and `OWNER-REVIEW-QUEUE.md`.
- Every question below was decided by the agent under the owner's no-questions instruction of 2026-10-29, by the recommended option, which is listed first. Each stays open to the owner's change in `OWNER-REVIEW-QUEUE.md`; `functional-spec.md` § 14 says what changes if they choose differently. Questions 3, 4 and 5–7 (with 17) touch a data boundary or a founder decision, so `functional-spec.md` § 17 holds FD entries (a), (b) and (c) for the build to append.

## Settled before this stage

- **FD-036**: images only (JPEG, PNG), one page per item; no PDF, no `PdfAssembler`, no `derivative_pdf`.
- **FD-035**: scanning fails closed; an item that never had a clean scan never advances.
- **FD-023**: the author confirms the processed copy; no automated PII detection (FR64).
- **FD-003**: no persistence warning on evidence.
- **FD-004, FD-068, FD-082**: originals are kept 90 days by default; retention periods come only from `retention_policies`; `ConfigValues` has no retention block.
- **FD-084, C15**: `evidence.stateChanged {itemId, reviewId?, state, uploaderAccountId}` routed to `notification.deliver` and `search.refresh`; search keeps `evidence_groups`.
- **FD-067**: module ports are declared by the consumer; no import cycle.
- **FD-093**: the boundary matrix (no external package or Node built-in in `application`, `database` never imports `domain`, adapters built only in the containers, the worker only through `@rogikotha/application/worker`).
- **PRODUCT.md hard rules**: originals never public; original access is a separate, audited permission; "Documents attached — not medically validated"; never "verified" or "approved"; a missing value reads "No documents".
- **U21 T-301 Question 9**: at publish, confirmed items publish and pending items are bound to the review, then the draft is deleted.
- **U22 T-302**: a review is publicly visible when its stored state is `published` and `deleted_at` is null; an author can restore within 30 days.
- **Owner answers so far**: counts only, no percentages (no evidence count shows a percentage); text-only facility feedback (no evidence on facility feedback); lawful-access section on Terms and Privacy (the `legal_request` purpose of Question 17 points there); the others (masked own email, "Former member", release 1 settings, limited-data threshold, facility criteria, one hospital name per branch, no anonymity caveat, FR46 deferred, mail-only worker key) do not touch this Unit.

## Settled in this design without a question

- The redaction image work runs outside the transaction; the commit is a compare-and-set under the item row lock (`functional-spec.md` WF2, BR2.8).
- A partial unique index enforces one current page and one current thumbnail per item (BR2.7); it is the Unit's only migration.
- Redactions are cumulative; there is no undo and no un-confirm (BR2.11); "Replace" in the UI is U23's remove plus a new upload.
- Evidence groups always appear as three sections in the order reviewed, later, outcome, each present even when empty (BR5.9).
- `ConfirmPrivacyInput.confirmed` becomes a boolean so `false` returns `evidence.confirmation_required` (F6).
- `ViewerDocVM.itemId` becomes `publicId`; no internal id reaches a page (BR5.3).
- Original responses are attachments named by the item's public id, never the uploaded filename (BR6.7).
- The one new message key `notif.staff.originalAccessed` gets both languages in one commit; its Bengali is flagged for review (FD-042).

## Questions

### Question 1 — Who builds `itemsOfDraft` and `bindToReview`

U21 declares `EvidenceForPublish` with three methods and says Evidence implements them "in U23 T-303 and U25 T-305". U23 has no design yet.

A. **U23 builds them if its design does; at build start U25 builds whatever is missing, never twice, and checks that U23 made `evidence_items.review_id` nullable** (recommended). Follows U21's split and keeps the publish rules in one module; the only cost is a check at the start of the Bolt.
B. U25 always builds all three. Clear ownership, but U23's intake tests then cannot exercise the publish path, and a U23 that already built them would collide.
C. U21 builds them inside `modules/review`. Review would read and write evidence tables, which crosses the module boundary.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 2 — An item confirmed after its review was published

Items still processing at publish are bound to the review (T-301 Question 9). When the author later confirms one, what happens?

A. **It publishes into that review at once, in the same transaction as the confirmation; serving still checks the review live** (recommended). This is the only order in which binding has a purpose; a hidden review's new evidence appears only when the review does.
B. It stays `privacy_confirmed` until a separate "publish documents" action. One more command and screen, and authors who miss the step never see their evidence published.
C. Bound items never publish. Contradicts AC6.1.6 and makes binding pointless.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 3 — Who custody and audit rows name for author actions

`02-data-model.md` §7 and the seed use `account:<id>`. Custody is shown to any staff member in the quarantine view (T-407), so an account id there links an anonymous or pseudonymous review to its account without `identity.reveal` (F5, S1).

A. **The opaque actor `author`; the account link stays only in `evidence_items.uploaded_by_account_id`, which no view, log or audit detail carries** (recommended). Closes the linkage; a Super Admin still reaches the person through `identity.reveal` on the review. Needs FD entry (a), and U23 applies it to intake and author remove.
B. Keep `account:<id>` and have T-407 hide the actor from staff without `identity.reveal`. Every later reader of custody (exports, logs, audits) must remember the rule.
C. `persona:<id>`. Evidence would have to ask Review for the persona (a dependency cycle), and the pseudonymous persona still links reviews to each other.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 4 — How public evidence images are served and cached

The task serves any `public = true` artifact with a one-year immutable cache, so a hidden, deleted, held or removed review's images stay reachable (F3, S1).

A. **Check on every request that the artifact is current, public, its item in a public state and its review publicly visible; `Cache-Control: public, max-age=300` with the SHA-256 as `ETag`** (recommended). Every hide takes effect within five minutes; revalidation costs one small query. Needs FD entry (b).
B. The task's public flag and one-year immutable cache. Fastest, but no hide or removal ever reaches a cached copy, and the URL keeps working.
C. Flip the `public` flag whenever the review is hidden, deleted or restored. Review state changes would have to call Evidence each time; one missed path leaves the images public.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 5 — How staff open an original

C14 puts the staff `reason` in the GET query string, which ends up in browser history and server logs; T-407 expects a one-time signed URL (F7).

A. **A server action records the access (custody, audit, staff notice) and returns a 60-second, single-use ticket bound to item, account, session and custody event; the GET route streams the file once** (recommended). Keeps the reason out of URLs and logs, makes each access exactly one recorded event, and gives T-407 its URL. Needs FD entry (c).
B. C14 as written: one GET with `reason` in the query that records and streams. Simplest, but the reason leaks and every retry is a new custody row.
C. The server action returns the bytes directly. No URL at all, but large files travel through the action payload, cannot stream and cannot be saved as an attachment cleanly.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 6 — Which originals can be opened

A. **Only originals of items with a `scan_clean` custody event that are not `failed(malware)`** (recommended). Never puts an unscanned or infected file on a staff machine (FD-035); staff still see the case through custody and the processed copy.
B. Every original. Staff may want to inspect a malware upload for a case, but a click executes the risk on their device.
C. Only originals of published items. Too narrow: moderation of a failed upload and author requests need unpublished originals too.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 7 — Status codes when original access is refused

The task's acceptance expects 404 for anonymous and no-capability callers; C14 and storyboard step 6 say 403 (F8).

A. **404 for every refusal (signed out, not staff, no capability, bad or reused ticket), and 403 `auth.step_up_required` only for a missing or stale step-up** (recommended). Reveals nothing about which items exist; the one 403 tells a legitimate staff member what to do. Storyboard step 6 changes to "→ 404".
B. C14's 403 `forbidden` for signed-in callers without the capability. Clearer for staff, but confirms that an item id exists.
C. Precise 401, 403 and 404. Best for debugging, worst for probing.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 8 — Format of the redacted image

A. **The same format as the processed source (PNG stays PNG, JPEG is re-encoded at quality 85), with no metadata** (recommended). The rectangle's pixels are replaced before encoding, so JPEG loses nothing private; a 12 MP photo stays a reasonable size.
B. Always PNG. Lossless everywhere, but a redacted photo becomes several times larger than its unredacted version.
C. Always JPEG. Small, but screenshots with text get blurry edges.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 9 — How rectangles are cleaned up

A. **Clamp to the page, drop zero-area, duplicate and fully contained rectangles, never merge, at most 50 per call** (recommended). Never blacks out more than the author drew (doctor and facility details stay, FR64) and bounds the work per call.
B. Merge overlapping rectangles into bounding boxes. Fewer composites, but hides content the author meant to keep.
C. Use the rectangles as sent. The client could send thousands or rectangles outside the image, which crashes or slows the encoder.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 10 — The "Skip privacy editing" extra confirmation

AC7.2.3 says skipping needs an extra confirmation. Without a server check it is only a UI promise.

A. **`confirmPrivacy` refuses an item with no redaction unless the input carries `skipEditing: true`, sent by the UI after the extra confirmation; custody records `skippedEditing`** (recommended). Testable on the server; one optional field.
B. UI only. AC7.2.3 is then tested only in T-306, and any other client skips it.
C. Forbid confirming without a redaction. Forces a pointless rectangle on images with nothing to hide.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 11 — Which accounts may redact and confirm

A. **Redaction needs only the signed-in uploader in any account status; confirmation needs a verified, unrestricted uploader** (recommended). Redaction only reduces exposure, so a restricted author can still hide personal data; confirmation leads to publication, which a restriction must stop.
B. Both need verified and unrestricted. A restricted author could not hide their own data on an already-bound item.
C. No status checks on either. A restricted account could publish evidence through a late confirmation.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 12 — Whether files move to `public/` at publish

U24's draft writes derivatives under `private/` and assumes U25 writes public copies.

A. **No file moves; public-ness is the row flag plus the live check of Question 4; no route serves `STORAGE_ROOT` directly** (recommended). Nothing happens outside the transaction, so no row can point at a missing file; a hide needs no file work.
B. Copy the current page and thumbnail to `public/` at publish. Ready for a static host later, but copies happen outside the transaction, and every hide or removal must delete them.
C. Serve `public/` statically. Fastest, but bypasses every visibility check.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 13 — Who owns moderator removal and the original purge

The task says T-404 calls T-303's remove; C8 and `unit-of-work.md` give the moderator and deletion paths to U25, and T-404, T-407 and T-410 depend on T-305 for it (F11).

A. **U25 builds `removeFile` (called by `moderation.decide`) and `purgeOriginal` (called by retention and deletion) as internal operations** (recommended). One module writes evidence state; later Units call one function.
B. T-404 and T-410 write their own evidence code. Three Units edit the same tables and rules.
C. Reuse the author's remove (`rejected`) for moderators. Loses the difference between an author's choice and a moderation decision in custody and notices.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 14 — Where the original's retention period comes from at publish

The task's fallback ("config default 90 from `ConfigProvider`") no longer exists (FD-082, F2).

A. **An `OriginalRetentionPolicy` port with an interim 90 days marked `ASSUMPTION(T-305)`, naming FD-004; U29 T-309 wires it to `retention.currentPolicy().originalDays`** (recommended). Every published item gets a deadline now; one wiring line changes later.
B. Read `retention_policies` from the evidence repository now. Evidence would read a table the Retention module owns.
C. Leave `retention_expires_at` null until T-309. T-309 must back-fill deadlines, which FD-020 allows only through its bulk action.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 15 — Which events this Unit emits

A. **`evidence.stateChanged` only for `published` and `removed`; `evidence.originalAccessed` for a granted original access, which becomes a `security` staff notice; nothing for redaction or confirmation** (recommended). Private steps create no notice and no search refresh; every original access is visible to staff oversight.
B. Also `stateChanged` for `privacy_confirmed`. Notices nobody needs and a search refresh that changes nothing.
C. No staff notice for original access; audit only. Weaker oversight of the most sensitive read.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 16 — Where authors finish items bound to a published review

After publish the draft is deleted, so an item that finishes processing later has no screen (F10).

A. **`evidence.getForAuthor` accepts `{reviewId}` here; U38 T-409 adds a "documents waiting for you" list that reuses T-306's canvas and confirm** (recommended). Uses the existing workspace; F10 stays open until U38 builds it.
B. The composer keeps a step after publish that waits for processing. An author who leaves the page loses the step.
C. Bound items not confirmed within 30 days are removed automatically, with no screen. The author's evidence silently disappears.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 17 — What a staff member states when opening an original

AC7.3.7 asks for a stated purpose; C14 has a free-text `reason` only.

A. **A purpose from a closed list (`moderation_case`, `legal_request`, `author_request`, `security_review`) plus a reason of 10–500 characters; the purpose goes in audit, the reason only in custody** (recommended). Purposes can be counted and reviewed; the reason gives context; `legal_request` points to the lawful-access section of Terms and Privacy.
B. Free-text reason only. Cannot be counted, easy to fill with "x".
C. Purpose only. Loses the case context.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 18 — Dependency edges for the parallel build

U25 lists only U24 and U3, but it implements U21's port and edits its projection, uses U10's capability and step-up, adds rows to U34's relay table, replaces U18's worker default and makes U26's server actions real. U25 is at dependency level 6 with U21; U18 and U26 are at level 7. Under FD-094's dependency-ready swarm it could run beside U21 or before U18 and U26 (F22, S2).

A. **Add U21 T-301, U10 T-103, U34 T-405, U18 T-205 and U26 T-306 to U25's `depends_on` in `unit-of-work-dependency.md` before the swarm schedules level 6; U25 moves to level 8 and U28 follows** (recommended). The design's assumptions become guarantees; the engine stops a too-early start. U25 starts later, which costs nothing because U28, U33, U36 and U39 already come after it.
B. Keep the edges; U25 checks at build start that those Units are merged and stops otherwise. The swarm may still schedule it too early and waste a worktree.
C. Make U25 degrade: declare `EvidenceForPublish` itself if absent, skip the worker wiring, leave the actions to U26. Ownership becomes conditional, and a later Unit must finish U25's wiring.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
