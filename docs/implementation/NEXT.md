# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-003
recommended: Claude Sonnet 5 or Opus 4.8 (alt GPT-5.6 Terra) · effort high
```

## State of the build
- **T-002 merged** at `66a5fc6` — round 2 verdict `PASS WITH FOLLOW-UP`. `ISS-057` (S1) and
  `ISS-058` (S3) confirmed closed; the "docs only" re-work claim was verified against git
  (`git diff 1a8c57a..HEAD -- infra/` touches `README.md` and nothing else), and all nine
  acceptance rows were still re-executed live from a clean `pnpm infra:reset` — 9/9. New this
  round: the custom ClamAV signature was proven through **`clamd`** (`clamdscan --fdpass` →
  `RogiKotha.Test.Marker.UNOFFICIAL FOUND`, clean control file `OK`), not just `clamscan` with the
  file forced, so the daemon T-304 will talk to on `localhost:3310` really carries the signature.
- `build/demo` is green: `pnpm check` end-to-end (typecheck 9 projects, lint clean, 18/18 tests,
  i18n parity 764 keys, build) and `pnpm smoke` 4/4 after the merge. Phase 0 now has the workspace
  (T-001), the local stack (T-002), the bilingual dictionary (T-006) and the auth prototype (D-001).
- One new follow-up rides along: **`ISS-072`** (S3, owner T-304) — `infra/compose/README.md`
  suggests `logs clamav | grep "Listening daemon"` to confirm readiness, but `clamav/clamav:1.5.4`
  never prints that string (it prints `socket found, clamd started.`). The alternative in the same
  sentence, `exec clamav clamdscan --version`, does work.

## Next, per lane (human-readable)
- **Lane A:** T-003 (contracts) → T-004 → T-005 → T-007.
- **Lane B:** idle — T-008 is blocked on T-003, which is exactly what T-003 unblocks.

## Blockers
- None. Still your call, carried over: the whole Phase-0 remainder is Lane A and `LOOP.md` §4.3
  only pairs tasks from *different* lanes, so the rule keeps queueing one task per turn. Add a
  second Lane-A task to the Queue by hand if you want two terminals — I did not override the rule.
  After T-003 merges, T-008 (Lane B) becomes available and real two-lane turns resume.

## Questions for the human
- **Bilingual review still requested** (not a merge blocker): T-006's invented EN+BN wording for
  the `notif.*` (5) and `admin.config.*` (15) keys is on `build/demo` (`ISS-050`); all 20 strings
  are quoted in `docs/validation/T-006.md`. Read them before T-007/T-408 build UI against them.
- **D-001 still wants your walkthrough** (carried over): a founder pass in both locales and themes
  before Lane B starts T-102/T-103. While there: `ISS-029` (`/me` always shows the `shirin_88`
  fixture — accept, or fix?), `ISS-028` (Terms/Privacy → `#about`, fine until the React port?).
  360 px is still unverified (`ISS-037`).
- **Minor, no action unless you disagree:** `ISS-054` — T-408's task file names the removed key
  `admin.role.current`, most likely wants `staff.role.chipTitle`. `ISS-056` — T-006's task file
  cites `evidence.notice` for the viewer disclaimer; the real key is `viewer.notice`.
