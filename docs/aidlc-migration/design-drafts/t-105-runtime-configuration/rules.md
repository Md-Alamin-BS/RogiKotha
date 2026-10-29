# Business rules — U12 `t-105-runtime-configuration`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-105-runtime-configuration/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U12), `unit-of-work-story-map.md` (US11.1), `requirements.md` (FR100, FR101, FR102), `stories.md` (AC11.1.1–AC11.1.6, AC3.1.5), `contract-summary.md` (C1, C5, C15 and the ownership rules), T-105 with its amendments (FD-063, FD-068, FD-072, FD-082, FD-083, the C1 sign-in ranges), FD-016, FD-017, FD-018, FD-022, FD-065, FD-067, `01-conventions.md` §3–§6, `02-data-model.md` §10–§11, `03-routes-and-contracts.md` §2–§5, the prototype (`admin/app.js` `renderConfig`, `shared/rogikotha-data.js`), the U8 and U10 drafts, and the open `ISSUES.md` rows ISS-079, ISS-108 and ISS-171.

The rules that depend on a question follow the answers in `functional-design-questions.md`, chosen on the owner's standing instruction of 2026-10-27 and awaiting the owner's confirmation. `functional-spec.md` § 12 lists what changes if the owner reverses an answer. R1 and R2 are not decided: BR1.3 keeps the contract's range until R2 is answered, and no rule covers the AC11.1.1 settings of R1. "Candidate" always means the whole configuration a caller proposes, applies, imports or restores, before validation. "Current" means the configuration of the highest stored version (BR4.2).

**Authorization and records at a glance** (each line is a rule below):

- Read (`config.current`, `config.history`): any staff role. Preview (`config.propose`): `config.write`. Change (`config.apply`, `config.rollback`): `config.write` and a step-up, in the order `authenticated` → `capability` → `stepUp` (U10 BR7.4). Only Super Admin holds `config.write`.
- Every change writes, in one transaction: a `config_versions` row, one `config_changes` row per changed setting, one audit row on the `config` stream and one `config.applied` outbox row through `ConfigEventSink` (BR6.4, BR8.1, BR8.2).
- A refusal after authorization and step-up writes one `config_rejected` audit row and nothing else; a refusal before writes nothing (BR8.3, BR8.4).
- Audit details hold setting paths, bounded values, versions and counts; never the reason text and never an unknown key name (BR8.1, BR8.3).

