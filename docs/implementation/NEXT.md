# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-14 · by: T-007 implementer (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-009, CR-005
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-007 done, queued for validation** (`task/t-007-test-support-and-seed`, not yet merged — see
  `docs/implementation/handoffs/T-007.md`). `packages/test-support` now has the full typed corpus,
  13 builders, 16 fakes, and an idempotent seed verified live: `pnpm db:reset && pnpm db:migrate &&
  pnpm db:seed` twice (604 rows then 0), row counts match every acceptance number (doctors 6,
  branches 5, reviews 12, facility_reviews 8, comments 10, evidence_items 7, cases 5, accounts 80),
  seeded password hashes verify with `@node-rs/argon2`. `pnpm check` **exit 0** on the branch
  (37 files/146+2xf, i18n 777 keys, both builds); `pnpm smoke` 7/10 (+1 file/+1 test).
- **CR-005 status unknown** — this session did not touch `packages/contracts` or `apps/web`; its
  `06-change-requests.md` row still says `needs queueing`. Whoever picks it up should check
  `BUILD-LOG.md` for anything since `21:40 2026-09-13` before assuming it is still untouched.
- 15 new `ISS-155`..`ISS-169` rows (T-007). The one open question for the human: `ISS-158` —
  `05-demo-storyboard.md`'s seeded-accounts table names `anon_author_r4` as the anonymous-alias
  proof, but review r4 is `pseudo` (`r_ahmed`) in the actual prototype data; the seed correctly uses
  the real anonymous reviews (r2/r8/r12) instead, so this is a doc-vs-data mismatch, not a bug.

## Next, per lane (human-readable)
- **Lane A — T-009** (worker skeleton: pg-boss, job registry, outbox relay). Depends on T-004/T-005
  (both merged); does not depend on T-007. First three things: (1) `git fetch origin`, branch from
  `build/demo` after T-007 merges (or now, if T-007's validator is mid-review — T-009 does not touch
  `packages/test-support`); (2) read `tasks/T-009-worker-skeleton.md`; (3) `packages/database`'s
  `PgOutbox` (already implemented, `repositories/outbox.ts`) is what the relay claims from.
- **Lane B — CR-005** (strip `.js` import suffixes from `packages/contracts/src`) — unchanged from
  last turn, see `06-change-requests.md`.
- After T-007 validates: T-101 (Better Auth) unblocks — its adapter must use the **same** Argon2id
  parameters T-007 already pinned (`m=65536, t=3, p=1`, `seed-accounts.ts`) or seeded accounts stop
  verifying. T-201 also unblocks once T-007 validates, opening T-202/T-203/T-206/T-207 Half B.

## Blockers
- None for T-009. CR-005 blocks any Phase 2+ page that needs a real `@rogikotha/contracts` view model.

## Questions for the human
- **`ISS-158`** (new, T-007): correct `05-demo-storyboard.md`'s `anon_author_r4` reference, or leave
  it as documented drift? See `docs/implementation/handoffs/T-007.md`.
- **`ISS-140` / `CR-006`** (S2, still needs your ruling): `rk_worker` grant on `auth_users(id, email)`
  contradicts `02-data-model.md` §16 twice. Options in `tasks/CR-006-worker-auth-users-grant.md`.
- **`CR-007`** (`ISS-143`): approve queueing the `pnpm test:int` hang fix; no decision needed.
- **`CR-004`**: theme toggle screen-reader silence (`ISS-122`) — localize, exempt, or drop?
- **`AGENTS.md` vs `LOOP.md` §0.1`** attribution-record conflict — still unresolved, one sentence
  would settle it.
- **Still open, owned by later tasks:** `ISS-139` (T-304), `ISS-141` (T-309), `ISS-144`/`ISS-145`
  (T-009 — read these before writing the outbox relay), `ISS-108` (T-104), `ISS-112`/`ISS-166`
  (T-101 — Better Auth mapping *and* the `@node-rs/argon2` const-enum import gotcha), `ISS-157`/
  `ISS-164` (T-201/T-304/T-309 schema gaps), `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`, `ISS-054`,
  `ISS-056`, D-001 walkthrough (`ISS-029`/`ISS-028`/`ISS-037`).
