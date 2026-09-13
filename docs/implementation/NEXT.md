# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop validate session (Claude Code · claude-sonnet-5 · effort high)

## Queue (machine-read by LOOP.md)
```
mode: implement
tasks: T-004, T-008
recommended: Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · effort high
```

## State of the build
- **T-003 validated PASS and merged** (`e92dc4b`) — `packages/contracts` is now on `build/demo`.
  Validator independently re-ran `pnpm check`/`pnpm smoke` in a fresh worktree, executed all 6
  acceptance rows, hand-counted the 38-code `ErrorCode` union in `03-routes-and-contracts.md` §2
  against `errors.ts` (exact match — confirms `ISS-076` is a task-file wording defect, not a
  contracts defect), and re-verified every hard-rule grep. No new findings; `ISS-073..076` (S4)
  confirmed correctly triaged. `docs/validation/T-003.md` has the full record.
- Phase 0 now has: workspace scaffold (T-001), local infra (T-002), i18n dictionary (T-006), and
  contracts vocabulary (T-003) all merged. `pnpm check` on `build/demo` is green end-to-end
  (typecheck 9/9, lint clean, 39/39 tests, i18n parity 764 keys, build); `pnpm smoke` 5/5.
- T-004 (lane A, database part 1) and T-008 (lane B, web shell) are both now unblocked (their
  "Depends on" rows — T-001/T-002/T-003 and T-003/T-006 — are all merged) and are each other's
  named "Parallel-safe with" entry with disjoint owned paths, so both are queued this turn.

## Next, per lane (human-readable)
- **Lane A:** implement T-004 → T-005 → T-007.
- **Lane B:** implement T-008 → (T-009 once T-005 lands `outbox_events`).

## Blockers
- None.

## Questions for the human
- **T-003 follow-ups (carried over):** is the closed `male|female` gender enum in
  `schemas/search.ts` acceptable, or should `02-data-model.md` gain a formal enum before T-206
  (`ISS-074`)? Worth a deliberate bump to `uuid@14` — fixes a `v7()` bug relevant to `ids.ts`
  (`ISS-075`)? Should the task file's acceptance-check table be corrected from "40" to "38" error
  codes (`ISS-076`)?
- **Bilingual review still requested** (not a merge blocker): T-006's invented EN+BN wording for
  the `notif.*` (5) and `admin.config.*` (15) keys is on `build/demo` (`ISS-050`); all 20 strings
  are quoted in `docs/validation/T-006.md`.
- **D-001 still wants your walkthrough** (carried over): founder pass in both locales/themes before
  Lane B starts T-102/T-103. `ISS-029` (`/me` fixture), `ISS-028` (Terms/Privacy → `#about`),
  `ISS-037` (360 px unverified).
- **Minor, no action unless you disagree:** `ISS-054`, `ISS-056` (task-file key-name typos, carried
  over).
