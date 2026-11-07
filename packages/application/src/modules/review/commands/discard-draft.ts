// `review.discardDraft` (BR1.1, BR2.6): deletes the actor's own live draft; another account's
// draft and an unknown id both answer `not_found`. No audit row.
import { DiscardDraftInput, ok } from '@rogikotha/contracts';

import { defineCommand } from '../../../command';
import { accountIdOf, draftNotFound } from '../drafts';
import type { ReviewModulePorts } from '../ports';

export function discardDraftCommand(deps: ReviewModulePorts) {
  return defineCommand<DiscardDraftInput, Record<string, never>>({
    name: 'review.discardDraft',
    input: DiscardDraftInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }) {
      const deleted = await deps.reviews.deleteOwnDraft(
        tx,
        accountIdOf(actor),
        input.draftId,
        ports.clock.now(),
      );
      return deleted ? ok({}) : draftNotFound(actor);
    },
  });
}
