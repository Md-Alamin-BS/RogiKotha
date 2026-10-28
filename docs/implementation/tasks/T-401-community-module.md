# T-401 — Community module: comments, replies, mentions, reactions, blocks

| Field | Value |
|---|---|
| Story | STORY-COM-001, STORY-COM-002 |
| Phase / Lane | 4 / A |
| Class → model | M1 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-302 (review state + `review.setState` shape), T-104 (personas, thread-scoped anonymous alias), T-105 (config for rate limits), T-009 (outbox), T-405 (web-tier email queueing, FD-075) |
| Parallel-safe with | T-306, T-307 (not T-309: it depends on this task, FD-073; not T-405: it comes before this task, FD-075 — use the event names in 03 §5) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-062 / ADR-007** — Comments take **Like and Dislike**, as reviews do. `02-data-model.md` §8's "comments accept `like` only" and the prototype's like-only comment button are superseded. Changes Read first, Step 2 (`CommentVM`), Step 5 (`community.thread`), Tests to write and Acceptance checks.
- **FD-046** — The emergency-language banner (FR-COM-003) is retired for the demo; the static `/emergency` page covers it. This task builds no banner and runs no keyword or content check on comment text. Comment edit and delete stay under FR-EDIT-005. Changes Goal, Not in scope and Acceptance checks.
- **FD-073** — The legal-hold check on `comment.delete` arrives with T-309 (Retention's `RetentionSubject` port); this task builds none. Changes Parallel-safe with, Step 4 (`comment.delete`) and Not in scope.
- **FD-070 / FD-075** — Discussion email (comment, reply and mention) is queued from the web tier, not by the worker. `comment.post` calls T-405's web-tier email queueing directly, in the same transaction as the comment, for the `discussion` category. It fills `to_email_enc` through T-405 and applies each recipient's preferences (FD-047, FD-070). Contract Design names the call. T-405 therefore comes before this task. Changes: Depends on, Parallel-safe with, Not in scope, step 4 (`comment.post`) and a new acceptance row.

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **C10 / C15 — recipient ids in `comment.posted`** — The payload is `{commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds: [], replyToAccountId?}`. `comment.post` resolves the recipients in the web tier through `identity.accountsOf` (T-104) and removes the actor (self) and every account that has a block with the actor, using `account.blocksBetween`, before the ids enter the payload. `notification.deliver` (worker) therefore reads no persona link and no block. The discussion email goes to the same filtered recipients through T-405's `notification.queueEmail`. Changes: step 4 (`comment.post`) and new acceptance rows.
- **C5 / C10 — `account.blocksBetween`** — T-401 builds this internal query in `modules/account`: input `{accountId, otherAccountIds}`, result `{blocked: accountId[]}`; web tier only; caller `comment.post`. Changes: Owned paths.
- **C10 — `comment.setState`** — Internal command, input `{commentId, event: hideThreshold | hideCritical | hide | restore | remove | purge}`, callers `report.file` (T-403), `moderation.decide` and `moderation.restore` (T-404). T-401 builds the commands for `hide`, `restore`, `remove` and `purge`; T-403 extends the threshold events. `comment.changed` routes to no notice.
- **C9 / C10 — `DiscussionPresence`** — Review declares `DiscussionPresence.hasDiscussion(tx, reviewId): Promise<boolean>`; T-401 implements it in `modules/community`, and `review.delete` (T-302) uses it instead of `countComments`.
- **C4 / C10 — `RevealTarget` for comments** — T-401 implements Identity's `RevealTarget.resolve` for `targetKind: comment`, returning `{subject: 'persona', personaId}`.
- **C10 / C11 — `ModerationSignals`** — T-401 declares the port `ModerationSignals.dangerousFlags(commentIds): Promise<Set<string>>` in `modules/community/ports.ts`; T-403 implements it. Until then the thread query uses a default that flags nothing.
- **FD-077 / C10 — `community.deletionStep`** — Internal, input `{accountId}`. Web tier entry: delete the account's reactions. Worker entry: tombstone the account's comments, skipping held ones. T-401 builds both commands (the hold lookup arrives with T-309, and until then no row is held); T-410 wires them in `modules/community/deletion-participant.ts`. Changes: Owned paths and a new acceptance row.
- **FD-079 / C3 — held comments** — The hold check T-309 adds must leave `comment.delete` of a held comment looking exactly like an unheld delete for its author; this task adds no hold logic.

## Goal

Implement the `community` module: comments with exactly one reply level, `@username` mentions, an external-link warning flag, edit/delete with tombstones (FR-EDIT-005, FD-046), idempotent like/dislike reactions on reviews, facility reviews and comments alike (FD-062) that never expose an anonymous author, and user blocks — all as application commands with authorization, audit and outbox events, plus the `community.thread` query the discussion UI (T-402) renders from.

## Read first

1. `docs/implementation/01-conventions.md` §1–§5, §10
2. `docs/implementation/02-data-model.md` §8 (`comments`, `comment_mentions`, `reactions`; its note "Comments accept `like` only" is superseded — comments take `like|dislike`, FD-062, ADR-007), §2 (`blocks`), §3 (personas), §17 publication state machine
3. `docs/implementation/03-routes-and-contracts.md` §4 "community", §5 events (`comment.posted`, `comment.changed`)
4. Prototype behaviour to reproduce: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` lines 981–1059 (`ownComment`, `commentBody`, `commentHtml`, `replyBox`), 943–947 (`reactBtn`), and the click handlers at 2554–2635 (`data-react`, `data-clike`, `data-reply`, `data-post-reply`, `data-edit-comment`, `data-save-comment`, `data-del-comment`, `data-bookmark`). The prototype's comment button (`data-clike`) is like-only; reproduce its behaviour for Like and add Dislike with the same rules as review reactions (FD-062). T-402 renders both buttons.
5. `tools/smoke.mjs` — the eight comment assertions (reply prefill, one reply level, edit → `(edited)`, delete k10 → gone, delete k8 → tombstone with k9 kept, foreign comments expose no edit/delete)
6. Seed comments in `ui-design-prototype/shared/rogikotha-data.js` (`comments`, ids `k1`…`k10`; `k8` has reply `k9`, `k10` has none; some carry `dangerous`, `link`, `providerFor`, `mentions`)
7. `PRODUCT.md` hard rules (reporter/anonymity, engagement never weights ranking)

## Owned paths

- `packages/domain/src/community/` (`comment.ts`, `comment-state.ts`, `reaction.ts`, `mention.ts`, `policies.ts`, tests)
- `packages/application/src/modules/community/**` (commands including `set-state` and `deletion-step`, queries, `authorization.ts`, `ports.ts` for `ModerationSignals`, `presence.ts` for `DiscussionPresence`, `reveal-target.ts`, tests)
- `packages/application/src/modules/account/queries/blocks-between.ts` (C5)
- `packages/application/src/ports/repositories/community.ts`
- `packages/contracts/src/schemas/community.ts`, `packages/contracts/src/view-models/thread.ts` (`ThreadVM`)
- `packages/database/src/repositories/community.ts` (+ `*.int.test.ts`)
- `packages/test-support/src/fakes/community-repository.ts`, `packages/test-support/src/builders/comment.ts`
- `packages/i18n/messages/{en,bn}.json` — only the new `errors.community.*` keys

## Not in scope

The emergency-language banner FR-COM-003 (retired for the demo; the static `/emergency` page covers it, FD-046). The legal-hold check on `comment.delete`: T-309 adds it through Retention's `RetentionSubject` port after this task merges (FD-073). React components (T-402), the report sheet and `report.file` (T-403), notification rows and the worker's email send (T-405 consumes the outbox events you emit; you call T-405's web-tier email queueing from `comment.post`, FD-075), moderation `comment.setState` callers (T-403 defines the internal `setState` commands; you only expose the repository method they need), bookmarks (already in T-302's review repository — do not duplicate).

## Steps

1. **Domain.** In `packages/domain/src/community/`:
   - `comment.ts`: `Comment` type mirroring §8; invariant `parentId` may only reference a comment whose own `parentId` is null (`community.reply_depth`).
   - `comment-state.ts`: publication transitions for comments only: `published → hidden_pending_review | hidden | deleted_tombstone`, `hidden_pending_review → published | hidden`, `hidden → published`; author delete resolves to `deleted_tombstone` when `replyCount > 0`, else hard-removal marker `deleted` (row kept with `deleted_at`, not projected).
   - `mention.ts`: `parseMentions(body): string[]` — `@` followed by `[a-z0-9_]{3,24}`, deduplicated, max 5; pure.
   - `policies.ts`: `detectExternalLink(body): boolean` (any `http(s)://` or `www.` token); `canEditComment(actor, comment)` (author persona belongs to actor — resolved through identity, see step 3); `canReply(parent)`; `isBlocked(blockerId, actorId, blocks)`.
   - Tests for all of the above (table tests).
2. **Contracts.** `schemas/community.ts`: `PostCommentInput {reviewId, parentId?, body (1–2000 chars, trimmed)}`, `EditCommentInput`, `DeleteCommentInput`, `SetReactionInput {targetKind: 'review'|'facility_review'|'comment', targetId, value: 'like'|'dislike'|null}` (the same value set for every target kind, comments included, FD-062), `SetBlockInput {username}`. `view-models/thread.ts`: `ThreadVM = { reviewId, comments: CommentVM[] }`, `CommentVM = { publicId, author: {displayName, username?, kind, avatarHue}, body, mentions: string[], hasExternalLink, postedAt, editedAt?, tombstone: boolean, mine: boolean, canEdit: boolean, canReply: boolean, providerHere: boolean, likes: number, dislikes: number, myReaction?: 'like'|'dislike', replies: CommentVM[] }` (`dislikes` added, FD-062; the `likeCount` field in T-003's `thread.ts` stub becomes `likes` and `dislikes`). A tombstone VM carries only `publicId, tombstone: true, replies`.
3. **Authorization.** `authorization.ts`: `comment.post|edit|delete`, `reaction.set` require `authenticated + verifiedEmail + notRestricted`; `block.set|unset` require `authenticated`. Ownership: resolve the actor's persona set for this thread through `identity.personaFor` (named, pseudonymous, and the thread-scoped anonymous persona if one exists); a comment is "mine" when `author_persona_id` is in that set. Never compare account ids from public rows.
4. **Commands** (one file each, `defineCommand`):
   - `comment.post`: rate limit `comment:account:<id>` 30/h (`rate_limited`); load review (must be `published`); if `parentId` → parent must be top-level and `published` (`community.reply_depth`); if the review author has blocked the actor, or the parent's author has blocked the actor → `community.blocked`; author persona = the actor's persona in the review's identity mode? **No** — commenters choose their default persona: use the actor's pseudonymous persona unless the actor is the review's anonymous author, in which case reuse the thread alias (keeps "the author replied" consistent without linking). Parse mentions → resolve usernames → refuse if any resolves to an anonymous persona or a blocker (`community.mention_anonymous` / `community.blocked`); `has_external_link` flag; insert comment + mentions; audit `stream review:<id>` action `comment.posted` details `{commentId, parentId?, mentionCount, hasExternalLink}`; outbox `comment.posted {commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds, replyToAccountId?}` (ids only; the recipient ids are resolved through `identity.accountsOf` and filtered for self and blocks with `account.blocksBetween` before they enter the payload, C10); in the same transaction, call T-405's web-tier email queueing for the `discussion` category, once per recipient T-405's routing table names (the review author, and mentioned accounts, unless self or blocked; FD-075). The call fills `to_email_enc` and applies the recipient's preferences; the email params stay content-free (no comment text).
   - `comment.edit`: owner; body re-parsed for mentions/links; `edited_at = now`; audit; outbox `comment.changed`.
   - `comment.delete`: owner; if replies exist → `deleted_tombstone` (`tombstone = true`, body cleared to empty string), else `deleted_at` set; audit; outbox `comment.changed`. No legal-hold check here; T-309 adds it to this command (FD-073).
   - `reaction.set`: rate limit 100/h; target must be `published`; upsert on `(target_kind, target_id, account_id)`; `value: null` deletes the row; `public_persona_id` = actor's public persona **only if** the actor's identity on that thread is not anonymous, else null; no audit (high-volume; not a moderation-relevant change), no outbox.
   - `block.set` / `block.unset`: by username → account; cannot block self; audit `account:<id>` action `block.set` details `{blockedAccountId}` (private stream; never projected).
5. **Queries.** `community.thread {reviewId, actor}` → `ThreadVM`: top-level comments in `published|hidden_pending_review(only for the author/staff)|deleted_tombstone` states ordered by `created_at asc`, replies nested; `likes` = count of `like` reactions and `dislikes` = count of `dislike` reactions per comment (FD-062); `myReaction` for the actor; `mine/canEdit` via step 3; `providerHere` = author persona's account has an approved claim on the review's doctor (query the directory repository, read-only). `community.reactionsOf {targetKind, targetId}` → `{likes, dislikes, mine?}` — counts only; never a list. `community.blockedList {actor}` → usernames.
6. **Repository** (`packages/database/src/repositories/community.ts`) implementing `CommunityRepository`: `insertComment`, `updateCommentBody`, `markDeleted`, `markTombstone`, `setCommentState` (used by T-403/T-404 through their own commands), `threadFor(reviewId)`, `upsertReaction`, `deleteReaction`, `reactionCounts`, `myReactions`, `insertBlock`, `deleteBlock`, `blocksBetween`. Integration tests against compose PostgreSQL.
7. **Fakes + builders** in `test-support`; extend `seed.ts` mapping for `comments` (k1…k10 with `mentions`, `link` → `has_external_link`, `providerFor` → claim on doctor in seed) — coordinate: the seed file is owned by T-007; add a `seed/community.ts` file and one import line in `seed.ts` (allowed edit, note it in hand-off).
8. **i18n**: add `errors.community.replyDepth`, `errors.community.blocked`, `errors.community.mentionAnonymous`, `errors.rateLimited` (if T-101 did not) in both files.
9. Run `pnpm check`; fill hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| One reply level | `pnpm vitest run packages/application/src/modules/community` | replying to a reply returns `community.reply_depth` |
| k8/k9/k10 scenarios | same | delete k10 → `deleted_at` set, absent from thread; delete k8 → tombstone present with k9 nested |
| Mention refusal | same | `@anon_author_r2`'s anonymous persona cannot be mentioned; error `community.mention_anonymous` |
| Reaction idempotency | `pnpm vitest run packages/database` (int) | like → like → dislike → null leaves 0 rows; concurrent 20 likes from one account leave 1 row |
| Anonymous linkage | application test | reaction by the anonymous author of r2 has `public_persona_id = null`; `reactionsOf` returns counts only |
| Block effect | application test | blocked user posting a reply on blocker's thread → `community.blocked`; existing comments still render |
| Rate limits | application test with FakeClock | 31st comment in an hour → `rate_limited` with `retryAfter` |
| Audit + outbox | application test | `comment.post` writes one audit row and one outbox row in the same transaction; details contain no body text |
| Boundaries | `pnpm lint` | no import of `database`/`adapters` from `application` or `domain` |
| FD-062: Like then Dislike on a comment (AC8.2.1) | application test | a verified synthetic user who has not reacted to comment k1 sets `like`, then `dislike` → exactly one reaction row with `value = 'dislike'`; k1's `likes` drops by 1 and `dislikes` rises by 1 in `community.thread`, and `myReaction === 'dislike'` |
| FD-062: Dislike on a comment is accepted and removable (AC8.2.1, AC8.2.2) | application test + `pnpm vitest run packages/database` (int) | on a comment with no other reactions, `reaction.set {targetKind: 'comment', value: 'dislike'}` is not a validation error; the same dislike sent twice, or 20 times concurrently, leaves one row and `dislikes: 1`; `value: null` removes it and `reactionsOf` returns `{likes: 0, dislikes: 0}` |
| FD-062: anonymous author's comment dislike stays unlinked (AC8.2.3) | application test | a dislike on a comment by the anonymous author of r2 has `public_persona_id = null`; `reactionsOf` returns counts only, no list |
| FD-062: comment reactions never weight summaries (AC8.2.5) | application test | adding 10 dislikes to comments on r1 leaves the doctor's sentiment and outcome distributions and the search ranking inputs unchanged |
| FD-075: Discussion email from the web tier (AC10.1.4, AC10.1.5) | application test: a synthetic user comments on another user's review, with the review author's `emailDiscussion` preference off, then on; then the worker's `mail.send` is run | `comment.post` queues the email through T-405's web-tier queueing in the same transaction as the comment: off → no `email_deliveries` row and the in-app item still appears; on → one row with `to_email_enc` filled (encrypted, not plaintext) and content-free params, and the worker sends it from the decrypted address. A blocked or self comment queues none |
| C10: recipient ids filtered in the web tier | application test: user B (blocked by the review author A) replies to A's review and mentions C; separately A comments on A's own review | for B's comment the payload has `reviewAuthorAccountId` absent (A blocked B), `mentionedAccountIds = [C]`; for A's own comment no self id appears in any field; no payload field holds a persona id, username or email |
| C10: `notification.deliver` needs no persona link | worker test over the `comment.posted` payload above | the in-app rows are created for exactly the ids in the payload; the handler issues no query on `persona_links` or `blocks` |
| C5: `account.blocksBetween` | application test | with A blocking B and C blocking A, `blocksBetween(A, [B, C, D])` returns `blocked = [B, C]` |
| C9/C10: `hasDiscussion` | application test | `hasDiscussion` is true for a review with a published or tombstoned comment and false for one with none or only a hard-removed comment |
| FD-077: community deletion step (C10) | application test | web entry removes all the account's reactions; worker entry tombstones the account's comments (replies kept) and skips a comment a fake hold lookup marks held; a second run changes nothing |
| FD-046: no emergency-language banner (AC8.1.2) | application test | posting a synthetic comment containing "chest pain now" and "999" stores and returns the body unchanged, and `CommentVM` carries no banner, emergency or classification field |
| FD-046: comment edit stays under FR-EDIT-005 (AC8.1.3) | application test | editing k1 sets `editedAt` and `community.thread` shows only the new text; delete is covered by the k8/k9/k10 row above |

## Tests to write

- Domain: `parseMentions` (5 cases), `detectExternalLink` (6 cases), comment state table, delete resolution (with/without replies).
- Application: each command's happy path + each refusal listed above + audit/outbox assertions + "foreign comment exposes `canEdit: false`" + Like and Dislike on comments, including switching and removing (FD-062).
- Database: repository methods, unique reaction constraint, thread ordering, `like` and `dislike` counts per comment (FD-062).

## Hard-rule checklist

- [ ] Engagement (likes/dislikes) is never read by search or aggregates — confirm no export from this module is imported by `search` or `review` aggregates.
- [ ] Anonymous author's reactions and mentions never link to the account or to the pseudonymous persona.
- [ ] Deleted comment with replies leaves a tombstone; without replies it disappears.
- [ ] External links are flagged for the warning; no link is followed or fetched server-side.
- [ ] No body text in audit details or outbox payloads.
- [ ] Both locales for every new error key.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
