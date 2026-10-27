# Functional Design — questions (U5 `cr-006-worker-auth-users-grant`)

Context:
- Unit U5 (kind `library`, size S, high risk) delivers CR-006 (`docs/implementation/tasks/CR-006-worker-auth-users-grant.md`) for story US1.1 (NFR11). Inputs read: `unit-of-work.md` (U5, and the open point at line 512), `unit-of-work-story-map.md` (US1.1 → U2, U3, U4, U5, U43, U44), `requirements.md` (NFR11; the CR-006 carry-forward under Open questions), `components.md` (Identity, Evidence and the worker boundary notes) and `contract-summary.md` (C1, C2, C3, C9, C10, C11, C12, C13, C15 and the worker-boundary ownership rule).
- Code read as it is on `main`: `packages/database/src/migrations/0000`–`0006` and `meta/_journal.json`, `migrate.ts`, `grants.smoke.test.ts`, `validator-probes.int.test.ts`, `constraints.int.test.ts`, `migrations.int.test.ts`, `outbox.int.test.ts`, `test-setup.ts`, `schema/review.ts`, `schema/community.ts`, and `apps/worker/src/` (the only job today is `outbox.relay`, which touches `outbox_events` and the `pgboss` schema).
- Live inventory: the privileges `rk_worker` actually holds were read from the catalogue of the freshly migrated `rogikotha_test` database on 2026-10-27, and zero-row statements were run as a real `rk_worker` session to confirm that PostgreSQL checks privileges even when no row is touched (`functional-spec.md` § 2).
- Later Units' task files read to judge each grant: T-101, T-205, T-301, T-302, T-303, T-304, T-309, T-401, T-403, T-404, T-405, T-410.

## Settled before this stage

These are decided by FD entries and are not asked again.

