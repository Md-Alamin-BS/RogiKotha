# T-010 — Boundary lint, `pnpm check`, CI workflow, contrast tool

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation (dependency-direction rules pass) |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 1.5–2 h agent; validation 0.5 h |
| Depends on | T-001, T-008, T-009 (all packages must exist so the rules can be exercised) |
| Parallel-safe with | T-007 |

## Goal

Make the architecture spine enforceable: ESLint boundary rules that encode the dependency direction exactly, a fixture that proves a violation fails, a one-command `pnpm check` that every task's definition of done relies on, a GitHub Actions workflow that runs it with a PostgreSQL service, and the contrast tool re-targeted at the ported tokens.

## Read first

1. `docs/implementation/01-conventions.md` §2 (the direction table — encode it verbatim), §7 step 8 (contrast + detector), §13 (definition of done: what `pnpm check` must cover)
2. `docs/implementation/00-master-plan.md` §3 (`eslint-plugin-boundaries` 7.2, fallback `dependency-cruiser` 18.2), §4 (layout)
3. `eslint.config.mjs` from T-001 (the `// T-010 adds boundaries here` block)
4. `tools/contrast.mjs` and `tools/README.md` "contrast.mjs" (what it reads and how it fails)
5. `apps/worker/src/container.test.ts` from T-009 (the grep test this task replaces with a lint rule)
6. `eslint-plugin-boundaries` README for v7 flat-config usage (`boundaries/elements`, `boundaries/element-types`, `boundaries/external`) — confirm ESLint 10 support in its changelog; if unsupported, use `dependency-cruiser` with `.dependency-cruiser.cjs` and wire it into `pnpm lint:deps` instead, and say so in the hand-off

## Owned paths

Create: `eslint.boundaries.mjs` (rule block imported by the root config), `lint-fixtures/boundary-violation/` (a tiny package-like folder with two files that import across a forbidden edge, excluded from `tsconfig` and included only by the fixture test), `scripts/check-boundaries-fixture.mjs`, `.github/workflows/check.yml`, `tools/contrast-app.mjs` (or modify `tools/contrast.mjs` to accept a `--tokens <path>` flag — prefer the flag), `docs/implementation/tasks/T-010-boundary-lint-and-ci.md` hand-off only
Modify: `eslint.config.mjs`, `package.json` (root: `lint:boundaries`, `check`, `contrast` scripts), `tools/contrast.mjs` (add `--tokens`), `tools/README.md` (one paragraph)

## Not in scope

- Fixing violations in other packages (there should be none; if there are, report them as findings for the owning task rather than editing).
- Playwright/axe in CI (T-503 adds a second job).
- Deploy workflows.

## Steps

1. `pnpm add -w -D eslint-plugin-boundaries@^7.2.0` (or `dependency-cruiser@^18.2.0` per the fallback decision in "Read first" item 6).
2. `eslint.boundaries.mjs` — elements by path:
   ```js
   elements: [
     { type: 'domain',       pattern: 'packages/domain/src/**' },
     { type: 'contracts',    pattern: 'packages/contracts/src/**' },
     { type: 'application',  pattern: 'packages/application/src/**' },
     { type: 'database',     pattern: 'packages/database/src/**' },
     { type: 'adapters',     pattern: 'packages/adapters/src/**' },
     { type: 'i18n',         pattern: 'packages/i18n/src/**' },
     { type: 'test-support', pattern: 'packages/test-support/src/**' },
     { type: 'web-components', pattern: 'apps/web/src/components/**' },
     { type: 'web-server',   pattern: 'apps/web/src/server/**' },
     { type: 'web',          pattern: 'apps/web/src/**' },
     { type: 'worker',       pattern: 'apps/worker/src/**' },
   ]
   ```
   Rules (`boundaries/element-types`, default `disallow`) exactly from conventions §2: `domain → []`; `contracts → []` (zod is external, allowed via `boundaries/external`); `application → [domain, contracts]`; `database → [application, contracts]`; `adapters → [application, contracts]`; `i18n → []`; `test-support → [application, contracts, domain]`; `web-components → [contracts, i18n, web-components]` (**no** application, database, adapters, test-support, web-server); `web-server → [application, contracts, database, adapters, i18n, web-server]`; `web → [application, contracts, i18n, web, web-components, web-server]` plus `test-support` only from `**/*.test.ts(x)` (use `boundaries/element-types` with `importKind`/file-pattern overrides or a second element type `web-tests`); `worker → [application, contracts, database, adapters, worker]` **and** a `no-restricted-imports` block for `worker` forbidding `better-auth`, `**/identity/**/reveal*`, `**/data-requests/**/delete*`, `**/modules/identity/**` (AD-6). Externals: `web-components` may not import `node:*`, `fs`, `path`, `pg`, `drizzle-orm`, `better-auth`, `sharp`, `pdfjs-dist` (`boundaries/external` + `no-restricted-imports` with the `node:` pattern).
