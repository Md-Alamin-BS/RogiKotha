# ADR 0013: Orchestrate deletion across owning modules

Status: Accepted  
Date: 2026-08-30

## Context

Account deletion, author deletion, moderation removal, evidence retention, public discussion context and legal holds have different rules. A database cascade or one generic delete service could erase held material, leave public/search copies, or mutate another module's records outside its invariants.

## Decision

Represent deletion as an idempotent application-level plan. The requesting workflow asks each owning module for a scoped action: physical delete, de-identify, tombstone, hide/remove from public projection, retain until its deadline, or retain under legal hold. Each module executes only its own command and reports a result. Public visibility is independent from preservation. The orchestration records plan version, actor/request, per-module outcome and retry state.

## Consequences

- Cross-module deletion is observable, testable and safely retryable.
- Legal holds cannot be bypassed by foreign-key cascades.
- More coordination code and clock/partial-failure tests are required.
- Database foreign keys may still protect integrity, but destructive cascades across aggregate owners are prohibited.

## Validation

Use held/unheld, discussion/no-discussion, public/private, partial-failure and repeated-command scenarios. Inspect database, object storage, public projection, search/cache and audit outcomes independently.
