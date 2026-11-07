// `review.saveDraft` (WF2, BR1.1, BR1.4, BR2.1, BR2.2, BR2.6): rate limit, lenient parse (by the
// input schema), encrypt, then insert a new draft under the 10-draft cap or update the actor's own
// live one; the expiry moves to 30 days after this save. No audit row, no outbox event.
import { SaveDraftInput, err, ok } from '@rogikotha/contracts';

import { defineCommand } from '../../../command';
import type { RateLimitKey } from '../../../ports';
import { accountIdOf, draftNotFound, sealPayload } from '../drafts';
import {
  REVIEW_DRAFT_LIFE_MS,
  REVIEW_DRAFT_SAVE_LIMIT,
  REVIEW_DRAFT_SAVE_WINDOW_SEC,
  REVIEW_LIVE_DRAFT_CAP,
} from '../limits';
import type { ReviewModulePorts } from '../ports';

export interface SaveDraftOutput {
  draftId: string;
  /** ISO timestamp. */
  expiresAt: string;
}

export function saveDraftRateLimitKey(accountId: string): RateLimitKey {
  return `review.saveDraft:account:${accountId}`;
}

export function saveDraftCommand(deps: ReviewModulePorts) {
  return defineCommand<SaveDraftInput, SaveDraftOutput>({
    name: 'review.saveDraft',
    input: SaveDraftInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }) {
      const accountId = accountIdOf(actor);
      const decision = await ports.rateLimiter.hit(
        saveDraftRateLimitKey(accountId),
        REVIEW_DRAFT_SAVE_LIMIT,
        REVIEW_DRAFT_SAVE_WINDOW_SEC,
      );
      if (!decision.allowed) {
        return err('rate_limited', {
          correlationId: actor.correlationId,
          ...(decision.retryAfter !== undefined ? { retryAfterSec: decision.retryAfter } : {}),
        });
      }

      const now = ports.clock.now();
      const expiresAt = new Date(now.getTime() + REVIEW_DRAFT_LIFE_MS);
      const { payload } = input;
      const kind = payload.target === 'facility' ? 'quick' : payload.mode;
      const doctorId =
        payload.target === 'doctor' && payload.doctorPublicId !== undefined
          ? await deps.reviews.visibleDoctorIdByPublicId(tx, payload.doctorPublicId)
          : null;
      const payloadEnc = sealPayload(ports, payload);

      if (input.draftId !== undefined) {
        const updated = await deps.reviews.updateOwnDraft(tx, accountId, input.draftId, {
          kind,
          payloadEnc,
          doctorId,
          now,
          expiresAt,
        });
        if (!updated) return draftNotFound(actor);
        return ok({ draftId: input.draftId, expiresAt: expiresAt.toISOString() });
      }

      const live = await deps.reviews.countOwnLiveDrafts(tx, accountId, now);
      if (live >= REVIEW_LIVE_DRAFT_CAP) {
        const refused = err('conflict', { correlationId: actor.correlationId });
        if (!refused.ok) refused.error.messageKey = 'errors.review.draftsFull';
        return refused;
      }
      const draftId = ports.ids.newId();
      await deps.reviews.insertDraft(tx, {
        id: draftId,
        accountId,
        kind,
        payloadEnc,
        doctorId,
        now,
        expiresAt,
      });
      return ok({ draftId, expiresAt: expiresAt.toISOString() });
    },
  });
}
