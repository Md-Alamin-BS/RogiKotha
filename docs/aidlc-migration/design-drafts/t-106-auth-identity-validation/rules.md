# Business rules — U13 `t-106-auth-identity-validation`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-106-auth-identity-validation/functional-design/`.

Source of truth for this Unit's decision logic: what the validation must observe, how it isolates itself, and how it turns observations into a verdict. Built from T-106, `unit-of-work.md` (U13), `stories.md` (US3.1–US3.3, US11.1), `contract-summary.md` (C1, C4, C5), the decision log (FD-039, FD-053, FD-056–FD-059, FD-063, FD-071, FD-088, FD-093, FD-094), `01-conventions.md` §5, §10–§14, `team.md`, `project.md`, and the drafts of U8 T-101, U9 T-102, U10 T-103, U11 T-104 and U12 T-105, whose rules are cited as `U8 BRx.y` and so on. The rules follow the answers in `functional-design-questions.md` (Questions 1–12, all A, decided by the agent under the owner's no-questions instruction of 2026-10-29). Matrix ids (M1–M35) and test ids (A1–A10, X1–X5) refer to `functional-spec.md` §§ 6–7.

```yaml
rules:
  # Group 1 — Who validates, and what the record names
  - id: BR1.1
    statement: "The validation has four independent roles: the build agent runs the matrix, the AI-DLC reviewer reads the diff and the evidence, a second separate agent writes 3-5 tests against the evidence, and the owner approves."
    category: policy
    applies_to: "U13 as a whole"
    trigger: "Code Generation through the phase gate"
    logic: "The build agent never reviews its own evidence; the reviewer and the adversarial agent are separate agent sessions; collaborators are on for this Unit; no second vendor's tool is used (D12)"
    violation: "A verdict without the reviewer pass, the adversarial tests or the owner's sign-off is provisional and cannot open the gate"
    source: "D12, team.md Way of Working steps 4-5, AD-16 as amended by the proposed FD (Q1)"
  - id: BR1.2
    statement: "No validation record, test, comment or commit names a tool, model or vendor."
    category: constraint
    applies_to: "docs/validation/PHASE-1.md, every file this Unit writes, its commits"
    trigger: "Any write"
    logic: "PHASE-1.md has no 'validator model id' line; roles are named instead; the README §4 and template lines that ask for a model id are amended by the proposed FD; existing records stay as history"
    violation: "S1 (project.md Forbidden; ISS-057 precedent)"
    source: "project.md Forbidden, AGENTS.md, Q1"
  - id: BR1.3
    statement: "The owner's approval is a line in PHASE-1.md and a written sign-off in this Unit's record, both before the phase gate."
    category: policy
    applies_to: "PHASE-1.md, the Unit record"
    trigger: "Verdict written"
    logic: "PHASE-1.md ends with 'Approved by: <name>, <date>' left blank for the owner; until filled the verdict reads provisional"
    violation: "The gate edges of BR7.4 stay closed"
    source: "T-106 step 6, team.md step 5"

  # Group 2 — Isolation of the run
  - id: BR2.1
    statement: "The run uses its own worktree, development database, test database and web port."
    category: constraint
    applies_to: "WF1"
    trigger: "Environment set-up"
    logic: "DATABASE_URL -> rogikotha_t106, DATABASE_URL_TEST -> rogikotha_test_t106, APP_URL http://localhost:3106, web on 3106; the shared compose containers are neither restarted nor reset"
    violation: "A matrix step that suspends an account, revokes a device or applies configuration on a shared database breaks sibling worktrees (FD-094)"
    source: "FD-094, T-009 validation precedent, Q5"
  - id: BR2.2
    statement: "Only synthetic data is used, and the demo safety rails stay on."
    category: constraint
    applies_to: "every spec and helper"
    trigger: "Any account or address is created"
    logic: "Seeded accounts and addresses phase1-<run>-<n>@example.test only; APP_MODE never production; the demo marker stays visible"
    violation: "Real personal data is an S1"
    source: "project.md Forbidden, AD-14"
  - id: BR2.3
    statement: "Specs never share limiter state."
    category: constraint
    applies_to: "phase1 and phase1-limits Playwright projects"
    trigger: "Any request from a spec"
    logic: "Each spec sets its own x-forwarded-for value; addresses are fresh per run where a seeded account is not required; rate-limit specs run in phase1-limits, after phase1, with a server restart between the two projects"
    violation: "A refusal caused by another spec's counter makes a row unrepeatable (FAIL by BR7.1)"
    source: "U8 F14, F15, BR3.2; Q6"
  - id: BR2.4
    statement: "A Mailpit message is used only when its recipient, time and link origin belong to this run."
    category: validation
    applies_to: "Mailpit helper"
    trigger: "A spec reads mail"
    logic: "recipient equals the spec's address; received after the spec's start; every link's origin equals APP_URL (port 3106); otherwise ignore the message"
    violation: "A sibling's approval or reset link used by this run"
    source: "Q5, F9"
  - id: BR2.5
    statement: "Timing and browser rows run against the production build."
    category: constraint
    applies_to: "M1, M2 and every E row"
    trigger: "WF1 step 3"
    logic: "next build then next start on 3106; 3 warm-up runs discarded; 20 measured runs; medians compared"
    violation: "Medians from next dev measure compilation, not the defence"
    source: "T-106 acceptance 'Enumeration — timing', Q10"
  - id: BR2.6
    statement: "SQL set-up steps touch only the run's own development database."
    category: constraint
    applies_to: "apps/web/e2e/phase1 SQL helper"
    trigger: "A spec suspends an account, expires a token or reads a count"
    logic: "The helper runs psql inside the compose PostgreSQL container; it refuses unless the database name is rogikotha_t106 and APP_MODE is not production; it never prints a token or address it reads"
    violation: "An S1 if it changes another database"
    source: "T-106 matrix rows 'Token expiry' and 'Suspended', F21"

  # Group 3 — Evidence
  - id: BR3.1
    statement: "Every matrix row records steps, expected, observed, status and evidence."
    category: validation
    applies_to: "PHASE-1.md matrix table"
    trigger: "A row is run"
    logic: "status in pass | fail | deferred | blocked; evidence is a test name, a response capture with its correlation id, a Mailpit message id or an SQL count"
    violation: "A row without evidence counts as not run (FAIL by BR7.1)"
    source: "T-106 step 3, 10-validation-strategy 'Verdict contract'"
  - id: BR3.2
    statement: "Every row sits at the lowest level that can observe its claim, and the expected result follows the binding design, not stale task text."
    category: policy
    applies_to: "M1-M35"
    trigger: "Test design"
    logic: "E for cookies, redirects, copy and multi-browser flows; W for clocks, counts and refusal recording; D for grants and catalog; A for pure guards; where the task text and a finalised design differ, the design wins and the difference is listed"
    violation: "Correct behaviour reported as a defect, or a claim no level observes"
    source: "Q3, Q4; F3, F11-F14"
  - id: BR3.3
    statement: "A row that cannot fail is not counted as passed."
    category: validation
    applies_to: "M23, M24, any row over empty data or a placeholder page"
    trigger: "The surface or data the row needs is absent in Phase 1"
    logic: "Run the data- or command-level part now; mark the page-level part deferred with the owner Unit and the acceptance row that carries it"
    violation: "A vacuous pass (construction.md Testing Standards)"
    source: "Q2, F5"
  - id: BR3.4
    statement: "The builder adds at least five adversarial tests the implementers did not write; all of A1-A10 are planned."
    category: validation
    applies_to: "functional-spec § 7.1"
    trigger: "WF4"
    logic: "each A-test is a regression test that stays green while the defence holds; the record lists each with its result"
    violation: "Fewer than five fails T-106 step 4"
    source: "T-106 step 4"
  - id: BR3.5
    statement: "A test that exposes a defect is committed as an expected failure named by its ISS id."
    category: policy
    applies_to: "every W, D, A and E test"
    trigger: "A row fails"
    logic: "Vitest it.fails('ISS-nnn: ...') or Playwright test.fail with the ISS id in the title; the ISS row names the owner Unit; the fixer converts it to a normal test"
    violation: "A red gate, or a skipped or deleted test (team.md: the suite only grows)"
    source: "ISS-139 precedent in validator-probes.int.test.ts, F23"
  - id: BR3.6
    statement: "Every ASSUMPTION and TODO marker in the five Units' owned paths is classified."
    category: validation
    applies_to: "WF2, M35"
    trigger: "Diff reading"
    logic: "held | differs | accepted risk (with owner Unit); differs is a finding"
    violation: "An unread marker is a gap in the record"
    source: "T-106 step 2"
  - id: BR3.7
    statement: "No existing test is edited and no product source file is changed."
    category: constraint
    applies_to: "the Unit's diff"
    trigger: "Any commit"
    logic: "only the owned paths and recorded additions of functional-spec § 15"
    violation: "Out-of-scope edit; the reviewer refuses the Unit"
    source: "T-106 owned paths and Not in scope"

  # Group 4 — Authorization expectations (what each row must observe)
  - id: BR4.1
    statement: "Register, resend, reset and a failed sign-in look and cost the same for unknown, pending, active and suspended addresses."
    category: authorization
    applies_to: "M1, M2"
    trigger: "Each probe"
    logic: "same status, same rendered state and same Set-Cookie names and attributes (rk.pending in every register case) apart from correlation id, nonce and expiry; medians differ by less than 15%"
    violation: "An enumeration oracle (S1)"
    source: "U8 BR1.4, BR1.6, BR3.11, BR5.1; U9 BR3.5, BR4.7"
  - id: BR4.2
    statement: "Sign-in refusals follow FD-063 and C5 exactly, on both sign-in routes with one counter."
    category: authorization
    applies_to: "M10-M13"
    trigger: "Repeated failures"
    logic: "per normalised email: from the 3rd failure refusals with retryAfterSec 1, 2, 4, 8, 16, 30, 30; at 10 failures in 15 min every attempt refused, the right password included, with no password check; per network 30 failures in 15 min; sign-up 5 / h / network; resend and reset 3 / h / address; device-approval emails 3 / h / account; step-up 5 failures / 15 min; windows reset when they pass; staff and patient routes share the email and network keys"
    violation: "A different sequence or a password check on a refused attempt fails AC3.1.5"
    source: "FD-058, FD-063, C5, U8 BR3.2, BR3.3, U10 BR4.2, BR5.6, BR7.7"
  - id: BR4.3
    statement: "Reset tokens are single use; a second verification confirm changes nothing; expired tokens give auth.token_expired."
    category: authorization
    applies_to: "M3, M4"
    trigger: "A token is presented again or late"
    logic: "reset reused -> auth.token_invalid; verify reused on an active account -> ok, no state change, no second email_verified row; verify on a suspended, banned or deleted account -> auth.token_invalid and no session; past expiry -> auth.token_expired with the expired copy"
    violation: "A reused reset token, or a session for a suspended account, is S1"
    source: "U8 BR2.2, BR2.3, BR5.2; AC3.1.4, AC3.2.2; Q3"
  - id: BR4.4
    statement: "Sessions end on sign out everywhere, on a reset, on a password change and 30 days after creation."
    category: authorization
    applies_to: "M5, M6, M7"
    trigger: "The ending event"
    logic: "the other context's next request carries an anonymous Actor; a session older than 30 days from created_at is refused and revoked even if the library refreshed it"
    violation: "A live session after the event fails AC3.2.2-AC3.2.4"
    source: "U8 BR4.1, BR4.6, BR5.2, BR5.3; FD-057"
  - id: BR4.5
    statement: "A cross-origin post of a server action changes nothing."
    category: authorization
    applies_to: "M9"
    trigger: "Origin differs from the host"
    logic: "rejected; no session cookie, no audit row, no email, no session revoked"
    violation: "CSRF (S1)"
    source: "U8 BR4.2, U9 BR13.5, U10 T16"
  - id: BR4.6
    statement: "A suspended account has no session and no appeal route."
    category: authorization
    applies_to: "M14"
    trigger: "status set to suspended"
    logic: "old cookie -> anonymous Actor with refusal, errors.auth.accountSuspended shown once on /sign-in; right password -> refused, no session; the copy links to no appeal (FD-088)"
    violation: "A suspended account acting is S1"
    source: "U8 BR3.6, BR4.8; U9 BR4.8; FD-088"
  - id: BR4.7
    statement: "Staff powers exist only with an approved device for the same active staff account."
    category: authorization
    applies_to: "M15, M19"
    trigger: "Any request"
    logic: "no session or no staff role -> console redirect to /<locale>/admin/sign-in?next=..., no console markup in the body; staff account without an approved device -> staffRole undefined, capabilities [], every staff command forbidden with nothing written; a device approved for one account gives another account nothing"
    violation: "Staff powers from a password alone is S1"
    source: "U10 BR2.3, BR3.1-BR3.3; AC3.2.5"
  - id: BR4.8
    statement: "Device approval needs the emailed link, the same browser and the password, and dies after three wrong passwords."
    category: authorization
    applies_to: "M16-M18"
    trigger: "Staff sign-in on an unknown device"
    logic: "no session before approval; one mail for this run; link in another browser -> auth.device_mismatch with no strike and no password check; 3rd wrong password -> auth.token_invalid with failed_attempts 3 committed; revoking the current device signs out and clears rk_staff_device and rk_stepup"
    violation: "Approval from another browser or unlimited guesses is S1"
    source: "U10 BR5.1-BR5.3, BR5.8, BR6.3; AC3.2.5"
  - id: BR4.9
    statement: "A step-up is valid only for the same account and session, for 300 seconds, with an untampered value."
    category: authorization
    applies_to: "M20, A4"
    trigger: "A command requires stepUp"
    logic: "missing, stale (300 s + 1), tampered, other account's or other session's value -> auth.step_up_required; capability is checked before step-up, so a holder without the capability gets forbidden"
    violation: "A replayed or forged step-up accepted is S1"
    source: "U10 BR7.1-BR7.4; AC11.1.2"
  - id: BR4.10
    statement: "A reveal needs the capability, a fresh step-up and a purpose with a reason of at least 10 graphemes; Admin and Moderator hold the capability only through the configuration toggle; the email goes to a Super Admin only."
    category: authorization
    applies_to: "M21, M22, A7"
    trigger: "identity.reveal"
    logic: "toggle off -> forbidden (outcome no_capability); toggle on through config.apply -> granted without email for Admin; Moderator refused unless its own toggle is on; Super Admin granted with email; 9 graphemes -> validation (reason_too_short); signed out or malformed input -> refused and not recorded"
    violation: "An unrecorded or unauthorised reveal is S1"
    source: "U11 BR4.1-BR4.7, BR4.11; FD-016, FD-022; AC3.3.5"
  - id: BR4.11
    statement: "Configuration changes need config.write and a step-up, keep every invariant and never rewrite history."
    category: authorization
    applies_to: "M28, M29, A8, A9"
    trigger: "config.apply or config.rollback"
    logic: "Admin or Moderator -> forbidden, nothing written; unknown key at any depth, a structural key, a removed always-enabled report reason -> config.invariant; out of range -> config.out_of_range; rollback to version n -> a new version with rolled_back_from n; rollback to a missing version -> not_found; the current version is unchanged by every refusal"
    violation: "A silent or structural change fails AC11.1.3 and AC11.1.6"
    source: "U12 BR1.1, BR1.2, BR1.4, BR3.1, BR6.1, BR7.1-BR7.3; AC11.1.3, AC11.1.4, AC11.1.6"

  # Group 5 — Audit expectations
  - id: BR5.1
    statement: "Every state change the run exercises writes exactly one audit row in the same transaction, and a refusal writes one only where its design records it."
    category: constraint
    applies_to: "M20, M30"
    trigger: "Each command the specs call"
    logic: "success rows and recorded refusals exactly as functional-spec § 8; a wrong step-up password writes step_up_failed; a wrong approval password writes staff_device_approval_failed"
    violation: "A missing or extra row fails M30"
    source: "01-conventions §5, U8 BR7.11, U10 BR7.6, Q12 of U10"
  - id: BR5.2
    statement: "Every authenticated reveal attempt writes one identity_reveals row, one identity-stream audit row and one identity.revealed event; signed-out and malformed attempts write none."
    category: constraint
    applies_to: "M21, M22"
    trigger: "identity.reveal"
    logic: "granted true or false with outcome; requester_role null when the Actor has no staff role; UPDATE and DELETE on identity_reveals raise"
    violation: "An attempt without a trace is S1"
    source: "U11 BR5.1-BR5.3, BR5.7; AC3.3.5"
  - id: BR5.3
    statement: "A configuration refusal after requires passed writes config_rejected; a missing step-up is recorded too."
    category: constraint
    applies_to: "M20, M28, M29"
    trigger: "config.apply or config.rollback refused"
    logic: "config.invariant, config.out_of_range, validation, conflict, not_found -> config_rejected {operation, code, paths, unknownKeyCount}; auth.step_up_required -> config_rejected {code: auth.step_up_required, step_up: false} (cross-Unit change for U12, F25); forbidden -> nothing"
    violation: "AC11.1.2 'missing password ... failed attempt recorded' not met"
    source: "U12 BR8.3, WF6; AC11.1.2; F25"
  - id: BR5.4
    statement: "The audit difference of each suite equals its expected list exactly, and every details object is allowlisted."
    category: validation
    applies_to: "M30, X4"
    trigger: "After each suite"
    logic: "count audit_events grouped by stream and action before and after; compare with the fixture built from § 8 and the steps run; details carry ids, enums, counts, booleans and before/after values only"
    violation: "'At least' comparisons hide extra writes; a free-text or email value in details is S1"
    source: "T-106 'Audit completeness', 01-conventions §5, U8 BR8.2 (ISS-108)"

  # Group 6 — Privacy and leak expectations
  - id: BR6.1
    statement: "No public projection links an anonymous review to its author's account or other personas."
    category: constraint
    applies_to: "M23, M24, A6"
    trigger: "Reading r2 and its author"
    logic: "identity.publicByUsername('anon_author_r2') returns the pseudonymous persona only; r2's byline carries the thread alias and no username; the placeholder /authors page shows neither; search_documents has no username, account or persona column; page and search content checks deferred to U38 and U18"
    violation: "Alias linkage is S1"
    source: "U11 BR1.3, BR1.4, BR2.6; FD-039; AC3.3.2, AC3.3.3"
  - id: BR6.2
    statement: "The database offers no path from public content to an account except through persona_links, and the worker cannot read the private tables."
    category: constraint
    applies_to: "M25, M26"
    trigger: "Database probes"
    logic: "personas has no account column; every foreign-key path to account_profiles from reviews, comments, reactions or personas passes persona_links; as rk_worker, SELECT on persona_links, identity_reveals and auth_users raises 42501"
    violation: "S1"
    source: "AD-3, FD-041, 01-conventions §11, U11 BR3.4"
  - id: BR6.3
    statement: "No email, password, token, link, device secret, step-up value, anonymous author's username or persona id appears in logs, payloads or audit details."
    category: constraint
    applies_to: "M27, WF5"
    trigger: "After the full run"
    logic: "scan the web and worker log files, audit_events.details, outbox_events.payload, pgboss.job.data, final email_deliveries.params and auth_sessions (no IP stored) for every needle the run produced"
    violation: "S1"
    source: "01-conventions §11, U8 BR6.6, BR6.8, BR8.1, U10 BR10.1, U11 BR3.6"
  - id: BR6.4
    statement: "The record never carries a secret, even one found by a scan."
    category: constraint
    applies_to: "PHASE-1.md, ISS rows, test output kept in the record"
    trigger: "A scan hit or a capture is recorded"
    logic: "record the needle kind, the location and the count; never the value; captures are redacted of tokens and addresses before they enter the record"
    violation: "A committed secret is S1"
    source: "project.md Forbidden, T-106 step 5"
  - id: BR6.5
    statement: "Auth cookies carry the documented flags and lifetimes."
    category: constraint
    applies_to: "M8"
    trigger: "Set-Cookie read"
    logic: "session: HttpOnly, SameSite=Lax, 30 days; rk_staff_device: HttpOnly, Lax, 90 days; rk.pending: HttpOnly, Lax, 30 minutes, cleared by sign-in, verification and sign-out; rk_stepup: HttpOnly, Strict, 300 s; Path=/; no Secure on http and Secure when APP_URL is https"
    violation: "A missing HttpOnly or a Lax step-up cookie is S2"
    source: "U8 BR4.2, U9 BR13.4 (rk.pending), U10 § 7"
  - id: BR6.6
    statement: "Every auth and staff-auth screen works in Bengali with Bengali digits and no English fallback."
    category: constraint
    applies_to: "M31"
    trigger: "Each screen under /bn/"
    logic: "no visible text node equals its en.json value except an allowlist (brand name, sample address, codes); numbers through the formatter in Bengali digits; no uppercase transform"
    violation: "S2 (hard rule: equal product status)"
    source: "project.md Mandated, FD-024"
  - id: BR6.7
    statement: "Reading without an account is unaffected."
    category: constraint
    applies_to: "M32"
    trigger: "Signed-out visits"
    logic: "public pages answer 200 with their content in en and bn and no sign-in wall"
    violation: "Fails AC3.1.1"
    source: "AC3.1.1, T-106 hard-rule checklist"
  - id: BR6.8
    statement: "No job deletes or cleans up inactive accounts."
    category: constraint
    applies_to: "M34"
    trigger: "Reading the worker registry"
    logic: "no registered job deletes accounts, unconfirmed or not"
    violation: "Fails AC3.1.6"
    source: "FD-056, AC3.1.6"

  # Group 7 — Verdict and routing
  - id: BR7.1
    statement: "The verdict follows the row and finding states."
    category: calculation
    applies_to: "PHASE-1.md verdict"
    trigger: "Every row has a status"
    logic: "FAIL IF any row fails, is blocked or is unrepeatable, or any S1 or S2 finding is open; ELSE PASS WITH FOLLOW-UP IF any row is deferred or any S3 or S4 finding is open, each with an owner Unit and a gate; ELSE PASS"
    violation: "Any other verdict misstates the evidence"
    source: "10-validation-strategy 'Verdict contract', Q8"
  - id: BR7.2
    statement: "Every finding is an ISS row linked to this Unit and owned by the Unit that must fix it."
    category: policy
    applies_to: "ISSUES.md"
    trigger: "A finding"
    logic: "Found in 'U13 T-106'; Owner the U-id and task of the defect's Unit; S1-S4 by the team scale; the Build and Test record lists the ISS ids"
    violation: "An unregistered finding"
    source: "project.md Mandated, team.md defects"
  - id: BR7.3
    statement: "On FAIL the fix comes as a change-request Unit, and a second round re-runs the failed rows and the whole phase1 suite."
    category: policy
    applies_to: "WF8"
    trigger: "Verdict FAIL"
    logic: "no merged Unit is reopened; the CR Unit fixes; PHASE-1-round-2.md records the second round; the expected-failure tests become normal tests in the fix"
    violation: "A FAIL left without a route"
    source: "T-003-round-2 precedent, Q9"
  - id: BR7.4
    statement: "The identity and evidence Units wait for this Unit's verdict."
    category: policy
    applies_to: "U21 T-301, U23 T-303 (and every Unit downstream of them)"
    trigger: "Swarm scheduling"
    logic: "PASS or PASS WITH FOLLOW-UP, with the owner's approval filled, before either starts; added as DAG edges at the next Units revision"
    violation: "Identity or evidence work built before the Phase 1 claims are proven (master plan §8 step 4)"
    source: "AD-16, 00-master-plan §8, Q7, F7"

  # Group 8 — Placement, tests and gate
  - id: BR8.1
    statement: "Every new file sits where the T-010 boundary matrix allows."
    category: constraint
    applies_to: "functional-spec § 9"
    trigger: "File creation"
    logic: "e2e specs and helpers under apps/web/e2e (Playwright and Node built-ins only); web-int tests import no test-support; database and application tests may use test-support fakes"
    violation: "pnpm lint fails"
    source: "FD-093, eslint.boundaries.mjs, FD-040"
  - id: BR8.2
    statement: "Integration, database and unit tests run in pnpm check; the browser suite runs at Build and Test."
    category: policy
    applies_to: "W, D, A tests; phase1 and phase1-limits projects"
    trigger: "Gate runs"
    logic: "web-int, database and application projects are part of test:coverage; e2e:phase1 runs against the production build with its output in the record; it joins CI with T-503"
    violation: "An unrun suite gives no evidence"
    source: "U8 BR9.6, U9 BR14.2, T-011 WF8"
  - id: BR8.3
    statement: "Tests are deterministic and can fail."
    category: validation
    applies_to: "every test"
    trigger: "Test design"
    logic: "clocks through fake Date in W; network values and addresses unique per spec; no fixed sleeps except waiting a returned retryAfterSec; each test asserts a value its defence controls"
    violation: "Flaky or always-green tests"
    source: "team.md Testing Posture, construction.md"
  - id: BR8.4
    statement: "The Unit is done only with every gate green."
    category: validation
    applies_to: "M33"
    trigger: "Before merge"
    logic: "pnpm check (eleven steps), pnpm smoke, smoke:e2e and e2e:phase1 exit 0; CI green on the Bolt head; squash-merge locally and push"
    violation: "No merge"
    source: "team.md Way of Working, 01-conventions §13"

  # Group 9 — Records
  - id: BR9.1
    statement: "The proposed FD entry is appended before the first test file, and the documents it names are amended in the same Bolt."
    category: policy
    applies_to: "decision-log.md, README §4, docs/validation/README.md, the validation template, T-106 header, master plan §7"
    trigger: "WF0 step 2"
    logic: "take the next free FD number at append time; keep the text of functional-spec § 11"
    violation: "Code before the decision (project.md Mandated)"
    source: "project.md Mandated, Q1"
  - id: BR9.2
    statement: "Old-process bookkeeping is not updated; the AI-DLC record replaces it."
    category: policy
    applies_to: "BUILD-LOG.md, the README tracker, NEXT.md"
    trigger: "WF6"
    logic: "write PHASE-1.md, the ISS rows, one docs/status/validation-log.md row and the Unit record; leave BUILD-LOG.md, the tracker and NEXT.md alone"
    violation: "Two sources of status"
    source: "migration step 7, team.md, Q11"
```

