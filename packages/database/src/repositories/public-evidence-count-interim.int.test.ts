import { newId, newPublicId } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { evidenceItems } from '../schema/evidence';
import { testDb } from '../test-setup';
import { buildAccount, buildDoctor, buildPersona, buildReview } from './directory-test-support';
import { createInterimPublicEvidenceCount } from './public-evidence-count-interim';

const counts = createInterimPublicEvidenceCount(testDb);

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

describe('the interim PublicEvidenceCount (C17)', () => {
  it('counts only ready documents, one review and many at once', async () => {
    const account = await buildAccount(testDb);
    const doctor = await buildDoctor(testDb);
    const persona = await buildPersona(testDb);
    const withFiles = await buildReview(testDb, doctor.id, persona);
    const without = await buildReview(testDb, doctor.id, persona);
    await buildEvidence(withFiles.id, account.accountId, 'preview_ready');
    await buildEvidence(withFiles.id, account.accountId, 'preview_ready');
    await buildEvidence(withFiles.id, account.accountId, 'quarantined');

    expect(await counts.countPublicEvidence(withFiles.id)).toBe(2);
    expect(await counts.countPublicEvidence('not-a-uuid')).toBe(0);
    const many = await counts.countPublicEvidenceByReview([withFiles.id, without.id, withFiles.id]);
    expect([...many.entries()]).toEqual([
      [withFiles.id, 2],
      [without.id, 0],
    ]);
    expect((await counts.countPublicEvidenceByReview([newId()])).size).toBe(1);
  });
});
