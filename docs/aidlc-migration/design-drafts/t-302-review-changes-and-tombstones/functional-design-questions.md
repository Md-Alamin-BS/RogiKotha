# Functional Design questions — U22 `t-302-review-changes-and-tombstones`

## Context

- Unit U22 (kind `library`, size L, not marked high risk) delivers T-302 (`docs/implementation/tasks/T-302-review-changes-and-tombstones.md`, with its owner-decision and Contract Design amendments) for US6.2 (AC6.2.5) and US6.3. It depends on U21 T-301, U34 T-405 (build order only since FD-087) and U3 T-010.
- Read: `unit-of-work.md` (U22 and the open points naming it), `unit-of-work-dependency.md`, `stories.md` (US6.2, US6.3, US10.3), `requirements.md` (FR13, FR55, FR69–FR71), `contract-summary.md` (C3, C9, C15), `decision-log.md` up to FD-094, `01-conventions.md` §2–§5 and §10, `02-data-model.md` §0, §6, §8, §10, §16, §17, `03-routes-and-contracts.md` §4, §5, T-410 step 3, the schema, repository stub, fakes and seed on `main`, the prototype (`renderAccount`, `renderMine`, the follow-up and later-care fixtures, the comment tombstone copy), the U21, U14, U11, U10 and U8 drafts, ISS-237 and ISS-294, and `OWNER-REVIEW-QUEUE.md`.
- Every question below was decided by the agent under the owner's no-questions instruction of 2026-10-29, by the recommended option, which is listed first. Each stays open to the owner's change in `OWNER-REVIEW-QUEUE.md`; `functional-spec.md` § 14 says what changes if they choose differently.

## Settled before this stage

- **FD-049**: a soft delete keeps the stored state and sets `deleted_at` and `restore_until`; no enum value, no migration.
- **FD-073, FD-079**: this Unit builds no hold check; a held delete looks exactly like an unheld one to the author; T-309 adds the check later.
- **FD-087**: `setState`, `delete` and `restore` queue no email and create no notice; the deciding moderation command does.
- **FD-092**: the worker writes no version row.
- **FD-093**: placement under the boundary matrix; `database` never imports `domain`.
- **U21's design**: the state machine with the domain-only `deleted`, `domainStateOf`, `toExperiencePage`, `kind: 'experience'`, the persona as audit actor (its FD entry (d)), `identity.ownsAnyPersona`, R4 and R6 handed here.
- **Owner answers**: counts only; masked own email; "Former member"; release 1 settings narrowed; FR46 deferred; no public anonymity caveat.

## Settled in this design without a question

- One row lock per command (`FOR UPDATE`), version row before the content update, a conditional restore update (`functional-spec.md` § 8).
- Months are taken in Bangladesh time (UTC+6).
- The tombstone and redaction copy follow the prototype's comment tombstone wording; Bengali is flagged for review (FD-042).
- A no-op `correct` writes nothing; `setStateOn` is idempotent for repeated hides and audits threshold hides as `system` (FD-086).
- `DiscussionPresence` counts a published comment or a comment tombstone.
- The tombstone result is `noindex`.

## Questions

### Question 1 — Follow-up display order

The task says newest first with the first marked current. The prototype (`renderAccount`), its note "The newest update is the current one. Older updates stay in place so the story still reads in order." and FR70 ("Follow-ups appear chronologically below the original review; the newest reported status is summarized at the top") put them in date order, with the newest marked current.

