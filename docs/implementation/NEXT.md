# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-14 · by: loop implement session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-007, CR-005
recommended: GPT-5.6 Terra (other vendor, preferred) · effort high — else Claude Sonnet 5 or Opus 4.8 · effort high, new session
```

## State of the build
- **T-007 and CR-005 both implemented `done`, pushed, not merged.** T-007 (`ce7ef5f`): typed corpus,
  13 builders, 16 fakes, idempotent seed, 8 fixtures — `pnpm check` exit 0 (**37 files / 146 passed
  + 2 expected-fail**), `pnpm smoke` 7/10, and live `db:reset && db:migrate && db:seed` = **604 rows**
  then **0 inserted** on re-run, with every acceptance count matching exactly. CR-005 (`7494a70`):
  99 `.js` import suffixes stripped across 39 contracts files, `pnpm check` counts **identical** to
  baseline. Neither branch has been validated — that is this next session's whole job.
- Phase 0 lane A is now one task from done (T-009 → T-010). T-007 unblocks **T-201**, which unblocks
  all of lane B. CR-005 unblocks every Phase 2+ page that needs a real contracts view model.
- ⚠ Two things the validator must know before touching T-007: `seed.int.test.ts` has to run
  **standalone** (`ISS-167` — it resets the same physical database as `packages/database`'s own int
  project), and `ISS-169` is an `S2` bug the implementer **found and fixed** mid-task, so verify the
  fix rather than the symptom. Read `handoffs/T-007.md` before the diff.

## Next, per lane (human-readable)
- **Validate both**, then merge on PASS. After that the queue is **T-009** (lane A) + **T-201**
  (lane B, now unblocked by T-007) — check `00-master-plan.md` §8 ordering before committing to that.
- `CR-007` (int-test determinism) is still waiting to be queued; T-007 has now grown the int-test
  file count, which is exactly the condition the last session said should trigger it.

## Blockers
- None. Both branches are pushed and rebased on the current `build/demo` tip.

## Questions for the human
- **`ISS-158` (T-007, S2, needs your ruling):** `05-demo-storyboard.md`'s seeded-accounts table names
  review **r4** as the one that "proves alias isolation" (`anon_author_r4`), but in the prototype data
  r4 is **`pseudo`** (author `r_ahmed`) — the genuinely anonymous reviews are **r2, r8, r12**. The
  implementer kept the corpus factually correct (`anon_author_r2/r8/r12`) rather than reproducing the
  doc's error. **(a)** correct the storyboard to name r2 (recommended — the code is right), or
  **(b)** accept it as documented drift. Ships either way.
- **`ISS-140` / `CR-006` (S2, still unanswered):** the database grants `rk_worker`
  `SELECT (id, email)` on `auth_users`; `02-data-model.md` §16 (twice) and `01-conventions.md` §11
  all say the worker has **no** `auth_*` access. T-005's own task file instructed the grant, so this
  is a spec conflict, not a bug. **(a)** revoke it and read recipients from
  `email_deliveries.to_email_enc` as designed (recommended), or **(b)** keep it and amend both
  documents. Options in `tasks/CR-006-worker-auth-users-grant.md`.
- **`CR-007`** (`ISS-143`): `pnpm test:int` hung 44 min on 1 run in 8 with no timeout firing. Cause
  established (per-file `DROP SCHEMA` + no `lock_timeout`). No decision needed — just approve queueing.
- **`CR-004`** still open — theme toggle is silent to a screen reader (`ISS-122`). Localize (new
  Bengali copy, batch with `ISS-050`, recommended), keep English with a written §6 exemption, or
  drop? Options in `tasks/CR-004-live-region-announcements.md`.
- **`ISS-135`** (T-207a, S4): Terms/Privacy reuse `nav.about` as their kicker. Fine permanently, or
  do they want their own? Ships either way.
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict** (carried forward, still unresolved): one bans
  self-attribution in committed generated files, the other requires `TOOL · MODEL · EFFORT` in every
  record. Sessions keep following established practice; one sentence from you would settle it.
- **Open, owned by later tasks:** `ISS-139` (T-304), `ISS-141` (T-309), `ISS-144`/`ISS-145` (T-009),
  `ISS-108` (T-104), `ISS-112` (T-101 — its Better Auth mapping block is wrong, do not trust it),
  `ISS-110`, `ISS-151` (T-207 Half B). **Still open:** `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`,
  `ISS-054`, `ISS-056`, and the D-001 browser walkthrough before T-102/T-103 (`ISS-029`/`ISS-028`/
  `ISS-037`).
