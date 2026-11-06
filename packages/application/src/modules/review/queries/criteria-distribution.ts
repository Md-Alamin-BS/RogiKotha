// `review.criteriaDistribution` (WF12): a branch's facility criteria, all nine or one. Reads
// facility reviews only, so a doctor review never enters it (BR2.7).
import {
  BranchCriteriaInput,
  CRITERIA,
  CRITERION_VALUES,
  ok,
  type Criterion,
  type DistributionVM,
} from '@rogikotha/contracts';
import { distribution } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import { toDistributionVM } from '../cards';
import type { ReviewReadDeps } from '../provider-experience';

export function criteriaDistributionQuery(deps: ReviewReadDeps) {
  return defineQuery<BranchCriteriaInput, { key: Criterion; dist: DistributionVM }[]>({
    name: 'review.criteriaDistribution',
    input: BranchCriteriaInput,
    requires: {},
    async handle({ input, tx }) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows = await deps.reviews.publishedForBranch(tx, input.branchId);
      const keys = input.key ? [input.key] : CRITERIA;
      return ok(
        keys.map((key) => ({
          key,
          dist: toDistributionVM(
            distribution(
              rows.map((r) => r.criteria[key] ?? null),
              CRITERION_VALUES,
              threshold,
            ),
          ),
        })),
      );
    },
  });
}
