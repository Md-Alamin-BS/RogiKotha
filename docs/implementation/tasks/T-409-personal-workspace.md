# T-409 — Personal workspace, saved, public profile

| Field | Value |
|---|---|
| Story | STORY-USER-001, STORY-USER-002, STORY-REV-003 (workspace half), STORY-MOD-003 (appeal entry) |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-302 (`review.delete/restore/getDraft`, drafts with expiry/blocked), T-401 (blocks, thread), T-104 (public projection), T-102 (account menu, `/me/security` link), T-404 (`appeal.file`) |
| Parallel-safe with | T-405, T-406–T-408, T-410 (the data-request buttons call T-410 actions; stub with a disabled state until T-410 lands and note it) |

## Goal

Port `/me` (published and drafts tabs with real edit/follow-up/delete/restore/continue actions, the appeal panel, preferences, feedback, data requests), `/saved`, the public author profile `/authors/{username}` with the allowlisted projection and `noindex`, and a blocked-users list — all reading from the real account, review, community and identity queries.

## Read first

1. `docs/implementation/01-conventions.md` §6–§9
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/me`, `/saved`, `/authors/{username}`), §4 "account" (`updatePreferences`, `submitFeedback`), "review" (`saveDraft/getDraft/delete/restore/addFollowUp`), "community" (`block.*`, `blockedList`), "identity" (`publicProjection`), "moderation" (`appeal.file`), "data-requests"
3. `docs/design/auth-screens-spec.md` §3.6 (security nav link in `workspaceNav`)
4. Prototype: `app.js` 1609–1744 (`renderMine` — tabs, published item with badges/byline/actions/delete note, deleted tombstone with restore, drafts with expiry badge/blocked badge/continue/delete, `a-head` with display · username + `person.viewPublic` + joined, the appeal `.panel` with `.kv`, preferences `.sub` with `pref-lang`, feedback `.sub`, data `.sub`), 1811–1823 (`renderSaved`), 1843–1851 (`workspaceNav`), 1852–1888 (`renderPerson`), 2485–2501 (`openAppeal`), handlers 2615–2668 (`data-del-pub`, `data-restore-pub`, `data-del-draft`, `#open-appeal`, `#ap-send`, `#user-feedback-send`, `#user-data-export/delete`, `#pref-lang`, `data-mine`, `data-person`); fixtures `RK.user` (drafts `dr1` 22 d, `dr2` 4 d blocked; bookmarks r6, r9); `styles.css` `.mine-item`, `.mine-tabs`, `.mine-subtabs`, `.mine-actions`, `.row-flags`, `.excerpt`, `.saved-flag`, `.about-head`, `.index-list`
5. `docs/implementation/05-demo-storyboard.md` step 26; step 7

## Owned paths

- `apps/web/src/app/[locale]/(patient)/me/page.tsx`, `saved/page.tsx`, `authors/[username]/page.tsx`
- `apps/web/src/components/patient/Workspace.tsx`, `WorkspaceNav.tsx`, `MineItem.tsx`, `DraftItem.tsx`, `AppealPanel.tsx`, `AppealSheet.tsx`, `PreferencesPanel.tsx`, `FeedbackPanel.tsx`, `DataRequestsPanel.tsx`, `BlockedUsers.tsx`, `Saved.tsx`, `PublicProfile.tsx`
- `apps/web/src/server/actions/workspace.ts` (`deleteReview`, `restoreReview`, `deleteDraft`, `updatePreferences`, `submitFeedback`, `unblock`), `actions/moderation.ts` (`fileAppeal` export)
- `apps/web/src/components/patient/*.test.tsx`
- `apps/web/src/styles/patient.css` — additions only, `/* added: T-409 */` (expected none)
- `packages/i18n/messages/{en,bn}.json` — `mine.blocked`, `mine.unblock`, `mine.blockedNote`, `mine.followUps` (if the badge text needs a proper key instead of lower-casing `label.followUp`)

## Not in scope

`/me/security` (T-102), `/notifications` (T-405), the composer (T-306), export/delete execution (T-410 — you render the buttons/callouts and call its actions), the appeal decision (T-404).

## Steps

