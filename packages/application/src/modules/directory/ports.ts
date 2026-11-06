// `ProviderExperience` (C7, FD-067): the only way Directory learns review-derived figures. Declared
// here, implemented by the Review module (`modules/review/provider-experience.ts`), so Directory
// never imports Review (BR6.1). Figures arrive display-ready in the reader's locale.
import type {
  ConditionBreakdownVM,
  ConditionCountVM,
  ConditionRefVM,
  Criterion,
  DistributionVM,
  ExperienceCardVM,
  FacilityAccountVM,
  Locale,
  Outcome,
  Relationship,
} from '@rogikotha/contracts';

import type { Tx } from '../../ports';

export interface DoctorExperienceRequest {
  doctorId: string;
  /** Resolved by Review, so Directory never calls Taxonomy (C7 amendment, U46 R-04). */
  conditionPublicId?: string;
  outcome?: Outcome;
  relationship?: Relationship;
  docs?: boolean;
  locale: Locale;
}

export interface DoctorExperience {
  /** Newest first, narrowed by every filter (BR3.5). */
  cards: ExperienceCardVM[];
  /** All the doctor's eligible accounts. */
  sentiment: DistributionVM;
  /** The accounts in scope of the condition filter. */
  scopedSentiment: DistributionVM;
  scopedOutcome: DistributionVM;
  documentCount: number;
  total: number;
  scopedTotal: number;
  showing: number;
  limitedData: boolean;
  conditions: ConditionCountVM[];
  breakdown: ConditionBreakdownVM[];
  selectedCondition?: ConditionRefVM;
}

export interface BranchExperience {
  cards: FacilityAccountVM[];
  /** The nine criteria in enum order (FD-107). */
  criteria: { key: Criterion; dist: DistributionVM }[];
  total: number;
  limitedData: boolean;
}

export interface DoctorExperienceSummary {
  total: number;
  limitedData: boolean;
  sentiment: DistributionVM;
  documentCount: number;
  /** At most three, by count (BR3.2). */
  topConditions: ConditionCountVM[];
}

export interface BranchExperienceSummary {
  total: number;
  limitedData: boolean;
  overall: DistributionVM;
}

export interface ProviderExperience {
  forDoctor(tx: Tx, request: DoctorExperienceRequest): Promise<DoctorExperience>;
  forBranch(tx: Tx, request: { branchId: string; locale: Locale }): Promise<BranchExperience>;
  /** One grouped read for an index page; a doctor without accounts is in the map with zeros. */
  summariesForDoctors(
    tx: Tx,
    doctorIds: readonly string[],
    locale: Locale,
  ): Promise<ReadonlyMap<string, DoctorExperienceSummary>>;
  summariesForBranches(
    tx: Tx,
    branchIds: readonly string[],
  ): Promise<ReadonlyMap<string, BranchExperienceSummary>>;
}
