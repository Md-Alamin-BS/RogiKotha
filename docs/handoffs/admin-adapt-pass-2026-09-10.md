---
target: ui-design-prototype/admin/
scope: All 5 admin views (queue, evidence, providers, notifications, configuration) at desktop 1440x900 and mobile 390x844.
date: 2026-09-10
reviewer: project owner (Claude Code session with `/impeccable` loaded)
expected_output: .impeccable/critique/<timestamp>__admin-console-fd030-adapt.md with `kind: adapt` frontmatter, slug `admin-console-fd030-adapt`.
---

# Handoff — `/impeccable adapt ui-design-prototype/admin/`

## Context

The admin console was rebuilt on the Chart Tray surface system in FD-030 (`ui-design-prototype/admin/`). The post-rebuild `audit` critique on 2026-09-10 closed out a real WCAG AA hover/selected-state bug (fixed at `ui-design-prototype/admin/styles.css:52,57`; root cause `--accent-soft` misuse, see `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:39-65`). That critique's recommendation #5 (`.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:100`) is to run `adapt` next — the first responsive-truth pass since FD-030. `audit` checks WCAG/hearability; `adapt` checks that the design actually adapts to viewport and input modality.

## What `/impeccable adapt` does

A responsive-truth pass modelled on `.impeccable/critique/2026-09-06T10-37-44Z__rototype-concepts-concept-04b-quiet-clinic-minimal.md:1-134` (the 04b patient app). It produces a critique file with `kind: adapt` frontmatter (`.impeccable/critique/2026-09-06T10-37-44Z__rototype-concepts-concept-04b-quiet-clinic-minimal.md:1-14`) and a body covering: source/target context, per-class touch-target verification, safe-area insets, hover-only feedback triage, breakpoint coverage, touch-keyboard handling, performance, image policy, tab-scroll affordance, and a findings table. Static source review is the baseline; live-browser confirmation (`tools/screenshots.mjs`, `tools/hover-probe.mjs` — both defined at `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:87-92`) is used where source review is ambiguous (e.g. resolved `:hover` values).

## Pre-flight checks

1. `npm start` running, admin reachable at `http://localhost:8137/ui-design-prototype/admin/` (same port the hover probe uses, `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:53`).
2. Chromium binary installed locally (puppeteer-core does not download one).
3. `.impeccable/config.json:1-35` — respect the `inter` font ignore for `ui-design-prototype/admin/**` (`.impeccable/config.json:26-32`) and the six detector `ignoreRules` (`.impeccable/config.json:4-10`). They apply to detector runs inside `adapt`, not to the LLM assessment.
4. Have open: this file, the 04b adapt critique (template), the hover-fix audit (actionable history of the just-fixed bug).

## Scope

- All 5 admin views: `#view-queue`, `#view-evidence`, `#view-providers`, `#view-notifications`, `#view-config` (declared at `ui-design-prototype/admin/index.html:62-68`, switched at `ui-design-prototype/admin/app.js:234`).
- Viewports: 1440×900 desktop, 390×844 mobile (matching the audit's viewports, `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:21`).
- Note: viewport meta already has `viewport-fit=cover, interactive-widget=resizes-content` (`ui-design-prototype/admin/index.html:5`) — confirm this and the 1080/900/760 breakpoints (`ui-design-prototype/admin/styles.css:643,647,649`) hold, don't reopen them.

## What to look for

- Touch-target floor for every interactive element in the 5 views (`.case-row`, `.top-item`, `.btn`, `.tab`, `.side-tab`, `.ctl`) — pattern from `.impeccable/critique/2026-09-06T10-37-44Z__rototype-concepts-concept-04b-quiet-clinic-minimal.md:37-53`.
- The `.case-row` `side-tab` pattern at `ui-design-prototype/admin/styles.css:343` (transparent-keyword static detector noise, already triaged as false-positive at `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:43`) — `adapt` should resolve the responsive behaviour of the selected-state keyline on mobile.
- Safe-area handling: top inset at `ui-design-prototype/admin/styles.css:141`, bottom at 651 and 661. Verify the masthead and the bottom bar in both light/dark.
- Hover-only feedback on `.case-row` / `.top-item` — must not be the only state signal (lessons from the just-fixed bug).
- Queue lane column behaviour at 390px (3 lanes × narrow viewport — a likely breakpoint gap).
- Audit timeline and evidence viewer at 390px.

## Output expectations

A new file at `.impeccable/critique/<timestamp>__admin-console-fd030-adapt.md` with `kind: adapt` (mirroring `.impeccable/critique/2026-09-06T10-37-44Z__rototype-concepts-concept-04b-quiet-clinic-minimal.md:10`), slug `admin-console-fd030-adapt`, the same section structure as the 04b critique, and a findings table with P0/P1/P2/P3 severities. The LLM should not re-flag the hover-contrast bug — that is closed (`.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:63`).

## After-the-pass checklist

- Cite the new adapt file from any P2/P3 fix PRs in the same week.
- Re-run `/impeccable audit ui-design-prototype/admin/` to confirm no regressions.
- Consider growing the matrix with `NFR-AA-HOVER-001` (raised at `.impeccable/critique/2026-09-10T15-30-00Z__admin-console-fd030-hover-contrast-fix.md:83`) so future reviews track this class explicitly.
