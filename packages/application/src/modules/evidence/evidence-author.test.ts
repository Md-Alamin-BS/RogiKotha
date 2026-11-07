// U48 Step 29: the author's own list and removal (BR1.3, BR6.1–BR6.3) and the public count (C17,
// BR5.1) on the `test-support` fakes.
import { EVIDENCE_MAX_FILE_BYTES, EVIDENCE_MAX_PER_REVIEW } from '@rogikotha/domain';
import { describe, expect, it } from 'vitest';

import { anAnonymousActor } from '../../fakes-test-support';
import { makeEvidenceWorld } from './evidence-test-support';

async function authorWithItem(opts: { published?: boolean } = {}) {
  const w = makeEvidenceWorld();
  const { account, call } = await w.confirmedCall();
  // Upload while published, then unpublish when the test needs a hidden review.
  const review = w.addReview(account, { published: true });
  const { result, key } = await w.upload(call, { reviewPublicId: review.publicId });
  if (!result.ok) throw new Error('upload refused');
  review.published = opts.published ?? true;
  return { w, account, call, review, itemPublicId: result.data.itemId, key };
}

describe('evidence.getForAuthor', () => {
  it('lists the author’s own items on their unpublished review, with the opened name', async () => {
    const { w, call, review, itemPublicId } = await authorWithItem({ published: false });
    const size = [...w.repo.items.values()][0]!.originalBytes;

    const result = await w.evidence.getForAuthor.execute({ reviewPublicId: review.publicId }, call);

    expect(result).toEqual({
      ok: true,
      data: {
        reviewPublicId: review.publicId,
        files: [{ publicId: itemPublicId, name: 'clinic-receipt.png', status: 'pending', size }],
        maxFiles: EVIDENCE_MAX_PER_REVIEW,
        maxBytes: EVIDENCE_MAX_FILE_BYTES,
      },
    });
  });

  it('shows a reason key for rejected and failed items and leaves removed ones out', async () => {
    const { w, call, review } = await authorWithItem();
    w.seedItems(review, 1, { state: 'rejected', failReason: 'malware' });
    w.seedItems(review, 1, { state: 'failed', failReason: 'scanner_unavailable' });
    w.seedItems(review, 1, { state: 'rejected', failReason: 'malformed' });
    w.seedItems(review, 1, { state: 'removed' });
    w.seedItems(review, 1, { state: 'preview_ready' });

    const result = await w.evidence.getForAuthor.execute({ reviewPublicId: review.publicId }, call);

    if (!result.ok || result.data === null) throw new Error('no list');
    const summary = result.data.files.map((f) => [f.status, f.reasonKey ?? null, f.name]);
    // Oldest first: the seeded items predate the upload; a seeded seal does not open, so no name.
    expect(summary).toEqual([
      ['rejected', 'ev.reason.malware', null],
      ['failed', 'ev.reason.couldNotCheck', null],
      ['rejected', 'ev.reason.notImage', null],
      ['ready', null, null],
      ['pending', null, 'clinic-receipt.png'],
    ]);
  });

  it('returns null to another account and to a review that does not exist', async () => {
    const { w, review } = await authorWithItem();
    const { call: other } = await w.confirmedCall();

    const foreign = await w.evidence.getForAuthor.execute(
      { reviewPublicId: review.publicId },
      other,
    );
    const unknown = await w.evidence.getForAuthor.execute({ reviewPublicId: 'zzzzzzzzzz' }, other);

    expect(foreign).toEqual({ ok: true, data: null });
    expect(unknown).toEqual({ ok: true, data: null });
  });

  it('refuses a signed-out caller', async () => {
    const { w, review } = await authorWithItem();

    const result = await w.evidence.getForAuthor.execute(
      { reviewPublicId: review.publicId },
      w.callAs(anAnonymousActor()),
    );

    expect(result.ok).toBe(false);
  });
});

