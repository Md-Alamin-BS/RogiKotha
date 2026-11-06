// Cases carried over from apps/web/src/server/clamav.test.ts, against a fake clamd on loopback.
import net from 'node:net';
import { Readable } from 'node:stream';

import { afterEach, describe, expect, it } from 'vitest';

import type { EvidenceByteStream } from '@rogikotha/application';

import { CLAMD_TIMEOUT_MS, createClamdScanner, parseClamdReply, parseClamdVersion } from './index';

const VERSION_REPLY = 'ClamAV 1.4.3/27800/Thu Nov  5 09:00:00 2026';

type Behaviour = { reply: string } | 'never' | 'close-early';

interface FakeClamd {
  port: number;
  /** The bytes the client streamed, reassembled from the INSTREAM chunks. */
  received: () => Buffer;
  /** The length prefix of every chunk, the zero terminator included. */
  frameLengths: () => number[];
  commands: () => string[];
  close: () => Promise<void>;
}

/** A clamd stand-in: answers `zVERSION` and reads `zINSTREAM` with length-prefixed chunks. */
async function startFakeClamd(
  behaviour: Behaviour,
  version: string | null = VERSION_REPLY,
): Promise<FakeClamd> {
  const commands: string[] = [];
  const payload: Buffer[] = [];
  const lengths: number[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    let buffer = Buffer.alloc(0);
    let command: string | null = null;
    socket.on('error', () => undefined);
    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (command === null) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        command = buffer.subarray(0, end).toString('utf8');
        commands.push(command);
        buffer = buffer.subarray(end + 1);
        if (command === 'zVERSION') {
          if (version === null) socket.destroy();
          else socket.end(`${version}\0`);
          return;
        }
        if (behaviour === 'close-early') {
          socket.destroy();
          return;
        }
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        lengths.push(length);
        if (length === 0) {
          if (typeof behaviour === 'object') socket.end(`${behaviour.reply}\0`);
          return;
        }
        if (buffer.length < 4 + length) {
          lengths.pop();
          return;
        }
        payload.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: (server.address() as net.AddressInfo).port,
    received: () => Buffer.concat(payload),
    frameLengths: () => [...lengths],
    commands: () => [...commands],
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

/** A port nothing listens on: bind one, then release it. */
async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function bytes(data: Uint8Array): EvidenceByteStream {
  return Readable.from([Buffer.from(data)]);
}

const live = () => new AbortController().signal;

let fake: FakeClamd | undefined;

afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

describe('the clamd scanner', () => {
  it('streams the whole file with INSTREAM in 64 KiB frames and reports a clean file with the version', async () => {
    fake = await startFakeClamd({ reply: 'stream: OK' });
    const body = Buffer.alloc(150_000, 7);
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });

    await expect(scanner.scan(bytes(body), { signal: live() })).resolves.toEqual({
      result: 'clean',
      scannerVersion: 'ClamAV 1.4.3/27800',
    });
    expect(fake.commands()).toEqual(['zINSTREAM', 'zVERSION']);
    expect(fake.received().equals(body)).toBe(true);
    expect(fake.frameLengths()).toEqual([65_536, 65_536, 150_000 - 2 * 65_536, 0]);
  });

  it('streams a multi-chunk upload in order', async () => {
    fake = await startFakeClamd({ reply: 'stream: OK' });
    const parts = [Buffer.from('first-'), Buffer.from('second-'), Buffer.from('third')];
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });

    const report = await scanner.scan(Readable.from(parts), { signal: live() });

    expect(report.result).toBe('clean');
    expect(fake.received().toString()).toBe('first-second-third');
    expect(fake.frameLengths()).toEqual([6, 7, 5, 0]);
  });

  it('reaches a scanner on localhost over IPv4', async () => {
    fake = await startFakeClamd({ reply: 'stream: OK' });
    const scanner = createClamdScanner({ host: 'localhost', port: fake.port });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toMatchObject({
      result: 'clean',
    });
  });

  it('reports a signature match as infected', async () => {
    fake = await startFakeClamd({ reply: 'stream: RogiKotha.Test.Marker.UNOFFICIAL FOUND' });
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(
      scanner.scan(bytes(new TextEncoder().encode('ROGIKOTHA-MALWARE-TEST-MARKER')), {
        signal: live(),
      }),
    ).resolves.toEqual({ result: 'infected', scannerVersion: 'ClamAV 1.4.3/27800' });
  });

  it('reports a clean file without a version when clamd does not answer VERSION', async () => {
    fake = await startFakeClamd({ reply: 'stream: OK' }, null);
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toEqual({
      result: 'clean',
    });
  });

  it.each([
    ['a clamd error reply', 'INSTREAM size limit exceeded. ERROR'],
    ['garbage', 'hello there'],
    ['an OK with trailing text', 'stream: OK but not quite'],
  ])('reports %s as unavailable, never as clean', async (_label, reply) => {
    fake = await startFakeClamd({ reply });
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toEqual({
      result: 'unavailable',
    });
  });

  it('reports a scanner that closes the connection early as unavailable', async () => {
    fake = await startFakeClamd('close-early');
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(
      scanner.scan(bytes(Buffer.alloc(300_000, 1)), { signal: live() }),
    ).resolves.toEqual({ result: 'unavailable' });
  });

  it('reports an unreachable scanner as unavailable (fail closed)', async () => {
    const scanner = createClamdScanner({ host: '127.0.0.1', port: await closedPort() });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toEqual({
      result: 'unavailable',
    });
  });

  it('reports an invalid port as unavailable without rejecting', async () => {
    const scanner = createClamdScanner({ host: '127.0.0.1', port: 70_000 });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toEqual({
      result: 'unavailable',
    });
  });

  it('gives up as unavailable when the scanner never answers', async () => {
    fake = await startFakeClamd('never');
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port, timeoutMs: 200 });
    await expect(scanner.scan(bytes(Buffer.from('x')), { signal: live() })).resolves.toEqual({
      result: 'unavailable',
    });
  });

  it('stops as unavailable when the signal aborts mid-scan', async () => {
    fake = await startFakeClamd('never');
    const controller = new AbortController();
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    const pending = scanner.scan(bytes(Buffer.from('x')), { signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    await expect(pending).resolves.toEqual({ result: 'unavailable' });
  });

  it('does not connect when the signal is already aborted', async () => {
    fake = await startFakeClamd({ reply: 'stream: OK' });
    const controller = new AbortController();
    controller.abort();
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(
      scanner.scan(bytes(Buffer.from('x')), { signal: controller.signal }),
    ).resolves.toEqual({ result: 'unavailable' });
    expect(fake.commands()).toEqual([]);
  });

  it('reports a stream that fails while reading as unavailable', async () => {
    fake = await startFakeClamd('never');
    async function* broken(): EvidenceByteStream {
      yield Buffer.from('partial');
      await Promise.resolve();
      throw new Error('disk read failed');
    }
    const scanner = createClamdScanner({ host: '127.0.0.1', port: fake.port });
    await expect(scanner.scan(broken(), { signal: live() })).resolves.toEqual({
      result: 'unavailable',
    });
  });

  it('waits at most 15 seconds by default', () => {
    expect(CLAMD_TIMEOUT_MS).toBe(15_000);
  });
});

describe('clamd replies', () => {
  it.each([
    ['stream: OK\0', 'clean'],
    ['stream: Eicar-Test-Signature FOUND\0', 'infected'],
    ['stream: OK but not quite', 'unavailable'],
    ['', 'unavailable'],
    ['UNKNOWN COMMAND', 'unavailable'],
  ] as const)('maps %j to %s', (reply, result) => {
    expect(parseClamdReply(reply)).toBe(result);
  });

  it.each([
    [`${VERSION_REPLY}\0`, 'ClamAV 1.4.3/27800'],
    ['ClamAV 1.4.3', 'ClamAV 1.4.3'],
    ['UNKNOWN COMMAND', undefined],
    ['', undefined],
  ] as const)('reads the version from %j', (reply, version) => {
    expect(parseClamdVersion(reply)).toBe(version);
  });
});