A. **Date order below the story (oldest first), the newest `follow_up` marked current and repeated as a "Most recent status" summary at the top** (recommended). Matches the prototype, its copy and FR70; the task's acceptance row is rewritten to "spine May, Jun, Aug; current Aug". The author still cannot pin anything.
B. Newest first, current on the first (the task's step 1). The prototype's spine and its note would have to change; FR70's "chronologically below the original" reads oddly.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 2 — Which changes are material

The task treats title, story, sections and claims as material, tags as not material, and cannot change sentiment or outcome. AC6.3.2 says a changed diagnosis, treatment or outcome becomes a dated correction.

A. **Material: story, sections, Reviewer's labels, sentiment, outcome, and condition, treatment and medicine tags. Not material: the title and symptom tags. `correct` can change sentiment and outcome** (recommended). Meets AC6.3.2 (outcome and diagnosis or treatment tags feed summaries, condition pages and related cards) and AC6.3.1 (a title fix is presentation).
B. The task's list (title, story, sections, claims; tags never; no sentiment or outcome edits). An outcome change is impossible, which fails AC6.3.2.
C. Every change is material. A title typo would need a reason and a public correction entry; AC6.3.1 fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 3 — When "Edited" shows

The task's acceptance row shows "Edited" only after a material edit; AC6.3.1 shows it after a non-substantive edit; the task's own `isEdited` is `version > 1`, which a redaction would also trigger.

A. **"Edited" with the month of the latest author edit, after every accepted author edit, material or not; a moderator's redaction never sets it** (recommended). Meets AC6.3.1 and AC6.3.2; a redaction is shown by its own label, so it is never mistaken for the author's change.
B. Only after material edits (the task row). AC6.3.1 fails as written.
C. Whenever `version > 1`. A redaction would read as an author edit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 4 — What the public sees of earlier versions

AC6.3.2 says "the original account stays readable, and the prior version is retained privately"; FR69 says material changes "become dated corrections/follow-ups; the original account remains understandable".

A. **The page shows the current text, "Edited" and, for a material change, the author's dated reason; earlier versions are private to the author and `content.act` staff** (recommended; FD entry (c)). An author who removes their own private detail is not republished; the dated reason keeps the account understandable. The AC wording is read as "the account stays up and every material change is dated and explained".
B. A public "Show original" link on the page. Republishes text an author may have removed for privacy reasons, and doubles the moderation surface.
C. Lock material fields after publication; changes only through follow-ups (FR69 literally). Summaries could never be corrected, and an honest outcome correction would sit beside a wrong outcome flag.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 5 — Shape of the redaction input

The task gives `review.redact` ranges (`{field, start, end}`) and refuses replacement text; C9 gives it `replacements: [{from, to}]`.

A. **Ranges only; any key that could carry text, or any field outside the list, is refused with `moderation.narrative_locked`; C9 is corrected** (recommended; FD entry (a)). The only output is the fixed token, so a moderator cannot write words into an author's account.
B. C9's `{from, to}` pairs with `to` checked against the token. Still lets `from` match text beyond the identifier, and the check is easier to get wrong than a shape that cannot carry text.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 6 — Which texts moderation can redact

The task lists title, story and sections. Follow-ups and later care are public text by the same author and can hold a phone number or a third person's name.

A. **Title, story, each section, and each follow-up's body and later-provider text, named by the follow-up's id** (recommended). Moderation can remove an identifier wherever the author wrote it, without hiding the whole review. The version row keeps the touched follow-ups' text privately.
B. The task's three fields only. A follow-up with an identifier can only be handled by hiding or removing the whole review.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 7 — Version rows: what they hold and whom they name

U21 R6 handed this Unit the `review_versions.actor_id` question (today's comment says it holds an account id). The task says a version row holds the previous snapshot.

A. **Each row holds the content before the change (the task's convention), with `actor_id` = the author's persona id, the moderator's staff account id, or null for system; only the schema comment changes, no migration** (recommended; FD entry (d)). No second link between an anonymous review and its account; a redaction's row keeps the pre-redaction text for an appeal; the seed's `publish` rows are left out of history (F14).
B. Each row holds the content after the change, with a lazily written version 1 row. Two rows on the first edit, and the pre-redaction text would sit only in an older row.
C. Drop `actor_id` by migration. Loses who made a moderator's change; needs a migration and a pin change for no gain over A.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 8 — Deleting and restoring while a review is under moderation

§17 lets an author delete from `published` and (with discussion) from `hidden`; U21 R4 asked this Unit to add the `hidden` delete without discussion. Nothing covers `hidden_pending_review`. The threat notes forbid "delete to dodge a case, then restore after it closes".

A. **The author may delete from published, hidden pending review or hidden; a review that was hidden or pending review when deleted can never be restored by its author (`review.not_restorable`)** (recommended; FD entry (e)). An author can always withdraw their account of events; a delete can never undo a moderation decision.
B. Refuse delete while under moderation (`review.not_editable`). The author must wait for the case before withdrawing their own account.
C. Allow delete, and let a restore return the review to its hidden state. Needs the prior state stored (the tombstone overwrites it) and lets the review re-enter the case later.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 9 — Published reviews when an account is deleted

C9, T-410 step 3 and FD-077's "review tombstones" tombstone or soft-delete every review of a deleted account. FR13 (Must) and AC10.3.3 say retained public contributions are de-identified, not deleted; the prototype's note says "Public contributions remain in their anonymised form"; the owner chose "Former member" for deleted named and pseudonymous personas; FD-069 keeps an account's submissions, claims, reports and appeals de-identified "as retained reviews are". The worker, which C9 gives the review step, cannot read `persona_links` and so cannot find an account's reviews (F3).

A. **Keep published reviews and facility feedback; Identity de-identifies them ("Former member", aliases unchanged); the review step deletes the account's drafts only, in the web transaction; no worker entry** (recommended; FD entry (b)). Meets FR13, AC10.3.3, the prototype and the owner's answer; removes the worker problem; an author who wants a review gone deletes it first.
B. C9 as written: tombstone with discussion, else soft delete, in the worker. Fails FR13 and AC10.3.3; needs the web tier to pass review ids to the worker before the identity step; "Former member" would then show only on held rows.
C. Ask the person at deletion time whether to keep or delete their reviews. A new screen, copy and plan branch that no Unit builds in release 1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 10 — What a moderator removal shows

`remove` leaves a `deleted_tombstone`, the same stored state as an author's delete with discussion.

A. **The same tombstone result with `removedBy: 'moderation'` and its own message ("This experience was removed by moderators."), the thread kept** (recommended). Readers of the discussion understand why the account is gone; no identity or narrative is shown.
B. `not_found` for a removal. The thread's replies would lose their context, and the C9 removal would look like a broken link.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 11 — The moderation cells this Unit builds

U21 R4 left `hidden_pending_review --remove-->` to U33 T-404, and FR71 says an Admin may restore an Admin-removed item. `setState`, where both cells live, is built here.

A. **Build both now: remove from hidden pending review, and restore of a moderator removal (only when `restore_until` is null)** (recommended). `setState` owns every cell its callers use; U32 and U33 add no cell to a shared file.
B. Leave both to U33 T-404, which then edits `review-state.ts` and `set-state.ts` again.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 12 — Which id the inputs carry

The task names every input `reviewId`. Pages hold public ids; moderation cases and deletion plans hold internal ids.

A. **Author commands and `getHistory` take the public id; `setStateOn`, `redactOn` and `deletionStepOn` take internal ids and are never server actions** (recommended). No internal id in a URL; internal callers need no extra lookup.
B. Internal ids everywhere. Pages would need the internal id in their view models, against 03 §2.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 13 — A limit on follow-ups and corrections

The task sets none. Each call writes an outbox row and a search refresh.

A. **30 follow-ups and corrections together per account per 24 hours, a code constant until U41 T-502** (recommended). Far above honest use; stops a script; no new runtime setting (release 1 settings narrowed).
B. No limit. Cheap to flood events and search refreshes.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

### Question 14 — Events for facility feedback delete and restore

U21's facility publish writes no outbox event (its BR8.3); search counts a branch's facility feedback (T-205).

A. **No event, mirroring the facility publish; the stale branch count is a finding for U18 T-205** (recommended). Keeps facility feedback out of every review event, as its publish does.
B. Emit `facility.changed {id}` on delete and restore. Consistent search counts, but the publish would need the same event, which is U21's file.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Assumptions & Open Questions

None.
