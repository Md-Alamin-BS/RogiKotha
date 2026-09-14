# T-104 — Identity module: personas, thread-scoped anonymous alias, private linkage, audited reveal

| Field | Value |
|---|---|
| Story | STORY-IDENT-001 |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol + human privacy approval (T-106) |
| Effort setting | xhigh |
| Estimate | 4–6 h agent; validation 2 h |
| Depends on | T-101 (register creates the first personas), T-103 (`capability`, `stepUp`) |
| Parallel-safe with | T-102, T-105, T-201 (disjoint paths; T-105 and T-104 both touch `staff_notifications` inserts through the notification repository — append-only, no conflict) |

## Goal

Implement AD-3: public content references `personas` only; the link from a persona to its account lives in `persona_links`, reachable solely through a `PrivateIdentityRepository` that only the identity, data-requests and moderation-enforcement code receive. Anonymous authorship gets a stable alias scoped to one review thread. Staff identity reveal is a capability- and step-up-gated command that records every attempt.

## Read first

1. `docs/implementation/01-conventions.md` §1 (module layout), §2 (worker must not import reveal), §5, §11.
2. `docs/implementation/02-data-model.md` §3 (all three tables + rules), §16 (grants: `rk_worker` has no privilege on `persona_links`, `identity_reveals`), §12 `staff_notifications` kind `identityReveal`.
3. `docs/implementation/03-routes-and-contracts.md` §3 ports (repositories), §4 "identity" (four entries), §2 `Capability` `identity.reveal`.
4. `docs/architecture/ARCHITECTURE-SPINE.md` AD-3; `docs/planning/05-recommended-architecture.md` "Authentication and identity" (the four reveal requirements); FD-015, FD-016, FD-022 in `docs/status/decision-log.md`.
5. T-101's register command (where personas are currently created — you move that behind the identity repository).
6. Prototype semantics: `ui-design-prototype/shared/rogikotha-data.js` `accountsByAuthor()` (returns `[]` for anon) and the `byline.*` strings; `concept-04b…/app.js` `byline()` (≈516) and `renderPerson()` (≈1852, `identity !== 'anon'` allowlist).

## Owned paths

