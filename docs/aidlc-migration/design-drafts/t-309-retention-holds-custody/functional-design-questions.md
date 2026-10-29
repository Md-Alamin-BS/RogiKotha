# Functional Design questions — U29 `t-309-retention-holds-custody`

## Context

- Unit U29 (kind `library`, size L, **high risk**: retention, deletion, evidence) delivers T-309 (`docs/implementation/tasks/T-309-retention-holds-custody.md`, with its owner-decision, Contract Design and Delivery Planning amendments) for US7.3 and the hold side of AC10.3.3. It depends on U24 T-304, U12 T-105, U22 T-302, U30 T-401, U3 T-010 and U4 CR-011; U36 T-407 and U39 T-410 depend on it.
- Read: `unit-of-work.md` (U29, its open points, ISS-141), `unit-of-work-dependency.md`, `stories.md` (US7.3, AC10.3.3), `requirements.md` (FR13, FR67, FR69, FR71, FR86, FR87), `contract-summary.md` (C1, C2, C3, C8, C13, C14, C15, revision 2026-10-27), `decision-log.md` up to FD-094, `01-conventions.md` §2–§5, §10, §11, `02-data-model.md` §0, §6–§10, §12, §15, §16, `03-routes-and-contracts.md` §1–§5, ARCHITECTURE-SPINE AD-6, AD-7, AD-14, AD-17, the schema, migrations, stubs, fakes, seed and pinned tests on `main`, the prototype (`renderEvidence`, `moderation.quarantine`), the U8, U10, U12, U21, U22, U24 and U25 drafts, the T-401, T-405, T-407 and T-410 task files, ISS-141, ISS-164, ISS-181, ISS-236, ISS-253, ISS-294, and `OWNER-REVIEW-QUEUE.md`.
- Every question below was decided by the agent under the owner's no-questions instruction of 2026-10-29, by the recommended option, which is listed first. Each stays open to the owner's change in `OWNER-REVIEW-QUEUE.md`; `functional-spec.md` § 13 says what changes if they choose differently. Questions that change a hard rule, a data boundary or a founder decision name the FD entry of `functional-spec.md` § 16 the build appends.

## Settled before this stage

- **FD-064**: Retention owns policies, holds and bulk actions; other modules' rows change only through their own commands.
- **FD-068, FD-082**: `retention_policies` is the only source of periods; no retention block in the configuration.
- **FD-073, FD-079**: hold checks on review and comment deletes are built here; a held delete is never refused and looks normal to its author; held posts keep their persona link through account deletion until the hold ends; six hold target kinds; an account hold pauses the whole account deletion while the account closes at once.
- **FD-088**: no bulk preview or execute in release 1.
- **FD-090**: the worker's `review_drafts` grant (U21) and the persona-link function with EXECUTE for `rk_worker`.
- **FD-092**: the worker keeps `legal_holds` SELECT only.
- **FD-076**: `Result` for expected failures; jobs idempotent, 5 retries with backoff.
- **FD-093**: placement under the boundary matrix.
- **Owner answers**: counts only; release 1 settings narrowed; "Former member"; agents decide by recommendation (2026-10-29).

## Settled in this design without a question

- `hold.place` and `hold.release` take internal ids (staff surfaces carry them); reasons are 10–1000 characters, the policy reason 10–500.
- A policy change with unchanged values writes nothing and answers `unchanged: true`.
- `currentPolicy` falls back to a built-in version 0 (90/180/90, FD-004) on an empty table.
- Custody actors show as opaque kinds (staff with role, author, worker, system), never names (task step 7 "actor opaque").
- The job follows FD-076's 5 retries instead of the task's `retryLimit: 1`.
- `custody.<event>` keys keep the enum's snake case; Bengali copy is flagged for the owner's review (FD-042).

## Questions

### Question 1 — Does a hold change what the public sees?

FR86's PRD text, the prototype note `admin.legalHoldNote` and AC7.3.5 say held content is "hidden publicly"; AD-17, FD-021 as restated, T-309 step 5 and FD-079 say holds pause physical deletion only and visibility is decided separately.

