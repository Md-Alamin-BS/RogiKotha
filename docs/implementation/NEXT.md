# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-004, T-008
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- T-001, T-002, T-006, T-003 all merged; `pnpm check`/`pnpm smoke` green on `build/demo`.
  T-004 (lane A) and T-008 (lane B) unblocked, queued, in progress in their own worktrees now.
- **CR-002 merged** (`e41c0e8`): a second, parallel T-003 validation found `ISS-077`/`ISS-078` (S2)
  after the first had already merged PASS (`docs/validation/T-003-round-2.md`). Founder authorized
  fixing both directly, plus opportunistically `ISS-055`/`ISS-082`/`ISS-083`. New policy for "small
  defect outside every queued task's owned paths" in `04-handoff-and-validation.md` §4.1 (linked
  from `LOOP.md` §2/§5). `pnpm check`/`smoke` re-verified green after merge. Record:
  `docs/implementation/handoffs/CR-002.md`.

## Next, per lane (human-readable)
- **Lane A:** implement T-004 → T-005 → T-007.
- **Lane B:** implement T-008 → (T-009 once T-005 lands `outbox_events`).

## Blockers
- None.

## Questions for the human
- **T-003 residue not fixed by CR-002:** `ISS-079`/`ISS-080` (S3), `ISS-081` (S4, `zod`/`uuid`
  manifest vs. pin table), `ISS-074` (gender enum), `ISS-075` (`uuid@14` bump). Also: should an
  implement/validate turn ever run in two terminals without `Lane A`/`Lane B` — that's what let two
  sessions validate T-003 at once.
- **Bilingual review requested:** T-006's `notif.*`/`admin.config.*` wording (`ISS-050`,
  `docs/validation/T-006.md`).
- **D-001 walkthrough still wanted** before Lane B starts T-102/T-103 (`ISS-029`, `ISS-028`,
  `ISS-037`).
- **Minor:** `ISS-054`, `ISS-056` (task-file typos).
