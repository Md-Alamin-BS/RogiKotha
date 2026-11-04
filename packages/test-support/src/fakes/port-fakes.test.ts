// Edge behaviour of the port fakes that fakes.test.ts leaves out: moving time, swapping config,
// refusing tampered ciphertext, searching and suggesting, and reading missing or deleted files.
import { Readable } from 'node:stream';

import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { aConfig } from '../builders/config.js';
import { FakeClock } from './clock.js';
import { StaticConfigProvider } from './config-provider.js';
import { FakeCrypto } from './crypto.js';
import { NaiveSearchIndex, type SearchDoc } from './search-index.js';
import { MemoryStorage } from './storage.js';

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
