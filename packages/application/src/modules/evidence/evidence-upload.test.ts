// U48 Step 29: the upload commands on the `test-support` fakes (BR1.1, BR1.2, BR2.1–BR2.5, BR2.7,
// BR2.8, BR3.4, BR4.1). Every refusal leaves no item and, through the caller contract, no file.
import {
  EVIDENCE_MAX_FILE_BYTES,
  EVIDENCE_MAX_PER_REVIEW,
  EVIDENCE_UPLOAD_LIMIT,
} from '@rogikotha/domain';
import { describe, expect, it } from 'vitest';

import { imageBytes } from '../../../../test-support/src/builders/evidence.js';
import { anAnonymousActor } from '../../fakes-test-support';
import { makeEvidenceWorld, newIdempotencyKey } from './evidence-test-support';

const FIFTEEN_MB = EVIDENCE_MAX_FILE_BYTES;

async function authorWithReview(opts: { published?: boolean } = {}) {
  const w = makeEvidenceWorld();
  const { account, call } = await w.confirmedCall();
  const review = w.addReview(account, opts);
  return { w, account, call, review };
}

function errorCode(result: { ok: boolean; error?: { code: string } }): string | undefined {
  return result.ok ? undefined : result.error?.code;
}

describe('evidence.intake', () => {
  it('records a PNG on the author’s published review as quarantined with custody and outbox', async () => {
    const { w, account, call, review } = await authorWithReview();

    const { result, key } = await w.upload(call, { reviewPublicId: review.publicId });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ state: 'quarantined', created: true });
    const item = [...w.repo.items.values()][0]!;
    expect(item.publicId).toBe(result.data.itemId);
    expect(item).toMatchObject({
      reviewId: review.id,
      uploadedByAccountId: account.accountId,
      state: 'quarantined',
      detectedMime: 'image/png',
      storageKey: key,
    });
    expect(w.seal.open(item.originalFilenameEnc)).toBe('clinic-receipt.png');
    expect(w.store.files.has(key)).toBe(true);
    expect(w.repo.custody).toEqual([
      expect.objectContaining({
        itemId: item.id,
        event: 'received',
        actor: `account:${account.accountId}`,
        details: { bytes: item.originalBytes, mime: 'image/png' },
      }),
    ]);
    expect(w.fakes.outbox.events).toEqual([
      { name: 'evidence.received', payload: { itemId: item.id } },
    ]);
    expect(w.repo.lockedReviews).toEqual([review.id]);
  });

  it('accepts a JPEG with a .jpeg name', async () => {
    const { w, call, review } = await authorWithReview();

    const { result } = await w.upload(call, {
      reviewPublicId: review.publicId,
      body: imageBytes({ kind: 'jpeg' }),
      name: 'Scan 01.JPEG',
      mime: 'image/jpeg',
    });

    expect(result.ok).toBe(true);
  });

  it('logs only the item id and state, never the name, key or account', async () => {
    const { w, account, call, review } = await authorWithReview();

    const { key } = await w.upload(call, { reviewPublicId: review.publicId });

    const lines = JSON.stringify(w.fakes.logger.entries);
    expect(lines).toContain('evidence.received');
    expect(lines).not.toContain('clinic-receipt');
    expect(lines).not.toContain(key);
    expect(lines).not.toContain(account.accountId);
  });

  describe('refusals leave no item, no custody, no outbox row and no file', () => {
    async function expectRefused(
      run: (w: ReturnType<typeof makeEvidenceWorld>) => Promise<{ result: unknown }>,
      w: ReturnType<typeof makeEvidenceWorld>,
      code: string,
      itemsBefore = 0,
    ) {
      const filesBefore = w.store.files.size;
      const { result } = await run(w);
      expect(errorCode(result as { ok: boolean; error?: { code: string } })).toBe(code);
      expect(w.repo.items.size).toBe(itemsBefore);
      expect(w.repo.custody).toEqual([]);
      expect(w.fakes.outbox.events).toEqual([]);
      expect(w.store.files.size).toBe(filesBefore);
    }

    it('refuses a signed-out request', async () => {
      const { w, review } = await authorWithReview();
      const call = w.callAs(anAnonymousActor());
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId }),
        w,
        'forbidden',
      );
    });

    it('refuses an unconfirmed account', async () => {
      const w = makeEvidenceWorld();
      const { account, call } = await w.confirmedCall({ status: 'pending_verification' });
      const review = w.addReview(account);
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId }),
        w,
        'auth.email_unverified',
      );
    });

    it('answers not_found for another account’s review', async () => {
      const { w, review } = await authorWithReview();
      const { call: other } = await w.confirmedCall();
      await expectRefused(
        (x) => x.upload(other, { reviewPublicId: review.publicId }),
        w,
        'not_found',
      );
    });

    it('answers not_found for the author’s unpublished review', async () => {
      const { w, call, review } = await authorWithReview({ published: false });
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId }),
        w,
        'not_found',
      );
    });

    it('rejects a text file named as a PNG', async () => {
      const { w, call, review } = await authorWithReview();
      const body = Uint8Array.from(Array.from('not an image at all', (c) => c.charCodeAt(0)));
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId, body }),
        w,
        'evidence.type_rejected',
      );
    });

    it('rejects a PNG whose name says JPEG', async () => {
      const { w, call, review } = await authorWithReview();
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId, name: 'receipt.jpg' }),
        w,
        'evidence.type_rejected',
      );
    });

    it('rejects a file of 15 MB and one byte', async () => {
      const { w, call, review } = await authorWithReview();
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId, bytes: FIFTEEN_MB + 1 }),
        w,
        'evidence.too_large',
      );
    });

    it('refuses the eleventh file', async () => {
      const { w, call, review } = await authorWithReview();
      w.seedItems(review, EVIDENCE_MAX_PER_REVIEW);
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId }),
        w,
        'evidence.too_many',
        EVIDENCE_MAX_PER_REVIEW,
      );
    });

    it('refuses a seventh 15 MB file after six on the 100 MB total', async () => {
      const { w, call, review } = await authorWithReview();
      w.seedItems(review, 6, { originalBytes: FIFTEEN_MB });
      await expectRefused(
        (x) => x.upload(call, { reviewPublicId: review.publicId, bytes: FIFTEEN_MB }),
        w,
        'evidence.total_too_large',
        6,
      );
    });
  });

  it('does not count rejected, failed or removed items towards the limits', async () => {
    const { w, call, review } = await authorWithReview();
    w.seedItems(review, 4, { state: 'rejected' });
    w.seedItems(review, 4, { state: 'failed' });
    w.seedItems(review, 4, { state: 'removed', originalBytes: FIFTEEN_MB });
    w.seedItems(review, EVIDENCE_MAX_PER_REVIEW - 1);

    const { result } = await w.upload(call, { reviewPublicId: review.publicId });

    expect(result.ok).toBe(true);
  });

  it('answers the retry of the upload that made the tenth item with that item, not too_many', async () => {
    const { w, call, review } = await authorWithReview();
    w.seedItems(review, EVIDENCE_MAX_PER_REVIEW - 1);
    const idempotencyKey = newIdempotencyKey();
    const first = await w.upload(call, { reviewPublicId: review.publicId, idempotencyKey });
    expect(first.result.ok).toBe(true);

    const retry = await w.upload(call, { reviewPublicId: review.publicId, idempotencyKey });

    expect(retry.result.ok).toBe(true);
    if (!first.result.ok || !retry.result.ok) return;
    expect(retry.result.data).toEqual({
      itemId: first.result.data.itemId,
      state: 'quarantined',
      created: false,
    });
    expect(w.repo.items.size).toBe(EVIDENCE_MAX_PER_REVIEW);
    expect(w.store.files.has(first.key)).toBe(true);
    expect(w.store.files.has(retry.key)).toBe(false);
    expect(w.fakes.outbox.events).toHaveLength(1);
  });

  it('answers not_found for a key another account already used', async () => {
    const { w, call, review } = await authorWithReview();
    const idempotencyKey = newIdempotencyKey();
    await w.upload(call, { reviewPublicId: review.publicId, idempotencyKey });
    const { account: other, call: otherCall } = await w.confirmedCall();
    const otherReview = w.addReview(other);

    const { result } = await w.upload(otherCall, {
      reviewPublicId: otherReview.publicId,
      idempotencyKey,
    });

    expect(errorCode(result)).toBe('not_found');
    expect(w.repo.items.size).toBe(1);
  });
});

