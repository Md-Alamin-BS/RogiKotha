# ADR 0009: Version bounded runtime configuration and retention

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** FD-004, FD-005, FD-018, FD-020, FD-021

## Decision

Runtime configuration may version copy/translations, taxonomies, optional fields, visibility, report thresholds, and retention defaults. Security/data structure and state machines remain code-owned. Original retention defaults to 90 days and audit/content history to 180 days. Default changes are prospective; existing records require a previewed logged bulk command; legal holds are per-record and logged.

## Consequences

- Config changes carry schema version, actor, reason, effective time, and before/after values.
- The admin UI cannot become an arbitrary workflow/schema builder.
- Retention workers are idempotent and legal-hold aware.
