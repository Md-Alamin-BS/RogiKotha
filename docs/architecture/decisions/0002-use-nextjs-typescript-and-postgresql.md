# ADR 0002: Use Next.js, TypeScript, and PostgreSQL

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** `docs/planning/03-research-report.md` (on branch `archive/full-project-2026-11-09`), `docs/status/dependency-check-log.md`

## Decision

Use Node.js 24 LTS, patched Next.js 16.3, React 19.2, strict TypeScript 6.0, PostgreSQL 18.6, and Drizzle 0.45 for typed SQL schema/migrations. Pin exact compatible patches in the first lockfile after an implementation-day advisory check.

## Consequences

- Server rendering, locale routes, UI, commands, worker contracts, and tests share TypeScript types.
- PostgreSQL owns transactional truth; SQL migrations remain reviewable and forward-only in production.
- Framework/database rows never cross into domain or UI contracts.