- **The `auth_users` grant is revoked (FD-041).** Option (a): a forward-only migration removes every privilege `rk_worker` has on `auth_users`, and the worker reads mail recipients from `email_deliveries.to_email_enc`. Option (b) is not taken.
- **`mail.send` belongs to T-101 (FD-071).** It reads the recipient from `email_deliveries.to_email_enc`, never from `auth_users`; the web tier fills `to_email_enc`. T-405 extends the handler later.
- **The six grants FD-050 lists are reviewed here (FD-050, review R-17).** Each is judged against the jobs the later Units plan, not only the code on `main`. A grant a planned Unit needs is kept until that Unit lands; only a grant no planned Unit needs is offered for revocation.
- **The review uses C13's deletion split and C15's job list (FD-077).** The worker's `data.delete` runs only evidence files, notifications and `email_deliveries`, search documents, and review and comment tombstones; everything else runs in the web transaction. No new worker grant comes from FD-077.
- **Three planned worker additions are known, not findings (FD-079, FD-080, FD-090).** `moderation_cases` SELECT, INSERT, UPDATE and `moderation_case_seq` USAGE (T-403); EXECUTE on the narrow persona-link deletion function (T-309, used by T-410's flow); `review_drafts` SELECT (`id`, `account_id`, `expires_at`) and DELETE (T-301, used by T-309). This Unit does not add them and revokes nothing because of them.
- **`account_preferences` is ruled on here as well.** Units Generation (open point at `unit-of-work.md` line 512) assigned `rk_worker`'s SELECT on `account_preferences`, which FD-050 does not list, to this review, and the planned file name `0006_revoke_worker_auth_users.sql` to the next free number.

## Settled in this design without a question

These follow from the FD entries, the project rules or the code, so they are design decisions, not open points. Each is explained in `functional-spec.md` § 13.

- **Two migrations, numbered 0007 and 0008.** `0007_revoke_worker_auth_users.sql` carries FD-041; `0008_worker_grant_review.sql` carries the FD-050 revocations. One file per decision keeps each revocation traceable to its FD entry. Both are generated as custom migrations through drizzle-kit, so the journal and snapshot files stay consistent.
- **The FD entry comes first.** The rulings below are written to `docs/status/decision-log.md` as the next free FD entry (FD-092 at the time of writing) before any migration is written, because a worker-grant change needs its FD entry first (project rule; C15 ownership rule).
- **`0005_grants_part2.sql` gets comment-only edits.** Its statements stay untouched (forward-only, task step 2). The comment that still calls the `auth_users` read "the one, deliberate, documented exception" is rewritten to point at FD-041 and the new FD entry (task step 4), and so are the comments above the two grants revoked below.
- **There is no ISS-140 tripwire to replace.** Task step 5 assumes an `it.fails` probe for ISS-140, but `validator-probes.int.test.ts` only holds the probes for ISS-139 and ISS-141. The Unit adds plain probes; the ISS-139 and ISS-141 tripwires stay untouched.
- **ISS-139 stays with its owner.** `evidence_items.original_filename_enc` is readable by `rk_worker` against §16 (ISS-139, S2, owned by T-304, and T-303 step 8 plans the same revoke). This Unit records it in the inventory but does not change it.
- **§16's stale file names are corrected.** §16 names `0004_roles.sql` and `0007_pgboss.sql`, which do not exist; the grants live in `0001`, `0005` and `0006`. The §16 amendment uses the real names, because a wrong file name is the same "trust whichever source you read first" trap ISS-140 came from.
- **No new dependency.** The Unit adds no library and touches no version, so no dependency-check entry is needed.

## Question 1

FD-050 grant: **`reviews` UPDATE limited to (`state`, `deleted_at`)** (`0005_grants_part2.sql:70`). Keep or revoke?

Why this is open: no worker job uses it today. Two planned Units need it: the worker entry of `review.deletionStep` (built by U22 T-302 under its FD-077 amendment, wired by U39 T-410 in `data.delete`, T-410 step 3: tombstone a review with discussion, soft-delete one without), and U29 T-309 step 6(e) (finish a held review's deletion once its hold ends, FD-079). Both are on the worker side of C13's split. FD-050 notes that the grant "sits uneasily with AD-6" (the worker holds no public-delete credentials); FD-077 has since put the review tombstones on the worker side by the owner's decision, and the grant stays limited to two columns.

A. **Keep it as it is** (recommended). The two planned worker steps need exactly these two columns; revoking now would only force an FD entry to grant it back when T-410 lands (R-17). §16 names it with its reason and its two Units. The worker still cannot change a review's text, title or any other column, and a probe proves that.
B. **Revoke it now** and let T-410 ask for it again with its own FD entry. This is narrower today, but it contradicts R-17 and FD-077, which counted on the existing grant ("no new worker grants").
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

FD-050 grant: **`review_versions` INSERT** (`0005_grants_part2.sql:75`). Keep or revoke?

Why this is open: the 0005 comment justifies it as "system-actor version rows for worker-driven transitions, e.g. retention expiry". No planned Unit writes such a row. The only writers of `review_versions` are `review.correct` (the author, web tier) and `review.redact` (a moderator, web tier), both in T-302 step 5. T-410's tombstone keeps the existing versions and writes none, and T-309's expiry job writes no review version. The `change_kind` values (`publish`, `correction`, `moderation_redaction`, `restore`) have no value for a worker transition at all.

A. **Revoke it** (recommended). No job today and no planned Unit needs it, so it is exactly the kind of grant FD-050 offers for revocation. It goes in the FD-050 migration (0008), and a probe proves the worker's insert is refused. If a later Unit needs a system version row, it asks with its own FD entry.
B. **Keep it** until T-410 and T-309 have landed, in case their Functional Design finds a use. This keeps an unused write privilege on an append-only history table for the length of the build.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

FD-050 grant: **`comments` SELECT and UPDATE (whole table)** (`0005_grants_part2.sql:80`). Keep, narrow or revoke?

Why this is open: no worker job uses it today. Planned users: the worker entry of `community.deletionStep` (built by U30 T-401 under its FD-077 amendment, wired by U39 T-410 in `data.delete`: tombstone the account's comments, which per T-401 step 4 (`comment.delete`) sets `state`, `tombstone`, an empty `body` and `deleted_at`); U29 T-309 step 6(e) (finish a held comment's deletion when its hold ends); and U34 T-405 `notification.deliver`, which reads the comment's public id for the `comment.posted` notice params (T-405 step 1). All are on the worker side. The UPDATE is not limited to columns today.

A. **Keep SELECT and UPDATE as they are** (recommended). The planned Units need both, and their exact column lists are T-401's and T-410's to settle; a column list guessed now would break T-410 at run time if its repository also writes, say, `updated_at`, and would need another FD entry to repair. §16 names the grant with its reason; narrowing it to columns is noted as a follow-up for T-410's hand-off.
B. **Narrow UPDATE now** to `state`, `tombstone`, `body` and `deleted_at`. Tighter, but it fixes a column list before the Units that write it exist.
C. **Revoke both.** T-410's comment tombstones and T-309's held-deletion step could not run, which contradicts FD-077 and FD-079.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

FD-050 grant: **`reports` SELECT on (`id`, `target_kind`, `target_id`, `review_id`, `reason`, `created_at`)** (`0005_grants_part2.sql:85`). Keep or revoke?

Why this is open: no worker job reads `reports` today, and no planned Unit does either. `report.filed` carries `caseCode`, `caseOpened`, `hidden` and `affectedAccountId` in its payload, so `notification.deliver` needs no read (C15, T-405 step 1). T-403's `moderation.openRepetitionCase` touches "nothing on reports or appeals", and T-403's own FD-080 acceptance row expects `select` on `reports` to be **denied** for `rk_worker`. Moderation's de-identify step runs in the web transaction (FD-077). Revoking changes one existing assertion: `constraints.int.test.ts` currently proves "other `reports` columns are readable" as a sign that the column allowlist works.

A. **Revoke it** (recommended). Nothing needs it, T-403 already expects the denial, and the worker then holds no privilege on `reports` at all, which also removes any chance that a later column grant brings `reporter_account_id` in with it. It goes in the 0008 migration. The one `constraints.int.test.ts` assertion is rewritten to expect the denial, with the reason recorded (functional-spec § 11).
B. **Keep it.** Nothing breaks, but the worker keeps read access to report reasons and targets that no job uses, and T-403's acceptance row will fail when it runs.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

FD-050 grant: **`account_profiles` SELECT on (`id`, `username`, `display_name`, `locale`, `status`)** (`0005_grants_part2.sql:94`). Keep, narrow or revoke?

Why this is open: no worker job uses it today, and `notification.deliver` takes its recipients from the payload (C2), so it does not need it. One planned Unit does: U39 T-410 step 4, where the worker's `data.export` writes `profile.json` and a `README.txt` in the account's locale. That is the worker side, though export is not part of C13's deletion split (deletion's account step is a web step, FD-077). The grant excludes `auth_user_id`, so it gives no path to `auth_users`. Note: T-410's export as written also needs data the worker cannot read at all (a finding for T-410, proposed as an ISS row); if T-410's Functional Design moves the export gathering to the web tier, this grant becomes unused and is revoked then.

A. **Keep the five columns** (recommended). A planned Unit needs them (R-17); `status` also lets a worker job skip a deleted account. §16 names the grant, its columns and its Unit, and says it is re-judged in T-410's Functional Design. A probe proves `auth_user_id` stays denied.
B. **Revoke it now.** T-410 would need an FD entry to get it back if its export stays in the worker.
C. **Narrow it to (`id`, `locale`, `status`).** The export could not write the username and display name into `profile.json`.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

FD-050 grant: **`legal_holds` SELECT** (`0005_grants_part2.sql:63`). Keep or revoke?

Why this is open: no worker job uses it today. Planned users: U29 T-309's hourly `retention.expire` (step 6: skip held originals, find holds that ended), the worker steps of U39 T-410's `data.delete` that keep held items (C13: "held items kept"), both through Retention's `retention.activeHold` queries, which run inside the worker process. §16's text gives the worker "DML on ... retention", which reads as wider than this read-only grant; FD-050 still lists it, so it is ruled on.

A. **Keep SELECT, with no write** (recommended). The expiry job and the deletion steps must see holds to respect them (FD-021, FD-079); staff place and release holds in the web tier. §16 is corrected to say SELECT only on `legal_holds`, and a probe proves an UPDATE is refused.
B. **Revoke it.** The worker could no longer tell a held record from an unheld one, so T-309 and T-410 would either delete held data or fail; this contradicts FD-079 and C3.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

Extra grant (not in FD-050's list, assigned here by Units Generation): **`account_preferences` SELECT (whole table)** (`0005_grants_part2.sql:96`). Keep or revoke?

Why this is open: no worker job uses it today. Planned users: U34 T-405 step 5, which extends U8 T-101's `mail.send` with a preference check at send time (a delivery becomes `suppressed` when the preference was turned off between queueing and sending) and renders the mail in the recipient's `interface_locale`; and U39 T-410 step 4, whose export writes `preferences.json`. Both run in the worker. The table holds only the locale and four email-category switches.

A. **Keep it** (recommended). T-405's send-time check needs it, and without it a preference turned off after queueing would still send (R-17). §16 names it with its reason and its Units.
B. **Revoke it** and move the send-time check into the web tier. T-405 has no web-side moment between queueing and sending, so the check would have to be dropped, which T-405's FD-071 acceptance row ("delivery `suppressed`, nothing sent") forbids.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

How does `02-data-model.md` §16 treat the worker grants that are **outside FD-050's list but that the planned jobs need**: SELECT on `personas`, `doctors`, `facilities`, `facility_branches`, `taxonomy_terms`, `taxonomy_aliases` and `config_versions`, INSERT on `audit_events` (all `0001_grants_part1.sql`), and SELECT on `reviews` (`0005_grants_part2.sql:68`)?

Why this is open: §16's text does not name them, yet `search.refresh` (T-205), `notification.deliver` (T-405), `moderation.openRepetitionCase` (T-403), `data.delete` and `data.export` (T-410) and the worker's configuration reads need them. Contract Design's ownership rule says "the worker's grants are the list in §16 as reviewed by CR-006"; a §16 that leaves them out would not be that list. This question changes no live privilege, only what §16 says.

A. **List every live worker grant in §16** (recommended): the FD-050 grants kept above, these reads and the audit insert, each with the jobs and Units that use it, plus the three planned additions (FD-079, FD-080, FD-090) and the planned removals owned by other Units (T-309's `fn_expire_audit` EXECUTE, the ISS-139 and T-303 evidence columns). §16 then is the complete list C15 relies on, and a future grant shows up as a change to it.
B. **Amend §16 only for the FD-050 grants kept**, the minimum task step 7 asks. The other grants stay real but undocumented, so §16 and the database still disagree.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

Each of these would change a worker grant (a data boundary) and has no FD entry, so this design does not decide it. The live grant stays as it is, and each is proposed as an `ISS-` row so the owner can rule on it. Details are in `functional-spec.md` § 9.

- **R1 — `reviews` SELECT covers the private `exact_date_enc` column.** The worker can read the encrypted exact treatment date. Narrowing the grant to columns would change the boundary; T-410's export may need the date for the account's own file.
- **R2 — `rk_worker` holds USAGE on `drizzle_migrations_id_seq`.** It comes from `0001_grants_part1.sql`'s `GRANT USAGE ON ALL SEQUENCES`, which ran when the migration bookkeeping sequence was the only sequence. Harmless (it cannot read the bookkeeping table), but beyond §16.
- **R3 — `search.refresh` (T-205) needs reads the worker does not have.** T-205 step 3 and step 7 build documents from `doctor_chambers` (chamber names) and `review_tags` (tag labels and tagged conditions), which `rk_worker` cannot read, and no FD names a grant for them.
- **R4 — `data.export` (T-410) needs reads the worker does not have.** T-410 step 4 exports decrypted drafts (`review_drafts.payload_enc`, which FD-090 keeps from the worker), reactions, bookmarks and facility reviews, and finds the account's own reviews and comments, which needs `persona_links`.
