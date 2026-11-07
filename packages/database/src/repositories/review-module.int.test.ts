import type { NewReviewRecord } from '@rogikotha/application';
import { newId, newPublicId, type Criterion, type CriterionValue } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  facilityReviews,
  reviewDrafts,
  reviews,
  reviewTags,
  reviewVersions,
} from '../schema/review';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import {
  buildAccount,
  buildBranch,
  buildDoctor,
  buildFacility,
  buildPersona,
  buildReview,
  buildSubmission,
  buildTerm,
} from './directory-test-support';
import { PgReviewModuleRepository } from './review-module';

const repo = new PgReviewModuleRepository();
const tx = appTxOf(testDb);
const DAY = 24 * 60 * 60 * 1000;

const bytesOf = (text: string) => new TextEncoder().encode(text);
const textOf = (value: Uint8Array) => new TextDecoder().decode(value);

async function saveDraft(accountId: string, at: Date, payload = 'sealed-payload') {
  const id = newId();
  await repo.insertDraft(tx, {
    id,
    accountId,
    kind: 'quick',
    payloadEnc: bytesOf(payload),
    doctorId: null,
    now: at,
    expiresAt: new Date(at.getTime() + 30 * DAY),
  });
  return id;
}

function aNewReview(doctorId: string, personaId: string, now = new Date()): NewReviewRecord {
  return {
    id: newId(),
    publicId: newPublicId(),
    authorPersonaId: personaId,
    doctorId,
    kind: 'quick',
    relationship: 'self',
    identityMode: 'pseudonymous',
    sentiment: null,
    outcome: 'helped',
    periodYear: 2026,
    periodMonth: 2,
    exactDateEnc: bytesOf('2026-02-11'),
    title: 'A calm and careful visit',
    body: 'The doctor listened, explained the plan and wrote it down for me.',
    sections: null,
    claims: [{ label: 'secondOpinion' }],
    language: 'en',
    now,
  };
}

