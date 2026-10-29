# Entities — U29 `t-309-retention-holds-custody`

Source of truth for the data shape this Unit writes and reads. Built from T-309, `02-data-model.md` §0, §6–§10, §12, §15, §16, `components.md` (Retention, Evidence), `contract-summary.md` (C1, C2, C3, C8, C15), the schema on `main` (`packages/database/src/schema/{retention,demo,evidence,audit,enums}.ts`, `migrations/0003_triggers.sql`, `0005_grants_part2.sql`), the U22, U24 and U25 drafts and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds **one enum, two tables, one column, one index, three functions and four triggers** (migrations M1–M4, `functional-spec.md` § 8.1) and changes one trigger function and the worker's grants. Entities owned by another component are listed because this Unit's job or commands cross them; the owner is named on each.

```yaml
entities:
  - name: LegalHold
    owner: Retention
    description: "One individual legal hold on one record (FD-021, FD-079); table legal_holds"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "primary key" }
      - { name: target_kind, type: enum, required: true, allowed_values: [review, facility_review, comment, evidence, profile, account], constraints: "new DB enum hold_target_kind (M1); the report target_kind enum is unchanged" }
      - { name: target_id, type: uuid, required: true, constraints: "internal id of the record; no foreign key (six tables); existence checked under lock by the kind's subject (BR2.4)" }
      - { name: reason, type: text, required: true, constraints: "10-1000 characters; never copied into audit or outbox; shown only to holds.manage (BR7.3)" }
      - { name: placed_by_account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "the staff actor" }
      - { name: placed_at, type: timestamp, required: true, constraints: "Clock now" }
      - { name: expires_at, type: timestamp, required: false, constraints: "> placed_at, <= placed_at + 3650 days; always null for account holds (BR2.3)" }
      - { name: released_at, type: timestamp, required: false, constraints: "set once by hold.release (now) or by hold.place ending an expired hold (= expires_at)" }
      - { name: released_by, type: uuid, required: false, references: AccountProfile.id, constraints: "the releasing staff account; null when the hold ended by expiry" }
      - { name: release_reason, type: text, required: false, constraints: "new column (M1); 10-1000 characters when released by staff" }
      - { name: created_at, type: timestamp, required: true }
    relationships:
      - { type: one-to-one, target: LegalHoldExpiry, description: "recorded once when it expires unreleased" }
      - { type: one-to-many, target: RetentionDeferredDeletion, description: "deletions deferred while it was active" }
    invariants:
      - "At most one row per (target_kind, target_id) with released_at null (partial unique index legal_holds_open_target_unique)"
      - "Never deleted; only released_at, released_by and release_reason may be set, once (fn_guard_legal_hold, BR2.11)"
      - "Active = released_at null and (expires_at null or expires_at > now) (BR2.8)"

  - name: LegalHoldExpiry
    owner: Retention
    description: "Insert-only record that the job saw an unreleased hold expire (new table legal_hold_expiries, M4; Question 3)"
    attributes:
      - { name: hold_id, type: uuid, required: true, references: LegalHold.id, constraints: "primary key; INSERT ... ON CONFLICT DO NOTHING gives exactly-once" }
      - { name: recorded_at, type: timestamp, required: true }
    invariants:
      - "Append-only (UPDATE and DELETE raise)"
      - "rk_worker: SELECT, INSERT; rk_app: SELECT, INSERT"

  - name: RetentionDeferredDeletion
    owner: Retention
    description: "The physical part of an author's delete waiting on a hold (new table retention_deferred_deletions, M4; Question 2)"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: target_kind, type: enum, required: true, allowed_values: [review, facility_review, comment, evidence, profile, account] }
      - { name: target_id, type: uuid, required: true }
      - { name: action, type: text, required: true, allowed_values: [author_delete, comment_body_clear], constraints: "check constraint; U39 T-410 may add actions by migration (additive)" }
      - { name: hold_id, type: uuid, required: true, references: LegalHold.id, constraints: "the hold active at the delete" }
      - { name: requested_at, type: timestamp, required: true }
      - { name: completed_at, type: timestamp, required: false, constraints: "set once by the job (S2)" }
      - { name: outcome, type: text, required: false, allowed_values: [completed, nothing_to_do, target_gone], constraints: "set with completed_at" }
      - { name: created_at, type: timestamp, required: true }
    invariants:
      - "One pending row per (target_kind, target_id, action) (partial unique index where completed_at is null)"
      - "Never deleted; completed_at and outcome set from null once (trigger)"
      - "rk_app: SELECT, INSERT, UPDATE; rk_worker: SELECT, UPDATE (completed_at, outcome)"

  - name: RetentionPolicy
    owner: Retention
    description: "One version of the retention periods (table retention_policies)"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: version, type: integer, required: true, constraints: "unique; current + 1 on every change; version 0 is the built-in default, never stored" }
      - { name: original_days, type: integer, required: true, constraints: "1-3650" }
      - { name: audit_days, type: integer, required: true, constraints: "30-3650" }
      - { name: notification_days, type: integer, required: true, constraints: "7-365" }
      - { name: effective_from, type: timestamp, required: true, constraints: "Clock now at insert" }
      - { name: actor_account_id, type: uuid, required: true, references: AccountProfile.id }
      - { name: reason, type: text, required: true, constraints: "10-500 characters" }
      - { name: superseded_by, type: integer, required: false, constraints: "unused (always null); history is derived from version order" }
      - { name: created_at, type: timestamp, required: true }
    invariants:
      - "Append-only after M1 (BR1.7)"
      - "rk_worker: SELECT only (M4)"

  - name: RetentionBulkAction
    owner: Retention
    description: "Deferred with the bulk action (FD-088); unchanged and unused in release 1"
    attributes:
      - { name: id, type: uuid, required: true }
    invariants:
      - "rk_worker loses every privilege (M4)"

  - name: DemoClock
    owner: Retention
    description: "Single-row demo time offset (table demo_clock, 02-data-model.md §15)"
    attributes:
      - { name: id, type: smallint, required: true, constraints: "always 1 (check constraint)" }
      - { name: offset_seconds, type: bigint, required: true, default: 0, constraints: "0-315360000 (3650 days); must be 0 in production (boot guard, BR6.2)" }
      - { name: set_by, type: text, required: false, constraints: "opaque actor: account:<id> or system:script" }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: true }
    invariants:
      - "Read by fn_app_now(); rk_worker: SELECT (offset_seconds)"

  - name: EvidenceItem
    owner: Evidence
    description: "Columns this Unit reads or writes through the evidence subject and U25's purgeOriginal"
    attributes:
      - { name: hold_id, type: uuid, required: false, references: LegalHold.id, constraints: "set by hold.place, cleared by release or recorded expiry when equal to that hold" }
      - { name: retention_expires_at, type: timestamp, required: false, constraints: "set at publish (U25) or stamped by S4 for failed, rejected, removed and never-published items; never changed once set" }
      - { name: state, type: enum, required: true, constraints: "published -> original_expired by S5; other states unchanged" }
      - { name: review_id, type: uuid, required: false, references: Review.id, constraints: "read to honour review holds (BR2.13)" }
      - { name: detected_mime, type: text, required: false, constraints: "gives the staff file label extension" }
      - { name: original_bytes, type: bigint, required: true, constraints: "shown to staff as a count" }
      - { name: original_filename_enc, type: bytes, required: true, constraints: "never read by this Unit" }
      - { name: uploaded_by_account_id, type: uuid, required: true, constraints: "never read by this Unit (U24 PR3)" }
    invariants:
      - "Index evidence_items_retention_due_idx (retention_expires_at) WHERE hold_id IS NULL (M4)"

  - name: EvidenceArtifact
    owner: Evidence
    description: "The original artifact row; its deleted_at marks the purge"
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [original, page_png, thumbnail, derivative_pdf] }
      - { name: storage_key, type: text, required: true, constraints: "passed to Storage.delete; never in a view model or log" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "set by purgeOriginal (by retention) in the same transaction as the file deletion" }

  - name: CustodyEvent
    owner: Evidence
    description: "Append-only custody log (evidence_custody_events); events this Unit writes"
    attributes:
      - { name: event, type: enum, required: true, constraints: "this Unit writes hold_placed, hold_released, original_expired; retention_changed exists and stays unused (FD-088)" }
      - { name: actor, type: text, required: true, constraints: "account:<staffId> for place and release; system:retention for the job" }
      - { name: details, type: map, required: true, constraints: "hold_placed {holdId}; hold_released {holdId, auto}; original_expired {} or {original: absent}" }

  - name: AuditEvent
    owner: Administration
    description: "Append-only audit rows; stream retention written here, every stream expired by fn_expire_audit"
    attributes:
      - { name: stream, type: text, required: true, constraints: "retention for every row this Unit writes" }
      - { name: action, type: text, required: true, allowed_values: [policy_set, hold_placed, hold_released, hold_expired, deletion_deferred, deferred_deletion_completed, demo_clock_set, expire_run] }
      - { name: actor, type: text, required: true, constraints: "account:<id>, system:retention or system:script" }
      - { name: target_kind, type: enum, required: false, constraints: "the hold's target when it is one of the report target kinds; null for account holds (details carry it)" }
      - { name: target_id, type: uuid, required: false }
      - { name: details, type: map, required: true, constraints: "ids, enums, counts and before/after periods only" }

  - name: PersonaLink
    owner: Identity
    description: "Deleted only through fn_delete_held_persona_links; never read by the worker"
    attributes:
      - { name: persona_id, type: uuid, required: true }
      - { name: account_id, type: uuid, required: true }

  - name: ReviewDraft
    owner: Review
    description: "Read (id, account_id, expires_at) and deleted by the job through U21's FD-090 grant"
    attributes:
      - { name: expires_at, type: timestamp, required: true, constraints: "slides 30 days on every save (U21)" }
      - { name: payload_enc, type: bytes, required: true, constraints: "never selected by the job" }

  - name: Comment
    owner: Community
    description: "body kept under a hold, cleared by the deferred completion"
    attributes:
      - { name: body, type: text, required: true, constraints: "cleared to '' by comment_body_clear completion" }
      - { name: tombstone, type: boolean, required: true, constraints: "the projection renders a tombstone from this flag, never the stored body (X6)" }
      - { name: deleted_at, type: timestamp, required: false }

  - name: OutboxEvent
    owner: Notification
    description: "Written for hold.changed, retention.policyChanged, draft.expiring; read for the draft warning guard"
    attributes:
      - { name: name, type: text, required: true }
      - { name: payload, type: map, required: true, constraints: "draft.expiring {draftId, accountId, days, expiresOnDay}; hold.changed {holdId, placed}; retention.policyChanged {version}" }

  - name: Notification
    owner: Notification
    description: "Expired by notification.expire per policy segment, by created_at"
    attributes:
      - { name: created_at, type: timestamp, required: true }
```

