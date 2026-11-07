// `isReviewAuthor` (C9 seam, BR6.2): true only when the actor's account owns the review's author
// persona, through `IdentityOwnership`. Another account, a staff member and an unknown id all get
// the same false, so the seam is no ownership oracle over anonymous reviews.
import type { Actor } from '@rogikotha/contracts';

import type { ReviewModuleRepository, Tx } from '../../../ports';
import type { IdentityOwnership } from '../../identity';

export async function isReviewAuthor(
  reviews: ReviewModuleRepository,
  ownership: IdentityOwnership,
  tx: Tx,
  input: { reviewId: string; actor: Actor },
): Promise<boolean> {
  const { actor } = input;
  if (actor.kind !== 'account' || !actor.accountId) return false;
  const personaId = await reviews.authorPersonaIdOf(tx, input.reviewId);
  if (personaId === null) return false;
  return ownership.ownsPersona(tx, { accountId: actor.accountId, personaId });
}
