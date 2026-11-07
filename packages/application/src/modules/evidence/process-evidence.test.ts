// U48 Step 32: `evidence.process` on the `test-support` fakes (WF2, BR4.2–BR4.10). Custody values
// and details are asserted exactly as functional-spec § 4 lists them; files are synthetic.
import { describe, expect, it } from 'vitest';

import { imageBytes } from '../../../../test-support/src/builders/evidence.js';
import { FAKE_SCANNER_VERSION } from '../../../../test-support/src/fakes/scanner.js';
import { FakeAbortSignal, makeEvidenceWorkerWorld } from './evidence-test-support';
import { EvidenceAttemptAborted, ScannerUnavailable } from './jobs/process-evidence';

const DEADLINE_SEC = 3600;

function worldWith(
  seed: Parameters<ReturnType<typeof makeEvidenceWorkerWorld>['seedProcessing']>[0] = {},
) {
  const w = makeEvidenceWorkerWorld();
  const item = w.seedProcessing(seed);
  return { w, item };
}

describe('evidence.process', () => {
  it('moves a clean PNG to preview_ready with its custody and one state-change event', async () => {
    const { w, item } = worldWith();
    w.scanner.script.push('clean');

    const result = await w.process(item.id);

    expect(result).toEqual({ state: 'preview_ready' });
    expect(w.repo.item(item.id)).toMatchObject({ state: 'preview_ready', failReason: null });
    expect(w.custodyOf(item.id)).toEqual([
      ['validated', {}],
      ['scan_started', {}],
      ['scan_clean', { scannerVersion: FAKE_SCANNER_VERSION }],
      ['preview_ready', {}],
    ]);
    expect(w.repo.custody.every((c) => c.actor === 'worker')).toBe(true);
    expect(w.stateChanges()).toEqual([
      {
        name: 'evidence.stateChanged',
        payload: { itemId: item.id, reviewId: item.reviewId, state: 'preview_ready' },
      },
    ]);
    expect(w.store.files.has(item.storageKey!)).toBe(true);
  });

  it('scans the exact bytes that were stored, and a JPEG passes as well', async () => {
    const body = imageBytes({ kind: 'jpeg' });
    const { w, item } = worldWith({ body });
    w.scanner.script.push('clean');

    await w.process(item.id);

    expect(w.scanner.scanned).toEqual([body]);
    expect(w.repo.item(item.id)?.state).toBe('preview_ready');
  });

  it('rejects an infected file as malware and deletes the original before the state change', async () => {
    const { w, item } = worldWith();
    w.scanner.script.push('infected');

    const result = await w.process(item.id);

    expect(result).toEqual({ state: 'rejected' });
    expect(w.repo.item(item.id)).toMatchObject({ state: 'rejected', failReason: 'malware' });
    expect(w.repo.item(item.id)?.originalDeletedAt).not.toBeNull();
    expect(w.store.files.has(item.storageKey!)).toBe(false);
    expect(w.custodyOf(item.id)).toEqual([
      ['validated', {}],
      ['scan_started', {}],
      ['scan_detected', {}],
    ]);
    expect(w.stateChanges().map((e) => e.payload)).toEqual([
      { itemId: item.id, reviewId: item.reviewId, state: 'rejected' },
    ]);
  });

  it('rejects a polyglot as malformed without scanning it', async () => {
    const { w, item } = worldWith({ body: imageBytes({ kind: 'png', trailing: [0x3c, 0x3f] }) });
    w.scanner.script.push('clean');

    await w.process(item.id);

    expect(w.repo.item(item.id)).toMatchObject({ state: 'rejected', failReason: 'malformed' });
    expect(w.custodyOf(item.id)).toEqual([['validation_failed', { failReason: 'malformed' }]]);
    expect(w.scanner.scanned).toEqual([]);
    expect(w.store.files.has(item.storageKey!)).toBe(false);
    expect(w.repo.item(item.id)?.originalDeletedAt).not.toBeNull();
    expect(w.stateChanges()).toHaveLength(1);
  });

  it('rejects stored bytes whose sha256 differs from the recorded one as malformed', async () => {
    const { w, item } = worldWith({ sha256: 'f'.repeat(64) });

    await w.process(item.id);

    expect(w.repo.item(item.id)).toMatchObject({ state: 'rejected', failReason: 'malformed' });
  });

  it('rejects bytes that disagree with the detected type as type_mismatch', async () => {
    const { w, item } = worldWith({ detectedMime: 'image/jpeg' });

    await w.process(item.id);

    expect(w.repo.item(item.id)).toMatchObject({ state: 'rejected', failReason: 'type_mismatch' });
    expect(w.custodyOf(item.id)).toEqual([['validation_failed', { failReason: 'type_mismatch' }]]);
  });

  it('throws ScannerUnavailable with attempts left and leaves the item scanning with no event', async () => {
    const { w, item } = worldWith();
    w.scanner.script.push('unavailable');

    await expect(w.process(item.id, { attempt: 2 })).rejects.toBeInstanceOf(ScannerUnavailable);

    expect(w.repo.item(item.id)).toMatchObject({ state: 'scanning', failReason: null });
    expect(w.custodyOf(item.id)).toEqual([
      ['validated', {}],
      ['scan_started', {}],
      ['scan_unavailable', { attempt: 2 }],
    ]);
    expect(w.stateChanges()).toEqual([]);
    expect(w.store.files.has(item.storageKey!)).toBe(true);
  });

  it('ends the item failed with scanner_unavailable on the last attempt without throwing', async () => {
    const { w, item } = worldWith({
      state: 'scanning',
      custody: ['validated', 'scan_started', 'scan_unavailable'],
    });
    w.scanner.script.push('unavailable');

    const result = await w.process(item.id, { attempt: 4, lastAttempt: true });

    expect(result).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'scanner_unavailable',
    });
    expect(w.custodyOf(item.id, 3)).toEqual([
      ['scan_started', {}],
      ['scan_unavailable', { attempt: 4 }],
      ['failed', { failReason: 'scanner_unavailable' }],
    ]);
    expect(w.stateChanges().map((e) => e.payload)).toEqual([
      { itemId: item.id, reviewId: item.reviewId, state: 'failed' },
    ]);
    expect(w.store.files.has(item.storageKey!)).toBe(false);
    expect(w.repo.item(item.id)?.originalDeletedAt).not.toBeNull();
  });

  it('resumes an item a crashed attempt left in validating and ends it preview_ready', async () => {
    const { w, item } = worldWith({ state: 'validating' });
    w.scanner.script.push('clean');

    await w.process(item.id, { attempt: 2 });

    expect(w.repo.item(item.id)?.state).toBe('preview_ready');
    expect(w.custodyOf(item.id).map(([event]) => event)).toEqual([
      'validated',
      'scan_started',
      'scan_clean',
      'preview_ready',
    ]);
  });

  it('re-validates an item found in scanning, appends scan_started again and scans again', async () => {
    const { w, item } = worldWith({
      state: 'scanning',
      custody: ['validated', 'scan_started', 'scan_unavailable'],
    });
    w.scanner.script.push('clean');

    await w.process(item.id, { attempt: 2 });

    expect(w.repo.item(item.id)?.state).toBe('preview_ready');
    expect(w.custodyOf(item.id, 3).map(([event]) => event)).toEqual([
      'scan_started',
      'scan_clean',
      'preview_ready',
    ]);
    expect(w.scanner.scanned).toHaveLength(1);
  });

  it('rejects a broken file it finds in scanning, because the retry re-validates first', async () => {
    const { w, item } = worldWith({
      state: 'scanning',
      body: imageBytes({ kind: 'png', truncate: 4 }),
    });

    await w.process(item.id, { attempt: 3 });

    expect(w.repo.item(item.id)).toMatchObject({ state: 'rejected', failReason: 'malformed' });
    expect(w.scanner.scanned).toEqual([]);
  });

  it('fails the item at once with unknown when its original is missing, even with attempts left', async () => {
    const { w, item } = worldWith();
    w.store.lose(item.storageKey!);

    const result = await w.process(item.id, { attempt: 1 });

    expect(result).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)).toMatchObject({ state: 'failed', failReason: 'unknown' });
    expect(w.custodyOf(item.id)).toEqual([
      ['failed', { failReason: 'unknown', cause: 'original_missing' }],
    ]);
    expect(w.stateChanges().map((e) => e.payload)).toEqual([
      { itemId: item.id, reviewId: item.reviewId, state: 'failed' },
    ]);
  });

  it('ends the item failed with processing_timeout when the last attempt hits an unexpected error', async () => {
    const { w, item } = worldWith();
    w.store.failNext('read');

    const result = await w.process(item.id, { attempt: 4, lastAttempt: true });

    expect(result).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'processing_timeout',
    });
    expect(w.custodyOf(item.id)).toEqual([['failed', { failReason: 'processing_timeout' }]]);
    expect(w.stateChanges()).toHaveLength(1);
    expect(w.store.files.has(item.storageKey!)).toBe(false);
  });

  it('rethrows the same unexpected error before the last attempt so the queue retries', async () => {
    const { w, item } = worldWith();
    w.store.failNext('read');

    await expect(w.process(item.id, { attempt: 1 })).rejects.toThrow(/forced read fault/);

    expect(w.repo.item(item.id)?.state).toBe('validating');
    expect(w.custodyOf(item.id)).toEqual([]);
    expect(w.stateChanges()).toEqual([]);
  });

  it('rolls back a step whose custody write fails, so the item keeps its last committed state', async () => {
    const { w, item } = worldWith();
    w.repo.failNext('appendCustody');

    await expect(w.process(item.id, { attempt: 1 })).rejects.toThrow(/appendCustody/);

    expect(w.repo.item(item.id)?.state).toBe('validating');
    expect(w.custodyOf(item.id)).toEqual([]);
  });

  it('rethrows the original error and logs the class when the last attempt cannot write failed', async () => {
    const { w, item } = worldWith();
    w.store.failNext('read');
    w.repo.failNext('transition');
    // The first transition (quarantined -> validating) takes the fault; start from validating.
    w.repo.items.set(item.id, { ...w.repo.item(item.id)!, state: 'validating' });

    await expect(w.process(item.id, { attempt: 4, lastAttempt: true })).rejects.toThrow(
      /forced read fault/,
    );

    expect(w.repo.item(item.id)?.state).toBe('validating');
    expect(w.fakes.logger.entries).toContainEqual({
      level: 'error',
      event: 'evidence.fail_write_failed',
      fields: { itemId: item.id, errorClass: 'Error' },
    });
  });

  it('treats a budget abort outside the scan as an unexpected error before the last attempt', async () => {
    const { w, item } = worldWith();
    const signal = new FakeAbortSignal();
    signal.abort();

    await expect(w.process(item.id, { attempt: 1, signal })).rejects.toBeInstanceOf(
      EvidenceAttemptAborted,
    );
    expect(w.repo.item(item.id)?.state).toBe('validating');
  });

  it('ends a budget abort on the last attempt failed with processing_timeout', async () => {
    const { w, item } = worldWith({ state: 'validating' });
    const signal = new FakeAbortSignal();
    signal.abort();

    await w.process(item.id, { attempt: 4, lastAttempt: true, signal });

    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'processing_timeout',
    });
    expect(w.scanner.scanned).toEqual([]);
  });

  it('treats a budget abort during the scan as unavailable', async () => {
    const { w, item } = worldWith();
    const signal = new FakeAbortSignal();
    const scan = w.scanner.scan.bind(w.scanner);
    w.scanner.scan = (stream, opts) => {
      const report = scan(stream, opts);
      signal.abort();
      return report;
    };
    w.scanner.script.push('hang');

    await expect(w.process(item.id, { attempt: 1, signal })).rejects.toBeInstanceOf(
      ScannerUnavailable,
    );
    expect(w.repo.item(item.id)?.state).toBe('scanning');
    expect(w.custodyOf(item.id).at(-1)).toEqual(['scan_unavailable', { attempt: 1 }]);
  });

  it('fails an item past the deadline with processing_timeout without reading or scanning it', async () => {
    const { w, item } = worldWith({ ageSec: DEADLINE_SEC + 1 });
    w.scanner.script.push('clean');

    const result = await w.process(item.id);

    expect(result).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'processing_timeout',
    });
    expect(w.custodyOf(item.id)).toEqual([['failed', { failReason: 'processing_timeout' }]]);
    expect(w.scanner.scanned).toEqual([]);
    expect(w.store.files.has(item.storageKey!)).toBe(false);
  });

  it('records scanner_unavailable at the deadline when the latest custody is scan_unavailable', async () => {
    const { w, item } = worldWith({
      state: 'scanning',
      ageSec: DEADLINE_SEC + 1,
      custody: ['validated', 'scan_started', 'scan_unavailable'],
    });

    await w.process(item.id, { attempt: 3 });

    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'scanner_unavailable',
    });
  });

  it('processes an item exactly at the deadline as usual', async () => {
    const { w, item } = worldWith({ ageSec: DEADLINE_SEC });
    w.scanner.script.push('clean');

    await w.process(item.id);

    expect(w.repo.item(item.id)?.state).toBe('preview_ready');
  });

  it('finishes without change for a missing item and for items already final or removed', async () => {
    const w = makeEvidenceWorkerWorld();
    const ready = w.seedProcessing({ state: 'preview_ready' });
    const removed = w.seedProcessing({ state: 'removed' });

    expect(await w.process('00000000-0000-4000-8000-ffffffffffff')).toEqual({ state: null });
    expect(await w.process(ready.id)).toEqual({ state: 'preview_ready' });
    expect(await w.process(removed.id)).toEqual({ state: 'removed' });
    expect(w.repo.custody).toEqual([]);
    expect(w.stateChanges()).toEqual([]);
    expect(w.scanner.scanned).toEqual([]);
  });

  it('stops without error when a removal wins the race during the scan', async () => {
    const { w, item } = worldWith();
    const scan = w.scanner.scan.bind(w.scanner);
    w.scanner.scan = async (stream, opts) => {
      const report = await scan(stream, opts);
      w.repo.items.set(item.id, { ...w.repo.item(item.id)!, state: 'removed' });
      return report;
    };
    w.scanner.script.push('clean');

    const result = await w.process(item.id);

    expect(result).toEqual({ state: 'removed' });
    expect(w.custodyOf(item.id).map(([event]) => event)).toEqual(['validated', 'scan_started']);
    expect(w.stateChanges()).toEqual([]);
  });

  it('logs only allowlisted fields', async () => {
    const { w, item } = worldWith();
    w.scanner.script.push('unavailable', 'infected');

    await expect(w.process(item.id, { attempt: 1 })).rejects.toBeInstanceOf(ScannerUnavailable);
    await w.process(item.id, { attempt: 2 });

    const allowed = new Set(['itemId', 'state', 'failReason', 'attempt', 'errorClass', 'count']);
    for (const entry of w.fakes.logger.entries) {
      for (const field of Object.keys(entry.fields)) expect(allowed).toContain(field);
    }
    expect(w.fakes.logger.entries.length).toBeGreaterThan(0);
  });
});
