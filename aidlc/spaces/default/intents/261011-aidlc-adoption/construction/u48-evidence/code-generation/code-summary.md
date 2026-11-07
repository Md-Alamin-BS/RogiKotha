# Code summary — U48 `u48-evidence`

Completed at plan Step 52 (2026-11-07). Branch `bolt/u48-evidence`, worktree `rk-u48`. The plan is `code-generation-plan.md`, the trace `traceability.json`, the written paths `source-manifest.json`. Covers T-303 (evidence intake) and T-304 (worker evidence pipeline) for release 1 (FD-105). Step 53 (the demo `reviews.ts` deletions) runs at merge, after the rebase on `main`, and is not done here.

## What was built

- **Domain** (Steps 4-11): `packages/domain/src/evidence/` with the limits (`limits.ts`), the state lists and `authorStatusOf` (`states.ts`), the transition table (`transitions.ts`), `detectImageType`, `extensionMatches` and `imageStructureValid` (`file-type.ts`), and `cleanFilename` (`filename.ts`), with their tests.
- **Contracts** (Steps 12-13): the evidence input schemas and view models (`OwnEvidenceList`, `OwnEvidenceFile` with `failed` and `reasonKey`), the error codes `evidence.rate_limited` and `evidence.upload_failed`.
- **Ports and adapters** (Steps 14-19): `EvidenceRepository`, `EvidenceFileWriter` and `EvidenceFileReader` (split, so the web tier cannot read an original), `ScannerPort`; `createFsEvidenceWriter` and `createFsEvidenceReader` (`storage-fs`) and `createClamdScanner` (`scanner-clamd`, fail closed).
- **Database and queue** (Steps 20-25): `PgEvidenceRepository` (web and worker methods, the per-review advisory lock, the worker column list without `original_filename_enc` and `uploaded_by_account_id`), `evidence.sweep` and the explicit 300 s expiry in `queue-declaration.ts`, the `JobAttempt` passed from `pg-boss-queue.ts` to handlers.
- **Application** (Steps 26-33): the `evidence` module (`admitUpload`, `checkUpload`, `intake`, `remove`, `getForAuthor`, `countPublicEvidence`), the processor and the sweep (`jobs/`), the `/worker` subpath exports.
- **Worker** (Steps 34-35): `handlers/evidence-process.ts` (120 s attempt budget) and `evidence-sweep.ts` (cron every 5 minutes), the container wiring (reader and scanner only), `RELAY['evidence.stateChanged'] = []`.
- **Web** (Steps 36-44): `POST /api/evidence/upload`, the slimmed server actions (`listOwnEvidenceFiles`, `removeEvidence`), the container binding of `countPublicEvidence`, `STORAGE_ROOT` in the web env, `EvidenceNote`, `EvidenceSection`, `EvidenceFileRow` and the `fetch`-based `EvidenceUploader`, the `ev.*` copy in both languages.
- **Retirement** (Steps 45-46): the demo evidence data module and its tests, `server/clamav.ts`, `server/storage.ts` and their tests, the `evidence` binding in `server/data.ts`, four demo contract types, the demo `uploadEvidence` action.
- **Records** (Steps 50-52): this file, the `traceability.json` and `source-manifest.json`, the ISSUES rows, the T-303 and T-304 amendments and hand-offs, and one missed hand-off fixed (the web logger's allowlist, ISS-642).

## Gate counts (final run, Step 52)

- `pnpm check` green: 315 test files, 3612 passed, 2 expected fail, 1 skipped; typecheck, lint (one warning that U48 did not cause: an unused disable directive in `packages/i18n/src/routing.ts`), i18n parity and `pnpm build` all pass.
- `pnpm smoke` green: 27 files, 52 tests. The U48 additions are `evidence.smoke.test.ts`, `evidence-upload.int.smoke.test.ts` and `EvidenceNote.smoke.test.tsx`; no assertion was removed or skipped.
- `pnpm format:check` green.
- Step 47 (earlier in the same Unit): `pnpm test:int` green, 58 files, 393 passed plus 2 expected failures; `npx impeccable detect apps/web/src --no-advisory` exit 0; `pnpm contrast` all pass. Step 49's fix and Step 52's logger change touched no int-test input; `pnpm check` runs the `web-int` project again.
- Whole-suite growth against the base: U48 adds 25 adversarial tests (Step 49) and the module, adapter, worker, database and component tests listed in the plan notes.

## Line coverage before and after (summed per package from `coverage/coverage-summary.json`)

The "before" column is U47's recorded "after" on the same base: Step 1 ran no coverage because the machine was shared by parallel builds.

| Package | Before | After |
|---|---|---|
| `packages/domain` | 99.48% (191/192) | 98.92% (368/372) |
| `packages/contracts` | 100% (419/419) | 100% (427/427) |
| `packages/application` | 90.05% (1294/1437) | 91.35% (1562/1710) |
| `packages/adapters` | 100% | 97.30% (252/259) |
| `packages/database` | 98.09% (1184/1207) | 98.14% (1215/1238) |
| `packages/test-support` | 95.32% (1752/1838) | 95.76% (1941/2027) |
| `apps/web` | 94.99% (2614/2752) | 95.33% (2692/2824) |
| `apps/worker` | 100% | 100% (192/192) |
| `packages/i18n` | 100% | 100% (54/54) |
| total | 95.22% (7801/8192) | 95.61% (8703/9103) |

Every package stays above the 80% floor (D10); nothing was lowered. `domain` fell by half a point because 180 new lines were added and 4 are not reached (defensive branches of the structure walk).

## Route paths

The only route U48 adds is `POST /api/evidence/upload` (`apps/web/src/app/api/evidence/upload/route.ts`). U48 edits no page route, so no bracketed path is involved; the experience page is not edited (C16).

## Files outside U48's owned paths

Shared files changed, each additive or the one line the design names (functional-spec § 7):

- `apps/web/src/server/container.ts`, `data.ts`, `env.ts` (+ tests); `apps/worker/src/{registry,main,container}.ts` and `handlers/{index,outbox-relay}.ts` (+ tests); `packages/database/src/queue/{queue-declaration,pg-boss-queue}.ts`; `packages/database/src/schema/evidence.ts` (comment only); `packages/i18n/messages/{en,bn}.json` and generated `keys.ts`; the barrels `packages/{domain,application,adapters}/src/index.ts`, `application/src/worker.ts`, `ports/{index,logger,outbox}.ts`, `ports/repositories/index.ts`; `packages/test-support` builders and fakes and their superset and port-fake tests.
- Not listed in the plan, each recorded as an owned-path addition:
  - `packages/contracts/src/errors.ts` and `docs/implementation/03-routes-and-contracts.md` § 2: two error codes (the header of `errors.ts` requires the doc line first).
  - `apps/web/src/server/actions/review-slots.ts` and `components/patient/experience/slots.test.tsx` (U47 files): `loadPublicEvidenceCount` returns null for an unknown or unpublished review (ISS-641).
  - `apps/web/src/server/actions/ownership.adversarial.test.ts`: mock lines and two upload assertions that named deleted code.
  - `apps/web/src/server/logger.ts` and `logger.test.ts`: five evidence fields appended to the allowlist (ISS-642).
  - `packages/database/src/demo/{doctors,reviews,index}.ts`, `demo/ready-evidence-states.ts` (new) and `repositories/public-evidence-count-interim.ts`: the ready-state constant moved, the interim count runs its own query (ISS-622).
  - `infra/compose/.env.example`, `docs/status/dependency-check-log.md`, `docs/implementation/ISSUES.md`, `docs/implementation/tasks/T-303-evidence-intake.md` and `T-304-worker-evidence-pipeline.md`.

## Paths not listed in `source-manifest.json`

Paths under `aidlc/`, `.claude/` and `.agents/` are excluded by rule: U48 changed only `code-generation-plan.md`, `unit-test-instructions.md`, this file, `traceability.json` and `source-manifest.json`. No written path contains `[`, `]` or `*`. Deleted files are left out of the manifest:

- `apps/web/src/server/clamav.ts`, `clamav.test.ts`, `storage.ts`, `storage.test.ts`, `storage.adversarial.test.ts`
- `packages/database/src/demo/evidence.ts`, `evidence.int.test.ts`, `evidence.adversarial.test.ts`

## Issues found and fixed in U48 (for the Build and Test record)

Rows ISS-620 to ISS-642 are new in `docs/implementation/ISSUES.md` (U48's reserved range is ISS-620 to ISS-659). The plan's Step 35 note called the `processingFacts` row "ISS-620"; ISS-620 went to the Step 49 finding first, so that row is ISS-623.

- **Found and fixed in U48:** ISS-620 (S3, concurrent same-key uploads answered 200 and 500), ISS-623 (S3, `processingFacts` returned `createdAt` as text), ISS-642 (S3, web logger dropped the five evidence log fields).
- **Open, needs action:** ISS-621 (S2, the worker resolves a relative `STORAGE_ROOT` from `apps/worker`, so with the default `./.data/storage` every item would end `failed`/`unknown`). An open S2 blocks the phase gate, so it must be fixed before then; the fix is one resolution against the worker's `repoRoot`.
- **Open, closing in a later Unit:** ISS-622 (U50), ISS-624 and ISS-629 (T-309), ISS-625 (T-105), ISS-626, ISS-627, ISS-628, ISS-633 and ISS-635 (T-305, T-306), ISS-630 and ISS-632 (T-502, with ISS-139), ISS-637 (U41), ISS-639 and ISS-640 (U50 owner review).
- **Open, accepted for release 1:** ISS-631, ISS-634, ISS-636, ISS-638, ISS-641 (check at merge).
- Existing rows read at Step 1 and still open: ISS-139 (S2, `rk_worker` table-wide SELECT), ISS-001 (PDF evidence, Phase 2).

## Sign-off

Delegated by the owner on 2026-11-04. Written by the agent at plan Step 50 on 2026-11-07, for U48 `u48-evidence`, a high-risk Unit (evidence).

- **Adversarial results (Step 49, a separate agent, 25 tests):**
  - A1 held: a forged PNG signature over HTML, a PNG truncated after IHDR, a PNG with HTML after IEND and a JPEG with a ZIP after EOI all end `rejected`/`malformed`; a JPEG sent as `.png` is refused `type_rejected`; an original swapped on disk after intake is rejected on its hash. None is counted.
  - A2 broke once, then held: two uploads with the same idempotency key at the same instant answered 200 and 500 (ISS-620); fixed by taking the review lock before the key check, and the test passed on three runs. A 16 MB file, 15 MB + 1 byte, the eleventh file (also two at once) and the seventh 15 MB file are all refused and their files deleted.
  - A3 held: another account's upload, list and remove answer 404, null and `not_found`, change nothing and leak no item id.
  - A4 held: `../`, `..\` and absolute names end up under a random 32-hex key, with the last path segment kept sealed; no temp file survives a dropped connection; a hopped root stays inside.
  - A5 held: with clamd down an item stays `scanning` through three retries, ends `failed`/`scanner_unavailable` on the fourth, is never counted, and the author sees Could not be checked with Remove; a worker killed in the last attempt is ended by the sweep; no route reads an original.
- **Gate counts:** `pnpm check` 315 files, 3612 passed, 2 expected fail, 1 skipped; `pnpm smoke` 27 files, 52 tests; `pnpm test:int` 58 files, 393 passed, 2 expected fail (Step 47); `impeccable` and `contrast` clean.
- **Coverage:** `domain` 98.92%, `application` 91.35%, `adapters` 97.30%, `contracts` 100%, `database` 98.14%, `test-support` 95.76%, `apps/web` 95.33%, `apps/worker` 100%. All above the 80% floor.
- **Acceptance rows (Step 48):** AC7.1.1 to AC7.1.6 met for release 1 as designed; the browser view of AC7.1.4 and AC7.1.5 and the demo Playwright spec were not run here (ISS-639). The live ClamAV check passed: the EICAR string in a PNG-named file is refused at intake, and a valid PNG ends `preview_ready` through the worker container's handler.
- **Open ISS rows at sign-off:** no S1. One S2: ISS-621 (worker storage root), to be fixed before the phase gate. ISS-139 (S2, `rk_worker` grant) stays open as before. The S3 and S4 rows are listed above.
- **Verdict:** no break remains open in the Unit's owned paths other than ISS-621, which sits in the worker container wiring. The sign-off covers the Unit's code and tests only. The owner's review of copy and look moves to the U50 release check and stays on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` (the Bengali copy for the new `ev.*` keys, ISS-640).

## Hand-off to the merge

- Step 53 (BR8.2): after the rebase on `main`, grep `apps` and `packages` for callers of `getOwnReviewForEdit`, `personasOf`, `updateOwnReview`, `snapshotOf` and `getReviewByPublicId` in `packages/database/src/demo/reviews.ts`, delete only those with none, in its own commit followed by `pnpm check`, and record the result in this unit's Build and Test record.
- Appends meet other Bolts at merge: `ISSUES.md` (keep both sides; renumber ISS-620 to ISS-642 if another Bolt took them), `en.json`, `bn.json` (then `pnpm --filter @rogikotha/i18n keys` and `pnpm i18n:check`), `ports/outbox.ts`, `domain/src/index.ts`, `test-support/src/fakes/index.ts`, `server/container.ts`, `worker/registry.ts`. ISS-641: U47's `review-slots.ts` and `slots.test.tsx` were edited here.
- U41 replaces the Content-Length lines in the upload route (ISS-637) and then lowers the 11 mb limits in `apps/web/next.config.ts` at U50.
- A fresh worktree needs `pnpm build` once before `pnpm lint` (ISS-544); this run's `pnpm check` builds first.
