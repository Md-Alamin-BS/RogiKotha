import { newId, newPublicId, type DemoCreateReviewInput } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctors } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personaLinks, personas } from '../schema/identity';
import { reviews, reviewVersions } from '../schema/review';
import { testDb } from '../test-setup';
import {
  createPseudonymousPersona,
  createQuickReview,
  getOwnReviewForEdit,
  getReviewByPublicId,
  updateOwnReview,
} from './reviews';

async function buildAccount() {
  const authUserId = newId();
  const username = `writer_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: `Writer ${username}`,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  const accountId = profile!.id;
  const [persona] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName: `Writer ${username}`, username })
    .returning({ id: personas.id });
  await testDb.insert(personaLinks).values({ personaId: persona!.id, accountId });
  return { accountId, personaId: persona!.id, username };
}

async function buildDoctor() {
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Rahman',
      nameBn: 'ডা. সিনথেটিক রহমান',
      nameKey: `dr synthetic ${newId()}`,
      state: 'published',
    })
    .returning({ id: doctors.id, publicId: doctors.publicId });
  return doctor!;
}

function aQuickReview(
  author: { accountId: string; personaId: string },
  doctorId: string,
  overrides: Partial<DemoCreateReviewInput> = {},
): DemoCreateReviewInput {
  return {
    authorPersonaId: author.personaId,
    authorAccountId: author.accountId,
    doctorId,
    relationship: 'self',
    periodYear: 2026,
    periodMonth: 3,
    title: 'Clear explanation of my test results',
    body: 'The doctor took time to explain each result and what to watch for.',
    sentiment: 'positive',
    outcome: null,
    identityMode: 'named',
    language: 'en',
    ...overrides,
  };
}

async function publishOne() {
  const author = await buildAccount();
  const doctor = await buildDoctor();
  const created = await createQuickReview(testDb, aQuickReview(author, doctor.id));
  return { author, doctor, ...created };
}

describe('demo quick review publishing', () => {
  it('publishes at once, with the attestation time and a publish version by the author', async () => {
    const { author, reviewId, publicId } = await publishOne();

    const [row] = await testDb.select().from(reviews).where(eq(reviews.id, reviewId));
    expect(row).toMatchObject({ publicId, kind: 'quick', state: 'published', version: 1 });
    expect(row?.publishedAt).toBeInstanceOf(Date);
    expect(row?.attestationAt).toEqual(row?.publishedAt);

    const versions = await testDb
      .select()
      .from(reviewVersions)
      .where(eq(reviewVersions.reviewId, reviewId));
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      version: 1,
      changeKind: 'publish',
      actorKind: 'author',
      actorId: author.accountId,
    });
  });

  it('refuses a persona that belongs to another account and writes nothing', async () => {
    const author = await buildAccount();
    const stranger = await buildAccount();
    const doctor = await buildDoctor();

    await expect(
      createQuickReview(
        testDb,
        aQuickReview({ accountId: author.accountId, personaId: stranger.personaId }, doctor.id),
      ),
    ).rejects.toThrow(/not linked/);
    const written = await testDb.select().from(reviews).where(eq(reviews.doctorId, doctor.id));
    expect(written).toHaveLength(0);
  });

  it('creates a pseudonymous persona named after the username and links it to the account', async () => {
    const { accountId, username } = await buildAccount();
    const personaId = await createPseudonymousPersona(testDb, { accountId, username });

    const [persona] = await testDb.select().from(personas).where(eq(personas.id, personaId));
    expect(persona).toMatchObject({ kind: 'pseudonymous', displayName: username, username });
    const [link] = await testDb
      .select()
      .from(personaLinks)
      .where(eq(personaLinks.personaId, personaId));
    expect(link?.accountId).toBe(accountId);
  });
});

describe('demo experience projection', () => {
  it('shows the doctor in the reader language, the persona name and no edit yet', async () => {
    const { author, doctor, publicId } = await publishOne();

    const detail = await getReviewByPublicId(testDb, publicId, 'bn');

    expect(detail).toMatchObject({
      publicId,
      doctor: { id: doctor.id, publicId: doctor.publicId, name: 'ডা. সিনথেটিক রহমান' },
      authorDisplayName: `Writer ${author.username}`,
      identityMode: 'named',
      edited: false,
      version: 1,
      readyEvidenceCount: 0,
    });
    expect(detail?.doctor.specialty).toBeNull();
    expect(detail).not.toHaveProperty('authorAccountId');
  });

  it('counts only the files that are ready', async () => {
    const { author, reviewId, publicId } = await publishOne();
    for (const state of ['preview_ready', 'preview_ready', 'quarantined'] as const) {
      await testDb.insert(evidenceItems).values({
        publicId: newPublicId(),
        reviewId,
        group: 'reviewed',
        state,
        declaredMime: 'image/png',
        originalBytes: 100,
        originalSha256: 'synthetic',
        originalFilenameEnc: Buffer.from('sealed'),
        uploadedByAccountId: author.accountId,
      });
    }

    const detail = await getReviewByPublicId(testDb, publicId, 'en');
    expect(detail?.readyEvidenceCount).toBe(2);
  });

  it('is null for an unknown, hidden or deleted experience', async () => {
    const hidden = await publishOne();
    const deleted = await publishOne();
    await testDb.update(reviews).set({ state: 'hidden' }).where(eq(reviews.id, hidden.reviewId));
    await testDb
      .update(reviews)
      .set({ deletedAt: new Date() })
      .where(eq(reviews.id, deleted.reviewId));

    await expect(getReviewByPublicId(testDb, newPublicId(), 'en')).resolves.toBeNull();
    await expect(getReviewByPublicId(testDb, hidden.publicId, 'en')).resolves.toBeNull();
    await expect(getReviewByPublicId(testDb, deleted.publicId, 'en')).resolves.toBeNull();
  });
});

describe('demo experience editing', () => {
  const correction = {
    title: 'Clear explanation, slow follow-up',
    body: 'The explanation was clear, but the follow-up call came two weeks late.',
    sentiment: 'mixed',
    outcome: 'helped',
  } as const;

  it('loads the experience for its author, and for no one else', async () => {
    const { author, doctor, publicId } = await publishOne();
    const stranger = await buildAccount();

    await expect(getOwnReviewForEdit(testDb, publicId, author.accountId)).resolves.toMatchObject({
      publicId,
      doctorId: doctor.id,
      title: 'Clear explanation of my test results',
      sentiment: 'positive',
      outcome: null,
      version: 1,
    });
    await expect(getOwnReviewForEdit(testDb, publicId, stranger.accountId)).resolves.toBeNull();
  });

  it('writes a correction version, bumps the version and marks the page edited', async () => {
    const { author, reviewId, publicId } = await publishOne();

    const outcome = await updateOwnReview(testDb, publicId, author.accountId, correction);

    expect(outcome).toEqual({ ok: true, data: { version: 2 } });
    const corrections = await testDb
      .select()
      .from(reviewVersions)
      .where(eq(reviewVersions.reviewId, reviewId));
    expect(corrections.map((v) => v.changeKind).sort()).toEqual(['correction', 'publish']);
    expect(corrections.find((v) => v.changeKind === 'correction')).toMatchObject({
      version: 2,
      actorKind: 'author',
      actorId: author.accountId,
      snapshot: correction,
    });
    const detail = await getReviewByPublicId(testDb, publicId, 'en');
    expect(detail).toMatchObject({ ...correction, edited: true, version: 2 });
    expect(detail?.updatedAt).toBeInstanceOf(Date);
  });

  it("answers not_found for someone else's experience and changes nothing", async () => {
    const { reviewId, publicId } = await publishOne();
    const stranger = await buildAccount();

    const outcome = await updateOwnReview(testDb, publicId, stranger.accountId, correction);

    expect(outcome).toEqual({ ok: false, reason: 'not_found' });
    const [row] = await testDb.select().from(reviews).where(eq(reviews.id, reviewId));
    expect(row).toMatchObject({ title: 'Clear explanation of my test results', version: 1 });
    const versions = await testDb
      .select()
      .from(reviewVersions)
      .where(eq(reviewVersions.reviewId, reviewId));
    expect(versions).toHaveLength(1);
  });
});
