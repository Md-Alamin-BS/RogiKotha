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
- **NEW — a second validate session ran T-003 in parallel and did *not* agree with the PASS.**
  Two sessions validated T-003 at the same time; the one that finished first merged it. The second
  found two **S2** defects, both re-confirmed live on merged `build/demo`: `ISS-077` —
  `newPublicId()` has 46 bits of entropy, not 50, and **every public id ends in `4` or `m`**
  (the UUIDv4 version nibble sits in the low bits; measured over 50 000 ids, position 9 has an
  alphabet of exactly 2); and `ISS-078` — `auth.account_suspended` is specified by
  `docs/design/auth-screens-spec.md:100` and needed by `account.signIn`, but is in no `ErrorCode`
  union, while its string already ships in both dictionaries (this answers `ISS-076`: 03 §2 really
  is short a code, so "40" was not just a wrong number). Also `ISS-079`/`ISS-080` (S3),
  `ISS-081`/`ISS-082`/`ISS-083` (S4). Full record: `docs/validation/T-003-round-2.md`.
  **Decide:** queue a small `contracts` follow-up (CR) for `ISS-077`/`ISS-079`/`ISS-080` before the
  seed lands in T-007, or let it ride? And should a future implement turn ever be started in two
  terminals without `Lane A`/`Lane B` — that is what let both sessions take the same task.
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
