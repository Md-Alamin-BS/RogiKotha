// Fakes of the ports U46 declares: `ProviderExperience` and `ConditionStats` (scripted figures,
// with a record of every call, so a test can prove facility feedback was never read, BR2.12) and
// `PublicEvidenceCount` (a count per review id, absent = 0, C17).
import type {
  BranchExperience,
  BranchExperienceSummary,
  ConditionFigures,
  ConditionStats,
  DoctorExperience,
  DoctorExperienceRequest,
  DoctorExperienceSummary,
  ProviderExperience,
  PublicEvidenceCount,
  Tx,
} from '@rogikotha/application';
import { CRITERIA, type DistributionVM } from '@rogikotha/contracts';

/** A distribution with every key counted, built from counts (a builder, not a fixture). */
export function aDistributionVM(
  keys: readonly string[],
  counts: Partial<Record<string, number>> = {},
  overrides: Partial<DistributionVM> = {},
): DistributionVM {
  const full = Object.fromEntries(keys.map((k) => [k, counts[k] ?? 0]));
  const total = keys.reduce((sum, k) => sum + (full[k] ?? 0), 0);
  return {
    keys: [...keys],
    counts: full,
    total,
    notProvided: 0,
    empty: total === 0,
    limitedData: total > 0 && total < 5,
    ...overrides,
  };
}

const SENTIMENT_KEYS = ['positive', 'mixed', 'negative'] as const;
const OUTCOME_KEYS = ['helped', 'none', 'worse', 'uncertain'] as const;
const CRITERION_KEYS = ['good', 'mixed', 'poor'] as const;

export function aDoctorExperience(overrides: Partial<DoctorExperience> = {}): DoctorExperience {
  return {
    cards: [],
    sentiment: aDistributionVM(SENTIMENT_KEYS),
    scopedSentiment: aDistributionVM(SENTIMENT_KEYS),
    scopedOutcome: aDistributionVM(OUTCOME_KEYS),
    documentCount: 0,
    total: 0,
    scopedTotal: 0,
    showing: 0,
    limitedData: false,
    conditions: [],
    breakdown: [],
    ...overrides,
  };
}

export function aDoctorSummary(
  overrides: Partial<DoctorExperienceSummary> = {},
): DoctorExperienceSummary {
  return {
    total: 0,
    limitedData: false,
    sentiment: aDistributionVM(SENTIMENT_KEYS),
    documentCount: 0,
    topConditions: [],
    ...overrides,
  };
}

export function aBranchSummary(
  overrides: Partial<BranchExperienceSummary> = {},
): BranchExperienceSummary {
  return {
    total: 0,
    limitedData: false,
    overall: aDistributionVM(CRITERION_KEYS),
    ...overrides,
  };
}

export function aConditionFigures(overrides: Partial<ConditionFigures> = {}): ConditionFigures {
  return {
    total: 0,
    limitedData: false,
    doctorsTotal: 0,
    sentiment: aDistributionVM(SENTIMENT_KEYS),
    outcome: aDistributionVM(OUTCOME_KEYS),
    cards: [],
    mentioned: { medicine: [], treatment: [], symptom: [] },
    doctors: [],
    facilities: [],
    places: [],
    specialties: [],
    ...overrides,
  };
}

export type ProviderExperienceCall =
  | { method: 'forDoctor'; request: DoctorExperienceRequest }
  | { method: 'forBranch'; branchId: string }
  | { method: 'summariesForDoctors'; doctorIds: string[] }
  | { method: 'summariesForBranches'; branchIds: string[] };

export class FakeProviderExperience implements ProviderExperience {
  readonly calls: ProviderExperienceCall[] = [];
  doctorExperience: DoctorExperience = aDoctorExperience();
  branchExperience: BranchExperience = {
    cards: [],
    criteria: CRITERIA.map((key) => ({ key, dist: aDistributionVM(CRITERION_KEYS) })),
    total: 0,
    limitedData: false,
  };
  readonly doctorSummaries = new Map<string, DoctorExperienceSummary>();
  readonly branchSummaries = new Map<string, BranchExperienceSummary>();

  forDoctor(_tx: Tx, request: DoctorExperienceRequest): Promise<DoctorExperience> {
    this.calls.push({ method: 'forDoctor', request });
    return Promise.resolve(this.doctorExperience);
  }

  forBranch(_tx: Tx, request: { branchId: string }): Promise<BranchExperience> {
    this.calls.push({ method: 'forBranch', branchId: request.branchId });
    return Promise.resolve(this.branchExperience);
  }

  summariesForDoctors(
    _tx: Tx,
    doctorIds: readonly string[],
  ): Promise<ReadonlyMap<string, DoctorExperienceSummary>> {
    this.calls.push({ method: 'summariesForDoctors', doctorIds: [...doctorIds] });
    return Promise.resolve(
      new Map(doctorIds.map((id) => [id, this.doctorSummaries.get(id) ?? aDoctorSummary()])),
    );
  }

  summariesForBranches(
    _tx: Tx,
    branchIds: readonly string[],
  ): Promise<ReadonlyMap<string, BranchExperienceSummary>> {
    this.calls.push({ method: 'summariesForBranches', branchIds: [...branchIds] });
    return Promise.resolve(
      new Map(branchIds.map((id) => [id, this.branchSummaries.get(id) ?? aBranchSummary()])),
    );
  }

  /** True when any facility method was called (BR2.12). */
  readFacilityFeedback(): boolean {
    return this.calls.some((c) => c.method === 'forBranch' || c.method === 'summariesForBranches');
  }
}

export class FakeConditionStats implements ConditionStats {
  readonly calls: string[] = [];
  figures: ConditionFigures = aConditionFigures();
  readonly totals = new Map<string, number>();

  forCondition(_tx: Tx, termId: string): Promise<ConditionFigures> {
    this.calls.push(`forCondition:${termId}`);
    return Promise.resolve(this.figures);
  }

  totalsForConditions(_tx: Tx, termIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    this.calls.push('totalsForConditions');
    return Promise.resolve(new Map(termIds.map((id) => [id, this.totals.get(id) ?? 0])));
  }
}

export class FakePublicEvidenceCount implements PublicEvidenceCount {
  readonly counts = new Map<string, number>();
  batchCalls = 0;

  countPublicEvidence(reviewId: string): Promise<number> {
    return Promise.resolve(this.counts.get(reviewId) ?? 0);
  }

  countPublicEvidenceByReview(reviewIds: readonly string[]): Promise<ReadonlyMap<string, number>> {
    this.batchCalls += 1;
    return Promise.resolve(
      new Map(
        reviewIds.flatMap((id) => {
          const n = this.counts.get(id);
          return n === undefined ? [] : [[id, n] as [string, number]];
        }),
      ),
    );
  }
}
