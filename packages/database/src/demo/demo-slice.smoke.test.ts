// Cumulative smoke suite: the demo slice's main path through its data functions (FR1, FR3, FR4,
// FR6), against the freshly migrated test database. Rows from other files may exist, so every
// check looks up the records this test made.
import { doctorNameKey, newId, newPublicId } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { authUsers } from '../schema/auth';
import { doctors as doctorTable } from '../schema/directory';
import { reviews } from '../schema/review';
import { PgDirectoryModuleRepository } from '../repositories/directory-module';
import { PgReviewReadRepository } from '../repositories/review-reads';
import { PgTaxonomyModuleRepository } from '../repositories/taxonomy-module';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { createProfileForAuthUser } from './accounts';
import { addComment, listComments } from './comments';
import { getReviewByPublicId } from './reviews';
import { getCurrentAccountByAuthUserId } from './session';

// U46 retired the demo directory reads (BR7.1); the same checks now run on the module repositories.
const directoryRepo = new PgDirectoryModuleRepository();
const reviewReads = new PgReviewReadRepository();
const taxonomyRepo = new PgTaxonomyModuleRepository();
const tx = appTxOf(testDb);

async function listedDoctor(doctorId: string, locale: 'en' | 'bn') {
  const { rows } = await directoryRepo.listDoctors(tx, { page: 1, pageSize: 10_000, locale });
  const row = rows.find((r) => r.id === doctorId);
  return (
    row && {
      name: locale === 'bn' ? row.nameBn : row.nameEn,
      memberAdded: row.memberAddedNotConfirmed,
      publishedReviewCount: (await reviewReads.publishedForDoctor(tx, doctorId)).length,
    }
  );
}

// The review module's publish moved to `apps/web/src/server/review-module.int.smoke.test.ts` (U47,
// the demo writers were deleted); the rows these checks read are inserted directly.
async function insertPublishedReview(authorPersonaId: string, doctorId: string, title: string) {
  const now = new Date();
  const [row] = await testDb
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId,
      doctorId,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'named',
      sentiment: 'positive',
      periodYear: 2026,
      periodMonth: 2,
      title,
      body: 'The doctor explained every test result slowly and clearly.',
      language: 'en',
      state: 'published',
      publishedAt: now,
      attestationAt: now,
      version: 1,
    })
    .returning({ reviewId: reviews.id, publicId: reviews.publicId });
  return row!;
}

describe('demo slice smoke', () => {
  it('a registered reader publishes about a doctor, who then lists it, and a comment shows on it', async () => {
    const authUserId = newId();
    const username = `smoke_${authUserId.slice(-8)}`;
    await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
    await createProfileForAuthUser(testDb, {
      authUserId,
      username,
      displayName: 'Smoke Reader',
      locale: 'bn',
      termsVersion: '1',
    });
    const account = await getCurrentAccountByAuthUserId(testDb, authUserId);
    expect(account).toMatchObject({ username, locale: 'bn', status: 'active' });

    const [doctor] = await testDb
      .insert(doctorTable)
      .values({
        publicId: newPublicId(),
        nameEn: 'Dr. Smoke Synthetic',
        nameBn: 'ডা. স্মোক কাল্পনিক',
        nameKey: `dr smoke ${authUserId}`,
        state: 'published',
      })
      .returning({ id: doctorTable.id });

    const { reviewId, publicId } = await insertPublishedReview(
      account!.currentPersonaId,
      doctor!.id,
      'A patient explanation',
    );

    const listed = await listedDoctor(doctor!.id, 'bn');
    expect(listed).toMatchObject({ name: 'ডা. স্মোক কাল্পনিক', publishedReviewCount: 1 });
    await expect(getReviewByPublicId(testDb, publicId, 'en')).resolves.toMatchObject({
      title: 'A patient explanation',
      authorDisplayName: 'Smoke Reader',
      readyEvidenceCount: 0,
    });

    const posted = await addComment(testDb, {
      reviewId,
      parentPublicId: null,
      authorPersonaId: account!.currentPersonaId,
      body: 'Thank you for writing this.',
    });
    expect(posted.ok).toBe(true);
    const threads = await listComments(testDb, reviewId, account!.accountId);
    expect(threads).toEqual([
      expect.objectContaining({ body: 'Thank you for writing this.', canDelete: true }),
    ]);
  });

  it('a reader adds an unlisted doctor, who then lists as member-added, and the directory pages answer', async () => {
    const authUserId = newId();
    const username = `smoke2_${authUserId.slice(-8)}`;
    await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
    await createProfileForAuthUser(testDb, {
      authUserId,
      username,
      displayName: 'Smoke Adder',
      locale: 'en',
      termsVersion: '1',
    });
    const account = await getCurrentAccountByAuthUserId(testDb, authUserId);
    const name = `Dr. Smoke Newcomer ${authUserId.slice(-6)}`;

    const doctorId = newId();
    await directoryRepo.insertMemberDoctor(tx, {
      id: doctorId,
      publicId: newPublicId(),
      name,
      nameKey: doctorNameKey(name),
      specialtyId: null,
      practiceArea: null,
      bmdcNumber: null,
      submittedByAccountId: account!.accountId,
      now: new Date(),
    });
    await insertPublishedReview(
      account!.currentPersonaId,
      doctorId,
      'Seen by a doctor not yet listed',
    );

    const listed = await listedDoctor(doctorId, 'en');
    expect(listed).toMatchObject({ name, memberAdded: true, publishedReviewCount: 1 });
    const branches = await directoryRepo.listBranches(tx, { page: 1, pageSize: 100, locale: 'en' });
    expect(Array.isArray(branches.rows)).toBe(true);
    await expect(
      taxonomyRepo.listTerms(tx, 'condition', { canonicalOnly: true, locale: 'bn' }),
    ).resolves.toEqual(expect.any(Array));
  });
});
