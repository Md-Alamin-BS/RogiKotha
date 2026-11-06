// Edge behaviour of the port fakes that fakes.test.ts leaves out: moving time, swapping config,
// refusing tampered ciphertext, searching and suggesting, and reading missing or deleted files.
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import type { Tx } from '@rogikotha/application';
import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { EVIDENCE_ITEM_STATES, detectImageType, imageStructureValid } from '@rogikotha/domain';
import { describe, expect, it } from 'vitest';

import { aConfig } from '../builders/config.js';
import { evidenceItemIn, imageBytes } from '../builders/evidence.js';
import { FakeClock } from './clock.js';
import { StaticConfigProvider } from './config-provider.js';
import { FakeCrypto } from './crypto.js';
import { InMemoryEvidenceRepository } from './evidence-repository.js';
import { ScriptedEvidenceScanner } from './scanner.js';
import { NaiveSearchIndex, type SearchDoc } from './search-index.js';
import {
  MemoryEvidenceStore,
  MemoryStorage,
  memoryEvidenceReader,
  memoryEvidenceWriter,
} from './storage.js';
import { InMemoryUnitOfWork } from './unit-of-work.js';

describe('FakeClock', () => {
  it('starts at a fixed instant unless told otherwise', () => {
    expect(new FakeClock().now().toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('jumps to an exact instant with set', () => {
    const clock = new FakeClock();

    clock.set(new Date('2027-02-03T04:05:06.000Z'));

    expect(clock.now().toISOString()).toBe('2027-02-03T04:05:06.000Z');
  });

  it('moves time backwards with a negative number of days', () => {
    const clock = new FakeClock(new Date('2026-01-10T00:00:00.000Z'));

    clock.advance(-3);

    expect(clock.now().toISOString()).toBe('2026-01-07T00:00:00.000Z');
  });

  it('hands out a copy so a caller cannot move the clock by editing the date', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));

    clock.now().setFullYear(1999);

    expect(clock.now().toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('StaticConfigProvider', () => {
  it('serves the default config, asynchronously, until it is replaced', async () => {
    await expect(new StaticConfigProvider().current()).resolves.toBe(DEFAULT_CONFIG_VALUES);
  });

  it('serves the replacement after set', async () => {
    const provider = new StaticConfigProvider();
    const replacement = aConfig({ limitedDataThreshold: 9 });

    provider.set(replacement);

    expect((await provider.current()).limitedDataThreshold).toBe(9);
  });
});

describe('FakeCrypto', () => {
  function opened(result: ReturnType<FakeCrypto['decrypt']>): string | null {
    return result.ok ? Buffer.from(result.data).toString('utf8') : null;
  }

  it('encrypts the same bytes to different ciphertexts that both decrypt back', () => {
    const crypto = new FakeCrypto();
    const plain = Buffer.from('same input');

    const first = crypto.encrypt(plain);
    const second = crypto.encrypt(plain);

    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(false);
    expect(opened(crypto.decrypt(first))).toBe('same input');
    expect(opened(crypto.decrypt(second))).toBe('same input');
  });

  it('refuses ciphertext that was altered, or that is too short to hold a tag', () => {
    const crypto = new FakeCrypto();
    const sealed = crypto.encrypt('secret');
    sealed[sealed.length - 1] = (sealed[sealed.length - 1] ?? 0) ^ 0xff;

    expect(crypto.decrypt(sealed)).toEqual({ ok: false, error: { code: 'decrypt_failed' } });
    expect(crypto.decryptText(new Uint8Array(4)).ok).toBe(false);
  });

  it('opens a string it sealed as text', () => {
    const crypto = new FakeCrypto();

    expect(crypto.decryptText(crypto.encrypt('shirin.demo@example.test'))).toEqual({
      ok: true,
      data: 'shirin.demo@example.test',
    });
  });

  it('cannot open what an instance with another key sealed, like the app and mail keys', () => {
    const appCrypto = new FakeCrypto({ keyByte: 1 });
    const mailCrypto = new FakeCrypto({ keyByte: 2 });

    expect(mailCrypto.decrypt(appCrypto.encrypt('a private date')).ok).toBe(false);
  });

  it('gives each purpose its own MAC and refuses hmac without a MAC secret', () => {
    const crypto = new FakeCrypto();
    const mailCrypto = new FakeCrypto({ macSecret: null });

    expect(crypto.hmac('email-key', 'x')).toBe(crypto.hmac('email-key', 'x'));
    expect(crypto.hmac('email-key', 'x')).not.toBe(crypto.hmac('network-key', 'x'));
    expect(() => mailCrypto.hmac('email-key', 'x')).toThrow(/macSecret/);
  });

  it('hashes equal bytes to equal digests and different bytes to different ones', () => {
    const crypto = new FakeCrypto();

    expect(crypto.hash(Buffer.from('a'))).toBe(crypto.hash(Buffer.from('a')));
    expect(crypto.hash(Buffer.from('a'))).not.toBe(crypto.hash(Buffer.from('b')));
  });

  it('draws a different random token each time', () => {
    const crypto = new FakeCrypto();

    const first = crypto.randomToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(crypto.randomToken()).not.toBe(first);
  });
});

function aSearchDoc(overrides: Partial<SearchDoc> = {}): SearchDoc {
  return {
    kind: 'doctor',
    refId: 'ref-1',
    publicId: 'pub-1',
    titleEn: 'Dr. Farhana Rahman',
    published: true,
    ...overrides,
  };
}

function aBengaliOnlyDoc(overrides: Partial<SearchDoc> = {}): SearchDoc {
  return {
    kind: 'doctor',
    refId: 'ref-1',
    publicId: 'pub-1',
    titleBn: 'ডা. ফারহানা',
    published: true,
    ...overrides,
  };
}

describe('NaiveSearchIndex', () => {
  it('replaces a document upserted again under the same kind and reference', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc({ titleEn: 'Old name' }));
    await index.upsert(aSearchDoc({ titleEn: 'New name' }));

    const { results, total } = await index.search('');

    expect(total).toBe(1);
    expect(results[0]?.titleEn).toBe('New name');
  });

  it('stops finding a document once it is removed', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc());

    await index.remove('doctor', 'ref-1');

    expect((await index.search('farhana')).total).toBe(0);
  });

  it('keeps documents of another kind when one is removed', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc({ kind: 'doctor', refId: 'x' }));
    await index.upsert(aSearchDoc({ kind: 'facility', refId: 'x', publicId: 'pub-2' }));

    await index.remove('doctor', 'x');

    expect((await index.search('')).results.map((d) => d.kind)).toEqual(['facility']);
  });

  it('matches case-insensitively across the Bengali title and both bodies', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aBengaliOnlyDoc({ refId: 'a' }));
    await index.upsert(aSearchDoc({ refId: 'b', titleEn: 'Other', bodyEn: 'Long WAIT time' }));
    await index.upsert(aSearchDoc({ refId: 'c', titleEn: 'Another', bodyBn: 'দীর্ঘ অপেক্ষা' }));

    expect((await index.search('ফারহানা')).total).toBe(1);
    expect((await index.search('wait')).results.map((d) => d.refId)).toEqual(['b']);
    expect((await index.search('অপেক্ষা')).results.map((d) => d.refId)).toEqual(['c']);
  });

  it('returns every published document for a blank query and none that are unpublished', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc({ refId: 'a' }));
    await index.upsert(aSearchDoc({ refId: 'b', published: false }));

    expect((await index.search('   ')).results.map((d) => d.refId)).toEqual(['a']);
  });

  it('narrows results to one kind when asked', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc({ kind: 'doctor', refId: 'a' }));
    await index.upsert(aSearchDoc({ kind: 'facility', refId: 'b' }));

    const { results } = await index.search('', { kind: 'facility' });

    expect(results.map((d) => d.refId)).toEqual(['b']);
  });

  it('pages results and still reports the full total', async () => {
    const index = new NaiveSearchIndex();
    for (const refId of ['a', 'b', 'c', 'd', 'e']) await index.upsert(aSearchDoc({ refId }));

    const second = await index.search('', undefined, { page: 2, pageSize: 2 });

    expect(second.results.map((d) => d.refId)).toEqual(['c', 'd']);
    expect(second.total).toBe(5);
  });

  it('suggests published documents by title and caps the list at eight', async () => {
    const index = new NaiveSearchIndex();
    for (let i = 0; i < 10; i += 1) {
      await index.upsert(
        aSearchDoc({ refId: `r${i}`, publicId: `p${i}`, titleEn: `Dr. Rahman ${i}` }),
      );
    }
    await index.upsert(
      aSearchDoc({ refId: 'hidden', titleEn: 'Dr. Rahman hidden', published: false }),
    );
    await index.upsert(aSearchDoc({ refId: 'other', titleEn: 'Dr. Karim' }));

    const suggestions = await index.suggest(' RAHMAN ');

    expect(suggestions).toHaveLength(8);
    expect(suggestions.every((s) => s.title.startsWith('Dr. Rahman'))).toBe(true);
    expect(suggestions.some((s) => s.title.includes('hidden'))).toBe(false);
  });

  it('suggests by Bengali title and falls back to it as the displayed title', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aBengaliOnlyDoc());

    expect(await index.suggest('ফারহানা')).toEqual([
      { kind: 'doctor', publicId: 'pub-1', title: 'ডা. ফারহানা' },
    ]);
  });

  it('suggests nothing when no title matches', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert(aSearchDoc());

    expect(await index.suggest('zzz')).toEqual([]);
  });
});

