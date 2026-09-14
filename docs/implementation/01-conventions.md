# Conventions for implementing RogiKotha

Every task file assumes these rules. An agent that follows them produces code that merges cleanly
with everyone else's. Where a task file and this file disagree, the task file wins for that task —
and the disagreement must be noted in the task's hand-off section.

## 0. Read order for an implementing agent

1. `AGENTS.md` (no attribution anywhere; version checks; research before deviating)
2. `docs/implementation/00-master-plan.md` §1–§4 (what, decisions, stack, layout)
3. This file
4. `docs/implementation/02-data-model.md` and `03-routes-and-contracts.md` — the sections your task names
5. `PRODUCT.md` "Hard rules" — every task's checklist is derived from them
6. Your task file `docs/implementation/tasks/T-xxx-*.md`
7. The prototype files your task names (read them fully — they are the spec for behaviour and copy)

Do **not** read the whole `docs/planning/` tree unless your task tells you to; the plan already distilled it.

## 1. Package layout

```text
packages/contracts/src/
  result.ts          Result<T>, ok(), err(), isOk()
  errors.ts          ErrorCode union + AppError class + messageKey mapping
  actor.ts           Actor, Capability, StaffRole
  ids.ts             newId() (uuid v7), newPublicId() (10-char base32), isPublicId()
  time.ts            Iso8601 brand, toIso(), fromIso()
  enums.ts           every enum in 02-data-model.md §0 as `as const` arrays + types
  schemas/<module>.ts zod input schemas for commands (one file per module)
  view-models/<page>.ts serializable view models (one file per page family)
packages/domain/src/<module>/
  <entity>.ts        entity type + invariants as pure functions
  <entity>-state.ts  state machine: allowed transitions as a table + transition()
  policies.ts        pure rules (e.g. canPublish(review), isLimitedData(count, threshold))
  index.ts
packages/application/src/
  ports/             one interface per port (storage.ts, mail.ts, clock.ts, repositories/<module>.ts …)
  modules/<module>/
    commands/<verb-noun>.ts   one command per file: export const <verbNoun>Command = defineCommand({...})
    queries/<get-noun>.ts     one query per file
    authorization.ts          what each command requires from Actor
    index.ts
  authorization/     capability resolution, ownership checks, staff step-up (recheck) requirement
  audit/             AuditWriter port + helpers to build allowlisted audit details
  index.ts           the Application interface: { commands, queries } typed by module
packages/database/src/
  schema/<module>.ts drizzle tables (snake_case), enums in schema/enums.ts
  migrations/        drizzle-kit SQL migrations, forward-only, numbered
  repositories/<module>.ts  implements application ports
  search/            search adapter (FTS + trgm)
  queue/             pg-boss adapter implementing JobQueue port; outbox relay
  client.ts          pool + drizzle instance; transaction helper `withTx(fn)`
packages/adapters/src/
  storage-fs/  mail-smtp/  scanner-clamd/  image-sharp/  pdf-pdfjs/  pdf-assemble/  clock/  crypto/  rate-limit-memory/
packages/i18n/
  messages/en.json  messages/bn.json   (same key set — parity test fails otherwise)
  src/format.ts     formatNumber(n, locale) → Bengali digits for `bn`; formatMonthYear(); formatRelative()
  src/keys.ts       generated union of keys (script: pnpm i18n:keys)
packages/test-support/src/
  corpus/            the synthetic data, typed (doctors.ts, facilities.ts, conditions.ts, reviews.ts …)
  builders/          aDoctor(), aReview(), anAccount() … with sensible defaults
  fakes/             in-memory implementations of every port (FakeStorage, FakeMailer, FakeClock, FakeScanner …)
  seed/              seed.ts — idempotent seeding through application commands, never raw inserts except auth tables
apps/web/src/
  app/[locale]/…             route segments (see 03-routes-and-contracts.md §1)
  app/api/…                  route handlers
  components/patient/…       ported 04b components, one file per prototype render function
  components/admin/…         ported Chart Tray components
  components/shared/…        Sheet, Callout, Capsules, Badge, Field … (only what both sides use)
  server/container.ts        composition root (the only place adapters are instantiated)
  server/actions/<module>.ts server actions — thin: parse → actor → command → Result
  server/auth.ts             Better Auth instance + `getActor()`
  proxy.ts                   Next 16 proxy (formerly middleware): locale redirect, `x-pathname` header, security headers (T-502)
  styles/tokens.css  styles/patient.css  styles/admin.css  styles/globals.css
apps/worker/src/
  main.ts  container.ts  handlers/<job>.ts
infra/compose/docker-compose.yml  infra/compose/.env.example
```

