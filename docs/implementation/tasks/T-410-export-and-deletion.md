# T-410 — Account data export and orchestrated deletion

| Field | Value |
|---|---|
| Story | STORY-USER-002 (data half), STORY-REV-003 (deletion effects), STORY-EVID-003 (hold interaction) |
| Phase / Lane | 4 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 5–6 h agent; validation 2 h |
| Depends on | T-309 (holds, retention), T-401 (comments/reactions/blocks), T-302 (tombstone/delete), T-305 (artifacts, `evidence.remove`), T-104 (persona links), T-103 (stepUp), T-405 (notifications/mail), T-009 |
| Parallel-safe with | T-406–T-409 (T-409 calls your actions; publish the action signatures in your first commit), T-501 |

## Goal

Implement the data-requests module: an export job that packs only the requesting account's own data (derivatives, never originals) into a private zip with a 7-day download window, and an orchestrated, idempotent, inspectable deletion plan in which each owning module declares and executes its own action, holds are respected, discussion context is preserved by tombstones, public snapshots are de-identified, and the account ends `deleted` with sessions revoked.

## Read first

1. `docs/implementation/01-conventions.md` §3–§5, §11
2. `docs/implementation/02-data-model.md` §0 (`deletion_action`, `data_request_*`), §14, §3 (`persona_links`), §7 (`legal_holds`, artifacts), §17 (account + publication machines)
3. `docs/implementation/03-routes-and-contracts.md` §1 (`/api/data-requests/{id}/download`), §3 (`Storage`, `Crypto`, `JobQueue`), §4 "data-requests", §5 (`dataRequest.created`, jobs `data.export`, `data.delete`)
4. `ARCHITECTURE-SPINE.md` AD-7, AD-13, AD-17; `docs/architecture/decisions/0013-orchestrate-deletion-across-owning-modules.md`; `docs/planning/01-requirement-baseline.md` "Accounts and identity" (deletion de-identifies retained public contributions subject to retention/legal holds)
5. Prototype: `app.js` 2652–2660 (`#user-data-export`/`#user-data-delete` open a sheet with `user2.dataExportNote`/`user2.dataDeleteNote`) and the `RK.strings` `user2.data*` keys; `docs/implementation/05-demo-storyboard.md` step 26 (second half)
6. `docs/design/auth-screens-spec.md` §4.4 (step-up reused on the patient side)

## Owned paths

