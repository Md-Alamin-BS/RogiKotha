// `review.listOwnDrafts` (BR2.4): the actor's live, readable drafts, newest save first, at most
// 10. An unreadable draft is left out, not shown (BR2.3).
import { ReviewEmptyInput, ok, type DraftSummaryVM } from '@rogikotha/contracts';
import { deriveTitle } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import { accountIdOf, openPayload } from '../drafts';
import { REVIEW_LIVE_DRAFT_CAP } from '../limits';
import type { ReviewModulePorts } from '../ports';

export function listOwnDraftsQuery(deps: ReviewModulePorts) {
  return defineQuery<ReviewEmptyInput, DraftSummaryVM[]>({
    name: 'review.listOwnDrafts',
    input: ReviewEmptyInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ tx, actor, ports }) {
      const records = await deps.reviews.listOwnLiveDrafts(
        tx,
        accountIdOf(actor),
        ports.clock.now(),
        REVIEW_LIVE_DRAFT_CAP,
      );
      const summaries: DraftSummaryVM[] = [];
      for (const record of records) {
        const payload = openPayload(ports, record.payloadEnc, actor.correlationId);
        if (payload === null) continue;
        summaries.push({
          draftId: record.id,
          title: deriveTitle({
            title: payload.title,
            mode: payload.target === 'facility' ? 'quick' : payload.mode,
            story: payload.story,
            sections: payload.sections,
          }),
          target: payload.target,
          updatedAt: record.updatedAt.toISOString(),
          expiresAt: record.expiresAt.toISOString(),
        });
      }
      return ok(summaries);
    },
  });
}
