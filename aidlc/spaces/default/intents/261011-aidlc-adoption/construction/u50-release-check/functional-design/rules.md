# Rules — U50 `u50-release-check`

Source of truth for the decision logic of the release check: the end-to-end suite, the accessibility, motion and NFR13 gates, the demo composition and reset, the walk-through record, the release-1 gate matrix, the owner's review checklist, the close-out and the removal of demo leftovers. Data shapes are in `entities.md`, workflows in `functional-spec.md`. Built from `unit-of-work.md` U50, the task files T-503, T-504 and T-505, `05-demo-storyboard.md`, NFR13, the acceptance criteria of US1.1, US2.1–US2.4, US12.1 and US12.3, FD-091, FD-102, FD-105, the code on `main` (`3e6a881`), the acceptance and test sections of the nine sibling designs (U41 cited by outcome only) and the answers in `functional-design-questions.md` (Q1–Q22).

Deferred to release 2 (FD-105) and covered by no rule here: the Firefox and WebKit projects, the viewports 390×844, 768×1024 and 1440×900, the committed screenshot set of every page, the staff and workspace journeys (storyboard Parts 5 and 6), the search page and its NFR13 gate, the PWA, `demo:clock`, and the GitHub Actions `e2e.yml` (FD-102). Cut for the 7 November date (review 01, ISS rows R13–R18): the `pnpm screenshots` review set, the coverage and proof tool changes, demo-leftover deletions beyond zero-caller items, the `PRODUCT.md`, `DESIGN.md` and `scope-of-work.md` edits and the full `README.md` rewrite, the reduced-motion run of every journey, and the browser smoke inside `pnpm smoke`. Rule ids BR12.3, BR13.3, BR14.3–BR14.6 and BR14.8 were retired with those cuts and are not reused.

