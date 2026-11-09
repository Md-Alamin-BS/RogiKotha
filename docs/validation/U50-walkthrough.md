# U50 walk-through record (release 1)

Status: Observed and Evidence are filled from the automated runs of Code Generation Step 51 (the
two clean `pnpm e2e` runs on the Bolt branch, the same tree as the Step 42 pair); they say what the
journey test checked, not what a person saw. The hand walk, the manual checks, the clean clone, the
rollback drill, the font check and every Verdict cell are done at Build and Test (BR10.2). Rows already marked
"release 2" were decided in the design (FD-105) and are not walked. The storyboard is
[05-demo-storyboard.md](../implementation/05-demo-storyboard.md); a finding becomes an `ISS-` row in
the defect register `docs/implementation/ISSUES.md` (on branch `archive/full-project-2026-11-09`) with Found in `U50`.

## Header (filled at the walk-through)

| Field | Value |
|---|---|
| Date | automated runs 2026-11-08; manual checks, clean clone and font check 2026-11-09 (office computer, Windows 11 Enterprise 10.0.26300) |
| `main` commit | not on `main` yet: Bolt branch `bolt/u50-release-check` at `40adadd` (holds `main` at `c6153fa`); the hand walk records the final `main` commit |
| OS | Windows 11 Pro for Workstations 10.0.26300 |
| Docker | 29.9.2 (client and server) |
| Node | 24.19.0 |
| pnpm | 11.20.0 |
| Chromium (Playwright build) | `@playwright/test` 1.64.1, Chromium revision 1248 (Chrome for Testing 156.0.8078.4) |
| Bengali body font in use (BR10.7, see "Bengali body font") | Nirmala UI (width comparison, 2026-11-09) |
| Clean-clone time to the banner (see "Clean clone") | not run yet (Build and Test) |
| Journey runs (Step 42) | Step 42 pair at `751433b`: (A) 231 expected, 0 unexpected, 0 flaky, 0 skipped; (B) the same. Step 51 pair at `40adadd` (code identical to `751433b`): run 1: 231 expected, 0 unexpected, 0 flaky, 0 skipped (6.0 min); run 2, straight after: 231 expected, 0 unexpected, 0 flaky, 0 skipped (6.0 min); no test needed a retry in either run. Per project: `chromium-desktop` 121, `chromium-360` 72, `chromium-reduced-motion` 32, `log-scan` 6 |

## Storyboard steps 1 to 28

Verdict is one of `pass`, `fail (ISS-nnn)` or `release 2 (FD-105, <Unit or task>)`. Parts 1 to 4 are
walked in `bn` first, then `en`. The planned theme and width below make sure both themes and both
widths (360 px and 1280 px) are covered: Part 2 at 360 px, Part 3 in the dark theme, the rest light at
1280 px. The Evidence column cites the journey test (`P<part>.<step> [<locale>]`, run by
`pnpm e2e`, Steps 34 and 42) and, for anything seen by hand, the manual action and the trace or
screenshot path.

