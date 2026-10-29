# Frontend components — U31 `t-402-discussion-ui`

Component contracts for the discussion on `/{locale}/experiences/{publicId}` and on a review tombstone: hierarchy, files, props, state, interaction, styles and tests. Rules are cited by id from `rules.md`, and shapes from `entities.md`.

## 1. Hierarchy

```text
app/[locale]/(patient)/experiences/[publicId]/page.tsx   (T-307; + one hunk: loadDiscussion, BR1.1)
└── ExperiencePage | Tombstone (T-307; + one hunk each: pass DiscussionVM, mount buttons)
    ├── ActionsRow (T-307)                     review-level: ReactionPair(review) + ReportButton (T-307's until T-403) + BookmarkButton
    │                                          + p.note review.reactionNote + p.note experience.bookmarkNote
    └── DiscussionSlot (T-307; + count prop)   section > h2 experience.discussion span.count + p.note experience.providerNote
        └── Discussion (server)                 this Unit
            └── DiscussionState (client)        context: replyingTo, editing, justPosted
                ├── div.callout.warn.discussion-advice[data-static=notice]  experience.commentHint   (BR3.1)
                ├── div.thread | p.note mine.empty
                │   └── Comment (client) × n    article.comment[.flagged|.pending|.tombstone]
                │       ├── div.comment-head    Byline(variant comment) + badges + edited + time
                │       ├── callout.danger | p.note commentPending
                │       ├── p.comment-body | CommentEditor (client)
                │       ├── p.note.link-warning[data-static=notice]
                │       ├── div.comment-actions ReactionPair(comment) · Reply · Edit · Delete · ReportButton
                │       ├── ReplyBox (client)
                │       └── div.comment-replies > Comment × n (isReply)
                ├── p.note experience.replyLevel
                └── CommentComposer (client) | gate button | disabled composer   (absent when thread.open = false)
```

## 2. Files

| File | Change | Owned path |
|---|---|---|
| `components/patient/discussion/Discussion.tsx` | new, server | yes (task: `Discussion.tsx`) |
| `components/patient/discussion/DiscussionState.tsx` | new, client context | addition, recorded |
| `components/patient/discussion/Comment.tsx` | new, client | yes |
| `components/patient/discussion/CommentComposer.tsx` | new, client (the task puts it in `Discussion.tsx`; a client form needs its own file) | addition, recorded |
| `components/patient/discussion/ReplyBox.tsx`, `CommentEditor.tsx` | new, client | yes |
| `components/patient/discussion/ReactionButton.tsx` | new, client; exports `ReactionPair` | yes |
| `components/patient/discussion/BookmarkButton.tsx` | new, client | yes |
| `components/patient/discussion/ReportButton.tsx`, `report-context.tsx` | new, client (Question 13) | addition, recorded |
| `components/patient/discussion/discussion-test-support.ts` | builders; test category, no coverage | test file |
| `components/patient/discussion/*.test.tsx`, `discussion.smoke.test.tsx` | tests | yes |
| `lib/discussion-vm.ts` | `DiscussionVM`, `CommentFormState`, `ActionOutcome`, `INITIAL_COMMENT_FORM_STATE` (types and one constant; web-shared) | addition, recorded |
| `server/actions/community.ts` | new `'use server'`: `postComment`, `editComment` (form actions), `deleteComment`, `setReaction`, `setBookmark` | yes |
| `server/actions/community.test.ts` | action tests | yes |
| `app/[locale]/(patient)/experiences/[publicId]/discussion-data.ts` (+ test) | `loadDiscussion` (element web) | addition, recorded (Question 6) |
| `app/[locale]/(patient)/experiences/[publicId]/page.tsx` | one hunk: call `loadDiscussion`, pass the result | T-307's file; hunk noted in the hand-off |
| `components/patient/experience/ExperiencePage.tsx`, `Tombstone.tsx`, `ActionsRow.tsx`, `DiscussionSlot.tsx` | hunks: pass `discussion`, mount `Discussion`, `ReactionPair`, `BookmarkButton`; `count` prop on the slot | T-307's files; the task's "only the lines that mount"; hunks noted |
| `app/pages.test.tsx` | the experience row's harness mocks `loadDiscussion` | T-010's file, harness only |
| `styles/patient.css` | T-402 section, appended (§ 7) | yes |
| `packages/i18n/messages/{en,bn}.json` | four keys (ENT-014) | addition, recorded |
| bookmark backend (`functional-spec.md` § 7) | contracts, application, database, test-support, container hunk | additions, recorded (Question 4) |

## 3. Props and state

