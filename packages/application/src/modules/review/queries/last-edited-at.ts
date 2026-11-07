// `lastEditedAt` (BR6.7): the time of the review's newest correction version, as an ISO
// timestamp, or null when it was never corrected. Used by the `ReviewHistory` slot.
import type { ReviewModuleRepository, Tx } from '../../../ports';

export async function lastEditedAt(
  reviews: ReviewModuleRepository,
  tx: Tx,
  input: { reviewId: string },
): Promise<string | null> {
  const at = await reviews.lastCorrectionAt(tx, input.reviewId);
  return at === null ? null : at.toISOString();
}
