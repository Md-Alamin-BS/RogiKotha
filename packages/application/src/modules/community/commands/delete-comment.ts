// `comment.delete` (U49 WF2, BR2.1–BR2.4, BR4.2): the author takes their own comment down. Not
// own, unknown and already deleted give the same `not_found`, and ownership is checked for every
// comment found, so the answer is no oracle over anonymous comments. No limiter, no outbox event.
import { DeleteCommentInput, err, ok } from '@rogikotha/contracts';
import { isLive, tombstoneOnDelete } from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import { communityAudit } from '../audit';
import type { CommunityModulePorts } from '../ports';

export interface DeleteCommentOutput {
  /** True when live replies keep a "Comment deleted" placeholder in the thread (BR2.3). */
  placeholder: boolean;
}

export function deleteCommentCommand(deps: CommunityModulePorts) {
  return defineCommand<DeleteCommentInput, DeleteCommentOutput>({
    name: 'comment.delete',
    input: DeleteCommentInput,
    // Any account status, so a member can always take their own words down (BR2.1).
    requires: { authenticated: true },
    async handle({ input, tx, actor, ports }) {
      const correlationId = actor.correlationId;
      const accountId = actor.accountId;
      if (accountId === undefined) return err('forbidden', { correlationId });

      const comment = await deps.comments.byPublicId(tx, { publicId: input.commentPublicId });
      if (comment === null) return err('not_found', { correlationId });
      const owns = await deps.ownership.ownsPersona(tx, {
        accountId,
        personaId: comment.authorPersonaId,
      });
      if (!owns || !isLive(comment)) return err('not_found', { correlationId });

      const liveReplies = await deps.comments.countLiveReplies(tx, comment.id);
      const tombstone = tombstoneOnDelete(liveReplies);
      const changed = await deps.comments.markDeleted(tx, {
        commentId: comment.id,
        at: ports.clock.now(),
        tombstone,
      });
      // A concurrent delete got there first: same answer as already deleted, and no second audit row.
      if (!changed) return err('not_found', { correlationId });
      await ports.audit.write(
        tx,
        communityAudit.commentDeleted(comment.id, comment.authorPersonaId, { tombstone }),
      );
      return ok({ placeholder: tombstone });
    },
  });
}
