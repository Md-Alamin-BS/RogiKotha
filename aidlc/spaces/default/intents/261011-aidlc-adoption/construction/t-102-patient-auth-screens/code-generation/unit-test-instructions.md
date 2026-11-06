# Unit test instructions — U9 `t-102-patient-auth-screens`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U9 uses two of them:

- `web` (`apps/web/vitest.config.ts`, jsdom): the `auth-form.ts` helpers, the server-action tests, the component tests and the page tests. Testing Library renders each component in `en` and `bn`.
- `web-int` (node, serial, group 3): `*.int.test.ts` under `apps/web/src`, against `DATABASE_URL_TEST` and Mailpit.

U9 adds no Playwright test. The design asks for none, and the demo end-to-end run on `main` must stay green. Coverage uses `@vitest/coverage-v8`.

## Where it runs

Each Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigned, one of `rogikotha_test_w1` to `rogikotha_test_w6`, and never at another worktree's database. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. The file filter form was checked on `main` on 2026-11-05: `--project web apps/web/src/server/actions/auth-form.test.ts apps/web/src/components/patient/auth/` ran 3 files and 48 tests green before this Unit's code. Step 3 re-runs it in the worktree and records the count.

```bash
pnpm infra:up

# auth-form helpers, parsers, safeAuthNext, readPendingCookie, rateLimitMessage:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth-form.test.ts

# Server actions (auth.ts, account.ts getContributionAccess):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth.test.ts apps/web/src/server/actions/account-access.test.ts

# Components (every file under components/patient/auth/, plus the masthead and profile link):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/auth/ apps/web/src/components/patient/Masthead.test.tsx apps/web/src/components/patient/profile/

# Pages in U9's own files, and the shared pages test (only checked, edited only if a placeholder row fails):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web "apps/web/src/app/[locale]/(patient)/register/" "apps/web/src/app/[locale]/(patient)/sign-in/" "apps/web/src/app/[locale]/(patient)/verify-email/" "apps/web/src/app/[locale]/(patient)/reset-password/" "apps/web/src/app/[locale]/(patient)/me/security/" apps/web/src/app/pages.test.tsx

# Integration against the assigned test database and Mailpit (register -> Mailpit -> confirm -> allowed):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/actions/auth-screens.int.test.ts

# The Unit's smoke file, then the whole cumulative smoke suite:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/auth/auth-screens.smoke.test.tsx
timeout 600 pnpm smoke

# Adversarial tests (Step 14, written by a separate agent):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/auth-screens.adversarial.test.ts

# i18n parity and the gate:
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

If a filter's bracketed or parenthesised path does not match in the shell, pass the file path in quotes, as above. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## What to cover (`frontend-components.md` § 7, `functional-spec.md` § 7)

| Group | Tests |
|---|---|
| `auth-form.ts` | `safeAuthNext` refuses `/sign-in`, `/admin`, `/en/Admin`, `/en/%61dmin`, `/bn/SIGN-IN`, `//x`, `https://evil.example` and keeps `/en/experiences/abc`; `readPendingCookie` with a malformed cookie, a bad address and a bad `next`; `rateLimitMessage` at 1, 59, 60, 61 s and with none; each parser's refusals; no submitted value in any returned state |
| Actions | every action's `ok` and each refusal mapping; register gives the identical cookie and redirect for a new and an existing address and never signs in; mismatched passwords skip the command; sign out everywhere does nothing without `confirm=yes`; `rk.pending` deleted by sign-in, confirm, sign-out and sign-out everywhere; `internal` logged with `code` and `correlationId` only |
| `getContributionAccess` | anonymous → `signed-out`; `pending_verification` → `unconfirmed`; `active` verified → `allowed`; suspended and restricted → `unavailable` |
| Components | every new component in `en` and `bn`; `AccountControl` unconfirmed with grapheme-safe Bengali initials; `ContributionGate` in all four states and both purposes, `returnTo` sanitised, fail-closed when the query throws |
| Pages | noindex on every page; `referrer: no-referrer` on `/verify-email` and `/reset-password`; one `h1`; `/me/security` redirects when signed out; the four `/verify-email` panels; `confirmed=1` without a verified actor shows no done panel |
| Integration | register → Mailpit token → `confirmEmail` → `getContributionAccess() === 'allowed'`, called as a server component calls it, with the request cookies kept |
| Smoke | the pending screen and the gate's signed-out prompt |
| Adversarial | 3–5 tests by a separate agent: enumeration by response, reset-token reuse, signed-out `/me/security`, unconfirmed actor cannot publish or comment, a GET of the token link changes nothing |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U9 the package that moves is `apps/web`; it must stay at or above 80% and is never lowered to pass (D10). Record the before and after figures in `code-summary.md`.

## Mocking and test data

- Application ports: the `test-support` fakes and builders, never hand-written fixture objects. In `apps/web` tests, use the existing helpers that already wrap them (`components/patient/auth/auth-test-support.ts`, `server/request-context-test-support.ts`), because nothing in `apps/*` may import `test-support` directly.
- Async server components and the gate: mock `@/server/actions/account` (and `@/server/actions/auth` where a form is rendered), as the page tests on `main` already do.
- Mail: Mailpit in the integration test only; the unit tests use the fake mail port.
- Data: synthetic only. Every address uses `example.test`, every name is invented, and no real person or facility appears anywhere.
