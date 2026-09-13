# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-002 — fix ISS-057 (and ISS-058) per docs/validation/T-002.md
recommended: GPT-5.6 Luna or Claude Haiku 4.5 · effort medium (Sonnet 5 / Opus 4.8 also fine)
```

## State of the build
- **T-006 merged** at `bb954af`. `pnpm check` is now **green end-to-end for the first time**
  (typecheck, lint, 18/18 tests, i18n parity over 764 keys, build); `pnpm smoke` 4/4. Caveat: the
  ERROR_CODES half of `i18n:check` self-skips until T-003 creates `packages/contracts/src/errors.ts`.
- **T-002 FAIL**, branch left at `7e4296a`. The infrastructure itself is sound — all 9 acceptance
  rows passed live against Docker, the custom ClamAV signature really flags a marker file (control
  file scans clean), and all three `// ASSUMPTION(T-002)` deviations were independently reproduced,
  not just re-read. The only blocker is `ISS-057` (S1): `infra/compose/README.md:106` writes the
  tool's brand name into committed product documentation, which `AGENTS.md` forbids for README and
  doc files. One sentence to reword. While there, fix `ISS-058` (S3): the same README still calls
  the ClamAV signature mount read-only when the shipped mount is read-write.

## Next, per lane (human-readable)
- **Lane A:** T-002 fix → re-validate, then T-003 → T-004 → T-005 → T-007.
- **Lane B:** idle — T-008 is blocked on T-003.

## Blockers
- None technical. Queue-size note: **T-003 is unblocked now** (T-001 is merged) and its owned paths
  are disjoint from T-002's, but `LOOP.md` §4.3 only pairs tasks from *different* lanes and both are
  Lane A — so the rule leaves this a one-task turn for a one-line fix. To avoid the round-trip, add
  `, T-003` to the Queue line and run two terminals with `Lane A` / `Lane B`; the plan already
  declares them parallel-safe. Your call — I did not override the rule on my own.

## Questions for the human
- **Bilingual review still requested** (not a merge blocker): T-006's invented EN+BN wording for the
  `notif.*` (5) and `admin.config.*` (15) keys is now on `build/demo` (`ISS-050`); all 20 strings are
  quoted in `docs/validation/T-006.md`. Read them before T-007/T-408 build UI against those keys.
- **D-001 still wants your walkthrough** (carried over): a founder pass in both locales and themes
  before Lane B starts T-102/T-103. While there: `ISS-029` (`/me` always shows the `shirin_88`
  fixture — accept, or fix?), `ISS-028` (Terms/Privacy → `#about`, fine until the React port?).
  360 px is still unverified (`ISS-037`).
- **Minor, no action unless you disagree:** `ISS-054` — T-408's task file names the removed key
  `admin.role.current`, most likely wants `staff.role.chipTitle`. `ISS-056` — T-006's task file
  cites `evidence.notice` for the viewer disclaimer; the real key is `viewer.notice`.
