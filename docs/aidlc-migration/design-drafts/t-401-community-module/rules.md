# Business rules — U30 `t-401-community-module`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U30), `unit-of-work-story-map.md` (US8.1, US8.2), `requirements.md` (FR10, FR13, FR22, FR72–FR78, FR81), `stories.md` (AC8.1.1–AC8.1.6, AC8.2.1–AC8.2.6), `components.md` (Community, Account, Identity, Review), `contract-summary.md` (C2, C4, C5, C9, C10, C15 and the common rules), T-401 with its amendments, the FD entries up to FD-094, the project hard rules (`project.md`) and `01-conventions.md` §2–§5, §10, §11. The workflows that apply these rules, the port signatures and the view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question was answered A by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 15 lists what changes if the owner reverses one. The Unit is treated as **high risk** (identity and anonymity, deletion, moderation hooks): § 12 of `functional-spec.md` lists the threat cases and the adversarial tests.

```yaml
rules:
  # BR1 — authorization, ownership and limits
  - id: BR1.1
    statement: "comment.post, comment.edit, comment.delete and reaction.set require an authenticated, email-verified, not-restricted account."
    category: authorization
    applies_to: "the four commands in modules/community/commands/"
    trigger: "Every call"
    logic: "defineCommand requires {authenticated, verifiedEmail, notRestricted} in U8's order authenticated -> verifiedEmail -> notRestricted; a refusal returns U8's error for that step and writes nothing (no row, audit, outbox, email or rate-limit hit); no onRefused handler"
    violation: "An unverified or restricted account that changes a comment or a count fails AC8.2.6 and FR77"
    source: "FR74, FR77, AC8.2.6, T-401 step 3, C10, U8 T-101 BR7.4"
  - id: BR1.2
    statement: "block.set, block.unset and community.blockedList require only an authenticated account."
    category: authorization
    applies_to: "modules/account/commands/set-block.ts, unset-block.ts, queries/blocked-list.ts"
    trigger: "Every call"
    logic: "requires {authenticated}; an unverified or restricted account may still block or unblock (a safety tool); an anonymous actor gets U8's unauthenticated refusal"
    violation: "A restricted user who cannot block a harasser is left without the one self-protection tool"
    source: "T-401 step 3, Question 10"
  - id: BR1.3
    statement: "A comment belongs to the actor only when its author persona is one of the actor's own personas, read through identity.personasOf; account ids from public rows are never compared."
    category: authorization
    applies_to: "comment.edit, comment.delete, community.thread (mine, canEdit, canDelete)"
    trigger: "Any ownership decision"
    logic: "owned = comment.author_persona_id IN identity.personasOf({accountId: actor.accountId}).personaIds; no persona id is ever taken from the input; the persona set is read once per call"
    violation: "Editing or deleting another person's comment, or a mine flag on someone else's comment, is an S1 defect"
    source: "T-401 step 3, C4 (personasOf; Community added as caller), AD-3"
  - id: BR1.4
    statement: "An author may edit only a published comment, and may delete a comment that is published, hidden pending review or hidden; a foreign comment is forbidden and a gone comment is not found."
    category: authorization
    applies_to: "comment.edit, comment.delete"
    trigger: "After the comment row is loaded and locked"
    logic: "IF no row OR deleted_at IS NOT NULL OR state = deleted_tombstone THEN not_found; ELSE IF NOT owned (BR1.3) THEN forbidden; ELSE edit needs state = published (else forbidden); delete needs state IN (published, hidden_pending_review, hidden)"
    violation: "Editing a hidden comment would let an author launder content under review"
    source: "FR72, FR73, AC8.1.3, AC8.1.4, Question 11, T-302's matching rule for reviews"
  - id: BR1.5
    statement: "comment.setState is an internal operation for the system actor or a staff actor; it is never a server action and checks no capability itself."
    category: authorization
    applies_to: "modules/community/internal/set-state.ts"
    trigger: "A call from report.file (U32), moderation.decide or moderation.restore (U33)"
    logic: "requires {system: true} OR {staffRole: any}; the calling moderation command holds content.act and the reason code; setState validates only the transition (BR4.7)"
    violation: "A patient-reachable path to setState lets anyone hide comments"
    source: "C10, T-403 step 3, FD-087"
  - id: BR1.6
    statement: "Internal operations are reachable from the web tier only and never from the worker or a route."
    category: constraint
    applies_to: "comment.setState, community.deletionStep, DiscussionPresence, RevealTarget(comment), account.blocksBetween, review.threadContextOn"
    trigger: "Composition and import"
    logic: "exported from modules/<m>/internal/ (or the port file); no server action, route handler or @rogikotha/application/worker export names them; the worker gets nothing from this Unit"
    violation: "A worker path to blocks or personas breaks FD-041, FD-077 and AD-6"
    source: "C5, C10, FD-093 (2), FD-077, Question 6"
  - id: BR1.7
    statement: "Rate limits are fixed in code: 30 comments, 60 comment edits, 100 reactions and 60 block changes per account per hour."
    category: constraint
    applies_to: "comment.post, comment.edit, reaction.set, block.set, block.unset"
    trigger: "After authorization, before any load"
    logic: "RateLimiter.hit(key, limit, 3600) with keys comment:account:<id> 30, comment-edit:account:<id> 60, reaction:account:<id> 100, block:account:<id> 60; refused -> err rate_limited with retryAfterSec, nothing written; every authorized call counts, a no-op one included; constants in modules/community/limits.ts"
    violation: "The 31st comment or the 101st reaction in an hour accepted fails AC8.2.6 and the T-401 rate-limit row"
    source: "PRD baseline line 198, C10, T-401 step 4, Question 12"
  - id: BR1.8
    statement: "Inputs and view models carry public ids only."
    category: constraint
    applies_to: "every input schema and view model of this Unit"
    trigger: "Parse and projection"
    logic: "reviewId, parentId, commentId and targetId in inputs hold public_id values (10-char base32); internal uuids appear only in outbox payloads, audit rows and ports; an internal uuid in an input fails validation"
    violation: "A uuid in a view model or URL breaks 01-conventions §4"
    source: "01-conventions §4, 03 §2"

  # BR2 — identity and anonymity
  - id: BR2.1
    statement: "The review's author always comments in their own thread under the review's persona."
    category: constraint
    applies_to: "comment.post"
    trigger: "The actor owns review.author_persona_id"
    logic: "persona = review.author_persona_id whatever the review's mode (named snapshot, pseudonymous or the thread alias); an identity input that differs from that persona's kind -> community.identity_fixed; nothing is created"
    violation: "An anonymous author replying under their username links the alias to the account (FD-015)"
    source: "FR10, AC3.3.1, FD-015, Question 1"
  - id: BR2.2
    statement: "Any other account keeps one persona per thread: its first comment fixes it."
    category: constraint
    applies_to: "comment.post"
    trigger: "The actor already authored a comment in this review (any state, deleted included)"
    logic: "persona = the most recent of the actor's personas that authored a comment in this review; an identity input whose mode differs -> community.identity_fixed"
    violation: "One account visible in one thread as both @username and patient-xxxx invites linkage by writing style and timing"
    source: "FD-015, ISS-262, Question 1"
  - id: BR2.3
    statement: "A first-time commenter chooses named, pseudonymous or anonymous; the default is pseudonymous."
    category: calculation
    applies_to: "comment.post"
    trigger: "Not the author and no persona in the thread yet"
    logic: "mode = input.identity ?? pseudonymous; persona = identity.personaFor(tx, {accountId, mode, reviewId: mode = anonymous ? review.id : undefined}); anonymous creates or reuses this account's own alias for this thread (T-104 WF2)"
    violation: "The seeded anonymous and named comments (k5, k16, k31, k42; k2, k18) could not be created by the product"
    source: "Prototype data (FD-039), ISS-262, T-104 Question 10, Question 1"
  - id: BR2.4
    statement: "A reaction shows the actor's thread persona, or no persona when that persona is anonymous; reaction.set never creates a persona."
    category: calculation
    applies_to: "reaction.set (reactions.public_persona_id)"
    trigger: "Every upsert"
    logic: "thread = the review of the target (comment -> its review; review -> itself); p = BR2.1/BR2.2 persona of the actor in that thread if any; IF p is anonymous THEN null ELSE IF p THEN p ELSE identity.personaFor(pseudonymous); facility_review: the actor's own facility review persona unless anonymous (null), else pseudonymous"
    violation: "A non-null public_persona_id for the anonymous author of r2 fails AC8.2.3 and the FD-062 row"
    source: "FR77, FR78, AC8.2.3, 02 §8, T-401 step 4, Question 7"
  - id: BR2.5
    statement: "The provider label is decided when the comment is written and stored; it is never derived when the thread is read, and never set on an anonymous persona."
    category: calculation
    applies_to: "comment.post, comment.edit (comments.provider_label), community.thread (providerHere)"
    trigger: "Insert and body change"
    logic: "provider_label = persona.kind <> anonymous AND directory.approvedClaimOf({accountId: actor.accountId}) = {kind: doctor, publicId: review.doctorPublicId}; recomputed on edit; providerHere = provider_label"
    violation: "Reading persona_links in the public thread query breaks AD-3; a label on an alias tells everyone the doctor wrote it"
    source: "FR22, AC8.1.5, AD-3, components.md Identity, T-204 approvedClaimOf, Question 4"
  - id: BR2.6
    statement: "No view model of this Unit carries an account id, a persona id, an email or a private link; the only private read in a query is the viewer's own persona set."
    category: constraint
    applies_to: "ThreadVM, CommentVM, ReactionCountsVM, blockedList"
    trigger: "Projection"
    logic: "community.thread calls identity.personasOf only for actor.accountId (own mine flags) and identity.bylinesFor(surface thread) for authors; no accountsOf call in any query; blockedList returns usernames of the actor's own blocks"
    violation: "Any of those fields in a public projection is an S1 defect"
    source: "03 §2, contract-summary privacy rules, AD-3"
  - id: BR2.7
    statement: "Audit rows of comment commands name the author persona, never the account."
    category: constraint
    applies_to: "comment.post, comment.edit, comment.delete"
    trigger: "AuditWriter.write"
    logic: "actor = persona:<authorPersonaId>; block audit rows use actor account:<id> on the private account stream; setState rows use the staff actor account:<staffId> or system"
    violation: "account:<id> posted comment X on an anonymous thread is a second persona-to-account link visible in the case timeline (AD-3)"
    source: "U21 T-301 BR4.7, FD-065, Question 9"
  - id: BR2.8
    statement: "Anonymous personas can never be mentioned."
    category: constraint
    applies_to: "comment.post, comment.edit"
    trigger: "Mention parsing"
    logic: "usernames resolve through identity.publicByUsername, which returns pseudonymous personas only; an @-token matching the alias pattern of domain/identity/alias.ts -> community.mention_anonymous, nothing stored"
    violation: "A stored mention of an alias, or a notice to the alias's account, breaks FD-015 and the T-401 mention row"
    source: "FD-015, T-401 acceptance 'Mention refusal', 02 §8, Question 13"

  # BR3 — comment content
  - id: BR3.1
    statement: "A comment is text only: trimmed, NFC-normalised, 1 to 2000 characters, with no attachment, image or recipient field."
    category: validation
    applies_to: "PostCommentInput, EditCommentInput"
    trigger: "Parse"
    logic: "zod strict object; body = NFC(trim(body)); length 1..2000 else validation (field body); any extra key -> validation; stored as written and rendered as text, never as HTML or Markdown"
    violation: "An image, file or private-message field accepted fails AC8.1.6 and FR74"
    source: "FR74, AC8.1.6, T-401 step 2, Question 14"
  - id: BR3.2
    statement: "Replies go one level deep, inside the same review, under a published parent."
    category: constraint
    applies_to: "comment.post, packages/domain/src/community/comment.ts, the depth trigger"
    trigger: "parentId present"
    logic: "parent = comment by public id, locked FOR SHARE; IF none OR parent.review_id <> review.id OR parent.deleted_at IS NOT NULL OR parent.state <> published THEN not_found; ELSE IF parent.parent_id IS NOT NULL THEN community.reply_depth; the migrated trigger refuses a reply to a reply and a parent from another review on INSERT, and any change of parent_id or review_id on UPDATE"
    violation: "A reply to a reply fails AC8.1.1 and AC8.1.6; a parent from another review corrupts two threads"
    source: "FR74, AC8.1.1, AC8.1.6, 02 §8, 0003_triggers.sql, finding F9"
  - id: BR3.3
    statement: "A mention is @ followed by 3 to 24 of a-z, 0-9 or underscore, not preceded by a letter, digit, underscore, dot or @, and not followed by a-z, 0-9, underscore or hyphen."
    category: calculation
    applies_to: "packages/domain/src/community/mention.ts parseMentions"
    trigger: "Post and edit"
    logic: "regex (?<![\\p{L}\\p{N}_.@])@([a-z0-9_]{3,24})(?![a-z0-9_-]) with flags iu; lowercased; deduplicated in order of first appearance; pure"
    violation: "name@example.com parsed as a mention of 'example', or @patient-4f2k parsed as 'patient', notifies a stranger"
    source: "T-401 step 1, USERNAME_RE in contracts, Question 13"
  - id: BR3.4
    statement: "A comment may hold at most five distinct mention tokens."
    category: validation
    applies_to: "comment.post, comment.edit"
    trigger: "After parsing"
    logic: "IF distinct tokens > 5 THEN validation with fieldErrors {body: errors.community.tooManyMentions}; nothing stored"
    violation: "Silent truncation leaves some mentions unnotified with no explanation"
    source: "T-401 step 1, Question 13"
  - id: BR3.5
    statement: "An unknown or de-identified username stays plain text; a self-mention is stored but notifies no one."
    category: calculation
    applies_to: "comment.post, comment.edit"
    trigger: "Mention resolution"
    logic: "identity.publicByUsername not_found -> no comment_mentions row, no refusal; resolved persona of the actor -> row kept, actor removed from recipients (BR8.1)"
    violation: "Refusing unknown usernames makes ordinary text with @ unpostable"
    source: "Question 13, T-104 WF3 (publicByUsername)"
  - id: BR3.6
    statement: "External links are flagged for the warning and never fetched."
    category: calculation
    applies_to: "packages/domain/src/community/policies.ts detectExternalLink, extractExternalLinks"
    trigger: "Post, edit and projection"
    logic: "a token beginning http://, https:// or www. (case-insensitive) is a link; has_external_link = any; extractExternalLinks(body) returns up to 5 link strings, each at most 200 characters, for the warning note; no server-side request, preview or redirect; the view model never turns a link into an anchor"
    violation: "An unflagged link fails AC8.1.1; a server-side fetch is an SSRF vector"
    source: "FR74, AC8.1.1, T-401 hard-rule checklist"
  - id: BR3.7
    statement: "No automated classification runs on comment text."
    category: constraint
    applies_to: "comment.post, comment.edit, CommentVM"
    trigger: "Always"
    logic: "no keyword, emergency, advice or toxicity check; the body is stored and returned unchanged; CommentVM has no banner, emergency or classification field; the danger flag comes only from ModerationSignals (BR7.4)"
    violation: "A banner on 'chest pain now' fails the FD-046 row; any classifier breaks FD-009 and FD-017"
    source: "FD-009, FD-017, FD-046, AC8.1.2"
  - id: BR3.8
    statement: "Edits re-parse mentions and links with the same refusals, replace the stored mentions and send no notice."
    category: calculation
    applies_to: "comment.edit"
    trigger: "Body changed"
    logic: "BR3.3-BR3.6, BR2.8 and BR5.4 (mention part) apply; comment_mentions rows replaced; no comment.posted, no email; outbox comment.changed only"
    violation: "Notices on edit turn edits into a spam channel; skipping the block check lets an edit mention a blocker"
    source: "C15 (comment.changed routes no notice), Question 13"

  # BR4 — lifecycle and private history
  - id: BR4.1
    statement: "Comment states follow the domain table in comment-state.ts."
    category: state-transition
    applies_to: "packages/domain/src/community/comment-state.ts"
    trigger: "Every state change"
    logic: "post -> published; published -> hidden_pending_review (hideThreshold, hideCritical); published -> hidden (hide); hidden_pending_review -> published (restore), -> hidden (hide); hidden -> published (restore); published | hidden_pending_review | hidden -> deleted_tombstone (author delete with live replies; remove; purge); published | hidden_pending_review | hidden -> soft-deleted (author delete without live replies: deleted_at set, stored state unchanged); every other pair refused"
    violation: "A transition outside the table is a programmer error caught by the table test"
    source: "02 §17, T-401 step 1, C10, FD-049 (stored mapping)"
  - id: BR4.2
    statement: "A post stores the comment as published together with history version 1."
    category: calculation
    applies_to: "comment.post"
    trigger: "Persist"
    logic: "insert comments {state published, provider_label, has_external_link, tombstone false}, comment_mentions, comment_versions {version 1, change_kind post, body, actor_kind author} in one transaction"
    violation: "A comment without its first version loses the text history AC8.1.3 needs"
    source: "AC8.1.3, FR73, Question 5"
  - id: BR4.3
    statement: "An edit that changes the text sets Edited and adds a history version; an unchanged text is a no-op."
    category: calculation
    applies_to: "comment.edit"
    trigger: "Body compared after normalisation"
    logic: "IF NFC(trim(new)) = body THEN ok without any write; ELSE body, has_external_link, provider_label, edited_at = now, updated_at = now; comment_versions {version max+1, change_kind edit}; audit; outbox comment.changed"
    violation: "No Edited marker after a change fails AC8.1.3"
    source: "FR73, AC8.1.3, FD-046"
  - id: BR4.4
    statement: "An author delete leaves a tombstone when live replies exist and removes the comment otherwise; in both cases the public row loses its text."
    category: state-transition
    applies_to: "comment.delete"
    trigger: "Owner delete (BR1.4)"
    logic: "live = replies with deleted_at IS NULL and state <> deleted_tombstone; IF live > 0 THEN state deleted_tombstone, tombstone true ELSE stored state unchanged, tombstone false; always deleted_at = now, removed_by = author, body = '', has_external_link false, comment_mentions deleted; comment_versions kept"
    violation: "Deleting k8 without a tombstone loses k9's context; text left in comments.body is one query away from a leak (AC8.1.4)"
    source: "FR72, AC8.1.4, smoke assertions (k8, k10), Question 5"
  - id: BR4.5
    statement: "When the last live reply under a tombstone goes, the tombstone goes too."
    category: calculation
    applies_to: "comment.delete, comment.setState remove and purge"
    trigger: "A reply leaves the live set"
    logic: "lock the parent FOR UPDATE first; IF parent.tombstone AND no other live reply THEN parent.tombstone = false (the parent becomes a removed comment)"
    violation: "An empty tombstone keeps hasDiscussion true and renders a 'deleted' box with nothing under it"
    source: "FR72 (tombstone only when replies require it), finding F10"
  - id: BR4.6
    statement: "Every posted and edited text is kept in private history and appears in no view model, audit row, outbox payload or log."
    category: constraint
    applies_to: "comment_versions"
    trigger: "Always"
    logic: "rows written by post and edit only; immutable (UPDATE refused by trigger); deleted only by purge (BR4.7) and later by T-309's expiry; no query of this Unit returns them to a user; rk_worker has no privilege on the table; staff access is a later Unit's"
    violation: "History reachable from a public or author-facing query breaks AC8.1.3's 'only in private version history'"
    source: "FR72, FR73, AC8.1.3, AC8.1.4, FD-079 (held data stays), Question 5"
  - id: BR4.7
    statement: "comment.setState applies hide, restore, remove and purge; the threshold events exist in the table and their handling is added by U32."
    category: state-transition
    applies_to: "modules/community/internal/set-state.ts"
    trigger: "Internal call"
    logic: "lock FOR UPDATE; IF the domain table refuses THEN conflict; hide: hidden_at = now, hidden_reason_code = reasonCode; restore: hidden_at and hidden_reason_code cleared; remove: state deleted_tombstone, removed_by moderation, deleted_at = now, body = '', tombstone = live replies > 0, mentions deleted, BR4.5; purge: remove plus every comment_versions row of the comment deleted; result {from, to, authorPersonaId}"
    violation: "A hide without hidden_reason_code leaves the author's notice and the case timeline without a reason"
    source: "C10, T-403 step 3, FR73 (permanent delete), FD-088 (no appeals), Question 5"
  - id: BR4.8
    statement: "setState queues no email and creates no notice."
    category: constraint
    applies_to: "comment.setState"
    trigger: "Every call"
    logic: "audit comment:<id> action comment.state_changed; outbox comment.changed; no queueEmail, no notification row; the deciding moderation command carries the one notice and email"
    violation: "Two emails per outcome fail FD-087"
    source: "FD-087, C11"
  - id: BR4.9
    statement: "Nothing restores a deleted or removed comment in release 1."
    category: constraint
    applies_to: "comment state table"
    trigger: "Always"
    logic: "no transition leaves deleted_tombstone or the soft-deleted marker; appeals are deferred (FD-088)"
    violation: "A restore path with a cleared body would republish an empty comment"
    source: "FD-088, FR72, Question 5"
  - id: BR4.10
    statement: "Locks are taken in one order: the review, then the top-level comment, then the reply."
    category: constraint
    applies_to: "comment.post, comment.delete, comment.setState"
    trigger: "Inside the transaction"
    logic: "comment.post: review FOR SHARE (review.threadContextOn) and parent FOR SHARE; delete and setState: the comment's parent FOR UPDATE (when it is a reply), then the comment FOR UPDATE, then the live-reply count"
    violation: "A comment landing on a review whose soft delete is committing (T-302 F12), or a deadlock between a reply delete and a parent delete"
    source: "T-302 finding F12, finding F10"
  - id: BR4.11
    statement: "This Unit adds no hold logic; an author's delete of a held comment must later look exactly like an unheld one."
    category: constraint
    applies_to: "comment.delete, comment.setState purge"
    trigger: "Always"
    logic: "no legal_holds read here; T-309 adds the RetentionSubject check to comment.delete and purge; the cleared body plus the kept history keep the data a hold needs"
    violation: "A hold message to the author breaks FD-079"
    source: "FD-073, FD-079"

  # BR5 — blocks
  - id: BR5.1
    statement: "block.set takes a username, refuses self and is idempotent."
    category: validation
    applies_to: "block.set"
    trigger: "Every call"
    logic: "account = the active, restricted, suspended or banned account with that username (not deleted); none -> not_found; self -> validation {username: errors.community.blockSelf}; an existing block -> ok without audit; else insert and audit"
    violation: "Blocking oneself or a duplicate row breaks blocksBetween"
    source: "T-401 step 4, Question 10"
  - id: BR5.2
    statement: "block.unset is idempotent and audits only a real removal."
    category: calculation
    applies_to: "block.unset"
    trigger: "Every call"
    logic: "unknown username -> not_found; no block -> ok, nothing written; else delete and audit"
    violation: "An audit row for a no-op muddies the account stream"
    source: "T-401 step 4"
  - id: BR5.3
    statement: "blocksBetween is symmetric."
    category: calculation
    applies_to: "account.blocksBetween"
    trigger: "Every call"
    logic: "result.blocked = the ids in otherAccountIds with a block row in either direction with accountId; deduplicated; at most 50 ids per call"
    violation: "The C5 row (A blocks B, C blocks A -> [B, C]) fails"
    source: "C5, T-401 acceptance 'account.blocksBetween', Question 3"
  - id: BR5.4
    statement: "A block in either direction refuses a comment on the other party's thread, a direct reply to them and a mention of them, wherever that party appears under a non-anonymous persona."
    category: constraint
    applies_to: "comment.post, comment.edit (mentions)"
    trigger: "After recipients are resolved"
    logic: "B = blocksBetween(actor, [reviewAuthor, parentAuthor, mentioned...]); IF reviewAuthor IN B AND review persona kind <> anonymous THEN community.blocked; IF parentAuthor IN B AND parent persona kind <> anonymous THEN community.blocked; IF any mentioned IN B THEN community.blocked"
    violation: "A blocked user replying to the blocker fails the T-401 'Block effect' row"
    source: "components.md Community (refuses direct replies and mentions), C5, Question 3"
  - id: BR5.5
    statement: "A block by or against a party who is anonymous in that thread is applied silently."
    category: constraint
    applies_to: "comment.post"
    trigger: "The blocked party's persona in the thread is anonymous"
    logic: "no refusal; the comment posts with the normal result; the party is removed from the recipients (BR8.1) so they get no notice or email; the code path issues the same queries as an unblocked post"
    violation: "community.blocked on an anonymous thread tells a blocked user that the anonymous author is the person who blocked them (FD-015)"
    source: "FD-015, finding F2, Question 2"
  - id: BR5.6
    statement: "Blocks change no thread, no count and no view-model flag."
    category: constraint
    applies_to: "community.thread, reaction.set, CommentVM.canReply"
    trigger: "Always"
    logic: "existing comments of either party still render for everyone; reactions are not refused; canReply is structural only (BR7.6)"
    violation: "A canReply that turns false under a block is a block oracle on anonymous threads"
    source: "T-401 acceptance 'Block effect', components.md, Question 2"
  - id: BR5.7
    statement: "Blocks are private."
    category: constraint
    applies_to: "blocks, community.blockedList, audit"
    trigger: "Always"
    logic: "never projected publicly; blockedList returns the usernames the actor blocked, newest first; audit stream account:<actorId>, details {blockedAccountId}; rk_worker has no privilege on blocks"
    violation: "A block visible to the blocked person or the public is an S1 defect"
    source: "02 §2, 02 §16 (f), T-401 step 4"

  # BR6 — reactions
  - id: BR6.1
    statement: "A reaction target must exist and be visible."
    category: validation
    applies_to: "reaction.set, community.reactionsOf"
    trigger: "Load"
    logic: "review: state published AND deleted_at IS NULL; facility_review: the same; comment: state published AND deleted_at IS NULL AND its review is published or a review tombstone; else not_found"
    violation: "A reaction on hidden or deleted content changes a count nobody can see"
    source: "T-401 step 4, AC8.2.1"
  - id: BR6.2
    statement: "One current reaction per account and target, set by an idempotent upsert."
    category: calculation
    applies_to: "reaction.set, PgCommunityRepository.upsertReaction, deleteReaction"
    trigger: "Persist"
    logic: "value like|dislike -> INSERT ... ON CONFLICT (target_kind, target_id, account_id) DO UPDATE SET value, public_persona_id, updated_at; value null -> DELETE the row if any; result {likes, dislikes, mine?} read after the write in the same transaction"
    violation: "Two rows after a double click or 20 concurrent likes fail AC8.2.2"
    source: "FR77, AC8.2.1, AC8.2.2, reactions_target_account_unique"
  - id: BR6.3
    statement: "Every target kind takes Like and Dislike."
    category: constraint
    applies_to: "SetReactionInput, reactions.value"
    trigger: "Parse"
    logic: "value IN (like, dislike, null) for review, facility_review and comment"
    violation: "A refused dislike on a comment fails AC8.2.1 and FD-062"
    source: "FD-062, ADR-007"
  - id: BR6.4
    statement: "reaction.set writes no audit row and no outbox row."
    category: constraint
    applies_to: "reaction.set"
    trigger: "Always"
    logic: "the one recorded exception to 01-conventions §5 'every state change writes audit': reactions are engagement only (FR78), high in volume, and an audit actor would name the account of an anonymous reactor"
    violation: "An audit row account:<id> reacted on r2 links the alias to the account"
    source: "T-401 step 4, FR78, Question 8"
  - id: BR6.5
    statement: "Reaction figures are counts only."
    category: constraint
    applies_to: "community.reactionsOf, CommentVM.likes/dislikes/myReaction"
    trigger: "Projection"
    logic: "likes = rows with value like, dislikes = rows with value dislike; mine = the actor's own value; no list of reactors, no persona, no id, no percentage, no score"
    violation: "A reactor list or ratio fails AC8.2.5 and the counts-only rule"
    source: "FR78, AC8.2.5, 03 §4, owner (counts only), Question 7"
  - id: BR6.6
    statement: "Engagement never reaches summaries, ranking or moderation."
    category: constraint
    applies_to: "modules/review, search, directory, taxonomy, moderation; the reactions table"
    trigger: "Code review and the import test"
    logic: "no module other than community imports modules/community or reads reactions; an application test scans those module folders for the specifier; the database distribution and search reads name no reactions table"
    violation: "Any import fails AC8.2.5, AC3.3.4 and the hard-rule checklist"
    source: "FR78, AC3.3.4, AC8.2.5, PRODUCT.md"
  - id: BR6.7
    statement: "An author may react to their own content."
    category: calculation
    applies_to: "reaction.set"
    trigger: "Actor owns the target"
    logic: "allowed; counts are engagement only"
    violation: "None (no rule forbids it; the prototype allows it)"
    source: "Prototype app.js data-react handler"

  # BR7 — thread projection
  - id: BR7.1
    statement: "A thread is readable while its review is published or is a review tombstone, and accepts comments only while the review is published."
    category: constraint
    applies_to: "community.thread, comment.post"
    trigger: "Load"
    logic: "context = review.threadContextOn(tx, {publicId}); readable = (state = published AND deleted_at IS NULL) OR state = deleted_tombstone; acceptsComments = state = published AND deleted_at IS NULL; else not_found"
    violation: "Comments on a hidden or soft-deleted review, or a missing thread under a review tombstone (T-302 threadSlot)"
    source: "T-302 WF9, T-401 step 4"
  - id: BR7.2
    statement: "Each comment is shown, shown only to its author, shown as a placeholder or left out, by one table."
    category: calculation
    applies_to: "community.thread"
    trigger: "Projection"
    logic: "published, not deleted -> shown; published or hidden_pending_review with the danger flag -> shown with dangerous true; hidden_pending_review without the flag, or hidden -> shown to its author with moderationNotice, otherwise a withheld placeholder when it is top-level with a shown reply, else left out; deleted_tombstone with tombstone true -> a deleted (removed_by author) or removed (moderation) placeholder when a reply is shown, else left out; soft-deleted -> left out"
    violation: "Replies orphaned under a hidden parent, or hidden text shown to others"
    source: "FR72, FR75, AC8.1.4, 02 §8 (derived dangerous flag), Question 11"
  - id: BR7.3
    statement: "A placeholder carries only its public id, its reason and its replies."
    category: constraint
    applies_to: "CommentVM placeholder variant"
    trigger: "Projection"
    logic: "{publicId, tombstone: true, tombstoneReason: deleted | removed | withheld, replies}; no author, body, time, counts or flags"
    violation: "An author or time on a tombstone leaks what was deleted"
    source: "T-401 step 2, AC8.1.4"
  - id: BR7.4
    statement: "The danger flag comes only from Moderation's signal."
    category: calculation
    applies_to: "community.thread"
    trigger: "Projection"
    logic: "flags = await moderationSignals.dangerousFlags(ids of published and hidden_pending_review comments); the default implementation returns an empty set until U32 wires its own"
    violation: "A flag computed from text breaks FD-009"
    source: "C10, C11, FR75, FD-009"
  - id: BR7.5
    statement: "Comments are ordered oldest first, replies under their parent oldest first."
    category: calculation
    applies_to: "community.thread"
    trigger: "Projection"
    logic: "ORDER BY created_at ASC, id ASC at both levels"
    violation: "Engagement-based ordering would weight discussion by reactions (FR78)"
    source: "T-401 step 5, PRODUCT.md neutral order"
  - id: BR7.6
    statement: "Per-comment flags are mine, canEdit, canDelete, canReply, providerHere and, for the author only, moderationNotice."
    category: calculation
    applies_to: "CommentVM"
    trigger: "Projection"
    logic: "mine = BR1.3; canEdit = mine AND state published; canDelete = mine AND BR1.4 delete states; canReply = top-level AND state published AND not flagged-hidden AND acceptsComments (no actor or block input); providerHere = provider_label; moderationNotice = pendingReview | hidden only when mine"
    violation: "Edit offered on a foreign comment fails the T-401 'canEdit: false' row"
    source: "T-401 step 5, smoke assertion 'foreign comments expose no edit/delete', Question 2"
  - id: BR7.7
    statement: "Authors are shown through Identity's one byline shape on the thread surface."
    category: calculation
    applies_to: "CommentVM.author"
    trigger: "Projection"
    logic: "author = identity.bylinesFor({personaIds, surface: thread})[i]; de-identified personas read Former member; anonymous personas show their alias and never link"
    violation: "A second byline shape breaks T-104 Q17 (one BylineVM)"
    source: "T-104 Q17, Q15 (Former member)"
  - id: BR7.8
    statement: "Mentions in the view model are the usernames that still exist; links are the extracted link strings."
    category: calculation
    applies_to: "CommentVM.mentions, CommentVM.links"
    trigger: "Projection"
    logic: "mentions = usernames of comment_mentions personas whose username is not null; links = extractExternalLinks(body)"
    violation: "A removed username in mentions points at nobody"
    source: "T-104 Q15, BR3.6"
  - id: BR7.9
    statement: "The thread is read with a fixed number of calls, whatever its size."
    category: constraint
    applies_to: "community.thread, PgCommunityRepository.threadFor"
    trigger: "Every call"
    logic: "one repository read (comments with mention usernames and per-comment like and dislike counts and the actor's own values), one bylinesFor, one dangerousFlags, one personasOf; no per-comment query; at most 500 comments per thread (beyond that the oldest 500 and a truncated flag)"
    violation: "N+1 reads on r1's thread"
    source: "T-201 BR3.10 precedent, finding F15"
  - id: BR7.10
    statement: "A thread result belongs to one viewer and is never cached across viewers."
    category: constraint
    applies_to: "community.thread and its callers (U31 T-402, U27 T-307)"
    trigger: "Rendering"
    logic: "mine, canEdit, canDelete, myReaction and moderationNotice depend on the viewer; the page renders it per request with no shared cache"
    violation: "A cached thread shows one user's own hidden comment and Edit buttons to everyone"
    source: "BR2.6, finding F14"
  - id: BR7.11
    statement: "Queries never write."
    category: constraint
    applies_to: "community.thread, community.reactionsOf, community.blockedList"
    trigger: "Always"
    logic: "no personaFor call, no insert or update, no rate-limit hit"
    violation: "A query creating an alias persona breaks 01-conventions §3"
    source: "01-conventions §3, T-104 WF2"

  # BR8 — notifications and email
  - id: BR8.1
    statement: "A comment notifies the review's author, the parent's author and the mentioned accounts, minus the actor and minus every account with a block either way."
    category: calculation
    applies_to: "comment.post"
    trigger: "Before persist"
    logic: "candidates = accountsOf([review.author_persona_id, parent.author_persona_id, mentioned persona ids]); remove actor.accountId; remove blocksBetween(actor, candidates).blocked; de-identified personas give no account and so no recipient"
    violation: "A notice to oneself or to a blocker fails the C10 recipient row"
    source: "C10, C15, T-405 routing table, FD-075"
  - id: BR8.2
    statement: "comment.posted carries ids only."
    category: constraint
    applies_to: "Outbox comment.posted"
    trigger: "Persist"
    logic: "{commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds, replyToAccountId?} with internal uuids; a filtered recipient is absent, never null; no persona id, username, email or text"
    violation: "Text or a persona id in the payload fails the C10 row and the hard-rule checklist"
    source: "C10, C15, 03 §5"
  - id: BR8.3
    statement: "The discussion email is queued in the same transaction, once per recipient, through Notification's web-tier call."
    category: calculation
    applies_to: "comment.post"
    trigger: "Persist"
    logic: "for each distinct recipient: notification.queueEmail(tx, {accountId, category: discussion, messageKey: the role key by precedence mention > reply > comment, params: {reviewPublicId, commentPublicId}, dedupeKey: comment.posted:<commentId>:<accountId>}); {suppressed: true} is success; an err rolls the comment back; the command is flagged sendsMail"
    violation: "Email from the worker breaks FD-070; a comment text in params breaks the content-free rule"
    source: "FD-047, FD-070, FD-075, C2, T-401 FD-075 row"
  - id: BR8.4
    statement: "Edits, deletes and state changes write comment.changed and route no notice."
    category: constraint
    applies_to: "comment.edit, comment.delete, comment.setState"
    trigger: "Persist"
    logic: "outbox comment.changed {commentId, reviewId}; T-405's routing entry is none"
    violation: "A notice on delete tells the replier the parent author left"
    source: "C10, C15"

  # BR9 — audit, outbox and logs
  - id: BR9.1
    statement: "Comment audit rows live on the comment's own stream with allowlisted details."
    category: constraint
    applies_to: "comment.post, comment.edit, comment.delete, comment.setState"
    trigger: "Persist"
    logic: "stream comment:<commentId>; actions comment.posted {reviewId, parentId?, mentionCount, hasExternalLink, providerLabel}, comment.edited {version, mentionCount, hasExternalLink}, comment.deleted {result: tombstone | removed, liveReplyCount}, comment.state_changed {event, from, to, reasonCode?, caseCode?}; built with U8's allowlist builders; never body, usernames or emails"
    violation: "Body text in audit details fails the T-401 'Audit + outbox' row"
    source: "01-conventions §5, ISS-108 (U8), FD-065, Question 9"
  - id: BR9.2
    statement: "Block audit rows live on the actor's account stream."
    category: constraint
    applies_to: "block.set, block.unset"
    trigger: "Persist"
    logic: "stream account:<actorId>, action block.set | block.unset, actor account:<actorId>, details {blockedAccountId}"
    violation: "A block on a public or comment stream exposes it to the case timeline"
    source: "T-401 step 4"
  - id: BR9.3
    statement: "Each command writes its audit and outbox rows in its own transaction, exactly once."
    category: constraint
    applies_to: "every command of this Unit except reaction.set"
    trigger: "Persist"
    logic: "UnitOfWork.run; post: one audit, one outbox comment.posted, one email per recipient; edit, delete, setState: one audit, one outbox comment.changed; block: one audit, no outbox; no-op calls write nothing"
    violation: "An audit row without its comment, or two outbox rows, after a rollback"
    source: "01-conventions §3, contract-summary common rules"
  - id: BR9.4
    statement: "Logs carry no body and never an account id beside a comment or review id."
    category: constraint
    applies_to: "every log line of this Unit"
    trigger: "Logging"
    logic: "allowlisted fields event, correlationId, comment public id or review id, counts, durations; NotImplemented arguments are not logged (ISS-111)"
    violation: "account X commented on r2 in a log line links an anonymous thread"
    source: "01-conventions §11, ISS-111"

  # BR10 — ports, internals and deletion
  - id: BR10.1
    statement: "Community answers Review's DiscussionPresence with the thread's living discussion."
    category: calculation
    applies_to: "modules/community/presence.ts"
    trigger: "review.delete (U22)"
    logic: "hasDiscussion(tx, reviewId) = EXISTS comment of the review with (state = published AND deleted_at IS NULL) OR tombstone = true"
    violation: "True for a review with only hard-removed comments fails the C9/C10 row"
    source: "C9, T-302 BR5.3, T-401 acceptance 'hasDiscussion'"
  - id: BR10.2
    statement: "Community resolves a comment for Identity's reveal by public id, in any state."
    category: calculation
    applies_to: "modules/community/reveal-target.ts"
    trigger: "identity.reveal with targetKind comment"
    logic: "row by public id (deleted, tombstoned and purged rows included) -> ok {subject: persona, personaId: author_persona_id, targetCode: comment:<publicId>}; none -> err not_found"
    violation: "No resolver leaves every comment reveal target_not_found (T-104 F11)"
    source: "C4, T-104 RevealTarget (targetCode)"
  - id: BR10.3
    statement: "Community declares ModerationSignals and ships a default that flags nothing."
    category: constraint
    applies_to: "modules/community/ports.ts"
    trigger: "Composition"
    logic: "dangerousFlags(commentIds): Promise<Set<string>>; the container wires the empty default until U32 replaces it"
    violation: "A thread that fails while Moderation does not exist yet"
    source: "C10, C11"
  - id: BR10.4
    statement: "The community deletion step deletes the account's reactions and nothing else, in the web transaction."
    category: calculation
    applies_to: "modules/community/internal/deletion-step.ts"
    trigger: "dataRequest.delete (U39)"
    logic: "deletionStepOn(tx, {accountId}) deletes every reactions row of the account and returns {reactionsDeleted}; a second run deletes nothing; no audit (U39 audits the plan); comments stay and are de-identified by Identity's step; there is no worker entry"
    violation: "Deleting or tombstoning the account's comments contradicts FR13 and AC10.3.3"
    source: "FR13, AC10.3.3, FD-077, T-302 Question 9, Question 6"
  - id: BR10.5
    statement: "Review exposes the thread context Community needs through one internal read built in this Unit."
    category: constraint
    applies_to: "modules/review/internal/thread-context.ts, ReviewRepository.threadContext, facilityReviewContext"
    trigger: "comment.post, reaction.set, community.thread"
    logic: "threadContextOn(tx, {publicId}, {lock: share | none}) -> {reviewId, publicId, state, deletedAt, authorPersonaId, identityMode, doctorPublicId} | null; facilityReviewContextOn(tx, {publicId}) -> {id, state, deletedAt, authorPersonaId, identityMode} | null; Community never reads the reviews table itself"
    violation: "A Community repository query on reviews breaks component ownership"
    source: "components.md Community -> Review, T-302 F12"
  - id: BR10.6
    statement: "The provider check uses Directory's approvedClaimOf."
    category: constraint
    applies_to: "comment.post, comment.edit"
    trigger: "Provider label (BR2.5)"
    logic: "directory.approvedClaimOf({accountId}) (U17 T-204); U30 depends on U17"
    violation: "Reading profile_claims from Community breaks ownership"
    source: "T-204 functional-spec (approvedClaimOf for U30), Question 15"

  # BR11 — boundaries, verification and records
  - id: BR11.1
    statement: "Every file sits where T-010's boundary matrix allows."
    category: constraint
    applies_to: "every file of this Unit"
    trigger: "pnpm lint:boundaries"
    logic: "domain imports nothing (the alias pattern comes from domain/identity inside the same element); contracts zod only; application domain and contracts only, no external or Node built-in; database application ports and contracts, never domain, so every decision is made before the repository; adapters only in server/container.ts; the worker imports nothing of this Unit"
    violation: "pnpm check red"
    source: "01-conventions §2, FD-093"
  - id: BR11.2
    statement: "Tests cover every level and the cumulative smoke suite grows."
    category: constraint
    applies_to: "tests of this Unit"
    trigger: "Build and Test"
    logic: "domain table tests; application happy path, every refusal, audit and outbox assertions; database *.int.test.ts for every repository method and the migration; at least one smoke assertion; 80% lines per package with untested files counted"
    violation: "A package under 80% or a removed smoke assertion fails the gate"
    source: "team.md Testing Posture, D10, FD-093"
  - id: BR11.3
    statement: "The test pins move in the same commit as the change."
    category: constraint
    applies_to: "not-implemented.test.ts, migrations.int.test.ts, validator-probes.int.test.ts P8, repositories-superset.test.ts, fakes/repositories.test.ts"
    trigger: "Code Generation"
    logic: "PgCommunityRepository leaves STUB_REPOSITORIES; the three T-401 block stubs on PgAccountRepository are replaced by the real methods; both migration-count pins go up by one; the community and account fakes follow the port names"
    violation: "pnpm check red on the first run (ISS-294)"
    source: "ISS-294, T-201 BR7.6 precedent"
  - id: BR11.4
    statement: "The demo seed carries the comment data the rules need."
    category: constraint
    applies_to: "packages/test-support/src/seed/seed-community.ts, seed.ts (one import line), seed.int.test.ts"
    trigger: "pnpm db:seed"
    logic: "after seed-content and before seed-moderation: comment_mentions for k5 (shafiq_ctg) and k39 (cure_in_days); provider_label true where providerForDoctorSeedRef equals the review's doctor (k2, k21, k32, k35); the corpus externalLink appended to the stored body when absent; one comment_versions row per seeded comment; each step idempotent by seed_ref"
    violation: "The thread shows no mentions, no provider labels and link warnings without a link"
    source: "ISS-270, ISS-262, CR-012, T-401 step 7, Question 16"
  - id: BR11.5
    statement: "Every new user-facing string has an English and a Bengali entry in the same commit."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "new keys errors.community.identityFixed, errors.community.tooManyMentions, errors.community.blockSelf; the existing replyDepth, blocked, mentionAnonymous and errors.common.rateLimited are reused; Bengali flagged for the owner's copy review (FD-042)"
    violation: "pnpm i18n:check red"
    source: "project.md Mandated (bilingual), ADR 0011"
  - id: BR11.6
    statement: "Defects and decisions are recorded."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md, docs/status/decision-log.md, 02-data-model.md, 03-routes-and-contracts.md"
    trigger: "Code Generation and Build and Test"
    logic: "the five FD entries of functional-spec.md § 18 appended before code; ISS rows for findings F1-F16 (Found in U30 T-401); ISS-262 and ISS-270 closed; 02 §8 (Like and Dislike on comments, new columns, comment_versions, provider label stored), §16 (no worker grant on comment_versions) and 03 §4 and §5 corrected"
    violation: "An undocumented data-model change"
    source: "project.md Mandated (ISS rows, FD before code), unit-of-work.md U30 note on 02 §8"
  - id: BR11.7
    statement: "The Unit runs the high-risk steps."
    category: constraint
    applies_to: "Build and Test, Review"
    trigger: "Before merge"
    logic: "collaborators on; a separate agent writes and runs 3-5 adversarial tests (functional-spec § 12.2); the owner's written sign-off in the Unit's record before the phase gate"
    violation: "Merging an anonymity-bearing Unit without the adversarial pass"
    source: "team.md Way of Working step 5, the dispatch brief"
```

