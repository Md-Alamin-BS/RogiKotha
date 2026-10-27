# Contract Design — questions

Context:
- The system is a modular monolith with two runtimes, the Next.js web app and the pg-boss worker (ADR-0001, ADR-0007). Units integrate in-process through application commands, queries and ports. They also integrate through outbox events and jobs, through shared types in `packages/contracts`, and through the shared database, where each table is written only by its owner (`unit-of-work-dependency.md` § Integration points).
- `docs/implementation/03-routes-and-contracts.md` already lists:
  - the routes;
  - the contracts (actor, error codes);
  - the ports;
  - the command and query catalogue;
  - the outbox events and jobs;
  - the view models.

  This stage turns those lists into the formal contracts, and settles the open points that Domain Design and Units Generation handed to Contract Design.
- Points decided by an earlier decision are not asked again. These include:
  - FD-067 (ports break cycles);
  - FD-070 (worker is in-app only);
  - FD-071..FD-075;
  - `02-data-model.md` §16 note 3 (the account deletion step runs in the web process).

  This stage writes them into the contracts.
- Three points from the last Units Generation review (`review-04.md`) open this stage: one email per outcome, a notification-period port, and recipient ids versus reporter privacy. These are design rules, written into the contracts; Question 15 asks only about the one choice among them.

## Question 1

How are the contracts grouped?

A. One contract per provider component (its commands, queries, ports and events), each listing the Unit edges that use it, plus two cross-cutting contracts: the external HTTP API (`/api/*`) and the outbox events and jobs. About 15 contracts in all (recommended: readable, and every Unit edge maps to exactly one contract)
B. One contract per Unit edge in the dependency graph (about 150, many repeating the same commands)
X. Other (please specify)

[Answer]: A

## Question 2

What is the source of truth for the in-process contracts (commands, queries, ports, view models)?

A. The TypeScript types and zod schemas in `packages/contracts` (inputs `<VerbNoun>Input`, view models, `ErrorCode`), as `01-conventions.md` and `03` already have it. The contract summary carries a shared-schema YAML block per contract that names each operation, its input, its result, its errors and its authorization (recommended: one source, checked by the compiler)
B. Write full OpenAPI specs for the server actions as well, and keep them in step with the zod schemas by hand
X. Other (please specify)

[Answer]: A

## Question 3

Which surface counts as an external API (consumed from outside the server code) and gets an OpenAPI block?

A. The route handlers under `/api/*`, which the browser or another client calls directly: auth, health, evidence upload, preview, artifact and original, search suggest, data-request download and the demo clock. Pages and server actions stay internal contracts (recommended: matches `03` §1)
B. Also document every server action as a public HTTP API
X. Other (please specify)

[Answer]: A

## Question 4

What is the versioning and breaking-change policy?

A. One repository, so a contract change and its consumers change together in one Bolt.
   - Additive changes (a new optional field, a new event) are safe, and consumers ignore unknown fields.
   - A breaking change to a command, port or event first updates the contract summary and names the affected Units. If it touches a hard rule or a data boundary, it also needs an FD entry.
   - Event payloads carry no version number: a breaking change gets a new event name, and the old one is retired.

   (recommended: fits a single-repo monolith with serial Construction)
B. Version every event payload (`v: 1`) and keep old versions readable
X. Other (please specify)

[Answer]: A

## Question 5

What are the error, timeout and retry rules at the boundaries?

A. As in `01-conventions.md` §3 and `03`:
   - Expected failures return `Result` with an `ErrorCode` from `packages/contracts`, and nothing throws across a boundary.
   - Jobs are idempotent by `singletonKey`, retry 5 times with exponential backoff, and then stay failed and visible to staff.
   - The outbox relay is transactional (FD-038).
   - In-process calls have no timeout; only external adapters do (ClamAV 30 s, SMTP).
   - The scanner fails closed (FD-035).

   (recommended: already decided and partly built)
B. Add per-call timeouts and circuit breakers inside the process as well
X. Other (please specify)

[Answer]: A

## Question 6

How does account deletion remove the account itself, given that the worker has no access to `auth_users` (FD-041)?

A. As `02-data-model.md` §16 note 3 already says:
   - The account step runs in the web process inside `dataRequest.delete`, before the worker runs the other participants. It revokes sessions, sets `status = deleted`, replaces the email with a tombstone hash and removes the Better Auth user.
   - The worker imports only per-module step commands, never the user-facing deletion command (`01-conventions.md` §2).

   (recommended: documented already, no new grant)
