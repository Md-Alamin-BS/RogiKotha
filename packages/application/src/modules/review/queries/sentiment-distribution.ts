// `review.sentimentDistribution` (WF12): a doctor's sentiment spread, optionally about one
// condition. Internal query for U20 and U47; reads doctor reviews only (BR2.6).
import { DoctorDistributionInput, SENTIMENTS, ok, type DistributionVM } from '@rogikotha/contracts';
import { distribution } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import { toDistributionVM } from '../cards';
import type { ReviewReadDeps } from '../provider-experience';

export function sentimentDistributionQuery(deps: ReviewReadDeps) {
  return defineQuery<DoctorDistributionInput, DistributionVM>({
    name: 'review.sentimentDistribution',
    input: DoctorDistributionInput,
    requires: {},
    async handle({ input, tx }) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows = await deps.reviews.publishedForDoctor(tx, input.doctorId);
      const scoped = input.conditionPublicId
        ? rows.filter((r) => r.aboutTerms.some((t) => t.publicId === input.conditionPublicId))
        : rows;
      return ok(
        toDistributionVM(
          distribution(
            scoped.map((r) => r.sentiment),
            SENTIMENTS,
            threshold,
          ),
        ),
      );
    },
  });
}
