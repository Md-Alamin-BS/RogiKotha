import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  expectErr,
  expectOk,
  makeReviewModuleWorld,
  type ReviewModuleWorld,
} from './review-test-support';

function readerCall(w: ReviewModuleWorld, locale: 'en' | 'bn' = 'en') {
  return w.callAs(anAnonymousActor({ locale }));
}

describe('review.getExperience', () => {
  it('builds the page of an eligible review with its byline and related lists', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    const earlier = await w.published(author, 'pseudonymous');
    w.fakes.clock.advanceMs(60_000);
    const publicId = await w.published(author, 'pseudonymous');

    const page = expectOk(await w.review.getExperience.execute({ publicId }, readerCall(w)));

    expect(page.publicId).toBe(publicId);
    expect(page.byline).toEqual({ personaKind: 'pseudonymous', username: author.username });
    expect(page.doctor).toEqual({
      publicId: w.doctor.publicId,
      name: w.doctor.nameEn,
      memberAddedNotConfirmed: false,
    });
    expect(page.sameDoctor.map((c) => c.publicId)).toEqual([earlier]);
    expect(page.relatedByCondition.map((c) => c.publicId)).toEqual([earlier]);
    expect(page.otherByAuthor.map((c) => c.publicId)).toEqual([earlier]);
    expect(w.cards.requests.every((r) => r.excludePublicId === publicId)).toBe(true);
  });

  it('shows the doctor and tags in Bengali for a Bengali reader', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    const publicId = await w.published(author, 'named');

    const page = expectOk(await w.review.getExperience.execute({ publicId }, readerCall(w, 'bn')));

    expect(page.doctor.name).toBe(w.doctor.nameBn);
    expect(page.tags[0]).toMatchObject({ name: w.condition.nameBn });
    expect(page.byline).toEqual({ personaKind: 'named', displayName: author.displayName });
  });

  it('never asks for an author list of an anonymous review', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    await w.published(author, 'anonymous');
    const publicId = await w.published(author, 'anonymous');

    const page = expectOk(await w.review.getExperience.execute({ publicId }, readerCall(w)));

    expect(page.byline.personaKind).toBe('anonymous');
    expect(page.byline.alias).toMatch(/^patient-/);
    expect(page.otherByAuthor).toEqual([]);
    expect(w.cards.requests.some((r) => r.personaIds !== undefined)).toBe(false);
  });

  it('keeps the page when a related list fails, logging only the code', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    const publicId = await w.published(author);
    w.cards.failing = true;

    const page = expectOk(await w.review.getExperience.execute({ publicId }, readerCall(w)));

    expect(page.sameDoctor).toEqual([]);
    expect(w.fakes.logger.events()).toContain('review.related_failed');
  });

  it.each([
    ['an unknown public id', () => undefined],
    [
      'a hidden review',
      (w: ReviewModuleWorld) => {
        w.reviews.reviews[0]!.state = 'hidden';
      },
    ],
    [
      'a deleted review',
      (w: ReviewModuleWorld) => {
        w.reviews.reviews[0]!.deletedAt = w.fakes.clock.now();
      },
    ],
    [
      'a review of a merged doctor',
      (w: ReviewModuleWorld) => {
        w.doctor.mergedIntoId = w.reviews.addDoctor().id;
      },
    ],
  ])('answers not_found for %s', async (label, change) => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    const publicId = await w.published(author);
    change(w);
    const asked = label === 'an unknown public id' ? 'zzzzzzzzzz' : publicId;

    const error = expectErr(
      await w.review.getExperience.execute({ publicId: asked }, readerCall(w)),
    );

    expect(error.code).toBe('not_found');
  });
});

describe('review.countExperiences', () => {
  it('counts eligible reviews only', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member();
    await w.published(author);
    await w.published(author, 'anonymous');
    await w.published(author, 'named');
    w.reviews.reviews[2]!.state = 'hidden';

    expect(expectOk(await w.review.countExperiences.execute({}, readerCall(w)))).toEqual({
      total: 2,
    });
  });
});

describe('review.authorCards', () => {
  it("lists a username's named and pseudonymous reviews and never the anonymous ones", async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member({ username: 'shirin_88' });
    const pseudo = await w.published(author, 'pseudonymous');
    await w.published(author, 'anonymous');
    const named = await w.published(author, 'named');

    const out = expectOk(
      await w.review.authorCards.execute({ username: 'shirin_88' }, readerCall(w)),
    );

    expect(out.header.username).toBe('shirin_88');
    expect(out.page.items.map((c) => c.publicId).sort()).toEqual([named, pseudo].sort());
  });

  it('gives the same empty answer for an unknown username and an anonymous-only author', async () => {
    const w = makeReviewModuleWorld();
    const author = await w.member({ username: 'rahim_42' });
    await w.published(author, 'anonymous');

    const unknown = expectOk(
      await w.review.authorCards.execute({ username: 'nobody_here' }, readerCall(w)),
    );
    const anonymousOnly = expectOk(
      await w.review.authorCards.execute({ username: 'rahim_42' }, readerCall(w)),
    );

    expect(unknown.page).toEqual({ items: [] });
    expect(anonymousOnly.page).toEqual(unknown.page);
    expect(Object.keys(anonymousOnly.header)).toEqual(['username']);
  });
});

