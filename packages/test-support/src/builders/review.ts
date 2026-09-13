// `aReview()` — a review entity for domain/application tests. No
// entity-level zod schema exists yet (see doctor.ts); the *publish command*
// shape it maps onto (`PublishReviewInput`) needs only `draftId`,
// `identityMode`, `attestation` — `toPublishReviewInput()` below extracts
// exactly that subset so builders.test.ts can validate it against the real
// contracts schema without inventing one.
import type { IdentityMode, Outcome, PublishReviewInput, Relationship, Sentiment } from '@rogikotha/contracts';
import type { z } from 'zod';

import type { CorpusReview } from '../corpus/types.js';
import { seqId } from './seq.js';

export interface ReviewBuild extends CorpusReview {
  id: string;
  identityMode: IdentityMode;
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
    body: { en: 'A short synthetic experience for tests.', bn: 'পরীক্ষার জন্য একটি সংক্ষিপ্ত কাল্পনিক অভিজ্ঞতা।' },
    tags: [],
    ...overrides,
  };
}

/** Extracts the `review.publish` command-input subset for schema validation. */
export function toPublishReviewInput(r: ReviewBuild): z.infer<typeof PublishReviewInput> {
  return { draftId: r.id, identityMode: r.identityMode, attestation: true };
}
