// The read-side Review stub (U46, FD-067): the two port implementations and four read queries.
// It adds no command (BR6.3); U47 adds the review commands beside these files.
import type { ConditionStats } from '../taxonomy/ports';
import type { ProviderExperience } from '../directory/ports';
import { createConditionStats } from './condition-stats';
import { createProviderExperience, type ReviewReadDeps } from './provider-experience';
import { criteriaDistributionQuery } from './queries/criteria-distribution';
import { listExperienceCardsQuery } from './queries/list-experience-cards';
import { outcomeDistributionQuery } from './queries/outcome-distribution';
import { sentimentDistributionQuery } from './queries/sentiment-distribution';

export { createConditionStats } from './condition-stats';
export {
  conditionCounts,
  createProviderExperience,
  TOP_CONDITIONS,
  type ReviewReadDeps,
} from './provider-experience';
export { EXCERPT_GRAPHEMES, excerptOf, bylineOf, initialsOf } from './cards';
export { DEFAULT_CARD_LIMIT } from './queries/list-experience-cards';

export function createReviewReadModule(deps: ReviewReadDeps) {
  const providerExperience: ProviderExperience = createProviderExperience(deps);
  const conditionStats: ConditionStats = createConditionStats(deps);
  return {
    providerExperience,
    conditionStats,
    sentimentDistribution: sentimentDistributionQuery(deps),
    outcomeDistribution: outcomeDistributionQuery(deps),
    criteriaDistribution: criteriaDistributionQuery(deps),
    listExperienceCards: listExperienceCardsQuery(deps),
  };
}

export type ReviewReadModule = ReturnType<typeof createReviewReadModule>;
