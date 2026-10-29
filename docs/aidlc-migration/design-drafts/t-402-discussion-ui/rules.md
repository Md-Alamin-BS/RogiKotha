# Business rules — U31 `t-402-discussion-ui`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U31), `unit-of-work-story-map.md` (US8.1, US8.2), `requirements.md` (FR22, FR72–FR75, FR77, FR78, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md`, `contract-summary.md` (C5, C9, C10), T-402 with its FD-091 amendment, T-401's task file, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §2–§8, and the upstream drafts (T-102, T-104, T-202, T-307, T-011, T-101). Workflows are in `functional-spec.md`, component contracts in `frontend-components.md`, and data shapes in `entities.md`.

Drafted 2026-10-29. Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question is answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29.

```yaml
rules:
  # 1. Data, ids and server round trips
  - id: BR1.1
    statement: "The experience route loads the discussion; components receive it as props and import nothing under server/ except server actions."
    category: constraint
    applies_to: "experiences/[publicId]/page.tsx (one hunk), discussion-data.ts, every component under components/patient/discussion/"
    trigger: "Rendering a live experience page or a tombstone"
    logic: "page -> await getActor() -> loadDiscussion(publicId, actor) = Promise.all(container.community.thread, container.community.reactionsOf({targetKind: 'review'}) (live page only), actor.kind = account ? container.account.bookmarkStateOf : skip) -> DiscussionVM -> ExperiencePage -> DiscussionSlot children -> Discussion; a failed Result is a programmer or infrastructure error and is thrown to the error boundary"
    violation: "A component importing container.ts, auth.ts, database or adapters fails pnpm lint (FD-093)"
    source: "Question 6, T-010 eslint.boundaries.mjs, T-101 server-action pattern"
  - id: BR1.2
    statement: "Only public ids cross into the browser and back; every action input is validated with the contracts schema before the command runs."
    category: constraint
    applies_to: "server/actions/community.ts, every form and button of the thread"
    trigger: "Any write"
    logic: "inputs carry reviewPublicId, parentPublicId, commentPublicId, targetPublicId; schema.safeParse(formData or args); invalid -> {ok: false, code: validation, messageKey: errors.common.validation}; the command resolves public ids inside its transaction"
    violation: "An internal uuid in a hidden field or a data attribute exposes the row id (T-301 F22, S2)"
    source: "Question 5, contract-summary.md privacy rules"
  - id: BR1.3
    statement: "The server is the source of truth: after every successful write the route is revalidated and the thread re-renders from ThreadVM; no client state mirrors comment bodies, deletions or counts."
    category: constraint
    applies_to: "server/actions/community.ts, DiscussionState"
    trigger: "A write returns ok"
    logic: "revalidatePath('/[locale]/experiences/[publicId]', 'page'); the client calls router.refresh() only when a JavaScript action finished without a navigation; the only optimistic value is a reaction's pressed state and counts while its action runs"
    violation: "A comment shown as posted, edited or deleted that the server did not store"
    source: "T-402 step 5, fact 15"
  - id: BR1.4
    statement: "Every action is parse -> getActor -> command -> outcome, with expected failures mapped to their message key and anything thrown turned into internal with a correlation id."
    category: constraint
    applies_to: "postComment, editComment, deleteComment, setReaction, setBookmark"
    trigger: "Each call"
    logic: "try { parse; actor = await getActor(); r = await container.<module>.<command>(input, actor); r.ok ? ok(value) : err({code, messageKey: errorMessageKey(code), minutes: retryAfterSec ? ceil(retryAfterSec/60) : undefined, correlationId}) } catch (e) { logger.error(allowlisted fields); err({code: internal, messageKey: errors.common.internal, correlationId}) }"
    violation: "A thrown error leaking a stack or message to the client; a raw code shown to a person"
    source: "T-402 Tests to write, 01-conventions.md §3, contract-summary.md common rules"
  - id: BR1.5
    statement: "The action logs no comment text and no identity: only the command name, error code and correlation id."
    category: constraint
    applies_to: "server/actions/community.ts"
    trigger: "Any log line"
    logic: "logger fields allowlist: action, code, correlationId; never body, username, persona, account or email"
    violation: "Private data in logs (team.md Review step 4, S1)"
    source: "team.md Way of Working step 4, 01-conventions.md logging"

  # 2. Thread rendering
  - id: BR2.1
    statement: "The thread renders top-level comments in the query's order, each followed by its replies one level under it; a reply never shows Reply."
    category: constraint
    applies_to: "Discussion, Comment"
    trigger: "Rendering ThreadVM"
    logic: "div.thread > for item in comments: Comment(item, isReply=false) > div.comment-replies > Comment(reply, isReply=true); Reply rendered only when !isReply AND item.canReply AND thread.open"
    violation: "A nested Reply button fails AC8.1.1 and smoke 'replies cannot themselves be replied to'"
    source: "AC8.1.1, AC8.1.6, tools/smoke.mjs 158-162"
  - id: BR2.2
    statement: "A comment's head shows the one Byline, then 'Claimed this profile' for a provider, 'Your comment' for the viewer's own, '(edited)' with the edit date, and the posted time."
    category: constraint
    applies_to: "Comment"
    trigger: "A live CommentVM"
    logic: "div.comment-head > Byline(author, variant='comment') + (providerHere ? Badge plain experience.providerHere) + (mine ? Badge plain experience.ownComment) + (editedAt ? span '(' t(experience.edited) ')' + time[dateTime=editedAt] formatDate) + time[dateTime=postedAt] postedLabel"
    violation: "A second byline implementation, or a provider shown with a special channel (FR22)"
    source: "Questions 8 and 9, T-202 Byline, T-307 BR3.1, AC8.1.5"
  - id: BR2.3
    statement: "The posted time is relative for seven days and a date after that, in the active language's numerals."
    category: policy
    applies_to: "Comment"
    trigger: "Rendering postedAt"
    logic: "age = now - postedAt (now = request time); age < 7 days -> formatRelative(postedAt, now, locale) ELSE formatDate(postedAt, locale)"
    violation: "Latin digits under /bn"
    source: "Question 9, FD-024"
  - id: BR2.4
    statement: "Mentions are marked only where the VM names them; the body is plain text and never parsed as HTML or auto-linked."
    category: constraint
    applies_to: "Comment (body)"
    trigger: "Rendering body"
    logic: "split body on the tokens '@' + m for m in mentions (first occurrence each, as the prototype); wrap each in span.mention; every other part is a React text node; no dangerouslySetInnerHTML; no anchor from user text"
    violation: "An injected tag or a clickable user URL (construction.md Security)"
    source: "Question 10, prototype commentHtml, T-401 hard-rule checklist"
  - id: BR2.5
    statement: "A comment with an external link shows the external-link warning under its text, never animated."
    category: policy
    applies_to: "Comment"
    trigger: "hasExternalLink = true"
    logic: "p.note.link-warning[data-static=notice] > span[aria-hidden] glyph + t(experience.linkWarning)"
    violation: "A link without the warning fails AC8.1.1 and FR74"
    source: "AC8.1.1, FR74, Question 10"
  - id: BR2.6
    statement: "A flagged comment stays visible to everyone with the strong warning above its text."
    category: policy
    applies_to: "Comment"
    trigger: "dangerFlag = true"
    logic: "article.comment.flagged > ... div.callout.danger[data-static=notice] > b t(report.dangerous) + t(experience.dangerWarning); the body follows"
    violation: "Dangerous advice shown with no warning (FR75; S1)"
    source: "Question 2, FR75, FD-017, C10 ModerationSignals"
  - id: BR2.7
    statement: "A comment hidden pending review is shown only to its author, with the pending note and no Reply or reactions."
    category: policy
    applies_to: "Comment"
    trigger: "pendingReview = true"
    logic: "article.comment.pending > head + p.note t(experience.commentPending) + body; actions = Edit, Delete only; T-401 never sends it to anyone else"
    violation: "A hidden comment visible to a reader breaks FR81's temporary hide (S1)"
    source: "Question 2, T-401 step 5, FR81"
  - id: BR2.8
    statement: "A deleted comment with replies is a tombstone: the gone notice and its replies only."
    category: policy
    applies_to: "Comment (tombstone branch)"
    trigger: "item.tombstone = true"
    logic: "article.comment.tombstone > p.note (b t(experience.commentGone)) + ' ' + t(experience.commentGoneWhy) + div.comment-replies > replies; no byline, body, time, counts or actions"
    violation: "Any deleted text or author on the tombstone fails AC8.1.4 (S1)"
    source: "AC8.1.4, FR72, smoke 179-190"
  - id: BR2.9
    statement: "The heading carries the visible-comment count and an empty thread says 'Nothing here yet'."
    category: policy
    applies_to: "DiscussionSlot (T-307, count prop), Discussion"
    trigger: "Every render"
    logic: "DiscussionSlot count = thread.visibleCount rendered span.count formatNumber; visibleCount = 0 -> p.note t(mine.empty) in place of the list; the count is never derived in the component"
    violation: "A count that disagrees with the list"
    source: "prototype renderAccount discussion heading, T-307 BR2.5"
  - id: BR2.10
    statement: "No reporter, moderation case or report count ever reaches the thread's DOM or props."
    category: constraint
    applies_to: "Every thread component and DiscussionVM"
    trigger: "Always"
    logic: "props are exactly the ENT-001..ENT-004 fields; the danger flag is a boolean; tests assert no field named reporter*, case*, report*Count"
    violation: "Reporter identity anywhere fails the hard rule (S1)"
    source: "PRODUCT.md hard rule, FD-086, task hard-rule checklist"
  - id: BR2.11
    statement: "An anonymous author appears only under the thread alias, and a de-identified one as 'Former member'; neither is a link or a mention target."
    category: constraint
    applies_to: "Comment, ReplyBox"
    trigger: "author.personaKind = anonymous OR author.formerMember"
    logic: "Byline renders the alias or byline.formerMember without a link (T-202, T-104); ReplyBox starts empty for them (BR4.3)"
    violation: "Linking an alias to a profile fails AC3.3.2 and FD-015 (S1)"
    source: "FD-015, AC3.3.2, T-104 Q15 B, Question 7"

  # 3. The persistent advice warning
  - id: BR3.1
    statement: "Every viewer sees the advice warning at the top of the discussion, signed in or not, on live pages and tombstones; it is non-modal and never animated."
    category: policy
    applies_to: "Discussion"
    trigger: "Every render"
    logic: "first child of Discussion: div.callout.warn.discussion-advice[data-static=notice] > p t(experience.commentHint); never inside a Reveal; the composer does not repeat it"
    violation: "No warning for a reader fails AC8.1.2 and FD-009 (S1)"
    source: "Question 1, AC8.1.2, FD-009, FD-017, AC2.4.4"

  # 4. Composer, reply, edit, delete
  - id: BR4.1
    statement: "The top-level composer is a labelled form that posts through postComment; an empty body is not sent."
    category: constraint
    applies_to: "CommentComposer"
    trigger: "A confirmed viewer on an open thread"
    logic: "form.composer-box[action=postComment] > label.sr-only[for] t(experience.commentBox) + textarea#new-comment[name=body][required][maxLength=COMMENT_BODY_MAX][placeholder=t(experience.commentBox)] + input[type=hidden name=reviewPublicId] + div.actions > button.btn.small[type=submit] t(experience.commentPost); trimmed empty -> prevent submit, focus the textarea"
    violation: "An unlabelled textarea (FR95) or a blank comment stored"
    source: "prototype data-post-comment, Questions 18 and 19, FR95"
  - id: BR4.2
    statement: "After a post, the form resets, the live region says 'Comment posted', the new comment is revealed once, and focus moves to it."
    category: policy
    applies_to: "CommentComposer, ReplyBox, DiscussionState"
    trigger: "postComment returns done"
    logic: "state.nonce changes -> form key resets; announce(t(experience.commentPosted)); DiscussionState.justPosted = publicId; after refresh, focus the new article (tabIndex=-1)"
    violation: "Focus lost to the body element after posting (NFR6)"
    source: "Question 11, CR-004 live region, NFR6"
  - id: BR4.3
    statement: "The reply box opens under its comment, prefilled with the author's @username when there is one, and posts with the parent's public id."
    category: policy
    applies_to: "ReplyBox"
    trigger: "Reply pressed on a top-level comment by a confirmed viewer"
    logic: "DiscussionState.replyingTo = id (closes any editor); div.composer-box.reply-box > p.note t(experience.replyingTo) b(name as the byline shows) + form[action=postComment] textarea#reply-text defaultValue = (author.profileUsername ? '@' + profileUsername + ' ' : '') + hidden parentPublicId + Post + Cancel (t(experience.replyCancel)); focus the textarea with the caret at the end"
    violation: "@alias prefilled (mentions a stranger, S2) or a reply posted at the wrong level"
    source: "Question 7, prototype replyBox, smoke 147-162"
  - id: BR4.4
    statement: "Editing replaces the comment's body with an inline editor prefilled with the current text; Save calls editComment and Cancel restores the view."
    category: policy
    applies_to: "CommentEditor"
    trigger: "Edit pressed on a comment with canEdit"
    logic: "DiscussionState.editing = id (closes any reply box); div.composer-box > label.sr-only t(experience.editComment) + textarea#edit-text defaultValue=body + Save (t(experience.saveComment)) + Cancel (t(experience.cancelEdit)); ok -> announce t(experience.commentSaved), editing = null"
    violation: "Edit offered on a foreign comment (smoke 167-170)"
    source: "prototype data-edit-comment, AC8.1.3"
  - id: BR4.5
    statement: "Edit and Delete appear only when canEdit is true; Delete acts at once and the thread re-renders with the tombstone or without the comment."
    category: constraint
    applies_to: "Comment, deleteComment"
    trigger: "Delete pressed"
    logic: "form[action=deleteComment] button.link-btn t(experience.deleteComment); ok -> announce t(experience.commentDeleted); the next render shows BR2.8 or nothing; no motion"
    violation: "Delete on a foreign comment, or a deleted body still visible"
    source: "Question 15, AC8.1.4, smoke 179-200"
  - id: BR4.6
    statement: "A failed write shows its message next to the form in the active language and keeps the text the person typed."
    category: policy
    applies_to: "CommentComposer, ReplyBox, CommentEditor"
    trigger: "state.status = error"
    logic: "p.error[role=alert][id] t(messageKey, {minutes: formatNumber(minutes)}) linked by aria-describedby; textarea keeps its value (the form is not reset); errors.community.blocked, replyDepth, mentionAnonymous, errors.common.rateLimited, validation, forbidden, notFound, internal"
    violation: "A lost draft or an English message under /bn (AC8.1.6)"
    source: "AC8.1.6, T-401 errors, 01-conventions.md §6"
  - id: BR4.7
    statement: "A tombstoned review's thread is read-only: no composer, no Reply and no gate button for posting."
    category: policy
    applies_to: "Discussion, Comment"
    trigger: "thread.open = false"
    logic: "composer area not rendered; Reply not rendered; Edit, Delete, reactions and Report stay"
    violation: "A composer whose every post is refused"
    source: "Question 14, T-401 comment.post (review must be published)"

  # 5. Reactions and Save
  - id: BR5.1
    statement: "Reviews and comments each show Like and Dislike with exact counts; only one can be pressed, and pressing the active one clears it."
    category: policy
    applies_to: "ReactionPair (review: .react buttons with b counts; comment: .link-btn with counts)"
    trigger: "A confirmed viewer presses Like or Dislike"
    logic: "next = (pressed == value) ? null : value; optimistic {likes, dislikes, mine} recomputed (switching moves one from the other); setReaction({targetKind, targetPublicId, value: next}); ok -> server counts replace the optimistic ones; error -> revert, announce t(messageKey)"
    violation: "Two pressed at once, or a double count (AC8.2.1, AC8.2.2)"
    source: "AC8.2.1, AC8.2.2, FD-062, prototype data-react"
  - id: BR5.2
    statement: "Every reaction button states its pressed state and its count, and the live region announces label and new count."
    category: constraint
    applies_to: "ReactionPair"
    trigger: "Render and after a press"
    logic: "button[aria-pressed] label + ' ' + b formatNumber(count); announce(label + ' ' + formatNumber(count))"
    violation: "A toggle without aria-pressed (FR95)"
    source: "T-402 step 6, FR95, CR-004"
  - id: BR5.3
    statement: "Reactions are presented as engagement only: no score, no ranking word, no animation of counts, and the engagement note stays under the review's row."
    category: constraint
    applies_to: "ReactionPair, ActionsRow hunk"
    trigger: "Always"
    logic: "no sum, ratio or percentage of likes and dislikes; review.reactionNote under the row; counts change without motion"
    violation: "A number standing for quality (PRODUCT.md hard rule, AC8.2.5, AC2.4.5)"
    source: "PRODUCT.md, AC8.2.5, AC2.4.5, owner counts-only answer"
  - id: BR5.4
    statement: "There is no list of who reacted."
    category: constraint
    applies_to: "ReactionPair"
    trigger: "Always"
    logic: "no control opens a reactor list; community.reactionsOf returns counts only"
    violation: "A reactor list could link an anonymous thread to a profile (FD-015)"
    source: "Question 3, FD-<next>"
  - id: BR5.5
    statement: "Save toggles the review's bookmark for a confirmed viewer, states its pressed state, and says that saved items are private."
    category: policy
    applies_to: "BookmarkButton"
    trigger: "Press"
    logic: "button.react[aria-pressed=saved] t(saved ? experience.bookmarked : experience.bookmark); optimistic flip; setBookmark({reviewPublicId, saved: !saved}); error -> revert + announce; p.note t(experience.bookmarkNote) after review.reactionNote"
    violation: "A Save that silently fails"
    source: "Question 4, T-402 step 7, prototype data-bookmark"

  # 6. Gate and report
  - id: BR6.1
    statement: "Every contribution control runs through the auth gate; signed out it opens the sign-in sheet, unconfirmed the confirm-email sheet, and nothing is recorded."
    category: constraint
    applies_to: "Reply, reactions, Save, Report, the composer and gate button"
    trigger: "Any press"
    logic: "onClick = guard(fn) (T-102); viewer.kind = anonymous -> composer replaced by button.btn.small t(auth.gate.title) calling guard; viewer unverified -> textarea disabled + p.note t(auth.gate.verifyToAct) + Post as gate button"
    violation: "A dead control, or a reaction recorded for a signed-out click (smoke 81-87)"
    source: "Question 20, auth-screens-spec.md §3.7, T-102 BR10.3, AC8.2.6"
  - id: BR6.2
    statement: "The server refuses every write from an anonymous, unconfirmed or restricted actor regardless of the UI, and the page shows that refusal's message."
    category: constraint
    applies_to: "server/actions/community.ts"
    trigger: "A no-JavaScript submit or a bypassed gate"
    logic: "commands keep requires authenticated + verifiedEmail (+ notRestricted for comments and reactions); the action returns the error; the form shows it (BR4.6)"
    violation: "An authorization bypass (construction.md Security)"
    source: "T-102 BR10.6, T-401 step 3, AC8.2.6"
  - id: BR6.3
    statement: "Every live comment, including the viewer's own, carries a Report trigger; until T-403 provides the sheet, a confirmed viewer sees it as unavailable."
    category: constraint
    applies_to: "ReportButton"
    trigger: "Render and press"
    logic: "button.link-btn[data-report='comment:' + publicId] t(review.report); onClick = guard(() => ctx ? ctx.open({kind: 'comment', publicId}) : noop); ctx null -> aria-disabled='true' (TODO(T-403))"
    violation: "No route to the unsafe-advice reason fails AC8.1.2 once T-403 lands"
    source: "Question 13, AC8.1.2, T-307 BR5.1"

  # 7. Motion (FD-091)
  - id: BR7.1
    statement: "Only a just-posted comment without a link warning or danger flag is revealed, once, through a one-child Reveal; nothing else in the thread moves on its own."
    category: constraint
    applies_to: "Comment, DiscussionState"
    trigger: "publicId = justPosted"
    logic: "IF justPosted = publicId AND NOT hasExternalLink AND NOT dangerFlag THEN Reveal as='div' > article ELSE article; no Reveal around the thread"
    violation: "A static notice inside a moving element (T-011 BR7.4) or a stagger on arrival"
    source: "Question 11, T-402 step 11, T-011 BR6.2 and BR7.4"
  - id: BR7.2
    statement: "The reply box and the inline editor open with T-011's one-child reveal and close at once."
    category: policy
    applies_to: "ReplyBox, CommentEditor"
    trigger: "Opening"
    logic: "Reveal as='div' > div.composer-box; unmount on close"
    violation: "A motion rule written by this Unit (T-011 owns motion)"
    source: "Question 12, T-402 step 11"
  - id: BR7.3
    statement: "Reaction, Save, Reply, Edit, Delete, Report and Post give press feedback only."
    category: constraint
    applies_to: "All pressables of the thread"
    trigger: "Press"
    logic: ".react and .btn are in T-011's press list; every .link-btn of the thread carries data-press; no count animation, no hover transform"
    violation: "check:motion M9-hover failure, or a count that ticks (AC2.4.5)"
    source: "T-011 BR6.5, BR6.11, T-402 step 11"
  - id: BR7.4
    statement: "The advice warning, link warnings and danger callouts are static notices: data-static='notice', never in a Reveal, never selected by a motion rule, and they never join a view-transition group."
    category: constraint
    applies_to: "Discussion, Comment"
    trigger: "Always"
    logic: "data-static='notice' (not 'disclaimer' or 'emergency', which are once-per-page groups, T-011 BR7.3)"
    violation: "AC2.4.4 failure, or a duplicate view-transition name that turns off route transitions"
    source: "T-011 BR7.1-BR7.4, AC2.4.4, T-307 precedent"
  - id: BR7.5
    statement: "With reduced motion (OS setting or data-motion='reduced'), nothing in the thread slides, rises or scales, and every step still completes."
    category: validation
    applies_to: "The whole Unit"
    trigger: "Reduced-motion journey"
    logic: "all motion comes from T-011 hooks gated by prefers-reduced-motion and :root:not([data-motion=reduced]); this Unit adds no transition or animation"
    violation: "AC2.4.3 failure"
    source: "AC2.4.3, FD-091"

  # 8. Layout and accessibility
  - id: BR8.1
    statement: "At 360 px the thread has no horizontal scroll, every action is a 44 px target, the action row wraps, and long words and URLs wrap."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-402 section)"
    trigger: "Viewport 360 px, both languages"
    logic: ".comment-actions {flex-wrap: wrap; gap: var(--space-2) var(--space-4)}; .comment-actions .link-btn {min-block-size: var(--target); display: inline-flex; align-items: center}; .comment-body {overflow-wrap: anywhere}; .composer-box .actions {display: flex; flex-wrap: wrap; gap: var(--space-2)}"
    violation: "NFR4, NFR6 and FD-091's 44 px targets fail"
    source: "Question 17, NFR4, AC2.4.1"
  - id: BR8.2
    statement: "The thread is a list of article elements under the discussion's h2; each comment's actions are buttons with visible text; every textarea has a label."
    category: constraint
    applies_to: "Every component"
    trigger: "Render"
    logic: "section (T-307) > h2 > div.thread > article.comment[aria-labelledby=byline id]; replies inside div.comment-replies; no div-buttons; textareas labelled (sr-only labels as the prototype)"
    violation: "axe serious finding (NFR6)"
    source: "FR95, NFR6"
  - id: BR8.3
    statement: "T-402's styles live in its own appended section of patient.css and use only T-011 tokens and classes."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css"
    trigger: "Code Generation"
    logic: "one header comment; each rule /* added: T-402 <reason> */; var(--space-*), var(--target), colour and radius tokens only; no transition, animation or transform; no text-transform; Prettier-formatted"
    violation: "check:motion, format:check or contrast:patient fails, or the reviewer rejects a literal value"
    source: "FD-091 amendment, project.md Code Style (2026-10-27), T-011 BR9.8"

  # 9. Copy, numerals and tests
  - id: BR9.1
    statement: "Every user-facing string is a key in both dictionaries; this Unit adds four keys and reuses the rest; numerals follow the active language."
    category: constraint
    applies_to: "All components and packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "new keys experience.commentPending, commentPosted, commentSaved, commentDeleted in en and bn in the same commit; counts and minutes through formatNumber; no capital-letter transform in Bengali"
    violation: "pnpm i18n:check fails, or English text under /bn"
    source: "project.md Mandated (i18n), FD-024, entities.md ENT-014"
  - id: BR9.2
    statement: "The eight prototype smoke behaviours hold against the React thread in a cumulative smoke file."
    category: validation
    applies_to: "components/patient/discussion/discussion.smoke.test.tsx"
    trigger: "pnpm smoke"
    logic: "signed-out reaction opens the gate and records nothing; Reply on top-level only; reply prefilled with @; a posted reply nests one level; own comments show Edit and Delete, foreign ones do not; edit shows '(edited)'; deleting a comment with a reply leaves the tombstone and the reply; deleting one without replies removes it"
    violation: "A smoke regression blocks the Unit (team.md)"
    source: "tools/smoke.mjs 73-200, team.md Testing Posture"
  - id: BR9.3
    statement: "Tests use builders from discussion-test-support.ts, run in en and bn, and keep apps/web at 80% lines with untested files counted."
    category: validation
    applies_to: "All test files of the Unit"
    trigger: "pnpm check"
    logic: "builders aThread(), aComment(), aTombstone(), aViewer() in components/patient/discussion/discussion-test-support.ts (test category, excluded from coverage, never imports @rogikotha/test-support)"
    violation: "Coverage below the floor or a boundary error"
    source: "T-010, team.md Testing Posture"

  # 10. Bookmark backend (Question 4)
  - id: BR10.1
    statement: "bookmark.set adds or removes the actor's bookmark on a published review and is idempotent; bookmark.stateOf returns whether the actor saved it."
    category: policy
    applies_to: "packages/application/src/modules/account/commands/set-bookmark.ts, queries/get-bookmark-state.ts"
    trigger: "setBookmark action, loadDiscussion"
    logic: "requires authenticated + verifiedEmail for set, authenticated for stateOf; reviewId = ReviewLookup.publishedIdOf(reviewPublicId) (null -> not_found); saved ? repo.addBookmark (ON CONFLICT DO NOTHING) : repo.removeBookmark; return {saved}; no audit row, no outbox, no rate limit"
    violation: "A duplicate row, an error on a repeated press, or a bookmark on a hidden review"
    source: "Question 4, 02-data-model.md §2, auth-screens-spec.md §3.7"
  - id: BR10.2
    statement: "Bookmarks never leave the account: no view model other than the actor's own saved flag carries them, and nothing projects them."
    category: constraint
    applies_to: "Bookmark operations"
    trigger: "Always"
    logic: "stateOf answers only for the actor; no account id or count of savers on any page"
    violation: "Projecting who saved a review (02 §2 'private, never projected', S1)"
    source: "02-data-model.md §2, 03 §2"
  - id: BR10.3
    statement: "The stub repository test changes with the implementation in the same commit."
    category: validation
    applies_to: "packages/database/src/repositories/{account.ts, not-implemented.ts, not-implemented.test.ts}"
    trigger: "Code Generation"
    logic: "addBookmark and removeBookmark become real; hasBookmark is added; their entries leave the stub list; listBookmarks stays a stub naming T-409"
    violation: "not-implemented.test.ts turns red (ISS-294)"
    source: "ISS-294, T-010"
```

