# Story map — Units of work

Revision of 2026-11-04 for FD-105. Every story in `stories.md` is either assigned to the release-1 Unit(s) that implement it or marked "deferred to release 2 (FD-105)" with the reason. Merged Units (U1–U8, U45) are named where they already delivered part of a story; only the active Units are in the DAG. Built from `stories.md`, `requirements.md`, `components.md` and the task files.

## Story assignments

| Story | Units | Names | Cross-cutting | Release 1 |
|---|---|---|---|---|
| US1.1 | U2, U3, U4, U5, U50 | cr-007-int-test-reset-determinism, t-010-boundary-lint-and-ci, cr-011-queue-dedup-reset-and-quiet-env, cr-006-worker-auth-users-grant, u50-release-check | yes | in release 1: the foundation is merged; U50 runs the final gate and close-out |
| US2.1 | U50 | u50-release-check | — | in release 1: demo composition and reset |
| US2.2 | U50 | u50-release-check | — | in release 1: the plain-CSS guard (no Tailwind, CSS-in-JS or animation library) is checked in the final validation |
| US2.3 | U50 | u50-release-check | — | in release 1, narrowed: axe, keyboard and phone and desktop widths on the release-1 pages, Chromium only; the cross-browser matrix and full screenshot set are deferred to release 2 (FD-105) |
| US2.4 | U45, U9, U46, U47, U20, U50 | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, u46-directory, u47-reviews, t-207-discover-emergency-about, u50-release-check | yes | in release 1: T-011 is merged; the patient Units build on its tokens and motion; U50 runs reduced motion, `check:motion` and the NFR13 gate on the home and experience pages |
| US3.1 | U8, U9, U41, U50 | t-101-better-auth-adapter, t-102-patient-auth-screens, t-502-security-hardening, u50-release-check | yes | in release 1 |
| US3.2 | U8, U9 | t-101-better-auth-adapter, t-102-patient-auth-screens | yes | in release 1, narrowed: self-service reset, session list and sign out everywhere; administrative device approval is deferred to release 2 (FD-105, T-103) |
| US3.3 | U11, U47, U49 | t-104-identity-module, u47-reviews, u49-comments | yes | in release 1, narrowed: named, pseudonymous and thread-scoped anonymous authorship; the audited staff identity reveal is deferred to release 2 (FD-105, T-103 and T-104's reveal) |
| US4.1 | U46 | u46-directory | — | in release 1 |
| US4.2 | U46, U47 | u46-directory, u47-reviews | yes | in release 1, narrowed: FD-100's member-added doctor with the "not confirmed" mark; photo suggestions, claims, field changes, merges and staff review of submissions are deferred to release 2 (FD-105, T-204 and T-407) |
| US4.3 | U46, U47, U20 | u46-directory, u47-reviews, t-207-discover-emergency-about | yes | in release 1: facility pages (U46), facility visit accounts (U47), home browse (U20) |
| US5.1 | — | — | — | deferred to release 2 (FD-105): unified search is T-205 and T-206; release 1 is browsed through the doctor, facility and topic indexes |
| US5.2 | — | — | — | deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 |
| US5.3 | U46, U47 | u46-directory, u47-reviews | yes | in release 1, narrowed: provisional bilingual terms and topic pages; Super Admin tag management and the search side are deferred to release 2 (FD-105, T-105, T-205 and T-408) |
| US6.1 | U47 | u47-reviews | — | in release 1 |
| US6.2 | U47, U22 | u47-reviews, t-302-review-changes-and-tombstones | yes | in release 1 |
| US6.3 | U47, U22 | u47-reviews, t-302-review-changes-and-tombstones | yes | in release 1, narrowed: drafts (U47), edits and corrections with versions (U22); follow-ups, deletion with tombstones and restore are deferred to release 2 (FD-105, T-302's other parts and T-409/T-410) |
| US6.4 | U46, U47 | u46-directory, u47-reviews | yes | in release 1 |
| US7.1 | U48, U41 | u48-evidence, t-502-security-hardening | yes | in release 1, narrowed: upload into quarantine, validate and scan, fail closed; sanitise and preview-ready are deferred to release 2 (FD-105, T-305) |
| US7.2 | — | — | — | deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308; public pages show only the evidence note and the count |
| US7.3 | — | — | — | deferred to release 2 (FD-105): custody log, retention expiry, legal holds and staff removal are T-309 and T-407; originals stay in private quarantine with no public route |
| US8.1 | U49 | u49-comments | — | in release 1, narrowed: comments, one reply level, owner delete and the persistent disclaimer; mentions, editing, warned links and the dangerous-instruction warning are deferred to release 2 (FD-105, T-401's other parts and T-404) |
| US8.2 | — | — | — | deferred to release 2 (FD-105): Like and Dislike reactions (FD-062) are T-401's reaction part |
| US9.1 | — | — | — | deferred to release 2 (FD-105): reports and the temporary hide are T-403 |
| US9.2 | — | — | — | deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 |
| US9.3 | — | — | — | deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 |
| US10.1 | — | — | — | deferred to release 2 (FD-105): notifications are T-405 and T-408; release 1 sends only the account emails T-101 already sends |
| US10.2 | U47 | u47-reviews | — | in release 1, narrowed: the existing author page lists public contributions only, never anonymous ones, and is `noindex`; reaction activity, bookmarks and the full public profile are deferred to release 2 (FD-105, T-409) |
| US10.3 | — | — | — | deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410; the text-only feedback command (FD-097) is merged in T-101 without a panel |
| US11.1 | — | — | — | deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408; release 1 reads constants (see `unit-of-work.md`) |
| US11.2 | — | — | — | deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 |
| US12.1 | U7, U20, U47, U50 | cr-004-live-region-announcements, t-207-discover-emergency-about, u47-reviews, u50-release-check | yes | in release 1 |
| US12.2 | — | — | — | deferred to release 2 (FD-105): the PWA is T-501 |
| US12.3 | U41, U50 | t-502-security-hardening, u50-release-check | yes | in release 1: scrubbed logs (U41); health probes are merged and verified, and the demo rollback is documented and walked (U50) |
| US12.4 | U41 | t-502-security-hardening | — | in release 1: no analytics; the CSP allows no third-party origin |

## Requirements

Each requirement in `requirements.md`, with the Units that deliver it in release 1 or the reason it waits for release 2. A requirement can be in release 1 while its story is narrowed; the notes say which part.

| Requirement | Release 1 Units | Status |
|---|---|---|
| FR1, FR2, FR3, FR4, FR5 | U8 (merged), U9 | in release 1 |
| FR6 | U8 (merged), U9 | in release 1: session list and sign out everywhere (FD-057) |
| FR7 | — | deferred to release 2 (FD-105): administrative device approval, T-103 |
| FR8 | U8 (merged) | in release 1: progressive delay and severe-activity email; the in-app notice is deferred with T-405 |
| FR9 | U8 (merged), U9 | in release 1: self-service reset (FD-059) |
| FR10 | U11, U47 | in release 1 |
| FR11 | U47 | in release 1, narrowed: the author page; reaction activity and bookmarks deferred with T-409 |
| FR12, FR13, FR14 | — | deferred to release 2 (FD-105): blocking, account deletion and optional profile details, T-404, T-409 and T-410 |
| FR15, FR16, FR17, FR18 | U46 | in release 1 |
| FR19, FR20, FR21, FR23 | — | deferred to release 2 (FD-105): photo suggestion, claim, field changes and merge, T-204 and T-407 |
| FR22 | U49 | in release 1: comments are the same for every account (claims are deferred) |
| FR24, FR25, FR26 | U46 | in release 1 |
| FR27 | U46, U47 | in release 1: facility criteria on the branch pages (U46) and in facility visit accounts (U47) |
| FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR58 | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR36, FR37 | U46, U47 | in release 1 |
| FR38 | — | deferred to release 2 (FD-105): Super Admin tag management, T-105 and T-408 |
| FR39, FR40, FR41, FR42, FR43, FR44, FR46 | U47 | in release 1 |
| FR45, FR47 | U47 | in release 1 with constants; Super Admin configuration deferred with T-105 |
| FR48, FR49, FR50, FR51, FR52 | U46, U47 | in release 1 |
| FR53 | U48 | in release 1, narrowed: each item keeps its section for its author; the public sections are deferred with T-308 |
| FR54, FR55, FR57 | U47 | in release 1, narrowed: later-treatment text and unlinked names as written; evidence-purpose labels and the profile-submission offer deferred with T-204 and T-305 |
| FR56 | U48 | in release 1: the public note "Documents attached — not medically validated" |
| FR59, FR63, FR64 | — | deferred to release 2 (FD-105): timeline comparison, privacy preview and redaction, T-305 and T-308 |
| FR60, FR62, FR66, FR68 | U48 | in release 1, narrowed: JPEG and PNG only (FD-036); quarantine, validate and scan fail closed; sanitise and re-encode deferred with T-305 |
| FR61 | U48, U41 | in release 1 |
| FR65 | U48 | in release 1, narrowed: originals are never served; the viewer is deferred with T-308 |
| FR67, FR86 | — | deferred to release 2 (FD-105): retention and legal holds, T-309 |
| FR69 | U22 | in release 1 |
| FR70, FR71 | — | deferred to release 2 (FD-105): follow-ups, deletion, tombstones and restore, T-302's other parts |
| FR72 | U49 | in release 1, narrowed: owner delete with a placeholder when replies exist; private history retention deferred with T-309 |
| FR73 | — | deferred to release 2 (FD-105): comment editing, history and staff deletion, T-401 and T-404 |
| FR74 | U49 | in release 1, narrowed: text and one reply level; mentions and warned links deferred |
| FR75 | U49 | in release 1, narrowed: the persistent disclaimer; the dangerous-instruction warning and moderator review deferred with T-404 |
| FR76 | U20 | in release 1: the static `/emergency` page (FD-046) |
| FR77, FR78 | — | deferred to release 2 (FD-105): reactions, T-401 |
| FR79, FR80, FR81, FR82, FR83, FR84, FR85 | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR87, FR88 | — | deferred to release 2 (FD-105): notifications, T-405 |
| FR89, FR90 | — | deferred to release 2 (FD-105): preferences and the feedback panel, T-409; the feedback command is merged in T-101 (FD-097) |
| FR91 | U50 | in release 1: built in the merged shell (T-008), verified in both languages |
| FR92 | U47, U49 | in release 1 |
| FR93, FR94 | — | deferred to release 2 (FD-105): PWA, T-501 |
| FR95 | U50 | in release 1: checked on every release-1 page; each UI Unit builds to it |
| FR96 | — | deferred earlier (FD-048) |
| FR97, FR98 | — | deferred earlier (FD-019) |
| FR99 | U41 | in release 1: no analytics; the CSP allows no third-party origin |
| FR100, FR101, FR102, FR103 | — | deferred to release 2 (FD-105): runtime configuration, capabilities and dashboards, T-103, T-105 and T-408 |
| NFR1 | U50 | in release 1: figures recorded against the ~3 s reference |
| NFR2 | U48 | in release 1 |
| NFR3 | U50 | in release 1: the merged health probes are verified |
| NFR4, NFR6, NFR7 | U50 | in release 1: each UI Unit builds to them; U50 checks them on the release-1 pages |
| NFR5 | U50 | in release 1, narrowed: Chromium only; the other browsers deferred |
| NFR8 | U46, U47 | in release 1, narrowed: server-rendered pages with canonical URLs; redirects after merge deferred with T-204 |
| NFR9, NFR11 | U50 | in release 1: merged foundation, verified at close-out |
| NFR10 | U41 | in release 1: scrubbed structured logs |
| NFR12 | U50 | in release 1: the local demo rollback is documented and walked |
| NFR13 | U50 | in release 1: the patient Units build on T-011; U50 gates the home and experience pages |

## Coverage

- 35 stories. 22 are assigned to at least one active Unit (9 of them narrowed, with the deferred parts named in the row); 13 are deferred to release 2 (FD-105): US5.1, US5.2, US7.2, US7.3, US8.2, US9.1, US9.2, US9.3, US10.1, US10.3, US11.1, US11.2, US12.2.
- Every active Unit has at least one story: U9 (US3.1, US3.2), U11 (US3.3), U20 (US12.1, US4.3), U22 (US6.3, US6.2), U41 (US12.3, US12.4, US3.1, US7.1), U46 (US4.1, US4.2, US4.3, US5.3, US6.4, US2.4), U47 (US6.1, US6.2, US6.3, US6.4, US3.3, US4.2, US4.3, US5.3, US10.2, US12.1, US2.4), U48 (US7.1), U49 (US8.1, US3.3), U50 (US1.1, US2.1, US2.2, US2.3, US2.4, US12.1, US12.3).
- Every requirement in `requirements.md` has a row above: in release 1 with its Units, or deferred with its reason.
- Within a Unit, the order of work follows the numbered steps of its task file(s); a Unit made of several tasks takes them in task order (U46: T-201, then T-202, then T-203; U47: T-301, then T-306 and T-307; U48: T-303, then T-304; U49: T-401, then T-402; U50: T-503, T-504, then T-505).
