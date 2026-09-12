# Data model

Owner per table follows the module map in `docs/planning/05-recommended-architecture.md`. Snake_case;
every table has `id uuid primary key` (UUIDv7, app-generated), `created_at timestamptz not null default now()`,
and, where rows change, `updated_at timestamptz`. Public-facing entities additionally carry
`public_id text unique not null` (10-char base32). Append-only tables have a trigger that raises on
`UPDATE`/`DELETE` (§10). Encrypted columns use AES-256-GCM with the app key from `APP_ENCRYPTION_KEY`
via the `Crypto` port; ciphertext is `bytea`.

Drizzle schema files live in `packages/database/src/schema/<module>.ts`; T-004 creates §1–§5 and §9–§11,
T-005 creates §6–§8 and §12–§14.

## 0. Enums (`schema/enums.ts`, mirrored in `contracts/enums.ts`)

| Enum | Values |
|---|---|
| `locale` | `en`, `bn` |
| `account_status` | `pending_verification`, `active`, `restricted`, `suspended`, `banned`, `deleted` |
| `staff_role` | `super_admin`, `admin`, `moderator` |
| `identity_mode` | `named`, `pseudonymous`, `anonymous` |
| `provenance` | `community`, `provider`, `admin` |
| `publication_state` | `draft`, `pending_review`, `published`, `hidden_pending_review`, `hidden`, `deleted_tombstone`, `rejected` |
| `review_kind` | `quick`, `detailed` |
| `relationship` | `self`, `parent`, `family`, `witness` |
| `sentiment` | `positive`, `mixed`, `negative` |
| `outcome` | `helped`, `none`, `worse`, `uncertain` |
| `tag_group` | `symptom`, `condition`, `treatment`, `medicine` |
| `term_kind` | `condition`, `symptom`, `treatment`, `medicine`, `specialty` |
| `facility_type` | `hospital`, `clinic`, `diagnostic` |
| `criterion` | `staff`, `waiting`, `cleanliness`, `billing`, `reportTime`, `reportTrust`, `admission`, `recommend`, `overall` |
| `criterion_value` | `good`, `mixed`, `poor` |
| `evidence_group` | `reviewed`, `later`, `outcome` |
| `evidence_state` | `quarantined`, `validating`, `scanning`, `sanitising`, `preview_ready`, `privacy_confirmed`, `published`, `failed`, `rejected`, `removed`, `original_expired` |
| `evidence_fail_reason` | `type_mismatch`, `too_large`, `malformed`, `malware`, `scanner_unavailable`, `processing_timeout`, `unknown` (+ `too_many_pages`, `encrypted` reserved for Phase 2 PDFs — keep the values in the enum, unused) |
| `artifact_kind` | `original`, `page_png`, `thumbnail` (+ `derivative_pdf` reserved for Phase 2) |
| `custody_event` | `received`, `validated`, `validation_failed`, `scan_started`, `scan_clean`, `scan_detected`, `scan_unavailable`, `sanitised`, `preview_ready`, `redaction_applied`, `privacy_confirmed`, `published`, `failed`, `original_accessed`, `hold_placed`, `hold_released`, `retention_changed`, `original_expired`, `removed` |
| `follow_up_kind` | `follow_up`, `correction`, `later_care` |
| `reaction_value` | `like`, `dislike` |
| `report_reason` | `privacy`, `threat`, `harassment`, `hate`, `spam`, `impersonation`, `dangerous`, `unsafeFile`, `ownership`, `duplicate`, `offtopic`, `factual`, `other` |
| `moderation_lane` | `critical`, `standard`, `appeals` |
| `case_status` | `open`, `decided`, `appealed`, `closed` |
| `moderation_action` | `warn`, `redact`, `removeFile`, `lock`, `hide`, `remove`, `restrict`, `suspend`, `ban`, `none`, `restore` |
| `appeal_status` | `open`, `upheld`, `changed`, `expired` |
| `enforcement_kind` | `warn`, `restrict`, `suspend`, `ban` |
| `notification_kind` | `evidence`, `discussion`, `moderation`, `security`, `draft` |
| `staff_notification_kind` | `newReport`, `newProfile`, `evidence`, `claim`, `protectedChange`, `identityReveal`, `security` |
| `submission_status` | `pending`, `approved`, `rejected`, `merged` |
| `data_request_kind` | `export`, `delete` |
| `data_request_status` | `requested`, `running`, `ready`, `completed`, `failed` |
| `deletion_action` | `delete`, `deidentify`, `tombstone`, `hide`, `retain_until_expiry`, `retain_under_hold` |
| `search_kind` | `doctor`, `facility`, `condition`, `review` |
| `target_kind` | `review`, `facility_review`, `comment`, `evidence`, `profile` |

