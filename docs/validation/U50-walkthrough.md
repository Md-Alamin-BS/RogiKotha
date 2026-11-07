# U50 walk-through record (release 1)

Status: skeleton. Expected values and the journey tests are filled; every Observed, Evidence-run and
Verdict cell stays empty until the walk-through at Build and Test (BR10.2). Rows already marked
"release 2" were decided in the design (FD-105) and are not walked. The storyboard is
[05-demo-storyboard.md](../implementation/05-demo-storyboard.md); a finding becomes an `ISS-` row in
[ISSUES.md](../implementation/ISSUES.md) with Found in `U50`.

## Header (filled at the walk-through)

| Field | Value |
|---|---|
| Date | |
| `main` commit | |
| OS | |
| Docker | |
| Node | |
| pnpm | |
| Chromium (Playwright build) | |
| Bengali body font in use (BR10.7, see "Bengali body font") | |
| Clean-clone time to the banner (see "Clean clone") | |
| Journey runs (Step 42) | run 1: ; run 2: |

## Storyboard steps 1 to 28

Verdict is one of `pass`, `fail (ISS-nnn)` or `release 2 (FD-105, <Unit or task>)`. Parts 1 to 4 are
walked in `bn` first, then `en`. The planned theme and width below make sure both themes and both
widths (360 px and 1280 px) are covered: Part 2 at 360 px, Part 3 in the dark theme, the rest light at
1280 px. The Evidence column cites the journey test (`P<part>.<step> [<locale>]`, run by
`pnpm e2e`, Steps 34 and 42) and, for anything seen by hand, the manual action and the trace or
screenshot path.