Module names (fixed): `account`, `identity`, `directory`, `taxonomy`, `review`, `evidence`, `community`, `moderation`, `notification`, `search`, `administration`, `retention`, `data-requests`.

## 2. Dependency direction

```
domain            → (nothing)
contracts         → zod only
application       → domain, contracts
database          → application (ports), contracts, drizzle, pg
adapters          → application (ports), contracts, the specific library
i18n              → (nothing runtime); next-intl is wired in apps/web
test-support      → application, contracts, domain (fakes implement ports)
apps/web          → application, contracts, i18n, database, adapters (only in server/container.ts), next, react
apps/worker       → application, contracts, database, adapters
```

Forbidden and lint-enforced: components importing `database`, `adapters`, `test-support`, or `node:` modules; `domain` importing anything; `application` importing a library adapter; `worker` importing Better Auth or any identity-reveal/deletion command (AD-6).

## 3. Commands, queries, results

```ts
// contracts/result.ts
export type Result<T> =
  | { ok: true; data: T; meta?: PageMeta }
  | { ok: false; error: AppError };

export interface AppError {
  code: ErrorCode;          // stable, e.g. 'auth.invalid_credentials'
  messageKey: string;       // i18n key, e.g. 'errors.auth.invalidCredentials' (exists in en.json and bn.json)
  fieldErrors?: Record<string, string>; // field → messageKey
  correlationId: string;
  retryAfterSec?: number;   // present on rate-limit errors
}
```

- Every state change is an **application command**: `parse(input) → authorize(actor) → load → decide (domain) → persist in one transaction together with audit + outbox rows → return Result`. Queries never write.
- Commands are defined with a helper so they all look the same:
  ```ts
  export const publishReviewCommand = defineCommand({
    name: 'review.publish',
    input: PublishReviewInput,                // zod schema from contracts
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, actor, ports, tx }) { … return ok({ reviewId }) }
  });
  ```
- Retryable commands (upload, export, deletion, bulk retention) take an `idempotencyKey`; the repository stores it and returns the earlier result on replay.
- A command may declare `onRefused(ctx)` to record a refused attempt (used by `identity.reveal`, which must log every attempt, granted or not); by default a refusal returns `err('forbidden')` without side effects.
- Never throw for expected failures; return `err(...)`. Throw only for programmer errors. Route handlers and server actions convert a thrown error into `err('internal', …)` with a fresh correlation id and log it.

## 4. IDs, time, text, files

- Primary keys: `uuid` generated app-side with `newId()` (UUIDv7). Public URL identifiers: `public_id` (10-char lowercase base32, `newPublicId()`), unique per table, never the sequential or UUID key. Usernames are their own public identifier.
- Time: `timestamptz` in PostgreSQL, `Iso8601` strings in contracts, formatted only in components via `packages/i18n` formatters. All "now" comes from the `Clock` port so the demo clock can move time.
- Text: store original; store `*_key` NFC-normalised lowercased de-spaced keys separately for search; truncate with `Intl.Segmenter` (grapheme-aware), never `slice`.
- Files: server-generated storage keys (`quarantine/<itemId>/<uuid>`), original filename is private metadata only, SHA-256 on every artifact.
- Money (fees): stored as `fee_minor bigint` + `currency 'BDT'` when structured; the seed carries the display string in `fields`, matching the prototype.

