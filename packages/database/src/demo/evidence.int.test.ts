import { newId, newPublicId, type DemoAddEvidenceInput } from '@rogikotha/contracts';
import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctors } from '../schema/directory';
import { evidenceArtifacts, evidenceCustodyEvents, evidenceItems } from '../schema/evidence';
import { personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { testDb } from '../test-setup';
import {
  DEMO_READY_EVIDENCE_STATE,
  addEvidenceItem,
  countReadyEvidence,
  listOwnEvidence,
  markScanResult,
} from './evidence';

async function buildAccount(): Promise<string> {
  const authUserId = newId();
  const username = `ev_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: `Name ${username}`,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  return profile!.id;
}

async function buildReview(): Promise<string> {
  const [persona] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName: 'Synthetic author' })
    .returning({ id: personas.id });
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic',
      nameBn: 'ডা. কাল্পনিক',
      state: 'published',
      nameKey: 'dr synthetic',
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
      periodMonth: 9,
      title: 'A synthetic visit',
      language: 'en',
      state: 'published',
    })
    .returning({ id: reviews.id });
  return review!.id;
}

function buildUpload(
  reviewId: string,
  ownerAccountId: string,
  overrides: Partial<DemoAddEvidenceInput> = {},
): DemoAddEvidenceInput {
  return {
    reviewId,
    ownerAccountId,
    storageKey: newId().replace(/-/g, ''),
    mime: 'image/png',
    size: 2048,
    sha256: 'a'.repeat(64),
    originalFilenameEnc: Uint8Array.from([1, 2, 3, 4]),
    ...overrides,
  };
}

async function itemRow(id: string) {
  const [row] = await testDb.select().from(evidenceItems).where(eq(evidenceItems.id, id));
  return row!;
}

async function custodyEvents(itemId: string): Promise<string[]> {
  const rows = await testDb
    .select({ event: evidenceCustodyEvents.event })
    .from(evidenceCustodyEvents)
    .where(eq(evidenceCustodyEvents.itemId, itemId))
    .orderBy(asc(evidenceCustodyEvents.createdAt), asc(evidenceCustodyEvents.id));
  return rows.map((r) => r.event);
}

describe('demo evidence data functions', () => {
  it('stores a new upload quarantined, with a private original and a received custody event', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const upload = buildUpload(reviewId, accountId, { mime: 'image/jpeg', size: 4096 });

    const { id, publicId } = await addEvidenceItem(testDb, upload);

    expect(publicId).toMatch(/^[0-9a-z]{10}$/);
    expect(await itemRow(id)).toMatchObject({
      reviewId,
      group: 'reviewed',
      state: 'quarantined',
      declaredMime: 'image/jpeg',
      detectedMime: 'image/jpeg',
      originalBytes: 4096,
      uploadedByAccountId: accountId,
    });
    const artifacts = await testDb
      .select()
      .from(evidenceArtifacts)
      .where(eq(evidenceArtifacts.itemId, id));
    expect(artifacts).toEqual([
      expect.objectContaining({
        kind: 'original',
        public: false,
        storageKey: upload.storageKey,
        bytes: 4096,
      }),
    ]);
    expect(await custodyEvents(id)).toEqual(['received']);
  });

  it('a clean scan makes the file ready and counts it publicly', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const { id } = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));

    await markScanResult(testDb, id, 'clean');

    expect(await itemRow(id)).toMatchObject({ state: DEMO_READY_EVIDENCE_STATE, failReason: null });
    expect(await countReadyEvidence(testDb, reviewId)).toBe(1);
    expect(await custodyEvents(id)).toEqual(['received', 'scan_clean', 'preview_ready']);
  });

  it('an infected file is rejected as malware and never counted', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const { id } = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));

    await markScanResult(testDb, id, 'infected');

    expect(await itemRow(id)).toMatchObject({ state: 'rejected', failReason: 'malware' });
    expect(await countReadyEvidence(testDb, reviewId)).toBe(0);
  });

  it('a scan that could not run keeps the file quarantined and uncounted (fail closed)', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const { id } = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));

    await markScanResult(testDb, id, 'error');

    expect(await itemRow(id)).toMatchObject({
      state: 'quarantined',
      failReason: 'scanner_unavailable',
    });
    expect(await countReadyEvidence(testDb, reviewId)).toBe(0);
    expect(await custodyEvents(id)).toEqual(['received', 'scan_unavailable']);
  });

  it('a later scan result never moves a file that already left quarantine', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const { id } = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));
    await markScanResult(testDb, id, 'infected');

    await markScanResult(testDb, id, 'clean');

    expect(await itemRow(id)).toMatchObject({ state: 'rejected', failReason: 'malware' });
    expect(await custodyEvents(id)).toEqual(['received', 'scan_detected']);
  });

  it("lists only the author's own files on the experience, oldest first", async () => {
    const author = await buildAccount();
    const stranger = await buildAccount();
    const reviewId = await buildReview();
    const otherReviewId = await buildReview();
    const first = await addEvidenceItem(testDb, buildUpload(reviewId, author));
    const second = await addEvidenceItem(
      testDb,
      buildUpload(reviewId, author, { mime: 'image/jpeg' }),
    );
    await addEvidenceItem(testDb, buildUpload(otherReviewId, author));
    await markScanResult(testDb, second.id, 'clean');

    const own = await listOwnEvidence(testDb, reviewId, author);

    expect(own.map((row) => row.id)).toEqual([first.id, second.id]);
    expect(own[0]).toMatchObject({ state: 'quarantined', mime: 'image/png', size: 2048 });
    expect(own[1]).toMatchObject({ state: DEMO_READY_EVIDENCE_STATE, mime: 'image/jpeg' });
    expect(Buffer.from(own[0]!.originalFilenameEnc)).toEqual(Buffer.from([1, 2, 3, 4]));
    await expect(listOwnEvidence(testDb, reviewId, stranger)).resolves.toEqual([]);
  });

  it('counts ready files per experience only', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const otherReviewId = await buildReview();
    const ready = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));
    await addEvidenceItem(testDb, buildUpload(reviewId, accountId));
    const elsewhere = await addEvidenceItem(testDb, buildUpload(otherReviewId, accountId));
    await markScanResult(testDb, ready.id, 'clean');
    await markScanResult(testDb, elsewhere.id, 'clean');

    expect(await countReadyEvidence(testDb, reviewId)).toBe(1);
    expect(await countReadyEvidence(testDb, await buildReview())).toBe(0);
  });

  it('counts a file that is already published, as the seeded ones are', async () => {
    const accountId = await buildAccount();
    const reviewId = await buildReview();
    const { id } = await addEvidenceItem(testDb, buildUpload(reviewId, accountId));
    await testDb.update(evidenceItems).set({ state: 'published' }).where(eq(evidenceItems.id, id));

    expect(await countReadyEvidence(testDb, reviewId)).toBe(1);
  });
});
