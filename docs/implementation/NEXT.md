# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

> ⚠️ **AI-DLC migration pending.** Do not start implementation: show the human this warning and ask
> first. The resources must be converted into AI-DLC artifacts — see `docs/aidlc-migration/README.md`.
> Keep this banner when rewriting this file until that migration says **Status: DONE**.

**Updated:** 2026-09-14 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-009, CR-008
recommended: GPT-5.6 Terra (other-vendor mid-tier) or Claude Opus 4.8 / Opus 5 if unavailable · effort high
```

## State of the build
- **T-009 and CR-008 both `done`, pushed, not yet merged.** T-009 (`apps/worker`, pg-boss, outbox
  relay, `packages/database/src/queue/`) and CR-008 (five T-007 follow-ups in
  `packages/test-support/`) ran as two parallel sub-agents this turn, each in its own worktree and
  its own isolated Postgres database (`rogikotha_t009`/`rogikotha_test_t009`,
  `rogikotha_cr008`/`rogikotha_test_cr008` — created ad hoc this turn so the two db-touching tasks
  didn't race each other or the shared dev database; drop them once both merge). Both report
  `pnpm check` green and no open questions.
- **`ISS-` id collision to resolve at merge, not before:** T-009 claims `ISS-184`..`ISS-196`; CR-008
  (told to start at `ISS-190`, not knowing T-009 would use that many) also claims `ISS-190`..`ISS-192`
  for unrelated findings. Whichever branch merges second will hit a real `ISSUES.md` conflict at those
  three rows — resolve per `04-handoff-and-validation.md` §6: keep both sides' content, renumber the
  second branch's colliding rows upward (same as the `ISS-170` precedent from the T-007/CR-005 turn).
- **Phase 0 lane A is one task from done: T-009 → T-010** (once T-009 merges). `CR-009` is queued
  right after T-009 merges, on its own (see below) — then T-101 unblocks (T-007, T-008, T-009 all
  done/merging).

## Next, per lane (human-readable)
- **Validate T-009 and CR-008** (this Queue). Both M1; cross-vendor validation preferred per
  `00-master-plan.md` §7 (Terra validates Sonnet) — if unavailable, a higher Claude tier plus the
  usual "higher tier than recommended" note is acceptable per `LOOP.md` §0.1.
- **After T-009 merges, queue `CR-009` on its own, before T-201/T-101.** It rewrites an import line in
  *every* file under `packages/database/src`, so it cannot share a turn with anything touching that
  package. T-009 itself added `packages/database/src/queue/*` and edited `src/index.ts`, which is
  exactly the collision `NEXT.md` has been warning about since the CR-005 turn.

## Blockers
- None for validating T-009 or CR-008. `CR-009` stays sequenced behind T-009's merge, not blocked.

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
  established. No decision needed — just approve queueing.
- **`CR-004`** still open — theme toggle is silent to a screen reader (`ISS-122`). Localize (new
  Bengali copy, batch with `ISS-050`, recommended), keep English with a written §6 exemption, or drop?
- **`ISS-135`** (T-207a, S4): Terms/Privacy reuse `nav.about` as their kicker. Fine permanently, or do
  they want their own? Ships either way.
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict** (carried forward, still unresolved): one bans
  self-attribution in committed generated files, the other requires `TOOL · MODEL · EFFORT` in every
  record. Sessions keep following established practice; one sentence from you would settle it.
- **Open, owned by later tasks:** `ISS-181`/`ISS-182` (T-304), `ISS-180` (T-101, informational),
  `ISS-139` (T-304), `ISS-141` (T-309), `ISS-144`/`ISS-185` (T-009, deferred to Phase 1 gate — see
  above), `ISS-108` (T-104), `ISS-112` (T-101 — its Better Auth mapping block is wrong, do not trust
  it), `ISS-110`, `ISS-151` (T-207 Half B). **Still open:** `ISS-050`, `ISS-096`, `ISS-074`, `ISS-075`,
  `ISS-054`, `ISS-056`, and the D-001 browser walkthrough before T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`).
