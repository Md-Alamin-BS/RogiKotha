# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-005, T-207a
recommended: GPT-5.6 Terra (other vendor) or Claude Sonnet 5 · effort high, new session
```

## State of the build
- **T-005 and T-207a (T-207 Half A) implemented, pushed, not yet validated or merged.** T-005:
  `task/t-005-database-part-2` (`9006d44`), `pnpm check`/`test:int`/`smoke` all green. T-207a:
  `task/t-207a-discover-emergency-about` (`bc8fa5f`), `pnpm check` green, `impeccable`/`contrast`
  clean, FD-022 placement test passing. Neither branch has seen the other's changes yet.
- `FD-037` (`rk_worker` default-deny, answered before T-005 started) is implemented and tested in
  T-005 — `ISS-107` fixed. T-005 also fixed a real append-only-trigger bug blocking retention expiry
  (`ISS-126`). T-207a flagged a real infra blocker (`ISS-125`): Turbopack can't resolve
  `packages/contracts`'s `.js`-suffixed imports from `apps/web` — written up as `CR-005` (mechanical,
  no founder input needed), queue it before the next page needs a real contracts view model.
- Both branches independently numbered new issues from `ISS-125` — **they collide**; the validator
  merging second must renumber one set (`04-handoff-and-validation.md` §1.2.7 precedent).

## Next, per lane (human-readable)
- **Lane A:** validate T-005 → merge → T-007 (test-support) unlocks; T-009 (worker) can also start
  now that `outbox_events` exists.
- **Lane B:** validate T-207a (Half A only — Emergency/About/Terms/Privacy; Half B/Discover stays
  `todo`, blocked on T-202/T-203/T-206) → merge.

## Blockers
- None for validation. `CR-005` needs queueing (no founder input needed) before whichever task next
  imports `packages/contracts` into `apps/web`.

## Questions for the human
- **`ISS-127`** (T-207a, S4): `Policy` (Terms/Privacy) reused `nav.about` as its kicker — no dedicated
  key was specified. Fine permanently, or do Terms/Privacy want their own kicker text?
- **`CR-004`** still open — the theme toggle is silent to a screen reader (`ISS-122`). Localize
  (new Bengali copy, batch with `ISS-050`, recommended), keep English with a written §6 exemption, or
  drop? Options in `tasks/CR-004-live-region-announcements.md`.
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict** (carried forward, still unresolved): one bans
  self-attribution in committed generated files, the other requires `TOOL · MODEL · EFFORT` in every
  record. Sessions keep following established practice; one sentence from you would settle it.
- **Owned, no action:** `ISS-112`, `ISS-108`, `ISS-110`. **Still open:** `ISS-050`, `ISS-096`,
  `ISS-099` (now fixed in T-207a), `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`, D-001 walkthrough
  before T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`).
