# Code Quality Assessment — rogikotha

## Summary

The foundation is small, careful and heavily annotated. Its quality is good for what exists. The main gaps are what does not exist yet: the domain and application layers, enforced boundaries, CI and coverage measurement. Ratings use the code-analysis 3-point scale.

| Dimension | Rating | Basis |
|---|---|---|
| Naming clarity | good | Module names fixed across packages; descriptive identifiers; test names read as sentences |
| Function size | good | Most functions are short and single-purpose (`relayOnce` is the largest at about 50 lines) |
| Error handling | good | `Result`/`err` for expected failures; worker env fails fast; relay never throws; poller catches and logs; scripts set `exitCode` |
| Test presence | fair | Implemented modules have tests; empty layers have none; no coverage figure |
| Duplication | fair | `.env` loading repeated in three places (`database/src/env.ts`, `worker/src/env.ts`, `test-support/src/seed/seed.ts`); three structurally identical logger interfaces (worker `Logger`, `QueueLogger`, fake `CollectingLogger`) until a `Logger` port exists |
| Dead code | fair | Unused declared dependencies (see `dependencies.md`); `LOG_LEVEL` parsed but unused; 118 stub methods by design |

## Tests

- **Framework**: Vitest 4 with one project per package (`vitest.workspace.ts` → `packages/*/vitest.config.ts`, `apps/*/vitest.config.ts`). The web project uses jsdom and Testing Library.
- **Inventory**: 46 test files, about 174 test cases (counted by `it(`/`test(` calls; one database file, `validator-probes.int.test.ts`, declares its cases another way and is not in that count).

| Project | Files | Kinds |
|---|---|---|
| web | 15 | component (en and bn rendering), FD-022 lawful-copy placement and key usage, emergency parity, titles, smoke |
| contracts | 8 | result, errors, ids, actor, config values, schemas, workspace/framework-free smoke |
| database | 9 | integration against `DATABASE_URL_TEST`: migrations from empty, constraints, append-only triggers, outbox, pg-boss queue and validator, client, validator probes; grants smoke |
| test-support | 7 | builders, corpus, CR-008 validation, fakes, fake-vs-stub superset, seed integration, smoke |
| worker | 4 | outbox relay (9 cases), logger redaction, forbidden-import grep, smoke |
| i18n | 3 | formatters, messages, smoke |
| domain, application, adapters | 0 | `passWithNoTests: true` |

- **Integration isolation**: the database project includes only `*.int.test.ts` and `*.smoke.test.ts`, resets the test database once per file in `test-setup.ts`, and runs files serially (`fileParallelism: false`). Other projects exclude `*.int.test.ts`. Because `pnpm test` runs every project, the database project needs the compose PostgreSQL to be running.
- **Coverage**: none measured. `@vitest/coverage-v8` 4.1.11 is installed at the root, but no Vitest config has a `coverage` block and no script passes `--coverage`. The classic scope's default posture (`org.md` Testing Posture) asks for an 80% line-coverage floor and CI execution before merge. Neither is measurable today.
- **E2E**: none. Playwright and axe are planned for T-503.

## Linting and Formatting

