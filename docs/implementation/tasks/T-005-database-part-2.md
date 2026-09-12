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
| Table count | `psql … -c "select count(*) from pg_tables where schemaname='public'"` | 48 (24 from T-004 + 24 here; adjust and record the exact number) |
| Generated column | `psql … -c "\d search_documents"` | `tsv … generated always as … stored`; two GIN indexes |
| Append-only | `pnpm test:int -t append_only` | passes |
| Column-level worker grant | `psql "$DATABASE_URL_WORKER" -c "select reporter_account_id from reports"` | `permission denied` |
| Worker can read report basics | `psql "$DATABASE_URL_WORKER" -c "select id, reason from reports"` | ok (0 rows) |
| Typecheck | `pnpm typecheck` | exit 0 |
| Integration suite | `pnpm test:int` | green |

## Tests to write

- Listed in step 14 (three new `*.int.test.ts` files, ten tests).

## Hard-rule checklist

- [ ] Original evidence is never served publicly (DB check constraint rejects `original AND public`).
- [ ] Reporter identity never reaches the worker or any public path (column-level grant tested).
- [ ] Facility feedback never touches a doctor's aggregates (`facility_reviews` has no `doctor_id` column — assert in a test).
- [ ] No number stands for quality (no `rating`/`score` columns).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
