# T-001 — Workspace scaffold

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 2–3 h agent; validation 1 h |
| Depends on | — |
| Parallel-safe with | T-002 (disjoint paths: `infra/compose/`) |

## Goal

Create the pnpm monorepo skeleton (`apps/*`, `packages/*`) with shared TypeScript, ESLint, Prettier and Vitest configuration, root scripts that every later task calls, and the pins from the master plan §3. Keep the existing prototype checks (`tools/*.mjs`, jsdom) working under a `tools:` prefix. No application code yet — empty packages with `package.json`, `tsconfig.json` and an `index.ts` that exports nothing.

## Read first

1. `AGENTS.md` — "Check dependency versions" (the 2026-09-10 entry in `docs/status/dependency-check-log.md` covers this task; do not re-check)
2. `docs/implementation/00-master-plan.md` §3 (stack pins), §4 (layout)
3. `docs/implementation/01-conventions.md` §1 (package layout), §2 (dependency direction), §10 (testing), §12 (git)
4. Root `package.json` and `tools/README.md` — the existing prototype scripts that must keep working
5. `docs/planning/11-worktree-safe-execution-plan.md` — branch/worktree rules

## Owned paths

Create: `pnpm-workspace.yaml`, `.npmrc`, `.nvmrc`, `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `.prettierignore`, `vitest.workspace.ts`, `.editorconfig`, `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/worker/package.json`, `apps/worker/tsconfig.json`, `apps/worker/src/index.ts`, `packages/{contracts,domain,application,database,adapters,i18n,test-support}/package.json`, `packages/*/tsconfig.json`, `packages/*/src/index.ts`, `packages/*/vitest.config.ts`
Modify: `package.json` (root), `package-lock.json` (delete — pnpm replaces it), `.gitignore`

## Not in scope

- Any dependency beyond tooling (no Next.js, Drizzle, Better Auth — those land in T-003…T-008).
- `eslint-plugin-boundaries` rules and CI (T-010).
- Docker compose and `.env.example` (T-002).
- Deleting `node_modules` from the root — leave it; pnpm will rebuild.

## Steps

1. Branch: `git switch -c task/t-001-workspace-scaffold build/demo`. Confirm `node -v` is 24.x and `pnpm -v` is **11.x** (do not upgrade to pnpm 12 — it is a two-week-old Rust rewrite; master plan §3). Write `.nvmrc` containing `24` and `.npmrc` containing:
   ```
   engine-strict=true
   auto-install-peers=true
   strict-peer-dependencies=false
   ```
2. `pnpm-workspace.yaml`:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```
3. Rewrite root `package.json`. Keep `"name": "rogikotha"`, `"private": true`, `"type": "module"`, add `"packageManager": "pnpm@11.20.0"` (match the installed 11.x), `"engines": { "node": ">=24 <25", "pnpm": ">=11 <12" }`. Scripts (root, all workspace-aware):
   ```json
   "dev": "pnpm --filter @rogikotha/web dev",
   "dev:worker": "pnpm --filter @rogikotha/worker dev",
   "build": "pnpm -r build",
   "typecheck": "pnpm -r typecheck",
   "lint": "eslint .",
   "test": "vitest run",
   "test:int": "vitest run --project database",
   "i18n:check": "pnpm --filter @rogikotha/i18n check",
   "contrast": "node tools/contrast.mjs",
   "check": "pnpm typecheck && pnpm lint && pnpm test && pnpm i18n:check && pnpm build",
   "db:generate": "pnpm --filter @rogikotha/database generate",
   "db:migrate": "pnpm --filter @rogikotha/database migrate",
   "db:reset": "pnpm --filter @rogikotha/database reset",
   "db:seed": "pnpm --filter @rogikotha/test-support seed",
   "infra:up": "docker compose -f infra/compose/docker-compose.yml up -d",
   "infra:down": "docker compose -f infra/compose/docker-compose.yml down",
   "infra:logs": "docker compose -f infra/compose/docker-compose.yml logs -f",
   "infra:reset": "docker compose -f infra/compose/docker-compose.yml down -v",
   "demo": "pnpm infra:up && pnpm db:migrate && pnpm db:seed && pnpm -r --parallel dev",
   "demo:reset": "pnpm db:reset && pnpm db:seed",
   "fixtures:build": "pnpm --filter @rogikotha/test-support fixtures:build",
   "tools:check": "node tools/sync-tokens.mjs --check && node tools/coverage.mjs && node tools/i18n-audit.mjs && node tools/proof-check.mjs && node tools/contrast.mjs && node tools/bangla-metrics.mjs && node tools/smoke.mjs",
   "tools:coverage": "node tools/coverage.mjs",
   "tools:i18n": "node tools/i18n-audit.mjs",
   "tools:proofs": "node tools/proof-check.mjs",
   "tools:proofs:fix": "node tools/proof-check.mjs --fix",
   "tools:proofs:anchor": "node tools/proof-check.mjs --anchor",
   "tools:contrast": "node tools/contrast.mjs",
   "tools:smoke": "node tools/smoke.mjs",
   "tools:tokens": "node tools/sync-tokens.mjs",
   "tools:tokens:check": "node tools/sync-tokens.mjs --check",
   "tools:bangla": "node tools/bangla-metrics.mjs",
   "tools:serve": "node tools/serve.mjs"
   ```
   The `db:*`, `i18n:check`, `demo`, `contrast` targets will fail until their packages exist — that is expected; T-002/T-004/T-006/T-010 make them real. `contrast` at root still points to `tools/contrast.mjs` until T-010 re-targets it. Keep `jsdom` in root `devDependencies` (prototype smoke test).
4. Root devDependencies (`pnpm add -w -D …`):
   ```
   pnpm add -w -D typescript@~6.0.0 eslint@^10.10.0 @eslint/js@^10 typescript-eslint@latest prettier@^3.9.6 eslint-config-prettier@^10 vitest@^4.1.0 @vitest/coverage-v8@^4.1.0 globals@^16
   ```
   Gotchas: **TypeScript must stay on 6.x** — TS 7 has no stable programmatic API and breaks typescript-eslint (`ERESOLVE`). After install, run `pnpm ls typescript-eslint typescript` and confirm typescript-eslint's peer range accepts 6.x; if it does not, pin `typescript-eslint` to the newest version whose peer range includes `^6` and record the version in the hand-off. **Vitest must stay on 4.x** (5.0 shipped 2026-09-03 with 33 breaking changes).
5. `tsconfig.base.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2023", "lib": ["ES2023"], "module": "ESNext", "moduleResolution": "bundler",
       "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true,
       "verbatimModuleSyntax": true, "isolatedModules": true, "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true, "resolveJsonModule": true, "declaration": true,
       "sourceMap": true, "noEmit": true
     }
   }
   ```
   Each package `tsconfig.json` extends it with `"include": ["src"]`; `apps/web` will later add `"jsx": "preserve"` and Next's plugin (T-008 owns that edit). Windows gotcha: paths in configs use forward slashes; never rely on `%LOCALAPPDATA%`.
6. Package names and versions — every workspace package is `"name": "@rogikotha/<dir>"`, `"version": "0.0.0"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }` (source exports; Next transpiles via `transpilePackages` set in T-008), scripts `"typecheck": "tsc -p tsconfig.json"`, `"test": "vitest run"`. `apps/web` and `apps/worker` get placeholder `dev`/`build` scripts (`echo "T-008"` / `echo "T-009"`) so `pnpm -r build` succeeds now.
7. Workspace links (declare now so later tasks do not edit the direction): `application` depends on `domain`, `contracts`; `database` and `adapters` depend on `application`, `contracts`; `test-support` depends on `application`, `contracts`, `domain`; `web` and `worker` depend on `application`, `contracts`, `database`, `adapters`, `i18n` (web only), `test-support` (devDependency only). Use `"@rogikotha/contracts": "workspace:*"`.
8. `eslint.config.mjs` (flat config, ESLint 10 — eslintrc is gone):
   - `@eslint/js` recommended, `typescript-eslint` recommendedTypeChecked with `parserOptions.projectService: true`, `eslint-config-prettier` last.
   - `ignores`: `node_modules`, `**/dist`, `**/.next`, `ui-design-prototype/**`, `tools/**`, `_bmad/**`, `.data/**`, `docs/**`.
   - Rules: `@typescript-eslint/consistent-type-imports: error`, `no-console: ["error", { allow: ["warn","error"] }]` (Logger port instead), `@typescript-eslint/no-floating-promises: error`.
   - Leave a clearly marked block `// T-010 adds boundaries here`.
9. `prettier.config.mjs`: `{ singleQuote: true, semi: true, printWidth: 100, trailingComma: 'all' }`; `.prettierignore` mirrors the ESLint ignores plus `pnpm-lock.yaml`.
10. `vitest.workspace.ts` listing `packages/*/vitest.config.ts` and `apps/*/vitest.config.ts`; each package `vitest.config.ts` sets `test.name` to the package dir (so `--project database` works) and `environment: 'node'` (T-008 switches web to jsdom). Database integration tests will use the `*.int.test.ts` suffix and are excluded by default via `exclude: ['**/*.int.test.ts']` everywhere except the `database` project.
11. `.editorconfig` (utf-8, lf, 2 spaces, final newline). `.gitignore` add: `.data/`, `.env`, `.env.*.local`, `node_modules/`, `**/.next/`, `**/dist/`, `coverage/`, `*.tsbuildinfo`, `.vitest/`. Delete `package-lock.json` (pnpm owns the lockfile); commit `pnpm-lock.yaml`.
12. Each `packages/*/src/index.ts`: `export {};` with a one-line comment naming the task that fills it (e.g. `// Filled by T-003`).
13. Run: `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test` (no tests yet → passes with "no test files" — set `passWithNoTests: true` in the workspace config), `pnpm -r build`, `pnpm tools:check` (prototype checks must still pass).
14. Commit: `T-001: pnpm workspace scaffold with TS 6, ESLint 10, Vitest 4`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Workspace resolves | `pnpm install --frozen-lockfile` | exit 0; nine workspace projects listed |
| TS version | `pnpm exec tsc -v` | `Version 6.x` |
| Vitest version | `pnpm exec vitest -v` | `vitest/4.x` |
| Typecheck | `pnpm typecheck` | exit 0 for all packages |
| Lint | `pnpm lint` | exit 0, zero warnings |
| Tests | `pnpm test` | exit 0 (no test files, passWithNoTests) |
| Build placeholders | `pnpm -r build` | exit 0 |
| Prototype checks intact | `pnpm tools:check` | same result as `npm run check` gave before this task |
| Lockfile | `git ls-files package-lock.json pnpm-lock.yaml` | only `pnpm-lock.yaml` tracked |

## Tests to write

- None beyond tooling; `passWithNoTests` is set. (First real tests arrive in T-003.)

## Hard-rule checklist

- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
