# Frontend components — U48 `u48-evidence` (release 1)

Folder: `apps/web/src/components/patient/evidence/` (U48 owns it from U47's merge). Patient-side styles follow FD-091 (plain CSS, design and motion tokens, no animation library). Every string is an i18n key with `en` and `bn` values in the same commit (BR6.4); numerals follow the active language. Props follow C16: the two components other Units mount, `EvidenceSection` and `AuthorEvidence`, keep their props on `main` and each loads its own data (review 01, R-03).

## Hierarchy

```text
<EvidenceSection reviewPublicId>        server; the C16 slot the experience page mounts
  <EvidenceNote count>                  public, everyone

<AuthorEvidence reviewPublicId>         server; mounted by U47's approved design inside AuthorTools
  <EvidenceUploader {...OwnEvidenceList}>   client; only when getForAuthor returns a list
    <EvidenceFileRow file> × n          presentational, rendered by the uploader
```

Text fallback: the page mounts `EvidenceSection`, which renders only `EvidenceNote`. `AuthorTools` mounts `AuthorEvidence`, which renders `EvidenceUploader`, which renders one `EvidenceFileRow` per file.

## Components

| Component | Kind | Props | Behaviour | Rules |
|---|---|---|---|---|
| `EvidenceSection` | server | `{reviewPublicId}` (C16, unchanged) | WF3: resolves the id, checks the review is published, reads the count through `PublicEvidenceCount`, renders `EvidenceNote`. Renders nothing for an unknown or unpublished review. Renders nothing for the author: their list lives in `AuthorEvidence`. | BR5.2, BR5.3, BR5.5 |
| `EvidenceNote` | server | `{count}` (unchanged) | `count > 0`: `evidence.status` ("Documents attached — not medically validated") and `ev.note.count` with the count. `count = 0`: `label.noDocuments` ("No documents"). Never a 0, never a state name. | BR5.3, BR5.4 |
| `AuthorEvidence` | server | `{reviewPublicId}` (C16, unchanged) | WF3b: loads its own list with `listOwnEvidenceFiles(reviewPublicId)`, now a thin call to `evidence.getForAuthor`; `null` renders nothing; otherwise renders `<EvidenceUploader {...list} />`, as on `main`. | BR1.3, BR5.5, BR6.1 |
| `EvidenceUploader` | client | `OwnEvidenceList` = `{reviewPublicId, files, maxFiles, maxBytes}` (same fields) | The list heading `ev.upload.listLabel`, the hint `ev.upload.hint`, the rows oldest first, then a file input with `accept="image/jpeg,image/png"`. A client pre-check of size (`ev.upload.errors.tooLarge`) and count (convenience only; the server decides), one `fetch` per file to `POST /api/evidence/upload` with a fresh `idempotencyKey`, then `router.refresh()`. Disabled with `ev.upload.limitReached` when the files in `pending` or `ready` reach `maxFiles`. | BR2.1–BR2.5, BR2.7 |
| `EvidenceFileRow` | presentational (no server imports, so the client uploader can render it) | `{file: OwnEvidenceFile}` | Name (or `label.notProvided`), size in the active numerals, the status text, and for `rejected` and `failed` the reason, `ev.guidance.photograph` and `ev.failNote`; a Remove button calling the `removeEvidence` server action, labelled `ev.removeNamed` for screen readers. | BR6.1–BR6.3 |

The props of `EvidenceUploader` keep their names and fields. Its `OwnEvidenceFile.status` union widens from `'pending' | 'ready' | 'rejected'` to add `'failed'`, and each file gains an optional `reasonKey`. That is allowed: `AuthorEvidence`, inside this folder, is its only caller (the experience page on `main` mounts `AuthorEvidence` and `EvidenceNote` only), and a widened union with an optional field keeps any other caller compiling. The types move to `packages/contracts/src/view-models/evidence.ts` under the same names and are re-exported from `actions/evidence.ts`.

## Author status copy

| Status | Key | English | Bengali |
|---|---|---|---|
| `pending` (quarantined, validating, scanning) | `ev.status.pending` (value changed) | Being checked | যাচাই হচ্ছে |
| `ready` (preview_ready, published) | `ev.status.ready` (value changed) | Attached | যুক্ত হয়েছে |
| `rejected` | `ev.status.rejected` (unchanged) | Not accepted | গ্রহণ করা হয়নি |
| `failed` | `ev.status.failed` (added) | Could not be checked — try again later | যাচাই করা যায়নি — পরে আবার চেষ্টা করুন |

No copy says "verified", "approved", "safe" or a time to completion (BR5.4, BR6.1).

## Copy — every key U48 touches

Reused unchanged: `evidence.status`, `label.noDocuments`, `label.notProvided`, `ev.note.count`, `ev.remove`, `ev.failNote`, `ev.status.rejected`, `ev.upload.fileLabel`, `ev.upload.submit`, `ev.upload.uploading`, `ev.upload.listLabel`, `ev.upload.limitReached`, `ev.upload.errors.{signedOut,notFound,noFile,tooLarge,tooMany,failed}`, `errors.evidence.{typeRejected,tooLarge,totalTooLarge}`. Their `en` and `bn` values already state C18's limits (15 MB, 10 files, 100 MB) or take them as `{maxMb}` and `{maxFiles}`.

Changed (both languages, same commit):

| Key | English | Bengali | Why |
|---|---|---|---|
| `ev.status.pending` | Being checked | যাচাই হচ্ছে | "Scan pending" described a scan during the request. |
| `ev.status.ready` | Attached | যুক্ত হয়েছে | "Ready" read as a quality judgement. |
| `ev.upload.hint` | JPG or PNG images only, up to {maxMb} MB each and {maxFiles} per experience. Each file is checked for malware after it is uploaded. Readers see only how many files are attached, never the files or their names. | শুধু JPG বা PNG ছবি, প্রতিটি সর্বোচ্চ {maxMb} এমবি এবং প্রতি অভিজ্ঞতায় সর্বোচ্চ {maxFiles}টি। আপলোডের পর প্রতিটি ফাইল ম্যালওয়্যারের জন্য যাচাই করা হয়। পাঠকেরা শুধু দেখেন কয়টি ফাইল যুক্ত আছে — ফাইল বা তার নাম কখনো দেখেন না। | The scan now runs after the upload, in the worker. |
| `errors.evidence.tooMany` | You can attach up to 10 files per experience. | প্রতি অভিজ্ঞতায় সর্বোচ্চ ১০টি ফাইল যুক্ত করা যায়। | Evidence attaches to a published experience, not a draft. |

Added (both languages, same commit):

| Key | English | Bengali |
|---|---|---|
| `ev.status.failed` | Could not be checked — try again later | যাচাই করা যায়নি — পরে আবার চেষ্টা করুন |
| `ev.reason.malware` | A security check found a problem with this file. | নিরাপত্তা যাচাইয়ে এই ফাইলে সমস্যা পাওয়া গেছে। |
| `ev.reason.notImage` | This is not a JPG or PNG image, or the image is damaged. | এটি JPG বা PNG ছবি নয়, অথবা ছবিটি নষ্ট। |
| `ev.reason.tooLarge` | This file is larger than {maxMb} MB. | এই ফাইলটি {maxMb} এমবির চেয়ে বড়। |
| `ev.reason.couldNotCheck` | The check could not finish. Remove this file and upload it again later. | যাচাই শেষ করা যায়নি। ফাইলটি সরিয়ে পরে আবার আপলোড করুন। |
| `ev.guidance.photograph` | Take a clear photo of the document and upload it again. | কাগজটির একটি পরিষ্কার ছবি তুলে আবার আপলোড করুন। |
| `ev.removeNamed` | Remove {name} | {name} সরান |
| `ev.upload.done.received` | File received. It stays private and is not counted until the check ends. | ফাইল পাওয়া গেছে। যাচাই শেষ না হওয়া পর্যন্ত এটি ব্যক্তিগত থাকবে এবং গণনায় আসবে না। |
| `ev.upload.errors.unconfirmed` | Confirm your email address to attach files. | ফাইল যুক্ত করতে আপনার ইমেইল ঠিকানা নিশ্চিত করুন। |
| `ev.upload.errors.rateLimited` | You have uploaded many files in a short time. Try again in {minutes} minutes. | অল্প সময়ে অনেক ফাইল আপলোড করেছেন। {minutes} মিনিট পর আবার চেষ্টা করুন। |

Deleted (both languages, same commit), because their copy describes a scan during the request: `ev.upload.done.ready` ("It passed the malware scan"), `ev.upload.done.pending` ("Scan pending"), `ev.upload.done.rejected`, `ev.upload.pendingNote`, `ev.upload.rejectedNote`. Code Generation greps for each before deleting; a key with a caller outside this folder stays and gets an S3 row. Left untouched and unused in release 1: `ev.state.*`, `ev.replace` (Replace is Remove, then upload again, Q5), `errors.evidence.{confirmationRequired,notPreviewable}`.

## Upload errors (route `messageKey`)

| Answer | `messageKey` |
|---|---|
| `400 evidence.type_rejected` | `errors.evidence.typeRejected` |
| `400 evidence.too_large` | `errors.evidence.tooLarge` |
| `400 evidence.too_many` | `errors.evidence.tooMany` |
| `400 evidence.total_too_large` | `errors.evidence.totalTooLarge` |
| `400` no file part | `ev.upload.errors.noFile` |
| `401` | `ev.upload.errors.signedOut` |
| `403` unconfirmed | `ev.upload.errors.unconfirmed` |
| `404` | `ev.upload.errors.notFound` |
| `429 evidence.rate_limited` | `ev.upload.errors.rateLimited` with `{minutes}` |
| `500 evidence.upload_failed` | `ev.upload.errors.failed` |
| `200` | `ev.upload.done.received` |

The uploader announces the result in a polite live region (CR-004) and keeps focus on the input.

## States and interaction

- Idle → uploading (the button shows `ev.upload.uploading`, the input is disabled) → done (`ev.upload.done.received`; the list refreshes and the new row reads Being checked) or error (the message under the input; the file is not listed).
- A row in `pending` does not poll on its own; the author sees the new state on the next page load. No spinner promises completion (AC7.1.5). Every row reaches a final status: Attached, Not accepted, or Could not be checked — try again later (BR4.10, BR4.11).
- A `failed` row stops counting towards `maxFiles`, so the uploader is enabled again once the author has fewer than 10 files in `pending` or `ready`.
- Remove asks no confirmation dialog in release 1; the button's accessible name is `ev.removeNamed` with the file name, or with `label.notProvided` when there is none.

## Tests (component, `en` and `bn`)

`EvidenceNote` with 0 and with 3; `EvidenceSection` rendering only the note (no file list, no file name) for the author and for a visitor; `AuthorEvidence` rendering nothing for a non-author and the uploader for the author; `EvidenceFileRow` in each status with and without a name, with the reason and Remove for `rejected` and `failed`; `EvidenceUploader` disabled at 10 counting files and enabled again when one is `failed`, a refused type, a too-large file and the rate-limit message; a check that no `ev.*` or `evidence.*` value contains "verified" or "approved" in English or "যাচাইকৃত" or "অনুমোদিত" in Bengali (the word "যাচাই", "check", is allowed: the required wording itself uses it). `impeccable detect` and `pnpm contrast` pass.