- ESLint 10 flat config with `typescript-eslint` `recommendedTypeChecked` and the project service, plus `consistent-type-imports`, `no-floating-promises` and `no-console` (warn/error allowed). Config files are excluded from type-aware rules. `ui-design-prototype/`, `tools/`, `docs/` and agent-tooling directories are ignored.
- Inline suppressions are few, and each carries a reason (for example, `no-console` in the JSON logger and the seed CLI summary, and `no-unsafe-assignment` on next-intl's `createNavigation`).
- **Boundary rules absent**: `// T-010 adds boundaries here`. The documented dependency direction is not machine-checked, except by the worker's grep test.
- **Prettier** is configured (`prettier.config.mjs`), but there is no `format` or `format:check` script and `pnpm check` does not run it.
- **TypeScript strictness**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`.
- **i18n gate**: `pnpm i18n:check` fails on missing or empty keys, untranslated identical values, placeholder mismatch, error-code to key mismatch in both directions, and a stale `keys.ts`.

## CI/CD

None. There is no `.github/workflows/` (the `.github/` folder holds only third-party agent persona files) and no other pipeline config. The local gate is `pnpm check` (`typecheck && lint && test && i18n:check && build`). A GitHub Actions workflow is planned in T-010, alongside the boundary lint. Deployment is out of scope for the current demo build.

## Documentation Quality

- **In code**: strong. Header comments cite the conventions section, task id and issue or change-request id. `ASSUMPTION(T-xxx)` markers explain each deliberate deviation. SQL migrations explain their numbering and grant reasoning.
- **Repo docs**: root `README.md`, `infra/compose/README.md`, `packages/test-support/fixtures/README.md`, `tools/README.md`, and an extensive `docs/` tree (planning, architecture, implementation).
- **Drift**:
  - `PRODUCT.md` "Technical context" still describes a static-prototype-only repo with no Next.js workspace.
  - The `ARCHITECTURE-SPINE.md` structural seed and stack table predate FD-032, FD-033 and FD-036 (details in `architecture.md`, "Code vs. Architecture Spine").
  - `infra/compose/postgres-init/01-roles.sql:5` names a nonexistent `0004_roles.sql`.

## Technical Debt

| # | Item | Location | Severity | Planned owner |
|---|---|---|---|---|
| 1 | Domain, application and adapters layers empty; no port interfaces; no `implements` on adapters or fakes | `packages/{domain,application,adapters}/src/index.ts` | High (blocks every feature) | T-101 onward |
| 2 | No boundary lint, no CI | `eslint.config.mjs`, missing `.github/workflows/` | High | T-010 |
| 3 | No coverage measurement versus the 80% scope floor | Vitest configs | Medium | Not planned in code yet |
| 4 | Admin console has no staff guard | `apps/web/src/app/[locale]/admin/layout.tsx:19-21` | High before any real data is served; low while all pages are placeholders | T-103 |
| 5 | Better Auth not installed although `auth_*` schema exists | `packages/database/src/schema/auth.ts` | Medium | T-101 |
| 6 | Health endpoint returns static `unknown` probes | `apps/web/src/app/api/health/route.ts` | Low | T-101, T-009, T-304 |
| 7 | Seed bypasses commands (direct Drizzle inserts) | `packages/test-support/src/seed/seed.ts` | Low (documented) | When commands exist |
| 8 | `dataRequest.created` enqueues both export and delete jobs | `apps/worker/src/handlers/outbox-relay.ts` | Medium (a delete job must not run for an export request) | T-410 |
| 9 | Worker `LOG_LEVEL` not applied; system clock instead of demo clock | `apps/worker/src/{env,logger,container}.ts` | Low | Adapters task (clock) |
| 10 | Two Next.js copies (16.3.4, 16.3.5) via i18n's next-intl dev peer; jsdom 27 and 30 split | `pnpm-lock.yaml`, root and web `package.json` | Low | — |
| 11 | Unused declared workspace dependencies; `transpilePackages` lists `domain`, which web does not depend on | `apps/*/package.json`, `apps/web/next.config.ts` | Low | Resolves as layers fill |
| 12 | Inconsistent relative-import suffixes (contracts extensionless, others `.js`) | `packages/contracts/src/*` | Low | — |
| 13 | `data-view` set client-side, unlike `01-conventions.md` §7.3 | `components/patient/ViewShell.tsx` | Low (documented ASSUMPTION) | — |
| 14 | Security headers not set in the proxy | `apps/web/src/proxy.ts` | Medium before exposure | T-502 |
| 15 | Static role passwords in the init script | `infra/compose/postgres-init/01-roles.sql` | Low (local only) | — |

## Security Observations

- Secrets come only from environment variables. `.env.example` leaves generated secrets blank, and no credentials are committed apart from the local-only compose role passwords.
- Least privilege is enforced in the database, not only in code: the worker role is default-deny, and column grants hide the reporter identity and limit `auth_users` to `id, email`.
- Append-only triggers block UPDATE and DELETE on custody and audit tables for every role, including the owner. The only bypass is a transaction-local flag set by a `SECURITY DEFINER` function that only the maintenance and worker roles may execute.
- Logs and audit details are allowlisted or redacted at the writer.
- Gaps to track before real users: no auth, no staff guard, no security headers, and the server actions validate inputs by TypeScript type only.
