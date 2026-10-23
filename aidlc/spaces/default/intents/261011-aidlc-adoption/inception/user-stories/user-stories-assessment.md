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