| Step | Locale | Theme | Width | Expected (storyboard text, release-1 part) | Observed | Evidence | Verdict | ISS |
|---|---|---|---|---|---|---|---|---|
| 1 | bn | light | 1280 px | Home: emergency panel with 999, 16263 and the crisis line and its last-verified date; browse-by-topic chips; separation sentence; no search box in release 1. Release 2: the hero search box. | Automated, signed out, default (light) theme: one `h1`; five topic chips to `/bn/topics/<id>`; emergency panel with the configured numbers and the last-verified note in Bengali digits; facility teaser with the separation sentence, no bare `0`, Limited data exactly below 5 visits; no search box; page check clean (demo marker, disclaimer, emergency guidance, no-rating structure, axe, CSP, no overflow at 360 px). | P1.1 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 1 | en | light | 1280 px | Home: emergency panel with 999, 16263 and the crisis line and its last-verified date; browse-by-topic chips; separation sentence; no search box in release 1. Release 2: the hero search box. | As `bn`, in English digits: one `h1`; five topic chips to `/en/topics/<id>`; emergency panel with the configured numbers and the last-verified note; facility teaser with the separation sentence, no bare `0`, Limited data exactly below 5 visits; no search box; page check clean. | P1.1 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 2 | bn | n/a | n/a | Search "dayabetis": resolved note, keep-original offer. | not walked |  | release 2 (FD-105, T-205, T-206) | |
| 2 | en | n/a | n/a | Search "dayabetis": resolved note, keep-original offer. | not walked |  | release 2 (FD-105, T-205, T-206) | |
| 3 | bn | light | 1280 px | Doctors index in the neutral sort set (relevance, most accounts, most recent), no "highest rated"; every entry shows Registration not verified. Release 2: the specialty filter. | At least 10 entries, each with Registration not verified; every member-added badge reads its message; any sort option is relevance, most accounts or most recent only; page check clean, no rating structure. The specialty filter is not asserted (release 2). | P1.3 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 3 | en | light | 1280 px | Doctors index in the neutral sort set (relevance, most accounts, most recent), no "highest rated"; every entry shows Registration not verified. Release 2: the specialty filter. | As `bn`: at least 10 entries, each with Registration not verified; member-added badges read their message; only neutral sort options; page check clean, no rating structure. | P1.3 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 4 | bn | light | 1280 px | Dr. Farhana Rahman: provenance chips, Registration not verified, sentiment capsules "n of m", outcome rows, condition breakdown, chambers; language toggle keeps every number after digit mapping. | `h1` is ডা. ফারহানা রহমান; Registration not verified in the hero; account count; Limited data exactly below the threshold; provenance chips; sentiment and outcome blocks read "n of m" against the account count, no capsule above m, no ASCII digit; condition breakdown shown; after switching to `en` every number is equal after digit mapping. Chambers are not asserted on their own. | P1.4 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 4 | en | light | 1280 px | Dr. Farhana Rahman: provenance chips, Registration not verified, sentiment capsules "n of m", outcome rows, condition breakdown, chambers; language toggle keeps every number after digit mapping. | `h1` is Dr. Farhana Rahman; the same checks as `bn`; after switching to `bn` every number is equal after digit mapping and the capsules hold no ASCII digit. Chambers are not asserted on their own. | P1.4 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 5 | bn | light | 1280 px | Facility: nine criteria with their own "n of m" distributions; the copy that facility feedback never touches a doctor. | Registration not verified; the separation sentence; no outcome block; nine criteria, each with an "n of m" denominator or Not provided; after switching to `en` the same numbers and the separation sentence. | P1.5 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 5 | en | light | 1280 px | Facility: nine criteria with their own "n of m" distributions; the copy that facility feedback never touches a doctor. | As `bn`: not verified, separation sentence, no outcome block, nine criteria with denominators or Not provided, the same numbers after switching to `bn`. | P1.5 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 6 | bn | light | 1280 px | Experience r1: sections, Reviewer's label, Documents attached, not medically validated, follow-ups as rendered by U47, original-evidence URL is not served. Release 2: the viewer (zoom, pan, rotate, download). | `h1` is r1's title; detailed section headings in page order; published month and year only; doctor not verified; evidence note with the Ready count, or No documents; discussion gate for a signed-out reader; the original-file probe is refused and returns no image; the Reviewer's label and its why-note are read on r6 (r1 stores no claim, ISS-753). Follow-ups are not asserted on r1. | P1.6 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 6 | en | light | 1280 px | Experience r1: sections, Reviewer's label, Documents attached, not medically validated, follow-ups as rendered by U47, original-evidence URL is not served. Release 2: the viewer (zoom, pan, rotate, download). | As `bn` (r1's title is Bengali in both locales, ISS-762): sections in order, month and year only, not verified, evidence note or No documents, signed-out gate, original refused, Reviewer's label on r6. | P1.6 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 7 | bn | light | 1280 px | /authors/shirin_88 lists r1 and public comments only; r2 (anonymous) nowhere; page is noindex. | `/bn/authors/shirin_88` answers 200 with `noindex` and `@shirin_88`, lists r1 once and no anonymous review; the anonymous author's name and an unknown name answer alike, with the empty state and no display name. Public comments on the page are not asserted. | P1.7 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 7 | en | light | 1280 px | /authors/shirin_88 lists r1 and public comments only; r2 (anonymous) nowhere; page is noindex. | As `bn` on `/en/authors/shirin_88`: 200, `noindex`, r1 once, no anonymous review; anonymous and unknown names give the same empty state. | P1.7 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 8 | bn | light | 360 px | Write shows the gate; register (age and terms) to the pending screen; Mailpit link; confirm; /me welcome. | Signed-out write shows the gate with links carrying `next=/bn/write`; register (age and terms) leads to the pending screen naming the address; the confirm mail found in Mailpit (subject in Bengali, sender `MAIL_FROM`, no tool identity); opening the link confirms nothing; Confirm lands on `/bn/verify-email?confirmed=1` with the done notice and one tick (FD-103 replaces "/me welcome"); sign-in returns to the composer; `/bn/me` renders. | P2.8 [bn] register and confirm; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 8 | en | light | 360 px | Write shows the gate; register (age and terms) to the pending screen; Mailpit link; confirm; /me welcome. | As `bn`: gate with `next`, pending screen, clean confirm mail in English, nothing confirmed by opening the link, Confirm to `/en/verify-email?confirmed=1` with the done notice, sign-in to the composer, `/en/me`. | P2.8 [en] register and confirm; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 9 | bn | light | 360 px | Register again with the same address: identical pending screen; Mailpit shows the "someone tried to register" mail. | The second registration shows the same pending screen and URL as a first one; the "someone tried to register" mail arrives; the second password signs nobody in. | P2.9 [bn]; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 9 | en | light | 360 px | Register again with the same address: identical pending screen; Mailpit shows the "someone tried to register" mail. | As `bn`: identical pending screen and URL, the "someone tried" mail, no second account. | P2.9 [en]; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 10 | bn | light | 360 px | /me/security: sessions list, change password signs the other device out, sign out everywhere. | Masked address (neither the email nor the username shown), marked verified; two session rows, one marked this device; changing the password shows the changed notice and the other device is signed out on its next load (ISS-778, fixed on `main` at `c6153fa`); sign out everywhere lands on `sign-in?signedOut=all` with its notice. | P2.10 [bn]; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 10 | en | light | 360 px | /me/security: sessions list, change password signs the other device out, sign out everywhere. | As `bn`: masked verified address, two sessions with this device marked, the password change signs the other device out, sign out everywhere with its notice. | P2.10 [en]; Step 51 runs 1 and 2: passed on `chromium-360` and `chromium-desktop` |  | |
| 11 | bn | dark | 1280 px | Detailed composer: doctor, relationship, period, four sections, tags incl. Not sure and a provisional term, claims, preview, identity anonymous, Publish. Release 2: only what U47 deferred. | Automated in the default (light) theme, not dark: doctor, relationship, period, title, sections, Not sure plus a provisional free term, one Reviewer's label pressed, identity anonymous with the attestation; the preview holds the title and the Reviewer's label; Publish lands on `?published=1` with the published note, exactly one tick and no reward words; the public page shows the title, every section and the alias byline, never the run username. | P3.11 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 11 | en | dark | 1280 px | Detailed composer: doctor, relationship, period, four sections, tags incl. Not sure and a provisional term, claims, preview, identity anonymous, Publish. Release 2: only what U47 deferred. | As `bn`, light theme: the full composer to Publish, one tick, the public page with the alias byline. | P3.11 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 12 | bn | dark | 1280 px | Attach prescription-1.jpg, prescription-2.jpg, photo.jpg to Ready; broken.jpg could not be read; flagged.jpg malware detected; report.pdf and the 16 MB file refused at once. Release 2: sanitising, redaction and processing bars. | With ClamAV up, light theme: the three good files end Ready; `broken.jpg` and `flagged.jpg` end with their failure reasons (U48's `ev.reason.*` copy, ISS-754); `report.pdf` and the 16 MB file are refused at once through the polite status line, no row left; a signed-out reader sees the evidence count and no file name; the original-file probe is refused. | P3.12 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
| 12 | en | dark | 1280 px | Attach prescription-1.jpg, prescription-2.jpg, photo.jpg to Ready; broken.jpg could not be read; flagged.jpg malware detected; report.pdf and the 16 MB file refused at once. Release 2: sanitising, redaction and processing bars. | As `bn`: three Ready, two failed with reasons, two refused at once, count without file names for a signed-out reader, original refused. | P3.12 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
| 13 | bn | dark | 1280 px | Preview equals the public page and Publish (covered inside P3.11). Release 2: the redaction rectangle and privacy confirmation. | Inside P3.11, light theme: before Publish the preview holds the title and the Reviewer's label; the published page shows the same title and every section. | P3.11 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 13 | en | dark | 1280 px | Preview equals the public page and Publish (covered inside P3.11). Release 2: the redaction rectangle and privacy confirmation. | As `bn`: preview with title and Reviewer's label, then the same title and sections on the published page. | P3.11 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop`, `chromium-360`, `chromium-reduced-motion` |  | |
| 14 | bn | dark | 1280 px | Signed-out view: alias byline, no link to the account, no original file name. | Light theme: a signed-out reader sees the alias byline; the page holds neither the run username, the run email nor any evidence file name; the author's public page shows the empty state and not the title. | P3.14 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
| 14 | en | dark | 1280 px | Signed-out view: alias byline, no link to the account, no original file name. | As `bn`: alias byline, no username, email or file name, the author's page empty. | P3.14 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
| 15 | bn | light | 1280 px | Comment on r1, reply once (no reply control on a reply), delete a reply and a comment (placeholder where a thread remains). Release 2: edit, like and dislike, bookmark, block. | On a run-made review: the field stops at 2000 (`maxlength`) and the server refuses 2001 characters with the length alert, keeping the text; a posted comment is announced; one reply, with no reply control on it; a deleted comment without replies is gone; a deleted comment with a reply leaves the placeholder with the reply under it; page check clean. Run on a fresh review, not r1 (BR7.1). | P4.15 [bn]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
| 15 | en | light | 1280 px | Comment on r1, reply once (no reply control on a reply), delete a reply and a comment (placeholder where a thread remains). Release 2: edit, like and dislike, bookmark, block. | As `bn`: the 2001-character refusal, the announced post, one reply without a reply control, both deletes. | P4.15 [en]; Step 51 runs 1 and 2: passed on `chromium-desktop` and `chromium-360` |  | |
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
| 28 | n/a | light | 1280 px | pnpm demo:reset --yes restores the seed (manual check M6; the clock is release 2). | not run yet (manual, Build and Test) | manual check M6 |  | |

## Release-1 pages and flows beyond the 28 steps

These journeys exist because release 1 added screens the storyboard does not name. Each is run in both
locales.

Observed is from Step 51 runs 1 and 2 at `40adadd`, both locales; the projects are named in each
row. Verdict is left for Build and Test.

| Test | What it checks | Observed | Verdict | ISS |
|---|---|---|---|---|
| P1.0 | language detection from the browser and the stored choice (AC12.1.1, AC12.1.2) | `bn-BD` opens `/bn`, `en-US` opens `/en`; after the toggle, `/` follows the stored choice over the browser language. Passed in `bn` and `en` on desktop, 360 px and reduced motion | | |
| P1.1b | emergency page, signed out, no gate (AC12.1.5) | `/{locale}/emergency` with its `h1`, the configured numbers in the locale's digits and the note; no contribution gate. Passed in both locales on desktop, 360 px and reduced motion | | |
| P1.1c | about, terms and privacy pages (AC12.1.6) | each page in the locale with main, navigation and footer landmarks, one `h1`; the lawful section on terms and privacy and not on about (FD-109). Passed in both locales on desktop, 360 px and reduced motion | | ISS-763 (fixed) |
| P1.4b | sparse doctor: Not provided or No documents, never `0` | d10's about text reads Not provided, documents read No documents, no bare `0`, the empty distributions show Not provided with no capsule. Passed in both locales on desktop, 360 px and reduced motion | | ISS-752, ISS-753 |
| P1.5b | topics index and one topic page | at least 10 topic cards with the ten seeded names; a topic page with its `h1` and the compact emergency line. Passed in both locales on desktop, 360 px and reduced motion | | ISS-763 (fixed) |
| P2.8b | sign in with and without `next` | sign-in returns to `next`, sign-out, sign-in again lands on `/me`. Passed in both locales on desktop and 360 px | | ISS-779 (fixed) |
| P2.8c | invalid register form | the error summary is an alert; each bad field is `aria-invalid` and points at its message; the summary links the fields; no mail and no account for the refused address. Passed in both locales on desktop and 360 px | | |
| P2.10b | reset password, known and unknown address | the same sent notice for both; a clean reset mail only for the known address; the mismatch message; `sign-in?reset=done`; the old password gets the neutral refusal, the new one signs in. Passed in both locales on desktop and 360 px | | |
| P3.11b | member-added doctor (FD-100) | the experience page shows the new doctor with Added by a member and Registration not verified; the doctor index lists the new doctor with both labels. Passed in both locales on desktop and 360 px | | |
| P3.13 | correction of a published experience, Show original (U22) | the edit form saves and returns to the page; the history shows Edited and the correction; Show original is closed by default and holds the first text; a signed-out reader sees the same. Passed in both locales on desktop and 360 px | | |
| P4.15b | comment gate signed out | the gate is `signed-out` with the comment body text; its links carry `next` to the experience. Passed in both locales on desktop and 360 px | | |
| P2.11, P2.12 | the language switch keeps `next` on sign-in; renaming the display name on `/me` (from `demo.spec.ts`, Step 45) | `/{other}/sign-in?next=%2Fdoctors` after the switch; the saved note and the new name kept after a reload. Passed in both locales on desktop and 360 px | | ISS-695 (closed) |
| SEC and OPS rows | Host and Origin refusal, upload cap, health, scrubbed logs | a foreign Host refused in both locales; a foreign Origin refused on a server action and on `/api/evidence/upload`; a declared length above the cap refused before the body; CSP on eight public pages per locale and on every page `checkPage` saw (`csp.jsonl`); `/api/health` every probe `ok`; no sentinel or run email in `web.log` or `worker.log`, every line JSON. Plus `smoke/security-headers.spec.ts` 8 of 8 (headers, rotating nonce, no CSP violation, the ENT-011 cookies). All passed in both runs | | ISS-777, ISS-783 (fixed) |
| SMOKE, motion and a11y | `release1.smoke.spec.ts`, `smoke/motion.spec.ts`, the four a11y specs | smoke 6 of 6; motion 12 of 12 on desktop; keyboard 12, live region 12, motion switch 24, zoom and spacing 16, across desktop, 360 px and reduced motion as configured. All passed in both runs | | ISS-784, ISS-785 (fixed) |

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
| M1 | Stop the ClamAV container | `/api/health` shows scanner down with `ok` true; a new upload stays "scanning" and is never counted; after clamd starts, the upload finishes | scanner unreachable: health 200 `{"ok":true,...,"scanner":"down"}` | Build and Test `test-results.md`, "Stopped scanner and stopped mail" (2026-11-08); upload half covered by the U48 sweep and fail-closed tests | pass |
| M2 | Stop Mailpit | `/api/health` shows mail down and `ok` false | mail unreachable: health 200 `{"ok":false,...,"mail":"down"}` | Build and Test `test-results.md`, "Stopped scanner and stopped mail" (2026-11-08) | pass |
| M3 | Ctrl+C on `pnpm demo` | web and worker stop; the containers keep running | a console Ctrl+C reached the demo: the worker logged `worker.stopping` and `worker.stopped` (signal SIGINT), the demo printed "Stopped. The containers keep running; pnpm demo:down stops them.", the demo, web and worker processes were gone, `/api/health` stopped answering, and `docker ps` still showed postgres, clamav and mailpit healthy. Windows also printed cmd's "Terminate batch job (Y/N)?" for the pnpm wrappers, which needs no answer | demo run 2026-11-09 13:52 (+06), office computer | pass |
| M4 | Hold port 3000, run `pnpm demo` | the message names the port and how to find its holder | with the demo on port 3000, a second `pnpm demo` stopped at preflight, exit 1: "Port 3000 (web app) is in use. Free it and run pnpm demo again." then "Find its holder: netstat -ano | findstr :3000" and the netstat lines | demo run 2026-11-09 13:44 (+06) | pass |
| M5 | Run `pnpm demo` twice | data is kept; doctors are not duplicated | after the first and the second run: doctors 14, reviews 40, accounts 120, comments 73 both times; 0 doctor names occur twice; the second run's Data step took 9 s (seed-if-empty skipped) | `psql` counts on `rogikotha`, 2026-11-09 | pass |
| M6 | `pnpm demo:reset --yes`, then sign in as `shirin_88` | sign-in works; evidence storage is regenerated; Mailpit is empty (storyboard step 28) | first walk: fail, the reset emptied storage after the seed, leaving 0 files (ISS-818). After the fix: reset exit 0, storage emptied before the seed, 20 files regenerated, Mailpit 0 messages, and `shirin_88` signed in at `/en/sign-in` and landed on `/en/me` with the account menu shown | ISS-818; Playwright sign-in 2026-11-09 | pass after ISS-818 fix |

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
| Break committed; `/en` answers 500 | `1b324d2` makes the home page throw; `/en` and `/bn` 500, `/en/doctors` 200 (Build and Test `test-results.md`, "Rollback drill", 2026-11-08) | pass |
| Revert; reset and seed | `git revert` (`ae09e1a`) restores the tree exactly; `pnpm db:reset && pnpm db:seed` exit 0 in 8.4 s | pass |
| Demo runs; `pnpm check` and `pnpm smoke` green | `/en` and `/bn` 200, health ok; `pnpm check` exit 0 (4504 passed); `pnpm smoke` exit 0 (60 passed) | pass |
| Scratch worktree and branch removed | `scratch/rollback-drill` deleted; nothing reached `main` | pass |

## Bengali body font (BR10.7)

The body font comes from the system stack, so layout and LCP differ by machine. On `/bn`, after
`document.fonts.ready`, check `document.fonts.check` for `Noto Sans Bengali`, `Nirmala UI`,
`Shonar Bangla`, `Kalpurush` and `SolaimanLipi` in that order; the first that is true is recorded in
the header.

`document.fonts.check` cannot answer this for system fonts (ISS-814), so the check was made by width:
on `/bn`, after `document.fonts.ready`, a canvas measured one Bengali sentence at 32 px in the body's
font stack and in each name followed by `monospace`. A name whose width equals the `monospace`
fallback is not installed; the installed name whose width equals the body stack is the one in use.

| Font | Width of the test sentence (method above) |
|---|---|
| Noto Sans Bengali | 700.6 px, the `monospace` fallback width: not installed |
| Nirmala UI | 647.6 px, equal to the body stack (647.6 px): **in use** |
| Shonar Bangla | 700.6 px: not installed |
| Kalpurush | 700.6 px: not installed |
| SolaimanLipi | 700.6 px: not installed |

## Findings

| ISS | Severity | Step or check | Summary |
|---|---|---|---|
| ISS-818 | S2 | M6 | `demo:reset` deleted the seeded evidence files; fixed (storage emptied before the seed) |
