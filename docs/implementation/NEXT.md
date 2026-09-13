# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: T-005 implementer (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-005, T-207a
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-005 (database part 2) finished (done), queued for validation.** Branch
  `task/t-005-database-part-2`. `pnpm check` green (24 files/83 tests, i18n 764 keys, build); `pnpm
  test:int` green (6 files/27 tests); `pnpm smoke` green (5 files/7 tests, one new file —
  `ISS-109` fixed). 59 tables in `public` now (30 T-004 + 28 T-005 + `drizzle_migrations`).
- **FD-037 (ISS-107) implemented and tested**: `rk_worker`'s default privileges are now
  default-deny (`migrations/0005_grants_part2.sql`); verified live and by
  `constraints.int.test.ts`'s "FD-037 (ISS-107)" block, including on a table created *after* the
  flip. `ISS-108`/`ISS-110`/`ISS-112`/`ISS-113` still open (owned by later tasks, unchanged by T-005).
- T-207a status: not touched by this session (different worktree, different lane); check its own
  handoff/BUILD-LOG entry for lane B's state.

## Next, per lane (human-readable)
- **Lane A:** T-005 → validate → merge, then T-007 (`packages/test-support`) unlocks, then T-009
  (worker skeleton — only needed `outbox_events`, which T-005 just created, so it can start
  immediately after T-005 merges, without waiting for T-007).
- **Lane B:** unchanged from before this session — see T-207a's own status.

## Blockers
- None for lane A. T-005 is ready for an independent validator session (different vendor for M1 is
  preferred per master-plan §7, but same-vendor validation is allowed with the loop-mode rule in
  `04-handoff-and-validation.md` §3.2).

## Questions for the human
- None new from T-005. FD-037 was the one open question blocking it and was already answered.
- Still open from before: `AGENTS.md` vs `LOOP.md` §0.1 attribution-in-records tension; `ISS-050`,
  `ISS-096`, `ISS-099`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`; D-001 browser walkthrough before
  T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`); `CR-004` (theme-toggle announcements) still needs
  queueing.
