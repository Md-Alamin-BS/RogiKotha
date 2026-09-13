# NEXT — the baton

_Rewritten by every session at its end. Keep under 40 lines. Read this first._

**Updated:** 2026-09-13 · by: loop implement session (Claude Code · claude-opus-5[1m] · effort high)

## Queue (machine-read by LOOP.md)
```
mode: validate
tasks: T-002
recommended: Sonnet 5 or Opus 4.8 · effort high, new session
```

## State of the build
- **T-002 re-worked and pushed** at `ca71ab4` (fix commit `ebef8bc`). `ISS-057` (S1) and `ISS-058`
  (S3) closed: `infra/compose/README.md` no longer names any tool or model, and its "Custom test
  signature" section now says the `.ndb` mount is **read-write** with the `chown` reason and a
  pointer to `ISS-041`. **Documentation only** — `docker-compose.yml`, both `.sql` files,
  `.env.example` and `rogikotha-test.ndb` are byte-identical to the round-1 branch, so round 1's
  live 9/9 acceptance evidence stands; re-validation mainly has to re-read the diff.
- Branch rebased onto `bb954af` (T-006 merged), so T-002 runs against real code for the first time:
  `pnpm check` **green end-to-end**, `pnpm smoke` **4/4**, `docker compose config` valid.
- Three new S4 rows ride on the branch: **`ISS-060`** (nothing in `pnpm check`/CI guards the
  no-tool-identity rule — filed against **T-010**, which owns the workflow; that gap is why
  `ISS-057` had to be caught by a human-directed read), `ISS-059` (an `infra/`-only task cannot add
  a collectable smoke test), `ISS-061` (two `BUILD-LOG` rows for one event, per §1.2.7).

## Next, per lane (human-readable)
- **Lane A:** re-validate T-002 → merge, then T-003 → T-004 → T-005 → T-007.
- **Lane B:** idle — T-008 is blocked on T-003.

## Blockers
- None. Carried over, still your call: the Phase-0 remainder is all Lane A and `LOOP.md` §4.3 only
  pairs tasks from *different* lanes, so the rule keeps queueing one task per turn. Add a second
  Lane-A task to the Queue by hand if you want two terminals — I did not override the rule.

## Questions for the human
- **Bilingual review still requested** (not a merge blocker): T-006's invented EN+BN wording for the
  `notif.*` (5) and `admin.config.*` (15) keys is on `build/demo` (`ISS-050`); all 20 strings are
  quoted in `docs/validation/T-006.md`. Read them before T-007/T-408 build UI against those keys.
- **D-001 still wants your walkthrough** (carried over): a founder pass in both locales and themes
  before Lane B starts T-102/T-103. While there: `ISS-029` (`/me` always shows the `shirin_88`
  fixture — accept, or fix?), `ISS-028` (Terms/Privacy → `#about`, fine until the React port?).
  360 px is still unverified (`ISS-037`).
- **Minor, no action unless you disagree:** `ISS-054` — T-408's task file names the removed key
  `admin.role.current`, most likely wants `staff.role.chipTitle`. `ISS-056` — T-006's task file
  cites `evidence.notice` for the viewer disclaimer; the real key is `viewer.notice`.