## 5. Actor, authorization, audit

```ts
export interface Actor {
  kind: 'anonymous' | 'account';
  accountId?: string;
  personaId?: string;            // default persona for the account
  emailVerified?: boolean;
  status?: AccountStatus;
  staffRole?: StaffRole;         // undefined for ordinary users
  capabilities: Capability[];    // resolved from staffRole + config_versions.values.capabilities
  stepUp?: { rechecked_at: string }; // present only after a password recheck (5-minute window)
  locale: 'en' | 'bn';
  correlationId: string;
}
```

- Authorization lives in `application/modules/<m>/authorization.ts`, never in a Better Auth callback, never in a component.
- `requires` on a command may include: `authenticated`, `verifiedEmail`, `notRestricted`, `staffRole: [...]`, `capability: '...'`, `stepUp: true`, `owner: (input, actor) => …`.
- Every command that changes state writes an `audit_events` row in the same transaction. Details are an **allowlisted** object: ids, enums, counts, before/after for config values. Never free text from users, never emails, never file names, never review bodies.
- The reporter of a report is never included in any projection except the `moderation.revealReporter` query, which itself writes an `identity_reveals` audit row.

## 6. Internationalisation (AD-9)

- Message keys are the prototype's keys, unchanged (`'compose.identity.anonNote'`), moved into `packages/i18n/messages/{en,bn}.json` as nested objects. next-intl namespaces map 1:1 to the first segment.
- **Both files change in the same commit** or the parity test fails. A new key without a Bengali string is a build failure, not a TODO. T-006 ports the prototype dictionary; after that, **any task may add the keys it introduces** to both files (listed in its hand-off) — that is not a boundary violation.
- No hard-coded user-facing strings in components or server code. Error messages travel as `messageKey`. Emails use keys too (`packages/i18n/messages/*.json` → `email.*`).
- Numbers: `formatNumber(n, locale)` — Bengali digits when `bn`. Dates: month/year only in public content (`formatMonthYear`). Counts always carry a denominator string built from a key with `{count}` and `{total}` params.
- `<html lang>` and `data-lang` are set from the route locale in the root layout (server-rendered, no flash). The language toggle (`অ`) links to the same path under the other locale and sets the `rk.lang` cookie so the bare `/` redirect remembers it.
- Bengali typography rules are CSS (`html[data-lang="bn"]`) — already in the ported stylesheets. Do not add per-component Bengali overrides.

## 7. CSS port rules (FD-032)

1. Copy `ui-design-prototype/shared/tokens.css` → `apps/web/src/styles/tokens.css`; `…/concept-04b-quiet-clinic-minimal/styles.css` → `patient.css`; `…/admin/styles.css` → `admin.css`. **Do not rewrite them.** Fix only what breaks in a multi-page app (e.g. relative `url()` — there are none — or `body[data-view]` selectors, which stay and are driven by the layout).
2. Class names in JSX are the prototype's class names, verbatim. A component that needs a new class adds it to the ported stylesheet with a comment `/* added: T-xxx reason */`; it may not add inline styles except where the prototype itself used them.
3. Scoping: `<body data-app="patient|admin" data-view="<view>">`. next-intl requires the `[locale]` layout to own `<html>`/`<body>`, so nested layouts cannot set body attributes; `proxy.ts` sets an `x-pathname` request header and the `[locale]` layout derives `data-app` from it (`/admin` prefix → `admin`) and `data-view` from the first path segment. `patient.css` and `admin.css` are imported only by their own nested layout, so the two stylesheets never meet on one page. `tokens.css` loads on both.
4. Theme: `:root[data-theme="dark"|"light"]` set from the `rk.theme` cookie in the root layout (server-side, no flash); the `◐` control toggles it via a server action that sets the cookie and refreshes. Motion: `body[data-motion="off"]` from the `rk.motion` cookie. Colour scheme A/B/C comparison controls from the prototype are **dropped**.
5. Fonts: none shipped, none fetched. The stacks in `tokens.css` are final.
6. Icons: the inline SVG paths in the prototype (`ICONS` in `admin/app.js`) become a small `Icon` component with the same paths. No icon library.
7. Motion: CSS-only, the five 04b primitives. No animation libraries.
8. Before a UI task is done: run `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` (ported `tools/contrast.mjs` reading `tokens.css`); both must be clean.

