# T-410 — Account data export and orchestrated deletion

| Field | Value |
|---|---|
| Story | STORY-USER-002 (data half), STORY-REV-003 (deletion effects), STORY-EVID-003 (hold interaction) |
| Phase / Lane | 4 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: the other vendor's top tier + human approval |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 5–6 h agent; validation 2 h |
| Depends on | T-309 (holds, retention), T-401 (comments/reactions/blocks), T-302 (tombstone/delete), T-305 (artifacts, `evidence.remove`), T-104 (persona links), T-103 (stepUp), T-405 (notifications/mail), T-204 (directory de-identify command, FD-069), T-404 (moderation de-identify command, FD-069), T-205 (search module the search participant calls), T-009 |
| Parallel-safe with | T-406–T-409 (T-409 calls your actions; publish the action signatures in your first commit), T-501 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-041** (round 5, restated by FD-074) — The worker role gets no access to `auth_users`: no `DELETE`, no `SELECT`. Step 2 no longer grants the worker `DELETE` on `auth_users`. How the auth user is removed (for example a web-tier step, or another mechanism that keeps the worker boundary) is an open point for Contract Design and this Unit's design. Changes: step 2, Threat notes, a new acceptance row.
- **FD-052** — `dataRequest.created` is routed by the request's kind: an export request queues `data.export` only and a delete request `data.delete` only (`ISS-188`; today the relay queues both). T-410 changes that one entry of the relay's event → job map. Changes: Owned paths, steps 4 and 6, a new acceptance row.
- **FD-069** — Account deletion keeps and de-identifies the provider submissions, claims and field changes the account made, and the reports and appeals it filed; legal holds still apply (FD-021). T-410 adds a Directory and a Moderation participant (`packages/application/src/modules/directory/deletion-participant.ts` and `.../moderation/deletion-participant.ts`) that call the de-identify commands built by T-204 and T-404. Changes: Depends on, Read first, Owned paths (nine participant files, not seven), Not in scope, steps 1–3, new acceptance rows.
- **FD-070** — The worker sends no email. The `dataRequest.ready` and `dataRequest.completed` events create in-app items only; any export-ready or deletion email is queued from the web tier or dropped, as decided in Contract Design. Changes: steps 4 and 7, a new acceptance row.
- **ADR-006** (Domain Design) — T-410 builds each module's owner-scoped export query (`queries/for-export.ts`) and its participant file. The modules' own Units build the delete or de-identify commands those files call; for directory and moderation these are T-204 and T-404. Changes: Owned paths, Not in scope, step 4.

## Goal

Implement the data-requests module: an export job that packs only the requesting account's own data (derivatives, never originals) into a private zip with a 7-day download window, and an orchestrated, idempotent, inspectable deletion plan in which each owning module declares and executes its own action, holds are respected, discussion context is preserved by tombstones, public snapshots are de-identified, and the account ends `deleted` with sessions revoked.

## Read first

1. `docs/implementation/01-conventions.md` §3–§5, §11
2. `docs/implementation/02-data-model.md` §0 (`deletion_action`, `data_request_*`), §14, §3 (`persona_links`), §7 (`legal_holds`, artifacts), §17 (account + publication machines)
3. `docs/implementation/03-routes-and-contracts.md` §1 (`/api/data-requests/{id}/download`), §3 (`Storage`, `Crypto`, `JobQueue`), §4 "data-requests", §5 (`dataRequest.created`, jobs `data.export`, `data.delete`)
4. `ARCHITECTURE-SPINE.md` AD-7, AD-13, AD-17; `docs/architecture/decisions/0013-orchestrate-deletion-across-owning-modules.md`; `docs/planning/01-requirement-baseline.md` "Accounts and identity" (deletion de-identifies retained public contributions subject to retention/legal holds)
5. Prototype: `app.js` 2652–2660 (`#user-data-export`/`#user-data-delete` open a sheet with `user2.dataExportNote`/`user2.dataDeleteNote`) and the `RK.strings` `user2.data*` keys; `docs/implementation/05-demo-storyboard.md` step 26 (second half)
6. `docs/design/auth-screens-spec.md` §4.4 (step-up reused on the patient side)
7. `docs/status/decision-log.md` FD-041, FD-052, FD-069, FD-070; ADR-006, ADR-012 and ADR-013 in `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/domain-design/decisions.md`, and the "Worker boundary versus data.delete" open point at the end of `.../domain-design/components.md`
8. `docs/implementation/tasks/T-204-provider-submission-claim-field-change.md` and `T-404-moderation-module.md` (the de-identify commands your directory and moderation participants call, FD-069); `docs/implementation/02-data-model.md` §4 (`profile_submissions`, `profile_claims`, `profile_field_changes`) and §9 (`reports`, `appeals`)

