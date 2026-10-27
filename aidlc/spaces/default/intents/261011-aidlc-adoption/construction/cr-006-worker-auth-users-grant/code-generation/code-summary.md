# Code summary — U5 `cr-006-worker-auth-users-grant` (CR-006, high risk)

## What was built

- **FD-092** in `docs/status/decision-log.md`, written before any SQL (BR2.3). It rules on the FD-050 grants WG2–WG8: WG3 and WG5 are revoked; WG2, WG4, WG7 and WG8 are kept; WG6 is kept **provisionally**, to be re-judged in T-410's Functional Design. It lists the grants outside FD-050 (WG9–WG12) in §16 as **live, not ratified**, and leaves R1–R4 undecided. It records that the rulings were "decided by the agent on the owner's standing instruction of 2026-10-27; awaiting the owner's confirmation". It does not ratify WG9–WG12.
- **`0007_revoke_worker_auth_users.sql`** (FD-041): `REVOKE ALL ON auth_users FROM rk_worker;`.
- **`0008_worker_grant_review.sql`** (FD-050, FD-092): `REVOKE ALL ON reports FROM rk_worker;` and `REVOKE INSERT ON review_versions FROM rk_worker;`. Its header lists the five grants kept and why.
- Both migrations were generated with `drizzle-kit generate --custom` (drizzle-kit 0.31.10) from `packages/database`, so the tool wrote the journal entries (`idx 7`, `idx 8`) and snapshots. The journal `when` values are 1793137277177 and 1793137331033, both later than 0006's 1789331720026. Each snapshot equals 0006's except for its `id` and `prevId`.
- **Comment-only edits** in `0005_grants_part2.sql` above the `review_versions`, `reports` and `auth_users` grants. A check of the diff found no changed non-comment line.
- **Probes** P1–P8 and P10–P20 in a "CR-006" block in `validator-probes.int.test.ts`. P3 checks every `auth_users` column (read from `information_schema.columns` as the owner), all seven table privileges, and that `column_privileges` has zero rows. **P9** is in `grants.smoke.test.ts`.
- **One rewritten assertion** in `constraints.int.test.ts`: "is denied on every reports column, reporter_account_id included".
- **`02-data-model.md` §16** rewritten as the complete `rk_worker` list (spec § 12 outline a–h), with the review's "live, not ratified" and "provisional" wording and PR1–PR3 marked as still live. The stale file names are corrected (heading, note 1, note 2), and note 3 is unchanged.
- **`ISSUES.md`**: ISS-140 closed (`fixed in CR-006 — option (a), FD-041`); ISS-233 to ISS-242 added.
- **Hand-off**: the task file's Hand-off section, and `docs/implementation/handoffs/CR-006.md`.

## Files changed

| Path | Change |
|---|---|
| `packages/database/src/migrations/0007_revoke_worker_auth_users.sql` | new (generated, then filled) |
| `packages/database/src/migrations/0008_worker_grant_review.sql` | new (generated, then filled) |
| `packages/database/src/migrations/meta/_journal.json` | two entries added by drizzle-kit |
| `packages/database/src/migrations/meta/0007_snapshot.json`, `0008_snapshot.json` | new (drizzle-kit) |
| `packages/database/src/migrations/0005_grants_part2.sql` | comments only |
| `packages/database/src/validator-probes.int.test.ts` | CR-006 block, 19 tests |
| `packages/database/src/grants.smoke.test.ts` | P9, 1 test |
| `packages/database/src/constraints.int.test.ts` | one assertion rewritten |
| `packages/database/src/migrations.int.test.ts` | migration count 7 → 9 (not in the plan, see Deviations) |
| `docs/status/decision-log.md` | FD-092 |
| `docs/implementation/02-data-model.md` | §16 |
| `docs/implementation/ISSUES.md` | ISS-140 closed; ISS-233 to ISS-242 |
| `docs/implementation/tasks/CR-006-worker-auth-users-grant.md` | Hand-off |
| `docs/implementation/handoffs/CR-006.md` | new |
| `code-generation/unit-test-instructions.md` (this record) | the verified unit-scoped command (Step 2) |

