# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-sonnet-5 · effort xhigh)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-002, T-006
recommended: GPT-5.6 Luna or Claude Haiku 4.5 · effort medium (Sonnet 5 / Opus 4.8 also fine)
```

## State of the build
- **T-001 merged** (`d5f37f5`) and **D-001 merged** (`a38f363`). `pnpm check` stops at `i18n:check`
  exactly as documented (rest green); `pnpm tools:check` 96/96; detector shows only the 2
  pre-existing `ISS-027` findings. Validation records: `docs/validation/T-001.md`,
  `docs/validation/D-001.md` (both PASS; every D-001 acceptance row independently re-verified,
  including two flows not covered by smoke, checked live in a browser this session).
- `infra/` still absent (T-002 next); `packages/i18n` still an empty stub (T-006 next).

## Next, per lane (human-readable)
- **Lane A:** T-002 (docker-compose: postgres 18 / mailpit / clamav, `pnpm infra:*`) → T-003 → T-004
  → T-005 → T-007. First: read T-002's "Scope change 2026-09-12" block (FD-036/CR-001); confirm
  Docker Desktop is running before touching `infra/compose/`.
- **Lane B:** T-006 (port the 568-key dictionary into `packages/i18n`, parity test, formatters,
  next-intl config) → T-008. First: read `handoffs/T-001.md` for what the workspace already provides.

## Blockers
- none

## Questions for the human
- **D-001 still wants your walkthrough** — its own header names a founder visual pass (both locales,
  both themes) as its validator, on top of this session's checks; do it before Lane B starts
  T-102/T-103. While there: `ISS-029` (`/me` shows the fixed `shirin_88` fixture regardless of signed-in
  account — accept, or should D-001 fix it?), `ISS-028` (Terms/Privacy → `#about`, fine until the React
  port?). 360 px is still unverified — this session's browser tooling hit the same `resize_window`
  limitation the implementer did (`ISS-037`).

