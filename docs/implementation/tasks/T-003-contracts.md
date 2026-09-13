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
11. `view-models/<page>.ts`: plain `type`s (no zod) for the names in 03 §6. Each file starts with `// Replaces: <prototype fn> in <file>; maps from RK.<collection> fields …`. Include the fields the prototype visibly renders — e.g. `DoctorProfileVM`: `publicId, name, specialty, qualifications?, bmdcNumber?, gender?, languages?, feeDisplay?, city, area, about?, chambers: {name, hours?, provenance, branchPublicId?}[], provenance: Record<string, {source: Provenance; updatedAt: Iso8601}>, claimed: boolean, registrationNotVerified: true, sentiment: DistributionVM, outcome: DistributionVM, byCondition: {condition: ConditionRefVM; count: number}[], accountsCount: number, facilities: FacilityRefVM[]` with `DistributionVM = { counts: Record<string, number>; total: number; limitedData: boolean }`. Bilingual text fields are plain `string` — the query resolves the locale server-side; **never** `{en, bn}` pairs in a VM. Mark each VM with `// TODO(T-xxx): owner refines` per the task map (doctor → T-202, facility/condition → T-203, search → T-206, experience/thread/evidence → T-307/T-402/T-308, composer → T-306, workspace/security/notification/public-profile → T-409/T-102/T-405, queue/case-tray/quarantine/providers/staff-notifications/config → T-406/T-407/T-408).
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

Built `packages/contracts` end to end per "Owned paths": `result.ts` (`Result`,
`ok`/`err`/`isOk`/`unwrap`), `errors.ts` (`ERROR_CODES` — the exact 38-code
union copied from 03 §2 — `AppError`, `errorMessageKey`, `InternalError`),
`actor.ts` (`Capability`, `Actor`, `ANONYMOUS_ACTOR`, `capabilitiesForRole`),
`ids.ts` (`newId`/`isId` UUIDv7, `newPublicId`/`isPublicId`/`stripSlug`
10-char Crockford base32), `time.ts` (`Iso8601`, `toIso`/`fromIso`,
`addDays`, `monthYear`), `enums.ts` (36 data-model enums + 2 extra `as
const` lists — `CRITICAL_REPORT_REASONS`, `PROTECTED_PROFILE_FIELDS` — 38
`as const` arrays total), `page.ts` (`PageMeta`, `CursorPage`,
`BoundedPage`, `encodeCursor`/`decodeCursor`, implemented without `Buffer`
or `btoa`/`atob` so the package stays runnable outside Node), and
`config-values.ts` (`ConfigValuesSchema` zod schema + ranges,
`DEFAULT_CONFIG_VALUES`).

14 `schemas/<module>.ts` files (`account`, `staff`, `identity`, `directory`,
`taxonomy`, `search`, `review`, `evidence`, `retention`, `community`,
`moderation`, `notification`, `administration`, `data-requests`) — one zod
`z.object` per command in 03 §4 (job payloads included), named
`<Verb><Noun>Input`. The four names given verbatim in the task text
(`RegisterInput`, `PublishReviewInput`, `FileReportInput`, `DecideCaseInput`,
`ApplyConfigInput`) are exact; every other command got a similarly qualified
name (e.g. `PublishInput` for both `review.publish` and the internal
`evidence.publish` would have collided under one flat `index.ts` namespace,
so they are `PublishReviewInput` / `PublishEvidenceInput`). Encoded limits:
password min 10, username `/^[a-z0-9_]{3,24}$/`, comment body 1-4000, report
detail <= 2000, evidence limits as exported `EVIDENCE_LIMITS` (10 items /
15 MB / 100 MB). Composer/submission/field-change/appeal-checklist payloads
a later task owns are `z.unknown()` with a `// TODO(T-xxx)` line naming the
owner. Every file exports a `<module>Schemas` discoverability object.

19 `view-models/<page>.ts` files (`discover`, `search`, `doctor`, `facility`,
`condition`, `experience`, `thread`, `evidence`, `composer`, `workspace`,
`security`, `notification`, `public-profile`, `queue`, `case-tray`,
`quarantine`, `providers`, `staff-notifications`, `config`) — plain
serialisable `interface`/`type`s (no zod), each starting with a comment
naming the prototype function/RK.* fields it replaces and a
`// TODO(T-xxx)` line naming the owner per the task's map. Shared shapes
(`DistributionVM`, `ProvenanceFieldVM`, `ChamberVM`, `ConditionRefVM`,
`FacilityRefVM`) live in `doctor.ts` (where the task's example introduces
them) and are imported by `facility.ts`/`condition.ts`/`search.ts`.

`src/index.ts` re-exports every file with a flat `export *` (verified no
name collisions across the whole package — see "Not done and why" for the
one deliberate exception). `packages/contracts/package.json` gained
`zod@^4.5.4` (resolved `4.6.2`) and `uuid@^13` (resolved `13.0.2`) as
dependencies; `@types/uuid` was **not** added — `uuid@13` ships its own
`dist/index.d.ts`.

