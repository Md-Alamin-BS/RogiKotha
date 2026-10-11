# ADR 0003: Use Better Auth behind application-owned policy

- **Status:** Accepted with spike
- **Date:** 2026-08-30
- **Sources:** FD-006, FD-013, `docs/planning/03-research-report.md`

## Decision

Use Better Auth 1.6.22 for confirmed email/password, reset, database sessions, secure cookies, and throttling. Application commands—not library callbacks—own authorization, role, ownership, anonymous reveal, and audit rules. Do not enable MFA/passkeys or unrelated plugins in Phase 1.

## Consequences

- The first auth story must prove anti-enumeration, reset, revocation, proxy/origin/cookie configuration, account linking behavior, and current advisory handling.
- Internal account IDs remain stable if the auth adapter changes or later adds factors.
- A failed spike reopens the adapter choice, not the domain model.
