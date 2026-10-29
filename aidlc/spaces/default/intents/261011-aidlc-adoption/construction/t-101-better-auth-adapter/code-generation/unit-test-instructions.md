# Unit test instructions — U8 `t-101-better-auth-adapter`

## Framework

Vitest 4 through `vitest.workspace.ts`. The projects:

- `domain`, `application`, `adapters` and `contracts` run the unit tests, with fakes from `packages/test-support`.
- `database` runs the `*.int.test.ts` files against `DATABASE_URL_TEST`, reset to a freshly migrated schema.
- `web-int` and `worker-int` are new in this Unit and run after the seed group.

Coverage uses `@vitest/coverage-v8`, with an 80% line floor per package.

## Run this Unit's tests

Every long command carries an outer `timeout`. Step 3 records the exact unit-scoped commands here once they are verified on the branch. Until then:

```bash
pnpm infra:up
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain --project application --project adapters --project contracts
timeout 600 pnpm test:int
timeout 600 pnpm smoke
timeout 1200 pnpm check
```

Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).

## What to cover (design § 11)

| Group | Tests |
|---|---|
| Domain | every transition of the account-state table; `maskEmail` edge cases (one-character local part, plus-addressing) |
| Application | every command's happy path, each refusal, one audit assertion each; the sign-in delay schedule and both counters inside `windowMinutes`; the neutral result for an unknown or limited email; the reset check against the token's account (review point 1); both registration races (review point 5); the per-network limit on reset and resend (review point 4) |
| Adapters | Crypto round trip and layout; `hmac` refuses without `macSecret` (review point 6); Argon2 hash and verify; windowed limiter; SMTP against Mailpit (integration) |
| Database | each repository method; the migration applies from empty; `findResetTokenAccount` against the library's token row |
| Web and worker | `getActor()` for anonymous, signed-in and refused sessions; `mail.send` decrypts with the mail key only and sends through Mailpit |
| Smoke | one sign-in smoke assertion |
| Adversarial | 3–5 tests by a separate agent (design § 12.2) |

Each test must be able to fail. Test names read as sentences. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package. `domain`, `application` and `adapters` must reach it in this Bolt.

## Mocking and test data

Use `test-support` fakes for the ports, with builders rather than hand-written fixtures. All data is synthetic, using `example.test` addresses. Use Mailpit for real mail in the integration tests.
