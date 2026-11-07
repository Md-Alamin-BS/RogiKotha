// @vitest-environment node
// U41 plan Step 34, adversarial A1, A2 and A5 (design § 8.5) against the upload route, which the
// proxy does not match: header tricks, a lying Content-Length, 16 MB and 200 MB chunked bodies with
// the process RSS measured, signed-out, unconfirmed and rate-limited senders, several file parts,
// and a credentialed cross-site POST. Written by a separate agent to break the Unit; the module is
// stood in for as in `route.security.test.ts`, and every value is synthetic.
import { ANONYMOUS_ACTOR, type Actor } from '@rogikotha/contracts';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestContext } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

import { POST } from './route';

vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

vi.stubEnv('APP_URL', 'http://localhost:3000');

const URL_ = 'http://localhost:3000/api/evidence/upload';
const ORIGIN = 'http://localhost:3000';
const HOST = 'localhost:3000';
// EVIDENCE_MAX_FILE_BYTES + UPLOAD_OVERHEAD_BYTES (BR4.1).
const MAX_REQUEST_BYTES = 15_794_176;
const MB = 1024 * 1024;
// Node's HTTP parser hands a route at most 64 KiB per chunk.
const WIRE_CHUNK = 64 * 1024;
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 2, 0, 0, 0,
]);
const BOUNDARY = '----rkAdversarialBoundary7Q';

const commands = {
  admitUpload: { name: 'evidence.admitUpload' },
  checkUpload: { name: 'evidence.checkUpload' },
  intake: { name: 'evidence.intake' },
};
const files = { putQuarantined: vi.fn(), delete: vi.fn() };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const results: Record<string, unknown> = {};

function account(emailVerified = true): Actor {
  return {
    kind: 'account',
    accountId: '0190f5a2-0000-7000-8000-000000000a41',
    emailVerified,
    status: 'active',
    capabilities: [],
    locale: 'bn',
    correlationId: '0190f5a2-0000-7000-8000-0000000a41cd',
  };
}

function signedInAs(actor: Actor) {
  vi.mocked(getRequestContext).mockResolvedValue({
    actor,
    session: null,
    request: { headers: new Headers(), clientAddress: '198.51.100.41', sessionId: null },
  });
}

/** A lazily made body of `total` bytes: nothing exists until it is pulled. */
function generatedBody(total: number, chunkBytes = WIRE_CHUNK) {
  const seen = { pulled: 0, cancelled: false };
  const chunk = new Uint8Array(chunkBytes).fill(0x41);
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (seen.pulled >= total) {
          controller.close();
          return;
        }
        seen.pulled += chunk.byteLength;
        // A fresh copy each time, so a reader that keeps chunks really holds the bytes.
        controller.enqueue(chunk.slice());
      },
      cancel() {
        seen.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { body, seen };
}

/** A multipart prefix that opens one huge `file` part, so the parse keeps reading. */
function openFilePart(total: number) {
  const head = new TextEncoder().encode(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="reviewPublicId"\r\n\r\nr7x2k9m4pq\r\n` +
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="a41.png"\r\n` +
      'Content-Type: image/png\r\n\r\n',
  );
  const rest = generatedBody(total - head.byteLength);
  const reader = rest.body.getReader();
  let sentHead = false;
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        if (!sentHead) {
          sentHead = true;
          controller.enqueue(head);
          return;
        }
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel(reason) {
        return reader.cancel(reason);
      },
    },
    { highWaterMark: 0 },
  );
  return { body, seen: rest.seen };
}

