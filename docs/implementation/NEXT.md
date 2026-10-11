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
- **`CR-011` / `ISS-201`:** the relay's de-duplication needs a design choice — transactional relay
  (recommended, if pg-boss 12.31's `send` takes a caller executor), a de-duplicating queue policy,
  or `singletonSeconds`. See the task file.
- **`ISS-158` + `ISS-176` + `ISS-221` are one ruling:** the storyboard disagrees with the prototype
  data (alias proof, MOD-2041's lane, and what MOD-2033's extra three reports cite). Correct the
  storyboard (recommended) or accept as documented drift.
- **`ISS-226`:** nine seed files import `@rogikotha/database`, against conventions §2. Give the seed
  its own boundary exception before T-010's boundary lint, or move the seed elsewhere?
- **`ISS-140` / `CR-006`:** revoke `rk_worker`'s `auth_users(id, email)` grant (recommended) or amend docs.
- **`CR-004`** (screen-reader announcements, Bengali copy), **`CR-007`** (approve queueing),
  **`ISS-135`** (Terms/Privacy kicker) — unchanged from 2026-09-14.
- **`AGENTS.md` vs `LOOP.md` §0.1** (model ids in records) — still unresolved; to be settled in the
  AI-DLC practices (`team.md`).
- **`../rogikotha-gate4` worktree** holds 275 untracked files (an early Gate 4 Next.js prototype, 255 of
  them absent from `main`). Keep, archive or delete?

## Open, owned by later tasks
`ISS-139`/`ISS-181`/`ISS-182` (T-304), `ISS-141` (T-309), `ISS-108`/`ISS-206` (T-104/T-405),
`ISS-112`/`ISS-223` (T-101), `ISS-205` (T-010), `ISS-222` (T-201), `ISS-204` (T-505), `ISS-144`/`ISS-185`
(Phase 1 gate), `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`, D-001 walkthrough.