B. A separate `rk_maintenance` job runs the account step after the worker finishes
C. Give the worker a narrow `DELETE` grant on `auth_users` (conflicts with FD-041)
X. Other (please specify)

[Answer]: A

## Question 7

The de-identify steps of FD-069 must remove account links from columns that are `NOT NULL` today: `submitted_by_account_id`, `claimant_account_id`, `proposed_by_account_id`, `reports.reporter_account_id` and `appeals.appellant_account_id`. How?

A. A forward-only migration makes those columns nullable, and de-identify sets them to `NULL`. Staff views read "restricted" (reporter) or "Deleted account" (the others), never blank. The unique index on reports keeps working, because `NULL`s do not collide (recommended: honest data, no fake rows)
B. Point them at one seeded placeholder "deleted account" row and keep the columns `NOT NULL`
X. Other (please specify)

[Answer]: A

## Question 8

FD-069 says legal holds still apply to de-identification, but `legal_holds.target_kind` cannot point at reports, appeals, submissions, claims or field changes. How do holds cover them?

A. Through an account-level hold. T-309's `hold.place` already lists `account` as a target, so `target_kind` gains `account`. An active account hold pauses the whole deletion, including the Directory and Moderation de-identify steps. Per-row holds on those row types are not added (recommended: a legal matter usually targets a person; small change)
B. Extend `target_kind` with every row type (report, appeal, submission, claim, field change) and check each row
C. These rows take no holds; they are always de-identified (this narrows FD-069)
X. Other (please specify)

[Answer]: A

## Question 9

When an author deletes their own review or comment while it is under a legal hold, what happens?

A. The deletion looks normal to the author: the item disappears from every public view and from the author's list, and its data is kept until the hold is released. Then the normal deletion runs. The author is never told a hold exists (recommended: a hold is a staff matter and must not tip off the subject; matches "holds pause deletion for that record only")
B. The deletion is refused with a plain message that the item cannot be deleted right now
X. Other (please specify)

[Answer]: A

## Question 10

How does Moderation learn about a repeat episode (AC6.1.4), given that `rk_worker` has no grants on the moderation tables?

A. Review stores the repeat-episode flag when the review is published (web tier), and Moderation reads it through the existing `ModerationSignals` port when the queue is read. No worker grant is needed (recommended)
B. The worker opens a case on `review.published`, which needs new worker grants on the moderation tables
X. Other (please specify)

[Answer]: B

## Question 11

The worker sends no email (FD-070). What happens to the "your export is ready" email?

A. No export-ready email in the demo. The in-app notification links to the download, and the data-request panel shows the status (recommended: simplest; keeps the worker boundary)
B. The web tier queues the email the next time the account's status query sees the export ready
X. Other (please specify)

[Answer]: A

## Question 12

FD-068 makes `retention_policies` the only source of retention periods. What happens to the retention block in the runtime configuration?

A. Drop it from the configuration values. The staff console shows the periods from `retention_policies` through Retention's query (recommended: one source, nothing to keep in step)
B. Keep it as a read-only mirror, refreshed whenever a policy changes
X. Other (please specify)

[Answer]: A

## Question 13

`config.applied` is listed as an outbox event whose only consumer is the audit trail. Notification depends on Administration, so Administration writing Notification's outbox would create a cycle. How is it recorded?

A. Only as a row in Administration's own audit stream; there is no outbox event (recommended: no consumer is lost)
B. Keep it as an outbox event, through a port Notification implements
X. Other (please specify)

[Answer]: B

## Question 14

Search filters by "has evidence" and evidence group, but `search_documents` has no evidence column. Where does search get it?

A. `search.refresh` writes an evidence-presence column into `search_documents` when it indexes a review, and `evidence.stateChanged` also triggers a refresh. Queries stay inside Search (recommended: fast, and needs no cross-module read at query time; one migration)
B. Search reads evidence presence from Evidence at query time, through a query (the Domain Design default)
X. Other (please specify)

[Answer]: A

## Question 15

The Beta metrics (FD-066) count "open and closed reports". Counted how?

A. Open and closed cases, plus the total number of report rows as a separate figure, each with its label (recommended: cases are what staff act on; the row count shows volume)
B. Report rows only
X. Other (please specify)

[Answer]: A

## Follow-up questions

