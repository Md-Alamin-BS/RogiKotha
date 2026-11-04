# Contract summary — RogiKotha demo build

The formal contracts between the 44 Units of `unit-of-work.md`, along the edges of `unit-of-work-dependency.md`, between the thirteen components of `components.md`, for the requirements in `requirements.md`. The catalogue in `docs/implementation/03-routes-and-contracts.md` stays the reference for every operation this summary does not change; where the two disagree, this summary wins, and the Unit that builds the operation corrects 03 in its Code Generation.

Answers: `contract-design-questions.md` Q1–Q21 (all A except Q10 = B and Q13 = B). Decisions: FD-076..FD-087 in `docs/status/decision-log.md`. Earlier decisions written in, not re-asked: FD-041, FD-050, FD-064..FD-075.

**Revision 2026-11-04 (FD-105):** release 1 is built by 10 active Units (U9, U11, U46, U20, U47, U22, U48, U49, U41, U50) on the merged baseline (U1–U8, U45 and the demo slice); 18 Units are deferred to release 2 and 13 are merged into U46–U50 (`unit-of-work.md`). Each contract below carries a **Release** line: release 1 with its active provider and consumers, or "deferred to release 2 (FD-105)". A deferred contract or operation keeps its full text so release 2 resumes it unchanged; a "built by" that names a merged-into Unit (U14–U16, U21, U23, U24, U26, U27, U30, U31) now reads as its new Unit (U46, U47, U48, U49). Units Generation added the release-1 seams as C16–C19 and as new operations in C4, C7 and C9. Answers: Q23–Q28 (dated section of the questions file). Contract IDs C1–C15 are unchanged.

## How to read the contracts

- **Grouping (Q1):** one contract per provider component (C1–C13), plus the external HTTP API (C14) and the outbox events and jobs (C15).
- **Source of truth (Q2):** the TypeScript types and zod schemas in `packages/contracts`: inputs `<VerbNoun>Input` in `src/schemas/<module>.ts`, view models in `src/view-models/`, `ErrorCode` in `src/errors.ts`, enums in `src/enums.ts`. Each shared-schema block below names the operation, its input, its result, its errors, its authorization and its consumers; the compiler checks the rest. Port interfaces live in `packages/application/src/ports/` (shared ports) or in the declaring module's `ports.ts` (cycle-break ports, FD-067).
- **External API (Q3):** only the route handlers under `/api/*` get an OpenAPI block (C14). Pages and server actions are internal contracts.
- **Built by:** the Unit that writes the operation. **Consumers:** the Units whose dependency edges reach the provider.
- **Common rules (Q4, Q5, FD-076):**
  - Every expected failure returns `Result` with an `ErrorCode`; nothing throws across a boundary (`01-conventions.md` §3). The errors listed per operation are its expected ones; `validation`, `forbidden` and `internal` apply to every command and are not repeated.
  - Commands run `parse → authorize → load → decide → persist` in one transaction, with their audit row (`AuditWriter`) and outbox rows (`Outbox`) in that same transaction.
  - In-process calls have no timeout. External adapters do: ClamAV 30 s, SMTP 30 s. The scanner fails closed (FD-035).
  - Jobs are idempotent by `singletonKey` and retry 5 times with exponential backoff, then stay failed and visible to staff. `evidence.process` keeps its own tighter bound (3 retries, 120 s per item, 03 §4). The relay is transactional (FD-038).
  - Versioning: one repository. A contract change and its consumers change together in one Bolt. Additive changes (a new optional field, a new event) are safe, and consumers ignore unknown fields. A breaking change to a command, port or event first updates this summary and names the affected Units; if it touches a hard rule or a data boundary it also needs an FD entry. Event payloads carry no version number: a breaking change takes a new event name and the old one is retired.
- **Privacy rules for every contract:** view models never carry `accountId`, email, private linkage or original filenames (03 §2). Outbox payloads carry ids, enums, counts and booleans only, never content. A reporter's account id never appears in any payload, view model or log (FD-086).

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| C1 | U12 T-105 (config); U37 T-408 (Beta metrics); U33 T-404 (case timeline query); U29 T-309 (audit expiry); `AuditWriter` is baseline (T-004/T-007) | U13, U17, U21, U29, U30, U32, U33, U37; every command Unit writes audit | in-process commands, queries, ports | Administration (U12) |
| C2 | U34 T-405; U8 T-101 (`mail.send`, FD-071) | U22, U30, U32, U33, U35, U37, U39, U41; U8 queues its own essential email | in-process queries and the email-queueing internal; worker jobs | Notification (U34) |
| C3 | U29 T-309 | U36, U39; U22 and U30 delete paths (wired by U29, FD-073) | in-process commands, queries, `RetentionSubject` port | Retention (U29) |
| C4 | U11 T-104 | U13, U21, U30, U32, U33, U38, U39 | in-process commands, queries, `RevealTarget` and `RevealContact` ports | Identity (U11) |
| C5 | U8 T-101; U10 T-103 (staff access, capabilities, stepUp) | U9, U10, U11, U12, U13, U17, U23, U33, U34, U35, U37, U39, U41 | in-process commands and queries; Better Auth behind the account repository | Account (U8) |
| C6 | U14 T-201 | U15, U16, U17, U18, U20, U21, U26 | in-process queries and commands, `ConditionStats` port | Taxonomy (U14) |
| C7 | U14 T-201; U17 T-204 | U15, U16, U17, U18, U20, U21, U26, U36, U39 | in-process queries and commands, `ProviderExperience` and `ProfileMergeParticipant` ports | Directory (U14) |
| C8 | U23 T-303; U24 T-304; U25 T-305 | U24, U25, U26, U28, U29, U33, U36, U39, U41 | in-process commands and queries; `evidence.process` job | Evidence (U23) |
| C9 | U21 T-301; U22 T-302 | U22, U26, U27, U29, U30, U32, U33, U38, U39 | in-process commands, queries, `DiscussionPresence` port | Review (U21) |
| C10 | U30 T-401 | U29, U31, U32, U38, U39, U41 | in-process commands, queries, `ModerationSignals` port | Community (U30) |
| C11 | U32 T-403; U33 T-404 | U33, U35, U38, U39, U41 | in-process commands and queries; `moderation.openRepetitionCase` job | Moderation (U32) |
| C12 | U18 T-205 | U19, U39 | in-process queries; `search.refresh` job; `EvidencePresence` port | Search (U18) |
| C13 | U39 T-410 | U41, U43 | in-process commands and queries; `data.export` and `data.delete` jobs | DataRequests (U39) |
| C14 | U8, U18, U23, U25, U29, U39; `/api/health` is baseline (T-008) | External: public web (browser), External: staff console; U19, U26, U28, U36, U38, U41, U43 | synchronous HTTP (OpenAPI) | each route's builder; the OpenAPI block here is owned by Contract Design |
| C15 | U34 T-405 (envelope, notification routes); U4 CR-011 (transactional relay); each publisher owns its event's payload | worker jobs; every publishing Unit | async events (AsyncAPI), outbox → pg-boss | Notification (U34) |
| C16 | U47 reviews (the experience page and the three slots); slot internals U48, U49, U22; U9 T-102 (gate component) | U47 (mounts slots and gate), U49 (mounts gate), U48, U49, U22 (own slot internals) | UI composition: React server components with frozen props | Review (U47); each slot's internals by its owning Unit |
| C17 | U46 directory (declares the port, interim binding); U48 evidence (implementation, swaps the binding) | U46 (doctor cards and profiles), U47 (`<EvidenceSection>`, experience cards) | in-process port | Directory (U46) declares; Evidence (U48) implements |
| C18 | U8 T-101 (defaults-only `ConfigProvider`, merged); each reading Unit owns its module constant | U20, U46, U47, U48, U49, U41 | in-process constants and the `ConfigProvider` port | Administration (U12, release 2); release 1: the reading Unit |
| C19 | U8 T-101 (merged baseline) | U9, U11, U46, U47, U48, U49, U41 | in-process ports and command helpers | Account (U8) |

Edges without a runtime contract (build order only): edges to U1 CR-009, U2 CR-007, U3 T-010, U6 CR-012 and U7 CR-004 (tooling, seed and copy fixes); edges between UI Units (U9, U15, U16, U19, U20, U26, U27, U28, U31, U35, U36, U37, U38, U40), which share components and layouts, not domain contracts; and edges to U13, U41, U42 and U43 (validation and hardening Units). Edges to U4 CR-011 map to C15, and edges to U5 CR-006 map to C2 (mail recipients through `to_email_enc`, FD-041). U14 provides two components, so its edges map to C6 and C7.

Release-1 edges (FD-105, `unit-of-work-dependency.md`): U47 → U46 maps to C6, C7, C9 (read-side stub) and C17; U47 → U11 to C4; U47 → U9 to C16 (gate); U20 → U46 to C6, C7 and C9 (`listExperienceCards`); U22 → U47 to C9 and C16; U48 → U47 to C9 (`isReviewAuthor`) and C16; U49 → U47 to C9 (`isReviewPublished`) and C16; U49 → U11 to C4; U49 → U9 to C16 (gate); U41 → U48 to C14; U50 → every active Unit is a release check with no runtime contract. Every active Unit uses C19 and, where it reads a setting, C18.

### C1 — Administration

**Release:** deferred to release 2 (FD-105), with U12, U29, U33 and U37. Release 1 uses only the baseline: `AuditWriter` (every release-1 command writes its audit row) and U8's defaults-only `ConfigProvider.current()` (C18).

```yaml
contract: C1 Administration
provider_component: Administration
mechanism: in-process (shared schema in packages/contracts)
schema_source: packages/contracts/src/schemas/administration.ts, src/config-values.ts, src/view-models/config.ts
operations:
  - name: config.current
    kind: query
    input: GetConfigInput {}
    result: "{values: ConfigValues, version: int}"
    requires: staff (read); ConfigProvider.current() serves other modules (5 s cache)
    built_by: U12
  - name: config.history
    kind: query
    result: "{versions: [{version, actor: opaque, reason, effectiveFrom, rolledBackFrom?, changes: [{path, before, after}]}]}"
    requires: staff
    built_by: U12
  - name: config.propose
    kind: query
    input: ProposeConfigInput {values}
    result: "{diff: [{path, before, after}], validation: {ok, fieldErrors?}}"
    requires: config.write
    built_by: U12
  - name: config.apply
    kind: command
    input: ApplyConfigInput {values, reason, expectedVersion}
    result: "{version}"
    errors: [config.invariant, config.out_of_range, conflict, auth.step_up_required]
    requires: config.write + stepUp
    audit: config
    outbox: config.applied (through ConfigEventSink, FD-083)
    built_by: U12
  - name: config.rollback
    kind: command
    input: RollbackConfigInput {toVersion, reason}
    result: "{version}"
    errors: [not_found, conflict, auth.step_up_required]
    requires: config.write + stepUp
    audit: config
    outbox: config.applied
    built_by: U12
  - name: adminNavCounts
    kind: query
    result: "{queue, critical, evidence, providers, notifications}: (int | null) each"
    requires: staff
    built_by: U35 (query), counts through OperationalCounts
  - name: administration.betaMetrics
    kind: query
    result: "BetaMetricsVM {accounts, reviewsPublished, casesOpen, casesClosed, reportsTotal, evidenceProcessed, evidenceFailed}: (int | null) each, plus asOf"
    requires: staff
    notes: "exact counts, no analytics, no per-user data (FD-019, FD-066); null renders Not provided, never 0; cases open and closed plus the report-row total as its own labelled figure (Q15, FD-085)"
    built_by: U37
  - name: audit.stream
    kind: query (internal)
    input: "{stream: string, limit: int <= 50}"
    result: "[{action, actor: opaque, targetKind?, targetId?, details, createdAt}]"
    requires: internal; called by moderation.case for stream case:<code>
    built_by: U33 (inside modules/administration, FD-065)
  - name: audit.expire
    kind: command (internal)
    input: "{before: Date, keepTargets: [{targetKind, targetId}]}"
    result: "{expired: int}"
    notes: "fn_expire_audit gains a held-targets parameter (AC7.3.5); runs under rk_maintenance; called by retention.expire"
    built_by: U29
config_values_changes:
  - "retention block removed from ConfigValues (Q12, FD-082); schema_version 2; stored versions are migrated by stripping the block; rolling back to an old version strips it too"
  - "signIn block added by U8 with defaults, taken over by U12 as a runtime setting (FD-058, FD-063, FD-072): {delayAfterFailures: 3 (1-20), windowMinutes: 15 (1-1440), firstDelaySeconds: 1 (1-60), maxDelaySeconds: 30 (1-300, >= firstDelaySeconds), severeFailures: 10 (2-100, > delayAfterFailures)}"
ports_declared:
  - name: AuditWriter
    methods: ["write(tx, {stream, action, actor, targetKind?, targetId?, details}): Promise<void>"]
    notes: "details allowlisted: ids, enums, counts, config before/after; never free text, emails, filenames or review bodies"
    implemented_by: database (baseline)
  - name: OperationalCounts
    methods: ["read(metric: OperationalMetric): Promise<number | null>"]
    metric_enum: [accounts, reviewsPublished, casesOpen, casesClosed, casesCriticalOpen, reportsTotal, evidenceProcessed, evidenceFailed, evidenceAwaiting, providerWorkPending, staffNotificationsUnacked]
    implemented_by: "Account (accounts), Review (reviewsPublished), Moderation (cases*, reportsTotal), Evidence (evidence*), Directory (providerWorkPending), Notification (staffNotificationsUnacked); implementations built by U37 for the Beta metrics and by U35 for the nav counts"
  - name: ConfigEventSink
    methods: ["configApplied(tx, {version, rolledBackFrom?}): Promise<void>"]
    implemented_by: "Notification (appends config.applied); built by U12, implementation in modules/notification (Q13, FD-083)"
```

