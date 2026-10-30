# Unit test instructions — demo slice

## Framework

Vitest 4 through `vitest.workspace.ts`:

- `web` (jsdom) for pages and components, rendered in `en` and `bn`;
- `database` for the `*.int.test.ts` files of `packages/database/src/demo/**` against `DATABASE_URL_TEST`;
- `tooling` for scripts.

Coverage uses `@vitest/coverage-v8` with the existing 80% line floor per package.

## Run this slice's tests

Every long command carries an outer `timeout`. Step 1 records the verified commands here.

```bash
pnpm infra:up
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web
timeout 600 pnpm test:int
timeout 600 pnpm smoke
timeout 1500 pnpm check
```

Run only one database-touching command at a time.

## What to cover (one test per requirement, happy path per component)

| Requirement | Test |
|---|---|
| FR1 | register creates an active account and a named persona; duplicate email gives the neutral message; a seeded patient signs in; sign-out clears the session |
| FR2 | display-name change inserts a new persona and old content keeps the old name; language preference saved |
| FR3, FR7 | doctors list order and "Registration not verified"; doctor page lists published experiences; home lists recent ones |
| FR4 | create publishes; only the author can edit; an edit writes `review_versions` |
| FR5 | a PNG with a clean scan becomes ready; a disguised file is refused; ClamAV unreachable leaves it quarantined and uncounted; the public page shows only the note and count |
| FR6 | a comment and a reply post; a second reply level is refused; delete of own comment with replies gives a tombstone; others cannot delete |
| NFR1 | every page renders in `en` and `bn` |
| Smoke | one demo smoke assertion |

Test names read as sentences. Use builders, and each test must be able to fail. Nothing in `apps/*` imports from `test-support`.