describe('evidence.remove', () => {
  it('removes the author’s item on their unpublished review and deletes its file after commit', async () => {
    const { w, account, call, itemPublicId, key } = await authorWithItem({ published: false });
    const item = [...w.repo.items.values()][0]!;

    const result = await w.evidence.remove.execute({ itemPublicId }, call);

    expect(result).toEqual({ ok: true, data: {} });
    expect(w.repo.item(item.id)).toMatchObject({ state: 'removed' });
    expect(w.repo.item(item.id)?.originalDeletedAt).toBeInstanceOf(Date);
    expect(w.store.files.has(key)).toBe(false);
    expect(w.repo.custodyOf(item.id)).toEqual(['received', 'removed']);
    expect(w.fakes.outbox.events.at(-1)).toEqual({
      name: 'evidence.stateChanged',
      payload: { itemId: item.id, reviewId: item.reviewId, state: 'removed' },
    });
    expect(w.fakes.audit.events).toEqual([
      {
        stream: `evidence:${item.id}`,
        action: 'evidence.removed',
        actor: `account:${account.accountId}`,
        targetKind: 'evidence',
        targetId: item.id,
        details: { fromState: 'quarantined' },
      },
    ]);
  });

  it('answers not_found to another account and changes nothing', async () => {
    const { w, itemPublicId, key } = await authorWithItem();
    const { call: other } = await w.confirmedCall();

    const result = await w.evidence.remove.execute({ itemPublicId }, other);

    expect(result.ok ? undefined : result.error.code).toBe('not_found');
    expect([...w.repo.items.values()][0]).toMatchObject({ state: 'quarantined' });
    expect(w.store.files.has(key)).toBe(true);
    expect(w.fakes.audit.events).toEqual([]);
  });

  it('answers not_found for an item already removed', async () => {
    const { w, call, itemPublicId } = await authorWithItem();
    await w.evidence.remove.execute({ itemPublicId }, call);

    const again = await w.evidence.remove.execute({ itemPublicId }, call);

    expect(again.ok ? undefined : again.error.code).toBe('not_found');
    expect(w.fakes.audit.events).toHaveLength(1);
  });

  it('keeps the removal when the file delete fails, and logs only the item and error class', async () => {
    const { w, call, itemPublicId, key } = await authorWithItem();
    w.store.failNext('delete');

    const result = await w.evidence.remove.execute({ itemPublicId }, call);

    expect(result.ok).toBe(true);
    expect([...w.repo.items.values()][0]).toMatchObject({
      state: 'removed',
      originalDeletedAt: null,
    });
    const warning = w.fakes.logger.entries.find(
      (e) => e.event === 'evidence.original_delete_failed',
    );
    const itemId = [...w.repo.items.values()][0]!.id;
    expect(warning?.fields).toEqual({ itemId, errorClass: 'Error' });
    expect(JSON.stringify(w.fakes.logger.entries)).not.toContain(key);
  });
});

describe('countPublicEvidence (C17)', () => {
  it('counts only preview_ready and published items', async () => {
    const w = makeEvidenceWorld();
    const { account } = await w.confirmedCall();
    const review = w.addReview(account);
    const other = w.addReview(account);
    for (const state of [
      'quarantined',
      'validating',
      'scanning',
      'rejected',
      'failed',
      'removed',
    ] as const) {
      w.seedItems(review, 1, { state });
    }
    w.seedItems(review, 2, { state: 'preview_ready' });
    w.seedItems(review, 1, { state: 'published' });
    w.seedItems(other, 1, { state: 'failed' });

    expect(await w.evidence.publicEvidenceCount.countPublicEvidence(review.id)).toBe(3);
    expect(await w.evidence.publicEvidenceCount.countPublicEvidence(other.id)).toBe(0);
    const byReview = await w.evidence.publicEvidenceCount.countPublicEvidenceByReview([
      review.id,
      other.id,
    ]);
    expect(byReview.get(review.id)).toBe(3);
    expect(byReview.has(other.id)).toBe(false);
  });
});
