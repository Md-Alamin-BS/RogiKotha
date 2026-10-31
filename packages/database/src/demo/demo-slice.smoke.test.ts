// Cumulative smoke suite: the demo slice's main path through its data functions (FR1, FR3, FR4,
// FR6), against the freshly migrated test database. Rows from other files may exist, so every
// check looks up the records this test made.
import { newId, newPublicId } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { authUsers } from '../schema/auth';
import { doctors as doctorTable } from '../schema/directory';
import { testDb } from '../test-setup';
import { createProfileForAuthUser } from './accounts';
import { addComment, listComments } from './comments';
import { listDoctors, listTopics } from './doctors';
import { listFacilities } from './facilities';
import { createQuickReview, createQuickReviewWithNewDoctor, getReviewByPublicId } from './reviews';
import { getCurrentAccountByAuthUserId } from './session';

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

    const { reviewId, publicId } = await createQuickReview(testDb, {
      authorPersonaId: account!.currentPersonaId,
      authorAccountId: account!.accountId,
      doctorId: doctor!.id,
      relationship: 'self',
      periodYear: 2026,
      periodMonth: 2,
      title: 'A patient explanation',
      body: 'The doctor explained every test result slowly and clearly.',
      sentiment: 'positive',
      outcome: null,
      identityMode: 'named',
      language: 'en',
    });

    const listed = (await listDoctors(testDb, 'bn')).find((row) => row.id === doctor!.id);
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

    const created = await createQuickReviewWithNewDoctor(testDb, {
      doctor: { name, specialtyId: null, chamber: null, bmdc: null },
      review: {
        authorPersonaId: account!.currentPersonaId,
        authorAccountId: account!.accountId,
        relationship: 'self',
        periodYear: 2026,
        periodMonth: 3,
        title: 'Seen by a doctor not yet listed',
        body: 'The doctor took time to explain the plan and the follow-up visit.',
        sentiment: null,
        outcome: null,
        identityMode: 'named',
        language: 'en',
      },
    });

    const listed = (await listDoctors(testDb, 'en')).find((row) => row.id === created.doctorId);
    expect(listed).toMatchObject({ name, memberAdded: true, publishedReviewCount: 1 });
    await expect(listFacilities(testDb, 'en')).resolves.toEqual(expect.any(Array));
    await expect(listTopics(testDb, 'bn')).resolves.toEqual(expect.any(Array));
  });
});
