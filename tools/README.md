# tools/

Zero-dependency Node.js helpers that support the prototype build. All scripts
run from the repo root with `node tools/<name>.mjs` and, apart from
`smoke.mjs` (jsdom) and `hover-probe.mjs` (puppeteer-core), need no install
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

## `proof-check.mjs`

Verifies the `file:line anchor` proof citations in
`docs/planning/09-coverage-matrix.md`. The anchor is authoritative; the line
number is derived and maintained by the tool.

```
node tools/proof-check.mjs          # verify (exit 1 on a broken citation)
node tools/proof-check.mjs --fix    # re-resolve drifted line numbers
```

`coverage.mjs` only checks that a cited *file* exists, so line drift used to
pass silently. Run this after any edit that shifts lines in the prototype.

## `smoke.mjs`

Drives Concept 04b in a real DOM (jsdom) and clicks through the journeys the
coverage matrix claims are Done — replies, comment edit/delete/tombstone,
reactions, bookmarks, draft delete/restore, the public profile, and the
language switch.

```
pnpm install         # once — jsdom comes from the root workspace
pnpm tools:smoke
```

It exists because "the file parses" and "the button works" are different
claims, and the matrix makes the second one. Every control it exercises was at
some point rendered but dead. Exits non-zero on failure; skips cleanly (exit 0)
if jsdom is absent, so a fresh clone is never blocked.

**jsdom is not a browser.** It does not lay out or paint, so this proves
behaviour and DOM state — not visual rendering, real screen-reader output, or
zoom/reflow. Those still need a human with a browser.

## `contrast.mjs`

Computes WCAG contrast from the 04b tokens as they ship, with no browser and no
dependencies. Exits non-zero if a **text** pair falls below 4.5:1.

```
pnpm tools:contrast
```

The hairline rules are reported but never fail the run — they are decorative
dividers and hover cues, not the sole means of identifying a control, so WCAG
1.4.11 does not apply. This tool caught `--ink-faint` shipping at 4.05:1 while
the docs claimed AA.

`--tokens <path>` reads another stylesheet with the same blocks, for example the
app's ported tokens (`node tools/contrast.mjs --tokens apps/web/src/styles/tokens.css`).
In that mode the run fails closed: an unreadable file, a missing light or dark
block, or any pair skipped because a token is missing exits non-zero and names
the missing tokens, so a wrong path cannot pass. Without the flag the tool reads
the prototype stylesheet and behaves as before (T-010).

## Running everything

```
pnpm tools:check
```

Runs tokens:check, coverage, i18n, proof-check, contrast, bangla, the
impeccable detector, the hover probe and smoke in order.

## `serve.mjs`

Tiny dependency-free static server for the prototype.

```
pnpm tools:serve  # http://localhost:8137  (PORT env var to change)
```

Prints the gallery, patient and admin URLs. The prototype opens fine from
`file://` too, but a server keeps hash routes and `localStorage` origins
behaving as they will in production. GET/HEAD only, read-only, no cache.

## `sync-tokens.mjs`

Generates `ui-design-prototype/shared/tokens.css` from the Concept 04b token
blocks in the patient stylesheet — light, dark, semantic role hooks and the
light-mode schemes. The staff console loads that file before its own
stylesheet, so both apps share one palette, type stack, rules and surface
tiers. The patient stylesheet is the only thing you edit.

```
pnpm tools:tokens         # regenerate after editing the patient tokens
pnpm tools:tokens:check   # part of pnpm tools:check — fails if tokens.css is stale
```

## `bangla-metrics.mjs`

Static guard against Bengali clipping. Bengali vowel signs and the matra sit
above the ascender line, so Latin-tight leading crops them and a fixed-height
box crops them. This checks that every heading leading is raised under
`[data-lang="bn"]`, and that no rule pairs a fixed `height` with a `font-size`.

```
pnpm tools:bangla     # part of pnpm tools:check
```

It caught the staff console scoping `--lh-ui` and `--lh-prose` to Bengali but
not `--lh-tight` — which every `h1`-`h4` uses — clipping the queue lane heads
(জরুরি / সাধারণ / আপিল), plus four boxes sized for Latin only.

A rule whose box holds a glyph or numeral rather than words opts out with
`/* bangla-ok: <why> */` in its body.
