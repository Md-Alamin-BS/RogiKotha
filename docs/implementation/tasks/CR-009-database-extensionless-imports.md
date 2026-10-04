# CR-009 — Make `packages/database` importable from `apps/web` under Turbopack

| Field | Value |
|---|---|
| Story | infra — unblocks every Phase 2+ page or route handler that reads the database from `apps/web` |
| Phase / Lane | 2+ / either |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor |
| Effort setting | high |
| Estimate | 1–2 h agent (mechanical, but touches most files in the package) |
| Depends on | CR-005 (merged) — same fix, one package over |
| Parallel-safe with | anything not editing `packages/database/src`; **must not** run at the same time as a task adding new files there |
| Status | **needs queueing** — not blocked on a founder decision, just needs a session |

## Why this exists

`ISS-183` (`S2`, found by CR-005's validator). CR-005 stripped the `.js` suffix from every relative
import inside `packages/contracts/src`, because Next's Turbopack cannot resolve a `.js`-suffixed
specifier to a sibling `.ts` file when it transpiles a workspace package. **`packages/database/src`
still has the identical problem** — 124 of its 124 relative specifiers carry the suffix — and
`@rogikotha/database` is not in `apps/web/next.config.ts`'s `transpilePackages` list either.

This is proven, not predicted. A throwaway `apps/web/src/app/[locale]/dbprobe/page.tsx` containing
nothing but

```tsx
import { doctors } from '@rogikotha/database';
```

fails `next build` with exactly the `ISS-133` signature:

```
Module not found: Can't resolve './search/index.js'
  packages/database/src/index.ts:21
Error: Export doctors doesn't exist in target module
  The module has no exports at all.
Import trace: ./packages/database/src/index.ts  ->  ./apps/web/.../dbprobe/page.tsx
```

It matters because `01-conventions.md`'s dependency direction explicitly sanctions
`web|worker → database|adapters → application(ports) + contracts`. A server component or route
handler in `apps/web` reading the database is a **normal, allowed** edge — and Phase 2 opens with
exactly that. `packages/i18n` is already clean (0 suffixes) and `application`/`domain`/`adapters` are
still empty, so `packages/database` is the **only** package left carrying this.

Nothing breaks today, which is precisely why it needs queueing rather than waiting: `ISS-133` was
found mid-task by T-207a's implementer, and the cost of finding this one the same way is another
blocked task.

## Read first

1. `docs/validation/CR-005.md` — the `ISS-183` row and the probe output above
2. `docs/implementation/tasks/CR-005-contracts-extensionless-imports.md` — the same fix, already done
   once; its Hand-off records what worked and what did not (`experimental.extensionAlias` does **not**
   help)
3. `docs/implementation/01-conventions.md` §2 (boundaries) and the dependency-direction line

## Owned paths

Modify: every file under `packages/database/src/**` (import specifiers only, no logic changes);
`apps/web/next.config.ts` (`transpilePackages` only).
Touch only if verifying the fix requires it: one throwaway page under `apps/web/src/app/[locale]/`,
**removed before committing**.

## Not in scope

Any change to `packages/database`'s schema, migrations, repositories, exports, types or logic. Any
change to `packages/contracts` (CR-005 already did it). This is an import-specifier fix plus one
config line.

## Steps

1. Branch from `main`. Confirm the starting state: count the `.js`-suffixed relative specifiers
   under `packages/database/src` (expect 124) and record it.
2. Reproduce the failure first, so the fix is proven rather than assumed: add the throwaway
   `dbprobe/page.tsx` above, run `pnpm --filter @rogikotha/web build`, and keep the error text.
   (Note: a directory named with a leading underscore is a Next *private folder* and is never routed —
   the probe page must have an ordinary name or it silently is not compiled at all.)
3. Strip the `.js` suffix from every relative specifier under `packages/database/src` — including
   `./*.js`, `../*.js`, and directory-index forms such as `./search/index.js`. `moduleResolution:
   "bundler"` (from `tsconfig.base.json`) is what makes the extensionless form correct;
   `packages/contracts` and `packages/i18n` already follow it.
4. Add `'@rogikotha/database'` to `transpilePackages` in `apps/web/next.config.ts`. Leave `typedRoutes`,
   `agentRules` and the rest of that file alone.
5. Re-run the probe build: it must compile. Then **mutation-test the fix the way CR-005's validation
   did** — put a single `.js` back on one export line in `packages/database/src/index.ts`, confirm the
   build fails with the same `Module not found`, restore it, confirm green. Record both outputs.
6. Remove the probe page. `pnpm check`, `pnpm smoke`, `pnpm test:int` must all be green with **counts
   identical** to the pre-change baseline — this change alters no behaviour, so any moved number is a
   bug.
7. Close `ISS-183` as `fixed in CR-009` with how, add a `CR-009` row to `06-change-requests.md`, fill
   this file's Hand-off, write `docs/implementation/handoffs/CR-009.md`. Commit messages start
   `CR-009: `.

## Acceptance checks

| Check | How | Expected |
|---|---|---|
| No suffixed specifiers left | grep `packages/database/src` for relative specifiers ending `.js` | **0**, with the total relative-specifier count unchanged at 124 |
| Diff is import-only | filter the `packages/database/` diff for any changed line that is not an `import`/`export ... from` statement | nothing — the package's logic, types and exports are untouched |
| Database importable from web | `next build` on a page importing `@rogikotha/database`'s main barrel | compiles; and the same build fails when one `.js` is put back (mutation test) |
| Nothing else moved | `pnpm check`, `pnpm smoke`, `pnpm test:int` | green, with **identical** counts to the pre-change baseline (typecheck 9/9, i18n 777 keys, same test totals, same route-row count) |
| Worker unaffected | `pnpm --filter @rogikotha/worker typecheck` and the `database` Vitest project | green — `tsx` and Vite resolve the extensionless form fine, which is how the migrate/reset/seed scripts already run |

## Hard-rule checklist

- [ ] No behaviour change: identical `pnpm check` counts before and after.
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)