## 8. React port rules

- One prototype render function → one component file with the same name in PascalCase (`renderProfile` → `components/patient/DoctorProfile.tsx`; `caseDetail` → `components/admin/CaseDetail.tsx`). Keep the prototype's DOM structure, order, headings, `aria-*`, and `data-*` attributes. Port comments that explain *why* (there are many; they are design decisions).
- Server components by default. A component becomes `'use client'` only if it holds interaction state (tabs, sheets, the compare tray, the composer, the viewer, the redaction canvas, comment editors). Data comes down as view models from the page.
- Sheets/dialogs use the prototype's `.overlay > .sheet[role=dialog]` markup with the same focus trap behaviour, implemented once in `components/shared/Sheet.tsx`.
- Forms submit to **server actions** and work without JavaScript where the prototype form did (register, sign-in, report, comment). Enhance with `useActionState` for inline errors. Every action returns `Result`; the component renders `error.messageKey` via next-intl.
- The `#sr-live` region and `announce()` behaviour become a `useAnnounce()` hook + one `<LiveRegion/>` in the layout; every route change and every sheet open/close announces exactly what the prototype announced.
- `setNoindex(true)` in the prototype becomes route `metadata.robots = { index: false }` on `/authors/*`, all `/me/*`, all `/admin/*`, and auth pages; T-502 additionally sends `X-Robots-Tag: noindex` headers for those prefixes — both stay. Doctor/facility/condition/experience pages are **indexable** (the prototype's `setNoindex(true)` inside `renderProfile` was a prototype-era artefact).
- No `localStorage` for anything that is now server state. Allowed: nothing — theme/lang/motion are cookies so SSR matches.
- The demo panel (role chip, scheme picker) is **not** ported. The `demo.banner` string is reworded (see i18n task) and rendered once in the masthead as `.demo` exactly where the prototype put it.

## 9. Routing

- Patient routes live under `app/[locale]/(patient)/…`, staff under `app/[locale]/admin/…`. `[locale]` is `en | bn`; anything else 404s. `/` redirects to the cookie locale, else `bn` if `Accept-Language` prefers Bengali, else `en`.
- Public ids in URLs (`/doctors/{publicId}`); an optional trailing `-slug` segment is ignored. Old prototype ids (`d1`, `r6`) exist only in the seed as `seed_ref` for tests.
- Every page exports `generateMetadata` producing the same title the prototype's `titleForView` produced, in the active locale.
- Hidden, deleted, rejected content returns 404 to the public and a labelled tombstone where the state machine says a tombstone exists.

## 10. Testing

| Level | Where | Tool | Minimum per task |
|---|---|---|---|
| domain | `packages/domain/**/*.test.ts` | Vitest | every state transition table; every policy function; hard-rule tests where the task names them |
| application | `packages/application/**/*.test.ts` with fakes from `test-support` | Vitest | each command's happy path + each authorization refusal + one audit assertion |
| database | `packages/database/**/*.int.test.ts` | Vitest against the compose PostgreSQL (`DATABASE_URL_TEST`) | each repository method; migrations apply from empty |
| component | `apps/web/**/*.test.tsx` | Vitest + Testing Library + jsdom | render in `en` and `bn`; the interactions the prototype's `tools/smoke.mjs` covered for that screen |
| e2e | `apps/web/e2e/*.spec.ts` | Playwright + axe | added in T-503; earlier tasks add a smoke spec only if the task says so |

Test names read as sentences: `it('hides content after five distinct confirmed accounts report it')`. Use builders, never hand-written fixture objects. Never assert on implementation details (class names, internal calls).

## 11. Logging, secrets, safety

- Logger port only; structured JSON; allowlisted fields (`event`, `correlationId`, opaque ids, enums, counts, durations). Never log emails, tokens, bodies, file names, search queries.
- Secrets come from environment variables listed in `infra/compose/.env.example`; none are committed; the worker gets only `DATABASE_URL_WORKER` (a role without access to `auth_*`, `persona_links`, `identity_reveals`), `STORAGE_ROOT`, `CLAMD_HOST/PORT`, `SMTP_*`.
- Anything that cannot run **fails closed**: scanner unreachable → item stays `scanning` with a custody event `scan_unavailable`, never advances; mail down → the verification command still succeeds and the job retries.

## 12. Git and commits

- Branch per task from `build/demo`: `task/t-101-better-auth`. Worktree per lane. Never `reset --hard`, `checkout --`, or `clean` on a dirty tree (see `docs/planning/11-worktree-safe-execution-plan.md`).
- Commit only the task's owned paths after reading `git diff --cached`. Message: `T-101: Better Auth adapter with Argon2id and verified email` then a short body. **No `Co-Authored-By`, no tool or model names, anywhere** (`AGENTS.md`). If your tool injects a trailer, run `git commit --amend` to remove it before pushing, or stop and tell the human.
- One task = one PR into `build/demo` after its `VALIDATE` record says PASS.

## 13. Definition of done (every task)

1. All steps in the task file done; owned paths only.
2. `pnpm check` green (typecheck, lint incl. boundaries, unit + integration tests, i18n parity, build).
3. New strings exist in both `en.json` and `bn.json`.
4. Hard-rule checklist in the task file ticked with evidence (file:line or test name).
5. `docs/implementation/tasks/T-xxx-*.md` "Hand-off" section filled: what changed, what was not done, questions for the human, follow-ups.
6. A separate validator session produced a record in `docs/validation/T-xxx.md` (template in `README.md` §4) with PASS / PASS WITH FOLLOW-UP / FAIL.

## 14. The hard-rule checklist (copy into every task's hand-off)

- [ ] No number stands for quality; every distribution shows count and denominator; no combined score exists anywhere in code or schema.
- [ ] Missing values render "Not provided" / "No documents", never `0`.
- [ ] "Limited data" appears when eligible accounts < configured threshold.
- [ ] Every doctor shows "Registration not verified".
- [ ] Evidence copy is "Documents attached — not medically validated"; never "verified"/"approved".
- [ ] Reviewer claims render as "Reviewer's label".
- [ ] Facility feedback never enters a doctor's aggregates (query-level, tested).
- [ ] Reporter identity never reaches the reported party or any public projection; in the console it reads "restricted".
- [ ] Original evidence is never served publicly; original access is a separate audited capability; scanning that cannot run fails closed.
- [ ] Persistent disclaimer and non-blocking emergency guidance present where the prototype had them.
- [ ] Ordering is neutral (relevance, most accounts, most recent); no "highest rated".
- [ ] Bengali and English both work; numerals follow language; no cap-transform in Bengali.
- [ ] Synthetic marker still visible; no real person or facility named in a negative account.
- [ ] No agent/tool attribution in any file or commit.

## 15. When unsure

Stop at the point of doubt, write the question under "Questions for the human" in your task file's hand-off section with the two options you see, pick the one that is **reversible and narrower**, mark it clearly in code with `// ASSUMPTION(T-xxx): …`, and continue. Do not redesign, do not widen scope, do not "improve" copy or visuals beyond the prototype.