describe('PgReviewModuleRepository drafts (BR2)', () => {
  it('inserts a draft and updates it for its own account only', async () => {
    const owner = await buildAccount(testDb);
    const stranger = await buildAccount(testDb);
    const now = new Date();
    const id = await saveDraft(owner.accountId, now, 'first');
    const later = new Date(now.getTime() + 60_000);
    const change = {
      kind: 'detailed' as const,
      payloadEnc: bytesOf('second'),
      doctorId: null,
      now: later,
      expiresAt: new Date(later.getTime() + 30 * DAY),
    };

    expect(await repo.updateOwnDraft(tx, stranger.accountId, id, change)).toBe(false);
    expect(await repo.updateOwnDraft(tx, owner.accountId, id, change)).toBe(true);

    const found = await repo.findOwnLiveDraft(tx, owner.accountId, id, later);
    expect(found).toMatchObject({ id, kind: 'detailed', doctorId: null });
    expect(textOf(found!.payloadEnc)).toBe('second');
    expect(found!.updatedAt.getTime()).toBe(later.getTime());
    expect(await repo.findOwnLiveDraft(tx, stranger.accountId, id, later)).toBeNull();
  });

  it('treats an expired draft as not found and never updates or deletes it', async () => {
    const owner = await buildAccount(testDb);
    const saved = new Date(Date.now() - 31 * DAY);
    const id = await saveDraft(owner.accountId, saved);
    const now = new Date();
    const change = {
      kind: 'quick' as const,
      payloadEnc: bytesOf('late'),
      doctorId: null,
      now,
      expiresAt: new Date(now.getTime() + 30 * DAY),
    };

    expect(await repo.findOwnLiveDraft(tx, owner.accountId, id, now)).toBeNull();
    expect(await repo.updateOwnDraft(tx, owner.accountId, id, change)).toBe(false);
    expect(await repo.deleteOwnDraft(tx, owner.accountId, id, now)).toBe(false);
    expect(await repo.countOwnLiveDrafts(tx, owner.accountId, now)).toBe(0);
    expect(await repo.listOwnLiveDrafts(tx, owner.accountId, now, 10)).toEqual([]);
    const rows = await testDb.select().from(reviewDrafts).where(eq(reviewDrafts.id, id));
    expect(rows).toHaveLength(1);
  });

  it('counts live drafts and lists them newest first up to the limit', async () => {
    const owner = await buildAccount(testDb);
    const base = Date.now() - DAY;
    const ids = [];
    for (let i = 0; i < 3; i += 1)
      ids.push(await saveDraft(owner.accountId, new Date(base + i * 1000)));
    const now = new Date();

    expect(await repo.countOwnLiveDrafts(tx, owner.accountId, now)).toBe(3);
    expect((await repo.listOwnLiveDrafts(tx, owner.accountId, now, 10)).map((d) => d.id)).toEqual([
      ids[2],
      ids[1],
      ids[0],
    ]);
    expect((await repo.listOwnLiveDrafts(tx, owner.accountId, now, 2)).map((d) => d.id)).toEqual([
      ids[2],
      ids[1],
    ]);
    expect(await repo.listOwnLiveDrafts(tx, owner.accountId, now, 0)).toEqual([]);
  });

  it("deletes the owner's draft only, and another account's attempt changes nothing", async () => {
    const owner = await buildAccount(testDb);
    const stranger = await buildAccount(testDb);
    const now = new Date();
    const id = await saveDraft(owner.accountId, now);

    expect(await repo.deleteOwnDraft(tx, stranger.accountId, id, now)).toBe(false);
    expect(await repo.findOwnLiveDraft(tx, owner.accountId, id, now)).not.toBeNull();
    expect(await repo.deleteOwnDraft(tx, owner.accountId, id, now)).toBe(true);
    expect(await repo.findOwnLiveDraft(tx, owner.accountId, id, now)).toBeNull();
    expect(await repo.deleteOwnDraft(tx, owner.accountId, 'not-a-uuid', now)).toBe(false);
  });

  it('returns a seeded plaintext draft as bytes and leaves it in place (ISS-269)', async () => {
    const owner = await buildAccount(testDb);
    const [row] = await testDb
      .insert(reviewDrafts)
      .values({
        accountId: owner.accountId,
        kind: 'quick',
        payloadEnc: Buffer.from('{"title":"Synthetic plaintext draft"}', 'utf8'),
      })
      .returning({ id: reviewDrafts.id });
    const now = new Date();

    const found = await repo.findOwnLiveDraft(tx, owner.accountId, row!.id, now);

    expect(found?.payloadEnc).toBeInstanceOf(Uint8Array);
    expect(textOf(found!.payloadEnc)).toBe('{"title":"Synthetic plaintext draft"}');
    expect(
      await testDb.select().from(reviewDrafts).where(eq(reviewDrafts.id, row!.id)),
    ).toHaveLength(1);
  });
});

