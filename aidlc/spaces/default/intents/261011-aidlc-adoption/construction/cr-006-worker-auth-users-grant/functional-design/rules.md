# Business rules — U5 `cr-006-worker-auth-users-grant`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U5), `unit-of-work-story-map.md` (US1.1), `requirements.md` (NFR11 and the CR-006 carry-forward), `components.md` (the worker boundary, AD-6), `contract-summary.md` (C2, C3, C13, C15 and the worker-boundary ownership rule), CR-006 with its amendments (FD-041, FD-050, FD-071, FD-077, FD-079, FD-080, FD-090), `02-data-model.md` §16 and ISS-140. The workflows and state transitions that apply these rules are in `functional-spec.md`; the privilege ids `WG1`–`WG18` are defined there in § 2 and in `entities.md`.

Group 4 follows the answers to Questions 1–8 in `functional-design-questions.md`, recorded on the owner's standing instruction and awaiting the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 14 lists what changes if the owner reverses a ruling.

```yaml
rules:
  - id: BR1.1
    statement: "rk_worker holds no privilege of any kind on auth_users: no table-level privilege and no column-level privilege on any column."
    category: authorization
    applies_to: "WG1, the auth_users table"
    trigger: "Migration 0007 is applied (from empty or on an existing database)"
    logic: "IF the migrations have run THEN every SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER privilege of rk_worker on auth_users is absent, including the column privilege on id and email granted by 0005_grants_part2.sql:98"
    violation: "A real rk_worker session that can read any auth_users column is an S1 defect (private data reachable by the worker); the probes P1-P3 fail"
    source: "FD-041, ISS-140, 02-data-model.md §16 bullet 2 and note 3, 01-conventions.md §11, NFR11"
  - id: BR1.2
    statement: "rk_worker keeps holding no privilege on auth_sessions, auth_accounts and auth_verifications."
    category: authorization
    applies_to: "auth_sessions, auth_accounts, auth_verifications"
    trigger: "Any migration runs"
    logic: "IF a migration runs THEN rk_worker gains no privilege on these tables; their denial is asserted again after the revoke"
    violation: "Any privilege on these tables is an S1 defect"
    source: "CR-006 acceptance row 2, 0001_grants_part1.sql:13, 02-data-model.md §16"
  - id: BR1.3
    statement: "Mail recipients reach the worker only as email_deliveries.to_email_enc, which the worker can read together with the delivery id."
    category: constraint
    applies_to: "email_deliveries, mail.send (built by U8 T-101, extended by U34 T-405)"
    trigger: "The worker needs a recipient address to send a queued email"
    logic: "IF the worker sends mail THEN it reads id and to_email_enc from email_deliveries and decrypts with APP_ENCRYPTION_KEY; it has no other source of an account's address"
    violation: "A worker read of a recipient from any other table, or a denied read of email_deliveries.to_email_enc, fails probe P5 and blocks T-101"
    source: "FD-071, FD-070, C2 mail.send, CR-006 acceptance row 5"
  - id: BR1.4
    statement: "The worker has no indirect path to plaintext account email: it belongs to no other role, cannot read account_profiles.auth_user_id, and can execute no function or select no view that returns auth_users data."
    category: authorization
    applies_to: "WorkerRole, account_profiles, functions and views in the public schema"
    trigger: "After the revoke, and after every later migration that adds a function, view or grant"
    logic: "IF rk_worker is a member of any role, OR can read account_profiles.auth_user_id, OR can execute a function or select a view that reads auth_users THEN the boundary is broken"
    violation: "An indirect path is an S1 defect, equal to the direct grant FD-041 removes"
    source: "FD-041, AD-6, AD-3 (private linkage), 01-conventions.md §5"
  - id: BR2.1
    statement: "Privilege changes are new forward-only migrations with the next free numbers, 0007 and 0008; no statement of a merged migration is changed."
    category: constraint
    applies_to: "packages/database/src/migrations"
    trigger: "The Unit changes a worker privilege"
    logic: "IF a privilege changes THEN a new migration file with a journal entry later than 0006_pgboss_grants carries it; 0007 carries FD-041 and 0008 carries the FD-050 revocations"
    violation: "Editing a statement in 0000-0006, or reusing the number 0006, is a defect against 01-conventions.md §12 and NFR11"
    source: "CR-006 step 2, unit-of-work.md open point (0006 collision), 01-conventions.md §12, NFR11"
  - id: BR2.2
    statement: "In 0005_grants_part2.sql only comment lines change: the comments above the auth_users, reports and review_versions grants point at FD-041 and the new FD entry."
    category: constraint
    applies_to: "0005_grants_part2.sql"
    trigger: "Migrations 0007 and 0008 are written"
    logic: "IF the revocations land THEN the comments that describe the revoked grants as current are rewritten to say they are revoked and where; no SQL statement in the file changes"
    violation: "A stale comment that still calls the auth_users read a deliberate exception re-creates the four-source contradiction ISS-140 describes"
    source: "CR-006 step 4, ISS-140"
  - id: BR2.3
    statement: "The FD entry recording the FD-050 rulings exists in the decision log before any migration of this Unit is written."
    category: policy
    applies_to: "docs/status/decision-log.md"
    trigger: "Start of Code Generation"
    logic: "IF a worker grant is to change THEN its FD entry (the next free number, FD-092 at the time of writing) is appended first, naming every ruling, its reason and that it was decided on the owner's standing instruction"
    violation: "A migration without its FD entry breaks the project rule on data-boundary changes and the C15 ownership rule"
    source: "project.md Mandated (decision log binding), contract-summary.md ownership rules, CR-006 step 7"
  - id: BR2.4
    statement: "Every migration still applies forward-only from an empty database with no error, and the revocations are in force after it."
    category: validation
    applies_to: "pnpm db:migrate, pnpm db:reset, the integration-test reset"
    trigger: "Any reset or migrate run"
    logic: "IF the database is migrated from empty THEN 0000-0008 apply in order without error AND the probes see the revoked state; a revoke of a privilege already absent is a no-op"
    violation: "A failing or silently skipped migration fails AC1.1.2; a skipped 0007 or 0008 shows up as a failing denial probe"
    source: "AC1.1.2, NFR11"
  - id: BR3.1
    statement: "Every rk_worker privilege beyond 02-data-model.md §16 has a review record naming its user today, the planned Unit and task-file step that needs it, its side of C13's deletion split, its comparison with §16 and AD-6, and its ruling with a reason."
    category: policy
    applies_to: "WG1-WG13"
    trigger: "The FD-050 review"
    logic: "IF a privilege is beyond §16 THEN the review table in functional-spec.md § 6 holds a complete record for it"
    violation: "A privilege without a record fails CR-006 acceptance rows FD-050 and FD-077"
    source: "FD-050, FD-077, CR-006 step 7"
  - id: BR3.2
    statement: "A privilege that a planned Unit needs is kept until that Unit lands; only a privilege no planned Unit needs is revoked."
    category: policy
    applies_to: "Every GrantReviewRecord"
    trigger: "A ruling is made"
    logic: "IF planned_needs is not empty THEN the ruling is keep ELSE the ruling may be revoke"
    violation: "Revoking a grant a planned Unit needs breaks that Unit at run time and contradicts review R-17"
    source: "FD-050 (review R-17), CR-006 acceptance row FD-050"
  - id: BR3.3
    statement: "The planned additions of FD-079, FD-080 and FD-090 are recorded as known, are not added by this Unit, and never cause an existing grant to be revoked."
    category: policy
    applies_to: "PA1 moderation_cases and moderation_case_seq (U32 T-403), PA2 persona-link deletion function (U29 T-309), PA3 review_drafts (U21 T-301)"
    trigger: "The FD-050 review"
    logic: "IF a grant is planned by FD-079, FD-080 or FD-090 THEN it is listed with its Unit and left to that Unit; no existing grant is offered for revocation on account of it"
    violation: "Adding a planned grant here, or revoking an existing grant because a planned one replaces it, fails the CR-006 acceptance row FD-079/FD-080/FD-090"
    source: "FD-079, FD-080, FD-090, CR-006 amendments"
  - id: BR3.4
    statement: "Each kept privilege is named in §16 with its reason and its Units; each revoked privilege is removed by a forward-only migration."
    category: policy
    applies_to: "02-data-model.md §16, migrations 0007 and 0008"
    trigger: "The rulings are applied"
    logic: "IF the ruling is keep THEN §16 names the privilege, its columns, its reason and its Units; IF the ruling is revoke THEN 0007 or 0008 removes it"
    violation: "A kept grant missing from §16, or a revoked grant still live, fails the CR-006 acceptance row 'live database matches the rulings'"
    source: "FD-050, CR-006 step 7"
  - id: BR3.5
    statement: "The worker's deletion steps are covered by kept privileges, and no web-side deletion step relies on a worker privilege."
    category: constraint
    applies_to: "C13 data.delete worker steps; dataRequest.delete web steps"
    trigger: "The FD-050 review against FD-077"
    logic: "IF a step is a worker step (evidence files, notifications and email_deliveries, search documents, review and comment tombstones) THEN a kept privilege covers each table it writes; IF a step is a web step THEN it runs as rk_app and needs no worker privilege"
    violation: "An uncovered worker step fails T-410 at run time; a web step that needs a worker grant breaks FD-077's split"
    source: "FD-077, C13, CR-006 acceptance row FD-077"
  - id: BR3.6
    statement: "A worker-grant change that FD-050 does not cover and no FD entry authorizes is not decided in this Unit: it is raised to the owner, proposed as an ISS row, and the live grant stays unchanged."
    category: policy
    applies_to: "R1 reviews.exact_date_enc, R2 drizzle_migrations_id_seq, R3 T-205 reads, R4 T-410 export reads"
    trigger: "The review finds such a change"
    logic: "IF a change to a worker grant has no FD entry THEN record it as raised_not_decided and change nothing"
    violation: "Deciding it here would change a data boundary without an FD entry (project rule)"
    source: "project.md Mandated (decision log binding), contract-summary.md ownership rules"
  - id: BR4.1
    statement: "rk_worker keeps UPDATE on reviews limited to state and deleted_at, and can update no other review column."
    category: authorization
    applies_to: "WG2"
    trigger: "Ruling of Question 1"
    logic: "IF the worker updates a review THEN only state and deleted_at may change; an update of any other column is refused"
    violation: "A worker update of title, body, restore_until, updated_at or any other column succeeding is a defect; probe P11 fails"
    source: "Question 1 answer A, FD-050, FD-077, FD-079, T-302 FD-077 amendment, T-410 step 3, T-309 step 6(e)"
  - id: BR4.2
    statement: "rk_worker loses INSERT on review_versions."
    category: authorization
    applies_to: "WG3"
    trigger: "Migration 0008"
    logic: "IF the worker inserts into review_versions THEN the insert is refused"
    violation: "A successful worker insert fails probe P12"
    source: "Question 2 answer A, FD-050, T-302 step 5 (only web-tier writers)"
  - id: BR4.3
    statement: "rk_worker keeps SELECT and UPDATE on comments, and gains no DELETE."
    category: authorization
    applies_to: "WG4"
    trigger: "Ruling of Question 3"
    logic: "IF the worker tombstones or reads a comment THEN SELECT and UPDATE succeed; a DELETE is refused"
    violation: "A refused tombstone or an allowed delete fails probes P13 or P14"
    source: "Question 3 answer A, FD-050, FD-077, FD-079, T-401 FD-077 amendment, T-405 step 1"
  - id: BR4.4
    statement: "rk_worker loses its column SELECT on reports and holds no privilege on reports at all."
    category: authorization
    applies_to: "WG5"
    trigger: "Migration 0008"
    logic: "IF the worker reads any reports column THEN the read is refused, reporter_account_id included"
    violation: "Any successful worker read of reports fails probe P15; hard rule on reporter identity at risk"
    source: "Question 4 answer A, FD-050, FD-086, T-403 FD-080 acceptance row, project.md Forbidden (reporter identity)"
  - id: BR4.5
    statement: "rk_worker keeps SELECT on account_profiles limited to id, username, display_name, locale and status, and cannot read auth_user_id or any other column."
    category: authorization
    applies_to: "WG6"
    trigger: "Ruling of Question 5"
    logic: "IF the worker reads account_profiles THEN only the five columns are readable"
    violation: "A refused read of the five columns, or an allowed read of auth_user_id, fails probes P16 or P17"
    source: "Question 5 answer A, FD-050, T-410 step 4"
  - id: BR4.6
    statement: "rk_worker keeps SELECT on legal_holds and holds no write privilege on it."
    category: authorization
    applies_to: "WG7"
    trigger: "Ruling of Question 6"
    logic: "IF the worker checks a hold THEN SELECT succeeds; an INSERT, UPDATE or DELETE is refused"
    violation: "A refused hold read or an allowed hold write fails probes P18 or P19"
    source: "Question 6 answer A, FD-050, FD-064, FD-079, C3, T-309 step 6, C13"
  - id: BR4.7
    statement: "rk_worker keeps SELECT on account_preferences."
    category: authorization
    applies_to: "WG8"
    trigger: "Ruling of Question 7"
    logic: "IF the worker checks a recipient's email preference or interface locale THEN SELECT succeeds"
    violation: "A refused read fails probe P20 and breaks T-405's send-time preference check"
    source: "Question 7 answer A, unit-of-work.md open point line 512, T-405 step 5, T-410 step 4"
  - id: BR4.8
    statement: "The worker grants outside FD-050 that planned jobs need are kept unchanged and named in §16: SELECT on personas, doctors, facilities, facility_branches, taxonomy_terms, taxonomy_aliases, config_versions and reviews, and INSERT on audit_events."
    category: policy
    applies_to: "WG9-WG12, 02-data-model.md §16"
    trigger: "Ruling of Question 8"
    logic: "IF a live worker grant is not named in §16 and a planned job needs it THEN §16 names it with its jobs; no live privilege changes"
    violation: "A live worker grant missing from §16 leaves §16 and the database disagreeing (CR-006 acceptance row 3)"
    source: "Question 8 answer A, contract-summary.md ownership rules, C12, C2, C11, C13"
  - id: BR5.1
    statement: "Each decided state is proven by a real rk_worker session: a revoked or never-granted privilege by a refused statement, a kept privilege by a statement that succeeds."
    category: validation
    applies_to: "GrantProbe P1-P20"
    trigger: "pnpm test:int"
    logic: "IF a probe runs THEN it connects as rk_worker and runs a zero-row statement; a denied privilege must fail with 'permission denied', a kept one must succeed; catalogue checks add to these, never replace them"
    violation: "A catalogue-only assertion, or a probe that cannot fail, does not meet CR-006 step 5"
    source: "CR-006 steps 5 and 7, team.md Testing Posture (a test must be able to fail)"
  - id: BR5.2
    statement: "Each kept column-limited or read-only privilege has a negative control proving its limit."
    category: validation
    applies_to: "WG2, WG4, WG6, WG7"
    trigger: "pnpm test:int"
    logic: "IF a kept privilege is narrow THEN one probe uses a column or action just outside it and expects 'permission denied'"
    violation: "Without the control, a later widening of the grant would pass unnoticed"
    source: "CR-006 step 5 (pin the decided state so a later migration cannot widen it), FD-050"
  - id: BR5.3
    statement: "The cumulative smoke suite gains at least one assertion for this Unit, the FD-041 denial, and loses none."
    category: validation
    applies_to: "packages/database/src/grants.smoke.test.ts, pnpm smoke"
    trigger: "Code Generation"
    logic: "IF the Unit lands THEN pnpm smoke includes an assertion that rk_worker cannot read auth_users.email, and every earlier smoke assertion still runs"
    violation: "A missing or removed smoke assertion breaks team.md Testing Posture"
    source: "team.md Testing Posture (cumulative smoke suite), AC1.1.1"
  - id: BR5.4
    statement: "An existing assertion whose premise a ruling changes is rewritten to the new decided state, with the reason recorded in the Unit's hand-off."
    category: validation
    applies_to: "constraints.int.test.ts, 'is denied on reports.reporter_account_id even though other reports columns are readable'"
    trigger: "Migration 0008 revokes the reports column SELECT"
    logic: "IF a ruling turns an asserted allow into a deny THEN the assertion expects the deny, keeps the reporter_account_id denial, and the hand-off names the file as an owned-path addition and gives the reason"
    violation: "Deleting the assertion, or leaving it red, breaks the existing-suites-stay-green rule"
    source: "Question 4 answer A, team.md Testing Posture, ISS-190 precedent (owned-path addition recorded)"
  - id: BR5.5
    statement: "pnpm check, pnpm smoke and pnpm test:int exit 0 after the Unit, with the compose PostgreSQL running."
    category: validation
    applies_to: "The whole repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "IF the Unit is complete THEN the three commands exit 0"
    violation: "Any red check blocks the merge (team.md Way of Working)"
    source: "AC1.1.1, NFR11, CR-006 acceptance row 'pnpm check, pnpm test:int'"
  - id: BR6.1
    statement: "02-data-model.md §16 and 01-conventions.md §11 agree with the live database after the Unit, and §16 names the real migration files."
    category: constraint
    applies_to: "02-data-model.md §16, 01-conventions.md §11"
    trigger: "Code Generation"
    logic: "IF the migrations have run THEN every live rk_worker privilege is named in §16, no privilege §16 denies is live, §11's 'a role without access to auth_*, persona_links, identity_reveals' is true, and §16 cites 0001, 0005, 0006, 0007 and 0008 instead of 0004_roles.sql and 0007_pgboss.sql"
    violation: "Any remaining disagreement fails CR-006 acceptance row 3"
    source: "CR-006 acceptance row 3, ISS-140, Question 8 answer A"
  - id: BR6.2
    statement: "ISS-140 is closed as fixed in CR-006 with option (a) and FD-041, and every new finding is an ISS row linked to U5 CR-006."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "IF the revoke lands THEN ISS-140's status reads 'fixed in CR-006 — option (a), FD-041', and each finding of functional-spec.md § 9 and § 10 has a row with Found in U5 CR-006"
    violation: "An open ISS-140 or an unrecorded finding breaks the defect-register rule"
    source: "CR-006 step 6, project.md Mandated (ISS rows), team.md Way of Working"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | No privilege of any kind for `rk_worker` on `auth_users` | authorization |
| BR1.2 | Still no privilege on `auth_sessions`, `auth_accounts`, `auth_verifications` | authorization |
| BR1.3 | Recipients reach the worker only as `email_deliveries.to_email_enc` | constraint |
| BR1.4 | No indirect path to plaintext email (role membership, `auth_user_id`, functions, views) | authorization |
| BR2.1 | Forward-only migrations 0007 and 0008; no merged statement changes | constraint |
| BR2.2 | Comment-only edits in 0005, pointing at the FD entries | constraint |
| BR2.3 | The FD entry for the rulings is written before any migration | policy |
| BR2.4 | Migrations apply from empty; revocations in force afterwards | validation |
| BR3.1 | Every grant beyond §16 has a complete review record | policy |
| BR3.2 | Keep what a planned Unit needs; revoke only what none needs (R-17) | policy |
| BR3.3 | FD-079, FD-080, FD-090 additions recorded, not added, never a reason to revoke | policy |
| BR3.4 | Kept grants named in §16; revoked grants removed by migration | policy |
| BR3.5 | Worker deletion steps covered; no web step relies on a worker grant | constraint |
| BR3.6 | Changes outside FD-050 without an FD entry are raised, not decided | policy |
| BR4.1 | `reviews` UPDATE kept on `state`, `deleted_at` only | authorization |
| BR4.2 | `review_versions` INSERT revoked | authorization |
| BR4.3 | `comments` SELECT and UPDATE kept; no DELETE | authorization |
| BR4.4 | `reports` column SELECT revoked; no privilege on `reports` | authorization |
| BR4.5 | `account_profiles` SELECT kept on five columns; `auth_user_id` denied | authorization |
| BR4.6 | `legal_holds` SELECT kept; no write | authorization |
| BR4.7 | `account_preferences` SELECT kept | authorization |
| BR4.8 | Grants outside FD-050 that jobs need are kept and named in §16 | policy |
| BR5.1 | Every decided state proven by a real `rk_worker` session | validation |
| BR5.2 | A negative control for every narrow kept grant | validation |
| BR5.3 | At least one new smoke assertion; none removed | validation |
| BR5.4 | Assertions whose premise changes are rewritten, with the reason recorded | validation |
| BR5.5 | `pnpm check`, `pnpm smoke`, `pnpm test:int` exit 0 | validation |
| BR6.1 | §16 and §11 agree with the database; §16 names the real files | constraint |
| BR6.2 | ISS-140 closed; every finding recorded as an ISS row | policy |
