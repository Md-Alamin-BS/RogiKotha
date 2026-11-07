// The reads behind the experience page's three slots (C16, frontend-components § 6). Each resolves
// the review from its public id with the pinned call shape (functional-spec § 2.1) and answers
// null for an unknown id. Kept out of the `'use server'` file: these are called by server
// components only and must never become endpoints, since they handle the internal review id.
// ASSUMPTION(U47): this file is a recorded addition beside `review.ts`; components may reach the
// server only through `server/actions` (eslint.boundaries.mjs).
import type { DemoCommentThread } from '@rogikotha/contracts';

import { getActor } from '@/server/auth';
import { getContainer } from '@/server/container';

async function reviewIdOf(reviewPublicId: string): Promise<string | null> {
  const c = getContainer();
  return c.ports.unitOfWork.read((tx) =>
    c.review.reviewIdForPublicId(tx, { publicId: reviewPublicId }),
  );
}

// ASSUMPTION(U49): the demo comment read is gone with Step 23 (BR6.1), and the slot still takes
// `DemoCommentThread[]`, so until Step 25 reads `community.getThread` through the new views this
// answers an empty list; the post and delete actions already run on the Community module.
export async function loadCommentThread(
  reviewPublicId: string,
): Promise<{ threads: DemoCommentThread[]; signedIn: boolean } | null> {
  const reviewId = await reviewIdOf(reviewPublicId);
  if (reviewId === null) return null;
  const actor = await getActor();
  return { threads: [], signedIn: actor.kind === 'account' };
}

/** How many documents the public may count (C17), until U48 binds Evidence's implementation. */
export async function loadPublicEvidenceCount(reviewPublicId: string): Promise<number | null> {
  const reviewId = await reviewIdOf(reviewPublicId);
  if (reviewId === null) return null;
  return getContainer().publicEvidence.countPublicEvidence(reviewId);
}

/** When the review was last edited (BR6.7); null when never, or for an unknown id. */
export async function loadLastEditedAt(reviewPublicId: string): Promise<string | null> {
  const c = getContainer();
  return c.ports.unitOfWork.read(async (tx) => {
    const reviewId = await c.review.reviewIdForPublicId(tx, { publicId: reviewPublicId });
    return reviewId === null ? null : c.review.lastEditedAt(tx, { reviewId });
  });
}

/** Logs a slot failure with its code only; the slot then shows its own error line. */
export function logSlotFailure(slot: string, error: unknown): void {
  getContainer().ports.logger.error('review.slot_failed', {
    kind: slot,
    errorCode: error instanceof Error ? error.name : 'unknown',
  });
}
