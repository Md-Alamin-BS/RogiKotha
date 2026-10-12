# Technology Stack — rogikotha

Versions are the resolved versions in `pnpm-lock.yaml` at commit `4f05dc0`. Specifiers are those in each `package.json`.

## Languages and Runtime

| Item | Version | Source |
|---|---|---|
| TypeScript | 6.0.3 (specifier `~6.0.3`) | root `package.json` |
| Node.js | `>=24 <25` (engine-strict) | root `engines`, `.npmrc` |
| pnpm | 11.20.0 (`>=11 <12`) | `packageManager` |
| SQL (PostgreSQL dialect) | PostgreSQL 18 | `infra/compose/docker-compose.yml` |
| Module system | ESM (`"type": "module"` in every package), `moduleResolution: bundler`, target ES2023 | `tsconfig.base.json` |

## Application Frameworks and Libraries

| Library | Resolved | Specifier | Used by | Purpose |
|---|---|---|---|---|
| next | 16.3.4 | `16.3.4` | apps/web | App Router web framework |
| next (second copy) | 16.3.5 | peer of next-intl | packages/i18n (dev) | Pulled in by `auto-install-peers`; see `code-quality-assessment.md` |
| react, react-dom | 19.3.0 | `19.3.0` | apps/web | UI |
| next-intl | 4.14.4 | `^4.14.4` | apps/web, packages/i18n | Locale routing, messages |
| zod | 4.6.2 | `^4.6.2` / `^4.5.4` (test-support) | contracts, worker, test-support | Validation (3.25.76 present transitively) |
| uuid | 13.0.2 | `^13.0.2` | contracts | UUIDv7 ids, public-id randomness |
| drizzle-orm | 0.45.2 | `0.45.2` (exact) | database, worker, test-support | ORM |
| drizzle-kit | 0.31.10 | `0.31.10` (exact) | database (dev) | Migration generation |
| pg | 8.23.0 | `^8.23.0` | database, test-support | PostgreSQL driver |
| pg-boss | 12.31.0 | `^12.31.0` | database | Job queue on PostgreSQL |
| dotenv | 17.4.2 | `^17.4.2` | database, worker, test-support | Loads repo-root `.env` |
| sharp | 0.35.4 | `^0.35.4` | test-support | Fixture derivatives |
| @node-rs/argon2 | 2.2.1 | `^2.2.0` | test-support | Hashing seeded account passwords |
| tsx | 4.23.13 | `4.23.13` / `^4.23.13` | database, worker, test-support (dev) | TS script runner, worker dev watch |

Planned but **not installed** (master plan §3): Better Auth 1.7.3, nodemailer, file-type, `eslint-plugin-boundaries`, Playwright, `@axe-core/playwright`.

## Tooling

| Tool | Resolved | Config |
|---|---|---|
| ESLint | 10.10.0 | `eslint.config.mjs` (flat) |
| @eslint/js | `^10.0.1` | — |
| typescript-eslint | 8.70.0 | `recommendedTypeChecked`, `projectService` |
| eslint-config-prettier | `^10.1.8` | last in config |
| Prettier | 3.9.6 | `prettier.config.mjs` (single quotes, semi, width 100, trailing commas) |
| Vitest | 4.1.11 | `vitest.workspace.ts` (`test.projects`), per-package `vitest.config.ts` |
| @vitest/coverage-v8 | 4.1.11 | installed, not configured |
| @testing-library/react | 16.3.3 | apps/web |
| @testing-library/jest-dom, user-event | `^6.9.1`, `^14.6.7` | apps/web |
| @vitejs/plugin-react | 5.2.0 | apps/web Vitest |
| jsdom | 27.4.0 (root) and 30.0.1 (web) | Vitest environment |
| globals | `^16.5.0` | root |
| puppeteer-core | 25.12.0 | `tools/` prototype QA only |
| @types/node | 24.13.4 | — |

## Infrastructure (local)

| Service | Image | Ports | Role |
|---|---|---|---|
| PostgreSQL | `postgres:18` | 5433→5432 | Primary store; extensions `pg_trgm`, `citext`, `pgcrypto`; built-in `uuidv7()` |
| Mailpit | `axllent/mailpit:v1.31.1` | 1025 SMTP, 8025 UI | Mail sink |
| ClamAV | `clamav/clamav:1.5.4` | 3310 | clamd scanner with a custom test signature |

There is no CI, cloud provider, container build for the apps, or IaC. The apps run through `pnpm dev` / `pnpm dev:worker` / `pnpm demo`.

## Frontend Approach

Plain CSS ported verbatim from the prototype (`apps/web/src/styles/`). The code has no CSS framework, component library, icon library or animation library (FD-032). Fonts are system stacks only.

## Notable Differences from Documented Stacks

- Compared with `docs/architecture/ARCHITECTURE-SPINE.md` "Stack": Next 16.3.4 (spine 16.3.3), React 19.3.0 (19.2.7), pg-boss 12.31.0 (12.26.0), Vitest 4.1.11 (4.1.10). Tailwind, shadcn, Lucide, PDF.js, MSW, Playwright and axe are absent: the first five because FD-032 and FD-036 superseded them, the last two because they are not yet added (T-503).
- Compared with `docs/implementation/00-master-plan.md` §3: the master plan pins pg-boss 12.30.x and Zod 4.5.x. The lockfile resolves 12.31.0 and 4.6.2, within the caret ranges but newer than the pinned line.
