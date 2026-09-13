# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-003
recommended: GPT-5.6 Terra (alt: Claude Sonnet 5 or Opus 4.8, new session) · effort high
```

## State of the build
- **T-003 implemented** on `task/t-003-contracts` (not yet merged) — `packages/contracts` built in
  full: `Result`/`errors` (38-code `ERROR_CODES`, exact copy of 03 §2)/`Actor`/`ids`/`time`/`enums`
  (36 enums)/`page`/`config-values`, 14 `schemas/<module>.ts` files, 18 `view-models/<page>.ts`
  files. `pnpm check` green end-to-end (typecheck 9/9, lint clean, 11 files/39 tests, i18n parity
  764 keys, build) and `pnpm smoke` green, independently re-run from the main checkout, not just
  taken from the implementer's report. All Acceptance-check commands and the Hard-rule checklist
  (no `rating`/`score`, no `reporterAccountId`, no `bn:` pairs in VMs, no framework imports, no
  agent/tool identity) re-verified live by grep.
- One task-file discrepancy found: the Acceptance table expects 40 error codes; 03 §2's own source
  text contains exactly 38, and `ERROR_CODES` matches it exactly — see `ISS-076`, not treated as a
  contracts defect. Three more `S4` follow-ups logged (`ISS-073`..`ISS-075`, all on `task/t-003-
  contracts`, ride to `build/demo` at merge): `newPublicId()` uses `uuid.v4()` not
  `crypto.getRandomValues` (no dom/node lib in this package); `search.ts`'s `gender` filter is a
  closed enum with no data-model backing; `uuid@14` is now current, pin deliberately kept at `^13`.
- T-002 still merged at `66a5fc6`; Phase 0 now additionally has the contracts vocabulary pending
  validation. `README.md` §5 row for T-003 set to `validating`.

## Next, per lane (human-readable)
- **Lane A:** validate T-003 → merge → T-004 → T-005 → T-007.
- **Lane B:** idle — T-008 unblocks once T-003 merges.

## Blockers
- None.

## Questions for the human
- **New (T-003):** is 38 the right error-code count, or does 03 §2 itself need codes added
  (`ISS-076`)? Is the closed `male|female` gender enum in `schemas/search.ts` acceptable (`ISS-074`)?
  Worth a deliberate bump to `uuid@14` later, which fixes a `v7()` bug relevant to `ids.ts`
  (`ISS-075`)?
- **Bilingual review still requested** (not a merge blocker): T-006's invented EN+BN wording for
  the `notif.*` (5) and `admin.config.*` (15) keys is on `build/demo` (`ISS-050`); all 20 strings
  are quoted in `docs/validation/T-006.md`.
- **D-001 still wants your walkthrough** (carried over): founder pass in both locales/themes before
  Lane B starts T-102/T-103. `ISS-029` (`/me` fixture), `ISS-028` (Terms/Privacy → `#about`),
  `ISS-037` (360 px unverified).
- **Minor, no action unless you disagree:** `ISS-054`, `ISS-056` (task-file key-name typos, carried
  over).