### C2 — Notification

**Release:** deferred to release 2 (FD-105), with U34. Release 1 keeps only what U8 merged: the essential-email queueing inside the account commands (verification, reset, security) and the worker's `mail.send` job; consumer U9, whose screens call those commands. No release-1 Unit queues discussion, moderation or evidence email.

```yaml
contract: C2 Notification
provider_component: Notification
mechanism: in-process queries and internals; worker jobs notification.deliver and mail.send
schema_source: packages/contracts/src/schemas/notification.ts, src/view-models/notification.ts, src/view-models/staff-notifications.ts
operations:
  - name: notification.list
    kind: query
    input: ListNotificationsInput {cursor?}
    result: "{items: NotificationVM[], nextCursor?}"
    requires: account (own items only)
    notes: "items older than notification_days are not returned even before expiry runs"
    built_by: U34
  - name: notification.markRead
    kind: command
    input: "MarkNotificationsReadInput {ids} | {all: true}"
    requires: account
    built_by: U34
  - name: notification.unreadCount
    kind: query
    result: "{count}"
    built_by: U34
  - name: staffNotification.list
    kind: query
    input: StaffNotificationListInput {cursor?, limit <= 50, unackedOnly?}
    result: "{items: StaffNotificationVM[], nextCursor?}"
    requires: staff
    built_by: U34
  - name: staffNotification.ack
    kind: command
    input: StaffNotificationAckInput {id}
    requires: staff
    audit: "staff action ack (Administration)"
    built_by: U34
  - name: notification.queueEmail
    kind: internal (web tier only)
    file: packages/application/src/modules/notification/internal/queue-email.ts
    signature: "queueEmail(tx, {accountId, category, messageKey, params, dedupeKey}): Promise<Result<{deliveryId} | {suppressed: true}>>"
    behaviour: "reads the recipient through RecipientDirectory; when emailAllowed(category, prefs) inserts email_deliveries (status queued, to_email_enc filled) and enqueues mail.send {deliveryId} in the same transaction; otherwise inserts nothing and returns suppressed; the same dedupeKey never queues twice"
    categories: [verification, reset, security, device_approval, deletion, moderation, discussion, evidence]
    notes: "category discussion is added to the email_deliveries enum (FD-070); evidence is accepted but nothing queues it in the demo (FD-070)"
    callers: "U8 (verification, reset, security, severe sign-in), U10 (device_approval), U30 comment.post (discussion), U32 report.file and U33 moderation.decide, moderation.restore, appeal.decide (moderation, FD-087), U39 dataRequest.delete (deletion)"
    built_by: U34 (U8 builds the first version for essential categories, FD-071)
  - name: notification.expire
    kind: command (internal)
    input: "{before: Date}"
    result: "{expired: int}"
    notes: "deletes notifications whose created_at is before the cutoff Retention passes (notification_days); notifications.expires_at keeps its column default and is not read (FD-068)"
    caller: retention.expire
    built_by: U34
jobs:
  - name: notification.deliver
    runs_in: worker
    payload: "{eventId, name, payload}"
    behaviour: "in-app only (FD-070): one notifications row per recipient account id carried in the event payload, dedupe_key <event>:<eventId>:<accountId>, ON CONFLICT DO NOTHING; staff kinds insert staff_notifications with dedupe_key <event>:<eventId>; never resolves an address, never inserts email_deliveries, never reads persona_links or blocks (recipients arrive already filtered for self and blocks)"
    built_by: U34
  - name: mail.send
    runs_in: worker
    payload: "{deliveryId}"
    enqueued_by: notification.queueEmail in the web tier (never by the relay)
    behaviour: "reads to_email_enc from email_deliveries, never auth_users (FD-041); sends through Mailer; status sent | failed with last_error_code; content-free params allowlist per message key"
    built_by: U8 (FD-071), extended by U34
ports_declared:
  - name: RecipientDirectory
    methods: ["contactFor(tx, accountId): Promise<{locale, prefs: {emailSecurity, emailModeration, emailEvidence, emailDiscussion}, toEmailEnc: Uint8Array} | null>"]
    notes: "null for a deleted account; web tier only"
    implemented_by: Account, built by U34 in modules/account
  - name: Outbox
    methods: ["append(tx, name, payload): Promise<void>"]
    implemented_by: database (baseline)
```

### C3 — Retention

**Release:** deferred to release 2 (FD-105), with U29. Release 1 has no expiry job, no legal holds and no custody log; `retention.originalDays` is a constant that nothing enforces (C18).

```yaml
contract: C3 Retention
provider_component: Retention
mechanism: in-process commands and queries; retention.expire cron job; RetentionSubject port
schema_source: packages/contracts/src/schemas/retention.ts
operations:
  - name: retention.currentPolicy
    kind: query
    result: "{version, originalDays, auditDays, notificationDays, effectiveFrom}"
    notes: "the only source of retention periods (FD-068, FD-082); the staff console shows them from here"
    built_by: U29
  - name: retention.setPolicy
    kind: command
    input: SetRetentionPolicyInput {originalDays, auditDays, notificationDays, reason}
    errors: [config.out_of_range, auth.step_up_required]
    requires: config.write + stepUp
    audit: retention
    outbox: retention.policyChanged
    built_by: U29
  - name: retention.previewBulk
    kind: query
    input: "{fromDays, toDays}"
    result: "{count, sampleIds, previewToken}"
    requires: retention.bulk (super_admin only, FD-051)
    built_by: U29
  - name: retention.executeBulk
    kind: command
    input: "{previewToken, reason, idempotencyKey}"
    errors: [retention.preview_drift, auth.step_up_required]
    requires: retention.bulk + stepUp
    audit: retention
    built_by: U29
  - name: hold.place
    kind: command
    input: "PlaceHoldInput {targetKind: HoldTargetKind, targetId, reason, expiresAt?}"
    errors: [conflict, not_found]
    requires: holds.manage
    audit: retention
    outbox: hold.changed
    built_by: U29
  - name: hold.release
    kind: command
    input: "{holdId, reason}"
    requires: holds.manage
    audit: retention
    outbox: hold.changed
    built_by: U29
  - name: retention.activeHold
    kind: query (internal)
    input: "{targetKind: HoldTargetKind, targetId}"
    result: "{holdId} | null"
    notes: "active = released_at is null and (expires_at is null or expires_at > now)"
    callers: "Evidence, Review and Community delete paths (wired by U29, FD-073); DataRequests planning"
    built_by: U29
  - name: retention.activeHoldsFor
    kind: query (internal)
    input: "{targets: [{targetKind, targetId}], accountId}"
    result: "{accountHold: holdId | null, held: [{targetKind, targetId, holdId}]}"
    caller: DataRequests (U39)
    built_by: U29
hold_target_kinds: "HoldTargetKind = review | facility_review | comment | evidence | profile | account (Q8, FD-079); a separate contracts enum and DB enum, so report targets do not gain account"
hold_rules:
  - "an active account hold pauses the whole account deletion, including the Directory and Moderation de-identify steps (Q8)"
  - "an author's delete of a held review or comment behaves exactly as an unheld delete for the author: the item leaves every public view and the author's list, the author is never told; the data stays until the hold ends, then the normal deletion runs (Q9)"
  - "a held review or comment keeps its author's persona link through account deletion until the hold ends (Q17)"
jobs:
  - name: retention.expire
    runs_in: worker (hourly cron)
    behaviour: "reads currentPolicy; calls each RetentionSubject.expire; calls notification.expire {before: now - notificationDays}; calls audit.expire {before: now - auditDays, keepTargets: held targets}; all time from the Clock port"
    built_by: U29
ports_declared:
  - name: RetentionSubject
    methods:
      - "kind: 'evidence' | 'review' | 'comment'"
      - "expire?(tx, {now, policy}): Promise<{expired: int}>  # evidence originals past retention_expires_at without an active hold"
      - "onHoldChanged?(tx, {targetId, holdId, placed: boolean}): Promise<void>  # evidence custody hold_placed / hold_released"
      - "previewDeadlineChange?(tx, {fromDays, toDays}): Promise<{ids}>; applyDeadlineChange?(tx, {ids, toDays}): Promise<{changed: int}>  # evidence only"
    implemented_by: "Evidence, Review, Community — all three built by U29 (FD-073)"
```

### C4 — Identity

