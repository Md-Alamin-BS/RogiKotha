# T-003 — Contracts package

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-001 |
| Parallel-safe with | T-002, T-006 (T-004 starts after this task because the schema imports the enums) |

## Goal

Build `packages/contracts`: the `Result` type, the full `ErrorCode` union with i18n message keys, `Actor` and capabilities, id/time helpers, every enum from the data model, one zod input schema per command in the catalogue (skeletons where a later task owns the details), and the view-model type files with TODO markers. This package is the vocabulary every other package imports; nothing here touches a database or a framework.

## Read first

1. `docs/implementation/01-conventions.md` §1 (contracts layout), §3 (Result/commands), §4 (ids/time/text), §5 (Actor)
2. `docs/implementation/02-data-model.md` §0 (enums) and §11 (`ConfigValues` shape)
3. `docs/implementation/03-routes-and-contracts.md` §2 (contracts), §4 (command catalogue — every `name` and input), §6 (view models)
4. `docs/architecture/ARCHITECTURE-SPINE.md` "Consistency Conventions" table
5. `ui-design-prototype/shared/rogikotha-data.js` — the top-level collections (`doctors`, `facilities`, `reviews`, `evidence`, `comments`, `moderation.*`, `user`) whose shapes the view models replace

## Owned paths

Create: `packages/contracts/src/result.ts`, `errors.ts`, `actor.ts`, `ids.ts`, `time.ts`, `enums.ts`, `page.ts`, `config-values.ts`, `schemas/{account,identity,directory,taxonomy,search,review,evidence,retention,community,moderation,notification,administration,data-requests,staff}.ts`, `view-models/{discover,search,doctor,facility,condition,experience,thread,evidence,composer,workspace,security,notification,public-profile,queue,case-tray,quarantine,providers,staff-notifications,config}.ts`, `src/index.ts`, `src/*.test.ts`
Modify: `packages/contracts/package.json` (add zod, uuid)

## Not in scope

- Any implementation of commands (application package, later tasks).
- Drizzle schema (T-004/T-005) — enums are mirrored there from this file, not the other way round.
- Final field lists of view models owned by later tasks; you create the files with the fields the prototype visibly renders and a `// TODO(T-xxx)` line naming the owner.

## Steps

1. `pnpm --filter @rogikotha/contracts add zod@^4.5.4 uuid@^13` and `pnpm --filter @rogikotha/contracts add -D @types/uuid` only if `uuid@13` does not ship its own types (it does; skip if so).
2. `enums.ts`: for every enum in data-model §0 export `export const LOCALES = ['en','bn'] as const; export type Locale = (typeof LOCALES)[number];` — same pattern for all 33 enums, names in SCREAMING_SNAKE plural for arrays and PascalCase singular for types (`ACCOUNT_STATUSES`/`AccountStatus`, `PUBLICATION_STATES`/`PublicationState`, `REPORT_REASONS`/`ReportReason` …). Also export `CRITICAL_REPORT_REASONS = ['privacy','threat','unsafeFile'] as const` and `PROTECTED_PROFILE_FIELDS = ['name','bmdc_number'] as const`.
3. `result.ts`:
   ```ts
   export type Result<T> = { ok: true; data: T; meta?: PageMeta } | { ok: false; error: AppError };
   export const ok = <T>(data: T, meta?: PageMeta): Result<T> => …;
   export const err = (code: ErrorCode, opts?: { fieldErrors?: Record<string,string>; correlationId?: string }): Result<never> => …; // messageKey derived via errorMessageKey(code)
   export const isOk = <T>(r: Result<T>): r is { ok: true; data: T; meta?: PageMeta } => r.ok;
   export const unwrap = <T>(r: Result<T>): T => { if (!r.ok) throw new Error(`unwrap on error ${r.error.code}`); return r.data; }; // tests only
   ```
   `correlationId` defaults to `newId()`.