```yaml
rules:
  # BR1 — Suite composition, servers and data
  - id: BR1.1
    statement: "The suite runs in Chromium only, in three projects: chromium-360, chromium-desktop and chromium-reduced-motion, plus the support projects log-scan and nfr13."
    category: constraint
    applies_to: "apps/web/playwright.config.ts"
    trigger: "Every pnpm e2e run"
    logic: "Top level: testDir 'e2e', testMatch '**/*.spec.ts' (so no *.test.ts file is ever loaded by Playwright). chromium-360 = Desktop Chrome engine, viewport 360x800, isMobile true, hasTouch true, deviceScaleFactor 2, colorScheme light; testMatch journeys/**, a11y/keyboard.spec.ts, a11y/live-region.spec.ts, a11y/motion-switch.spec.ts. chromium-desktop = viewport 1280x800, colorScheme light; testMatch journeys/**, a11y/**, smoke/**, security/security.spec.ts. chromium-reduced-motion = viewport 360x800, isMobile true, reducedMotion 'reduce', colorScheme dark (dark theme covered once); testMatch journeys/reading.spec.ts, journeys/writing.spec.ts, a11y/motion-switch.spec.ts, with project grep [/P1\\./, /P3\\.11 /, /A11Y motion/] so it runs Part 1, the P3.11 composer and the motion-switch spec only (review R-13). log-scan: testMatch security/health.spec.ts and security/log-scan.spec.ts, dependencies on the three journey projects, runs last. nfr13: testMatch perf/**, run only through pnpm e2e:perf. All projects: timezoneId 'Asia/Dhaka'; the locale comes from the URL, never from the project. No firefox or webkit project and no other viewport exists (FD-105)."
    violation: "A config with another engine, viewport or file pattern fails the config test (BR1.9)"
    source: "U50 Not in release 1, FD-105, T-503 step 2, AC2.3.1, AC2.3.5, review 01 R-04 and R-13"
  - id: BR1.2
    statement: "The suite drives the production build: next start on 127.0.0.1:3107 through Playwright's webServer, and the built worker started by the global setup and stopped by the global teardown, both pointed at the e2e database."
    category: constraint
    applies_to: "playwright.config.ts webServer, e2e/helpers/global-setup.ts, global-teardown.ts, e2e/helpers/env.ts"
    trigger: "pnpm e2e, pnpm e2e:fast, pnpm e2e:smoke, pnpm e2e:perf"
    logic: "env.ts finds the repository root (the folder holding pnpm-workspace.yaml, the same search apps/web/src/server/storage.ts does on main) and builds one environment from .env with overrides: DATABASE_URL and DATABASE_URL_WORKER on rogikotha_e2e_test, APP_URL = http://127.0.0.1:3107, APP_MODE = demo, LOG_LEVEL info, and the evidence storage as one absolute path, <repo root>/.data/e2e-storage, written to every variable a release-1 process reads for it (STORAGE_ROOT for the worker and U48's adapters, EVIDENCE_STORAGE_DIR for the web storage module on main), so the web app and the worker always see the same folder. webServer: command 'pnpm exec next start --hostname 127.0.0.1 --port 3107', url /en, reuseExistingServer false, timeout 120 s, its stdout and stderr appended to apps/web/test-results/logs/web.log. The global setup spawns node with the absolute path <repo root>/apps/worker/dist/main.js, cwd the repository root, the same environment, its output appended to worker.log, and waits until the outbox relay has started (its start log line) within 30 s; the teardown sends SIGTERM and waits 10 s. Port 3107 never collides with pnpm demo on 3000."
    violation: "Setup aborts with a message naming the missing build, the busy port or the worker that did not start"
    source: "Q2, T-503 step 1, ISS-310, merged playwright.config.ts, apps/web/src/server/storage.ts findRepoRoot, review 01 R-05"
  - id: BR1.3
    statement: "pnpm e2e uses its own database rogikotha_e2e_test, created when missing, then reset, migrated and seeded once per run; it never touches rogikotha or rogikotha_test."
    category: constraint
    applies_to: "e2e/helpers/global-setup.ts, e2e/helpers/database.ts"
    trigger: "Global setup of every run"
    logic: "IF the database does not exist THEN 'docker compose -f infra/compose/docker-compose.yml exec -T postgres psql -U postgres' runs CREATE DATABASE rogikotha_e2e_test OWNER rk_app, the three extensions (pg_trgm, citext, pgcrypto) and GRANT CONNECT to rk_worker and rk_maintenance. THEN the merged reset (drops public and pgboss, migrates from empty) runs with DATABASE_URL set to the e2e database, which its _test suffix rule accepts, THEN the seed runs once. The setup refuses when the target name does not end in _e2e_test or when APP_MODE is production. Only one browser run may run on a machine at a time, because the database name and port 3107 are fixed: the global setup creates <repo root>/.data/e2e.lock with its pid (exclusive create) and refuses a second run with 'Another browser run is in progress (pid <n>); wait for it or delete .data/e2e.lock if that process is gone'; the teardown deletes the lock. Mailpit is shared; messages are told apart by recipient (BR6.1)."
    violation: "Setup aborts before any test; the demo and the integration-test databases are unchanged"
    source: "Q1, AC2.1.1, AC2.1.4, team.md Testing Posture (isolated test database)"
  - id: BR1.4
    statement: "Every journey runs once in bn and once in en, bn first, with the step number and the locale in the test title."
    category: constraint
    applies_to: "e2e/helpers/locale.ts forEachLocale, every journeys/*.spec.ts and a11y/*.spec.ts"
    trigger: "Test declaration"
    logic: "Journey titles read 'P<part>.<step> [<locale>] <sentence>', accessibility titles 'A11Y <what> [<locale>]'. forEachLocale declares the bn test, then the en test, and each asserts html[lang] and html[data-lang] equal to the locale on its first page. 'pnpm e2e --grep \"\\[bn\\]\" --list' and the same for [en] list equal counts."
    violation: "Unequal counts fail the locale-parity check in BR1.9"
    source: "T-503 steps 4 and Acceptance 'Both locales per journey', AC12.1.1, FD-024"
  - id: BR1.5
    statement: "Tests are independent: each test creates what it needs through per-test setup helpers and uses no other test's data; the one allowed exception is a describe.serial group for a sequence that really runs on one account."
    category: constraint
    applies_to: "e2e/helpers/accounts.ts, e2e/helpers/content.ts, every journey that writes"
    trigger: "Any test that needs an account, an experience or a comment"
    logic: "runId = base36 timestamp of the global setup; testId = Playwright's testInfo.testId. Helpers: registerConfirmed(page, locale) registers a fresh account e2e<runId><project initial><n> (email <username>@demo.rogikotha.local) through the UI, confirms it through Mailpit and signs it in; publishQuickReview(page, account, {doctor}) publishes a pseudonymous quick review about the write-target doctor (BR7.2) and returns its public id. Each test calls them in its own body (or a beforeEach inside its own describe), so a retry gets fresh data. Seeded accounts and seeded content are read only; no test writes as a seeded account. The one exception: per locale and project, 'P2.8 register, confirm, sign in, reset' is a test.describe.serial group (P2.8, P2.8b, P2.10b) because it is one account's life in order; nothing outside that group reads its account. fullyParallel true, workers 2 (E2E_WORKERS may lower it, never raise it above 4)."
    violation: "A test that fails when run alone (--grep its title) is a defect: S2 row"
    source: "T-503 step 4, construction.md Testing Standards (runnable without manual setup), review 01 R-01 and R-07"
  - id: BR1.6
    statement: "The release gate needs two consecutive full pnpm e2e runs with 0 failed, 0 flaky and 0 skipped tests; retries stay at 1 for diagnosis."
    category: policy
    applies_to: "playwright.config.ts (retries 1, trace 'on-first-retry', video off), U50 Build and Test"
    trigger: "Build and Test of U50"
    logic: "A run passes when the JSON reporter shows unexpected = 0, flaky = 0 and skipped = 0. A flaky test gets an S3 row with its trace and is fixed or its cause recorded before the gate is attempted again. test.fixme and test.skip are not allowed in the release-1 journeys; a release-2 step is never written as a test (BR2.7)."
    violation: "Gate not passed; the U50 verdict cannot be PASS"
    source: "Q22, T-503 step 1 (retries), team.md (a test must be able to fail)"
  - id: BR1.7
    statement: "Waits are condition-based with explicit deadlines; fixed sleeps are forbidden."
    category: constraint
    applies_to: "every spec and helper"
    trigger: "Any wait"
    logic: "Use web-first expect assertions (default 10 s) and bounded polls: Mailpit 30 s at 500 ms (BR6.1), evidence status 120 s at 2 s with page reload (BR2.3), health 90 s. Test timeout 120 s; the writing spec 240 s. page.waitForTimeout appears nowhere (a lint rule or grep in BR1.9)."
    violation: "grep finds waitForTimeout: check fails"
    source: "Risks (flakiness, timing), T-503 step 7"
  - id: BR1.8
    statement: "Root scripts: e2e builds web and worker then runs the journey projects; e2e:fast skips the build; e2e:smoke runs e2e/smoke/ on the desktop project; e2e:perf runs nfr13. pnpm smoke stays Vitest-only in release 1; the browser smoke runs inside pnpm e2e."
    category: constraint
    applies_to: "root package.json"
    trigger: "Script definitions"
    logic: "e2e = 'pnpm --filter @rogikotha/web --filter @rogikotha/worker build && pnpm --filter @rogikotha/web exec playwright test --project chromium-360 --project chromium-desktop --project chromium-reduced-motion --project log-scan' (the chromium-desktop project includes smoke/**). e2e:fast = the same without the build. e2e:smoke = 'pnpm --filter @rogikotha/web exec playwright test e2e/smoke --project chromium-desktop'; it stops with 'No build found: run pnpm build (or pnpm check) first' when apps/web/.next/BUILD_ID or apps/worker/dist/main.js is missing, and warns 'The build is older than the source: run pnpm build' when BUILD_ID is older than the newest file under apps/web/src or apps/worker/src; it needs no ClamAV. e2e:perf = the build, then '--project nfr13'. smoke is unchanged ('vitest run --config vitest.workspace.ts smoke.test'). Why the simpler option: keeping the browser out of pnpm smoke means no later Unit's gate starts a server on a fixed port or resets a shared database, so parallel swarm worktrees (FD-094) cannot collide, and every Unit's gate stays as fast as today; the browser smoke still runs in every pnpm e2e. The team.md sentence that pnpm smoke runs apps/web/e2e/smoke/*.spec.ts is proposed for correction through the learnings ritual at U50's gate (ISS row R18). The web script smoke:e2e is removed (superseded by e2e:smoke). e2e:ui opens the Playwright UI on the same config."
    violation: "Config test (BR1.9) fails"
    source: "Q3 (revised after review 01), team.md Testing Posture, ISS-309, ISS-310, review 01 R-11"
  - id: BR1.9
    statement: "The suite's own configuration is tested: projects, locale parity, the ban on fixed sleeps and the ban on CI workflow files."
    category: validation
    applies_to: "apps/web/src/e2e-config.test.ts (Vitest web project, '// @vitest-environment node'; outside e2e/, which the web Vitest config excludes, and named *.test.ts, which Playwright's testMatch '**/*.spec.ts' never loads)"
    trigger: "pnpm check"
    logic: "Import apps/web/playwright.config.ts and assert the top-level testMatch '**/*.spec.ts', and each project's name, engine, viewport, testMatch and grep of BR1.1 (nfr13 only matches perf/**; security.spec.ts only in chromium-desktop; health and log-scan only in log-scan). Read every e2e/**/*.spec.ts from disk and assert that journeys and a11y specs declare their tests through forEachLocale, that no file contains waitForTimeout, test.only, test.skip or test.fixme, and that no file imports from packages/test-support/src. Assert that .github/workflows does not contain e2e.yml. Code Generation confirms that the web Vitest include matches src/**/*.test.ts; if it does not, adding the file to the include is a recorded addition."
    violation: "pnpm check red"
    source: "BR1.1, BR1.4, BR1.7, BR7.4, BR15.2, review 01 R-04"

  # BR2 — Journeys per storyboard part (release 1)
  - id: BR2.1
    statement: "Part 1 (reading, signed out) asserts language detection, the home, the emergency and policy pages, the doctor index and profile, the facility, the topics and the experience and author pages exactly as listed in functional-spec.md WF2."
    category: validation
    applies_to: "e2e/journeys/reading.spec.ts"
    trigger: "pnpm e2e"
    logic: "P1.0 detection and stored override; P1.1 home; P1.1b emergency; P1.1c about, terms and privacy; P1.3 doctor index; P1.4 doctor profile; P1.4b sparse doctor; P1.5 facility; P1.5b topics; P1.6 experience r1; P1.7 author page. Each assertion is a row of functional-spec.md WF2 Part 1."
    violation: "Test fails; S1 when the failed assertion is a hard rule, else S2"
    source: "05-demo-storyboard.md Part 1, AC12.1.1, AC12.1.2, AC12.1.5, AC12.1.6, U46 § 14, U20 § 8, U47 WF6–WF8"
  - id: BR2.2
    statement: "Part 2 (becoming a contributor) asserts register, the pending screen, Mailpit confirmation, sign-in, the same-email case, the security page and the password reset exactly as listed in WF2 Part 2."
    category: validation
    applies_to: "e2e/journeys/contributor.spec.ts"
    trigger: "pnpm e2e"
    logic: "P2.8 register to confirmed; P2.8b sign in; P2.8c invalid form; P2.9 same email; P2.10 security page (sessions, change password signs other devices out, sign out everywhere); P2.10b reset password."
    violation: "Test fails; S1 for an account-existence leak or a session that survives a password change, else S2"
    source: "05-demo-storyboard.md Part 2, U9 § 9 acceptance mapping, FD-103, AC2.3.4"
  - id: BR2.3
    statement: "Part 3 (writing) composes, previews and publishes, then attaches the storyboard images on the published review and waits for each item's final author status; ClamAV must be up for the gate run."
    category: validation
    applies_to: "e2e/journeys/writing.spec.ts"
    trigger: "pnpm e2e"
    logic: "Every writing test publishes about the write-target doctor (BR7.2), which no reading test asserts, or about a doctor the test adds itself; P3.12, P3.13 and P3.14 each publish their own quick review first through publishQuickReview (BR1.5). P3.11 detailed anonymous compose, preview, publish; P3.11b quick pseudonymous publish with a member-added doctor; P3.12 attach prescription-1.jpg, prescription-2.jpg, photo.jpg (Ready), broken.jpg (could not be read), flagged.jpg (malware detected), report.pdf (refused at once), an in-memory 16 MB PNG (refused); P3.13 correction with the Edited mark and history; P3.14 signed-out view. IF GET /api/health reports scanner != ok at the start of the spec THEN fail with 'ClamAV is not ready: run pnpm infra:up and wait for clamd, or set E2E_ALLOW_NO_SCANNER=1 for a local run', UNLESS E2E_ALLOW_NO_SCANNER=1, which skips only the scan-outcome assertions and marks the run as not a gate run in the report."
    violation: "Test fails; S1 when a rejected or failed item is counted or shown publicly, else S2"
    source: "Q7, 05-demo-storyboard.md Part 3, U48 WF1 and § 4, U47 WF4 and WF6, U22 WF1–WF3"
  - id: BR2.4
    statement: "Part 4 (discussion) asserts comment, reply, the single reply level, the delete placeholder and the signed-out gate exactly as listed in WF2 Part 4."
    category: validation
    applies_to: "e2e/journeys/discussion.spec.ts"
    trigger: "pnpm e2e"
    logic: "P4.15: account A (registerConfirmed) publishes a quick review (publishQuickReview); account B (registerConfirmed) comments on it, replies, and deletes; every comment body carries the per-test sentinel E2E-COMMENT-<runId>-<testId> plus its role (first, reply, second) and is found by that text. Assertions: no reply control on a reply, delete a comment without replies (gone), delete a comment with a reply (placeholder stays with the reply), 2001 characters refused. P4.15b signed-out gate on r1 (read only). The seeded rafi_c is not used for writing (storyboard step 15 names it; the walk-through record uses it by hand)."
    violation: "Test fails; S2"
    source: "05-demo-storyboard.md step 15 (release-1 part), U49 WF1–WF3, review 01 R-07"
  - id: BR2.5
    statement: "Every walked page asserts the hard rules that apply to it, and every page asserts the demo marker and the persistent disclaimer."
    category: validation
    applies_to: "e2e/helpers/page-check.ts checkPage(page, locale, {rules})"
    trigger: "After every navigation that shows a page template"
    logic: "Always: the demo marker (message demo.banner) visible in the active language; the medical-advice disclaimer visible where the page has one; and no rating feature exists, checked by structure, not by words (correct copy such as 'No scores, ever' or 'moderated' must pass): (a) no star glyph U+2605, U+2606, U+2B50 or U+272D in rendered text outside user-written content, and no element with role=img whose accessible name contains a number followed by a star or 'of 5'; (b) no sort or filter option (select option, role=option, radio or menu item) whose value matches /rating|rated|highest|score/i or whose label equals a message whose key path contains rating, rated, highest or score; (c) no element with role slider, meter or progressbar carrying aria-valuenow inside a doctor, facility or experience card or header; (d) no element whose class, id or data-* attribute contains rating or score inside those cards and headers; (e) next to a doctor's name (the entry and the profile header) no standalone number or 'n/5', 'n/10' or 'n.n' text other than the n of m distributions. Per page, the rules listed in WF2: Registration not verified on every doctor, n of m with denominators, Limited data under the threshold, Not provided or No documents never 0, the evidence wording, Reviewer's label, neutral order, numerals in the locale's digits."
    violation: "S1 row (hard rule)"
    source: "project.md Forbidden and Mandated hard rules, AC2.1.3, T-503 Hard-rule checklist, review 01 R-03"
  - id: BR2.6
    statement: "Copy is asserted from the message files, never as literals; numbers are compared across locales through the digit map."
    category: constraint
    applies_to: "e2e/helpers/messages.ts msg(locale, key, params?), digits.ts"
    trigger: "Any text assertion"
    logic: "msg reads packages/i18n/messages/{en,bn}.json by dotted key and formats ICU placeholders; a missing key throws. toLatinDigits maps ০-৯ to 0-9. A bn number contains no ASCII digit. The cross-locale comparison happens inside one test: the P1.4 and P1.5 tests open the page in bn, read its numbers, switch to en on the same page, read again, and assert equality after mapping (their en variant does the same in the other order), so both reads see the same data. Only synthetic data the test typed itself is asserted literally."
    violation: "Review finding"
    source: "project.md Forbidden (no hard-coded user-facing string), Mandated (numerals follow the language), merged demo.spec.ts msg(), review 01 R-02 and R-08"
  - id: BR2.7
    statement: "A storyboard step that needs a deferred Unit is not written as a test; it is recorded as 'release 2' in the walk-through record. A release-1 step that does not behave as written is a failure with an ISS row."
    category: policy
    applies_to: "journeys, docs/validation/U50-walkthrough.md"
    trigger: "Writing the suite and the record"
    logic: "Release 2 in release 1: steps 2, 16, 17, 18–25, 26, 27; within steps 1, 3, 6, 11, 12, 13 and 15 the parts listed in functional-spec.md § 13. Everything else is release 1."
    violation: "A release-1 behaviour recorded as release 2 is an S2 row"
    source: "U50 Not in release 1, FD-105"
  - id: BR2.8
    statement: "The security outcomes of U41 are asserted end to end: a CSP header on every page, Host and Origin refusals, the upload size cap, and scrubbed logs."
    category: validation
    applies_to: "e2e/security/security.spec.ts, e2e/security/log-scan.spec.ts (project log-scan), page-check.ts"
    trigger: "pnpm e2e"
    logic: "page-check records each document response and asserts a non-empty content-security-policy header. security.spec: a GET /en with Host evil.example is refused with a 4xx and no page body; a POST to a server action and to /api/evidence/upload with Origin http://evil.example is refused with a 4xx; a POST to /api/evidence/upload declaring a Content-Length above the cap is refused with a 4xx before the body is sent in full. log-scan (after all journeys): web.log and worker.log contain no occurrence of any review-text sentinel E2E-TEXT-<runId>, file-name sentinel E2E-FILE-<runId>, run account email, or comment sentinel the run typed, and every line is JSON."
    violation: "S1 row (private data in logs, or a missing control)"
    source: "U41 outcomes (CSP header on every page, Host and Origin refusals, upload cap, scrubbed logs), AC1.1.5, AC12.3.3"
  - id: BR2.9
    statement: "The health route is asserted with every compose service up."
    category: validation
    applies_to: "e2e/security/health.spec.ts (project log-scan)"
    trigger: "pnpm e2e"
    logic: "GET /api/health answers 200 with ok true and db, queue, mail and scanner all 'ok'. The stopped-scanner and stopped-mail cases are walked by hand in the record (BR10.3), because stopping a container mid-suite would break other tests; the probe logic itself has unit tests (BR9.3)."
    violation: "S2 row"
    source: "AC12.3.1, AC12.3.2, T-504 Acceptance 'Health'"
  - id: BR2.10
    statement: "A unit test over the message files lists every value that names a rating or score as a whole word and fails on any key not in its allowlist of copy that says there is no rating."
    category: validation
    applies_to: "apps/web/src/copy-no-rating.test.ts (Vitest web project, node environment)"
    trigger: "pnpm check"
    logic: "For en.json: match /\\b(rated|rating|ratings|score|scores|scored|stars?)\\b/i (word boundaries, so 'moderated' and 'underscores' never match). For bn.json: match রেটিং, স্কোর, তারকা or রেট when preceded and followed by start, end, whitespace or punctuation (JavaScript \\b does not work for Bengali). Every matching key must be in ALLOWLIST, an object of key → reason written at Code Generation from the matches on main (for example the 'No scores, ever' and 'never scored' keys); a new matching key fails the test until someone adds it with a reason or changes the copy. This complements BR2.5, which checks pages by structure."
    violation: "pnpm check red"
    source: "project.md Forbidden (no number for quality, no highest rated sort), review 01 R-03"

  # BR3 — Accessibility
  - id: BR3.1
    statement: "axe runs on every walked page and after every sheet or disclosure opens; any serious or critical violation fails the test."
    category: validation
    applies_to: "e2e/helpers/axe.ts expectNoSeriousViolations(page), called by checkPage"
    trigger: "After each navigation to a new template and after opening a sheet, dialog or <details>"
    logic: "AxeBuilder with tags wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa; FAIL IF any violation has impact serious or critical; the full result is attached to the test; moderate and minor violations are listed in the U50 Build and Test record and become S3 rows. Runs in both locales and in the dark theme through chromium-reduced-motion."
    violation: "Test fails; S2 row (S1 when it blocks a critical journey for keyboard or screen-reader users)"
    source: "AC2.3.3, AC12.1.6, T-503 step 3"
  - id: BR3.2
    statement: "No axe rule is excluded unless the helper names the rule id, the selector, the reason and an ISS row."
    category: policy
    applies_to: "e2e/helpers/axe.ts"
    trigger: "Any exclusion"
    logic: "EXCLUSIONS is an empty array at Code Generation; an entry is { ruleId, selector, reason, iss } and the Build and Test record lists it."
    violation: "An unexplained exclusion fails review"
    source: "T-503 step 3"
  - id: BR3.3
    statement: "Register, sign-in and the composer are completed with the keyboard only, with visible focus on every stop and focus returned to the trigger when a sheet closes."
    category: validation
    applies_to: "e2e/a11y/keyboard.spec.ts"
    trigger: "pnpm e2e (chromium-desktop and chromium-360)"
    logic: "Only page.keyboard (Tab, Shift+Tab, Enter, Space, Escape, arrow keys, typing) after the first page.goto; the emailed confirmation link is opened with page.goto (it arrives outside the page). First Tab focuses the skip link and Enter moves focus into main. At every Tab stop: document.activeElement matches :focus-visible and its computed outline-style is not none or its box-shadow is not none. The account sheet opens with Enter, closes with Escape, and focus returns to its trigger. The composer is walked through every step to publish in the detailed, anonymous mode, about WRITE_TARGET_DOCTOR (BR7.2), with an account the test registers itself (BR1.5)."
    violation: "Test fails; S2 row"
    source: "AC2.3.3, T-503 a11y/keyboard.spec.ts (release-1 part), auth-screens-spec §6"
  - id: BR3.4
    statement: "An invalid form submission shows an error in the active language that is linked to the field and announced."
    category: validation
    applies_to: "contributor.spec.ts P2.8c, keyboard.spec.ts"
    trigger: "Register submitted with an empty username and an unticked terms box"
    logic: "The field has aria-invalid='true' and aria-describedby pointing at an element whose text equals the schema's message key in the locale; the error summary receives focus or is inside a live region; nothing is created (Mailpit receives no mail for that address within 5 s)."
    violation: "S2 row"
    source: "AC2.3.4"
  - id: BR3.5
    statement: "Each page carries the locale's lang and data-lang, Bengali headings are never transformed, and the first visit follows the browser language while a stored choice wins later."
    category: validation
    applies_to: "locale.ts, reading.spec.ts P1.0"
    trigger: "Every page; P1.0"
    logic: "html[lang] and html[data-lang] equal the URL locale; in bn every h1-h3 has computed text-transform none. P1.0: a context with locale bn-BD opening / lands on /bn; a context with en-US lands on /en; in the bn context, switching to English and then opening / lands on /en."
    violation: "S2 row"
    source: "AC12.1.1, AC12.1.2, FD-024"
  - id: BR3.6
    statement: "No walked page overflows horizontally at 360 px in either locale."
    category: validation
    applies_to: "page-check.ts (chromium-360, chromium-reduced-motion)"
    trigger: "After document.fonts.ready on every walked page"
    logic: "document.documentElement.scrollWidth <= clientWidth; and no visible element's bounding box extends past the viewport's right edge unless an ancestor has overflow-x auto or scroll by design. The Bengali run uses the longest strings the run itself writes (BR7.1)."
    violation: "S2 row"
    source: "AC2.3.1 (narrowed to 360 px and desktop), T-503 bengali-overflow (release-1 pages)"
  - id: BR3.7
    statement: "The CR-004 live-region announcements are asserted on the walked pages."
    category: validation
    applies_to: "e2e/a11y/live-region.spec.ts"
    trigger: "pnpm e2e"
    logic: "Language toggle: #sr-live reads a11y.announce.language in the new locale. Theme toggle: a11y.announce.themeDark, then themeLight. Route change to /doctors: a11y.announce.view with the view's name. Each in bn and en."
    violation: "S2 row"
    source: "U50 Responsibilities (CR-004 on walked pages), CR-004 functional spec, T-503 live-region.spec.ts"
  - id: BR3.8
    statement: "At 200 % zoom and with the WCAG 1.4.12 text spacing, the doctor profile, the experience page, the composer and register still work without horizontal scrolling or clipped text."
    category: validation
    applies_to: "e2e/a11y/zoom-and-spacing.spec.ts (chromium-desktop)"
    trigger: "pnpm e2e"
    logic: "Zoom: viewport 640x400 with deviceScaleFactor 2 (the reflow equivalent of 1280x800 at 200 %). Spacing: inject line-height 1.5, letter-spacing .12em, word-spacing .16em and p margin-bottom 2em, all !important, in both locales. Assert no horizontal scroll and no element with overflow hidden whose scrollWidth exceeds clientWidth by more than 1 px; the composer can still be completed to its preview step."
    violation: "S2 row"
    source: "AC2.3.2, T-503 zoom-and-spacing.spec.ts (release-1 pages)"

  # BR4 — Motion
  - id: BR4.1
    statement: "Part 1, the P3.11 composer and the motion-switch spec also run with prefers-reduced-motion: reduce, and then only fades of 100 ms or less remain."
    category: validation
    applies_to: "chromium-reduced-motion project (scope of BR1.1), e2e/helpers/motion.ts sampleAnimations(page)"
    trigger: "After each navigation and after each composer step change in that project"
    logic: "document.getAnimations() during and right after the change: every running animation animates opacity only and has duration <= 100 ms; no transform keyframes, no stagger, no view-transition movement. Every step still completes. These are the pages and steps where motion happens (route changes, list reveals, composer steps, the publish tick); the other journeys run with motion on only (review 01 R-13)."
    violation: "S2 row"
    source: "AC2.4.3, AC2.3.2, T-503 FD-091 rows, review 01 R-13"
  - id: BR4.2
    statement: "The app's own reduce-motion switch works by cookie and when flipped mid-session."
    category: validation
    applies_to: "e2e/smoke/motion.spec.ts (merged, kept) and e2e/a11y/motion-switch.spec.ts"
    trigger: "pnpm e2e"
    logic: "With rk.motion=off set before load, html[data-motion=reduced] and the BR4.1 sample holds. Mid-session: click the #motion control, assert html[data-motion=reduced], navigate, and the next route change has no movement (closes ISS-323)."
    violation: "S2 row"
    source: "AC2.4.3, ISS-323"
  - id: BR4.3
    statement: "The disclaimer, the emergency guidance and the demo marker never animate and are visible at once."
    category: validation
    applies_to: "page-check.ts, motion-switch.spec.ts"
    trigger: "On load and during a route change, motion on"
    logic: "For each of these elements: element.getAnimations({subtree: true}) is empty and computed transition-duration is 0s; it is visible within the first frame after load (expect.toBeVisible with timeout 1 s) and not covered (elementFromPoint at its centre is inside it)."
    violation: "S1 row (Mandated: persistent disclaimer and emergency guidance)"
    source: "AC2.4.4, project.md Mandated"
  - id: BR4.4
    statement: "pnpm check:motion passes on the final main."
    category: validation
    applies_to: "scripts/css-motion-check.mjs (merged, T-011), run inside pnpm check"
    trigger: "pnpm check"
    logic: "Animated properties are only transform and opacity; the check is part of pnpm check already and is recorded in the gate matrix."
    violation: "pnpm check red"
    source: "AC2.4.2, AC2.4.6"
  - id: BR4.5
    statement: "The publish confirmation is one tick and a plain text note, with no reward or nudge."
    category: validation
    applies_to: "writing.spec.ts P3.11"
    trigger: "After publish"
    logic: "Exactly one PublishTick element; the note text equals its message key; no element whose text matches confetti, streak, badge, points, countdown or their bn message values; the only running animations after the tick ends are none."
    violation: "S2 row"
    source: "AC2.4.5, project.md Forbidden (no score)"
  - id: BR4.6
    statement: "Nothing loops or plays for more than 5 seconds."
    category: validation
    applies_to: "motion-switch.spec.ts on the home and r1"
    trigger: "6 s after load (measured by a bounded expect.poll, not a sleep)"
    logic: "No running animation has iterations Infinity or an end time beyond 5000 ms after its start."
    violation: "S2 row"
    source: "AC2.4.4"

  # BR5 — NFR13 performance gate
  - id: BR5.1
    statement: "The NFR13 gate covers four pages: /en, /bn, /en/experiences/<r1> and /bn/experiences/<r1>."
    category: constraint
    applies_to: "e2e/perf/nfr13.spec.ts"
    trigger: "pnpm e2e:perf"
    logic: "r1's public id is read from the URL after opening it by its seeded title on /en/experiences, never hard-coded. The search page leaves the gate while T-206 is deferred (FD-105)."
    violation: "—"
    source: "Q6, NFR13, AC2.4.6, FD-105"
  - id: BR5.2
    statement: "Measurement uses a Lighthouse user flow: a navigation step with the default mobile configuration for LCP and CLS, then a timespan step for INP."
    category: constraint
    applies_to: "nfr13.spec.ts, e2e/perf/lighthouse-flow.ts"
    trigger: "Each run"
    logic: "The page handed to Lighthouse comes from Lighthouse's own bundled puppeteer-core, never the root copy: lighthouse-flow.ts loads it with createRequire(require.resolve('lighthouse/package.json'))('puppeteer-core'), so startFlow always gets a Page of the version Lighthouse declares; that copy launches Playwright's Chromium (chromium.executablePath()) headless. lighthouse startFlow(page, {config: default mobile}). Navigation: formFactor mobile, screenEmulation mobile, throttlingMethod simulate (rttMs 150, throughputKbps 1638.4, cpuSlowdownMultiplier 4). Timespan: throttlingMethod devtools with the same values; the scripted interaction of BR5.3; INP from the interaction-to-next-paint audit. The page is loaded signed out, light theme, motion on."
    violation: "—"
    source: "Q4, NFR13 (slow 4G, 4x CPU), T-503 FD-091 row, review 01 R-06"
  - id: BR5.3
    statement: "Each timespan records at least one interaction; a timespan with no measured interaction fails."
    category: validation
    applies_to: "lighthouse-flow.ts"
    trigger: "Timespan step"
    logic: "Home: press the theme toggle twice, then open and close the language menu if it is a disclosure, else focus it. Experience: press the theme toggle twice, then open the first <details> on the page. IF the INP audit is notApplicable or has no value THEN the run fails."
    violation: "Run fails; the gate is not passed"
    source: "NFR13 (INP needs an interaction), T-503 FD-091 row"
  - id: BR5.4
    statement: "A page passes when the median of five runs meets every threshold and the LCP element is never animated in; the gate passes when all four pages pass."
    category: policy
    applies_to: "nfr13.spec.ts"
    trigger: "After five runs per page"
    logic: "median(LCP) <= 2500 ms AND median(CLS) <= 0.1 AND median(INP) <= 200 ms. LCP element: the selector from the largest-contentful-paint-element audit, checked in a Playwright page at the same URL: getAnimations({subtree:true}) empty at load, no [data-reveal] ancestor, computed opacity 1 at the first frame. Every run's figures are written to apps/web/test-results/nfr13/<page>.json."
    violation: "Gate fails (BR5.5)"
    source: "Q5, NFR13, AC2.4.6"
  - id: BR5.5
    statement: "A failing median gets one rerun of that page with the machine idle; the rerun decides; a gate still failing is an S1 row and the release check fails."
    category: policy
    applies_to: "U50 Build and Test"
    trigger: "A page fails BR5.4"
    logic: "The rerun is manual: after stopping every other build, test or design job, the operator runs 'pnpm e2e:perf --grep \"<page>\"' once for the failing page; the suite never reruns a page by itself. The record notes the CPU model, Lighthouse's benchmarkIndex for both attempts and the time. Both attempts are recorded in docs/validation/U50.md. The production build is used, APP_MODE demo, the e2e database seeded."
    violation: "S1 row (red gate)"
    source: "Q5, team.md (quality targets may not be weakened), review 01 R-06"
  - id: BR5.6
    statement: "The other important public pages are measured once and recorded against the ~3 s reference with no gate."
    category: policy
    applies_to: "nfr13.spec.ts (record-only list)"
    trigger: "pnpm e2e:perf"
    logic: "One navigation run each for /bn/doctors/<Dr. Farhana Rahman>, /bn/facilities/<first>, /bn/topics, /bn/register, /en/doctors; figures recorded in U50.md; any figure over 3 s becomes an S3 row."
    violation: "—"
    source: "AC2.3.6, AC12.3.5, NFR1"

  # BR6 — Mailpit
  - id: BR6.1
    statement: "The Mailpit helper finds the newest message to one address with a given subject and returns its single app link."
    category: constraint
    applies_to: "e2e/helpers/mailpit.ts latestLink({to, subjectKey, locale, pathPrefix, after})"
    trigger: "Confirm, reset and same-email steps"
    logic: "Poll GET MAILPIT_URL/api/v1/search?query=to:\"<to>\" every 500 ms up to 30 s for a message newer than `after` whose Subject equals msg(locale, subjectKey); then GET /api/v1/message/<ID>; from its Text and HTML take the links that start with APP_URL + '/' + locale + pathPrefix; exactly one distinct link, else fail naming the count."
    violation: "Test fails with the address and subject it waited for"
    source: "T-503 helpers/mailpit.ts, U9 WF3, WF5"
  - id: BR6.2
    statement: "Tests never delete Mailpit messages; only pnpm demo:reset clears Mailpit."
    category: constraint
    applies_to: "mailpit.ts, scripts/demo-reset.mjs"
    trigger: "—"
    logic: "No DELETE call in e2e code; messages are told apart by unique recipients (BR1.5)."
    violation: "Review finding"
    source: "BR1.5, T-504 step 2"
  - id: BR6.3
    statement: "Each email the suite opens is in the account's language and carries no tool identity."
    category: validation
    applies_to: "contributor.spec.ts"
    trigger: "Each message read"
    logic: "Subject equals email.verify.subject, email.reset.subject or email.existing.subject in the account's locale; From equals MAIL_FROM; the body contains no tool, model or agent name (checked against the same pattern list as check:identity)."
    violation: "S2 row (S1 for tool identity)"
    source: "project.md Forbidden (identity), U8 existing-email branch"

  # BR7 — Test data
  - id: BR7.1
    statement: "All data the suite creates is synthetic and marked with the run id."
    category: constraint
    applies_to: "e2e/fixtures/synthetic.ts"
    trigger: "Any typed content"
    logic: "Display names from a fixed synthetic list (for example 'E2E Reader Mitu', 'ই২ই পাঠক মিতু'); review text mixes Bengali, English and Banglish, includes the per-test sentinel E2E-TEXT-<runId>-<testId>, and for the bn run one 120-character Bengali title and a 1500-character Bengali section (the longest strings for BR3.6); file names sent are the fixture names; comment bodies include E2E-COMMENT-<runId>-<testId>; a doctor a test adds is named 'E2E Doctor <runId>-<n>'. The log scan (BR2.8) searches for the prefixes E2E-TEXT-<runId> and E2E-COMMENT-<runId>. No real person, doctor or facility name."
    violation: "S1 row (real personal data)"
    source: "project.md Forbidden (no real personal data), T-503 hard-rule checklist, review 01 R-07"
  - id: BR7.2
    statement: "Seeded facts are reached by visible names from e2e/fixtures/seed-facts.ts, never by hard-coded ids."
    category: constraint
    applies_to: "seed-facts.ts"
    trigger: "Any use of seeded data"
    logic: "seed-facts.ts holds only what DEMO.md also publishes or the storyboard names: the shared password demo-pass-2026!, the usernames shirin_88, rafi_c, anon_author_r2, named_tanvir-ahmed, the read-only profile doctor 'Dr. Farhana Rahman', the sparse doctor P1.4b opens, r1's title, and WRITE_TARGET_DOCTOR: one seeded doctor among d2–d6, chosen at Code Generation from the seed, that no reading test opens or counts. Every writing test publishes about WRITE_TARGET_DOCTOR or about a doctor it adds itself, so no write changes a number a reading test asserts. Reading tests that list doctors, topics or experiences assert per-entry properties and minimum counts ('at least 10'), never exact totals or orders that a write could change. Public ids are read from URLs after navigation."
    violation: "Review finding"
    source: "05-demo-storyboard.md Seeded accounts, AC2.1.1, review 01 R-02"
  - id: BR7.3
    statement: "Evidence fixtures are read by path from packages/test-support/fixtures; the 16 MB oversize file is generated in memory."
    category: constraint
    applies_to: "writing.spec.ts"
    trigger: "P3.12"
    logic: "setInputFiles(path.resolve(repo, 'packages/test-support/fixtures/<name>')); oversize = a valid PNG header followed by zero bytes to 16 MiB, built in the test."
    violation: "—"
    source: "05-demo-storyboard.md Fixtures"
  - id: BR7.4
    statement: "No file under apps/web/e2e imports code from packages/test-support."
    category: constraint
    applies_to: "apps/web/e2e/**"
    trigger: "pnpm check (BR1.9)"
    logic: "Reading fixture files by path is allowed; importing a module is not (team.md: nothing in apps/* imports test-support)."
    violation: "pnpm check red"
    source: "team.md Code Style (boundaries)"

  # BR8 — Demo composition
  - id: BR8.1
    statement: "pnpm demo starts with a preflight that stops with a clear message on any missing prerequisite."
    category: validation
    applies_to: "scripts/demo.mjs preflight()"
    trigger: "pnpm demo, pnpm demo:serve"
    logic: "Node >= 24 and < 25; pnpm 11; 'docker info' succeeds; ports 3000, 5433, 1025, 8025 and 3310 are free or held by this compose project's own containers, else print the port and its holder ('netstat -ano | findstr :<port>' on Windows, 'lsof -i :<port>' elsewhere) and exit 1; .env exists, else copy infra/compose/.env.example to .env, set APP_MODE=demo and generate APP_ENCRYPTION_KEY, BETTER_AUTH_SECRET and MAIL_RECIPIENT_KEY from 32 random bytes each in the encoding env.ts decodes (MAIL_RECIPIENT_KEY different from APP_ENCRYPTION_KEY, FD-095), and print that it did; IF APP_MODE=production THEN exit 1."
    violation: "Exit 1 with the reason; nothing started"
    source: "T-504 step 1.1, ISS-443, ISS-084 (port 5433), AC2.1.4"
  - id: BR8.2
    statement: "pnpm demo starts the compose services and waits for each to be ready; ClamAV may be late."
    category: constraint
    applies_to: "demo.mjs, scripts/wait-for.mjs"
    trigger: "After preflight"
    logic: "docker compose -f infra/compose/docker-compose.yml up -d; wait for postgres (compose healthcheck healthy) and Mailpit (GET :8025/api/v1/info 200) up to 90 s each, else exit 1; wait for ClamAV (TCP 3310 answering PING with PONG) up to 120 s, else print a warning that uploads will stay 'scanning' until clamd is ready and continue."
    violation: "Exit 1 naming the service"
    source: "T-504 step 1.2, Q11"
  - id: BR8.3
    statement: "pnpm demo migrates every time and seeds only an empty database."
    category: constraint
    applies_to: "demo.mjs"
    trigger: "After services are ready"
    logic: "pnpm db:migrate; then count = the output of 'docker compose -f infra/compose/docker-compose.yml [-p $RK_COMPOSE_PROJECT] exec -T postgres psql -U postgres -d <database name from DATABASE_URL> -tAc \"select count(*) from account_profiles\"' (the root has no pg driver, so demo.mjs never connects itself); a non-numeric answer exits 1 with the psql output. IF count = 0 THEN pnpm db:seed ELSE print 'Existing data kept. Run pnpm demo:reset for a clean slate.'"
    violation: "A failed migrate or seed exits 1 with its output"
    source: "T-504 step 1.3, Acceptance 'Seed idempotence'"
  - id: BR8.4
    statement: "pnpm demo builds web and worker unless --no-build is given."
    category: constraint
    applies_to: "demo.mjs"
    trigger: "After seeding"
    logic: "pnpm --filter @rogikotha/web --filter @rogikotha/worker build; a build failure exits 1."
    violation: "Exit 1"
    source: "T-504 step 1.4, Q10"
  - id: BR8.5
    statement: "pnpm demo runs the web app and the worker as children with prefixed output and stops both together."
    category: constraint
    applies_to: "demo.mjs serve()"
    trigger: "After the build; pnpm demo:serve starts here"
    logic: "Before spawning, resolve the repository root (the folder with pnpm-workspace.yaml) and turn STORAGE_ROOT from .env into an absolute path against it (default <repo root>/.data/storage), and set EVIDENCE_STORAGE_DIR to the same absolute path, so the web app and the worker use one folder whatever their working directory. Spawn 'pnpm --filter @rogikotha/web start' (port 3000) and 'pnpm --filter @rogikotha/worker start' with that environment and cwd the repository root; prefix lines 'web |' and 'worker |'; write both pids and the parent pid to .data/demo.pid; forward SIGINT and SIGTERM to both; when either child exits, stop the other and exit with the first non-zero code; delete the pidfile on exit; containers keep running."
    violation: "—"
    source: "T-504 step 1.5, Acceptance 'Ctrl+C'"
  - id: BR8.6
    statement: "When /api/health reports ok, pnpm demo prints the presenter banner, which matches DEMO.md."
    category: constraint
    applies_to: "demo.mjs banner()"
    trigger: "Health ok within 120 s of start, else a warning naming the down probes"
    logic: "Banner: http://localhost:3000/bn, http://localhost:3000/en, Mailpit http://localhost:8025; the release-1 accounts (shirin_88, rafi_c, anon_author_r2, named_tanvir-ahmed) and the shared password; the line 'Fictional records only'; DEMO.md; pnpm demo:reset --yes and Ctrl+C then pnpm demo:down. Staff accounts are not listed while the staff console is release 2. Script output is presenter-facing operator text in English, like every repository script; it is not product UI and has no message keys."
    violation: "—"
    source: "T-504 step 1.6, FD-105"
  - id: BR8.7
    statement: "demo:down stops the containers and keeps the volumes; demo:logs follows the compose logs."
    category: constraint
    applies_to: "root package.json"
    trigger: "—"
    logic: "demo:down = docker compose -f infra/compose/docker-compose.yml down; demo:logs = the same file, logs -f; demo:serve = node scripts/demo.mjs serve."
    violation: "—"
    source: "T-504 step 1"
  - id: BR8.8
    statement: "pnpm demo:reset returns the demo to the seeded state."
    category: constraint
    applies_to: "scripts/demo-reset.mjs"
    trigger: "pnpm demo:reset [--yes]"
    logic: "Refuse APP_MODE=production; ask for confirmation unless --yes; IF .data/demo.pid names running processes THEN stop them; pnpm db:reset (drops public and pgboss, migrates from empty, so demo_clock is back to offset 0); pnpm db:seed; empty the absolute storage folder resolved as in BR8.5 (and <repo root>/var/evidence, the demo slice's default on main, when it exists); Mailpit DELETE /api/v1/messages; print 'Demo reset: seeded data restored, storage and mail cleared.' Any failed step exits 1 naming it."
    violation: "Exit 1"
    source: "T-504 step 2, AC2.1.2, AC2.1.4"
  - id: BR8.9
    statement: "The compose file keeps all three services without a profile; U50 changes it only if a demo step needs it."
    category: constraint
    applies_to: "infra/compose/docker-compose.yml"
    trigger: "—"
    logic: "No profiles key, no restart policy (none today), named volumes as they are. Any change is listed in the hand-off."
    violation: "—"
    source: "Q11, team.md Deployment (infra:up starts all three)"
  - id: BR8.10
    statement: "wait-for.mjs checks TCP and HTTP readiness with a timeout and is shared by the demo scripts and the e2e setup."
    category: constraint
    applies_to: "scripts/wait-for.mjs"
    trigger: "—"
    logic: "waitForTcp(host, port, {timeoutMs, probe?}) and waitForHttp(url, {timeoutMs, expectStatus}) resolve when ready and reject with the target and the elapsed time after the timeout; polling every 500 ms."
    violation: "Rejects"
    source: "T-504 owned paths, Tests to write"
  - id: BR8.11
    statement: "demo:clock is not built in release 1."
    category: policy
    applies_to: "scripts/demo-clock.mjs (not created), root package.json"
    trigger: "—"
    logic: "No release-1 code reads the demo clock; the reset returns the offset to 0. T-309 builds demo:clock in release 2."
    violation: "—"
    source: "Q9"
  - id: BR8.12
    statement: "The demo scripts' pure parts have tests."
    category: validation
    applies_to: "scripts/__tests__/ (Vitest, scripts project)"
    trigger: "pnpm check"
    logic: "wait-for resolves on a listening port and rejects after the timeout; the preflight detects a port held by a temporary listener and names it; .env generation writes three keys of the right length, MAIL_RECIPIENT_KEY different from APP_ENCRYPTION_KEY, and .gitignore contains .env; the reset refuses APP_MODE=production; the seed-if-empty decision for 0 and for n rows."
    violation: "pnpm check red"
    source: "T-504 Tests to write"

  # BR9 — Health probes (recorded addition)
  - id: BR9.1
    statement: "The health route probes the queue, the mail sink and the scanner, each within 2 seconds."
    category: constraint
    applies_to: "apps/web/src/server/health.ts"
    trigger: "GET /api/health"
    logic: "queue: 'select 1 from pgboss.version limit 1' on the shared pool; mail: TCP connect to SMTP_HOST:SMTP_PORT and read a line starting '220', then send QUIT; scanner: TCP connect to CLAMD_HOST:CLAMD_PORT, send 'zPING\\0', read 'PONG'. Each answers ok, else down (timeout, refusal or wrong answer). Hosts and ports come through the web env module with the worker's defaults (localhost, 1025, 3310). The probes run in parallel."
    violation: "—"
    source: "Q18, AC12.3.1, AC12.3.2"
  - id: BR9.2
    statement: "ok is true when the database, the queue and mail are ok; a down scanner is reported but does not make ok false; the body never carries error details."
    category: policy
    applies_to: "health.ts healthReport"
    trigger: "—"
    logic: "ok = db == ok AND queue == ok AND mail == ok. The body keeps the merged shape {ok, db, queue, mail, scanner, mode}. Evidence fails closed without the scanner, so the demo stays usable."
    violation: "—"
    source: "Q18, FD-035 (fail closed)"
  - id: BR9.3
    statement: "Each probe has unit tests with fake sockets."
    category: validation
    applies_to: "apps/web/src/server/health.test.ts"
    trigger: "pnpm check"
    logic: "For mail and scanner: right answer ok; wrong answer, closed socket and timeout down; for the queue: query resolves ok, rejects down, hangs down after 2 s. ok false when queue or mail is down; ok true with scanner down."
    violation: "pnpm check red"
    source: "construction.md Testing Standards"

  # BR10 — DEMO.md and the walk-through record
  - id: BR10.1
    statement: "DEMO.md is presenter-facing: at most ten lines of prose, the accounts table and a short 'If something fails' list, and it matches the banner."
    category: constraint
    applies_to: "DEMO.md"
    trigger: "Code Generation"
    logic: "Title, prerequisites (Docker Desktop running, Node 24, pnpm 11, about 6 GB free disk, Docker's disk file grows with each reset), the one command and its three URLs, the accounts table (BR8.6), the walkthrough pointer, reset and stop commands, what release 1 does not include (staff console, search, notifications and the rest of FD-105's list, in one line), and 'Fictional records only: every name, account and document is synthetic.' If something fails: Docker not started; port 3000, 5433 (a local PostgreSQL service), 1025/8025 or 3310 taken; ClamAV still loading its signatures on first start; long paths (git config core.longpaths true); after several resets, the Docker disk clean-up. No attribution."
    violation: "Review finding"
    source: "T-504 steps 4 and 5"
  - id: BR10.2
    statement: "The walk-through record has one row per storyboard step and locale, with expected, observed, evidence and a verdict."
    category: constraint
    applies_to: "docs/validation/U50-walkthrough.md"
    trigger: "Build and Test"
    logic: "Header: date, main commit, OS, Docker, Node, pnpm and Chromium versions, the Bengali font in use (BR10.7), the clean-clone timings. Table columns: Step | Locale | Theme | Width | Expected (storyboard text, release-1 part) | Observed | Evidence (test title, trace path or the manual action) | Verdict | ISS. Verdict is one of 'pass', 'fail (ISS-nnn)', 'release 2 (FD-105, <Unit or task>)'. Steps 1–28 each appear at least once; Parts 1–4 in bn then en; both themes at least once; 360 px and 1280 px at least once each."
    violation: "Record incomplete: the gate matrix cannot be PASS"
    source: "Q12, T-504 step 7"
  - id: BR10.3
    statement: "The record includes the manual steps that the suite cannot automate safely."
    category: constraint
    applies_to: "U50-walkthrough.md 'Manual checks' table"
    trigger: "Build and Test"
    logic: "Stop the ClamAV container: /api/health shows scanner down with ok true, a new upload stays 'scanning' and is never counted, starting clamd lets it finish; stop Mailpit: health shows mail down and ok false; Ctrl+C on pnpm demo stops web and worker and leaves the containers; a port held on 3000 gives the clear message; pnpm demo twice keeps data and does not duplicate doctors; pnpm demo:reset --yes then sign in as shirin_88 works, storage regenerated and Mailpit empty."
    violation: "Missing rows: the gate matrix cannot be PASS"
    source: "T-504 Acceptance, AC12.3.2"
  - id: BR10.4
    statement: "A clean-clone rehearsal is timed with fresh volumes under a separate compose project."
    category: constraint
    applies_to: "U50-walkthrough.md 'Clean clone'"
    trigger: "Build and Test"
    logic: "With the main demo stopped (pnpm demo:down), clone into a temporary folder, pnpm install --frozen-lockfile, run pnpm demo with RK_COMPOSE_PROJECT=rogikotha_rehearsal (demo.mjs passes it as -p); record time to the banner (target under 6 min with cached images, under 15 on first pull); then docker compose -p rogikotha_rehearsal down -v removes only the rehearsal volumes. Over target is an S3 row; a demo that does not start is S1."
    violation: "S1 or S3 row"
    source: "T-504 step 6, AC1.1.1, AC1.1.2"
  - id: BR10.5
    statement: "The local rollback is walked once as a drill."
    category: constraint
    applies_to: "U50-walkthrough.md 'Rollback drill'"
    trigger: "Build and Test"
    logic: "In a scratch worktree from main: commit a deliberate break (the home page throws), confirm /en answers 500, git revert that commit, pnpm db:reset && pnpm db:seed, confirm the demo runs and pnpm check and pnpm smoke are green; then remove the scratch worktree and branch. Nothing from the drill reaches main."
    violation: "Missing row"
    source: "AC12.3.4, team.md Deployment (rollback)"
  - id: BR10.6
    statement: "The storyboard is corrected to the seed for r6's author, and ISS-261 is closed."
    category: constraint
    applies_to: "docs/implementation/05-demo-storyboard.md (recorded addition)"
    trigger: "Code Generation"
    logic: "Seeded-accounts table: rafi_c is 'verified, no content; used for discussion'; a row for named_tanvir-ahmed as r6's author (named). Steps 15, 17 and 19: 'the author of r6 (named_tanvir-ahmed)' where they named rafi_c as that author. ISS-261 status 'fixed in U50'."
    violation: "—"
    source: "Q19, ISS-261"
  - id: BR10.7
    statement: "The record states which Bengali body font the browser used, because the body font comes from the system stack."
    category: constraint
    applies_to: "U50-walkthrough.md header"
    trigger: "Build and Test"
    logic: "document.fonts.check for 'Noto Sans Bengali', 'Nirmala UI', 'Shonar Bangla', 'Kalpurush' and 'SolaimanLipi' in that order on /bn; the first true is recorded; layout checks run after document.fonts.ready."
    violation: "—"
    source: "Risks (Bengali fonts), tokens.css --bangla"

  # BR11 — Release-1 gate matrix and verdict
  - id: BR11.1
    statement: "RELEASE-1-GATES.md part A has one row per acceptance row of every release-1 Unit's task files, amendments included."
    category: constraint
    applies_to: "docs/validation/RELEASE-1-GATES.md"
    trigger: "Build and Test"
    logic: "Units: U9 (T-102), U11 (T-104), U20 (T-207), U22 (T-302), U41 (T-502), U46 (T-201, T-202, T-203), U47 (T-301, T-306, T-307), U48 (T-303, T-304), U49 (T-401, T-402), U50 (T-503, T-504, T-505); the merged foundation Units (U1–U8, U45 and the CR Units) get one row each citing their record and the final pnpm check. Columns: Unit | Task | Row (its first cell, FD label kept) | Expected | Observed on main <commit> | Evidence | Verdict (pass, fail (ISS-nnn), deferred to release 2 (FD-105))."
    violation: "Missing rows: verdict cannot be PASS"
    source: "Q13, T-505 step 2, unit-of-work.md 'Decision changes per Unit'"
  - id: BR11.2
    statement: "Observed values are re-executed on the final main, not copied from earlier records."
    category: policy
    applies_to: "RELEASE-1-GATES.md part A"
    trigger: "Build and Test"
    logic: "A command row is rerun on main after the last merge (pnpm check, pnpm smoke, pnpm e2e twice, pnpm e2e:perf, pnpm check:motion, pnpm contrast, pnpm contrast:patient, npx impeccable detect apps/web/src --no-advisory, pnpm i18n:check, the coverage floor in test:coverage). A behaviour row is backed by a journey test title or a walk-through row. A row whose evidence exists only in the Unit's earlier record is 'fail' until rerun."
    violation: "—"
    source: "T-505 Goal (against the running app, AD-16), AC1.1.1, AC1.1.3, AC12.1.4"
  - id: BR11.3
    statement: "Part B classifies the production capability and architecture acceptance gates; part C addresses every release stop condition, none of which may be hit."
    category: constraint
    applies_to: "RELEASE-1-GATES.md parts B and C"
    trigger: "Build and Test"
    logic: "B: each bullet of docs/planning/10-validation-strategy.md 'Production capability gates' and docs/planning/05-recommended-architecture.md 'Architecture acceptance gates' as 'demonstrated locally (evidence)' or 'deferred (reason)'; includes the US2.2 checks: the live prototype gallery shows only 04b and the staff console, earlier concepts open from ui-design-prototype/.archive/, and no Tailwind, CSS-in-JS or animation library in any package.json. C: each release stop condition 'not hit (evidence)' or 'hit (ISS-nnn)'."
    violation: "A hit stop condition: verdict FAIL"
    source: "T-505 step 2, AC2.2.2, AC2.2.3, AC2.4.1"
  - id: BR11.4
    statement: "The release verdict is PASS, PASS WITH FOLLOW-UP or FAIL by fixed conditions."
    category: policy
    applies_to: "docs/validation/U50.md verdict"
    trigger: "End of Build and Test"
    logic: "FAIL IF any part-A row fails, any stop condition is hit, the NFR13 gate fails, either e2e run is not clean (BR1.6), pnpm check or pnpm smoke is red on main, or an S1 or S2 row is open in a release-1 area. ELSE PASS WITH FOLLOW-UP IF any owner review item (BR12.1) is open or any S3 or S4 row was added by U50, each with its owner. ELSE PASS."
    violation: "—"
    source: "Q14, team.md (open S1 blocks Build and Test, open S2 blocks the phase gate), T-505 Verdict"
  - id: BR11.5
    statement: "RELEASE-1-REVIEW-CHECKLIST.md walks every release-1 URL in en and bn against its hard rules, plus four negative probes."
    category: constraint
    applies_to: "docs/validation/RELEASE-1-REVIEW-CHECKLIST.md"
    trigger: "Build and Test, against the running pnpm demo"
    logic: "Rows: /, /emergency, /about, /terms, /privacy, /doctors, /doctors/<id>, /facilities, /facilities/<id>, /topics, /topics/<id>, /experiences, /experiences/<id>, /experiences/<id>/edit, /authors/<username>, /register, /verify-email (each panel), /sign-in, /reset-password, /me, /me/security, /write, and the 404 page; each × en and bn; cells ✓ (evidence), ✗ (ISS-nnn) or n/a. Probes: (1) GET /api/evidence/items/<id>/original signed out and signed in as another account: not 2xx and not image/*; (2) a seeded hidden review by direct URL: 404; (3) /authors/anon_author_r2 shows the empty state and r2 is absent from every author page; (4) another account's /experiences/<id>/edit: 404. Release-2 routes still on main (search, saved, notifications, admin) are listed as 'release 2' with what they show."
    violation: "Missing rows: verdict cannot be PASS"
    source: "T-505 step 4, project.md Mandated (original evidence separate), U22 WF1, U47 WF8"

  # BR12 — Owner review checklist
  - id: BR12.1
    statement: "U50-owner-review.md lists every review only the owner can give, with what to open, in which languages, themes and widths, and what to tick."
    category: constraint
    applies_to: "docs/validation/U50-owner-review.md"
    trigger: "After the automated gate is green"
    logic: "Items: (1) FD-053 content review of the T-102 screens; (2) FD-091 look review of the same screens; both on register, verify-email (pending, confirm, done, expired), sign-in (with each notice), reset (request, new password, mismatch), the security page, the account menu and the write and comment gates, each in en and bn, light and dark, at 360 px; (3) U45's look review of the restyled patient shell in en and bn; (4) the storyboard walk of Parts 1–4 in en and bn with the FD-042 Bengali copy review of every bn string added since the last owner review (the key list comes from git diff of bn.json since that review's commit); (5) the demo-slice items: the Bengali text of 2026-11-01, ISS-398 as accepted risk, ISS-330 and ISS-384 decisions; (6) the written sign-offs of the high-risk Units that carry agent-written 'delegated by the owner on 2026-11-04' sign-offs; (7) the FD rows awaiting the owner's confirmation. Each item: where, about how long, a tick box, and 'a finding becomes an ISS row with Found in U50 owner review'."
    violation: "—"
    source: "Q14, OWNER-REVIEW-QUEUE.md 'Owner reviews waiting' and the 2026-11-04 U9 Q13 row, FD-042"
  - id: BR12.2
    statement: "The agent never ticks an owner item and never presents a delegated approval as the owner's."
    category: policy
    applies_to: "U50-owner-review.md, U50.md, OWNER-REVIEW-QUEUE.md"
    trigger: "—"
    logic: "Agent-made approvals are labelled 'decided by the agent under the owner's delegation of 2026-11-04'; the owner's items stay unticked until the owner edits them or tells the agent the result in their own words."
    violation: "Review finding"
    source: "OWNER-REVIEW-QUEUE.md 2026-11-04 'Approvals delegated'"

  # BR13 — Close-out
  - id: BR13.1
    statement: "U50.md is the Unit's record, with a ten-line summary for the owner at the top."
    category: constraint
    applies_to: "docs/validation/U50.md"
    trigger: "End of Build and Test"
    logic: "Summary: verdict, what release 1 demonstrates, what is deferred, the three largest residual risks, the owner's open items, the next gate. Then: commands with exit codes, the two e2e run summaries, NFR13 figures (every run), the leftover-removal inventory and its grep results, the demo.spec.ts mapping, the ISS ids found and fixed in U50. No model, tool or agent identity."
    violation: "—"
    source: "T-505 step 8, team.md (each Unit's Build and Test record lists its ISS ids)"
  - id: BR13.2
    statement: "The status and planning documents are brought into line with release 1."
    category: constraint
    applies_to: "docs/status/{current-status,validation-log,decision-log,risk-register,dependency-check-log}.md, docs/planning/09-coverage-matrix.md, README.md, recorded additions"
    trigger: "Close-out"
    logic: "current-status: 'Release 1 delivered locally on main (<date>); release 2 and production not started'. validation-log: one entry per release-1 Unit gate plus RELEASE-1-GATES, with the next free V numbers, each with ids, commit range, environment, commands and exit codes, expected and observed, 'AI-DLC reviewer pass, <date>', limitations and verdict. decision-log: the FD rows of functional-spec.md § 12 and the As-of date. risk-register: U41 residuals, U50 S3 rows, Windows notes, Bengali system font, local NFR13 proxy. dependency-check-log: a close-out entry with the installed versions from pnpm-lock.yaml. 09-coverage-matrix: the status of each release-1 row (Done, Partial with the missing criterion, or 'release 2 (FD-105)'), citing the journey test title or gate-matrix row as its evidence; the existing prototype proof anchors stay as they are, because the coverage and proof tools are not extended in release 1 (cut for the 7 November date, ISS row R15). README.md: one 'Run the demo' section pointing at DEMO.md and the docs entry points (docs/implementation/README.md, docs/validation/); the full rewrite is release 2 (ISS row R16). Recorded additions: docs/implementation/README.md §5 tracker and 00-master-plan.md §5 (the FD-105 release split, required by unit-of-work.md), OWNER-REVIEW-QUEUE.md (U50's rows). PRODUCT.md, DESIGN.md and docs/scope-of-work.md are not edited in release 1 (ISS row R16)."
    violation: "Inconsistent dates or phase between documents: review finding"
    source: "T-505 steps 5–7, unit-of-work.md 'Documentation follow-ups', review 01 R-12"
  - id: BR13.4
    statement: "The three task files get their release-1 amendment, and nothing in them names a model."
    category: constraint
    applies_to: "docs/implementation/tasks/T-503-*.md, T-504-*.md, T-505-*.md"
    trigger: "Code Generation"
    logic: "'## Amendments — release 1 (FD-105)' after the header table: the deferred parts (Firefox, WebKit, other viewports, committed screenshots, staff and workspace journeys, search, PWA, e2e.yml, demo:clock), the decisions of this design that change the task text (Q1–Q26 and the cut list), and the acceptance rows Build and Test records as 'deferred to release 2 (FD-105)'. The existing header lines are left as history; the amendment adds no model or tool name."
    violation: "—"
    source: "unit-of-work.md 'Decision changes per Unit' (FD-074, FD-105)"
  - id: BR13.5
    statement: "The close-out ends with the attribution and identity checks clean."
    category: validation
    applies_to: "U50 Build and Test"
    trigger: "Last step"
    logic: "pnpm check:identity green; 'git log main --format=\"%an %ae %b\"' for U50's commit shows only the owner's identity and no trailer; grep -riE 'co-authored-by|generated (with|by)' docs README.md DEMO.md returns no new hit; no model name in any file U50 wrote."
    violation: "S1 row"
    source: "project.md Forbidden (identity), T-505 Acceptance 'No attribution'"

  # BR14 — Demo leftovers
  - id: BR14.1
    statement: "Before removing anything, U50 records an inventory of every demo-slice export and its callers."
    category: constraint
    applies_to: "U50.md 'Leftover inventory'"
    trigger: "Start of Code Generation, after rebasing on main"
    logic: "For each export of packages/database/src/demo/*.ts, each export * line of demo/index.ts and each binding in apps/web/src/server/data.ts: grep apps/ and packages/ and record every caller with its path, or 'none'. The table is the release-2 starting point for everything U50 does not delete."
    violation: "—"
    source: "OWNER-REVIEW-QUEUE.md 2026-11-05 row, U46 F6, U47 § 9, U22 § 8, U49 § 6"
  - id: BR14.2
    statement: "U50 deletes a demo-slice item only when the grep shows zero callers; everything else stays for release 2 with an S4 row."
    category: constraint
    applies_to: "packages/database/src/demo/, apps/web/src/server/data.ts"
    trigger: "Code Generation"
    logic: "Zero callers means: no reference anywhere in apps/ or packages/ except the item's own rows in the demo folder's *.int.test.ts files. An item referenced by demo-slice.smoke.test.ts, by any *.adversarial.test.ts or by any file outside demo/ stays (those tests carry protections and smoke assertions that only grow). Deleting an item deletes its own test rows in the same commit, followed by pnpm check. A whole module file goes, with its export * line in demo/index.ts and its bindDb line in data.ts, only when every export in it has zero callers and no code reads that binding. The demo_clock table in schema/demo.ts is not demo-slice code and is never touched. Not done in release 1 (ISS row R13): emptying demo/ and data.ts, demo types in packages/contracts/src/view-models/demo.ts, unused message keys, the T-201 and T-301 stub methods and their fakes, and moving protections out of demo tests."
    violation: "pnpm check red"
    source: "Q16 (revised after review 01), review 01 R-12"
  - id: BR14.7
    statement: "apps/web/e2e/smoke/demo.spec.ts is deleted once each of its assertions maps to an existing journey or smoke assertion; motion.spec.ts stays."
    category: constraint
    applies_to: "apps/web/e2e/smoke/"
    trigger: "Code Generation"
    logic: "Mapping table in U50.md: each expect of demo.spec.ts → the new test title that asserts the same behaviour. A release-1 smoke spec e2e/smoke/release1.smoke.spec.ts holds one short assertion per storyboard part (home, sign-in, publish, comment) in en and bn, without the scanner."
    violation: "—"
    source: "Q8, team.md Testing Posture"
  # BR15 — Ownership and constraints
  - id: BR15.1
    statement: "U50 writes inside its owned paths and the recorded additions listed in functional-spec.md § 9 only."
    category: constraint
    applies_to: "U50 Bolt"
    trigger: "git diff --cached before each commit"
    logic: "Any other path is a review finding unless it is a fix of 1 hour or less in the owning component, marked '/* fix: U50 <finding> */' or '// fix: U50 <finding>.' and listed in the hand-off; a larger fix becomes an ISS row for release 2 or for the owning Unit."
    violation: "Review finding"
    source: "unit-of-work.md U50 owned paths, T-503 step 7, team.md (commit only owned paths)"
  - id: BR15.2
    statement: "No GitHub Actions workflow is added or changed."
    category: constraint
    applies_to: ".github/workflows"
    trigger: "—"
    logic: "The Bolt diff contains no path under .github/workflows (BR1.9 also checks e2e.yml is absent)."
    violation: "Review finding"
    source: "FD-102"
  - id: BR15.3
    statement: "No tool, model or agent identity appears in any U50 file, validation records included."
    category: constraint
    applies_to: "every file U50 writes"
    trigger: "Every commit"
    logic: "A reviewer pass is written 'AI-DLC reviewer pass, <date>'. T-505's 'model id allowed here only' is overruled by project.md and corrected in its amendment."
    violation: "S1 row"
    source: "Q21, project.md Forbidden"
  - id: BR15.4
    statement: "U50 adds no user-facing string unless a fix needs one, and then in en and bn in the same commit."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Any UI fix"
    logic: "New keys follow the owning module's naming; pnpm i18n:check stays green."
    violation: "pnpm check red"
    source: "project.md Mandated (bilingual keys)"
  - id: BR15.5
    statement: "U50's Code Generation starts after all nine dependencies have merged, from a rebased main."
    category: constraint
    applies_to: "U50 Bolt"
    trigger: "Bolt start"
    logic: "Baseline pnpm check and pnpm smoke green on main first; open ISS rows in U50's areas read (ISS-309, ISS-310, ISS-323, ISS-443, ISS-261)."
    violation: "—"
    source: "unit-of-work.md U50 Depends on, team.md step 1"
  - id: BR15.6
    statement: "The dependency check is done before the first install of @axe-core/playwright and lighthouse and before Playwright is used again."
    category: constraint
    applies_to: "docs/status/dependency-check-log.md"
    trigger: "Code Generation start"
    logic: "The Playwright entry (1.64.1, checked in October) is older than 3 days: re-check the current stable release; check @axe-core/playwright (matching axe-core) and lighthouse (its Node and Chromium support, user-flow API) for their latest stable versions and known issues; record the puppeteer-core range lighthouse declares (lighthouse-flow.ts imports that bundled copy, BR5.2); append a dated entry; pin exact versions as devDependencies of apps/web."
    violation: "Review finding"
    source: "project.md Mandated (dependency check), AGENTS.md, review 01 R-06"
```