| Component | Kind | Props | State | Renders |
|---|---|---|---|---|
| `Discussion` | server | `discussion: DiscussionVM`, `viewer: Viewer`, `locale`, `now: string` (request time, ISO) | — | the advice callout, thread or empty line, `replyLevel` note, the composer area per BR4.1, BR4.7, BR6.1 |
| `DiscussionState` | client | `children` | `ThreadUiState` (ENT-008) | context `{replyingTo, editing, justPosted, openReply, openEdit, close, markPosted}`; opening one closes the other |
| `Comment` | client | `item: CommentVM \| CommentTombstoneVM`, `isReply`, `reviewPublicId`, `open: boolean`, `viewer`, `now` | reads `DiscussionState` | BR2.1–BR2.8, BR2.11; wraps the article in `Reveal as="div"` per BR7.1; `tabIndex={-1}` and focus when it is `justPosted` |
| `CommentComposer` | client | `reviewPublicId`, `viewer` | `useActionState(postComment, INITIAL)` | BR4.1, BR4.2, BR4.6, BR6.1 (gate button, disabled textarea) |
| `ReplyBox` | client | `parent: CommentVM`, `reviewPublicId` | `useActionState(postComment)` | BR4.3, BR4.6; `Reveal as="div"` (BR7.2) |
| `CommentEditor` | client | `comment: CommentVM` | `useActionState(editComment)` | BR4.4, BR4.6; `Reveal as="div"` |
| `ReactionPair` | client | `target: {kind: 'review' \| 'comment', publicId}`, `counts: ReactionCountsVM`, `variant: 'review' \| 'comment'`, `disabled?` (pending comment) | `useOptimistic(counts)`, `useTransition` | review: two `button.react` with `b` counts; comment: two `button.link-btn[data-press]` "Like 3"; BR5.1–BR5.4 |
| `BookmarkButton` | client | `reviewPublicId`, `saved: boolean \| undefined` | `useOptimistic` | `button.react[aria-pressed]` BR5.5 (signed out: `saved` undefined, pressed false, gate on press) |
| `ReportButton` | client | `target: {kind, publicId}`, `className` | reads `ReportSheetContext` | BR6.3 |

Every client component reads copy through `useTranslations` and numerals through `formatNumber(n, locale)`. `useAnnounce()` (CR-004) carries the live messages. `guard` comes from T-102's `useAuthGate()`.

## 4. Interaction by state

| Viewer | Composer area | Reply | Like / Dislike | Save | Report | Edit / Delete |
|---|---|---|---|---|---|---|
| signed out | `button.btn.small` `auth.gate.title` → sign-in sheet | gate | gate, nothing recorded | gate | gate | absent |
| unconfirmed | textarea disabled + `auth.gate.verifyToAct`; Post → confirm sheet | gate (confirm sheet) | gate | gate | gate | absent (they own no comment) |
| confirmed | composer form | opens `ReplyBox` | toggles (BR5.1) | toggles | sheet (T-403) or `aria-disabled` until then | own comments only (`canEdit`) |
| any, tombstoned review | absent | absent | as above | — (no actions row) | as above | as above |
| author of a pending comment | as confirmed | absent on it | absent on it | — | absent on it | Edit, Delete |

Keyboard: every control is a native `button` or `textarea`. Opening a reply box or editor moves focus into its textarea. Cancel returns focus to the button that opened it. After a post, focus moves to the new comment. After a delete, focus moves to the thread's first focusable element after the removed position, or the discussion heading if there is none.

## 5. Server actions (`server/actions/community.ts`, `'use server'`)

```text
postComment(prev: CommentFormState, form: FormData)      // reviewPublicId, parentPublicId?, body
   -> CommentPostInput.safeParse -> getActor -> container.community.postComment -> {status:'done', publicId, nonce} | {status:'error', messageKey, minutes?}
editComment(prev, form)                                   // commentPublicId, body -> comment.edit
deleteComment(commentPublicId: string)                    -> ActionOutcome<{}>
setReaction(input: {targetKind, targetPublicId, value})  -> ActionOutcome<ReactionCountsVM>  (re-reads reactionsOf after the write)
setBookmark(input: {reviewPublicId, saved})               -> ActionOutcome<{saved}>
```

Each one is wrapped per BR1.4 and revalidates per BR1.3. A reaction or bookmark button sits in a `<form>` whose hidden fields carry the same values, so a no-JavaScript submit works (Question 18). The form posts through a thin form-action variant of the same function.

## 6. Motion (FD-091, T-011 hooks only)

