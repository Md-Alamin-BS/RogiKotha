# ADR 0011: Treat Bengali and English as equal product languages

- **Status:** Accepted
- **Date:** 2026-08-30
- **Sources:** FD-024, internationalisation requirements

## Decision

Bengali and English have equal interface, content-operation, accessibility, test, and release status. Use locale-prefixed routes, checked-in dictionaries, a remembered explicit switch, native formatting, and equivalent state/journey coverage. User content may mix Bengali, English, and Banglish.

## Consequences

- Neither locale is a later translation or partial path.
- Every system-copy change includes both locales or fails validation.
- Typography, wrapping, search, notifications, metadata, and admin surfaces are tested separately in both languages.
