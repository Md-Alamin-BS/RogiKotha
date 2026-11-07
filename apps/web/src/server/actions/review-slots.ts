// The reads behind the experience page's three slots (C16, frontend-components § 6). Each resolves
// the review from its public id with the pinned call shape (functional-spec § 2.1) and answers
// null for an unknown id. Kept out of the `'use server'` file: these are called by server
// components only and must never become endpoints, since they handle the internal review id.
// ASSUMPTION(U47): this file is a recorded addition beside `review.ts`; components may reach the
// server only through `server/actions` (eslint.boundaries.mjs).
import type { DemoCommentThread, ReviewHistoryVM } from '@rogikotha/contracts';

import { getActor } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import { comments } from '@/server/data';

async function reviewIdOf(reviewPublicId: string): Promise<string | null> {
  const c = getContainer();
  return c.ports.unitOfWork.read((tx) =>
    c.review.reviewIdForPublicId(tx, { publicId: reviewPublicId }),
  );
}

/** The demo discussion until U49 (C10) swaps the data source. */
export async function loadCommentThread(
  reviewPublicId: string,
): Promise<{ threads: DemoCommentThread[]; signedIn: boolean } | null> {
  const reviewId = await reviewIdOf(reviewPublicId);
  if (reviewId === null) return null;
  const actor = await getActor();
  const threads = await comments.listComments(reviewId, actor.accountId ?? null);
  return { threads, signedIn: actor.kind === 'account' };
}

/** How many documents the public may count (C17), until U48 binds Evidence's implementation. */
export async function loadPublicEvidenceCount(reviewPublicId: string): Promise<number | null> {
  const reviewId = await reviewIdOf(reviewPublicId);
  if (reviewId === null) return null;
  return getContainer().publicEvidence.countPublicEvidence(reviewId);
}

/**
 * The edit history behind the `ReviewHistory` slot (U22 BR4); null for an unknown or unpublished
 * review, which the slot renders as nothing. Any other refusal throws so the slot shows its line.
 */
export async function loadReviewHistory(reviewPublicId: string): Promise<ReviewHistoryVM | null> {
  const result = await runCommand(getContainer().review.getHistory, { reviewPublicId });
  if (result.ok) return result.data;
  if (result.error.code === 'not_found') return null;
  throw new Error(`review.getHistory: ${result.error.code}`);
}

/** Logs a slot failure with its code only; the slot then shows its own error line. */
export function logSlotFailure(slot: string, error: unknown): void {
  getContainer().ports.logger.error('review.slot_failed', {
    kind: slot,
    errorCode: error instanceof Error ? error.name : 'unknown',
  });
}
