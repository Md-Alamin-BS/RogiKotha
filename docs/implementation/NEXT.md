# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-004, T-008
recommended: GPT-5.6 Terra (alt: Claude Sonnet 5 or Opus 4.8, new session) · effort high
```

## State of the build
- T-001, T-002, T-006, T-003, `CR-002` (`e41c0e8`, fixed `ISS-077`/`ISS-078` + policy in
  `04-handoff-and-validation.md` §4.1) all merged.
- **T-004**/**T-008** both `done`, pushed, self-verified green (`pnpm check`/`pnpm smoke`, plus
  `test:int` for T-004 and `impeccable detect` for T-008) — ready for a fresh validator.
- T-004 hit `ISS-084` (native Windows Postgres shadowed Docker's port 5432) — founder remapped
  compose to `5433` (`infra/compose/**`/`.env*`, direct commit, outside T-004's owned paths).
  Unblocking it surfaced 2 more real bugs, fixed: `ISS-092` (S1, `db:reset` could silently skip
  re-migrating), `ISS-093`.
- T-004/T-008 collided on `ISS-084` onward (parallel worktrees, same base) — T-008's 12 rows
  renumbered to `ISS-094..105` (IDs only, no content change).

## Next, per lane (human-readable)
- **Lane A:** validate T-004 → merge → T-005 → T-007.
- **Lane B:** validate T-008 → merge → T-009 (once T-005 lands `outbox_events`).

## Blockers
- None.

## Questions for the human
- **T-004:** rebase onto current `build/demo` needs one more `pnpm approve-builds --all` for
  `esbuild` (drizzle-kit pulls it in; not yet in CR-002's `allowBuilds` block).
- **T-008:** `ISS-096` (`admin.demoNote` i18n gap), `ISS-099` (`/terms`/`/privacy` reuse
  `nav.about`) — open founder decisions, not blockers.
- **T-003 follow-up:** gender enum in `schemas/search.ts` (`ISS-074`)? `uuid@14` bump (`ISS-075`)?
- **Bilingual review requested:** T-006's `notif.*`/`admin.config.*` wording (`ISS-050`).
- **D-001 walkthrough still wanted** before T-102/T-103 (`ISS-029`, `ISS-028`, `ISS-037`).
- **Minor:** `ISS-054`, `ISS-056` (task-file typos).
