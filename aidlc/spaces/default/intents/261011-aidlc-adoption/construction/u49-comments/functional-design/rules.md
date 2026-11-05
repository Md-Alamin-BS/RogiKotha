# Rules — U49 `u49-comments`

Source of truth for the decision logic of the release-1 Community module and its thread slot. Data shapes are in `entities.md`, workflows in `functional-spec.md`. Built from `unit-of-work.md` U49, C10 release 1, C16, C18 and C19 in `contract-summary.md`, the approved designs of U47, U11 and U9, FD-099 to FD-105, the demo comment code on `main` (`f56e9fc`) and the answers in `functional-design-questions.md` (Q1–Q9).

Deferred to release 2 (FD-105) and covered by no rule here: mentions, reactions, blocks, editing and its history, warned links, the dangerous-instruction warning, reports, `comment.setState`, the deletion step, the provider label and the discussion email.

```yaml
rules:
  # BR1 — comment.post
  - id: BR1.1
    statement: "Only a signed-in account whose status is active and whose email is confirmed may post a comment or a reply."
    category: authorization
    applies_to: "comment.post (requires)"
    trigger: "Every comment.post call"
    logic: "IF Actor.kind != account THEN unauthenticated; ELSE IF status != active OR emailVerified != true THEN forbidden; ELSE continue. The same mapping as U9 BR8.1, so the form and the command agree."
    violation: "Refused with unauthenticated or forbidden; nothing written; the limiter is not hit"
    source: "C10 release 1 (requires), U9 BR8.1, AC8.1.1"
  - id: BR1.2
    statement: "A comment body is plain text, 1 to 2000 characters after trimming, and is never rendered as markup."
    category: validation
    applies_to: "PostCommentInput, domain community/comment.ts"
    trigger: "comment.post parse and decide"
    logic: "body = NFC(trim(raw)); IF length in Unicode code points < 1 OR > 2000 THEN validation with messageKey experience.commentLength {min 1, max 2000}. Links, @-names and markdown stay literal text (Q3)."
    violation: "validation; the form keeps the typed text"
    source: "FR74 (text only in release 1), demo FR6.2 limit, Q3, AC8.1.6"
  - id: BR1.3
    statement: "A comment can only be posted on a published review, resolved once from its public id."
    category: constraint
    applies_to: "comment.post"
    trigger: "After parse, inside the command transaction"
    logic: "reviewId = review.reviewIdForPublicId(tx, {publicId: reviewPublicId}); IF null OR NOT review.isReviewPublished(tx, {reviewId}) THEN not_found. Unknown and unpublished give the same answer."
    violation: "not_found; nothing written"
    source: "C10 release 1, U47 BR6.1 and BR6.3"
  - id: BR1.4
    statement: "A reply targets a live top-level comment of the same review; a reply to a reply is refused."
    category: constraint
    applies_to: "comment.post with parentPublicId"
    trigger: "parentPublicId present"
    logic: "parent = comment by publicId AND reviewId; IF none OR deleted OR state != published THEN not_found; IF parent.parentId != null THEN community.reply_depth. The fn_comment_depth trigger stays as the backstop; its raise is mapped to the same community.reply_depth."
    violation: "not_found or community.reply_depth (errors.community.replyDepth); nothing written"
    source: "FR74, AC8.1.1, AC8.1.6, 0003_triggers.sql"
  - id: BR1.5
    statement: "An account may post at most 30 comments and replies per hour, counted after the input has passed every check."
    category: policy
    applies_to: "comment.post"
    trigger: "After BR1.1–BR1.4 pass, before the insert"
    logic: "rateLimiter.hit('comment.post:account:<accountId>', COMMENT_POST_LIMIT = 30, COMMENT_POST_WINDOW_SEC = 3600); over → rate_limited, shown as errors.common.rateLimited with {minutes} = ceil(retryAfterSec / 60) from the limiter's answer, in locale digits. The constants live in packages/domain/src/community/limits.ts and are read in one place (C18); recorded as an S4 row for T-105. Per process (C19)."
    violation: "rate_limited; nothing written"
    source: "C10 (30/hour), C18 comment post limit, C19 RateLimiter, Q4"
  - id: BR1.6
    statement: "The review's own author comments under the identity mode of the review; every other account comments under its pseudonymous persona."
    category: policy
    applies_to: "comment.post persona choice"
    trigger: "Before the insert"
    logic: "IF review.isReviewAuthor(tx, {reviewId, actor}) THEN mode = review.authorIdentityModeOf(tx, {reviewId}) ELSE mode = pseudonymous; personaId = identity.personaFor(tx, {accountId, reviewId, mode}). For an anonymous review this returns that thread's alias (C4 release-1 rule 3); no other account can comment anonymously in release 1 (Q1). IF isReviewAuthor is true AND authorIdentityModeOf returns null THEN err internal, nothing written, and the logger records community.author_mode_missing with no id (it is a broken invariant, never a fallback to pseudonymous)."
    violation: "A named byline on an anonymous author's comment would link the alias to a person (S1)"
    source: "AC3.3.1, AC3.3.2, C4 release-1 amendment, U11 BR2.*, Q1, Q2"
  - id: BR1.7
    statement: "The comment row, the persona it needs, the audit row and the outbox event commit together or not at all."
    category: constraint
    applies_to: "comment.post"
    trigger: "Persist step"
    logic: "One defineCommand transaction: personaFor (may insert the alias), insert comments {state published}, audit 'comment.posted' on stream comment:<commentId> with actor persona:<personaId>, outbox comment.posted {commentId, reviewId}. Any err rolls back."
    violation: "A comment without its audit row, or an orphan alias"
    source: "C19 defineCommand, C10 release-1 outbox, C15, Q6"
  # BR2 — comment.delete
  - id: BR2.1
    statement: "Only the author of a comment can delete it; someone else's comment and an unknown id give the same not_found."
    category: authorization
    applies_to: "comment.delete"
    trigger: "Every comment.delete call"
    logic: "Actor must be an account (else unauthenticated); comment = by publicId; IF none OR NOT ownership.ownsPersona(tx, {accountId, personaId: comment.authorPersonaId}) THEN not_found. No staff bypass in release 1. Allowed for any account status, so a member can always take their own words down."
    violation: "not_found; nothing written; no hint whether the comment exists"
    source: "U11 BR3.3 and BR3.5, C10 release 1, T-104 adversarial 3, Q5"
  - id: BR2.2
    statement: "A comment that is already deleted cannot be deleted again."
    category: constraint
    applies_to: "comment.delete"
    trigger: "Comment found and owned"
    logic: "IF deletedAt != null OR state != published THEN not_found"
    violation: "not_found"
    source: "demo deleteOwnComment"
  - id: BR2.3
    statement: "Deleting a comment with live replies leaves a 'Comment deleted' placeholder; deleting one without live replies removes it from the thread."
    category: calculation
    applies_to: "comment.delete, domain community/deletion.ts"
    trigger: "Owned live comment"
    logic: "liveReplies = count of replies with state published AND deletedAt null; set state deleted_tombstone, deletedAt now, tombstone = (liveReplies > 0). The row and its body stay in the table as private data, never projected (Q5)."
    violation: "A deleted body or author shown publicly (S1)"
    source: "FR72, AC8.1.4, Q5"
  - id: BR2.4
    statement: "A deletion writes one audit row and no outbox event, and has no rate limit."
    category: policy
    applies_to: "comment.delete"
    trigger: "Persist step"
    logic: "audit 'comment.deleted' on stream comment:<commentId>, actor persona:<authorPersonaId>, data {tombstone}; no outbox (C10 release 1 names comment.posted only)"
    violation: "An audit row naming an account"
    source: "C10 release 1, Q6"
  # BR3 — community.thread
  - id: BR3.1
    statement: "An unknown or unpublished review gives an empty thread with no form."
    category: constraint
    applies_to: "community.thread"
    trigger: "Every thread read"
    logic: "reviewId = reviewIdForPublicId; IF null OR NOT isReviewPublished THEN ThreadVM {items: [], open: false, truncated: false}"
    violation: "Comments readable on a hidden review"
    source: "C10 release 1 community.thread"
  - id: BR3.2
    statement: "Comments are listed oldest first, each top-level comment followed by its replies oldest first."
    category: calculation
    applies_to: "community.thread"
    trigger: "Thread read"
    logic: "ORDER BY created_at, id; replies grouped under their parent"
    violation: "Any ordering by engagement or author"
    source: "Hard rule (neutral order), demo listComments"
  - id: BR3.3
    statement: "The thread lists live comments and live replies; a deleted top-level comment appears as a placeholder only while it has a live reply; deleted replies never appear."
    category: calculation
    applies_to: "community.thread, domain community/thread.ts"
    trigger: "Thread read"
    logic: "live = state published AND deletedAt null. Top-level: live → CommentVM; not live AND has live replies → PlaceholderVM (no body, no author, no date); else omitted. Reply: live → CommentVM, else omitted. Hidden states are never listed. When the last live reply under a placeholder is deleted, the placeholder is no longer shown."
    violation: "A deleted body, its author or an empty placeholder shown"
    source: "FR72, AC8.1.4, Q5"
  - id: BR3.4
    statement: "A comment's author is shown only through the persona's public projection."
    category: constraint
    applies_to: "community.thread"
    trigger: "Building each CommentVM"
    logic: "distinct author persona ids of the thread, read through identity.publicProjections(tx, {personaIds}) in batches of at most 200 (U11's limit; more is a programmer error there); CommentVM.author = that PersonaPublicVM; an anonymous persona shows its alias, a legacy anonymous row with no alias shows the anonymous byline. Missing projection → anonymous byline, never an empty name."
    violation: "A username, account id or persona id on an alias (S1)"
    source: "U11 BR1.4, BR2.7, AC3.3.2"
  - id: BR3.5
    statement: "The viewer learns only whether each comment is their own, as a boolean computed on the server."
    category: authorization
    applies_to: "community.thread"
    trigger: "Viewer is an account"
    logic: "only when the viewer is a signed-in account: for each distinct author persona id of the live comments in the thread, ownsPersona(tx, {accountId, personaId}) once (so at most the number of distinct authors, itself at most THREAD_CAP); CommentVM.mine = that answer. ownPersonaIds is never used on the public page (it would load every persona of the viewer, aliases included). Signed-out viewers make no call and get false; placeholders get none."
    violation: "Ownership of another comment exposed"
    source: "U11 BR3.3, BR3.5"
  - id: BR3.6
    statement: "A thread returns at most 500 comments and replies, and says when it was cut."
    category: constraint
    applies_to: "community.thread"
    trigger: "Thread read"
    logic: "the cap counts every listed row (published and deleted_tombstone, top-level and replies), before the placeholder filter; read at most 501 rows in order; IF 501 rows come back THEN keep the first 500 and truncated = true, so the view shows experience.threadTruncated whenever more rows exist than were kept"
    violation: "An unbounded page"
    source: "Q7"
  - id: BR3.7
    statement: "The thread carries no number that stands for quality."
    category: constraint
    applies_to: "ThreadVM"
    trigger: "Thread read"
    logic: "no like, dislike, score or rank field; the only count shown is none in release 1"
    violation: "A quality number (hard rule)"
    source: "PRODUCT.md hard rules, FD-105 (reactions deferred)"
  # BR4 — privacy
  - id: BR4.1
    statement: "No account id, persona id, internal comment id or internal review id leaves the server, and logs carry none of them with a persona or alias."
    category: constraint
    applies_to: "ThreadVM, action results, logs, audit"
    trigger: "Any output"
    logic: "VM and action results use public ids only; audit actors are persona:<id> (never account:); logs use the allowlisted fields of the logger port only"
    violation: "Linkage leak (S1)"
    source: "C16 rules, C10 release-1 result, U11 BR3.8, team code style"
  - id: BR4.2
    statement: "No error or timing branch tells a caller who wrote an anonymous comment."
    category: constraint
    applies_to: "comment.delete, comment.post refusals"
    trigger: "Refusal paths"
    logic: "not-own, unknown and already-deleted all return not_found with the same message key; ownsPersona runs for every found comment"
    violation: "An ownership oracle over anonymous comments"
    source: "T-104 adversarial 3, U11 BR3.5"
  # BR5 — UI
  - id: BR5.1
    statement: "The persistent medical-advice disclaimer sits above the thread in every state of the slot, including the empty thread and the fallback."
    category: constraint
    applies_to: "CommentThread slot"
    trigger: "Render"
    logic: "Disclaimer first, then the thread, then the form or the gate"
    violation: "A discussion without the disclaimer (hard rule)"
    source: "FR75, AC8.1.2 (disclaimer part), C16"
  - id: BR5.2
    statement: "The comment form and reply buttons appear only when getContributionAccess is allowed; otherwise U9's gate is shown with purpose comment."
    category: authorization
    applies_to: "CommentThread slot"
    trigger: "Render, thread open"
    logic: "access = getContributionAccess(); allowed → CommentForm and reply buttons; else <ContributionGate purpose='comment' returnTo='/{locale}/experiences/{publicId}'>. A closed thread (BR3.1) shows neither."
    violation: "A form that the command will refuse"
    source: "C16 gate, U9 WF9 and BR8.1"
  - id: BR5.3
    statement: "Reply is offered only on live top-level comments; a reply and a placeholder offer none; delete is offered only on the viewer's own live comments."
    category: constraint
    applies_to: "CommentItem"
    trigger: "Render each item"
    logic: "canReply = access allowed AND top-level AND live; canDelete = mine AND live"
    violation: "A nested reply offered (AC8.1.1)"
    source: "FR74, AC8.1.1"
  - id: BR5.4
    statement: "Every string the Unit shows has an en and a bn entry with the same key, and numerals and dates follow the active language."
    category: constraint
    applies_to: "All U49 components and message keys"
    trigger: "Build (i18n parity in pnpm check)"
    logic: "new keys added to en.json and bn.json in the same commit; dates through formatDate(locale)"
    violation: "Build failure"
    source: "Project Mandated (ADR 0011, FD-024)"
  - id: BR5.5
    statement: "The slot never throws into the page; an expected failure renders its own bilingual fallback below the disclaimer."
    category: constraint
    applies_to: "CommentThread slot"
    trigger: "Thread query error"
    logic: "err or throw → disclaimer + errors.common.internal note; the rest of the experience page stays readable"
    violation: "A blank experience page"
    source: "C16 rules, U47 BR6.4"
  # BR6 — replacing the demo
  - id: BR6.1
    statement: "The demo comment code is removed in the same Bolt that switches the slot and the actions to the module."
    category: policy
    applies_to: "demo/comments.ts and every file that reaches it (functional-spec.md § 6), U11's persona_links allowlist entry"
    trigger: "U49 Code Generation"
    logic: "delete demo/comments.ts and demo/comments.int.test.ts; remove the comments export from demo/index.ts and the binding from server/data.ts; rewrite actions/comments.ts (and its test) on runCommand; replace the demo-comments assertion in demo-slice.smoke.test.ts with one on the community module, with the reason recorded (the suite only grows); move the forged-delete and forged-persona cases of ownership.adversarial.test.ts onto the new actions, never drop them; drop the demo/comments.ts entry from U11 BR3.1's allowlist (it only shrinks); stop calling demo reviews.getReviewByPublicId, and whichever of U22, U48 and U49 merges last deletes that function from U47's demo/reviews.ts (as U22's design records)"
    violation: "A second reader of persona_links left behind, a smoke assertion silently lost, or an adversarial case dropped"
    source: "U11 BR3.1, U47 functional-spec § demo removal, U22 design, Q8, review R-03 and R-05"
```

## Summary

| Group | Rules | What they decide |
|---|---|---|
| BR1 Post | BR1.1–BR1.7 | Confirmed active accounts only; plain text 1–2000; published review only; one reply level; 30 per hour; author keeps the review's identity, others pseudonymous; one transaction. |
| BR2 Delete | BR2.1–BR2.4 | Author only, same `not_found` for everything else; placeholder when live replies exist, removed otherwise; audit, no outbox. |
| BR3 Thread | BR3.1–BR3.7 | Empty for unknown or unpublished; oldest first; placeholders only with live replies; personas through projections in batches of 200; `mine` through `ownsPersona` per distinct author; 500-row cap; no quality numbers. |
| BR4 Privacy | BR4.1–BR4.2 | Public ids only; no ownership oracle. |
| BR5 UI | BR5.1–BR5.5 | Disclaimer first; form or gate; reply and delete visibility; en and bn; no throw into the page. |
| BR6 Demo | BR6.1 | Demo comment code, its tests and its `persona_links` read removed in U49's Bolt; the smoke and adversarial cases move to the module, never dropped. |
