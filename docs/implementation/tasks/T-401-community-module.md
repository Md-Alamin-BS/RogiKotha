# T-401 — Community module: comments, replies, mentions, reactions, blocks

| Field | Value |
|---|---|
| Story | STORY-COM-001, STORY-COM-002 |
| Phase / Lane | 4 / A |
| Class → model | M1 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-302 (review state + `review.setState` shape), T-104 (personas, thread-scoped anonymous alias), T-105 (config for rate limits), T-009 (outbox) |
| Parallel-safe with | T-405 (notification module — agree the event names in 03 §5 first), T-306, T-307, T-309 |

## Goal

Implement the `community` module: comments with exactly one reply level, `@username` mentions, an external-link warning flag, edit/delete with tombstones, idempotent like/dislike reactions that never expose an anonymous author, and user blocks — all as application commands with authorization, audit and outbox events, plus the `community.thread` query the discussion UI (T-402) renders from.

## Read first

1. `docs/implementation/01-conventions.md` §1–§5, §10
2. `docs/implementation/02-data-model.md` §8 (`comments`, `comment_mentions`, `reactions`), §2 (`blocks`), §3 (personas), §17 publication state machine
3. `docs/implementation/03-routes-and-contracts.md` §4 "community", §5 events (`comment.posted`, `comment.changed`)
4. Prototype behaviour to reproduce: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` lines 981–1059 (`ownComment`, `commentBody`, `commentHtml`, `replyBox`), 943–947 (`reactBtn`), and the click handlers at 2554–2635 (`data-react`, `data-clike`, `data-reply`, `data-post-reply`, `data-edit-comment`, `data-save-comment`, `data-del-comment`, `data-bookmark`)
5. `tools/smoke.mjs` — the eight comment assertions (reply prefill, one reply level, edit → `(edited)`, delete k10 → gone, delete k8 → tombstone with k9 kept, foreign comments expose no edit/delete)
6. Seed comments in `ui-design-prototype/shared/rogikotha-data.js` (`comments`, ids `k1`…`k10`; `k8` has reply `k9`, `k10` has none; some carry `dangerous`, `link`, `providerFor`, `mentions`)
7. `PRODUCT.md` hard rules (reporter/anonymity, engagement never weights ranking)

## Owned paths

- `packages/domain/src/community/` (`comment.ts`, `comment-state.ts`, `reaction.ts`, `mention.ts`, `policies.ts`, tests)
- `packages/application/src/modules/community/**` (commands, queries, `authorization.ts`, tests)
- `packages/application/src/ports/repositories/community.ts`
- `packages/contracts/src/schemas/community.ts`, `packages/contracts/src/view-models/thread.ts` (`ThreadVM`)
- `packages/database/src/repositories/community.ts` (+ `*.int.test.ts`)
- `packages/test-support/src/fakes/community-repository.ts`, `packages/test-support/src/builders/comment.ts`
- `packages/i18n/messages/{en,bn}.json` — only the new `errors.community.*` keys

## Not in scope

React components (T-402), the report sheet and `report.file` (T-403), notification rows/emails (T-405 consumes the outbox events you emit), moderation `comment.setState` callers (T-403 defines the internal `setState` commands; you only expose the repository method they need), bookmarks (already in T-302's review repository — do not duplicate).

## Steps

1. **Domain.** In `packages/domain/src/community/`:
   - `comment.ts`: `Comment` type mirroring §8; invariant `parentId` may only reference a comment whose own `parentId` is null (`community.reply_depth`).
   - `comment-state.ts`: publication transitions for comments only: `published → hidden_pending_review | hidden | deleted_tombstone`, `hidden_pending_review → published | hidden`, `hidden → published`; author delete resolves to `deleted_tombstone` when `replyCount > 0`, else hard-removal marker `deleted` (row kept with `deleted_at`, not projected).
   - `mention.ts`: `parseMentions(body): string[]` — `@` followed by `[a-z0-9_]{3,24}`, deduplicated, max 5; pure.
   - `policies.ts`: `detectExternalLink(body): boolean` (any `http(s)://` or `www.` token); `canEditComment(actor, comment)` (author persona belongs to actor — resolved through identity, see step 3); `canReply(parent)`; `isBlocked(blockerId, actorId, blocks)`.
   - Tests for all of the above (table tests).
2. **Contracts.** `schemas/community.ts`: `PostCommentInput {reviewId, parentId?, body (1–2000 chars, trimmed)}`, `EditCommentInput`, `DeleteCommentInput`, `SetReactionInput {targetKind: 'review'|'facility_review'|'comment', targetId, value: 'like'|'dislike'|null}`, `SetBlockInput {username}`. `view-models/thread.ts`: `ThreadVM = { reviewId, comments: CommentVM[] }`, `CommentVM = { publicId, author: {displayName, username?, kind, avatarHue}, body, mentions: string[], hasExternalLink, postedAt, editedAt?, tombstone: boolean, mine: boolean, canEdit: boolean, canReply: boolean, providerHere: boolean, likes: number, myReaction?: 'like'|'dislike', replies: CommentVM[] }`. A tombstone VM carries only `publicId, tombstone: true, replies`.
3. **Authorization.** `authorization.ts`: `comment.post|edit|delete`, `reaction.set` require `authenticated + verifiedEmail + notRestricted`; `block.set|unset` require `authenticated`. Ownership: resolve the actor's persona set for this thread through `identity.personaFor` (named, pseudonymous, and the thread-scoped anonymous persona if one exists); a comment is "mine" when `author_persona_id` is in that set. Never compare account ids from public rows.
4. **Commands** (one file each, `defineCommand`):
   - `comment.post`: rate limit `comment:account:<id>` 30/h (`rate_limited`); load review (must be `published`); if `parentId` → parent must be top-level and `published` (`community.reply_depth`); if the review author has blocked the actor, or the parent's author has blocked the actor → `community.blocked`; author persona = the actor's persona in the review's identity mode? **No** — commenters choose their default persona: use the actor's pseudonymous persona unless the actor is the review's anonymous author, in which case reuse the thread alias (keeps "the author replied" consistent without linking). Parse mentions → resolve usernames → refuse if any resolves to an anonymous persona or a blocker (`community.mention_anonymous` / `community.blocked`); `has_external_link` flag; insert comment + mentions; audit `stream review:<id>` action `comment.posted` details `{commentId, parentId?, mentionCount, hasExternalLink}`; outbox `comment.posted {commentId, reviewId, parentId?, mentionedAccountIds}` (ids only).
   - `comment.edit`: owner; body re-parsed for mentions/links; `edited_at = now`; audit; outbox `comment.changed`.
   - `comment.delete`: owner; if replies exist → `deleted_tombstone` (`tombstone = true`, body cleared to empty string), else `deleted_at` set; audit; outbox `comment.changed`.
   - `reaction.set`: rate limit 100/h; target must be `published`; upsert on `(target_kind, target_id, account_id)`; `value: null` deletes the row; `public_persona_id` = actor's public persona **only if** the actor's identity on that thread is not anonymous, else null; no audit (high-volume; not a moderation-relevant change), no outbox.
   - `block.set` / `block.unset`: by username → account; cannot block self; audit `account:<id>` action `block.set` details `{blockedAccountId}` (private stream; never projected).
5. **Queries.** `community.thread {reviewId, actor}` → `ThreadVM`: top-level comments in `published|hidden_pending_review(only for the author/staff)|deleted_tombstone` states ordered by `created_at asc`, replies nested; `likes` = count of `like` reactions per comment; `myReaction` for the actor; `mine/canEdit` via step 3; `providerHere` = author persona's account has an approved claim on the review's doctor (query the directory repository, read-only). `community.reactionsOf {targetKind, targetId}` → `{likes, dislikes, mine?}` — counts only; never a list. `community.blockedList {actor}` → usernames.
6. **Repository** (`packages/database/src/repositories/community.ts`) implementing `CommunityRepository`: `insertComment`, `updateCommentBody`, `markDeleted`, `markTombstone`, `setCommentState` (used by T-403/T-404 through their own commands), `threadFor(reviewId)`, `upsertReaction`, `deleteReaction`, `reactionCounts`, `myReactions`, `insertBlock`, `deleteBlock`, `blocksBetween`. Integration tests against compose PostgreSQL.
7. **Fakes + builders** in `test-support`; extend `seed.ts` mapping for `comments` (k1…k10 with `mentions`, `link` → `has_external_link`, `providerFor` → claim on doctor in seed) — coordinate: the seed file is owned by T-007; add a `seed/community.ts` file and one import line in `seed.ts` (allowed edit, note it in hand-off).
8. **i18n**: add `errors.community.replyDepth`, `errors.community.blocked`, `errors.community.mentionAnonymous`, `errors.rateLimited` (if T-101 did not) in both files.
9. Run `pnpm check`; fill hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| One reply level | `pnpm vitest run packages/application/src/modules/community` | replying to a reply returns `community.reply_depth` |
| k8/k9/k10 scenarios | same | delete k10 → `deleted_at` set, absent from thread; delete k8 → tombstone present with k9 nested |
| Mention refusal | same | `@anon_author_r4`'s anonymous persona cannot be mentioned; error `community.mention_anonymous` |
| Reaction idempotency | `pnpm vitest run packages/database` (int) | like → like → dislike → null leaves 0 rows; concurrent 20 likes from one account leave 1 row |
| Anonymous linkage | application test | reaction by the anonymous author of r4 has `public_persona_id = null`; `reactionsOf` returns counts only |
| Block effect | application test | blocked user posting a reply on blocker's thread → `community.blocked`; existing comments still render |
| Rate limits | application test with FakeClock | 31st comment in an hour → `rate_limited` with `retryAfter` |
| Audit + outbox | application test | `comment.post` writes one audit row and one outbox row in the same transaction; details contain no body text |
| Boundaries | `pnpm lint` | no import of `database`/`adapters` from `application` or `domain` |

## Tests to write

- Domain: `parseMentions` (5 cases), `detectExternalLink` (6 cases), comment state table, delete resolution (with/without replies).
- Application: each command's happy path + each refusal listed above + audit/outbox assertions + "foreign comment exposes `canEdit: false`".
- Database: repository methods, unique reaction constraint, thread ordering.

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
