# Entities — U12 `t-105-runtime-configuration`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-105-runtime-configuration/functional-design/`.

Source of truth for the data shape this Unit works on. Built from T-105 (with FD-063, FD-068, FD-072, FD-082, FD-083 and the C1 sign-in ranges), `02-data-model.md` §10 and §11, `contract-summary.md` (C1, C15), the code on the working tree (`packages/database/src/schema/administration.ts`, `migrations/0000_init.sql`, `0003_triggers.sql`; `packages/contracts/src/{config-values,enums,errors}.ts`, `schemas/administration.ts`, `view-models/config.ts`; `packages/test-support/src/{seed/seed-config.ts, builders/config.ts, fakes/config-provider.ts}`) and U8's and U10's draft entities (`SignInSettings`, `CapabilityToggles`, `StepUpPurpose`), which this file extends and does not repeat. Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

Three kinds of entity appear here: **persisted** rows (two existing tables; this Unit adds no table and no column, and one migration rewrites stored values and adds append-only triggers), **value objects** that cross a boundary (the configuration values, the diff, the command inputs and the view models) and one **in-memory** snapshot (the provider cache). Logical types only.

```yaml
entities:
  - name: ConfigVersion
    kind: persisted
    table: config_versions
    owner: "Administration module; database/repositories/config.ts (U12)"
    description: "One complete configuration as it was applied. Append-only: a change or a rollback is a new row."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true }
      - { name: version, type: integer, required: true, unique: true, constraints: "latest + 1 at insert (BR6.3); never reused; the highest is current (BR4.2)" }
      - { name: schema_version, type: integer, required: true, constraints: "2 for every row after the migration (BR11.1); 1 only in a pre-migration database, upgraded on read (BR3.3)" }
      - { name: values, type: json (ConfigValues), required: true, constraints: "normalised: reportReasons deduplicated in REPORT_REASONS order (BR1.4); no retention block at schema 2" }
      - { name: actor_account_id, type: uuid-v7, required: true, references: AccountProfile.id, constraints: "the Super Admin who applied it; the seed uses sa_founder; never shown as an id (BR5.2)" }
      - { name: reason, type: text, required: true, constraints: "trimmed, 5-500 characters (BR2.4); staff-only; never copied into audit details (BR8.1)" }
      - { name: effective_from, type: timestamp, required: true, constraints: "Clock.now() at apply; informational, not used to choose the current version (BR4.2, Question 9)" }
      - { name: rolled_back_from, type: integer, required: false, constraints: "the version a rollback copied (BR7.3); null otherwise" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "BEFORE UPDATE OR DELETE trigger fn_block_mutation() after the migration (BR11.1)"
      - "rk_app inserts; rk_worker holds SELECT only (0001_grants_part1.sql); no grant changes"
    relationships:
      - { to: ConfigChange, cardinality: "one-to-many", direction: "ConfigVersion lists its changes" }
      - { to: AccountProfile, cardinality: "many-to-one", direction: "ConfigVersion was applied by" }

  - name: ConfigChange
    kind: persisted
    table: config_changes
    owner: "Administration module (U12)"
    description: "One changed setting of one version: the history view's and the audit row's diff line."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true }
      - { name: version, type: integer, required: true, references: ConfigVersion.version, constraints: "no foreign key in the schema today; written in the same transaction as its version" }
      - { name: path, type: text, required: true, constraints: "a known leaf path such as thresholds.fiveAccountHide or reportReasons (BR3.2)" }
      - { name: before, type: json, required: false, constraints: "null when the leaf did not exist before" }
      - { name: after, type: json, required: true }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Append-only by trigger after the migration (BR11.1)"
      - "A version has at least one change row (no-change refused, BR2.5); the seeded version 1 has none"

  - name: ConfigValues (schema version 2)
    kind: value object
    source: "packages/contracts/src/config-values.ts ConfigValuesSchema, DEFAULT_CONFIG_VALUES, CONFIG_SCHEMA_VERSION"
    description: "The whole runtime configuration. Strict at every level; every key required."
    attributes:
      - { name: thresholds.fiveAccountHide, type: integer, required: true, default: 5, min: 2, max: 50 }
      - { name: thresholds.criticalHours, type: integer, required: true, default: 24, min: 1, max: 168 }
      - { name: thresholds.standardDays, type: integer, required: true, default: 3, min: 1, max: 30 }
      - { name: thresholds.appealDays, type: integer, required: true, default: 7, min: 1, max: 30, constraints: "kept although appeals are deferred (FD-088); U33 reads it after release 1" }
      - { name: limitedDataThreshold, type: integer, required: true, default: 5, min: 1, max: 50, constraints: "min becomes 2 if the owner answers R2 with A; decides Limited data only, never a score (BR1.3)" }
      - { name: reportReasons, type: list<ReportReason>, required: true, default: "all thirteen", constraints: "a set; always contains ALWAYS_ENABLED_REPORT_REASONS (BR1.4)" }
      - { name: capabilities, type: CapabilityToggles, required: true, constraints: "U10's four toggles, default false (BR1.5)" }
      - { name: featureVisibility.facilityAccounts, type: boolean, required: true, default: true }
      - { name: featureVisibility.compareTray, type: boolean, required: true, default: true }
      - { name: emergency.ambulance, type: text, required: true, default: "999", constraints: "^[0-9-]{3,15}$" }
      - { name: emergency.healthLine, type: text, required: true, default: "16263", constraints: "^[0-9-]{3,15}$" }
      - { name: emergency.crisisLine, type: text, required: true, default: "09612-119911", constraints: "^[0-9-]{3,15}$" }
      - { name: emergency.lastVerified, type: date (YYYY-MM-DD), required: true, default: "2026-08-21", constraints: "real date, not after today; changes whenever a number changes (BR1.7, BR1.8)" }
      - { name: signIn, type: SignInSettings, required: true, constraints: "U8's block with this Unit's ranges: delayAfterFailures 1-9 (3), windowMinutes 1-1440 (15), firstDelaySeconds 1-60 (1), maxDelaySeconds 1-300 and >= firstDelaySeconds (30), severeFailures 2-10 and > delayAfterFailures (10) (BR1.9)" }
    constraints:
      - "No retention block (FD-082); a retention key is an unknown key (config.invariant)"
      - "No key under auth, security, identity, audit, database, evidence.allowlist or capabilities.super_admin can exist (BR3.1)"

  - name: AlwaysEnabledReportReasons
    kind: value object (enum subset)
    source: "packages/contracts/src/enums.ts ALWAYS_ENABLED_REPORT_REASONS (new)"
    attributes:
      - { name: value, type: enum, required: true, allowed_values: [privacy, threat, unsafeFile, dangerous, other] }
    constraints:
      - "Superset of CRITICAL_REPORT_REASONS (Question 4); closes ISS-079"

  - name: ConfigCandidate
    kind: value object (command input part)
    source: "values field of ProposeConfigInput and ApplyConfigInput"
    attributes:
      - { name: values, type: json object, required: true, constraints: "z.record(string, unknown); at most 64 KiB serialised; validated inside the command (BR2.1, BR2.2)" }
      - { name: schemaVersion, type: integer, required: false, constraints: "only on an imported file; 1 is upgraded (BR3.3); absent means 2" }

  - name: ProposeConfigInput (changed)
    kind: value object (query input)
    source: "packages/contracts/src/schemas/administration.ts"
    attributes:
      - { name: values, type: ConfigCandidate, required: true }
    constraints:
      - ".strict() on the outer object; the shallow-partial TODO(T-408) is resolved: the whole candidate (Question 3)"

  - name: ApplyConfigInput (changed)
    kind: value object (command input)
    source: "packages/contracts/src/schemas/administration.ts"
    attributes:
      - { name: values, type: ConfigCandidate, required: true }
      - { name: reason, type: text, required: true, min: 5, max: 500, constraints: "trimmed (BR2.4)" }
      - { name: expectedVersion, type: integer, required: true, min: 0, constraints: "0 only when no version exists (BR6.3)" }
    constraints:
      - ".strict()"

  - name: RollbackConfigInput (changed)
    kind: value object (command input)
    source: "packages/contracts/src/schemas/administration.ts"
    attributes:
      - { name: toVersion, type: integer, required: true, min: 1 }
      - { name: reason, type: text, required: true, min: 5, max: 500, constraints: "trimmed (BR2.4)" }
    constraints:
      - ".strict(); no expectedVersion: a concurrent version shows as conflict through the unique version (BR7.3)"

  - name: ConfigDiffEntry
    kind: value object
    source: "packages/contracts/src/view-models/config.ts ConfigChangeRowVM (kept), produced by domain diffConfig"
    attributes:
      - { name: path, type: text, required: true, constraints: "known leaf path" }
      - { name: before, type: json, required: false }
      - { name: after, type: json, required: false }
    constraints:
      - "Sorted by path; only changed leaves; arrays compared as sets (BR3.2)"

  - name: ProposeResult
    kind: value object (query result)
    source: "C1 config.propose"
    attributes:
      - { name: diff, type: list<ConfigDiffEntry>, required: true, constraints: "empty when invalid" }
      - { name: validation.ok, type: boolean, required: true }
      - { name: validation.code, type: enum, required: false, allowed_values: [config.invariant, config.out_of_range, validation] }
      - { name: validation.fieldErrors, type: "map<path, messageKey>", required: false, constraints: "known paths only; unknown keys are never named (BR2.3)" }

  - name: CurrentConfigResult
    kind: value object (query result)
    source: "C1 config.current; also the export file (Question 10)"
    attributes:
      - { name: version, type: integer, required: true, constraints: "0 when empty" }
      - { name: schemaVersion, type: integer, required: true, constraints: "2" }
      - { name: values, type: ConfigValues, required: true }

  - name: ConfigVersionVM (changed)
    kind: value object (view model)
    source: "packages/contracts/src/view-models/config.ts"
    attributes:
      - { name: version, type: integer, required: true }
      - { name: effectiveFrom, type: iso8601, required: true }
      - { name: reason, type: text, required: true }
      - { name: rolledBackFrom, type: integer, required: false, constraints: "new" }
      - { name: actor.username, type: text, required: false, constraints: "new; the staff account's username; absent when deleted" }
      - { name: actor.role, type: enum, required: false, allowed_values: [super_admin, admin, moderator], constraints: "new; the actor's current staff role, null when none" }
      - { name: actor.deleted, type: boolean, required: true, constraints: "new; renders 'Deleted account'" }
      - { name: changes, type: list<ConfigDiffEntry>, required: true }
    constraints:
      - "No account id, no email (03 §2)"

  - name: ConfigVM (changed)
    kind: value object (view model)
    source: "packages/contracts/src/view-models/config.ts"
    attributes:
      - { name: version, type: integer, required: true }
      - { name: schemaVersion, type: integer, required: true, constraints: "new" }
      - { name: values, type: ConfigValues, required: true }
      - { name: history, type: list<ConfigVersionVM>, required: true, constraints: "first page; T-408 composes it from the two queries" }

  - name: ConfigSnapshot
    kind: in-memory (each process)
    owner: "PgConfigProvider (packages/database/src/repositories/config.ts)"
    attributes:
      - { name: values, type: ConfigValues, required: true }
      - { name: version, type: integer, required: true, constraints: "0 for the defaults" }
      - { name: loadedAt, type: monotonic milliseconds, required: true, constraints: "performance.now(), not the Clock port (BR4.3)" }
      - { name: source, type: enum, required: true, allowed_values: [database, last_good, defaults] }
    constraints:
      - "Valid for 5000 ms; one load at a time; dropped by invalidate() (BR4.3, BR4.6)"

  - name: ConfigAuditEvent
    kind: persisted (existing table)
    table: audit_events
    owner: "Administration (FD-065); written through AuditWriter"
    attributes:
      - { name: stream, type: text, required: true, constraints: "'config'" }
      - { name: action, type: enum, required: true, allowed_values: [config_applied, config_rolled_back, config_rejected] }
      - { name: actor, type: account, required: true }
      - { name: details, type: json, required: true, constraints: "applied and rolled back: {version, rolledBackFrom?, changes: [{path, before, after}], step_up: true}; rejected: {operation, code, paths, unknownKeyCount, step_up: true}; never the reason text or an unknown key name (BR8.1, BR8.3)" }
    constraints:
      - "target_kind left empty: the enum has no config value (ISS-090)"

  - name: ConfigAppliedEvent
    kind: persisted (existing table)
    table: outbox_events
    owner: "Notification owns the outbox (FD-065); appended by OutboxConfigEventSink"
    attributes:
      - { name: name, type: text, required: true, constraints: "'config.applied'" }
      - { name: payload, type: json, required: true, constraints: "{version, rolledBackFrom?}; ids and integers only (C15)" }
    constraints:
      - "Relay maps it to no job (ISS-186, FD-083)"

  - name: ConfigEventSink
    kind: port
    source: "packages/application/src/modules/administration/ports.ts"
    attributes:
      - { name: configApplied, type: "(tx, {version, rolledBackFrom?}) => Promise<void>", required: true }
    constraints:
      - "Implemented by packages/application/src/modules/notification/config-event-sink.ts (FD-083); both built here"

  - name: ConfigRepository
    kind: port
    source: "packages/application/src/modules/administration/ports.ts"
    attributes:
      - { name: latest, type: "(tx?) => Promise<StoredVersion | null>", required: true }
      - { name: findVersion, type: "(version) => Promise<StoredVersion | null>", required: true }
      - { name: history, type: "({page, pageSize}) => Promise<{items, total}>", required: true }
      - { name: insertVersion, type: "(tx, row) => Promise<Result<void>>", required: true, constraints: "unique violation => conflict" }
      - { name: insertChanges, type: "(tx, version, diff) => Promise<void>", required: true }
    constraints:
      - "Implemented by PgConfigRepository, replacing the three NotImplemented stubs of T-004 (ISS-091 naming)"
```

## Summary

- **Two existing tables** hold the configuration: `ConfigVersion` (one complete, normalised configuration per row, the highest is current) and `ConfigChange` (one row per changed setting). After this Unit's migration both are append-only in the database, and no stored row has a `retention` block.
- **`ConfigValues` at schema version 2** has seven strict blocks; its ranges are the contract's, except the two sign-in ranges narrowed by Question 1, and the limited-data minimum the owner may raise (R2). Five report reasons can never be switched off.
- **Commands take the whole candidate** as a plain JSON object and validate it themselves, so each failure gets its precise code; the result of a preview is a diff plus a validation result.
- **Records**: three audit actions on the `config` stream with known paths and bounded values only, and one `config.applied` outbox row per change through `ConfigEventSink`.
- **One in-memory snapshot** per process, valid for 5 seconds of process time, falls back to the last good values or the defaults and never throws.
- **Contract changes**: the three input schemas, two view models, `ALWAYS_ENABLED_REPORT_REASONS`, `CONFIG_SCHEMA_VERSION` and the asynchronous `current()` (Question 2). No consumer of the inputs exists yet; the port's callers are drafts that add `await`.
