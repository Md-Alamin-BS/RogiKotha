# Entities — U30 `t-401-community-module`

Source of truth for the data shape this Unit reads and writes. Built from T-401 (with its amendments), `02-data-model.md` §0, §2, §3, §8, §12, §16 and §17, `components.md` (Community, Account, Identity, Review), `contract-summary.md` (C2, C4, C5, C9, C10, C15), the schema files on `main` at `9cf860a`, the corpus and prototype data, and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds one table (`comment_versions`, Question 5) and four columns on `comments` (`hidden_at`, `hidden_reason_code`, `removed_by`, `provider_label`), three indexes, and a stricter depth trigger. Entities owned by another component are listed because a read or a call crosses them; the owner is named on each.

```yaml
entities:
  - name: Comment
    owner: Community
    description: "A comment or a one-level reply in a review's thread (table comments)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; outbox payloads, audit and ports only" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "10-char base32; the only id in inputs and view models" }
      - { name: seed_ref, type: text, required: false, constraints: "demo seed only (k1-k49)" }
      - { name: review_id, type: uuid, required: true, references: Review.id, constraints: "ON DELETE CASCADE; immutable (trigger)" }
      - { name: parent_id, type: uuid, required: false, references: Comment.id, constraints: "set only on replies; the parent has no parent and the same review_id (trigger, BR3.2); immutable" }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "the thread persona of BR2.1-BR2.3; never an account id" }
      - { name: body, type: text, required: true, constraints: "1-2000 characters, trimmed, NFC; '' after an author delete or a moderator removal (BR4.4, BR4.7)" }
      - { name: has_external_link, type: boolean, required: true, default: false }
      - { name: provider_label, type: boolean, required: true, default: false, constraints: "new; set at post and edit only (BR2.5); never true on an anonymous persona" }
      - { name: state, type: enum, required: true, allowed_values: [published, hidden_pending_review, hidden, deleted_tombstone], constraints: "publication_state values used by comments; draft, pending_review and rejected never occur" }
      - { name: hidden_at, type: timestamp, required: false, constraints: "new; set by hide events, cleared by restore" }
      - { name: hidden_reason_code, type: text, required: false, constraints: "new; a report_reason or moderation reason code; never free text" }
      - { name: removed_by, type: enum, required: false, allowed_values: [author, moderation], constraints: "new; set with deleted_at" }
      - { name: edited_at, type: timestamp, required: false }
      - { name: deleted_at, type: timestamp, required: false, constraints: "set by an author delete or a moderator removal" }
      - { name: tombstone, type: boolean, required: true, default: false, constraints: "true only while deleted and at least one live reply exists (BR4.4, BR4.5)" }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: false }
    constraints:
      - "One reply level and same-review parent, enforced in the domain and by the replaced fn_comment_depth() trigger"
      - "Indexes: comments_review_created_idx (review_id, created_at, id), comments_author_persona_idx (author_persona_id), comments_parent_idx (parent_id) partial"
      - "rk_worker: table-level SELECT and UPDATE (unchanged, FD-092); nothing in this Unit runs in the worker"
    relationships:
      - { entity: Review, type: many-to-one, description: "each comment belongs to one review thread" }
      - { entity: Comment, type: one-to-many, description: "a top-level comment has replies" }
      - { entity: CommentVersion, type: one-to-many, description: "private history" }
      - { entity: CommentMention, type: one-to-many }
      - { entity: Persona, type: many-to-one, description: "written under one persona snapshot" }

  - name: CommentVersion
    owner: Community
    description: "New. One immutable row per posted or edited comment text (table comment_versions); private history for AC8.1.3 and AC8.1.4."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: comment_id, type: uuid, required: true, references: Comment.id, constraints: "ON DELETE CASCADE" }
      - { name: version, type: integer, required: true, min: 1, constraints: "unique with comment_id; 1 = post" }
      - { name: body, type: text, required: true, constraints: "the text of that version" }
      - { name: change_kind, type: enum, required: true, allowed_values: [post, edit] }
      - { name: actor_kind, type: enum, required: true, allowed_values: [author, system], constraints: "system only for the seed" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "UPDATE refused by a BEFORE UPDATE trigger with fn_block_mutation(); DELETE only by purge (BR4.7) and later T-309's expiry"
      - "Never in a view model, audit detail, outbox payload or log (BR4.6); rk_worker has no privilege (FD-037)"

  - name: CommentMention
    owner: Community
    description: "A mention of a pseudonymous persona in a comment (table comment_mentions)."
    attributes:
      - { name: comment_id, type: uuid, required: true, references: Comment.id }
      - { name: mentioned_persona_id, type: uuid, required: true, references: Persona.id, constraints: "never an anonymous persona (BR2.8); resolved through identity.publicByUsername" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Primary key (comment_id, mentioned_persona_id); at most 5 per comment (BR3.4); replaced on edit; deleted with the comment's text on delete and removal"

  - name: Reaction
    owner: Community
    description: "One current Like or Dislike by an account on a review, a facility review or a comment (table reactions)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: target_kind, type: enum, required: true, allowed_values: [review, facility_review, comment] }
      - { name: target_id, type: uuid, required: true, constraints: "internal id of the target" }
      - { name: account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "private; never projected" }
      - { name: public_persona_id, type: uuid, required: false, references: Persona.id, constraints: "BR2.4: thread persona, null when anonymous; shown nowhere in release 1 (FD (e))" }
      - { name: value, type: enum, required: true, allowed_values: [like, dislike], constraints: "the same set for every target kind (FD-062)" }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: true }
    constraints:
      - "unique (target_kind, target_id, account_id): one current reaction; change = upsert, removal = delete (BR6.2)"
      - "Read by no module but Community (BR6.6); no audit or outbox (BR6.4); rk_worker has no privilege"

  - name: Block
    owner: Account
    description: "A block from one account on another (table blocks). Commands built by this Unit in modules/account (Question 10)."
    attributes:
      - { name: blocker_account_id, type: uuid, required: true, references: AccountProfile.id }
      - { name: blocked_account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "never the blocker (BR5.1)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Primary key (blocker_account_id, blocked_account_id); read symmetrically by blocksBetween (BR5.3); private (BR5.7); rk_worker has no privilege"

  - name: Review (thread context)
    owner: Review
    description: "Read only, through review.threadContextOn (BR10.5); this Unit never queries reviews itself."
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: public_id, type: string, required: true }
      - { name: state, type: enum, required: true }
      - { name: deleted_at, type: timestamp, required: false }
      - { name: author_persona_id, type: uuid, required: true }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: doctor public id, type: string, required: true, constraints: "for the provider label" }
    constraints:
      - "Locked FOR SHARE by comment.post (T-302 F12); readable thread when published or a review tombstone (BR7.1)"

  - name: FacilityReview (reaction context)
    owner: Review
    description: "Read only, through review.facilityReviewContextOn, for reaction targets."
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: state, type: enum, required: true }
      - { name: deleted_at, type: timestamp, required: false }
      - { name: author_persona_id, type: uuid, required: true }
      - { name: identity_mode, type: enum, required: true }

  - name: Persona and PersonaLink
    owner: Identity
    description: "Read through identity.personasOf, personaFor, accountsOf, publicByUsername and bylinesFor; never directly (AD-3)."
    constraints:
      - "personaFor may create the actor's thread alias inside comment.post's transaction (T-104 WF2)"
      - "accountsOf is called only by commands (recipients), never by a query (BR2.6)"

  - name: ProfileClaim
    owner: Directory
    description: "Read through directory.approvedClaimOf({accountId}) (U17) for the provider label."

  - name: EmailDelivery
    owner: Notification
    description: "Written through notification.queueEmail (U34), category discussion, content-free params {reviewPublicId, commentPublicId}."

  - name: OutboxEvent and AuditEvent
    owner: Notification (outbox), Administration (audit)
    description: "Appended through Outbox.append and AuditWriter.write in the command's transaction (FD-065)."
```