describe('PgReviewModuleRepository reference ids', () => {
  it('resolves only visible doctors and branches', async () => {
    const visible = await buildDoctor(testDb);
    const hidden = await buildDoctor(testDb, { state: 'hidden' });
    const merged = await buildDoctor(testDb, { mergedIntoId: visible.id });
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    const hiddenBranch = await buildBranch(testDb, facility.id, { state: 'hidden' });

    expect(await repo.visibleDoctorIdByPublicId(tx, visible.publicId)).toBe(visible.id);
    expect(await repo.visibleDoctorIdByPublicId(tx, hidden.publicId)).toBeNull();
    expect(await repo.visibleDoctorIdByPublicId(tx, merged.publicId)).toBeNull();
    expect(await repo.visibleDoctorIdByPublicId(tx, 'bad id')).toBeNull();
    expect(await repo.visibleBranchIdByPublicId(tx, branch.publicId)).toBe(branch.id);
    expect(await repo.visibleBranchIdByPublicId(tx, hiddenBranch.publicId)).toBeNull();
  });

  it('maps active terms, and a mapped term to its canonical target', async () => {
    const active = await buildTerm(testDb, { kind: 'symptom' });
    const hidden = await buildTerm(testDb, { state: 'hidden' });
    const canonical = await buildTerm(testDb);
    const mapped = await buildTerm(testDb, { canonicalId: canonical.id });

    const terms = await repo.activeTermIdsByPublicIds(tx, [
      active.publicId,
      hidden.publicId,
      mapped.publicId,
      'ZZZZZZZZZZ',
    ]);

    expect(terms.get(active.publicId)).toEqual({ termId: active.id, kind: 'symptom' });
    expect(terms.get(mapped.publicId)).toEqual({ termId: canonical.id, kind: 'condition' });
    expect(terms.has(hidden.publicId)).toBe(false);
    expect(terms.size).toBe(2);
    expect((await repo.activeTermIdsByPublicIds(tx, [])).size).toBe(0);
  });

  it('names a visible doctor for the preview in the reader language, with the member mark', async () => {
    const specialty = await buildTerm(testDb, { kind: 'specialty', nameBn: 'কাল্পনিক বিশেষত্ব' });
    const doctor = await buildDoctor(testDb, { specialtyId: specialty.id });
    const hidden = await buildDoctor(testDb, { state: 'hidden' });
    const account = await buildAccount(testDb);
    await buildSubmission(testDb, doctor.id, account.accountId);

    expect(await repo.visibleDoctorRefByPublicId(tx, doctor.publicId, 'bn')).toEqual({
      id: doctor.id,
      publicId: doctor.publicId,
      name: doctor.nameBn,
      specialty: 'কাল্পনিক বিশেষত্ব',
      memberAddedNotConfirmed: true,
    });
    expect(await repo.visibleDoctorRefByPublicId(tx, hidden.publicId, 'en')).toBeNull();
    expect(await repo.visibleDoctorRefByPublicId(tx, 'bad id', 'en')).toBeNull();
  });

  it('names active terms for the preview, a mapped term by its canonical target', async () => {
    const active = await buildTerm(testDb, { kind: 'symptom', nameEn: 'Synthetic cough' });
    const hidden = await buildTerm(testDb, { state: 'hidden' });
    const canonical = await buildTerm(testDb, { nameBn: 'কাল্পনিক জ্বর' });
    const mapped = await buildTerm(testDb, { canonicalId: canonical.id });

    const terms = await repo.activeTermRefsByPublicIds(
      tx,
      [active.publicId, hidden.publicId, mapped.publicId, 'ZZZZZZZZZZ'],
      'bn',
    );

    expect(terms.get(mapped.publicId)).toEqual({
      publicId: canonical.publicId,
      name: 'কাল্পনিক জ্বর',
      provisional: false,
      kind: 'condition',
    });
    expect(terms.get(active.publicId)?.kind).toBe('symptom');
    expect(terms.has(hidden.publicId)).toBe(false);
    expect(terms.size).toBe(2);
    expect((await repo.activeTermRefsByPublicIds(tx, [], 'en')).size).toBe(0);
  });
});

describe('PgReviewModuleRepository publish (BR4)', () => {
  it('inserts a review, its tags and version 1 in one transaction and reads them back', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb, { kind: 'pseudonymous', username: null });
    const term = await buildTerm(testDb);
    const review = aNewReview(doctor.id, persona);

    await testDb.transaction(async (t) => {
      const inner = appTxOf(t);
      await repo.insertReview(inner, review);
      await repo.insertTags(inner, review.id, [
        { group: 'condition', termId: term.id },
        { group: 'condition', notSure: true },
      ]);
      await repo.insertVersion(inner, {
        reviewId: review.id,
        version: 1,
        snapshot: { kind: 'quick', title: review.title },
        changeKind: 'publish',
        actorKind: 'author',
        actorId: persona,
        now: review.now,
      });
    });

    const [stored] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    expect(stored).toMatchObject({ state: 'published', version: 1, branchId: null });
    expect(stored?.publishedAt?.getTime()).toBe(review.now.getTime());
    expect(stored?.attestationAt?.getTime()).toBe(review.now.getTime());
    expect(stored?.exactDateEnc?.toString('utf8')).toBe('2026-02-11');
    const [version] = await testDb
      .select()
      .from(reviewVersions)
      .where(eq(reviewVersions.reviewId, review.id));
    expect(version).toMatchObject({ version: 1, changeKind: 'publish', actorId: persona });

    const read = await repo.findEligibleByPublicId(tx, review.publicId, 'bn');
    expect(read?.tags).toEqual([
      {
        group: 'condition',
        notSure: false,
        termPublicId: term.publicId,
        termName: term.nameBn,
        provisional: false,
        termActive: true,
        freeText: null,
      },
      { group: 'condition', notSure: true },
    ]);
    expect(read?.doctor).toEqual({
      id: doctor.id,
      publicId: doctor.publicId,
      name: doctor.nameBn,
      specialty: null,
      memberAddedNotConfirmed: false,
    });
    expect(read?.claims).toEqual([{ label: 'secondOpinion' }]);
  });

  it('leaves no review, tag or version when the transaction rolls back', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    const review = aNewReview(doctor.id, persona);

    await expect(
      testDb.transaction(async (t) => {
        const inner = appTxOf(t);
        await repo.insertReview(inner, review);
        await repo.insertTags(inner, review.id, [{ group: 'condition', notSure: true }]);
        await repo.insertVersion(inner, {
          reviewId: review.id,
          version: 1,
          snapshot: {},
          changeKind: 'publish',
          actorKind: 'author',
          actorId: persona,
          now: review.now,
        });
        throw new Error('synthetic rollback');
      }),
    ).rejects.toThrow('synthetic rollback');

    expect(await testDb.select().from(reviews).where(eq(reviews.id, review.id))).toEqual([]);
    expect(
      await testDb.select().from(reviewTags).where(eq(reviewTags.reviewId, review.id)),
    ).toEqual([]);
    expect(
      await testDb.select().from(reviewVersions).where(eq(reviewVersions.reviewId, review.id)),
    ).toEqual([]);
  });

  it('inserts a facility visit account with every criterion key', async () => {
    const facility = await buildFacility(testDb);
    const branch = await buildBranch(testDb, facility.id);
    const persona = await buildPersona(testDb);
    const id = newId();
    const criteria: Record<Criterion, CriterionValue | null> = {
      staff: 'good',
      waiting: 'mixed',
      cleanliness: null,
      billing: null,
      reportTime: null,
      reportTrust: null,
      admission: null,
      recommend: null,
      overall: 'poor',
    };

    await repo.insertFacilityReview(tx, {
      id,
      publicId: newPublicId(),
      authorPersonaId: persona,
      branchId: branch.id,
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 1,
      body: 'The reception was calm and the queue moved quickly.',
      criteria,
      now: new Date(),
    });

    const [row] = await testDb.select().from(facilityReviews).where(eq(facilityReviews.id, id));
    expect(row).toMatchObject({ state: 'published', version: 1, identityMode: 'named' });
    expect(row?.criteria).toEqual(criteria);
  });
});

