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

[Answer]:

## Question 14

Search filters by "has evidence" and evidence group, but `search_documents` has no evidence column. Where does search get it?

A. `search.refresh` writes an evidence-presence column into `search_documents` when it indexes a review, and `evidence.stateChanged` also triggers a refresh. Queries stay inside Search (recommended: fast, and needs no cross-module read at query time; one migration)
B. Search reads evidence presence from Evidence at query time, through a query (the Domain Design default)
X. Other (please specify)

[Answer]:

## Question 15

The Beta metrics (FD-066) count "open and closed reports". Counted how?

A. Open and closed cases, plus the total number of report rows as a separate figure, each with its label (recommended: cases are what staff act on; the row count shows volume)
B. Report rows only
X. Other (please specify)

[Answer]:
