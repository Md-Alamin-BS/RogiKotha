import type { DemoScanResult } from '@rogikotha/contracts';
import net from 'node:net';

import { optionalEnv } from './env';

// Malware scan of an upload through clamd's INSTREAM command (FR5.2). Every failure (unreachable
// daemon, timeout, size limit, an unknown reply) is `error`, never `clean`: the caller keeps the
// file quarantined (fail closed, FD-035, Q3).
export const SCAN_TIMEOUT_MS = 15_000;
const CHUNK_BYTES = 64 * 1024;
const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 3310;

export interface ClamdOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
}

/**
 * The clamd address. ASSUMPTION(demo-slice): the repo's `.env` and the worker name these
 * `CLAMD_HOST`/`CLAMD_PORT`; `CLAMAV_HOST`/`CLAMAV_PORT` are read as a fallback.
 */
export function clamdAddress(): { host: string; port: number } {
  const host = optionalEnv('CLAMD_HOST') ?? optionalEnv('CLAMAV_HOST') ?? DEFAULT_HOST;
  const rawPort = optionalEnv('CLAMD_PORT') ?? optionalEnv('CLAMAV_PORT');
  return { host, port: rawPort === undefined ? DEFAULT_PORT : Number(rawPort) };
}

/** Maps clamd's reply (`stream: OK`, `stream: <name> FOUND`, `... ERROR`) to a scan result. */
export function parseClamdReply(reply: string): DemoScanResult {
  const text = reply.replace(/\0/g, '').trim();
  if (text === 'stream: OK') return 'clean';
  if (/^stream: .+ FOUND$/.test(text)) return 'infected';
  return 'error';
}

function chunkFrame(chunk: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(chunk.byteLength, 0);
  return Buffer.concat([length, chunk]);
}

/** Streams `bytes` to clamd and resolves with the result; never rejects. */
export function scanBytes(bytes: Uint8Array, options: ClamdOptions = {}): Promise<DemoScanResult> {
  const address = clamdAddress();
  const host = options.host ?? address.host;
  const port = options.port ?? address.port;
  const timeoutMs = options.timeoutMs ?? SCAN_TIMEOUT_MS;

  return new Promise((resolve) => {
    const replyChunks: Buffer[] = [];
    let settled = false;
    let socket: net.Socket | undefined;

    const finish = (result: DemoScanResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => finish('error'), timeoutMs);

    try {
      // Docker Desktop accepts the published port on ::1 but closes it without a reply, and
      // `localhost` resolves to ::1 first on Windows; IPv4 reaches clamd (seen 2026-10-30).
      socket = net.createConnection({ host: host === 'localhost' ? '127.0.0.1' : host, port });
    } catch {
      // An invalid port throws synchronously; that is a scanner we cannot reach.
      finish('error');
      return;
    }
    const reply = () => parseClamdReply(Buffer.concat(replyChunks).toString('utf8'));
    const connection = socket;
    connection.on('connect', () => streamInstream(connection, bytes));
    connection.on('data', (data: Buffer) => replyChunks.push(data));
    connection.on('end', () => finish(reply()));
    connection.on('error', () => finish('error'));
    connection.on('close', () => finish(reply()));
  });
}

/** `zINSTREAM\0`, then length-prefixed chunks, then a zero-length chunk to end the stream. */
function streamInstream(socket: net.Socket, bytes: Uint8Array): void {
  socket.write('zINSTREAM\0');
  for (let offset = 0; offset < bytes.byteLength; offset += CHUNK_BYTES) {
    socket.write(chunkFrame(bytes.subarray(offset, offset + CHUNK_BYTES)));
  }
  socket.end(Buffer.alloc(4));
}
