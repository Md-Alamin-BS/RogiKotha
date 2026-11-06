// `authorIdentityModeOf` (C9 seam for U49, BR6.9): the bare identity mode of the review's author,
// or null for an unknown id; never the persona id or the account id.
import type { IdentityMode } from '@rogikotha/contracts';

import type { ReviewModuleRepository, Tx } from '../../../ports';

export function authorIdentityModeOf(
  reviews: ReviewModuleRepository,
  tx: Tx,
  input: { reviewId: string },
): Promise<IdentityMode | null> {
  return reviews.identityModeOf(tx, input.reviewId);
}
