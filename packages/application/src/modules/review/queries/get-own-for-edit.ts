// `review.getOwnForEdit` (U22 WF1, BR1.1, BR5.1): the author's current content for the edit form.
// Resolve, then published, then author; another account, a signed-out caller, a hidden review and
// an unknown id all get the same `not_found`, so the answer is no ownership oracle.
import {
  GetOwnForEditInput,
  err,
  ok,
  type EditReviewVM,
  type ReviewSectionKey,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { OwnEditRow } from '../../../ports';
import type { ReviewModulePorts } from '../ports';
import { isReviewAuthor } from './is-review-author';
import { isReviewPublished } from './is-review-published';
import { reviewIdForPublicId } from './review-id-for-public-id';

function filledSections(row: OwnEditRow): Partial<Record<ReviewSectionKey, string>> {
  const sections: Partial<Record<ReviewSectionKey, string>> = {};
  for (const [key, body] of Object.entries(row.sections ?? {})) {
    if (typeof body === 'string' && body.trim() !== '') sections[key as ReviewSectionKey] = body;
  }
  return sections;
}

export function toEditReviewVM(row: OwnEditRow): EditReviewVM {
  return {
    publicId: row.publicId,
    kind: row.kind,
    version: row.version,
    title: row.title,
    ...(row.kind === 'quick' ? { story: row.body ?? '' } : { sections: filledSections(row) }),
    ...(row.sentiment !== null ? { sentiment: row.sentiment } : {}),
    ...(row.outcome !== null ? { outcome: row.outcome } : {}),
    claims: row.claims.map((claim) => claim.label),
    doctorName: row.doctorName,
  };
}

export function getOwnForEditQuery(deps: ReviewModulePorts) {
  const { reviews, ownership } = deps;
  return defineQuery<GetOwnForEditInput, EditReviewVM>({
    name: 'review.getOwnForEdit',
    input: GetOwnForEditInput,
    // ASSUMPTION(U22): no gate; a signed-out caller gets the non-author `not_found` (BR1.1).
    requires: {},
    async handle({ input, tx, actor }) {
      const notFound = err('not_found', { correlationId: actor.correlationId });
      const reviewId = await reviewIdForPublicId(reviews, tx, { publicId: input.publicId });
      if (reviewId === null) return notFound;
      if (!(await isReviewPublished(reviews, tx, { reviewId }))) return notFound;
      if (!(await isReviewAuthor(reviews, ownership, tx, { reviewId, actor }))) return notFound;
      const row = await reviews.findOwnForEdit(tx, reviewId, actor.locale);
      if (row === null) return notFound;
      return ok(toEditReviewVM(row));
    },
  });
}
