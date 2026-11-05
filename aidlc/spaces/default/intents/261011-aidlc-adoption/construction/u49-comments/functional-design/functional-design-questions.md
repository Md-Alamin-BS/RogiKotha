# Functional Design — questions (U49 `u49-comments`)

Context: U49 merges T-401 and T-402, slimmed for release 1 (FD-105). It depends on U47 (`ReviewSeams`, the `<CommentThread>` slot), U11 (`personaFor`, `publicProjections`, `IdentityOwnership`) and U9 (`ContributionGate`, `getContributionAccess`). Inputs read: `unit-of-work.md` U49, the story map, `requirements.md` (FR72–FR75), `stories.md` (AC8.1.1–AC8.1.6, AC3.3.1, AC3.3.2), `contract-summary.md` (C4, C9, C10, C16, C18, C19), FD-099 to FD-105, the approved U47, U11 and U9 designs, the demo comment code on `main` (`f56e9fc`) and the drafts in `docs/aidlc-migration/design-drafts/t-401-community-module/` and `t-402-discussion-ui/`.

Every question below is answered by its recommended option, decided by the agent under the owner's delegation of 2026-11-04.

## Settled before this stage

- One reply level, enforced by the domain and the `fn_comment_depth` trigger (FR74).
- Placeholder when a deleted comment has replies, removed otherwise (FR72, C10 release 1).
- Review published check through `isReviewPublished`, public ids resolved once through `reviewIdForPublicId` (C10, C16).
- Ownership of a comment through `IdentityOwnership.ownsPersona` (U11 Q1).
- Gate through U9's `ContributionGate purpose="comment"` (C16).
- No discussion email, no mentions, reactions, blocks, reports or editing (FD-105).

## Question 1

**Under which persona does a member comment?** AC3.3.1 says the review's author appears in the thread with the identity chosen for the review. The demo posts every comment under the named persona; T-401 step 4 uses the pseudonymous persona; the draft (Q1) proposed a per-thread identity choice.

A. **The review's author under the review's identity mode; everyone else under their pseudonymous persona** (recommended). Meets AC3.3.1 and AC3.3.2 and the task text; no identity picker in release 1. Anonymous comments by other members wait for release 2 (ISS-262).
B. **Per-thread identity choice for every commenter** (draft Q1). More UI and one more refusal; belongs with release 2's composer work.
C. **Named persona for everyone, as the demo.** Breaks AC3.3.1 for an anonymous review author and links the alias to a name.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR1.6.

## Question 2

**How does U49 learn the identity mode of the review?** `ReviewSeams` gives `isReviewAuthor` but not the mode, and U49 may not read the review module's tables or repository (C19).

A. **An additive seam `authorIdentityModeOf(tx, {reviewId}) → IdentityMode | null` on `ReviewSeams`, built by U47 before it merges** (recommended). One small read over a column U47 already stores; additive, so not breaking under BR6.8; agreed in `contract-summary.md` C9 first if U47 has already merged.
B. **The community repository reads `reviews.identity_mode` itself.** No change to U47, but it crosses the module boundary C19 forbids.
C. **Ask Identity for an existing thread alias without creating one.** Needs a new U11 function and still guesses the mode from the presence of a link.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. `functional-spec.md` § 7.

## Question 3

**Body length and format?** The contract schema allows 4000; the demo and its form use 1–2000.

A. **Plain text, 1–2000 characters after trimming and NFC; links and @-names stay literal** (recommended). Keeps today's form, message key and behaviour.
B. **4000 as in the contract schema.** Changes the form and the message for no release-1 need.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR1.2.

## Question 4

**The post rate limit (C18 leaves it to U49)?**

A. **30 per account per hour, key `comment.post:account:<accountId>`, counted after validation, constant in `domain/community/limits.ts`** (recommended). The value C10 already names; refused input does not use up the limit; an S4 row records it for T-105.
B. **10 per hour.** Stricter than any source asks.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR1.5.

## Question 5

**What does a delete write?** There is no private history table in release 1, and FR72 keeps deleted text "only in private history".

A. **Soft delete: `state deleted_tombstone`, `deleted_at`, `tombstone` = has live replies; the body stays in the row, never projected; no new table** (recommended). What the demo does; keeps the text private for the later retention and moderation work; no migration.
B. **Clear the body on delete.** Loses what a later hold or moderator needs.
C. **Hard delete when there are no replies.** Loses the audit context and breaks the placeholder's replies if a race adds one.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR2.3, BR3.3. Purging the private body after a retention period is a release-2 point (S4 row).

## Question 6

**Audit stream, actor and outbox?**

A. **Stream `comment:<commentId>`, actor `persona:<authorPersonaId>` for post and delete; outbox `comment.posted {commentId, reviewId}` on post only** (recommended). No audit row links an alias to an account; the outbox payload is the C10 release-1 shape.
B. **Stream `review:<reviewId>`.** Mixes discussion into the review's timeline.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR1.7, BR2.4.

## Question 7

**How large may a thread be?**

A. **At most 500 comments and replies, with a `truncated` flag and a bilingual note** (recommended). Bounded page; far above any demo thread.
B. **No cap.** Unbounded read and render.
C. **Pagination.** UI the prototype does not have.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR3.6.

## Question 8

**When is the demo comment code removed?** U11's boundary test allows `demo/comments.ts` as a `persona_links` reader until U49 removes it.

A. **In U49's Code Generation Bolt, in the same commit that switches the slot and the actions: delete `demo/comments.ts`, drop the `comments` binding from `server/data.ts`, and remove the allowlist line in U11's test** (recommended). No moment where two comment paths exist.
B. **Leave it to U50's clean-up.** Keeps a second `persona_links` reader alive through the release check.
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR6.1, `functional-spec.md` § 6.

## Question 9

**May a restricted or unconfirmed account delete its own comment?**

A. **Yes, any account may delete its own comment; posting needs active and confirmed** (recommended). A member can always take their own words down; release 1 sets no restricted state anyway.
B. **Same requirement as posting.**
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. BR2.1.

## Ambiguity check

No answer is vague or contradicts another. Q2 depends on U47's Code Generation adding one seam; `functional-spec.md` § 7 says what happens if it has already merged.
