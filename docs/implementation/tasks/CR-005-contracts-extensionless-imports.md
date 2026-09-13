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
