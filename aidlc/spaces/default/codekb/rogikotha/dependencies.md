# Dependencies: rogikotha

External library versions are in `technology-stack.md`; this file holds the edges.

## Internal Package Edges

| From | Declared in package.json | Imported in source |
|---|---|---|
| apps/web | adapters, application, contracts, database, i18n | contracts, i18n (root, `/format`, `/request`) |
| apps/worker | adapters, application, contracts, database | database |
| packages/database | application, contracts | contracts |
| packages/test-support | application, contracts, database, domain | contracts, database (seed only, FD-040) |
| packages/contracts | none | none |
| packages/i18n | none (next-intl peer) | none |
| packages/application | domain, contracts | none (empty) |
| packages/adapters | application, contracts | none (empty) |
| packages/domain | none | none (empty) |

No circular imports. `apps/web/next.config.ts` lists `contracts`, `i18n`, `application`, `domain` and `database` in `transpilePackages`.

## Enforced Direction (`eslint.boundaries.mjs`, T-010)

- `domain` imports nothing; `contracts` imports zod only; `application` imports `domain` and `contracts`.
- `database` and `adapters` import application ports and `contracts`.
- Web components and shared components never import `database`, `adapters`, `test-support` or `node:` modules.
- Only `apps/web/src/server/container.ts` (category `container`) may instantiate adapters.
- Components and shared helpers may not load `pg`, `pg-boss`, `drizzle-orm`, `better-auth`, `sharp`, `pdfjs-dist`, `dotenv`, `@node-rs/argon2` or Node built-ins.
- The worker may not load `better-auth`, `drizzle-orm` or `pg`, and takes application code only from `@rogikotha/application/worker` (AD-6, FD-093).
- `packages/test-support/src/seed/**` may import `database`; nothing in `apps/*` imports `test-support`.

`pnpm lint:boundaries` runs ESLint over `lint-fixtures/boundary-violation/` and checks each fixture fails as `manifest.json` expects.

## Runtime Dependencies

| Consumer | Service | Through |
|---|---|---|
| database scripts, seed, tests | PostgreSQL as `rk_app` (`DATABASE_URL`, `DATABASE_URL_TEST`) | `pg`, Drizzle |
| worker | PostgreSQL as `rk_worker` (`DATABASE_URL_WORKER`) | `pg`, pg-boss |
| reset and retention (planned) | PostgreSQL as `rk_maintenance` | `DATABASE_URL_MAINTENANCE` |
| mail (planned) | Mailpit SMTP 1025 | `SMTP_HOST`, `SMTP_PORT` |
| evidence scan (planned) | clamd 3310 | `CLAMD_HOST`, `CLAMD_PORT` |
| evidence files | filesystem `STORAGE_ROOT` (`./.data/storage`) | seed now, storage adapter later |

Secrets required in `.env`: `APP_ENCRYPTION_KEY` (32 bytes, base64) and `BETTER_AUTH_SECRET`. CI generates both per job.

## Dependencies the Demo Slice Adds

Better Auth (to `apps/web`), an SMTP client (to `adapters`, only if email verification is kept), and a clamd client (to `adapters`). Each needs a dependency-check-log entry before first use (project Mandated rule).