## Rules summary (derived)

| ID | Rule | Category |
|---|---|---|
| BR1.1 | The route loads the discussion; components take props | constraint |
| BR1.2 | Public ids only; schema-validated inputs | constraint |
| BR1.3 | Server is the source of truth; revalidate after writes | constraint |
| BR1.4 | parse → getActor → command → outcome; thrown → internal | constraint |
| BR1.5 | No comment text or identity in logs | constraint |
| BR2.1 | Order and one reply level | constraint |
| BR2.2 | Comment head contents | constraint |
| BR2.3 | Relative time for 7 days, then a date | policy |
| BR2.4 | Plain text with mention spans, never auto-linked | constraint |
| BR2.5 | External-link warning | policy |
| BR2.6 | Flagged comment visible with the strong warning | policy |
| BR2.7 | Pending comment for its author only | policy |
| BR2.8 | Tombstone: notice and replies only | policy |
| BR2.9 | Heading count and empty line | policy |
| BR2.10 | No reporter data anywhere | constraint |
| BR2.11 | Alias and Former member never linked or mentioned | constraint |
| BR3.1 | Persistent advice warning for every viewer | policy |
| BR4.1 | Composer form | constraint |
| BR4.2 | After a post: reset, announce, reveal, focus | policy |
| BR4.3 | Reply box and prefill | policy |
| BR4.4 | Inline editor | policy |
| BR4.5 | Edit and Delete only when canEdit; delete at once | constraint |
| BR4.6 | Errors in place, text kept | policy |
| BR4.7 | Read-only thread under a tombstone | policy |
| BR5.1 | Like and Dislike, one current reaction | policy |
| BR5.2 | aria-pressed and announcement | constraint |
| BR5.3 | Engagement only, no score | constraint |
| BR5.4 | No reactor list | constraint |
| BR5.5 | Save toggle and privacy note | policy |
| BR6.1 | Everything through the gate | constraint |
| BR6.2 | Server refuses regardless of the UI | constraint |
| BR6.3 | Report trigger on every comment | constraint |
| BR7.1 | One-item reveal for a new comment | constraint |
| BR7.2 | Reply box and editor open with the reveal | policy |
| BR7.3 | Press feedback only | constraint |
| BR7.4 | Static notices | constraint |
| BR7.5 | Reduced motion | validation |
| BR8.1 | 360 px, 44 px targets, wrapping | constraint |
| BR8.2 | Semantic structure and labels | constraint |
| BR8.3 | T-402's CSS section | constraint |
| BR9.1 | Keys and numerals | constraint |
| BR9.2 | Smoke parity | validation |
| BR9.3 | Builders, both languages, coverage | validation |
| BR10.1 | bookmark.set and bookmark.stateOf | policy |
| BR10.2 | Bookmarks stay private | constraint |
| BR10.3 | Stub test updated with the implementation | validation |
