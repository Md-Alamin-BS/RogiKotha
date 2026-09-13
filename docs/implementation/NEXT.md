# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-007, CR-005
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-005 and T-207a both validated `PASS WITH FOLLOW-UP` and merged** (`ee0d250`, `ec5e998`).
  Post-merge on `build/demo`: `pnpm check` **exit 0** (typecheck 9/9, eslint 0 errors / 1 known
  warning `ISS-105`, **33 files / 110 passed + 2 expected-fail**, i18n **777 keys** both locales,
  37 route rows + proxy), `pnpm smoke` 6/9, `pnpm test:int` 7 files / 27 passed + 2 expected-fail.
  Counts reconcile exactly (20/64 before + T-005's 5/21 + T-207a's 8/27 = 33/112), so neither merge
  dropped a test. Phase 0 lane A is one task from done; Phase 2 lane B is blocked behind T-201.
- The 2 "expected fail" tests are deliberate: `validator-probes.int.test.ts` holds `it.fails`
  tripwires for `ISS-139` and `ISS-141` that **turn the suite red the day those are fixed** — that
  is the signal to delete the marker, not a broken test.
- Issue-id collision resolved: T-005 keeps `ISS-125`–`132`, T-207a's set was renumbered to
  `ISS-133`–`138`, validators used `139`–`149` and `150`–`154`. Every stale reference on
  `build/demo` was renumbered at merge (`ISS-154` closed).

## Next, per lane (human-readable)
- **Lane A — T-007** (test support: corpus, builders, fakes, seed, fixtures). Unblocks T-201, which
  unblocks all of lane B. ⚠ If `pnpm test:int` ever appears to hang, it is `ISS-143`, not your code:
  kill it, re-run, and note it — **queue `CR-007` immediately after T-007**.
- **Lane B — CR-005** (strip the 99 `.js` import suffixes from `packages/contracts/src`). I queued
  this under its own `Status:` line ("not blocked on a founder decision, just needs a session") —
  say so if you'd rather it waited. Without it no Phase 2 page can import a real contracts view
  model: T-207a's validator reproduced **42** `Module not found` errors from a throwaway route.
- Then: T-009 → T-010 (lane A), T-101 after T-009; T-201 after T-007 opens T-202/T-203/T-206 and
  T-207 Half B.

## Blockers
- None for this queue. Both tasks are M1 and parallel-safe: `packages/test-support/**` vs
  `packages/contracts/**` are disjoint.

## Questions for the human
- **`ISS-140` / `CR-006` (S2, needs your ruling):** the database grants `rk_worker`
  `SELECT (id, email)` on `auth_users`; `02-data-model.md` §16 (twice) and `01-conventions.md` §11
  all say the worker has **no** `auth_*` access. T-005's own task file instructed the grant, so this
  is a spec conflict, not a bug. **(a)** revoke it and read recipients from
  `email_deliveries.to_email_enc` as designed (recommended), or **(b)** keep it and amend both
  documents. Either ships; leaving them contradictory is the bad outcome. Options in
  `tasks/CR-006-worker-auth-users-grant.md`.
- **`CR-007`** (`ISS-143`): `pnpm test:int` hung 44 min on 1 run in 8 with no timeout firing. Cause
  established (per-file `DROP SCHEMA` + no `lock_timeout`). No decision needed — just approve
  queueing it after T-007, before the int-test file count grows again.
- **`CR-004`** still open — theme toggle is silent to a screen reader (`ISS-122`). Localize (new
  Bengali copy, batch with `ISS-050`, recommended), keep English with a written §6 exemption, or
  drop? Options in `tasks/CR-004-live-region-announcements.md`.
- **`ISS-135`** (was `ISS-127`, T-207a, S4): Terms/Privacy reuse `nav.about` as their kicker. Fine
  permanently, or do they want their own? Ships either way.
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict** (carried forward, still unresolved): one bans
  self-attribution in committed generated files, the other requires `TOOL · MODEL · EFFORT` in every
  record. Sessions keep following established practice; one sentence from you would settle it.
- **Open, owned by later tasks:** `ISS-139` (T-304), `ISS-141` (T-309), `ISS-144`/`ISS-145` (T-009),
  `ISS-108` (T-104), `ISS-112` (T-101 — its Better Auth mapping block is wrong, do not trust it),
  `ISS-110`, `ISS-151` (T-207 Half B). **Still open:** `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`,
  `ISS-054`, `ISS-056`, and the D-001 browser walkthrough before T-102/T-103 (`ISS-029`/`ISS-028`/
  `ISS-037`).