describe('PgReviewModuleRepository reads (BR5, BR6, BR7)', () => {
  it('refuses hidden, removed, deleted and merged-doctor reviews', async () => {
    const doctor = await buildDoctor(testDb);
    const target = await buildDoctor(testDb);
    const merged = await buildDoctor(testDb, { mergedIntoId: target.id });
    const persona = await buildPersona(testDb);
    const eligible = await buildReview(testDb, doctor.id, persona);
    const refused = [
      await buildReview(testDb, doctor.id, persona, { state: 'hidden' }),
      await buildReview(testDb, doctor.id, persona, { state: 'deleted_tombstone' }),
      await buildReview(testDb, doctor.id, persona, { deletedAt: new Date() }),
      await buildReview(testDb, merged.id, persona),
    ];

    expect((await repo.findEligibleByPublicId(tx, eligible.publicId, 'en'))?.id).toBe(eligible.id);
    expect(await repo.isEligible(tx, eligible.id)).toBe(true);
    for (const review of refused) {
      expect(await repo.findEligibleByPublicId(tx, review.publicId, 'en')).toBeNull();
      expect(await repo.isEligible(tx, review.id)).toBe(false);
    }
    expect(await repo.findEligibleByPublicId(tx, 'not an id', 'en')).toBeNull();
  });

  it('never returns the private exact date from a public read (FR42)', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    const review = aNewReview(doctor.id, persona);
    await repo.insertReview(tx, review);

    const read = await repo.findEligibleByPublicId(tx, review.publicId, 'en');

    expect(read).not.toBeNull();
    expect(JSON.stringify(read)).not.toContain('2026-02-11');
    expect(Object.keys(read!)).not.toContain('exactDateEnc');
  });

  it('marks a member-added doctor not yet confirmed (U46 BR2.13)', async () => {
    const account = await buildAccount(testDb);
    const doctor = await buildDoctor(testDb);
    await buildSubmission(testDb, doctor.id, account.accountId);
    const persona = await buildPersona(testDb);
    const review = await buildReview(testDb, doctor.id, persona);

    const read = await repo.findEligibleByPublicId(tx, review.publicId, 'en');

    expect(read?.doctor.memberAddedNotConfirmed).toBe(true);
    expect(read?.doctor.name).toBe(doctor.nameEn);
  });

  it('answers the seams in any state, and null or false for unknown ids (BR6)', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb, { kind: 'anonymous', displayName: 'Anonymous' });
    const hidden = await buildReview(testDb, doctor.id, persona, {
      state: 'hidden',
      identityMode: 'anonymous',
    });
    const unknown = newId();

    expect(await repo.idForPublicId(tx, hidden.publicId)).toBe(hidden.id);
    expect(await repo.idForPublicId(tx, 'ZZZZZZZZZZ')).toBeNull();
    expect(await repo.idForPublicId(tx, 'bad')).toBeNull();
    expect(await repo.authorPersonaIdOf(tx, hidden.id)).toBe(persona);
    expect(await repo.authorPersonaIdOf(tx, unknown)).toBeNull();
    expect(await repo.identityModeOf(tx, hidden.id)).toBe('anonymous');
    expect(await repo.identityModeOf(tx, unknown)).toBeNull();
    expect(await repo.identityModeOf(tx, 'not-a-uuid')).toBeNull();
    expect(await repo.isEligible(tx, unknown)).toBe(false);
  });

  it('gives the newest correction time and null without one (BR6.7)', async () => {
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    const review = await buildReview(testDb, doctor.id, persona);
    expect(await repo.lastCorrectionAt(tx, review.id)).toBeNull();

    const older = new Date('2026-04-01T00:00:00Z');
    const newer = new Date('2026-05-01T00:00:00Z');
    for (const [version, at] of [
      [2, older],
      [3, newer],
    ] as const) {
      await testDb.insert(reviewVersions).values({
        reviewId: review.id,
        version,
        snapshot: {},
        changeKind: 'correction',
        actorKind: 'author',
        actorId: persona,
        createdAt: at,
      });
    }

    expect((await repo.lastCorrectionAt(tx, review.id))?.getTime()).toBe(newer.getTime());
  });

  it('counts eligible reviews only (BR7.4)', async () => {
    const before = await repo.countEligible(tx);
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    await buildReview(testDb, doctor.id, persona);
    await buildReview(testDb, doctor.id, persona, { state: 'hidden' });

    expect(await repo.countEligible(tx)).toBe(before + 1);
  });

  it('lists the personas’ reviews in every state but deleted, newest first (BR7.3)', async () => {
    const doctor = await buildDoctor(testDb);
    const mine = await buildPersona(testDb);
    const other = await buildPersona(testDb);
    const older = await buildReview(testDb, doctor.id, mine, {
      publishedAt: new Date('2026-01-01T00:00:00Z'),
    });
    const hidden = await buildReview(testDb, doctor.id, mine, {
      state: 'hidden',
      publishedAt: new Date('2026-02-01T00:00:00Z'),
    });
    await buildReview(testDb, doctor.id, mine, { deletedAt: new Date() });
    await buildReview(testDb, doctor.id, other);
    await testDb.insert(reviewVersions).values({
      reviewId: older.id,
      version: 2,
      snapshot: {},
      changeKind: 'correction',
      actorKind: 'author',
      actorId: mine,
    });

    const rows = await repo.listByPersonas(tx, [mine], 'bn', 100);

    expect(rows.map((r) => r.publicId)).toEqual([hidden.publicId, older.publicId]);
    expect(rows[0]).toMatchObject({ state: 'hidden', edited: false, doctorName: doctor.nameBn });
    expect(rows[1]).toMatchObject({ state: 'published', edited: true });
    expect(await repo.listByPersonas(tx, [mine], 'en', 1)).toHaveLength(1);
    expect(await repo.listByPersonas(tx, [], 'en', 100)).toEqual([]);
  });

  it('finds an eligible review of the doctor by the personas only (BR7.5)', async () => {
    const doctor = await buildDoctor(testDb);
    const otherDoctor = await buildDoctor(testDb);
    const mine = await buildPersona(testDb);
    const hiddenOnly = await buildPersona(testDb);
    await buildReview(testDb, doctor.id, mine);
    await buildReview(testDb, doctor.id, hiddenOnly, { state: 'hidden' });

    expect(await repo.existsEligibleOfDoctorByPersonas(tx, doctor.id, [mine])).toBe(true);
    expect(await repo.existsEligibleOfDoctorByPersonas(tx, otherDoctor.id, [mine])).toBe(false);
    expect(await repo.existsEligibleOfDoctorByPersonas(tx, doctor.id, [hiddenOnly])).toBe(false);
    expect(await repo.existsEligibleOfDoctorByPersonas(tx, doctor.id, [])).toBe(false);
  });
});
