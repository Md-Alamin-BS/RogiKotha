// Readiness waits shared by the demo scripts and the e2e global setup (U50, BR8.10). Every wait
// polls a condition until a deadline; there is no fixed sleep (BR1.7).
import net from 'node:net';
import { pathToFileURL } from 'node:url';

export const POLL_INTERVAL_MS = 500;
// One attempt never outlives the deadline, and a hung socket or request is cut after this.
const ATTEMPT_TIMEOUT_MS = 2000;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

/**
 * Polls `attempt` until it resolves `{ ready: true }` or the deadline passes. Rejects with the
 * target, the elapsed time and the last reason seen.
 */
async function poll(target, timeoutMs, intervalMs, attempt) {
  const started = Date.now();
  const deadline = started + timeoutMs;
  let lastReason = 'no attempt finished';
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    try {
      const result = await attempt(Math.min(ATTEMPT_TIMEOUT_MS, remaining));
      if (result.ready) return { target, elapsedMs: Date.now() - started };
      lastReason = result.reason;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
    const left = deadline - Date.now();
    if (left <= 0) break;
    await pause(Math.min(intervalMs, left));
  }
  throw new Error(`${target} not ready after ${Date.now() - started} ms (${lastReason})`);
}

/** One TCP attempt: connect, optionally send `send`, and wait for a reply matching `expect`. */
function tcpAttempt({ host, port, send, expect }, attemptMs) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let received = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ready: false, reason: 'timed out' }), attemptMs);
    const matches = () =>
      expect instanceof RegExp ? expect.test(received) : received.includes(String(expect));
    socket.on('connect', () => {
      if (expect === undefined) return finish({ ready: true });
      if (send !== undefined) socket.write(send);
    });
    socket.on('data', (chunk) => {
      received += chunk.toString('utf8');
      if (matches()) finish({ ready: true });
    });
    socket.on('error', (error) => finish({ ready: false, reason: error.code ?? error.message }));
    socket.on('close', () => finish({ ready: false, reason: 'closed without the expected reply' }));
  });
}

/**
 * Resolves when `host:port` accepts a connection (and, when `expect` is given, answers `send`
 * with a reply containing or matching `expect`, for example ClamAV's `PONG`).
 */
export function waitForTcp({
  host = 'localhost',
  port,
  timeoutMs,
  send,
  expect,
  intervalMs = POLL_INTERVAL_MS,
}) {
  return poll(`tcp ${host}:${port}`, timeoutMs, intervalMs, (attemptMs) =>
    tcpAttempt({ host, port, send, expect }, attemptMs),
  );
}

/**
 * Resolves when `url` answers with status `expect` (default 200) and, when given, `accept`
 * resolves true for the response (for example a JSON body check).
 */
export function waitForHttp({
  url,
  timeoutMs,
  expect = 200,
  accept,
  method = 'GET',
  intervalMs = POLL_INTERVAL_MS,
}) {
  return poll(`http ${url}`, timeoutMs, intervalMs, async (attemptMs) => {
    const response = await fetch(url, { method, signal: AbortSignal.timeout(attemptMs) });
    if (response.status !== expect) {
      await response.body?.cancel();
      return { ready: false, reason: `status ${response.status}, expected ${expect}` };
    }
    if (accept && !(await accept(response))) return { ready: false, reason: 'answer not ready' };
    return { ready: true };
  });
}

/** Parses `tcp <host:port> <seconds>` or `http <url> <seconds>` into a wait, or an error text. */
export function parseCliArgs(argv) {
  const [kind, target, seconds] = argv;
  const usage = 'Usage: node scripts/wait-for.mjs tcp <host:port> <seconds> | http <url> <seconds>';
  const timeoutMs = Number(seconds) * 1000;
  if (!target || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return { error: usage };
  if (kind === 'http') return { wait: () => waitForHttp({ url: target, timeoutMs }), target };
  if (kind === 'tcp') {
    const separator = target.lastIndexOf(':');
    const host = separator > 0 ? target.slice(0, separator) : 'localhost';
    const port = Number(target.slice(separator + 1));
    if (!Number.isInteger(port) || port <= 0) return { error: usage };
    return { wait: () => waitForTcp({ host, port, timeoutMs }), target };
  }
  return { error: usage };
}

async function cli() {
  const parsed = parseCliArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(parsed.error);
    process.exit(1);
  }
  try {
    const { target, elapsedMs } = await parsed.wait();
    process.stdout.write(`${target} ready after ${elapsedMs} ms\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await cli();