| Step | Locale | Theme | Width | Expected (storyboard text, release-1 part) | Observed | Evidence | Verdict | ISS |
|---|---|---|---|---|---|---|---|---|
| 1 | bn | light | 1280 px | Home: emergency panel with 999, 16263 and the crisis line and its last-verified date; browse-by-topic chips; separation sentence; no search box in release 1. Release 2: the hero search box. |  | P1.1 [bn] |  | |
| 1 | en | light | 1280 px | Home: emergency panel with 999, 16263 and the crisis line and its last-verified date; browse-by-topic chips; separation sentence; no search box in release 1. Release 2: the hero search box. |  | P1.1 [en] |  | |
| 2 | bn | n/a | n/a | Search "dayabetis": resolved note, keep-original offer. | not walked |  | release 2 (FD-105, T-205, T-206) | |
| 2 | en | n/a | n/a | Search "dayabetis": resolved note, keep-original offer. | not walked |  | release 2 (FD-105, T-205, T-206) | |
| 3 | bn | light | 1280 px | Doctors index in the neutral sort set (relevance, most accounts, most recent), no "highest rated"; every entry shows Registration not verified. Release 2: the specialty filter. |  | P1.3 [bn] |  | |
| 3 | en | light | 1280 px | Doctors index in the neutral sort set (relevance, most accounts, most recent), no "highest rated"; every entry shows Registration not verified. Release 2: the specialty filter. |  | P1.3 [en] |  | |
| 4 | bn | light | 1280 px | Dr. Farhana Rahman: provenance chips, Registration not verified, sentiment capsules "n of m", outcome rows, condition breakdown, chambers; language toggle keeps every number after digit mapping. |  | P1.4 [bn] |  | |
| 4 | en | light | 1280 px | Dr. Farhana Rahman: provenance chips, Registration not verified, sentiment capsules "n of m", outcome rows, condition breakdown, chambers; language toggle keeps every number after digit mapping. |  | P1.4 [en] |  | |
| 5 | bn | light | 1280 px | Facility: nine criteria with their own "n of m" distributions; the copy that facility feedback never touches a doctor. |  | P1.5 [bn] |  | |
| 5 | en | light | 1280 px | Facility: nine criteria with their own "n of m" distributions; the copy that facility feedback never touches a doctor. |  | P1.5 [en] |  | |
| 6 | bn | light | 1280 px | Experience r1: sections, Reviewer's label, Documents attached, not medically validated, follow-ups as rendered by U47, original-evidence URL is not served. Release 2: the viewer (zoom, pan, rotate, download). |  | P1.6 [bn] |  | |
| 6 | en | light | 1280 px | Experience r1: sections, Reviewer's label, Documents attached, not medically validated, follow-ups as rendered by U47, original-evidence URL is not served. Release 2: the viewer (zoom, pan, rotate, download). |  | P1.6 [en] |  | |
| 7 | bn | light | 1280 px | /authors/shirin_88 lists r1 and public comments only; r2 (anonymous) nowhere; page is noindex. |  | P1.7 [bn] |  | |
| 7 | en | light | 1280 px | /authors/shirin_88 lists r1 and public comments only; r2 (anonymous) nowhere; page is noindex. |  | P1.7 [en] |  | |
| 8 | bn | light | 360 px | Write shows the gate; register (age and terms) to the pending screen; Mailpit link; confirm; /me welcome. |  | P2.8 [bn] |  | |
| 8 | en | light | 360 px | Write shows the gate; register (age and terms) to the pending screen; Mailpit link; confirm; /me welcome. |  | P2.8 [en] |  | |
| 9 | bn | light | 360 px | Register again with the same address: identical pending screen; Mailpit shows the "someone tried to register" mail. |  | P2.9 [bn] |  | |
| 9 | en | light | 360 px | Register again with the same address: identical pending screen; Mailpit shows the "someone tried to register" mail. |  | P2.9 [en] |  | |
| 10 | bn | light | 360 px | /me/security: sessions list, change password signs the other device out, sign out everywhere. |  | P2.10 [bn] |  | |
| 10 | en | light | 360 px | /me/security: sessions list, change password signs the other device out, sign out everywhere. |  | P2.10 [en] |  | |
| 11 | bn | dark | 1280 px | Detailed composer: doctor, relationship, period, four sections, tags incl. Not sure and a provisional term, claims, preview, identity anonymous, Publish. Release 2: only what U47 deferred. |  | P3.11 [bn] |  | |
| 11 | en | dark | 1280 px | Detailed composer: doctor, relationship, period, four sections, tags incl. Not sure and a provisional term, claims, preview, identity anonymous, Publish. Release 2: only what U47 deferred. |  | P3.11 [en] |  | |
| 12 | bn | dark | 1280 px | Attach prescription-1.jpg, prescription-2.jpg, photo.jpg to Ready; broken.jpg could not be read; flagged.jpg malware detected; report.pdf and the 16 MB file refused at once. Release 2: sanitising, redaction and processing bars. |  | P3.12 [bn] |  | |
| 12 | en | dark | 1280 px | Attach prescription-1.jpg, prescription-2.jpg, photo.jpg to Ready; broken.jpg could not be read; flagged.jpg malware detected; report.pdf and the 16 MB file refused at once. Release 2: sanitising, redaction and processing bars. |  | P3.12 [en] |  | |
| 13 | bn | dark | 1280 px | Preview equals the public page and Publish (covered inside P3.11). Release 2: the redaction rectangle and privacy confirmation. |  | P3.11 [bn] |  | |
| 13 | en | dark | 1280 px | Preview equals the public page and Publish (covered inside P3.11). Release 2: the redaction rectangle and privacy confirmation. |  | P3.11 [en] |  | |
| 14 | bn | dark | 1280 px | Signed-out view: alias byline, no link to the account, no original file name. |  | P3.14 [bn] |  | |
| 14 | en | dark | 1280 px | Signed-out view: alias byline, no link to the account, no original file name. |  | P3.14 [en] |  | |
| 15 | bn | light | 1280 px | Comment on r1, reply once (no reply control on a reply), delete a reply and a comment (placeholder where a thread remains). Release 2: edit, like and dislike, bookmark, block. |  | P4.15 [bn] |  | |
| 15 | en | light | 1280 px | Comment on r1, reply once (no reply control on a reply), delete a reply and a comment (placeholder where a thread remains). Release 2: edit, like and dislike, bookmark, block. |  | P4.15 [en] |  | |
| 16 | bn | n/a | n/a | Reports by five accounts, auto-hide, duplicate report. | not walked |  | release 2 (FD-105, T-403, T-404) | |
| 16 | en | n/a | n/a | Reports by five accounts, auto-hide, duplicate report. | not walked |  | release 2 (FD-105, T-403, T-404) | |
| 17 | bn | n/a | n/a | Privacy report on r6 hides it at once (critical lane). | not walked |  | release 2 (FD-105, T-403, T-404) | |
| 17 | en | n/a | n/a | Privacy report on r6 hides it at once (critical lane). | not walked |  | release 2 (FD-105, T-403, T-404) | |
| 18 | bn | n/a | n/a | Staff sign-in with device approval. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 18 | en | n/a | n/a | Staff sign-in with device approval. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 19 | bn | n/a | n/a | Moderation queue and decision; notification to the author of r6 (named_tanvir-ahmed). | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 19 | en | n/a | n/a | Moderation queue and decision; notification to the author of r6 (named_tanvir-ahmed). | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 20 | bn | n/a | n/a | Narrative body edit refused in moderation. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 20 | en | n/a | n/a | Narrative body edit refused in moderation. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 21 | bn | n/a | n/a | Bulk action on the critical lane. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 21 | en | n/a | n/a | Bulk action on the critical lane. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 22 | bn | n/a | n/a | Evidence quarantine table, legal hold, demo clock, retention run. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 22 | en | n/a | n/a | Evidence quarantine table, legal hold, demo clock, retention run. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 23 | bn | n/a | n/a | Providers: approve, merge with redirect, claims, protected field changes. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 23 | en | n/a | n/a | Providers: approve, merge with redirect, claims, protected field changes. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 24 | bn | n/a | n/a | Super-admin configuration with version diff, rollback, identity reveal, appeals. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 24 | en | n/a | n/a | Super-admin configuration with version diff, rollback, identity reveal, appeals. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 25 | bn | n/a | n/a | Staff notifications. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 25 | en | n/a | n/a | Staff notifications. | not walked |  | release 2 (FD-105, T-404 to T-409) | |
| 26 | bn | n/a | n/a | Workspace tabs, preferences, data export, account deletion. | not walked |  | release 2 (FD-105, T-409, T-410) | |
| 26 | en | n/a | n/a | Workspace tabs, preferences, data export, account deletion. | not walked |  | release 2 (FD-105, T-409, T-410) | |
| 27 | bn | n/a | n/a | PWA install and offline. | not walked |  | release 2 (FD-105, T-501) | |
| 27 | en | n/a | n/a | PWA install and offline. | not walked |  | release 2 (FD-105, T-501) | |
| 28 | n/a | light | 1280 px | pnpm demo:reset --yes restores the seed (manual check M6; the clock is release 2). |  | manual check M6 |  | |

