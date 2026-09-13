# CR-005 — Make `packages/contracts` importable from `apps/web` under Turbopack

| Field | Value |
|---|---|
| Story | infra — unblocks every future page that needs a real `packages/contracts` view model |
| Phase / Lane | 2+ / either |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor |
| Effort setting | high |
| Estimate | 1–2 h agent (mechanical but touches most files in the package) |
| Depends on | none (fixes already-merged code) |
| Parallel-safe with | anything not importing `@rogikotha/contracts` mid-fix; coordinate with whichever task is first to need a real contracts view model in `apps/web` |
| Status | **needs queueing** — not blocked on a founder decision, just needs a session |

## Why this exists

`ISS-133` (S2, found by `T-207a`'s implementer). `packages/contracts/src` uses `.js`-suffixed
relative imports throughout (e.g. `config-values.ts:8` → `from './enums.js'`). Next's Turbopack
build cannot resolve these when it transpiles the package via `apps/web/next.config.ts`'s
`transpilePackages` — every consumer of `@rogikotha/contracts` from `apps/web` fails `next build`.

`T-207a`'s `emergency/page.tsx` was the first line of code in this repo to import anything from
`@rogikotha/contracts` (main barrel or any subpath) into `apps/web`. `next build` failed with
`Module not found: Can't resolve './view-models/workspace.js'` from the main barrel; switching to a
narrower `@rogikotha/contracts/config-values` subpath moved the identical failure to `./enums.js` —
proving it is not file-specific but affects every relative import in the package.

`packages/contracts/tsconfig.json` (via `../../tsconfig.base.json`) sets
`moduleResolution: "bundler"`, which (unlike `NodeNext`) expects extensionless relative specifiers
matching real source files — `packages/i18n/src` already follows that convention with no `.js`
suffixes, and its subpath imports build cleanly through the same `transpilePackages` pipeline
(`Emergency.tsx`'s `@rogikotha/i18n/format` import, added by `T-207a`, is proof). Every other
package (`domain`, `application`, `database`, `test-support`) only ever consumes `contracts` through
Vitest (Vite), which resolves the `.js` → `.ts` mapping transparently — so this never surfaced
before `T-207a`.

Tried and confirmed **not** a fix: `experimental.extensionAlias` in `next.config.ts` (Turbopack logs
the experiment as active but the build fails identically).

`T-207a` worked around this locally in `emergency/page.tsx` by hand-typing the emergency config
defaults as a local constant with a Vitest-only parity test against the real default
(`ISS-134` in that task's own log), rather than importing `DEFAULT_CONFIG_VALUES`. That workaround
is scoped to one page and does not generalize — it blocks most of Phase 2+, which needs real
contracts view models rendered on real pages.

## The fix

Strip the `.js` suffix from every relative import in `packages/contracts/src` (mechanical — a
find/replace across the package, e.g. `from '\.\/([A-Za-z0-9_-]+)\.js'` → `from './$1'`, plus the
same for `../` imports), matching the convention `packages/i18n/src` already uses. Confirm:

- `pnpm check` (typecheck + tests) stays green across the whole workspace — `moduleResolution:
  "bundler"` should resolve the extensionless specifiers under `tsc` exactly as it already does for
  `packages/i18n`.
- Vitest still resolves every `packages/contracts` test unchanged (Vite's resolution is unaffected by
  the suffix either way, so this should be a no-op there).
- A real `apps/web` page importing `@rogikotha/contracts` (the main barrel, not just a subpath)
  builds cleanly under `next build` — add or reuse a minimal page/route that imports the barrel to
  prove it, or convert `T-207a`'s `emergency/page.tsx` workaround back to a direct import as the
  proof.

If stripping the suffixes turns out to break something non-obvious (e.g. a build step outside this
repo's control that expects `NodeNext`-style extensions), fall back to hunting for a working
Turbopack-side resolver config instead — but try the direct fix first; it is the smaller change and
matches the sibling package's existing convention.

## Owned paths

Modify: every file under `packages/contracts/src/**` (import specifiers only, no logic changes).
Touch only if verifying the fix requires it: `apps/web/src/app/[locale]/(patient)/emergency/page.tsx`
(optionally switch its workaround back to a direct `@rogikotha/contracts` import once this lands —
coordinate with whoever owns that file at the time; do not fight an in-flight task over it).

## Not in scope

Any change to `packages/contracts`'s actual exports, types, or logic. This is an import-specifier
fix only.

## Steps

1. Read `ISS-133`'s full row (in whichever branch/merge currently carries it — check `ISSUES.md` on
   `build/demo`) for the exact reproduction and what was already ruled out.
2. Strip `.js` suffixes from every relative import in `packages/contracts/src`.
3. `pnpm check` green.
4. Prove the Turbopack build actually resolves it: a real `apps/web` page or a throwaway
   `next build` smoke check importing the main barrel.
5. Close `ISS-133` as `fixed in CR-005`.

## Acceptance checks

| Check | How | Expected |
|---|---|---|
| Typecheck/tests unaffected | `pnpm check` | green, same test counts as before this change |
| Contracts importable from web | `next build` (or `pnpm --filter web build`) on a page importing `@rogikotha/contracts`'s main barrel | builds cleanly, no `Module not found` |
| No behavior change | `pnpm test:int` (if any consumer package has one) | green, unchanged |

## Hand-off (implementer fills in)

### What changed

Stripped the `.js` suffix from every relative import specifier in
`packages/contracts/src` — **99 specifiers across 39 files** (`import`/
`import type`/`export *` alike), mechanical find-and-replace only, no
logic, type or export change: `enums.ts`, `errors.ts`, `actor.ts`,
`ids.ts`, `time.ts`, `page.ts`, `config-values.ts`, `result.ts`,
`index.ts` (46 `export *` lines), all 14 `schemas/<module>.ts` files, all
19 `view-models/<page>.ts` files, plus the 7 test files inside `src/**`
that also used `.js`-suffixed relative imports (`actor.test.ts`,
`config-values.test.ts`, `contracts.smoke.test.ts`, `errors.test.ts`,
`ids.test.ts`, `result.test.ts`, `schemas.test.ts`). `packages/contracts`
now follows the same extensionless-relative-import convention
`packages/i18n/src` already used.

Converted `apps/web/src/app/[locale]/(patient)/emergency/page.tsx` back to
a direct `DEFAULT_CONFIG_VALUES` import from `@rogikotha/contracts`'s
**main barrel** (`.`, not a subpath), per this task's step 4 and the
"Owned paths" note that permits touching this file to prove the fix. The
hand-typed `EMERGENCY_DEFAULTS` local constant and its long
`// ASSUMPTION(T-207a)` comment are gone; a short `// ASSUMPTION(CR-005)`
comment now explains only the remaining, unrelated gap (`config.current()`
is still a T-105 stub, so this reads the package's static default, not a
live query). `page.parity.test.ts` was **adapted, not deleted**: its old
job (catching drift between the hand-typed copy and the real default) no
longer applies once there is no second copy, so it now asserts
`DEFAULT_CONFIG_VALUES.emergency` still holds the exact values
`components/patient/Emergency.test.tsx`'s hardcoded fixture and the demo
storyboard expect.

### Not done and why

Nothing in scope was skipped. Considered and rejected: hunting a
Turbopack-side resolver config instead (task step 2's fallback) — not
needed, the direct fix worked cleanly on the first attempt with no
non-obvious breakage, exactly as the task predicted for the common case.

### Questions for the human

None. This was a mechanical, unambiguous fix with a working proof; no
design choice was involved beyond the one `// ASSUMPTION(CR-005)` marker
already logged as `ISS-171` (S4, informational — the emergency page still
reads a static default, not a live query, which is T-105's scope, not
this task's).

### Follow-ups

- `ISS-171` (S4) — `emergency/page.tsx`'s `// ASSUMPTION(CR-005)` marker:
  still reads `DEFAULT_CONFIG_VALUES.emergency` (static), not a live
  `config.current()` query; owner T-105.
- `ISS-172` (S4, fixed here) — `page.parity.test.ts` adapted rather than
  deleted so the coverage a drift-guard test provided is not lost.
- `ISS-134`'s underlying need (a real `config.current()` query) remains
  open under T-105; only the specific hand-typed-workaround this row
  named is gone.

### `pnpm check` output summary

**Baseline** (before any change, fresh `pnpm install` in this worktree):
typecheck 9/9 packages green; `eslint .` — 0 errors, 1 pre-existing
warning (`packages/i18n/src/routing.ts:17`, unrelated); `vitest run
--config vitest.workspace.ts` — **33 files, 110 passed + 2 expected-fail
(112)**; `pnpm i18n:check` — "777 keys, both locales, no placeholder or
ERROR_CODES mismatches"; `pnpm -r build` — green, `next build` **37 route
rows** (34 app rows + `/_not-found` + `/api/health`) + `ƒ Proxy
(Middleware)`. `pnpm smoke` — **6 files, 9 tests**, green. `pnpm test:int`
— 7 files, 27 passed + 2 expected-fail (29).

**After this fix**: identical counts throughout — typecheck 9/9 green;
lint 0 errors / 1 same pre-existing warning; `vitest run` **33 files, 110
passed + 2 expected-fail (112)**; `pnpm i18n:check` — 777 keys, same
result; `pnpm -r build` — green, `next build` **same 37 route rows** + `ƒ
Proxy (Middleware)`, now with `/[locale]/emergency` importing the main
`@rogikotha/contracts` barrel directly and no `Module not found` error.
`pnpm smoke` — **6 files, 9 tests**, unchanged. `pnpm test:int` — 7 files,
27 passed + 2 expected-fail (29), unchanged. No test was added, removed,
retargeted or skipped by this task (`page.parity.test.ts`'s one test was
edited, not deleted — see "What changed").

### Live-render proof (the acceptance table's "Contracts importable from
web" row, executed for real)

`pnpm --filter @rogikotha/web start` on port 3101 after the `next build`
above, then:

```
curl -s http://localhost:3101/en/emergency | grep -oE 'tel:[0-9-]+'
  → tel:999, tel:16263, tel:09612-119911 (x2 each — head-grid + card href)
curl -s http://localhost:3101/en/emergency | grep -o 'Last verified[^<]*'
  → "Last verified 21 August 2026"
curl -s http://localhost:3101/bn/emergency | grep -oE '০[০-৯]{2}[০-৯১২-]+১১'
  → ০৯৬১২-১১৯৯১১ (x2)
curl -s http://localhost:3101/bn/emergency | grep -o 'সর্বশেষ[^<]*'
  → "সর্বশেষ যাচাই ২১ আগস্ট ২০২৬"
```

Every value is byte-identical to what the hand-typed `EMERGENCY_DEFAULTS`
constant produced before this fix (same four literals), now sourced live
from `@rogikotha/contracts`'s `DEFAULT_CONFIG_VALUES.emergency` through a
real `next build` + `next start`, not just a Vitest-resolved import.

### Hard-rule evidence

- No agent/tool attribution — `grep -rniE
  "claude|anthropic|gpt|openai|co-authored" packages/contracts/src
  apps/web/src/app/\[locale\]/\(patient\)/emergency` → no matches.
- No number stands for quality / no logic changed — this task's diff is
  import-specifier text only (`git diff --stat packages/contracts/src` →
  "39 files changed, 99 insertions(+), 99 deletions(-)", i.e. one line
  changed per import, nothing else); confirmed no `.ts` file's non-import
  lines differ: `git diff packages/contracts/src | grep -E '^[+-]' | grep
  -vE "^(\+\+\+|---)" | grep -vE "(from |export \* from )'\."` → no
  matches.
- Bengali and English both work, numerals follow language — proven live
  above (`০৯৬১২-১১৯৯১১` / `09612-119911`, Bengali digits with the hyphen
  kept, matching `Emergency.test.tsx`'s existing assertions).
- Every other hard-rule checklist item is unaffected by an
  import-specifier-only change in a package with no UI/copy/logic; not
  re-evidenced here (see `T-003`/`T-207a`'s hand-offs for the original
  evidence, still valid — nothing in this task's scope could break them).

### Run record

`Claude Code · claude-sonnet-5 · effort high · start 3f3e52b → end 2a93390`
