# Unit dependencies — RogiKotha demo build

Topology only: which Unit needs which. The order of work and the critical path are Delivery Planning's decisions. Dependencies come from each source task file's "Depends on" row (merged work removed, as it is the baseline), plus these structural rules:

- CR-009 rewrites every import in `packages/database/src`, so the other database-touching change requests and T-010 depend on it.
- T-010 adds boundary lint, the 80% coverage floor and CI (D10). Every feature Unit (T-xxx) depends on it, so feature code is written under those checks. Change requests are exempt: they fix merged baseline code under the existing `pnpm check` gate, and CR-004 touches no package T-010 adds rules for.
- CR-011 makes the outbox relay transactional (FD-038). It is due before the first real job handler, so Units that add job handlers (T-101, T-205, T-304, T-309, T-405, T-410) depend on it.
- CR-012, the storyboard and seed correction (FD-039), precedes the Units whose acceptance text uses the corrected data (T-106, T-401, T-409).
- T-010 depends on CR-007 because T-010's CI runs `pnpm test:int`, which hangs until CR-007 makes the integration-test reset deterministic.
- Owner decisions add these edges: T-101 → CR-006 and CR-011, as T-101 builds the `mail.send` handler (FD-071); T-309 → T-302 and T-401, as T-309 builds their hold checks (FD-073); T-410 → T-204 and T-404, as their de-identify commands are deletion steps (FD-069), and → T-205, whose search module its search step uses; T-302, T-401, T-403 and T-404 → T-405, as they queue their own email through it (FD-075).
- Validation Units close over what they check: T-503 → CR-004 (its live-region spec asserts CR-004's announcements), T-504 → T-106 (its task file depends on every task T-001..T-410), and T-505 → T-502, T-503, T-504.
- FD-058 adds no edge: T-101 reads the brute-force settings through the `ConfigProvider` port with the FD-063 defaults, and writes an outbox event for the in-app notice, so T-105 and T-405, which come after T-101, register the keys and consume the event (FD-072).

Built from `components.md` (Domain Design: component dependencies) and `requirements.md` and `stories.md`.

## Dependency DAG

```yaml
units:
  - name: cr-009-database-extensionless-imports
    kind: library
    depends_on: []
  - name: cr-007-int-test-reset-determinism
    kind: packaging
    depends_on: [cr-009-database-extensionless-imports]
  - name: t-010-boundary-lint-and-ci
    kind: packaging
    depends_on: [cr-009-database-extensionless-imports, cr-007-int-test-reset-determinism]
  - name: cr-011-queue-dedup-reset-and-quiet-env
    kind: library
    depends_on: [cr-009-database-extensionless-imports]
  - name: cr-006-worker-auth-users-grant
    kind: library
    depends_on: [cr-009-database-extensionless-imports]
  - name: cr-012-storyboard-seed-correction
    kind: packaging
    depends_on: [cr-009-database-extensionless-imports]
  - name: cr-004-live-region-announcements
    kind: ui
    depends_on: []
  - name: t-101-better-auth-adapter
    kind: library
    depends_on: [cr-006-worker-auth-users-grant, cr-011-queue-dedup-reset-and-quiet-env, t-010-boundary-lint-and-ci]
  - name: t-102-patient-auth-screens
    kind: ui
    depends_on: [t-101-better-auth-adapter, t-010-boundary-lint-and-ci]
  - name: t-103-staff-access-and-devices
    kind: library
    depends_on: [t-101-better-auth-adapter, t-010-boundary-lint-and-ci]
  - name: t-104-identity-module
    kind: library
    depends_on: [t-101-better-auth-adapter, t-103-staff-access-and-devices, t-010-boundary-lint-and-ci]
  - name: t-105-runtime-configuration
    kind: library
    depends_on: [t-103-staff-access-and-devices, t-010-boundary-lint-and-ci]
  - name: t-106-auth-identity-validation
    kind: spec
    depends_on: [t-101-better-auth-adapter, t-102-patient-auth-screens, t-103-staff-access-and-devices, t-104-identity-module, t-105-runtime-configuration, cr-012-storyboard-seed-correction]
  - name: t-201-directory-and-taxonomy-modules
    kind: library
    depends_on: [t-010-boundary-lint-and-ci]
  - name: t-202-doctor-index-and-profile
    kind: ui
    depends_on: [t-201-directory-and-taxonomy-modules, t-010-boundary-lint-and-ci]
  - name: t-203-facility-and-condition-pages
    kind: ui
    depends_on: [t-201-directory-and-taxonomy-modules, t-202-doctor-index-and-profile, t-010-boundary-lint-and-ci]
  - name: t-204-provider-submission-claim-field-change
    kind: library
    depends_on: [t-201-directory-and-taxonomy-modules, t-101-better-auth-adapter, t-103-staff-access-and-devices, t-105-runtime-configuration, t-010-boundary-lint-and-ci]
  - name: t-205-search-module
    kind: library
    depends_on: [t-201-directory-and-taxonomy-modules, t-204-provider-submission-claim-field-change, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env]
  - name: t-206-search-page
    kind: ui
    depends_on: [t-205-search-module, t-202-doctor-index-and-profile, t-203-facility-and-condition-pages, t-010-boundary-lint-and-ci]
  - name: t-207-discover-emergency-about
    kind: ui
    depends_on: [t-202-doctor-index-and-profile, t-203-facility-and-condition-pages, t-206-search-page, t-201-directory-and-taxonomy-modules, t-010-boundary-lint-and-ci]
  - name: t-301-review-module-core
    kind: library
    depends_on: [t-104-identity-module, t-105-runtime-configuration, t-201-directory-and-taxonomy-modules, t-010-boundary-lint-and-ci]
  - name: t-302-review-changes-and-tombstones
    kind: library
    depends_on: [t-301-review-module-core, t-405-notifications, t-010-boundary-lint-and-ci]
  - name: t-303-evidence-intake
    kind: library
    depends_on: [t-101-better-auth-adapter, t-010-boundary-lint-and-ci]
  - name: t-304-worker-evidence-pipeline
    kind: service
    depends_on: [t-303-evidence-intake, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env]
  - name: t-305-privacy-preview-redaction-publish
    kind: library
    depends_on: [t-304-worker-evidence-pipeline, t-010-boundary-lint-and-ci]
  - name: t-306-composer-wizard
    kind: ui
    depends_on: [t-301-review-module-core, t-303-evidence-intake, t-102-patient-auth-screens, t-204-provider-submission-claim-field-change, t-201-directory-and-taxonomy-modules, t-010-boundary-lint-and-ci]
  - name: t-307-experience-page-and-index
    kind: ui
    depends_on: [t-302-review-changes-and-tombstones, t-202-doctor-index-and-profile, t-203-facility-and-condition-pages, t-102-patient-auth-screens, t-010-boundary-lint-and-ci]
  - name: t-308-evidence-viewer
    kind: ui
    depends_on: [t-305-privacy-preview-redaction-publish, t-307-experience-page-and-index, t-010-boundary-lint-and-ci]
  - name: t-309-retention-holds-custody
    kind: library
    depends_on: [t-304-worker-evidence-pipeline, t-105-runtime-configuration, t-302-review-changes-and-tombstones, t-401-community-module, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env]
  - name: t-401-community-module
    kind: library
    depends_on: [t-302-review-changes-and-tombstones, t-104-identity-module, t-105-runtime-configuration, t-405-notifications, t-010-boundary-lint-and-ci, cr-012-storyboard-seed-correction]
  - name: t-402-discussion-ui
    kind: ui
    depends_on: [t-401-community-module, t-307-experience-page-and-index, t-102-patient-auth-screens, t-010-boundary-lint-and-ci]
  - name: t-403-reports-and-thresholds
    kind: library
    depends_on: [t-401-community-module, t-302-review-changes-and-tombstones, t-105-runtime-configuration, t-104-identity-module, t-405-notifications, t-010-boundary-lint-and-ci]
  - name: t-404-moderation-module
    kind: library
    depends_on: [t-403-reports-and-thresholds, t-104-identity-module, t-103-staff-access-and-devices, t-105-runtime-configuration, t-302-review-changes-and-tombstones, t-305-privacy-preview-redaction-publish, t-405-notifications, t-010-boundary-lint-and-ci]
  - name: t-405-notifications
    kind: library
    depends_on: [t-101-better-auth-adapter, t-102-patient-auth-screens, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env, cr-006-worker-auth-users-grant]
  - name: t-406-staff-shell-and-queue
    kind: ui
    depends_on: [t-404-moderation-module, t-103-staff-access-and-devices, t-405-notifications, t-010-boundary-lint-and-ci]
  - name: t-407-staff-evidence-and-providers
    kind: ui
    depends_on: [t-406-staff-shell-and-queue, t-309-retention-holds-custody, t-204-provider-submission-claim-field-change, t-305-privacy-preview-redaction-publish, t-010-boundary-lint-and-ci]
  - name: t-408-staff-notifications-and-config
    kind: ui
    depends_on: [t-105-runtime-configuration, t-405-notifications, t-406-staff-shell-and-queue, t-103-staff-access-and-devices, t-010-boundary-lint-and-ci]
  - name: t-409-personal-workspace
    kind: ui
    depends_on: [t-302-review-changes-and-tombstones, t-401-community-module, t-104-identity-module, t-102-patient-auth-screens, t-404-moderation-module, t-010-boundary-lint-and-ci, cr-012-storyboard-seed-correction]
  - name: t-410-export-and-deletion
    kind: library
    depends_on: [t-309-retention-holds-custody, t-401-community-module, t-302-review-changes-and-tombstones, t-305-privacy-preview-redaction-publish, t-104-identity-module, t-103-staff-access-and-devices, t-405-notifications, t-204-provider-submission-claim-field-change, t-404-moderation-module, t-205-search-module, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env]
  - name: t-501-pwa
    kind: ui
    depends_on: [t-102-patient-auth-screens, t-207-discover-emergency-about, t-010-boundary-lint-and-ci]
  - name: t-502-security-hardening
    kind: library
    depends_on: [t-101-better-auth-adapter, t-103-staff-access-and-devices, t-303-evidence-intake, t-401-community-module, t-403-reports-and-thresholds, t-405-notifications, t-410-export-and-deletion, t-501-pwa, t-010-boundary-lint-and-ci]
  - name: t-503-parity-accessibility-e2e
    kind: spec
    depends_on: [cr-004-live-region-announcements, t-102-patient-auth-screens, t-202-doctor-index-and-profile, t-203-facility-and-condition-pages, t-206-search-page, t-207-discover-emergency-about, t-306-composer-wizard, t-307-experience-page-and-index, t-308-evidence-viewer, t-402-discussion-ui, t-406-staff-shell-and-queue, t-407-staff-evidence-and-providers, t-408-staff-notifications-and-config, t-409-personal-workspace, t-501-pwa, t-502-security-hardening, t-010-boundary-lint-and-ci]
  - name: t-504-demo-composition
    kind: packaging
    depends_on: [t-410-export-and-deletion, t-501-pwa, t-502-security-hardening, t-503-parity-accessibility-e2e, t-010-boundary-lint-and-ci, t-106-auth-identity-validation]
  - name: t-505-final-validation-and-docs
    kind: spec
    depends_on: [t-503-parity-accessibility-e2e, t-504-demo-composition, t-502-security-hardening]
```

## Dependency table

| Unit | Depends on |
|---|---|
| U1 CR-009 | — (baseline only) |
| U2 CR-007 | U1 CR-009 |
| U3 T-010 | U1 CR-009, U2 CR-007 |
| U4 CR-011 | U1 CR-009 |
| U5 CR-006 | U1 CR-009 |
| U6 CR-012 | U1 CR-009 |
| U7 CR-004 | — (baseline only) |
| U8 T-101 | U5 CR-006, U4 CR-011, U3 T-010 |
| U9 T-102 | U8 T-101, U3 T-010 |
| U10 T-103 | U8 T-101, U3 T-010 |
| U11 T-104 | U8 T-101, U10 T-103, U3 T-010 |
| U12 T-105 | U10 T-103, U3 T-010 |
| U13 T-106 | U8 T-101, U9 T-102, U10 T-103, U11 T-104, U12 T-105, U6 CR-012 |
| U14 T-201 | U3 T-010 |
| U15 T-202 | U14 T-201, U3 T-010 |
| U16 T-203 | U14 T-201, U15 T-202, U3 T-010 |
| U17 T-204 | U14 T-201, U8 T-101, U10 T-103, U12 T-105, U3 T-010 |
| U18 T-205 | U14 T-201, U17 T-204, U3 T-010, U4 CR-011 |
| U19 T-206 | U18 T-205, U15 T-202, U16 T-203, U3 T-010 |
| U20 T-207 | U15 T-202, U16 T-203, U19 T-206, U14 T-201, U3 T-010 |
| U21 T-301 | U11 T-104, U12 T-105, U14 T-201, U3 T-010 |
| U22 T-302 | U21 T-301, U34 T-405, U3 T-010 |
| U23 T-303 | U8 T-101, U3 T-010 |
| U24 T-304 | U23 T-303, U3 T-010, U4 CR-011 |
| U25 T-305 | U24 T-304, U3 T-010 |
| U26 T-306 | U21 T-301, U23 T-303, U9 T-102, U17 T-204, U14 T-201, U3 T-010 |
| U27 T-307 | U22 T-302, U15 T-202, U16 T-203, U9 T-102, U3 T-010 |
| U28 T-308 | U25 T-305, U27 T-307, U3 T-010 |
| U29 T-309 | U24 T-304, U12 T-105, U22 T-302, U30 T-401, U3 T-010, U4 CR-011 |
| U30 T-401 | U22 T-302, U11 T-104, U12 T-105, U34 T-405, U3 T-010, U6 CR-012 |
| U31 T-402 | U30 T-401, U27 T-307, U9 T-102, U3 T-010 |
| U32 T-403 | U30 T-401, U22 T-302, U12 T-105, U11 T-104, U34 T-405, U3 T-010 |
| U33 T-404 | U32 T-403, U11 T-104, U10 T-103, U12 T-105, U22 T-302, U25 T-305, U34 T-405, U3 T-010 |
| U34 T-405 | U8 T-101, U9 T-102, U3 T-010, U4 CR-011, U5 CR-006 |
| U35 T-406 | U33 T-404, U10 T-103, U34 T-405, U3 T-010 |
| U36 T-407 | U35 T-406, U29 T-309, U17 T-204, U25 T-305, U3 T-010 |
| U37 T-408 | U12 T-105, U34 T-405, U35 T-406, U10 T-103, U3 T-010 |
| U38 T-409 | U22 T-302, U30 T-401, U11 T-104, U9 T-102, U33 T-404, U3 T-010, U6 CR-012 |
| U39 T-410 | U29 T-309, U30 T-401, U22 T-302, U25 T-305, U11 T-104, U10 T-103, U34 T-405, U17 T-204, U33 T-404, U18 T-205, U3 T-010, U4 CR-011 |
| U40 T-501 | U9 T-102, U20 T-207, U3 T-010 |
| U41 T-502 | U8 T-101, U10 T-103, U23 T-303, U30 T-401, U32 T-403, U34 T-405, U39 T-410, U40 T-501, U3 T-010 |
| U42 T-503 | U7 CR-004, U9 T-102, U15 T-202, U16 T-203, U19 T-206, U20 T-207, U26 T-306, U27 T-307, U28 T-308, U31 T-402, U35 T-406, U36 T-407, U37 T-408, U38 T-409, U40 T-501, U41 T-502, U3 T-010 |
| U43 T-504 | U39 T-410, U40 T-501, U41 T-502, U42 T-503, U3 T-010, U13 T-106 |
| U44 T-505 | U42 T-503, U43 T-504, U41 T-502 |

## Integration points

Units integrate inside one process per runtime, through the component boundaries of `components.md`:

- **Application commands and queries** (in-process, sync) between modules, through each module's ports (ADR-004, ADR-010).
- **Outbox events and pg-boss jobs** (async) from the web tier to the worker (ADR-004, FD-038).
- **Shared contracts** in `packages/contracts` (schemas, error codes, view models) that UI Units consume from library Units. Contract Design pins them.
- **The shared database**, with each table written only by its owning module (ADR-001, AD-1).

## Parallel development opportunities

Construction runs serially (D13), so these are independent sets, not a schedule. Units with no path between them can be built in any order relative to each other. Examples: CR-004 is independent of every database Unit; T-201 (directory) and T-303 (evidence intake) are independent of each other; T-501 (PWA) is independent of the review and moderation Units.