## Key implementation decisions

- **Table-level revokes.** Revoking privileges on a table also removes the column privileges on each of its columns, so one statement removes the `(id, email)` grant and the six-column `reports` grant. The mutation test and P3 confirm this.
- **Zero-row probes as the real role.** Each probe opens its own pool on `workerUrlForTestDb()` and ends it in `finally`, through one small `asWorker` helper in the test file. Denied probes match `/permission denied/i`.
- **P3 reads the column list as the owner.** `information_schema.columns` hides columns from a role that holds nothing on them, so reading the list as `rk_worker` after the revoke would give an empty loop. The test also asserts that `id` and `email` are in the list.
- **P12 inserts from no table** (`insert into review_versions (review_id) select null::uuid where false`). Only the INSERT privilege is checked, so the probe cannot pass on a missing SELECT.
- **P8** asserts that the journal contains 0007 and 0008, that the applied row count equals the journal length, and that it is 9.
- The FD-092 wording follows the design review: WG6 is provisional, WG9–WG12 are live and not ratified, and WG8's T-410 half is re-judged with WG6 (review finding R-02's note).

## Test results

**Step 1 search** (spec § 16, review R-05), before 0008:

```
grep -rnE "\breports\b|reviewVersions|review_versions" apps/worker/src packages/*/src --include=*.ts --include=*.tsx --include=*.sql -l
```

`apps/worker/src` has 0 hits. The 20 hits in `packages/*/src` are schema (`schema/moderation.ts`, `schema/review.ts`), migrations, the seed (runs as `rk_app`), contracts and i18n (`reports.read` capability names), test-support fakes and corpus, and tests (`constraints.int.test.ts` and `outbox.int.test.ts`, which already expect the `reporter_account_id` denial). The only code that connects as the worker is `apps/worker/src/container.ts`, whose one job, `outbox.relay`, touches `outbox_events` and `pgboss`. Nothing reads `reports` or inserts into `review_versions` as `rk_worker`.

**Baseline** (Bolt branch at `53e3dc3`, compose PostgreSQL up):

| Command | Result |
|---|---|
| `pnpm check` | exit 0; typecheck 9/9; lint 0 errors, 1 existing warning (`packages/i18n/src/routing.ts:17`); `vitest run` 46 files, 216 passed + 4 expected-fail (220); i18n 781 keys; `next build` 37 route rows |
| `pnpm smoke` | exit 0; 9 files, 15 tests |
| `pnpm test:int` | exit 0; 9 files, 32 passed + 4 expected-fail (36) |
| `pnpm test:int validator-probes grants.smoke constraints` | 3 files, 13 passed + 2 expected-fail (15) |

**After:**

| Command | Result |
|---|---|
| `pnpm check` | exit 0; typecheck 9/9; lint 0 errors, the same 1 warning; `vitest run` 46 files, 236 passed + 4 expected-fail (240); i18n 781 keys; `next build` 37 route rows |
| `pnpm smoke` | exit 0; 9 files, 16 tests (+1: P9) |
| `pnpm test:int` | exit 0; 9 files, 52 passed + 4 expected-fail (56) (+20: P1–P8, P10–P20, P9) |
| `pnpm test:int validator-probes grants.smoke constraints migrations` | exit 0; 4 files, 40 passed + 2 expected-fail (42) |

No existing assertion was removed or skipped. One assertion was rewritten (`constraints.int.test.ts`; reason: FD-092 revokes the `reports` column allowlist its positive control used, and the allowlist mechanism stays proven by P16 and P17). One count was changed (`migrations.int.test.ts`, 7 → 9). The ISS-139 and ISS-141 `it.fails` tripwires are untouched.

**Mutation test** (every test can fail): with the three `REVOKE` statements replaced by `SELECT 1;`, `pnpm test:int validator-probes grants.smoke constraints` exited 1, with 7 failed, 26 passed and 2 expected-fail. The failures were P1, P2, P3 (`id SELECT: expected true to be false`), P12 (`promise resolved "Result{ command: 'INSERT' … }"`), P15, the rewritten `constraints` assertion, and P9. With the statements restored, everything passed again.