## Release-1 pages and flows beyond the 28 steps

These journeys exist because release 1 added screens the storyboard does not name. Each is run in both
locales.

| Test | What it checks | Observed | Verdict | ISS |
|---|---|---|---|---|
| P1.0 | language detection from the browser and the stored choice (AC12.1.1, AC12.1.2) | | | |
| P1.1b | emergency page, signed out, no gate (AC12.1.5) | | | |
| P1.1c | about, terms and privacy pages (AC12.1.6) | | | |
| P1.4b | sparse doctor: Not provided or No documents, never `0` | | | |
| P1.5b | topics index and one topic page | | | |
| P2.8b | sign in with and without `next` | | | |
| P2.8c | invalid register form | | | |
| P2.10b | reset password, known and unknown address | | | |
| P3.11b | member-added doctor (FD-100) | | | |
| P3.13 | correction of a published experience, Show original (U22) | | | |
| P4.15b | comment gate signed out | | | |
| SEC and OPS rows | Host and Origin refusal, upload cap, health, scrubbed logs | | | |

## Release-2 marks within the walked steps (design section 13)

| Step | Release-2 part | Unit or task | Mark |
|---|---|---|---|
| 1 | the hero search box | T-205, T-206 | release 2 (FD-105, T-205, T-206) |
| 2 | Banglish search and keep-original | T-205, T-206 | release 2 (FD-105, T-205, T-206) |
| 3 | the specialty filter, and a sort control if U46 did not build one | T-205, T-206 | release 2 (FD-105, T-205, T-206) |
| 6 | the evidence viewer; the follow-up spine if U47 does not render seeded follow-ups | T-305, T-308 | release 2 (FD-105, T-305, T-308) |
| 11 | only what U47 deferred (FR46 checkboxes, custom Reviewer's labels) | U47 FD rows | release 2 (FD-105, U47) |
| 12 | the sanitising, redaction and processing bars | T-304 sanitise part | release 2 (FD-105, T-304) |
| 13 | the redaction rectangle and privacy confirmation | T-304 | release 2 (FD-105, T-304) |
| 15 | edit, like and dislike, bookmark, block | T-401, T-402 release-2 parts | release 2 (FD-105, T-401, T-402) |
| 16, 17 | reports, auto-hide and the critical lane | T-403, T-404 | release 2 (FD-105, T-403, T-404) |
| 18 to 25 | the staff console | T-404 to T-409 | release 2 (FD-105, T-404 to T-409) |
| 26 | workspace tabs, preferences, export, account deletion | T-409, T-410 | release 2 (FD-105, T-409, T-410) |
| 27 | PWA install and offline | T-501 | release 2 (FD-105, T-501) |

Whether a "if U46/U47 did not" part is deferred is decided at the walk-through from what the merged
pages render; the row above is then kept or the part is walked and recorded in the table above.

## Manual checks (BR10.3)

Run by hand against the running `pnpm demo`; the suite does not automate them safely.

| Id | Action | Expected | Observed | Evidence | Verdict |
|---|---|---|---|---|---|
| M1 | Stop the ClamAV container | `/api/health` shows scanner down with `ok` true; a new upload stays "scanning" and is never counted; after clamd starts, the upload finishes | | | |
| M2 | Stop Mailpit | `/api/health` shows mail down and `ok` false | | | |
| M3 | Ctrl+C on `pnpm demo` | web and worker stop; the containers keep running | | | |
| M4 | Hold port 3000, run `pnpm demo` | the message names the port and how to find its holder | | | |
| M5 | Run `pnpm demo` twice | data is kept; doctors are not duplicated | | | |
| M6 | `pnpm demo:reset --yes`, then sign in as `shirin_88` | sign-in works; evidence storage is regenerated; Mailpit is empty (storyboard step 28) | | | |

## Clean clone (BR10.4)

With the main demo stopped (`pnpm demo:down`), clone into a temporary folder, run
`pnpm install --frozen-lockfile`, then `pnpm demo` with `RK_COMPOSE_PROJECT=rogikotha_rehearsal`.
Target: under 6 minutes to the banner with cached images, under 15 on a first pull. Afterwards
`docker compose -p rogikotha_rehearsal down -v` removes only the rehearsal volumes. Over target is an
S3 row; a demo that does not start is S1.

| Item | Value |
|---|---|
| Images cached before the run | |
| Time to the banner | |
| Banner links open (`/bn`, `/en`, Mailpit) | |
| Rehearsal volumes removed | |
| Verdict and ISS | |

## Rollback drill (BR10.5)

In a scratch worktree from `main`: commit a deliberate break (the home page throws), confirm `/en`
answers 500, `git revert` that commit, `pnpm db:reset && pnpm db:seed`, confirm the demo runs and
`pnpm check` and `pnpm smoke` are green. Then remove the scratch worktree and branch. Nothing from the
drill reaches `main`.

| Step | Observed | Verdict |
|---|---|---|
| Break committed; `/en` answers 500 | | |
| Revert; reset and seed | | |
| Demo runs; `pnpm check` and `pnpm smoke` green | | |
| Scratch worktree and branch removed | | |

## Bengali body font (BR10.7)

The body font comes from the system stack, so layout and LCP differ by machine. On `/bn`, after
`document.fonts.ready`, check `document.fonts.check` for `Noto Sans Bengali`, `Nirmala UI`,
`Shonar Bangla`, `Kalpurush` and `SolaimanLipi` in that order; the first that is true is recorded in
the header.

| Font | `document.fonts.check` |
|---|---|
| Noto Sans Bengali | |
| Nirmala UI | |
| Shonar Bangla | |
| Kalpurush | |
| SolaimanLipi | |

## Findings

| ISS | Severity | Step or check | Summary |
|---|---|---|---|
| | | | |
