# User Stories — assessment

## Decision

Execute.

## Rationale

- RogiKotha is user-facing throughout: patients and caregivers write and read accounts, providers claim profiles, and staff moderate, configure and handle evidence. Several personas with conflicting interests (reviewer vs reported provider, reporter vs reported person) share every surface.
- The business rules are dense and safety-relevant (anonymity, evidence privacy, moderation thresholds, retention and holds), so acceptance criteria per story are what the Construction Units will test against.
- An approved backlog already exists (`docs/planning/08-product-backlog.md`: 34 stories in 12 epics). This stage transcribes it, keeps the original story IDs, and adds what AI-DLC needs: stable `US` keys, Given/When/Then criteria with `AC` keys, MoSCoW priority, demo status, and requirement traceability against `requirements.md`.

## Factors considered

- Project type: brownfield continuation; Phase 0 foundation merged on `main`.
- User-facing scope: patient app (`/en`, `/bn`) and staff console (`/admin`), both locales equal (FD-024).
- Complexity signals: 115 requirements, 59 FD decisions, six high-risk areas (auth, identity, evidence, moderation, retention, deletion).
- Skipping this stage triggers a known engine bug (#2282) and leaves Units Generation without a story map.

## Where stories add the most value

- Anonymity and identity reveal (FD-015, FD-016, FD-022).
- Evidence intake, privacy preview and the processed viewer (FD-023, FD-036).
- Reporting thresholds and bounded moderation actions (FD-017, FR-MOD-003).
- Retention, legal holds, export and deletion (FD-004, FD-020, FD-021, FD-035).

## Revision 2026-10-27

Re-run after the Requirements Analysis revision. One new story, US2.4 (NFR13, FD-091), brings the set to 35 stories. AC2.2.1 is retired. The FD-088 deferrals are marked on AC7.3.3, AC7.3.4, AC9.3.1, AC9.3.2, AC11.2.3 and AC11.2.4, and noted on AC9.2.1, AC9.3.3, AC10.1.1 and AC11.2.1. No key was renumbered.
