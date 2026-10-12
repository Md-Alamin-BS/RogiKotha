# Code Structure — rogikotha

## Repository Layout

```text
apps/
  web/                    Next.js 16 app (package @rogikotha/web)
    src/app/              App Router: root redirect, [locale]/(patient)/…, [locale]/admin/…, api/health
    src/components/       patient/, admin/, shared/ — ported prototype render functions
    src/i18n/             thin re-exports of @rogikotha/i18n routing and request config
    src/lib/              cookies, titles, metadata, announce helpers
    src/server/actions/   preferences.ts (setLang, setTheme, setMotion)
    src/styles/           tokens.css, patient.css, admin.css, globals.css (ported plain CSS)
    src/proxy.ts          Next 16 proxy (formerly middleware)
  worker/                 Node worker (package @rogikotha/worker)
    src/main.ts           entry: start queue, register jobs, pollers, heartbeat, shutdown
    src/container.ts      composition root (db, outbox, queue, logger, clock)
    src/registry.ts       JobName union and JOBS map
    src/handlers/         outbox-relay.ts
    src/env.ts, logger.ts, health.ts
packages/
  contracts/src/          result, errors, actor, ids, time, enums, page, config-values,
                          schemas/<module>.ts (14), view-models/<page-family>.ts (19)
  database/
    src/schema/           Drizzle tables per module (17 files + _common.ts, index.ts)
    src/migrations/       0000–0006 SQL + meta/ snapshots and _journal.json
    src/repositories/     Pg<Module>Repository classes (13 stubs) + outbox.ts + not-implemented.ts
    src/queue/            pg-boss-queue.ts
    src/search/           PgSearchIndex stub
    src/client.ts, audit-writer.ts, migrate.ts, reset.ts, env.ts, test-setup.ts
    drizzle.config.ts
  i18n/
    messages/             en.json, bn.json
    scripts/              check-parity.mjs, gen-keys.mjs, port-from-prototype.mjs
    src/                  format.ts, routing.ts, request.ts, keys.ts (generated), index.ts
  test-support/
    src/corpus/           typed synthetic data (doctors, facilities, reviews, …)
    src/builders/         a<Thing>() builders with sequence ids
    src/fakes/            in-memory doubles for every port
    src/seed/             seed.ts + seven seed-<step>.ts files
    fixtures/             binary fixtures (jpg, png, pdf) + README
    scripts/              build-fixtures.mjs, port-corpus.mjs
  domain/src/index.ts     placeholder (export {})
  application/src/index.ts placeholder (export {})
  adapters/src/index.ts   placeholder (export {})
infra/compose/            docker-compose.yml, postgres-init/*.sql, clamav/*.ndb, .env.example, README.md
```

Root: `package.json` (scripts), `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `vitest.workspace.ts`, `.gitattributes`, `.npmrc`, `pnpm-lock.yaml`. Outside the product build: `ui-design-prototype/` (static prototype being ported), `tools/` (prototype QA scripts, lint-ignored), `docs/`.

## File Classification

| Category | Location | Notes |
|---|---|---|
| Model/Entity | `packages/database/src/schema/*.ts`; `packages/contracts/src/{enums,ids,time,page}.ts`; `contracts/src/view-models/*.ts` | Drizzle tables, enum value lists (contracts owns them, database mirrors), view-model interfaces |
| Controller/Handler | `apps/web/src/app/**/page.tsx`, `layout.tsx`, `api/health/route.ts`; `apps/web/src/server/actions/preferences.ts`; `apps/worker/src/handlers/outbox-relay.ts` | Pages are mostly placeholders |
| Service/UseCase | none yet | `packages/application` and `packages/domain` are empty |
| Repository/DAO | `packages/database/src/repositories/*.ts`, `queue/pg-boss-queue.ts`, `search/index.ts`, `audit-writer.ts` | Only `PgOutbox`, `PgAuditWriter`, `PgBossQueue` are implemented |
| Utility/Helper | `apps/web/src/lib/*`; `packages/i18n/src/format.ts`; `packages/contracts/src/{result,errors}.ts` | |
| Configuration | `apps/worker/src/{env,container,registry}.ts`; `packages/database/src/env.ts`, `drizzle.config.ts`; `apps/web/next.config.ts`; `packages/i18n/src/{routing,request}.ts`; root configs | Two composition roots planned; only the worker's exists |
| Middleware | `apps/web/src/proxy.ts` | Locale + `x-pathname`; security headers not yet (T-502) |
| Test | co-located `*.test.ts(x)`, `*.int.test.ts`, `*.smoke.test.ts(x)`; `packages/test-support/**` | Details in `code-quality-assessment.md` |
| Migration | `packages/database/src/migrations/*.sql`; `infra/compose/postgres-init/*.sql` | Forward-only; four of seven are hand-written SQL |
| Static/Asset | `apps/web/src/styles/*.css`; `packages/i18n/messages/*.json`; `packages/test-support/fixtures/*`; `infra/compose/clamav/rogikotha-test.ndb` | |

## Code Patterns

- **Result instead of throw**: `Result<T>` with `ok()` / `err(code)`; `err` derives `messageKey` from the error code and mints a correlation id (`packages/contracts/src/result.ts`). `InternalError` is reserved for programmer errors.
- **Contracts-first vocabulary**: enums are `as const` arrays plus derived types; the database schema imports them (`packages/database/src/schema/enums.ts`), never the reverse.
- **Stub-with-owner**: every unimplemented repository method throws `new NotImplemented('<task>', { …args })`, so a call names the task that owns it (`repositories/not-implemented.ts`).
- **Mirrored fakes**: `test-support/src/fakes/repositories.ts` mirrors each `Pg*Repository` method name over a `MapStore`; `repositories-superset.test.ts` checks the fakes cover the stubs.
- **Transactional outbox**: `PgOutbox.append(tx, …)` in the caller's transaction; claim with `FOR UPDATE SKIP LOCKED`; idempotent enqueue by `singletonKey`.
- **Allowlisted logging and audit**: worker `JsonLogger` redacts keys matching `email|token|body|filename|password`; `assertAllowlisted` rejects disallowed audit keys and strings over 200 characters.
- **Environment gating**: `migrate`, `reset`, `seed` refuse `APP_MODE=production`; the worker refuses to start without `DATABASE_URL_WORKER` and never falls back to `DATABASE_URL`.
- **Server-rendered preferences**: theme/motion/lang are cookies read in layouts so SSR has no flash; no `localStorage`.
- **Decision breadcrumbs**: deviations from task files are marked `ASSUMPTION(T-xxx)` with an `ISS-` reference in the comment.
- **Module naming**: fixed module list (`account`, `identity`, `directory`, `taxonomy`, `review`, `evidence`, `community`, `moderation`, `notification`, `search`, `administration`, `retention`, `data-requests`) repeated across `contracts/schemas`, `database/schema`, `database/repositories`.

## Conventions and Inconsistencies

- Relative imports: `packages/contracts` uses extensionless specifiers (`'./errors'`); `database`, `worker`, `test-support` use `.js` suffixes. Both work under `moduleResolution: bundler`; the contracts style was changed for `next build` (CR-005, noted in `emergency/page.tsx`).
- `apps/web` uses the `@/*` path alias; libraries use relative paths.
- `ViewShell` lives in `components/patient/` but is reused by admin pages (ASSUMPTION(T-008)).
- Library packages export TypeScript source directly (`"exports": { ".": "./src/index.ts" }`); only the worker has a `tsc` build to `dist/`. Next transpiles `contracts`, `i18n`, `application`, `domain` (`next.config.ts`), but not `database` or `adapters`, which web does not import yet.
