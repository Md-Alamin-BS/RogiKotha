# Known limitations of release 1

[Back to the docs index](README.md)

`ISS-` ids refer to the defect register `docs/implementation/ISSUES.md`, which is kept on branch
`archive/full-project-2026-11-09`.

- **Release 2 scope (FD-105).** Not built: the staff console and moderation, reports and
  thresholds, notifications, admin configuration, search, provider claims and merges, retention
  and legal holds, data export and account deletion, the workspace extras, the PWA, evidence
  redaction and the viewer, mentions, reactions and blocks, and tombstones and restore.
  `/search`, `/saved`, `/notifications` and `/admin/*` are placeholder pages.
- **Not for public launch.** Moderation is release 2. A member-added doctor is public at once,
  marked "Added by a member — not confirmed", with no staff review (FD-100, ISS-398).
- **Local Docker demo only.** No staging or production environment, no TLS, WAF or reverse
  proxy (`docs/security/local-demo-threat-notes.md`). The `classic` scope skips the Operation
  phase. Rollback is a revert plus `pnpm db:reset && pnpm db:seed`, because migrations are
  forward-only.
- **Synthetic data only.** Every person, doctor, facility and account is fictional. One older
  prototype facility name matches a real facility in the same city; the owner accepted keeping
  it (ISS-271).
- **Product placeholders by design.** The "Limited data" threshold is a placeholder value (5,
  `packages/contracts/src/config-values.ts`); the real value is a deferred product decision.
  Every doctor shows "Registration not verified" until BMDC verification exists.
- **Worker grants for release-2 jobs.** The worker role lacks reads that `search.refresh` and
  `data.export` will need (ISS-233, ISS-234). Both jobs belong to release-2 Units and cannot run
  in release 1.
- **The database owner can switch the append-only triggers off.** The web role `rk_app` runs the
  migrations and so owns `audit_events` and the other append-only tables; a table owner can always
  `ALTER TABLE ... DISABLE TRIGGER`. Ordinary deletes are refused for it (FD-123). A separate
  migration-owner role would close this before any deployment (ISS-816).
- **Browsers and viewports.** Tested in Chromium only, at 360 px and 1280 px. Firefox, WebKit,
  Safari on iOS and the 390, 768 and 1440 px viewports are release 2 (ISS-787, ISS-788). No
  screen-reader output check (NVDA, VoiceOver) was done (ISS-788).
- **Storyboard checked by automation, not by hand.** The demo storyboard steps were checked by
  the automated browser journeys, not walked by hand. The owner's storyboard walk in Bengali and
  English and the owner review boxes OR1 to OR7 were not done.
- **Performance measured on one machine.** The NFR13 figures come from one Windows 11 machine
  with Lighthouse throttling. The first experience-page load after a cold server start is slow
  (LCP about 3.8 s); the median gate is not affected (ISS-815). The harness opens the origin
  before each run, which may understate LCP (home medians fell from about 1.22 s to about 0.9 s);
  the figures before that change were also within 2.5 s.
- **Bengali body font from the system stack.** Only the Bengali heading font is self-hosted. The
  body font is the first installed one in the stack (Nirmala UI on the test machine), so layout
  and LCP vary by machine (ISS-792).
