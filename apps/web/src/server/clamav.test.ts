// @vitest-environment node
import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';

import { SCAN_TIMEOUT_MS, clamdAddress, parseClamdReply, scanBytes } from './clamav';

interface FakeClamd {
  port: number;
  /** The bytes the client streamed, reassembled from the INSTREAM chunks. */
  received: () => Buffer;
  command: () => string;
  close: () => Promise<void>;
}

/** A clamd stand-in: reads `zINSTREAM\0` and length-prefixed chunks, then sends `reply`. */
async function startFakeClamd(reply: string | null): Promise<FakeClamd> {
  let command = '';
  const payload: Buffer[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    let buffer = Buffer.alloc(0);
    let commandRead = false;
    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (!commandRead) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        command = buffer.subarray(0, end).toString('utf8');
        buffer = buffer.subarray(end + 1);
        commandRead = true;
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          if (reply !== null) socket.end(`${reply}\0`);
          return;
        }
        if (buffer.length < 4 + length) return;
        payload.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: (server.address() as net.AddressInfo).port,
    received: () => Buffer.concat(payload),
    command: () => command,
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

let fake: FakeClamd | undefined;

afterEach(async () => {
  await fake?.close();
  fake = undefined;
});

describe('the ClamAV scan', () => {
  it('streams the whole file with INSTREAM and reports a clean file as clean', async () => {
    fake = await startFakeClamd('stream: OK');
    // Larger than one 64 KiB chunk, so the chunk framing is exercised.
    const bytes = Buffer.alloc(150_000, 7);

    await expect(scanBytes(bytes, { host: '127.0.0.1', port: fake.port })).resolves.toBe('clean');
    expect(fake.command()).toBe('zINSTREAM');
    expect(fake.received().equals(bytes)).toBe(true);
  });

  it('reaches a scanner on localhost over IPv4', async () => {
    fake = await startFakeClamd('stream: OK');
    await expect(scanBytes(Buffer.from('x'), { host: 'localhost', port: fake.port })).resolves.toBe(
      'clean',
    );
  });

  it('reports a signature match as infected', async () => {
    fake = await startFakeClamd('stream: RogiKotha.Test.Marker.UNOFFICIAL FOUND');
    const marker = new TextEncoder().encode('ROGIKOTHA-MALWARE-TEST-MARKER');
    await expect(scanBytes(marker, { host: '127.0.0.1', port: fake.port })).resolves.toBe(
      'infected',
    );
  });

  it('reports a clamd error reply as an error, never as clean', async () => {
    fake = await startFakeClamd('INSTREAM size limit exceeded. ERROR');
    await expect(scanBytes(Buffer.from('x'), { host: '127.0.0.1', port: fake.port })).resolves.toBe(
      'error',
    );
  });

  it('reports an unreachable scanner as an error (fail closed)', async () => {
    const port = await closedPort();
    await expect(scanBytes(Buffer.from('x'), { host: '127.0.0.1', port })).resolves.toBe('error');
  });

  it('gives up with an error when the scanner never answers', async () => {
    fake = await startFakeClamd(null);
    await expect(
      scanBytes(Buffer.from('x'), { host: '127.0.0.1', port: fake.port, timeoutMs: 200 }),
    ).resolves.toBe('error');
  });

  it('waits at most 15 seconds by default', () => {
    expect(SCAN_TIMEOUT_MS).toBe(15_000);
  });
});

describe('clamd replies', () => {
  it.each([
    ['stream: OK\0', 'clean'],
    ['stream: Eicar-Test-Signature FOUND\0', 'infected'],
    ['stream: OK but not quite', 'error'],
    ['', 'error'],
    ['UNKNOWN COMMAND', 'error'],
  ] as const)('maps %j to %s', (reply, result) => {
    expect(parseClamdReply(reply)).toBe(result);
  });
});

describe('the clamd address', () => {
  const names = ['CLAMD_HOST', 'CLAMD_PORT', 'CLAMAV_HOST', 'CLAMAV_PORT'] as const;
  const saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));

  afterEach(() => {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it('comes from CLAMD_HOST and CLAMD_PORT, as in the repo .env', () => {
    process.env.CLAMD_HOST = 'scanner.internal';
    process.env.CLAMD_PORT = '3399';
    expect(clamdAddress()).toEqual({ host: 'scanner.internal', port: 3399 });
  });

  it('falls back to CLAMAV_HOST and CLAMAV_PORT', () => {
    process.env.CLAMD_HOST = '';
    process.env.CLAMD_PORT = '';
    process.env.CLAMAV_HOST = 'clamav';
    process.env.CLAMAV_PORT = '3311';
    expect(clamdAddress()).toEqual({ host: 'clamav', port: 3311 });
  });
});