A. **A hold never hides or shows anything; a held record whose deletion falls due looks deleted wherever that deletion would have removed it, while its data is kept; the prototype note is corrected** (recommended). One rule for every kind; matches AD-17 and FD-079; AC7.3.5 reads naturally ("when its scheduled deletion date passes … hidden publicly … kept"). Needs FD entry (a).
B. Placing a hold hides the record publicly (PRD text). Needs hide and restore steps in Review, Community and Evidence, contradicts FD-079's "looks normal" and would let a hold act as an unreviewed moderation action.
C. Hide only evidence derivatives under hold. Inconsistent across kinds; nothing in the sources asks for it.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 2 — How a held delete is finished when the hold ends

FD-079 says the data stays until the hold ends, "then the normal deletion runs". Something must remember what to finish.

A. **A pending row in a new retention-owned table `retention_deferred_deletions`, written by the delete path when a hold is active and completed once by the hourly job through the record's subject** (recommended). Explicit, exactly-once and visible to staff; the worker only updates the completion fields. Needs FD entry (a) and a new worker grant (FD entry (c)).
B. A state-based sweep: find author-deleted records with uncleared content and no active hold. No new table, but it cannot tell an author's comment tombstone from a moderator's, so it could clear text a moderation case still needs.
C. Finish only when staff release the hold, in the web. Leaves expiring holds unfinished.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 3 — Recording the end of an expired hold (ISS-236)

The task auto-releases expired holds, but the worker may only read `legal_holds` (FD-092); AC7.3.6 needs the end logged once.

A. **An expired hold is inactive by definition; the job records its end once in a new insert-only table `legal_hold_expiries` and then audits, announces and frees the evidence item** (recommended). The worker never writes `legal_holds`; exactly-once by primary key. Needs FD entry (c).
B. Grant the worker UPDATE on `legal_holds.released_at`. Simpler, but reopens CR-006's ruling and lets a worker bug end any hold early.
C. Log nothing for expiry. Fails AC7.3.6.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 4 — Prospective expiry of audit rows and notifications

