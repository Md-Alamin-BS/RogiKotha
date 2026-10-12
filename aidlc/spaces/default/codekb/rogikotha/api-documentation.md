# API Documentation — rogikotha

Most of the API surface is still unbuilt. This file lists only what the code exposes at commit `4f05dc0`. The planned route and command catalogue lives in `docs/implementation/03-routes-and-contracts.md`, which later stages transcribe.

## External HTTP Surface (apps/web)

### Route handlers

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| GET | `/api/health` | none | `200 { ok: true, db, queue, mail, scanner, mode }` | All four probes are hard-coded `'unknown'`; `mode` is `APP_MODE` or `'unknown'` (`apps/web/src/app/api/health/route.ts`) |

There are no other route handlers yet: auth, upload and evidence-artifact endpoints are planned under `src/app/api/…` (master plan §4).

### Pages (App Router)

Every page is under `/{locale}` where `locale` is `en` or `bn`; any other value returns 404 (`[locale]/layout.tsx`). `/` redirects to the `rk.lang` cookie locale, then to the Accept-Language preference, then to `en` (`app/page.tsx`, with `proxy.ts` doing this first in normal requests).

| Area | Routes | State |
|---|---|---|
| Patient, implemented | `/emergency`, `/about`, `/privacy`, `/terms` | Static content; Emergency reads `DEFAULT_CONFIG_VALUES.emergency` |
| Patient, placeholder | `/` (discover), `/doctors`, `/doctors/[id]`, `/facilities`, `/facilities/[id]`, `/topics`, `/topics/[id]`, `/experiences`, `/experiences/[id]`, `/search`, `/write`, `/me`, `/me/security`, `/saved`, `/notifications`, `/authors/[username]`, `/register`, `/sign-in`, `/verify-email`, `/reset-password` | Each renders `shell.placeholder` with its owning task (T-102 … T-409) |
| Staff | `/admin` redirects to `/admin/queue`; placeholder pages: `/admin/queue`, `/admin/queue/[code]`, `/admin/evidence`, `/admin/providers`, `/admin/notifications`, `/admin/config`, `/admin/sign-in`, `/admin/approve-device`, `/admin/security` | No staff guard (TODO T-103); `metadata` sets `noindex` |

Counts: 34 locale pages (24 patient, 10 admin), of which 29 are placeholders (20 patient, 9 admin), plus the root redirect page, `not-found.tsx` and four layouts. Every page exports `generateMetadata` built from `lib/titles.ts`.

### Server actions

`apps/web/src/server/actions/preferences.ts` (`'use server'`). Each sets a one-year, `sameSite: lax`, `path: /` cookie and revalidates the root layout.

| Action | Input | Effect |
|---|---|---|
| `setLang(locale)` | `'en' \| 'bn'` | sets `rk.lang` |
| `setTheme(theme)` | `'light' \| 'dark' \| null` | sets `rk.theme`, or deletes it on `null` |
| `setMotion(motion)` | `'on' \| 'off'` | sets `rk.motion` |

The inputs are typed in TypeScript only. There is no zod validation at this boundary yet. The values only reach cookies.

### Proxy

`apps/web/src/proxy.ts` matches every path except `api`, `_next` and files with an extension. It sets the `x-pathname` request header and passes the request to next-intl's middleware (locale prefix `always`, cookie `rk.lang`).

## Background Job Interface (apps/worker)

### Outbox event catalogue → jobs

Defined in `RELAY` (`apps/worker/src/handlers/outbox-relay.ts`). An event name missing from the map is logged as `outbox.unmapped` and marked processed. An empty array means "audit only".

| Event | Jobs |
|---|---|
| `account.registered` | `mail.send` |
| `account.securityEvent` | `notification.deliver`, `mail.send` |
| `review.published`, `review.changed`, `review.hidden`, `review.restored`, `review.deleted` | `search.refresh`, `notification.deliver` |
| `doctor.changed`, `facility.changed`, `term.changed` | `search.refresh` |
| `evidence.received` | `evidence.process` |
| `evidence.stateChanged`, `comment.posted`, `comment.changed`, `report.filed`, `case.decided`, `appeal.decided` | `notification.deliver` |
| `config.applied`, `hold.changed`, `retention.policyChanged` | none (audit only) |
| `dataRequest.created` | `data.export`, `data.delete` (both queued; ASSUMPTION(T-009)) |

### Job registry

`JobName` (`apps/worker/src/registry.ts`): `outbox.relay`, `evidence.process`, `search.refresh`, `notification.deliver`, `mail.send`, `retention.expire`, `data.export`, `data.delete`. Only `outbox.relay` has a handler. It is a 2-second interval poller, not a pg-boss queue. The other names have no handler yet, so jobs the relay enqueues for them wait in pg-boss.

