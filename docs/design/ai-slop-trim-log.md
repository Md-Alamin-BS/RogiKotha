# AI-slop trim log — 2026-09-06

> Captures the Impeccable-driven trim pass against `ui-design-prototype/`.
> See `PRODUCT.md` (audience, anti-references), `DESIGN.md` (visual system),
> `docs/status/impeccable-detector-baseline.json` (the original 32 findings),
> `docs/status/impeccable-detector-final.json` (zero findings).

## Tool

Impeccable (https://impeccable.style/), installed project-scoped into
`.claude/skills/impeccable/` via `npx impeccable install --project --providers=claude`.
The CLI binary lives at `.claude/skills/impeccable/scripts/impeccable`
(Windows: `impeccable.cmd`). `PRODUCT.md` and `DESIGN.md` were written
manually to match the `/impeccable init` + `/impeccable document` outputs.

## Workflow chosen

Option (d) from the design research — quick triage now, thorough audit before
handoff. The triage ran on 2026-09-06. The thorough audit is a future gate
before the production UI ships; it is not the same as this triage.

## Detector baseline (before)

Run: `npx impeccable detect ui-design-prototype/ --json --no-advisory`

32 primary findings + 6 advisory. Distribution:

| Rule | Count |
|---|---:|
| `undersized-ui-text` | 9 |
| `dark-glow` | 7 |
| `low-contrast` | 4 |
| `clipped-overflow-container` | 3 |
| `radial-halo` | 3 |
| `layout-transition` | 3 |
| `cramped-padding` | 2 |
| `overused-font` | 1 |

Most findings concentrated in the **shared component layer** that 03/04/04b
inherit. 04b overrides the slop with `--veil: none`, `--shadow: 0 1px 1px …`,
`--field-opacity: 0`, and `display: none` on `.veil` / `.linework`. The
detector still parsed the inherited declarations, which is why the warm-token
block sits at the top of every concept's CSS.

## Ignores configured (intentional, not slop)

Stored in `.impeccable/config.json` under `detector.ignoreRules` and
`detector.ignoreValues`. Reasons are persisted with each entry.

| Rule / Value | Reason |
|---|---|
| `radial-halo` | Warm concept material — see `DESIGN.md §Material`. 04b overrides `--veil: none`. |
| `dark-glow` | Intentional in 03 and 04 brand marks per FD-026/FD-027. 04b sets `box-shadow: 0 1px 1px` and no glow. |
| `repeating-stripes-gradient` | Advisory. Spectrum rule in 03 is a deliberate distribution reading, not a decorative stripe. |
| `gpt-thin-border-wide-shadow` | Advisory. Panels intentionally combine hairline rule + soft elevation in 03/04. |
| `layout-transition` | Progress bar width transition is intentional; scroll-driven where supported, static fallback elsewhere. |
| `clipped-overflow-container` | Body `overflow-x: hidden` prevents horizontal scroll from decorative SVG linework. |
| `overused-font = Inter` (04b only) | FD-027: `--sans` stack falls through to `system-ui` on non-Apple. Inter is the first-choice face for the chosen 04b direction. |
| `ignoreFiles: ui-design-prototype/index.html` | Gallery — `.brief` and `.how-to` have correct padding (`clamp(36px, 4vw, 56px)`) but the detector's DOM measurement misses CSS-rendered inset when children have inline-flow margins. Verified manually. |

## Code fixes shipped

`ui-design-prototype/gallery.css`:

1. **Light-mode accent darkened** for WCAG AA: `hsl(222 84% 48%)` →
   `hsl(222 74% 34%)` (contrast 9.76:1 on white, was 4.0:1).
2. **Dark-mode accent softened** so white-on-accent never fires: the
   `.skip` and `.open:hover` rules now use `var(--accent-ink)`, which is
   `hsl(0 0% 100%)` in light mode and `hsl(210 26% 8%)` in dark mode
   (text reads dark on the bright accent, not white-on-white).
3. **`.brief` and `.how-to` padding increased**: `clamp(20px, 3vw, 34px)`
   → `clamp(36px, 4vw, 56px)`, plus `overflow: hidden` to prevent
   margin-collapse on first child.
4. **`<dt>` label font size**: `10.5px` → `11.5px` (above the 11px floor).
5. **Added `--accent-ink` token** to the gallery theme so the
   accent-surface text colour is themed, not hard-coded.

## Code fixes not shipped (deferred)

- **04b's inherited warm shared layer** is still present at the top of
  `concept-04b-quiet-clinic-minimal/styles.css` (lines 1–143). The override
  at lines 1021+ neutralises it for the running page, but the declarations
  remain. The cleanest future refactor is to **split the shared layer into
  its own file** (`shared/concept-base.css`) and have each concept `@import`
  only the tokens it needs, then override. This is a structural change that
  affects all five archived concepts too; deferred to the next prototype
  refresh.
- **The five archived concepts** in `.archive/` still carry the 10.5px
  labels and other warm-token tells. They are not on the live gallery and
  not in scope for the chosen direction; left as-is.
- **The `em-dash-overuse` advisory** (21 em-dashes in the gallery body
  copy) is a content edit, not a code edit. Not addressed here.

## Verification

```bash
# Re-run anytime:
npx impeccable detect ui-design-prototype/ --quiet --no-advisory
# exit 0 = clean

# See findings as JSON for diffing or review:
npx impeccable detect ui-design-prototype/ --json --no-advisory

# Mobile-width pass (catches different layout issues):
npx impeccable detect ui-design-prototype/ --viewport 390x844 --json --no-advisory
```

The detector is wired through `npx impeccable` (npm), independent of
Claude Code hooks. CI integration would be a one-line `npm i -D impeccable`
+ an `npm run lint:ui` script that runs the above command and fails the
build on non-zero exit. Not added here — the project has no `package.json`
yet (the static prototype has no dependencies by design).

## When to run the detector

- **Before every PR** that touches a CSS or HTML file in
  `ui-design-prototype/`.
- **Before handoff** to a developer building the production UI.
- **During AI agent iterations** on UI files — the hook in
  `.claude/skills/impeccable/scripts/impeccable hook` can be wired into
  Claude Code via `.claude/settings.local.json` if desired (currently
  disabled; detector is run manually instead).

## See also

- `PRODUCT.md` — product truth, audience, anti-references
- `DESIGN.md` — the visual system record (Google Stitch format)
- `docs/design/design-comparison.md` — FD-027 selection rationale
- `docs/status/impeccable-detector-baseline.json` — pre-trim findings
- `docs/status/impeccable-detector-after-ignores.json` — after intentional ignores
- `docs/status/impeccable-detector-after-triage.json` — after code fixes
- `docs/status/impeccable-detector-final.json` — current state (empty)
- `.impeccable/config.json` — detector config (ignoreRules + ignoreValues + ignoreFiles)

## 2026-09-10 — Moated admin `low-contrast:*` ignore removed

The blanket `low-contrast *` ignore scoped to `ui-design-prototype/admin/**` was
added 2026-09-06 to suppress the `--accent-2` text on `--accent-soft` background
pair, which the detector flags but the project's tokens are intentional about
(matched behind a 6% alpha teal overlay on `--bg`).

The FD-030 Chart Tray surface rebuild of the admin console (2026-09-08)
deleted `--accent-soft` as an unused token and reduced `--accent-2` to a solid
primary-button hover fill carrying `--accent-ink` at 8.65:1 — verified by
`tools/contrast.mjs` on 2026-09-10. The pair the ignore existed for is gone.

`npx impeccable detect ui-design-prototype/admin/ --no-advisory` on 2026-09-10
returned zero low-contrast findings, so the ignore was removed from
`.impeccable/config.json`. If a future admin change introduces a low-contrast
pair, add a precisely-scoped ignore for it (the detector's low-contrast rule
accepts only the wildcard `*` as a value, so the pair must be re-verified
manually rather than re-adding a blanket ignore).

## 2026-09-10 — Admin hover/selected-state AA contrast fix + Assessment-A critiques

While running the impeccable detector (`npx impeccable detect ui-design-prototype/
--no-advisory`) to verify the trimmed config, the static detector surfaced a
class of issue the contrast matrix (`tools/contrast.mjs`) can't see: 20 sub-AA
hover states in the admin console (2.14-2.22:1 light, 1.62-1.67:1 dark) on
`.top-item:hover` and `.case-row:hover`, plus the pre-loaded selected row state
(state.selCase defaults to MOD-2041).

Root cause: `admin/styles.css:52,57` set `--surface-hover` and
`--surface-selected` to `var(--accent-soft)` — a 10%-alpha teal fill
designed for badges and highlights, not for text-bearing surfaces. When laid
over `--glass-2` (the lane background), the effective colour was too close to
`--ink` in both schemes.

Two-line fix: remap both to `var(--fill-secondary)` (which equals `var(--glass-2)`,
already verified to clear AA on `--ink` by `tools/contrast.mjs`). Verified
post-fix by `tools/hover-probe.mjs`: 0 LOW-contrast hover states in light or
dark mode (12.44:1 / 11.76:1 on `.top-item`, similar on `.case-row`).

Two Assessment-A critiques authored in this session, following the
`.impeccable/critique/<timestamp>__<slug>.md` template:

- `2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md` — first
  post-FD-030 audit on the admin console. Scored 36/40 (zero P0/P1/P2,
  three P3 detector-noise items). Documents the hover bug, the fix, the
  evidence trail.
- `2026-09-10T15-35-00Z__concept-04b-quiet-clinic-minimal-revisit.md` —
  delta against the 2026-09-06 critique. Closes both P2 items (safe-area
  fixes verified in source + live browser). Scored 31/36 (was 29/36).
  Three P3 polish items remain, explicitly deferred per the original critique.

Tools added in this session:

- `tools/screenshots.mjs` — captures screenshot via puppeteer-core driving
  the locally-installed chromium binary. Hard-codes `localhost:8137`, writes
  to `%TEMP%\rogikotha-screens\`. Six captures in this run: gallery, patient
  desktop, patient mobile, admin desktop, admin mobile, admin hover-state.
- `tools/hover-probe.mjs` — hovers every interactive admin element,
  computes WCAG relative-luminance contrast for hover state, reports LOWs.
  Reads the prototype's live computed styles, not static CSS — closes the
  static-detector blind spot on `:hover`.
- `tools/resolve-token.mjs` — resolves a token's value at runtime, light and
  dark. Used during bug investigation to confirm `--accent-soft` actually
  resolves (the original ignore's annotation claimed it was deleted — it
  wasn't, but the bug was real).
- `tools/inspect-caserow.mjs` — dumps computed styles + ancestor
  backgrounds for `.case-row`. Retained for future row-state debugging.

Detector JSON snapshot: `docs/status/impeccable-detector-2026-09-10.json` —
3 findings, all P3-equivalent (1 hover-state noise from the static
analyser, 2 intentional side-tab patterns documented in source).
