# ADR 0006: Use a storage port and conditionally adopt Garage

- **Status:** Accepted architecture; implementation conditional
- **Date:** 2026-08-30
- **Sources:** FD-007, `docs/planning/03-research-report.md` (on branch `archive/full-project-2026-11-09`)

## Decision

Domain/application code uses a narrow blob-storage port. Demo uses static/in-memory data; local development uses filesystem storage. Production may use Garage 2.3.0 after exact SDK-operation, failure, upgrade, licence, and restore tests. Another S3-compatible implementation is the fallback.

## Consequences

- No domain record stores provider-specific public URLs or ACL assumptions.
- One-node Garage is not redundancy and never substitutes for off-host backup.
- MinIO Community Edition is rejected for new work because its official repository is archived.