describe('review.listOwnReviews', () => {
  it("lists every own review newest first, anonymous ones included, never deleted or another's", async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const other = await w.member();
    const first = await w.published(m, 'named');
    w.fakes.clock.advanceMs(60_000);
    const anon = await w.published(m, 'anonymous');
    w.fakes.clock.advanceMs(60_000);
    const hidden = await w.published(m, 'pseudonymous');
    w.fakes.clock.advanceMs(60_000);
    const deleted = await w.published(m, 'pseudonymous');
    await w.published(other, 'pseudonymous');
    w.reviews.reviews.find((r) => r.publicId === hidden)!.state = 'hidden';
    w.reviews.reviews.find((r) => r.publicId === deleted)!.deletedAt = w.fakes.clock.now();

    const list = expectOk(await w.review.listOwnReviews.execute({}, m.call));

    expect(list.map((r) => r.publicId)).toEqual([hidden, anon, first]);
    expect(list.map((r) => r.state)).toEqual(['hidden', 'published', 'published']);
    expect(list[0]).toMatchObject({ doctorName: w.doctor.nameEn, edited: false });
  });

  it('refuses a signed-out reader', async () => {
    const w = makeReviewModuleWorld();

    expect(expectErr(await w.review.listOwnReviews.execute({}, readerCall(w))).code).toBe(
      'forbidden',
    );
  });
});

describe('review.hasOwnReviewOfDoctor', () => {
  it("is true only when the actor already has an eligible review of the draft's doctor", async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const other = await w.member();
    const draftId = await w.draftOf(m);

    const before = expectOk(await w.review.hasOwnReviewOfDoctor.execute({ draftId }, m.call));
    await w.published(other);
    const afterOther = expectOk(await w.review.hasOwnReviewOfDoctor.execute({ draftId }, m.call));
    await w.published(m, 'anonymous');
    const afterOwn = expectOk(await w.review.hasOwnReviewOfDoctor.execute({ draftId }, m.call));

    expect(before).toEqual({ duplicate: false });
    expect(afterOther).toEqual({ duplicate: false });
    expect(afterOwn).toEqual({ duplicate: true });
  });

  it("answers not_found for another account's draft and false for a draft without a doctor", async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const other = await w.member();
    const foreign = await w.draftOf(other);
    const facility = await w.draftOf(m, w.payload('facility'));

    const error = expectErr(
      await w.review.hasOwnReviewOfDoctor.execute({ draftId: foreign }, m.call),
    );
    const noDoctor = expectOk(
      await w.review.hasOwnReviewOfDoctor.execute({ draftId: facility }, m.call),
    );

    expect(error.code).toBe('not_found');
    expect(noDoctor).toEqual({ duplicate: false });
  });
});

describe('review.preview', () => {
  const names = { named: 'Shirin Demo', pseudonymous: 'shirin_88' };

  it.each([
    ['named', { personaKind: 'named', displayName: 'Shirin Demo' }],
    ['pseudonymous', { personaKind: 'pseudonymous', username: 'shirin_88' }],
    ['anonymous', { personaKind: 'anonymous', alias: null }],
  ] as const)('shows the %s byline and writes nothing', async (mode, byline) => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('quick', { identityMode: mode }));
    const personasBefore = w.identity.store.personas.length;

    const vm = expectOk(await w.review.preview.execute({ draftId, names }, m.call));

    if (vm.kind !== 'experience') throw new Error('expected a doctor preview');
    expect(vm.byline).toEqual(byline);
    expect(vm).not.toHaveProperty('publicId');
    expect(vm).not.toHaveProperty('publishedAt');
    expect(vm.otherByAuthor).toEqual([]);
    expect(vm.doctor).toMatchObject({ publicId: w.doctor.publicId, name: w.doctor.nameEn });
    expect(w.identity.store.personas).toHaveLength(personasBefore);
    expect(w.reviews.reviews).toHaveLength(0);
  });

  it('previews an incomplete draft without enforcing the minimum, typed tags as provisional', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const termsBefore = w.reviews.terms.length;
    const draftId = await w.draftOf(m, {
      v: 1,
      target: 'doctor',
      mode: 'quick',
      tags: [{ group: 'condition', text: 'Synthetic rash' }],
    });

    const vm = expectOk(await w.review.preview.execute({ draftId }, m.call));

    if (vm.kind !== 'experience') throw new Error('expected a doctor preview');
    expect(vm.title).toBe('');
    expect(vm).not.toHaveProperty('doctor');
    expect(vm).not.toHaveProperty('period');
    expect(vm.tags).toEqual([{ group: 'condition', name: 'Synthetic rash', provisional: true }]);
    expect(w.reviews.terms).toHaveLength(termsBefore);
    expect(w.taxonomy.calls).toHaveLength(0);
  });

  it('shows a doctor not yet listed as added by a member, without a public id', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, {
      v: 1,
      target: 'doctor',
      mode: 'quick',
      newDoctor: { name: 'Dr. Kalponik Hossain' },
    });

    const vm = expectOk(await w.review.preview.execute({ draftId }, m.call));

    if (vm.kind !== 'experience') throw new Error('expected a doctor preview');
    expect(vm.doctor).toEqual({ name: 'Dr. Kalponik Hossain', memberAddedNotConfirmed: true });
    expect(w.directory.calls).toHaveLength(0);
  });

  it('previews a facility draft with the answered criteria and the named author', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('facility'));

    const vm = expectOk(await w.review.preview.execute({ draftId, names }, m.call));

    if (vm.kind !== 'facility') throw new Error('expected a facility preview');
    expect(vm.author).toMatchObject({ personaKind: 'named', displayName: 'Shirin Demo' });
    expect(vm.criteria.map((c) => c.key)).toEqual(['staff', 'waiting', 'overall']);
  });

  it("answers not_found for another account's draft", async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const other = await w.member();
    const draftId = await w.draftOf(other);

    expect(expectErr(await w.review.preview.execute({ draftId }, m.call)).code).toBe('not_found');
  });
});
