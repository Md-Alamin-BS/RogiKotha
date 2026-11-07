// `review.hasOwnReviewOfDoctor` (BR1.5, BR7.5): whether the actor already has an eligible review
// of the draft's doctor under any persona. The answer is the boolean only, never the review.
import { HasOwnReviewOfDoctorInput, ok } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { accountIdOf, draftNotFound, findOwnDraft } from '../drafts';
import type { ReviewModulePorts } from '../ports';

export function hasOwnReviewOfDoctorQuery(deps: ReviewModulePorts) {
  return defineQuery<HasOwnReviewOfDoctorInput, { duplicate: boolean }>({
    name: 'review.hasOwnReviewOfDoctor',
    input: HasOwnReviewOfDoctorInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }) {
      const accountId = accountIdOf(actor);
      const draft = await findOwnDraft(
        deps,
        ports,
        tx,
        accountId,
        input.draftId,
        actor.correlationId,
      );
      if (!draft) return draftNotFound(actor);
      const doctorId = draft.record.doctorId;
      if (doctorId === null) return ok({ duplicate: false });
      const personaIds = await deps.ownership.ownPersonaIds(tx, { accountId });
      const duplicate =
        personaIds.length > 0 &&
        (await deps.reviews.existsEligibleOfDoctorByPersonas(tx, doctorId, personaIds));
      return ok({ duplicate });
    },
  });
}
