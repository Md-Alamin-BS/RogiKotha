# Unit test instructions — U48 `u48-evidence`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U48 uses these:

- `domain` (node): `packages/domain/src/evidence/` (limits, states, file type and structure, transitions, filename).
- `contracts` (node): `packages/contracts/src/schemas/evidence.ts` and the view models.
- `test-support` (node): the evidence fakes and builders.
- `adapters` (node): `storage-fs` on a temp dir and `scanner-clamd` against a fake clamd `net.Server` on `127.0.0.1:0`.
- `application` (node): the evidence module's commands, queries, processor and sweep, with the `test-support` fakes.
- `database` (node, serial): `*.int.test.ts` for the evidence repository and the queue, against `DATABASE_URL_TEST`.
- `worker` and `worker-int`: the two evidence handlers, the registry, the relay map, `main.ts` and the container wiring; one handler integration test.
- `web` (jsdom) and `web-int` (node, serial): the upload route, the slim action file, the container test, the components in `en` and `bn`, and the route integration and smoke tests.

U48 adds no Playwright test: the design asks for none, and the demo end-to-end run on `main` must stay green. Coverage uses `@vitest/coverage-v8`.

## Where it runs

Each Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database assigned to this worktree (a name ending in `_test`, for example `rogikotha_w2_test`, because the reset guard refuses other names), never at another worktree's database. `STORAGE_ROOT` in tests is a temp dir created by the test, never the shared `./.data/storage`. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. Step 3 of the plan runs each line once in the worktree and corrects it here if a filter does not match.

