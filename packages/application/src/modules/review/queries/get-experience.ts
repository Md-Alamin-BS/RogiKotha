// `review.getExperience` (WF6, BR5.1–BR5.9): the page of an eligible review only; every other
// public id answers the same `not_found`. The byline comes from Identity's public projection and
// the three related lists from U46's card query, then `toExperiencePage` builds the page.
import {
  GetExperienceInput,
  err,
  ok,
  type ExperiencePageVM,
  type Result,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import {
  RELATED_BY_AUTHOR_LIMIT,
  RELATED_BY_CONDITION_LIMIT,
  RELATED_SAME_DOCTOR_LIMIT,
} from '../limits';
import type { ReviewModulePorts } from '../ports';
import { pageBylineOf, toExperiencePage } from '../projection';
import { cardsOf } from '../related';

export function getExperienceQuery(deps: ReviewModulePorts) {
  return defineQuery<GetExperienceInput, ExperiencePageVM>({
    name: 'review.getExperience',
    input: GetExperienceInput,
    requires: {},
    async handle({ input, tx, actor, request, ports }): Promise<Result<ExperiencePageVM>> {
      const review = await deps.reviews.findEligibleByPublicId(tx, input.publicId, actor.locale);
      if (!review) return err('not_found', { correlationId: actor.correlationId });

      const persona = await deps.identity.publicProjection(tx, {
        personaId: review.authorPersonaId,
      });
      const byline = pageBylineOf(persona, review.identityMode);
      const call = { actor, request, ports };
      const excludePublicId = review.publicId;
      const condition = review.tags.find(
        (t) => !t.notSure && t.group === 'condition' && t.termActive && t.termPublicId !== null,
      );
      const conditionPublicId =
        condition && !condition.notSure ? (condition.termPublicId ?? undefined) : undefined;

      const [relatedByCondition, sameDoctor, otherByAuthor] = await Promise.all([
        conditionPublicId === undefined
          ? Promise.resolve([])
          : cardsOf(deps, call, {
              conditionPublicId,
              limit: RELATED_BY_CONDITION_LIMIT,
              excludePublicId,
            }),
        cardsOf(deps, call, {
          doctorPublicId: review.doctor.publicId,
          limit: RELATED_SAME_DOCTOR_LIMIT,
          excludePublicId,
        }),
        // Two anonymous reviews are never linked by an author list (BR5.8, FD-015).
        byline.personaKind === 'anonymous'
          ? Promise.resolve([])
          : cardsOf(deps, call, {
              personaIds: [review.authorPersonaId],
              limit: RELATED_BY_AUTHOR_LIMIT,
              excludePublicId,
            }),
      ]);

      return ok(
        toExperiencePage(review, {
          doctor: review.doctor,
          byline,
          related: { relatedByCondition, sameDoctor, otherByAuthor },
        }),
      );
    },
  });
}