```yaml
rules:
  # Group 1 — The configuration values (schema version 2)
  - id: BR1.1
    statement: "ConfigValues at schema version 2 has exactly seven blocks: thresholds, limitedDataThreshold, reportReasons, capabilities, featureVisibility, emergency and signIn; every object is strict and every key is required; there is no retention block."
    category: validation
    applies_to: "packages/contracts/src/config-values.ts ConfigValuesSchema, CONFIG_SCHEMA_VERSION"
    trigger: "A candidate or a stored value is parsed"
    logic: "CONFIG_SCHEMA_VERSION = 2; ConfigValuesSchema = strict object of the seven blocks; a retention key anywhere at the top level is an unknown key (config.invariant)"
    violation: "A retention block accepted again stores the periods twice (FD-068); a missing strict() lets any key through (threat 1)"
    source: "T-105 step 1, FD-082, FD-068, C1 config_values_changes, 02-data-model.md §11"
  - id: BR1.2
    statement: "The four moderation thresholds are integers within fixed ranges: fiveAccountHide 2-50, criticalHours 1-168, standardDays 1-30, appealDays 1-30."
    category: validation
    applies_to: "ConfigValuesSchema.thresholds"
    trigger: "A candidate is validated"
    logic: "IF a value is below its minimum or above its maximum THEN config.out_of_range with fieldErrors[thresholds.<key>] = errors.config.outOfRange; a non-integer is validation"
    violation: "fiveAccountHide 1 lets one account hide content (threat 5); each boundary and each boundary +-1 is tested"
    source: "T-105 step 1 and acceptance row 'Ranges', 03 §4 config.apply, FD-017, FD-018"
  - id: BR1.3
    statement: "limitedDataThreshold is an integer in 1-50; it only decides when the Limited data label shows and is never shown or used as a score."
    category: validation
    applies_to: "ConfigValuesSchema.limitedDataThreshold"
    trigger: "A candidate is validated"
    logic: "range 1-50 (the contract's range; becomes 2-50 if the owner answers R2 with A); out of range THEN config.out_of_range"
    violation: "A threshold used as a quality figure breaks the no-score hard rule; a threshold of 1 makes Limited data unreachable (R2)"
    source: "PRODUCT.md hard rules (Limited data, no number for quality), 03 §4, T-105 hard-rule checklist, R2"
  - id: BR1.4
    statement: "reportReasons is a set of REPORT_REASONS values that always contains privacy, threat, unsafeFile, dangerous and other."
    category: validation
    applies_to: "ConfigValuesSchema.reportReasons, packages/contracts/src/enums.ts ALWAYS_ENABLED_REPORT_REASONS"
    trigger: "A candidate is validated or stored"
    logic: "each element in REPORT_REASONS ELSE validation; duplicates are dropped and the list is stored in REPORT_REASONS order; IF any ALWAYS_ENABLED_REPORT_REASONS value is missing THEN config.invariant with fieldErrors[reportReasons] = errors.config.reasonRequired"
    violation: "Disabling privacy, threat or unsafeFile removes the immediate hide (AC9.1.6); disabling dangerous removes the only route for dangerous advice (FD-009); fails the 'Mandatory reasons' row"
    source: "Question 4, 02-data-model.md §11, T-105 step 1, ISS-079, FD-009, FD-017"
  - id: BR1.5
    statement: "capabilities holds exactly the four Admin and Moderator toggles as booleans; Super Admin's capabilities cannot be configured."
    category: authorization
    applies_to: "ConfigValuesSchema.capabilities"
    trigger: "A candidate is validated"
    logic: "strict {admin: {revealIdentity, originalEvidence}, moderator: {revealIdentity, originalEvidence}}; any other key (for example super_admin or admin.retentionBulk) is config.invariant"
    violation: "A configurable Super Admin or an extra toggle is privilege escalation by configuration (threat 2, U10 BR1.5)"
    source: "FD-016, FD-022, FD-051, T-105 threat 2 and acceptance row 'Super admin caps fixed', U10 BR1.5"
  - id: BR1.6
    statement: "featureVisibility holds exactly facilityAccounts and compareTray as booleans."
    category: validation
    applies_to: "ConfigValuesSchema.featureVisibility"
    trigger: "A candidate is validated"
    logic: "strict object of two booleans, defaults true; facilityAccounts false hides facility feedback (U14 reads it); compareTray false hides the compare tray (U19 reads it)"
    violation: "An unread flag is a setting that does nothing; an unknown flag is config.invariant"
    source: "02-data-model.md §11, FR100 (feature visibility), U14 draft (facility feedback visibility)"
  - id: BR1.7
    statement: "Each emergency number is 3-15 digits and hyphens, and lastVerified is a real calendar date that is not after today."
    category: validation
    applies_to: "ConfigValuesSchema.emergency"
    trigger: "A candidate is validated"
    logic: "ambulance, healthLine, crisisLine match ^[0-9-]{3,15}$ ELSE validation with errors.config.phoneFormat; lastVerified matches YYYY-MM-DD and is a real date ELSE validation with errors.config.dateInvalid; IF lastVerified > today (Asia/Dhaka date of Clock.now()) THEN config.out_of_range with errors.config.dateInFuture"
    violation: "An empty or malformed number breaks the emergency-guidance hard rule; a future date claims a check that has not happened"
    source: "T-105 step 1 and hard-rule checklist, PRODUCT.md hard rule (999, 16263, crisis line, last verified), Question 6"
  - id: BR1.8
    statement: "When any emergency number changes, lastVerified must change in the same version."
    category: validation
    applies_to: "application/modules/administration config validation"
    trigger: "A candidate's emergency numbers differ from the current version's"
    logic: "IF (ambulance, healthLine, crisisLine) differ from current AND lastVerified equals current.lastVerified THEN config.invariant with fieldErrors[emergency.lastVerified] = errors.config.lastVerifiedRequired"
    violation: "A new number shown as verified on an old date tells a person in an emergency something untrue"
    source: "Question 6, T-105 hard-rule checklist ('lastVerified required')"
  - id: BR1.9
    statement: "The sign-in settings are integers within ranges where every allowed value takes effect: delayAfterFailures 1-9, windowMinutes 1-1440, firstDelaySeconds 1-60, maxDelaySeconds 1-300 and at least firstDelaySeconds, severeFailures 2-10 and above delayAfterFailures."
    category: validation
    applies_to: "ConfigValuesSchema.signIn"
    trigger: "A candidate is validated"
    logic: "single-key ranges as listed ELSE config.out_of_range; IF maxDelaySeconds < firstDelaySeconds THEN config.out_of_range with errors.config.maxDelayOrder on signIn.maxDelaySeconds; IF severeFailures <= delayAfterFailures THEN config.out_of_range with errors.config.severeOrder on signIn.severeFailures"
    violation: "A severe threshold above C5's fixed limit of 10 failures per 15 minutes never fires (F1); fails the C1 sign-in rows"
    source: "Question 1, C1 sign-in ranges, C5 fixed sign-in limit, FD-058, FD-063, FD-072, U8 draft F3"
  - id: BR1.10
    statement: "DEFAULT_CONFIG_VALUES are the prototype's values plus the owner's sign-in defaults, and they parse with the schema."
    category: constraint
    applies_to: "DEFAULT_CONFIG_VALUES"
    trigger: "Build and tests"
    logic: "thresholds 5/24/3/7; limitedDataThreshold 5; reportReasons = REPORT_REASONS; every capability toggle false; featureVisibility both true; emergency 999 / 16263 / 09612-119911 / 2026-08-21; signIn 3/15/1/30/10; ConfigValuesSchema.parse(DEFAULT_CONFIG_VALUES) succeeds"
    violation: "Defaults that fail the schema make the empty-table fallback throw; other defaults fail the FD-063 'sign-in setting defaults' row"
    source: "T-105 step 1, FD-063, prototype shared/rogikotha-data.js config and moderation.thresholds"

  # Group 2 — Validating a candidate
  - id: BR2.1
    statement: "Propose and apply receive the whole candidate as a plain JSON object and validate it inside the command."
    category: validation
    applies_to: "ProposeConfigInput, ApplyConfigInput (packages/contracts/src/schemas/administration.ts)"
    trigger: "An input is parsed"
    logic: "values: z.record(z.string(), z.unknown()) (a JSON object of at most 64 KiB serialised); the outer input object stays strict; the command validates values with BR2.2"
    violation: "Parsing values with ConfigValuesSchema at the input boundary turns an unknown key into validation instead of config.invariant (F7)"
    source: "Question 3, T-105 acceptance row 'Unknown key', 01-conventions §3"
  - id: BR2.2
    statement: "A candidate is validated in a fixed order and every finding is collected before the result is returned."
    category: validation
    applies_to: "application/modules/administration/config-validation.ts validateCandidate"
    trigger: "propose, apply, rollback or import"
    logic: "1. upgrade the candidate if it carries schemaVersion 1 (BR3.3); 2. denylist over every key path (BR3.1); 3. ConfigValuesSchema.safeParse (BR1.1-BR1.7, BR1.9); 4. rules that need the current version (BR1.8); collect all issues; normalise reportReasons (BR1.4)"
    violation: "Stopping at the first issue hides the others from the editor; skipping the denylist relies on strict() alone (threat 1)"
    source: "T-105 steps 1, 2 and 4"
  - id: BR2.3
    statement: "Each finding maps to one error code, and the result carries the most serious one: config.invariant, then config.out_of_range, then validation."
    category: validation
    applies_to: "validateCandidate"
    trigger: "Validation found an issue"
    logic: "unknown key, denylisted path, missing always-enabled reason, unchanged lastVerified (BR1.8) => config.invariant; too_small, too_big, signIn order, date in the future => config.out_of_range; wrong type, missing key, phone or date format => validation; AppError.messageKey from errorMessageKey(code); fieldErrors maps each known setting path to its message key; unknown key names are never put in fieldErrors, messages or logs"
    violation: "A wrong code fails the 'Ranges', 'Unknown key' and C1 rows; echoing an unknown key name puts attacker-chosen text in the UI and the logs"
    source: "T-105 acceptance rows, 03 §2 (config.invariant, config.out_of_range), errors.ts errorMessageKey, 01-conventions §11"
  - id: BR2.4
    statement: "The reason of an apply or rollback is 5-500 characters after trimming."
    category: validation
    applies_to: "ApplyConfigInput.reason, RollbackConfigInput.reason"
    trigger: "An apply or rollback input is parsed"
    logic: "reason = trim(reason); IF length < 5 OR length > 500 (graphemes) THEN validation with fieldErrors[reason] = errors.config.reasonLength"
    violation: "A change without a meaningful reason fails threat 3 ('every apply needs reason')"
    source: "T-105 step 4 ('Reason >= 5 chars'), threat 3"
  - id: BR2.5
    statement: "A change that changes nothing is refused and writes nothing."
    category: validation
    applies_to: "config.apply, config.rollback"
    trigger: "The validated candidate equals the current values"
    logic: "IF diff(current, candidate) is empty THEN err validation with messageKey errors.config.noChange; no version, no change row, no outbox row"
    violation: "Empty versions clutter the history and the export/import round trip would create versions for nothing"
    source: "Design decision (functional-spec § 11), Question 10"

  # Group 3 — Policy functions (packages/domain, plain JSON, no imports)
  - id: BR3.1
    statement: "Any candidate key path under auth, security, identity, audit or database, or equal to evidence.allowlist, or under capabilities.super_admin, is a structural key and refused."
    category: authorization
    applies_to: "packages/domain/src/administration/config-policy.ts findDenylistedPaths"
    trigger: "A candidate is validated (step 2 of BR2.2)"
    logic: "walk every key path of the raw JSON object; a path matches when its lower-cased form equals or starts with 'auth.', 'security.', 'identity.', 'audit.', 'database.', 'capabilities.super_admin', or equals 'evidence.allowlist' (or 'auth', 'security', 'identity', 'audit', 'database' as a top-level key); any match => config.invariant; the signIn block is outside every prefix and needs no exception"
    violation: "A structural boundary switched by configuration breaks FD-018 and AC11.1.3"
    source: "T-105 step 2 and threat 1, FD-018, AC11.1.3, C1 sign-in amendment"
  - id: BR3.2
    statement: "diff(before, after) lists every changed leaf setting as {path, before, after}, sorted by path; an array is one leaf compared as a set."
    category: calculation
    applies_to: "config-policy.ts diffConfig"
    trigger: "propose, apply, rollback"
    logic: "recurse through objects; a leaf is a scalar or an array; path = dot-joined keys (thresholds.fiveAccountHide); arrays compare by their sorted elements; a key only on one side gives before or after null; equal leaves are omitted"
    violation: "A missed or invented change row fails the 'Apply' row (exactly one row thresholds.fiveAccountHide 5->3)"
    source: "T-105 step 2 ('diff on leaf values') and tests ('nested, arrays'), 02-data-model.md §11 config_changes.path"
  - id: BR3.3
    statement: "upgradeConfigValues turns a schema-version-1 value into version 2 by removing its retention block; any other version is refused."
    category: calculation
    applies_to: "config-policy.ts upgradeConfigValues"
    trigger: "A stored value, a rollback target or an imported file carries schemaVersion 1"
    logic: "IF schemaVersion = 2 THEN unchanged; IF 1 THEN copy without the top-level retention key, schemaVersion 2; ELSE invalid (a stored row is skipped by BR4.5, an import or rollback gets config.invariant)"
    violation: "A rollback to version 1 that keeps retention fails the FD-082 rollback row"
    source: "FD-082, T-105 step 4 (rollback strips retention), Question 7"
  - id: BR3.4
    statement: "The policy functions take and return plain JSON and import nothing."
    category: constraint
    applies_to: "packages/domain/src/administration/**"
    trigger: "Lint (T-010 boundary rules)"
    logic: "no import of contracts, zod or any package; types are local JSON types; the schema-specific rules (BR1.x, BR1.8) live in contracts and application"
    violation: "Fails the boundary lint (domain imports nothing, FD-093)"
    source: "01-conventions §2, team.md Code Style, FD-093"

  # Group 4 — ConfigProvider (database implementation)
  - id: BR4.1
    statement: "ConfigProvider.current() returns a Promise of ConfigValues."
    category: constraint
    applies_to: "packages/application/src/ports/config-provider.ts (U8 creates it), every implementation and fake"
    trigger: "Any module reads configuration"
    logic: "interface ConfigProvider { current(): Promise<ConfigValues> }; StaticConfigProvider and U8's defaults-only provider resolve immediately; callers await"
    violation: "A synchronous port forces a breaking change when the database provider arrives, or returns values that were never loaded"
    source: "Question 2, 03 §3"
  - id: BR4.2
    statement: "The current configuration is the highest stored version, upgraded and parsed."
    category: calculation
    applies_to: "PgConfigRepository.latest, PgConfigProvider"
    trigger: "The provider loads"
    logic: "SELECT the row with max(version); upgradeConfigValues(values, schema_version); ConfigValuesSchema.parse; effective_from is informational (BR6.4)"
    violation: "Selecting by effective_from <= Clock.now() hides versions after the demo clock moves back (Question 9)"
    source: "Question 9, 02-data-model.md §11 (corrected), T-105 step 3"
  - id: BR4.3
    statement: "The provider caches the parsed values for 5 seconds of process time, loads at most once at a time, and can be invalidated."
    category: constraint
    applies_to: "PgConfigProvider"
    trigger: "current() is called"
    logic: "IF a snapshot exists AND monotonic now - loadedAt < 5000 ms THEN return it; ELSE start one load (concurrent callers await the same promise) and store {values, version, loadedAt}; invalidate() drops the snapshot; the cache uses performance.now(), not the Clock port, so the demo clock cannot stretch or freeze it"
    violation: "A per-call database read on every sign-in and page; a stampede of loads after expiry; a cache tied to the demo clock that never expires"
    source: "T-105 step 3 ('caches 5 s, invalidate on apply'), 03 §3 ('cached 5 s')"
  - id: BR4.4
    statement: "With no stored version the provider returns DEFAULT_CONFIG_VALUES and logs config.defaults_in_use once per process."
    category: policy
    applies_to: "PgConfigProvider"
    trigger: "config_versions is empty"
    logic: "values = DEFAULT_CONFIG_VALUES, version 0; logger.warn('config.defaults_in_use') the first time only"
    violation: "Throwing on an empty table breaks every page before the seed runs"
    source: "T-105 step 3"
  - id: BR4.5
    statement: "A failed read or a stored version that fails the schema never reaches the caller as an error: the provider keeps the last good values, or the defaults when there are none."
    category: policy
    applies_to: "PgConfigProvider"
    trigger: "The load throws, or the stored value fails upgrade or parse"
    logic: "read error => logger.warn('config.read_failed', {correlation only}); invalid value => logger.error('config.invalid_version', {version}); return the last good snapshot if one exists ELSE DEFAULT_CONFIG_VALUES; retry on the next call after 5 s; never log the values"
    violation: "A thrown error takes down the emergency page and sign-in; defaults are the safe side because every capability toggle is off"
    source: "construction.md Error Handling, PRODUCT.md hard rule (emergency guidance), design decision"
  - id: BR4.6
    statement: "A change applied in one process is visible there at once and in every other process within 5 seconds."
    category: policy
    applies_to: "PgConfigProvider, apps/web/src/server/actions/config.ts"
    trigger: "An apply or rollback commits"
    logic: "the server action calls container.config.invalidate() after an ok result; other processes (a second web process, a later worker wiring) reload at expiry; ASSUMPTION(T-105): 5 seconds of staleness across processes is acceptable for the demo"
    violation: "Fails the 'Apply' row (current() returns 3 within 5 s) and the FD-072 sign-in row"
    source: "T-105 step 3 and acceptance rows 'Apply' and FD-072"

  # Group 5 — Queries
  - id: BR5.1
    statement: "config.current returns the current version number, schema version and values to any staff actor, read without the cache."
    category: authorization
    applies_to: "queries/get-current-config.ts"
    trigger: "A staff screen or an export asks for the configuration"
    logic: "requires {staffRole: [super_admin, admin, moderator]}; result {version, schemaVersion: 2, values}; version 0 with DEFAULT_CONFIG_VALUES when empty; the repository read bypasses the provider cache"
    violation: "A non-staff actor reading the capability toggles; a cached version that makes the next apply conflict for 5 seconds"
    source: "C1 config.current ('staff (read)'), 03 §1 /admin/config, Question 10"
  - id: BR5.2
    statement: "config.history lists versions newest first, 20 per page, each with its changes, and shows the actor as staff username and current role, never as an account id."
    category: constraint
    applies_to: "queries/get-config-history.ts, ConfigVersionVM"
    trigger: "A staff actor opens the history"
    logic: "requires {staffRole: any}; GetConfigHistoryInput {page >= 1}; item {version, effectiveFrom, reason, rolledBackFrom | null, actor: {username, role | null, deleted: boolean}, changes: [{path, before, after}]}; a deleted actor gives deleted true and no username; meta has the page and total"
    violation: "An account id in a view model breaks 03 §2; a missing old version fails the FD-082 'history still lists the old version' row"
    source: "C1 config.history ('actor: opaque'), 03 §2, T-408 step 8, FD-082 acceptance row"
  - id: BR5.3
    statement: "config.propose validates a candidate and returns its diff against the current version without writing anything."
    category: authorization
    applies_to: "queries/propose-config.ts"
    trigger: "The editor previews a change"
    logic: "requires {capability: config.write} (no step-up); result ok({diff, validation: {ok: true}}) when valid; ok({diff: [], validation: {ok: false, code, fieldErrors}}) when not (BR2.3); no row, no audit, no outbox"
    violation: "A preview that writes, or one available to Admin or Moderator, fails C1 and AC11.1.6"
    source: "C1 config.propose, T-105 step 4 ('no write'), 03 §4"

  # Group 6 — Apply
  - id: BR6.1
    statement: "config.apply needs config.write and a step-up, checked in that order."
    category: authorization
    applies_to: "commands/apply-config.ts"
    trigger: "Any call"
    logic: "requires {capability: 'config.write', stepUp: true}; no capability => forbidden; no valid rk_stepup => auth.step_up_required (the client re-runs after account.stepUp with purpose config.apply); nothing is written in either case"
    violation: "Fails the 'Apply without step-up' and 'Admin cannot apply' rows and AC11.1.2, AC11.1.6"
    source: "C1 config.apply, T-105 step 4, U10 BR7.4, BR7.6 (purpose config.apply), AC11.1.2, AC11.1.6"
  - id: BR6.2
    statement: "An invalid candidate is refused with its code and writes no configuration."
    category: validation
    applies_to: "config.apply"
    trigger: "validateCandidate found an issue"
    logic: "err(code, fieldErrors) per BR2.3; no config_versions row; the refusal record of BR8.3 is the only write"
    violation: "Fails the FD-068 row (no new config_versions row) and the C1 sign-in rows ('nothing written')"
    source: "T-105 acceptance rows"
  - id: BR6.3
    statement: "expectedVersion must equal the latest stored version; otherwise, or when another apply wins the race, the result is conflict."
    category: validation
    applies_to: "config.apply"
    trigger: "A valid candidate"
    logic: "inside the transaction: latest = max(version) (0 when empty); IF expectedVersion != latest THEN conflict; insert version latest + 1; a unique violation on config_versions.version THEN conflict; ApplyConfigInput.expectedVersion is an integer >= 0"
    violation: "Two applies from version 1 both succeeding loses one change (threat 4, 'Concurrency' row)"
    source: "T-105 step 4 and acceptance row 'Concurrency', threat 4, C1 errors"
  - id: BR6.4
    statement: "An accepted apply writes the version, its change rows, its audit row and its outbox row in one transaction."
    category: constraint
    applies_to: "config.apply, PgConfigRepository"
    trigger: "Validation and the version check passed"
    logic: "insert config_versions {version: latest + 1, schema_version: 2, values: normalised candidate, actor_account_id, reason, effective_from: Clock.now(), rolled_back_from: null}; insert one config_changes row per diff entry; AuditWriter (BR8.1); ConfigEventSink.configApplied(tx, {version}) (BR8.2); result ok({version})"
    violation: "A version without its audit or outbox row, or the reverse, fails 01-conventions §3 and the 'Apply' and FD-083 rows"
    source: "T-105 step 4, 01-conventions §3, FD-083, FR102"

  # Group 7 — Rollback
  - id: BR7.1
    statement: "config.rollback needs config.write and a step-up, checked in that order."
    category: authorization
    applies_to: "commands/rollback-config.ts"
    trigger: "Any call"
    logic: "requires {capability: 'config.write', stepUp: true} with step-up purpose config.rollback; forbidden or auth.step_up_required write nothing"
    violation: "A rollback without step-up is a silent change (threat 3)"
    source: "C1 config.rollback, 03 §4, U10 BR7.6"
  - id: BR7.2
    statement: "The rollback target must exist; its values are upgraded and validated against today's rules before they become a new version."
    category: validation
    applies_to: "config.rollback"
    trigger: "Input passed BR7.1"
    logic: "RollbackConfigInput {toVersion >= 1, reason}; IF no stored version toVersion THEN not_found; candidate = upgradeConfigValues(stored.values, stored.schema_version); validateCandidate (BR2.2) with the current version for BR1.8; an issue => its code (config.invariant or config.out_of_range)"
    violation: "Restoring a version that today's ranges refuse re-opens a closed setting (for example a severe threshold above 10)"
    source: "T-105 step 4, FD-082 rollback row, C1 errors (not_found)"
  - id: BR7.3
    statement: "A rollback creates a new version that copies the target's values and names it in rolled_back_from; the history is never rewritten."
    category: constraint
    applies_to: "config.rollback"
    trigger: "The target validated"
    logic: "IF diff(current, candidate) is empty THEN validation errors.config.noChange; ELSE insert version latest + 1 with rolled_back_from = toVersion, change rows = diff(current, candidate), audit config_rolled_back, ConfigEventSink.configApplied(tx, {version, rolledBackFrom: toVersion}); a unique violation => conflict; result ok({version})"
    violation: "Editing or deleting versions erases history (threat 6, 'Rollback' row)"
    source: "T-105 step 4 and acceptance rows 'Rollback' and FD-083, threat 6, AC11.1.4"

  # Group 8 — Records
  - id: BR8.1
    statement: "Every accepted change writes one audit row on the config stream with the version, the changes and the step-up flag, and never the reason text."
    category: constraint
    applies_to: "config.apply, config.rollback, AuditWriter"
    trigger: "BR6.4 or BR7.3 persists"
    logic: "stream 'config', action config_applied or config_rolled_back, actor = the account, details {version, rolledBackFrom?, changes: [{path, before, after}], step_up: true}; paths are known setting paths only and values are the bounded settings themselves; the reason stays in config_versions.reason"
    violation: "Free text in audit details breaks 01-conventions §5; a change without previous and new value fails FR102 and AC11.1.1"
    source: "T-105 step 4 (details {version, changes}), 01-conventions §5, FR102, AC11.1.1, U10 BR7.5, ISS-108"
  - id: BR8.2
    statement: "config.applied is appended through ConfigEventSink in the same transaction, implemented by Notification, and routes to no job."
    category: constraint
    applies_to: "modules/administration/ports.ts ConfigEventSink, modules/notification/config-event-sink.ts"
    trigger: "BR6.4 or BR7.3 persists"
    logic: "ConfigEventSink.configApplied(tx, {version, rolledBackFrom?}) => Outbox.append(tx, 'config.applied', {version, rolledBackFrom?}); the worker's relay maps config.applied to [] (already true since T-009, ISS-186)"
    violation: "A direct outbox write from Administration breaks the FD-067 cycle rule; a job for it fails the FD-083 row"
    source: "FD-083, FD-065, FD-067, C1 ports_declared, C15 config.applied"
  - id: BR8.3
    statement: "A Super Admin's apply or rollback that is refused after authorization and step-up writes one config_rejected audit row in its own transaction."
    category: policy
    applies_to: "config.apply and config.rollback onRefused"
    trigger: "Refusal with config.invariant, config.out_of_range, validation, conflict or not_found after requires passed"
    logic: "audit stream 'config', action config_rejected, details {operation: apply | rollback, code, paths: known setting paths with an issue, unknownKeyCount, step_up: true}; no unknown key name, no value of an unknown key, no reason text"
    violation: "An attempt to switch a security key on leaves no trace (FR102 'result', AC11.1.3)"
    source: "Question 8, FR102, AC11.1.3, 01-conventions §3 (onRefused)"
  - id: BR8.4
    statement: "A refusal before authorization or step-up writes nothing in this module."
    category: constraint
    applies_to: "config.propose, config.apply, config.rollback"
    trigger: "forbidden or auth.step_up_required"
    logic: "no config_versions, config_changes, audit or outbox row; a wrong step-up password is recorded by U10 as step_up_failed"
    violation: "Fails 'Apply without step-up: nothing written' and AC11.1.6"
    source: "T-105 acceptance rows, AC11.1.6, U10 BR7.6"

  # Group 9 — Consumers and wiring
  - id: BR9.1
    statement: "Every module reads configuration through the ConfigProvider port; no threshold, toggle or number is a constant in code."
    category: constraint
    applies_to: "every module and page that uses a setting"
    trigger: "Code Generation of this and later Units"
    logic: "U8 sign-in delay and severe notice, U10 resolveCapabilities, U14 limited data and facility feedback, U15/T-207 emergency numbers, U21 limited data, U32 thresholds and enabled reasons, U33 SLA and appeal days read await config.current(); this Unit replaces any constant it finds in merged code"
    violation: "A constant ignores the setting the Super Admin changed (AC11.1.1 'takes effect without a deployment')"
    source: "T-105 goal and step 6, FD-072, AC11.1.1"
  - id: BR9.2
    statement: "The web composition root wires PgConfigProvider in place of U8's defaults-only provider, and getConfig() is the page helper."
    category: constraint
    applies_to: "apps/web/src/server/container.ts, apps/web/src/server/config.ts"
    trigger: "Code Generation"
    logic: "container.config = new PgConfigProvider(appDb, logger); getConfig() => container.config.current(); pages and layouts call getConfig(); components receive values as props and never import server code (FD-093)"
    violation: "Two providers in one process can disagree; a component importing container.ts fails the boundary lint"
    source: "T-105 step 6, FD-072, FD-093, U8 draft (defaults-only provider)"
  - id: BR9.3
    statement: "The emergency page renders the configured numbers at request time, and still renders when the database is unavailable."
    category: policy
    applies_to: "apps/web/src/app/[locale]/(patient)/emergency/page.tsx"
    trigger: "A request for /en/emergency or /bn/emergency"
    logic: "the page opts into request-time rendering (connection() from next/server), reads (await getConfig()).emergency and passes it to Emergency; BR4.5 supplies the last good values or the defaults when the read fails; the ASSUMPTION(CR-005) marker is removed"
    violation: "A page prerendered at build time shows the numbers of the build; a page that fails without the database removes emergency guidance (hard rule)"
    source: "ISS-171, ISS-134, T-207 step 1, PRODUCT.md hard rule (non-blocking emergency guidance)"
  - id: BR9.4
    statement: "The worker is not wired to the database provider in this Unit."
    category: constraint
    applies_to: "apps/worker"
    trigger: "Code Generation"
    logic: "no worker job reads configuration yet; the first one wires PgConfigProvider with the worker pool (rk_worker already holds SELECT on config_versions) and imports it through the application worker subpath (FD-093)"
    violation: "Wiring an unused provider adds an import the boundary rules must then allow"
    source: "0001_grants_part1.sql, FD-093 (worker imports), design decision"
  - id: BR9.5
    statement: "A capability toggle change reaches the next getActor; Super Admin's and the untouched role's capabilities never change."
    category: authorization
    applies_to: "U10 resolveCapabilities with ConfigProvider"
    trigger: "A version that changes capabilities.* is applied"
    logic: "getActor reads (await config.current()).capabilities on every request; admin.revealIdentity true gives admin identity.reveal; super_admin keeps all eight; moderator unchanged"
    violation: "Fails the 'Super admin caps fixed' row"
    source: "T-105 acceptance row 'Super admin caps fixed', U10 BR1.1-BR1.5, BR3.1"

  # Group 10 — Copy
  - id: BR10.1
    statement: "Copy that names an emergency number takes the number as a parameter from the configuration."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json emergency.body, compose.safetyEmergFix"
    trigger: "Code Generation; later rendered by U15 T-202, T-207 and U26 T-306"
    logic: "emergency.body has {ambulance} and {healthLine}; compose.safetyEmergFix has {ambulance}; callers pass formatDigits(config.emergency.<key>, locale); with the default numbers the rendered text equals today's text in both languages"
    violation: "Two different ambulance numbers on one screen (F2)"
    source: "Question 5, PRODUCT.md hard rule (emergency guidance), T-105 hard-rule checklist"
  - id: BR10.2
    statement: "Every new message key has an English and a Bengali entry with the same key and the same parameters, added in the same commit."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json errors.config.*, emergency.body, compose.safetyEmergFix"
    trigger: "Code Generation"
    logic: "keys errors.config.reasonRequired, noChange, reasonLength, lastVerifiedRequired, dateInFuture, dateInvalid, phoneFormat, maxDelayOrder, severeOrder; i18n parity passes; the Bengali strings are listed for the owner's review"
    violation: "A key without its Bengali string is a build failure (project.md Mandated)"
    source: "project.md Mandated (Bengali and English), FD-024, FD-042, T-105 hard-rule checklist"

  # Group 11 — Migration and seed
  - id: BR11.1
    statement: "One forward-only migration upgrades the stored versions and then makes config_versions and config_changes append-only."
    category: constraint
    applies_to: "packages/database/src/migrations/<next free>_config_schema_v2.sql"
    trigger: "pnpm db:migrate"
    logic: "UPDATE config_versions SET values = values - 'retention', schema_version = 2 WHERE schema_version = 1; CREATE TRIGGER ... BEFORE UPDATE OR DELETE ON config_versions and on config_changes EXECUTE FUNCTION fn_block_mutation(); no grant changes; migrations.int.test.ts count updated"
    violation: "Stored retention numbers keep a second copy (FD-068); an editable history breaks threat 6"
    source: "Question 7, FD-082, T-105 threat 6, 02-data-model.md §10"
  - id: BR11.2
    statement: "The seed writes version 1 at schema version 2, without a retention block, from DEFAULT_CONFIG_VALUES and the corpus values, and stays idempotent."
    category: constraint
    applies_to: "packages/test-support/src/seed/seed-config.ts"
    trigger: "pnpm db:seed"
    logic: "values = DEFAULT_CONFIG_VALUES with the corpus thresholds, limitedDataThreshold and emergency; schemaVersion CONFIG_SCHEMA_VERSION; actor sa_founder; reason 'Initial demo configuration'; skipped when version 1 exists; retention_policies keeps its own seed"
    violation: "A seeded retention block fails the FD-082 rows; a second run must insert nothing"
    source: "T-105 step 5, FD-082, FD-063 acceptance row (seeded version 1)"
  - id: BR11.3
    statement: "The test builder and the fake follow the schema."
    category: constraint
    applies_to: "packages/test-support/src/builders/config.ts aConfig, fakes/config-provider.ts StaticConfigProvider"
    trigger: "Code Generation"
    logic: "aConfig merges signIn and drops retention; StaticConfigProvider.current() returns Promise.resolve(values) (BR4.1); a fake ConfigRepository and ConfigEventSink record calls"
    violation: "A builder that still merges retention fails to parse; a synchronous fake does not match the port"
    source: "01-conventions §10 (builders and fakes), BR4.1"

  # Group 12 — Verification and records
  - id: BR12.1
    statement: "Tests cover each level the team practice names."
    category: constraint
    applies_to: "U12 Code Generation and Build and Test"
    trigger: "Code Generation"
    logic: "contracts: full range table with boundaries and +-1, strict refusals, always-enabled reasons, signIn defaults and order rules, emergency formats; domain: denylist paths, diff (nested, arrays, unchanged), upgrade; application (fakes): every query and command, each refusal code, audit details contain only known paths and bounded values, conflict, rollback chain, noChange, onRefused record; database (int): repository methods, provider cache expiry through invalidate(), empty table, invalid stored version, migration upgrade and trigger refusal; web: emergency page in en and bn with configured numbers"
    violation: "Fails team.md Testing Posture and 01-conventions §10"
    source: "T-105 'Tests to write', team.md Testing Posture, 01-conventions §10"
  - id: BR12.2
    statement: "The Unit adds at least one smoke assertion."
    category: constraint
    applies_to: "packages/application or packages/contracts *.smoke.test.ts"
    trigger: "Code Generation"
    logic: "smoke: DEFAULT_CONFIG_VALUES parses, an apply through fakes creates version 2 with one change row and one config.applied event"
    violation: "Fails team.md (the cumulative smoke suite only grows)"
    source: "team.md Testing Posture"
  - id: BR12.3
    statement: "pnpm check and pnpm smoke are green, with the 80% line floor met in every package this Unit touches."
    category: constraint
    applies_to: "U12 Build and Test"
    trigger: "Before merge"
    logic: "pnpm check (typecheck, lint with boundaries, unit and integration tests, i18n parity, format check, build) and pnpm smoke exit 0; coverage per package >= 80%, never lowered"
    violation: "Fails the 'Checks' row and D10"
    source: "T-105 acceptance row 'Checks', team.md Way of Working and Testing Posture"
  - id: BR12.4
    statement: "Files changed outside T-105's owned paths are recorded in the hand-off and in one ISS row."
    category: constraint
    applies_to: "U12 Code Generation"
    trigger: "A file outside the owned paths changes"
    logic: "the additions listed in functional-spec.md § 13 are recorded; any other addition is recorded the same way"
    violation: "An unrecorded edit fails the G4 review ('files outside owned paths')"
    source: "team.md Way of Working step 4"
  - id: BR12.5
    statement: "The reference documents and the downstream task files are corrected in the same Bolt."
    category: constraint
    applies_to: "docs/implementation/02-data-model.md §10 and §11, 03-routes-and-contracts.md §3 and §4, contract-summary.md C1, tasks/T-408-staff-notifications-and-config.md"
    trigger: "Code Generation"
    logic: "02 §11: no retention block, schema version 2, current = highest version, the always-enabled reasons, the signIn block; 02 §10: the two new append-only tables; 03 §3: current() returns a Promise; 03 §4: the signIn ranges and the noChange refusal; C1: the signIn range line (BR1.9); T-408: the always-enabled reasons (Q4), reuse of actions/config.ts, the export and import buttons (Q10)"
    violation: "A stale reference document sends the next Unit back to the old rules (contract-summary ownership rule)"
    source: "contract-summary.md (the building Unit corrects 03), unit-of-work.md documentation follow-ups (02 §11), project.md Mandated"
  - id: BR12.6
    statement: "Every finding of this design becomes an ISS row linked to U12, and the Build and Test record lists the ISS ids found and fixed."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Code Generation and Build and Test"
    logic: "rows F1-F12 of functional-spec.md § 8 with Found in 'U12 T-105'; ISS-079 and ISS-171 move to fixed in U12; ISS-108 stays with its owner"
    violation: "Fails project.md Mandated (every defect, workaround or assumption gets a row)"
    source: "project.md Mandated, team.md Way of Working"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Seven strict blocks, schema version 2, no retention | validation |
| BR1.2 | Moderation thresholds and their ranges | validation |
| BR1.3 | Limited-data threshold 1–50, never a score (R2 open) | validation |
| BR1.4 | Report reasons are a set; five always enabled | validation |
| BR1.5 | Four capability toggles only; Super Admin fixed | authorization |
| BR1.6 | Two feature-visibility flags | validation |
| BR1.7 | Emergency number format; real, non-future date | validation |
| BR1.8 | A changed number needs a new last-verified date | validation |
| BR1.9 | Sign-in ranges where every value takes effect | validation |
| BR1.10 | Defaults: prototype plus owner's sign-in values | constraint |
| BR2.1 | Whole candidate as a JSON object | validation |
| BR2.2 | Fixed validation order, all findings collected | validation |
| BR2.3 | One code per finding; most serious wins; no echo | validation |
| BR2.4 | Reason 5–500 characters | validation |
| BR2.5 | No-change refused | validation |
| BR3.1 | Structural-key denylist | authorization |
| BR3.2 | Leaf diff, arrays as sets | calculation |
| BR3.3 | Version-1 upgrade strips retention | calculation |
| BR3.4 | Policy functions import nothing | constraint |
| BR4.1 | `current()` returns a Promise | constraint |
| BR4.2 | Current = highest version | calculation |
| BR4.3 | 5-second process-time cache, single load, invalidate | constraint |
| BR4.4 | Empty table → defaults, logged once | policy |
| BR4.5 | Read failure → last good or defaults, never thrown | policy |
| BR4.6 | Same process at once, others within 5 s | policy |
| BR5.1 | `config.current` for staff, uncached | authorization |
| BR5.2 | History: newest first, actor as username and role | constraint |
| BR5.3 | Propose: `config.write`, diff, no write | authorization |
| BR6.1 | Apply: `config.write` then step-up | authorization |
| BR6.2 | Invalid candidate writes no configuration | validation |
| BR6.3 | Optimistic concurrency, `conflict` | validation |
| BR6.4 | Version, changes, audit, outbox in one transaction | constraint |
| BR7.1 | Rollback: `config.write` then step-up | authorization |
| BR7.2 | Target exists, upgraded, re-validated | validation |
| BR7.3 | Rollback is a new version; history untouched | constraint |
| BR8.1 | Audit row with changes and step-up flag, no reason text | constraint |
| BR8.2 | `config.applied` through the sink, no job | constraint |
| BR8.3 | Refusal after step-up audited as `config_rejected` | policy |
| BR8.4 | Refusal before authorization writes nothing | constraint |
| BR9.1 | Every reader goes through the port | constraint |
| BR9.2 | Database provider wired; `getConfig()` helper | constraint |
| BR9.3 | Emergency page live at request time, robust | policy |
| BR9.4 | Worker not wired yet | constraint |
| BR9.5 | Toggle change reaches `getActor` | authorization |
| BR10.1 | Emergency numbers as copy parameters | constraint |
| BR10.2 | New keys in both languages | constraint |
| BR11.1 | Migration upgrades rows, then append-only triggers | constraint |
| BR11.2 | Seed version 1 at schema version 2 | constraint |
| BR11.3 | Builder and fake follow the schema | constraint |
| BR12.1 | Tests per level | constraint |
| BR12.2 | Smoke assertion | constraint |
| BR12.3 | `pnpm check`, `pnpm smoke`, 80% floor | constraint |
| BR12.4 | Owned-path additions recorded | constraint |
| BR12.5 | Reference documents and T-408 corrected | constraint |
| BR12.6 | Findings as ISS rows | constraint |
