# Validation — T-003 Contracts package (second, independent review)

> **Why this file exists.** Two validate sessions ran against T-003 at the same time. The other
> finished first, recorded `docs/validation/T-003.md` (verdict **PASS**, "no `S1` or `S2`
> findings") and merged `task/t-003-contracts` into `build/demo` as `e92dc4b`; it also removed
> this session's worktree mid-run. This review reached a different conclusion: two **S2** findings
> (`ISS-077`, `ISS-078`), both re-confirmed live on merged `build/demo` after the fact. T-003 is
> **already merged** — nothing here reopens it or changes the queue. The record is kept so the
> findings are not lost, and the verdict below should be read as advice on what to fix next, not
> as a gate. `docs/validation/T-003.md` remains the turn's official record.

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation |
| Commit range | `9416b0b..f0ad193` (branch `task/t-003-contracts`, rebased onto `origin/build/demo` by this session) |
| Date | 2026-09-13 |
| Validator | Claude Code · `claude-opus-5[1m]` · effort high — validation evidence only, never attribution |
| Implementer model class | M1 (task file: "M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra") |

Cross-vendor validation was not available in this session. The implementer ran `claude-sonnet-5`;
this validation ran a different model (`claude-opus-5[1m]`) from the same vendor. T-003 is **M1**,
not M3, so `LOOP.md` §2.2's same-model human-approval line does not apply.

## Gates
| Gate | Command / method | Exit / result |
|---|---|---|
| G1 self-check (re-run) | `pnpm typecheck` / `lint` / `test` / `i18n:check` / `build` in a fresh worktree | **green** — typecheck 9/9 projects, `eslint .` clean, 11 files / 39 tests, i18n parity 764 keys ("no placeholder or ERROR_CODES mismatches"), build 9/9 |
| G2 acceptance | 6-row table below, every row re-run live | **6/6 pass** (row 4 passes on intent; its literal expected number is wrong — ISS-076) |
| G3 regression smoke | `pnpm smoke` | **green** — 3 files / 5 tests (`pnpm e2e:smoke` does not exist until T-503) |
| G4 review | full `git diff origin/build/demo...HEAD` read; enum / command / error-code / i18n cross-checks scripted; `newPublicId` and `encodeCursor`/`decodeCursor` probed empirically | **7 findings** — 0xS1, 2xS2, 2xS3, 3xS4 |

`pnpm check` could not be run as a single command in a fresh worktree: pnpm's pre-script
dependency-status check re-runs `pnpm install`, which exits 1 with `ERR_PNPM_IGNORED_BUILDS`
(`@parcel/watcher`, `@swc/core`) and auto-writes an `allowBuilds` placeholder stub into
`pnpm-workspace.yaml`. This is the known `ISS-055` condition, not a T-003 defect. Every stage of
`check` was therefore run individually with `--config.verify-deps-before-run=false`, which is the
same work in the same order; the stray `pnpm-workspace.yaml` edit was reverted, not committed.

## Acceptance table
| Check | Expected | Observed | Pass/fail |
|---|---|---|---|
| Package builds | `pnpm --filter @rogikotha/contracts typecheck` exit 0 | exit 0, `tsc -p tsconfig.json` clean | **pass** |
| Tests | all green; at least 12 tests | 8 files / 23 tests, all green | **pass** |
| Enum parity | `grep -c "as const" packages/contracts/src/enums.ts` at least 35 | 38 | **pass** |
| Error codes complete | equals the count of codes in 03 §2 ("expect 40") | the acceptance grep returns **39**; the real count in 03 §2 is **38**, and `ERROR_CODES` is a byte-identical 38-member set (scripted `diff` of both extractions: no difference, no duplicates on either side). The 39th grep hit is the `'.'` literal in `errorMessageKey`. The expectation "40" is wrong (ISS-076); the check's *intent* — `ERROR_CODES` complete against 03 §2 — holds exactly | **pass (on intent)** |
| No `{en, bn}` in VMs | no matches | `grep -rn "bn:" packages/contracts/src/view-models` → no matches | **pass** |
| No framework imports | no matches | `grep -rnE "from '(next\|react\|drizzle\|pg)" packages/contracts/src` → no matches; the only non-relative imports in the whole package are `zod`, `uuid` and `vitest` | **pass** |

### Cross-checks run beyond the acceptance table
| Check | Method | Result |
|---|---|---|
| Every data-model §0 enum present, exact values, exact order | script: parse the 36 table rows of `02-data-model.md` §0, require an `as const` array in `enums.ts` whose members match element-for-element | **36/36 exact**, 0 failures (the two extra `as const` arrays are `CRITICAL_REPORT_REASONS` and `PROTECTED_PROFILE_FIELDS`, both required by the task) |
| Every command in the 03 §4 catalogue has an input schema | script: extract all 84 catalogue command names, match against the 116 `*Input` exports across the 14 schema files | **83/84**. The one miss is `account.signIn`, whose absence is deliberate and documented in `schemas/account.ts`'s file header (Better Auth owns it; the session-to-Actor hook is not a zod-validated command input) — correct, not a gap |
| Every `ERROR_CODES` entry resolves to a real dictionary key | independent re-implementation of the code-to-key mapping, run against `packages/i18n/messages/en.json` | **38/38 resolve**, 0 missing |
| Reverse direction: every `errors.*` key has a code behind it | same script, opposite direction — *not* covered by `pnpm i18n:check`, which only walks codes to keys | **1 orphan: `errors.auth.accountSuspended`** → ISS-078 |
| `ConfigValues` shape and ranges vs data-model §11 | field-by-field read | shape exact; all 8 documented ranges encoded exactly; the §11 always-enabled-reasons invariant is not encoded → ISS-079 |
| `Actor` shape vs `01-conventions.md` §5 | field-by-field read | **exact**, including `stepUp?: { rechecked_at: string }` |
| `capabilitiesForRole` vs 03 §2 | read, plus the branch's own table tests re-run | correct for all three roles and both toggle pairs |
| `DoctorProfileVM` vs the field list spelled out in the task's Step 11 | field-by-field read | **exact**, including `DistributionVM` |
| `EVIDENCE_LIMITS` vs 03 §4 `evidence.intake` | read | 10 / 15 MB / 100 MB — exact |
| Boundary (`01-conventions.md` §2, "contracts imports zod only") | grep every non-relative import in the package | `zod`, `uuid` (installed by this task's own Step 1), `vitest` (tests) — clean |
| Files outside owned paths | `git diff --name-status origin/build/demo...HEAD` | 55 files: all under `packages/contracts/**` plus the standard register files (`ISSUES.md`, the task file, `handoffs/T-003.md`, `dependency-check-log.md`) and `pnpm-lock.yaml`, which this task's own dependency additions require. No violation |
| Tool/model identity | `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` plus a grep of the whole diff for `claude\|anthropic\|gpt-\|openai\|codex\|puku\|sonnet\|opus\|co-authored\|copilot\|cursor` | Author **and** committer are `Md. Al-Amin <102671792+Md-Alamin-BS@users.noreply.github.com>`; no trailer. In `packages/**` every hit is the word "cursor" (pagination). In `docs/**` the only hits are the handoff's `Run record` field and a grep pattern quoted as hard-rule evidence — both the already-established allowed forms (see `docs/validation/T-001.md`, `docs/validation/D-001.md`). **Clean** |

## Adversarial probes (not required for M1 — run anyway on the two hand-rolled algorithms)
| Probe | Method | Result |
|---|---|---|
| `newPublicId()` symbol distribution | 50 000 ids, per-position alphabet size | positions 0-8 use all 32 symbols; **position 9 uses exactly 2** (`4`, `m`) → **ISS-077** |
| `newPublicId()` uniqueness | 50 000 ids | 50 000 / 50 000 unique — the shipped test's property still holds, which is precisely why it misses ISS-077 |
| `encodeCursor` / `decodeCursor` round-trip | ASCII, Bengali (`ডা. ফারহানা`, `ঢাকা`), a 4-byte emoji plus a ZWJ sequence, empty object, empty array, nested with `null`, and every payload length 0-40 (all three `%3` remainders) | **all round-trip exactly** — no defect found in the hand-rolled codec |

These probes ran in a scratch file and were removed; they are not committed (`LOOP.md` §2.3 — the
validator never fixes code, and a committed failing test would make `pnpm check` red). The
regression test for ISS-077 belongs to the fixer and is specified in the finding below.

## Findings
| ISS | Severity | file:line | What | Why it matters | Suggested fix |
|---|---|---|---|---|---|
| ISS-077 | **S2** | `packages/contracts/src/ids.ts:36-45` | `newPublicId()` yields **46 bits** of entropy, not the 50 its own comment claims, and **every public id ends in `4` or `m`** | `uuidV4().replace(/-/g,'').slice(0, 13)` takes 13 hex chars, but hex char index 12 is UUIDv4's **version nibble — always `'4'`**. It lands in the low 4 bits of `n`, and because `out` is built by prepending, the `i = 0` symbol (`n & 31`) is the *last* character: its index is always `0b?0100`, i.e. 4 (`'4'`) or 20 (`'m'`). Measured, not inferred: over 50 000 ids, position 9 has an alphabet of exactly 2. Public ids appear in every URL of the storyboard, so the signature is user-visible, and `ISS-073`'s "repacks 50 of its bits" is inaccurate | draw the hex from a slice carrying no version or variant nibble — `uuidV4().replace(/-/g,'').slice(19, 32)` (chars 17-31 of a v4 are all random) — or concatenate two v4s. Add a regression test asserting each of the 10 positions reaches more than 2 distinct symbols over ~20 000 ids; the existing uniqueness test cannot catch this |
| ISS-078 | **S2** | `packages/contracts/src/errors.ts:4-40` (root cause: `docs/implementation/03-routes-and-contracts.md` §2) | `auth.account_suspended` exists nowhere in `ERROR_CODES`, although `docs/design/auth-screens-spec.md:100` specifies it ("Suspended/banned accounts get `auth.account_suspended` with the appeal route") and 03 §4's `account.signIn` refuses `suspended\|banned` | `errors.auth.accountSuspended` is already shipped in both dictionaries by T-006 and is the **only** one of the 39 `errors.*` keys with no code behind it. T-101 will need to return this code and will find no member for it. This is the concrete answer to the implementer's open ISS-076 question: 03 §2's union really is short at least one code — the task file's "40" was not simply a wrong number | the human adds `auth.account_suspended` to 03 §2 first (the doc is the source of truth, and implementers are forbidden to invent codes — T-003 was right not to), then it is copied into `ERROR_CODES` in the same commit, per `errors.ts`'s own header rule |
| ISS-079 | S3 | `packages/contracts/src/config-values.ts:28` | `reportReasons: z.array(z.enum(REPORT_REASONS)).min(1)` lets config disable `privacy`, `threat`, `unsafeFile`, `dangerous` and `other`, which data-model §11 says are **always enabled** | The invariant is neither encoded, nor exported as a constant, nor marked with a `TODO(T-xxx)` naming an owner — unlike every other deferred detail in this package. `config.invariant` exists as an error code precisely for this class of rule, and T-408 will otherwise have to re-derive the list from the doc | export `ALWAYS_ENABLED_REPORT_REASONS = ['privacy','threat','unsafeFile','dangerous','other'] as const` next to `CRITICAL_REPORT_REASONS`, and either enforce it with `.refine()` or add a `// TODO(T-408)` line saying where the check lives |
| ISS-080 | S3 | `packages/contracts/src/page.ts:26-135`, `packages/contracts/src/time.ts` | The package's two hand-rolled algorithms ship untested: ~110 lines of base64url and UTF-8 codec in `page.ts`, and all of `time.ts` (`toIso`, `fromIso`'s throw path, `addDays`, `monthYear`) | Both are correct today — this validation round-tripped the codec across ASCII, Bengali, 4-byte emoji and every length 0-40 without a failure — but they are the highest-risk code in a package that 30+ later tasks build on, and nothing pins their behaviour against a future "simplification" (the handoff itself warns a reader not to attempt one) | add the round-trip cases used here as `page.test.ts`, and a small `time.test.ts` covering `fromIso`'s `InternalError` and `addDays` across a month boundary |
| ISS-081 | S4 | `packages/contracts/package.json:15` | The manifest records `"zod": "^4.6.2"`, not the `^4.5.4` the task pinned; `00-master-plan.md` §3 pins **Zod 4.5.x**, which this range no longer admits | Both the handoff and the dependency-check-log entry state that `zod@^4.5.4` was used, so the records disagree with the file. Harmless today (4.6.2 is stable and vetted in the log), but the pin table and the manifest have silently diverged | the human decides: relax `00-master-plan.md` §3 to `4.6.x`, or set the manifest back to `^4.5.4`. The same question applies to `"uuid": "^13.0.2"` vs the task's `^13` (see ISS-075) |
| ISS-082 | S4 | `docs/implementation/handoffs/T-003.md`, `docs/implementation/tasks/T-003-contracts.md` (Hand-off) | Record inaccuracies: both say "18 `view-models/<page>.ts` files" and then list 19 (there are 19 on disk, matching the task's Owned paths); the handoff's `Branch · commit` field still reads "(see run record below — filled after the commit)" and no start/end commit hash was ever filled in, which `LOOP.md` §1.2.5 requires | Nothing is missing from the build — this is purely the audit trail. The commit-hash gap is the one that costs later: the handoff cannot be tied to a commit without re-deriving it from the log | correct the count to 19 and fill `Branch · commit` and the run record with `TOOL · MODEL · EFFORT · start/end commit` when the ISS-077 fix lands |
| ISS-083 | S4 | `docs/implementation/tasks/T-003-contracts.md` Step 11 | The view-model owner map reads "experience/thread/evidence → T-307/T-308/T-402". Read positionally that assigns `thread` → T-308 and `evidence` → T-402, but T-308 is *evidence-viewer* and T-402 is *discussion-ui* — the pairing is transposed in the task file | The implementer assigned `thread` → T-402 and `evidence` → T-308, i.e. the semantically correct reading, but did not flag the task-file error, so the next reader hits the same contradiction (cf. ISS-054, ISS-056) | the human fixes the task file's Step 11 to "experience/thread/evidence → T-307/T-402/T-308"; the code needs no change |

## Hard-rule evidence checked
All three ticked items in the task file were re-verified independently, not taken from the
hand-off:

- **"No number stands for quality"** — `grep -rniE "rating|score" packages/contracts/src` → no
  matches. Confirmed further by reading `DistributionVM` (`counts` / `total` / `limitedData`),
  which is a distribution rather than a computed score, and by the absence of any numeric
  aggregate on `DoctorProfileVM` other than `accountsCount` and the per-condition `count`.
- **"Reporter identity never reaches any public projection"** — `grep -rn "reporterAccountId"
  packages/contracts/src` → no matches. Read `view-models/case-tray.ts`: `CaseTrayVM.reporter` is
  typed as the literal `'restricted'`, so the type system itself makes an id unassignable. The
  check was widened beyond the ticked item to 03 §2's stronger rule ("View models never contain
  `accountId`, emails, private linkage, or original filenames"):
  `grep -rniE "accountid|email|filename|file_name|originalname"` over `view-models/` returns only
  three comment lines stating the rule, plus `workspace.ts`'s `emailSecurity` / `emailModeration`
  / `emailEvidence` / `emailDiscussion`, which are the owner's own notification-preference
  booleans, not addresses. Clean.
- **"No agent/tool attribution in any file or commit"** — see the Tool/model identity row above.
  Author and committer are the human's on the single commit; no `Co-Authored-By`; no tool name in
  `packages/**`.

The two unticked hard rules that apply to this package were also checked: no `{en, bn}` pairs in
any view model (bilingual text fields are plain `string`, with the locale resolved server-side),
and the dependency direction.

## Verdict
**FAIL** — as this review would have ruled had it finished first. **Moot in practice:** the
parallel session's `PASS` had already merged T-003 as `e92dc4b` before this review could report.
Both S2 findings were re-confirmed on merged `build/demo` afterwards, so they are live in the
foundation now and need a follow-up commit rather than a re-validation.

Why this would have been a FAIL rather than PASS WITH FOLLOW-UP: `ISS-077` is a measured defect in
code that `packages/contracts` alone owns. `LOOP.md` §2.5 allows PASS WITH FOLLOW-UP only when every
follow-up has an owner task, and no later task may edit `packages/contracts/src/ids.ts` — it is
outside every one of their Owned paths — so "merge and fix later" had nowhere legitimate to land the
fix. It is *not* an S1: no hard rule, no private data and no demo path breaks; 46 bits is still far
beyond any collision risk at demo scale; and because the *format* of a public id does not change,
fixing the generator after the merge costs no migration. That last point is what makes the merge
recoverable: the fix is still a clean, self-contained commit.

Now that T-003 is merged, the cheapest route is a small `contracts` follow-up task (a `CR-` entry
per `LOOP.md` §5, or folded into whichever task next opens `packages/contracts`), in this order:

1. `ISS-077` — `ids.ts` plus a per-position distribution test. Two lines and one test.
2. `ISS-079`, `ISS-080` — same package, no other owner, cheap alongside it.
3. `ISS-082` — fill T-003's run record and commit hashes at the same time.

`ISS-078`, `ISS-081` and `ISS-083` need the human, not an implementer, and must not be "fixed"
silently in code (`04-handoff-and-validation.md` §5).

**Seeded data caveat.** Because `ISS-077` is now merged, every public id generated before the fix —
including anything T-007 seeds — carries the `4`/`m` signature. The id *format* does not change, so
old ids stay valid and no migration is required; but if the demo fixtures are built before the fix
lands, re-running the seed afterwards is worth it so the storyboard's URLs do not all share a tail.

## Residual risk / decisions for the human
- **`ISS-078` answers `ISS-076`.** The implementer asked whether 38 is the right error-code count
  or whether 03 §2 is missing codes. The evidence says the latter, for at least one: the auth spec
  names `auth.account_suspended`, and the dictionaries already carry its string. `pnpm i18n:check`
  cannot catch this because it only walks codes to keys; a reverse check would have. Worth adding
  that direction to `packages/i18n/scripts/check-parity.mjs` (owner T-010 / CI) so the next missing
  code fails a gate instead of waiting for a reader.
- **Still open from the implementer, unchanged by this validation:** `ISS-074` (the closed
  `male|female` gender filter in `schemas/search.ts` — T-206 builds on it) and `ISS-075`
  (`uuid@14` is current; the `^13` pin was kept deliberately, and its `v7()` fix is relevant to
  `ids.ts`). Note that `ISS-075` and `ISS-077` touch the same file — if the founder wants the
  `uuid@14` bump, doing it in the same re-work session is the cheapest moment.
- **Not a T-003 defect, but it will keep costing time:** `ISS-055`. Every fresh worktree hits
  `ERR_PNPM_IGNORED_BUILDS` on its first `pnpm check`, and pnpm auto-writes a placeholder
  `allowBuilds` block into the tracked `pnpm-workspace.yaml` that has to be reverted by hand.
  Three sessions have now worked around it individually. Deciding the build-script policy once —
  committing a real `allowBuilds` block with `true`/`false` values — would end it.
