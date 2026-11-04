# Frontend components — U47 `u47-reviews`

The patient look is FD-091's (T-011 tokens and motion, plain CSS, no animation library; `project.md` Code Style). The prototype stays the source of truth for content, block order and behaviour. Every string is a message key in `en` and `bn` (BR9.1). Components import no `database`, `adapters`, `test-support` or `node:` module. Server code reaches the module only through `container.ts`.

## 1. Hierarchy

```text
/{locale}/write  (write/page.tsx, server)
├── access != allowed → section.a-head (nav.compose, h1 compose.title, .lede compose.intro) + ContributionGate (U9)
└── allowed
    ├── DraftList (server; only without ?draft= and when drafts exist)
    └── Composer (client) ── ComposerVM, initial draft
        ├── StepRail  nav > ol.c-steps (4 buttons, aria-current)
        ├── #saved-flag (role=status; draftSaved | draftNotSaved | draftMissing)
        ├── FormErrorSummary (kept; publish refusals, one link per field)
        ├── StepCare        target .c-modes (facility only when on) · doctor select | NewDoctorFields · branch select
        │                   relationship OptionGroup · period select (period.ts) · exact date (private) · mode .c-modes
        ├── StepStory       title (optional) · story TextField | four section TextFields · TagPicker ×4 groups + Not sure
        │                   · SafetyChecks
        ├── StepHowItWent   doctor: sentiment OptionGroup · outcome OptionGroup · Reviewer's labels (3 toggles)
        │                   facility: nine crit.* OptionGroups (report reliability with crit.reportTrustNote)
        ├── StepCheck       identity OptionGroup (+ anonNote) · SafetyChecks · attestation boxes (confirm1–3, age)
        │                   · Publish · Save and finish later
        ├── PreviewAside    aside.c-side > section.panel.preview-card: ExperienceBody mode=preview | FacilityAccountRow (U46)
        └── div.callout.warn disclaimer.long (data-static="disclaimer")

/{locale}/experiences/{id}  (experiences/[id]/page.tsx, server)
└── ViewShell(view=account) > ExperiencePage (server)
    ├── PublishedNote (client; author with ?published=1 only)
    ├── article
    │   ├── ExperienceBody mode=page   kicker · h1.a-title · Byline variant=lead · Flags · ReviewerLabels
    │   │                              · p.story.story-lead | ol.chapters
    │   ├── ReviewHistory reviewPublicId        (slot → U22)
    │   ├── EvidenceSection reviewPublicId      (slot → U48)
    │   ├── AuthorTools (author only)            edit link → U22 route · AuthorEvidence reviewPublicId (current props)
    │   ├── CommentThread reviewPublicId         (slot → U49)
    │   ├── RelatedGrid relatedByCondition (always headed; empty note) · RelatedGrid sameDoctor (only when any)
    │   └── div.callout.warn disclaimer.long (data-static="disclaimer")
    └── aside.a-margin ExperienceMargin   period · published · doctor + NotVerified (+ MemberAdded) · tags · otherByAuthor

/{locale}/experiences  (experiences/page.tsx, server; loading.tsx static)
└── IndexHead (U46) · p.count index.count · Reveal .index-list > AccountRow ×n (U46) · Pager | empty index.beFirst + Write link

/{locale}/authors/{username}  (authors/[username]/page.tsx, server, noindex)
└── AuthorProfile   h1 @username (+ display name) · AccountRow ×n · Pager | empty profile.noContributions

/{locale}/me  (me/page.tsx: one call changed)
└── ProfileWorkspace (U9, unchanged) > OwnReviewList (OwnReviewVM[])
```

## 2. Files

