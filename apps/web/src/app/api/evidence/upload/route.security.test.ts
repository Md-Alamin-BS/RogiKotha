// @vitest-environment node
// U41 plan Step 30 (design § 8.3, WF3, BR3.4, BR4.1–BR4.4): the Host, Origin and size guard lines
// U41 adds to U48's upload route, with the module stood in for. Every value is synthetic.
import { EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP } from '@rogikotha/application';
import type { Actor } from '@rogikotha/contracts';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestContext } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

import { POST } from './route';

vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

// The guard memoises the settings on first use, so they are pinned before any request.
vi.stubEnv('APP_URL', 'http://localhost:3000');

const URL_ = 'http://localhost:3000/api/evidence/upload';
const ORIGIN = 'http://localhost:3000';
const HOST = 'localhost:3000';
const MAX_REQUEST_BYTES = 15_794_176;
const MAX_FILE_BYTES = 15_728_640;
const CORRELATION_ID = '0190f5a2-0000-7000-8000-0000000000cd';
const PNG_HEAD = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
];
const PNG_BYTES = Uint8Array.from([...PNG_HEAD, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
// A Windows executable's `MZ` header, renamed to look like a PNG.
const EXE_BYTES = Uint8Array.from([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0xff, 0xff, 0, 0]);

const commands = {
  admitUpload: { name: 'evidence.admitUpload' },
  checkUpload: { name: 'evidence.checkUpload' },
  intake: { name: 'evidence.intake' },
};
const files = { putQuarantined: vi.fn(), delete: vi.fn() };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const okResult = (data: unknown) => ({ ok: true, data });
const results: Record<string, unknown> = {};

function confirmedAccount(): Actor {
  return {
    kind: 'account',
    accountId: '0190f5a2-0000-7000-8000-000000000002',
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale: 'en',
    correlationId: CORRELATION_ID,
  };
}

function form(file: File = new File([PNG_BYTES], 'synthetic-scan.png', { type: 'image/png' })) {
  const data = new FormData();
  data.set('reviewPublicId', 'r7x2k9m4pq');
  data.set('idempotencyKey', '0190f5a2-0000-7000-8000-00000000c0df');
  data.append('file', file);
  return data;
}

interface RequestOptions {
  headers?: Record<string, string | null>;
  body?: BodyInit;
}

/** A same-origin multipart upload; a `null` header value leaves that header out. */
async function uploadRequest(options: RequestOptions = {}): Promise<Request> {
  const encoded = new Response(form());
  const body = options.body ?? (await encoded.arrayBuffer());
  const headers = new Headers();
  const wanted: Record<string, string | null> = {
    'content-type': encoded.headers.get('content-type'),
    origin: ORIGIN,
    host: HOST,
    ...(body instanceof ArrayBuffer ? { 'content-length': String(body.byteLength) } : {}),
    ...options.headers,
  };
  for (const [name, value] of Object.entries(wanted)) if (value !== null) headers.set(name, value);
  return new Request(URL_, {
    method: 'POST',
    headers,
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

async function multipart(file: File): Promise<Request> {
  const encoded = new Response(form(file));
  const body = await encoded.arrayBuffer();
  return uploadRequest({
    body,
    headers: { 'content-type': encoded.headers.get('content-type') },
  });
}

/** A body that fails the test if anything pulls from it (BR4.2). */
function unreadableBody() {
  const pulls = { count: 0 };
  const body = new ReadableStream<Uint8Array>(
    {
      pull() {
        pulls.count += 1;
        throw new Error('the body was read');
      },
    },
    { highWaterMark: 0 },
  );
  return { body, pulls };
}

/** A chunked body of `total` bytes that counts what is pulled and whether it was cancelled. */
function countedBody(total: number, chunkBytes: number) {
  const seen = { pulled: 0, cancelled: false };
  const chunk = new Uint8Array(chunkBytes);
  const body = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (seen.pulled >= total) {
          controller.close();
          return;
        }
        seen.pulled += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel() {
        seen.cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  return { body, seen };
}

async function json(response: Response) {
  return (await response.json()) as {
    error?: { code?: string; messageKey?: string; correlationId?: string };
  };
}

function calledCommands(): string[] {
  return vi.mocked(runCommand).mock.calls.map(([command]) => (command as { name: string }).name);
}

const warnLines: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  warnLines.length = 0;
  vi.spyOn(console, 'warn').mockImplementation((line: unknown) => {
    warnLines.push(String(line));
  });
  vi.mocked(getContainer).mockReturnValue({
    evidence: { ...commands, files },
    ports: { logger },
  } as unknown as ReturnType<typeof getContainer>);
  results['evidence.admitUpload'] = okResult({});
  results['evidence.checkUpload'] = okResult({ proceed: true });
  results['evidence.intake'] = okResult({
    itemId: 'evq7k2m9xb',
    state: 'quarantined',
    created: true,
  });
  vi.mocked(runCommand).mockImplementation((command) =>
    Promise.resolve(results[(command as { name: string }).name] as never),
  );
  files.putQuarantined.mockResolvedValue(
    okResult({ key: 'c'.repeat(32), bytes: PNG_BYTES.length, sha256: 'd'.repeat(64) }),
  );
  vi.mocked(getRequestContext).mockResolvedValue({
    actor: confirmedAccount(),
    session: null,
    request: { headers: new Headers(), clientAddress: '198.51.100.8', sessionId: null },
  });
});

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('upload route: Host and Origin (WF3 step 1, BR3.4)', () => {
  it.each([
    ['a cross-origin POST', { origin: 'http://evil.example' }],
    ['no Origin with Sec-Fetch-Site cross-site', { origin: null, 'sec-fetch-site': 'cross-site' }],
    ['an Origin of null', { origin: 'null' }],
    ['an unknown Host', { host: 'evil.example' }],
    ['an X-Forwarded-Host that is not allowed', { 'x-forwarded-host': 'evil.example' }],
  ])('answers 403 forbidden to %s and runs no command', async (_label, headers) => {
    const response = await POST(await uploadRequest({ headers }));
    const body = await json(response);

    expect(response.status).toBe(403);
    expect(body.error).toMatchObject({
      code: 'forbidden',
      messageKey: 'errors.common.forbidden',
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(getRequestContext).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it('logs one refusal line with the answer correlation id and no header value', async () => {
    const response = await POST(
      await uploadRequest({ headers: { origin: 'http://evil.example' } }),
    );
    const { error } = await json(response);

    const refusals = warnLines.filter((line) => line.includes('security.request_refused'));
    expect(refusals).toHaveLength(1);
    expect(JSON.parse(refusals[0] ?? '{}')).toMatchObject({
      kind: 'origin',
      status: '403',
      correlationId: error?.correlationId,
    });
    expect(refusals[0]).not.toContain('evil.example');
  });

  it('lets a same-origin POST through to U48', async () => {
    const response = await POST(await uploadRequest());

    expect(response.status).toBe(200);
    expect(calledCommands()).toEqual([
      'evidence.admitUpload',
      'evidence.checkUpload',
      'evidence.intake',
    ]);
  });
});

describe('upload route: the request cap (BR4.1–BR4.3)', () => {
  it('caps a request at the largest file plus 64 KiB, the value U48 also holds', () => {
    expect(MAX_REQUEST_BYTES).toBe(MAX_FILE_BYTES + 65_536);
    expect(EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP).toBe(MAX_REQUEST_BYTES);
  });

  it('answers 413 to a declared length one byte over the cap without touching the body', async () => {
    const { body, pulls } = unreadableBody();

    const response = await POST(
      await uploadRequest({ body, headers: { 'content-length': String(MAX_REQUEST_BYTES + 1) } }),
    );

    expect(response.status).toBe(413);
    expect(response.headers.get('connection')).toBe('close');
    expect(pulls.count).toBe(0);
    expect(getRequestContext).not.toHaveBeenCalled();
  });

  it('answers 400 validation to a Content-Length that is not a number', async () => {
    const { body, pulls } = unreadableBody();

    const response = await POST(
      await uploadRequest({ body, headers: { 'content-length': '12e6' } }),
    );

    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatchObject({
      code: 'validation',
      messageKey: 'errors.common.validation',
    });
    expect(pulls.count).toBe(0);
  });

  it('stops a chunked 16 MB body at the cap, at most one chunk past it, and cancels the source', async () => {
    const chunkBytes = 100_000;
    const { body, seen } = countedBody(16 * 1024 * 1024, chunkBytes);

    const response = await POST(await uploadRequest({ body }));

    expect(response.status).toBe(413);
    expect(seen.pulled).toBeGreaterThan(MAX_REQUEST_BYTES);
    expect(seen.pulled).toBeLessThanOrEqual(MAX_REQUEST_BYTES + chunkBytes);
    expect(seen.cancelled).toBe(true);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  }, 30_000);

  it('reads no body for a signed-out request (BR4.4)', async () => {
    vi.mocked(getRequestContext).mockResolvedValue({
      actor: { kind: 'anonymous', correlationId: CORRELATION_ID } as unknown as Actor,
      session: null,
      request: { headers: new Headers(), clientAddress: '198.51.100.8', sessionId: null },
    });
    const { body, pulls } = unreadableBody();

    const response = await POST(await uploadRequest({ body }));

    expect(response.status).toBe(401);
    expect(pulls.count).toBe(0);
  });

  it.each([
    ['the declared length', () => uploadRequest({ headers: { 'content-length': '15794177' } })],
    ['the counted body', () => uploadRequest({ body: countedBody(16_000_000, 250_000).body })],
  ])('answers every 413 for %s with the AppError of U48’s too-large key', async (_label, build) => {
    const response = await POST(await build());
    const { error } = await json(response);

    expect(response.status).toBe(413);
    expect(error).toEqual({
      code: 'evidence.too_large',
      messageKey: 'errors.evidence.tooLarge',
      correlationId: expect.any(String) as unknown,
    });
  });
});

describe('upload route: U48’s own checks are unchanged (BR4.5)', () => {
  it('keeps U48’s 400 too_large for a 15 MB + 1 byte file inside a request under the cap', async () => {
    const bytes = new Uint8Array(MAX_FILE_BYTES + 1);
    bytes.set(PNG_HEAD);
    const response = await POST(
      await multipart(new File([bytes], 'synthetic-large.png', { type: 'image/png' })),
    );

    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatchObject({
      code: 'evidence.too_large',
      messageKey: 'errors.evidence.tooLarge',
    });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  }, 30_000);

  it('refuses a renamed executable as type_rejected before the storage is called', async () => {
    const response = await POST(
      await multipart(new File([EXE_BYTES], 'synthetic-scan.png', { type: 'image/png' })),
    );

    expect(response.status).toBe(400);
    expect((await json(response)).error).toMatchObject({ code: 'evidence.type_rejected' });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });
});
