// `aFacilityReview()` — a facility-feedback entity. No entity-level zod
// schema exists yet (see doctor.ts); it never joins a doctor's aggregates
// (hard rule — `branchSeedRef` only, no `doctorSeedRef` field at all).
import type { CorpusFacilityReview } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface FacilityReviewBuild extends CorpusFacilityReview {
  id: string;
}

export function aFacilityReview(overrides: Partial<FacilityReviewBuild> = {}): FacilityReviewBuild {
  const n = seqId('facility-review');
  return {
    id: n,
    seedRef: n,
    branchSeedRef: overrides.branchSeedRef ?? 'f1',
    identity: 'pseudo',
    author: { en: `builder_${n}`, bn: `builder_${n}` },
    period: { en: 'March 2026', bn: 'মার্চ ২০২৬' },
    posted: { en: 'Posted March 2026', bn: 'প্রকাশ মার্চ ২০২৬' },
    likes: 0,
    dislikes: 0,
    body: {
      en: 'Synthetic facility feedback for tests.',
      bn: 'পরীক্ষার জন্য কাল্পনিক প্রতিক্রিয়া।',
    },
    criteria: { overall: 'good' },
    ...overrides,
  };
}
