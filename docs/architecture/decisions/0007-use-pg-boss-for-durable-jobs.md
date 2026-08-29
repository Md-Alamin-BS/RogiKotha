# ADR 0007: Use PostgreSQL-backed durable jobs

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** evidence, notification, retention and operations requirements

## Decision

Use pg-boss 12.26 for evidence, notification, search-refresh, retention, and maintenance jobs. Handlers are at-least-once and therefore idempotent. Payloads contain opaque IDs and bounded metadata only.

## Consequences

- No Redis service is needed in Phase 1.
- Job state shares PostgreSQL backup/recovery and can be transactionally coordinated through outbox/commit patterns.
- Queue load must be isolated with connection, concurrency, timeout, retry, and dead-letter budgets.