## Rules index

| Id | Short name | Category |
|---|---|---|
| BR1.1 | Four independent roles | policy |
| BR1.2 | No tool or model names | constraint |
| BR1.3 | Owner approval line and sign-off | policy |
| BR2.1 | Own worktree, databases, port | constraint |
| BR2.2 | Synthetic data, demo rails | constraint |
| BR2.3 | No shared limiter state | constraint |
| BR2.4 | Mailpit filter | validation |
| BR2.5 | Production build for timing | constraint |
| BR2.6 | SQL only on own database | constraint |
| BR3.1 | Row record fields | validation |
| BR3.2 | Lowest observing level; design over stale text | policy |
| BR3.3 | No vacuous pass | validation |
| BR3.4 | At least five adversarial tests | validation |
| BR3.5 | Expected failure with ISS id | policy |
| BR3.6 | Markers classified | validation |
| BR3.7 | No product or existing-test edits | constraint |
| BR4.1 | Enumeration | authorization |
| BR4.2 | Limits and delay | authorization |
| BR4.3 | Tokens | authorization |
| BR4.4 | Session endings | authorization |
| BR4.5 | Origin check | authorization |
| BR4.6 | Suspended | authorization |
| BR4.7 | Staff powers and device | authorization |
| BR4.8 | Device approval | authorization |
| BR4.9 | Step-up | authorization |
| BR4.10 | Reveal | authorization |
| BR4.11 | Configuration | authorization |
| BR5.1 | One audit row per state change | constraint |
| BR5.2 | Every reveal attempt recorded | constraint |
| BR5.3 | Config refusals recorded | constraint |
| BR5.4 | Exact audit difference | validation |
| BR6.1 | No alias linkage in projections | constraint |
| BR6.2 | Database path and worker grants | constraint |
| BR6.3 | No secrets in logs or payloads | constraint |
| BR6.4 | No secrets in the record | constraint |
| BR6.5 | Cookie flags | constraint |
| BR6.6 | Bengali screens | constraint |
| BR6.7 | Reading open | constraint |
| BR6.8 | No automatic deletion | constraint |
| BR7.1 | Verdict calculation | calculation |
| BR7.2 | Findings as ISS rows | policy |
| BR7.3 | FAIL route and round 2 | policy |
| BR7.4 | Gate edges | policy |
| BR8.1 | Boundary placement | constraint |
| BR8.2 | Which gate runs which tests | policy |
| BR8.3 | Deterministic tests that can fail | validation |
| BR8.4 | All gates green | validation |
| BR9.1 | FD before tests | policy |
| BR9.2 | No old-process bookkeeping | policy |