| Moment | Hook | Reduced motion |
|---|---|---|
| A new comment appears | one-child `Reveal as="div"` around the article (BR7.1), skipped when it has a link warning or danger flag | appears at once |
| The reply box or editor opens | one-child `Reveal as="div"` (BR7.2) | appears at once |
| Press on any control | `.react` and `.btn` in T-011's list; `data-press` on `.link-btn` (BR7.3) | press state only |
| Delete, edit saved, reaction count change | none | none |
| Advice warning, link warning, danger callout | `data-static="notice"` (BR7.4) | never animated |

The page-level `RouteTransition` is T-011's, in the patient layout. This Unit adds no `transition`, `animation`, `@keyframes`, `@starting-style` or `transform`.

## 7. T-402's section of `patient.css`

```css
/* ---------- T-402 discussion (FD-091; only T-011 tokens) ---------- */
/* added: T-402 the advice warning sits above the thread */
.discussion-advice { margin-block: var(--space-3) var(--space-4); }
/* added: T-402 six actions must wrap at 360 px (BR8.1) */
.comment-actions { flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
/* added: T-402 44 px targets for comment actions (BR8.1) */
.comment-actions .link-btn { min-block-size: var(--target); display: inline-flex; align-items: center; }
/* added: T-402 long words and pasted URLs wrap at 360 px */
.comment-body { overflow-wrap: anywhere; }
/* added: T-402 replaces the prototype's inline margin on the link note */
.comment .link-warning { margin-block-start: var(--space-2); }
/* added: T-402 replaces the prototype's inline margin on the danger callout */
.comment .callout.danger { margin-block-end: var(--space-3); }
/* added: T-402 Post and Cancel sit on one wrapping row */
.composer-box .actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); }
/* added: T-402 the heading count is quieter than the heading */
.discussion .count { font-weight: 400; font-size: var(--fs-small); color: var(--ink-faint); }
```

The block is written in Prettier's format, one declaration per line. Token names are confirmed against T-011's `tokens.css` at build time. If one is missing, the build opens an ISSUES row and does not add a token.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, jsdom), each in `en` and `bn`, inside the translation provider and T-102's `AuthGateProvider`, with builders from `discussion-test-support.ts`:

| Test | Asserts |
|---|---|
| reply absent on replies | no Reply inside `.comment-replies` (BR2.1) |
| reply prefill | k1-like parent (pseudonymous) → textarea starts `@rumana_h `; anonymous parent → empty; "Replying to" shows the alias (BR4.3) |
| edited | `editedAt` → "(edited)" or "(সম্পাদিত)" and a `time[datetime]` (BR2.2) |
| foreign comment | `canEdit: false` → no Edit or Delete (BR4.5) |
| tombstone | notice + replies, no byline or body (BR2.8) |
| signed-out composer | gate button present, no textarea; press opens the sheet with `auth.gate.body` (BR6.1) |
| unverified composer | textarea disabled, `auth.gate.verifyToAct` shown (BR6.1) |
| reaction | Like then Dislike → one pressed; the counts move by one; the announcement reads "Dislike 1" or "অপছন্দ ১" (BR5.1, BR5.2) |
| flagged and pending | `dangerFlag` → `.comment.flagged` + danger callout with `data-static`; `pendingReview` → the pending note, no Reply or reactions (BR2.6, BR2.7) |
| link warning | `hasExternalLink` → the warning; the body contains no `a` element (BR2.4, BR2.5) |
| advice warning | present for signed-out, confirmed and tombstone renders, outside any `[data-reveal-list]` (BR3.1, BR7.4) |
| read-only thread | `open: false` → no composer, no Reply (BR4.7) |
| Report | without a context, a confirmed viewer gets `aria-disabled="true"`; with a fake context, `open` gets `{kind: 'comment', publicId}` (BR6.3) |
| no private fields | the rendered DOM and the props hold no reporter, case or account field (BR2.10) |
| Bengali numerals | counts and the heading count render in Bengali digits under `bn` (BR9.1) |

Action tests (`community.test.ts`, container and `getActor` mocked): each action returns the mapped error for `community.reply_depth`, `community.blocked`, `rate_limited` (minutes computed), and `validation`. A thrown command becomes `internal` with a correlation id. Success revalidates the experience route. No log line carries the body.

Loader test (`discussion-data.test.ts`): the three reads run in parallel. An anonymous actor skips `bookmark.stateOf`. A tombstone skips `reactionsOf`.

Smoke (`discussion.smoke.test.tsx`, cumulative): the eight behaviours of BR9.2.

Application tests (`modules/account`, test-support fakes): set and unset are idempotent, there is `not_found` for an unknown or hidden review, unverified is refused, and `stateOf` answers only for the actor. Database integration test (`account.int.test.ts`, bookmark part): add twice gives one row, remove twice gives zero rows, and `hasBookmark` reflects both.
