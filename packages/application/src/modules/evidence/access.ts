// The checks `evidence.checkUpload` and `evidence.intake` both run (BR1.2, BR2.3–BR2.5), so the
// read-only pre-check and the serialised transaction cannot drift apart.
import { err, type Actor, type ErrorCode, type Result } from '@rogikotha/contracts';
import {
  EVIDENCE_MAX_PER_REVIEW,
  EVIDENCE_MAX_TOTAL_BYTES,
  type EvidenceItemState,
} from '@rogikotha/domain';

import type { EvidenceRepository, Tx } from '../../ports';
import type { EvidenceReviewSeams } from './ports';

/** What an upload answers with: the item's public id and its state (C14). */
export interface EvidenceUploadAnswer {
  itemId: string;
  state: EvidenceItemState;
}

export function accountIdOf(actor: Actor): string {
  return actor.accountId ?? '';
}

export function refused(code: ErrorCode, actor: Actor): Result<never> {
  return err(code, { correlationId: actor.correlationId });
}

/** The internal id of the actor's own published review; null for every other case alike (BR1.2). */
export async function ownPublishedReviewId(
  review: EvidenceReviewSeams,
  tx: Tx,
  publicId: string,
  actor: Actor,
): Promise<string | null> {
  const reviewId = await review.reviewIdForPublicId(tx, { publicId });
  if (reviewId === null) return null;
  if (!(await review.isReviewAuthor(tx, { reviewId, actor }))) return null;
  if (!(await review.isReviewPublished(tx, { reviewId }))) return null;
  return reviewId;
}

/**
 * BR2.5: the item the key already names when it is this actor's on this review; a key held by
 * another account or another review is `not_found`; an unused key is `null`.
 */
export async function existingForKey(
  repo: EvidenceRepository,
  tx: Tx,
  key: string,
  reviewId: string,
  actor: Actor,
): Promise<Result<EvidenceUploadAnswer | null>> {
  const found = await repo.findByIdempotencyKey(tx, key);
  if (found === null) return { ok: true, data: null };
  if (found.reviewId !== reviewId || found.uploadedByAccountId !== accountIdOf(actor)) {
    return refused('not_found', actor);
  }
  return { ok: true, data: { itemId: found.publicId, state: found.state } };
}

/** BR2.3, then BR2.4 with the new file's size; null when both pass. */
export async function limitRefusal(
  repo: EvidenceRepository,
  tx: Tx,
  reviewId: string,
  bytes: number,
): Promise<ErrorCode | null> {
  const totals = await repo.countCounting(tx, reviewId);
  if (totals.count >= EVIDENCE_MAX_PER_REVIEW) return 'evidence.too_many';
  if (totals.bytes + bytes > EVIDENCE_MAX_TOTAL_BYTES) return 'evidence.total_too_large';
  return null;
}