## Rules summary

| Id | Rule | Kind |
|---|---|---|
| BR1.1 | post, edit, delete, react: authenticated, verified, not restricted | authorization |
| BR1.2 | block commands: authenticated only | authorization |
| BR1.3 | ownership through the viewer's own personas | authorization |
| BR1.4 | edit only published; delete published or hidden | authorization |
| BR1.5 | setState for system or staff, internal | authorization |
| BR1.6 | internals web tier only, nothing in the worker | constraint |
| BR1.7 | fixed limits 30, 60, 100, 60 per hour | constraint |
| BR1.8 | public ids in inputs and view models | constraint |
| BR2.1 | review author comments under the review persona | constraint |
| BR2.2 | one persona per account per thread | constraint |
| BR2.3 | first comment chooses the mode, default pseudonymous | calculation |
| BR2.4 | reaction persona: thread persona, null when anonymous | calculation |
| BR2.5 | provider label stored at write, never on an alias | calculation |
| BR2.6 | no private data in view models | constraint |
| BR2.7 | comment audit actor is the persona | constraint |
| BR2.8 | aliases cannot be mentioned | constraint |
| BR3.1 | text only, 1–2000 characters | validation |
| BR3.2 | one reply level, same review, published parent | constraint |
| BR3.3 | mention token shape | calculation |
| BR3.4 | at most five mentions | validation |
| BR3.5 | unknown usernames stay text | calculation |
| BR3.6 | links flagged, never fetched | calculation |
| BR3.7 | no classification | constraint |
| BR3.8 | edits re-check mentions, no notice | calculation |
| BR4.1 | comment state table | state-transition |
| BR4.2 | post writes version 1 | calculation |
| BR4.3 | edit writes a version and Edited | calculation |
| BR4.4 | delete: tombstone with live replies, else removed; text cleared | state-transition |
| BR4.5 | last live reply gone: tombstone gone | calculation |
| BR4.6 | private history never projected | constraint |
| BR4.7 | setState hide, restore, remove, purge | state-transition |
| BR4.8 | setState silent | constraint |
| BR4.9 | no restore of deleted comments | constraint |
| BR4.10 | lock order | constraint |
| BR4.11 | no hold logic here | constraint |
| BR5.1 | block.set by username, no self, idempotent | validation |
| BR5.2 | block.unset idempotent | calculation |
| BR5.3 | blocksBetween symmetric | calculation |
| BR5.4 | block refuses thread, reply and mention | constraint |
| BR5.5 | anonymous party: silent block | constraint |
| BR5.6 | blocks change no thread or flag | constraint |
| BR5.7 | blocks private | constraint |
| BR6.1 | reaction target visible | validation |
| BR6.2 | one current reaction, upsert | calculation |
| BR6.3 | Like and Dislike everywhere | constraint |
| BR6.4 | reactions not audited | constraint |
| BR6.5 | counts only | constraint |
| BR6.6 | engagement isolated | constraint |
| BR6.7 | self reactions allowed | calculation |
| BR7.1 | thread readable on published or tombstoned review | constraint |
| BR7.2 | visibility table | calculation |
| BR7.3 | placeholder fields | constraint |
| BR7.4 | danger flag from Moderation | calculation |
| BR7.5 | oldest first | calculation |
| BR7.6 | per-comment flags | calculation |
| BR7.7 | Identity's byline | calculation |
| BR7.8 | mentions and links in the view model | calculation |
| BR7.9 | fixed number of reads | constraint |
| BR7.10 | per-viewer, never shared-cached | constraint |
| BR7.11 | queries never write | constraint |
| BR8.1 | recipients minus self and blocks | calculation |
| BR8.2 | comment.posted ids only | constraint |
| BR8.3 | discussion email in the same transaction | calculation |
| BR8.4 | comment.changed routes no notice | constraint |
| BR9.1 | comment audit stream and details | constraint |
| BR9.2 | block audit on the account stream | constraint |
| BR9.3 | one audit and outbox row per command | constraint |
| BR9.4 | logs without body or account-content pairs | constraint |
| BR10.1 | hasDiscussion | calculation |
| BR10.2 | RevealTarget for comments | calculation |
| BR10.3 | ModerationSignals default | constraint |
| BR10.4 | deletion step: reactions only | calculation |
| BR10.5 | review thread context internal | constraint |
| BR10.6 | approvedClaimOf from Directory | constraint |
| BR11.1 | T-010 placement | constraint |
| BR11.2 | tests and smoke | constraint |
| BR11.3 | test pins | constraint |
| BR11.4 | seed comment data | constraint |
| BR11.5 | bilingual keys | constraint |
| BR11.6 | records | constraint |
| BR11.7 | high-risk steps | constraint |
