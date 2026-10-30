# Code Structure: rogikotha

## Layout

```
apps/
  web/        Next.js 16 App Router (src/app, src/components, src/lib, src/server, src/styles, src/i18n, e2e/)
  worker/     pg-boss worker (src/main.ts, container.ts, registry.ts, handlers/, env.ts, logger.ts, health.ts)
packages/
  contracts/  src/{actor,config-values,enums,errors,ids,page,result,time}.ts, schemas/ (14), view-models/ (19)
  database/   src/schema/ (17 modules, 58 tables), migrations/ (0000-0008 + meta), repositories/ (14 stubs + outbox),
              queue/, search/, client.ts, audit-writer.ts, migrate.ts, reset.ts
  i18n/       messages/{en,bn}.json, src/{format,routing,request,keys}.ts, scripts/
  test-support/ src/{corpus,builders,fakes,seed}/, fixtures/, scripts/
  domain/ application/ adapters/   src/index.ts only (export {})
infra/compose/  docker-compose.yml, postgres-init/, clamav/
scripts/        gate scripts run by pnpm check (identity, boundaries fixture, motion check)
tools/          prototype-era design tooling (contrast is in the gate)
lint-fixtures/  files that must fail the boundary lint
ui-design-prototype/  static HTML/JS prototype; source of truth for content, data and behaviour
```

## File Classification

| Category | Where |
|---|---|
| Model/Entity | `packages/database/src/schema/*.ts`; `packages/contracts/src/view-models/*.ts`; `packages/contracts/src/enums.ts` |
| Controller/Handler | `apps/web/src/app/**/page.tsx` (34 locale pages, 29 placeholders), `app/api/health/route.ts`, `server/actions/preferences.ts`; `apps/worker/src/handlers/outbox-relay.ts` |
| Service/UseCase | none (`packages/application` is empty) |
| Repository/DAO | `packages/database/src/repositories/*.ts`, `search/index.ts` (stubs); `repositories/outbox.ts`, `audit-writer.ts`, `queue/*.ts` (real) |
| Utility/Helper | `packages/i18n/src/format.ts`; `apps/web/src/lib/{cookies,metadata,titles,announce}.ts`; `contracts/src/{result,ids,time,page}.ts` |
| Configuration | root `package.json`, `vitest.workspace.ts`, `eslint.config.mjs`, `eslint.boundaries.mjs`, `prettier.config.mjs`, `tsconfig.base.json`, `apps/web/next.config.ts`, `apps/worker/src/env.ts`, `packages/database/drizzle.config.ts` |
| Middleware | `apps/web/src/proxy.ts` (next-intl plus `x-pathname`) |
| Test | co-located `*.test.ts(x)`, `*.int.test.ts`, `*.smoke.test.ts(x)`; `apps/web/e2e/smoke/motion.spec.ts`; `scripts/*.test.mjs` |
| Migration | `packages/database/src/migrations/*.sql` |
| Static/Asset | `apps/web/src/styles/*.css`, `apps/web/src/app/fonts/`, `packages/test-support/fixtures/` |

## Placeholder Pages by Owning Task

Each renders `t('shell.placeholder', { task })` inside `ViewShell`.

| Task | Routes under `[locale]` |
|---|---|
| T-102 | `register`, `sign-in`, `verify-email`, `reset-password`, `me/security` |
| T-103 | `admin/sign-in`, `admin/approve-device`, `admin/security` |
| T-202 | `doctors`, `doctors/[id]` |
| T-203 | `facilities`, `facilities/[id]`, `topics`, `topics/[id]` |
| T-206 | `search` |
| T-207 | `(patient)` home |
| T-306 | `write` |
| T-307 | `experiences`, `experiences/[id]` |
| T-405 | `notifications` |
| T-406 | `admin/queue`, `admin/queue/[code]` |
| T-407 | `admin/evidence`, `admin/providers` |
| T-408 | `admin/config`, `admin/notifications` |
| T-409 | `me`, `saved`, `authors/[username]` |

Built pages: `about`, `emergency`, `privacy`, `terms`, `admin` (index), and the root `app/page.tsx`.

## Code Patterns

- **Result over throw**: `contracts/src/result.ts`; expected failures return `err(...)`.
- **Stub naming the owner**: every unbuilt repository method throws `new NotImplemented('<task>', {args})` (`repositories/not-implemented.ts`).
- **Deferred foreign keys by raw SQL** where Drizzle imports would be circular (`0004_deferred_fks.sql`; for example `persona_links.review_id` and `bookmarks.review_id`).
- **Local literal unions plus CHECK constraints** instead of new pgEnums (`reviews.language`, `review_versions.change_kind`, `reactions.target_kind`, `evidence_items.declared_mime`).
- **Generated sources**: `packages/test-support/src/corpus/*.ts` (from the prototype by `port-corpus.mjs`), `packages/i18n/src/keys.ts` (by `gen-keys.mjs`); not hand-edited.
- **Composition roots**: `apps/worker/src/container.ts` exists; the web root `apps/web/src/server/container.ts` is reserved by the boundary rules but absent.