Tests: `ids.test.ts` (3), `result.test.ts` (4), `actor.test.ts` (3),
`config-values.test.ts` (3), `errors.test.ts` (2), `schemas.test.ts` (5),
plus the pre-existing `workspace.smoke.test.ts` (2) and a new
`contracts.smoke.test.ts` (1, added for the cumulative smoke suite,
04-handoff-and-validation.md §3.1) — 23 tests in the package, 39 in the
whole repo.

Also: reverted an unrelated stray `allowBuilds` stub that a plain `pnpm
install` had auto-written into `pnpm-workspace.yaml` before this task
touched anything (same phenomenon T-006 hit and reverted per ISS-055 — not
committed, not part of this task's owned paths). Appended a 2026-09-13
entry to `docs/status/dependency-check-log.md` for `zod`/`uuid` (the
existing 2026-09-13 entry covered other dependencies, not these two, and
the 2026-09-10 entry that did mention `zod` was exactly 3 days old, i.e.
not "less than 3 days", so a fresh check was done per `AGENTS.md`).

### Not done and why

- `schemas/directory.ts` `ListDoctorsInput.filters`, `schemas/review.ts`
  `SaveDraftInput.payload`/`CorrectReviewInput.fields`/
  `ListExperiencesInput.filters`, `schemas/directory.ts`
  `SubmitProfileInput.payload`/`ProposeFieldChangeInput.newValue`,
  `schemas/moderation.ts` `DecideAppealInput.checklist`,
  `schemas/notification.ts` `NotificationDeliverJobInput`,
  `schemas/administration.ts` `ProposeConfigInput.values` (shallow, not
  deep, partial) — all left as `z.unknown()`/a shallow partial with a
  `// TODO(T-xxx)` line naming the later task that owns the exact shape,
  per the task's own "Not in scope" instruction ("you create the files
  with the fields the prototype visibly renders and a `// TODO(T-xxx)`
  line naming the owner").
- View-model field lists are the task's own explicit scope boundary
  ("Final field lists of view models owned by later tasks") — every file
  carries a `// TODO(T-xxx)` naming its owner per the task's map.
- Did not use `crypto.getRandomValues` for `newPublicId()` (ISS-073) or add
  a formal `gender` enum to `enums.ts` (ISS-074) — see the Issues list.

### Questions for the human

- The task's acceptance-check table expects 40 error codes; the exact
  union copied from `03-routes-and-contracts.md` §2 has 38 (verified by
  grepping the source doc directly), and the acceptance check's own grep
  command against `errors.ts` returns 39 (38 codes + one incidental `'.'`
  string literal inside `errorMessageKey`). Is 38 the intended count (and
  the task file's "40" simply wrong), or were 2 codes meant to exist in
  03 §2 that are missing from that doc? I took the narrower, non-inventive
  option: copy exactly what 03 §2 has (ISS-076). `pnpm i18n:check`'s
  `ERROR_CODES <-> errors.*` completeness check passes against this exact
  set, which is independent evidence 38 is correct.
- `uuid@14.0.0` is now current (v13 is "legacy-13") and its `v7()` fix is
  directly relevant to this package's only use of the library. Kept the
  task's pinned `^13` rather than bump a major on my own authority
  (ISS-075) — worth a deliberate decision on whether/when to move to v14.

### Follow-ups

- ISS-073, ISS-074, ISS-075, ISS-076 (see `ISSUES.md`).
- Every `z.unknown()`/TODO-marked schema and VM field list above is a
  follow-up for its named owner task.

### `pnpm check` output summary

Before any change (baseline): typecheck 9/9 packages green; lint green;
`vitest run` 18 tests / 4 files green; i18n parity green (764 keys, noting
`errors.ts` did not exist yet); build green.

After this task: `pnpm --filter @rogikotha/contracts typecheck` — clean,
exit 0. `pnpm --filter @rogikotha/contracts test` — 8 files, 23 tests,
green. Full `pnpm check` from repo root: typecheck 9/9 packages green;
`eslint .` green; `vitest run --config vitest.workspace.ts` — **11 files,
39 tests**, all green; `pnpm i18n:check` — "764 keys, both locales, no
placeholder or ERROR_CODES mismatches" (the `ERROR_CODES <-> errors.*`
completeness check now actually runs, and passes, against this task's
`errors.ts`); `pnpm -r build` green. `pnpm smoke` from repo root: **3
files, 5 tests**, green (added `contracts.smoke.test.ts`).

### Hard-rule evidence

- No number stands for quality — `grep -rniE "rating|score"
  packages/contracts/src` → no matches.
- Reporter identity never reaches a public projection — `grep -rn
  "reporterAccountId" packages/contracts/src` → no matches;
  `view-models/case-tray.ts`'s `CaseTrayVM.reporter` is the literal type
  `'restricted'`, never an id.
- No `{en, bn}` pairs in view models — `grep -rn "bn:"
  packages/contracts/src/view-models` → no matches.
- No framework imports — `grep -rnE "from '(next|react|drizzle|pg)"
  packages/contracts/src` → no matches.
- No agent/tool attribution — `grep -rniE
  "claude|anthropic|gpt|openai|co-authored" packages/contracts/src` → no
  matches.
