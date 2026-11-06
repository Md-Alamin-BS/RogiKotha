// `aReview()` — a review entity for domain/application tests. No
// entity-level zod schema exists yet (see doctor.ts); the *publish command*
// shape it maps onto (`PublishReviewInput`) needs only `draftId`,
// `identityMode`, `attestation` — `toPublishReviewInput()` below extracts
// exactly that subset so builders.test.ts can validate it against the real
// contracts schema without inventing one.
import type {
  DraftPayloadInput,
  IdentityMode,
  Outcome,
  PublishReviewInput,
  Relationship,
  ReviewKind,
  ReviewLanguage,
  Sentiment,
} from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusReview } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface ReviewBuild extends CorpusReview {
  id: string;
  identityMode: IdentityMode;
  /** Release-1 columns (U47). */
  publicId: string;
  kind: ReviewKind;
  language: ReviewLanguage;
  periodYear: number;
  periodMonth: number;
  /** Private; never in a public projection (FR42). */
  exactDate: string | null;
}

/** A well-formed, deterministic public id: `r` and nine digits from the sequence id. */
function builderPublicId(n: string): string {
  const digits = n.replace(/\D/g, '').slice(-9).padStart(9, '0');
  return `r${digits}`;
}

export function aReview(overrides: Partial<ReviewBuild> = {}): ReviewBuild {
  const n = seqId('review');
  const sentiment: Sentiment = overrides.sentiment ?? 'positive';
  const outcome: Outcome = overrides.outcome ?? 'helped';
  const relationship: Relationship = overrides.relationship ?? 'self';
  return {
    id: n,
    seedRef: n,
    doctorSeedRef: overrides.doctorSeedRef ?? 'd1',
    conditionSeedRef: overrides.conditionSeedRef ?? 'c1',
    sentiment,
    outcome,
    relationship,
    identity: 'pseudo',
    identityMode: 'pseudonymous',
    publicId: builderPublicId(n),
    kind: 'quick',
    language: 'en',
    periodYear: 2026,
    periodMonth: 3,
    exactDate: null,
    author: { en: `builder_${n}`, bn: `builder_${n}` },
    period: { en: 'March 2026', bn: 'মার্চ ২০২৬' },
    posted: { en: 'Posted March 2026', bn: 'প্রকাশ মার্চ ২০২৬' },
    detailed: false,
    evidenceCount: 0,
    likes: 0,
    dislikes: 0,
    commentsCount: 0,
    claims: [],
    title: { en: `Builder review ${n}`, bn: `বিল্ডার অভিজ্ঞতা ${n}` },
    body: {
      en: 'A short synthetic experience for tests.',
      bn: 'পরীক্ষার জন্য একটি সংক্ষিপ্ত কাল্পনিক অভিজ্ঞতা।',
    },
    tags: [],
    ...overrides,
  };
}

/** Extracts the `review.publish` command-input subset for schema validation. */
export function toPublishReviewInput(r: ReviewBuild): z.infer<typeof PublishReviewInput> {
  return { draftId: r.id, identityMode: r.identityMode, attestation: true };
}

export type DraftVariant = 'quick' | 'detailed' | 'facility';

/**
 * A complete `DraftPayload` (ENT-006) for one composer variant, synthetic text only. The quick and
 * detailed variants meet the publish minimum; the facility variant names a branch, not a doctor.
 */
export function aDraftPayload(
  variant: DraftVariant = 'quick',
  overrides: Partial<DraftPayloadInput> = {},
): DraftPayloadInput {
  const common: DraftPayloadInput = {
    v: 1,
    step: 4,
    relationship: 'self',
    period: { year: 2026, month: 3 },
    title: 'A careful visit and a clear plan',
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    identityMode: 'pseudonymous',
  };
  const byVariant: Record<DraftVariant, DraftPayloadInput> = {
    quick: {
      ...common,
      target: 'doctor',
      mode: 'quick',
      doctorPublicId: 'd000000001',
      story: 'The doctor listened, examined me carefully and wrote the plan down.',
      tags: [{ group: 'condition', termPublicId: 'c000000001' }],
    },
    detailed: {
      ...common,
      target: 'doctor',
      mode: 'detailed',
      doctorPublicId: 'd000000001',
      sections: {
        symptoms: 'A dry cough for three weeks.',
        diagnosis: 'চিকিৎসক বললেন এটা অ্যালার্জি থেকে হতে পারে।',
        treatment: 'An inhaler and a follow-up after two weeks.',
        after: 'The cough eased within ten days.',
      },
      tags: [{ group: 'condition', text: 'Seasonal cough' }],
      notSure: false,
    },
    facility: {
      ...common,
      target: 'facility',
      mode: 'quick',
      branchPublicId: 'b000000001',
      story: 'The reception was calm and the report came on the promised day.',
      criteria: { staff: 'good', waiting: 'mixed', overall: 'good' },
      identityMode: 'named',
      tags: [],
    },
  };
  return { ...byVariant[variant], ...overrides };
}