describe('MemoryStorage', () => {
  async function readAll(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
    return Buffer.concat(chunks);
  }

  it('stores a quarantined upload under a key that names its item', async () => {
    const storage = new MemoryStorage();

    const key = await storage.putQuarantine(Readable.from(Buffer.from('abc')), {
      itemId: 'item-7',
    });

    expect(key.startsWith('quarantine/item-7/')).toBe(true);
    expect(await storage.head(key)).toEqual({ bytes: 3 });
  });

  it('accepts a text stream and stores its bytes', async () => {
    const storage = new MemoryStorage();

    const key = await storage.putQuarantine(Readable.from(['he', 'llo']), { itemId: 'item-8' });

    expect(storage.peek(key)?.toString()).toBe('hello');
  });

  it('stores a derivative under the item named in its metadata', async () => {
    const storage = new MemoryStorage();

    const key = await storage.putDerivative(Buffer.from('png'), { itemId: 'item-9' });

    expect(key.startsWith('public/item-9/')).toBe(true);
    expect(await readAll(storage.getPrivate(key))).toEqual(Buffer.from('png'));
  });

  it('files a derivative under unknown when its metadata names no item', async () => {
    const storage = new MemoryStorage();

    expect(
      (await storage.putDerivative(Buffer.from('png'), {})).startsWith('public/unknown/'),
    ).toBe(true);
    expect(
      (await storage.putDerivative(Buffer.from('png'), { itemId: 42 })).startsWith(
        'public/unknown/',
      ),
    ).toBe(true);
  });

  it('refuses to read a key that was never stored', () => {
    const storage = new MemoryStorage();

    expect(() => storage.getPrivate('quarantine/none/obj-0')).toThrow(/no such key/);
  });

  it('refuses to read a deleted key but still lets a test peek at what was stored', async () => {
    const storage = new MemoryStorage();
    const key = await storage.putQuarantine(Readable.from(Buffer.from('x')), { itemId: 'item-10' });

    await storage.delete(key, { reason: 'retention_expired' });

    expect(() => storage.getPrivate(key)).toThrow(/no such key/);
    expect(storage.peek(key)?.toString()).toBe('x');
  });

  it('reports no size for a key that is missing and no deletion reason for one that is kept', async () => {
    const storage = new MemoryStorage();
    const key = await storage.putQuarantine(Readable.from(Buffer.from('x')), { itemId: 'item-11' });

    expect(await storage.head('missing')).toBeNull();
    expect(storage.deletionReason(key)).toBeUndefined();
    expect(storage.peek('missing')).toBeUndefined();
  });
});