describe('evidence.checkUpload (the pre-check before the file is written)', () => {
  it('lets a first upload proceed without writing anything', async () => {
    const { w, call, review } = await authorWithReview();

    const result = await w.evidence.checkUpload.execute(
      { reviewPublicId: review.publicId, idempotencyKey: newIdempotencyKey(), bytes: 68 },
      call,
    );

    expect(result).toMatchObject({ ok: true, data: { proceed: true } });
    expect(w.fakes.unitOfWork.outcomes).toEqual(['read']);
  });

  it('refuses another account’s review and a full review before any putQuarantined', async () => {
    const { w, review } = await authorWithReview();
    const { call: other } = await w.confirmedCall();
    const foreign = await w.evidence.checkUpload.execute(
      { reviewPublicId: review.publicId, idempotencyKey: newIdempotencyKey(), bytes: 68 },
      other,
    );

    const full = await authorWithReview();
    full.w.seedItems(full.review, EVIDENCE_MAX_PER_REVIEW);
    const fullResult = await full.w.evidence.checkUpload.execute(
      { reviewPublicId: full.review.publicId, idempotencyKey: newIdempotencyKey(), bytes: 68 },
      full.call,
    );

    expect(errorCode(foreign)).toBe('not_found');
    expect(errorCode(fullResult)).toBe('evidence.too_many');
    expect(w.store.files.size).toBe(0);
    expect(full.w.store.files.size).toBe(0);
  });

  it('refuses a file that would pass the 100 MB total', async () => {
    const { w, call, review } = await authorWithReview();
    w.seedItems(review, 6, { originalBytes: FIFTEEN_MB });

    const result = await w.evidence.checkUpload.execute(
      { reviewPublicId: review.publicId, idempotencyKey: newIdempotencyKey(), bytes: FIFTEEN_MB },
      call,
    );

    expect(errorCode(result)).toBe('evidence.total_too_large');
  });

  it('answers an idempotent repeat with the existing item and writes nothing', async () => {
    const { w, call, review } = await authorWithReview();
    const idempotencyKey = newIdempotencyKey();
    const first = await w.upload(call, { reviewPublicId: review.publicId, idempotencyKey });
    if (!first.result.ok) throw new Error('first upload refused');
    w.seedItems(review, EVIDENCE_MAX_PER_REVIEW);
    const filesBefore = w.store.files.size;

    const result = await w.evidence.checkUpload.execute(
      { reviewPublicId: review.publicId, idempotencyKey, bytes: 68 },
      call,
    );

    expect(result).toEqual({
      ok: true,
      data: { existing: { itemId: first.result.data.itemId, state: 'quarantined' } },
    });
    expect(w.store.files.size).toBe(filesBefore);
  });
});

describe('evidence.admitUpload', () => {
  it('refuses the 31st upload request in an hour with retryAfterSec', async () => {
    const { w, call } = await authorWithReview();
    for (let i = 0; i < EVIDENCE_UPLOAD_LIMIT; i += 1) {
      expect((await w.evidence.admitUpload.execute({}, call)).ok).toBe(true);
    }

    const result = await w.evidence.admitUpload.execute({}, call);

    expect(errorCode(result)).toBe('evidence.rate_limited');
    if (result.ok) return;
    expect(result.error.retryAfterSec).toBeGreaterThan(0);
  });

  it('counts each account on its own key', async () => {
    const { w, call } = await authorWithReview();
    for (let i = 0; i < EVIDENCE_UPLOAD_LIMIT; i += 1)
      await w.evidence.admitUpload.execute({}, call);
    const { call: other } = await w.confirmedCall();

    expect((await w.evidence.admitUpload.execute({}, other)).ok).toBe(true);
  });

  it('refuses a signed-out request before counting it', async () => {
    const { w } = await authorWithReview();

    const result = await w.evidence.admitUpload.execute({}, w.callAs(anAnonymousActor()));

    expect(errorCode(result)).toBe('forbidden');
  });
});
