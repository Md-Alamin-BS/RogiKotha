# Entities — U49 `u49-comments`

Source of truth for the data shapes the release-1 Community module reads and writes. Workflows are in `functional-spec.md`, decision logic in `rules.md`. U49 adds no table, column or migration: the `comments` table and the `fn_comment_depth` trigger on `main` already hold everything release 1 needs (Q5). Entities owned by another Unit are listed because a call crosses them.

```yaml
entities:
  - name: Comment
    owner: Community (U49)
    description: "A comment or a one-level reply on a published review (table comments)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; audit, outbox and repository only" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "10-char base32; the only comment id in inputs and view models" }
      - { name: review_id, type: uuid, required: true, references: reviews.id, constraints: "internal; from reviewIdForPublicId" }
      - { name: parent_id, type: uuid, required: false, references: comments.id, constraints: "null for top-level; a parent must itself have parent_id null (BR1.4, trigger)" }
      - { name: author_persona_id, type: uuid, required: true, references: personas.id, constraints: "never an account id; never leaves the server" }
      - { name: body, type: text, required: true, min: 1, max: 2000, constraints: "plain text, trimmed, NFC (BR1.2); kept privately after delete, never projected once deleted" }
      - { name: has_external_link, type: boolean, required: true, default: false, constraints: "still set at insert as the demo does; not shown in release 1 (warned links deferred)" }
      - { name: state, type: enum, required: true, allowed: [published, deleted_tombstone], constraints: "U49 writes only these two; hidden_pending_review, hidden and rejected are moderation's (release 2)" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "set by comment.delete" }
      - { name: tombstone, type: boolean, required: true, default: false, constraints: "true when deleted with live replies (BR2.3)" }
      - { name: created_at, type: timestamp, required: true, constraints: "thread order key with id" }
      - { name: updated_at, type: timestamp, required: false, constraints: "set by delete" }
      - { name: edited_at, type: timestamp, required: false, constraints: "not written in release 1 (editing deferred)" }
      - { name: seed_ref, type: text, required: false, constraints: "demo seed only" }
    constraints:
      - "one reply level: fn_comment_depth trigger plus BR1.4"
      - "a reply belongs to the same review as its parent (BR1.4)"
    relationships:
      - "Review 1 — 0..* Comment (review_id)"
      - "Comment 1 — 0..* Comment as replies (parent_id), depth 1"
      - "Persona 1 — 0..* Comment (author_persona_id)"

  - name: PostCommentInput
    owner: Community (U49), packages/contracts/src/schemas/community.ts
    description: "Input of comment.post (replaces CommentPostInput's reviewId field for release 1)."
    attributes:
      - { name: reviewPublicId, type: string, required: true, constraints: "PUBLIC_ID_RE" }
      - { name: parentPublicId, type: string, required: false, constraints: "PUBLIC_ID_RE" }
      - { name: body, type: string, required: true, min: 1, max: 2000, constraints: "trimmed before the length check" }

  - name: DeleteCommentInput
    owner: Community (U49)
    description: "Input of comment.delete."
    attributes:
      - { name: commentPublicId, type: string, required: true, constraints: "PUBLIC_ID_RE" }

  - name: GetThreadInput
    owner: Community (U49)
    description: "Input of community.thread."
    attributes:
      - { name: reviewPublicId, type: string, required: true, constraints: "PUBLIC_ID_RE; anything else gives the closed empty thread" }

  - name: ThreadVM
    owner: Community (U49), packages/contracts/src/view-models/thread.ts
    description: "The public thread of one review (replaces the T-003 stub)."
    attributes:
      - { name: open, type: boolean, required: true, constraints: "false for an unknown or unpublished review (BR3.1)" }
      - { name: items, type: "ThreadItemVM[]", required: true, constraints: "top-level items oldest first" }
      - { name: truncated, type: boolean, required: true, default: false, constraints: "true whenever more listed rows exist than the 500 kept; the cap counts every listed row, tombstones included (BR3.6)" }
    constraints:
      - "no reviewId, accountId, personaId or internal comment id (BR4.1)"
      - "no like, dislike, score or rank field (BR3.7)"

  - name: ThreadItemVM
    owner: Community (U49)
    description: "A top-level entry: a live comment or a placeholder, with its live replies."
    attributes:
      - { name: kind, type: enum, required: true, allowed: [comment, placeholder] }
      - { name: comment, type: CommentVM, required: false, constraints: "present only when kind = comment" }
      - { name: placeholderPublicId, type: string, required: false, constraints: "present only when kind = placeholder; React key only; no body, author or date" }
      - { name: replies, type: "CommentVM[]", required: true, constraints: "live replies oldest first; at least one when kind = placeholder" }

  - name: CommentVM
    owner: Community (U49)
    description: "One live comment or reply as the public sees it."
    attributes:
      - { name: publicId, type: string, required: true }
      - { name: author, type: PersonaPublicVM, required: true, constraints: "from identity.publicProjections only (BR3.4)" }
      - { name: body, type: string, required: true, constraints: "plain text" }
      - { name: postedAt, type: string, required: true, constraints: "ISO date-time; rendered with formatDate(locale)" }
      - { name: mine, type: boolean, required: true, constraints: "computed on the server with ownsPersona once per distinct author, only for a signed-in viewer (BR3.5)" }
      - { name: isReply, type: boolean, required: true, constraints: "a reply offers no reply (BR5.3)" }

  - name: CommentLimits
    owner: Community (U49), packages/domain/src/community/limits.ts
    description: "Release-1 constants standing in for T-105 (C18)."
    attributes:
      - { name: COMMENT_BODY_MAX, type: integer, default: 2000 }
      - { name: COMMENT_POST_LIMIT, type: integer, default: 30 }
      - { name: COMMENT_POST_WINDOW_SEC, type: integer, default: 3600 }
      - { name: THREAD_CAP, type: integer, default: 500 }

  - name: PersonaPublicVM
    owner: Identity (U11)
    description: "The public shape of a persona; read only, through publicProjections."
    relationships:
      - "CommentVM.author"

  - name: Review
    owner: Review (U47)
    description: "Reached only through ReviewSeams (reviewIdForPublicId, isReviewPublished, isReviewAuthor, authorIdentityModeOf)."
```

## Summary

- **Comment** is the one table U49 owns. It writes only `published` and `deleted_tombstone`; the deleted body stays in the row as private data and is never projected.
- **Inputs** carry public ids only: `PostCommentInput`, `DeleteCommentInput`, `GetThreadInput`.
- **ThreadVM → ThreadItemVM → CommentVM** is the public shape: items that are a live comment or a placeholder, live replies one level deep, authors as persona projections, `mine` as a boolean, no ids beyond public ids, no numbers.
- **CommentLimits** are the C18 module constants.
- **Persona** (U11) and **Review** (U47) are only reached through their seams.
