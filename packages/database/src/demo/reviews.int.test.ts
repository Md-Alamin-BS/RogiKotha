import { newId, newPublicId, type DemoCreateReviewInput } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctorChambers, doctors, profileSubmissions } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personaLinks, personas } from '../schema/identity';
import { reviews, reviewVersions } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { testDb } from '../test-setup';
import {
  createPseudonymousPersona,
  createQuickReview,
  createQuickReviewWithNewDoctor,
  getOwnReviewForEdit,
  getReviewByPublicId,
  updateOwnReview,
} from './reviews';
import { PgDirectoryModuleRepository } from '../repositories/directory-module';
import { appTxOf } from '../unit-of-work';
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

describe('createQuickReviewWithNewDoctor (FD-100)', () => {
  function aReviewWithout(author: { accountId: string; personaId: string }) {
    const review: Partial<DemoCreateReviewInput> = aQuickReview(author, newId());
    delete review.doctorId;
    return review as Omit<DemoCreateReviewInput, 'doctorId'>;
  }

  it('creates the doctor published at once, marked as member-added, with the experience on it', async () => {
    const author = await buildAccount();
    const name = `Dr. Member Added ${newId().slice(-6)}`;

    const created = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name, specialtyId: null, chamber: 'Synthetic Clinic, Mirpur', bmdc: 'A-123' },
      review: aReviewWithout(author),
    });

    expect(created.createdDoctor).toBe(true);
    const detail = await getDoctor(testDb, created.doctorId, 'bn');
    expect(detail).toMatchObject({ name, memberAdded: true, publishedReviewCount: 1 });
    expect(detail?.chambers).toEqual([{ name: 'Synthetic Clinic, Mirpur', hours: null }]);
    const [row] = await testDb.select().from(doctors).where(eq(doctors.id, created.doctorId));
    expect(row?.bmdcNumber).toBeNull();
    expect(row?.fieldProvenance).toMatchObject({ name_en: { source: 'community' } });
    const [submission] = await testDb
      .select()
      .from(profileSubmissions)
      .where(eq(profileSubmissions.createdDoctorId, created.doctorId));
    expect(submission).toMatchObject({
      kind: 'doctor',
      status: 'pending',
      submittedByAccountId: author.accountId,
    });
    expect(submission?.payload).toMatchObject({ bmdc: 'A-123', nameEn: name });
    const [review] = await testDb
      .select()
      .from(reviews)
      .where(eq(reviews.publicId, created.publicId));
    expect(review?.doctorId).toBe(created.doctorId);
  });

  it('reuses a published doctor whose name matches without the "Dr." title, spaces or case', async () => {
    const author = await buildAccount();
    const suffix = newId().slice(-6);
    const first = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name: `Dr. Same Person ${suffix}`, specialtyId: null, chamber: null, bmdc: null },
      review: aReviewWithout(author),
    });

    const second = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name: `  same   PERSON ${suffix} `, specialtyId: null, chamber: null, bmdc: null },
      review: aReviewWithout(author),
    });

    expect(second).toMatchObject({ doctorId: first.doctorId, createdDoctor: false });
    const submissions = await testDb
      .select()
      .from(profileSubmissions)
      .where(eq(profileSubmissions.createdDoctorId, first.doctorId));
    expect(submissions).toHaveLength(1);
  });

  it('creates a separate doctor when the same name comes with a different specialty', async () => {
    const author = await buildAccount();
    const suffix = newId().slice(-6);
    const [cardiology, neurology] = await testDb
      .insert(taxonomyTerms)
      .values(
        ['Cardiology', 'Neurology'].map((name) => ({
          publicId: newPublicId(),
          kind: 'specialty' as const,
          nameEn: `${name} ${suffix}`,
          nameBn: `${name} ${suffix}`,
          nameKeyEn: `${name.toLowerCase()}${suffix}`,
          nameKeyBn: `${name.toLowerCase()}${suffix}`,
          state: 'published' as const,
        })),
      )
      .returning({ id: taxonomyTerms.id });
    const first = await createQuickReviewWithNewDoctor(testDb, {
      doctor: {
        name: `Dr. Common Name ${suffix}`,
        specialtyId: cardiology!.id,
        chamber: null,
        bmdc: null,
      },
      review: aReviewWithout(author),
    });

    const other = await createQuickReviewWithNewDoctor(testDb, {
      doctor: {
        name: `Prof. Dr. Common Name ${suffix}`,
        specialtyId: neurology!.id,
        chamber: null,
        bmdc: null,
      },
      review: aReviewWithout(author),
    });
    const same = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name: `common name ${suffix}`, specialtyId: null, chamber: null, bmdc: null },
      review: aReviewWithout(author),
    });

    expect(other.createdDoctor).toBe(true);
    expect(other.doctorId).not.toBe(first.doctorId);
    expect(same).toMatchObject({ doctorId: first.doctorId, createdDoctor: false });
  });

  it('keeps "Dristy" apart from "Isty": only a real title is ignored', async () => {
    const author = await buildAccount();
    const suffix = newId().slice(-6);
    const isty = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name: `Isty Akter ${suffix}`, specialtyId: null, chamber: null, bmdc: null },
      review: aReviewWithout(author),
    });
    const dristy = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name: `Dristy Akter ${suffix}`, specialtyId: null, chamber: null, bmdc: null },
      review: aReviewWithout(author),
    });
    expect(dristy.doctorId).not.toBe(isty.doctorId);
  });

  it("writes nothing when the persona is not the author's own", async () => {
    const author = await buildAccount();
    const other = await buildAccount();
    const name = `Dr. Never Created ${newId().slice(-6)}`;

    await expect(
      createQuickReviewWithNewDoctor(testDb, {
        doctor: { name, specialtyId: null, chamber: 'Nowhere', bmdc: null },
        review: { ...aReviewWithout(author), authorPersonaId: other.personaId },
      }),
    ).rejects.toThrow();

    // U46 (R-01): the directory list the pages read now.
    const listed = await new PgDirectoryModuleRepository().listDoctors(appTxOf(testDb), {
      page: 1,
      pageSize: 100,
      locale: 'en',
    });
    expect(listed.rows.some((d) => d.nameEn === name)).toBe(false);
    const chambers = await testDb
      .select()
      .from(doctorChambers)
      .where(eq(doctorChambers.nameEn, 'Nowhere'));
    expect(chambers).toHaveLength(0);
  });

  it('does not mark a seeded or staff-made doctor as member-added', async () => {
    const doctor = await buildDoctor();
    const detail = await getDoctor(testDb, doctor.id, 'en');
    expect(detail?.memberAdded).toBe(false);
  });
});
