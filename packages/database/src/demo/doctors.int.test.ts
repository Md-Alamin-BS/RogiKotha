import { newId, newPublicId, type PublicationState } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { comments } from '../schema/community';
import { doctorChambers, doctors } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personas } from '../schema/identity';
import { reviews, reviewVersions, type ReviewSections } from '../schema/review';
import { taxonomyTerms } from '../schema/taxonomy';
import { testDb } from '../test-setup';
import {
  EXCERPT_LENGTH,
  getDoctor,
  listDoctorOptions,
  listDoctors,
  listPublishedReviewsForDoctor,
  listRecentPublishedReviews,
} from './doctors';

// Other test files share this database, so every assertion is scoped to rows built here.
const run = newId().slice(-8);

async function buildSpecialty(): Promise<string> {
  const [term] = await testDb
    .insert(taxonomyTerms)
    .values({
      publicId: newPublicId(),
      kind: 'specialty',
      nameEn: 'Cardiology',
      nameBn: 'হৃদরোগ',
      nameKeyEn: `cardiology-${newId()}`,
      nameKeyBn: `cardiology-bn-${newId()}`,
      state: 'published',
    })
    .returning({ id: taxonomyTerms.id });
  return term!.id;
}

interface DoctorOverrides {
  nameEn?: string;
  nameBn?: string;
  state?: PublicationState;
  mergedIntoId?: string | null;
  specialtyId?: string | null;
  cityEn?: string | null;
  cityBn?: string | null;
  areaEn?: string | null;
}

async function buildDoctor(overrides: DoctorOverrides = {}) {
  const nameEn = overrides.nameEn ?? `Dr Test ${run} ${newId().slice(-6)}`;
  const [row] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn,
      nameBn: overrides.nameBn ?? `ডা. পরীক্ষা ${run}`,
      specialtyId: overrides.specialtyId ?? null,
      qualificationsEn: 'MBBS, FCPS',
      qualificationsBn: 'এমবিবিএস, এফসিপিএস',
      cityEn: overrides.cityEn === undefined ? 'Dhaka' : overrides.cityEn,
      cityBn: overrides.cityBn === undefined ? 'ঢাকা' : overrides.cityBn,
      areaEn: overrides.areaEn === undefined ? 'Dhanmondi' : overrides.areaEn,
      areaBn: 'ধানমন্ডি',
      aboutEn: 'Sees adults.',
      aboutBn: null,
      languagesEn: 'Bangla, English',
      languagesBn: 'বাংলা, ইংরেজি',
      feeDisplayEn: '',
      feeDisplayBn: '৳ ১০০০',
      avatarHue: 210,
      state: overrides.state ?? 'published',
      mergedIntoId: overrides.mergedIntoId ?? null,
      nameKey: nameEn.toLowerCase(),
    })
    .returning({ id: doctors.id, publicId: doctors.publicId });
  return row!;
}

async function buildPersona(displayName = `Reader ${run}`): Promise<string> {
  const [row] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName })
    .returning({ id: personas.id });
  return row!.id;
}

interface ReviewOverrides {
  state?: PublicationState;
  publishedAt?: Date | null;
  deletedAt?: Date | null;
  body?: string | null;
  sections?: ReviewSections | null;
  title?: string;
}

async function buildReview(doctorId: string, personaId: string, overrides: ReviewOverrides = {}) {
  const [row] = await testDb
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId: personaId,
      doctorId,
      kind: overrides.sections ? 'detailed' : 'quick',
      relationship: 'self',
      identityMode: 'named',
      sentiment: 'mixed',
      outcome: null,
      periodYear: 2026,
      periodMonth: 3,
      title: overrides.title ?? `Visit ${newId().slice(-6)}`,
      body: overrides.body === undefined ? 'Waited long, then a careful exam.' : overrides.body,
      sections: overrides.sections ?? null,
      language: 'en',
      state: overrides.state ?? 'published',
      publishedAt: overrides.publishedAt === undefined ? new Date() : overrides.publishedAt,
      deletedAt: overrides.deletedAt ?? null,
    })
    .returning({ id: reviews.id, publicId: reviews.publicId });
  return row!;
}

