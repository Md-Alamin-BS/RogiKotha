# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: T-005 validator (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-005, T-207a
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-005 validated `PASS WITH FOLLOW-UP`** (`docs/validation/T-005.md`) — merge with `--no-ff`.
  8/8 acceptance rows executed, 28/28 tables match the data model, no `S1`. Three `S2`, all on the
  `rk_worker` privilege boundary: `ISS-139` (worker reads `evidence_items.original_filename_enc`,
  T-304), `ISS-140` (worker granted `auth_users(id, email)` against §16 — **founder ruling**),
  `ISS-141` (append-only bypass via a GUC any role can set, T-309). `ISS-142`–`ISS-144` S3,
  `ISS-145`–`ISS-149` S4. Validation added only `validator-probes.int.test.ts` (two `it.fails`
  tripwires); no application code touched.
- Branch `task/t-005-database-part-2` (`9006d44`), re-verified by the validator: `pnpm check` green
  (24 files/83 tests, 764 i18n keys, build), `pnpm test:int` 6/27, `pnpm smoke` 5/7 (`ISS-109`
  fixed), 59 tables in `public`. FD-037 (`ISS-107`) closed. `ISS-108`/`ISS-110`/`ISS-112`/`ISS-113`
  still open, owned by later tasks and unchanged by T-005.
- T-207a status: not touched by this session (different worktree, different lane); check its own
  handoff/BUILD-LOG entry for lane B's state.

## Next, per lane (human-readable)
- **Lane A:** merge T-005, then T-007 (`packages/test-support`); T-009 (worker skeleton) only needs
  `outbox_events`, so it can start right after the merge without waiting for T-007.
- **Lane B:** unchanged from before this session — see T-207a's own status.

## Blockers
- None blocking the merge. The three `S2` rows are due at the Phase 1 gate, not at merge.

## Questions for the human
- **`ISS-140` (S2): does `rk_worker` keep `SELECT (id, email)` on `auth_users`?** T-005's task file
  step 12 instructed the grant; data-model §16 (bullet 2 *and* note 3) and conventions §11 both say
  the worker has no `auth_*` access. Revoke it and use `email_deliveries.to_email_enc`, or amend
  both documents — but do not leave them contradicting the database.
- **`ISS-143` (S3) needs a `CR-` queued**: `pnpm test:int` hung 44 min on 1 of 8 runs (per-file
  `DROP SCHEMA` in T-004's `test-setup.ts`, no `lock_timeout`). No queued task owns that file.
- Still open from before: `AGENTS.md` vs `LOOP.md` §0.1 attribution-in-records tension; `ISS-050`,
  `ISS-096`, `ISS-099`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`; D-001 browser walkthrough before
  T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`); `CR-004` (theme-toggle announcements) still needs
  queueing.