Critical report reasons (hide on first credible report, FD-017): `privacy`, `threat`, `unsafeFile`. `factual` never auto-hides. Seed mapping from the prototype fixtures: `lane: 'appeal'` → `appeals`; `targetKind: 'account'` → `review`.

## 1. Authentication (library-owned, module `account`)

Better Auth's Drizzle adapter owns these four tables; model names are mapped in the auth config so
the library's `user` becomes `auth_users` etc. Application code reads them **only** through the
account repository.

| Table | Columns (beyond Better Auth defaults) | Notes |
|---|---|---|
| `auth_users` | `id text pk`, `email text unique`, `email_verified bool`, `name text`, `created_at`, `updated_at` | `name` unused; display name lives in `account_profiles` |
| `auth_sessions` | `id`, `user_id fk`, `token text unique`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `updated_at` | 30-day max, rolling; listed on `/me/security` |
| `auth_accounts` | Better Auth credential row: `provider_id 'credential'`, `password text` (Argon2id PHC string) | no OAuth providers |
| `auth_verifications` | `identifier`, `value`, `expires_at` | email verification (24 h) and reset tokens |

## 2. Accounts and staff (module `account`)

| Table | Columns | Notes |
|---|---|---|
| `account_profiles` | `id uuid pk`, `auth_user_id text unique fk→auth_users`, `username citext unique` (3–24, `[a-z0-9_]`), `username_key text`, `display_name text`, `locale`, `status account_status`, `staff_role staff_role null`, `age_confirmed_at timestamptz`, `terms_version text`, `terms_accepted_at`, `last_seen_at`, `deleted_at` | one per auth user; `status` transitions in `domain/account/account-state.ts` |
| `account_preferences` | `account_id pk fk`, `interface_locale`, `email_security bool default true`, `email_moderation bool default true`, `email_evidence bool default true`, `email_discussion bool default false` | essential email categories only |
| `staff_devices` | `id`, `account_id fk`, `device_hash text` (hash of cookie secret), `label text` (UA family), `first_seen_at`, `last_seen_at`, `approved_at null`, `revoked_at null` | cookie `rk_staff_device` holds the secret; hash stored |
| `staff_device_approvals` | `id`, `device_id fk`, `token_hash text unique`, `expires_at` (30 min), `used_at null` | emailed link |
| `enforcements` | `id`, `account_id fk`, `kind enforcement_kind`, `reason_code text`, `note_to_user text`, `starts_at`, `ends_at null`, `decision_id fk→moderation_decisions null`, `actor_account_id` | current effective enforcement determines `status` |
| `feedback` | `id`, `account_id fk`, `body text`, `locale`, `created_at` | `/me` feedback box |
| `bookmarks` | `account_id fk`, `review_id fk`, `created_at`, pk(account_id, review_id) | private, never projected |
| `blocks` | `blocker_account_id fk`, `blocked_account_id fk`, `created_at`, pk(both) | private; enforced in community commands |

## 3. Identity (module `identity`) — AD-3

| Table | Columns | Notes |
|---|---|---|
| `personas` | `id uuid pk`, `kind identity_mode`, `display_name text` (snapshot), `username text null` (only for `named`/`pseudonymous`), `avatar_hue smallint`, `created_at` | **public**; no account column |
| `persona_links` | `persona_id pk fk`, `account_id fk`, `review_id fk null` (set for `anonymous` — the alias is scoped to one thread), `created_at` | **private**; readable only by identity module; excluded from `DATABASE_URL_WORKER` role grants |
| `identity_reveals` | `id`, `requester_account_id`, `requester_role staff_role`, `target_kind`, `target_id`, `reason text`, `granted bool`, `revealed_account_id null`, `created_at` | append-only; every reveal attempt, granted or not |

