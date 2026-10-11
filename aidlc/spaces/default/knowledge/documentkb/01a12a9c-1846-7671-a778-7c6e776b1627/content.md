# ADR 0004: Use PostgreSQL search first

- **Status:** Accepted with relevance gate
- **Date:** 2026-08-30
- **Sources:** FR-SRCH-001–008, FR-TAG-001–003, FD-024

## Decision

Use PostgreSQL full-text search, `pg_trgm`, normalised keys, and curated Bengali/English/Banglish aliases. Preserve originals. Exact native/registration matches outrank aliases and fuzzy matches. Apply publication filters before ranking and never rank by sentiment, outcome, evidence, or reactions.

## Consequences

- A local bilingual relevance corpus is a release test.
- Search remains cheap and transactionally consistent.
- An external search adapter is introduced only after measured relevance/latency failure.