**Release:** release 1, provider U11. Consumers: U47 (`personaFor` and `publicProjection` for bylines and the composer's persona choice), U49 (`personaFor` and `publicProjection` for comment authors); U11 itself switches `account.register` to `createDefaultPersonas`. Deferred to release 2 (FD-105), with U10, U33, U34 and U39: `identity.reveal`, `identity.deidentify`, `identity.accountsOf`, `identity.personasOf` and the `RevealTarget` and `RevealContact` ports. The release-1 amendment of `personaFor` and the added `renameNamed` follow the block.

```yaml
contract: C4 Identity
provider_component: Identity
mechanism: in-process commands, queries and ports
schema_source: packages/contracts/src/schemas/identity.ts
operations:
  - name: identity.createDefaultPersonas
    kind: internal
    input: "{accountId, username, displayName}"
    result: "{namedPersonaId, pseudonymousPersonaId}"
    caller: account.register (U8 wires the call once U11 exists)
    built_by: U11
  - name: identity.personaFor
    kind: query (internal)
    input: "{accountId, reviewId?, mode: IdentityMode}"
    result: "{personaId}"
    notes: "creates the thread-scoped anonymous persona on first use; two anonymous threads by one author get unrelated aliases (FD-015)"
    callers: [U21, U30]
    built_by: U11
  - name: identity.publicProjection
    kind: query
    input: "{personaId}"
    result: "{displayName, username?, kind, avatarHue}"
    built_by: U11
  - name: identity.accountsOf
    kind: query (internal, private)
    input: "{personaIds: string[]}"
    result: "[{personaId, accountId}]"
    callers: "Community (comment recipients), Moderation (affected author for notices and enforcement), DataRequests — web tier only; persona_links has no worker grant"
    built_by: U11
  - name: identity.personasOf
    kind: query (internal, private)
    input: "{accountId}"
    result: "{personaIds}"
    caller: DataRequests
    built_by: U11
  - name: identity.reveal
    kind: command
    input: "RevealIdentityInput {targetKind: review | facility_review | comment | report, targetId, reason}"
    result: "{accountId, username, email?}"
    errors: [auth.step_up_required, not_found]
    requires: identity.reveal + stepUp (Super Admin always; Admin and Moderator only with the toggle, FD-016)
    audit: identity
    notes: "every attempt, granted or refused, writes identity_reveals, an audit row and the identity.revealed event (onRefused)"
    outbox: identity.revealed
    built_by: U11
  - name: identity.deidentify
    kind: internal (deletion step, web tier)
    input: "{accountId, keepPersonaIds: string[]}"
    result: "{removedLinks: int, keptLinks: int}"
    notes: "deletes the account's persona_links except those of personas whose reviews or comments are held (Q17, FD-079); personas keep their snapshots"
    built_by: U11
ports_declared:
  - name: RevealTarget
    methods: ["resolve(tx, {targetKind, targetId}): Promise<Result<{subject: 'persona', personaId} | {subject: 'account', accountId}>>"]
    implemented_by: "Review (review, facility_review → persona; built by U21), Community (comment → persona; U30), Moderation (report → account, the restricted reporter_account_id; U32)"
  - name: RevealContact
    methods: ["contactForReveal(tx, accountId): Promise<{username, email} | null>"]
    implemented_by: Account, built by U11 in modules/account
```

Release-1 amendment (FD-105, Q25):

```yaml
contract: C4 Identity, release 1
operations:
  - name: identity.personaFor
    kind: query (internal)
    input: "{accountId, reviewId?, mode: IdentityMode}"
    result: "{personaId}"
    rules:
      - "mode named or pseudonymous returns the account's default persona of that kind; reviewId is ignored"
      - "mode anonymous requires reviewId (the thread scope); the same (accountId, reviewId) always returns the same alias, another reviewId never does (FD-015); created on first use in the caller's transaction"
      - "a comment by the review's own author in an anonymous thread resolves with the review's reviewId, so it shows the thread alias"
    errors: "none expected; a missing reviewId with mode anonymous is a programmer error"
    callers: "U47 (composer publish, replacing the demo createPseudonymousPersona); U49 (comment.post)"
    built_by: U11
  - name: identity.renameNamed
    kind: command
    input: "{displayName}"
    requires: account
    audit: identity
    built_by: U11
    consumers: "none in release 1 beyond U11's own tests; the profile entry point comes with U38"
```

### C5 — Account (with staff access)

**Release:** release 1 for the account commands and queries and `actor_shape`, provided by U8 (merged); consumers U9 (screens), U11 (register), U47, U48 and U49 (the `Actor`, its `emailVerified` and `status`). The T-101 ports and helpers behind them are C19. Deferred to release 2 (FD-105): `stepUp`, the `staff.*` operations and `capabilitiesOf` (U10), `account.deleteAccountStep` (U39), `account.applyEnforcement` (U33) and `account.blocksBetween` (blocks are deferred with U49's deferred part).

```yaml
contract: C5 Account
provider_component: Account
mechanism: in-process commands and queries; Better Auth behind the account repository
schema_source: packages/contracts/src/schemas/account.ts, src/schemas/staff.ts, src/actor.ts
operations:
  - name: "account.register | resendVerification | verifyEmail | signIn | signOut | signOutEverywhere | requestPasswordReset | resetPassword | changePassword | listSessions | updatePreferences | submitFeedback | stepUp"
    kind: commands and queries as 03 §4 "account"
    built_by: U8
    changes:
      - "signIn progressive delay (FD-058, FD-063, FD-072): failures counted per normalised email (NFC, trim, lowercase) over windowMinutes, in the in-memory limiter; from delayAfterFailures, an attempt that arrives before the current delay has passed is refused with auth.rate_limited and retryAfterSec, without checking the password; the delay starts at firstDelaySeconds and doubles to maxDelaySeconds; identical response shape and timing whether or not the email has an account"
      - "fixed sign-in limit: 10 failures per 15 min per email and 30 per 15 min per network (T-502), superseding 03 §4's 6 per 15 min"
      - "severe activity: when an address that has an account reaches severeFailures inside the window, queue the security email email.security.severeSignInActivity and append account.securityEvent {kind: severeSignInActivity}; at most once per account per window; nothing for an address without an account"
      - "account.signIn refuses suspended and banned accounts and accounts whose status is deleted"
  - name: account.deleteAccountStep
    kind: internal (deletion step, web tier, inside dataRequest.delete)
    input: "{accountId}"
    behaviour: "revoke every session, status deleted, replace the email with a tombstone hash, delete the Better Auth user; under an active account hold see the C13 open question"
    built_by: U39 (in modules/account, Q6, FD-077)
  - name: account.applyEnforcement
    kind: internal
    input: "{accountId, kind: warn | restrict | suspend | ban, reasonCode, noteToUser, endsAt?, decisionId, actor}"
    caller: moderation.decide
    built_by: U33 (in modules/account)
  - name: account.blocksBetween
    kind: query (internal)
    input: "{accountId, otherAccountIds}"
    result: "{blocked: accountId[]}"
    caller: Community (U30), web tier only
    built_by: U30 (in modules/account)
  - name: "staff.beginDeviceApproval | approveDevice | listDevices | revokeDevice | setStaffRole"
    kind: commands and queries as 03 §4
    built_by: U10
  - name: capabilitiesOf
    kind: function (packages/contracts/src/actor.ts)
    input: "{staffRole, toggles: ConfigValues.capabilities}"
    result: "Capability[]"
    notes: "Super Admin fixed in code; only the Admin/Moderator identity.reveal and evidence.original toggles are configurable (FD-016, FD-022); retention.bulk super_admin only (FD-051)"
    built_by: U10
actor_shape: "Actor {kind: anonymous | account, accountId?, personaId?, emailVerified?, status?, staffRole?, capabilities: Capability[], stepUp?: {rechecked_at}, refusal?: suspended | banned, locale, correlationId} (exactly packages/contracts/src/actor.ts; staff are accounts with a staffRole, there is no staff or system kind)"
```

### C6 — Taxonomy

**Release:** release 1, provider U46. Consumers: U47 (`resolve`, `listSuggested` and `createProvisional` for the composer's condition tags), U20 (`listConditions`). The `ConditionStats` port is release 1, declared and implemented by U46 (read-side Review stub). `createProvisional` is limited by the C18 constant. Deferred to release 2 (FD-105): `taxonomy.mapProvisional`, a staff action (with U10 and U35).

```yaml
contract: C6 Taxonomy
provider_component: Taxonomy
mechanism: in-process queries and commands; ConditionStats port
schema_source: packages/contracts/src/schemas/taxonomy.ts, src/view-models/condition.ts
operations:
  - name: "taxonomy.getCondition | listConditions | resolve | listSuggested"
    kind: queries as 03 §4 "taxonomy"
    built_by: U14
  - name: taxonomy.createProvisional
    kind: command
    input: "{kind, text, lang}"
    result: "{termId}"
    requires: verified
    outbox: term.changed
    built_by: U14
  - name: taxonomy.mapProvisional
    kind: command
    input: "{termId, canonicalId}"
    requires: super_admin (FR38)
    audit: taxonomy
    outbox: term.changed
    built_by: U14
ports_declared:
  - name: ConditionStats
    methods: ["forCondition(termId): Promise<{sentiment: Distribution, outcome: Distribution, mentioned: [{kind, termId, count}], doctors: [{doctorId, count}], facilities: [{branchId, count}], districts: [{districtKey, count}], total, limitedData}>"]
    distribution: "Distribution = {counts: {positive, mixed, negative} | {helped, none, worse, uncertain}, total, limitedData}; exact counts with the denominator, no score"
    implemented_by: Review, built by U14 in modules/review (FD-067)
```

### C7 — Directory

**Release:** release 1 for the six directory queries and the `ProviderExperience` port, provider U46; consumers U20 and U47. U47 adds its review queries beside U46's read-side stub without rewriting it. Added for release 1: `directory.addMemberDoctor` (FD-100), consumer U47, specified after the block. Deferred to release 2 (FD-105), with U17 and U33: `submitProfile`, `claimProfile`, the `decide*` and `list*` operations, `proposeFieldChange`, `setProfileState`, `deidentify` and the `ProfileMergeParticipant` port.

```yaml
contract: C7 Directory
provider_component: Directory
mechanism: in-process queries and commands; ProviderExperience and ProfileMergeParticipant ports
schema_source: packages/contracts/src/schemas/directory.ts, src/view-models/doctor.ts, src/view-models/facility.ts, src/view-models/providers.ts
operations:
  - name: "directory.getDoctor | listDoctors | getFacility | listFacilities | doctorsAtBranch | facilitiesForDoctor"
    kind: queries as 03 §4 "directory"
    notes: "registrationNotVerified always true; empty fields omitted, never 0"
    built_by: U14
  - name: "directory.submitProfile | claimProfile | decideSubmission | decideClaim | decideFieldChange | listSubmissions | listClaims | listFieldChanges"
    kind: commands and queries as 03 §4
    outbox: "directory.submissionFiled, directory.claimFiled, directory.fieldChangeProposed (staff); directory.submissionDecided, directory.claimDecided, directory.fieldChangeDecided {recipientAccountId} (submitter or claimant); doctor.changed, facility.changed"
    built_by: U17
  - name: directory.proposeFieldChange
    kind: command
    input: "{targetKind, targetId, field, newValue}"
    changes: "protected fields widen to name, bmdc_number, qualifications_en/bn and specialty_id for doctors, and name_en/bn for facilities (FD-061); protected changes stay pending until providers.decide approves; schedule, fee, booking contact, languages and chamber details publish at once with history"
    built_by: U17
  - name: directory.setProfileState
    kind: internal
    input: "{targetKind: doctor | facility | branch, targetId, event: hide | restore}"
    caller: moderation.decide, moderation.restore
    built_by: U33 (in modules/directory)
  - name: directory.deidentify
    kind: internal (deletion step, web tier)
    input: "{accountId}"
    behaviour: "sets submitted_by_account_id, claimant_account_id and proposed_by_account_id to NULL (columns made nullable, Q7); clears doctors and facilities claimed_by_account_id, so the claim ends and the profile shows as unclaimed; the claim row stays as de-identified history (Q21, FD-078); staff views read Deleted account"
    built_by: U17 (with its migration)
ports_declared:
  - name: ProviderExperience
    methods:
      - "forDoctor({doctorId, condition?, outcome?, relationship?, docs?}): Promise<{cards: ExperienceCardVM[], sentiment: Distribution, outcome: Distribution, documentCount, total}>"
      - "forBranch({branchId}): Promise<{cards: ExperienceCardVM[], criteria: CriteriaDistribution, total}>"
    notes: "facility feedback never enters a doctor's figures (FR26)"
    implemented_by: Review, built by U14 in modules/review (FD-067)
  - name: ProfileMergeParticipant
    methods:
      - "transfer(tx, {kind: doctor | facility, sourceId, targetId}): Promise<{reviews: int, drafts: int}>"
      - "unblockDrafts(tx, {submissionId, resolvedDoctorId?}): Promise<{unblocked: int}>"
    implemented_by: Review, built by U17 in modules/review (FD-067; U17's owned paths change accordingly)
```

Release-1 addition (FD-100, FD-105, Q28):

```yaml
contract: C7 Directory, release 1
operations:
  - name: directory.addMemberDoctor
    kind: internal (runs in the caller's transaction)
    input: "AddMemberDoctorInput {name, specialtyId?, practiceArea?, bmdcNumber?}"
    result: "{doctorId, reused: boolean}"
    rules:
      - "reuse a published doctor whose name matches after trimming, lowercasing, collapsing spaces and removing a Dr./Prof./ডাঃ/ডা. title, with at least three letters left, when the specialties agree or one is blank; otherwise create the doctor published with community provenance and a pending profile_submissions row (FD-100)"
      - "the name is stored as typed, not translated (FD-024); bmdcNumber stays in the submission payload only and is never returned or shown"
      - "DoctorCardVM and DoctorProfileVM carry memberAddedNotConfirmed, derived from a pending profile_submissions.created_doctor_id, shown next to Registration not verified"
    errors: [validation]
    requires: "verified, checked by the calling command"
    audit: "directory:<doctorId> action memberAdded (only when created)"
    outbox: "doctor.changed {id} (only when created)"
    caller: "review.publish (U47), so the doctor, the submission and the review commit or fail together; it replaces the demo createQuickReviewWithNewDoctor"
    built_by: U46
```

### C8 — Evidence

**Release:** release 1 for `evidence.intake`, `getForAuthor`, `remove` by the owner and the `evidence.process` job (validate and scan only), provider U48. Consumers: U47 (mounts the evidence components and `server/actions/evidence.ts` with their current props), U41 (origin check and limit tests on the upload route). Added for release 1: `countPublicEvidence` (C17). The release-1 amendments follow the block. Deferred to release 2 (FD-105), with U25, U28, U29, U36 and U39: `applyRedaction`, `confirmPrivacy`, `getPublic`, `readOriginal`, `remove` by a moderator, `listForStaff`, `evidence.publish`, `evidence.presenceForReview`, and the sanitise and preview steps of the job.

```yaml
contract: C8 Evidence
provider_component: Evidence
mechanism: in-process commands and queries; evidence.process job
schema_source: packages/contracts/src/schemas/evidence.ts, src/view-models/evidence.ts, src/view-models/quarantine.ts
operations:
  - name: evidence.intake
    kind: command (called by POST /api/evidence/upload)
    input: "stream + IntakeEvidenceInput {reviewDraftId, group, declaredMime, declaredName, bytes, idempotencyKey}"
    result: "{itemId, state: quarantined}"
    errors: [evidence.too_many, evidence.too_large, evidence.total_too_large, evidence.type_rejected]
    requires: verified
    outbox: evidence.received
    built_by: U23
  - name: "evidence.applyRedaction | confirmPrivacy | remove | getForAuthor | listForStaff | getPublic | readOriginal"
    kind: commands and queries as 03 §4 "evidence"
    built_by: "U25 (applyRedaction, confirmPrivacy, getPublic, readOriginal); U23 (getForAuthor, remove by owner); U25 (remove by moderator, removeFile); listForStaff by U36 against U29's custody"
  - name: evidence.publish
    kind: internal
    input: "{reviewId, itemIds}"
    caller: review.publish
    built_by: U25
  - name: evidence.presenceForReview
    kind: query (internal)
    input: "{reviewId}"
    result: "{groups: EvidenceGroup[]}"
    notes: "published items only; implements Search's EvidencePresence port (Q14)"
    built_by: U25
jobs:
  - name: evidence.process
    runs_in: worker
    payload: "{eventId, name, payload: {itemId}}"
    behaviour: "validate, scan (fail closed), sanitise, preview_ready; retryLimit 3, 120 s per item; appends evidence.stateChanged; worker-started notices are in-app only (FD-070)"
    built_by: U24
ports_implemented: "Retention.RetentionSubject (evidence, built by U29); Administration.OperationalCounts (evidence metrics, built by U37/U35); Search.EvidencePresence (U25)"
```

Release-1 amendments (FD-105):

```yaml
contract: C8 Evidence, release 1
operations:
  - name: evidence.intake
    input: "stream + IntakeEvidenceInput {reviewId, group, declaredMime, declaredName, bytes, idempotencyKey}"
    changes: "takes the internal reviewId: the upload route (C14) resolves the form's reviewPublicId once through Review.reviewIdForPublicId (C9) and passes reviewId in; attaches to the author's own published review, not to a draft; authorship is checked with Review.isReviewAuthor(reviewId, actor) in the same transaction (C9); a review the actor did not write answers not_found; JPEG and PNG only (FD-036); limits from packages/domain/src/evidence/limits.ts (C18)"
    errors: [evidence.too_many, evidence.too_large, evidence.total_too_large, evidence.type_rejected, not_found]
    built_by: U48
  - name: "evidence.getForAuthor | evidence.remove (owner)"
    notes: "the author sees each item's state and, for a rejected or failed item, its reason, with Remove; nothing else shows it (FR66)"
    built_by: U48
  - name: evidence.countPublicEvidence
    kind: query (implements C17)
    built_by: U48
jobs:
  - name: evidence.process
    behaviour: "validate (extension, MIME, magic bytes, size, decode), then scan through scanner-clamd; fails closed: scanner unavailable leaves the item where it is and the job retries; when the retries run out with the scanner still down, the item ends failed with fail_reason scan_unavailable, which its author sees as Could not be checked — try again later (an i18n key in both languages) and which is never public or counted; infected goes to rejected with a reason; the pipeline ends after a clean scan in the state U48's Functional Design names from EVIDENCE_STATES; appends evidence.stateChanged; no notification (FD-070 in-app part deferred); retryLimit 3, 120 s per item"
    built_by: U48
public_display: "only the note Documents attached — not medically validated and the count from C17; no file, preview or processed copy is served publicly, and no route serves an original (FR65)"
```

### C9 — Review

**Release:** release 1, providers U47 (drafts, publish, projection, the experience page and index) and U22 (`review.correct` and the history query); U46 builds the read-side stub (the distribution queries, `listExperienceCards`, and the `ProviderExperience` and `ConditionStats` implementations). Consumers: U20 (`listExperienceCards`), U22 (extends the module), U46 (through its ports), U48 (`isReviewAuthor`), U49 (`isReviewPublished`). Added for release 1: `reviewIdForPublicId`, `isReviewAuthor`, `isReviewPublished` and `review.getHistory`, specified after the block. Deferred to release 2 (FD-105): `addFollowUp`, `delete`, `restore`, `setState`, `redact`, `facilityReview.setState`, `deletionStep`, the `DiscussionPresence` port, the `repeatEpisode` flag (U47 stores nothing for it), and the `ProfileMergeParticipant`, `RevealTarget`, `RetentionSubject` and `OperationalCounts` implementations.

```yaml
contract: C9 Review
provider_component: Review
mechanism: in-process commands, queries; DiscussionPresence port
schema_source: packages/contracts/src/schemas/review.ts, src/view-models/experience.ts, src/view-models/composer.ts
operations:
  - name: "review.saveDraft | getDraft | preview | getExperience | listExperiences | forDoctor | forBranch | forCondition | sentimentDistribution | outcomeDistribution | criteriaDistribution"
    kind: commands and queries as 03 §4 "review"
    built_by: U21 (U14 owns the distribution queries and policies it created; U21 extends them)
  - name: review.publish
    kind: command
    input: "PublishReviewInput {draftId, identityMode, attestation: true}"
    result: "{publicId}"
    errors: [review.min_fields, review.attestation_required, rate_limited, conflict]
    requires: verified + notRestricted, 5/day
    audit: "review:<id>"
    outbox: "review.published {reviewId, doctorId, branchId?, repeatEpisode: boolean}"
    changes: "repeatEpisode is true when the same account already has a published review of the same doctor that shares a condition tag and the same treatment period; the review still publishes (AC6.1.4); the payload never names the earlier review (Q19, FD-080); the exact matching rule is U21's Functional Design"
    built_by: U21
  - name: "review.addFollowUp | correct | delete | restore"
    kind: commands as 03 §4
    notes: "delete and restore are the author's own: they queue no email and create no notice (Q20, FD-087); delete of a held review behaves as unheld for the author (Q9)"
    outbox: "review.changed, review.deleted, review.restored"
    built_by: U22
  - name: review.setState
    kind: internal
    input: "{reviewId, event: hideThreshold | hideCritical | hide | restore | remove}"
    callers: "report.file (U32), moderation.decide, moderation.restore, appeal.decide (U33)"
    outbox: "review.hidden, review.restored"
    changes: "queues no email (Q20, FD-087); the deciding moderation command queues the one email"
    built_by: U22 (U32 extends the threshold events)
  - name: review.redact
    kind: internal
    input: "{reviewId, replacements: [{from, to}], reason}"
    errors: [moderation.narrative_locked]
    built_by: U22
  - name: facilityReview.setState
    kind: internal
    input: "{facilityReviewId, event}"
    built_by: U32
  - name: review.deletionStep
    kind: internal (deletion step)
    input: "{accountId, keepHeld: true}"
    behaviour: "web tier: delete the account's drafts and its facility reviews (tombstone if discussion), skipping held rows (Q16); worker: tombstone if discussion else soft delete each review, skipping held rows"
    built_by: U22 (commands), wired by U39 in modules/review/deletion-participant.ts
ports_declared:
  - name: DiscussionPresence
    methods: ["hasDiscussion(tx, reviewId): Promise<boolean>"]
    implemented_by: Community, built by U30 in modules/community
ports_implemented: "Directory.ProviderExperience and ProfileMergeParticipant, Taxonomy.ConditionStats, Retention.RetentionSubject (built by U29), Identity.RevealTarget, Administration.OperationalCounts"
```

Release-1 additions and amendments (FD-105, Q24, Q25):

```yaml
contract: C9 Review, release 1
review_ids: "two ids, never mixed: reviewPublicId is the only id the browser, pages, slots, route handlers and server actions see; reviewId (internal uuid) is the only id module-to-module seams take. A boundary that receives reviewPublicId resolves it once through reviewIdForPublicId and passes reviewId inward; a null result is answered as not_found"
operations:
  - name: reviewIdForPublicId
    kind: query (internal, modules/review/queries/review-id-for-public-id.ts)
    input: "(read context, {publicId})"
    result: "reviewId | null"
    rules: "null for an unknown publicId; it says nothing about state or author (callers then ask isReviewPublished or isReviewAuthor); never an error"
    callers: "U47 (experience page, edit link); U48 (upload route, EvidenceSection); U49 (comment.post, community.thread); U22 (ReviewHistory, review.correct)"
    built_by: U47
  - name: review.publish
    changes: "refuses an account without a confirmed email in the application layer (requires verified); persona from identity.personaFor (C4); a new doctor through directory.addMemberDoctor in the same transaction (C7); no evidence step (U48 attaches afterwards); outbox review.published {reviewId, doctorId, branchId?} without repeatEpisode, which returns as an additive field in release 2; limit from the C18 constant"
    built_by: U47
  - name: isReviewAuthor
    kind: query (internal, modules/review/queries/is-review-author.ts)
    input: "(read context, {reviewId, actor: Actor})"
    result: boolean
    rules: "true only for an actor of kind account whose account owns the review's author_persona_id, checked through U11's PrivateIdentityRepository (persona_links is Identity's; the review module never reads it directly; see Open questions); false for an anonymous actor and for an unknown id; an account with a staffRole is judged like any account (no staff bypass); never an error, so it reveals nothing about other reviews; runs in the caller's transaction or read connection"
    callers: [U47 (edit link on the experience page), U22 (review.correct), U48 (evidence.intake)]
    built_by: U47
  - name: isReviewPublished
    kind: query (internal, modules/review/queries/is-review-published.ts)
    input: "(read context, {reviewId})"
    result: boolean
    rules: "true only when the review is in the published state; false for an unknown id; never an error"
    callers: [U49 (comment.post)]
    built_by: U47
  - name: review.correct
    changes: "release 1 is FR69 only: a presentation edit sets editedAt; a material change to diagnosis, treatment or outcome adds a dated correction with the original still readable; every saved version is kept; authorship through isReviewAuthor; queues no email (FD-105); outbox review.changed {reviewId, doctorId, branchId?}"
    built_by: U22
  - name: review.getHistory
    kind: query (modules/review/queries/get-history.ts)
    input: "{reviewPublicId}, resolved once through reviewIdForPublicId; null answers not_found"
    result: "{editedAt?, corrections: [{at, field}], versions: [{version, at}]} (versions for the author only)"
    caller: "<ReviewHistory> slot (C16)"
    built_by: U22
```

### C10 — Community

**Release:** release 1 for `comment.post` (narrowed), `comment.delete` by the author and `community.thread`, provider U49; the consumer is U49's own `<CommentThread>` slot (C16). The release-1 amendments follow the block. Deferred to release 2 (FD-105): mentions, `comment.edit`, `block.set`, `block.unset`, `community.reactionsOf`, `reaction.set`, `comment.setState`, `community.deletionStep`, the `ModerationSignals` port and the `DiscussionPresence` implementation.

```yaml
contract: C10 Community
provider_component: Community
mechanism: in-process commands and queries; ModerationSignals port
schema_source: packages/contracts/src/schemas/community.ts, src/view-models/thread.ts
operations:
  - name: comment.post
    kind: command
    input: PostCommentInput {reviewId, parentId?, body}
    result: "{publicId}"
    errors: [community.reply_depth, community.blocked, community.mention_anonymous, rate_limited]
    requires: verified + notRestricted + not blocked by the review author, 30/hour
    outbox: "comment.posted {commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds: [], replyToAccountId?}"
    notes: "recipient ids are resolved in the web tier through identity.accountsOf and filtered for self and blocks before they enter the payload; the same command queues the discussion email for each recipient through notification.queueEmail (FD-075)"
    built_by: U30
  - name: "comment.edit | comment.delete | block.set | block.unset | community.thread | community.reactionsOf"
    kind: commands and queries as 03 §4
    outbox: comment.changed (no notice is routed from it)
    built_by: U30
  - name: reaction.set
    kind: command
    input: "SetReactionInput {targetKind: review | facility_review | comment, targetId, value: like | dislike | null}"
    notes: "comments take Like and Dislike (FD-062); idempotent upsert; never changes summaries, ranking or moderation"
    built_by: U30
  - name: comment.setState
    kind: internal
    input: "{commentId, event: hideThreshold | hideCritical | hide | restore | remove | purge}"
    callers: report.file (U32), moderation.decide and moderation.restore (U33)
    built_by: U30 (U32 extends the threshold events)
  - name: community.deletionStep
    kind: internal (deletion step)
    input: "{accountId}"
    behaviour: "web tier: delete the account's reactions; worker: tombstone the account's comments, skipping held ones"
    built_by: U30 (commands), wired by U39
ports_declared:
  - name: ModerationSignals
    methods: ["dangerousFlags(commentIds: string[]): Promise<Set<string>>"]
    notes: "a comment is flagged when it has an open case with reason dangerous"
    implemented_by: Moderation, built by U32 in modules/moderation
ports_implemented: "Review.DiscussionPresence, Identity.RevealTarget (comment), Retention.RetentionSubject (built by U29)"
```

Release-1 amendments (FD-105, Q24):

```yaml
contract: C10 Community, release 1
operations:
  - name: comment.post
    input: "PostCommentInput {reviewPublicId, parentId?, body}; supersedes the reviewId field of the block above for release 1"
    changes: "resolves reviewPublicId once through Review.reviewIdForPublicId (C9), then works with reviewId only; plain text; one reply level; the review must be published, checked with Review.isReviewPublished(reviewId) (C9), else not_found (also for an unknown publicId); persona from identity.personaFor (C4) with the review's reviewId; no mentions, no blocks, no discussion email; limit from the C18 constant on T-101's RateLimiter; outbox comment.posted {commentId, reviewId} only, the recipient fields return additively in release 2 with T-405"
    errors: [community.reply_depth, rate_limited, not_found]
    requires: verified (confirmed email) + account status active
    built_by: U49
  - name: comment.delete
    kind: command (author only)
    behaviour: "a comment with replies becomes a Comment deleted placeholder; one without replies is removed (FR72)"
    built_by: U49
  - name: community.thread
    kind: query
    input: "{reviewPublicId}, resolved once through Review.reviewIdForPublicId (C9); an unknown or unpublished review gives an empty thread with no form"
    result: "ThreadVM: comments with persona projections only, never an account id or an internal reviewId"
    caller: "<CommentThread> slot (C16)"
    built_by: U49
```

### C11 — Moderation

**Release:** deferred to release 2 (FD-105), with U32 and U33. Release 1 has no reports, cases, hides or appeals, which is why it is not for unrestricted public launch.

```yaml
contract: C11 Moderation
provider_component: Moderation
mechanism: in-process commands and queries; moderation.openRepetitionCase job
schema_source: packages/contracts/src/schemas/moderation.ts, src/view-models/queue.ts, src/view-models/case-tray.ts
operations:
  - name: report.file
    kind: command
    input: FileReportInput {targetKind, targetId, reason, detail, evidenceNote?}
    result: "{}"
    errors: [moderation.duplicate_report, rate_limited]
    requires: verified, 20/day
    audit: "case:<code> action report, actor reporter:restricted"
    outbox: "report.filed {caseCode, caseOpened: boolean, hidden: boolean, affectedAccountId?}"
    behaviour: "opens or updates the case; critical reason hides at once (lane critical); otherwise hides once at fiveAccountHide distinct confirmed reporters unless factual; affected author gets one in-app notice and one moderation email per outcome: Content reported when the case opens, Hidden pending review when it hides (one notice when both happen at once) (FR80, Q20, FD-087); the reporter gets no notice (Q18, FD-086); no notice for a profile target"
    built_by: U32
  - name: "moderation.queue | moderation.case | moderation.myAppealable"
    kind: queries as 03 §4
    notes: "moderation.case reads its timeline through audit.stream (C1); reporter reads restricted, never blank; a repetition case shows only the flag text Possible repetition of an earlier account by the same author, with no link (Q19)"
    built_by: U33
  - name: moderation.decide
    kind: command
    input: DecideCaseInput {caseCode, action, reasonCode, reasonToAuthor, policyVersion, redaction?}
    errors: [moderation.narrative_locked, conflict, auth.step_up_required]
    requires: content.act (restrict, suspend, ban need admin+; stepUp for remove, suspend, ban)
    audit: "case:<code>"
    outbox: "case.decided {caseCode, action, affectedAccountId?}"
    behaviour: "applies the public effect through the owner's internal command (review.setState, facilityReview.setState, comment.setState, evidence.remove, directory.setProfileState, review.redact, account.applyEnforcement) and queues exactly one moderation email to the affected author for every target kind (Q20, FD-087)"
    built_by: U33
  - name: moderation.restore
    kind: command
    input: RestoreCaseInput {caseCode, reasonCode}
    outbox: "case.decided {caseCode, action: restore, affectedAccountId?}"
    notes: "one email, one in-app notice"
    built_by: U33
  - name: "appeal.file | appeal.decide"
    kind: commands as 03 §4
    outbox: "appeal.filed {caseCode} (staff); appeal.decided {caseCode, status, appellantAccountId}"
    notes: "an appeal that restores content sends one email and one notice, from appeal.decide; the setState it runs sends none (Q20)"
    built_by: U33
  - name: "moderation.bulkPreview | moderation.bulkApply | moderation.revealReporter"
    kind: as 03 §4 (revealReporter goes through identity.reveal)
    built_by: U33
  - name: moderation.deidentify
    kind: internal (deletion step, web tier)
    input: "{accountId}"
    behaviour: "sets reports.reporter_account_id and appeals.appellant_account_id to NULL (columns made nullable, Q7, FD-078); the reporter still reads restricted; the unique index on reports keeps working because NULLs do not collide"
    built_by: U33 (with its migration)
jobs:
  - name: moderation.openRepetitionCase
    runs_in: worker
    trigger: review.published with repeatEpisode true (other review.published events are a no-op)
    payload: "{eventId, name, payload: {reviewId, doctorId, repeatEpisode}}"
    singleton_key: "repetition:<reviewId>"
    behaviour: "opens a standard-lane case with origin repeat_episode on the review, report_count 0, no hide; audit case:<code> action repetitionFlag actor system; staff notice newReport with key notif.staff.repetition; the author is not told (Q10, FD-080)"
    worker_grants: "new, in U32's migration: SELECT, INSERT, UPDATE on moderation_cases; USAGE on moderation_case_seq; nothing on reports or appeals"
    schema: "moderation_cases.origin enum report | repeat_episode, default report (U32 Functional Design)"
    built_by: U32
ports_implemented: "Community.ModerationSignals, Identity.RevealTarget (report → restricted account), Administration.OperationalCounts"
```

### C12 — Search

**Release:** deferred to release 2 (FD-105), with U18 and U19. Release 1 has no search page and no search box; the home shows browse entry points.

```yaml
contract: C12 Search
provider_component: Search
mechanism: in-process queries; search.refresh job; EvidencePresence port
schema_source: packages/contracts/src/schemas/search.ts, src/view-models/search.ts
operations:
  - name: search.query
    kind: query
    input: "SearchQueryInput {q, tab, sort: relevance | volume | recent, filters, page}"
    result: "{results, resolvedNote?, keepOriginalUrl}"
    notes: "no sentiment, outcome, evidence or reaction boost; hasEvidence and evidenceGroup filters read search_documents.evidence_groups, labelled document presence only"
    built_by: U18
  - name: search.suggest
    kind: query
    input: "{q}"
    result: "[{kind, publicId, title}] (<= 8)"
    built_by: U18
  - name: search.removeAccountContent
    kind: internal (deletion step, worker)
    input: "{reviewIds}"
    built_by: U39 (in modules/search)
jobs:
  - name: search.refresh
    runs_in: worker
    payload: "{eventId, name, payload: {kind, refId}}"
    triggers: "doctor.changed, facility.changed, term.changed, review.published, review.changed, review.hidden, review.restored, review.deleted, evidence.stateChanged (Q14)"
    behaviour: "rebuilds one document from the owner's published projection; review documents get evidence_groups from EvidencePresence; doctor documents get has_documents"
    built_by: U18
schema_change: "search_documents gains evidence_groups evidence_group[] not null default '{}' and has_documents boolean not null default false (Q14, FD-084), migration in U18"
ports_declared:
  - name: EvidencePresence
    methods: ["forReview(reviewId): Promise<{groups: EvidenceGroup[]}>"]
    notes: "U18 wires a no-evidence default until U25 provides the Evidence implementation (the pattern U8 uses for ConfigProvider)"
    implemented_by: Evidence, built by U25
```

### C13 — DataRequests

**Release:** deferred to release 2 (FD-105), with U39. Release 1 has no account export and no account deletion.

```yaml
contract: C13 DataRequests
provider_component: DataRequests
mechanism: in-process commands and queries; data.export and data.delete jobs
schema_source: packages/contracts/src/schemas/data-requests.ts, src/view-models/workspace.ts
operations:
  - name: dataRequest.export
    kind: command
    input: "{idempotencyKey}"
    result: "{requestId}"
    errors: [conflict]
    requires: account
    outbox: "dataRequest.created {requestId, kind: export}"
    notes: "no export-ready email; the in-app notice and the data-request panel show it (Q11, FD-081)"
    built_by: U39
  - name: dataRequest.delete
    kind: command
    input: "{idempotencyKey, password}"
    result: "{requestId, plan}"
    errors: [conflict, auth.step_up_required]
    requires: account + stepUp
    audit: "account:<id>"
    outbox: "dataRequest.created {requestId, kind: delete}"
    behaviour: "plans with retention.activeHoldsFor; in one transaction runs the web steps (Q16, FD-077): account (account.deleteAccountStep), identity (identity.deidentify with the held personas kept), directory (directory.deidentify), moderation (moderation.deidentify), review drafts and facility reviews, reactions; queues the deletion email; records each step result in the plan; if any web step fails the whole transaction rolls back and nothing is deleted"
    built_by: U39
  - name: dataRequest.status
    kind: query
    built_by: U39
jobs:
  - name: data.export
    runs_in: worker
    behaviour: "builds the zip from the owners' for-export queries (derivatives only); status ready; appends dataRequest.ready (in-app only)"
    built_by: U39
  - name: data.delete
    runs_in: worker
    behaviour: "runs the steps the worker's grants cover: evidence files (originals now, derivatives with the review, held items kept), notifications and email_deliveries, search documents, review and comment tombstones; each step idempotent and recorded; retried; appends dataRequest.completed"
    built_by: U39
worker_import_rule: "the worker imports only the per-module deletion-step internals (modules/<module>/deletion-participant.ts worker entries), never dataRequest.delete, identity.reveal or Better Auth (01-conventions.md §2, AD-6)"
worker_grants: "no new grants for deletion (Q16); CR-006's FD-050 review judges the existing worker grants against this split and the job list in C15"
```

### C14 — External HTTP API

**Release:** release 1 for `/api/auth/{all}` (U8, merged), `/api/health` (baseline) and `/api/evidence/upload`, which U48 builds (the route does not exist on `main` yet; the demo slice uploads through a server action) and U41 hardens with the origin check and limit tests; consumers: U47's composer and U48's own author components. Deferred to release 2 (FD-105): the preview, artifact and original routes (U25), `/api/search/suggest` (U18), `/api/data-requests/{id}/download` (U39) and `/api/demo/clock` (U29). The release-1 amendment of the upload route follows the block.

```yaml
openapi: 3.1.0
info:
  title: RogiKotha route handlers (/api/*)
  version: demo
  description: Consumed by the browser (public pages, composer, viewer, workspace, staff console). Not a public API (requirements.md, Out of scope). Errors use the AppError body.
components:
  schemas:
    AppError:
      type: object
      required: [code, messageKey, correlationId]
      properties:
        code: { type: string, description: ErrorCode from packages/contracts/src/errors.ts }
        messageKey: { type: string }
        fieldErrors: { type: object, additionalProperties: { type: string } }
        correlationId: { type: string }
        retryAfterSec: { type: integer }
paths:
  /api/auth/{all}:
    description: Better Auth handler (U8). Sign-in refusals map to auth.* codes; the progressive delay answers 429 with retryAfterSec.
  /api/health:
    get:
      description: Baseline (T-008). Scanner is reported, not required.
      responses:
        '200': { description: '{ok, db, queue, mail, scanner}' }
  /api/evidence/upload:
    post:
      description: U23. Streamed multipart; one evidence.intake per file; origin check and byte counter from U41. Verified account.
      responses:
        '200': { description: '[{itemId, state: quarantined}]' }
        '400': { description: AppError evidence.type_rejected | evidence.too_large | evidence.total_too_large | evidence.too_many }
        '401': { description: AppError }
        '403': { description: AppError forbidden }
  /api/evidence/items/{id}/preview/{page}:
    get:
      description: U25. Author-only PNG of a preview_ready item.
      responses:
        '200': { description: image/png, Cache-Control private, no-store }
        '403': { description: AppError forbidden }
        '404': { description: AppError not_found }
  /api/evidence/artifacts/{artifactId}:
    get:
      description: U25. Public artifacts only (public = true); immutable cache headers; download=1 adds Content-Disposition attachment.
      parameters:
        - { name: download, in: query, schema: { type: string, enum: ['1'] } }
      responses:
        '200': { description: image/png or image/jpeg }
        '404': { description: AppError not_found (also for any non-public artifact) }
  /api/evidence/items/{id}/original:
    get:
      description: U25. Staff with evidence.original + stepUp and a stated reason; writes custody original_accessed, an audit row and a staff notice; a refusal is logged.
      parameters:
        - { name: reason, in: query, required: true, schema: { type: string } }
      responses:
        '200': { description: original bytes, Cache-Control no-store }
        '403': { description: AppError forbidden | auth.step_up_required }
  /api/search/suggest:
    get:
      description: U18. At most 8 suggestions; published records only.
      parameters:
        - { name: q, in: query, required: true, schema: { type: string } }
      responses:
        '200': { description: '[{kind, publicId, title}]' }
  /api/data-requests/{id}/download:
    get:
      description: U39. Owner only; export zip while not expired (7 days).
      responses:
        '200': { description: application/zip }
        '404': { description: AppError not_found (also for another account's request) }
  /api/demo/clock:
    get:
      description: U29. Reads demo_clock; only when APP_MODE != production.
      responses:
        '200': { description: '{offsetSeconds, now}' }
        '404': { description: in production mode }
    post:
      description: U29. Sets the offset; staff only in the demo; never in production.
      responses:
        '200': { description: '{offsetSeconds, now}' }
        '404': { description: in production mode }
```

Release-1 amendment (FD-105): `/api/evidence/upload` is built by U48 (not U23). Its multipart form carries `reviewPublicId` (the author's own published review) instead of a draft id; the route resolves it once through `reviewIdForPublicId` (C9) and calls `evidence.intake` with the internal `reviewId`, one call per file. An unknown `reviewPublicId` answers `404`. U41 adds the origin check and refuses an oversized request before the body is read. Answers: `200` `[{itemId, state: quarantined}]`; `400` the four `evidence.*` codes; `401` signed out; `403` unconfirmed account or a failed origin check; `404` a review that is not the actor's own.

### C15 — Outbox events and jobs

**Release:** release 1 for the relay (U4, merged), `mail.send` (U8, merged) and `evidence.process` (U48, validate and scan only). Release-1 publishers keep appending their events in the same transaction as the change (Q24): U8 `account.*` (merged), U46 `doctor.changed` and `term.changed`, U47 `review.published`, U22 `review.changed`, U48 `evidence.received` and `evidence.stateChanged`, U49 `comment.posted`. Every other event and job is deferred to release 2 (FD-105). The release-1 relay map follows the block.

```yaml
asyncapi: 3.0.0
info:
  title: RogiKotha outbox events and worker jobs
  version: demo
  description: >
    Every module appends events through the Outbox port in the same transaction as its change (FD-065).
    outbox.relay (every 2 s) enqueues each event into its jobs in the transaction that sets processed_at (FD-038).
    The relay map (event name to jobs) lives in the worker composition root; each Unit adds or removes only the
    entries for the jobs it builds. Job payload envelope: {eventId, name, payload}; singletonKey <job>:<eventId>
    unless stated. Payloads carry ids, enums, counts and booleans only. Recipient account ids are resolved in the
    web tier and already filtered for self and blocks; a reporter's id never appears (FD-086).
channels:
  account.registered:        { payload: '{accountId}', jobs: [], note: 'verification email queued by the web command (U8 removes the old mail.send route)' }
  account.securityEvent:     { payload: '{accountId, kind: passwordChanged | newSignIn | signOutAll | deviceApproved | existingEmailRegister | severeSignInActivity}', jobs: [notification.deliver], note: 'email queued by the web command' }
  review.published:          { payload: '{reviewId, doctorId, branchId?, repeatEpisode}', jobs: [search.refresh, moderation.openRepetitionCase] }
  review.changed:            { payload: '{reviewId, doctorId, branchId?}', jobs: [search.refresh] }
  review.hidden:             { payload: '{reviewId, doctorId, branchId?}', jobs: [search.refresh], note: 'no notice; the moderation event carries it (FD-087)' }
  review.restored:           { payload: '{reviewId, doctorId, branchId?}', jobs: [search.refresh] }
  review.deleted:            { payload: '{reviewId, doctorId, branchId?}', jobs: [search.refresh] }
  doctor.changed:            { payload: '{id}', jobs: [search.refresh] }
  facility.changed:          { payload: '{id}', jobs: [search.refresh] }
  term.changed:              { payload: '{id}', jobs: [search.refresh] }
  evidence.received:         { payload: '{itemId}', jobs: [evidence.process] }
  evidence.stateChanged:     { payload: '{itemId, reviewId?, state, uploaderAccountId}', jobs: [notification.deliver, search.refresh] }
  comment.posted:            { payload: '{commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds, replyToAccountId?}', jobs: [notification.deliver] }
  comment.changed:           { payload: '{commentId, reviewId}', jobs: [] }
  report.filed:              { payload: '{caseCode, caseOpened, hidden, affectedAccountId?}', jobs: [notification.deliver] }
  case.decided:              { payload: '{caseCode, action, affectedAccountId?}', jobs: [notification.deliver] }
  appeal.filed:              { payload: '{caseCode}', jobs: [notification.deliver] }
  appeal.decided:            { payload: '{caseCode, status, appellantAccountId}', jobs: [notification.deliver] }
  directory.submissionFiled: { payload: '{submissionId}', jobs: [notification.deliver] }
  directory.claimFiled:      { payload: '{claimId}', jobs: [notification.deliver] }
  directory.fieldChangeProposed: { payload: '{changeId, protected}', jobs: [notification.deliver] }
  directory.submissionDecided:   { payload: '{submissionId, decision, recipientAccountId}', jobs: [notification.deliver] }
  directory.claimDecided:        { payload: '{claimId, decision, recipientAccountId}', jobs: [notification.deliver] }
  directory.fieldChangeDecided:  { payload: '{changeId, decision, recipientAccountId}', jobs: [notification.deliver] }
  identity.revealed:         { payload: '{revealId, granted}', jobs: [notification.deliver] }
  config.applied:            { payload: '{version, rolledBackFrom?}', jobs: [], note: 'kept as an event for future consumers (Q13, FD-083)' }
  hold.changed:              { payload: '{holdId, placed}', jobs: [] }
  retention.policyChanged:   { payload: '{version}', jobs: [] }
  dataRequest.created:       { payload: '{requestId, kind}', jobs: ['data.export when kind = export', 'data.delete when kind = delete'], note: 'routed by kind (FD-052)' }
  dataRequest.ready:         { payload: '{requestId, accountId}', jobs: [notification.deliver] }
  dataRequest.completed:     { payload: '{requestId, accountId}', jobs: [notification.deliver] }
jobs:
  outbox.relay:              { schedule: every 2 s, owner: U4 }
  evidence.process:          { owner: U24, retry: '3, 120 s per item' }
  search.refresh:            { owner: U18 }
  notification.deliver:      { owner: U34 }
  mail.send:                 { owner: U8, extended_by: U34, enqueued_by: web tier notification.queueEmail }
  retention.expire:          { schedule: hourly, owner: U29 }
  data.export:               { owner: U39 }
  data.delete:               { owner: U39 }
  moderation.openRepetitionCase: { owner: U32, singleton_key: 'repetition:<reviewId>' }
```

Text fallback: the table above is the whole contract; the YAML adds the payload fields and job owners.

Release-1 relay map (FD-105, Q24). Events not listed are not published in release 1.

```yaml
asyncapi: 3.0.0
info:
  title: RogiKotha outbox events and worker jobs, release 1
  version: release-1
channels:
  account.registered:    { payload: '{accountId}', jobs: [], publisher: U8 (merged) }
  account.securityEvent: { payload: 'as C15', jobs: [], publisher: U8 (merged), note: 'notification.deliver is release 2; the email is queued by the web command' }
  doctor.changed:        { payload: '{id}', jobs: [], publisher: U46 (addMemberDoctor) }
  term.changed:          { payload: '{id}', jobs: [], publisher: U46 (createProvisional) }
  review.published:      { payload: '{reviewId, doctorId, branchId?}', jobs: [], publisher: U47 }
  review.changed:        { payload: '{reviewId, doctorId, branchId?}', jobs: [], publisher: U22 }
  evidence.received:     { payload: '{itemId}', jobs: [evidence.process], publisher: U48 }
  evidence.stateChanged: { payload: '{itemId, reviewId?, state}', jobs: [], publisher: U48, note: 'no account id in release 1; uploaderAccountId returns with T-405 in release 2' }
  comment.posted:        { payload: '{commentId, reviewId}', jobs: [], publisher: U49 }
jobs:
  outbox.relay:    { schedule: every 2 s, owner: U4 (merged) }
  mail.send:       { owner: U8 (merged) }
  evidence.process: { owner: U48, retry: '3, 120 s per item' }
```

Release 2 adds the routes and the payload fields of C15 above; both are additive (new jobs on an existing event, new optional fields), so release-1 rows stay valid.

### C16 — Patient UI composition seams

**Release:** release 1 (new, FD-105). Provider of the page and the three slots: U47; it hands each slot's folder to its owner when it merges. Slot internals: U48 (`<EvidenceSection>`), U49 (`<CommentThread>`), U22 (`<ReviewHistory>` and the edit route). Gate component: U9; consumers U47 (composer) and U49 (comment form).

```yaml
contract: C16 Patient UI composition seams
mechanism: React server components mounted by the experience page; props frozen (Q26)
slots:
  - name: CommentThread
    path: apps/web/src/components/patient/comments/CommentThread.tsx
    props: "{reviewPublicId: string}"
    data: "community.thread (C10); until U49 merges, the demo comments binding with today's behaviour"
    shows: "the medical-advice disclaimer above the thread (FR75), the thread, and the comment form or U9's gate"
    created_by: U47
    internals_owned_by: U49
  - name: EvidenceSection
    path: apps/web/src/components/patient/evidence/EvidenceSection.tsx
    props: "{reviewPublicId: string}"
    data: "reviewIdForPublicId (C9), then PublicEvidenceCount.countPublicEvidence(reviewId) (C17)"
    shows: "Documents attached — not medically validated with the exact count when it is above zero, No documents otherwise; never a file or a preview in release 1"
    created_by: U47
    internals_owned_by: U48
  - name: ReviewHistory
    path: apps/web/src/components/patient/review-history/
    props: "{reviewPublicId: string}"
    data: "review.getHistory (C9); U47's version shows the Edited date only"
    created_by: U47
    internals_owned_by: U22
rules:
  - "each slot is an async server component that loads its own data and reads the locale and the actor itself; the page passes nothing else"
  - "slots only ever see reviewPublicId; a slot that needs a seam taking the internal reviewId (isReviewAuthor, isReviewPublished, countPublicEvidence) resolves it once through reviewIdForPublicId (C9) and renders its empty state when that returns null; no internal reviewId reaches the browser"
  - "a slot never throws into the page: an expected failure renders its own bilingual fallback, so a broken slot leaves the rest of the experience page readable"
  - "the owner changes a slot's internals only; changing its name, path or props is a breaking change under the ownership rules"
  - "no slot returns or renders an account id, an email or an original filename"
edit_link:
  route: "/{locale}/experiences/{publicId}/edit (owned by U22)"
  shown_when: "isReviewAuthor(reviewId, actor) is true (C9), with the reviewId the page resolved once from its publicId; the page does not call getOwnReviewForEdit"
gate:
  path: apps/web/src/components/patient/auth/
  name: "set in U9's Functional Design"
  props: "{purpose: write | comment, returnTo: string}"
  behaviour: "reads the actor itself; a signed-out visitor is asked to sign in, an unconfirmed account to confirm its email; renders nothing for a confirmed account; the application layer refuses anyway (C9 publish, C10 comment.post)"
  provided_by: U9
  consumers: [U47 (composer), U49 (comment form)]
composer_evidence: "U47 mounts the evidence components already on main (EvidenceUploader, AuthorEvidence) with their current props; U48 replaces their internals and keeps the props"
```

### C17 — Public evidence count

**Release:** release 1 (new, FD-105). Declared by U46; interim binding by U46 in `container.ts`; implemented by U48, which swaps the binding. Consumers: U46 (doctor cards and profiles), U47 (`<EvidenceSection>` until U48 owns it, experience cards).

```yaml
contract: C17 PublicEvidenceCount
mechanism: in-process port (packages/application/src/ports/public-evidence-count.ts)
port:
  name: PublicEvidenceCount
  methods:
    - "countPublicEvidence(reviewId: string): Promise<number>"
    - "countPublicEvidenceByReview(reviewIds: readonly string[]): Promise<ReadonlyMap<string, number>> (optional addition, only if U46's Functional Design needs it for profile totals; a review absent from the map counts 0)"
  frozen: "the signature is frozen once U46 merges (Q27)"
  ids: "takes the internal reviewId only; callers holding a reviewPublicId (the EvidenceSection slot) resolve it first through Review.reviewIdForPublicId (C9)"
meaning:
  interim: "today's behaviour: items in DEMO_READY_EVIDENCE_STATES, through countReadyEvidence in packages/database/src/demo/evidence.ts (U48's file, unchanged until U48)"
  release_1: "items that passed the scan, in PUBLIC_EVIDENCE_STATES, an as const list of EvidenceState values in packages/domain/src/evidence/ that U48's Functional Design fills from EVIDENCE_STATES without a new enum value where possible"
rules:
  - "no module other than Evidence reads evidence_items; the directory and review repositories count only through this port"
  - "the number is a count of attached items only, never a quality signal; a review with none renders No documents, never 0"
  - "the count never includes quarantined, failed, rejected or removed items"
binding: "apps/web/src/server/container.ts; U48 replaces the interim binding with Evidence's implementation and deletes countReadyEvidence and DEMO_READY_EVIDENCE_STATE(S) with demo/evidence.ts"
```

### C18 — Constants that stand in for T-105

**Release:** release 1 (new, FD-105). T-105 (U12) and with it C1's configuration commands are deferred. Each reading Unit owns its constant; settings already in the configuration schema are read through U8's defaults-only `ConfigProvider`. Release 2 moves them into T-105; each Unit records its constants as an `S4` row in `ISSUES.md`.

```yaml
contract: C18 Release-1 constants
mechanism: "ConfigProvider.current() (defaults-only, U8) for schema keys; named constants for the rest"
through_config_provider:
  - { key: limitedDataThreshold, value: 5 (placeholder), readers: [U46, U47] }
  - { key: "emergency.*", value: "999, 16263, crisis line, last verified 2026-08-21", readers: [U20, U46] }
  - { key: featureVisibility.facilityAccounts, value: true, readers: [U46] }
  - { key: "signIn.*", value: FD-063 values, readers: [U8 (merged)] }
  - { key: retention.originalDays, value: 90, readers: none, note: not enforced in release 1 }
module_constants:
  - { name: sentiment optional (FR45), owner: U47, where: review domain }
  - { name: "Reviewer's label suggestions (FR47)", owner: U47, where: "as const list in packages/contracts" }
  - { name: provisional term limit, value: "30 per account per hour, per process", key: "taxonomy.createProvisional:account:<accountId>", owner: U46 }
  - { name: review publish and draft-save limits, value: "set in U47's Functional Design", owner: U47 }
  - { name: comment post limit, value: "set in U49's Functional Design", owner: U49 }
  - { name: "evidence limits (FR61)", value: "10 files, 15 MB per file, 100 MB per review", owner: U48, readers: [U48, U41], where: packages/domain/src/evidence/limits.ts }
rules:
  - "limits run on T-101's in-memory RateLimiter (C19) and are per process"
  - "a constant is read in one place per Unit, so release 2 swaps it for a ConfigProvider key without changing callers"
```

### C19 — Platform ports and command helpers from T-101 (baseline)

**Release:** release 1, merged on `main` by U8 T-101. No release-1 Unit changes these signatures; a change is breaking under the ownership rules. Consumers: U9, U11, U46, U47, U48, U49 and U41.

```yaml
contract: C19 T-101 baseline
mechanism: in-process ports (packages/application/src/ports/) and helpers (packages/application/src/command.ts)
provides:
  - name: AuthGateway
    path: ports/auth-gateway.ts
    notes: "Better Auth behind the account commands; only modules/account and server/auth.ts use it; U41 changes only the cookie attributes and trustedOrigins in server/auth.ts"
  - name: Crypto
    path: ports/crypto.ts
    methods: "encrypt, decrypt, decryptText, hash, randomToken, hmac(purpose: email-key | network-key)"
    notes: "two web instances (crypto, mailCrypto), worker mailCrypto only (FD-095)"
  - name: RateLimiter
    path: ports/rate-limiter.ts
    methods: "hit(key, limit, windowSec), reserveFailure(key, windowSec), clear(key)"
    key_shape: "<scope>:<email | net | account>:<subject>; never a raw address or IP"
    consumers: "U46 (provisional terms); U47 (publish, draft save); U49 (comment post)"
  - name: ConfigProvider
    path: ports/config-provider.ts
    methods: "current(): Promise<ConfigValues> (defaults-only until T-105)"
  - name: "defineCommand, defineQuery"
    path: command.ts
    notes: "parse, authorize, load, decide, persist in one UnitOfWork transaction with the audit and outbox rows; libraryFirst: true is only for commands that call the auth library (they hold no connection while it works); release-1 Units write transactional commands"
  - name: CommandPorts
    path: command.ts
    notes: "closed: T-101's set of shared ports (unitOfWork, authGateway, hasher, rateLimiter, config, crypto, mailCrypto, clock, ids, sleeper, jobQueue, outbox, audit, logger, afterResponse, accounts, deliveries, app); no release-1 Unit adds a field to it"
  - name: getActor
    path: apps/web/src/server/auth.ts
    result: "Actor (C5 actor_shape, exactly packages/contracts/src/actor.ts: kind anonymous | account, emailVerified?, status?, staffRole?, capabilities, stepUp?)"
    notes: "the only way web code learns who is asking; slots, pages and server actions call it, never the session directly"
module_wiring:
  pattern: "module factories wired in container.ts"
  rules:
    - "each module (identity, directory, taxonomy, review, evidence, community) defines its own ports interface in modules/<module>/ports.ts, listing its repositories and the cross-module seams it calls, and a factory create<Module>Commands(ports) that returns its commands and queries"
    - "a module's commands are still built with defineCommand and defineQuery; the handler gets T-101's CommandPorts from the call and its own module ports from the factory closure"
    - "apps/web/src/server/container.ts builds each module's repositories and calls its factory; it stays append-only shared: each Unit adds only its own module's block, and U48 also swaps the C17 binding"
    - "no module extends or edits CommandPorts in command.ts, which stays T-101's; a new shared port needs this summary first"
    - "a module reaches another module only through the seams named in this summary (for example review's isReviewAuthor, reviewIdForPublicId), passed into its factory, never by importing the other module's repository"
```

## Contract ownership rules

- **Who owns a spec:** the provider component's owning Unit (column Owner) owns its shared-schema block and the zod schemas and types behind it. A port declared for a cycle break (FD-067) is owned by the declaring component; its implementation is owned by the Unit named in `implemented_by`. Each event's payload is owned by its publisher; the envelope, the relay and the notification routes are owned by U34; the relay itself by U4.
- **Breaking changes:** agreed in this summary before code changes. The changing Unit updates the block, names the affected Units, and changes them in the same Bolt (one repository; with the swarm, FD-094, Units merge one at a time, so a breaking change lands with its consumers or waits until they have merged). A change to a hard rule, a data boundary or a worker grant also needs an FD entry first (project rule). A breaking event change takes a new event name.
- **Additive changes stay safe:** new optional fields, new events, new error codes and new enum values a consumer does not switch on exhaustively. Consumers ignore unknown fields; zod input schemas stay `.strict()` on the provider side only.
- **Seams (FD-105):** a seam's creator owns it until its merge, then the named owner does: the three C16 slots pass from U47 to U48, U49 and U22; the C17 binding passes from U46's interim implementation to U48's. The props and signatures are frozen at the creator's merge, so the level-3 Units can be built in parallel against them.
- **Module wiring (C19):** each module owns its ports interface and command factory; `container.ts` wires them and is append-only shared; `CommandPorts` in `command.ts` is closed and stays T-101's. Changing it, or adding a shared port, is a breaking change agreed here first.
- **Review ids (C9):** browser-facing inputs and slot props carry `reviewPublicId` only; module seams take the internal `reviewId` only; each boundary resolves once through `reviewIdForPublicId`.
- **Deferred contracts:** a contract or operation marked "deferred to release 2 (FD-105)" keeps its text as the release-2 specification. Release 2 resumes it by this summary's ownership rules; nothing in release 1 may implement part of it silently.
- **Worker boundary:** the worker's grants are the list in `02-data-model.md` §16 as reviewed by CR-006, plus FD-080's moderation grant. Any further grant needs this summary and an FD entry first.

## Task-file amendments

These answers change the scope of Units whose task files Units Generation already amended (FD-074). They are written into those task files the same way, before the first affected Unit's Code Generation; Delivery Planning schedules that edit.

| Unit | Change | From |
|---|---|---|
| U5 CR-006 | judge the FD-050 worker grants against C13's deletion split and C15's job list | Q16, FD-077 |
| U8 T-101 | `signIn` setting keys and ranges; delay as a refusal with `retryAfterSec`; severe notice once per window, keys `email.security.severeSignInActivity` / `notif.security.severeSignInActivity`; remove the `account.* → mail.send` relay routes | C5, C15 |
| U12 T-105 | drop the retention block from `ConfigValues` (schema_version 2); `ConfigEventSink` for `config.applied` | Q12, Q13, FD-082, FD-083 |
| U17 T-204 | nullable account columns; clear `claimed_by_account_id`; `ProfileMergeParticipant` implementation in `modules/review`; widened protected fields | Q7, Q21, FD-078, FD-061 |
| U18 T-205 | `evidence_groups` and `has_documents` columns; `EvidencePresence` port with a no-evidence default | Q14, FD-084 |
| U21 T-301 | `repeatEpisode` on `review.published` | Q10, Q19, FD-080 |
| U22 T-302 | `review.setState` queues no email; its FD-075 row moves to T-403 and T-404; the author's own restore sends nothing | Q20, FD-087 |
| U25 T-305 | `evidence.presenceForReview`; route `evidence.stateChanged` to `search.refresh` | Q14 |
| U29 T-309 | `HoldTargetKind` with `account`; held items look deleted to their author; `audit.expire` with held targets | Q8, Q9, FD-079 |
| U30 T-401 | recipient ids filtered for self and blocks in the web tier | C10 |
| U32 T-403 | `moderation.openRepetitionCase` job, `origin` column and worker grant; `report.filed` notices and one email per outcome; no reporter notice | Q10, Q18, Q20, FD-080, FD-086, FD-087 |
| U33 T-404 | one email per outcome for every target kind; nullable reporter and appellant columns; `audit.stream` query | Q7, Q20, FD-078, FD-087 |
| U34 T-405 | routing per C15 (review events route no notice); `queueEmail` signature; `discussion` category; `notification.expire` by `created_at` | C2, C15, Q20 |
| U37 T-408 | Beta metrics as cases open/closed plus report-row total | Q15, FD-085 |
| U39 T-410 | web and worker deletion steps; no export-ready email; account-hold behaviour (open question below) | Q11, Q16, Q17, FD-077, FD-079, FD-081 |

The edge U22 → U34 (T-302 → T-405) was added for FD-075's hide and restore email, which T-302 no longer queues. Delivery Planning may keep it as harmless build order.

## Revision 2026-10-27

The Requirements, Stories, Domain and Units revisions change these contracts as follows. No contract is added or removed.

- **FD-088 (staff side narrowed):** in release 1, C11's `appeal.file`, `appeal.decide`, `moderation.myAppealable`, `moderation.bulkPreview` and `moderation.bulkApply` are not built, and neither are C15's `appeal.filed` and `appeal.decided` events. C3's `retention.previewBulk` and `retention.executeBulk` are not built. C2's `staffNotification.list` and `staffNotification.ack` stay, but no staff triage view calls them; until it exists, the `staffNotificationsUnacked` count only grows. Decision notices (`case.decided`) carry no appeal route. All of these stay specified here for after release 1.
- **FD-090 (two narrow worker grants):** it settles both open questions below. Draft expiry takes their option B (the grant on `review_drafts`), and held deletions take their option A (the `SECURITY DEFINER` persona-link function). Under an account hold, the account closes at once while its data is kept.
- **FD-091 (patient redesign) and U45 T-011:** presentation only. U45 has no runtime contract; its edges to the eleven patient UI Units are build order, like the other UI edges. C14 is unchanged.

## Revision 2026-11-04 (FD-105)

The Units revision for FD-105 changes these contracts as follows (answers Q23–Q28).

| Contract | Release | Release-1 provider | Release-1 consumers |
|---|---|---|---|
| C1 Administration | deferred to release 2 (FD-105); baseline `AuditWriter` and defaults-only `ConfigProvider` stay in use | baseline, U8 (merged) | every release-1 command (audit); U20, U46, U47 (C18) |
| C2 Notification | deferred to release 2 (FD-105); U8's essential email and `mail.send` stay | U8 (merged) | U9 |
| C3 Retention | deferred to release 2 (FD-105) | — | — |
| C4 Identity | release 1 (reveal, deidentify, accountsOf, personasOf and both ports deferred) | U11 | U47, U49 |
| C5 Account | release 1 for the account operations and `Actor` (staff access, stepUp and the internal steps deferred) | U8 (merged) | U9, U11, U47, U48, U49 |
| C6 Taxonomy | release 1 (`mapProvisional` deferred) | U46 | U20, U47 |
| C7 Directory | release 1 for the queries, `ProviderExperience` and `addMemberDoctor` (submissions, claims, field changes, merge, de-identify deferred) | U46 | U20, U47 |
| C8 Evidence | release 1 for intake, the author's list and removal, `evidence.process` to a clean scan, `countPublicEvidence` (redaction, publication, viewer, staff access deferred) | U48 | U47, U41; U46 and U47 through C17 |
| C9 Review | release 1 for drafts, publish, projection, aggregates, `correct`, history, `reviewIdForPublicId`, `isReviewAuthor`, `isReviewPublished` (follow-ups, delete, restore, setState, redact, deletion step deferred) | U47, U22; U46 (read-side stub) | U20, U22, U46, U48, U49 |
| C10 Community | release 1 for `comment.post`, the author's `comment.delete`, `community.thread` (mentions, edit, reactions, blocks, setState, deletion step deferred) | U49 | U49's slot (C16) |
| C11 Moderation | deferred to release 2 (FD-105) | — | — |
| C12 Search | deferred to release 2 (FD-105) | — | — |
| C13 DataRequests | deferred to release 2 (FD-105) | — | — |
| C14 External HTTP API | release 1 for `/api/auth/{all}`, `/api/health`, `/api/evidence/upload` (five routes deferred) | U8 (merged), baseline, U48 | browser; U47, U48, U41 |
| C15 Outbox events and jobs | release 1 for the relay, `mail.send`, `evidence.process` and the nine events of the release-1 relay map (other events, jobs and routes deferred) | U4, U8 (merged), U46, U47, U22, U48, U49 | worker |
| C16 Patient UI composition seams | release 1 (new) | U47; slot internals U48, U49, U22; gate U9 | U47, U49 |
| C17 Public evidence count | release 1 (new) | U46 (port, interim), U48 (implementation) | U46, U47 |
| C18 Constants that stand in for T-105 | release 1 (new) | U8 (merged) and each reading Unit | U20, U41, U46, U47, U48, U49 |
| C19 T-101 baseline | release 1 (new entry for merged work) | U8 (merged) | U9, U11, U41, U46, U47, U48, U49 |

Counts: 19 contracts. 6 are deferred to release 2 as whole contracts (C1, C2, C3, C11, C12, C13); of those, C1 and C2 keep in use only parts the baseline or U8 already merged, and no release-1 Unit builds anything in them. 9 contracts are release 1 with deferred operations kept in their text (C4–C10, C14, C15); 4 are new (C16–C19).

- **Task-file amendments:** the rows of the 2026-10-27 table for deferred Units (U12, U17, U18, U25, U29, U32, U33, U34, U37, U39) apply in release 2. The rows for U21 and U30 now apply to U47 and U49 only where the operation is release 1: U21's `repeatEpisode` row is deferred (U47 stores nothing for it), and U30's recipient-filter row is deferred with the recipient fields. U22's row stands (it queues no email). The `## Amendments — release 1 (FD-105)` section each active Unit writes at Code Generation (`unit-of-work.md`) cites the contract changes above.
- **No breaking change to merged code:** C5, C14's auth route, C15's `account.*` events and C19 are exactly what U8 merged.

## Open questions

Both questions below were settled on 2026-10-27 (FD-090, Delivery Planning Q5 and Q6). They are kept as the record of what was asked. The rows after them are the open points of the 2026-11-04 revision.

| Contract | Question | Blocks |
|---|---|---|
| C13, C3 | Deletion work that waits on a legal hold (an account hold, Q8; the persona link of a held post, Q17) must run when the hold ends. Holds end by `hold.release` (web) or by `expires_at` passing (noticed by the worker's hourly job), and the identity step can only run in the web tier (Q16). Options: A. a `SECURITY DEFINER` function that deletes given persona links without letting the worker read them, granted to `rk_worker` (suggested: the narrow pattern `fn_expire_audit` already uses); B. resume only from the web, when staff release a hold, and give holds no automatic end during a pending deletion; C. treat the kept link as part of the held record and delete it with that record's own deletion. Also: under an account hold, does the account still close at once (sessions revoked, sign-in refused, data kept)? Suggested: yes. | U39 T-410, U29 T-309 |
| C9, C3 | Draft expiry: drafts expire after 30 days and `draft.expiring` warns 4 days before (T-405 routing), but the worker has no grant on `review_drafts`. Options: A. treat expired drafts as gone at read time, purge them in the web tier, and drop the warning; B. a narrow worker grant (`SELECT (id, account_id, expires_at)`, `DELETE`) on `review_drafts` with an FD entry. Suggested: B, since drafts are encrypted at rest and the warning is in the routing table. | U21 T-301, U29 T-309 |
| C9, C4 | `isReviewAuthor` needs the private link from `author_persona_id` to the account, which is Identity's (`persona_links`). T-104 decides where `PrivateIdentityRepository` is injected. Suggested: U11 adds one narrow private query, `ownsPersona(accountId, personaId): boolean`, and injects it into the review module for this check only; the review module never reads `persona_links` itself. U11's Functional Design confirms the method; U47 builds against it. | U47 (and through it U22, U48) |
| C16 | The gate component's exported name is not fixed (`unit-of-work.md` names only the gate sheet and callout). Its props `{purpose, returnTo}` are frozen here; U9's Functional Design names it before U47 and U49 start Code Generation. | U47, U49 |
| C17 | Which `EVIDENCE_STATES` value ends the release-1 pipeline (and so fills `PUBLIC_EVIDENCE_STATES`) is U48's Functional Design. The interim binding counts today's `DEMO_READY_EVIDENCE_STATES`, which include `preview_ready`; if U48 picks another value, the seed's ready items move with it in `seed-evidence.ts`. | U48 |
