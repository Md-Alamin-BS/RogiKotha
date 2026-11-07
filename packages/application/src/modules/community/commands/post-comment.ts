// `comment.post` (U49 WF1, BR1.1–BR1.7): a comment or a one-level reply on a published review.
// Every refusal comes before the limiter, so only a post that would be written is counted; the
// persona, the comment, its audit row and its outbox event commit together.
import { err, ok, PostCommentInput, type IdentityMode } from '@rogikotha/contracts';
import { COMMENT_POST_LIMIT, COMMENT_POST_WINDOW_SEC, isLive } from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import type { RateLimitKey } from '../../../ports';
import { communityAudit } from '../audit';
import type { CommunityModulePorts } from '../ports';

export interface PostCommentOutput {
  publicId: string;
}

export function commentPostKey(accountId: string): RateLimitKey {
  return `comment.post:account:${accountId}`;
}

// ASSUMPTION(U49): the contracts have no `unauthenticated` code, so the shared requirement order
// answers as it does for U47's publish: `forbidden` signed out, `auth.email_unverified` for an
// unconfirmed email and `forbidden` when restricted; the action maps each to its message (BR1.1).
export function postCommentCommand(deps: CommunityModulePorts) {
  return defineCommand<PostCommentInput, PostCommentOutput>({
    name: 'comment.post',
    input: PostCommentInput,
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    async handle({ input, tx, actor, ports }) {
      const correlationId = actor.correlationId;
      const accountId = actor.accountId;
      if (accountId === undefined || actor.status !== 'active') {
        return err('forbidden', { correlationId });
      }

      const reviewId = await deps.review.reviewIdForPublicId(tx, {
        publicId: input.reviewPublicId,
      });
      if (reviewId === null || !(await deps.review.isReviewPublished(tx, { reviewId }))) {
        return err('not_found', { correlationId });
      }

      let parentId: string | null = null;
      if (input.parentPublicId !== undefined) {
        const parent = await deps.comments.byPublicId(tx, {
          reviewId,
          publicId: input.parentPublicId,
        });
        if (parent === null || !isLive(parent)) return err('not_found', { correlationId });
        if (parent.parentId !== null) return err('community.reply_depth', { correlationId });
        parentId = parent.id;
      }

      // The mode is read before the limiter, so the broken-invariant refusal is not counted.
      let mode: IdentityMode = 'pseudonymous';
      if (await deps.review.isReviewAuthor(tx, { reviewId, actor })) {
        const authorMode = await deps.review.authorIdentityModeOf(tx, { reviewId });
        if (authorMode === null) {
          ports.logger.error('community.author_mode_missing', { correlationId });
          return err('internal', { correlationId });
        }
        mode = authorMode;
      }

      const decision = await ports.rateLimiter.hit(
        commentPostKey(accountId),
        COMMENT_POST_LIMIT,
        COMMENT_POST_WINDOW_SEC,
      );
      if (!decision.allowed) {
        return err('rate_limited', {
          correlationId,
          retryAfterSec: Math.max(1, Math.ceil(decision.retryAfter ?? 1)),
        });
      }

      const persona = await deps.identity.personaFor(tx, { accountId, reviewId, mode });
      if (!persona.ok) return persona;
      const personaId = persona.data.personaId;

      const commentId = ports.ids.newId();
      const publicId = ports.ids.newPublicId();
      const inserted = await deps.comments.insert(tx, {
        id: commentId,
        publicId,
        reviewId,
        parentId,
        authorPersonaId: personaId,
        body: input.body,
      });
      if (!inserted.ok) return err('community.reply_depth', { correlationId });

      await ports.audit.write(
        tx,
        communityAudit.commentPosted(commentId, personaId, { isReply: parentId !== null }),
      );
      await ports.outbox.append(tx, 'comment.posted', { commentId, reviewId });
      return ok({ publicId });
    },
  });
}
