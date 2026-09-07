# RogiKotha — UI/UX prototype

<!-- STORY-PROT-002: README enumerates 03, 04, 04b, admin, routes -->

A static HTML/CSS/JS prototype with no build step, no dependencies, and no network requests. It carries the design review surfaces for the patient UI (concept **04b**, the chosen direction) and the separate admin / moderation console. Records are fictional.

## Concepts

Three concept cards live on the gallery (`index.html`). All render the same fictional records and obey the same product rules; only the design differs.

| Concept | Status | Notes |
| --- | --- | --- |
| **03** — Luminous Editorial | Archived sibling | Warm earth tones; the only direction carrying an in-folder moderation console. |
| **04** — Quiet Clinic | Archived sibling | Oat + muted teal, serif headings, generous air. FD-026. |
| **04b** — Quiet Clinic (minimal) | **Chosen implementation direction** | Same clinic, asked to be quieter. Paper base, teal-gray accent, hairline rules. Supersedes 04 per FD-027 (2026-09-06). |

Two side-by-side variants (**04c Editorial**, **04d Modern SaaS**) were explored and archived.

## Admin console

The staff / moderation console lives at [`admin/index.html`](admin/index.html). It is deliberately separate from the patient UI: three routes (`#queue`, `#evidence`, `#providers`), no patient-side chrome, and a `noindex` meta so it never appears in public search.

## Hash routes

Reviewers can deep-link directly to any view in either prototype.

| App | Route | Purpose |
| --- | --- | --- |
| 04b | `#discover` | Search, browse-by-condition, emergency guidance. |
| 04b | `#results` | Doctors / Facilities tabs, filters, neutral sort, compare tray. |
| 04b | `#profile` | Per-field provenance, distributions, condition breakdown. |
| 04b | `#account` | The thirteen-section account view. |
| 04b | `#condition` | Spread, medicines, treatments, doctors for one condition. |
| 04b | `#facility` | Nine service criteria with their own distributions. |
| 04b | `#compose` | Add-a-doctor panel, live safety checks, evidence pipeline. |
| 04b | `#mine` | Published and draft accounts, bookmarks, notifications. |
| 04b | `#emergency` | Non-blocking emergency guidance (999, 16263, crisis line). |
| 04b | `#about` | Five-section product / policy statement. |
| admin | `#queue` | Critical / standard lanes, bounded action chips, audit box. |
| admin | `#evidence` | Quarantine, retention, holds, custody notes. |
| admin | `#providers` | Claims, pending submissions, field-change review. |

## How to run locally

```powershell
cd ui-design-prototype
python -m http.server 4173
# open http://127.0.0.1:4173/
```

No bundler, no `node_modules`, nothing loaded from the network at runtime.

## Traceability

Each story in `docs/planning/08-product-backlog.md` has a live status (Done / Partial / Missing / Blocked / Won't Do) and a proof pointer in [`docs/planning/09-coverage-matrix.md`](../docs/planning/09-coverage-matrix.md). Regenerate the rollup with:

```powershell
node tools/coverage.mjs
```

Inline annotations in the prototype have the form `<!-- STORY-XYZ: short title -->` and are the proof points the regenerator greps.

## Detector

UI quality is checked with [`impeccable`](https://www.npmjs.com/package/impeccable). Configured ignores live in [`.impeccable/config.json`](../.impeccable/config.json). Run:

```powershell
npx impeccable detect ui-design-prototype/ --no-advisory
```

Zero findings is the target.