3. Wire into `eslint.config.mjs` at the marked block: `import boundaries from './eslint.boundaries.mjs'` and spread. Run `pnpm lint` — it must pass on the current tree. If it reports real violations, do not fix them here: list file, rule, and owning task in the hand-off "Follow-ups" and add a temporary `// eslint-disable-next-line boundaries/element-types -- T-xxx to fix` only if the owning task is already merged; otherwise fail this task and escalate.
4. `lint-fixtures/boundary-violation/`: `domain-bad.ts` importing from `packages/application/src/index.ts`, `component-bad.tsx` importing `node:fs`, `worker-bad.ts` importing `better-auth`. `scripts/check-boundaries-fixture.mjs`: runs `eslint --no-ignore lint-fixtures/boundary-violation --format json`, asserts **exactly three** errors with the expected rule ids, exits 1 otherwise. This proves the rules bite. Add the folder to `tsconfig.base.json`? No — keep it out of every `tsconfig` `include`; ESLint's `projectService` needs a tsconfig for type-aware rules, so give the fixture its own `lint-fixtures/tsconfig.json` and disable type-aware rules for that path in the config (`files: ['lint-fixtures/**']` block using non-type-checked configs).
5. Root scripts: `lint:boundaries: node scripts/check-boundaries-fixture.mjs`; `contrast: node tools/contrast.mjs --tokens apps/web/src/styles/tokens.css`; `check: pnpm typecheck && pnpm lint && pnpm lint:boundaries && pnpm test && pnpm i18n:check && pnpm contrast && pnpm build`. Keep `tools:contrast` reading the prototype (no flag = old behaviour).
6. `tools/contrast.mjs`: add `--tokens <path>` (parse with `process.argv`); everything else unchanged. Confirm the ported `tokens.css` yields the same pairs and the same pass result as the prototype file (it should be byte-identical after T-008). One paragraph in `tools/README.md`.
7. `.github/workflows/check.yml`: `on: [push, pull_request]` for `main` and `task/**`; `runs-on: ubuntu-latest`; services `postgres:18` with `POSTGRES_PASSWORD`, health check, and an init step that runs `infra/compose/postgres-init/*.sql` against it (`psql` from the runner) so roles/extensions exist; steps: `pnpm/action-setup` (version from `packageManager`), `actions/setup-node` (`24`, cache `pnpm`), `pnpm install --frozen-lockfile`, `pnpm db:migrate` with `DATABASE_URL`/`DATABASE_URL_TEST` env pointing at the service, `pnpm check`, `pnpm test:int`. Concurrency group per ref. No secrets needed; `APP_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET` are generated in-step (`openssl rand -base64 32`) and exported for the job only. Timeout 20 min. Do **not** add any bot-authored commit or comment step.
8. Run `pnpm check` and `pnpm lint:boundaries` locally; push the branch and confirm the workflow is green (or record the run URL and the failing step if the runner differs — e.g. `psql` missing → use `docker exec` on the service container instead).
9. Commit: `T-010: boundary lint rules, fixture proof, pnpm check, CI workflow`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Lint passes on the tree | `pnpm lint` | exit 0 |
| Fixture proves rules | `pnpm lint:boundaries` | exit 0 with "3 expected violations found" |
| Rule really blocks domain→application | temporarily add `import '@rogikotha/application'` to `packages/domain/src/index.ts`, `pnpm lint` | error `boundaries/element-types`; revert |
| Components cannot import node | temporarily import `node:fs` in a component, `pnpm lint` | error; revert |
| Worker cannot import Better Auth | temporarily import `better-auth` in `apps/worker/src/main.ts`, `pnpm lint` | error; revert |
| Full check | `pnpm check` | exit 0, all seven steps |
| Contrast on ported tokens | `pnpm contrast` | same pass output as `pnpm tools:contrast` |
| CI | workflow run on the pushed branch | green; run URL in hand-off |
| Time | `pnpm check` wall-clock | < 5 min locally (record it) |

## Tests to write

- `scripts/check-boundaries-fixture.mjs` is itself the test (three expected violations).
- Delete `apps/worker/src/container.test.ts`'s grep test only if the lint rule now covers it exactly; otherwise keep both and say why.

## Hard-rule checklist

- [x] Reporter identity / private linkage / original evidence cannot reach the worker (lint rule forbids the imports; grants already block the data). Evidence: `eslint.boundaries.mjs` `workerRestrictions` and the worker `dynamicBans`; fixture FX8 (`better-auth`), FX9 (value import of the application root), FX10 (`drizzle-orm`) refused, FX11 (type-only) allowed; `apps/worker/src/container.test.ts` grep test kept.
- [x] No agent/tool attribution in any file, commit, or workflow (no bot commit steps). Evidence: `pnpm check:identity` (step 5 of `pnpm check`, also in CI with the pushed range); `.github/workflows/check.yml` has no step that commits, comments or uploads, and `permissions: contents: read`.

## Hand-off (implementer fills in)

Full hand-off: [`docs/implementation/handoffs/T-010.md`](../handoffs/T-010.md) (owned-path additions, task-text corrections, coverage before and after). AI-DLC Unit U3; design in `docs/aidlc-migration/design-drafts/t-010-boundary-lint-and-ci/`.

### What changed

`eslint-plugin-boundaries` 7.3.0 rules in `eslint.boundaries.mjs` (the matrix of `01-conventions.md` §2 with FD-040 and FD-093); `pnpm lint:boundaries` fixture proof (10 violations, 5 controls); `pnpm check:identity`; `pnpm format:check` after one formatting-only commit; `pnpm test:coverage` with an 80% line floor per package, after tests raised six packages above it; `pnpm contrast --tokens`; `pnpm check` as nine steps; `.github/workflows/check.yml`; `PgOutbox.countPending` (ISS-205). ESLint 10 flat config is supported by the plugin, so the `dependency-cruiser` fallback was not needed.

### Not done and why

- The CI run on the pushed branch and its URL: the branch is pushed and watched by the coordinator after the review request (BR10.4).
- `eslint-plugin-boundaries` 7.4.x: refused by pnpm's release-age policy on 2026-10-28 (ISS-285).

### Questions for the human

- FD-093 (1)–(7) were decided by the agent on the standing instruction of 2026-10-27 and await confirmation, (6) `web-shared` and (7) the generated-file exclusion among them (`docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`).
- The team.md Code Style correction "`contracts` imports `zod` and `uuid`; `i18n` imports `next-intl`", proposed for the learnings step (ISS-276).

### Follow-ups

ISS-127 (local smoke message, T-505), ISS-278, ISS-279, ISS-285, ISS-287, ISS-289 to ISS-294, ISS-297, ISS-298, ISS-299.

### `pnpm check` output summary

Exit 0 in 189 s locally (nine steps; an earlier run took 304 s, ISS-298): typecheck 9/9, lint 0 errors (1 warning that predates T-010, ISS-299), "10 expected violations found", Prettier clean, no attribution markers, 92 test files with 999 passed and 2 expected fail, every package at or above 80% lines, i18n parity 781 keys, contrast all pass, both builds done. `pnpm smoke`: 12 files, 20 tests, 19 s.

### Hard-rule evidence

See the ticked checklist above.
