# RogiKotha requirement traceability matrix

**Status:** Gate 2 baseline  
**Date:** 2026-08-30  
**Requirement count:** 100 functional + 12 non-functional = 112  
**Backlog:** [08-product-backlog.md](08-product-backlog.md) and [backlog.yaml](backlog.yaml)

## Coverage rule

Every PRD requirement ID appears below and maps to at least one story and one validation family. Founder decisions `FD-001`–`FD-024` refine conflicting or ambiguous requirements and are binding through the architecture spine. A story is not complete merely because its row is mapped; its acceptance evidence must pass.

| Requirement IDs | Confirmed outcome | Owning story/stories | Primary validation |
|---|---|---|---|
| FR-AUTH-001 | Public reads; authenticated confirmed-email contribution | STORY-AUTH-001 | Public/protected route integration + E2E |
| FR-AUTH-002 | Adult email/password registration and policy acceptance | STORY-AUTH-001 | Auth integration + accessibility E2E |
| FR-AUTH-003 | Confirmation and resend behavior | STORY-AUTH-001 | Token/rate-limit integration |
| FR-AUTH-004 | Sign-in, sign-out and password reset | STORY-AUTH-001 | Auth/recovery integration + threat review |
| FR-AUTH-005 | Session/device behavior | STORY-AUTH-002 | Session revocation integration |
| FR-AUTH-006 | Account status and deletion path | STORY-AUTH-002, STORY-USER-002 | Authorization + retention integration |
| FR-AUTH-007 | Phase 1 email/password admin access; MFA later | STORY-AUTH-002 | Privileged-route authorization + human approval |
| FR-AUTH-008 | Abuse controls and safe errors | STORY-AUTH-001 | Enumeration/rate-limit tests |
| FR-AUTH-009 | Role/capability enforcement | STORY-AUTH-002 | Deny-by-default authorization matrix |
| FR-DOC-001 | Submit missing doctor profile | STORY-DIR-001 | Directory command/integration + E2E |
| FR-DOC-002 | Publish unverified doctor after duplicate/abuse review | STORY-DIR-001 | Publication-state integration |
| FR-DOC-003 | Doctor identity and professional fields | STORY-DIR-001 | Schema/validation tests |
| FR-DOC-004 | Doctor locations/facilities/specialties | STORY-DIR-001, STORY-DIR-002 | Relationship integration |
| FR-DOC-005 | Profile correction/suggestion | STORY-DIR-003 | Moderated change workflow |
| FR-DOC-006 | Duplicate/merge handling | STORY-DIR-003 | Merge/idempotency integration |
| FR-DOC-007 | Claim request | STORY-DIR-003 | Claim authorization/E2E |
| FR-DOC-008 | Provider uses ordinary comments | STORY-COM-001 | Role parity/label tests |
| FR-DOC-009 | Profile status/provenance | STORY-DIR-003 | Public projection tests |
| FR-FAC-001 | Facility and branch profiles | STORY-DIR-002 | Directory integration + E2E |
| FR-FAC-002 | Facility submission | STORY-DIR-002 | Submission/publication flow |
| FR-FAC-003 | Branch/location relationships | STORY-DIR-002 | Schema and navigation tests |
| FR-FAC-004 | Non-scored structured facility feedback | STORY-REV-002 | Review schema/summary tests |
| FR-SRCH-001 | Unified provider/content search | STORY-SRCH-001 | Relevance corpus + E2E |
| FR-SRCH-002 | Bengali/English/Banglish matching | STORY-SRCH-001 | Equal-language relevance corpus |
| FR-SRCH-003 | Registration/specialty/location search | STORY-SRCH-001 | Exact/filter integration |
| FR-SRCH-004 | Filters and neutral ordering | STORY-SRCH-002 | Ranking invariant tests |
| FR-SRCH-005 | Suggestions/aliases | STORY-SRCH-002 | Alias provenance tests |
| FR-SRCH-006 | No-results provider submission path | STORY-SRCH-002, STORY-DIR-001 | Responsive E2E |
| FR-SRCH-007 | Published-only search | STORY-SRCH-001 | Leakage tests |
| FR-SRCH-008 | Search privacy and performance | STORY-SRCH-002 | Log inspection + latency budget |
| FR-TAG-001 | Condition/symptom/treatment taxonomy | STORY-SRCH-003 | Taxonomy command/query tests |
| FR-TAG-002 | Provisional free-text tags and canonical mapping | STORY-SRCH-003 | Mapping/redirect tests |
| FR-TAG-003 | Admin aliases/merges | STORY-SRCH-003, STORY-ADMIN-001 | Versioned config integration |
| FR-REV-001 | Mobile Quick/Detailed wizard, preview and autosave | STORY-REV-001, STORY-REV-002 | Component + E2E + recovery |
| FR-REV-002 | Minimum review and no numeric ratings | STORY-REV-001 | Domain invariant + E2E |
| FR-REV-003 | Detailed treatment sections | STORY-REV-002 | Schema/component/E2E |
| FR-REV-004 | Timeline entries and dates | STORY-REV-002 | Ordering/time tests |
| FR-REV-005 | Relationship to patient/witnessed experience | STORY-REV-001 | Attestation and copy tests |
| FR-REV-006 | Named/pseudonymous/anonymous publication | STORY-IDENT-001, STORY-REV-001 | Public-linkage leakage tests |
| FR-REV-007 | Reviewed vs later/alternative treatment separation | STORY-REV-002, STORY-EVID-002 | Domain/view-model tests |
| FR-REV-008 | Follow-up updates | STORY-REV-003 | Version/timeline integration |
| FR-REV-009 | Draft/recovery/publication states | STORY-REV-003 | State-machine + E2E |
| FR-EDIT-001 | Author edit workflow | STORY-REV-003 | Authorization/version tests |
| FR-EDIT-002 | Edit history | STORY-REV-003 | Audit/content-version tests |
| FR-EDIT-003 | Material edit re-review | STORY-REV-003, STORY-MOD-002 | Transition tests |
| FR-EDIT-004 | Delete/tombstone behavior | STORY-REV-003 | Projection/cache/search tests |
| FR-EDIT-005 | Admin correction with audit | STORY-MOD-002 | Privileged command/audit tests |
| FR-FILE-001 | Allowed evidence files | STORY-EVID-001 | Type/limit corpus |
| FR-FILE-002 | File/review size/count limits | STORY-EVID-001 | Boundary/resource tests |
| FR-FILE-003 | Quarantine/type/magic/scan/conversion | STORY-EVID-001 | Malicious-corpus integration |
| FR-FILE-004 | Processed privacy preview | STORY-EVID-002 | E2E + derivative inspection |
| FR-FILE-005 | Author privacy confirmation | STORY-EVID-002 | Publication invariant tests |
| FR-FILE-006 | Public processed viewer/download | STORY-EVID-002 | Access/E2E/browser tests |
| FR-FILE-007 | Originals never public | STORY-EVID-001, STORY-EVID-003 | Direct URL/credential leakage tests |
| FR-FILE-008 | Dynamic 90-day original retention | STORY-EVID-003 | Clock/retention/bulk/hold tests |
| FR-FILE-009 | Processing status/failure | STORY-EVID-001 | Retry/dead-letter/UI state tests |
| FR-EVD-001 | Evidence linked to correct review/timeline | STORY-EVID-002 | Ownership/link integration |
| FR-EVD-002 | Reviewed/later evidence groups | STORY-EVID-002 | View-model/component tests |
| FR-EVD-003 | Evidence status/provenance | STORY-EVID-002 | Public projection tests |
| FR-EVD-004 | User-reported/not independently verified language | STORY-EVID-002 | Both-locale copy assertions |
| FR-EVD-005 | Evidence access/custody audit | STORY-EVID-003 | Audit integration |
| FR-EVD-006 | Evidence removal/tombstone | STORY-EVID-003 | Delete/hold/projection tests |
| FR-EVD-007 | Evidence-processing administration | STORY-ADMIN-002 | Admin authorization/queue tests |
| FR-COM-001 | Text comments, warned links, flat replies, mentions | STORY-COM-001 | Sanitization/component/E2E |
| FR-COM-002 | Advice warning/report path without classifier | STORY-COM-001, STORY-MOD-001 | Copy/report/manual-state tests |
| FR-COM-003 | Comment edit/delete/moderation — see [Known ID collision](#known-id-collision-fr-com-003) | STORY-COM-001, STORY-MOD-002 | Authorization/tombstone tests |
| FR-REA-001 | Like/dislike reactions and identity rule | STORY-COM-002 | Idempotency/persona tests |
| FR-REA-002 | Reaction counts/lists and privacy | STORY-COM-002, STORY-IDENT-001 | Projection/linkage tests |
| FR-MOD-001 | Report content/reasons | STORY-MOD-001 | E2E + authorization |
| FR-MOD-002 | Reporter context/evidence | STORY-MOD-001 | Private access tests |
| FR-MOD-003 | Five distinct confirmed-account auto-hide | STORY-MOD-001 | Threshold/duplicate/concurrency tests |
| FR-MOD-004 | Queue/priorities/status | STORY-MOD-002 | Admin queue integration |
| FR-MOD-005 | Reason-coded moderation/actions | STORY-MOD-002 | State/audit tests |
| FR-MOD-006 | Fresh-checklist appeal | STORY-MOD-003 | Appeal/segregation tests |
| FR-MOD-007 | Blocking and interaction effects | STORY-MOD-003 | Visibility/notification tests |
| FR-MOD-008 | Abuse controls/coordination evidence | STORY-MOD-001 | Abuse simulation + risk review |
| FR-NOT-001 | In-app notifications | STORY-NOTIF-001 | Job/idempotency/E2E |
| FR-NOT-002 | Email notification preferences | STORY-NOTIF-001 | Preference/mail payload tests |
| FR-NOT-003 | Notification read/history behavior | STORY-NOTIF-001 | Query/pagination tests |
| FR-USER-001 | Public identity/profile presentation | STORY-IDENT-001, STORY-USER-001 | Linkage and profile E2E |
| FR-USER-002 | Public activity visibility | STORY-USER-001 | Projection/privacy tests |
| FR-USER-003 | Dashboard/drafts/bookmarks/submissions | STORY-USER-002 | Authorization/E2E |
| FR-USER-004 | Preferences/language/privacy | STORY-USER-002 | Both-locale/settings tests |
| FR-USER-005 | Account/data requests | STORY-USER-002 | Export/delete/retention tests |
| FR-ADM-001 | Bounded runtime configuration | STORY-ADMIN-001 | Schema/version/audit tests |
| FR-ADM-002 | Roles/capabilities including identity reveal | STORY-ADMIN-001, STORY-IDENT-001 | Authorization matrix/human approval |
| FR-ADM-003 | Audit/configuration history | STORY-ADMIN-001 | Append-only query tests |
| FR-ADM-004 | Operational dashboards/bulk actions | STORY-ADMIN-002 | Preview/idempotency/permission tests |
| FR-AN-001 | Privacy-minimised analytics | STORY-OPS-002 | Event allowlist/log inspection |
| FR-AN-002 | Consent/preferences | STORY-OPS-002 | Both-locale accessible E2E |
| FR-AN-003 | Admin analytics reporting | STORY-OPS-002 | Aggregate-only query tests |
| FR-PWA-001 | Installable progressive enhancement | STORY-PLAT-002 | Manifest/install/offline E2E |
| FR-PWA-002 | No sensitive offline cache | STORY-PLAT-002 | Cache inventory/security tests |
| FR-ONB-001 | Simple onboarding and disclaimers | STORY-PLAT-001 | Both-locale E2E/accessibility |
| FR-FDB-001 | Product feedback intake | STORY-USER-002 | Submission/rate-limit/admin tests |
| FR-SUM-001 | Narrative sentiment distribution | STORY-REV-004 | Aggregation/domain tests |
| FR-SUM-002 | Optional outcome distribution | STORY-REV-004 | Aggregation/domain tests |
| FR-SUM-003 | No quality/medical certainty claim | STORY-REV-004 | Copy/snapshot tests |
| FR-SUM-004 | Small-number/limited-data state | STORY-REV-004 | Boundary/component tests |
| FR-SUM-005 | Neutral aggregation updates | STORY-REV-004 | Edit/hide concurrency tests |
| NFR-001 | ~3-second public-page usability target | STORY-OPS-001, STORY-PROT-003 | Web performance budgets |
| NFR-002 | Normal evidence processing target/status | STORY-EVID-001 | Timed corpus and delayed-state tests |
| NFR-003 | Best-effort monitored/recoverable service | STORY-OPS-001 | Health/incident/restore drill |
| NFR-004 | Phone-first responsive, no overflow | STORY-PROT-003 | Required viewport screenshots/E2E |
| NFR-005 | Current/previous major browsers | STORY-PROT-003 | Playwright matrix + real Safari smoke |
| NFR-006 | Accessible critical flows | STORY-PLAT-001, STORY-PROT-003 | axe + manual WCAG 2.2 AA pass |
| NFR-007 | Equal Bengali/English behavior | STORY-I18N-001 | Dictionary parity + journey matrix |
| NFR-008 | Security/privacy baseline | all security-sensitive stories | Threat review + integration + human approval |
| NFR-009 | Auditability | STORY-ADMIN-001, STORY-OPS-001 | Audit completeness/tamper tests |
| NFR-010 | Maintainability/observability | STORY-FOUND-001, STORY-OPS-001 | architecture checks + diagnostics |
| NFR-011 | Backup/recovery | STORY-OPS-001 | Full restore and recovery evidence |
| NFR-012 | Synthetic demo/prototype safety | STORY-PROT-001 | dataset scan + demo-mode assertions |

## Founder-decision traceability

| Decisions | Enforced by |
|---|---|
| FD-001, FD-011 | STORY-OPS-001 readiness gates and unrestricted production routes |
| FD-002, FD-023 | STORY-EVID-001–002 |
| FD-003–005, FD-020–021 | STORY-EVID-003, STORY-ADMIN-001 |
| FD-006, FD-013 | STORY-AUTH-001–002 |
| FD-007, FD-012, FD-019 | STORY-PROT-001, STORY-OPS-001–002 |
| FD-008, FD-015–016, FD-022 | STORY-IDENT-001 |
| FD-009, FD-017 | STORY-COM-001, STORY-MOD-001–002 |
| FD-010, FD-018 | STORY-ADMIN-001 and UX contracts |
| FD-014 | STORY-REV-001 |
| FD-024 | STORY-I18N-001 and every UI story |

## Known ID collision (FR-COM-003)

**Status: open, deliberately not renumbered.**

`FR-COM-003` means two different things in two authoritative places:

| Source | What FR-COM-003 means there |
|---|---|
| PRD v1.0 ¶355–356 | *"Emergency language triggers a non-blocking banner: call 999 for immediate danger … use 16263 for non-emergency health guidance …"* — priority **Must** |
| This matrix (row above) | Comment edit / delete / moderation — which the PRD itself calls **FR-EDIT-005** |

**Consequence.** The PRD's emergency-banner requirement currently has no row in
this matrix, no owning story in `08-product-backlog.md`, and no task in
`backlog.yaml`. It dropped out of the plan by ID reuse, not by decision. What
survives in the prototype is the static `#emergency` page — a destination a user
navigates to, which is *not* the same thing as language-triggered detection.

**Why it is not fixed here.** Renumbering changes the "100 functional + 12
non-functional = 112" count asserted at the top of this file and re-verified by
validation **V-023**, and `FR-COM-003` is referenced by STORY-COM-001 and
STORY-MOD-002. A unilateral renumber would silently invalidate those checks.
This note is deliberately outside the requirement table so no ID counter reads
it as a 113th requirement.

**The decision needed (founder).** Either:

1. **Restore the PRD meaning** — return `FR-COM-003` to the emergency banner,
   re-home comment edit/delete to `FR-EDIT-005` as the PRD names it, and update
   V-023's expected counts and both story references; or
2. **Formally retire it** — record a founder decision that the automatic
   emergency-language banner is out of scope, so the static `#emergency` page is
   the whole of the requirement. Note this interacts with **FD-009/FD-017**,
   which forbid automated *dangerous-advice* classification but say nothing
   about emergency-language detection.

Until one is chosen, treat any "FR-COM-003 is covered" claim as covering only
comment edit/delete.

## Coverage verdict

All 112 PRD IDs and all 24 founder decisions have an owning story and validation family. Gate 2 validation must compare this matrix, the Markdown backlog, and `backlog.yaml` mechanically before implementation begins.
