# Technology Stack: rogikotha

Versions are as declared in the `package.json` files; `pnpm-lock.yaml` pins the resolved ones. The stability checks are logged in `docs/status/dependency-check-log.md`.

## Languages and Runtime

| Item | Version | Where |
|---|---|---|
| TypeScript | ~6.0.3 (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) | root, `tsconfig.base.json` |
| Node.js | >=24 <25 (`.nvmrc` 24) | root `engines` |
| pnpm | 11.20.0 | `packageManager` |
| Module system | ESM throughout | `"type": "module"` |
| SQL | PostgreSQL 18 (needs `uuidv7()`, `citext`, `pg_trgm`, `pgcrypto`) | migrations |

## Application

| Library | Version | Purpose |
|---|---|---|
| next | 16.3.4 | App Router, `typedRoutes`, `proxy.ts` |
| react, react-dom | 19.3.0 | UI |
| next-intl | ^4.14.4 | locale routing and messages |
| zod | ^4.6.2 | input schemas |
| uuid | ^13.0.2 | UUIDv7 ids |
| drizzle-orm | 0.45.2 (exact) | schema and queries |
| pg | ^8.23.0 | driver |
| pg-boss | ^12.31.0 | job queue |
| dotenv | ^17.4.2 | env loading (database, worker, seed) |
| @node-rs/argon2 | ^2.2.0 | seed password hashes (Argon2id) |
| sharp | ^0.35.4 | seed evidence derivatives |

**Planned, not installed**: Better Auth (1.7.x line logged as stable, AD-4, T-101), and the SMTP and clamd client libraries.

## Tooling

| Tool | Version | Purpose |
|---|---|---|
| drizzle-kit | 0.31.10 | migration generation |
| tsx | 4.23.13 | scripts and worker dev |
| vitest, @vitest/coverage-v8 | ^4.1.11 | unit, integration, smoke and coverage |
| @testing-library/react, jest-dom, user-event | ^16.3.3, ^6.9.1, ^14.6.7 | component tests |
| jsdom | ^30.0.1 (web), ^27.0.0 (root) | DOM test environment |
| @playwright/test | 1.64.1 | browser smoke (`apps/web/e2e`), not in CI until T-503 |
| eslint, typescript-eslint | ^10.10.0, ^8.70.0 | lint |
| eslint-plugin-boundaries, eslint-import-resolver-typescript | 7.3.0, 4.4.5 | import boundaries (T-010) |
| prettier, eslint-config-prettier | ^3.9.6, ^10.1.8 | formatting |
| puppeteer-core | ^25.10.0 | prototype tooling under `tools/` |

## Infrastructure (local)

| Service | Image |
|---|---|
| PostgreSQL | `postgres:18` (CI pins it by digest) |
| Mailpit | `axllent/mailpit:v1.31.1` |
| ClamAV | `clamav/clamav:1.5.4` |

## Not Used, by Decision

Tailwind, shadcn, Radix, CSS-in-JS, icon and animation libraries (FD-032, FD-091); Redis (outbox plus pg-boss instead); object storage (filesystem adapter for the demo).
