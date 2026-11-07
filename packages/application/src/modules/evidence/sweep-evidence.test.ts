// U48 Step 32: `evidence.sweep` on the `test-support` fakes (WF2b, BR4.2, BR4.7, BR4.11).
import { describe, expect, it, vi } from 'vitest';

import { makeEvidenceWorkerWorld } from './evidence-test-support';
import { EVIDENCE_SWEEP_BATCH } from './jobs/sweep-evidence';

const PAST_DEADLINE_SEC = 3601;

describe('evidence.sweep', () => {
  it('ends stuck items failed with the reason their latest custody gives', async () => {
    const w = makeEvidenceWorkerWorld();
    const stalled = w.seedProcessing({
      state: 'scanning',
      ageSec: PAST_DEADLINE_SEC,
      custody: ['validated', 'scan_started', 'scan_unavailable'],
    });
    const orphan = w.seedProcessing({ state: 'quarantined', ageSec: PAST_DEADLINE_SEC + 60 });

    const result = await w.sweeper.sweep();

    expect(result).toEqual({ ended: 2 });
    expect(w.repo.item(stalled.id)).toMatchObject({
      state: 'failed',
      failReason: 'scanner_unavailable',
    });
    expect(w.repo.item(orphan.id)).toMatchObject({
      state: 'failed',
      failReason: 'processing_timeout',
    });
    expect(w.custodyOf(stalled.id, 3)).toEqual([['failed', { failReason: 'scanner_unavailable' }]]);
    expect(w.custodyOf(orphan.id)).toEqual([['failed', { failReason: 'processing_timeout' }]]);
    expect(w.repo.custody.every((c) => c.actor === 'worker')).toBe(true);
    // Oldest first.
    expect(w.stateChanges().map((e) => e.payload)).toEqual([
      { itemId: orphan.id, reviewId: orphan.reviewId, state: 'failed' },
      { itemId: stalled.id, reviewId: stalled.reviewId, state: 'failed' },
    ]);
  });

  it('deletes the original of every item it ends and marks it deleted', async () => {
    const w = makeEvidenceWorkerWorld();
    const item = w.seedProcessing({ state: 'validating', ageSec: PAST_DEADLINE_SEC });

    await w.sweeper.sweep();

    expect(w.store.files.has(item.storageKey!)).toBe(false);
    expect(w.store.deletedKeys).toEqual([item.storageKey]);
    expect(w.repo.item(item.id)?.originalDeletedAt).not.toBeNull();
  });

  it('leaves younger items and items already final alone', async () => {
    const w = makeEvidenceWorkerWorld();
    const young = w.seedProcessing({ state: 'scanning', ageSec: 3599 });
    const atDeadline = w.seedProcessing({ state: 'quarantined', ageSec: 3600 });
    const ready = w.seedProcessing({ state: 'preview_ready', ageSec: PAST_DEADLINE_SEC });
    const failed = w.seedProcessing({ state: 'failed', ageSec: PAST_DEADLINE_SEC });
    const removed = w.seedProcessing({ state: 'removed', ageSec: PAST_DEADLINE_SEC });

    const result = await w.sweeper.sweep();

    expect(result).toEqual({ ended: 0 });
    for (const item of [young, atDeadline, ready, failed, removed]) {
      expect(w.repo.item(item.id)?.state).toBe(item.state);
      expect(w.store.files.has(item.storageKey!)).toBe(true);
    }
    expect(w.repo.custody).toEqual([]);
    expect(w.stateChanges()).toEqual([]);
  });

  it('skips an item a removal took between the select and its transaction, without error', async () => {
    const w = makeEvidenceWorkerWorld();
    const item = w.seedProcessing({ state: 'scanning', ageSec: PAST_DEADLINE_SEC });
    const latest = w.repo.latestCustody.bind(w.repo);
    vi.spyOn(w.repo, 'latestCustody').mockImplementationOnce((tx, id) => {
      w.repo.items.set(id, { ...w.repo.item(id)!, state: 'removed' });
      return latest(tx, id);
    });

    const result = await w.sweeper.sweep();

    expect(result).toEqual({ ended: 0 });
    expect(w.repo.item(item.id)?.state).toBe('removed');
    expect(w.custodyOf(item.id)).toEqual([]);
    expect(w.stateChanges()).toEqual([]);
    expect(w.store.deletedKeys).toEqual([]);
  });

  it('keeps going past an item whose transaction fails, and the next run ends it', async () => {
    const w = makeEvidenceWorkerWorld();
    const first = w.seedProcessing({ state: 'quarantined', ageSec: PAST_DEADLINE_SEC + 10 });
    const second = w.seedProcessing({ state: 'quarantined', ageSec: PAST_DEADLINE_SEC });
    w.repo.failNext('appendCustody');

    expect(await w.sweeper.sweep()).toEqual({ ended: 1 });
    expect(w.repo.item(first.id)?.state).toBe('quarantined');
    expect(w.repo.item(second.id)?.state).toBe('failed');
    expect(w.fakes.logger.entries).toContainEqual({
      level: 'error',
      event: 'evidence.sweep_item_failed',
      fields: { itemId: first.id, errorClass: 'Error' },
    });

    expect(await w.sweeper.sweep()).toEqual({ ended: 1 });
    expect(w.repo.item(first.id)?.state).toBe('failed');
  });

  it('asks for at most one batch of items created before the deadline', async () => {
    const w = makeEvidenceWorkerWorld();
    const stuck = vi.spyOn(w.repo, 'stuckItems');

    await w.sweeper.sweep();

    const now = w.ports.clock.now().getTime();
    expect(stuck).toHaveBeenCalledWith(expect.anything(), new Date(now - 3600 * 1000), 100);
    expect(EVIDENCE_SWEEP_BATCH).toBe(100);
  });
});