Rules: an account has one `named` persona (display name snapshot updated on rename → new persona row; old content keeps old snapshot), one `pseudonymous` persona (username), and one `anonymous` persona **per review thread** (alias like `patient-4f2k`). Comments on a thread where the author is anonymous use that thread's alias.

## 4. Directory (module `directory`)

| Table | Columns | Notes |
|---|---|---|
| `doctors` | `id`, `public_id`, `seed_ref text null`, `name_en`, `name_bn`, `specialty_id fk→taxonomy_terms`, `qualifications_en/bn`, `bmdc_number text null`, `gender text null`, `languages_en/bn`, `fee_display_en/bn`, `city_en/bn`, `area_en/bn`, `about_en/bn null`, `field_provenance jsonb` (`{name:{source,updated_at}, specialty:{…}, …}`), `avatar_hue smallint` (seeded from the prototype's `accent`), `claimed_by_account_id null`, `state publication_state`, `merged_into_id null fk→doctors`, `name_key`, `bmdc_key` | "Registration not verified" is unconditional copy, not a column |
| `doctor_chambers` | `id`, `doctor_id fk`, `branch_id fk→facility_branches null`, `name_en/bn`, `hours_en/bn`, `provenance`, `sort_order` | |
| `facilities` | `id`, `public_id`, `seed_ref`, `name_en/bn` (organisation), `type facility_type`, `field_provenance jsonb`, `avatar_hue smallint`, `state`, `claimed_by_account_id null` | parent organisation |
| `facility_branches` | `id`, `public_id`, `facility_id fk`, `name_en/bn` (branch), `city_en/bn`, `area_en/bn`, `address_en/bn null`, `field_provenance jsonb`, `state`, `is_primary bool` | accounts attach to a branch |
| `profile_submissions` | `id`, `kind ('doctor'|'facility')`, `payload jsonb`, `submitted_by_account_id`, `status submission_status`, `duplicate_of_id null`, `reviewer_note text`, `decided_by`, `decided_at`, `created_doctor_id/facility_id null` | "add a doctor" from the composer |
| `profile_claims` | `id`, `target_kind ('doctor'|'facility')`, `target_id`, `claimant_account_id`, `method text`, `evidence_note text` (private), `status submission_status`, `decided_by`, `decided_at` | claiming grants field-edit rights, never review control |
| `profile_field_changes` | `id`, `target_kind`, `target_id`, `field text`, `old_value jsonb`, `new_value jsonb`, `proposed_by_account_id`, `provenance`, `protected bool`, `status submission_status`, `decided_by`, `decided_at`, `reason` | protected fields (name, bmdc) always pend |
| `profile_redirects` | `from_public_id pk`, `to_kind`, `to_public_id`, `merge_id` | old URLs after merge |
| `profile_merges` | `id`, `kind`, `source_id`, `target_id`, `actor`, `reason`, `transferred jsonb`, `created_at` | audit of what moved |

## 5. Taxonomy (module `taxonomy`)

| Table | Columns | Notes |
|---|---|---|
| `taxonomy_terms` | `id`, `public_id`, `seed_ref`, `kind term_kind`, `name_en`, `name_bn`, `name_key_en`, `name_key_bn`, `provisional bool`, `canonical_id null fk→taxonomy_terms`, `created_by_account_id null`, `state` | provisional user terms map later to canonical |
| `taxonomy_aliases` | `id`, `term_id fk`, `alias text`, `alias_key text`, `lang ('en'|'bn'|'banglish')`, `provenance`, unique(term_id, alias_key) | seed has 5 aliases per condition incl. Banglish |

## 6. Reviews / accounts (module `review`)

| Table | Columns | Notes |
|---|---|---|
| `reviews` | `id`, `public_id`, `seed_ref`, `author_persona_id fk→personas`, `doctor_id fk`, `branch_id fk null`, `kind review_kind`, `relationship`, `identity_mode`, `sentiment null`, `outcome null`, `period_year smallint`, `period_month smallint`, `exact_date_enc bytea null` (private), `title text`, `body text` (quick) , `sections jsonb null` (`{symptoms, diagnosis, treatment, after}` for detailed), `claims jsonb` (`[{label, note}]` — "Reviewer's label"), `language ('en'|'bn'|'mixed')`, `state publication_state`, `published_at`, `hidden_at`, `hidden_reason_code`, `deleted_at`, `restore_until` (deleted_at + 30 d), `version int`, `latest_status text null` (from newest follow-up), `attestation_at` (relationship/privacy attestation), `updated_at` | facility feedback is **not** here (→ `facility_reviews`) |
| `review_tags` | `id`, `review_id fk`, `group tag_group`, `term_id fk null`, `free_text text null`, `not_sure bool` | one of term/free_text/not_sure |
| `review_versions` | `id`, `review_id`, `version int`, `snapshot jsonb`, `change_kind ('publish'|'correction'|'moderation_redaction'|'restore')`, `reason text`, `actor_kind ('author'|'moderator'|'system')`, `actor_id`, `created_at` | append-only; authorised history |
| `review_follow_ups` | `id`, `review_id`, `kind follow_up_kind`, `dated_year`, `dated_month`, `body text` (for `correction` entries: the author's stated reason), `later_provider_text text null`, `later_doctor_id null`, `state`, `created_at` | ordered newest-first by (`dated_year`, `dated_month`, `created_at`), never by insertion; latest feeds `reviews.latest_status`; author cannot pin |
| `review_drafts` | `id`, `account_id fk`, `review_id null` (editing published), `kind`, `payload_enc bytea` (encrypted JSON of the composer state), `doctor_id null`, `blocked_on_submission_id null`, `updated_at`, `expires_at` (30 d) | autosave target |
| `facility_reviews` | `id`, `public_id`, `seed_ref`, `author_persona_id`, `branch_id fk`, `identity_mode`, `period_year/month`, `body`, `criteria jsonb` (`{staff:'good', …, reportTime:null}`), `state`, `published_at`, `version`, `deleted_at`, `restore_until` | never joins to doctor aggregates |

Aggregates are queries, not tables: `sentiment_distribution(doctor_id)` and `outcome_distribution(doctor_id)` count only `state='published'` reviews of that doctor; `criteria_distribution(branch_id)` counts only `facility_reviews`. Each returns `{counts, total}`; the domain policy `isLimitedData(total, threshold)` decides the label.

## 7. Evidence (module `evidence`) — AD-6, AD-7

| Table | Columns | Notes |
|---|---|---|
| `evidence_items` | `id`, `public_id`, `seed_ref`, `review_id fk`, `group evidence_group`, `label_en/bn text null`, `state evidence_state`, `fail_reason evidence_fail_reason null`, `declared_mime`, `detected_mime` (Phase 1: `image/jpeg` or `image/png` only, FD-036), `original_bytes bigint`, `original_sha256 text`, `original_filename_enc bytea` (private), `page_count int` (always 1 in Phase 1), `uploaded_by_account_id` (private), `retention_expires_at`, `hold_id null`, `published_artifact_id null`, `idempotency_key text unique null`, `updated_at` | state machine in `domain/evidence/evidence-state.ts` |
| `evidence_artifacts` | `id`, `item_id fk`, `kind artifact_kind`, `page_no int null`, `storage_key text unique`, `sha256`, `bytes`, `mime`, `width`, `height`, `sanitiser_version text`, `scanner_version text null`, `signature_version text null`, `immutable bool`, `public bool` (true only for `page_png`/`derivative_pdf`/`thumbnail` of a published item), `superseded_by_id null fk→evidence_artifacts` (set on a page artifact when a redaction produced its replacement), `deleted_at null` (originals expired by retention) | `original` rows are never `public`; the current page set is `kind='page_png' and superseded_by_id is null`; `evidence.getPublic` returns **only** `published` items — failed items are visible to the author alone (the prototype showed e5's failure on the public page; the product does not) |
| `evidence_redactions` | `id`, `item_id`, `page_no`, `rects jsonb` (`[{x,y,w,h}]` in page pixels), `applied_to_artifact_id`, `created_at` | flattened into new page artifacts |
| `evidence_custody_events` | `id`, `item_id`, `event custody_event`, `actor text` (opaque: `account:<id>`, `worker`, `system:retention`), `details jsonb` (allowlisted), `created_at` | append-only |
| `legal_holds` | `id`, `target_kind`, `target_id`, `reason text`, `placed_by_account_id`, `placed_at`, `expires_at null`, `released_at null`, `released_by` | overrides scheduled deletion for the record only |
| `retention_policies` | `id`, `version int unique`, `original_days int` (default 90), `audit_days int` (default 180), `notification_days int` (90), `effective_from`, `actor_account_id`, `reason text`, `superseded_by null` | prospective only |
| `retention_bulk_actions` | `id`, `policy_version`, `preview jsonb` (`{count, sample_ids, from_days, to_days}`), `previewed_at`, `executed_at null`, `actor_account_id`, `reason`, `affected_ids jsonb`, `drift_detected bool`, `idempotency_key unique` | FD-020 |

## 8. Community (module `community`)

| Table | Columns | Notes |
|---|---|---|
| `comments` | `id`, `public_id`, `seed_ref`, `review_id fk`, `parent_id fk→comments null` (one level: parent must have `parent_id null`), `author_persona_id`, `body text`, `has_external_link bool`, `state publication_state`, `edited_at null`, `deleted_at null`, `tombstone bool`, `updated_at` | `tombstone` true when deleted but replies exist |
| `comment_mentions` | `comment_id`, `mentioned_persona_id`, pk(both) | anonymous personas cannot be mentioned |

Derived, not stored: the prototype's comment flags `dangerous` (= a `hidden_pending_review` state with an open case whose reasons include `dangerous`) and `providerFor` (= the author's account holds an approved `profile_claims` row for the review's doctor). Comments accept `like` only; reviews accept `like|dislike` (prototype behaviour).
| `reactions` | `id`, `target_kind ('review'|'facility_review'|'comment')`, `target_id`, `account_id` (private), `public_persona_id null` (null when the actor's identity on that thread is anonymous), `value reaction_value`, `updated_at`, unique(target_kind, target_id, account_id) | one current reaction; change = update |

## 9. Moderation (module `moderation`) — AD-12

| Table | Columns | Notes |
|---|---|---|
| `reports` | `id`, `target_kind`, `target_id`, `review_id` (context), `reporter_account_id` (**restricted**), `reason report_reason`, `detail text`, `evidence_note text`, `created_at`, unique(target_kind, target_id, reporter_account_id) | duplicates by one account never increment |
| `moderation_cases` | `id`, `code text unique` (`MOD-2041`, sequence-backed display code), `lane`, `status case_status`, `target_kind`, `target_id`, `review_id`, `report_count int`, `distinct_reporters int`, `auto_hidden bool`, `coordinated_signal bool`, `summary_en/bn`, `opened_at`, `sla_due_at`, `assigned_to null`, `closed_at` | `sla_due_at` from config hours/days |
| `moderation_case_reasons` | `case_id`, `reason`, `count`, pk(case_id, reason) | chips in the case tray |
| `moderation_decisions` | `id`, `case_id`, `action moderation_action`, `reason_code text`, `reason_to_author text`, `policy_version text`, `actor_account_id`, `public_effect jsonb` (`{state_before, state_after}`), `created_at` | append-only; never edits narrative |
| `appeals` | `id`, `case_id`, `appellant_account_id` (private), `text`, `status appeal_status`, `checklist jsonb`, `decided_by`, `decision_reason`, `decided_at`, `due_at` | fresh reviewer required (`decided_by != decisions.actor`) |
| `audit_events` | `id`, `stream text` (`case:MOD-2041`, `config`, `identity`, `evidence:<id>`, `account:<id>`, `retention`), `action text` (free string — `report`, `warn`, `hide`, `record`, `review`, `note`, `reopen`, `requestAccess`, `freshReview`, `step_up`, … — **not** the `moderation_action` enum), `actor text` (opaque), `target_kind`, `target_id`, `details jsonb`, `created_at` | append-only; the console's audit timeline reads `stream = case:<code>` |

## 10. Append-only enforcement

Migration `0003_append_only.sql` creates `fn_block_mutation()` raising `append_only_violation` and attaches `BEFORE UPDATE OR DELETE` triggers to: `audit_events`, `evidence_custody_events`, `identity_reveals`, `moderation_decisions`, `review_versions`, `retention_bulk_actions`. Retention expiry deletes through a `SECURITY DEFINER` function `fn_expire_audit(before timestamptz)` callable only by the maintenance role.

## 11. Administration (module `administration`) — AD-10

| Table | Columns | Notes |
|---|---|---|
| `config_versions` | `id`, `version int unique`, `schema_version int`, `values jsonb`, `actor_account_id`, `reason text`, `effective_from`, `rolled_back_from int null`, `created_at` | the current config is the highest `version` with `effective_from <= now()` |
| `config_changes` | `id`, `version int`, `path text` (`thresholds.fiveAccountHide`), `before jsonb`, `after jsonb` | diff rows for the history view |

`values` shape (zod `ConfigValues` in contracts): `{ thresholds: { fiveAccountHide: 5, criticalHours: 24, standardDays: 3, appealDays: 7 }, retention: { originalDays: 90, auditDays: 180, notificationDays: 90 }, limitedDataThreshold: 5, reportReasons: [...enabled reasons], capabilities: { admin: { revealIdentity: false, originalEvidence: false }, moderator: { revealIdentity: false, originalEvidence: false } }, featureVisibility: { facilityAccounts: true, compareTray: true }, emergency: { ambulance: '999', healthLine: '16263', crisisLine: '09612-119911', lastVerified: '2026-08-21' } }`. Super Admin capabilities are fixed in code, not config. Ranges: `fiveAccountHide 2–50`, `criticalHours 1–168`, `standardDays 1–30`, `appealDays 1–30`, `originalDays 1–3650`, `auditDays 30–3650`, `notificationDays 7–365`, `limitedDataThreshold 1–50`. The prototype's `retentionMaxDays` input is dropped: the maximum is the fixed range bound. `reportReasons` may disable reasons except `privacy`, `threat`, `unsafeFile`, `dangerous`, `other`, which are always enabled.

## 12. Notifications (module `notification`)

| Table | Columns | Notes |
|---|---|---|
| `notifications` | `id`, `account_id fk`, `kind notification_kind`, `message_key text`, `params jsonb` (ids, counts — no content), `route text` (app path), `read_at null`, `dedupe_key text unique`, `expires_at` (90 d), `created_at` | in-app feed |
| `staff_notifications` | `id`, `kind staff_notification_kind`, `target_code text`, `message_key`, `params jsonb`, `route text`, `acked_by null`, `acked_at null`, `dedupe_key unique`, `created_at` | console triage |
| `email_deliveries` | `id`, `account_id`, `to_email_enc bytea` (written by the web tier so the worker never reads `auth_users`), `locale`, `category ('verification'|'reset'|'security'|'moderation'|'evidence'|'device_approval'|'deletion')`, `message_key`, `params jsonb`, `status ('queued'|'sent'|'failed'|'suppressed')`, `attempts int`, `last_error_code`, `sent_at` | payload never contains content |
| `outbox_events` | `id`, `name text` (past tense, e.g. `review.published`), `payload jsonb` (ids only), `created_at`, `processed_at null`, `attempts int` | written in the same transaction as the change; relayed to pg-boss by the worker |

## 13. Search (module `search`) — AD-8

| Table | Columns | Notes |
|---|---|---|
| `search_documents` | `id`, `kind search_kind`, `ref_id uuid`, `public_id`, `title_en`, `title_bn`, `body_en`, `body_bn`, `key_nfc text` (NFC, lowercased, de-spaced concatenation of names + aliases), `tsv tsvector generated always as (to_tsvector('simple', coalesce(title_en,'')||' '||coalesce(title_bn,'')||' '||coalesce(body_en,'')||' '||coalesce(body_bn,''))) stored`, `published bool`, `accounts_count int`, `recent_at timestamptz`, `city_key`, `specialty_id null`, `updated_at`, unique(kind, ref_id) | GIN on `tsv`; GIN `gin_trgm_ops` on `key_nfc` |
| `search_aliases` | `id`, `kind`, `ref_id`, `alias`, `alias_key`, `lang`, `provenance` | doctors (name variants, BMDC), conditions (from `taxonomy_aliases`), facilities |

Refresh: outbox events `doctor.changed`, `facility.changed`, `term.changed`, `review.published|hidden|deleted|restored` → worker job `search.refresh` rebuilds the single document. Publication filter (`published = true`) is applied **before** ranking in the adapter's SQL.

## 14. Data requests and deletion (module `data-requests`) — AD-17

| Table | Columns | Notes |
|---|---|---|
| `data_requests` | `id`, `account_id`, `kind data_request_kind`, `status data_request_status`, `plan jsonb` (`[{module, action deletion_action, target_ids, status, error_code}]`), `result_storage_key null` (export zip, private), `idempotency_key unique`, `requested_at`, `completed_at`, `expires_at` (export download 7 d) | one open request per kind per account |

## 15. Demo support (dev/demo only)

| Table | Columns | Notes |
|---|---|---|
| `demo_clock` | `id smallint pk default 1`, `offset_seconds bigint`, `set_by`, `updated_at` | `Clock` port adds the offset in `APP_MODE=demo|development`; the table does not exist in production migrations set (guarded by `APP_MODE` assertion at start-up, AD-14) |

## 16. Roles and grants (migration `0004_roles.sql`)

- `rk_app` — web application; full DML on all tables.
- `rk_worker` — no privileges on `auth_*`, `persona_links`, `identity_reveals`, `blocks`, `bookmarks`, `reports.reporter_account_id` and `evidence_items.original_filename_enc` (column-level revokes); SELECT on `evidence_items.uploaded_by_account_id` is granted (notification delivery must find the author); DML on evidence, artifacts, custody, notifications, email_deliveries, outbox, search, retention, data_requests; EXECUTE on `fn_expire_audit`.
- `rk_maintenance` — retention expiry and backups.

Notes: (1) tables in §2–§3 reference tables created in §6–§9; T-004 creates them without those FKs and T-005 adds them in `0005_deferred_fks.sql` — do not reorder. (2) The `pgboss` schema is created by migration `0007_pgboss.sql` run as `rk_app`, with USAGE/DML grants to `rk_worker`. (3) `rk_worker` has **no** privilege on `auth_users`; mail recipients travel encrypted in `email_deliveries.to_email_enc`, and the account step of a deletion plan (revoke sessions, `status = deleted`, replace email with a tombstone hash) runs in the **web** process inside `dataRequest.delete` before the worker executes the remaining participants.

Compose creates the roles; `DATABASE_URL`, `DATABASE_URL_WORKER` in `.env.example` point at them.

## 17. State machines (authoritative tables live in `packages/domain`)

**Publication** (`reviews`, `facility_reviews`, `comments`, `doctors`, `facilities`, `facility_branches`):

| From | To | Trigger |
|---|---|---|
| `draft` | `published` | author publish (profiles: staff approve → `published`; community submissions start `pending_review`) |
| `draft` | `pending_review` | submission needing staff check |
| `pending_review` | `published` / `rejected` | staff decision |
| `published` | `hidden_pending_review` | five distinct confirmed reporters, or critical reason |
| `published` | `hidden` | moderator `hide` |
| `hidden_pending_review` | `published` | moderator `restore` (reason-coded) |
| `hidden_pending_review` | `hidden` | moderator `hide` |
| `hidden` | `published` | moderator `restore` / appeal changed |
| `published`/`hidden` | `deleted_tombstone` | author delete when discussion exists; moderator `remove` |
| `published` | `deleted` (row kept, `deleted_at`, not projected) | author delete with no discussion; restorable 30 d |
| `deleted_tombstone`/`deleted` | `published` | author restore within `restore_until` |

**Evidence**: `quarantined → validating → scanning → sanitising → preview_ready → privacy_confirmed → published → original_expired`; failures: `validating → failed(type_mismatch|too_large|too_many_pages|encrypted|malformed)`, `scanning → failed(malware)` or **stay** `scanning` (scanner unavailable — retried; never advances), `sanitising → failed(processing_timeout|unknown)`; `preview_ready|failed → rejected` (author removes); any → `removed` (moderator `removeFile`). Only `published` items have `public` artifacts.

**Case**: `open → decided → closed`; `decided → appealed → decided(appeal) → closed`.

**Account**: `pending_verification → active`; `active ↔ restricted`; `active → suspended → active` (ends_at); `→ banned`; `→ deleted` (plan completed).
