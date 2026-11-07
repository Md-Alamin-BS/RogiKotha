// `evidence.checkUpload` (BR2.8): the read-only pre-check before the route writes the file. It
// refuses a foreign or full review and answers an idempotent repeat, so none of them reaches the
// disk. It is not serialised: `evidence.intake` repeats every check under the review lock.
// ASSUMPTION(U48): built with `defineQuery`, because BR2.8 runs it in `unitOfWork.read` and the
// plan's `defineCommand` would open a transaction.
import { CheckUploadInput, ok } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import {
  existingForKey,
  limitRefusal,
  ownPublishedReviewId,
  refused,
  type EvidenceUploadAnswer,
} from '../access';
import type { EvidenceModuleDeps } from '../ports';

export type CheckUploadOutput = { existing: EvidenceUploadAnswer } | { proceed: true };

export function checkUploadQuery(deps: EvidenceModuleDeps) {
  return defineQuery<CheckUploadInput, CheckUploadOutput>({
    name: 'evidence.checkUpload',
    input: CheckUploadInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor }) {
      const reviewId = await ownPublishedReviewId(deps.review, tx, input.reviewPublicId, actor);
      if (reviewId === null) return refused('not_found', actor);
      const existing = await existingForKey(
        deps.evidenceRepository,
        tx,
        input.idempotencyKey,
        reviewId,
        actor,
      );
      if (!existing.ok) return existing;
      if (existing.data !== null) return ok({ existing: existing.data });
      const limit = await limitRefusal(deps.evidenceRepository, tx, reviewId, input.bytes);
      return limit === null ? ok({ proceed: true }) : refused(limit, actor);
    },
  });
}
