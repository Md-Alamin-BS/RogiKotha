# Unit test instructions — U5 `cr-006-worker-auth-users-grant`

## Framework

Vitest 4, the database project (`*.int.test.ts`) against the isolated `rogikotha_test` database, reset to an empty, freshly migrated schema on every run (existing setup in `packages/database/src/test-setup.ts`). Every probe opens its own pool on the real `rk_worker` URL (`workerUrlForTestDb()`) and ends it in `finally`, like the existing grant tests.

## Run this Unit's tests

```bash
pnpm infra:up
pnpm test:int
pnpm smoke
```

`code-summary.md` records the exact filtered command used for the three touched test files (`validator-probes.int.test.ts`, `grants.smoke.test.ts`, `constraints.int.test.ts`). Then `pnpm check`.

## What to cover (spec § 11)

| Probe | Expected | Rules |
|---|---|---|
| P1, P2: `select id, email` and `select id` from `auth_users` | permission denied | BR1.1 |
| P3: catalogue, every `auth_users` column and the table | no privilege; zero `column_privileges` rows | BR1.1 |
| P4: `auth_sessions`, `auth_accounts`, `auth_verifications` | permission denied | BR1.2 |
| P5: `select id, to_email_enc from email_deliveries` | succeeds | BR1.3 |
| P6, P7: no role membership, no `SET ROLE`, no view or definer function reaching `auth_users` | none | BR1.4 |
| P8: `drizzle_migrations` rows equal journal entries (9) | equal | BR2.4 |
| P9 (smoke): `select email from auth_users` | permission denied | BR5.3 |
| P10–P20: each FD-050 ruling and the limit of each kept narrow grant | as in spec § 11 | BR4.1–BR4.7, BR5.2 |
| `constraints.int.test.ts`: every `reports` column denied, `reporter_account_id` included | permission denied | BR4.4 |

Denied probes expect a rejection matching `/permission denied/i`, so a "does not exist" error cannot pass them. Zero-row statements (`where false`) still hit the privilege check, so no fixtures are needed and each probe can fail.

## Adversarial tests (high-risk step 5)

Written and run by a separate agent after Code Generation, 3–5 tests from the angles in spec § 11 (role escalation, `PUBLIC` column grants, join paths to an email, a later view or function, a replayed migration).

## Coverage

Not measured yet: the 80% floor arrives with T-010 (U3), which has not run yet (team practice).

## Mocking and test data

None: real roles against the real test database; zero-row statements.