function request(body: BodyInit, headers: Record<string, string | null> = {}): Request {
  const all = new Headers();
  const wanted: Record<string, string | null> = {
    'content-type': `multipart/form-data; boundary=${BOUNDARY}`,
    origin: ORIGIN,
    host: HOST,
    ...headers,
  };
  for (const [name, value] of Object.entries(wanted)) if (value !== null) all.set(name, value);
  return new Request(URL_, {
    method: 'POST',
    headers: all,
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

async function encoded(form: FormData): Promise<{ body: ArrayBuffer; type: string }> {
  const response = new Response(form);
  return { body: await response.arrayBuffer(), type: response.headers.get('content-type') ?? '' };
}

function validForm(): FormData {
  const form = new FormData();
  form.set('reviewPublicId', 'r7x2k9m4pq');
  form.set('idempotencyKey', '0190f5a2-0000-7000-8000-00000000a41f');
  return form;
}

function png(name = 'a41.png'): File {
  return new File([PNG_BYTES], name, { type: 'image/png' });
}

function calledCommands(): string[] {
  return vi.mocked(runCommand).mock.calls.map(([command]) => (command as { name: string }).name);
}

async function errorCode(response: Response): Promise<string | undefined> {
  const body = (await response.json()) as { error?: { code?: string } };
  return body.error?.code;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.mocked(getContainer).mockReturnValue({
    evidence: { ...commands, files },
    ports: { logger },
  } as unknown as ReturnType<typeof getContainer>);
  results['evidence.admitUpload'] = { ok: true, data: {} };
  results['evidence.checkUpload'] = { ok: true, data: { proceed: true } };
  results['evidence.intake'] = {
    ok: true,
    data: { itemId: 'evq7k2m9xb', state: 'quarantined', created: true },
  };
  vi.mocked(runCommand).mockImplementation((command) =>
    Promise.resolve(results[(command as { name: string }).name] as never),
  );
  files.putQuarantined.mockResolvedValue({
    ok: true,
    data: { key: 'c'.repeat(32), bytes: PNG_BYTES.length, sha256: 'd'.repeat(64) },
  });
  signedInAs(account());
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('A1 header spoofing on the upload route', () => {
  it.each([
    { host: 'localhost:3000.evil.example' },
    { host: 'evil.example@localhost:3000' },
    { host: '[::1]:3000' },
    { host: 'localhost:3000.' },
    { 'x-forwarded-host': 'evil.example, localhost:3000' },
    { origin: 'https://localhost:3000' },
    { origin: 'http://localhost:3000.evil.example' },
    { origin: 'null' },
    { origin: null, 'sec-fetch-site': 'same-site' },
    { origin: null },
  ])('refuses %j with 403 before the session, a command or a body byte', async (headers) => {
    const { body, seen } = generatedBody(MB);
    const response = await POST(request(body, headers));

    expect(response.status).toBe(403);
    expect(await errorCode(response)).toBe('forbidden');
    expect(seen.pulled).toBe(0);
    expect(getRequestContext).not.toHaveBeenCalled();
    expect(calledCommands()).toEqual([]);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });
});

describe('A2 upload size bypass', () => {
  it('a small declared Content-Length does not let a 16 MB body through', async () => {
    const { body, seen } = openFilePart(16 * MB);
    const response = await POST(request(body, { 'content-length': '200' }));

    expect(response.status).toBe(413);
    expect(await errorCode(response)).toBe('evidence.too_large');
    expect(seen.cancelled).toBe(true);
    // The parse really read up to the cap, then stopped within one wire chunk of it.
    expect(seen.pulled).toBeGreaterThan(MAX_REQUEST_BYTES - WIRE_CHUNK);
    expect(seen.pulled).toBeLessThanOrEqual(MAX_REQUEST_BYTES + WIRE_CHUNK);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it.each([
    ['a declared length of 0', '0'],
    ['no declared length (chunked)', null],
  ])('%s with a 16 MB body answers 413 near the cap', async (_label, length) => {
    const { body, seen } = openFilePart(16 * MB);
    const response = await POST(request(body, { 'content-length': length }));

    expect(response.status).toBe(413);
    expect(seen.pulled).toBeLessThanOrEqual(MAX_REQUEST_BYTES + WIRE_CHUNK);
    expect(seen.cancelled).toBe(true);
  });

  it('declared one byte over the cap answers 413 with Connection: close and reads nothing', async () => {
    const { body, seen } = generatedBody(MAX_REQUEST_BYTES + 1);
    const response = await POST(request(body, { 'content-length': String(MAX_REQUEST_BYTES + 1) }));

    expect(response.status).toBe(413);
    expect(response.headers.get('connection')).toBe('close');
    expect(seen.pulled).toBe(0);
    expect(getRequestContext).not.toHaveBeenCalled();
  });

  it('four chunked 200 MB bodies keep the process RSS bounded', async ({ annotate }) => {
    const before = process.memoryUsage().rss;
    let peak = before;
    for (let round = 0; round < 4; round += 1) {
      const { body, seen } = openFilePart(200 * MB);
      const response = await POST(request(body, { 'content-length': null }));
      expect(response.status).toBe(413);
      expect(seen.pulled).toBeLessThanOrEqual(MAX_REQUEST_BYTES + WIRE_CHUNK);
      peak = Math.max(peak, process.memoryUsage().rss);
    }
    const after = process.memoryUsage().rss;
    const toMb = (bytes: number) => Math.round(bytes / MB);
    await annotate(
      `RSS before ${toMb(before)} MB, peak ${toMb(peak)} MB, after ${toMb(after)} MB ` +
        `(800 MB offered, at most ${toMb(4 * (MAX_REQUEST_BYTES + WIRE_CHUNK))} MB pulled)`,
    );
    // Holding even one whole 200 MB body would push the peak past this; the rest is garbage that
    // has not been collected yet.
    expect(peak - before).toBeLessThan(150 * MB);
  });

  it.each([
    [
      'a signed-out sender',
      () => signedInAs(ANONYMOUS_ACTOR('en', '0190f5a2-0000-7000-8000-0000000a4100')),
      401,
    ],
    ['an unconfirmed account', () => signedInAs(account(false)), 403],
    [
      'a rate-limited account',
      () => {
        results['evidence.admitUpload'] = {
          ok: false,
          error: {
            code: 'evidence.rate_limited',
            messageKey: 'errors.evidence.rateLimited',
            correlationId: '0190f5a2-0000-7000-8000-0000000a41cd',
            retryAfterSec: 60,
          },
        };
      },
      429,
    ],
  ] as const)('%s has its 200 MB body read not at all', async (_label, arrange, status) => {
    arrange();
    const { body, seen } = openFilePart(200 * MB);
    const response = await POST(request(body, { 'content-length': null }));

    expect(response.status).toBe(status);
    expect(seen.pulled).toBe(0);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it('several file parts in one request store nothing', async () => {
    const twoFiles = validForm();
    twoFiles.append('file', png('one.png'));
    twoFiles.append('file', png('two.png'));
    const fileAndText = validForm();
    fileAndText.append('file', png());
    fileAndText.append('file', 'not a file');
    const textOnly = validForm();
    textOnly.append('file', 'iVBORw0KGgo=');

    for (const form of [twoFiles, fileAndText, textOnly]) {
      const { body, type } = await encoded(form);
      const response = await POST(
        request(body, { 'content-type': type, 'content-length': String(body.byteLength) }),
      );
      expect(response.status).toBe(400);
    }
    expect(files.putQuarantined).not.toHaveBeenCalled();
    expect(calledCommands()).not.toContain('evidence.intake');
  });

  it('many small parts that add up past the cap answer 413', async () => {
    const form = validForm();
    form.append('file', png());
    const filler = 'x'.repeat(MB);
    for (let i = 0; i < 16; i += 1) form.append(`pad${i}`, filler);
    const { body, type } = await encoded(form);
    const response = await POST(request(body, { 'content-type': type, 'content-length': null }));

    expect(response.status).toBe(413);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });
});

describe('A5 cross-site use of a signed-in session on the upload route', () => {
  it('refuses a credentialed cross-site POST and never reads the session', async () => {
    const form = validForm();
    form.append('file', png());
    const { body, type } = await encoded(form);
    for (const origin of ['http://127.0.0.1:3129', 'null']) {
      const response = await POST(
        request(body, {
          'content-type': type,
          'content-length': String(body.byteLength),
          origin,
          'sec-fetch-site': 'cross-site',
          cookie: 'better-auth.session_token=synthetic.session.value',
        }),
      );
      expect(response.status).toBe(403);
    }
    expect(getRequestContext).not.toHaveBeenCalled();
    expect(calledCommands()).toEqual([]);
  });
});
