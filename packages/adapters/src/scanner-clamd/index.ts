// Malware scan through clamd's INSTREAM command (BR4.4 to BR4.6). Anything but a clear OK or FOUND
// is `unavailable`, never `clean`: the caller keeps the item from advancing (fail closed, FD-035).
import net from 'node:net';

import type {
  EvidenceByteStream,
  ScanAbortSignal,
  ScannerPort,
  ScanReport,
  ScanResult,
} from '@rogikotha/application';

export const CLAMD_TIMEOUT_MS = 15_000;
// ASSUMPTION(U48): the version is optional detail, so its query gets a short bound of its own and
// never delays a scan result by the full scan timeout.
const VERSION_TIMEOUT_MS = 2_000;
// clamd's default StreamMaxLength chunking; any size up to its limit works.
const CHUNK_BYTES = 64 * 1024;

export interface ClamdSettings {
  host: string;
  port: number;
  timeoutMs?: number;
}

/** Maps clamd's INSTREAM reply (`stream: OK`, `stream: <name> FOUND`, anything else) to a result. */
export function parseClamdReply(reply: string): ScanResult {
  const text = reply.replace(/\0/g, '').trim();
  if (text === 'stream: OK') return 'clean';
  if (/^stream: .+ FOUND$/.test(text)) return 'infected';
  return 'unavailable';
}

/** `ClamAV 1.4.1/27000/Mon Oct 26 ...` keeps engine and signature versions, drops the date. */
export function parseClamdVersion(reply: string): string | undefined {
  const text = reply.replace(/\0/g, '').trim();
  if (!/^ClamAV \S+/.test(text)) return undefined;
  return text.split('/').slice(0, 2).join('/');
}

function connectHost(host: string): string {
  // Docker Desktop accepts the published port on ::1 but closes it without a reply, and
  // `localhost` resolves to ::1 first on Windows; IPv4 reaches clamd (seen 2026-10-30).
  return host === 'localhost' ? '127.0.0.1' : host;
}

function frame(chunk: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(chunk.byteLength, 0);
  return Buffer.concat([length, chunk]);
}

interface Exchange {
  /** Writes the request once connected; a rejection ends the exchange with `fallback`. */
  send(socket: net.Socket, isSettled: () => boolean): Promise<void>;
  onCancel(): void;
}

/** One clamd connection: resolves with the reply text, or `null` on any failure. Never rejects. */
function exchange(
  settings: ClamdSettings,
  timeoutMs: number,
  signal: ScanAbortSignal,
  request: Exchange,
): Promise<string | null> {
  return new Promise((resolve) => {
    const replyChunks: Buffer[] = [];
    let settled = false;
    let socket: net.Socket | undefined;

    const onAbort = () => finish(null);
    const finish = (reply: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      socket?.destroy();
      if (reply === null) request.onCancel();
      resolve(reply);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    if (signal.aborted) {
      finish(null);
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });

    try {
      socket = net.createConnection({ host: connectHost(settings.host), port: settings.port });
    } catch {
      // An invalid port throws synchronously; that is a scanner we cannot reach.
      finish(null);
      return;
    }
    const connection = socket;
    const reply = () => {
      const text = Buffer.concat(replyChunks).toString('utf8');
      return text === '' ? null : text;
    };
    connection.on('connect', () => {
      request.send(connection, () => settled).catch(() => finish(null));
    });
    connection.on('data', (data: Buffer) => replyChunks.push(data));
    connection.on('end', () => finish(reply()));
    connection.on('error', () => finish(null));
    connection.on('close', () => finish(reply()));
  });
}

function write(socket: net.Socket, data: Buffer | string): Promise<void> {
  if (socket.write(data)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onDrain = () => {
      socket.off('close', onClose);
      resolve();
    };
    const onClose = () => {
      socket.off('drain', onDrain);
      reject(new Error('clamd closed the connection'));
    };
    socket.once('drain', onDrain);
    socket.once('close', onClose);
  });
}

function instream(stream: EvidenceByteStream): Exchange {
  const iterator = stream[Symbol.asyncIterator]();
  let started = false;
  return {
    async send(socket, isSettled) {
      started = true;
      await write(socket, 'zINSTREAM\0');
      try {
        for (;;) {
          const next = await iterator.next();
          if (next.done) break;
          if (isSettled()) return;
          const chunk = next.value;
          for (let offset = 0; offset < chunk.byteLength; offset += CHUNK_BYTES) {
            await write(socket, frame(chunk.subarray(offset, offset + CHUNK_BYTES)));
          }
        }
      } finally {
        if (isSettled()) await iterator.return?.();
      }
      socket.end(Buffer.alloc(4));
    },
    onCancel() {
      // The pump releases the stream itself once it sees the exchange settled.
      if (!started) void iterator.return?.()?.catch(() => undefined);
    },
  };
}

const VERSION_REQUEST: Exchange = {
  async send(socket) {
    await write(socket, 'zVERSION\0');
  },
  onCancel: () => undefined,
};

export function createClamdScanner(settings: ClamdSettings): ScannerPort {
  const timeoutMs = settings.timeoutMs ?? CLAMD_TIMEOUT_MS;
  return {
    async scan(stream, opts): Promise<ScanReport> {
      let request: Exchange;
      try {
        request = instream(stream);
      } catch {
        return { result: 'unavailable' };
      }
      const reply = await exchange(settings, timeoutMs, opts.signal, request);
      const result = reply === null ? 'unavailable' : parseClamdReply(reply);
      if (result === 'unavailable') return { result };
      const versionReply = await exchange(
        settings,
        Math.min(timeoutMs, VERSION_TIMEOUT_MS),
        opts.signal,
        VERSION_REQUEST,
      );
      const scannerVersion = versionReply === null ? undefined : parseClamdVersion(versionReply);
      return scannerVersion === undefined ? { result } : { result, scannerVersion };
    },
  };
}