## Enums and constants (`packages/contracts/src/enums.ts`, mirrored in `schema/enums.ts`)

| Name | Values |
|---|---|
| `HOLD_TARGET_KINDS` | `review`, `facility_review`, `comment`, `evidence`, `profile`, `account` |
| `HOLD_STATES` (view only) | `active`, `released`, `expired` |
| `DEFERRED_DELETION_ACTIONS` | `author_delete`, `comment_body_clear` |
| `DEFERRED_DELETION_OUTCOMES` | `completed`, `nothing_to_do`, `target_gone` |
| `RETENTION_RANGES` (`schemas/retention.ts`) | `originalDays 1–3650`, `auditDays 30–3650`, `notificationDays 7–365` |
| `DEFAULT_RETENTION_POLICY` (domain) | version 0: 90 / 180 / 90 |
| `DRAFT_WARNING_DAYS` (domain) | 4 |
| `DEMO_CLOCK_MAX_SECONDS` (domain) | 315 360 000 |

## View-model shapes (contracts)

| VM | Fields |
|---|---|
| `RetentionPolicyVM` | `version`, `originalDays`, `auditDays`, `notificationDays`, `effectiveFrom` (Iso8601), `source: 'stored' \| 'default'` |
| `HoldVM` | `holdId`, `targetKind`, `targetId`, `reason`, `placedAt`, `expiresAt?`, `state`, `endedAt?`, `endedBy?: 'staff' \| 'expiry'`, `pendingDeletions` (int), `placedByMe` (bool) |
| `HoldListVM` | `items: HoldVM[]`, `page`, `pageCount`, `total` |
| `CustodyEventVM` | `event`, `labelKey`, `at`, `actor: {kind: 'staff' \| 'author' \| 'worker' \| 'system', role?}`, `details` (allowlisted map, BR7.1) |
| `CustodyLogVM` | `itemId`, `itemPublicId`, `events: CustodyEventVM[]` |
| `QuarantineStageVM` | `step: 'received' \| 'validated' \| 'scanned' \| 'sanitised' \| 'redacted' \| 'published'`, `status: 'ok' \| 'fail' \| 'hold' \| 'wait' \| 'none'` |
| `QuarantineItemVM` | `itemId`, `itemPublicId`, `fileLabel`, `reviewPublicId?`, `state`, `failReason?`, `stages`, `originalBytes`, `retentionExpiresAt?`, `hold?: {holdId, placedAt, expiresAt?}` |
| `QuarantineVM` | `items`, `page`, `pageCount`, `total` |
| `DemoClockVM` | `now`, `offsetSeconds` |

