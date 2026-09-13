# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-002, T-006
recommended: Claude Sonnet 5 or Opus 4.8 · effort high, new session
```

## State of the build
- **T-002 done** (`task/t-002-local-infra` @ `fb6daae`) and **T-006 done** (`task/t-006-i18n` @ `4056fd8`),
  both by sub-agents in separate worktrees this session; both pushed, not yet merged. `infra/`
  now has the compose stack (postgres/mailpit/clamav); `packages/i18n` now has 764 real bilingual
  keys, formatters and next-intl config (was an empty stub).
- Both branches logged `S4` issues only (no `S1`/`S2`); ISS ids originally collided
  (`ISS-039..044` in both) — **already renumbered and fixed** in `task/t-006-i18n` (now
  `ISS-045..056`) by this session before push. Validator: no further renumbering needed, just
  confirm the two ranges are disjoint when both merge.

## Next, per lane (human-readable)
- **Lane A:** validate T-002 first (independent live Docker run — three `// ASSUMPTION(T-002)`
  deviations from the task file's literal compose text: postgres volume path, mailpit tag
  `v1.31.1`, clamav bind-mount mode; see `handoffs/T-002.md`), then T-003 → T-004 → T-005 → T-007.
- **Lane B:** validate T-006 (re-run `pnpm i18n:check`/`test`/`typecheck`; spot-check the invented
  `notif.*`/`admin.config.*` wording and the auth-spec verbatim rows; note `pnpm install` now needs
  `--ignore-scripts`, see `handoffs/T-006.md` `ISS-055`), then T-008.

## Blockers
- none

## Questions for the human
- **Bilingual review requested (not a merge blocker):** T-006 invented EN+BN wording for the
  `notif.*` (5 keys) and `admin.config.*` (~15 keys) addendum entries that no task named copy for
  (`ISS-050`) — please read them in `packages/i18n/messages/{en,bn}.json` before T-007/T-408 build
  UI against them.
- **D-001 still wants your walkthrough** (carried over, unresolved): a founder visual pass (both
  locales, both themes) before Lane B starts T-102/T-103. While there: `ISS-029` (`/me` shows the
  fixed `shirin_88` fixture regardless of signed-in account — accept, or should D-001 fix it?),
  `ISS-028` (Terms/Privacy → `#about`, fine until the React port?). 360 px is still unverified
  (`ISS-037`).
