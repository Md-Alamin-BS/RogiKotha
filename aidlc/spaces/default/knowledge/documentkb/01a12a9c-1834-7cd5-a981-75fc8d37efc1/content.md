# ADR 0001: Use a ports-and-adapters modular monolith

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** `docs/planning/04-architecture-options.md`, FD-010

## Decision

Use a TypeScript ports-and-adapters modular monolith with a separately runnable evidence worker. Domain/application packages are framework-independent. Next.js, PostgreSQL, storage, mail, scanner, converter, analytics, mocks, and the worker are adapters.

## Consequences

- One founder gets one language, transaction boundary, and deployable codebase.
- Module ownership and inward dependencies are mandatory; direct cross-module table writes are prohibited.
- A separate Fastify API is the first extraction path, not a Phase 1 prerequisite.

## Rejected alternatives

- Separate web/API services now: more contracts, deployments, and failure modes without a confirmed client/scaling need.
- Django/Python backend now: no Phase 1 Python-only capability offsets the second ecosystem.
