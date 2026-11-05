# Functional Design — questions (U50 `u50-release-check`)

Context: U50 merges T-503 (bilingual end-to-end suite, accessibility and motion), T-504 (demo composition and reset, storyboard walk) and T-505 (final validation matrix and close-out), slimmed for release 1 (FD-105). It depends on every release-1 Unit: U9, U11, U20, U22, U41, U46, U47, U48 and U49. Inputs read: `unit-of-work.md` U50, the story map, `requirements.md` (NFR13), `stories.md` (US1.1, US2.1–US2.4, US12.1, US12.3), the three task files, `05-demo-storyboard.md`, the code on `main` (`3e6a881`: `apps/web/playwright.config.ts`, `apps/web/e2e/smoke/`, the root `package.json`, `scripts/`, `infra/compose/`, `packages/database/src/demo/`, `apps/web/src/server/health.ts`), the acceptance and test sections of the nine sibling designs, and `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.

Every question below is answered by its recommended option, decided by the agent under the owner's delegation of 2026-11-04.

## Settled before this stage

- No GitHub Actions and no `e2e.yml` (FD-102). `.github/workflows` is never touched. Everything runs locally: `pnpm check`, `pnpm smoke`, `pnpm e2e`.
- Chromium only, at 360 px and desktop. Firefox, WebKit, the full viewport matrix, screenshots of every page, the staff and workspace journeys (storyboard Parts 5 and 6), search and the PWA are release 2 (FD-105).
- Storyboard steps that need a deferred Unit are marked "release 2" in the walk-through record, not failed.
- Shared demo code is deleted at merge only when a grep shows no caller left; U50 removes every leftover in `packages/database/src/demo/` and the old demo e2e spec it supersedes (owner review queue, 2026-11-05).
- The owner shows the demo locally. `pnpm demo` brings up infra, migrates, seeds and runs web and worker in one command; `pnpm demo:reset` rebuilds.
- The NFR13 gate covers the `/en` and `/bn` home and experience pages; the search page leaves the gate while T-206 is deferred (FD-091, FD-105).
- The owner reviews moved to U50 are the FD-053 content review and the FD-091 look review of the T-102 screens, in `en` and `bn`, both themes, 360 px (owner review queue, 2026-11-04, U9 Q13).

## Question 1

**Which database does `pnpm e2e` run against?** The suite writes (registers accounts, publishes, uploads, comments), and the owner's demo uses `rogikotha`. `pnpm test:int` resets `rogikotha_test` on every run.

A. **A dedicated database `rogikotha_e2e_test`, created by the e2e global setup when it is missing, then reset, migrated and seeded once per run** (recommended). The owner's demo data is never touched, the suite starts from the same seeded state every run, and `pnpm test:int` keeps its own database. The `_test` suffix lets the merged `db:reset` code accept it without change.
B. **The demo database, reset at the start of every run.** No new database, but every `pnpm e2e` wipes what the owner did in the demo, and a running `pnpm demo` would read a database being reset under it.
C. **The demo database without a reset, with relative assertions only.** Fast, but the starting state drifts and failures depend on earlier runs.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.3.

## Question 2

**What server does the suite drive?** T-503 planned `webServer = pnpm demo:serve`; the merged T-011 config runs `next start` on port 3107. Mail and evidence scanning need the worker.

A. **The production build: `next start` on `127.0.0.1:3107` through Playwright's `webServer`, and the built worker started by the global setup and stopped by the teardown, both pointed at the e2e database** (recommended). Same build the owner demos, no port clash with a running `pnpm demo` on 3000, and the worker is up for mail and scans.
B. **`pnpm demo:serve`.** One code path, but it binds port 3000 and the demo database, so the suite and a running demo collide.
C. **The dev servers.** Quick to start, but slower pages, different CSP and caching, and timing that differs from the demo.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.2.

## Question 3

**Where do the browser smoke checks run?** (revised after review 01, R-11) `team.md` says that from T-503 the cumulative smoke suite also includes `apps/web/e2e/smoke/*.spec.ts` and that `pnpm smoke` runs the whole suite. A browser run uses the fixed port 3107 and the fixed database `rogikotha_e2e_test`, and every later Unit, including parallel swarm worktrees (FD-094), runs `pnpm smoke`.

A. **Keep `pnpm smoke` on Vitest; the browser smoke specs run inside every `pnpm e2e` (and alone through `pnpm e2e:smoke`); propose the `team.md` wording correction through the learnings ritual at U50's gate (ISS row R18)** (recommended). The simplest option: no later Unit's gate starts a server or resets a shared database, so parallel worktrees cannot collide, and every gate stays as fast as today.
B. **`pnpm smoke` also runs the browser smoke, with a free port taken at run time, a per-worktree database name from an environment variable, and a rebuild when the build is older than the source.** Matches the `team.md` text, but adds a wrapper script, database creation per worktree and possible rebuilds to every Unit's gate.
C. **`pnpm smoke` runs the browser smoke on the fixed port and database.** Matches the text, but two worktrees running it at once reset each other's database.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.8, ISS row R18.

## Question 4

**How is NFR13 measured locally?** NFR13 needs LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 on a throttled mid-range Android profile (slow 4G, 4× CPU). A Lighthouse navigation run reports LCP and CLS but not INP; INP needs a timespan with a real interaction.

A. **A Lighthouse user flow through its Node API: a navigation step with the default mobile configuration (simulated throttling: 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown, mobile screen emulation) for LCP and CLS, then a timespan step with DevTools throttling at the same values and a scripted interaction for INP; driven by `puppeteer-core` (already a root devDependency) on Playwright's Chromium, inside a separate Playwright project `nfr13`** (recommended). One standard tool, all three metrics, the same servers and seeded data as the suite, repeatable on one command.
B. **Playwright with the `web-vitals` library injected and CDP throttling.** No Lighthouse dependency, but its throttling is not the Lighthouse mobile profile NFR13 names, and LCP attribution is weaker.
C. **Chrome DevTools by hand.** No code, but not repeatable and easy to misread.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR5.2, BR5.3.

## Question 5

**What is the NFR13 pass/fail rule?** Lighthouse figures vary from run to run on one machine.

A. **Five runs per page; the median of each metric must meet its threshold on all four pages; the LCP element must not be animated in; every timespan must record at least one interaction; a failing median gets one rerun with the machine idle, the rerun decides, and both are recorded** (recommended). The median of five is Lighthouse's own advice for variance; one rerun guards against a noisy machine without letting failures be retried away.
B. **Every single run must pass.** Strict, but one noisy run fails the release.
C. **One run.** Quick, but a pass or a fail can be noise.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR5.4, BR5.5.

## Question 6

**Which experience page is measured?** Any published experience satisfies "the experience page".

A. **The seeded r1, the longest detailed experience with sections, Reviewer's labels, evidence and a comment thread** (recommended). It is the heaviest real page, so a pass holds for lighter ones.
B. **A short quick review.** Easier to pass, but says little about the real page.
C. **Both.** More runs for little extra information.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR5.1.

## Question 7

**How does the writing journey treat the evidence pipeline, which in release 1 ends after the scan?** U48 attaches evidence to the author's own published review; sanitising, redaction, privacy confirmation and the viewer are release 2.

A. **Compose, preview and publish first, then attach the storyboard images on the published review and wait (bounded, 120 s) for each item's final author status; ClamAV must be up for the release gate run, and the spec fails with a clear message when `/api/health` reports the scanner down, unless `E2E_ALLOW_NO_SCANNER=1` is set for a local run, which skips only the scan assertions** (recommended). Matches U48's flow, proves fail-closed states, and never hides a missing scanner in the gate run.
B. **Skip the scan steps whenever ClamAV is down** (T-503's plan). Convenient, but a release gate could pass without ever proving the scan.
C. **Fake the scanner in e2e.** Fast, but it is no longer end to end.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR2.3.

## Question 8

**What happens to the old demo e2e spec (`apps/web/e2e/smoke/demo.spec.ts`)?** It walks the demo slice once per language; the new journeys cover the same flows on the release-1 code. `team.md` says a smoke assertion is removed only with a recorded reason.

A. **Delete it once every one of its assertions is mapped to a journey or smoke assertion that still exists, with the mapping table in U50's Build and Test record as the recorded reason; keep `motion.spec.ts` unchanged under the new config** (recommended). No assertion is lost, no flow is tested twice.
B. **Keep both.** No risk of losing a check, but the same flow runs twice and the old spec still targets demo-slice selectors.
C. **Delete it without a mapping.** Breaks the "suite only grows" rule.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR14.7.

## Question 9

**Is `pnpm demo:clock` built in release 1?** It moves the demo clock so retention runs (storyboard step 22). Retention, legal holds and draft expiry purges are release 2, and no release-1 code reads the demo clock.

A. **Defer `scripts/demo-clock.mjs` and `demo:clock` to release 2 with T-309; `demo:reset` still returns the clock offset to 0 because the reset recreates the table** (recommended). Nothing in release 1 would use it, and an unused command misleads the presenter.
B. **Build it now.** Ready for release 2, but untestable against any release-1 behaviour.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR8.11, ISS row R1.

## Question 10

**What does `pnpm demo` run?** On `main` it is `infra:up && db:migrate && db:seed && pnpm -r --parallel dev`.

A. **`scripts/demo.mjs`: preflight, compose up with readiness waits, migrate, seed only when the database is empty, build web and worker (skip with `--no-build`), then `next start` and the built worker as children with prefixed output, and a banner when `/api/health` is ok** (recommended). It is T-504's design, shows the production build the NFR13 gate measured, and keeps the owner's data between runs.
B. **Keep the dev servers.** Starts faster, but shows slower pages than the demo should and hides build errors until a later run.
C. **A Docker image for the app.** A presenter-proof bundle, but a new deployment shape that release 1 does not need.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR8.1–BR8.7.

## Question 11

**Does `pnpm demo` keep ClamAV under a compose profile, as T-504 planned?** `pnpm infra:up` must start PostgreSQL, Mailpit and ClamAV for every Unit's checks (`team.md` Deployment).

A. **No profile: the compose file keeps all three services as they are; `pnpm demo` waits for ClamAV up to 120 s and continues with a warning when it is not ready** (recommended). `infra:up` keeps working for every Unit, and the storyboard's fail-closed path still shows itself.
B. **Add `profiles: ["scan"]`.** Matches T-504's text, but `infra:up` would silently stop starting ClamAV.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR8.9, ISS row R4.

## Question 12

**Where do the walk-through record and the release documents live?** T-504 put the record in `docs/implementation/tasks/`, which is not in U50's owned paths; `docs/validation/` is.

A. **All release documents in `docs/validation/`: `U50.md` (the Unit's record and verdict), `U50-walkthrough.md`, `RELEASE-1-GATES.md`, `RELEASE-1-REVIEW-CHECKLIST.md` and `U50-owner-review.md`** (recommended). One owned folder, one place for the owner to look.
B. **The task file locations from T-504 and T-505.** Matches the old text, but spreads the record and leaves the owned paths.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR10.2, BR11.1, BR11.5, BR12.1.

## Question 13

**What does the release-1 gate matrix contain?** T-505 classified the production capability gates; the brief asks for every Unit and every acceptance row, observed against expected.

A. **Three parts: (A) one row per acceptance row of every release-1 Unit's task files, amendments included, executed on the final `main`, with deferred rows marked "deferred to release 2 (FD-105)"; (B) the production capability and architecture acceptance gates classified as demonstrated or deferred; (C) the release stop conditions, none of which may be hit** (recommended). It is the evidence the release needs and keeps T-505's classification.
B. **Only the Units' own Build and Test records, linked.** Less work, but it trusts records made before later merges changed the code.
C. **Only the production gates (T-505 as written).** Leaves the per-Unit rows unproven on the final `main`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR11.1–BR11.4.

## Question 14

**How do the owner's own reviews fit the release verdict?** The delegation of 2026-11-04 lets the agent approve gates, but U9 Q13 records that the owner still gives the FD-053 and FD-091 reviews; FD-042 asks for the owner's Bengali copy review at each milestone.

A. **The agent prepares `U50-owner-review.md` (what to open, in which language, theme and width, and what to tick) and never ticks it; the release verdict can be at most PASS WITH FOLLOW-UP while an owner item is open, with the owner as that follow-up's owner; a finding the owner reports becomes an `ISS-` row** (recommended). Honest about what the owner has not seen, and the build is not blocked.
B. **Block the close-out until the owner has reviewed.** Strict, but stops the release on the owner's calendar, which the owner asked to avoid.
C. **The agent does the look and content review itself.** Fast, but it would present the agent's judgement as the owner's.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR11.4, BR12.1, BR12.2.

## Question 15

**Which screenshots does release 1 produce?** (revised after review 01, R-12) The full committed set (every page × viewport × locale × theme) is release 2.

A. **None: no `pnpm screenshots` script in release 1; the owner reviews the live `pnpm demo` with the checklist, and the record cites test titles and traces as evidence** (recommended). Cut for the 7 November date; the owner sees the real pages, including their motion.
B. **A git-ignored owner-review set.** A review aid, but a spec to write and keep in step with the journeys.
C. **Commit the review set.** Permanent visual evidence, but megabytes of images that the release-2 set replaces.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). ISS row R14.

## Question 16

**Which demo-slice leftovers does U50 delete?** (revised after review 01, R-12) Each release-1 Unit was to switch its pages off the demo slice; the review found that broad deletions across `packages/database`, `server/data.ts`, contracts and the message files are unrequired work, and that keys found by grep can still be built at runtime.

A. **Write the inventory, map and delete `demo.spec.ts`, and delete only the items whose grep shows zero callers outside their own demo `*.int.test.ts` rows; everything else (items with any caller, items used by smoke or adversarial tests, emptying `demo/` and `data.ts`, contracts demo types, unused message keys) stays for release 2 as ISS row R13** (recommended). Cut for the 7 November date; it removes true dead code and cannot break another Unit's page or a protection.
B. **Also empty `demo/` and `data.ts`, delete the contracts types and the unused keys.** Cleaner, but a day of cross-package edits with the runtime-key risk.
C. **Rewrite any remaining caller onto the module.** Changes feature code U50 does not own, after that Unit's review.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR14.1, BR14.2, BR14.7, ISS row R13.

## Question 17

**What happens to the T-201 and T-301 stub methods that U46 and U47 left dead?** (revised after review 01, R-12)

A. **Leave all of them for release 2, listed under ISS row R13** (recommended). Cut for the 7 November date; they cannot be called, and release-2 Units edit those files anyway.
B. **Remove a stub only when no port declares it and nothing calls it.** Removes some dead code, but needs a per-method port check across three repositories and the fakes.
C. **Remove every unimplemented stub.** The port-superset tests fail and release 2 re-adds them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). ISS row R13.

## Question 18

**The health probes for queue, mail and scanner report `unknown` on `main` (`apps/web/src/server/health.ts`), so AC12.3.1 and AC12.3.2 are not met, and no release-1 Unit wires them.** The story map says "health probes are merged and verified".

A. **U50 wires the three probes as a recorded addition: queue (`select 1` on the `pgboss` schema), mail (SMTP greeting `220`) and scanner (clamd `PING` → `PONG`), each within 2 s; `ok` is true when the database, queue and mail are ok, and a down scanner reports `down` without making `ok` false** (recommended). Under an hour of work, U50 merges last so nothing conflicts, and it makes the demo's readiness check and AC12.3.1/AC12.3.2 true.
B. **Record the gap as `S2` and defer the probes to release 2.** No code from U50, but US12.3 ships without its acceptance and `pnpm demo` cannot tell whether mail works.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR9.1, BR9.2, ISS row R5.

## Question 19

**ISS-261 (S2) is open and "needs the owner's ruling before the phase gate": the storyboard calls `rafi_c` the author of r6, but in the prototype and the seed r6 belongs to `named_tanvir-ahmed`.** The release check is that phase gate.

A. **Correct the storyboard to the seed: r6's author is `named_tanvir-ahmed`, and `rafi_c` is a verified contributor with no content who is used for the discussion steps; edit `05-demo-storyboard.md` (seeded-accounts table and steps 15, 17 and 19) as a recorded addition and close ISS-261** (recommended). The seed mirrors the prototype, which is the content source of truth; release 1 uses `rafi_c` only as a commenter, so no step changes behaviour.
B. **Change the seed so that `rafi_c` authors r6.** Matches the storyboard text, but departs from the prototype and changes seeded identifiers other tests rely on.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR10.6.

## Question 20

**Are `tools/coverage.mjs` and `tools/proof-check.mjs` extended to product code, as T-505 planned?** (revised after review 01, R-09 and R-12) `tools/` is not in U50's owned paths, and no Vitest project runs tests placed in `tools/__tests__/`.

A. **No tool change in release 1: the coverage matrix records each release-1 row's status by hand, citing the journey test or gate-matrix row; the prototype proof anchors stay; the tool extension is ISS row R15 for release 2** (recommended). Cut for the 7 November date, with no new test project needed.
B. **Make T-505's two tool changes with their tests under `scripts/`.** Checked product-code anchors, but more work and edits outside the owned paths.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR13.2, ISS row R15.

## Question 21

**T-505 allows a model id inside `docs/validation/*.md` records ("reviewer session (model id allowed here only)").** `project.md` forbids tool, model or agent identity in any document or AI-DLC record; the only exception is the audit cost entries (AGENTS.md).

A. **No model, tool or agent identity in any U50 file, validation records included; a reviewer pass is recorded as "AI-DLC reviewer pass, <date>"; the T-505 text is corrected in its release-1 amendment** (recommended). The Forbidden rule is binding and newer than the task text.
B. **Follow T-505.** Breaks a Forbidden rule.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR15.3, ISS row R8.

## Question 22

**How are flaky tests handled in the release gate?** T-503 sets `retries: 1` locally.

A. **Keep `retries: 1` with traces on the first retry, but the gate needs two consecutive full runs of `pnpm e2e` with 0 failed, 0 flaky and 0 skipped tests; a test that passes only on retry gets an `S3` row and is fixed or its cause recorded before the gate** (recommended). Retries help diagnosis without letting flakiness through.
B. **`retries: 0`.** Strict, but one transient failure costs a whole rerun with no trace of the retry.
C. **`retries: 2` and accept flaky passes.** Green more often, but hides real timing bugs.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.6.

## Question 23

**How do tests get their data under `fullyParallel`?** (review 01, R-01 and R-07) Several rows used another test's account or experience (P2.8 to P2.10, P3.11 to P3.14, P4.15 on `rafi_c`).

A. **Per-test helpers: `registerConfirmed` makes a fresh confirmed account and `publishQuickReview` publishes the test's own experience, each called inside the test; the only `test.describe.serial` group is `P2.8 register, confirm, sign in, reset` (P2.8, P2.8b, P2.10b), one account's life in order; comments carry `E2E-COMMENT-<runId>-<testId>`** (recommended). Tests run in any order, a retry gets fresh data, and only a true sequence is ordered.
B. **Make each storyboard part a serial group.** Simple to write, but one failure skips the rest of the part and the suite loses its parallelism.
C. **Create shared accounts and experiences once in the global setup.** Fast, but parallel tests then race on the same rows again.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.5, BR2.3, BR2.4, BR7.1.

## Question 24

**Which doctor do the writing tests publish about?** (review 01, R-02) P3.11 published about Dr. Farhana Rahman while P1.4 asserted her counts and her Limited data flag.

A. **A dedicated seeded doctor `WRITE_TARGET_DOCTOR` (one of d2–d6, chosen at Code Generation, that no reading test opens or counts), or a doctor the test adds itself; reading tests assert minimum counts and per-entry properties only; P1.4 and P1.5 compare bn and en numbers inside one test by switching locale on the same page** (recommended). Writes never move a number a reading test reads, and the anonymous composer still works (an anonymous review cannot name a new doctor, U47).
B. **A member-added doctor for every writing test.** Fully isolated, but U47 refuses an anonymous review that adds a doctor, so P3.11's anonymous path could not run.
C. **Keep Dr. Farhana Rahman and make P1.4 relative.** Keeps one doctor, but the Limited data flag can still flip mid-run.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR2.3, BR2.6, BR7.2.

## Question 25

**How is the "no rating" hard rule checked on pages?** (review 01, R-03) The word pattern `rated|rating|score` matched correct copy ("moderated", "underscores", "No scores, ever", "never scored").

A. **A structural check that no rating feature exists (no star glyphs or star images, no sort or filter option whose value or label names rating, rated, highest or score, no `aria-valuenow` widget or rating/score attribute in doctor, facility or experience cards and headers, no standalone number or n/5 next to a doctor's name), plus a cheap unit test over the message files with word boundaries and an allowlist of the keys that say there is no rating** (recommended). It tests the rule itself, passes correct copy, and still catches a new rating word in the copy.
B. **The structural check only.** Simpler, but a new key such as "Highest rated" would only be caught on a page that renders it.
C. **The word pattern with an allowlist on pages.** Keeps the old idea, but every page needs its allowlist and the check stays brittle.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR2.5, BR2.10.

## Question 26

**Where does the reduced-motion project run?** (review 01, R-13) It ran every journey, about doubling the suite.

A. **Part 1, the P3.11 composer and the motion-switch spec, the pages and steps where motion happens; it stays the dark-theme axe pass** (recommended). Cut for the 7 November date; still covers AC2.4.3.
B. **Every journey.** Most coverage, about twice the run time.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). BR1.1, BR4.1, ISS row R17.

## Review 01 findings

Review 01 (`reviews/review-01.md`, NOT-READY, 4 Major and 9 Minor) is answered below. Every fix is decided by the agent under the owner's delegation of 2026-11-04.

| Finding | Severity | Fix | Where |
|---|---|---|---|
| R-01 tests share data under `fullyParallel` | Major | per-test helpers `registerConfirmed` and `publishQuickReview`; one `describe.serial` group (P2.8, P2.8b, P2.10b) named as the only exception | Q23, BR1.5, BR2.3, spec WF2 |
| R-02 writes race reads on one doctor | Major | writing tests use `WRITE_TARGET_DOCTOR` or their own doctor; reading tests assert minimum counts; P1.4 and P1.5 compare bn and en inside one test | Q24, BR2.6, BR7.2, spec P1.4, P1.5, P1.5b, P3.11 |
| R-03 word check fails correct copy | Major | structural no-rating-feature check; word-boundary message-file test with an allowlist | Q25, BR2.5, BR2.10 |
| R-04 config test never runs; Playwright would load it | Major | config test moved to `apps/web/src/e2e-config.test.ts` (web Vitest, node); Playwright `testMatch '**/*.spec.ts'` and a `testMatch` per project, pinned in BR1.1 and checked by BR1.9 | BR1.1, BR1.9, spec § 3 |
| R-05 relative storage path | Minor | one absolute storage path from the repository root in `STORAGE_ROOT` and `EVIDENCE_STORAGE_DIR` (the web storage module on `main` reads the latter); the worker spawned by absolute path with cwd the repo root | BR1.2, BR8.5, BR8.8, entities |
| R-06 puppeteer version and rerun | Minor | `lighthouse-flow.ts` loads Lighthouse's own bundled `puppeteer-core`; the dependency check records its range; the idle rerun is a manual `pnpm e2e:perf --grep "<page>"` | BR5.2, BR5.5, BR15.6 |
| R-07 P4.15 on one shared account and sentinel | Minor | P4.15 uses its own two accounts and experience, with `E2E-COMMENT-<runId>-<testId>` | BR2.4, BR7.1 |
| R-08 BR2.6 violation not testable | Minor | violation is now "Review finding" | BR2.6 |
| R-09 tools tests would not run | Minor | cut with the tool changes (Q20) | Q20, R15 |
| R-10 no `pg` at the root | Minor | the seed count runs through `docker compose exec -T postgres psql … -tAc` | BR8.3 |
| R-11 `pnpm smoke` collides across worktrees | Minor | `pnpm smoke` stays Vitest-only; the browser smoke runs in `pnpm e2e`; one browser run per machine, enforced by `.data/e2e.lock`; `e2e:smoke` warns when the build is older than the source | Q3, BR1.3, BR1.8, R11, R18 |
| R-12 unrequired scope | Minor | cut as listed below | Q15, Q16, Q17, Q20 |
| R-13 reduced motion runs every journey | Minor | reduced-motion project limited to Part 1, P3.11 and the motion-switch spec | Q26, BR1.1, BR4.1 |

