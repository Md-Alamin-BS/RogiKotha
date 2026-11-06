// Adversarial test (demo slice, plan Step 13): files whose scan could not run, or that the scan
// rejected, must not be counted on any public projection, however the outage plays out.
import { newId, newPublicId, type DemoAddEvidenceInput } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctors } from '../schema/directory';
import { evidenceItems } from '../schema/evidence';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { createInterimPublicEvidenceCount } from '../repositories/public-evidence-count-interim';
import { PgReviewReadRepository } from '../repositories/review-reads';
import { testDb } from '../test-setup';
import { appTxOf } from '../unit-of-work';
import { listRecentPublishedReviews } from './doctors';
import { addEvidenceItem, countReadyEvidence, markScanResult } from './evidence';
import { getReviewByPublicId } from './reviews';

async function buildPublishedReview() {
  const authUserId = newId();
  const username = `adv_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [account] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: `Synthetic ${username}`,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  const [persona] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName: `Synthetic ${username}` })
    .returning({ id: personas.id });
  await testDb.insert(personaLinks).values({ personaId: persona!.id, accountId: account!.id });
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Adversary',
      nameBn: 'ডা. কাল্পনিক প্রতিপক্ষ',
      state: 'published',
      nameKey: `dr synthetic adversary ${username}`,
    })
    .returning({ id: doctors.id });
  const [review] = await testDb
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId: persona!.id,
      doctorId: doctor!.id,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 10,
      title: 'A synthetic visit with attachments',
      language: 'en',
      state: 'published',
      publishedAt: new Date(),
    })
    .returning({ id: reviews.id, publicId: reviews.publicId });
  return { accountId: account!.id, doctorId: doctor!.id, review: review! };
}

function buildUpload(reviewId: string, ownerAccountId: string): DemoAddEvidenceInput {
  return {
    reviewId,
    ownerAccountId,
    storageKey: newId().replace(/-/g, ''),
    mime: 'image/png',
    size: 2048,
    sha256: 'b'.repeat(64),
    originalFilenameEnc: Uint8Array.from([9, 9, 9]),
  };
}

/** The ready count the review shows on every public page that lists it. */
async function publicCounts(publicId: string, doctorId: string) {
  const detail = await getReviewByPublicId(testDb, publicId, 'en');
  // U46 (R-01): the doctor page reads its cards and counts through the binding the pages use.
  const forDoctor = await new PgReviewReadRepository().publishedForDoctor(
    appTxOf(testDb),
    doctorId,
  );
  const doctorCounts = await createInterimPublicEvidenceCount(testDb).countPublicEvidenceByReview(
    forDoctor.map((card) => card.id),
  );
  const doctorCard = forDoctor.find((card) => card.publicId === publicId);
  const recent = await listRecentPublishedReviews(testDb, 1000, 'en');
  return {
    detail: detail?.readyEvidenceCount,
    doctorPage: doctorCard ? doctorCounts.get(doctorCard.id) : undefined,
    home: recent.find((card) => card.publicId === publicId)?.readyEvidenceCount,
  };
}

describe('files the scanner never cleared', () => {
  it('are counted on no public page, while the one clean file is counted everywhere', async () => {
    const { accountId, doctorId, review } = await buildPublishedReview();
    const outage = await addEvidenceItem(testDb, buildUpload(review.id, accountId));
    // A process killed between the insert and the scan leaves this one quarantined with no result.
    await addEvidenceItem(testDb, buildUpload(review.id, accountId));
    const infected = await addEvidenceItem(testDb, buildUpload(review.id, accountId));
    const clean = await addEvidenceItem(testDb, buildUpload(review.id, accountId));
    await markScanResult(testDb, outage.id, 'error');
    await markScanResult(testDb, infected.id, 'infected');
    await markScanResult(testDb, clean.id, 'clean');

    expect(await publicCounts(review.publicId, doctorId)).toEqual({
      detail: 1,
      doctorPage: 1,
      home: 1,
    });
    expect(await countReadyEvidence(testDb, review.id)).toBe(1);
  });

  it('stay uncounted through repeated outages, and an infected verdict after an outage still rejects', async () => {
    const { accountId, doctorId, review } = await buildPublishedReview();
    const item = await addEvidenceItem(testDb, buildUpload(review.id, accountId));
    await markScanResult(testDb, item.id, 'error');
    await markScanResult(testDb, item.id, 'error');

    expect(await publicCounts(review.publicId, doctorId)).toEqual({
      detail: 0,
      doctorPage: 0,
      home: 0,
    });

    await markScanResult(testDb, item.id, 'infected');
    const [row] = await testDb.select().from(evidenceItems).where(eq(evidenceItems.id, item.id));
    expect(row).toMatchObject({ state: 'rejected', failReason: 'malware' });
    expect(await countReadyEvidence(testDb, review.id)).toBe(0);
  });
});
