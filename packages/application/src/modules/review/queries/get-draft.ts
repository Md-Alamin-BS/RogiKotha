// `review.getDraft` (BR1.1, BR2.3): the actor's own live draft; an expired or unreadable one is
// `not_found`, and an unreadable one is logged with its error code and correlation id only.
import { GetDraftInput, ok, type ComposerDraftVM } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { accountIdOf, draftNotFound, findOwnDraft } from '../drafts';
import type { ReviewModulePorts } from '../ports';

export function getDraftQuery(deps: ReviewModulePorts) {
  return defineQuery<GetDraftInput, ComposerDraftVM>({
    name: 'review.getDraft',
    input: GetDraftInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }) {
      const draft = await findOwnDraft(
        deps,
        ports,
        tx,
        accountIdOf(actor),
        input.draftId,
        actor.correlationId,
      );
      if (!draft) return draftNotFound(actor);
      return ok({
        draftId: draft.record.id,
        payload: draft.payload,
        expiresAt: draft.record.expiresAt.toISOString(),
      });
    },
  });
}
