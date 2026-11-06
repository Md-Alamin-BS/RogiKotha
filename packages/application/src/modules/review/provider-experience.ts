// The read-side Review stub's `ProviderExperience` (C7 as amended by U46, FD-067). Figures are
// queries over eligible rows, never stored totals, so a hidden review leaves them on the next read
// and a restored one returns (BR1.3). Doctor figures read doctor reviews only and facility figures
// facility reviews only (BR2.6, BR2.7). The threshold is read once per call (BR2.4).
import {
  CRITERIA,
  CRITERION_VALUES,
  OUTCOMES,
  SENTIMENTS,
  type ConditionCountVM,
  type Criterion,
  type FacilityAccountVM,
  type Locale,
} from '@rogikotha/contracts';
import { distribution, isLimitedData } from '@rogikotha/domain';

import type {
  ConfigProvider,
  FacilityReviewRecord,
  PublicEvidenceCount,
  ReviewCardRecord,
  ReviewReadRepository,
  ReviewSummaryRecord,
} from '../../ports';
import type {
  BranchExperienceSummary,
  DoctorExperienceSummary,
  ProviderExperience,
} from '../directory/ports';
import { bylineOf, cardOf, dhakaIsoDate, termName, toDistributionVM } from './cards';

export interface ReviewReadDeps {
  reviews: ReviewReadRepository;
  evidence: PublicEvidenceCount;
  config: ConfigProvider;
}

/** Top conditions on a card (BR3.2). */
export const TOP_CONDITIONS = 3;

type AboutRows = Pick<ReviewCardRecord, 'aboutTerms'>;

/** Distinct reviews per active condition term, by count, then name (BR2.8, BR3.2). */
export function conditionCounts(rows: readonly AboutRows[], locale: Locale): ConditionCountVM[] {
  const byTerm = new Map<string, ConditionCountVM>();
  for (const row of rows) {
    for (const term of row.aboutTerms) {
      const seen = byTerm.get(term.id);
      if (seen) seen.count += 1;
      else byTerm.set(term.id, { publicId: term.publicId, name: termName(term, locale), count: 1 });
    }
  }
  return [...byTerm.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, locale),
  );
}

function sentimentOf(rows: readonly Pick<ReviewCardRecord, 'sentiment'>[], threshold: number) {
  return toDistributionVM(
    distribution(
      rows.map((r) => r.sentiment),
      SENTIMENTS,
      threshold,
    ),
  );
}

function facilityAccountOf(row: FacilityReviewRecord): FacilityAccountVM {
  const account: FacilityAccountVM = {
    publicId: row.publicId,
    author: bylineOf(row.author),
    period: { year: row.periodYear, month: row.periodMonth },
    posted: dhakaIsoDate(row.publishedAt),
    body: row.body,
    criteria: CRITERIA.flatMap((key) => {
      const value = row.criteria[key];
      return value ? [{ key, value }] : [];
    }),
  };
  const overall = row.criteria.overall;
  if (overall) account.overall = overall;
  return account;
}

function summaryOf(
  rows: readonly ReviewSummaryRecord[],
  counts: ReadonlyMap<string, number>,
  locale: Locale,
  threshold: number,
): DoctorExperienceSummary {
  return {
    total: rows.length,
    limitedData: isLimitedData(rows.length, threshold),
    sentiment: sentimentOf(rows, threshold),
    documentCount: rows.reduce((sum, r) => sum + (counts.get(r.reviewId) ?? 0), 0),
    topConditions: conditionCounts(rows, locale).slice(0, TOP_CONDITIONS),
  };
}

export function createProviderExperience(deps: ReviewReadDeps): ProviderExperience {
  return {
    async forDoctor(tx, request) {
      const { locale } = request;
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const all = await deps.reviews.publishedForDoctor(tx, request.doctorId);
      const documents = await deps.evidence.countPublicEvidenceByReview(all.map((r) => r.id));
      const documentsOf = (id: string) => documents.get(id) ?? 0;

      const conditions = conditionCounts(all, locale);
      const selected = request.conditionPublicId
        ? conditions.find((c) => c.publicId === request.conditionPublicId)
        : undefined;
      const scoped = selected
        ? all.filter((r) => r.aboutTerms.some((t) => t.publicId === selected.publicId))
        : all;
      const shown = scoped.filter(
        (r) =>
          (request.outcome === undefined || r.outcome === request.outcome) &&
          (request.relationship === undefined || r.relationship === request.relationship) &&
          (request.docs !== true || documentsOf(r.id) > 0),
      );
      const breakdown = conditions.map((c) => ({
        condition: { publicId: c.publicId, name: c.name },
        sentiment: sentimentOf(
          all.filter((r) => r.aboutTerms.some((t) => t.publicId === c.publicId)),
          threshold,
        ),
      }));

      return {
        cards: shown.map((r) => cardOf(r, locale, documentsOf(r.id))),
        sentiment: sentimentOf(all, threshold),
        scopedSentiment: sentimentOf(scoped, threshold),
        scopedOutcome: toDistributionVM(
          distribution(
            scoped.map((r) => r.outcome),
            OUTCOMES,
            threshold,
          ),
        ),
        documentCount: all.reduce((sum, r) => sum + documentsOf(r.id), 0),
        total: all.length,
        scopedTotal: scoped.length,
        showing: shown.length,
        limitedData: isLimitedData(all.length, threshold),
        conditions,
        breakdown,
        ...(selected
          ? { selectedCondition: { publicId: selected.publicId, name: selected.name } }
          : {}),
      };
    },

    async forBranch(tx, { branchId }) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows = await deps.reviews.publishedForBranch(tx, branchId);
      const criteria = CRITERIA.map((key: Criterion) => ({
        key,
        dist: toDistributionVM(
          distribution(
            rows.map((r) => r.criteria[key] ?? null),
            CRITERION_VALUES,
            threshold,
          ),
        ),
      }));
      return {
        cards: rows.map(facilityAccountOf),
        criteria,
        total: rows.length,
        limitedData: isLimitedData(rows.length, threshold),
      };
    },

    async summariesForDoctors(tx, doctorIds, locale) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows =
        doctorIds.length > 0 ? await deps.reviews.summariesForDoctors(tx, doctorIds) : [];
      const documents = await deps.evidence.countPublicEvidenceByReview(
        rows.map((r) => r.reviewId),
      );
      const byDoctor = new Map<string, ReviewSummaryRecord[]>(doctorIds.map((id) => [id, []]));
      for (const row of rows) byDoctor.get(row.doctorId)?.push(row);
      return new Map(
        [...byDoctor].map(([id, list]) => [id, summaryOf(list, documents, locale, threshold)]),
      );
    },

    async summariesForBranches(tx, branchIds) {
      const threshold = (await deps.config.current()).limitedDataThreshold;
      const rows =
        branchIds.length > 0 ? await deps.reviews.summariesForBranches(tx, branchIds) : [];
      const byBranch = new Map<string, (string | null)[]>(branchIds.map((id) => [id, []]));
      for (const row of rows) byBranch.get(row.branchId)?.push(row.overall);
      return new Map(
        [...byBranch].map(([id, values]): [string, BranchExperienceSummary] => [
          id,
          {
            total: values.length,
            limitedData: isLimitedData(values.length, threshold),
            overall: toDistributionVM(distribution(values, CRITERION_VALUES, threshold)),
          },
        ]),
      );
    },
  };
}
