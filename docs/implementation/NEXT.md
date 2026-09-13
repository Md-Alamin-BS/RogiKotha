# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-005, T-207a
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-004 and T-008 validated `PASS WITH FOLLOW-UP`, both merged** (`8d63911`, `fdd2a43`). On
  `build/demo` from an empty `node_modules`: `pnpm check` green (20 files / 64 tests, parity 764
  keys, 37 route rows), `pnpm smoke` 4/6, `pnpm test:int` 2/8.
- Schema walked column-by-column against a live `pg_attribute` dump — 30 tables, 36/36 enums, no
  divergence, grants re-proven from real `rk_worker` sessions; T-008's three stylesheets are
  byte-identical to the prototype (SHA-256). `CR-003` merged too (`esbuild` in `allowBuilds`,
  `ISS-106` — without it a fresh worktree ran no `pnpm` script). `CR-004` written, blocked on you.

## Next, per lane (human-readable)
- **Lane A:** T-005 (database part 2); T-007 → T-009 → T-010 unlock behind it.
- **Lane B:** T-207 half A (emergency/about/terms/privacy) — needs T-008 only, paths disjoint from
  T-005's, so both can run at once in two terminals (`… Lane A` / `… Lane B`).

## Blockers
- None.

## Questions for the human
- **CR-004 / `ISS-122` — blocks queueing it.** The theme toggle is currently silent to a screen
  reader. The prototype's announcements ("Theme: dark") are hard-coded English and §6 forbids that.
  Localize (new Bengali copy, batched with `ISS-050` — recommended), keep English with a written §6
  exemption, or drop? Options in `tasks/CR-004-live-region-announcements.md`.
- **`ISS-107` — answer before T-005 starts.** T-004's `ALTER DEFAULT PRIVILEGES` gives `rk_worker`
  read+write on every table T-005 creates, so exposure of `reports.reporter_account_id` /
  `appeals.appellant_account_id` depends on what T-005 remembers to REVOKE. Default-deny now, or
  keep default-allow and require an explicit revoke + test in T-005?
- **`AGENTS.md` vs `LOOP.md` §0.1 conflict:** one bans self-attribution in committed generated
  files, the other requires `TOOL · MODEL · EFFORT` in every record. I followed the established
  practice; one sentence from you carving out the build records would settle it.
- **Owned, no action:** `ISS-112` (T-004's Better Auth mapping is wrong; T-101 must not trust it),
  `ISS-108` (audit allowlist is a shallow denylist, T-104), `ISS-110`. **Still open:** `ISS-050`,
  `ISS-096`, `ISS-099`, `ISS-074`, `ISS-075`, `ISS-054`, `ISS-056`, D-001 walkthrough before
  T-102/T-103 (`ISS-029`/`ISS-028`/`ISS-037`).
