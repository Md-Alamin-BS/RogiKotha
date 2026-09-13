# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: CR-005 implementer (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-007
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **CR-005 done, awaiting validation** on `task/cr-005-contracts-extensionless-imports`: stripped
  the `.js` suffix from all 99 relative import specifiers across 39 files in
  `packages/contracts/src` (mechanical, matches `packages/i18n/src`'s existing convention).
  `pnpm check`/`pnpm smoke` unchanged (**33 files/110+2ef=112**, **777 keys**, **37 route rows**,
  **6 files/9 smoke**). Proof: `emergency/page.tsx` converted back to a direct
  `DEFAULT_CONFIG_VALUES` import from `@rogikotha/contracts`'s main barrel; `next build` resolves
  it with no `Module not found`; live `next start` + curl confirmed byte-identical rendered output
  in both locales. `ISS-133`/`ISS-134` closed. See `docs/implementation/handoffs/CR-005.md`.
- **T-005 and T-207a both validated `PASS WITH FOLLOW-UP` and merged** (`ee0d250`, `ec5e998`).
  Post-merge on `build/demo`: `pnpm check` **exit 0** (typecheck 9/9, eslint 0 errors / 1 known
  warning `ISS-105`, **33 files / 110 passed + 2 expected-fail**, i18n **777 keys** both locales,
  37 route rows + proxy), `pnpm smoke` 6/9, `pnpm test:int` 7 files / 27 passed + 2 expected-fail.
  Phase 0 lane A is one task from done; Phase 2 lane B is blocked behind T-201 (needs T-007 first).
- The 2 "expected fail" tests are deliberate: `validator-probes.int.test.ts` holds `it.fails`
  tripwires for `ISS-139` and `ISS-141` that **turn the suite red the day those are fixed** — that
  is the signal to delete the marker, not a broken test.
- Issue-id collision resolved: T-005 keeps `ISS-125`–`132`, T-207a's set was renumbered to
  `ISS-133`–`138`, validators used `139`–`149` and `150`–`154`. CR-005 added `ISS-171`/`ISS-172`.

## Next, per lane (human-readable)
- **Lane A — T-007** (test support: corpus, builders, fakes, seed, fixtures). Unblocks T-201, which
  unblocks all of lane B. ⚠ If `pnpm test:int` ever appears to hang, it is `ISS-143`, not your code:
  kill it, re-run, and note it — **queue `CR-007` immediately after T-007**.
- **Lane B — validate CR-005**, then merge. After that, lane B has no ready task of its own until
  T-007 → T-201 opens T-202/T-203/T-206 and T-207 Half B; a fresh lane B session should pick up
  `CR-004` (blocked on a founder wording call, see below) or wait.
- Then: T-009 → T-010 (lane A), T-101 after T-009; T-201 after T-007 opens T-202/T-203/T-206 and
  T-207 Half B.

## Blockers
- None for T-007. CR-005 needs its independent validation session (different session from the
  implementer, per `04-handoff-and-validation.md` §2).

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
