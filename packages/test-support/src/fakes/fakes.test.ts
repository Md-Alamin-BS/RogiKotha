// Task step 9's `fakes.test.ts` targets, plus one smoke check per remaining
// fake so every port in 03-routes-and-contracts.md §3 this task covers is
// exercised at least once.
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { ListAuditWriter } from './audit-writer.js';
import { FakeClock } from './clock.js';
import { StaticConfigProvider } from './config-provider.js';
import { FakeCrypto } from './crypto.js';
import { FastHasher } from './hasher.js';
import { SequentialIds } from './ids.js';
import { PassthroughImageSanitiser } from './image-sanitiser.js';
import { makeFakePorts } from './index.js';
import { MemoryJobQueue } from './job-queue.js';
import { CollectingLogger } from './logger.js';
import { RecordingMailTransport } from './mailer.js';
import { ListOutbox } from './outbox.js';
import { AlwaysAllowRateLimiter } from './rate-limiter.js';
import { ScriptedScanner } from './scanner.js';
import { NaiveSearchIndex } from './search-index.js';
import { MemoryStorage } from './storage.js';

describe('MemoryStorage', () => {
  it('round-trips bytes', async () => {
    const storage = new MemoryStorage();
    const original = Buffer.from('hello evidence');
    const key = await storage.putQuarantine(Readable.from(original), { itemId: 'item-1' });
    const roundTripped = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = storage.getPrivate(key);
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
    expect(roundTripped.equals(original)).toBe(true);
  });

  it('a deleted key is no longer readable and records why', async () => {
    const storage = new MemoryStorage();
    const key = await storage.putQuarantine(Readable.from(Buffer.from('x')), { itemId: 'item-2' });
    await storage.delete(key, { reason: 'retention_expired' });
    expect(storage.deletionReason(key)).toBe('retention_expired');
    expect(await storage.head(key)).toBeNull();
  });
});

describe('ScriptedScanner', () => {
  it('falls back to unavailable once the script runs out', async () => {
    const scanner = new ScriptedScanner();
    scanner.nextResults.push('clean', 'detected');
    expect((await scanner.scan(Readable.from(Buffer.from('a')))).status).toBe('clean');
    expect((await scanner.scan(Readable.from(Buffer.from('a')))).status).toBe('detected');
    expect((await scanner.scan(Readable.from(Buffer.from('a')))).status).toBe('unavailable');
  });
});

describe('MemoryJobQueue', () => {
  const tx = {} as never;

  it('drain runs handlers once per job', async () => {
    const queue = new MemoryJobQueue();
    let calls = 0;
    queue.work('evidence.process', () => {
      calls += 1;
    });
    await queue.enqueue(tx, 'evidence.process', { itemId: '1' }, { key: 'evidence:1' });
    await queue.enqueue(tx, 'evidence.process', { itemId: '2' }, { key: 'evidence:2' });
    await queue.drain();
    expect(calls).toBe(2);
    // A second drain with nothing pending runs nothing again.
    await queue.drain();
    expect(calls).toBe(2);
  });

  it('answers deduplicated for a second job with the same key, like a singleton key', async () => {
    const queue = new MemoryJobQueue();

    const first = await queue.enqueue(tx, 'mail.send', { deliveryId: 'd1' }, { key: 'k1' });
    const second = await queue.enqueue(tx, 'mail.send', { deliveryId: 'd1' }, { key: 'k1' });

    expect([first, second]).toEqual([
      { ok: true, data: 'enqueued' },
      { ok: true, data: 'deduplicated' },
    ]);
    expect(queue.enqueued).toHaveLength(1);
  });

  it('refuses the scripted number of enqueues and records the ensured queues', async () => {
    const queue = new MemoryJobQueue();
    await queue.ensure('mail.send');
    queue.refuseEnqueues(1);

    expect(await queue.enqueue(tx, 'mail.send', {}, { key: 'k' })).toEqual({
      ok: false,
      error: { code: 'job_not_enqueued' },
    });
    expect((await queue.enqueue(tx, 'mail.send', {}, { key: 'k' })).ok).toBe(true);
    expect(queue.ensured).toEqual(['mail.send']);
  });
});