4. `errors.ts`: `ERROR_CODES` as a `const` array containing **exactly** the union in 03 §2 (copy it; do not invent codes), `type ErrorCode`, `interface AppError`, `errorMessageKey(code)` → `errors.<prefix>.<camelCaseName>` (e.g. `auth.invalid_credentials` → `errors.auth.invalidCredentials`; codes without a prefix → `errors.common.<name>`), and `class InternalError extends Error` for programmer errors. Add a test that every code maps to a key matching `/^errors\.[a-z]+\.[a-zA-Z]+$/` (T-006 checks the keys exist in the dictionaries).
5. `actor.ts`: `StaffRole`, `Capability` (the eight capabilities from 03 §2), `interface Actor` exactly as in conventions §5, `ANONYMOUS_ACTOR(locale, correlationId)`, and `capabilitiesForRole(role, config: ConfigValues['capabilities']): Capability[]` implementing: super_admin → all eight; admin → `reports.read, content.act, providers.decide, holds.manage` + `identity.reveal` if `config.admin.revealIdentity` + `evidence.original` if `config.admin.originalEvidence`; moderator → `reports.read, content.act` + the two toggles from `config.moderator`. Table-test it.
6. `ids.ts`: `newId()` = `uuid.v7()`; `isId(s)` (UUID v7 regex); `newPublicId()` = 10 chars from the Crockford base32 alphabet **without** vowels-that-spell-words? No — keep plain Crockford lowercase `0-9a-hjkmnp-tv-z` (10 chars from `crypto.getRandomValues`), `isPublicId(s)` = `/^[0-9a-hjkmnp-tv-z]{10}$/`, `stripSlug(param)` → the first 10 chars when `param` matches `/^[0-9a-hjkmnp-tv-z]{10}(-.*)?$/`, else `null`. Tests: 10 000 generated ids are unique and valid; `stripSlug('a1b2c3d4e5-dr-farhana')` → `a1b2c3d4e5`.
7. `time.ts`: `type Iso8601 = string & { __brand: 'Iso8601' }`, `toIso(d: Date): Iso8601` (UTC, milliseconds), `fromIso(s: string): Date` (throws `InternalError` on invalid), `addDays(d, n)`, `monthYear(d) → { year, month }`.
8. `page.ts`: `PageMeta` from 03 §2; `CursorPage<T> = { items: T[]; nextCursor?: string }`; `BoundedPage<T> = { items: T[]; page: number; pageSize: number; total: number }`; `encodeCursor(obj)`/`decodeCursor(s)` (base64url JSON).
9. `config-values.ts`: zod `ConfigValuesSchema` matching data-model §11 exactly (with the ranges from `config.apply` in 03 §4 as zod `.min/.max`), `type ConfigValues = z.infer<…>`, and `DEFAULT_CONFIG_VALUES` (the literal from §11). Test: defaults parse; `fiveAccountHide: 1` fails; unknown key fails (`.strict()`).
10. `schemas/<module>.ts`: one `z.object` per command in 03 §4, named `<VerbNoun>Input` (e.g. `RegisterInput`, `PublishReviewInput`, `FileReportInput`, `DecideCaseInput`, `ApplyConfigInput`). Use the enums from step 2 via `z.enum(ACCOUNT_STATUSES)`. Where 03 §4 gives limits, encode them (password min 10; username `/^[a-z0-9_]{3,24}$/`; comment body 1–4000; report detail ≤ 2000; evidence limits 10 / 15 MB / 100 MB as exported constants `EVIDENCE_LIMITS`). Where a later task owns detail (e.g. `SaveDraftInput.payload` — composer state shape owned by T-301/T-306), use `z.unknown()` with `// TODO(T-301): replace with DraftPayloadSchema`. Every schema file exports `export const <module>Schemas = { … }` for discoverability.
11. `view-models/<page>.ts`: plain `type`s (no zod) for the names in 03 §6. Each file starts with `// Replaces: <prototype fn> in <file>; maps from RK.<collection> fields …`. Include the fields the prototype visibly renders — e.g. `DoctorProfileVM`: `publicId, name, specialty, qualifications?, bmdcNumber?, gender?, languages?, feeDisplay?, city, area, about?, chambers: {name, hours?, provenance, branchPublicId?}[], provenance: Record<string, {source: Provenance; updatedAt: Iso8601}>, claimed: boolean, registrationNotVerified: true, sentiment: DistributionVM, outcome: DistributionVM, byCondition: {condition: ConditionRefVM; count: number}[], accountsCount: number, facilities: FacilityRefVM[]` with `DistributionVM = { counts: Record<string, number>; total: number; limitedData: boolean }`. Bilingual text fields are plain `string` — the query resolves the locale server-side; **never** `{en, bn}` pairs in a VM. Mark each VM with `// TODO(T-xxx): owner refines` per the task map (doctor → T-202, facility/condition → T-203, search → T-206, experience/thread/evidence → T-307/T-308/T-402, composer → T-306, workspace/security/notification/public-profile → T-409/T-102/T-405, queue/case-tray/quarantine/providers/staff-notifications/config → T-406/T-407/T-408).
12. `index.ts` re-exports everything. `pnpm --filter @rogikotha/contracts typecheck && pnpm --filter @rogikotha/contracts test`.
13. Commit: `T-003: contracts — Result, errors, Actor, enums, command schemas, view-model types`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Package builds | `pnpm --filter @rogikotha/contracts typecheck` | exit 0 |
| Tests | `pnpm --filter @rogikotha/contracts test` | all green; ≥ 12 tests |
| Enum parity | `node -e "import('./packages/contracts/src/enums.ts')"` is not runnable — instead grep: `grep -c "as const" packages/contracts/src/enums.ts` | ≥ 35 |
| Error codes complete | `grep -o "'[a-z_.]*'" packages/contracts/src/errors.ts \| sort -u \| wc -l` | equals the count of codes in 03 §2 (count them; expect 40) |
| No `{en, bn}` in VMs | `grep -rn "bn:" packages/contracts/src/view-models` | no matches |
| No framework imports | `grep -rnE "from '(next|react|drizzle|pg)" packages/contracts/src` | no matches |

## Tests to write

- `ids.test.ts`: "generates unique valid public ids", "stripSlug returns the id for id-with-slug and null for garbage", "newId is a v7 uuid".
- `result.test.ts`: "err derives the message key from the code", "unwrap throws on error results".
- `actor.test.ts`: "super admin has every capability", "admin gains identity.reveal only when config enables it", "moderator never gains providers.decide".
- `config-values.test.ts`: "defaults parse", "out-of-range threshold fails", "unknown key fails".
- `schemas.test.ts`: "RegisterInput rejects a 9-character password", "RegisterInput rejects an uppercase username", "FileReportInput accepts every report reason".

## Hard-rule checklist

- [ ] No number stands for quality (no `score`/`rating` field exists in any VM or schema — grep `rating|score`).
- [ ] Reporter identity never reaches any public projection (no `reporterAccountId` in any VM).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
