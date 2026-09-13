# T-005 — Database package, part 2 (reviews, evidence, community, moderation, notifications, search, retention, data requests, append-only)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-004 |
| Parallel-safe with | T-006, T-008, T-009 (T-009 only needs `outbox_events`, created here — start T-009 after this task's migration lands) |

## Goal

Complete the schema: reviews and facility reviews, evidence and custody, community, the rest of moderation, notifications and the outbox, search documents with FTS/trigram indexes, retention and holds, data requests; the append-only triggers; the deferred foreign keys from T-004; and the final grants. Repository files for these modules are created as stubs.

## Read first

1. `docs/implementation/02-data-model.md` §6, §7, §8, §9 (all), §10, §12, §13, §14, §16, §17
2. `docs/implementation/03-routes-and-contracts.md` §4 (which module owns which repository methods) and §5 (outbox event names — the `outbox_events.name` column is free text but the test asserts against this list)
3. `packages/database/src/schema/_common.ts`, `enums.ts`, `account.ts`, `identity.ts` from T-004 (the deferred-FK comments tell you what to add)
4. `docs/implementation/01-conventions.md` §4 (text keys, files), §11 (worker role)

## Owned paths

Create: `packages/database/src/schema/{review,evidence,community,moderation,notification,search,retention,data-requests}.ts`, `packages/database/src/migrations/0003_content.sql` (generated), `0004_append_only.sql`, `0005_deferred_fks.sql`, `0006_grants_part2.sql` (custom), `packages/database/src/repositories/{review,evidence,community,moderation,notification,retention,data-requests,outbox}.ts`, `packages/database/src/search/index.ts` (stub adapter file), `packages/database/src/*.int.test.ts` (new files only)
Modify: `packages/database/src/schema/index.ts`, `packages/database/src/schema/account.ts` and `identity.ts` (add the deferred FKs only), `packages/database/src/index.ts`

## Not in scope

- Search SQL (T-205); only the table, generated `tsvector` column and indexes.
- pg-boss schema (pg-boss creates its own `pgboss` schema at first start — T-009).
- Any repository logic.

## Steps

1. `schema/review.ts` (§6): `reviews` (with `exact_date_enc bytea`, `sections jsonb` typed `{symptoms?, diagnosis?, treatment?, after?}`, `claims jsonb` typed `{label: string; note?: string}[]`, `restore_until timestamptz`), `review_tags` with a check constraint that exactly one of `term_id`, `free_text`, `not_sure=true` is set, `review_versions`, `review_follow_ups`, `review_drafts` (`payload_enc bytea`), `facility_reviews` (`criteria jsonb` typed `Partial<Record<Criterion, CriterionValue | null>>`). Indexes: `reviews(doctor_id, state)`, `reviews(branch_id, state)`, `reviews(author_persona_id)`, `review_follow_ups(review_id, dated_year desc, dated_month desc)`, `review_drafts(account_id, updated_at desc)`, `facility_reviews(branch_id, state)`.
2. `schema/evidence.ts` (§7): `evidence_items` (`original_filename_enc bytea`, `idempotency_key text unique`), `evidence_artifacts` (`public boolean not null default false`; check constraint `NOT (kind = 'original' AND public)` — the database itself refuses a public original), `evidence_redactions`, `evidence_custody_events`. Indexes: `evidence_items(review_id, group)`, `evidence_items(state)`, `evidence_items(retention_expires_at) where hold_id is null and state = 'published'`, `evidence_artifacts(item_id, kind, page_no)`.
3. `schema/retention.ts` (§7 second half): `legal_holds`, `retention_policies`, `retention_bulk_actions`. Now add `evidence_items.hold_id` FK → `legal_holds` (declare in `evidence.ts` via a late import or in `0005_deferred_fks.sql`).
4. `schema/community.ts` (§8): `comments` with a check `parent_id IS NULL OR tombstone = false OR true` — no: enforce the one-level rule with a trigger in `0004`? Keep it in domain code (conventions §3) **and** add a database-level guard: a `BEFORE INSERT` trigger `fn_comment_depth()` raising when the parent itself has a parent (write it into `0004_append_only.sql` alongside the other triggers — rename that migration `0004_triggers.sql`). `comment_mentions`, `reactions` with the unique constraint from §8 and a check `public_persona_id IS NULL OR true` (no DB rule; domain decides).
5. `schema/moderation.ts` (§9): `reports` (unique `(target_kind, target_id, reporter_account_id)`), `moderation_cases` (`code text unique`; a sequence `moderation_case_seq` starting at 2050 — the seed uses fixed codes `MOD-2011…2041`; new cases take `'MOD-' || nextval`), `moderation_case_reasons`, `moderation_decisions`, `appeals`. Add `enforcements.decision_id` FK now.
6. `schema/notification.ts` (§12): `notifications`, `staff_notifications`, `email_deliveries`, `outbox_events` (index on `processed_at nulls first, created_at`).
7. `schema/search.ts` (§13): `search_documents` with the generated `tsv` column — Drizzle: `tsv: tsvector('tsv').generatedAlwaysAs(sql\`to_tsvector('simple', coalesce(title_en,'') || ' ' || coalesce(title_bn,'') || ' ' || coalesce(body_en,'') || ' ' || coalesce(body_bn,''))\`)` using a `customType` for `tsvector`; indexes `USING gin (tsv)` and `USING gin (key_nfc gin_trgm_ops)` (the latter needs raw SQL in the migration — drizzle-kit 0.31 supports `.using('gin', …)` with `sql` operator classes; if it does not emit `gin_trgm_ops`, add it in `0005`). `search_aliases` with index on `alias_key gin_trgm_ops`.
8. `schema/data-requests.ts` (§14): `data_requests` with `plan jsonb` typed `{module: string; action: DeletionAction; targetIds: string[]; status: 'pending'|'done'|'failed'; errorCode?: string}[]`.
9. Deferred FKs (`0005_deferred_fks.sql` or inline where Drizzle allows the import order): `bookmarks.review_id → reviews`, `persona_links.review_id → reviews`, `enforcements.decision_id → moderation_decisions`, `evidence_items.hold_id → legal_holds`, `evidence_items.published_artifact_id → evidence_artifacts` (deferrable initially deferred — the two rows are written in one transaction).
10. Generate `0003_content.sql` (`drizzle-kit generate --name content`); inspect for the generated column, the check constraints and the GIN indexes.
11. `0004_triggers.sql` (custom): `fn_block_mutation()` raising `append_only_violation`; `BEFORE UPDATE OR DELETE` triggers on `audit_events`, `evidence_custody_events`, `identity_reveals`, `moderation_decisions`, `review_versions`, `retention_bulk_actions`; `fn_expire_audit(before timestamptz)` as `SECURITY DEFINER` deleting `audit_events` older than `before`, `REVOKE EXECUTE … FROM PUBLIC; GRANT EXECUTE … TO rk_maintenance, rk_worker`; `fn_comment_depth()` trigger on `comments`.
12. `0006_grants_part2.sql` (custom), per §16: `rk_worker` gets DML on `evidence_items`, `evidence_artifacts`, `evidence_custody_events`, `evidence_redactions`, `notifications`, `staff_notifications`, `email_deliveries`, `outbox_events`, `search_documents`, `search_aliases`, `retention_policies`, `retention_bulk_actions`, `legal_holds` (select), `data_requests`, `reviews` (select + update of `state`/`deleted_at` columns only — use column-level `GRANT UPDATE (state, deleted_at)`), `review_versions` (insert), `comments` (select/update), `reports` **without** `reporter_account_id` (`GRANT SELECT (id, target_kind, target_id, review_id, reason, created_at) ON reports TO rk_worker`), `personas` (select), `account_profiles` (select of `id, username, display_name, locale, status` only), `account_preferences` (select), `auth_users` (**select of `id, email` only** — the mail job needs the address; document this exception in a comment and in the hand-off). `rk_maintenance`: execute on `fn_expire_audit`, delete on `notifications`, `email_deliveries`.
13. Repository stubs as in T-004 step 15 for: `PgReviewRepository`, `PgEvidenceRepository`, `PgCommunityRepository`, `PgModerationRepository`, `PgNotificationRepository`, `PgRetentionRepository`, `PgDataRequestRepository`, and an **implemented** `PgOutbox` (`append(tx, name, payload)` inserting `outbox_events`; `claimBatch(limit)` using `FOR UPDATE SKIP LOCKED`; `markProcessed(ids)`; `markFailed(id)`) because T-009 needs it. `search/index.ts`: `class PgSearchIndex` with `upsert/remove/search/suggest` stubs `NotImplemented('T-205')`.
14. Integration tests (new files): `append-only.int.test.ts` — "updating an audit event raises append_only_violation", "deleting a custody event raises", "fn_expire_audit deletes old rows when called as rk_maintenance"; `constraints.int.test.ts` — "a public original artifact is rejected by the check constraint", "a reply to a reply is rejected by the depth trigger", "a second report by the same account on the same target violates the unique constraint", "a review tag must have exactly one of term/free_text/not_sure"; `outbox.int.test.ts` — "claimBatch returns unprocessed rows once and marks them", "worker role can insert outbox rows but cannot read reports.reporter_account_id".
15. `pnpm db:reset && pnpm db:migrate && pnpm test:int && pnpm typecheck`. Commit: `T-005: schema part 2, append-only triggers, grants, outbox`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Migrate from empty | `pnpm db:reset && pnpm db:migrate` | 6 migrations applied |
| Table count | `psql … -c "select count(*) from pg_tables where schemaname='public'"` | **59** (30 from T-004, correct per `ISS-086`, + 28 from T-005 + `drizzle_migrations` itself, moved into `public` by T-004's `ISS-092` fix) — recorded here per this row's own "adjust and record the exact number" instruction |
| Generated column | `psql … -c "\d search_documents"` | `tsv … generated always as … stored`; two GIN indexes |
| Append-only | `pnpm test:int -t append_only` | passes |
| Column-level worker grant | `psql "$DATABASE_URL_WORKER" -c "select reporter_account_id from reports"` | `permission denied` |
| Worker can read report basics | `psql "$DATABASE_URL_WORKER" -c "select id, reason from reports"` | ok (0 rows) |
| Typecheck | `pnpm typecheck` | exit 0 |
| Integration suite | `pnpm test:int` | green |

## Tests to write

- Listed in step 14 (three new `*.int.test.ts` files, ten tests).

## Hard-rule checklist

- [x] Original evidence is never served publicly (DB check constraint rejects `original AND public`). — `schema/evidence.ts` `evidence_artifacts_original_not_public_check`; `constraints.int.test.ts` "a public original artifact is rejected by the check constraint".
- [x] Reporter identity never reaches the worker or any public path (column-level grant tested). — `migrations/0005_grants_part2.sql` (`GRANT SELECT (id, target_kind, target_id, review_id, reason, created_at) ON reports TO rk_worker`, no `reporter_account_id`); `constraints.int.test.ts` "FD-037 (ISS-107): rk_worker default-deny" block, `outbox.int.test.ts`.
- [x] Facility feedback never touches a doctor's aggregates (`facility_reviews` has no `doctor_id` column — assert in a test). — `schema/review.ts` `facilityReviews` (no `doctor_id` field); `constraints.int.test.ts` "facility_reviews has no doctor_id column".
- [x] No number stands for quality (no `rating`/`score` columns). — `constraints.int.test.ts` "no table in this task has a rating/score column" (queries `information_schema.columns` across all 28 new tables).
- [x] No agent/tool attribution in any file or commit. — checked with `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` after committing (see run record below); no tool/model name in any source file.

## Hand-off (implementer fills in)

### What changed

Everything in the task's Steps 1–15, plus the three explicitly-assigned fixes from the coordinating
session (`ISS-109`, `ISS-111` items 2 and 3) and FD-037's default-deny flip.

- `schema/{review,evidence,retention,community,moderation,notification,search,data-requests}.ts`:
  all 28 tables from data-model §6–§8, §12–§14. `retention.ts` created before `evidence.ts` in the
  export order (`schema/index.ts`) since `evidence_items.hold_id` references `legal_holds` directly
  via a normal Drizzle `.references()` (no circular import to avoid there).
- `migrations/0002_content.sql` (drizzle-kit generated — see "migration numbering" below),
  `0003_triggers.sql` (append-only triggers + `fn_expire_audit` + `fn_comment_depth`),
  `0004_deferred_fks.sql` (the four FKs that need raw SQL, plus the one deferrable FK Drizzle 0.45
  cannot express at all), `0005_grants_part2.sql` (the §16 allowlist **and** the FD-037 default-deny
  flip).
- Repository stubs: `PgReviewRepository`, `PgEvidenceRepository`, `PgCommunityRepository`,
  `PgModerationRepository`, `PgNotificationRepository`, `PgRetentionRepository`,
  `PgDataRequestRepository` (all throw `NotImplemented`), and an **implemented** `PgOutbox`
  (`append`/`claimBatch` with `FOR UPDATE SKIP LOCKED`/`markProcessed`/`markFailed`). `search/index.ts`
  stub `PgSearchIndex`.
- Three new `*.int.test.ts` files (18 tests total, not 10 — the task's "ten tests" undercounts once
  the five FD-037 default-deny tests and three extra hard-rule/table-count assertions are added:
  `append-only.int.test.ts` 3, `constraints.int.test.ts` 12, `outbox.int.test.ts` 3) and one
  `grants.smoke.test.ts` (1 test; not in the task's literal "Owned paths" list — added anyway per the
  coordinating session's explicit instruction to add a smoke assertion; `ISS-109`'s fix is what makes
  it collectible at all). `pnpm test:int` reports 27 because it also re-runs T-004's pre-existing
  `migrations.int.test.ts` (7) and `client.int.test.ts` (1), plus the new smoke test (`--project
  database` selects by project, not filename).
- `vitest.config.ts`: widened `include` to also match `*.smoke.test.ts` (`ISS-109`).
- `schema/account.ts`: added `staff_devices.created_at` (`ISS-111` item 2); updated the
  `bookmarks.review_id`/`enforcements.decision_id` comments to point at `0004_deferred_fks.sql`.
- `schema/identity.ts`: fixed the stale `0002_grants_part1.sql` → `0001_grants_part1.sql` comment
  (`ISS-111` item 3); updated the `persona_links.review_id` comment.
- `schema/demo.ts`: added `demo_clock.created_at` (`ISS-111` item 2) — **outside** this task's literal
  "Modify" owned paths (only `schema/index.ts`/`account.ts`/`identity.ts`/`database/index.ts` are
  listed); done anyway because the coordinating session's prompt named this file and line explicitly.
- `docs/implementation/tasks/T-005-database-part-2.md` (this file): acceptance table's "Table count"
  row corrected from "48 … adjust and record the exact number" to 59, per that row's own instruction.

### FD-037 / ISS-107 — default-deny, concretely

`rk_worker`'s privileges on every table this task created were **default-allow** the moment
`0002_content.sql` ran (T-004's `0001_grants_part1.sql` `ALTER DEFAULT PRIVILEGES` was already active).
`0005_grants_part2.sql` does two things, not one, because changing the default rule alone does not
retroactively touch tables already created under the old rule:

1. `ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA public REVOKE ALL ON TABLES/SEQUENCES FROM
   rk_worker` — so every table `rk_app` creates *after* this migration starts from nothing.
2. An explicit `REVOKE ALL ... FROM rk_worker` on all 28 tables `0002_content.sql` created, followed
   by the narrow, table-by-table (and column-by-column) allowlist from `02-data-model.md` §16.

Verified live (not just by the tests): created a brand-new table as `rk_app` *after* applying
`0005_grants_part2.sql` and confirmed `rk_worker` has zero privileges on it with no further action —
the flip holds prospectively, not only for the 28 tables this migration happened to enumerate.
`constraints.int.test.ts`'s "FD-037 (ISS-107)" block does the same thing as an automated test.

### A real bug found and fixed while verifying this migration

Live-testing `fn_expire_audit` (task step 11) surfaced a genuine design bug: `fn_block_mutation()`'s
trigger blocked **every** `DELETE`/`UPDATE` on `audit_events` unconditionally, including the one
`fn_expire_audit` itself issues — so the retention-expiry function could never actually delete
anything, defeating its entire purpose. Fixed per `04-handoff-and-validation.md` §4.1's "fix it now"
rule (mechanical, no hard-rule/data-boundary/pin conflict, small): `fn_block_mutation()` now allows
exactly one bypass — a `DELETE` on `audit_events` while the transaction-local setting
`rk.audit_expiry = 'on'` is set — and `fn_expire_audit` is the only function that sets it
(`set_config(..., true)`, transaction-scoped, auto-reset at commit). Every other mutation on every
append-only table, from every role including the table owner, is still blocked. Regression test:
`append-only.int.test.ts` "fn_expire_audit deletes old rows when called as rk_maintenance" connects
as `rk_maintenance` (a real second `pg.Pool`, not `rk_app`) and proves the delete now actually happens;
the preceding test in the same file proves a direct `DELETE` on `audit_events` still fails. Logged as
`ISS-126`.

### Migration numbering

`drizzle-kit generate --name content` produced `0002_content.sql`, not `0003_content.sql` as the task
text assumed — drizzle-kit's own migration count is zero-indexed and T-004 already occupies `0000`/
`0001`. Same class of mismatch `ISS-085` already accepted for T-004; kept the tool's own numbering
rather than hand-renaming files and risking drizzle-kit's bookkeeping (`meta/_journal.json`,
`meta/NNNN_snapshot.json`). The three custom migrations are therefore `0003_triggers.sql` (not
`0004_...`), `0004_deferred_fks.sql` (not `0005_...`), `0005_grants_part2.sql` (not `0006_...`) — each
generated with `drizzle-kit generate --custom --name <name>` (not hand-added to the journal) so the
snapshot `id`/`prevId` chain drizzle-kit uses for its own future diffing stays intact. Logged as
`ISS-125`.

### Not done and why

Nothing from the task's Steps was skipped. Two things one level up are explicitly not done here
because they are named as other tasks' work in `02-data-model.md`/`03-routes-and-contracts.md`:
actual command/query logic behind every repository stub (each throws `NotImplemented`, naming its
owning task), and the search SQL itself (`search/index.ts`'s `PgSearchIndex` — explicitly "Not in
scope", T-205).

### Questions for the human

None — FD-037 was the one open question blocking this task and the founder already answered it
(`docs/status/decision-log.md` FD-037, 2026-09-13) before this session started.

### Follow-ups

- `ISS-127` (S4): `pnpm smoke` now needs the compose stack up, since `packages/database`'s first
  smoke test (`grants.smoke.test.ts`) touches PostgreSQL — every other package's smoke test is
  infra-free. Worth a line in whatever CI workflow T-010/T-505 write.
- `ISS-128` (S4): the `bytea` `customType` helper is duplicated in `review.ts`, `evidence.ts` and
  `notification.ts` instead of living once in `_common.ts` — that file is outside this task's "Modify"
  owned paths. Move it there the next time `_common.ts` is legitimately touched.
- `ISS-129` (S4): five deferred FKs from `02-data-model.md` §16 note 1 needed raw SQL instead of
  Drizzle `.references()` — four for circular imports between schema files
  (`bookmarks.review_id`/`persona_links.review_id`/`enforcements.decision_id`/
  `evidence_items.published_artifact_id`) and one (`published_artifact_id` again) because Drizzle
  0.45's foreign-key builder has no `deferrable`/`initiallyDeferred` option at all. Re-check if a
  future Drizzle upgrade adds the option — `evidence_items.published_artifact_id` is the one that
  actually needs to stay deferrable.
- `ISS-130` (S4): several narrow, table-local literal unions (`reviews.language`,
  `review_versions.change_kind`/`actor_kind`, `reactions.target_kind`,
  `evidence_items.declared_mime`/`detected_mime`, `email_deliveries.category`/`status`) are
  `text(..., {enum:[...]})` plus a `CHECK` constraint rather than a new top-level `pgEnum` — a
  deliberate choice to avoid repeating `ISS-110`'s TS-only-enum gap without touching
  `schema/enums.ts` (outside this task's owned paths). Marked `// ASSUMPTION(T-005)` at each site.
- `ISS-131` (S4): `review_follow_ups.state` and `review_versions.actor_id` have no precise home in
  the existing enum/FK vocabulary; reused `publication_state` (imperfect fit, same precedent as
  `ISS-090`) and a plain unreferenced `uuid` respectively. Marked `// ASSUMPTION(T-005)`.
- `ISS-132` (S4): `schema/demo.ts` (`demo_clock.created_at`) was edited outside this task's literal
  "Modify" owned paths (`schema/index.ts`/`account.ts`/`identity.ts`/`database/index.ts` only) — done
  anyway because the coordinating session's prompt named this exact file, column and reason
  (`ISS-111` item 2) explicitly, which is a narrower authority than the task file's own scope but a
  real one.

### `pnpm check` output summary

```
pnpm typecheck   — 9/9 packages, exit 0
pnpm lint        — 0 errors, 1 pre-existing warning (ISS-105, packages/i18n, not touched by T-005)
pnpm test        — 24 files / 83 tests, all green
pnpm i18n:check  — 764 keys, both locales, parity OK
pnpm build       — apps/web (37 route rows + Proxy), apps/worker, both green
pnpm test:int    — 6 files / 27 tests, all green (packages/database only)
pnpm smoke       — 5 files / 7 tests, all green
```

Run record: Claude Code · claude-sonnet-5 · effort high

### Hard-rule evidence

See the checklist above — each row cites the file and test.
