# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-14 · by: loop validate session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-009, CR-008
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-007 `PASS WITH FOLLOW-UP` (merged `eaefcf2`) and CR-005 `PASS` (merged `e84f9ee`).** Post-merge
  on `build/demo`: `pnpm check` **exit 0** (37 files / 146 passed + 2 expected-fail, i18n 777 keys,
  37 route rows + proxy), `pnpm smoke` 7/10, `pnpm test:int` 7 files / 29, standalone
  `seed.int.test.ts` 3/3, and a live `db:reset && db:migrate && db:seed` = **604 rows then 0** — which
  also clears the cross-branch risk: the seed reaches the now-extensionless `contracts` through `tsx`
  fine.
- **Phase 0 lane A is two tasks from done: T-009 → T-010.** T-201 and the rest of Phase 2 are
  unblocked by T-007; T-101 unblocks once T-009 merges.
- Eleven new rows, `ISS-173`..`ISS-183`. The three `S2`s in T-007 are all seeded **data**, not broken
  machinery, and are specified in **`CR-008`** (queued below). One `S2` in already-merged T-004/T-005
  code is specified in **`CR-009`** — read the sequencing note before queueing anything that touches
  `packages/database`.

## Next, per lane (human-readable)
- **Lane A — T-009** (worker skeleton: pg-boss, job registry, outbox relay). Deps T-004/T-005 merged.
  `ISS-144`/`ISS-145` are open and owned by this task.
- **Lane B — CR-008** (five T-007 follow-ups, all inside `packages/test-support/` plus a root
  `.gitattributes`). Path-disjoint from T-009, needs no founder decision, and closes three `S2`s while
  the evidence is fresh.
- **After T-009 merges, queue `CR-009` on its own, before T-201.** It rewrites an import line in
  *every* file under `packages/database/src`, so it cannot share a turn with T-009 (`src/queue/**`,
  `src/index.ts`) or T-201. Skipping it means the first Phase 2 page that reads the database repeats
  `ISS-133` mid-task — which is exactly how `ISS-133` was found the first time.

## Blockers
- None for T-009 or CR-008. `CR-009` is not blocked, only sequenced (see above).

## Questions for the human
- **`ISS-158` + `ISS-176` are one ruling (T-007, S2/S3):** `05-demo-storyboard.md` disagrees with the
  prototype data twice, and the seeded code is right both times — it names `anon_author_r4` as the
  alias-isolation proof (r4 is **pseudonymous** / `r_ahmed`; the anonymous reviews are **r2, r8, r12**),
  and line 59 puts **MOD-2041** in the standard lane (it is `critical`; the standard cases are MOD-2033
  and MOD-2029). **(a)** correct the storyboard in both places (recommended), or **(b)** accept both as
  documented drift. Ships either way.
- **`ISS-140` / `CR-006` (S2, still unanswered):** the database grants `rk_worker`
  `SELECT (id, email)` on `auth_users`; `02-data-model.md` §16 (twice) and `01-conventions.md` §11 all
  say the worker has **no** `auth_*` access. T-005's own task file instructed the grant, so this is a
  spec conflict, not a bug. **(a)** revoke it and read recipients from `email_deliveries.to_email_enc`
  as designed (recommended), or **(b)** keep it and amend both documents.
- **`CR-007`** (`ISS-143`): `pnpm test:int` hung 44 min on 1 run in 8 with no timeout firing; cause
  established. No decision needed — just approve queueing. T-007 has now grown the int-test file count
  again, which is the condition for acting on it.
- **`CR-004`** still open — theme toggle is silent to a screen reader (`ISS-122`). Localize (new
  Bengali copy, batch with `ISS-050`, recommended), keep English with a written §6 exemption, or drop?
- **`ISS-135`** (T-207a, S4): Terms/Privacy reuse `nav.about` as their kicker. Fine permanently, or do
  they want their own? Ships either way.
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict** (carried forward, still unresolved): one bans
  self-attribution in committed generated files, the other requires `TOOL · MODEL · EFFORT` in every
  record. Sessions keep following established practice; one sentence from you would settle it.
- **Open, owned by later tasks:** `ISS-181`/`ISS-182` (T-304), `ISS-180` (T-101, informational),
  `ISS-139` (T-304), `ISS-141` (T-309), `ISS-144`/`ISS-145` (T-009), `ISS-108` (T-104), `ISS-112`
  (T-101 — its Better Auth mapping block is wrong, do not trust it), `ISS-110`, `ISS-151` (T-207 Half
  B). **Still open:** `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`, and the D-001
  browser walkthrough before T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`).
