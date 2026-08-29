# ADR 0008: Separate public persona from private identity

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** FD-008, FD-015, FD-016, FD-022

## Decision

Persist immutable public persona snapshots separately from private account linkage. Anonymous aliases are scoped to one review thread and cannot be publicly joined to a normal profile or other anonymous content. Super Admin controls normally-disabled Admin/Moderator reveal capability; every reveal requires a reason and audit event. Disclose the capability only in Privacy Policy/Terms.

## Consequences

- Public projections, analytics, exports, logs, and search never include linkage.
- A display-name change does not rewrite historical attribution.
- Identity access is a dedicated command/query, never a column opportunistically selected by admin pages.
