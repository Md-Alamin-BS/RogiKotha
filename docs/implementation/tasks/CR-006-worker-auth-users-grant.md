# CR-006 — Resolve the `rk_worker` → `auth_users` grant contradiction

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — architecture-enforced foundation (privilege boundary) |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: the other vendor |
| Effort setting | `xhigh` |
| Estimate | 0.5–1 h agent once the founder has decided (the decision is the long pole) |
| Depends on | T-005 (merged — the grant is in `0005_grants_part2.sql`) |
| Parallel-safe with | anything not editing `packages/database/src/migrations/**` or `02-data-model.md` §16 |
| Status | **decided** — option (a), revoke (FD-041); the review of the other worker grants is added (FD-050) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-041** (round 5) — The owner's ruling is option **(a)**: revoke `rk_worker`'s `SELECT (id, email)` on `auth_users` in a forward-only migration; the worker reads recipients from `email_deliveries.to_email_enc`. Changes the Status row, "The decision the founder must make", steps 1–3 and the acceptance checks; option (b) is not taken.
- **FD-071** — This supersedes the note that `mail.send` belongs to T-405: T-101 builds the worker's `mail.send` handler, reading the recipient from `email_deliveries.to_email_enc`, never from `auth_users`, and T-405 extends it with preference checks, the `suppressed` status and the per-key params allowlist. The web tier fills `to_email_enc` when it queues the email. T-101 depends on this unit. Changes option (a)'s text and the acceptance checks.
- **FD-050** — `rk_worker`'s grants beyond `02-data-model.md` §16 in `0005_grants_part2.sql` (reviews `UPDATE(state, deleted_at)`, `review_versions` INSERT, comments SELECT/UPDATE, column SELECT on `reports` and `account_profiles`, `legal_holds` SELECT) are a known deviation and are reviewed in this unit together with FD-041. Adds step 7, an owned-path note and acceptance checks. The review is judged against the jobs planned in the later Units' task files, not only against the code on `main` (review R-17): a grant that a planned Unit needs is kept until that Unit lands, and only a grant no planned Unit needs is offered for revocation.

## Why this exists

`ISS-140` (S2, found by T-005's validator). Three documents and the database disagree about whether
the worker role may read account email addresses.

The database says yes:

```sql
-- packages/database/src/migrations/0005_grants_part2.sql:98
GRANT SELECT (id, email) ON auth_users TO rk_worker;
```

Proven live: as `rk_worker`, `select id, email from auth_users limit 1` succeeds.
(`auth_sessions`, `auth_accounts` and `auth_verifications` are correctly denied, so this is a
single-table, two-column exception, not a broad hole.)

The specifications say no, in three places:

- `02-data-model.md` §16 bullet 2 — "no privileges on `auth_*`".
- `02-data-model.md` §16 note 3 — "`rk_worker` has **no** privilege on `auth_users`; mail recipients
  travel encrypted in `email_deliveries.to_email_enc`".
- `01-conventions.md` §11 — "the worker gets only `DATABASE_URL_WORKER` (a role without access to
  `auth_*`, `persona_links`, `identity_reveals`)".

**This is not an implementer error.** T-005's own task file, step 12, explicitly instructed the
grant and asked for it to be documented in a SQL comment and the hand-off — both of which were done.
What did not happen is the other half of the rule: `04-handoff-and-validation.md` §5 and
`01-conventions.md` §15 say that when a task file contradicts a specification, the implementer takes
the **narrower reversible option** and logs the disagreement. The wider option was taken silently.

## Why it matters

`email_deliveries.to_email_enc` exists precisely so that the mail-sending process never touches
plaintext account email. With this grant in place, the one process the column was designed to keep
plaintext away from can read plaintext — so the encrypted column buys nothing against a compromised
worker. It is also the kind of contradiction that gets "fixed" in the wrong direction later: the
next agent will trust whichever of the four sources it happens to read first.

## The decision the founder must make

**Decided: (a)** — FD-041 (round 5). The two options stay below as the record of what was weighed.

Pick **(a)** or **(b)**. Both ship; leaving the documents and the database contradicting each other
is the only genuinely bad outcome.

**(a) Revoke the grant (recommended — restores the designed boundary).**
The worker reads recipients from `email_deliveries.to_email_enc` as `02-data-model.md` §16 note 3
already describes, decrypting with `APP_ENCRYPTION_KEY`. Cost: `mail.send` (built by T-101 and
extended by T-405, FD-071) must be written against `email_deliveries`, and whoever enqueues a mail job
must populate `to_email_enc` at enqueue time — which is the design the schema already anticipates
(the web tier fills it, FD-071). Nothing outside the worker changes.

