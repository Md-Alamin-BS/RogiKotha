# Demo storyboard

What the finished local demo shows, in order, with the seeded data that makes each step work. The
Playwright suite automates the ones marked ●.

**Release 1 scope (FD-105):** steps 1, 3 to 15 and 28 are in release 1. Step 2 (search) and steps 16 to 27 (reports, the staff console, the workspace, data export and deletion, the PWA) are release 2. Some release-1 steps have release-2 parts; each row of [docs/validation/U50-walkthrough.md](../validation/U50-walkthrough.md) names them.

## Seeded accounts (`pnpm db:seed`)

All passwords are `demo-pass-2026!` (10+ chars). Emails end in `@demo.rogikotha.local` and are
delivered to Mailpit (`http://localhost:8025`).

| Username | Role | State | Used for |
|---|---|---|---|
| `shirin_88` | contributor | verified, author of r1 (pseudonymous), four drafts (one blocked on a pending profile), eight bookmarks, nine notifications | the workspace, security page, an existing author |
| `rafi_c` | contributor | verified, no content | discussion (comments, replies, reactions, blocks) |
| `named_tanvir-ahmed` | contributor | verified, author of r6 (named, Tanvir Ahmed) with follow-ups and later care | follow-ups, evidence viewer, the moderation notification in step 19 |
| `anon_author_r2` | contributor | verified; author of r2 **anonymously** (its only persona) | proves alias isolation |
| `reporter_1` … `reporter_6` | contributors | verified, no content | five-account auto-hide, the sixth for "duplicate report does not count" |
| `newuser` | — | **not seeded** — created live in step 2 | registration flow |
| `mod_rashid` | moderator | staff; no trusted device | staff device approval, queue |
| `admin_nadia` | admin | staff; no trusted device (every staff account goes through device approval on first sign-in; it takes thirty seconds with Mailpit) | providers, holds |
| `sa_founder` | super_admin | staff | reveal, config, rollback, appeals |

