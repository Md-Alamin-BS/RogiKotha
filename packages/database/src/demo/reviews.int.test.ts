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
import { getOwnReviewForEdit, getReviewByPublicId, updateOwnReview } from './reviews';
import { getDoctor } from './doctors';

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

// A published quick review, inserted as the review module's publish does (the demo writer is gone,
// U47): the publish rows are asserted on the module path, in `review-module.int.test.ts`.
async function publishOne() {
  const author = await buildAccount();
  const doctor = await buildDoctor();
  const input = aQuickReview(author, doctor.id);
  const now = new Date();
  const [row] = await testDb
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId: input.authorPersonaId,
      doctorId: input.doctorId,
      kind: 'quick',
      relationship: input.relationship,
      identityMode: input.identityMode,
      sentiment: input.sentiment,
      outcome: input.outcome,
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      title: input.title,
      body: input.body,
      language: input.language,
      state: 'published',
      publishedAt: now,
      attestationAt: now,
      version: 1,
    })
    .returning({ reviewId: reviews.id, publicId: reviews.publicId });
  await testDb.insert(reviewVersions).values({
    reviewId: row!.reviewId,
    version: 1,
    snapshot: {
      title: input.title,
      body: input.body,
      sentiment: input.sentiment,
      outcome: input.outcome,
    },
    changeKind: 'publish',
    actorKind: 'author',
    actorId: author.accountId,
  });
  return { author, doctor, ...row! };
}

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

// The FD-100 publish-with-a-new-doctor rows moved to the module path (U47): the name match and the
// specialty rule in directory.test.ts, the persistence in directory-module.int.test.ts and the
// publish in review-module.int.test.ts.
describe('demo doctor detail', () => {
  it('does not mark a seeded or staff-made doctor as member-added', async () => {
    const doctor = await buildDoctor();
    const detail = await getDoctor(testDb, doctor.id, 'en');
    expect(detail?.memberAdded).toBe(false);
  });
});
