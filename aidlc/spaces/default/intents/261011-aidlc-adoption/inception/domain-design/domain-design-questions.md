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