## Rules summary

- **Suite (BR1):** Chromium only in three projects, production build on port 3107 with the worker, its own seeded database, both locales with equal counts, independent tests built by per-test helpers (one `describe.serial` group for one account's register-to-reset life), two clean runs with no flaky test, no fixed sleeps, one browser run at a time, the config test in the web Vitest project, `pnpm smoke` stays Vitest-only and the browser smoke runs in `pnpm e2e`.
- **Journeys (BR2):** Parts 1–4 of the storyboard as release 1 has them, with hard rules on every page checked by structure (no rating feature) plus a word-boundary test over the message files, writes only about a doctor no reading test asserts, copy from the message files, release-2 steps left to the record, U41's outcomes and the health route.
- **Accessibility and motion (BR3, BR4):** axe on every page and sheet, keyboard-only register, sign-in and composer, linked form errors, lang and numerals, no overflow at 360 px, live-region announcements, zoom and text spacing; reduced motion by OS (Part 1, the composer, the motion-switch spec) and by switch, never-animated safety elements, no reward motion, nothing looping.
- **NFR13 (BR5):** Lighthouse user flow, four pages, median of five, LCP element never animated, at least one interaction for INP, Lighthouse's own puppeteer, one manual idle rerun, failure is S1.
- **Mail and data (BR6, BR7):** Mailpit by recipient and subject, single link, no deletes; synthetic data with run sentinels, seeded facts by name, fixtures by path, no test-support import.
- **Demo (BR8, BR9, BR10):** one-command demo with preflight, readiness waits, seed-if-empty, build, children and banner; reset; no clock in release 1; health probes for queue, mail and scanner; DEMO.md; walk-through record with manual checks, clean clone, rollback drill; storyboard corrected for ISS-261.
- **Release (BR11–BR13):** gate matrix re-executed on final `main`, production gates and stop conditions, fixed verdict rules; owner checklist never ticked by the agent; close-out documents (no tool changes, no PRODUCT.md, DESIGN.md or scope-of-work.md edits); identity clean.
- **Leftovers (BR14) and ownership (BR15):** inventory, delete only zero-caller items, everything else left for release 2, `demo.spec.ts` replaced by mapped tests; owned paths, no CI, no identity, bilingual keys, dependency check first.
