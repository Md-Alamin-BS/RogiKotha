// Cumulative smoke suite assertion for this task (04-handoff-and-
// validation.md §3.1): the package's whole surface — corpus, builders,
// fakes — works together through the single `index.ts` entry point.
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  ACCOUNTS,
  aReview,
  DOCTORS,
  makeFakePorts,
  REVIEWS,
  toPublishReviewInput,
} from './index.js';

describe('test-support smoke', () => {
  it('corpus, builders and fakes all work together through the package entry point', async () => {
    expect(DOCTORS.length).toBe(6);
    expect(ACCOUNTS.length).toBeGreaterThanOrEqual(15);
    expect(REVIEWS.length).toBe(12);

    const review = aReview({ doctorSeedRef: DOCTORS[0].seedRef });
    const publishInput = toPublishReviewInput(review);
    expect(publishInput.attestation).toBe(true);

    const ports = makeFakePorts();
    const key = await ports.storage.putQuarantine(Readable.from(Buffer.from('smoke')), { itemId: 'smoke-item' });
    expect(await ports.storage.head(key)).toEqual({ bytes: 5 });
  });
});
