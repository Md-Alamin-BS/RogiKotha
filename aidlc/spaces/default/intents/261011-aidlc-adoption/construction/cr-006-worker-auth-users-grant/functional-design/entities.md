# Entities — U5 `cr-006-worker-auth-users-grant`

Source of truth for the data shape this Unit works on. The Unit adds no table and no column: its entities are the worker role, the privileges it holds, the review record that rules on each privilege, and the migrations, probes and records that carry the rulings. Built from CR-006 (with FD-041, FD-050, FD-071, FD-077, FD-079, FD-080, FD-090), `02-data-model.md` §16, `contract-summary.md` (C13, C15 and the worker-boundary ownership rule), the migrations on `main` and the live catalogue of `rogikotha_test` (2026-10-27). Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

The privilege ids `WG1`–`WG18` and the planned-change ids `PA1`–`PA3` and `PR1`–`PR3` are stable within this Unit's record and are used by `rules.md` and `functional-spec.md`.

```yaml
entities:
  - name: WorkerRole
    description: "The PostgreSQL login role rk_worker that the worker process uses (DATABASE_URL_WORKER). Created by infra/compose/postgres-init/01-roles.sql; privileges come only from migrations."
    attributes:
      - { name: role_name, type: identifier, required: true, unique: true, allowed_values: [rk_worker] }
      - { name: can_login, type: boolean, required: true, default: true }
      - { name: is_superuser, type: boolean, required: true, allowed_values: [false] }
      - { name: bypasses_row_security, type: boolean, required: true, allowed_values: [false] }
      - { name: member_of, type: list<identifier>, required: true, default: [], constraints: "must stay empty: membership in rk_app or rk_maintenance would inherit their privileges and bypass every revoke" }
    constraints:
      - "Holds no privilege, table-level or column-level, on auth_users, auth_sessions, auth_accounts, auth_verifications, persona_links, identity_reveals, blocks, bookmarks (02-data-model.md §16, FD-041)"
      - "Owns no object and holds no CREATE on any schema; it never runs DDL (pg-boss runs with migrate false)"
    relationships:
      - { to: Privilege, cardinality: "one-to-many", direction: "WorkerRole holds Privilege" }

  - name: DatabaseObject
    description: "A table, sequence, function or schema a privilege applies to."
    attributes:
      - { name: object_name, type: identifier, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [table, sequence, function, schema] }
      - { name: owning_component, type: identifier, required: true, constraints: "the component in components.md that owns the data (Account owns auth_* and account_*, Review owns reviews and review_versions, Community owns comments, Moderation owns reports, Retention owns legal_holds, Notification owns email_deliveries)" }
      - { name: sensitivity, type: enum, required: true, allowed_values: [private, restricted, internal, public], constraints: "private: account email, linkage, reporter identity, encrypted personal fields; restricted: moderation records; internal: operational tables; public: data shown on public pages" }
    relationships:
      - { to: Privilege, cardinality: "one-to-many", direction: "DatabaseObject is the target of Privilege" }

  - name: Privilege
    description: "One privilege rk_worker holds or held on one object, optionally limited to columns. The unit of the grant review."
    attributes:
      - { name: privilege_id, type: identifier, required: true, unique: true, constraints: "WG1..WG18 in this record" }
      - { name: object_name, type: identifier, required: true, references: DatabaseObject.object_name }
      - { name: privilege_type, type: enum, required: true, allowed_values: [SELECT, INSERT, UPDATE, DELETE, USAGE, EXECUTE] }
      - { name: columns, type: list<identifier>, required: false, constraints: "absent means the whole object; present means a column-level privilege on exactly these columns" }
      - { name: source_migration, type: string, required: true, constraints: "file and line of the GRANT, for example 0005_grants_part2.sql:98" }
      - { name: named_in_data_model_16, type: enum, required: true, allowed_values: [named, contradicts, not_named] }
      - { name: fd050_listed, type: boolean, required: true, constraints: "true for the six grants FD-050 names" }
      - { name: state, type: enum, required: true, allowed_values: [live, under_review, kept_documented, revoked, raised_not_decided, owned_elsewhere], default: live }
    constraints:
      - "A Privilege with state revoked has exactly one ForwardMigration that removes it"
      - "A Privilege with state kept_documented is named in 02-data-model.md §16 with its reason and the Units that need it"
    relationships:
      - { to: WorkerRole, cardinality: "many-to-one", direction: "Privilege is held by WorkerRole" }
      - { to: DatabaseObject, cardinality: "many-to-one", direction: "Privilege applies to DatabaseObject" }
      - { to: GrantReviewRecord, cardinality: "one-to-one", direction: "Privilege is judged by GrantReviewRecord" }
      - { to: GrantProbe, cardinality: "one-to-many", direction: "Privilege is proven by GrantProbe" }

  - name: GrantReviewRecord
    description: "The FD-050 review of one privilege: who uses it today, which planned Unit needs it, which side of C13's deletion split, how it compares with §16 and AD-6, and the ruling."
    attributes:
      - { name: privilege_id, type: identifier, required: true, unique: true, references: Privilege.privilege_id }
      - { name: used_today_by, type: list<string>, required: true, constraints: "worker job names on main, or the single value none" }
      - { name: planned_needs, type: list<PlannedUnitNeed>, required: true, constraints: "empty list means no planned Unit needs it" }
      - { name: deletion_split_side, type: enum, required: true, allowed_values: [worker_deletion_step, web_deletion_step, not_deletion, none] }
      - { name: comparison, type: text, required: true, constraints: "how the privilege compares with 02-data-model.md §16 and AD-6" }
      - { name: ruling, type: enum, required: true, allowed_values: [revoke, keep, raised_not_decided, settled_by_fd, within_data_model_16, owned_by_other_unit] }
      - { name: ruling_source, type: string, required: true, constraints: "an FD id, or a question number in functional-design-questions.md" }
      - { name: reason, type: text, required: true }
    constraints:
      - "ruling keep is required when planned_needs is not empty (R-17); ruling revoke is allowed only when planned_needs is empty"
      - "ruling raised_not_decided is used when changing the privilege would need an FD entry that does not exist"
    relationships:
      - { to: Privilege, cardinality: "one-to-one", direction: "GrantReviewRecord judges Privilege" }
      - { to: PlannedUnitNeed, cardinality: "one-to-many", direction: "GrantReviewRecord cites PlannedUnitNeed" }
      - { to: DecisionRecord, cardinality: "many-to-one", direction: "GrantReviewRecord is ruled by DecisionRecord" }

  - name: PlannedUnitNeed
    description: "A value object: one planned Unit's job that needs a privilege, with the task-file step that shows it."
    attributes:
      - { name: unit, type: identifier, required: true, constraints: "Unit id and task id, for example U39 T-410" }
      - { name: task_step, type: string, required: true, constraints: "task file and step or amendment, for example T-410 step 3" }
      - { name: job, type: string, required: true, constraints: "worker job name from C15" }
      - { name: contract, type: string, required: false, constraints: "C2, C3, C9..C13 or C15" }

  - name: PlannedGrantChange
    description: "A worker grant change another Unit owns, recorded so the review neither duplicates it nor revokes an existing grant because of it."
    attributes:
      - { name: change_id, type: identifier, required: true, unique: true, constraints: "PA1..PA3 for additions, PR1..PR3 for removals" }
      - { name: direction, type: enum, required: true, allowed_values: [add, remove] }
      - { name: privilege, type: text, required: true }
      - { name: owning_unit, type: identifier, required: true }
      - { name: decision, type: string, required: true, constraints: "FD id or ISS id" }
      - { name: applied_by_this_unit, type: boolean, required: true, allowed_values: [false] }

  - name: ForwardMigration
    description: "A new SQL migration that changes privileges. Never edited once merged; applied in journal order from empty."
    attributes:
      - { name: number, type: integer, required: true, unique: true, constraints: "next free after 0006; 7 and 8 in this Unit" }
      - { name: file_name, type: string, required: true, unique: true, allowed_values: ["0007_revoke_worker_auth_users.sql", "0008_worker_grant_review.sql"] }
      - { name: decision, type: string, required: true, allowed_values: ["FD-041", "FD-050 ruling entry (FD-092 at the time of writing)"] }
      - { name: statement_kind, type: enum, required: true, allowed_values: [revoke] }
      - { name: journal_entry, type: boolean, required: true, allowed_values: [true], constraints: "has a journal entry whose timestamp is later than 0006_pgboss_grants, so the migrator applies it" }
    relationships:
      - { to: Privilege, cardinality: "one-to-many", direction: "ForwardMigration revokes Privilege" }
      - { to: DecisionRecord, cardinality: "many-to-one", direction: "ForwardMigration cites DecisionRecord" }

  - name: GrantProbe
    description: "One integration-test assertion run as a real rk_worker session that proves a privilege's decided state."
    attributes:
      - { name: probe_id, type: identifier, required: true, unique: true, constraints: "P1..P20 in functional-spec.md § 11" }
      - { name: privilege_id, type: identifier, required: true, references: Privilege.privilege_id }
      - { name: kind, type: enum, required: true, allowed_values: [denied, allowed, negative_control, catalogue] }
      - { name: statement_shape, type: enum, required: true, allowed_values: [zero_row_read, zero_row_write, catalogue_function], constraints: "zero-row statements are permission-checked by PostgreSQL (verified live 2026-10-27)" }
      - { name: expected, type: enum, required: true, allowed_values: [permission_denied, succeeds, false] }
      - { name: test_file, type: string, required: true, allowed_values: ["validator-probes.int.test.ts", "grants.smoke.test.ts", "constraints.int.test.ts"] }

  - name: DecisionRecord
    description: "An FD row in docs/status/decision-log.md. FD-041 and FD-050 exist; this Unit adds one row recording the FD-050 rulings before any migration is written."
    attributes:
      - { name: fd_id, type: identifier, required: true, unique: true }
      - { name: rulings, type: list<string>, required: true }
      - { name: decided_by, type: string, required: true, constraints: "for the new row: the agent on the owner's standing instruction of 2026-10-27, awaiting the owner's confirmation" }

  - name: IssueRow
    description: "A row in docs/implementation/ISSUES.md. This Unit closes ISS-140 and adds the rows it finds."
    attributes:
      - { name: issue_id, type: identifier, required: true, unique: true }
      - { name: severity, type: enum, required: true, allowed_values: [S1, S2, S3, S4] }
      - { name: found_in, type: string, required: true }
      - { name: status, type: string, required: true }
```

## Summary

- **WorkerRole** is `rk_worker`: a login role with no superuser or row-security bypass and no role membership, so its privileges are exactly the grants the migrations give it.
- **Privilege** is the unit of review: one grant on one object, optionally column-limited. The live inventory has eighteen entries, `WG1`–`WG18` (`functional-spec.md` § 2): the `auth_users` read FD-041 revokes, the six FD-050 grants, `account_preferences`, the grants outside FD-050 that §16 does not name, and the grants §16 already covers.
- **GrantReviewRecord** rules on one privilege. A ruling of `revoke` is allowed only when no planned Unit needs the privilege (R-17); a change that would need a missing FD entry is `raised_not_decided` and leaves the live grant unchanged.
- **PlannedUnitNeed** is a value object naming a later Unit's job and the task-file step that needs the privilege. **PlannedGrantChange** records the additions and removals other Units own (FD-079, FD-080, FD-090; T-309, T-303/T-304).
- **ForwardMigration** carries each revocation: `0007` for FD-041, `0008` for the FD-050 rulings. **DecisionRecord** is the FD entry each migration cites; the new one is written first. **GrantProbe** proves each decided state as a real `rk_worker` session. **IssueRow** closes ISS-140 and records the findings.