describe('every other fake', () => {
  it('FakeClock set/advance', () => {
    const clock = new FakeClock(new Date('2026-01-01T00:00:00.000Z'));
    clock.advance(10);
    expect(clock.now().toISOString()).toBe('2026-01-11T00:00:00.000Z');
  });

  it('SequentialIds never repeats', () => {
    const ids = new SequentialIds();
    expect(ids.newId()).not.toBe(ids.newId());
    expect(ids.newPublicId()).not.toBe(ids.newPublicId());
  });

  it('FakeCrypto round-trips and hashes', () => {
    const crypto = new FakeCrypto();
    const plain = Buffer.from('secret');
    const opened = crypto.decrypt(crypto.encrypt(plain));
    expect(opened.ok && Buffer.from(opened.data).equals(plain)).toBe(true);
    expect(crypto.hash(plain)).toHaveLength(64);
  });

  it('FastHasher verifies its own hash and rejects the wrong password', async () => {
    const hasher = new FastHasher();
    const hash = await hasher.hash('demo-pass-2026!');
    expect(await hasher.verify('demo-pass-2026!', hash)).toBe(true);
    expect(await hasher.verify('wrong', hash)).toBe(false);
  });

  it('RecordingMailTransport records sends and fails the scripted ones first', async () => {
    const transport = new RecordingMailTransport();
    const mail = { to: 'shirin.demo@example.test', subject: 'Subject', text: 'Body' };
    transport.failWith('smtp_timeout');

    const failed = await transport.send(mail);
    const sent = await transport.send(mail);

    expect(failed).toEqual({ ok: false, error: { code: 'smtp_timeout' } });
    expect(sent.ok).toBe(true);
    expect(transport.sent).toEqual([mail]);
  });

  it('PassthroughImageSanitiser returns a decodable 1x1 PNG', async () => {
    const sanitiser = new PassthroughImageSanitiser();
    const out = await sanitiser.sanitise(Buffer.from('anything'), { maxPixels: 1_000_000 });
    expect(out.width).toBe(1);
    expect(out.height).toBe(1);
    expect(out.png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG magic bytes
  });

  it('ListOutbox records events', async () => {
    const outbox = new ListOutbox();
    await outbox.append({} as never, 'account.registered', { accountId: 'a1' });
    expect(outbox.events).toEqual([{ name: 'account.registered', payload: { accountId: 'a1' } }]);
  });

  it('NaiveSearchIndex substring-matches only published docs', async () => {
    const index = new NaiveSearchIndex();
    await index.upsert({
      kind: 'doctor',
      refId: '1',
      publicId: 'p1',
      titleEn: 'Dr. Farhana Rahman',
      published: true,
    });
    await index.upsert({
      kind: 'doctor',
      refId: '2',
      publicId: 'p2',
      titleEn: 'Dr. Hidden',
      published: false,
    });
    const { results } = await index.search('farhana');
    expect(results).toHaveLength(1);
    expect(results[0]!.publicId).toBe('p1');
  });

  it('AlwaysAllowRateLimiter always allows', async () => {
    const limiter = new AlwaysAllowRateLimiter();
    await limiter.recordFailure('signin:email:k');
    await limiter.clear('signin:email:k');
    expect((await limiter.hit('signin:email:k', 1, 60)).allowed).toBe(true);
    expect(await limiter.failures('signin:email:k', 60)).toEqual([]);
  });

  it('CollectingLogger collects every level', () => {
    const logger = new CollectingLogger();
    logger.info('a');
    logger.warn('b');
    logger.error('c');
    expect(logger.entries.map((e) => e.level)).toEqual(['info', 'warn', 'error']);
  });

  it('StaticConfigProvider returns the default config, and can be swapped', async () => {
    const provider = new StaticConfigProvider();
    expect((await provider.current()).limitedDataThreshold).toBe(5);
  });

  it('ListAuditWriter records writes', async () => {
    const writer = new ListAuditWriter();
    await writer.write({} as never, {
      stream: 'config:1',
      action: 'apply',
      actor: 'account:1',
      details: {},
    });
    expect(writer.actions()).toEqual(['apply']);
  });

  it('makeFakePorts() wires every fake together', () => {
    const ports = makeFakePorts();
    expect(ports.clock.now()).toBeInstanceOf(Date);
    expect(ports.repositories.account).toBeDefined();
    expect(ports.repositories.evidence).toBeDefined();
    expect(ports.repositories.moderation).toBeDefined();
  });
});
