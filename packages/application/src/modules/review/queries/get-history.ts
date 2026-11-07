// `review.getHistory` (U22 WF3, BR4.1–BR4.4): the Edited date, the material corrections with the
// original text before each, and the author's version list. Public: a signed-out reader gets the
// same corrections and originals; only `versions` depends on `isReviewAuthor`. No result holds an
// actor, persona, account or reason.
import {
  GetHistoryInput,
  OUTCOMES,
  SENTIMENTS,
  err,
  ok,
  type OriginalTextVM,
  type Outcome,
  type ReviewHistoryVM,
  type Sentiment,
} from '@rogikotha/contracts';
import { toHistory, type OriginalText, type ReviewHistory } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { ReviewModulePorts } from '../ports';
import { isReviewAuthor } from './is-review-author';
import { isReviewPublished } from './is-review-published';
import { reviewIdForPublicId } from './review-id-for-public-id';

function isSentiment(value: string | null | undefined): value is Sentiment {
  return (SENTIMENTS as readonly (string | null | undefined)[]).includes(value);
}

function isOutcome(value: string | null | undefined): value is Outcome {
  return (OUTCOMES as readonly (string | null | undefined)[]).includes(value);
}

/**
 * Domain keeps sentiment and outcome as text; null (Not provided) passes through, and a value
 * outside the enums is left out, never 0.
 */
function toOriginalVM(original: OriginalText): OriginalTextVM {
  const { sentiment, outcome, ...rest } = original;
  return {
    ...rest,
    ...(sentiment === null || isSentiment(sentiment) ? { sentiment } : {}),
    ...(outcome === null || isOutcome(outcome) ? { outcome } : {}),
  };
}

export function toHistoryVM(history: ReviewHistory): ReviewHistoryVM {
  return {
    ...(history.editedAt !== undefined ? { editedAt: history.editedAt } : {}),
    corrections: history.corrections.map((c) => ({ ...c, original: toOriginalVM(c.original) })),
    ...(history.versions !== undefined ? { versions: history.versions } : {}),
  };
}

export function getHistoryQuery(deps: ReviewModulePorts) {
  const { reviews, ownership } = deps;
  return defineQuery<GetHistoryInput, ReviewHistoryVM>({
    name: 'review.getHistory',
    input: GetHistoryInput,
    requires: {},
    async handle({ input, tx, actor }) {
      const reviewId = await reviewIdForPublicId(reviews, tx, { publicId: input.reviewPublicId });
      if (reviewId === null || !(await isReviewPublished(reviews, tx, { reviewId }))) {
        return err('not_found', { correlationId: actor.correlationId });
      }
      const rows = await reviews.listVersions(tx, reviewId);
      const isAuthor = await isReviewAuthor(reviews, ownership, tx, { reviewId, actor });
      return ok(toHistoryVM(toHistory(rows, isAuthor)));
    },
  });
}
