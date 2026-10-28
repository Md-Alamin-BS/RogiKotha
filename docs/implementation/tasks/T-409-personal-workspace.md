# T-409 — Personal workspace, saved, public profile

| Field | Value |
|---|---|
| Story | STORY-USER-001, STORY-USER-002, STORY-REV-003 (workspace half), STORY-MOD-003 (appeal entry, deferred, FD-088) |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-302 (`review.delete/restore/getDraft`, drafts with expiry/blocked), T-401 (blocks, thread), T-104 (public projection), T-102 (account menu, `/me/security` link) (T-404's `appeal.file` is not used, FD-088), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-405, T-406–T-408, T-410 (the data-request buttons call T-410 actions; stub with a disabled state until T-410 lands and note it) |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`, `Reveal`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-409 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Read first, Owned paths, the motion step and the acceptance checks.

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-088 — workspace appeal sheet deferred** — **Not in scope (FD-088):** `AppealPanel`, `AppealSheet`, the `fileAppeal` action, step 5, the `moderation.myAppealable` query and the appeal entry in step 2, and the dependency on T-404's `appeal.file`. They become follow-up tasks after release 1, because appeals are deferred. `/me` shows no appeal control, and the moderation notices it links to name no appeal route. Everything else in the workspace stays. Changes: Story row, Goal, Depends on, Owned paths, step 2, step 5 and the acceptance and test rows.

## Goal

Port `/me` (published and drafts tabs with real edit/follow-up/delete/restore/continue actions, (the appeal panel is deferred, FD-088), preferences, feedback, data requests), `/saved`, the public author profile `/authors/{username}` with the allowlisted projection and `noindex`, and a blocked-users list — all reading from the real account, review, community and identity queries.

## Read first

1. `docs/implementation/01-conventions.md` §6–§9
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/me`, `/saved`, `/authors/{username}`), §4 "account" (`updatePreferences`, `submitFeedback`), "review" (`saveDraft/getDraft/delete/restore/addFollowUp`), "community" (`block.*`, `blockedList`), "identity" (`publicProjection`), "moderation" (`appeal.file`), "data-requests"
3. `docs/design/auth-screens-spec.md` §3.6 (security nav link in `workspaceNav`)
4. Prototype: `app.js` 1609–1744 (`renderMine` — tabs, published item with badges/byline/actions/delete note, deleted tombstone with restore, drafts with expiry badge/blocked badge/continue/delete, `a-head` with display · username + `person.viewPublic` + joined, the appeal `.panel` with `.kv`, preferences `.sub` with `pref-lang`, feedback `.sub`, data `.sub`), 1811–1823 (`renderSaved`), 1843–1851 (`workspaceNav`), 1852–1888 (`renderPerson`), 2485–2501 (`openAppeal`), handlers 2615–2668 (`data-del-pub`, `data-restore-pub`, `data-del-draft`, `#open-appeal`, `#ap-send`, `#user-feedback-send`, `#user-data-export/delete`, `#pref-lang`, `data-mine`, `data-person`); fixtures `RK.user` (drafts `dr1` 22 d, `dr2` 4 d blocked; bookmarks r6, r9); `styles.css` (FD-091: only to see which class names T-011 kept; do not copy its rules) `.mine-item`, `.mine-tabs`, `.mine-subtabs`, `.mine-actions`, `.row-flags`, `.excerpt`, `.saved-flag`, `.about-head`, `.index-list`
5. `docs/implementation/05-demo-storyboard.md` step 26; step 7

## Owned paths

- `apps/web/src/app/[locale]/(patient)/me/page.tsx`, `saved/page.tsx`, `authors/[username]/page.tsx`
- `apps/web/src/components/patient/Workspace.tsx`, `WorkspaceNav.tsx`, `MineItem.tsx`, `DraftItem.tsx`, (`AppealPanel.tsx` and `AppealSheet.tsx` are not built, FD-088), `PreferencesPanel.tsx`, `FeedbackPanel.tsx`, `DataRequestsPanel.tsx`, `BlockedUsers.tsx`, `Saved.tsx`, `PublicProfile.tsx`
- `apps/web/src/server/actions/workspace.ts` (`deleteReview`, `restoreReview`, `deleteDraft`, `updatePreferences`, `submitFeedback`, `unblock`), (`actions/moderation.ts` `fileAppeal` export deferred, FD-088)
- `apps/web/src/components/patient/*.test.tsx`
- `apps/web/src/styles/patient.css` — FD-091: append-only in this Unit's section, each rule marked `/* added: T-409 reason */`, using T-011 tokens only
- `packages/i18n/messages/{en,bn}.json` — `mine.blocked`, `mine.unblock`, `mine.blockedNote`, `mine.followUps` (if the badge text needs a proper key instead of lower-casing `label.followUp`)

## Not in scope

`/me/security` (T-102), `/notifications` (T-405), the composer (T-306), export/delete execution (T-410 — you render the buttons/callouts and call its actions), the appeal decision (T-404).

## Steps

1. **`WorkspaceNav`**: `.mine-tabs` nav with `nav.mine`, `mine.bookmarks`, `mine.notifications`, plus `auth.security.nav` (auth spec §3.6) as `<Link aria-pressed>`s.
2. **`/me` page** → `Workspace` (server): `a-head` kicker `display · username`, H1 `mine.title`, `person.viewPublic` link to `/authors/{username}`, joined line (`formatMonthYear`); `WorkspaceNav('mine')`; `.panel` with `.mine-subtabs` (published `n`, drafts `n` — `?tab=` query, default published) and the list; then `PreferencesPanel` (the `AppealPanel` and the `moderation.myAppealable` query are deferred, FD-088), `FeedbackPanel`, `DataRequestsPanel`, `BlockedUsers`.
3. **`MineItem`** (published): `.row-flags` sentiment badge (or none when not provided — never `0`), outcome badge (or `label.notProvided`), follow-up count badge; title; `Byline(r,'mine')` showing how it is attributed (named/username/anonymous alias); note line doctor link · period · posted; actions: **Read** → `/experiences/{publicId}`, **Edit** → `/write?draft=<new draft from published>` (`review.beginEdit` — T-302 exposes `saveDraft {reviewId}`; use it), **Add follow-up** → `/write?draft=…&followUp=1`, **Delete** → `deleteReview` (confirm via `Sheet`, not `window.confirm`); `mine.deleteNote` under. Deleted state (within `restore_until`): `mine.deleted` badge, title, note, **Restore** → `restoreReview`; after `restore_until` the item disappears (query filters).
4. **`DraftItem`**: expiry badge (`mine.draftExpires {n} mine.days`, `warn` when ≤ 7), blocked badge when `blocked_on_submission_id` (`compose.addPending` shortened — replace the prototype's `.slice(0,40)` hack with a proper key `mine.draftBlocked`: "Waiting for the doctor profile to be checked" / "ডাক্তার প্রোফাইল যাচাইয়ের অপেক্ষায়"), title (or `Untitled — started {date}` via key `mine.untitled`), excerpt (first 140 graphemes of the draft body — decrypt through `review.getDraft`, server-side only), **Continue** → `/write?draft=`, **Delete** → `deleteDraft`.
5. **Deferred, not built in release 1 (FD-088).** `AppealPanel` + `AppealSheet`: `.kv` action / policy reason / `report.identityNote → appeal.noReporter`; **Appeal** button → sheet (`appeal.title`, `.kv`, warn callout `appeal.noReporter`, textarea `appeal.text`, `appeal.target`, submit `appeal.button`) → `fileAppeal` → `appeal.sent`.
6. **`PreferencesPanel`**: `user2.preferences` + note; language `.opt` toggle → `updatePreferences {interfaceLocale}` then navigate to the same path under the other locale (cookie set by the action).
7. **`FeedbackPanel`**: textarea + **Send** → `submitFeedback` → `.saved-flag` `user2.feedbackSent`; rate-limit error mapped.
8. **`DataRequestsPanel`**: `user2.data`, note, **Export** → T-410 `requestExport`; **Delete** → T-410 `requestDeletion` (opens its plan sheet); `user2.dataCallout`; status line from `dataRequest.status` (`ready` → download link `/api/data-requests/{id}/download`).
9. **`BlockedUsers`**: `.sub` `mine.blocked`, list of usernames with **Unblock**; `mine.blockedNote`.
10. **`/saved`** → `Saved`: `indexHead(nav.mine, mine.bookmarks, mine.bookmarkNote)`, `WorkspaceNav('saved')`, `.index-list` of `AccountRow` (T-307's row component) for `review.bookmarksOf(actor)`; empty `mine.empty`; `noindex`.
11. **`/authors/[username]`** → `PublicProfile` (public, `noindex`, `generateMetadata` title = display name): `identity.publicProjection` by username → 404 if none or if the account is deleted-and-deidentified? **No** — de-identified snapshot still renders (storyboard 26) with the snapshot display name; sections: `about-head` kicker `person.kicker`, H1 display name, byline identity (`byline.identity.named|pseudo`), `person.noindex` lead; `.panel` `person.allowlist` + note; `person.contributions {n}` → `AccountRow`s from `review.publicByPersona` (published, non-anonymous personas of that username only); `person.comments {n}` → `Comment` (T-402) in read-only reply style for public comments by those personas; empty states `person.empty`. **Assert**: r2 (anonymous) never appears on any public profile, and `/authors/anon_author_r2` lists none; drafts/bookmarks/notifications never queried.
12. **Tests**: tabs; deleted → restore; draft expiry warn ≤ 7; blocked badge; preferences toggles locale (the appeal sheet test is deferred, FD-088); public profile excludes anonymous; noindex metadata on `/me`, `/saved`, `/authors/*`; both locales.
13. `impeccable detect`, `pnpm check`; hand-off.
14. **Motion (FD-091).** Wrap `/me`, `/saved` and `/authors/{username}` in `RouteTransition`. The published, drafts and saved lists use `Reveal` (stagger capped at 6 items); switching tabs is a fade. Delete and restore swap the item state at once, with a plain text confirmation. No streaks, activity counts or badges (AC2.4.5).

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Storyboard 26 (first half) | manual as `shirin_88` | published/drafts tabs with `dr1` 22 d and `dr2` blocked; delete r1 → deleted state → restore |
| Storyboard 7 | manual signed out | `/authors/shirin_88` lists r1 + public comments; `/authors/anon_author_r2` shows no accounts; `<meta name="robots" content="noindex">` |
| Follow-up count | component test | badge shows count with Bengali numerals in `bn` |
| Appeal | deferred, FD-088 | not run in release 1 (appeals are a follow-up task) |
| FD-088: no appeal control | render `/me` as `r_ahmed` (owner of r4, the content MOD-2011 decided) | no appeal panel, button or `/appeal` link appears, and no appeal route is named in any notice text |
| Preferences | manual | toggle → page reloads in the other locale; `account_preferences.interface_locale` updated |
| Feedback | manual | flag shows; row in `feedback` |
| Design checks | `impeccable detect` | clean |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |

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