const TX = {} as Tx;

const chunks = (...parts: string[]): Readable =>
  Readable.from(parts.map((part) => Buffer.from(part)));

async function drain(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

describe('memoryEvidenceWriter and memoryEvidenceReader', () => {
  it('builds a writer without read methods and a reader without put methods', () => {
    const store = new MemoryEvidenceStore();

    expect(Object.keys(memoryEvidenceWriter(store)).sort()).toEqual(['delete', 'putQuarantined']);
    expect(Object.keys(memoryEvidenceReader(store)).sort()).toEqual(['delete', 'readQuarantined']);
  });

  it('stores under a 32-hex key with the byte count and sha256, and the reader gets the bytes back', async () => {
    const store = new MemoryEvidenceStore();
    const put = await memoryEvidenceWriter(store).putQuarantined(chunks('ab', 'c'), {
      maxBytes: 10,
    });

    expect(put.ok).toBe(true);
    if (!put.ok) return;
    expect(put.data.key).toMatch(/^[0-9a-f]{32}$/);
    expect(put.data.bytes).toBe(3);
    expect(put.data.sha256).toBe(createHash('sha256').update('abc').digest('hex'));
    const read = await memoryEvidenceReader(store).readQuarantined(put.data.key);
    expect(read.ok).toBe(true);
    if (read.ok) expect((await drain(read.data)).toString()).toBe('abc');
  });

  it('answers too_large past maxBytes and keeps nothing', async () => {
    const store = new MemoryEvidenceStore();
    const put = await memoryEvidenceWriter(store).putQuarantined(chunks('abcd', 'e'), {
      maxBytes: 4,
    });

    expect(put).toEqual({ ok: false, error: { code: 'too_large' } });
    expect(store.files.size).toBe(0);
  });

  it('answers original_missing for a key that was never stored or went missing', async () => {
    const store = new MemoryEvidenceStore();
    const key = store.seed(Uint8Array.from([1, 2]));
    store.lose(key);
    const reader = memoryEvidenceReader(store);

    expect(await reader.readQuarantined(key)).toEqual({
      ok: false,
      error: { code: 'original_missing' },
    });
    expect(await reader.readQuarantined('f'.repeat(32))).toEqual({
      ok: false,
      error: { code: 'original_missing' },
    });
  });

  it('deletes a missing key without an error and records every deletion', async () => {
    const store = new MemoryEvidenceStore();
    const key = store.seed(Uint8Array.from([1]));

    await memoryEvidenceWriter(store).delete(key);
    await memoryEvidenceReader(store).delete('0'.repeat(32));

    expect(store.files.has(key)).toBe(false);
    expect(store.deletedKeys).toEqual([key, '0'.repeat(32)]);
  });

  it('throws once on a forced fault and then works again', async () => {
    const store = new MemoryEvidenceStore();
    const writer = memoryEvidenceWriter(store);
    store.failNext('put');

    await expect(writer.putQuarantined(chunks('x'), { maxBytes: 5 })).rejects.toThrow(
      /forced put fault/,
    );
    expect((await writer.putQuarantined(chunks('x'), { maxBytes: 5 })).ok).toBe(true);
    store.failNext('read');
    await expect(memoryEvidenceReader(store).readQuarantined('x')).rejects.toThrow(/read fault/);
  });
});

describe('ScriptedEvidenceScanner', () => {
  const signal = () => new AbortController().signal;

  it('answers the scripted clean and infected results with a scanner version', async () => {
    const scanner = new ScriptedEvidenceScanner(['clean', 'infected']);

    expect((await scanner.scan(chunks('a'), { signal: signal() })).result).toBe('clean');
    const infected = await scanner.scan(chunks('b'), { signal: signal() });
    expect(infected.result).toBe('infected');
    expect(infected.scannerVersion).toBeTruthy();
    expect(scanner.scanned.map((b) => Buffer.from(b).toString())).toEqual(['a', 'b']);
  });

  it('answers unavailable when scripted and when the script is empty', async () => {
    const scanner = new ScriptedEvidenceScanner(['unavailable']);

    expect(await scanner.scan(chunks('a'), { signal: signal() })).toEqual({
      result: 'unavailable',
    });
    expect(await scanner.scan(chunks('a'), { signal: signal() })).toEqual({
      result: 'unavailable',
    });
  });

  it('hangs until the signal aborts and then answers unavailable', async () => {
    const scanner = new ScriptedEvidenceScanner(['hang']);
    const controller = new AbortController();
    let settled = false;
    const pending = scanner
      .scan(chunks('a'), { signal: controller.signal })
      .finally(() => (settled = true));

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);
    controller.abort();
    expect(await pending).toEqual({ result: 'unavailable' });
  });

  it('answers unavailable for an aborted signal and for a stream that fails, never rejecting', async () => {
    const scanner = new ScriptedEvidenceScanner(['clean', 'clean']);
    const controller = new AbortController();
    controller.abort();
    const broken = new Readable({
      read() {
        this.destroy(new Error('socket closed'));
      },
    });

    expect((await scanner.scan(chunks('a'), { signal: controller.signal })).result).toBe(
      'unavailable',
    );
    expect((await scanner.scan(broken, { signal: signal() })).result).toBe('unavailable');
  });
});

