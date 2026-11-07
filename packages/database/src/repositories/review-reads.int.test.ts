import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { reviews } from '../schema/review';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import {
  buildAlias,
  buildBranch,
  buildChamber,
  buildDoctor,
  buildFacility,
  buildFacilityReview,
  buildPersona,
  buildReview,
  buildTerm,
  uniqueSuffix,
} from './directory-test-support';
import { PgReviewReadRepository } from './review-reads';

const repo = new PgReviewReadRepository();
const tx = appTxOf(testDb);

async function doctorWithPersona() {
  return { doctor: await buildDoctor(testDb), persona: await buildPersona(testDb) };
}

describe('PgReviewReadRepository doctor reads (BR1.3)', () => {
  it('returns only eligible reviews, newest first, and a restored review returns', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const older = await buildReview(testDb, doctor.id, persona, {
      publishedAt: new Date('2026-03-01T00:00:00Z'),
    });
    const newer = await buildReview(testDb, doctor.id, persona, {
      publishedAt: new Date('2026-04-01T00:00:00Z'),
    });
    const hidden = await buildReview(testDb, doctor.id, persona, { state: 'hidden' });
    await buildReview(testDb, doctor.id, persona, { deletedAt: new Date() });
    await buildReview(testDb, doctor.id, persona, { publishedAt: null });

    expect((await repo.publishedForDoctor(tx, doctor.id)).map((c) => c.id)).toEqual([
      newer.id,
      older.id,
    ]);
    expect(await repo.summariesForDoctors(tx, [doctor.id])).toHaveLength(2);

    await testDb.update(reviews).set({ state: 'published' }).where(eq(reviews.id, hidden.id));
    expect(await repo.publishedForDoctor(tx, doctor.id)).toHaveLength(3);
  });

  it('gives an anonymous byline whenever the persona or the review is anonymous', async () => {
    const doctor = await buildDoctor(testDb);
    const named = await buildPersona(testDb, { displayName: 'Rina Akter' });
    const anonymous = await buildPersona(testDb, { kind: 'anonymous', displayName: 'Anonymous' });
    await buildReview(testDb, doctor.id, named, { identityMode: 'anonymous' });
    await buildReview(testDb, doctor.id, anonymous);
    await buildReview(testDb, doctor.id, named);

    const kinds = (await repo.publishedForDoctor(tx, doctor.id)).map((c) => c.author.personaKind);

    expect(kinds.sort()).toEqual(['anonymous', 'anonymous', 'named']);
  });

  it('picks the card condition by tag order and lists every term the review is about', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const run = uniqueSuffix();
    const asthma = await buildTerm(testDb, { nameEn: `Asthma ${run}`, nameBn: `হাঁপানি ${run}` });
    const migraine = await buildTerm(testDb, { nameEn: `Migraine ${run}` });
    await buildReview(testDb, doctor.id, persona, {
      tags: [
        { group: 'condition', freeText: 'Something unlisted' },
        { group: 'condition', freeText: ` MIGRAINE ${run} ` },
        { group: 'condition', termId: asthma.id },
      ],
    });
    const freeOnly = await buildDoctor(testDb);
    await buildReview(testDb, freeOnly.id, persona, {
      tags: [{ group: 'condition', freeText: 'Something unlisted' }],
    });

    const [card] = await repo.publishedForDoctor(tx, doctor.id);
    const [plain] = await repo.publishedForDoctor(tx, freeOnly.id);

    expect(card?.cardTerm?.id).toBe(migraine.id);
    expect(card?.cardFreeText).toBe('Something unlisted');
    expect(card?.aboutTerms.map((t) => t.id)).toEqual([asthma.id, migraine.id]);
    expect(plain?.cardTerm).toBeNull();
    expect(plain?.cardFreeText).toBe('Something unlisted');
  });

  it('keeps facility reviews out of a doctor’s figures (BR2.6)', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    await buildChamber(testDb, doctor.id, branch.id);
    await buildReview(testDb, doctor.id, persona, { branchId: branch.id });
    const before = await repo.publishedForDoctor(tx, doctor.id);
    const summariesBefore = await repo.summariesForDoctors(tx, [doctor.id]);

    for (let i = 0; i < 20; i += 1) await buildFacilityReview(testDb, branch.id, persona);

    expect(await repo.publishedForDoctor(tx, doctor.id)).toEqual(before);
    expect(await repo.summariesForDoctors(tx, [doctor.id])).toEqual(summariesBefore);
  });
});

