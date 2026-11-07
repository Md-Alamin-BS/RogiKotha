# Unit test instructions — U49 `u49-comments`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U49 uses these:

- `domain` (`packages/domain/vitest.config.ts`): `buildThread`, `capRows`, body rules, `tombstoneOnDelete`, the limit constants.
- `contracts`: `PostCommentInput`, `DeleteCommentInput`, `GetThreadInput`, the `ThreadVM` shape.
- `application`: the `comment.post`, `comment.delete` and `community.thread` handlers with `test-support` fakes, and the new smoke file.
- `test-support`: the new community fake and the comment builder.
- `database` (node, serial, against `DATABASE_URL_TEST`): `repositories/community.int.test.ts` and the demo-slice smoke file.
- `web` (`apps/web/vitest.config.ts`, jsdom): the server actions, the moved adversarial cases and the component tests. Testing Library renders each component in `en` and `bn`.

U49 adds no Playwright test: the design asks for none, and U50 walks the discussion (comment, reply, delete) end to end. Coverage uses `@vitest/coverage-v8`.

## Where it runs

The Unit runs in its own git worktree on `bolt/u49-comments`, built in batch 3 after U47 merges. `DATABASE_URL_TEST` points at the test database the orchestrator assigned (named `rogikotha_wN_test`, because the reset guard accepts only names ending in `_test`), never at another worktree's database. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`, and the `database` project commands below).

## Run this Unit's tests

Run from the worktree root. Every long command carries an outer `timeout`. Step 3 runs the existing comment tests first and records the count; it corrects this file if a filter does not match.

```bash
pnpm infra:up

# Before any change (Step 3): the existing comment tests.
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/comments/ apps/web/src/server/actions/comments.test.ts
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/comments.int.test.ts

# Contracts (Step 7):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project contracts packages/contracts/src/schemas/community.test.ts

# Domain (Step 10):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project domain packages/domain/src/community/

# Repository against the assigned test database (Step 13):
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/repositories/community.int.test.ts

# Fakes and builders (Step 14):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project test-support packages/test-support/src/

# Application handlers (Steps 18-19):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/community/

# Server actions and the moved adversarial cases (Step 22):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/actions/comments.test.ts apps/web/src/server/actions/ownership.adversarial.test.ts

# Components, and the experience page test unchanged (Step 27):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/comments/ "apps/web/src/app/[locale]/(patient)/experiences/"

# Smoke files, then the whole cumulative smoke suite (Step 28):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/modules/community/comments.smoke.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project database packages/database/src/demo/demo-slice.smoke.test.ts
timeout 600 pnpm smoke

# i18n parity and the gate (Steps 24, 29):
timeout 300 pnpm i18n:check
timeout 1200 pnpm check
timeout 600 pnpm test:int
npx impeccable detect apps/web/src --no-advisory
timeout 300 pnpm contrast
```

Pass bracketed or parenthesised paths in quotes, as above. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end are the only whole-suite runs.

## What to cover (`functional-spec.md` § 9, `frontend-components.md` § Tests)

| Group | Tests |
|---|---|
| Contracts | body at 0, 1, 2000 and 2001 code points; whitespace only; Bengali text; NFC normalisation; bad public ids; extra keys refused |
| Domain | `buildThread`: live comment with live replies, deleted with live replies (placeholder), deleted without (omitted), last live reply deleted (placeholder gone), deleted reply never listed, hidden states never listed; oldest-first order; `capRows` at 500 and 501 rows with tombstones counted; `tombstoneOnDelete`; limit values pinned |
| Repository | each method; `byPublicId` scoped by review; `countLiveReplies` ignores deleted replies; `markDeleted` with and without tombstone; `threadRows` order and limit 501; the depth trigger refuses a reply to a reply as `community.reply_depth` |
| `comment.post` | comment and reply happy paths; unauthenticated, unconfirmed, restricted; unknown and unpublished review give the same `not_found`; missing and deleted parent; reply to a reply; rate limited after 30 valid posts with `retryAfterSec`; refusals do not hit the limiter; the author of a named and of an anonymous review gets the review's mode; another account is pseudonymous; the author with a `null` mode gets `internal` and nothing is written; one audit and one outbox assertion |
| `comment.delete` | own with and without live replies; not own, unknown and already deleted give identical `not_found`; audit with a persona actor; no outbox |
| `community.thread` | closed for unknown and unpublished; 201 distinct authors read in two `publicProjections` batches; a signed-out viewer makes no `ownsPersona` call, a signed-in one makes one per distinct author; 501 rows cut to 500 with `truncated`; no account, persona or internal id in the JSON; an anonymous author shows the thread alias, and the same account's alias differs in another thread (AC3.3.2) |
| Actions | each error mapping; `{minutes}` from `retryAfterSec`; body kept on refusal; both locales revalidated on success; no id beyond public ids in a result; the forged-delete and forged-persona cases moved, none dropped |
| Components (`en` and `bn`) | comments, replies and a placeholder; empty; closed; truncated note; each gate state; own comment shows delete and others do not; a reply has no reply button; form keeps the body on refusal; fallback on a query error with the disclaimer still first; no account, persona or internal id in the rendered HTML; no like, report, mention or edit control |
| Smoke | a confirmed account posts a comment and a reply, deletes the parent, and the thread shows the placeholder with the reply (application, fakes); the replaced demo-slice assertion lists a comment through `PgCommunityRepository` (database) |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls. Nothing in `apps/*` imports from `test-support`.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). For U49 the packages that move are `domain`, `contracts`, `application`, `database`, `test-support` and `apps/web`; each must stay at or above 80% and the floor is never lowered to pass (D10). Record the before and after figures in `code-summary.md`.

## Mocking and test data

- Application ports: the `test-support` fakes (`fakes/community-repository.ts`, the command-port fakes, the fake rate limiter, clock, ids, audit writer, outbox and logger) and builders (`builders/comment.ts`, `persona.ts`, `review.ts`, `account.ts`), never hand-written fixture objects. The review seams and identity calls are faked through the fakes U47 and U11 ship.
- In `apps/web` tests, mock `@/server/actions/comments`, `@/server/actions/account` (`getContributionAccess`) and the container's `community` module, as the slot and page tests on `main` already do; use the existing `apps/web` test helpers, because nothing in `apps/*` may import `test-support`.
- Database tests seed through the existing database test helpers on the assigned test database, reset to a freshly migrated schema on every run.
- Data: synthetic only. Every address uses `example.test`, every name and alias is invented, comment bodies are invented text in English and Bengali, and no real person, doctor or facility appears anywhere.
