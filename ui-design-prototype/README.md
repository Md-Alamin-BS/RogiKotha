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

The rejected directions (01, 02, 03, 04, 04c, 04d, 05) and the three admin shell studies were archived per FD-028 and FD-029. They are not on `main`; they are kept on branch `archive/full-project-2026-11-09` under `ui-design-prototype/.archive/`.

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
| 04b | `#register` | Create an account: email, password, username, display name, language, age + terms. |
| 04b | `#sign-in` | Sign in; links to reset and register. |
| 04b | `#verify-email` | Pending email confirmation, with a dev-only "simulate the link" control. |
| 04b | `#reset-password` | Request a reset link, then set a new password. |
| 04b | `#me/security` | Email, password, sessions, sign-out-everywhere, link to your data. |
| admin | `#queue` | Critical / standard lanes, bounded action chips, audit timeline, the docked commit action. |
| admin | `#evidence` | Quarantine, retention, holds, custody notes. |
| admin | `#providers` | Claims, pending submissions, field-change review. |
| admin | `#notifications` | Notification triage: reports, protected-field changes, identity-reveal requests. |
| admin | `#config` | Versioned runtime configuration: reporting thresholds, retention defaults, the role and capability matrix. |
| admin | `#sign-in` | Staff sign-in; a non-staff email is refused here. |
| admin | `#approve-device` | New-device approval: pending mail notice, then a password recheck to trust the device. |
| admin | `#security` | Trusted devices (with revoke), sessions, password. |

## How to run locally

```powershell
cd ui-design-prototype
python -m http.server 4173
# open http://127.0.0.1:4173/
```

No bundler, no `node_modules`, nothing loaded from the network at runtime.

## Traceability

Inline annotations in the prototype have the form `<!-- STORY-XYZ: short title -->`. The story list, the coverage matrix and the tool that read these annotations are kept on branch `archive/full-project-2026-11-09`.

## Detector

UI quality is checked with [`impeccable`](https://www.npmjs.com/package/impeccable). Configured ignores live in [`.impeccable/config.json`](../.impeccable/config.json). Run:

```powershell
npx impeccable detect ui-design-prototype/ --no-advisory
```

Zero findings is the target.
