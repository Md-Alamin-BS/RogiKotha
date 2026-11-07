import type { CorrectedContent } from '@rogikotha/application';
import { newId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { reviews, reviewVersions } from '../schema/review';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { buildAccount, buildDoctor, buildPersona, buildReview } from './directory-test-support';
import { PgReviewModuleRepository } from './review-module';

const repo = new PgReviewModuleRepository();
const tx = appTxOf(testDb);

const STORY = 'The doctor listened and later changed the plan after the second visit.';

async function aPublishedReview() {
  const doctor = await buildDoctor(testDb);
  const persona = await buildPersona(testDb);
  const review = await buildReview(testDb, doctor.id, persona, { identityMode: 'pseudonymous' });
  await repo.insertVersion(tx, {
    reviewId: review.id,
    version: 1,
    snapshot: {
      kind: 'quick',
      title: 'A careful visit',
      body: STORY,
      outcome: 'helped',
      claims: [],
    },
    changeKind: 'publish',
    actorKind: 'author',
    actorId: persona,
    now: new Date('2026-10-01T06:00:00.000Z'),
  });
  return { doctor, persona, review };
}

function aContent(overrides: Partial<CorrectedContent> = {}): CorrectedContent {
  return {
    title: 'A careful visit, corrected',
    body: STORY,
    sections: null,
    sentiment: 'positive',
    outcome: 'worse',
    claims: [{ label: 'secondOpinion' }],
    language: 'en',
    now: new Date('2026-10-05T06:00:00.000Z'),
    ...overrides,
  };
}

async function correctionVersion(
  reviewId: string,
  persona: string,
  version: number,
  at: Date,
  on = tx,
) {
  await repo.insertVersion(on, {
    reviewId,
    version,
    snapshot: {
      kind: 'quick',
      title: 'A careful visit, corrected',
      outcome: 'worse',
      corrected: ['outcome'],
    },
    changeKind: 'correction',
    actorKind: 'author',
    actorId: persona,
    now: at,
  });
}

describe('PgReviewModuleRepository correction methods (U22)', () => {
  it('locks one review with the ENT-101 columns, the version and the ownership keys', async () => {
    const { doctor, persona, review } = await aPublishedReview();

    const locked = await testDb.transaction((t) => repo.lockForCorrection(appTxOf(t), review.id));
    expect(locked?.title).toContain('A careful visit');
    expect(locked?.body).toContain('Waited two hours');
    expect(locked).toMatchObject({
      kind: 'quick',
      sections: null,
      sentiment: 'positive',
      outcome: 'helped',
      claims: [],
      language: 'en',
      version: 1,
      authorPersonaId: persona,
      doctorId: doctor.id,
      branchId: null,
    });
    expect(await repo.lockForCorrection(tx, newId())).toBeNull();
    expect(await repo.lockForCorrection(tx, 'not-a-uuid')).toBeNull();
  });

  it('updateContent sets the content, version and updated_at and nothing else', async () => {
    const { persona, review } = await aPublishedReview();
    const [before] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    const content = aContent({
      sentiment: null,
      claims: [{ label: 'wrongDx' }],
      language: 'mixed',
    });

    const written = await repo.updateContent(tx, review.id, content, 2);

    expect(written).toBe(true);
    const [after] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    expect(after).toMatchObject({
      title: content.title,
      outcome: 'worse',
      sentiment: null,
      claims: [{ label: 'wrongDx' }],
      language: 'mixed',
      version: 2,
    });
    expect(after?.updatedAt?.getTime()).toBe(content.now.getTime());
    for (const column of [
      'id',
      'publicId',
      'kind',
      'doctorId',
      'branchId',
      'identityMode',
      'authorPersonaId',
      'relationship',
      'periodYear',
      'periodMonth',
      'exactDateEnc',
      'state',
      'publishedAt',
      'attestationAt',
      'hiddenAt',
      'deletedAt',
      'createdAt',
    ] as const) {
      expect(after?.[column], column).toEqual(before?.[column]);
    }
    expect(persona).toBe(after?.authorPersonaId);
  });

  it('updateContent writes nothing when the review is not at the version before', async () => {
    const { review } = await aPublishedReview();

    expect(await repo.updateContent(tx, review.id, aContent(), 3)).toBe(false);
    expect(await repo.updateContent(tx, review.id, aContent(), 1)).toBe(false);
    expect(await repo.updateContent(tx, newId(), aContent(), 2)).toBe(false);

    const [stored] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    expect(stored).toMatchObject({ version: 1, outcome: 'helped' });
  });

  it('writes a detailed review sections and reads them back through the edit view', async () => {
    const { review } = await aPublishedReview();
    const sections = { symptoms: 'A dry cough for three weeks.', after: 'It eased in ten days.' };

    await repo.updateContent(tx, review.id, aContent({ body: null, sections }), 2);
    const edit = await repo.findOwnForEdit(tx, review.id, 'en');

    expect(edit).toMatchObject({ body: null, sections, version: 2, publicId: review.publicId });
  });

  it('findOwnForEdit returns the current content and the doctor name in the locale', async () => {
    const { doctor, review } = await aPublishedReview();

    const en = await repo.findOwnForEdit(tx, review.id, 'en');
    const bn = await repo.findOwnForEdit(tx, review.id, 'bn');

    expect(en).toMatchObject({
      publicId: review.publicId,
      kind: 'quick',
      version: 1,
      outcome: 'helped',
      claims: [],
      doctorName: doctor.nameEn,
    });
    expect(bn?.doctorName).toBe(doctor.nameBn);
    expect(en).not.toHaveProperty('authorPersonaId');
    expect(en).not.toHaveProperty('id');
    expect(await repo.findOwnForEdit(tx, newId(), 'en')).toBeNull();
  });

  it('a correction version carries the author persona id, never an account profile id', async () => {
    const { persona, review } = await aPublishedReview();
    const account = await buildAccount(testDb);
    await correctionVersion(review.id, persona, 2, new Date('2026-10-05T06:00:00.000Z'));

    const versions = await testDb
      .select()
      .from(reviewVersions)
      .where(eq(reviewVersions.reviewId, review.id));
    const [stored] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    const correction = versions.find((v) => v.version === 2);

    expect(correction).toMatchObject({
      changeKind: 'correction',
      actorKind: 'author',
      reason: null,
    });
    expect(correction?.actorId).toBe(stored?.authorPersonaId);
    expect(correction?.actorId).not.toBe(account.accountId);
  });

  it('listVersions returns content only for a version followed by a material correction', async () => {
    const { persona, review } = await aPublishedReview();
    await correctionVersion(review.id, persona, 2, new Date('2026-10-05T06:00:00.000Z'));
    // Title-only edit: an empty `corrected` list is not material.
    await repo.insertVersion(tx, {
      reviewId: review.id,
      version: 3,
      snapshot: { kind: 'quick', title: 'Renamed', corrected: [] },
      changeKind: 'correction',
      actorKind: 'author',
      actorId: persona,
      now: new Date('2026-10-06T06:00:00.000Z'),
    });
    // A row with no `corrected` key at all (a seeded snapshot).
    await repo.insertVersion(tx, {
      reviewId: review.id,
      version: 4,
      snapshot: { kind: 'quick', title: 'Seeded' },
      changeKind: 'correction',
      actorKind: 'author',
      actorId: persona,
      now: new Date('2026-10-07T06:00:00.000Z'),
    });

    const rows = await repo.listVersions(tx, review.id);

    expect(rows.map((r) => r.version)).toEqual([1, 2, 3, 4]);
    expect(rows.map((r) => r.changeKind)).toEqual([
      'publish',
      'correction',
      'correction',
      'correction',
    ]);
    expect(rows[0]?.content).toMatchObject({ kind: 'quick', outcome: 'helped', body: STORY });
    expect(rows[1]).not.toHaveProperty('content');
    expect(rows[2]).not.toHaveProperty('content');
    expect(rows[3]).not.toHaveProperty('content');
    expect(rows[1]?.corrected).toEqual(['outcome']);
    expect(rows[2]?.corrected).toEqual([]);
    expect(rows[3]?.corrected).toBeNull();
    expect(rows[1]?.createdAt.getTime()).toBe(new Date('2026-10-05T06:00:00.000Z').getTime());
  });

  it('listVersions never returns actor_id or reason, and treats a malformed corrected as not material', async () => {
    const { persona, review } = await aPublishedReview();
    await repo.insertVersion(tx, {
      reviewId: review.id,
      version: 2,
      snapshot: { kind: 'quick', title: 'Odd', corrected: 'outcome' },
      changeKind: 'correction',
      actorKind: 'author',
      actorId: persona,
      now: new Date('2026-10-05T06:00:00.000Z'),
    });

    const rows = await repo.listVersions(tx, review.id);

    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toHaveProperty('content');
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(
        ['changeKind', 'corrected', 'createdAt', 'version'].sort(),
      );
      expect(JSON.stringify(row)).not.toContain(persona);
    }
    expect(await repo.listVersions(tx, newId())).toEqual([]);
    expect(await repo.listVersions(tx, 'not-a-uuid')).toEqual([]);
  });

  it('keeps the reviews of other ids out of the version list', async () => {
    const first = await aPublishedReview();
    const second = await aPublishedReview();

    const rows = await repo.listVersions(tx, first.review.id);

    expect(rows).toHaveLength(1);
    expect((await repo.listVersions(tx, second.review.id)).map((r) => r.version)).toEqual([1]);
  });

  it('a transaction that fails after updateContent leaves no version row and no change', async () => {
    const { persona, review } = await aPublishedReview();

    await expect(
      testDb.transaction(async (t) => {
        const inner = appTxOf(t);
        expect(await repo.updateContent(inner, review.id, aContent(), 2)).toBe(true);
        await correctionVersion(review.id, persona, 2, new Date('2026-10-05T06:00:00.000Z'), inner);
        throw new Error('synthetic rollback');
      }),
    ).rejects.toThrow('synthetic rollback');

    const [stored] = await testDb.select().from(reviews).where(eq(reviews.id, review.id));
    expect(stored).toMatchObject({ version: 1, outcome: 'helped' });
    const versions = await repo.listVersions(tx, review.id);
    expect(versions.map((v) => v.version)).toEqual([1]);
  });

  it("a second transaction's lockForCorrection waits for the first and then reads the new version", async () => {
    const { persona, review } = await aPublishedReview();
    let releaseFirst!: () => void;
    const firstMayCommit = new Promise<void>((resolve) => (releaseFirst = resolve));
    let firstHoldsLock!: () => void;
    const holding = new Promise<void>((resolve) => (firstHoldsLock = resolve));
    let secondSettled = false;

    const first = testDb.transaction(async (t) => {
      const inner = appTxOf(t);
      const row = await repo.lockForCorrection(inner, review.id);
      expect(row?.version).toBe(1);
      firstHoldsLock();
      await firstMayCommit;
      await repo.updateContent(inner, review.id, aContent(), 2);
      await correctionVersion(review.id, persona, 2, new Date('2026-10-05T06:00:00.000Z'), inner);
    });
    await holding;

    const second = testDb.transaction(async (t) => {
      const row = await repo.lockForCorrection(appTxOf(t), review.id);
      secondSettled = true;
      return row;
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(secondSettled).toBe(false);

    releaseFirst();
    await first;
    const seen = await second;

    expect(secondSettled).toBe(true);
    expect(seen).toMatchObject({ version: 2, outcome: 'worse' });
  });
});
