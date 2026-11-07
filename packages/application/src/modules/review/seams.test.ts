import { IDENTITY_MODES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { TX, anAnonymousActor, makeReviewModuleWorld } from './review-test-support';

async function worldWithReviews() {
  const w = makeReviewModuleWorld();
  const author = await w.member();
  const other = await w.member();
  const pseudoPublicId = await w.published(author, 'pseudonymous');
  const anonPublicId = await w.published(author, 'anonymous');
  const idOf = async (publicId: string) => {
    const id = await w.review.reviewIdForPublicId(TX, { publicId });
    if (id === null) throw new Error('review id missing');
    return id;
  };
  return {
    w,
    author,
    other,
    pseudoPublicId,
    anonPublicId,
    pseudoId: await idOf(pseudoPublicId),
    anonId: await idOf(anonPublicId),
  };
}

describe('reviewIdForPublicId', () => {
  it('maps a public id to the internal id and an unknown one to null', async () => {
    const { w, pseudoPublicId, pseudoId } = await worldWithReviews();

    expect(await w.review.reviewIdForPublicId(TX, { publicId: pseudoPublicId })).toBe(pseudoId);
    expect(await w.review.reviewIdForPublicId(TX, { publicId: 'zzzzzzzzzz' })).toBeNull();
  });
});

describe('isReviewAuthor', () => {
  it('is true for the author in pseudonymous and anonymous mode', async () => {
    const { w, author, pseudoId, anonId } = await worldWithReviews();

    expect(await w.review.isReviewAuthor(TX, { reviewId: pseudoId, actor: author.actor })).toBe(
      true,
    );
    expect(await w.review.isReviewAuthor(TX, { reviewId: anonId, actor: author.actor })).toBe(true);
  });

  it("gives the same false for another account's anonymous review and for an unknown id", async () => {
    const { w, other, anonId } = await worldWithReviews();

    const foreign = await w.review.isReviewAuthor(TX, { reviewId: anonId, actor: other.actor });
    const unknown = await w.review.isReviewAuthor(TX, {
      reviewId: w.fakes.ids.newId(),
      actor: other.actor,
    });

    expect(foreign).toBe(false);
    expect(unknown).toBe(foreign);
  });

  it('is false for a signed-out reader', async () => {
    const { w, pseudoId } = await worldWithReviews();

    expect(
      await w.review.isReviewAuthor(TX, { reviewId: pseudoId, actor: anAnonymousActor() }),
    ).toBe(false);
  });
});

describe('isReviewPublished', () => {
  it('is true for an eligible review and false once hidden or for an unknown id', async () => {
    const { w, pseudoId } = await worldWithReviews();

    expect(await w.review.isReviewPublished(TX, { reviewId: pseudoId })).toBe(true);
    w.reviews.reviews.find((r) => r.id === pseudoId)!.state = 'hidden';
    expect(await w.review.isReviewPublished(TX, { reviewId: pseudoId })).toBe(false);
    expect(await w.review.isReviewPublished(TX, { reviewId: w.fakes.ids.newId() })).toBe(false);
  });
});

describe('authorIdentityModeOf', () => {
  it('answers the bare mode, anonymous included, and null for an unknown id', async () => {
    const { w, author, pseudoId, anonId } = await worldWithReviews();

    const anon = await w.review.authorIdentityModeOf(TX, { reviewId: anonId });
    const pseudo = await w.review.authorIdentityModeOf(TX, { reviewId: pseudoId });
    const unknown = await w.review.authorIdentityModeOf(TX, { reviewId: w.fakes.ids.newId() });

    expect(anon).toBe('anonymous');
    expect(pseudo).toBe('pseudonymous');
    expect(unknown).toBeNull();
    const personaIds = w.identity.store.personas.map((p) => p.id);
    for (const answer of [anon, pseudo]) {
      expect(IDENTITY_MODES).toContain(answer);
      expect(personaIds).not.toContain(answer);
      expect(answer).not.toBe(author.accountId);
    }
  });
});

describe('lastEditedAt', () => {
  it('is null before a correction and the newest correction time after', async () => {
    const { w, pseudoId } = await worldWithReviews();

    expect(await w.review.lastEditedAt(TX, { reviewId: pseudoId })).toBeNull();
    w.reviews.addCorrection(pseudoId, new Date('2026-11-02T10:00:00.000Z'));
    w.reviews.addCorrection(pseudoId, new Date('2026-11-03T10:00:00.000Z'));
    expect(await w.review.lastEditedAt(TX, { reviewId: pseudoId })).toBe(
      '2026-11-03T10:00:00.000Z',
    );
  });
});
