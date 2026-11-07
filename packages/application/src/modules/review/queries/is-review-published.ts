// `isReviewPublished` (C9 seam, BR6.3): U46's eligibility predicate, doctor join included; false
// for an unknown id.
import type { ReviewModuleRepository, Tx } from '../../../ports';

export function isReviewPublished(
  reviews: ReviewModuleRepository,
  tx: Tx,
  input: { reviewId: string },
): Promise<boolean> {
  return reviews.isEligible(tx, input.reviewId);
}
