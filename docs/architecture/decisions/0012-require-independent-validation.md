# ADR 0012: Require independent validation

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** project independent-validation rule

## Decision

No implementing session may be the only validator. Validators inspect the actual diff, tests, and acceptance evidence and return PASS, PASS WITH FOLLOW-UP, or FAIL. Security, privacy, authentication, evidence, moderation, deletion, retention, and legal-response work requires cross-vendor validation, automated tests, written risk review, and human approval.

## Consequences

- Backlog tasks name separate implementer/validator models.
- Validation output is stored with the task/status record.
- A summary without diff/test inspection cannot close work.
