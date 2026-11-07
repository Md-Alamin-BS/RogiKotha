// The health route's probes (03-routes-and-contracts.md §1, U50 BR9). Routes under `app/` may not
// import `database`, so the database and queue probes live here.
import { createConnection } from 'node:net';

import { getDb } from './db';
import { readProbeTargets } from './env';

export type ProbeState = 'ok' | 'down' | 'unknown';

export interface HealthReport {
  ok: boolean;
  db: ProbeState;
  queue: ProbeState;
  mail: ProbeState;
  scanner: ProbeState;
  mode: string;
}

/** The part of `net.Socket` the probes use, so tests can pass a fake. */
export interface ProbeSocket {
  on(event: 'connect', listener: () => void): unknown;
  on(event: 'data', listener: (chunk: Buffer | string) => void): unknown;
  on(event: 'error' | 'close', listener: () => void): unknown;
  write(data: string): unknown;
  destroy(): unknown;
}

export type SocketFactory = (port: number, host: string) => ProbeSocket;

const PROBE_TIMEOUT_MS = 2000;

const defaultSocket: SocketFactory = (port, host) => createConnection({ port, host });

/** Runs `work` against a two-second limit; any failure or timeout reads as down. */
async function withinLimit(work: () => Promise<unknown>): Promise<ProbeState> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), PROBE_TIMEOUT_MS);
  });
  try {
    await Promise.race([work(), timeout]);
    return 'ok';
  } catch {
    return 'down';
  } finally {
    clearTimeout(timer);
  }
}

/** `select 1` on the shared pool, within two seconds; any failure reads as down. */
export function probeDatabase(
  query: () => Promise<unknown> = () => getDb().$client.query('select 1'),
): Promise<ProbeState> {
  return withinLimit(query);
}

/** Reads the pg-boss version row, so a missing queue schema reads as down (BR9.1). */
export function probeQueue(
  query: () => Promise<unknown> = () =>
    getDb().$client.query('select 1 from pgboss.version limit 1'),
): Promise<ProbeState> {
  return withinLimit(query);
}

type Verdict = 'ok' | 'down' | 'more';

interface Exchange {
  host: string;
  port: number;
  connect: SocketFactory;
  /** Sent once the connection opens; null waits for the server to speak first. */
  opening: string | null;
  /** Judges everything received so far. */
  judge: (received: string) => Verdict;
  /** Sent after an ok verdict, before the socket is closed. */
  farewell: string | null;
}

function exchange(spec: Exchange): Promise<ProbeState> {
  return new Promise<ProbeState>((resolve) => {
    let socket: ProbeSocket | undefined;
    let received = '';
    let finished = false;
    const finish = (state: ProbeState): void => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        socket?.destroy();
      } catch {
        // The socket is already gone.
      }
      resolve(state);
    };
    const timer = setTimeout(() => finish('down'), PROBE_TIMEOUT_MS);
    try {
      socket = spec.connect(spec.port, spec.host);
    } catch {
      finish('down');
      return;
    }
    const open = socket;
    open.on('connect', () => {
      if (spec.opening !== null) open.write(spec.opening);
    });
    open.on('data', (chunk) => {
      received += chunk.toString();
      const verdict = spec.judge(received);
      if (verdict === 'more') return;
      if (verdict === 'ok' && spec.farewell !== null) {
        try {
          open.write(spec.farewell);
        } catch {
          // The answer was already right; the goodbye is courtesy.
        }
      }
      finish(verdict);
    });
    open.on('error', () => finish('down'));
    open.on('close', () => finish('down'));
  });
}

/** Connects, expects a `220` greeting line, then says QUIT. */
export function probeMail(
  host: string = readProbeTargets().smtpHost,
  port: number = readProbeTargets().smtpPort,
  connect: SocketFactory = defaultSocket,
): Promise<ProbeState> {
  return exchange({
    host,
    port,
    connect,
    opening: null,
    farewell: 'QUIT\r\n',
    judge: (received) => {
      const lineEnd = received.indexOf('\n');
      if (lineEnd === -1)
        return received.length < 3 || received.startsWith('220') ? 'more' : 'down';
      return /^220[ -]/.test(received) ? 'ok' : 'down';
    },
  });
}

/** Sends clamd `zPING` and expects `PONG`. */
export function probeScanner(
  host: string = readProbeTargets().clamdHost,
  port: number = readProbeTargets().clamdPort,
  connect: SocketFactory = defaultSocket,
): Promise<ProbeState> {
  return exchange({
    host,
    port,
    connect,
    opening: 'zPING\0',
    farewell: null,
    judge: (received) => {
      if (received.startsWith('PONG')) return 'ok';
      return received.length >= 4 ? 'down' : 'more';
    },
  });
}

export interface HealthProbes {
  db: () => Promise<ProbeState>;
  queue: () => Promise<ProbeState>;
  mail: () => Promise<ProbeState>;
  scanner: () => Promise<ProbeState>;
}

/**
 * `ok` needs the database, the queue and mail; a down scanner is reported but does not fail it,
 * because evidence fails closed without the scanner and the demo stays usable (BR9.2).
 */
export async function healthReport(overrides: Partial<HealthProbes> = {}): Promise<HealthReport> {
  const probes: HealthProbes = {
    db: () => probeDatabase(),
    queue: () => probeQueue(),
    mail: () => probeMail(),
    scanner: () => probeScanner(),
    ...overrides,
  };
  const [db, queue, mail, scanner] = await Promise.all([
    probes.db(),
    probes.queue(),
    probes.mail(),
    probes.scanner(),
  ]);
  return {
    ok: db === 'ok' && queue === 'ok' && mail === 'ok',
    db,
    queue,
    mail,
    scanner,
    mode: process.env.APP_MODE ?? 'unknown',
  };
}
