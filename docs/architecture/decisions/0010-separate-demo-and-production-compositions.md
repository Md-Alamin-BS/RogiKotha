# ADR 0010: Separate demo and production compositions

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** FD-007, FD-012, FD-019

## Decision

The USD 0 public demo is synthetic, deterministic, read-only, resettable, and analytics-free. It uses mock service adapters and visibly marked synthetic documents. Production uses real adapters and cannot start without production configuration, persistence, mail, storage, backup, and migration checks.

## Consequences

- Prototype components use the same typed service/view-model contracts as production.
- Fixtures are never imported directly into components.
- Demo state/role/concept switches cannot be enabled on real-user production.
