# Story map — Units of work

Every story in `stories.md` assigned to the Unit(s) that implement it. Built from `stories.md` and `components.md`.

## Story assignments

| Story | Units | Names | Cross-cutting |
|---|---|---|---|
| US1.1 | U2, U3, U4, U5, U43, U44 | cr-007-int-test-reset-determinism, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env, cr-006-worker-auth-users-grant, t-504-demo-composition, t-505-final-validation-and-docs | yes |
| US2.1 | U43 | t-504-demo-composition | — |
| US2.2 | U42 | t-503-parity-accessibility-e2e | — |
| US2.3 | U42, U44 | t-503-parity-accessibility-e2e, t-505-final-validation-and-docs | yes |
| US2.4 | U45, U42 | t-011-patient-design-and-motion-system, t-503-parity-accessibility-e2e | yes |
| US3.1 | U8, U9, U13, U41 | t-101-better-auth-adapter, t-102-patient-auth-screens, t-106-auth-identity-validation, t-502-security-hardening | yes |
| US3.2 | U8, U9, U10, U13 | t-101-better-auth-adapter, t-102-patient-auth-screens, t-103-staff-access-and-devices, t-106-auth-identity-validation | yes |
| US3.3 | U11, U13, U21, U26, U27 | t-104-identity-module, t-106-auth-identity-validation, t-301-review-module-core, t-306-composer-wizard, t-307-experience-page-and-index | yes |
| US4.1 | U14, U15 | t-201-directory-and-taxonomy-modules, t-202-doctor-index-and-profile | yes |
| US4.2 | U15, U17, U36 | t-202-doctor-index-and-profile, t-204-provider-submission-claim-field-change, t-407-staff-evidence-and-providers | yes |
| US4.3 | U14, U16, U20, U21 | t-201-directory-and-taxonomy-modules, t-203-facility-and-condition-pages, t-207-discover-emergency-about, t-301-review-module-core | yes |
| US5.1 | U18, U19, U20 | t-205-search-module, t-206-search-page, t-207-discover-emergency-about | yes |
| US5.2 | U18, U19 | t-205-search-module, t-206-search-page | yes |
| US5.3 | U14, U16, U18, U26 | t-201-directory-and-taxonomy-modules, t-203-facility-and-condition-pages, t-205-search-module, t-306-composer-wizard | yes |
| US6.1 | U21, U26 | t-301-review-module-core, t-306-composer-wizard | yes |
| US6.2 | U21, U22, U26, U27 | t-301-review-module-core, t-302-review-changes-and-tombstones, t-306-composer-wizard, t-307-experience-page-and-index | yes |
| US6.3 | U22, U27, U38, U39 | t-302-review-changes-and-tombstones, t-307-experience-page-and-index, t-409-personal-workspace, t-410-export-and-deletion | yes |
| US6.4 | U14, U15, U16, U21, U27 | t-201-directory-and-taxonomy-modules, t-202-doctor-index-and-profile, t-203-facility-and-condition-pages, t-301-review-module-core, t-307-experience-page-and-index | yes |
| US7.1 | U23, U24, U26, U28, U41 | t-303-evidence-intake, t-304-worker-evidence-pipeline, t-306-composer-wizard, t-308-evidence-viewer, t-502-security-hardening | yes |
| US7.2 | U25, U28 | t-305-privacy-preview-redaction-publish, t-308-evidence-viewer | yes |
| US7.3 | U29, U36, U39 | t-309-retention-holds-custody, t-407-staff-evidence-and-providers, t-410-export-and-deletion | yes |
| US8.1 | U30, U31 | t-401-community-module, t-402-discussion-ui | yes |
| US8.2 | U30, U31 | t-401-community-module, t-402-discussion-ui | yes |
| US9.1 | U32 | t-403-reports-and-thresholds | — |
| US9.2 | U33, U35 | t-404-moderation-module, t-406-staff-shell-and-queue | yes |
| US9.3 | U33, U35, U38 | t-404-moderation-module, t-406-staff-shell-and-queue, t-409-personal-workspace | yes |
| US10.1 | U34, U37 | t-405-notifications, t-408-staff-notifications-and-config | yes |
| US10.2 | U27, U38 | t-307-experience-page-and-index, t-409-personal-workspace | yes |
| US10.3 | U38, U39 | t-409-personal-workspace, t-410-export-and-deletion | yes |
| US11.1 | U10, U12, U13, U37 | t-103-staff-access-and-devices, t-105-runtime-configuration, t-106-auth-identity-validation, t-408-staff-notifications-and-config | yes |
| US11.2 | U33, U35, U36, U37 | t-404-moderation-module, t-406-staff-shell-and-queue, t-407-staff-evidence-and-providers, t-408-staff-notifications-and-config | yes |
| US12.1 | U7, U20, U40, U42 | cr-004-live-region-announcements, t-207-discover-emergency-about, t-501-pwa, t-503-parity-accessibility-e2e | yes |
| US12.2 | U40 | t-501-pwa | — |
| US12.3 | U41 | t-502-security-hardening | — |
| US12.4 | U41 | t-502-security-hardening | — |

## Coverage

- 34 stories, each assigned to at least one Unit. Units with no story of their own are enabling Units (lint, CI, change requests).
- Within a Unit, the order of work follows its task file's numbered steps.