## Cut for the 7 November date

The owner wants release 1 done by 7 November, so every scope cut the review suggested is taken. Each is decided by the agent under the owner's delegation of 2026-11-04 and gets the ISS row proposed beside it (`Found in U50`, added at Code Generation). Rule ids BR12.3, BR13.3, BR14.3–BR14.6 and BR14.8 are retired and not reused.

| Cut | What remains in release 1 | ISS proposal |
|---|---|---|
| Demo-leftover deletions beyond zero-caller items (old BR14.2–BR14.8): emptying `demo/` and `data.ts`, contracts demo types, unused message keys, stub methods and fakes, moving protections | the inventory (BR14.1), zero-caller deletions (BR14.2), the `demo.spec.ts` mapping (BR14.7) | R13, S4, deferred → release 2 |
| `pnpm screenshots` owner-review set (old BR12.3) | the owner reviews the live demo with the checklist | R14, S4, deferred → release 2 with the full screenshot set |
| Coverage and proof tool changes (old BR13.3) and their tests | the coverage matrix statuses by hand, citing tests and gate rows | R15, S4, deferred → release 2 |
| `PRODUCT.md`, `DESIGN.md` and `docs/scope-of-work.md` edits, and the full `README.md` rewrite | `docs/validation/`, `DEMO.md`, a `README.md` "Run the demo" section, the status documents | R16, S4, deferred → release 2 |
| Reduced-motion run of every journey | Part 1, P3.11 and the motion-switch spec (Q26) | R17, S4, accepted for release 1 |
| Browser smoke inside `pnpm smoke` | browser smoke inside `pnpm e2e` and `pnpm e2e:smoke` (Q3) | R18, S4, open until the `team.md` wording is corrected at U50's gate |