describe('PgReviewReadRepository facility reads (BR1.4)', () => {
  it('returns eligible visits only and leaves doctor reviews out (BR2.7)', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    const visit = await buildFacilityReview(testDb, branch.id, persona, {
      criteria: { staff: 'good', overall: 'poor' },
    });
    await buildFacilityReview(testDb, branch.id, persona, { state: 'hidden' });
    await buildFacilityReview(testDb, branch.id, persona, { deletedAt: new Date() });
    await buildFacilityReview(testDb, branch.id, persona, { publishedAt: null });
    await buildReview(testDb, doctor.id, persona, { branchId: branch.id });

    const visits = await repo.publishedForBranch(tx, branch.id);
    const feedback = await repo.summariesForBranches(tx, [branch.id]);

    expect(visits.map((v) => v.publicId)).toEqual([visit.publicId]);
    expect(visits[0]?.criteria).toEqual({ staff: 'good', overall: 'poor' });
    expect(feedback).toEqual([{ branchId: branch.id, overall: 'poor' }]);
  });
});

describe('PgReviewReadRepository condition reads (BR1.7, FD-101)', () => {
  it('counts a review by term tag, either name, alias, case and outer spaces, once each', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const run = uniqueSuffix();
    // U+09DF and its decomposed form U+09AF U+09BC are one name after NFC.
    const term = await buildTerm(testDb, {
      nameEn: `Fungal rash ${run}`,
      nameBn: `ছত্রাক ক্ষয়রোগ ${run}`,
    });
    const mapped = await buildTerm(testDb, { canonicalId: term.id });
    await buildAlias(testDb, term.id, `Ringworm ${run}`, `ringworm${run}`);
    const tagSets = [
      [{ group: 'condition' as const, termId: term.id }],
      [{ group: 'condition' as const, termId: mapped.id }],
      [{ group: 'condition' as const, freeText: `  fungal RASH ${run} ` }],
      [{ group: 'condition' as const, freeText: `ছত্রাক ক্ষয়রোগ ${run}` }],
      [{ group: 'condition' as const, freeText: `ringworm ${run}` }],
      [
        { group: 'condition' as const, termId: term.id },
        { group: 'condition' as const, freeText: `Fungal rash ${run}` },
      ],
      [{ group: 'symptom' as const, freeText: `Fungal rash ${run}` }],
    ];
    for (const tags of tagSets) await buildReview(testDb, doctor.id, persona, { tags });

    const totals = await repo.totalsForTerms(tx, [term.id]);
    const forTerm = await repo.publishedForTerm(tx, term.id);

    expect(totals.get(term.id)).toBe(6);
    expect(forTerm).toHaveLength(6);
  });

  it('matches nothing for a hidden term and gives 0 for every given id', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const hidden = await buildTerm(testDb, { state: 'hidden' });
    const empty = await buildTerm(testDb);
    await buildReview(testDb, doctor.id, persona, {
      tags: [{ group: 'condition', freeText: hidden.nameEn }],
    });

    const totals = await repo.totalsForTerms(tx, [hidden.id, empty.id]);

    expect(totals.get(hidden.id)).toBe(0);
    expect(totals.get(empty.id)).toBe(0);
    expect(await repo.publishedForTerm(tx, hidden.id)).toEqual([]);
  });

  it('leaves out reviews of a merged or unpublished doctor everywhere (R-03)', async () => {
    const persona = await buildPersona(testDb);
    const term = await buildTerm(testDb);
    const target = await buildDoctor(testDb);
    const merged = await buildDoctor(testDb, { mergedIntoId: target.id });
    const hidden = await buildDoctor(testDb, { state: 'hidden' });
    for (const doctor of [merged, hidden]) {
      await buildReview(testDb, doctor.id, persona, {
        tags: [{ group: 'condition', termId: term.id }],
      });
    }

    expect((await repo.totalsForTerms(tx, [term.id])).get(term.id)).toBe(0);
    expect(await repo.publishedForTerm(tx, term.id)).toEqual([]);
    expect(await repo.listRecentCards(tx, { limit: 10, termPublicId: term.publicId })).toEqual([]);
    expect(await repo.publishedForDoctor(tx, merged.id)).toEqual([]);
    expect(await repo.summariesForDoctors(tx, [merged.id, hidden.id])).toEqual([]);
  });

  it('gives a condition page the doctor, its primary chamber, the visible branch and mentions', async () => {
    const run = uniqueSuffix();
    const specialty = await buildTerm(testDb, { kind: 'specialty', nameEn: `Dermatology ${run}` });
    const doctor = await buildDoctor(testDb, { specialtyId: specialty.id });
    await buildChamber(testDb, doctor.id, null, 1, 'Second chamber');
    await buildChamber(testDb, doctor.id, null, 0, 'Primary chamber');
    const persona = await buildPersona(testDb);
    const facility = await buildFacility(testDb, { nameEn: `Group ${run}` });
    const branch = await buildBranch(testDb, facility.id, { ownNameEn: 'Own', ownNameBn: 'নিজ' });
    const hiddenBranch = await buildBranch(testDb, facility.id, { state: 'hidden' });
    const term = await buildTerm(testDb);
    const medicine = await buildTerm(testDb, { kind: 'medicine', nameEn: `Cream ${run}` });
    await buildReview(testDb, doctor.id, persona, {
      branchId: branch.id,
      publishedAt: new Date('2026-05-02T00:00:00Z'),
      tags: [
        { group: 'condition', termId: term.id },
        { group: 'medicine', termId: medicine.id },
        { group: 'treatment', freeText: 'Cold compress' },
        { group: 'symptom', notSure: true },
      ],
    });
    await buildReview(testDb, doctor.id, persona, {
      branchId: hiddenBranch.id,
      publishedAt: new Date('2026-05-01T00:00:00Z'),
      tags: [{ group: 'condition', termId: term.id }],
    });

    const [withBranch, withHidden] = await repo.publishedForTerm(tx, term.id);

    expect(withBranch).toMatchObject({
      doctorSpecialtyEn: `Dermatology ${run}`,
      doctorPrimaryChamberEn: 'Primary chamber',
      doctorAreaEn: 'Mirpur',
      branch: { id: branch.id, ownNameEn: 'Own', facilityNameEn: `Group ${run}` },
    });
    expect(withBranch?.mentions).toEqual([
      {
        group: 'medicine',
        termNameEn: `Cream ${run}`,
        termNameBn: medicine.nameBn,
        freeText: null,
      },
      { group: 'treatment', termNameEn: null, termNameBn: null, freeText: 'Cold compress' },
    ]);
    expect(withHidden?.branch).toBeNull();
  });
});

