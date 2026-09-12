# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-001, D-001
recommended: GPT-5.6 Terra (Codex) · effort high — cross-vendor; else Claude Sonnet 5 · effort high, new session
```

## State of the build
- **T-001 done** (`task/t-001-workspace-scaffold` @ `15ac96c`): pnpm workspace live — 9 packages, TS 6.0.3, ESLint 10 flat, Vitest 4.1.11, root scripts, `pnpm smoke`. `typecheck`/`lint`/`test`/`-r build` exit 0; `pnpm tools:check` still 83/83. Packages are empty stubs (`export {}`); `pnpm check` stops at `i18n:check` until T-006, as the task file predicted.
- **D-001 done** (`task/d-001-auth-screens-prototype` @ `5f215bf`): eight auth screens simulated in the 04b and Chart Tray prototypes, all spec §5 strings in EN+BN, coverage rows AUTH-001/002 → Partial, smoke 96/96, `npm run check` exit 0.
- Neither branch is merged. No product code beyond the scaffold; `infra/` still absent (T-002).

## Next, per lane (human-readable)
- **Validation turn first** — validate both branches, then merge on PASS (LOOP §2). First three things: (1) `git fetch origin`; (2) read `handoffs/T-001.md` and `handoffs/D-001.md`; (3) worktree each branch and run its acceptance table.
- **Then Lane A:** T-002 → T-003 → T-004 → T-005 → T-007. **Lane B:** T-006 → T-008.

## Blockers
- none

## Questions for the human
- **D-001 needs your walkthrough** — its task file names the founder as validator. The agent walked the screens in Chrome at desktop width in EN/BN and both themes, but **could not force a 360 px viewport** (`resize_window` did not change the effective viewport here), so mobile width is unverified. Please walk all eight routes at 360 px.
- **ISS-029** — after registering a demo account, `/me` still shows the fixed `shirin_88` fixture content while the masthead shows the new identity. Pre-existing fixture limitation. Accept for the prototype, or should D-001 have fixed it?
- **ISS-028** — Terms/Privacy links point at `#about`; the prototype has no dedicated policy routes. Confirm that is fine until the React port.

## Notes for the validator
- D-001's acceptance row "Detector: zero findings" **observed 2 findings**; the implementer blames them on `46fc261` (pre-existing, outside owned paths) and logged ISS-027. Verify that blame before accepting.
- D-001's records name end commit `5a1ec94`; the real pushed sha is `5f215bf` (one amend behind — a commit cannot name its own hash). Correct the records or log an issue.
- T-001 deviated from task step 10: **Vitest 4.1.11 has removed `defineWorkspace`**. `vitest.workspace.ts` is now `defineConfig({ test: { projects } })` with explicit `--config` on the root test scripts (ISS-004). Confirm this is the right fix.
- Per-task `started`/`finished` BUILD-LOG lines and `ISS-` rows ride on the task branches (T-001 used ISS-002–007, D-001 ISS-020–037, no collisions); they land on `build/demo` at merge.