- `packages/domain/src/data-requests/` (`deletion-plan.ts` — plan shape + ordering + idempotent step semantics; `export-manifest.ts`; tests)
- `packages/application/src/modules/data-requests/**` (`commands/request-export.ts`, `request-deletion.ts`, `queries/status.ts`, `internal/run-export.ts`, `internal/run-deletion.ts`, `participants.ts` — the `DeletionParticipant` interface + registry, `authorization.ts`)
- `packages/application/src/modules/<account|identity|review|community|evidence|notification|search>/deletion-participant.ts` — one file per module implementing `DeletionParticipant` (each is a thin file calling that module's own commands; you own only these seven files inside other modules and must not change anything else there)
- `packages/application/src/ports/repositories/data-requests.ts`
- `packages/contracts/src/schemas/data-requests.ts`, `view-models/data-request.ts` (`DataRequestVM`, `DeletionPlanVM`)
- `packages/database/src/repositories/data-requests.ts`
- `apps/worker/src/handlers/data-export.ts`, `data-delete.ts`
- `apps/web/src/app/api/data-requests/[id]/download/route.ts`, `apps/web/src/server/actions/data-requests.ts` (`requestExport`, `requestDeletion`, `getDataRequestStatus`), `apps/web/src/components/patient/DeletionPlanSheet.tsx` (T-409 mounts it)
- `packages/test-support/src/fakes/data-requests-repository.ts`, builders
- `packages/i18n/messages/{en,bn}.json` — `user2.plan.*`, `notif.data.*` (coordinate names with T-405's routing table), `errors.dataRequest.*`
- `apps/web/package.json` / `apps/worker/package.json` — add `archiver` (pin the current stable 7.x after checking `dependency-check-log.md`; append an entry)

## Not in scope

The UI panel (T-409), retention expiry job (T-309), the legal-hold commands (T-309 — you only read holds), production backup/restore.

## Steps

1. **Domain.** `DeletionPlan = { requestId, accountId, steps: Step[] }`, `Step = { module, action: deletion_action, targetIds: string[], status: 'pending'|'done'|'failed'|'skipped', errorCode?, attempts }`. Fixed module order: `notification → community → evidence → review → search → identity → account` (search after content so the index removal sees final states; identity de-identification after content so persona snapshots are settled; account last). Pure helpers: `nextPendingStep(plan)`, `markStep(plan, i, result)`, `isComplete(plan)`. `export-manifest.ts`: list of sections and their file names inside the zip.
2. **`DeletionParticipant` interface** (`participants.ts`):
   ```ts
   interface DeletionParticipant {
     module: 'account'|'identity'|'review'|'community'|'evidence'|'notification'|'search';
     plan(accountId, ctx): Promise<Step[]>;         // declares actions + target ids; read-only
     execute(step, ctx): Promise<Result<void>>;    // idempotent: re-running a done step is a no-op
   }
   ```
   Registry in the composition roots (web for planning/preview, worker for execution). The worker container must not include the account participant's session/auth adapter beyond the `signOutEverywhere` internal — `account.execute` marks `status = deleted`, clears `email`? **No**: Better Auth owns `auth_users`; delete the auth user through the account repository's `deleteAuthUser` (worker role needs DELETE on `auth_users` — grant only that; note in hand-off for T-004's roles migration as a follow-up) and set `account_profiles.deleted_at`, `status = deleted`, `display_name = 'Deleted account'`? — keep `display_name` on personas (snapshot), blank it on the profile.
3. **Participant rules** (each `plan()` returns these):
   - `notification`: `delete` all notifications + preferences + email_deliveries for the account.
   - `community`: comments with replies → `tombstone`; comments without replies → `delete`; reactions → `delete`; blocks (both directions) → `delete`; mentions of the account's personas remain (they point at persona snapshots).
   - `evidence`: for each item of the account's reviews: active hold → `retain_under_hold` (skip physical deletion, keep public derivative only if the review is retained as a tombstone? — public derivatives are unpublished with the review; under hold the originals + artifacts stay private) else `delete` originals now and mark `removed` (derivatives go with the review state); custody events kept (append-only, expire with audit retention).
   - `review`: reviews and facility reviews with comments from others → `tombstone` (`deleted_tombstone`, body cleared in the public projection, versions retained for audit retention); without → `delete` (soft `deleted_at`, not restorable — `restore_until = null`); drafts → `delete`.
   - `search`: `remove` documents for the account's reviews.
   - `identity`: `deidentify` — delete `persona_links` for the account; personas keep their snapshot display names (public context stays coherent); anonymous aliases stay unlinkable by construction; `identity_reveals` rows are append-only and stay.
   - `account`: `delete` — as step 2; revoke all sessions; bookmarks + feedback → delete.
4. **`dataRequest.export`** `{idempotencyKey}`: `requires authenticated`; one open export per account (`conflict` otherwise); insert `data_requests (kind export, status requested)`; outbox `dataRequest.created`. Worker `data.export {requestId}`: `running`; gather through each module's **owner-scoped** queries (`review.forAccountPrivate`, `community.byAccountPrivate`, … — read-only queries you add under `packages/application/src/modules/<m>/queries/for-export.ts`, owned by you) → JSON files per manifest section (`profile.json`, `preferences.json`, `reviews.json` (incl. decrypted drafts), `facility-reviews.json`, `comments.json`, `reactions.json`, `bookmarks.json`, `notifications.json`, `evidence/<itemPublicId>/page-N.png` + `derivative.pdf` — **derivatives only**, `README.txt` in the account's locale explaining contents); zip with `archiver`; `Storage.putDerivative` under `private/exports/<requestId>.zip` (private, not public); `status ready`, `expires_at = now + 7 d`, `result_storage_key`; outbox `dataRequest.ready` → notification + email (`deletion`/`security` category, always sent).
5. **Download route** `GET /api/data-requests/{id}/download`: owner only (`getActor`), `status ready`, not expired → stream from private storage with `Content-Disposition: attachment; filename="rogikotha-export.zip"`; audit `account:<id>` action `export_downloaded`.
6. **`dataRequest.delete`** `{idempotencyKey, password}`: `requires authenticated + stepUp` (the password is verified through `account.stepUp` inside the command if no step-up cookie is present); build the plan by calling every participant's `plan()` (read-only), persist `data_requests (kind delete, status requested, plan)`, return `DeletionPlanVM` (per module: action + counts, hold notes, the tombstone explanation `user2.plan.tombstone`) — the UI shows it and asks for a **second confirmation** (`dataRequest.confirmDelete {requestId}`) which sets `status running`? — simpler: `request-deletion` returns the plan **preview** without persisting; `confirmDelete {idempotencyKey, planHash}` persists + enqueues; if the recomputed plan hash differs → `dataRequest.plan_drift`. Outbox `dataRequest.created`. The account is immediately `restricted` (no new content while deletion runs).
7. **Worker `data.delete {requestId}`**: loop `nextPendingStep` → `participant.execute` → persist step status after **each** step (own transaction per step) → on failure record `errorCode`, `attempts++`, stop; job retryLimit 5 with backoff resumes from the first non-done step; on completion `status completed`, outbox `dataRequest.completed` → email to the (now deleted) address is sent **before** the account step deletes the auth user (order the mail send as the account participant's first action) — or send at plan confirmation ("your deletion has started") and skip the completion email; pick the latter and document it (`// ASSUMPTION(T-410)`).
8. **`dataRequest.status`** query → `DataRequestVM { kind, status, requestedAt, completedAt?, expiresAt?, downloadUrl?, plan?: DeletionPlanVM }` for T-409's panel.
9. **`DeletionPlanSheet`** (client): renders the plan preview grouped by module with plain-language lines (`user2.plan.<module>.<action> {count}`), hold notice, `user2.dataDeleteNote`, password field (step-up inline, auth spec §4.4 styling on the patient side), **Delete my account** → `confirmDelete` → `user2.plan.started`.
10. **Tests, i18n, `pnpm check`, hand-off** — include the participant rule table verbatim in "What changed".

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Export scope | worker test with two accounts' data | zip contains only the requester's files; no `original` artifacts; no other users' comments except as `replies_to` ids |
| Download auth | route test | other account → 404; expired → 410; owner → 200 with zip |
| Plan | application test with `shirin_88` fixtures | r1 → `tombstone` (has k8 thread); e1 → `retain_under_hold`; k-comments by shirin with replies → tombstone; bookmarks delete |
| Idempotency | worker test: crash after step 3, rerun | steps 1–3 no-op, 4+ run once; replay of `confirmDelete` with same key → same request |
| Hold respected | int test | held original still on disk after completion; unheld originals gone |
| Public coherence | int test | `/experiences/r1` returns tombstone view; k9 (rafi's reply) still readable under the tombstoned k8; `/authors/shirin_88` shows snapshot name, no accounts |
| Account end state | int test | `status deleted`, sessions revoked, sign-in refused, `persona_links` empty for the account |
| Drift | test | plan hash mismatch → `dataRequest.plan_drift` |

## Tests to write

Domain: plan ordering, `nextPendingStep`, `markStep`; application: each participant's `plan()` against builders; worker: rows above; route test for download.

## Threat notes

- **Id confusion in export**: every gather query takes `accountId` from the request row, never from input; test that a forged `requestId` of another account 404s.
- **Cascade through a hold**: participants read `legal_holds` at plan and again at execute; a hold placed between preview and execute → the evidence step re-plans to `retain_under_hold` (do not fail).
- **Replay**: idempotency key + plan hash; a second `confirmDelete` returns the existing request.
- **Discussion context loss**: tombstone rule tested with replies from other accounts; never hard-delete a comment with replies.
- **Worker credentials**: the worker must not gain `identity.reveal` or auth session powers to run deletion; only the specific grants listed — verify against `02-data-model.md` §16 and record the extra grant needed as a follow-up for the roles migration.
- **Export leakage via logs**: no file names or bodies in logs; storage key opaque.

## Hard-rule checklist

- [ ] Originals never exported; only processed derivatives.
- [ ] Deletion is an inspectable plan; holds pause physical deletion for scoped records only; public hiding decided separately.
- [ ] Tombstones preserve others' discussion; de-identification keeps snapshots coherent; anonymous aliases stay unlinkable.
- [ ] Every step audited (append-only) and idempotent.
- [ ] No sensitive content in notification/email payloads.
- [ ] Both locales; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