describe('PgReviewReadRepository recent cards', () => {
  it('pages newest first on (published_at, public_id) and filters by doctor and term', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const term = await buildTerm(testDb);
    const at = new Date('2030-01-01T00:00:00Z');
    const built = [];
    for (let i = 0; i < 3; i += 1) {
      built.push(
        await buildReview(testDb, doctor.id, persona, {
          publishedAt: new Date(at.getTime() + i * 60_000),
          tags: i === 0 ? [{ group: 'condition', termId: term.id }] : [],
        }),
      );
    }

    const firstPage = await repo.listRecentCards(tx, { limit: 2, doctorPublicId: doctor.publicId });
    const last = firstPage.at(-1)!;
    const secondPage = await repo.listRecentCards(tx, {
      limit: 2,
      doctorPublicId: doctor.publicId,
      after: { publishedAt: last.publishedAt, publicId: last.publicId },
    });
    const byTerm = await repo.listRecentCards(tx, { limit: 5, termPublicId: term.publicId });

    expect(firstPage.map((c) => c.id)).toEqual([built[2]!.id, built[1]!.id]);
    expect(secondPage.map((c) => c.id)).toEqual([built[0]!.id]);
    expect(byTerm.map((c) => c.id)).toEqual([built[0]!.id]);
    expect(await repo.listRecentCards(tx, { limit: 0 })).toEqual([]);
    expect(await repo.listRecentCards(tx, { limit: 5, termPublicId: 'ZZZZZZZZZZ' })).toEqual([]);
  });
});

describe('PgReviewReadRepository recent cards, U47 filters', () => {
  it('filters by author personas, and an empty persona list matches nothing (BR7.2)', async () => {
    const doctor = await buildDoctor(testDb);
    const mine = await buildPersona(testDb, { kind: 'pseudonymous', username: null });
    const other = await buildPersona(testDb);
    const own = await buildReview(testDb, doctor.id, mine);
    await buildReview(testDb, doctor.id, other);

    const cards = await repo.listRecentCards(tx, {
      limit: 5,
      doctorPublicId: doctor.publicId,
      personaIds: [mine],
    });

    expect(cards.map((c) => c.id)).toEqual([own.id]);
    expect(
      await repo.listRecentCards(tx, { limit: 5, doctorPublicId: doctor.publicId, personaIds: [] }),
    ).toEqual([]);
    expect(await repo.listRecentCards(tx, { limit: 5, personaIds: ['not-a-uuid'] })).toEqual([]);
  });

  it('leaves out the excluded review and keeps the rest (BR5.8)', async () => {
    const { doctor, persona } = await doctorWithPersona();
    const first = await buildReview(testDb, doctor.id, persona);
    const second = await buildReview(testDb, doctor.id, persona);

    const cards = await repo.listRecentCards(tx, {
      limit: 5,
      doctorPublicId: doctor.publicId,
      excludePublicId: first.publicId,
    });

    expect(cards.map((c) => c.id)).toEqual([second.id]);
  });
});
