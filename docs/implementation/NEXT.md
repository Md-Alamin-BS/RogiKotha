# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

> ⚠️ **AI-DLC migration in progress.** Do not start implementation: show the human this warning and ask
> first. The resources are being converted into AI-DLC artifacts — see `docs/aidlc-migration/README.md`.
> Keep this banner when rewriting this file until that migration says **Status: DONE**.

**Updated:** 2026-10-11 · by: validate + merge session (Claude Code · claude-opus-5-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: CR-009
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-009, CR-008 and CR-010 merged into `main`** (`ac49e3d`, `12dd1be`, `bdf8518`); `pnpm check`,
  `pnpm smoke` (8 files / 11) and `pnpm test:int` (32 + 4 expected-fail) green after each merge.
- **Phase 0 lane A:** T-010 is the last task; **CR-009 must run alone first** (it rewrites every
  import in `packages/database/src`). CR-011 (T-009 follow-ups) is due before the first real job handler.
- The old loop is frozen while AI-DLC is adopted; the next build work runs through `/aidlc`.

## Questions for the human
- None open. The 2026-10-11 questions were decided by delegation from the owner: FD-038..FD-044 in
  `docs/status/decision-log.md`; model ids in records, merge style, coverage and the
  `../rogikotha-gate4` worktree in `docs/aidlc-migration/RUNBOOK.md` §B (D8, D9, D10, D16).

## Open, owned by later tasks
`ISS-139`/`ISS-181`/`ISS-182` (T-304), `ISS-141` (T-309), `ISS-108`/`ISS-206` (T-104/T-405),
`ISS-112`/`ISS-223` (T-101), `ISS-205` (T-010), `ISS-222` (T-201), `ISS-204` (T-505), `ISS-144`/`ISS-185`
(Phase 1 gate), `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`, D-001 walkthrough.
