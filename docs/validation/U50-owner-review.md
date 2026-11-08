# U50 owner review (release 1)

Status: ready for the owner's walk once the Unit is built. The agent never ticks a box, never fills
an observed result for the owner and never closes an item; only the owner does (BR12.1). The list
is complete for what is merged on `main` at `c6153fa` (all nine release-1 dependencies, U41
included); the lists in OR4, OR6 and OR7 are checked again against the final `main` at Build and
Test. Each item is a few minutes (about 1 hour 50 minutes in all) and can be done in any order, at
any time; none blocks the build.

How to walk: start the demo with `pnpm demo` (see [DEMO.md](../../DEMO.md)); it prints the banner
with the links. Web: <http://localhost:3000/bn> and <http://localhost:3000/en>. Mail: Mailpit at
<http://localhost:8025>. Accounts and password are in DEMO.md. Use the browser's device mode for
360 px, and the theme switch in the page header for light and dark.

A finding becomes an ISS row with Found in `U50 owner review`. Write it in
[ISSUES.md](../implementation/ISSUES.md) (or tell the agent) and put the id in the Findings column.

| Id | Item | Languages | Themes | Widths | About | Done | Findings |
|---|---|---|---|---|---|---|---|
| OR1 | FD-053 content review of the T-102 screens | en, bn | light, dark | 360 px | 25 min | [ ] | |
| OR2 | FD-091 look review of the same screens | en, bn | light, dark | 360 px | 15 min | [ ] | |
| OR3 | U45 look review of the restyled patient shell | en, bn | light, dark | 360 px and desktop | 10 min | [ ] | |
| OR4 | Storyboard walk of Parts 1 to 4 with the FD-042 Bengali copy review | bn, then en | light | desktop, and 360 px for Part 1 | 30 min | [ ] | |
| OR5 | Demo-slice items | bn, en | none | none | 10 min | [ ] | |
| OR6 | Sign-offs written by an agent under the delegation of 2026-11-04 | none | none | none | 10 min | [ ] | |
| OR7 | FD rows that await your confirmation | none | none | none | 10 min | [ ] | |

## OR1 FD-053 content review of the T-102 screens

Open, in `bn` and then `en`, at 360 px, in light and dark. Read the words, not the look: is the
meaning right, is the tone calm, is anything missing or too long?

- [ ] Register: `/{locale}/register` (fields, age and terms, error summary, the written-for-everyone notes).
- [ ] Verify email: `/{locale}/verify-email` pending screen after registering (Mailpit holds the mail); the confirm panel from the mailed link; the done notice; the expired-link screen (open an old link twice).
- [ ] Sign in: `/{locale}/sign-in`, plus its notices: suspended account, `?reset=done`, `?signedOut=all`.
- [ ] Reset password: `/{locale}/reset-password` (request, sent, new password, mismatch).
- [ ] Security page: `/{locale}/me/security` signed in (masked address, sessions, change password, sign out everywhere).
- [ ] Account menu in the header, signed in and signed out.
- [ ] The write gate (`/{locale}/write` signed out) and the comment gate (an experience page signed out).

## OR2 FD-091 look review of the same screens

The same pages as OR1, same languages, themes and width. Judge the look only: spacing, type size,
contrast, focus rings, Bengali line breaks, motion that feels right or too much.

- [ ] Register, verify-email, sign-in, reset-password, security page, account menu, gates, in `bn` and `en`, light and dark, 360 px.

## OR3 U45 look review of the restyled patient shell

Home `/{locale}`, a doctor profile (`/{locale}/doctors`, first entry), an experience
(`/{locale}/experiences`, first entry) and the composer (`/{locale}/write`, signed in), at 360 px
and desktop, light and dark, `bn` and `en`.

- [ ] Home
- [ ] Doctor profile
- [ ] Experience
- [ ] Write (composer)

## OR4 Storyboard walk with the FD-042 Bengali copy review

Walk Parts 1 to 4 of [the storyboard](../implementation/05-demo-storyboard.md) in `bn` first, then
`en`, at desktop width in the light theme; Part 1 also at 360 px. Steps that depend on release 2
are marked in [U50-walkthrough.md](U50-walkthrough.md) and are skipped. While walking, read the
Bengali strings added since the last owner review (FD-042). The keys below are the 184 keys in
`packages/i18n/messages/bn.json` that were not there on 2026-10-27, taken from the repository
(ASSUMPTION(U50): that date is the start of the unattended run; regenerate against the last review
you remember if it was later). Each key is found in the page that uses it; searching the key name in
`packages/i18n/messages/bn.json` shows the text.

- [ ] Part 1, `bn`, desktop
- [ ] Part 1, `bn`, 360 px
- [ ] Part 2, `bn`
- [ ] Part 3, `bn`
- [ ] Part 4, `bn`
- [ ] Parts 1 to 4, `en`
- [ ] The Bengali key list below is read and approved, or changes are listed in Findings

Bengali keys added since 2026-10-27, by area:

