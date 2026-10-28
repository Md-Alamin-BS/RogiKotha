# Boundary lint and per-package coverage: what the tools actually do (2026-10-28)

Research for U3 T-010, kept so the next Unit that touches `eslint.boundaries.mjs` or the coverage
block in `vitest.workspace.ts` does not repeat it. Versions: `eslint-plugin-boundaries` 7.3.0,
`eslint-import-resolver-typescript` 4.4.5, ESLint 10.10.0, Vitest and `@vitest/coverage-v8`
4.1.11. Sources: the plugin's README and `packages/eslint-plugin/CHANGELOG.md`, the Vitest 4.1.11
coverage and `sequence` docs, and the installed sources under `node_modules/.pnpm` (read while
building; the coverage threshold logic is in `vitest/dist/chunks/coverage.*.js`). Version choices
and dates are in `docs/status/dependency-check-log.md` (2026-10-28).

## eslint-plugin-boundaries 7.x

- **Rules.** `boundaries/dependencies` is the current rule; `element-types` and `external` are
  deprecated aliases. One rule carries internal and external edges through `policies`, with
  `default: 'disallow'` and `checkAllOrigins: true` so external and Node built-in imports are
  judged too. `boundaries/no-unknown-files` refuses a source file no element matches (BR1.1), and
  `boundaries/no-unknown-dependencies` with `require: 'element'` refuses an import whose target is
  in no element.
- **Last match wins.** Policies are evaluated in order and the last one that matches an edge
  decides it (allow or disallow). Order therefore carries meaning: the matrix and the externals
  come first, the dynamic-import bans after them, the test-file allowance after the bans (so a test
  may import `node:fs` even inside a component folder), and the "unresolved internal import" ban
  last, so nothing can re-allow it.
- **Element patterns are folders.** With `partialMatch: false` an element pattern matches a folder
  and everything under it; a pattern naming one file does not classify that file. The composition
  root `apps/web/src/server/container.ts` is therefore a file category (`boundaries/files`,
  `category: 'container'`) inside the `web-server` element, and the adapters edge is a policy
  `from: { element: { type: 'web-server' }, file: { categories: 'container' } }`. Test files are
  a category the same way.
- **First matching element wins.** The element list is ordered narrow to wide (`seed` before
  `test-support`, `server/actions` before `server`, `lib` and `i18n` before `apps/web/src`).
- **Edges inside one element are not checked**, so two folders that must differ (for example
  `server/container.ts` and the rest of `server/`) need a category or separate elements.
- **An unresolved bare specifier is external.** If `@rogikotha/x` or `@/x` does not resolve to a
  file, the plugin treats it as an external package, which an "any external" element would then
  allow. `eslint.boundaries.mjs` adds an explicit disallow for unresolved `@rogikotha/*` and `@/**`
  (BR1.3).
- **Dynamic imports.** The plugin sees `import()` and `require()` (node kinds `dynamic-import`,
  `require`); `no-restricted-imports` does not. The worker and component bans are written as
  `no-restricted-imports` for static imports and repeated as plugin policies limited to those two
  node kinds, so every edge is reported exactly once.
- **`no-restricted-imports` in flat config:** a later config block that matches the same file
  replaces the rule's options, it does not merge them. One block per file set (worker, component
  source) keeps every ban active (BR3.7). The TypeScript variant has `allowTypeImports`, used for
  the worker's type-only imports of the `@rogikotha/application` root.

## Resolver

- The plugin's default resolver does not read `tsconfig` `paths` and does not map a `.js`
  specifier to its `.ts` source. `eslint-import-resolver-typescript` does both; it is configured
  through `settings['import/resolver'].typescript` with every package's and app's `tsconfig.json`
  plus `lint-fixtures/tsconfig.json` (the fixture's `@/` paths).
- `@rogikotha/*` resolves through the pnpm workspace symlinks to `packages/*/src/index.ts`
  (their `exports` point at source), and the plugin classifies the real path, so a workspace
  import lands in the right element. The fixture cases FX1, FX3, FX5 and FX6 would fail if it did
  not.
- `unrs-resolver` (the resolver's native core) ships its binding as a platform
  optionalDependency; its postinstall only re-checks or downloads it, so it is denied in
  `pnpm-workspace.yaml` `allowBuilds`.

## Vitest 4.1 coverage

- **`coverage.include` is what makes untested files count.** Without it, only files some test
  loaded appear in the report; with the nine source roots listed, every matching file appears,
  untested ones at 0% (BR6.2). One coverage block in the root config covers every project.
- **Glob thresholds.** Any key of `coverage.thresholds` that is not a metric name is a glob.
  Each glob is matched (picomatch) against file paths relative to the root, the matching files'
  coverage is merged, and the metric is checked on that aggregate (`perFile` is off by default),
  which is exactly "80% per package" with `'<root>/**': { lines: 80 }`. Globs do not inherit the
  global numbers.
- **A glob with zero lines passes.** A merged summary with 0 of 0 lines reports 100%, so
  `domain`, `application` and `adapters` pass until they have code, without an exemption list
  (BR6.3). Proven in the T-010 run.
- **A miss exits non-zero** (`process.exitCode = 1`) with
  `ERROR: Coverage for lines (56.25%) does not meet "packages/i18n/src/**" threshold (80%)`;
  proven in T-010 by adding an untested scratch file to `packages/i18n/src` (not committed).
- **`reportOnFailure: true`** writes and prints the figures even when a test failed (default
  `false`).
- **`autoUpdate`** rewrites the config's numbers; it stays off, so the floor never moves by itself
  (BR6.5).

## Vitest 4.1 project order

- `sequence.groupOrder` on a project puts it in a group; groups run one after another in
  ascending order, projects in one group run in parallel. T-010 gives `database` group 1 and the
  seed integration test (its own inline project `test-support-seed`) group 2, so the two never
  reset `rogikotha_test` at the same time and `seed/**` is measured in the same coverage run.

## Prettier 3.9

- Prettier reads both `.gitignore` and `.prettierignore`; ignore entries use gitignore syntax,
  negations included (used for the generated corpus files).
- `endOfLine: 'auto'` keeps a file's existing line ending, so a CRLF checkout under
  `core.autocrlf=true` passes `--check` while `.gitattributes` keeps the repository LF.
- Prettier is not always idempotent on long member chains: two seed files needed a second
  `--write` pass before `--check` was clean (both folded into the one formatting-only commit).