Seeded content mirrors the prototype exactly (10 doctors, 10 branches of 7 facilities, 10 conditions with
aliases, 24 accounts, 19 facility accounts, 49 comments incl. `k8/k9/k10`, 12 evidence items with
real synthetic PNG derivatives (generated directly by the seed with sharp; T-304's pipeline re-seed is release 2), 10 moderation
cases `MOD-2011…2047`, 24 audit events, staff notifications, config version 1).

## The walkthrough

Open two browser windows: **A** (patient, Bengali by default) and **B** (staff console). Mailpit in a
third tab. Total ≈ 25 minutes.

### Part 1 — Reading (signed out, Bengali) ●
1. `/` — hero search, browse by condition, emergency panel with 999 / 16263 / crisis line and "last verified".
2. Search `dayabetis` (Banglish) → results carry the resolved note built from the prototype keys `search.didYouMean` / `search.alsoSearched` / `search.keepOriginal` (resolves to **টাইপ ২ ডায়াবেটিস**, offers to keep `dayabetis`) — proves alias + keep-original.
3. Doctors tab → neutral sort menu: relevance, most accounts, most recent — no "highest rated". Filter by specialty.
4. Open Dr. Farhana Rahman → provenance chips per field, **Registration not verified**, sentiment capsules "3 of 5 accounts", outcome rows, condition breakdown, chambers. Toggle to English (`অ`) — numerals switch, cap-drop, same information.
5. Open the facility → nine criteria with their own distributions; note the copy that facility feedback never touches a doctor.
6. Open experience r1 → thirteen sections, "Reviewer's label", follow-up spine with latest status on top, **Documents attached — not medically validated**, open the viewer: zoom, pan, move between the two prescription photos, rotate, download the processed image. Try `/api/evidence/items/<id>/original` → 403.
7. Open `/authors/shirin_88` → public profile lists r1 and public comments only; r2 (anonymous) is nowhere; page is `noindex`.

### Part 2 — Becoming a contributor ●
8. Click Write → the gate callout; **Create an account** → register `newuser` (age + terms) → pending screen → Mailpit → confirm → `/me` welcome.
9. Register again with the same email → identical pending screen; Mailpit shows "someone tried to register".
10. `/me/security` → sessions list, change password → other devices signed out.

### Part 3 — Writing with evidence
11. `/write` → Detailed mode, pick a doctor, relationship, period, four sections, tags incl. a **Not sure** and a free-text provisional term, sentiment optional, claims → "Reviewer's label" preview, identity **anonymous**.
12. Attach `fixtures/prescription-1.jpg`, `fixtures/prescription-2.jpg` and `fixtures/photo.jpg` → chips move through the prototype's six bars (`ev.state.quarantine → checking → scanning → redact → processing → ready`; product states `quarantined/validating/scanning/sanitising/preview_ready/privacy_confirmed` map onto them) live (polling). Attach `fixtures/broken.jpg` → **failed: could not be read**, text still publishable. Attach `fixtures/flagged.jpg` → **failed: malware detected** (custom ClamAV test signature). Try `fixtures/report.pdf` → refused at once: "Only JPEG and PNG images in this version". (Optional: stop the ClamAV container → a new upload stays at scanning with "scan unavailable"; start it → proceeds. Fail closed.)
13. Redact a rectangle on page 1, confirm privacy, **Preview** = exact public page, **Publish**.
14. Open the new experience signed out in window A' (incognito): alias `patient-xxxx`, no link to `newuser`; original filename absent.

### Part 4 — Discussion and reporting
15. As `rafi_c`: comment on r1, reply to k8 (one level — reply button absent on the reply), edit, delete k10 (gone) vs delete k8 (tombstone stays). Like, change to dislike, remove. Bookmark. Block `reporter_1` → they can no longer reply to rafi's thread.
16. As `reporter_1`…`reporter_5` (five tabs or quick switch): report comment k3 as spam → after the fifth distinct account it flips to **hidden pending review**; `reporter_1` reports again → "already reported", count unchanged; `reporter_6` reports as **factual** → no hide.
17. As `newuser`: report r6 (by `named_tanvir-ahmed`) as **privacy** → hidden immediately (critical), case in the critical lane.

### Part 5 — Staff console (window B)
18. `/admin/sign-in` as `mod_rashid` on this browser → **Approve this device** → Mailpit → link → password → console. Sign out and in again → straight in.
19. Queue: critical lane shows the privacy case with SLA 24 h; MOD-2041 is in the critical lane; the standard lane includes MOD-2033 and MOD-2029; counts in the nav. Open the case → reporter reads **restricted**; pick **redact**, write the reason to author, **Record decision** → audit timeline gains the row; the author of r6 (`named_tanvir-ahmed`) gets a moderation notification with the appeal path, no reporter identity.
20. Try to edit the narrative body → refused ("narrative is not editable through moderation").
21. Bulk: select the critical lane → preview lists affected cases → confirm → each result recorded.
22. Evidence: quarantine table with stages; place a **legal hold** on e1 with a reason; move the **demo clock** +91 days → run retention → e3's original expires (custody `original_expired`), e1's does not; release the hold.
23. Providers: approve `P-143`, merge `P-140` into d2 (redirect works: old URL → new); approve claim C-58; decide a protected field change.
24. Sign in as `sa_founder`: Config → change five-account threshold 5 → 3 → password recheck → version 2 with diff; rollback to version 1 → version 3; capability toggle "Moderator may reveal identity" stays off; reveal the reporter on a case → audit + `identity_reveals` row + staff notification. Appeals lane: decide MOD-2011's appeal (a different reviewer than the decision's actor).
25. Notifications (staff): open/ack a `newReport` item.

### Part 6 — Workspace, data, PWA
26. As `shirin_88`: `/me` published/drafts tabs (draft with expiry days, one blocked on a pending profile), preferences (language), feedback, **Export my data** → notification → download zip (derivatives only). **Delete my account** → password → plan preview (tombstone r1 because it has discussion; e1 retained under hold) → executed → `/authors/shirin_88` shows de-identified snapshot, r1 tombstone keeps k8's thread.
27. Install as PWA (Chrome "Install"), go offline → home shell loads, `/me` does not; sign out purges caches.
28. Reset the demo: `pnpm demo:reset` restores the seed and the clock.

The observed result of every release-1 step is recorded in [docs/validation/U50-walkthrough.md](../validation/U50-walkthrough.md) (FD-105 defers the parts that need the staff console and the other release-2 features). Note: a **failed** evidence item (step 12's encrypted PDF) is shown to its author only; the public experience page lists published documents alone (AD-6) — the prototype's public rendering of e5's failure is not carried over.

## Fixtures (`packages/test-support/fixtures/`)

`prescription-1.jpg`, `prescription-2.jpg` (the text `DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD`
drawn into the pixels), `photo.jpg` (a synthetic prescription photo with EXIF GPS to prove metadata
stripping), `not-a-png.png` (JPEG bytes with a PNG name → type mismatch), `broken.jpg` (truncated →
malformed), `flagged.jpg` (valid JPEG whose COM segment holds `ROGIKOTHA-MALWARE-TEST-MARKER`, matched
by the custom ClamAV signature in `infra/compose/clamav/`), `oversize.png` (16 MB), `report.pdf` (a
minimal PDF used only to prove PDFs are refused in Phase 1). All generated by `pnpm fixtures:build`,
never committed as binaries larger than 1 MB.