async function buildAccount(): Promise<string> {
  const authUserId = newId();
  const username = `doc_${authUserId.slice(-10)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [row] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: username,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  return row!.id;
}

async function buildEvidence(
  reviewId: string,
  accountId: string,
  state: 'preview_ready' | 'quarantined',
) {
  await testDb.insert(evidenceItems).values({
    publicId: newPublicId(),
    reviewId,
    group: 'reviewed',
    state,
    declaredMime: 'image/png',
    originalBytes: 1024,
    originalSha256: 'a'.repeat(64),
    originalFilenameEnc: Buffer.from('sealed'),
    uploadedByAccountId: accountId,
  });
}

async function buildComment(reviewId: string, personaId: string, deleted = false) {
  await testDb.insert(comments).values({
    publicId: newPublicId(),
    reviewId,
    authorPersonaId: personaId,
    body: 'Same here.',
    state: 'published',
    deletedAt: deleted ? new Date() : null,
  });
}

const ids = <T extends { id: string }>(rows: T[], wanted: string[]) =>
  rows.filter((r) => wanted.includes(r.id)).map((r) => r.id);

describe('demo doctor directory', () => {
  it('lists doctors by published experiences, then by name, never by sentiment', async () => {
    const persona = await buildPersona();
    const busy = await buildDoctor({ nameEn: `Zz ${run} Charlie` });
    const quietA = await buildDoctor({ nameEn: `Zz ${run} Alpha` });
    const quietB = await buildDoctor({ nameEn: `Zz ${run} Bravo` });
    await buildReview(busy.id, persona);
    await buildReview(busy.id, persona);
    await buildReview(quietB.id, persona, { state: 'hidden' });
    await buildReview(quietB.id, persona, { deletedAt: new Date() });

    const rows = await listDoctors(testDb, 'en');

    expect(ids(rows, [busy.id, quietA.id, quietB.id])).toEqual([busy.id, quietA.id, quietB.id]);
    expect(rows.find((r) => r.id === busy.id)?.publishedReviewCount).toBe(2);
    expect(rows.find((r) => r.id === quietB.id)?.publishedReviewCount).toBe(0);
  });

  it('leaves draft and merged doctors out of the list', async () => {
    const live = await buildDoctor();
    const draft = await buildDoctor({ state: 'draft' });
    const merged = await buildDoctor({ mergedIntoId: live.id });

    const rows = await listDoctors(testDb, 'en');

    expect(ids(rows, [live.id, draft.id, merged.id])).toEqual([live.id]);
  });

  it('gives every text in the requested language and null for a missing value', async () => {
    const specialtyId = await buildSpecialty();
    const doctor = await buildDoctor({ specialtyId, cityBn: null, areaEn: '  ' });

    const bn = (await listDoctors(testDb, 'bn')).find((r) => r.id === doctor.id);
    const en = (await listDoctors(testDb, 'en')).find((r) => r.id === doctor.id);

    expect(bn).toMatchObject({ name: `ডা. পরীক্ষা ${run}`, specialty: 'হৃদরোগ', city: null });
    expect(en).toMatchObject({ specialty: 'Cardiology', city: 'Dhaka', area: null });
  });

  it('finds one doctor by uuid or public id, with chambers in their order', async () => {
    const doctor = await buildDoctor();
    await testDb.insert(doctorChambers).values([
      {
        doctorId: doctor.id,
        nameEn: 'Second',
        nameBn: 'দ্বিতীয়',
        provenance: 'community',
        sortOrder: 1,
      },
      {
        doctorId: doctor.id,
        nameEn: 'First',
        nameBn: 'প্রথম',
        hoursEn: 'Sat 5-9 pm',
        provenance: 'community',
        sortOrder: 0,
      },
    ]);

    const byId = await getDoctor(testDb, doctor.id, 'en');
    const byPublicId = await getDoctor(testDb, doctor.publicId, 'bn');

    expect(byId?.chambers).toEqual([
      { name: 'First', hours: 'Sat 5-9 pm' },
      { name: 'Second', hours: null },
    ]);
    expect(byId).toMatchObject({
      about: 'Sees adults.',
      feeDisplay: null,
      languages: 'Bangla, English',
    });
    expect(byPublicId).toMatchObject({ id: doctor.id, about: null, feeDisplay: '৳ ১০০০' });
  });

  it('returns null for an unknown, malformed or unpublished doctor', async () => {
    const draft = await buildDoctor({ state: 'draft' });

    await expect(getDoctor(testDb, newId(), 'en')).resolves.toBeNull();
    await expect(getDoctor(testDb, "x' or 1=1 --", 'en')).resolves.toBeNull();
    await expect(getDoctor(testDb, draft.publicId, 'en')).resolves.toBeNull();
  });

  it('lists a doctor’s published experiences newest first, leaving hidden and deleted ones out', async () => {
    const doctor = await buildDoctor();
    const persona = await buildPersona('Rina');
    const older = await buildReview(doctor.id, persona, { publishedAt: new Date('2026-01-02') });
    const newer = await buildReview(doctor.id, persona, { publishedAt: new Date('2026-05-02') });
    await buildReview(doctor.id, persona, { state: 'hidden' });
    await buildReview(doctor.id, persona, { deletedAt: new Date() });

    const cards = await listPublishedReviewsForDoctor(testDb, doctor.id, 'en');

    expect(cards.map((c) => c.publicId)).toEqual([newer.publicId, older.publicId]);
    expect(cards[0]).toMatchObject({
      authorDisplayName: 'Rina',
      doctor: { id: doctor.id, publicId: doctor.publicId },
      edited: false,
      commentCount: 0,
      readyEvidenceCount: 0,
    });
  });

  it('counts live comments, ready files and a correction on each card', async () => {
    const doctor = await buildDoctor();
    const persona = await buildPersona();
    const account = await buildAccount();
    const review = await buildReview(doctor.id, persona);
    await buildComment(review.id, persona);
    await buildComment(review.id, persona, true);
    await buildEvidence(review.id, account, 'preview_ready');
    await buildEvidence(review.id, account, 'quarantined');
    await testDb.insert(reviewVersions).values({
      reviewId: review.id,
      version: 2,
      snapshot: {},
      changeKind: 'correction',
      actorKind: 'author',
      actorId: account,
    });

    const [card] = await listPublishedReviewsForDoctor(testDb, doctor.id, 'en');

    expect(card).toMatchObject({ commentCount: 1, readyEvidenceCount: 1, edited: true });
  });

  it('cuts a long body into an excerpt and falls back to a detailed review’s first section', async () => {
    const doctor = await buildDoctor();
    const persona = await buildPersona();
    await buildReview(doctor.id, persona, {
      body: 'word '.repeat(80),
      publishedAt: new Date('2026-02-01'),
    });
    await buildReview(doctor.id, persona, {
      body: null,
      sections: { diagnosis: 'Thyroid, found on the second visit.' },
      publishedAt: new Date('2026-01-01'),
    });

    const [long, detailed] = await listPublishedReviewsForDoctor(testDb, doctor.id, 'en');

    expect(long?.excerpt.endsWith('…')).toBe(true);
    expect(long?.excerpt.length).toBeLessThanOrEqual(EXCERPT_LENGTH + 1);
    expect(detailed?.excerpt).toBe('Thyroid, found on the second visit.');
  });

  it('returns no experiences for a malformed doctor id', async () => {
    await expect(listPublishedReviewsForDoctor(testDb, 'not-a-uuid', 'en')).resolves.toEqual([]);
  });

  it('returns the most recent published experiences up to the limit', async () => {
    const doctor = await buildDoctor();
    const persona = await buildPersona();
    // Far-future dates keep these ahead of rows other test files publish.
    const first = await buildReview(doctor.id, persona, { publishedAt: new Date('2099-03-01') });
    const second = await buildReview(doctor.id, persona, { publishedAt: new Date('2099-02-01') });
    await buildReview(doctor.id, persona, { publishedAt: new Date('2099-01-01') });

    const cards = await listRecentPublishedReviews(testDb, 2, 'en');

    expect(cards.map((c) => c.publicId)).toEqual([first.publicId, second.publicId]);
    await expect(listRecentPublishedReviews(testDb, 0, 'en')).resolves.toEqual([]);
  });

  it('offers every published doctor as a write-form choice, ordered by name', async () => {
    const later = await buildDoctor({ nameEn: `Zz ${run} Option B` });
    const earlier = await buildDoctor({ nameEn: `Zz ${run} Option A` });
    const draft = await buildDoctor({ state: 'draft' });

    const options = await listDoctorOptions(testDb, 'en');

    expect(ids(options, [later.id, earlier.id, draft.id])).toEqual([earlier.id, later.id]);
  });
});
