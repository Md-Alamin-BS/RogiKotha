// `review.countExperiences` (BR7.4): the exact number of eligible reviews, U46's predicate.
import { ReviewEmptyInput, ok } from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import type { ReviewModulePorts } from '../ports';

export function countExperiencesQuery(deps: ReviewModulePorts) {
  return defineQuery<ReviewEmptyInput, { total: number }>({
    name: 'review.countExperiences',
    input: ReviewEmptyInput,
    requires: {},
    async handle({ tx }) {
      return ok({ total: await deps.reviews.countEligible(tx) });
    },
  });
}