- `packages/domain/src/identity/**` (`persona.ts`, `alias.ts`, `projection.ts`, tests)
- `packages/application/src/modules/identity/**`
- `packages/application/src/ports/repositories/identity.ts` (`IdentityRepository` public + `PrivateIdentityRepository`)
- `packages/database/src/repositories/identity.ts`, `identity-private.ts`
- `packages/database/src/migrations/*_identity_grants.sql` (only if T-004's `0004_roles.sql` lacks the column/table revokes)
- `packages/application/src/modules/account/commands/register.ts` (replace direct persona inserts with `identity.createDefaultPersonas`)
- `packages/contracts/src/view-models/persona.ts` (`PersonaPublicVM`)
- `packages/contracts/src/schemas/identity.ts`
- `apps/web/src/server/container.ts` (inject `PrivateIdentityRepository` only into identity + data-requests + moderation factories; add a boundary test)
- `apps/web/src/server/actions/identity.ts` (reveal action for T-406's console use)
- `packages/i18n/messages/{en,bn}.json` — `admin.reveal.*` keys already exist; add `errors.identity.*` if needed
- tests alongside

## Not in scope

- Reveal UI (T-406 renders the button using this action). Reactions/comments persona selection (T-401 calls `identity.personaFor`). Deletion de-identification (T-410 calls `identity.deidentify`, which you **do** add as a command stub with tests for the link removal). Rename flow producing new snapshot personas beyond the command `identity.renameNamed` (add; UI later in T-409).

## Steps

1. **Domain.** `Persona` type (`kind`, `displayName`, `username?`, `avatarHue`); `newAnonymousAlias(random)` → `patient-` + 4 chars of `abcdefghjkmnpqrstuvwxyz23456789` (no confusables); `publicProjection(persona)` → `{ displayName, username: kind === 'anonymous' ? undefined : username, kind, avatarHue }` — never any account field; property test: for every persona, the projection JSON contains no key from a denylist (`accountId`, `email`, `reviewId`).
2. **Ports.** `IdentityRepository` (public: `getPersona`, `listPersonas(ids)`), `PrivateIdentityRepository` (`linkFor(personaId)`, `personasOf(accountId)`, `createPersona(persona, link)`, `findAnonymousFor(accountId, reviewId)`, `removeLinks(accountId)`, `recordReveal(row)`). Only `PrivateIdentityRepository` can read `persona_links`.
3. **Commands/queries.** `identity.createDefaultPersonas(accountId, displayName, username)` (called by register; idempotent); `identity.personaFor({ accountId, reviewId?, mode })` — returns the named or pseudonymous persona, or creates/returns the thread-scoped anonymous one (unique index `(account_id, review_id)` on `persona_links` where kind = anonymous; alias uniqueness retried on collision); `identity.publicProjection({ personaId })`; `identity.renameNamed({ displayName })` creates a **new** named persona (old content keeps the old snapshot) and makes it default; `identity.deidentify({ accountId })` deletes `persona_links` rows and rewrites `personas.display_name` to the localized "Former member" key **only** for named/pseudonymous personas (anonymous aliases stay as they are); `identity.accountsOf` (private query).
4. **Reveal.** `identity.reveal({ targetKind, targetId, reason })`: `requires: { capability: 'identity.reveal', stepUp: true }`; resolve the persona behind the target (review author, comment author, facility review author — through each module's public repository, then `linkFor`); **always** insert `identity_reveals` (`granted` true/false, `requester_role`), audit `identity` stream, `staff_notifications` kind `identityReveal` with `target_code`; return `{ username, displayName }` + `email` only for `super_admin`. `reason` must be ≥ 10 chars. Refusals (no capability, no step-up) still record an `identity_reveals` row with `granted=false` — implement by catching the authorization refusal inside the command wrapper for this command only (document the pattern).
5. **Grants.** Integration test that opens a connection as `rk_worker` and expects `permission denied for table persona_links` and `identity_reveals`; if T-004's roles migration lacks it, add a migration with the revokes.
6. **Container boundary.** In `container.ts` build `privateIdentityRepo` and pass it only to `identityModule`, `dataRequestsModule` (placeholder), `moderationEnforcement` (placeholder). Add a unit test that asserts the community/review/search module factories' parameter types do not include it (TypeScript-level: a `// @ts-expect-error` test file).
7. **Byline data.** Provide `identity.bylineFor(personaId, locale)` query returning what `byline()` in the prototype needs (`byline.identity.real|pseudo`, `byline.anonSentence`) so T-307/T-402 render identical copy.
8. Tests, `pnpm check`, hand-off, commit `T-104: …`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Alias scoped | `personaFor(acc, r1, anonymous)` twice, then `(acc, r2, anonymous)` | same persona for r1; different alias for r2 |
| No linkage in projection | property test over 1 000 random personas | no denylisted key in projection JSON |
| Reveal always recorded | call reveal as moderator without capability, as admin with toggle on but no step-up, as super admin with step-up | three `identity_reveals` rows: false, false, true; three audit rows; three staff notifications |
| Worker cannot read links | `pnpm --filter database test:int -t worker-grants` | permission denied on `persona_links` and `identity_reveals` |
| Register still works | T-101 int test | personas created via the identity command; counts unchanged |
| Deidentify | run on a seeded account | `persona_links` rows gone; named/pseudonymous display names replaced; anonymous aliases untouched; public pages still render |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- `domain/identity/*.test.ts`: alias alphabet and length; projection property test; rename creates new persona.
- `application/modules/identity/*.test.ts` (fakes): all commands; refusal rows; reason length; super-admin-only email.
- `database/repositories/identity.int.test.ts`: unique index on anonymous per (account, review); alias collision retry; grants test as `rk_worker`.
- `apps/web/src/server/container.test.ts`: boundary type test.

## Threat notes

| # | Abuse case | Defence | Test |
|---|---|---|---|
| 1 | Joining public tables to accounts | no account column on `personas`; links private; worker role revoked | grants + schema tests |
| 2 | Cross-thread correlation of an anonymous author | alias per (account, review); no shared field | alias-scoped test |
| 3 | Reveal without trace | every attempt recorded, granted or not; append-only table | refusal rows test |
| 4 | Admin/mod reveal by default | capability off unless config toggle (T-105 invariant) | capability table (T-103) + reveal refusal |
| 5 | Reveal via a query path that bypasses the command | `PrivateIdentityRepository` injected only into three modules; type-level boundary test | container test |
| 6 | Display-name change retroactively de-anonymises or edits old bylines | new persona per rename; old snapshot immutable | rename test |
| 7 | Deletion leaks by removing the alias | deidentify keeps anonymous alias text, removes links only | deidentify test |
| 8 | Logs carry account↔persona pairs | Logger allowlist; identity module logs persona ids only | log capture assertion |

## Hard-rule checklist

- [ ] Anonymous alias never links to profile, reactions, mentions, other reviews (projection tests).
- [ ] Reveal is purpose-bound, step-up gated, audited on every attempt; FD-022 disclosure text is only in Privacy (T-102's policy page).
- [ ] Reporter identity untouched here (moderation, T-403).
- [ ] Both locales for any new string.
- [ ] No attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
