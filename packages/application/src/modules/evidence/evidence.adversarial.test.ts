// U48 Step 49, adversarial tests A1, A3 and A5 (functional-spec § 8), written by a separate agent
// against the module on `test-support` fakes. Each test is an attack that tries to get a hostile
// or unchecked file counted, reach another account's evidence, or leave an item open when the
// scanner or the worker fails. All files, accounts and reviews are synthetic.
import { describe, expect, it } from 'vitest';

import { aStoredEvidenceItem, imageBytes } from '../../../../test-support/src/builders/evidence.js';
import type { FakeAccount } from '../../fakes-test-support';
import type { ScanReport, Tx } from '../../ports';
import { makeEvidenceWorkerWorld, FakeAbortSignal } from './evidence-test-support';
import { ScannerUnavailable } from './jobs/process-evidence';
import { createEvidenceProcessor } from './module';

const NO_TX = {} as Tx;
const PAST_DEADLINE_MS = 3601 * 1000;

function ascii(text: string): Uint8Array {
  return Uint8Array.from(Array.from(text, (c) => c.charCodeAt(0)));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_HEADER = Uint8Array.from([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const HTML = ascii('<html><script>alert("synthetic")</script></html>');
// A ZIP local-file header, the start of the archive half of a JPEG/ZIP polyglot.
const ZIP = concat(
  Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0, 0, 0]),
  ascii('synthetic.txt'),
);

async function uploadedOnFreshReview(
  w: ReturnType<typeof makeEvidenceWorkerWorld>,
  body: Uint8Array,
  name = 'synthetic-receipt.png',
  mime = 'image/png',
) {
  const { account, call } = await w.confirmedCall();
  const review = w.addReview(account);
  const { result } = await w.upload(call, { reviewPublicId: review.publicId, body, name, mime });
  return { account, call, review, result };
}

function internalIdOf(w: ReturnType<typeof makeEvidenceWorkerWorld>, publicId: string): string {
  const item = [...w.repo.items.values()].find((i) => i.publicId === publicId);
  if (item === undefined) throw new Error('no item with that public id');
  return item.id;
}

describe('A1: a disguised, truncated or polyglot file is never counted', () => {
  // `pngTruncatedAfterIhdr`: the signature and a complete IHDR chunk, nothing after.
  const pngTruncatedAfterIhdr = imageBytes({ kind: 'png' }).slice(0, 8 + 25);

  it.each([
    [
      'an HTML page behind a forged PNG signature and IHDR header',
      concat(PNG_SIGNATURE, IHDR_HEADER, HTML),
    ],
    ['a PNG truncated right after its IHDR chunk', pngTruncatedAfterIhdr],
    ['a valid PNG with an HTML page after IEND', imageBytes({ kind: 'png', trailing: [...HTML] })],
  ])('passes intake but the worker rejects it malformed: %s', async (_label, body) => {
    const w = makeEvidenceWorkerWorld();
    const { review, result } = await uploadedOnFreshReview(w, body);
    // The route's head check sees a PNG signature and IHDR header, so intake takes the file.
    if (!result.ok) throw new Error(`intake refused: ${result.error.code}`);
    w.scanner.script.push('clean');
    const id = internalIdOf(w, result.data.itemId);

    const processed = await w.process(id);

    expect(processed).toEqual({ state: 'rejected' });
    expect(w.repo.item(id)).toMatchObject({ state: 'rejected', failReason: 'malformed' });
    expect(w.scanner.script).toEqual(['clean']);
    expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
    expect(await w.repo.countCounting(NO_TX, review.id)).toEqual({ count: 0, bytes: 0 });
    expect(w.store.files.size).toBe(0);
  });

  it('rejects a valid JPEG with a ZIP archive after EOI as malformed', async () => {
    const w = makeEvidenceWorkerWorld();
    const body = imageBytes({ kind: 'jpeg', trailing: [...ZIP] });
    const { review, result } = await uploadedOnFreshReview(
      w,
      body,
      'synthetic-receipt.jpg',
      'image/jpeg',
    );
    if (!result.ok) throw new Error(`intake refused: ${result.error.code}`);
    w.scanner.script.push('clean');
    const id = internalIdOf(w, result.data.itemId);

    expect(await w.process(id)).toEqual({ state: 'rejected' });
    expect(w.repo.item(id)).toMatchObject({ failReason: 'malformed' });
    expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
  });

  it('refuses a JPEG renamed .png and sent as image/png at intake, writing no item', async () => {
    const w = makeEvidenceWorkerWorld();
    const { review, result } = await uploadedOnFreshReview(w, imageBytes({ kind: 'jpeg' }));

    expect(result).toMatchObject({ ok: false, error: { code: 'evidence.type_rejected' } });
    expect(w.repo.items.size).toBe(0);
    expect(w.store.files.size).toBe(0);
    expect(await w.repo.countCounting(NO_TX, review.id)).toEqual({ count: 0, bytes: 0 });
  });

  it('rejects an original swapped on disk after intake, whose bytes no longer match the hash', async () => {
    const w = makeEvidenceWorkerWorld();
    const { review, result } = await uploadedOnFreshReview(w, imageBytes({ kind: 'png' }));
    if (!result.ok) throw new Error(`intake refused: ${result.error.code}`);
    const id = internalIdOf(w, result.data.itemId);
    const key = w.repo.item(id)!.storageKey!;
    // A valid image of the same type, so only the hash can tell.
    w.store.files.set(key, imageBytes({ kind: 'png', width: 2 }));
    w.scanner.script.push('clean');

    expect(await w.process(id)).toEqual({ state: 'rejected' });
    expect(w.repo.item(id)).toMatchObject({ failReason: 'malformed' });
    expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
  });
});

describe("A3: another account's review or item answers not_found and changes nothing", () => {
  async function authorWithItem() {
    const w = makeEvidenceWorkerWorld();
    const idempotencyKey = '5d0f3a1e-2b4c-4d6e-8f10-a1b2c3d4e5f6';
    const { account: author, call: authorCall } = await w.confirmedCall();
    const review = w.addReview(author);
    const { result } = await w.upload(authorCall, {
      reviewPublicId: review.publicId,
      idempotencyKey,
    });
    if (!result.ok) throw new Error(`intake refused: ${result.error.code}`);
    const { call: strangerCall, account: stranger } = await w.confirmedCall();
    return {
      w,
      author,
      review,
      itemPublicId: result.data.itemId,
      idempotencyKey,
      stranger,
      strangerCall,
    };
  }

  function snapshotOf(w: ReturnType<typeof makeEvidenceWorkerWorld>) {
    return {
      items: JSON.stringify([...w.repo.items.values()]),
      custody: w.repo.custody.length,
      files: w.store.files.size,
      outbox: w.fakes.outbox.events.length,
    };
  }

  it('refuses a stranger upload, list and remove alike, and leaks no item id', async () => {
    const { w, review, itemPublicId, strangerCall } = await authorWithItem();
    const before = snapshotOf(w);

    const upload = await w.upload(strangerCall, { reviewPublicId: review.publicId });
    const list = await w.evidence.getForAuthor.execute(
      { reviewPublicId: review.publicId },
      strangerCall,
    );
    const remove = await w.evidence.remove.execute({ itemPublicId }, strangerCall);

    expect(upload.result).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(list).toEqual({ ok: true, data: null });
    expect(remove).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(JSON.stringify([upload.result, remove])).not.toContain(itemPublicId);
    expect(snapshotOf(w)).toEqual(before);
  });

  it("answers not_found when a stranger replays the author's idempotency key on their own review", async () => {
    const { w, itemPublicId, idempotencyKey, stranger, strangerCall } = await authorWithItem();
    const own = w.addReview(stranger);
    const before = snapshotOf(w);

    const replay = await w.upload(strangerCall, { reviewPublicId: own.publicId, idempotencyKey });

    // The key names the author's item, but the stranger gets neither its id nor its state.
    expect(replay.result).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect(JSON.stringify(replay.result)).not.toContain(itemPublicId);
    expect(snapshotOf(w)).toEqual(before);
  });

  it("refuses the author's own item to a stranger even after the review is unpublished", async () => {
    const { w, review, itemPublicId, strangerCall } = await authorWithItem();
    review.published = false;

    const remove = await w.evidence.remove.execute({ itemPublicId }, strangerCall);

    expect(remove).toMatchObject({ ok: false, error: { code: 'not_found' } });
    expect([...w.repo.items.values()][0]?.state).toBe('quarantined');
  });
});

describe('A5: with the scanner down or the worker killed, an item never stays open or counts', () => {
  function seedOnReview(w: ReturnType<typeof makeEvidenceWorkerWorld>, account: FakeAccount) {
    const review = w.addReview(account);
    const body = imageBytes({ kind: 'png' });
    const storageKey = w.store.seed(body);
    const item = w.repo.seed(
      aStoredEvidenceItem({
        reviewId: review.id,
        uploadedByAccountId: account.accountId,
        originalBytes: body.length,
        originalSha256: w.fakes.crypto.hash(body),
        storageKey,
        createdAt: w.ports.clock.now(),
        originalFilenameEnc: w.seal.seal('synthetic-receipt.png'),
      }),
    );
    return { review, item };
  }

  it('keeps the item scanning through every retry, then ends it failed and shows the author Remove', async () => {
    const w = makeEvidenceWorkerWorld();
    const { account, call } = await w.confirmedCall();
    const { review, item } = seedOnReview(w, account);

    // pg-boss retryLimit 3: attempts 1–3 retry, attempt 4 is the last.
    for (const attempt of [1, 2, 3]) {
      await expect(w.process(item.id, { attempt })).rejects.toBeInstanceOf(ScannerUnavailable);
      expect(w.repo.item(item.id)?.state).toBe('scanning');
      expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
    }
    const last = await w.process(item.id, { attempt: 4 });

    expect(last).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'scanner_unavailable',
    });
    expect(w.store.files.has(item.storageKey!)).toBe(false);
    expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
    expect(await w.repo.countCounting(NO_TX, review.id)).toEqual({ count: 0, bytes: 0 });
    const own = await w.evidence.getForAuthor.execute({ reviewPublicId: review.publicId }, call);
    if (!own.ok || own.data === null) throw new Error('author list missing');
    expect(own.data.files).toEqual([
      expect.objectContaining({
        publicId: item.publicId,
        status: 'failed',
        reasonKey: 'ev.reason.couldNotCheck',
      }),
    ]);
    expect(await w.evidence.remove.execute({ itemPublicId: item.publicId }, call)).toEqual({
      ok: true,
      data: {},
    });
  });

  it('lets the sweep end an item whose worker died in the last attempt, and a late scan result cannot revive it', async () => {
    const w = makeEvidenceWorkerWorld();
    const { account } = await w.confirmedCall();
    const { review, item } = seedOnReview(w, account);
    for (const attempt of [1, 2, 3]) {
      await expect(w.process(item.id, { attempt })).rejects.toBeInstanceOf(ScannerUnavailable);
    }
    // The last attempt hangs in the scan: the worker process is killed there.
    let wake: (report: ScanReport) => void = () => undefined;
    const hung = createEvidenceProcessor({
      unitOfWork: w.ports.unitOfWork,
      evidenceRepository: w.repo,
      files: w.reader,
      outbox: w.ports.outbox,
      clock: w.ports.clock,
      logger: w.ports.logger,
      hasher: w.fakes.crypto,
      scanner: {
        scan: () =>
          new Promise<ScanReport>((resolve) => {
            wake = resolve;
          }),
      },
    });
    const zombie = hung.process({
      itemId: item.id,
      attempt: 4,
      lastAttempt: true,
      signal: new FakeAbortSignal(),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(w.repo.item(item.id)?.state).toBe('scanning');

    w.fakes.clock.advanceMs(PAST_DEADLINE_MS);
    expect(await w.sweeper.sweep()).toEqual({ ended: 1 });
    // The killed attempt's own `scan_started` is the latest custody, so the deadline reason wins.
    expect(w.repo.item(item.id)).toMatchObject({
      state: 'failed',
      failReason: 'processing_timeout',
    });

    // The killed attempt's scan answers clean after the sweep; the compare-and-set must lose.
    wake({ result: 'clean' });
    expect(await zombie).toEqual({ state: 'failed' });
    expect(w.repo.item(item.id)?.state).toBe('failed');
    expect(await w.repo.countPublic(NO_TX, review.id)).toBe(0);
    expect(w.repo.custodyOf(item.id)).not.toContain('preview_ready');
  });
});
