# Entities — U13 `t-106-auth-identity-validation`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-106-auth-identity-validation/functional-design/`.

Source of truth for the data shape this Unit works on. This is a validation Unit: it creates **no table, column, migration, view model or message key**. Its entities are of two kinds:
- **validation artefacts** it produces (the run, matrix rows, evidence, findings, the verdict, the phase record), written as Markdown and as test files;
- **observed data** it reads or sets up through the running application and the isolated database, owned by U8–U12 and listed here only with what this Unit checks on them.

Built from T-106, `functional-spec.md` §§ 4–8, `docs/implementation/README.md` §4, `docs/planning/10-validation-strategy.md` ("Verdict contract"), `02-data-model.md` (§1, §2, §10, §11, §16) and the drafts of U8, U10, U11 and U12.

```yaml
entities:
  # Validation artefacts
  - name: ValidationRun
    kind: value-object
    owner: "U13 (the build agent)"
    description: "One execution of the Phase 1 matrix in an isolated environment (round 1, or round n after a fix)."
    attributes:
      - { name: round, type: integer, required: true, constraints: "1 for PHASE-1.md; n for PHASE-1-round-n.md" }
      - { name: commitRange, type: text, required: true, constraints: "the five squash commits of U8-U12 and U6's, plus this Bolt's head" }
      - { name: environment, type: object, required: true, constraints: "worktree path, database names rogikotha_t106 and rogikotha_test_t106, APP_URL port 3106, node, pnpm, better-auth, next and @playwright/test versions, APP_MODE demo" }
      - { name: startedAt, type: timestamp, required: true }
      - { name: networkValues, type: list, required: true, constraints: "one x-forwarded-for value per spec, never reused within the run" }
    constraints:
      - "Never runs against rogikotha, rogikotha_test or any sibling worktree's database (BR2.1)"
      - "Logs go to the worktree's ignored .validation/ folder and are never committed (BR6.4)"
    relationships:
      - { to: MatrixRow, cardinality: "one-to-many", direction: "a run executes rows M1-M35" }
      - { to: PhaseRecord, cardinality: "one-to-one", direction: "a run is written to one record" }

  - name: MatrixRow
    kind: value-object
    owner: "U13"
    description: "One check of the negative matrix (functional-spec § 6)."
    attributes:
      - { name: id, type: text, required: true, unique: true, constraints: "M1-M35, frozen once assigned (project.md Corrections)" }
      - { name: level, type: enum, required: true, constraints: "E | W | D | A | R, one or two" }
      - { name: steps, type: text, required: true }
      - { name: expected, type: text, required: true, constraints: "from the binding design; differences from the task text cite a finding" }
      - { name: observed, type: text, required: false, constraints: "set when run; redacted (BR6.4)" }
      - { name: status, type: enum, required: true, constraints: "planned | blocked | deferred | run | pass | fail" }
      - { name: deferredTo, type: text, required: false, constraints: "required when status is deferred: Unit id and acceptance row" }
      - { name: rules, type: list, required: true, constraints: "BR ids" }
    constraints:
      - "A row over empty data or a placeholder page cannot be pass (BR3.3)"
      - "A failed row has exactly one Finding and an expected-failure test named by its ISS id (BR3.5)"
    relationships:
      - { to: EvidenceItem, cardinality: "one-to-many", direction: "a row is proven by evidence" }
      - { to: Finding, cardinality: "zero-or-one", direction: "a failed row raises a finding" }

  - name: EvidenceItem
    kind: value-object
    owner: "U13"
    description: "What shows a row's observed result."
    attributes:
      - { name: kind, type: enum, required: true, constraints: "test-name | response-capture | mailpit-message-id | sql-count | file-line | command-exit" }
      - { name: reference, type: text, required: true, constraints: "test title, correlation id, Mailpit id, query and count, path:line, command and exit code" }
    constraints:
      - "Never contains an email address, password, token, link, device secret, step-up value or alias-to-account pair (BR6.4)"

  - name: AdversarialTest
    kind: value-object
    owner: "U13 builder (A1-A10) and the separate agent (X1-X5)"
    description: "A test written to break a defence (A) or to break this Unit's own evidence (X)."
    attributes:
      - { name: id, type: text, required: true, constraints: "A1-A10, X1-X5" }
      - { name: target, type: text, required: true, constraints: "defence or matrix row attacked" }
      - { name: result, type: enum, required: true, constraints: "held | broke (finding)" }
    constraints:
      - "X-tests that mutate code run in a scratch worktree that is never committed; only their test files and results are kept"
      - "At least five A-tests and three X-tests (BR3.4, BR1.1)"

  - name: Finding
    kind: value-object
    owner: "U13 raises it; the owner Unit fixes it"
    description: "A defect, gap or accepted risk, recorded as an ISS row."
    attributes:
      - { name: issId, type: text, required: true, constraints: "next free ISS id at write time" }
      - { name: severity, type: enum, required: true, constraints: "S1 | S2 | S3 | S4 (team.md)" }
      - { name: foundIn, type: text, required: true, constraints: "'U13 T-106'" }
      - { name: owner, type: text, required: true, constraints: "the Unit that must fix it, or a later Unit for a deferred row" }
      - { name: gate, type: text, required: false, constraints: "required for S3/S4 follow-ups under PASS WITH FOLLOW-UP" }
    relationships:
      - { to: MatrixRow, cardinality: "zero-or-one", direction: "a finding may come from a row, a diff reading or an adversarial test" }

  - name: Verdict
    kind: value-object
    owner: "U13"
    description: "The phase result."
    attributes:
      - { name: value, type: enum, required: true, constraints: "PASS | PASS WITH FOLLOW-UP | FAIL (BR7.1)" }
      - { name: provisional, type: boolean, required: true, constraints: "true until the owner fills Approved by" }
      - { name: approvedBy, type: text, required: false, constraints: "'<name>, <date>' written by the owner only" }

  - name: PhaseRecord
    kind: document
    path: "docs/validation/PHASE-1.md (round n: PHASE-1-round-n.md)"
    owner: "U13"
    description: "The committed validation record."
    attributes:
      - { name: header, type: table, required: true, constraints: "Unit, stories, commit range, date, environment and versions, roles (build agent, reviewer, adversarial agent, owner); no tool, model or vendor name (BR1.2)" }
      - { name: commands, type: table, required: true, constraints: "command and exit code" }
      - { name: matrix, type: table, required: true, constraints: "id | check | expected | observed | status | evidence" }
      - { name: adversarial, type: table, required: true }
      - { name: assumptions, type: table, required: true, constraints: "every ASSUMPTION(T-10x) and TODO marker with held | differs | accepted risk" }
      - { name: findings, type: table, required: true, constraints: "ISS ids and severities" }
      - { name: deferred, type: table, required: true, constraints: "row, owner Unit, acceptance row" }
      - { name: verdict, type: text, required: true }
      - { name: residualRisk, type: text, required: true }
      - { name: approvalLine, type: text, required: true, constraints: "'Approved by: <name>, <date>' left blank" }

  - name: ProbeIdentity
    kind: value-object
    owner: "U13 (synthetic) or the seed (CR-012)"
    description: "An account or address the specs act as."
    attributes:
      - { name: source, type: enum, required: true, constraints: "seeded | created-by-run" }
      - { name: handle, type: text, required: true, constraints: "seeded: shirin_88, mod_rashid, admin_nadia, sa_founder, anon_author_r2; created: phase1-<run>-<n>@example.test" }
      - { name: networkValue, type: text, required: true, constraints: "the spec's own x-forwarded-for value" }
    constraints:
      - "Synthetic only; the seeded password is the storyboard's demo password and is never written into the record (BR2.2, BR6.4)"

  - name: LeakNeedle
    kind: value-object
    owner: "U13"
    description: "A value the scans of WF5 search for."
    attributes:
      - { name: kind, type: enum, required: true, constraints: "email | password | verification-token | reset-token | approval-token | link | device-secret | step-up-value | anonymous-author-username | thread-alias | persona-id" }
      - { name: value, type: secret, required: true, constraints: "held in memory by the scan only; never logged or recorded" }
      - { name: hits, type: integer, required: true, constraints: "count per location; expected 0" }

  - name: AuditExpectation
    kind: value-object
    owner: "U13 (fixture in the W and E tests)"
    description: "The exact audit rows a suite must add."
    attributes:
      - { name: stream, type: text, required: true, constraints: "account:<id> | identity | config | staff" }
      - { name: action, type: text, required: true, constraints: "from functional-spec § 8" }
      - { name: count, type: integer, required: true }
    constraints:
      - "Compared for exact equality with the before/after difference (BR5.4)"

  # Observed data (owned by U8-U12; read or set up only)
  - name: ObservedAuthState
    kind: persisted (read)
    tables: "auth_users, auth_sessions, auth_verifications, account_profiles"
    owner: "U8 T-101"
    checked: "sessions revoked by sign out everywhere, reset and 30 days; no IP column filled; verification and reset token expiry and reuse; status suspended (set by SQL on the isolated database only)"

  - name: ObservedStaffState
    kind: persisted (read)
    tables: "staff_devices, staff_device_approvals"
    owner: "U10 T-103"
    checked: "device_hash never equals the cookie secret; failed_attempts reaches 3 and stays committed; approved_at and revoked_at transitions"

  - name: ObservedIdentityState
    kind: persisted (read)
    tables: "personas, persona_links, identity_reveals"
    owner: "U11 T-104"
    checked: "no account column on personas; one identity_reveals row per authenticated attempt with outcome; rk_worker denied; append-only"

  - name: ObservedConfigState
    kind: persisted (read)
    tables: "config_versions, config_changes"
    owner: "U12 T-105"
    checked: "current version unchanged by every refusal; rollback adds a version with rolled_back_from; history never rewritten"

  - name: ObservedRecords
    kind: persisted (read)
    tables: "audit_events, outbox_events, email_deliveries, pgboss.job, search_documents"
    owner: "U8 and the baseline"
    checked: "audit difference and allowlisted details; no needle in payloads, job data or final params; search_documents columns (empty in Phase 1)"

  - name: ObservedCookies
    kind: value-object (read)
    owner: "U8 (session), U9 (rk.pending), U10 (rk_staff_device, rk_stepup)"
    checked: "flags and lifetimes of BR6.5"
```

## Notes

- **No schema change.** The migration-count pins, `not-implemented.test.ts` and the i18n parity check are untouched by this Unit.
- **Identifiers.** Matrix ids M1–M35, test ids A1–A10 and X1–X5 and rule ids BR1.1–BR9.2 are frozen once the stage finalises; a retired row keeps its id (`project.md` Corrections).
- **Seeded r2.** The anonymous review r2 is written by the account `anon_author_r2`, whose own anonymous persona carries r2 only (CR-012, ISS-158); its pseudonymous persona shows the username `anon_author_r2` and must never be linked to r2.