C1, C2 and C3 pass one cutoff, `now − currentDays`, to the audit and notification expiry. If a Super Admin shortens a period, rows created under the longer one are deleted early: a retroactive change (FD-020, AD-7, the task's hard-rule checklist).

A. **Each row is due when its age passes the period of the policy version in force when it was created; the expiry runs per policy segment; `audit.expire` takes only `{keepTargets}` and `notification.expire` gains an optional `createdFrom`** (recommended). The only reading that keeps existing deadlines. Needs FD entry (d) and cross-Unit X2.
B. One cutoff from the current policy, as the contracts say. Simple, retroactive when shortened.
C. Refuse any policy change that shortens the audit or notification period. Prospective, but blocks a legitimate change.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 5 — Closing ISS-141 (the audit bypass any role can use)

`fn_block_mutation()` lets a DELETE on `audit_events` through whenever a GUC any role can set is on.

A. **The bypass also requires `session_user = 'rk_maintenance'`; the new `fn_expire_audit` is executable by `rk_maintenance` only, pins its `search_path`, and the tripwire becomes a passing test** (recommended). Works with today's roles inside an `rk_app` migration; `session_user` cannot be changed by `SET ROLE`. Needs FD entry (c).
B. A dedicated NOLOGIN owner role for the function. Stronger on paper, but `rk_app` migrations cannot create roles or give a function away without becoming able to use that role.
C. Leave it to U41 T-502. Keeps an open S2 past this Unit, which ISS-141 assigns here.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 6 — Originals that never publish

Only published items get `retention_expires_at` (U25), so failed (malware included), rejected, removed and abandoned uploads keep their originals for ever (U24 F9/X4), against FR67.

A. **Every original gets a deadline: failed, rejected and removed items from that event, never-published items from receipt, with the policy in force then; the job stamps it once and deletes on schedule** (recommended). FR67 for every upload; prospective. Part of FD entry (d).
B. Only published items expire (as built). Keeps malware and abandoned uploads indefinitely.
C. Delete failed originals at once. Loses the custody evidence a malware case may need.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 7 — Order of the file deletion and the commit

U25's `purgeOriginal` leaves the file to the caller "after commit"; the task's threat notes worry about "original deleted but bytes remain".

A. **Delete the file inside the item's transaction before commit, a missing file counting as success; a storage error rolls the item back and the next run retries; a head check after commit** (recommended). No orphaned bytes; a commit failure after the delete just repeats harmlessly.
B. After commit, plus a sweep that re-checks deleted originals. Needs a marker column and a second pass.
C. After commit only. Orphans bytes when the delete fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 8 — Purging the stored content of author-deleted records (T-302 F9)

T-302 keeps a soft-deleted or tombstoned review's content stored for ever; T-401 keeps a deleted comment's body when it has no replies; `review_versions` never expire. So today a review hold protects only audit rows and persona links.

A. **Defer the purge to a follow-up after release 1, recorded in an FD entry; the follow-up must check holds through `retention.activeHold` and complete through the deferred-deletion table** (recommended). Nothing is shown meanwhile; the purge needs new worker privileges on content columns and changes to T-302's and T-401's rules. Needs FD entry (b).
B. Build the purge here (scrub content after `restore_until`, expire version rows through a new function). Larger, high-risk change inside two other Units' modules.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 9 — May an account hold expire?

An account hold pauses U39's account deletion, whose identity, directory and moderation steps run only in the web tier (FD-077). An expiry is noticed by the worker, which cannot run them.

A. **Account holds take no expiry time; they end only by staff release in the web, where a release listener resumes U39's steps** (recommended). Every paused step can resume. Part of FD entry (e).
B. Allow expiry; U39 resumes on the next web visit of that account. Deleted accounts are never visited.
C. Allow expiry and let the worker do what it can. Leaves half-deleted accounts.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 10 — What an account hold pauses

A. **The account's deletion, the purge of its drafts and the expiry of its `account:<id>` audit stream; not the expiry of its evidence originals or notifications** (recommended). The worker no longer knows an item's uploader (U24), notifications carry no content, and staff hold the evidence items they need. Part of FD entry (e).
B. Everything the account ever created. Needs the worker to read uploader and persona links again (against U24's PR3 and AD-3).
C. The account deletion only. Drafts and the account's audit trail would still expire under a legal hold.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 11 — Step-up for holds

C3 asks only `holds.manage` for both commands.

A. **Placing needs `holds.manage`; releasing also needs a fresh step-up (purpose `hold.release`)** (recommended). Release is the step that lets deletion proceed; placing only preserves. Cross-Unit X1.
B. Neither (contract as written).
C. Both. Slows the protective action for no gain.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 12 — Checking that a hold's target exists

Retention cannot read other modules' tables (FD-064); `facility_review`, `profile` and `account` have no subject in the task.

A. **Every kind gets a subject with a locking existence check: Review covers `facility_review`, small lock-only subjects in Directory (`profile`) and Account (`account`, web only)** (recommended). A hold never protects nothing; the lock also closes the hold-versus-delete race. Two recorded owned-path additions.
B. Accept unchecked ids for the three kinds. A typo makes a hold that preserves nothing.
C. Allow only evidence, review and comment holds in release 1. Against FD-079's kinds.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 13 — Guarding the demo clock in production

The task's boot assertion refuses to start when `demo_clock` exists in production, but the shared migrations create it in every mode.

A. **Production uses the system clock and never reads the store; the route answers 404; the script refuses; web and worker refuse to start when the row holds a non-zero offset** (recommended). Enforces AD-14 without a second migration set. Needs FD entry (f).
B. Drop the table in a production-only migration. Needs a separate migration set that does not exist.
C. As written. Every production start would fail.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 14 — Who may move the demo clock

A. **Any staff role on an approved device, same-origin requests only, offsets 0 to 3650 days, audited** (recommended). Matches the task and storyboard step 22 (`admin_nadia`).
B. Super Admin only. The storyboard's admin could not run step 22.
C. Anyone in demo mode. Lets any visitor expire demo data.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 15 — Error code for an out-of-range period, and the `hold.active` copy

C3 says `config.out_of_range`; the task says a new `retention.out_of_range`. `errors.hold.active` reads "can't be changed", a refusal FD-079 removed.

A. **Reuse `config.out_of_range` with a field error per field; reword `errors.hold.active` for the duplicate-hold case** (recommended). No new code; the copy matches its only remaining use.
B. Add `retention.out_of_range` and its keys. One more code for the same meaning.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 16 — Warning about a draft only once

The worker cannot update drafts, and a draft's expiry slides on every save.

A. **Warn once per draft and expiry day: the guard is an existing `draft.expiring` outbox row with the same `draftId` and `expiresOnDay`, which the payload gains** (recommended). Uses existing tables; a re-saved draft is warned again before its new expiry. Cross-Unit X2.
B. Rely on the notification dedupe only. Writes an event every hour (fails the "exactly one event" row) and never warns about a second expiry.
C. A new marker table. More grants for the same result.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 17 — Staff notices for holds

The task lists `notif.staff.holdPlaced|holdReleased|bulkExecuted`; C15 routes `hold.changed` to no job, and the staff triage view is deferred (FD-088).

A. **No staff notices in release 1; the keys are not added** (recommended). Follows C15; nothing would show them.
B. Write staff notification rows anyway. Rows nobody reads; the unacknowledged count only grows.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 18 — Which clock the database functions trust

A. **The functions compute "now" as database time plus the demo offset (`fn_app_now()`) and take no time from the caller** (recommended). A caller cannot end holds early or widen a deletion by passing a future time. Part of FD entry (c).
B. The caller passes `now`. Simpler, but a compromised worker could pass a far-future time.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 19 — The worker's privileges on retention tables

The worker holds full DML on `retention_policies` and `retention_bulk_actions`; the job only reads policies.

A. **SELECT only on `retention_policies`, nothing on `retention_bulk_actions`; `retention_policies` and `legal_holds` get guard triggers** (recommended). Least privilege (FD-037); bulk is deferred. Part of FD entry (c).
B. Leave them. A worker bug could rewrite the policy.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 20 — Where the custody log and quarantine list live

Task step 7 puts `custodyLog` and `listQuarantine` in Retention, which would read evidence tables it does not own; C8 gives `evidence.listForStaff` to U36 T-407.

A. **Both queries in the evidence module (`evidence.custodyLog`, `evidence.listForStaff`), built here, with hold summaries from Retention; server actions in `server/actions/retention.ts`; T-407 renders** (recommended). Keeps FD-064 and ADR-002; T-407 gets data before its UI work. C8's `built_by` corrected.
B. In Retention as the task says. Needs an FD-064 exception.
C. Leave both to T-407. The task's acceptance row "Custody VM" would move with them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 21 — An original to expire in the demo (storyboard step 22)

The seed writes no `original` artifact rows (ISS-181), so "e3's original expires" cannot happen on demo data.

A. **The seed writes a private stand-in original (the fixture's bytes) for each published item, and the job marks an item without an original as expired once with `{original: 'absent'}`** (recommended). The demo deletes a real file; old or partial data never loops. Owned-path addition in the seed; cross-Unit X3.
B. Only the absent-original marking. The step shows custody but no file deletion.
C. Change the storyboard. Loses the demonstration of AC7.3.1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 22 — Does a review hold keep the review's evidence?

AC7.3.5 keeps a held record's "encrypted data, evidence and audit records"; the task keys original expiry only on the item's own `hold_id`.

A. **Yes: a review hold also pauses its evidence originals and keeps their audit streams** (recommended). Matches AC7.3.5; cheap (the worker reads `evidence_items.review_id`). Part of FD entry (a).
B. No; staff place a hold on each item too. Easy to miss one.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Assumptions & Open Questions

None.
