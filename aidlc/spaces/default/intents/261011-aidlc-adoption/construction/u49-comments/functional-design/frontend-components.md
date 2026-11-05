# Frontend components — U49 `u49-comments`

The discussion part of the experience page, behind U47's `<CommentThread reviewPublicId>` slot (C16). U49 owns `apps/web/src/components/patient/comments/` and `apps/web/src/server/actions/comments.ts`; it does not edit the page. Patient-side styles follow FD-091 (plain CSS, existing tokens and class names); no animation or icon library. Rules are in `rules.md` (BR5.*), workflows in `functional-spec.md` WF1–WF3.

## Hierarchy

```text
ExperiencePage (U47, unchanged)
└── CommentThread reviewPublicId                  async server, the slot (C16 props frozen)
    ├── CommentDisclaimer                         always first (BR5.1)
    ├── CommentThreadView thread access           server, markup moved by U47, now takes ThreadVM
    │   ├── CommentItem comment                   live comment or reply
    │   │   ├── Byline variant="comment"          U47's, from PersonaPublicVM (alias form for anonymous)
    │   │   └── CommentActions                    client: Reply toggle, DeleteCommentButton
    │   │       └── CommentForm parentPublicId    client, the reply box
    │   ├── CommentPlaceholder                    "Comment deleted" with its live replies
    │   └── note threadTruncated                  when truncated (BR3.6)
    ├── CommentForm                               client, when access = allowed
    └── ContributionGate purpose="comment"        U9's, when access is not allowed
```

Text version: the slot renders the disclaimer, then the thread view (items, each a comment with its replies or a placeholder with its replies, and the truncation note), then either the comment form or U9's gate.

## Components

| Component | Kind | Props | State and behaviour | Data |
|---|---|---|---|---|
| `CommentThread.tsx` | async server | `{reviewPublicId}` | Runs `community.getThread`; when `open`, awaits `getContributionAccess()`. Error → disclaimer + `errors.common.internal` note, never throws (BR5.5). A closed thread renders the disclaimer and `experience.discussionClosed`, no form and no gate (BR3.1). | `getContainer().community.getThread`, U9's `getContributionAccess` |
| `CommentDisclaimer.tsx` | server | — | The persistent, non-modal medical-advice disclaimer (`disclaimer.comments`) above the thread (BR5.1). | — |
| `CommentThreadView.tsx` | server | `{reviewPublicId, thread: ThreadVM, canContribute: boolean}` | Heading `experience.discussion`; items in VM order; empty → `experience.noComments`; `experience.replyLevel` note. | props only |
| `CommentItem` (in the view file) | server | `{comment: CommentVM, reviewPublicId, canContribute}` | `<article class="comment">`; byline with `formatDate(postedAt, locale)`; `experience.ownComment` badge when `mine`; body as text, never as HTML. | props only |
| `CommentPlaceholder.tsx` | server | `{replies: CommentVM[], reviewPublicId, canContribute}` | `<article class="comment tombstone">` with `experience.commentGone` and `experience.commentGoneWhy`; no author, no date, no actions; its replies below (BR3.3). | props only |
| `CommentActions.tsx` | client | `{reviewPublicId, commentPublicId, authorName, canReply, canDelete}` | Reply toggle opens a `CommentForm` with `parentPublicId`; focus moves into it and back to the toggle on close. `canReply` = `canContribute` and top-level (BR5.3); `canDelete` = `mine`. | — |
| `DeleteCommentButton.tsx` | client | `{reviewPublicId, commentPublicId}` | Confirm step (`experience.deleteConfirm`, `experience.deleteCancel`), then `deleteComment`; pending state disables the button; result announced through the CR-004 live region. | `deleteComment` action |
| `CommentForm.tsx` | client | `{reviewPublicId, parentPublicId?}` | `useActionState(postComment)`; textarea `maxLength` 2000, `required`; hint `experience.commentHint`; submit `experience.commentPost` (reply: `experience.replyPost`); on `done` clears and announces `experience.commentPosted`; on `error` keeps the typed body and shows the message key with `aria-describedby`. | `postComment` action |
| `ContributionGate` | U9 | `{purpose: 'comment', returnTo: '/{locale}/experiences/{reviewPublicId}'}` | Sign-in, confirm-email or unavailable states (U9 WF9). | U9 |

## Server actions (`server/actions/comments.ts`)

- `postComment(prev, formData)` → `CommentActionState`. Reads `reviewPublicId`, `parentPublicId`, `body`; `runCommand(community.postComment, …)`; maps errors: `validation` (body) → `experience.commentLength {min 1, max 2000}`, `community.reply_depth` → `errors.community.replyDepth`, `not_found` → `errors.common.notFound`, `rate_limited` → `errors.common.rateLimited`, `unauthenticated` and `forbidden` → `errors.common.forbidden` (the gate normally prevents both). Revalidates both locales on success.
- `deleteComment(prev, formData)` → `CommentActionState`. `runCommand(community.deleteComment, {commentPublicId})`; `not_found` → `errors.common.notFound`; success → `experience.commentDeleted`.
- The `CommentActionState` type stays as today. `requireAccount` and the demo `reviews`/`comments` bindings are no longer imported (BR6.1). No result carries an id other than a public id (BR4.1).

## Form validation

| Field | Client | Server (authoritative) |
|---|---|---|
| `body` | `required`, `maxLength=2000` | trim, NFC, 1–2000 code points (BR1.2) |
| `parentPublicId` | hidden, set only from a top-level comment | `PUBLIC_ID_RE`; live top-level comment of the same review (BR1.4) |
| `reviewPublicId` | hidden | `PUBLIC_ID_RE`; resolved and published (BR1.3) |

## Message keys

Reused (exist in en and bn): `experience.discussion`, `experience.replyLevel`, `experience.commentHint`, `experience.commentPost`, `experience.commentPosted`, `experience.commentDeleted`, `experience.commentLength`, `experience.commentGone`, `experience.commentGoneWhy`, `experience.ownComment`, `errors.community.replyDepth`, `errors.common.*`, U9's `auth.gate.*`.

`experience.replyPost` also already exists in both files and is reused. `errors.common.rateLimited` takes `{minutes}`; the action supplies it as `ceil(retryAfterSec / 60)` from the limiter's answer, formatted in the active language's digits (BR1.5).

New, added to `en.json` and `bn.json` in the same commit (BR5.4): `disclaimer.comments` (en "Comments are members' own experiences and views, not medical advice."; bn "মন্তব্যগুলো সদস্যদের নিজের অভিজ্ঞতা ও মতামত, চিকিৎসা-পরামর্শ নয়।"), `experience.noComments`, `experience.discussionClosed`, `experience.threadTruncated`, `experience.deleteConfirm`, `experience.deleteCancel`. The demo's `mine.empty` and `experience.signInToComment` uses in this folder go; the keys stay for their other callers.

## Accessibility and language

- The section is `aria-labelledby` its heading; each comment is an `article`; replies sit in `.comment-replies` and are announced as a list of replies.
- Every control is a native button or link, reachable by keyboard in reading order; the delete confirm returns focus to the comment.
- Status messages go through the CR-004 live region in the active language.
- Dates and any numerals follow the active language; no capital-letter transform in Bengali.
- No like, dislike, report, mention or edit control is rendered in release 1.

## Tests (en and bn)

Thread with comments, replies and a placeholder; empty thread; closed thread; truncated note; each gate state; own comment shows delete and others do not; a reply shows no reply button; form keeps the body on refusal; fallback on a query error with the disclaimer still shown. `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` clean.
