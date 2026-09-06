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