describe('InMemoryEvidenceRepository', () => {
  const NEW = {
    id: 'item-new',
    publicId: 'a1b2c3d4e5',
    artifactId: 'artifact-new',
    reviewId: 'review-9',
    uploadedByAccountId: 'account-9',
    declaredMime: 'image/png',
    detectedMime: 'image/png' as const,
    originalBytes: 100,
    originalSha256: 'a'.repeat(64),
    originalFilenameEnc: Uint8Array.from([1, 2, 3]),
    idempotencyKey: '3f1c2b9e-4d5a-4b6c-8d7e-000000000999',
    storageKey: 'b'.repeat(32),
    now: new Date('2026-02-01T00:00:00Z'),
  };

  it('inserts a quarantined item that counts towards the review and is found by its key', async () => {
    const repo = new InMemoryEvidenceRepository();
    await repo.insertQuarantined(TX, NEW);

    expect(await repo.countCounting(TX, 'review-9')).toEqual({ count: 1, bytes: 100 });
    expect(await repo.findByIdempotencyKey(TX, NEW.idempotencyKey)).toEqual({
      id: 'item-new',
      publicId: 'a1b2c3d4e5',
      reviewId: 'review-9',
      uploadedByAccountId: 'account-9',
      state: 'quarantined',
    });
    await expect(repo.insertQuarantined(TX, { ...NEW, id: 'other' })).rejects.toThrow(
      /duplicate idempotency_key/,
    );
  });

  it('moves an item only from the state it is in (compare-and-set)', async () => {
    const repo = new InMemoryEvidenceRepository();
    const item = repo.seed(evidenceItemIn('scanning'));

    expect(await repo.transition(TX, item.id, 'quarantined', 'validating')).toBe(false);
    expect(await repo.transition(TX, item.id, 'scanning', 'failed', 'scanner_unavailable')).toBe(
      true,
    );
    expect(repo.item(item.id)?.state).toBe('failed');
    expect(repo.item(item.id)?.failReason).toBe('scanner_unavailable');
    expect(await repo.transition(TX, 'missing', 'scanning', 'failed')).toBe(false);
  });

  it('gives the worker no sealed file name and no uploader id', async () => {
    const repo = new InMemoryEvidenceRepository();
    const item = repo.seed(evidenceItemIn('quarantined'));
    await repo.appendCustody(TX, {
      itemId: item.id,
      event: 'received',
      actor: 'account:account-1',
      details: {},
      now: new Date(),
    });

    const facts = await repo.processingFacts(TX, item.id);

    expect(facts).not.toBeNull();
    expect(facts).not.toHaveProperty('originalFilenameEnc');
    expect(facts).not.toHaveProperty('uploadedByAccountId');
    expect(facts?.latestCustody).toBe('received');
    expect(await repo.processingFacts(TX, 'missing')).toBeNull();
  });

  it("lists only the author's own visible items, oldest first", async () => {
    const repo = new InMemoryEvidenceRepository();
    const newer = repo.seed(
      evidenceItemIn('preview_ready', { createdAt: new Date('2026-01-02T00:00:00Z') }),
    );
    const older = repo.seed(
      evidenceItemIn('failed', { createdAt: new Date('2026-01-01T00:00:00Z') }),
    );
    repo.seed(evidenceItemIn('removed'));
    repo.seed(evidenceItemIn('quarantined', { uploadedByAccountId: 'someone-else' }));

    const rows = await repo.listForAuthor(TX, 'review-1', 'account-1');

    expect(rows.map((r) => r.publicId)).toEqual([older.publicId, newer.publicId]);
    expect(await repo.findOwned(TX, older.publicId, 'someone-else')).toBeNull();
  });

  it('finds stuck processing items before a cut-off and counts only public states', async () => {
    const repo = new InMemoryEvidenceRepository();
    const stuck = repo.seed(evidenceItemIn('validating'));
    repo.seed(evidenceItemIn('scanning', { createdAt: new Date('2026-06-01T00:00:00Z') }));
    repo.seed(evidenceItemIn('preview_ready'));
    repo.seed(evidenceItemIn('published'));
    repo.seed(evidenceItemIn('rejected'));

    const rows = await repo.stuckItems(TX, new Date('2026-03-01T00:00:00Z'), 10);

    expect(rows.map((r) => r.id)).toEqual([stuck.id]);
    expect(await repo.countPublic(TX, 'review-1')).toBe(2);
    expect(await repo.countPublicByReview(TX, ['review-1', 'review-2'])).toEqual(
      new Map([['review-1', 2]]),
    );
  });

  it('marks the original deleted so later reads carry no storage key', async () => {
    const repo = new InMemoryEvidenceRepository();
    const item = repo.seed(evidenceItemIn('rejected'));

    await repo.markOriginalDeleted(TX, item.id);

    expect((await repo.processingFacts(TX, item.id))?.storageKey).toBeNull();
  });

  it('rolls back items, custody and outbox together in a failed transaction', async () => {
    const repo = new InMemoryEvidenceRepository();
    const uow = new InMemoryUnitOfWork([repo]);

    await expect(
      uow.run(async (tx) => {
        await repo.insertQuarantined(tx, NEW);
        await repo.appendCustody(tx, {
          itemId: NEW.id,
          event: 'received',
          actor: 'account:account-9',
          details: { bytes: 100 },
          now: NEW.now,
        });
        await repo.outbox.append(tx, 'evidence.received', { itemId: NEW.id });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(repo.items.size).toBe(0);
    expect(repo.custody).toEqual([]);
    expect(repo.outbox.events).toEqual([]);
  });

  it('throws once on a forced fault', async () => {
    const repo = new InMemoryEvidenceRepository();
    repo.failNext('lockReview');

    await expect(repo.lockReview(TX, 'review-1')).rejects.toThrow(/forced lockReview fault/);
    await repo.lockReview(TX, 'review-1');
    expect(repo.lockedReviews).toEqual(['review-1']);
  });
});

describe('evidence builders', () => {
  it('builds an item in every state, with a fail reason only for rejected and failed', () => {
    for (const state of EVIDENCE_ITEM_STATES) {
      const item = evidenceItemIn(state);
      expect(item.state).toBe(state);
      expect(item.failReason !== null).toBe(state === 'rejected' || state === 'failed');
    }
  });

  it('builds a valid PNG and a valid JPEG', () => {
    expect(imageStructureValid(imageBytes({ kind: 'png', width: 3, height: 2 }))).toEqual({
      ok: true,
      mime: 'image/png',
    });
    expect(imageStructureValid(imageBytes({ kind: 'jpeg' }))).toEqual({
      ok: true,
      mime: 'image/jpeg',
    });
    expect(detectImageType(imageBytes({ kind: 'jpeg' }))).toBe('image/jpeg');
  });

  it('builds polyglot and truncated bodies that fail the structure check', () => {
    for (const kind of ['png', 'jpeg'] as const) {
      expect(imageStructureValid(imageBytes({ kind, trailing: [0x3c, 0x3f] })).ok).toBe(false);
      expect(imageStructureValid(imageBytes({ kind, truncate: 1 })).ok).toBe(false);
    }
  });
});