- a11y (4): `a11y.announce.language`, `a11y.announce.themeDark`, `a11y.announce.themeLight`, `a11y.announce.view`
- auth (23): `auth.gate.commentBody`, `auth.gate.unavailable`, `auth.reset.requestAgain`, `auth.security.deviceLabel`, `auth.security.deviceUnknown`, `auth.security.signOutAllConfirm`, `auth.security.signedOutAll`, `auth.verify.bodyNoEmail`, `auth.verify.confirmLede`, `auth.verify.confirm`, `auth.verify.startWriting`, `auth.verify.continue`, `auth.accountMenu`, `auth.steps.label`, `auth.steps.create`, `auth.steps.confirm`, `auth.steps.write`, `auth.steps.position`, `auth.showPasswordLabel`, `auth.hidePasswordLabel`, `auth.passwordShown`, `auth.passwordHidden`, `auth.accountMenuUnconfirmed`
- compose (36): `compose.chooseDoctor`, `compose.titleLabel`, `compose.previewEmpty`, `compose.edit.title`, `compose.edit.intro`, `compose.edit.save`, `compose.edit.versionNote`, `compose.addCancel`, `compose.addNote`, `compose.addSpecialtyNone`, `compose.bodyCount`, `compose.errorFields`, `compose.stepName.care`, `compose.stepName.story`, `compose.stepName.how`, `compose.stepName.check`, `compose.draftNotSaved`, `compose.publishNotSaved`, `compose.draftMissing`, `compose.drafts.title`, `compose.drafts.untitled`, `compose.drafts.saved`, `compose.drafts.expires`, `compose.drafts.continue`, `compose.drafts.discard`, `compose.drafts.discardConfirm`, `compose.exactDate`, `compose.exactDateNote`, `compose.target.doctor`, `compose.target.facility`, `compose.facilityStoryHint`, `compose.tagFree`, `compose.tagAdd`, `compose.tagsMax`, `compose.addBmdcPrivate`, `compose.anonNewDoctor`
- condition (6): `condition.kicker`, `condition.listCount`, `condition.experienceCount`, `condition.doctorCount`, `condition.countsLine`, `condition.countedFrom`
- disclaimer (1): `disclaimer.comments`
- discover (5): `discover.browseDoctors`, `discover.latestEmpty`, `discover.browseAll`, `discover.browseFacilities`, `discover.browseTopics`
- email (2): `email.security.severeSignInActivity.body`, `email.security.severeSignInActivity.subject`
- emergency (1): `emergency.compactLine`
- emergview (1): `emergview.bmdcShort`
- errors (12): `errors.auth.displayNameRequired`, `errors.auth.emailInvalid`, `errors.auth.passwordEqualsEmail`, `errors.auth.passwordTooLong`, `errors.review.anonymousNewDoctor`, `errors.review.missingDoctor`, `errors.review.missingRelationship`, `errors.review.missingStory`, `errors.review.missingTag`, `errors.review.periodInvalid`, `errors.review.missingBranch`, `errors.review.draftsFull`
- formErrors (18): `formErrors.auth.displayNameInvalid`, `formErrors.auth.emailInvalid`, `formErrors.auth.registrationRefused`, `formErrors.auth.rateLimited`, `formErrors.auth.rateLimitedSeconds`, `formErrors.compose.doctorRequired`, `formErrors.compose.relationshipRequired`, `formErrors.compose.periodInvalid`, `formErrors.compose.titleLength`, `formErrors.compose.bodyTooShort`, `formErrors.compose.bodyTooLong`, `formErrors.compose.identityRequired`, `formErrors.compose.newDoctorName`, `formErrors.compose.newDoctorSpecialty`, `formErrors.compose.newDoctorChamber`, `formErrors.compose.newDoctorBmdc`, `formErrors.profile.displayNameRequired`, `formErrors.profile.displayNameTooLong`
- ev (21): `ev.status.ready`, `ev.status.pending`, `ev.status.rejected`, `ev.note.count`, `ev.upload.hint`, `ev.upload.fileLabel`, `ev.upload.submit`, `ev.upload.uploading`, `ev.upload.listLabel`, `ev.upload.limitReached`, `ev.upload.pendingNote`, `ev.upload.rejectedNote`, `ev.upload.done.ready`, `ev.upload.done.pending`, `ev.upload.done.rejected`, `ev.upload.errors.signedOut`, `ev.upload.errors.notFound`, `ev.upload.errors.noFile`, `ev.upload.errors.tooLarge`, `ev.upload.errors.tooMany`, `ev.upload.errors.failed`
- experience (14): `experience.commentDeleted`, `experience.commentLength`, `experience.commentPosted`, `experience.editExperience`, `experience.outcomeLabel`, `experience.replyPost`, `experience.sentimentLabel`, `experience.signInToComment`, `experience.noComments`, `experience.discussionClosed`, `experience.threadTruncated`, `experience.deleteConfirm`, `experience.deleteCancel`, `experience.yourExperience`
- facility (8): `facility.listCount`, `facility.orderNote`, `facility.visitCount`, `facility.noVisits`, `facility.address`, `facility.notVerified`, `facility.notVerifiedWhy`, `facility.parentOf`
- index (3): `index.count`, `index.more`, `index.newest`
- label (3): `label.memberAdded`, `label.memberAddedWhy`, `label.notProvidedCount`
- mine (12): `mine.profile.experiences`, `mine.profile.heading`, `mine.profile.joined`, `mine.profile.languageNote`, `mine.profile.nameNote`, `mine.profile.nameSaved`, `mine.profile.posted`, `mine.profile.saveName`, `mine.profile.state.hidden`, `mine.profile.state.other`, `mine.profile.state.removed`, `mine.profile.usernameNote`
- notFound (2): `notFound.body`, `notFound.home`
- profile (8): `profile.experienceCount`, `profile.list.count`, `profile.list.orderNote`, `profile.noExperiences`, `profile.writeAbout`, `profile.showingCount`, `profile.filterRelationship`, `profile.noContributions`
- prov (1): `prov.updatedOn`
- review (2): `review.card.comments`, `review.card.documents`
- sentiment (1): `sentiment.ofTotal`

