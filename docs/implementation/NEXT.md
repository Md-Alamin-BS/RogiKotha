# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-12 · by: planning session (human-supervised)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-001, D-001
```

## State of the build
- No product code exists yet. `apps/`, `packages/`, `infra/` are not created.
- The plan is complete: `00-master-plan.md` (tasks, order, estimates), `01`–`03` (rules, data model, contracts), `04` (this protocol), `tasks/` (one file per task), `07` (Phase 2, not started).
- Scope: images-only evidence (FD-036). Plan committed on `main`; integration branch `build/demo` exists on `origin`.

## Next, per lane (human-readable)
- **Lane A (backend):** T-001 workspace scaffold → then T-002 → T-003 → T-004 → T-005 → T-007.
  First three things: (1) `git fetch origin && git switch build/demo`; (2) read `tasks/T-001-workspace-scaffold.md` and `01-conventions.md` §1; (3) run `pnpm -v` (must be 11.x) and `node -v` (24.x) before installing anything.
- **Lane B (frontend):** D-001 auth-screens prototype pass (design, static prototype) — can start now, independent of lane A. After it: T-006 → T-008 (needs T-001 and T-003 merged).

## Blockers
- none

## Questions for the human
- none open
