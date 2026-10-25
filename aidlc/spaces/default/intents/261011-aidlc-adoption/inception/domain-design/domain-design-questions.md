# Domain Design — questions

Context:
- The architecture is already decided: a ports-and-adapters modular monolith (ADR-0001, `ARCHITECTURE-SPINE.md`).
- The 13 module names are fixed in `01-conventions.md` §2.
- The data model is in `02-data-model.md`; its 58 tables match the code on `main`.

This stage writes the component catalogue AI-DLC needs, so four ownership points must be settled first.

## Question 1

Which building blocks are the components?

A. The 13 fixed domain modules (account, identity, directory, taxonomy, review, evidence, community, moderation, notification, search, administration, retention, data-requests). `apps/web`, `apps/worker`, `packages/adapters` and `packages/database` are where components run or plug in (deployment and infrastructure), not components themselves. Units Generation decides how they are grouped (recommended: matches the conventions and the spine's rule that every entity has one owning module)
B. Fewer components: fold retention into evidence and data-requests into account
X. Other (please specify)

[Answer]: A

## Question 2

Who owns the retention entities (`retention_policies`, `legal_holds`, `retention_bulk_actions`)? `02-data-model.md` lists them under Evidence (§7), but the contracts expose them as `retention.*` commands. Legal holds also cover reviews and comments, not just evidence (FR86, FD-021).

A. The Retention component owns them; Evidence and Review call it to check holds and expiry (recommended: matches the contracts and covers non-evidence holds)
B. The Evidence component owns them, as the data model section places them
X. Other (please specify)

[Answer]: A

## Question 3

Who owns the cross-cutting records? `audit_events` is written by every module but sits under Moderation in the data model (§9). `outbox_events` is written by every module in the same transaction as the change, and sits under Notification (§12).

A. Administration owns the AuditEvent (AD-10 audit; every module appends through one audit port; moderation's case timeline is a stream within it), and Notification owns the OutboxEvent as the data model has it (recommended)
B. Keep both exactly where the data model places them (AuditEvent in Moderation, OutboxEvent in Notification)
X. Other (please specify)

[Answer]: A

## Question 4

"Beta metrics" on the staff dashboard (FR103) were left open. No source defines them, and analytics is off in the demo (FD-019).

A. Show aggregate counts computed from the product's own tables, with no analytics and no per-user data: accounts, published reviews, open and closed reports, evidence processed or failed. Administration owns the view (recommended)
B. Defer Beta metrics from the demo (record a decision)
X. Other (please specify)

[Answer]: A

## Follow-up questions from the architect's draft

## Question 5

Some modules need data from a module that already depends on them (the dashboard counts, the profile page's experience stats, the hold check on reviews and comments, and so on). Calling each other directly would create cycles. How should those nine places be handled?

A. The lower module declares a port (an interface) and the higher module implements it, so the dependency graph stays one-way (recommended: the standard ports-and-adapters fix; reversible)
B. Allow the cycles and record them as deliberate
C. Build those read-only views in the web app's route code instead of inside the modules
X. Other (please specify)

[Answer]: A

## Question 6

Retention periods are stored twice: in the runtime configuration (`config_versions`) and in `retention_policies`, which Retention owns (FD-064). Which is the source of truth?

A. `retention_policies` only; the configuration block becomes a read-only mirror or is dropped (recommended)
B. The runtime configuration; `retention_policies` only records history
X. Other (please specify)

[Answer]: A

## Question 7

When an account is deleted, the plan in `03-routes-and-contracts.md` has no step for the provider submissions, claims and field changes it made (Directory), or for the reports and appeals it filed (Moderation). What happens to them?

A. Keep the rows and de-identify them: remove the link to the account, as retained reviews are (FR-USER-004); legal holds still apply (recommended)
B. Delete them
C. Keep them unchanged
X. Other (please specify)

[Answer]: A

## Question 8

Emails for events that start in the worker (for example "your evidence finished processing") need the author's address, but the worker may not read accounts (FD-041). How should the address reach it?

A. The web-tier command that starts the work stores the author's encrypted contact with the pending notification, so the worker never reads accounts (recommended)
B. Worker-started events create in-app notifications only, with no email
C. Give the worker a narrow read grant (conflicts with FD-041)
X. Other (please specify)

[Answer]: B