## Owned paths

- `packages/domain/src/data-requests/` (`deletion-plan.ts` — plan shape + ordering + idempotent step semantics; `export-manifest.ts`; tests)
- `packages/application/src/modules/data-requests/**` (`commands/request-export.ts`, `request-deletion.ts`, `queries/status.ts`, `internal/run-export.ts`, `internal/run-deletion.ts`, `participants.ts` — the `DeletionParticipant` interface + registry, `authorization.ts`)
- `packages/application/src/modules/<account|identity|review|community|evidence|notification|search|directory|moderation>/deletion-participant.ts` — one file per module implementing `DeletionParticipant` (each is a thin file calling that module's own commands; for `directory` and `moderation` these are the de-identify commands built by T-204 and T-404, FD-069). Together with the export queries below, these nine participant files are all you own inside other modules; you must not change anything else there (ADR-006)
- `packages/application/src/modules/<m>/queries/for-export.ts` — each module's owner-scoped, read-only export query (ADR-006; see step 4)
- the `dataRequest.created` entry of the relay's event → job map (one hunk in `apps/worker/src/handlers/outbox-relay.ts`, or wherever the worker composition root keeps that map), so the event is routed by kind (FD-052, `ISS-188`)
- `packages/application/src/ports/repositories/data-requests.ts`
- `packages/contracts/src/schemas/data-requests.ts`, `view-models/data-request.ts` (`DataRequestVM`, `DeletionPlanVM`)
- `packages/database/src/repositories/data-requests.ts`
- `apps/worker/src/handlers/data-export.ts`, `data-delete.ts`
- `apps/web/src/app/api/data-requests/[id]/download/route.ts`, `apps/web/src/server/actions/data-requests.ts` (`requestExport`, `requestDeletion`, `getDataRequestStatus`), `apps/web/src/components/patient/DeletionPlanSheet.tsx` (T-409 mounts it)
- `packages/test-support/src/fakes/data-requests-repository.ts`, builders
- `packages/i18n/messages/{en,bn}.json` — `user2.plan.*`, `notif.data.*` (coordinate names with T-405's routing table), `errors.dataRequest.*`
- `apps/web/package.json` / `apps/worker/package.json` — add `archiver` (pin the current stable 7.x after checking `dependency-check-log.md`; append an entry)

## Not in scope

The UI panel (T-409), retention expiry job (T-309), the legal-hold commands (T-309 — you only ask the retention module whether a record is held), production backup/restore. The delete or de-identify commands your participant files call: each module's own Unit builds them; for directory and moderation these are T-204 and T-404 (ADR-006, FD-069). Sending email from the worker (FD-070).

## Steps

1. **Domain.** `DeletionPlan = { requestId, accountId, steps: Step[] }`, `Step = { module, action: deletion_action, targetIds: string[], status: 'pending'|'done'|'failed'|'skipped', errorCode?, attempts }`. Fixed module order: `notification → community → directory → moderation → evidence → review → search → identity → account` (directory and moderation de-identification after `community` and before `identity`, so every link from the account to its retained submissions, claims, field changes, reports and appeals is removed before the persona links go (FD-069); search after content so the index removal sees final states; identity de-identification after content so persona snapshots are settled; account last). Pure helpers: `nextPendingStep(plan)`, `markStep(plan, i, result)`, `isComplete(plan)`. `export-manifest.ts`: list of sections and their file names inside the zip.
2. **`DeletionParticipant` interface** (`participants.ts`):
   ```ts
   interface DeletionParticipant {
     module: 'account'|'identity'|'review'|'community'|'evidence'|'notification'|'search'|'directory'|'moderation';  // FD-069
     plan(accountId, ctx): Promise<Step[]>;         // declares actions + target ids; read-only
     execute(step, ctx): Promise<Result<void>>;    // idempotent: re-running a done step is a no-op
   }
   ```
   Registry in the composition roots (web for planning/preview, worker for execution). The worker container must not include the account participant's session/auth adapter beyond the `signOutEverywhere` internal. Better Auth owns `auth_users`, and the worker role has no privilege on it — no `DELETE`, no `SELECT` (FD-041). **Open point (decided in Contract Design and this Unit's design, FD-041):** how the auth user is removed — for example a web-tier step, or another mechanism that keeps the worker boundary; do not grant the worker anything on `auth_users` to solve it, and record the chosen mechanism in the hand-off. The same question applies to the other steps the worker cannot run under its grants (for example `rk_worker` has no privilege on `reports.reporter_account_id`, `02-data-model.md` §16), see the "Worker boundary versus data.delete" open point. The account step sets `account_profiles.deleted_at` and `status = deleted`; keep `display_name` on personas (snapshot), blank it on the profile.
3. **Participant rules** (each `plan()` returns these):
   - `notification`: `delete` all notifications + preferences + email_deliveries for the account.
   - `community`: comments with replies → `tombstone`; comments without replies → `delete`; reactions → `delete`; blocks (both directions) → `delete`; mentions of the account's personas remain (they point at persona snapshots).
   - `evidence`: for each item of the account's reviews: active hold → `retain_under_hold` (skip physical deletion, keep public derivative only if the review is retained as a tombstone? — public derivatives are unpublished with the review; under hold the originals + artifacts stay private) else `delete` originals now and mark `removed` (derivatives go with the review state); custody events kept (append-only, expire with audit retention).
   - `review`: reviews and facility reviews with comments from others → `tombstone` (`deleted_tombstone`, body cleared in the public projection, versions retained for audit retention); without → `delete` (soft `deleted_at`, not restorable — `restore_until = null`); drafts → `delete`.
   - `directory`: `deidentify` — the provider submissions, claims and field changes the account made are kept with the account link removed, through T-204's de-identify command (named in Contract Design); a record under an active legal hold → `retain_under_hold`, left unchanged (FD-069, FD-021).
   - `moderation`: `deidentify` — the reports the account filed lose `reporter_account_id` and the appeals it filed lose `appellant_account_id`; the rows, their cases and counts are kept, through T-404's de-identify command (named in Contract Design); a record under an active legal hold → `retain_under_hold`, left unchanged; the console still reads the reporter as "restricted", never blank (FD-069, FD-021).
   - `search`: `remove` documents for the account's reviews.
   - `identity`: `deidentify` — delete `persona_links` for the account; personas keep their snapshot display names (public context stays coherent); anonymous aliases stay unlinkable by construction; `identity_reveals` rows are append-only and stay.
   - `account`: `delete` — as step 2 (removing the auth user is the open point there, FD-041); revoke all sessions; bookmarks + feedback → delete.
4. **`dataRequest.export`** `{idempotencyKey}`: `requires authenticated`; one open export per account (`conflict` otherwise); insert `data_requests (kind export, status requested)`; outbox `dataRequest.created`, which the relay routes to `data.export` only, by the request's kind (FD-052). Worker `data.export {requestId}`: `running`; gather through each module's **owner-scoped** queries (`review.forAccountPrivate`, `community.byAccountPrivate`, … — read-only queries you add under `packages/application/src/modules/<m>/queries/for-export.ts`, owned by you; T-410 builds each module's export query and its participant file, while the modules' own Units build the delete or de-identify commands those files call — ADR-006) → JSON files per manifest section (`profile.json`, `preferences.json`, `reviews.json` (incl. decrypted drafts), `facility-reviews.json`, `comments.json`, `reactions.json`, `bookmarks.json`, `notifications.json`, `evidence/<itemPublicId>/page-N.png` + `derivative.pdf` — **derivatives only**, `README.txt` in the account's locale explaining contents); zip with `archiver`; `Storage.putDerivative` under `private/exports/<requestId>.zip` (private, not public); `status ready`, `expires_at = now + 7 d`, `result_storage_key`; outbox `dataRequest.ready` → in-app notification only; the worker sends no email, and the export-ready email is dropped or queued from the web tier, as decided in Contract Design (FD-070).
5. **Download route** `GET /api/data-requests/{id}/download`: owner only (`getActor`), `status ready`, not expired → stream from private storage with `Content-Disposition: attachment; filename="rogikotha-export.zip"`; audit `account:<id>` action `export_downloaded`.
6. **`dataRequest.delete`** `{idempotencyKey, password}`: `requires authenticated + stepUp` (the password is verified through `account.stepUp` inside the command if no step-up cookie is present); build the plan by calling every participant's `plan()` (read-only), persist `data_requests (kind delete, status requested, plan)`, return `DeletionPlanVM` (per module: action + counts, hold notes, the tombstone explanation `user2.plan.tombstone`) — the UI shows it and asks for a **second confirmation** (`dataRequest.confirmDelete {requestId}`) which sets `status running`? — simpler: `request-deletion` returns the plan **preview** without persisting; `confirmDelete {idempotencyKey, planHash}` persists + enqueues; if the recomputed plan hash differs → `dataRequest.plan_drift`. Outbox `dataRequest.created`, which the relay routes to `data.delete` only, by the request's kind (FD-052, `ISS-188`). The account is immediately `restricted` (no new content while deletion runs).
7. **Worker `data.delete {requestId}`**: loop `nextPendingStep` → `participant.execute` → persist step status after **each** step (own transaction per step) → on failure record `errorCode`, `attempts++`, stop; job retryLimit 5 with backoff resumes from the first non-done step; on completion `status completed`, outbox `dataRequest.completed` → in-app item only; the worker sends no email (FD-070). Any deletion email (for example "your deletion has started" at plan confirmation) is queued from the web tier or dropped, as decided in Contract Design (FD-070).
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
| FD-069: Plan has directory and moderation steps | application test: an account that made a provider submission, a claim and a field change and filed a report and an appeal | the plan has a `directory` `deidentify` step and a `moderation` `deidentify` step with those target ids, ordered after `community` and before `identity`; `DeletionPlanVM` and `DeletionPlanSheet` show both lines in `en` and `bn` (AC10.3.3) |
| FD-069: Rows kept without an account link | int test after the deletion completes | the account's submissions, claims, field changes, reports and appeals still exist and none holds the account's id; the case tray reads the reporter as "restricted", not blank (AC10.3.3, AC9.1.3) |
| FD-069: Held record untouched | int test: an active legal hold covers one of the account's directory or moderation records (how a hold covers them is decided in Contract Design) | that step reads `retain_under_hold`; the held record is neither de-identified nor deleted; the account's unheld records are de-identified (AC10.3.3) |
| FD-041: No worker access to `auth_users` | int test as `rk_worker` (role privileges and a direct query) | `has_table_privilege('rk_worker', 'auth_users', …)` is false for `SELECT`, `INSERT`, `UPDATE` and `DELETE`, and a direct query is refused; after a completed deletion the account cannot sign in, by the mechanism decided in Contract Design |
| FD-052: Routed by kind | worker relay test | `dataRequest.created` for an export queues only `data.export`; for a deletion only `data.delete` (`ISS-188`) |
| FD-070: No worker email | worker test for `data.export` and `data.delete` to completion | `dataRequest.ready` / `dataRequest.completed` create in-app items only; the handlers insert no `email_deliveries` row and enqueue no `mail.send` |

## Tests to write

Domain: plan ordering (including `directory` and `moderation`, FD-069), `nextPendingStep`, `markStep`; application: each of the nine participants' `plan()` against builders; worker: rows above; route test for download.

## Threat notes

- **Id confusion in export**: every gather query takes `accountId` from the request row, never from input; test that a forged `requestId` of another account 404s.
- **Cascade through a hold**: participants ask the retention module (T-309; its hold query or the `RetentionSubject` port) whether a record is held, at plan and again at execute, and never read `legal_holds` themselves — only the `retention` module reads that table (FD-064). A hold placed between preview and execute → the step re-plans to `retain_under_hold` (do not fail); the directory and moderation de-identify commands (T-204, T-404) are called only for records found not held (ADR-006).
- **Replay**: idempotency key + plan hash; a second `confirmDelete` returns the existing request.
- **Discussion context loss**: tombstone rule tested with replies from other accounts; never hard-delete a comment with replies.
- **Worker credentials**: the worker must not gain `identity.reveal` or auth session powers to run deletion; only the specific grants listed — verify against `02-data-model.md` §16. No grant on `auth_users` is requested (FD-041); a step the worker cannot run under its grants is an open point for Contract Design, not a new grant.
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