```bash
pnpm infra:up

# Domain: limits, states, filename, detection, PNG and JPEG structure, transitions:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/evidence/

# Contracts: evidence schemas and error codes:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/evidence.test.ts

# Fakes and builders:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/fakes/port-fakes.test.ts packages/test-support/src/builders/builders.test.ts

# Adapters: storage-fs (temp dir) and scanner-clamd (fake socket):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project adapters packages/adapters/src/storage-fs/ packages/adapters/src/scanner-clamd/

# Application: commands, queries, processor, sweep, module smoke:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/

# Queue and repository integration (assigned test DB):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/evidence.int.test.ts packages/database/src/queue/pg-boss-queue.int.test.ts packages/database/src/queue/queue-declaration.test.ts

# Worker: handlers, registry, relay map, main pass-through, wiring; the mail.send tests stay green unchanged:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project worker apps/worker/src/handlers/evidence-process.test.ts apps/worker/src/handlers/evidence-sweep.test.ts apps/worker/src/handlers/outbox-relay.test.ts apps/worker/src/handlers/mail-send.test.ts apps/worker/src/registry.test.ts apps/worker/src/main.test.ts apps/worker/src/container.wiring.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project worker-int apps/worker/src/handlers/evidence-process.int.test.ts apps/worker/src/handlers/mail-send.int.test.ts

# Web: route, slim actions, container, components (en and bn):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/app/api/evidence/upload/route.test.ts apps/web/src/server/actions/evidence.test.ts apps/web/src/server/container.test.ts apps/web/src/components/patient/evidence/

# Web integration: upload route against the assigned test DB and a temp STORAGE_ROOT:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/upload.int.test.ts

# The Unit's smoke files, then the whole cumulative smoke suite:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/evidence.smoke.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/evidence-upload.int.smoke.test.ts
timeout 600 pnpm smoke

# Adversarial tests (Step 49, written by a separate agent):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/evidence/evidence.adversarial.test.ts
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project adapters packages/adapters/src/storage-fs/storage-fs.adversarial.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/app/api/evidence/upload/upload.adversarial.int.test.ts

# i18n parity and the gate:
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
timeout 900 pnpm test:int
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a `*.int.test.ts` or `*.int.smoke.test.ts` file is not picked up by the named project, check that project's `include` glob in its `vitest.config.ts` (or the inline `web-int`/`worker-int` entries in `vitest.workspace.ts`) and record the right project here; do not change the glob. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## What to cover (`functional-spec.md` § 8, `frontend-components.md` § Tests)

| Group | Tests |
|---|---|
| Domain | every § 4 row with exact custody values and outbox yes or no; `detectImageType` on JPEG, PNG, GIF, a PNG header on a text body, a renamed `.exe`; `imageStructureValid` passing a valid PNG, a baseline JPEG, a progressive JPEG, a JPEG with an EXIF thumbnail, and failing a PNG truncated after IHDR, without IEND, first chunk not IHDR, one wrong CRC, HTML after IEND, width 0 and 20001, a JPEG truncated before EOI, a ZIP after EOI, no SOF before SOS, height 0 and 20001; `cleanFilename` on `../../a.png` and Windows paths; `authorStatusOf` for every state; `sweepReason` for both reasons; the C18 limit values |
| Contracts | each evidence schema's accepted and refused inputs; `evidence.rate_limited` and `evidence.upload_failed` in the code list |
| Adapters | a key with `..`, `/`, uppercase or 31 characters throws before any file call; `maxBytes + 1` → `too_large` with no file left; the writer has no `readQuarantined`; a missing key → `original_missing`; fake clamd answering OK, FOUND, ERROR, garbage, closing early and timing out, and an aborted signal |
| Queue | `work()` passes `retryCount` and `retryLimit` from the job metadata; the `evidence.process` and `evidence.sweep` declarations; the `mail.send` handler tests green unchanged |
| Repository (`*.int.test.ts`) | two concurrent intakes at 9 items leave exactly 10; compare-and-set refuses a stale transition; `countPublic` ignores every non-public state; the sweep's selection skips locked rows; the worker column list excludes `original_filename_enc` and `uploaded_by_account_id`; the outbox payload has exactly three keys |
| Application | intake happy path; each refusal (signed out, unconfirmed, another account's review, unpublished review, type, 15 MB + 1 byte, eleventh file, a seventh 15 MB file past 100 MB); pre-check refusals with no `putQuarantined` call; idempotent repeat with no write; the retry of the tenth upload answers that item; the 31st upload in an hour `rate_limited`; list and remove by the author on an unpublished review; remove by another account `not_found`; one audit assertion on remove |
| Processor and sweep | clean, infected, malformed, unavailable with attempts left (throws, unchanged), unavailable on the last attempt (no throw), retry finding `validating`, retry finding `scanning`, missing original, unexpected error on and before the last attempt, a budget abort, past the deadline; the sweep's reasons, younger and final items left alone, file deleted, a race lost to a removal |
| Worker | malformed envelope finishes; attempt mapping; `RELAY['evidence.stateChanged']` equals `[]`; both registry entries; the attempt passed through `main.ts`; one handler integration run ending `preview_ready` |
| Web | every upload outcome row (200, 400 ×5, 401, 403, 404, 429, 500) with the key deleted on every refusal and on a throw; the web container's evidence deps hold no `readQuarantined`; list `null` for a non-author; remove calls `revalidatePath`; the route integration test (quarantined row, one file, one outbox row; repeat key; another account 404) |
| Components (`en` and `bn`) | `EvidenceNote` with 0 (No documents) and 3; `EvidenceSection` shows only the note, nothing for unpublished; `AuthorEvidence` nothing for a non-author; `EvidenceFileRow` in each status with and without a name, reason and Remove for `rejected` and `failed`; `EvidenceUploader` disabled at 10 counting and enabled when one is `failed`, refused type, too large, rate-limit message; no `ev.*` or `evidence.*` value says "verified" or "approved", "যাচাইকৃত" or "অনুমোদিত" |
| Smoke | module: intake a PNG, process with the fake scanner, the public count becomes 1; route: upload a PNG, see it quarantined, process it, see the count 1 |
| Adversarial (separate agent, 3–5) | A1 disguised, truncated and polyglot files never counted; A2 16 MB, eleventh (also concurrent) and past-100-MB refused; A3 another account's review or item 404 with nothing changed; A4 `../` in a key or name stays inside the root; A5 scanner down ends `failed`/`scanner_unavailable` and never counted, no route returns an original, the sweep ends an item after a kill on the last attempt |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls. Nothing in `apps/*` imports from `test-support`; `domain` imports nothing, so domain tests build image bytes with a local helper in `packages/domain/src/evidence/`.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U48 the packages that move are `domain`, `contracts`, `application`, `adapters`, `database`, `test-support`, `apps/web` and `apps/worker`; each must stay at or above 80% and the floor is never lowered to pass (D10). `domain`, `application` and `adapters` get their first evidence source here, so the new files are measured from this Unit on. Record the before (Step 1) and after (Step 47) figures in `code-summary.md`.

## Mocking and test data

- Application ports: the `test-support` fakes and builders (`fakes/storage.ts` writer and reader, `fakes/scanner.ts`, `fakes/evidence-repository.ts`, `builders/evidence.ts` with `imageBytes`), never hand-written fixture objects. In `apps/web` tests use the existing helpers that wrap them (`components/patient/evidence/evidence-test-support.ts`, `server/request-context-test-support.ts`), because nothing in `apps/*` may import `test-support` directly.
- Scanner: the fake scanner everywhere except the adapter's own test (a fake clamd socket) and the one live check in Step 48 against the compose ClamAV. The EICAR string is the only "malware" body used.
- Storage: a temp dir per test file, removed in `afterAll`; never the shared storage root.
- Server components and the route: mock `@/server/container` evidence calls or `@/server/actions/evidence`, as the page tests on `main` already do.
- Data: synthetic only. Every account uses `example.test`, every name and file name is invented, every image is generated or taken from `packages/test-support/fixtures/`, and no real person, facility or document appears anywhere.
