# Business rules — U29 `t-309-retention-holds-custody`

Source of truth for the Unit's decision logic. Built from T-309 with its three amendment sections, `stories.md` (US7.3, AC10.3.3), `requirements.md` (FR13, FR67, FR69, FR71, FR86, FR87), `contract-summary.md` (C1, C2, C3, C8, C13, C14, C15), FD-004, FD-005, FD-020, FD-021, FD-035, FD-037, FD-064, FD-067, FD-068, FD-073, FD-076, FD-079, FD-082, FD-088, FD-090, FD-092, FD-093, AD-6, AD-7, AD-14, AD-17, the project hard rules (`project.md`), `01-conventions.md` §2–§5, §10, §11, `02-data-model.md` §0, §7, §10, §15, §16, and the drafts of U8, U10, U22, U24 and U25. Workflows, ports and view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 1–22 were answered A by the agent under the owner's no-questions instruction of 2026-10-29; all await the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. Rules resting on an FD entry the build appends name it as `FD entry (a)`–`(f)` of `functional-spec.md` § 16, in that section's order.

```yaml
rules:
  # BR1 — Retention policy
  - id: BR1.1
    statement: "The current policy is the highest version whose effective_from is not later than now; with no row, the built-in version 0 applies."
    category: calculation
    applies_to: "domain/retention/policy.ts currentOf; modules/retention/queries/current-policy.ts"
    trigger: "Any read of a retention period"
    logic: "rows sorted by version desc; first with effective_from <= clock.now(); none THEN {version: 0, originalDays: 90, auditDays: 180, notificationDays: 90, effectiveFrom: 1970-01-01T00:00:00Z, source: default}"
    violation: "A period read from the configuration, a hard-coded 90 in a module, or a crash on an unseeded database"
    source: "FD-004, FD-068, FD-082, C3 retention.currentPolicy"
  - id: BR1.2
    statement: "Only a Super Admin with a fresh step-up can change the policy; every refusal writes nothing."
    category: authorization
    applies_to: "modules/retention/commands/set-policy.ts"
    trigger: "retention.setPolicy"
    logic: "requires [capability 'config.write', stepUp] in U8's order; Admin and Moderator lack config.write (actor.ts) THEN forbidden; missing or stale step-up THEN auth.step_up_required; no onRefused"
    violation: "An Admin or Moderator changing retention, or a change without a password recheck"
    source: "C3, FD-005, AC7.3.2, actor.ts capabilitiesForRole"
  - id: BR1.3
    statement: "All three periods are required integers inside fixed ranges, and the reason is 10 to 500 characters."
    category: validation
    applies_to: "contracts schemas/retention.ts SetRetentionPolicyInput, RETENTION_RANGES; domain policy.ts validatePolicy"
    trigger: "retention.setPolicy input"
    logic: "originalDays 1-3650, auditDays 30-3650, notificationDays 7-365, integers; reason trimmed 10-500; a value outside its range THEN config.out_of_range with fieldErrors {<field>: errors.config.outOfRange}; a missing field or wrong type THEN validation"
    violation: "A zero or negative period, a policy without notificationDays, or a change without a stated reason"
    source: "02-data-model.md §11 ranges, C3, Question 15"
  - id: BR1.4
    statement: "A policy change inserts one new version effective now and changes no other row."
    category: constraint
    applies_to: "modules/retention/commands/set-policy.ts, repositories/retention.ts insertPolicy"
    trigger: "A valid retention.setPolicy"
    logic: "lock the highest version row FOR UPDATE; values equal to current THEN ok({version: current, unchanged: true}) and nothing written; else insert version current+1, effective_from now, actor, reason; no UPDATE of any retention_policies, evidence_items or other row; unique version violation THEN conflict"
    violation: "Existing deadlines rewritten by a default change (FD-020), or two concurrent changes with one version number"
    source: "FD-020, AD-7, T-309 step 2, acceptance row 'Prospective only'"
  - id: BR1.5
    statement: "A policy change is audited with old and new values and announces itself on the outbox only."
    category: audit
    applies_to: "set-policy.ts"
    trigger: "A policy version inserted"
    logic: "audit stream retention, action policy_set, actor account:<id>, details {fromVersion, toVersion, before: {originalDays, auditDays, notificationDays}, after: {...}}; the reason stays on the policy row, never in audit details; outbox retention.policyChanged {version}; no staff notice, no email"
    violation: "A policy change without a record of who changed what, or free text in audit details"
    source: "AC7.3.2, C3, C15, AuditWriter allowlist (C1)"
  - id: BR1.6
    statement: "Retention periods are shown to staff only from the current policy."
    category: constraint
    applies_to: "server/actions/retention.ts currentPolicy; copy admin.retention"
    trigger: "Any staff screen that names a period"
    logic: "RetentionPolicyVM from retention.currentPolicy; requires a staff role on an approved device; copy takes {days} from it, formatted in the active language's numerals"
    violation: "A screen that says 90 days after the policy changed"
    source: "FD-082, PRODUCT.md (numerals follow the language)"
  - id: BR1.7
    statement: "Only retention.setPolicy writes retention_policies, and the table is append-only."
    category: constraint
    applies_to: "repositories/retention.ts; migration M1 trigger; config.apply (U12)"
    trigger: "Any write to retention_policies"
    logic: "no other command or repository method inserts or updates it; BEFORE UPDATE OR DELETE trigger raises append_only_violation; a configuration containing a retention key is rejected as unknown (U12) and leaves currentPolicy unchanged"
    violation: "Periods stored twice or a policy version edited after the fact"
    source: "FD-068, FD-082, acceptance row 'FD-068: one source'"
  - id: BR1.8
    statement: "Each expirable row is due when its age passes the period of the policy version in force when it was created."
    category: calculation
    applies_to: "domain/retention/policy.ts expirySegments; WF6 S4, S7, S8; fn_expire_audit"
    trigger: "Every expiry of audit rows, notifications or originals"
    logic: "policies sorted by effective_from; segment i = [effective_from_i, effective_from_(i+1)) (the first from -infinity, version 0 defaults before any row); cutoff_i = now - days_i; a row created in segment i is due WHEN created_at < cutoff_i"
    violation: "A shortened period deleting rows created under a longer one (retroactive change)"
    source: "FD-020, AD-7, Question 4, FD entry (d)"
  - id: BR1.9
    statement: "A published original's deadline is its publish time plus the current originalDays, set once at publish."
    category: calculation
    applies_to: "web container OriginalRetentionPolicy; U25 evidence.publish"
    trigger: "evidence.publish"
    logic: "originalDays(tx) = (await retention.currentPolicy(tx)).originalDays; retention_expires_at = expiryFor(publishedAt, originalDays); never changed afterwards in release 1"
    violation: "A config fallback, or a deadline recomputed later"
    source: "T-309 step 9, FD-068, FD-088"

  # BR2 — Legal holds
  - id: BR2.1
    statement: "A hold targets one record of six kinds, identified by its internal id."
    category: validation
    applies_to: "contracts HOLD_TARGET_KINDS, HoldPlaceInput; database enum hold_target_kind"
    trigger: "hold.place input"
    logic: "targetKind IN [review, facility_review, comment, evidence, profile, account]; targetId a UUID; the report target_kind enum keeps its five values; report, appeal, submission, claim or field-change targets THEN validation"
    violation: "Account added to report targets, or holds on rows FD-079 excluded"
    source: "FD-079, C3 hold_target_kinds"
  - id: BR2.2
    statement: "Placing a hold needs holds.manage; releasing one also needs a fresh step-up."
    category: authorization
    applies_to: "commands/place-hold.ts, release-hold.ts"
    trigger: "hold.place, hold.release"
    logic: "place: requires [capability 'holds.manage'] (Admin, Super Admin, only on an approved device per U10); release: requires [capability 'holds.manage', stepUp] with step-up purpose hold.release; refusals write nothing"
    violation: "A Moderator placing holds, or a hold ended by a stolen session without a password recheck"
    source: "C3, actor.ts, Question 11"
  - id: BR2.3
    statement: "A hold states its reason and may carry an expiry, except an account hold."
    category: validation
    applies_to: "HoldPlaceInput, HoldReleaseInput, domain hold.ts validateHoldInput"
    trigger: "hold.place, hold.release input"
    logic: "reason trimmed 10-1000 characters (place and release); expiresAt optional ISO datetime, > now and <= now + 3650 days; targetKind account AND expiresAt present THEN validation"
    violation: "An unexplained hold, a hold that expires in the past, or an account hold that ends while the worker cannot resume its deletion"
    source: "T-309 step 5 (reason >= 10), FD-021, Question 9, FD entry (e)"
  - id: BR2.4
    statement: "A hold is placed only on a record that exists, locked while the hold is written."
    category: constraint
    applies_to: "place-hold.ts; RetentionSubject.lockTarget in evidence, review, community, directory, account"
    trigger: "hold.place after validation"
    logic: "subject for targetKind runs SELECT ... FOR UPDATE on the record row; not found THEN not_found and nothing written; profile = a doctor or facility-branch id as moderation's profile target uses it"
    violation: "A hold on a mistyped id that protects nothing, or a delete slipping between the check and the hold"
    source: "C3 errors [not_found], Question 12"
  - id: BR2.5
    statement: "A record has at most one open hold; an expired open hold is ended before a new one is placed."
    category: constraint
    applies_to: "place-hold.ts; partial unique index legal_holds_open_target_unique"
    trigger: "hold.place on a target with an open hold"
    logic: "under the target lock, load the open hold (released_at null) FOR UPDATE; active THEN hold.active; expired THEN set released_at = expires_at, released_by null, insert legal_hold_expiries, audit hold_expired, outbox hold.changed {placed: false}, subject onHoldChanged(auto: true), then insert the new hold"
    violation: "Two open holds on one record, or a new hold refused because an old one has silently expired"
    source: "T-309 step 5 (hold.active on duplicate), FD-021"
  - id: BR2.6
    statement: "Placing a hold records it, ties it to evidence, audits it and announces it, and changes nothing else."
    category: audit
    applies_to: "place-hold.ts; evidence retention-subject onHoldChanged"
    trigger: "A hold inserted"
    logic: "legal_holds {target_kind, target_id, reason, placed_by_account_id: actor, placed_at: now, expires_at}; evidence: evidence_items.hold_id = holdId and custody hold_placed {holdId} actor account:<staffId>; audit stream retention action hold_placed {holdId, targetKind, targetId, expiresAt?} (no reason); outbox hold.changed {holdId, placed: true}"
    violation: "A hold without actor, reason, start and expiry on record (FD-021), or reason text copied into audit"
    source: "FD-021, C3, C15, T-309 step 5"
  - id: BR2.7
    statement: "Releasing a hold records who released it and why, frees evidence, and lets deferred work finish promptly."
    category: audit
    applies_to: "release-hold.ts"
    trigger: "A valid hold.release"
    logic: "load hold FOR UPDATE (none THEN not_found); lock target; released or expired THEN conflict; set released_at now, released_by actor, release_reason; evidence: clear hold_id WHERE hold_id = holdId, custody hold_released {holdId, auto: false}; audit hold_released {holdId, targetKind}; outbox hold.changed {holdId, placed: false}; run every HoldReleaseListener for the kind; enqueue retention.expire with key retention.expire:on-demand in the same transaction"
    violation: "A silent release, a release with no reason, or held deletions left waiting a whole hour after release"
    source: "FD-021, AC7.3.6, C3, Question 11"
  - id: BR2.8
    statement: "A hold is active when it is not released and has not passed its expiry; application and database use the same definition."
    category: calculation
    applies_to: "domain hold.ts isHoldActive; repositories activeHolds; fn_expire_audit, fn_delete_held_persona_links"
    trigger: "Every hold check"
    logic: "active = released_at IS NULL AND (expires_at IS NULL OR expires_at > now); now = Clock in the application, fn_app_now() in SQL"
    violation: "A hold treated as active in one layer and expired in the other"
    source: "C3 retention.activeHold notes, Question 18"
  - id: BR2.9
    statement: "The end of an expired hold is recorded exactly once, without the worker writing legal_holds."
    category: audit
    applies_to: "jobs/expire.ts S1; legal_hold_expiries"
    trigger: "A hold with released_at null and expires_at <= now and no expiry record"
    logic: "INSERT INTO legal_hold_expiries (hold_id, recorded_at) ON CONFLICT DO NOTHING; only when a row was inserted: audit hold_expired {holdId, targetKind} actor system:retention, outbox hold.changed {holdId, placed: false}, subject onHoldChanged(placed: false, auto: true) (evidence: hold_id cleared, custody hold_released {holdId, auto: true})"
    violation: "An expiry never logged (AC7.3.6), logged on every run, or a worker UPDATE grant on legal_holds"
    source: "AC7.3.6, ISS-236, FD-092, Question 3, FD entry (c)"
  - id: BR2.10
    statement: "Holds never change what the public sees."
    category: constraint
    applies_to: "place-hold.ts, release-hold.ts, jobs/expire.ts; every subject"
    trigger: "Placing, releasing or expiring a hold"
    logic: "no hold path calls a state, visibility, tombstone or moderation command; moderation, author and evidence.remove actions on a held record run as on any record; only physical deletion waits"
    violation: "A held published review hidden by the hold, or a moderator's removal refused because of a hold"
    source: "AD-17, FD-021, T-309 step 5, Question 1, FD entry (a)"
  - id: BR2.11
    statement: "Hold rows are permanent records; only their release fields can be set, and only once."
    category: constraint
    applies_to: "migration M1 fn_guard_legal_hold"
    trigger: "UPDATE or DELETE on legal_holds"
    logic: "DELETE THEN raise; UPDATE THEN allowed only if every column but released_at, released_by, release_reason is unchanged AND OLD.released_at IS NULL; else raise append_only_violation"
    violation: "A hold erased or its reason rewritten, losing the accountability FD-021 requires"
    source: "FD-021, AD-7"
  - id: BR2.12
    statement: "An account hold pauses that account's deletion, its draft purge and the expiry of its account audit stream, and nothing else."
    category: constraint
    applies_to: "activeHoldsFor (U39 caller); jobs/expire.ts S6, S8; fn_expire_audit"
    trigger: "An active hold of kind account"
    logic: "activeHoldsFor returns accountHold; drafts with account_id in held accounts are neither warned nor purged; audit rows with stream 'account:<id>' are kept; original and notification expiry continue"
    violation: "Account data deleted under an account hold, or an account hold silently extending every item the account ever uploaded"
    source: "FD-079, Question 10, FD entry (e)"
  - id: BR2.13
    statement: "A review hold also keeps that review's evidence originals and their audit streams."
    category: constraint
    applies_to: "jobs/expire.ts S5, S8"
    trigger: "An active hold of kind review"
    logic: "S5 skips items whose review_id has an active review hold; S8 passes those items as keepTargets (evidence:<itemId>)"
    violation: "A held review whose attached documents expire (AC7.3.5 'its evidence')"
    source: "AC7.3.5, Question 22, FD entry (a)"

  # BR3 — Delete paths of held records
  - id: BR3.1
    statement: "The hold check on a delete runs inside the delete's transaction after the record row is locked."
    category: constraint
    applies_to: "operations/defer-if-held.ts; review.delete, facilityReview.delete, comment.delete"
    trigger: "An author delete"
    logic: "caller: SELECT ... FOR UPDATE the record row; then deferIfHeldOn(tx, {targetKind, targetId, action}); hold.place locks the same row (BR2.4), so the two serialise"
    violation: "A hold committed between the check and the deletion, losing data the hold should keep"
    source: "T-309 threat notes (race), finding F9"
  - id: BR3.2
    statement: "A held delete is recorded as pending and audited for staff; the caller learns only whether to skip its physical step."
    category: audit
    applies_to: "defer-if-held.ts; retention_deferred_deletions"
    trigger: "deferIfHeldOn with an active hold"
    logic: "insert {target_kind, target_id, action, hold_id, requested_at: now} unless a pending row with the same target and action exists; audit stream retention action deletion_deferred {targetKind, holdId, action} actor system:retention; return {deferred: true}; no hold THEN {deferred: false} and nothing written"
    violation: "A deferral nobody can see, or a second pending row for one delete"
    source: "FD-073, FD-079, Question 2, FD entry (a)"
  - id: BR3.3
    statement: "Review and facility-feedback deletes behave identically held or not."
    category: constraint
    applies_to: "modules/review/commands/delete.ts, facility-review-delete.ts"
    trigger: "Author delete of a review or facility feedback"
    logic: "call deferIfHeldOn with action author_delete; whatever it returns, run T-302's delete unchanged (state, deleted_at, restore_until, audit, outbox, result)"
    violation: "A refused delete, a different result, or a public trace of the hold"
    source: "FD-079 (Q9), T-302 WF4"
  - id: BR3.4
    statement: "A held comment delete shows the same tombstone or removal but keeps the stored body until the hold ends."
    category: constraint
    applies_to: "community comment.delete (U30)"
    trigger: "Author delete of a comment"
    logic: "with replies: action comment_body_clear; set tombstone as T-401; IF deferred THEN keep body ELSE clear body; without replies: action author_delete; deleted_at as T-401; result, outbox, thread projection and the author's list identical in both cases"
    violation: "A held comment's text cleared, or a tombstone that shows the kept text"
    source: "FD-073, FD-079, T-401 step 4"
  - id: BR3.5
    statement: "The author is never told of a hold."
    category: constraint
    applies_to: "every delete path, its result, errors, notices, emails and logs"
    trigger: "Any author action on a held record"
    logic: "no field, error code, message key, notification, email or log line differs between held and unheld; the deferral audit is on the staff-only retention stream"
    violation: "An author warned that their content is under legal hold"
    source: "FD-079, T-309 hard-rule checklist"
  - id: BR3.6
    statement: "A deferred deletion is finished exactly once, after no active hold covers the record."
    category: constraint
    applies_to: "jobs/expire.ts S2; subjects' completeDeferred"
    trigger: "A pending row whose target has no active hold"
    logic: "select pending rows with NOT EXISTS (active hold on target) FOR UPDATE SKIP LOCKED, 100 per transaction; comment_body_clear THEN clear body when the comment is still deleted (outcome completed) or nothing (target_gone); author_delete THEN nothing_to_do; set completed_at, outcome WHERE completed_at IS NULL; audit deferred_deletion_completed {targetKind, action, outcome}"
    violation: "Held text cleared twice, never cleared, or cleared while another hold still covers it"
    source: "FD-079 (hold end finishes deletion), AC7.3.6"
  - id: BR3.7
    statement: "A restore of a held, deleted review works as for an unheld one."
    category: constraint
    applies_to: "review.restore (U22); S2"
    trigger: "Author restore within the window"
    logic: "T-302 rules apply unchanged; the pending author_delete row later completes as nothing_to_do"
    violation: "A held review that its author can no longer restore, revealing the hold"
    source: "FD-079, T-302 BR6.1"
  - id: BR3.8
    statement: "Only the retention module reads or writes its tables; other modules use its queries, operations and ports."
    category: constraint
    applies_to: "packages/application; repositories/retention.ts"
    trigger: "Any code touching legal_holds, retention_policies, retention_bulk_actions, legal_hold_expiries, retention_deferred_deletions"
    logic: "only modules/retention imports the retention repository port; an import-scan test fails on any other module naming it or the tables"
    violation: "Evidence, review or community reading legal_holds directly"
    source: "FD-064, ADR-002, acceptance row 'FD-064'"

  # BR4 — The expiry job
  - id: BR4.1
    statement: "retention.expire runs hourly and on demand, retries like every job, and is safe to run twice at once."
    category: constraint
    applies_to: "apps/worker/src/registry.ts, queue-declaration.ts, handlers/retention-expire.ts"
    trigger: "Cron '0 * * * *' (key retention.expire) or an on-demand enqueue (key retention.expire:on-demand)"
    logic: "queue policy exclusive per key (CR-011); retryLimit 5 with backoff (FD-076); every write guarded by a row lock or a conditional predicate"
    violation: "Duplicate logs or deletions from overlapping runs, or a job that stops after one failure"
    source: "FD-076, ISS-253, C15"
  - id: BR4.2
    statement: "The job takes now from the Clock after syncing it, and database functions use the same demo offset."
    category: calculation
    applies_to: "handlers/retention-expire.ts; fn_app_now"
    trigger: "Job start"
    logic: "await clock.sync(); now = clock.now(); SQL uses fn_app_now() = now() + demo_clock.offset_seconds"
    violation: "The job and the database disagreeing about what has expired"
    source: "01-conventions.md §4 (all now from Clock), Question 18"
  - id: BR4.3
    statement: "Steps run in a fixed order; a failing step does not stop the others, but fails the run."
    category: constraint
    applies_to: "jobs/expire.ts"
    trigger: "Each run"
    logic: "S1 holds -> S2 deferred -> S3 persona links -> S4 deadlines -> S5 originals -> S6 drafts -> S7 notifications -> S8 audit -> S9 run record; each step catches its own failure, logs retention.expire.step_failed {step, code}, the later steps recompute holds themselves; the run returns an error when any step failed"
    violation: "One failure leaving every later expiry undone, or a silent partial run"
    source: "T-309 step 6 (separately logged)"
  - id: BR4.4
    statement: "A due original is deleted from storage inside its transaction, and only when nothing holds it."
    category: constraint
    applies_to: "evidence retention-subject expire; U25 purgeOriginal"
    trigger: "S5"
    logic: "select items retention_expires_at <= now AND hold_id IS NULL AND original artifact not deleted, excluding active holds on (evidence, id) and (review, review_id), FOR UPDATE SKIP LOCKED, 100 per batch; re-check inside; purgeOriginal(tx, {itemId, by: retention}); Storage.delete(key, {reason: retention}) before commit, missing = success, error THEN rollback this item; after commit Storage.head(key) must be missing"
    violation: "A held original deleted, or an original marked deleted while its bytes remain"
    source: "FR67, AC7.3.1, AC7.3.5, T-309 threat notes, Question 7"
  - id: BR4.5
    statement: "Every original gets a deadline from the moment it stops being processed or is received."
    category: calculation
    applies_to: "S4; evidence repository stampDeadlines"
    trigger: "Items with retention_expires_at null and an undeleted original"
    logic: "failed, rejected, removed THEN anchor = created_at of the failed or removed custody event; never published THEN anchor = received custody event; deadline = anchor + originalDays of the version in force at the anchor; existing deadlines never change"
    violation: "Malware or abandoned uploads kept for ever (FR67)"
    source: "FR67, U24 F9/X4, Question 6, FD entry (d)"
  - id: BR4.6
    statement: "An item without an original artifact is marked expired once, so the job does not select it again."
    category: constraint
    applies_to: "S5; U25 purgeOriginal (X3)"
    trigger: "A due item with no original row"
    logic: "custody original_expired {original: absent} actor system:retention; published THEN original_expired; once (state or custody guard)"
    violation: "The seeded items re-selected every hour, or a storyboard step that never shows expiry"
    source: "ISS-181, Question 21, finding F5"
  - id: BR4.7
    statement: "Drafts are warned once per expiry day and purged when expired, never reading their content and skipping held accounts."
    category: constraint
    applies_to: "review retention-subject worker entry; S6"
    trigger: "S6"
    logic: "warn: now < expires_at <= now + 4 days AND account not held AND NOT EXISTS outbox_events with name draft.expiring and payload draftId and expiresOnDay equal THEN outbox draft.expiring {draftId, accountId, days: ceil((expires_at - now) / 1 day), expiresOnDay: floor(expires_at / 1 day)}; purge: DELETE review_drafts WHERE expires_at <= now AND account_id NOT IN held accounts; select lists never include payload_enc"
    violation: "Hourly duplicate warnings, a missed second expiry after a re-save, or the job reading draft content"
    source: "FD-090, T-309 step 6(d), Question 16"
  - id: BR4.8
    statement: "Notifications expire by creation time, segment by segment."
    category: calculation
    applies_to: "S7; notification.expire (U34, X2)"
    trigger: "S7"
    logic: "for each segment from BR1.8 with field notificationDays: notification.expire {before: min(cutoff_i, segment end), createdFrom: segment start}; notifications.expires_at is not read; holds do not pause it"
    violation: "Notifications deleted by expires_at or by one current cutoff"
    source: "C2, FD-068, Question 4"
  - id: BR4.9
    statement: "Audit rows expire last, through the maintenance connection, keeping every held target."
    category: constraint
    applies_to: "S8; modules/administration/commands/audit-expire.ts; PgAuditExpiryGateway"
    trigger: "S8"
    logic: "audit.expire {keepTargets: evidence items of held reviews}; gateway runs select fn_expire_audit(kinds, ids) as rk_maintenance; returns {expired}"
    violation: "Audit rows of a held case or its evidence deleted (AC7.3.5)"
    source: "C1 audit.expire, AC7.3.5, FD-065"
  - id: BR4.10
    statement: "Each run is logged per step and recorded once in the audit trail with counts only."
    category: audit
    applies_to: "jobs/expire.ts"
    trigger: "Each step and the end of each run"
    logic: "log retention.expire.step {step, counts, durationMs}; audit stream retention action expire_run actor system:retention details {holdsEnded, deferredCompleted, linksDeleted, deadlinesSet, originalsDeleted, draftsWarned, draftsPurged, notificationsExpired, auditExpired, failedSteps}"
    violation: "Deletions with no trace (AC7.3.1 'the deletion is logged'), or ids and text in logs"
    source: "AC7.3.1, 01-conventions.md §11 logging"
  - id: BR4.11
    statement: "The job uses only worker entries and never loads account, identity or deletion command code."
    category: constraint
    applies_to: "apps/worker; application/src/worker.ts"
    trigger: "Worker composition"
    logic: "imports only from @rogikotha/application/worker; worker subjects for evidence, review, community; no modules/account, modules/identity or data-requests commands; no better-auth, drizzle-orm, pg"
    violation: "A lint failure or a worker able to reveal or delete identities (AD-6)"
    source: "FD-093, AD-6, eslint.boundaries.mjs"

  # BR5 — Database boundary
  - id: BR5.1
    statement: "Audit rows can be deleted only inside the audit expiry function and only for the maintenance login."
    category: constraint
    applies_to: "migration M2 fn_block_mutation"
    trigger: "DELETE on audit_events"
    logic: "allow only WHEN TG_TABLE_NAME = audit_events AND current_setting('rk.audit_expiry', true) = 'on' AND session_user = 'rk_maintenance'; every other UPDATE or DELETE on an append-only table raises append_only_violation"
    violation: "rk_app deleting audit rows in two statements (ISS-141)"
    source: "ISS-141, AD-7, Question 5, FD entry (c)"
  - id: BR5.2
    statement: "fn_expire_audit deletes only rows past their own deadline that no active hold or keep entry covers."
    category: constraint
    applies_to: "migration M2"
    trigger: "select fn_expire_audit(kinds, ids)"
    logic: "SECURITY DEFINER, SET search_path = pg_catalog, public; per row: due WHEN created_at + audit_days(policy in force at created_at) < fn_app_now(); keep WHEN (target_kind, target_id) or stream '<kind>:<id>' matches an active hold or the arrays, or stream = 'account:<id>' of an active account hold; returns the count; EXECUTE to rk_maintenance only; old signature dropped"
    violation: "Held audit rows deleted, a retroactive cutoff, or the worker able to expire audit"
    source: "C1, AC7.3.5, BR1.8, PR1"
  - id: BR5.3
    statement: "fn_delete_held_persona_links deletes only links of deleted accounts that no active hold keeps."
    category: constraint
    applies_to: "migration M3; HeldPersonaLinks; S3"
    trigger: "S3"
    logic: "no arguments; personas = authors of review, facility_review and comment holds that are not active; delete persona_links of those personas WHERE the linked account status = deleted AND NOT EXISTS an active hold on any review, facility feedback or comment of that persona AND NOT EXISTS an active account hold on that account; return count only; SECURITY DEFINER, pinned search_path, EXECUTE to rk_worker only"
    violation: "A held post's author link deleted, a live account's link deleted, or link rows returned to the worker"
    source: "FD-079, FD-090, PA2, AD-3"
  - id: BR5.4
    statement: "Database functions take now from the database and the demo offset, never from a caller."
    category: calculation
    applies_to: "fn_app_now, fn_expire_audit, fn_delete_held_persona_links"
    trigger: "Any hold-activity or deadline check in SQL"
    logic: "fn_app_now() = now() + coalesce((select offset_seconds from demo_clock where id = 1), 0) seconds; REVOKE ALL FROM PUBLIC"
    violation: "A caller passing a far-future time to end holds or widen a deletion"
    source: "Question 18, FD entry (c)"
  - id: BR5.5
    statement: "After this Unit the worker holds exactly the retention privileges the job uses."
    category: authorization
    applies_to: "migrations M2-M4; 02-data-model.md §16"
    trigger: "Migration"
    logic: "rk_worker: SELECT on retention_policies, legal_holds; SELECT, INSERT on legal_hold_expiries; SELECT, UPDATE (completed_at, outcome) on retention_deferred_deletions; SELECT (offset_seconds) on demo_clock; EXECUTE fn_delete_held_persona_links; nothing on retention_bulk_actions; no EXECUTE on fn_expire_audit; rk_app: SELECT, INSERT, UPDATE on retention_deferred_deletions, SELECT, INSERT on legal_hold_expiries"
    violation: "A worker able to write policies, release holds or expire audit"
    source: "FD-037, FD-092, Question 19, FD entry (c)"
  - id: BR5.6
    statement: "Retention records are append-only except their single completion fields."
    category: constraint
    applies_to: "migrations M1, M4"
    trigger: "UPDATE or DELETE on retention_policies, legal_hold_expiries, retention_deferred_deletions; evidence_custody_events and audit_events unchanged"
    logic: "retention_policies, legal_hold_expiries: any UPDATE or DELETE raises; retention_deferred_deletions: DELETE raises, UPDATE allowed only setting completed_at and outcome from null once"
    violation: "A deferral or expiry record erased"
    source: "AD-7, acceptance row 'Append-only untouched'"
  - id: BR5.7
    statement: "Migrations are forward-only, take the next free numbers and move every pin in the same commit."
    category: constraint
    applies_to: "packages/database/src/migrations; migrations.int.test.ts, validator-probes.int.test.ts, cr-006-adversarial.int.test.ts, append-only.int.test.ts"
    trigger: "Adding M1-M4"
    logic: "drizzle custom migrations with later journal timestamps; both migration-count pins +4 with a comment; the SECURITY DEFINER pin lists fn_delete_held_persona_links() only; the ISS-141 tripwire becomes a passing test"
    violation: "A red pin, an edited old migration, or a stale test"
    source: "01-conventions.md, T-010, ISS-294"
  - id: BR5.8
    statement: "The maintenance credential is read only by the worker's composition root for the audit expiry."
    category: constraint
    applies_to: "apps/worker/src/env.ts, container.ts; database retention/audit-expiry-gateway.ts"
    trigger: "Worker start"
    logic: "DATABASE_URL_MAINTENANCE parsed in the worker env, passed only to PgAuditExpiryGateway (one connection); never read by the web; never logged; missing THEN S8 fails and is logged, other steps run"
    violation: "Maintenance rights available to the web tier or printed in logs"
    source: "C1, AD-6, 01-conventions.md §11"

  # BR6 — Demo clock
  - id: BR6.1
    statement: "The demo offset applies only in development and demo modes."
    category: constraint
    applies_to: "web and worker composition roots; adapters/clock"
    trigger: "Container build"
    logic: "APP_MODE production THEN SystemClock and no DemoClockStore built; development or demo THEN DemoOffsetClock, now() = Date.now() + offset, sync() re-reads when the cache is older than 2 s"
    violation: "Moved time in production (AD-14)"
    source: "AD-14, T-309 step 8"
  - id: BR6.2
    statement: "Production refuses to start with a non-zero demo offset."
    category: constraint
    applies_to: "web and worker start-up"
    trigger: "Start-up"
    logic: "APP_MODE production AND demo_clock row offset_seconds <> 0 THEN throw and exit"
    violation: "A production process running beside a moved clock"
    source: "AD-14, Question 13, FD entry (f)"
  - id: BR6.3
    statement: "The demo clock route answers 404 in production and is readable otherwise."
    category: authorization
    applies_to: "app/api/demo/clock/route.ts GET"
    trigger: "GET /api/demo/clock"
    logic: "production THEN 404; else {now, offsetSeconds}"
    violation: "A demo control visible in production"
    source: "C14, AD-14"
  - id: BR6.4
    statement: "Only staff on an approved device move the demo clock, forward from zero within ten years, with an audit row and one expiry run."
    category: authorization
    applies_to: "route POST, commands/set-demo-clock.ts"
    trigger: "POST /api/demo/clock"
    logic: "production THEN 404; actor without a staff role (U10: approved device) THEN 404; Origin not the app's THEN 403; {offsetSeconds} 0-315360000 or {advance: '+<1-3650>d' | '+<1-87600>h'} with the result in range, else validation; write demo_clock, audit demo_clock_set {fromOffset, toOffset} actor account:<id>, enqueue retention.expire:on-demand, update the cache"
    violation: "A patient or an outside page moving time, or a negative offset"
    source: "C14, T-309 step 8, Question 14"
  - id: BR6.5
    statement: "pnpm demo:clock writes the same row through the repository and refuses production."
    category: constraint
    applies_to: "scripts/demo-clock.ts"
    trigger: "pnpm demo:clock -- +91d | +12h | reset | now"
    logic: "APP_MODE production THEN exit 1; parse with domain parseAdvance; write, audit demo_clock_set actor system:script, enqueue the on-demand run, print the new now; reset sets 0; now prints only"
    violation: "A script that changes time without a trace"
    source: "T-309 step 8"

  # BR7 — Staff reads
  - id: BR7.1
    statement: "The custody log shows events with label keys, opaque actors and allowlisted details only."
    category: constraint
    applies_to: "modules/evidence/queries/custody-log.ts"
    trigger: "evidence.custodyLog {itemId}"
    logic: "requires reports.read; item not found THEN not_found; events oldest first; labelKey custody.<event>; actor account:<id> THEN {kind: staff, role from details.staffRole when present}, author THEN author, worker THEN worker, system:* THEN system; details allowlist per event: hold_placed {holdId}, hold_released {holdId, auto}, original_accessed {purpose, staffRole}, failed {failReason}, removed {part, by}, published {pageCount}, privacy_confirmed {redactions, skippedEditing}, original_expired {original}; never storage_key, file name, hash, reason text or account id"
    violation: "An account id, file name or free text reaching the console"
    source: "T-309 step 7, C8, 01-conventions.md §4, Question 20"
  - id: BR7.2
    statement: "The quarantine list shows unpublished, failed and held items with stage flags and no private metadata."
    category: constraint
    applies_to: "modules/evidence/queries/list-for-staff.ts"
    trigger: "evidence.listForStaff {page, state?}"
    logic: "requires reports.read; items not in published or original_expired, plus held items in any state; ordered by updated_at desc, then public id; 20 per page; fileLabel '<publicId>.<jpg|png>' from detected_mime else '<publicId>' (ASSUMPTION(T-309)); stages from custody (received; validated ok or fail; scanned ok, fail or hold for scan_unavailable; sanitised; redacted wait at preview_ready, ok after privacy_confirmed; published); hold summary from retention.activeHold; exact counts"
    violation: "The uploaded file name shown (the prototype's IMG_2291.heic), or an uploader id"
    source: "T-309 step 7, 03 §4 evidence.listForStaff, FD-036"
  - id: BR7.3
    statement: "The hold list is for hold managers and shows each hold's reason, state and pending deletions."
    category: authorization
    applies_to: "queries/list-holds.ts"
    trigger: "retention.listHolds"
    logic: "requires holds.manage; HoldVM {holdId, targetKind, targetId, reason, placedAt, expiresAt?, state: active | released | expired, endedAt?, endedBy: staff | expiry, pendingDeletions, placedByMe}; newest first; 20 per page"
    violation: "Hold reasons readable by every staff role"
    source: "FD-021, T-309 step 5 (listHolds)"
  - id: BR7.4
    statement: "Internal hold queries are never reachable from a page or action."
    category: authorization
    applies_to: "server/actions/retention.ts"
    trigger: "Defining actions"
    logic: "no action exports activeHold, activeHoldsFor or deferIfHeldOn; a test lists the module's exports"
    violation: "A patient learning which records are held"
    source: "C3 (internal), FD-079"
  - id: BR7.5
    statement: "Missing values are absent, never zero."
    category: constraint
    applies_to: "every view model of this Unit"
    trigger: "Mapping"
    logic: "optional fields omitted when unknown (expiresAt, failReason, retentionExpiresAt, hold); counts are exact integers; no percentage"
    violation: "A missing deadline rendered as 0 days"
    source: "PRODUCT.md hard rules, owner's counts-only answer"

  # BR8 — Placement and tests
  - id: BR8.1
    statement: "Every file sits where the T-010 boundary matrix allows."
    category: constraint
    applies_to: "all files of the Unit"
    trigger: "pnpm lint"
    logic: "domain imports nothing; application imports domain and contracts only (no Node built-in, no external package); database imports application ports and contracts, never domain (segments computed in application); adapters only in the composition roots; components import server actions only; nothing in apps imports test-support"
    violation: "A red lint"
    source: "FD-093, eslint.boundaries.mjs"
  - id: BR8.2
    statement: "Stub, fake and pin tests change in the same commit as the code."
    category: constraint
    applies_to: "not-implemented.test.ts, repositories-superset.test.ts, fakes"
    trigger: "Replacing PgRetentionRepository"
    logic: "PgRetentionRepository leaves STUB_REPOSITORIES (its bulk stubs are deleted, FD-088); FakeRetentionRepository and FakeDemoClockStore are supersets of the real method names; FakeClock gains sync()"
    violation: "A red check from ISS-294's pins"
    source: "ISS-294, T-010"
  - id: BR8.3
    statement: "Every package keeps its 80% line floor and the Unit adds at least one smoke assertion."
    category: constraint
    applies_to: "domain, application, database, adapters, web, worker"
    trigger: "pnpm check, pnpm smoke"
    logic: "the tests of functional-spec.md § 10; retention.smoke.test.ts; untested files count"
    violation: "Coverage below the floor or a smoke suite that shrank"
    source: "team.md Testing Posture, D10"
  - id: BR8.4
    statement: "Every new string has en and bn entries in one commit, with numerals from the formatter."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Adding or changing copy"
    logic: "the keys of functional-spec.md § 7.3 in both files; {days} params formatted per locale; i18n parity green"
    violation: "A key without Bengali, or a hard-coded 90"
    source: "ADR 0011, FD-024, project.md Mandated"

  # BR9 — Process
  - id: BR9.1
    statement: "The six FD entries are appended before any code."
    category: constraint
    applies_to: "docs/status/decision-log.md"
    trigger: "WF0 step 3"
    logic: "rows (a)-(f) of functional-spec.md § 16 with the next free ids, in that order"
    violation: "A data-boundary or hard-rule change built without its decision"
    source: "project.md Mandated (FD before code)"
  - id: BR9.2
    statement: "Every finding gets an ISS row linked to this Unit, and the docs are corrected with dated notes."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md; 02-data-model.md, 03-routes-and-contracts.md, contract-summary.md, T-309 header"
    trigger: "Code Generation and Build and Test"
    logic: "F1-F25 as rows with Found in U29 T-309; ISS-141 and ISS-236 closed; ISS-181 partly; the Build and Test record lists the ids"
    violation: "A defect or deferral with no row"
    source: "team.md Way of Working, project.md Mandated"
```

## Rule index

| Group | Rules | Topic |
|---|---|---|
| BR1 | 1.1–1.9 | retention policy |
| BR2 | 2.1–2.13 | legal holds |
| BR3 | 3.1–3.8 | delete paths of held records |
| BR4 | 4.1–4.11 | the expiry job |
| BR5 | 5.1–5.8 | database boundary |
| BR6 | 6.1–6.5 | demo clock |
| BR7 | 7.1–7.5 | staff reads |
| BR8 | 8.1–8.4 | placement and tests |
| BR9 | 9.1–9.2 | process |