**(b) Keep the grant and amend the documents.**
Record the exception in `02-data-model.md` §16 (both bullet 2 and note 3) and `01-conventions.md`
§11, with the reason. Cost: a permanent, documented narrowing of the worker's privilege boundary,
and `to_email_enc` becomes defence-in-depth rather than a boundary.

## Read first

1. `docs/implementation/02-data-model.md` §16 (bullet 2, note 3) and §13 (`email_deliveries`)
2. `docs/implementation/01-conventions.md` §11 and §15
3. `docs/implementation/tasks/T-005-database-part-2.md` step 12 and its Hand-off section
4. `docs/validation/T-005.md` — the `ISS-140` finding and the live proof
5. `packages/database/src/migrations/0005_grants_part2.sql` (the grant block, around line 98)

## Owned paths

- `packages/database/src/migrations/0006_*.sql` (new, forward-only) — option (a)
- `packages/database/src/grants.smoke.test.ts`, `packages/database/src/validator-probes.int.test.ts`
- `docs/implementation/02-data-model.md` §16, `docs/implementation/01-conventions.md` §11 — option (b) only (not taken, FD-041), and for any FD-050 grant the owner keeps (FD-050)
- `docs/status/decision-log.md` (the `FD-` entry recording the ruling), `docs/implementation/ISSUES.md`

## Steps

1. Read the founder's ruling in `docs/status/decision-log.md`: FD-041 chose option (a). Read FD-050
   and FD-071 as well.
2. **Option (a) — the decided option (FD-041):** add a forward-only migration `0006_revoke_worker_auth_users.sql` containing
   `REVOKE ALL ON auth_users FROM rk_worker;`. Do not edit `0005_grants_part2.sql` — migrations are
   append-only once merged.
3. **Option (b) — not taken (FD-041):** edit `02-data-model.md` §16 bullet 2 and note 3 and `01-conventions.md` §11 to
   state the exception and why, citing the `FD-` entry. Leave the migration alone.
4. Either way: update the SQL comment at `0005_grants_part2.sql:98` to point at the `FD-` entry.
5. Add a test that asserts the decided state as a real `rk_worker` session (not a catalogue read).
   Under option (a) this replaces the `it.fails` tripwire; under option (b) it pins the exception so
   a later migration cannot widen it further.
6. Close `ISS-140` as `fixed in CR-006` with which option was taken.
7. **Review the other worker grants (FD-050).** For each grant FD-050 lists — reviews
   `UPDATE(state, deleted_at)`, `review_versions` INSERT, comments SELECT/UPDATE, the column SELECT on
   `reports` and on `account_profiles`, and `legal_holds` SELECT — record two things. First, which
   worker job uses it today, or that none does. Second, which planned Unit needs it, read from the task
   files of the later Units (for example T-302, T-401, T-309, T-403, T-405 and T-410) and from Contract
   Design's worker-boundary decision; name the Unit and the task-file step, or write that no planned
   Unit needs it. Then record how the grant compares with `02-data-model.md` §16 and AD-6, and the
   options with a suggestion. A grant that a planned Unit needs is kept until that Unit lands, and the
   record says so; only a grant no planned Unit needs is offered for revocation. Ask the owner to rule
   on each grant; record the ruling as an `FD-` entry. Then apply it: a forward-only migration for
   every grant revoked, and a §16 amendment with the reason for every grant kept. Add a
   real-`rk_worker` probe for each grant to `validator-probes.int.test.ts`.

## Acceptance checks

| Check | Expected |
|---|---|
| A real `rk_worker` session runs `select id, email from auth_users limit 1` | permission denied — option (a), FD-041 (option (b) not taken) |
| `rk_worker` on `auth_sessions`, `auth_accounts`, `auth_verifications` | permission denied (unchanged either way) |
| `02-data-model.md` §16 and `01-conventions.md` §11 vs the live database | agree — no remaining contradiction |
| `docs/status/decision-log.md` | carries the `FD-` entry the SQL comment cites |
| FD-071: the recipient path T-101's `mail.send` handler uses | a real `rk_worker` session runs `select id, to_email_enc from email_deliveries limit 1` | succeeds (no `auth_users` access needed to send mail) |
| FD-050: every listed grant reviewed | read the decision log and this unit's hand-off | one owner ruling (keep or revoke, with reason) for each of the six grants FD-050 lists, recorded as an `FD-` entry; each grant's record names the worker job that uses it today and the planned Unit (with task-file step) that needs it, or says no planned Unit does; no grant is offered for revocation while a planned Unit needs it (R-17) |
| FD-050: live database matches the rulings | a real `rk_worker` session probes each of the six grants | each revoked grant → permission denied; each kept grant → succeeds, and `02-data-model.md` §16 names it with its reason |
| `pnpm check`, `pnpm test:int` | exit 0 |

## Hand-off

_(filled by the implementer)_
