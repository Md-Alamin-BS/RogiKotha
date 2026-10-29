// Cumulative smoke suite assertion for this task (04-handoff-and-
// validation.md §3.1): the package's whole surface — corpus, builders,
// fakes — works together through the single `index.ts` entry point.
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  ACCOUNTS,
  aReview,
  BRANCHES,
  COMMENTS,
  DOCTORS,
  makeFakePorts,
  MODERATION_CASES,
  REVIEWS,
  toPublishReviewInput,
} from './index.js';

describe('test-support smoke', () => {
  it('corpus, builders and fakes all work together through the package entry point', async () => {
    // CR-012: the pinned 6 doctors and 12 reviews became the FD-089 counts.
    expect(DOCTORS.length).toBe(10);
    expect(ACCOUNTS.length).toBeGreaterThanOrEqual(15);
    expect(REVIEWS.length).toBe(24);

    const review = aReview({ doctorSeedRef: DOCTORS[0].seedRef });
    const publishInput = toPublishReviewInput(review);
    expect(publishInput.attestation).toBe(true);

    const ports = makeFakePorts();
    const key = await ports.storage.putQuarantine(Readable.from(Buffer.from('smoke')), {
      itemId: 'smoke-item',
    });
    expect(await ports.storage.head(key)).toEqual({ bytes: 5 });
  });

  it("serves the FD-089 corpus and FD-039's moderation facts through the package entry point", () => {
    expect({
      doctors: DOCTORS.length,
      branches: BRANCHES.length,
      reviews: REVIEWS.length,
      comments: COMMENTS.length,
      cases: MODERATION_CASES.length,
    }).toEqual({
      doctors: 10,
      branches: 10,
      reviews: 24,
      comments: 49,
      cases: 10,
    });
    expect(MODERATION_CASES.find((c) => c.seedRef === 'MOD-2041')?.lane).toBe('critical');
    expect(MODERATION_CASES.find((c) => c.seedRef === 'MOD-2033')).toMatchObject({
      reportCount: 6,
      reportReasons: ['factual', 'factual', 'impersonation'],
    });
  });
});
