# Code Quality Assessment: rogikotha

## Gate

`pnpm check` is the single local and CI gate: typecheck, ESLint, boundary-fixture proof, Prettier `format:check`, identity guard (`scripts/check-identity.mjs`, no tool or model identity in commits), `test:coverage`, i18n parity, two contrast checks, the CSS motion check, and the build. `pnpm smoke` runs every `smoke.test` file. CI (`.github/workflows/check.yml`) runs `pnpm check` on pushes to `main` and `bolt/**` with a PostgreSQL 18 service and per-job secrets.

## Testing

| Aspect | State |
|---|---|
| Frameworks | Vitest 4.1 workspace (`vitest.workspace.ts`), Testing Library with jsdom, Playwright (local only) |
| Test files | 99 tracked test files across `apps`, `packages` and `scripts` |
| Integration | `database` project against `DATABASE_URL_TEST`, reset to a fresh migrated schema by `global-setup.ts`, run serially; covers migrations, constraints, grants as real `rk_worker` sessions, append-only triggers, the outbox, pg-boss and the seed |
| Coverage | `@vitest/coverage-v8`, 80% lines per package, never lowered (D10). Empty packages have no executable lines |
| Smoke | 13+ smoke files (web shell, motion, live region, contracts, database grants and queue, worker, test-support, boundaries) |
| Fakes | `test-support/src/fakes/` covers every planned port and repository; `repositories-superset.test.ts` keeps fake method names a superset of the Pg stubs |

## Quick Ratings

| Criterion | Rating | Note |
|---|---|---|
| Naming clarity | good | module names fixed by `01-conventions.md` |
| Function size | good | small functions; the largest source files are generated (`i18n/src/keys.ts`) or schemas |
| Error handling | good | `Result` in contracts; the worker logs and retries or dead-letters; scripts refuse production |
| Test presence | good for the built surface | nothing tests the business flows because none exist |
| Duplication | fair | `bytea` custom type in three schema files |
| Dead code | good | stubs are deliberate and name their owner |

## Technical Debt

- 43 `TODO(` markers, 46 `ASSUMPTION(` markers, 10 `eslint-disable` lines with reasons. Most are tied to an owning task.
- Open contract shapes: `SaveDraftInput.payload`, `CorrectReviewInput.fields`, `ListExperiencesInput.filters`, `AccountsOfInput` are `unknown`; `ComposerVM.payload` is `unknown`.
- The seed bypasses commands (direct Drizzle inserts) until commands exist.
- The worker clock is the system clock, not a demo clock.
- `/api/health` returns static `unknown` probes.
- Defects are tracked in `docs/implementation/ISSUES.md` (283 rows, S1 to S4).

## Risks for the Demo Slice

- **Password hash compatibility**: the seed writes Argon2id hashes; Better Auth defaults to scrypt. A custom hash and verify pair is required (T-101's `PasswordHasher` pins m=64 MiB, t=3, p=1).
- **Encryption precondition**: drafts, evidence filenames and exact dates are stored encrypted, so the crypto adapter must exist before any write path.
- **Evidence fail-closed**: nothing becomes public until a clean scan; with no `evidence.process` handler, uploaded items stay `quarantined`.
- **High-risk class**: auth, identity and evidence Units fall under the team's high-risk validation (collaborators on, 3 to 5 adversarial tests, owner sign-off).