The prototype's seven stages (`converted`, `rasterised` among them) collapse to six because Phase 1 is images only (FD-036); U36 T-407 picks the labels (X7). The `TODO(T-407)` stub in `quarantine.ts` is replaced; `note` is dropped (the prototype's free-text notes become T-407's copy keyed by state and fail reason).

## Data boundaries

- **Privacy**: no view model carries an account id, email, file name, storage key, hash or reason text, except `HoldVM.reason` for `holds.manage`. Outbox payloads carry ids, enums, counts and booleans (`expiresOnDay` is a day count). Logs carry step names, counts and durations only.
- **Ownership** (FD-064): Retention owns `legal_holds`, `legal_hold_expiries`, `retention_deferred_deletions`, `retention_policies`, `retention_bulk_actions`, `demo_clock`. Evidence, Review, Community, Identity, Notification and Administration rows change only through their own commands, worker entries or the two narrow functions.
- **Worker** (BR5.5): the complete retention-related list after this Unit is SELECT on `retention_policies` and `legal_holds`; SELECT, INSERT on `legal_hold_expiries`; SELECT, UPDATE (`completed_at`, `outcome`) on `retention_deferred_deletions`; SELECT (`offset_seconds`) on `demo_clock`; EXECUTE on `fn_delete_held_persona_links()`; nothing on `retention_bulk_actions`, `persona_links` or `fn_expire_audit`. Its existing grants on evidence tables, `reviews` (UPDATE `state`, `deleted_at`), `comments`, `notifications`, `outbox_events`, `audit_events` (INSERT) and `review_drafts` (FD-090) are used as they are.
- **Maintenance** (`rk_maintenance`): EXECUTE on `fn_expire_audit(text[], uuid[])` only; reached through `DATABASE_URL_MAINTENANCE` in the worker's audit-expiry gateway.