The ambiguity check of answers 1–15 against the data model, the worker grants (`0005_grants_part2.sql`) and the Units review (`review-04.md`) left six points that no earlier decision settles.

## Question 16

Account deletion (Question 6, FD-069): the worker has no privilege on `persona_links`, `profile_submissions`/claims/field changes, `reports.reporter_account_id`, `appeals`, `review_drafts`, `facility_reviews` or `reactions`. Where do the deletion steps that touch them run?

A. In the web process, inside `dataRequest.delete`, in one transaction with the account step: account, identity, directory, moderation, review drafts, facility reviews and reactions. The worker's `data.delete` job then runs only the steps its grants already cover: evidence files, notifications, search, and the review and comment tombstones. If a web step fails, the whole request rolls back and nothing is deleted; worker steps are retried by the job. No new worker grants; CR-006's FD-050 review judges the worker's grants against this split (recommended: keeps least privilege, and the slow file and index work stays asynchronous)
B. Grant the worker the privileges those steps need and run every step except the account step in `data.delete`
C. Run the whole deletion in the web process, with no `data.delete` job
X. Other (please specify)

[Answer]: A

## Question 17

A legal hold on one review or comment (not on the account) keeps that record when its author deletes the account. The identity step deletes the author's persona links. Is the held record's persona link kept?

A. Yes: the persona link of a held review or comment is kept until the hold ends, and then deleted by the normal schedule. Everything else is de-identified as usual (recommended: a legal matter about a post usually needs to know who wrote it, and a hold exists to preserve that)
B. No: the link is deleted with the others; the held record is kept but de-identified
X. Other (please specify)

[Answer]: A

## Question 18

FR87 lists "reports" among in-app events. Does the person who filed a report get a notice about it (received, decided)?

A. No reporter notices in the demo: only the affected author gets "Content reported" and the decision notice (FR80). A reporter's account id then never appears in any outbox payload (recommended: the reporter column stays restricted end to end)
B. Yes, an in-app notice to the reporter, written by the web tier directly (not through the outbox), so the id never enters a payload the worker reads
C. Yes, through the outbox like every other notice (the reporter's id is then in a payload the worker reads)
X. Other (please specify)

[Answer]: A

## Question 19

Question 10 has the worker open a case for a review that repeats the same episode (AC6.1.4). What does the moderator see about the earlier review?

A. Only the flag: "Possible repetition of an earlier account by the same author", with no link to the earlier review. The event carries a flag, not the earlier review's id (recommended: two reviews by one author, one of them anonymous, are never linked, FD-015)
B. The earlier review's public id, so the moderator can compare the two
C. The earlier review as "restricted", revealed only through `identity.reveal` with step-up, logged
X. Other (please specify)

[Answer]: A

## Question 20

One email per moderation outcome (`review-04.md` R-21): today `review.setState` queues the hide and restore email, so comment and facility-review outcomes get none, a removal gets none, and an appeal that restores a review gets two. Who queues the moderation email?

A. The moderation command that decides the outcome: `report.file` (auto-hide), `moderation.decide`, `moderation.restore` and `appeal.decide` each queue exactly one email to the affected author, for every target kind; `setState` never queues email. An author's own delete or restore sends none. T-302 then queues no email, and its FD-075 row moves to T-403 and T-404 (recommended: one place per outcome, nothing double-counts)
B. `setState` keeps queueing for reviews, and the moderation commands queue only for outcomes `setState` did not email
X. Other (please specify)

[Answer]: A

## Question 21

FD-069 removes the account link from the submissions, claims and field changes of a deleted account. A doctor or facility that account claimed also carries `claimed_by_account_id`. What happens to it?

A. Cleared: the claim ends, the profile shows as unclaimed, and the claim row stays de-identified as history (recommended: no one holds field-edit rights for a deleted account)
B. Kept until staff decide what to do with the profile
X. Other (please specify)

[Answer]: A

## Revision 2026-10-27

## Question 22

How does the contract summary carry the 2026-10-27 revisions (FD-088 staff narrowing, FD-090 grants, FD-091 redesign with the new U45)?

A. Add a revision section: mark the deferred appeal, bulk and triage operations and events as "not built in release 1, kept specified for later"; mark the two open questions as settled by FD-090; note that U45 has no runtime contract and C14 is unchanged (recommended)
B. Remove the deferred operations from the contracts
X. Other (please specify)

[Answer]: A
