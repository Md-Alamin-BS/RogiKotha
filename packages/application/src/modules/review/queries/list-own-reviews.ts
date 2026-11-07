// `review.listOwnReviews` (WF9, BR1.5, BR7.3): every review under any of the actor's personas,
// anonymous ones included, in every state except deleted, newest first; private to the actor.
import {
  ReviewEmptyInput,
  ok,
  type OwnReviewVM,
  type PublicationState,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { accountIdOf } from '../drafts';
import { OWN_REVIEWS_LIMIT } from '../limits';
import type { ReviewModulePorts } from '../ports';

/** The same buckets as the demo list it replaces, so `ProfileWorkspace` is unchanged. */
function ownState(state: PublicationState): OwnReviewVM['state'] {
  switch (state) {
    case 'published':
      return 'published';
    case 'hidden':
    case 'hidden_pending_review':
      return 'hidden';
    case 'deleted_tombstone':
    case 'rejected':
      return 'removed';
    default:
      return 'other';
  }
}

export function listOwnReviewsQuery(deps: ReviewModulePorts) {
  return defineQuery<ReviewEmptyInput, OwnReviewVM[]>({
    name: 'review.listOwnReviews',
    input: ReviewEmptyInput,
    requires: { authenticated: true },
    async handle({ tx, actor }) {
      const personaIds = await deps.ownership.ownPersonaIds(tx, { accountId: accountIdOf(actor) });
      if (personaIds.length === 0) return ok([]);
      const rows = await deps.reviews.listByPersonas(
        tx,
        personaIds,
        actor.locale,
        OWN_REVIEWS_LIMIT,
      );
      return ok(
        rows.map((row) => ({
          publicId: row.publicId,
          title: row.title,
          doctorName: row.doctorName,
          state: ownState(row.state),
          publishedAt: row.publishedAt,
          edited: row.edited,
        })),
      );
    },
  });
}
