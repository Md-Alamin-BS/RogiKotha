// `reviewIdForPublicId` (C9 seam, BR6.1): the internal id of a known public id in any state, else
// null. It never errors and says nothing about state or author. Runs on the caller's `Tx`.
import { isPublicId } from '@rogikotha/contracts';

import type { ReviewModuleRepository, Tx } from '../../../ports';

export function reviewIdForPublicId(
  reviews: ReviewModuleRepository,
  tx: Tx,
  input: { publicId: string },
): Promise<string | null> {
  if (!isPublicId(input.publicId)) return Promise.resolve(null);
  return reviews.idForPublicId(tx, input.publicId);
}