1. **`WorkspaceNav`**: `.mine-tabs` nav with `nav.mine`, `mine.bookmarks`, `mine.notifications`, plus `auth.security.nav` (auth spec §3.6) as `<Link aria-pressed>`s.
2. **`/me` page** → `Workspace` (server): `a-head` kicker `display · username`, H1 `mine.title`, `person.viewPublic` link to `/authors/{username}`, joined line (`formatMonthYear`); `WorkspaceNav('mine')`; `.panel` with `.mine-subtabs` (published `n`, drafts `n` — `?tab=` query, default published) and the list; then `AppealPanel` (only when the actor has an appealable decision: query `moderation.myAppealable` → add a small read-only query in T-404's module if missing; note it), `PreferencesPanel`, `FeedbackPanel`, `DataRequestsPanel`, `BlockedUsers`.
3. **`MineItem`** (published): `.row-flags` sentiment badge (or none when not provided — never `0`), outcome badge (or `label.notProvided`), follow-up count badge; title; `Byline(r,'mine')` showing how it is attributed (named/username/anonymous alias); note line doctor link · period · posted; actions: **Read** → `/experiences/{publicId}`, **Edit** → `/write?draft=<new draft from published>` (`review.beginEdit` — T-302 exposes `saveDraft {reviewId}`; use it), **Add follow-up** → `/write?draft=…&followUp=1`, **Delete** → `deleteReview` (confirm via `Sheet`, not `window.confirm`); `mine.deleteNote` under. Deleted state (within `restore_until`): `mine.deleted` badge, title, note, **Restore** → `restoreReview`; after `restore_until` the item disappears (query filters).
4. **`DraftItem`**: expiry badge (`mine.draftExpires {n} mine.days`, `warn` when ≤ 7), blocked badge when `blocked_on_submission_id` (`compose.addPending` shortened — replace the prototype's `.slice(0,40)` hack with a proper key `mine.draftBlocked`: "Waiting for the doctor profile to be checked" / "ডাক্তার প্রোফাইল যাচাইয়ের অপেক্ষায়"), title (or `Untitled — started {date}` via key `mine.untitled`), excerpt (first 140 graphemes of the draft body — decrypt through `review.getDraft`, server-side only), **Continue** → `/write?draft=`, **Delete** → `deleteDraft`.
5. **`AppealPanel` + `AppealSheet`**: `.kv` action / policy reason / `report.identityNote → appeal.noReporter`; **Appeal** button → sheet (`appeal.title`, `.kv`, warn callout `appeal.noReporter`, textarea `appeal.text`, `appeal.target`, submit `appeal.button`) → `fileAppeal` → `appeal.sent`.
6. **`PreferencesPanel`**: `user2.preferences` + note; language `.opt` toggle → `updatePreferences {interfaceLocale}` then navigate to the same path under the other locale (cookie set by the action).
7. **`FeedbackPanel`**: textarea + **Send** → `submitFeedback` → `.saved-flag` `user2.feedbackSent`; rate-limit error mapped.
8. **`DataRequestsPanel`**: `user2.data`, note, **Export** → T-410 `requestExport`; **Delete** → T-410 `requestDeletion` (opens its plan sheet); `user2.dataCallout`; status line from `dataRequest.status` (`ready` → download link `/api/data-requests/{id}/download`).
9. **`BlockedUsers`**: `.sub` `mine.blocked`, list of usernames with **Unblock**; `mine.blockedNote`.
10. **`/saved`** → `Saved`: `indexHead(nav.mine, mine.bookmarks, mine.bookmarkNote)`, `WorkspaceNav('saved')`, `.index-list` of `AccountRow` (T-307's row component) for `review.bookmarksOf(actor)`; empty `mine.empty`; `noindex`.
11. **`/authors/[username]`** → `PublicProfile` (public, `noindex`, `generateMetadata` title = display name): `identity.publicProjection` by username → 404 if none or if the account is deleted-and-deidentified? **No** — de-identified snapshot still renders (storyboard 26) with the snapshot display name; sections: `about-head` kicker `person.kicker`, H1 display name, byline identity (`byline.identity.named|pseudo`), `person.noindex` lead; `.panel` `person.allowlist` + note; `person.contributions {n}` → `AccountRow`s from `review.publicByPersona` (published, non-anonymous personas of that username only); `person.comments {n}` → `Comment` (T-402) in read-only reply style for public comments by those personas; empty states `person.empty`. **Assert**: r4 (anonymous) never appears for `anon_author_r4`; drafts/bookmarks/notifications never queried.
12. **Tests**: tabs; deleted → restore; draft expiry warn ≤ 7; blocked badge; appeal sheet submit; preferences toggles locale; public profile excludes anonymous; noindex metadata on `/me`, `/saved`, `/authors/*`; both locales.
13. `impeccable detect`, `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Storyboard 26 (first half) | manual as `shirin_88` | published/drafts tabs with `dr1` 22 d and `dr2` blocked; delete r1 → deleted state → restore |
| Storyboard 7 | manual signed out | `/authors/shirin_88` lists r1 + public comments; `/authors/anon_author_r4` shows no accounts; `<meta name="robots" content="noindex">` |
| Follow-up count | component test | badge shows count with Bengali numerals in `bn` |
| Appeal | manual as `anon_author_r4` (MOD-2011) | sheet → `appeal.sent` → case in appeals lane |
| Preferences | manual | toggle → page reloads in the other locale; `account_preferences.interface_locale` updated |
| Feedback | manual | flag shows; row in `feedback` |
| Design checks | `impeccable detect` | clean |

## Tests to write

Component tests in step 12; a query-level test that the public profile VM contains no `accountId`, no anonymous persona, no draft/bookmark/notification fields.

## Hard-rule checklist

- [ ] Public profile: allowlisted projection, `noindex`, anonymous activity excluded by construction.
- [ ] Missing sentiment/outcome renders "Not provided", never `0`.
- [ ] Deletion leaves a restorable state for 30 days; tombstone when discussion exists.
- [ ] Appeal path never shows reporter identity.
- [ ] Both locales; numerals follow language; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