## Value objects

```yaml
value_objects:
  - name: PostCommentInput
    fields: "reviewId (public id), parentId? (public id), body (1-2000, trimmed, NFC), identity? (named | pseudonymous | anonymous)"
  - name: EditCommentInput
    fields: "commentId, body"
  - name: DeleteCommentInput
    fields: "commentId"
  - name: SetReactionInput
    fields: "targetKind (review | facility_review | comment), targetId (public id), value (like | dislike | null)"
  - name: SetBlockInput / UnsetBlockInput
    fields: "username (USERNAME_RE)"
  - name: GetThreadInput
    fields: "reviewId"
  - name: ReactionsOfInput
    fields: "targetKind, targetId"
  - name: ThreadVM
    fields: "reviewId (public id), acceptsComments, truncated, comments: CommentVM[]"
  - name: CommentShownVM
    fields: "publicId, tombstone false, author BylineVM, body, mentions, links, hasExternalLink, postedAt, editedAt?, mine, canEdit, canDelete, canReply, providerHere, dangerous, moderationNotice?, likes, dislikes, myReaction?, replies"
  - name: CommentPlaceholderVM
    fields: "publicId, tombstone true, tombstoneReason (deleted | removed | withheld), replies"
  - name: ReactionCountsVM
    fields: "likes, dislikes, mine?"
  - name: CommentPostedPayload
    fields: "commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds[], replyToAccountId? (internal ids; filtered for self and blocks)"
  - name: CommentChangedPayload
    fields: "commentId, reviewId"
  - name: SetStateResult
    fields: "from, to, authorPersonaId"
  - name: ThreadContext
    fields: "reviewId, publicId, state, deletedAt, authorPersonaId, identityMode, doctorPublicId"
```

## Data the seed adds (Question 16)

| Data | Rows | Source |
|---|---|---|
| `comment_mentions` | 2 (k5 → `shafiq_ctg`, k39 → `cure_in_days`) | corpus `mentions` (ISS-270) |
| `comments.provider_label` true | 4 (k2 d1, k21 d4, k32 d8, k35 d8) | corpus `providerForDoctorSeedRef` equal to the review's doctor |
| link appended to `comments.body` | 2 (k4, k27) | corpus `externalLink` |
| `comment_versions` | 49 (one per comment, `post`, `actor_kind system`) | the stored body |

`seed.int.test.ts` pins these counts beside CR-012's.
