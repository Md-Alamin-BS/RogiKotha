# T-309 — Retention policy, expiry job, legal holds, previewed bulk action, custody log, demo clock

| Field | Value |
|---|---|
| Story | STORY-EVID-003, FR-FILE-007/008, FR-EVD-005–007, FD-004/005/020/021 |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 5–6 h agent; validation 2 h |
| Depends on | T-304 (artifacts, custody), T-105 (config versions, `config.write` capability, step-up), T-302 (`review.delete` path, FD-073), T-401 (`comment.delete` path, FD-073), T-405 (`notification.expire`, through T-401) |
| Parallel-safe with | T-306, T-307, T-308 (not T-401: this task depends on it, FD-073) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-064** — The `retention` module owns `retention_policies`, `legal_holds` and `retention_bulk_actions` (ownership only; the tables do not change). Evidence, review and community call it to check holds and expiry, and its expiry job changes other modules' rows only through their own commands (ADR-002). Changes Read first, Step 6 and Acceptance checks.
- **FD-068** — `retention_policies` is the only source of the original, audit and notification retention periods. The retention block in the runtime configuration is a read-only mirror or is dropped, decided in Contract Design; `config.apply` never sets the policy. Changes Read first, Step 1 (no edit in T-105's command any more) and Acceptance checks.
- **FD-073** — This task also builds the `RetentionSubject` implementations for reviews and comments (holds pause their deletion, FR86, FD-021, not only evidence) and wires the hold check into the `review.delete` (T-302) and `comment.delete` (T-401) paths. Changes Depends on, Parallel-safe with, Owned paths, Step 5a (new), Tests to write and Acceptance checks.

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-088 — bulk retention deferred** — `retention.previewBulk`, `retention.executeBulk`, step 4, the `retention_changed` custody event and migration, the `retention_bulk_actions` use, the `bulk` tests and the staff controls for them are **Not in scope (FD-088)**. They become follow-up tasks after release 1. Everything else stays: `retention.setPolicy`, `retention.currentPolicy`, holds, the expiry job, the custody log, the quarantine list and the demo clock. Their acceptance rows are marked "deferred, FD-088" below, not deleted.
- **FD-079 / C3 — `HoldTargetKind`** — The hold target kinds are `review | facility_review | comment | evidence | profile | account`, a separate enum in `packages/contracts` and in the database, so report targets do not gain `account`. A forward-only migration adds `facility_review`, `profile` and `account` to the hold target enum. Per-row holds on reports, appeals, submissions, claims and field changes are not added.
- **FD-079 / C3 — rules** — An active account hold pauses the whole account deletion, including the Directory and Moderation de-identify steps (T-410 applies this); under an account hold the account still closes at once (sessions revoked, sign-in refused) while its data is kept (owner, 2026-10-27). An author's delete of a held review or comment behaves exactly as an unheld delete for the author: gone from every public view and from the author's list, the author is never told, and the data stays until the hold ends, then the normal deletion runs. A held review or comment keeps its author's persona link through account deletion until the hold ends. This settles step 5a's open point: the delete is not refused with `hold.active`.
- **FD-079 (owner, 2026-10-27) — finishing held deletion when a hold ends** — A narrow `SECURITY DEFINER` database function (forward-only migration in this task) deletes the persona links of given personas whose owning account is deleted and that no active hold keeps, without letting the worker read `persona_links`; `EXECUTE` is granted to `rk_worker` and nothing else on `persona_links`. The hourly `retention.expire` job runs it, and the held review and comment deletion steps (the worker entries of `review.deletionStep` and `community.deletionStep`), when a hold ends by `hold.release` or by `expires_at` passing. The pattern is the one `fn_expire_audit` already uses. Changes: Owned paths, step 6 and new acceptance rows.
- **C3 — operations** — `retention.currentPolicy` returns `{version, originalDays, auditDays, notificationDays, effectiveFrom}`. `retention.activeHold {targetKind, targetId}` (kind: query, internal) returns `{holdId} | null`; active means `released_at` is null and (`expires_at` is null or later than now). `retention.activeHoldsFor {targets: [{targetKind, targetId}], accountId}` (internal; caller T-410) returns `{accountHold: holdId | null, held: [{targetKind, targetId, holdId}]}`. `RetentionSubject` (kinds `evidence | review | comment`): `expire?(tx, {now, policy})`, `onHoldChanged?(tx, {targetId, holdId, placed})` for evidence custody, and the evidence-only deadline-change methods (deferred with the bulk action, FD-088).
- **C1 / C3 — `audit.expire`** — T-309 builds the internal command `audit.expire {before: Date, keepTargets: [{targetKind, targetId}]}` returning `{expired: int}` in `modules/administration`. `fn_expire_audit` gains a held-targets parameter (AC7.3.5), runs under `rk_maintenance`, and `retention.expire` calls it with `before = now - auditDays` and the held targets.
- **C2 / C3 — `notification.expire`** — `retention.expire` calls T-405's `notification.expire {before: now - notificationDays}`, which deletes by `created_at`; `notifications.expires_at` is not read (FD-068).
- **FD-090 — draft expiry** — Drafts expire after 30 days and `retention.expire` warns 4 days before and purges expired drafts. Review's `RetentionSubject.expire` worker entry does this through the narrow worker grant on `review_drafts` (`SELECT (id, account_id, expires_at)`, `DELETE`) that T-301 adds; this needs its own decision entry, which the orchestrator adds as FD-090, before the grant is applied. The warning is the outbox event `draft.expiring {draftId, accountId, days}` that T-405 routes to an in-app notice; the worker cannot update a draft, so the once-only guard comes from existing tables and is settled in Functional Design. Changes: step 6(d) and new acceptance rows.

## Goal

Make time and deletion accountable: versioned retention policy (90-day originals, 180-day audit,
90-day notifications) that applies only to future records; an hourly `retention.expire` job driven
by the `Clock` port; per-record legal holds that pause scheduled deletion for that record only, for evidence, reviews and comments (FD-073); a
retroactive bulk change that must be previewed, is idempotent and detects drift (deferred after release 1, FD-088); a custody log query
for the staff console; and the demo clock (`demo_clock` + `/api/demo/clock` + `pnpm demo:clock`) so
all of this can be shown in minutes.

## Read first

1. `docs/implementation/01-conventions.md` §3, §4 (Time — all "now" from `Clock`), §5, §11
2. `docs/implementation/02-data-model.md` §7 (`legal_holds`, `retention_policies`, `retention_bulk_actions`, `evidence_items.retention_expires_at/hold_id`, `custody_event`; §7 lists the first three under Evidence, but the `retention` module owns them, FD-064), §10 (append-only + `fn_expire_audit`), §11 (`config_versions.values.retention` — dropped from the runtime configuration, FD-082; `retention_policies` is the only source of the periods, FD-068 — see step 1), §12 (`notifications.expires_at`), §15 (`demo_clock`), §16 (`rk_maintenance`)
3. `docs/implementation/03-routes-and-contracts.md` §1 (`/api/demo/clock`), §3 (`Clock`), §4 "evidence" (`retention.*`, `hold.*`, job `retention.expire` — listed under evidence, owned by the `retention` module, FD-064), §5 (`hold.changed`, `retention.policyChanged`)
4. `docs/architecture/ARCHITECTURE-SPINE.md` AD-7, AD-14; `docs/planning/05-recommended-architecture.md` "Storage, jobs, and retention"; `docs/status/decision-log.md` FD-004, FD-005, FD-020, FD-021
5. `docs/implementation/05-demo-storyboard.md` Part 5 step 22 (hold on e1, clock +91 d, e3 expires, e1 does not, release)
6. Prototype: `admin/app.js` `renderEvidence` 413–450 (stages table, `admin.retention`, `admin.legalHold`, `admin.legalHoldNote`, `admin.failClosed*`, `admin.textStays` copy) and `rogikotha-data.js` `moderation.quarantine` fixtures + `moderation.thresholds.retentionDefaultDays/retentionMaxDays` — T-407 renders; this task provides the data
7. T-304's custody writer and T-305's `evidence.publish` (sets `retention_expires_at` — you replace its config fallback with `retention.currentPolicy`)

## Owned paths

- `packages/domain/src/retention/**` (`policy.ts`, `hold.ts`, `expiry.ts`, tests)
- `packages/application/src/modules/retention/**` (`commands/{set-policy,place-hold,release-hold}.ts` (`preview-bulk.ts` and `execute-bulk.ts` are not built, FD-088), `queries/{current-policy,active-hold,active-holds-for,custody-log,list-holds,list-quarantine}.ts`, `jobs/expire.ts`, `authorization.ts`, tests)
- `packages/application/src/ports/repositories/retention.ts`, `ports/clock.ts` (extend with `offsetSeconds()` for the demo)
- `packages/adapters/src/clock/**` (system clock + demo offset from `demo_clock` via a `DemoClockStore` port implemented in `database`)
- `packages/database/src/repositories/retention.ts`, `repositories/demo-clock.ts`, migrations: `fn_expire_audit` grants check, `demo_clock` table guarded by `APP_MODE`
- `apps/worker/src/handlers/retention-expire.ts` (pg-boss `schedule('retention.expire', '0 * * * *')`)
- `apps/web/src/app/api/demo/clock/route.ts`, `apps/web/src/server/actions/retention.ts` (`setPolicy`, `placeHold`, `releaseHold`, `custodyLog`, `listQuarantine` — for T-407; `previewBulk` and `executeBulk` deferred, FD-088)
- `scripts/demo-clock.ts` (`pnpm demo:clock -- +91d | reset | now`), `package.json` script entries
- `packages/contracts/src/schemas/retention.ts` (including the `HoldTargetKind` enum, FD-079), `view-models/quarantine.ts` (`QuarantineVM`, `CustodyLogVM`, `HoldVM`; `BulkPreviewVM` deferred, FD-088)
- `packages/application/src/modules/administration/commands/audit-expire.ts` (`audit.expire`, C1) and `packages/application/src/modules/review/retention-subject.ts` (the `expire` worker entry also purges drafts, FD-090)
- `packages/database/src/migrations/*_hold_target_kinds.sql` (FD-079), `*_fn_expire_audit_held_targets.sql` (C1) and `*_fn_delete_held_persona_links.sql` (the `SECURITY DEFINER` function and its `EXECUTE` grant to `rk_worker`, FD-079), all forward-only; the grant is also noted in `02-data-model.md` §16
- `packages/test-support/src/fakes/{retention-repository,demo-clock-store}.ts`, `fakes/clock.ts`
- `packages/i18n/messages/{en,bn}.json` — `errors.retention.previewDrift`, `errors.hold.active`, `errors.retention.outOfRange`, `notif.staff.holdPlaced|holdReleased|bulkExecuted`, `custody.<event>` labels for every `custody_event` value (both languages)
- Review and comment hold checks (FD-073), and nothing else inside those modules:
  - `packages/application/src/modules/review/retention-subject.ts` (+ `retention-subject.test.ts`) — `RetentionSubject` for reviews
  - `packages/application/src/modules/community/retention-subject.ts` (+ `retention-subject.test.ts`) — `RetentionSubject` for comments
  - `packages/application/src/modules/review/commands/delete.ts` (T-302) — only the hold-check call and its dependency, plus the hold cases added to `delete.test.ts`
  - the `comment.delete` command file in `packages/application/src/modules/community/commands/` (T-401, file name as T-401 created it) — only the hold-check call and its dependency, plus the hold cases added to its test
  - `apps/web/src/server/container.ts` and the worker's composition root — only the lines that wire the two `RetentionSubject` implementations, if the port is wired there

## Not in scope

The staff UI (T-407), account deletion orchestration (T-410 consumes `hold` checks and `retention` commands), config UI (T-408), notifications delivery (T-405).

## Steps

1. **Policy model** `policy.ts`: `RetentionPolicy {version, originalDays, auditDays, notificationDays, effectiveFrom}`; **relationship to config**: `retention_policies` is the only source of the original, audit and notification periods (FD-068). The console changes them only through `retention.setPolicy`; `config.apply` (T-105) never sets the policy, and this task makes no edit in T-105's command (FD-068). The retention block no longer exists in `config_versions.values` (dropped, FD-082, FD-068); no code reads a period from the configuration. `retention.currentPolicy()` returns the highest version with `effective_from <= clock.now()`.
2. **Prospective rule** (FD-020): `setPolicy` inserts a new version; **no existing `retention_expires_at` changes**. Enforce with a repository test that counts changed rows (must be 0) and a domain function `expiryFor(publishedAt, policy)` used only at publish time (T-305) and by `executeBulk`.
3. **`retention.setPolicy {originalDays, auditDays, notificationDays, reason}`** · `config.write` + `stepUp` · ranges: originals 1–3650, audit 30–3650, notifications 7–365 (`retention.out_of_range`) · audit stream `retention` · outbox `retention.policyChanged` · staff notification `security`? no — audit only.
4. **Deferred, not built in release 1 (FD-088).** Bulk (FD-020): `retention.previewBulk {fromDays, toDays}` → computes the affected set = published items whose `retention_expires_at` was derived under the old default (`retention_expires_at − published_at == fromDays`) and are not held; returns `{count, sampleIds (≤ 20 public ids), fromDays, toDays, previewToken}` where `previewToken = HMAC(sorted affected ids + toDays, APP_SECRET)` with a 15-minute expiry; inserts `retention_bulk_actions {preview, previewed_at}`. `retention.executeBulk {previewToken, reason, idempotencyKey}` · `retention.bulk` + `stepUp` · recomputes the set; if its hash ≠ token → `retention.preview_drift` with the new count (no change applied); else updates `retention_expires_at = published_at + toDays` for those ids in one transaction, writes `executed_at`, `affected_ids`, custody `hold_placed`? no — custody event `retention_changed`? The enum lacks it: **add `retention_changed` to `custody_event`** via migration and to `02-data-model.md` (record in hand-off as a spine doc change), audit stream `retention`, staff notification `bulkExecuted`. Replay with the same `idempotencyKey` → the earlier result.
5. **Holds (FD-021)**: `hold.place {targetKind ∈ review|facility_review|comment|evidence|profile|account (`HoldTargetKind`, FD-079), targetId, reason ≥ 10 chars, expiresAt?}` · `holds.manage` · one active hold per target (`hold.active` on duplicate) · sets `evidence_items.hold_id` when target is evidence · custody `hold_placed {holdId}` · audit · outbox `hold.changed`; `hold.release {holdId, reason}` · same capability · `released_at/by` · clears `hold_id` · custody `hold_released`. Holds do **not** change visibility (AD-17): a held item that is `removed` stays removed; only physical deletion is paused. `listHolds` query for T-407/T-410.
5a. **Review and comment hold checks (FD-073)**: implement Retention's `RetentionSubject` port for reviews (`modules/review/retention-subject.ts`) and for comments (`modules/community/retention-subject.ts`); these are the "is this record held?" checks of ADR-002 and FD-064 for `targetKind review|comment`, and evidence keeps its own check through `hold_id`. Only the `retention` module reads `legal_holds` (FD-064); the port signature is pinned in Contract Design (FD-067). Call the check from `review.delete` (T-302) and `comment.delete` (T-401), and from any expiry step that removes review or comment data. While a hold is active nothing of the held record is physically removed or cleared (row, text, versions, audit stream), for the author's delete and for expiry alike (FD-021, FD-073). The author's delete of a held record is not refused: it removes the record from every public view and the author's list exactly as an unheld delete does, the author is never told of the hold, and the stored data stays until the hold ends (FD-079, Q9). A held review or comment also keeps its author's persona link through account deletion until the hold ends (Q17). After release the record follows its ordinary rules again. Change nothing else in the review and community modules.
6. **Expiry job** `jobs/expire.ts` (runs in the worker hourly and on demand via `pnpm demo:clock` which enqueues it once): with `now = clock.now()`: (a) originals: items `state = published AND retention_expires_at <= now AND hold_id IS NULL` (and holds that have `expires_at <= now` are auto-released first with custody `hold_released {auto: true}`) → delete the `original` artifact bytes via `Storage.delete(key, {reason: 'retention'})`, mark the artifact row `bytes = 0, storage_key = null`? — keep the row for custody (hash stays), set `deleted_at` on it (add nullable column), state → `original_expired`, custody `original_expired`; (b) audit: `fn_expire_audit(now − auditDays)` via `rk_maintenance` connection (`DATABASE_URL_MAINTENANCE`), except streams referenced by an active hold (`target_kind/id` match) — implement inside the SQL function with a `NOT EXISTS (legal_holds active)` clause; (c) notifications older than `now − notificationDays` deleted through T-405's `notification.expire {before}` (by `created_at`, not `expires_at`, FD-068); (d) drafts: warn 4 days before `expires_at` and delete drafts past `expires_at` through Review's `RetentionSubject.expire` worker entry and the narrow `review_drafts` grant (FD-090); (e) held deletion that waits on a hold: for each hold that ended since the last run (`hold.release`, or `expires_at` passed), run the held items' normal deletion through the review and community deletion-step worker entries and call the narrow persona-link function (FD-079). Audit expiry (b) goes through `audit.expire {before, keepTargets}` with the held targets (C1). Each sub-step idempotent and separately logged (`event: retention.expire.step, counts`). Job options: `singletonKey: 'retention.expire'`, `retryLimit: 1`. The job changes rows owned by other modules (evidence originals, audit rows, notifications, drafts) only through those modules' own commands, passing the cutoff they need, and reads periods only from `retention.currentPolicy()` (FD-064, FD-068, ADR-002); the command names are named in Contract Design.
7. **Custody log query** `retention.custodyLog {itemId}` · staff (`reports.read`) → events with `custody.<event>` label keys, actor opaque, details allowlisted; and `retention.listQuarantine {page, state?}` → `QuarantineVM` rows: item public id, `state`, stage flags derived from custody events (`received/validated/scanned/sanitised/preview/published` → the prototype's `stages` object), `bytes`, `retention_expires_at`, `hold` summary, `failReason`, **no filename** (the prototype showed `IMG_2291.heic`; the product shows `<publicId>.<ext>` from `detected_mime` — record as `// ASSUMPTION(T-309)`).
8. **Demo clock**: `Clock` adapter = `Date.now() + offsetSeconds` where `offsetSeconds` is read from `demo_clock` (cached 2 s) only when `APP_MODE ∈ {development, demo}`; in `production` the table is absent and the adapter ignores the store (assert at boot: `APP_MODE=production && demo_clock exists` → refuse to start, AD-14). `/api/demo/clock` GET → `{now, offsetSeconds}`; POST `{offsetSeconds | advance: '91d'}` → requires `APP_MODE != production` **and** a staff session (any role) → updates the row, enqueues `retention.expire` once, audit stream `retention` action `demo_clock_set`. `scripts/demo-clock.ts` calls the same repository directly (no HTTP) and prints the new "now"; `reset` sets 0. `pnpm demo:reset` (T-504) will call `reset`.
9. Wire `evidence.publish` (T-305) to `retention.currentPolicy().originalDays` (remove its config fallback; one-line edit, list it).
10. Strings both locales (all `custody.*` labels); migrations; `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Prospective only | `pnpm --filter @rk/application test set-policy` | after `setPolicy(originalDays: 30)`, existing items keep their `retention_expires_at`; a newly published item gets +30 d |
| Preview → execute | deferred, FD-088 | not run in release 1 (bulk preview/execute is a follow-up task) |
| Drift | deferred, FD-088 | not run in release 1 |
| Hold blocks expiry | `… test expire` | `FakeClock +91 d`: e3 → `original_expired`, storage delete called once; e1 (held) unchanged; release hold, run again → e1 expires |
| Hold auto-release | same | hold with `expiresAt` in the past is released with custody `hold_released {auto:true}` before expiry runs |
| Hold ≠ visibility | same | `evidence.remove` on a held item still sets `removed`; expiry still skips its original |
| Audit expiry respects holds | `pnpm --filter @rk/database test retention.int` | `fn_expire_audit` deletes old rows except those whose `target` has an active hold; run as `rk_maintenance`; `rk_app` cannot execute it |
| Append-only untouched | same | `UPDATE evidence_custody_events` → `append_only_violation` |
| Demo clock | `pnpm --filter @rk/web test demo-clock.route` + `pnpm demo:clock -- +91d` | GET reflects offset; POST without staff session → 404; with `APP_MODE=production` the route returns 404 and the boot assertion throws when the table exists |
| Custody VM | `… test custody-log` | labels resolve in both locales; no `storage_key`, no filename |
| FD-073: held review not deleted (AC7.3.5, AC10.3.3) | `pnpm --filter @rk/application test retention-subject` + `… test delete` (review) | with an active hold on synthetic review r1: the author's `review.delete` and an expiry run with `FakeClock` past its deletion date keep r1's row, title, body, sections, versions and audit stream in storage, with nothing removed or cleared (whether the delete is refused or only hides r1 publicly follows Contract Design); the hold's actor, reason, creation time and expiry are logged; an unheld review r2 deletes as before |
| FD-073: held comment not deleted (AC7.3.5, AC10.3.3) | `… test retention-subject` + the community `comment.delete` test | with an active hold on synthetic comment k8 (it has reply k9): the author's `comment.delete` and an expiry run past its deletion date keep k8's row and its body text in storage, with nothing removed or cleared (whether the delete is refused or only shows a tombstone publicly follows Contract Design); an unheld comment k10 deletes as before |
| FD-073: release restores normal deletion (AC7.3.6) | same | after `hold.release` (and after an auto-release by `expiresAt`), the author's delete of r1 sets `deleted_at`/tombstone as in T-302, the delete of k8 becomes a tombstone with its body cleared as in T-401, and the next expiry run treats both as unheld; the release is logged |
| FD-068: one source of retention periods (AC7.3.2) | `… test set-policy` | proposing a config with a `retention` key is rejected as unknown (FD-082) and leaves `retention.currentPolicy()` at the same version and values; only `retention.setPolicy` inserts a `retention_policies` row; `evidence.publish` takes `originalDays` from `retention.currentPolicy()` |
| FD-064: retention owns holds and policies | `pnpm lint` + `pnpm --filter @rk/application test retention` | no module other than `retention` imports the retention repository or reads `legal_holds`, `retention_policies` or `retention_bulk_actions`; evidence, review and community reach holds only through the retention module's query or the `RetentionSubject` port |
| FD-079: hold target kinds (C3) | `pnpm --filter @rk/application test holds` and a database test | `hold.place` accepts `review`, `facility_review`, `comment`, `evidence`, `profile` and `account`; `report` as a target is rejected; the report-target enum has no `account` value |
| FD-079: author delete of a held item (C3, Q9) | `… test delete` (review) and the community `comment.delete` test with an active hold | the result, the public views and the author's list are identical to an unheld delete; no field, message or notice mentions a hold; the stored row, text and versions stay |
| FD-079: held persona link survives account deletion (Q17) | database test: delete the account of a held review's author through the web deletion step | the held review's persona link remains; links of unheld personas are gone |
| FD-079: hold end finishes deletion (owner answer, C3) | integration test as `rk_worker`: release the hold (then repeat with `expires_at` passing) and run `retention.expire` | the held review is tombstoned or soft-deleted by the normal rule, its persona link is deleted by the narrow function, and a second run changes nothing; `select * from persona_links` as `rk_worker` is still denied and only `EXECUTE` on the function is granted |
| FD-079: function is narrow | call the function as `rk_worker` with an unheld persona of a live account and with a persona whose review is still held | it deletes nothing in both cases |
| FD-079: account hold keeps data (owner answer) | with an active account hold, run the web deletion and `retention.expire` | covered with T-410: sessions revoked and sign-in refused at once; no account, identity, directory or moderation data is changed or deleted until the hold ends |
| C3: `activeHold` and `activeHoldsFor` | `… test holds` | an expired or released hold returns `null`; `activeHoldsFor` returns `accountHold` when an account hold exists and each held target with its `holdId` |
| C1: `audit.expire` keeps held targets | `pnpm --filter @rk/database test retention.int` as `rk_maintenance` | `audit.expire {before, keepTargets}` returns `{expired: n}` and leaves rows whose `targetKind/targetId` is listed; `rk_app` and `rk_worker` cannot execute `fn_expire_audit` |
| C2: notifications expire by `created_at` | `… test expire` with `FakeClock +91 d` and a notification whose `expires_at` is far in the future but `created_at` is older than `notificationDays` | `notification.expire` removes it; one younger than the cutoff stays |
| FD-090: draft purge and warning | `… test expire` with `FakeClock`: a draft expiring in 3 days, one expired yesterday, one expiring in 20 days | exactly one `draft.expiring` event and notice for the first draft even after 24 hourly runs; the expired draft is deleted through the narrow grant; the third is untouched; the job never reads `payload_enc` |
| FD-088: bulk not built | list the files this task adds | no `preview-bulk`, `execute-bulk`, `BulkPreviewVM` or `retention_changed` migration exists; `hold.*`, `setPolicy` and the expiry job work without them |
| Tree | `pnpm check` | green |

## Tests to write

- `policy.test.ts`, `expiry.test.ts` (domain): `expiryFor`, `isExpired(now)`, hold precedence.
- `set-policy.test.ts`, `holds.test.ts` (`bulk.test.ts` deferred, FD-088), `expire.test.ts`, `custody-log.test.ts`, `list-quarantine.test.ts` (application; `FakeClock`, `FakeStorage`, audit + outbox assertions).
- `retention.int.test.ts` (database): `fn_expire_audit` grants + hold clause; `demo_clock` presence by `APP_MODE`.
- `review/retention-subject.test.ts`, `community/retention-subject.test.ts` (held, unheld, released, auto-released by `expiresAt`), and hold cases added to the `review.delete` and `comment.delete` tests (FD-073).
- A policy-source test: only `retention.setPolicy` inserts into `retention_policies`, and `config.apply` leaves `retention.currentPolicy()` unchanged (FD-068).
- `demo-clock.route.test.ts` (web); `clock.test.ts` (adapter: offset applied only in dev/demo).

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Hold vs expiry race (hold placed while expire job runs) | expiry selects with `FOR UPDATE SKIP LOCKED` and re-checks `hold_id IS NULL` inside the same transaction per item | `expire.test.ts` concurrency case with the DB int test |
| Bulk executed without preview / with a stale preview | deferred, FD-088 (the HMAC token, 15-min expiry and drift refusal in step 4 are for the follow-up) | follow-up task |
| Config change silently rewriting deadlines (FD-020) | `setPolicy` touches no existing rows; test counts | `set-policy.test.ts` |
| Demo clock reachable in production | `APP_MODE` guard + boot assertion + 404 | route + adapter tests |
| Staff extends retention without trace | step-up + audit + staff notification | `set-policy.test.ts` (`bulk.test.ts` deferred, FD-088) |
| Audit rows of a held case expire | `fn_expire_audit` hold clause | `retention.int.test.ts` |
| Original "deleted" but bytes remain | `Storage.delete` called and verified by `head(key)` → not found | `expire.test.ts` with `FakeStorage` |

## Hard-rule checklist

- [ ] Retention default changes are prospective; the retroactive bulk action is deferred after release 1 (FD-088), so no retroactive change exists (FD-020).
- [ ] A held item looks deleted to its author and the author is never told of the hold (FD-079).
- [ ] `rk_worker` gains only `EXECUTE` on the persona-link function, never a read on `persona_links` (FD-079).
- [ ] Legal hold pauses physical deletion for the named record only and logs actor/reason/time/expiry/release (FD-021).
- [ ] Custody/audit append-only until an authorised retention command expires them.
- [ ] Original access remains a separate audited capability (unchanged here).
- [ ] Demo controls cannot exist in production (AD-14).
- [ ] Both dictionaries updated (`custody.*` complete).
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
