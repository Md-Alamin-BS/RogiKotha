# RogiKotha — UI/UX prototype

<!-- STORY-PROT-002: README enumerates the live artefacts, the archive, and the routes -->

A static HTML/CSS/JS prototype with no build step, no dependencies, and no network requests. It carries the design review surfaces for the patient UI (concept **04b**, the chosen direction) and the separate staff / moderation console. Records are fictional.

## What is live

Two cards on the gallery (`index.html`), and nothing else:

| Artefact | Path | Notes |
| --- | --- | --- |
| **04b** — Quiet Clinic (minimal) | `concepts/concept-04b-quiet-clinic-minimal/` | The chosen patient direction. Same clinic as 04, asked to be quieter: paper base, teal-gray accent, hairline rules. Supersedes 04 per FD-027 (2026-09-06). |
| **Staff console** | `admin/` | Its own surface system, *Chart Tray* — four planes where elevation encodes agency. FD-030 (2026-09-08). |

## The archive

Everything else is under `.archive/`. It is still runnable, and it is the record of how the two live artefacts were arrived at, not live work. FD-029 (2026-09-08) took 03 and 04 off the gallery.

| Concept | Notes |
| --- | --- |
| **03** — Luminous Editorial | Warm earth tones, terracotta anchor. It carried an in-folder moderation console of its own; the console that shipped is the standalone one at `admin/`. |
| **04** — Quiet Clinic | Oat + muted teal, serif headings, generous air. FD-026. |
| **01** Bioluminescent Depth, **02** Editorial Futurism, **05** Operator Console | Three of the five directions built per FD-025, alongside 03 and 04. |
| **04c** Editorial, **04d** Modern SaaS | Side-by-side variants explored during the 04b selection. FD-028. |
| `admin-shell-studies/` | A *Chart Tray*, B *Ink Ledger*, C *Signal Ward* — the three shells built against identical markup. A was chosen and ported to `admin/`. |

## Admin console

The staff / moderation console lives at [`admin/index.html`](admin/index.html). It is deliberately separate from the patient UI: its own stylesheet and tokens, five routes, no patient-side chrome, and a `noindex` meta so it never appears in public search.

## Hash routes

Reviewers can deep-link directly to any view in either prototype.

Slugs stay in Latin script in both languages — a percent-encoded Bengali slug is unusable once pasted into WhatsApp or Messenger.

| App | Route | Purpose |
| --- | --- | --- |
| 04b | `#discover` | Search, browse-by-condition, emergency guidance. |
| 04b | `#search` | Doctors / Facilities tabs, filters, neutral sort, compare tray. |
| 04b | `#doctors`, `#doctors/d1` | The doctor index, and one doctor: per-field provenance, distributions, condition breakdown. |
| 04b | `#facilities`, `#facilities/f1` | The facility index, and one hospital: nine service criteria with their own distributions. |
| 04b | `#topics`, `#topics/c1` | The condition index, and one condition: spread, medicines, treatments, doctors written about. |
| 04b | `#experiences`, `#experiences/r1` | The account index, and one account: the thirteen-section view. |
| 04b | `#write` | Add-a-doctor panel, live safety checks, evidence pipeline. |
| 04b | `#me` | Published and draft accounts, preferences, feedback, data requests. |
| 04b | `#saved` | Private bookmarks. |
| 04b | `#notifications` | Replies, moderation outcomes, the appeal path. |
| 04b | `#authors/shirin_88` | A contributor profile. |
| 04b | `#emergency` | Non-blocking emergency guidance (999, 16263, crisis line). |
| 04b | `#about` | Five-section product / policy statement. |
| admin | `#queue` | Critical / standard lanes, bounded action chips, audit timeline, the docked commit action. |
| admin | `#evidence` | Quarantine, retention, holds, custody notes. |
| admin | `#providers` | Claims, pending submissions, field-change review. |
| admin | `#notifications` | Notification triage: reports, protected-field changes, identity-reveal requests. |
| admin | `#config` | Versioned runtime configuration: reporting thresholds, retention defaults, the role and capability matrix. |

## How to run locally

```powershell
cd ui-design-prototype
python -m http.server 4173
# open http://127.0.0.1:4173/
```

Or `npm start` from the repo root, which serves the tree on `http://localhost:8137/ui-design-prototype/`.

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