**Migrations applied:**

- `rogikotha_test` still held 0000–0006 from the baseline run. `pnpm db:migrate` against it (`DATABASE_URL` set to the test URL) exited 0. `drizzle_migrations` rows 1–7 kept their hashes and timestamps (row 6, `0005`, kept its old hash after the comment edit), and rows 8 and 9 were added (`created_at` 1793137277177, 1793137331033).
- The development database `rogikotha` had no `drizzle_migrations` table (empty). `pnpm db:migrate` applied all 9 rows; a second run applied nothing (still 9). Catalogue afterwards: `auth_users.email` SELECT false, `reports.reason` SELECT false, `review_versions` INSERT false, `reviews.state` UPDATE true.
- The integration reset (`pnpm test:int`) applies 0000–0008 from empty; P8 is green.

**Live catalogue check of §16** (`rogikotha_test`, as `rk_app`): every `rk_worker` table, column, sequence and function privilege in `public` matches the new §16 text. That is the 13 DML tables; `legal_holds`, `reviews`, `comments`, `account_preferences`, `personas`, `doctors`, `facilities`, `facility_branches`, `taxonomy_terms`, `taxonomy_aliases` and `config_versions` reads; `audit_events` INSERT; `reviews (state, deleted_at)` UPDATE; `account_profiles` five columns; `drizzle_migrations_id_seq`; and `fn_expire_audit`. Nothing on `auth_users`, `reports` or `review_versions`. §16 agrees with the live database, except the listed planned removals PR1–PR3, each named with its owning Unit.

**Coverage:** coverage not measured yet (T-010).

## Issues

- Closed: **ISS-140** (`fixed in CR-006 — option (a), FD-041`).
- Found in U5 CR-006: **ISS-233** (F1, S2, T-205), **ISS-234** (F2, S2, T-410), **ISS-235** (F3, S3, T-410), **ISS-236** (F4, S3, T-309), **ISS-237** (F5, S4, T-302/T-410), **ISS-238** (F6, S4, this Unit), **ISS-239** (F7, S4, T-303), **ISS-240** (R1, S4, owner), **ISS-241** (R2, S4, owner), **ISS-242** (S4, fixed here: the `migrations.int.test.ts` count).
- Read and left untouched: ISS-139, ISS-141, ISS-148.

## Deviations and assumptions

- **`migrations.int.test.ts` was not in the plan** (`ISS-242`). Its "every migration applied" assertion expected exactly 7 rows, so the two new migrations would have turned `pnpm check` red. I took the narrower option: change the count to 9 and add one comment line, the same mechanical change T-009 recorded. No data boundary changes.
- **Step 2 command form.** `pnpm test:int -- validator-probes grants.smoke constraints` runs all 9 files, because the `--` reaches Vitest and its filters are dropped. The recorded command leaves out the `--`. After the change, `migrations` is added to the filter.
- **Step 5 "already applied" check.** The development database was empty, so it could not show 0000–0006 as already applied. That check ran against `rogikotha_test`, which held 0000–0006. The development database was migrated from empty. It is now migrated but **not seeded**; `pnpm demo` seeds it.
- **Step order.** The 0005 comment edits (Step 6) were made before the Step 5 apply, so the already-migrated check ran after the comment edit, as spec § 16 asks.
- **§16 note 1.** Besides the heading and note 2, note 1's `0005_deferred_fks.sql` was corrected to `0004_deferred_fks.sql`, under the plan's "correct the stale file names".
- **Formatting.** The four test files fail `prettier --check`, but so do their `HEAD` versions. They were not reformatted, to keep the diff to this Unit's lines. Prettier joins the gate with T-010.
- **Dates.** The new ISS rows are dated 2026-10-28, the day they were written. FD-092 keeps the standing instruction's date, 2026-10-27.
- Not written here: the 3–5 adversarial tests (a separate agent, high-risk step 5) and the owner's written sign-off (pending).
