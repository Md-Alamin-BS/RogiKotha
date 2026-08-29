# ADR 0005: Use a quarantine-first derivative-only evidence pipeline

- **Status:** Accepted with malicious-corpus gate
- **Date:** 2026-08-30
- **Sources:** FD-002, FD-023, FR-FILE-001–009, FR-EVD-001–007

## Decision

Accept JPEG, PNG, and PDF only in Phase 1. Stream originals to private quarantine; validate declared/detected type and resource bounds; scan; re-encode or sanitise; create an immutable derivative; show that derivative to the author; require privacy confirmation; publish only the derivative.

## Consequences

- Original and derivative have separate keys, permissions, hashes, custody, and retention.
- PDF.js is a viewer, not sanitizer. ClamAV is one signal, not proof. The worker/converter has no application credentials or public write policy.
- HEIC and Office formats require later per-format acceptance evidence.