| File | Kind | New / changed / deleted |
|---|---|---|
| `app/[locale]/(patient)/write/page.tsx` | server | rewritten (WF1) |
| `app/[locale]/(patient)/experiences/[id]/page.tsx` | server | rewritten (WF6); folder name kept |
| `app/[locale]/(patient)/experiences/page.tsx`, `loading.tsx` | server | rewritten; `loading.tsx` new |
| `app/[locale]/(patient)/authors/[username]/page.tsx` | server | placeholder replaced (WF8) |
| `app/[locale]/(patient)/me/page.tsx` | server | one call (recorded addition) |
| `components/patient/compose/{Composer,StepRail,StepCare,StepStory,StepHowItWent,StepCheck,NewDoctorFields,TagPicker,SafetyChecks,PreviewAside,DraftList}.tsx` | client (DraftList server) | new |
| `components/patient/compose/{composer-reducer,use-autosave,safety}.ts` | client logic | new; `safety.ts` pure |
| `components/patient/compose/{FormErrorSummary,OptionGroup,TextField}.tsx`, `period.ts` | shared | kept (U22's `EditForm` imports them) |
| `components/patient/compose/{ComposeForm,ComposePreview}.tsx` | — | deleted with their tests |
| `components/patient/experience/{ExperiencePage,ExperienceBody,Flags,ReviewerLabels,ExperienceMargin,RelatedGrid,PublishedNote,Pager,AuthorProfile}.tsx` | server (PublishedNote client) | new |
| `components/patient/experience/{Byline.tsx,people.ts,AuthorTools.tsx}` | shared | kept; `Byline` gains the alias form, `AuthorTools` gains `editHref` |
| `components/patient/experience/{ExperienceDetail,ExperienceIndex,ExperienceRow}.tsx` | — | deleted with their tests |
| `components/patient/comments/CommentThread.tsx` | async server | becomes the self-fetching slot. Today's markup moves unchanged to `CommentThreadView.tsx` |
| `components/patient/evidence/EvidenceSection.tsx` | async server | new slot. Uses the existing `EvidenceNote` |
| `components/patient/review-history/ReviewHistory.tsx` | async server | new slot |
| `components/patient/profile/OwnReviewList.tsx` | server | prop type `OwnReviewVM[]` |
| `server/actions/review.ts` | `'use server'` | the five new actions. `saveReviewEdit` kept for U22 |
| `styles/patient.css` (U47 section) | CSS | prototype classes on FD-091 tokens. New classes carry `/* added: U47 reason */` |

## 3. Pages

### 3.1 `write/page.tsx`

Props: `searchParams {doctor?, draft?, step?}`. The page awaits `getContributionAccess()` first. When the result is not `allowed`, it renders only the heading and `ContributionGate purpose="write"`, with `returnTo` built from the locale and the doctor parameter (BR8.1). Otherwise it loads `ComposerVM` (WF1) and passes `{vm, initialDraft?, initialStep}` to `Composer`. Metadata is `documentTitle('compose')`, indexable.

### 3.2 `experiences/[id]/page.tsx`

`loadExperience = cache(...)` is shared with `generateMetadata`. The page calls `notFound()` before any markup. It resolves `reviewId` once and calls `isReviewAuthor` once. It passes `{vm, reviewPublicId, isAuthor, published: searchParams.published === '1' && isAuthor}` to `ExperiencePage`. There is no `loading.tsx` under `[id]`, so the real 404 status is kept.

### 3.3 `experiences/page.tsx`

It reads the first `cursor` value, calls `listExperienceCards` and `countExperiences`, and redirects (307) on a bad cursor. `loading.tsx` is a static skeleton (the head and three rows) with a screen-reader status line and no shimmer.

### 3.4 `authors/[username]/page.tsx`

It calls `review.authorCards({username, cursor})` and renders `AuthorProfile`. `noindex()` is set in every case, and the status is 200 for an unknown username too (BR7.2).

## 4. Composer (client)

**State** (`composer-reducer.ts`): `{payload: DraftPayload, draftId?, step, save: {status: idle | saving | saved | failed, seq}, preview?: ExperiencePageVM | FacilityAccountVM, duplicate: boolean, publishing: boolean, errors: {fieldErrors, formError}}`. Toggles follow the prototype: a second press clears sentiment and outcome, labels and tags toggle, and target, mode, relationship and identity are single choices.

| Component | Props | Behaviour | Rules |
|---|---|---|---|
| `Composer` | `{vm: ComposerVM, initialDraft?, initialStep}` | Owns the reducer and `useAutosave`. Renders the rail, the current step, the preview aside and the disclaimer. The incoming step slides in the reading direction (T-011), and the outgoing step leaves at once. | BR8.2, BR8.11 |
| `StepRail` | `{step, onStep}` | `compose.step {n} compose.of 4` plus the step names. Every step is reachable. After a change, focus goes to the step's `h2[tabindex=-1]` and `useAnnounce()` reads the step. | BR8.2 |
| `StepCare` | `{payload, vm, onChange}` | Target switch (only when `vm.branches` is not empty). While the identity is anonymous, the `compose.addDoctor` toggle is disabled and `compose.anonNewDoctor` explains why (BR3.12). The doctor `select` with first option `compose.chooseDoctor`, preselected only from `?doctor=`. The `compose.addDoctor` toggle opens `NewDoctorFields`. Branch `select` for the facility target. Relationship, period (`period.ts` options), an optional exact date with `compose.exactDateNote` ("Only you see the exact date"), and mode (`compose.mode.quick`, `detailed` with hints). | BR3.4, BR8.8–BR8.10 |
| `NewDoctorFields` | `{value, specialties, onChange}` | Name (`compose.addName`), specialty (`compose.addSpecialty`, `addSpecialtyNone`), practice place (`compose.addChamber`), BMDC (`compose.addBmdc`, labelled "not shown publicly"), and the note `label.memberAddedWhy`. Choosing a listed doctor clears it. | BR3.11, BR8.9 |
| `StepStory` | `{payload, vm, onChange, duplicate}` | Optional title (`compose.titleLabel`). Quick: one story field with `compose.storyHint` and a grapheme counter (`compose.bodyCount`). Detailed: four fields (`compose.symptoms`, `diagnosis`, `treatment`, `after`). For a facility, a story with `compose.facilityStoryHint`. Then the `TagPicker` and `SafetyChecks`. | BR3.2, BR3.3, BR8.4 |
| `TagPicker` | `{group, suggested, value, onChange}` | Suggested chips (`.opt`, `aria-pressed`). A free-text input with Add, where Enter also adds. A typed chip carries `title = condition.provisional`. Not sure is its own chip in the condition group. A counter shows the 20-tag limit. Each add and remove is announced. | BR3.3, AC5.3.2 |
| `SafetyChecks` | `{texts, numbers, duplicate, dismissed, onDismiss}` | Runs `safety.ts` (`pii`, `emerg`) and the server `duplicate` flag. Each finding is a static list item with its fix text and `compose.ignore`. With no findings it shows `compose.safetyPass`. The block never moves, and it is `data-static` when it holds an emergency finding. | BR8.4, BR8.11 |
| `StepHowItWent` | `{payload, onChange}` | Doctor: sentiment and outcome (`compose.optional`) and three `claim.*` toggles under `compose.claims` with `compose.claimsNote`. Facility: the nine `crit.*` choices `good`, `mixed`, `poor`, each optional. No score is shown anywhere. | BR3.8, BR8.10 |
| `StepCheck` | `{payload, names, onChange, onPublish, onSaveExit, errors, publishing}` | When the draft has a new doctor and anonymous is chosen, `compose.anonNewDoctor` shows under the identity choice with links to step 1 and to the named and pseudonymous options, and Publish stays disabled (BR3.12). Identity choice with the names (named: display name; pseudonymous: `@username`; anonymous with the reworded `compose.identity.anonNote`; facility shows no anonymous option). `SafetyChecks` again. The four attestation checkboxes. Publish stays disabled until all four are ticked, and its reason is linked through `aria-describedby`. `compose.saveExit`. | BR3.5, BR8.6, BR8.12 |
| `PreviewAside` | `{preview}` | `compose.preview`. Before the first save it shows `compose.previewEmpty`. At 360 px it follows the form inside a closed `details`, and it is open on step 4. It never contains the disclaimer. | BR8.5 |
| `DraftList` | `{drafts: DraftSummaryVM[]}` | "Your drafts". Each row shows the title or `compose.drafts.untitled`, the date it was saved and its expiry date (in the active language's digits), a Continue link to `?draft=`, and a Discard button (`compose.drafts.discard`, confirmed with `compose.drafts.discardConfirm`) that calls `discardDraftAction`. With 10 drafts, the new composer shows `errors.review.draftsFull` and asks the author to continue or discard one. | BR2.4, BR2.6 |

**`use-autosave.ts`**: debounces for 1.5 s and saves immediately on a step change. One save is in flight at a time. The retry backoff is 5, 15 and 30 s. A `beforeunload` prompt appears only while a save is pending or failed. Unmounting flushes the save. Autosave stops while publishing and after success (BR8.3).

**`safety.ts`** (pure, tested in both scripts): the phone pattern for `+880` or `01` followed by 9 digits, Latin or Bengali, with spaces or dashes allowed; the emergency words of the prototype in `en` and `bn`; and the configured numbers, which appear in the guidance text.

**Server actions** (`server/actions/review.ts`, every one reading `getActor()` and answering with message keys):

| Action | Calls | Answer |
|---|---|---|
| `saveDraftAction({draftId?, payload})` | `runCommand(c.review.saveDraft, …)` | `{ok, draftId, expiresAt}` or `{ok: false, messageKey}` |
| `discardDraftAction({draftId})` | `runCommand(c.review.discardDraft, …)` | `{ok}` or `{ok: false, messageKey}`; revalidates `/write` |
| `previewAction({draftId})` | `account.getOwnAccount`, `review.preview` | the VM, or an error key |
| `duplicateHintAction({draftId})` | `review.hasOwnReviewOfDoctor` | `{duplicate}` |
| `publishDraftAction({draftId, identityMode, attestation})` | `runCommand(c.review.publish, …)` | redirect to `/{locale}/experiences/{publicId}?published=1`, or `{fieldErrors, formError}`; `review.anonymous_new_doctor` → `errors.review.anonymousNewDoctor` on the identity field |
| `publishFacilityVisitAction(...)` | `facilityReview.publish` | redirect to `/{locale}/facilities/{branchPublicId}`, or errors |

`revalidatePath('/', 'layout')` runs after a publish, as today. Every action uses `c = getContainer()` and the existing `runCommand(command, raw)` from `server/command-call.ts`, which supplies the actor, the request and `c.ports` (§ 2.1 of `functional-spec.md`).

## 5. Experience components

| Component | Props | Behaviour | Rules |
|---|---|---|---|
| `ExperiencePage` | `{vm, reviewPublicId, isAuthor, published}` | Prototype block order (§ 1). The slots receive only `reviewPublicId`. `AuthorTools` is rendered only when `isAuthor`, with `editHref` only when `vm.reviewKind === 'quick'` (`ASSUMPTION(U47)`, removed by U22). | BR6.4, BR6.6 |
| `ExperienceBody` | `{vm, mode: page \| preview}` | Kicker `experience.episode`. The title as `h1` (page) or `h2` (preview), with `lang` when `contentLanguage` differs from the locale. `Byline`, `Flags`, `ReviewerLabels`, then the story or the `ol.chapters` with section headings (`compose.symptoms` and the others). It is a shared component, so the composer preview uses it as well. | BR5.2–BR5.5 |
| `Flags` | `{sentiment?, outcome?, relationship, period}` | The sentiment badge or `label.notProvided`, the outcome badge or `label.notProvided`, and the episode month and year. No numbers. | BR5.2, BR5.5 |
| `ReviewerLabels` | `{claims}` | Each label with the `label.reviewerLabel` prefix, then `claim.<code>` or the stored text, then `label.reviewerLabelWhy`. | BR5.3 |
| `Byline` (kept) | `{byline: PageBylineVM \| BylineVM, variant}` | Named: plain name. Pseudonymous: `@username` linking to `/authors/{username}`. Anonymous: `byline.anonSentence`, plus the alias on the page variant only. Never a link or initials for an anonymous author. | BR5.7 |
| `ExperienceMargin` | `{vm}` | The period, the published month (`byline.published`), the doctor link with `NotVerified` (U46) and `MemberAdded` when it applies, the tags (provisional ones as written), and `experience.otherAccounts` only when the list is not empty. | BR5.6, BR5.8 |
| `RelatedGrid` | `{title, cards, note?, alwaysShow}` | `Reveal` around U46's `AccountRow` (heading level 3). The condition grid is always headed and shows an empty note. The same-doctor grid appears only when it has cards. | BR5.8 |
| `PublishedNote` | `{}` | One `PublishTick`, `compose.publishedNote`, announced once, then a focus target on the page title. No confetti and no count. | BR8.7 |
| `Pager` | `{nextCursor?, isLaterPage, basePath}` | `index.more` and `index.newest` links. Works without script. | BR7.1 |
| `AuthorProfile` | `{header, cards, nextCursor?}` | `@username`, then the display name when present, then the cards or `profile.noContributions`. | BR7.2 |

## 6. Slots (C16; their props are frozen when U47 merges)

Each slot starts with the same call shape: `c = getContainer()`, `reviewId = await c.ports.unitOfWork.read((tx) => c.review.reviewIdForPublicId(tx, {publicId: reviewPublicId}))`, and on `null` it renders its empty state. `EvidenceSection` then reads the count through the `PublicEvidenceCount` binding in the container. `ReviewHistory` reads `c.review.lastEditedAt(tx, {reviewId})` in the same `read`. When U48, U49 and U22 take over, they keep this resolution and swap only the data source.

| Slot | Props | U47's internals | Handed to |
|---|---|---|---|
| `CommentThread` | `{reviewPublicId}` | `reviewIdForPublicId`, then `getActor()`, then the demo `comments.listComments(reviewId, accountId?)`, rendered by `CommentThreadView` as today. Null id gives no thread. An error gives `errors.common.internal` inside the slot. | U49 |
| `EvidenceSection` | `{reviewPublicId}` | `reviewIdForPublicId`, then `PublicEvidenceCount.countPublicEvidence(reviewId)`. A count above 0 renders `EvidenceNote` ("Documents attached — not medically validated" and the count). A count of 0 renders the heading with `label.noDocuments`. No file and no preview. | U48 |
| `ReviewHistory` | `{reviewPublicId}` | `reviewIdForPublicId`, then `review.lastEditedAt`, rendering `experience.edited` with the month and year, or nothing. | U22 |

## 7. Interaction and accessibility

- Focus moves to the step heading on each step change, to the summary on a refusal (each line links to its field), and to the title after a redirect to the page. Changes are announced through `useAnnounce()` (CR-004).
- Each control has a visible label. Groups are `fieldset` with a `legend`. Errors are tied to their fields with `aria-describedby`. The minimum target size is 44 px.
- Reduced motion (OS setting or the app switch) gives instant step swaps and no reveal. The disclaimer, the emergency guidance and the safety findings are static (`data-static`) and never covered by moving content.
- Numerals follow the active language. No capital-letter transform is applied to Bengali.
- Every page passes `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast` and `contrast:patient`.

## 8. Message keys (both languages, same commit)

- **New:**
  - `compose.stepName.{care,story,how,check}`, `compose.draftNotSaved`, `compose.draftMissing`
  - `compose.drafts.{title,untitled,saved,expires,continue}`, `compose.exactDate`, `compose.exactDateNote`
  - `compose.target.{doctor,facility}`, `compose.facilityStoryHint`, `compose.tagFree`, `compose.tagAdd`, `compose.tagsMax`, `compose.addBmdcPrivate`
  - `errors.review.{missingDoctor,missingRelationship,missingStory,missingTag,periodInvalid,missingBranch,anonymousNewDoctor,draftsFull}`, `compose.anonNewDoctor`, `compose.drafts.{discard,discardConfirm}`
  - `index.count`, `index.more`, `index.newest`, `profile.noContributions`
- **Reworded:** `compose.identity.anonNote` to "Readers see a name made for this thread only." / "পাঠকেরা শুধু এই আলোচনার জন্য তৈরি একটি নাম দেখবেন।" (BR8.12). The Bengali is flagged for the owner's bilingual review (FD-042).
- **Reused:** `compose.*` (existing 86), `claim.*`, `label.{notProvided,reviewerLabel,reviewerLabelWhy,notVerified,memberAdded,memberAddedWhy,noDocuments,edited}`, `byline.*`, `experience.*`, `crit.*`, `disclaimer.long`, `errors.common.*`, `errors.review.{minFields,attestationRequired}`.