## OR5 Demo-slice items

- [ ] The Bengali text added on 2026-11-01: the add-a-doctor note, the form error summary, the character count, the facility page and the topic page (FD-100, FD-101). Open `/{locale}/write` (add a doctor), `/{locale}/facilities`, `/{locale}/topics`.
- [ ] ISS-398 as an accepted risk (FD-100): a member-added doctor is public at once, so a real person's name could appear next to a negative account before staff review. Accept, or ask for a change.
- [ ] ISS-330 decision: a taken username is named on its own field (usernames are public); only the used-email answer is neutral. Keep or change.
- [ ] ISS-384 decision: the library's public sign-up and sign-in routes are closed (see ISS-384 and FD-104). Confirm.

Details: [ISSUES.md](../implementation/ISSUES.md) rows ISS-330, ISS-384 and ISS-398, and
[OWNER-REVIEW-QUEUE.md](../aidlc-migration/OWNER-REVIEW-QUEUE.md).

## OR6 Sign-offs written by an agent

Each high-risk Unit needs your written sign-off (team practice step 5). These currently carry an
agent-written sign-off under your delegation of 2026-11-04, or a pending one. Read the record and
confirm or ask for more tests.

| Unit | Record | Done |
|---|---|---|
| U5 CR-006 (worker grants) | `docs/implementation/handoffs/CR-006.md` | [ ] |
| U8 T-101 (authentication) | `docs/implementation/handoffs/T-101.md` | [ ] |
| U9 T-102 (auth screens) | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-102-patient-auth-screens/` | [ ] |
| U11 T-104 (identity) | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-104-identity-module/code-generation/code-summary.md`, "Delegated sign-off" | [ ] |
| U41 T-502 (security hardening) | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-502-security-hardening/code-generation/code-generation-plan.md`, "Delegated sign-off" (merged on `main`, review-01 fixes at `729aaa2`) | [ ] |
| U48 evidence | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u48-evidence/` | [ ] |
| U49 comments | `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u49-comments/` | [ ] |

At Build and Test this table is checked against every Unit record that contains "Delegated sign-off"
and rows are added for any missing Unit.

## OR7 FD rows that await your confirmation

Decisions taken by the agent under your delegation of 2026-11-04 (or earlier delegations) that you
can still overturn. Copied from [decision-log.md](../status/decision-log.md); a row you disagree with
becomes an ISS row.

| Id | Decision (short) | Done |
|---|---|---|
| FD-092 | CR-006 rulings on the worker grants | [ ] |
| FD-093 | T-010 rulings on the import boundaries | [ ] |
| FD-098 | The worker reads the email message files | [ ] |
| FD-100 | Members add a missing doctor, shown at once as not confirmed | [ ] |
| FD-103 | Registering no longer signs the new account in | [ ] |
| FD-104 | The library's own HTTP routes are closed except `/api/auth/ok` | [ ] |
| FD-108 | A branch's own name and hue are stored beside its label | [ ] |
| FD-110 | FR46's "What went well / What could improve" checkboxes are deferred to release 2 | [ ] |
| FD-111 | Release-1 Reviewer's labels are the prototype's three suggested labels, stored as codes | [ ] |
| FD-112 | Facility visit accounts are named or pseudonymous only in release 1 | [ ] |
| FD-113 | The author persona is the actor of a review publish | [ ] |
| FD-114 | The author's own words may hold the Bengali joiners U+200C and U+200D | [ ] |
| FD-115 | A comment body follows the FD-114 rule for the author's own words (U49) | [ ] |
| FD-116 | The T-502 release-1 security posture (U41) | [ ] |
| FD-120 | The NFR13 measurement method and pass rule | [ ] |
| FD-121 | The release-1 verdict rule | [ ] |
| FD-122 | `/api/health` readiness | [ ] |

FD-115 and FD-116 were added at Code Generation Step 51, after U49 and U41 merged; the decision log
holds no other FD row from U22, U48 or U49 that awaits confirmation. At Build and Test the list is
checked again against the final `main`.

The automated runs behind OR4 (each storyboard step and locale) are in
[U50-walkthrough.md](U50-walkthrough.md), Observed and Evidence columns; they do not replace the
owner's walk.

## Findings

| ISS | Item | Summary |
|---|---|---|
| | | |