Enqueue defaults (`PgBossQueue`): `retryLimit 3`, `retryDelay 10 s`, `retryBackoff true`, `expireInSeconds 300`, `singletonKey = <eventId>:<job>`. Work defaults: `batchSize 1`, `pollingIntervalSeconds 2`.

## Internal Library APIs

### `@rogikotha/contracts`

| Export group | Contents |
|---|---|
| Result | `Result<T>`, `ok`, `err`, `isOk`, `unwrap` (tests only) |
| Errors | `ERROR_CODES` (39 codes, e.g. `auth.invalid_credentials`, `review.attestation_required`, `hold.active`), `ErrorCode`, `AppError`, `errorMessageKey`, `InternalError` |
| Identity | `newId` (UUIDv7), `isId`, `newPublicId` (10-char Crockford base32), `isPublicId`, `stripSlug`, `PUBLIC_ID_RE` |
| Actor | `Actor`, `Capability` (8), `ALL_CAPABILITIES`, `ANONYMOUS_ACTOR`, `capabilitiesForRole` |
| Enums | `LOCALES`, `ACCOUNT_STATUSES`, `STAFF_ROLES`, `IDENTITY_MODES`, `PROVENANCES`, `PUBLICATION_STATES`, `REVIEW_KINDS`, and the rest of data-model §0 |
| Config | `ConfigValuesSchema` (strict zod: thresholds, retention, limitedDataThreshold, reportReasons, capabilities, emergency …), `DEFAULT_CONFIG_VALUES` |
| Schemas | zod command inputs per module: account, staff, identity, directory, taxonomy, search, review, evidence, retention, community, moderation, notification, administration, data-requests. Several payloads are `z.unknown()` with `TODO(T-xxx)` |
| View models | 19 page-family files (discover, search, doctor, facility, condition, experience, thread, evidence, composer, workspace, security, notification, public-profile, queue, case-tray, quarantine, providers, staff-notifications, config). Most are marked `TODO(T-xxx)` for later refinement |

### `@rogikotha/database`

| Export | Status |
|---|---|
| `createDb(url) → { db, pool }`, `Db`, `Tx`, `withTx`, `closeDb` | Implemented |
| All Drizzle tables from `schema/index.ts` | Implemented |
| `PgAuditWriter.write(tx, event)`, `assertAllowlisted` | Implemented |
| `PgOutbox.append / claimBatch / markProcessed / markFailed` | Implemented |
| `PgBossQueue.start / stop / ensureQueue / enqueue / work / schedule`, `installPgBoss`, `EnqueueOptions`, `WorkOptions` | Implemented (`TODO(T-101): implements JobQueue`) |
| `PgAccountRepository`, `PgIdentityRepository`, `PgDirectoryRepository`, `PgTaxonomyRepository`, `PgConfigRepository`, `PgAuditRepository`, `PgReviewRepository`, `PgEvidenceRepository`, `PgCommunityRepository`, `PgModerationRepository`, `PgNotificationRepository`, `PgRetentionRepository`, `PgDataRequestRepository`, `PgSearchIndex` | Stubs: 118 methods (114 in repositories, 4 in `PgSearchIndex`) throw `NotImplemented('<task>')`; return types are `Promise<unknown>` |
| `NotImplemented` | Implemented |

### `@rogikotha/i18n`

Entry points: `.`, `./format`, `./routing`, `./request`. Exports `formatNumber`, `formatDigits`, `formatMonthYear`, `formatDate`, `formatRelative`, `countParams`, `routing`, `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`, `Locale`, `MessageKey`, `MESSAGE_KEYS`.

### `@rogikotha/test-support`

Exports corpus, builders and fakes (`FakeClock`, `SequentialIds`, `MemoryStorage`, `RecordingMailer`, `ScriptedScanner`, `MemoryJobQueue`, `ListOutbox`, `ListAuditWriter`, `CollectingLogger`, `NaiveSearchIndex`, `FakeCrypto`, `FastHasher`, `AlwaysAllowRateLimiter`, `StaticConfigProvider`, `PassthroughImageSanitiser`, and one `Fake<Module>Repository` per `Pg` stub). The seed (`runSeed`) is reached through `pnpm db:seed`, not the barrel.

## Database Schema Surface

58 tables in `public` plus pg-boss's `pgboss` schema. The schema is described in `component-inventory.md` (`packages/database`). Role privileges are in `dependencies.md`.
