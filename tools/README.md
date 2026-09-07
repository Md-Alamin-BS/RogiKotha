# tools/

Zero-dependency Node.js helpers that support the prototype build. All scripts
run from the repo root with `node tools/<name>.mjs` and have no npm install
step — they read source files directly so they can be used inside CI without
provisioning a workspace.

| Script | Purpose |
|---|---|
| `coverage.mjs` | Walks `backlog.yaml` + `08-product-backlog.md`, greps `ui-design-prototype/` for `STORY-*` / `NFR-*` / `FR-*` annotations, prints the live coverage rollup. Source of truth for the curated rollup is `docs/planning/09-coverage-matrix.md`. |
| `i18n-audit.mjs` | Audits the shared i18n table (`ui-design-prototype/shared/rogikotha-data.js`) against every `T('foo')` / `data-i18n="foo"` reference in the prototype, plus local `VT('foo')` references against any `*_STRINGS` table declared inside `app.js`. Prints any i18n key that is referenced but never defined (the bug class the patient UI hit when `user2.*` keys were missing). |

Both scripts are read-only on the repo and write nothing to disk.

## When to run

- After editing the prototype: `node tools/i18n-audit.mjs` — should print
  `Missing (referenced, undefined): none` for both the shared table and any
  local viewer table.
- After editing `backlog.yaml` or the coverage matrix: `node tools/coverage.mjs`
  to confirm the curated rollup still matches the prototype annotations.
