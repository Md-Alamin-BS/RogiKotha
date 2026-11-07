// @vitest-environment node
// U48 plan Step 38: each row of functional-spec § 4 "Upload request outcome" with the module
// stood in for. The quarantined key goes on every refusal after the write and on a thrown error
// (BR3.4), and no answer or log line carries the submitted file name. Every value is synthetic.
import { ANONYMOUS_ACTOR, type Actor } from '@rogikotha/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestContext } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';

import { POST } from './route';

vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

const URL_ = 'http://localhost:3000/api/evidence/upload';
const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';
const IDEMPOTENCY_KEY = '0190f5a2-0000-7000-8000-00000000c0de';
const PRIVATE_NAME = 'synthetic-private-lab-result';
const KEY = 'a'.repeat(32);
const SHA = 'b'.repeat(64);
const CORRELATION_ID = '0190f5a2-0000-7000-8000-0000000000cc';
// A PNG signature and IHDR chunk header, then some body: enough for `detectImageType`.
const PNG_HEAD = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
];
const PNG_BYTES = Uint8Array.from([...PNG_HEAD, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]);
const MAX_FILE_BYTES = 15_728_640;

type Scripted = Record<string, unknown>;

const commands = {
  admitUpload: { name: 'evidence.admitUpload' },
  checkUpload: { name: 'evidence.checkUpload' },
  intake: { name: 'evidence.intake' },
};
const files = { putQuarantined: vi.fn(), delete: vi.fn() };
const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
let results: Scripted;

function account(overrides: Partial<Actor> = {}): Actor {
  return {
    kind: 'account',
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale: 'en',
    correlationId: CORRELATION_ID,
    ...overrides,
  };
}

function signIn(actor: Actor) {
  vi.mocked(getRequestContext).mockResolvedValue({
    actor,
    session: null,
    request: { headers: new Headers(), clientAddress: '198.51.100.7', sessionId: null },
  });
}

const okResult = (data: unknown) => ({ ok: true, data });
const errResult = (code: string, extra: Scripted = {}) => ({
  ok: false,
  error: { code, messageKey: 'x', correlationId: CORRELATION_ID, ...extra },
});

function pngFile(
  name = `${PRIVATE_NAME}.png`,
  bytes: Uint8Array<ArrayBuffer> = PNG_BYTES,
  type = 'image/png',
) {
  return new File([bytes], name, { type });
}

interface FormOptions {
  reviewPublicId?: string | null;
  idempotencyKey?: string | null;
  files?: (File | string)[];
}

function buildForm(options: FormOptions = {}): FormData {
  const form = new FormData();
  const reviewPublicId =
    options.reviewPublicId === undefined ? REVIEW_PUBLIC_ID : options.reviewPublicId;
  const idempotencyKey =
    options.idempotencyKey === undefined ? IDEMPOTENCY_KEY : options.idempotencyKey;
  if (reviewPublicId !== null) form.set('reviewPublicId', reviewPublicId);
  if (idempotencyKey !== null) form.set('idempotencyKey', idempotencyKey);
  for (const file of options.files ?? [pngFile()]) form.append('file', file);
  return form;
}

/** The multipart body as a browser sends it, with its Content-Length. */
async function uploadRequest(form: FormData, length?: string | null): Promise<Request> {
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  const headers = new Headers({ 'content-type': encoded.headers.get('content-type') ?? '' });
  const declared = length === undefined ? String(body.byteLength) : length;
  if (declared !== null) headers.set('content-length', declared);
  return new Request(URL_, { method: 'POST', body, headers });
}

async function post(form: FormData = buildForm(), length?: string | null) {
  const response = await POST(await uploadRequest(form, length));
  const text = await response.text();
  return { response, text, body: JSON.parse(text) as unknown };
}

function calledCommands(): string[] {
  return vi.mocked(runCommand).mock.calls.map(([command]) => (command as { name: string }).name);
}

function intakeInput(): Scripted {
  const call = vi
    .mocked(runCommand)
    .mock.calls.find(([command]) => (command as { name: string }).name === 'evidence.intake');
  return call?.[1] as Scripted;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getContainer).mockReturnValue({
    evidence: { ...commands, files },
    ports: { logger },
  } as unknown as ReturnType<typeof getContainer>);
  results = {
    'evidence.admitUpload': okResult({}),
    'evidence.checkUpload': okResult({ proceed: true }),
    'evidence.intake': okResult({ itemId: 'evq7k2m9xa', state: 'quarantined', created: true }),
  };
  vi.mocked(runCommand).mockImplementation((command) =>
    Promise.resolve(results[(command as { name: string }).name] as never),
  );
  files.putQuarantined.mockResolvedValue(
    okResult({ key: KEY, bytes: PNG_BYTES.length, sha256: SHA }),
  );
  files.delete.mockResolvedValue(undefined);
  signIn(account());
});

describe('POST /api/evidence/upload: 200 (WF1)', () => {
  it('quarantines one PNG and answers its public id', async () => {
    const { response, body } = await post();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body).toEqual([{ itemId: 'evq7k2m9xa', state: 'quarantined' }]);
    expect(calledCommands()).toEqual([
      'evidence.admitUpload',
      'evidence.checkUpload',
      'evidence.intake',
    ]);
    expect(files.putQuarantined).toHaveBeenCalledWith(expect.anything(), {
      maxBytes: MAX_FILE_BYTES,
    });
    expect(intakeInput()).toEqual({
      reviewPublicId: REVIEW_PUBLIC_ID,
      idempotencyKey: IDEMPOTENCY_KEY,
      declaredMime: 'image/png',
      declaredName: `${PRIVATE_NAME}.png`,
      file: { key: KEY, bytes: PNG_BYTES.length, sha256: SHA, detectedMime: 'image/png' },
    });
    expect(files.delete).not.toHaveBeenCalled();
  });

  it('streams the whole file to the writer', async () => {
    let received = 0;
    files.putQuarantined.mockImplementation(async (stream: AsyncIterable<Uint8Array>) => {
      for await (const chunk of stream) received += chunk.length;
      return okResult({ key: KEY, bytes: received, sha256: SHA });
    });

    await post();

    expect(received).toBe(PNG_BYTES.length);
  });

  it('answers a repeated key from the pre-check without writing the file (BR2.5, BR2.8)', async () => {
    results['evidence.checkUpload'] = okResult({
      existing: { itemId: 'evq7k2m9xa', state: 'scanning' },
    });

    const { response, body } = await post();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ itemId: 'evq7k2m9xa', state: 'scanning' }]);
    expect(files.putQuarantined).not.toHaveBeenCalled();
    expect(calledCommands()).not.toContain('evidence.intake');
  });

  it('deletes its own key when intake answers an item the key already made (BR3.4)', async () => {
    results['evidence.intake'] = okResult({
      itemId: 'evq7k2m9xa',
      state: 'quarantined',
      created: false,
    });

    const { response, body } = await post();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ itemId: 'evq7k2m9xa', state: 'quarantined' }]);
    expect(files.delete).toHaveBeenCalledWith(KEY);
  });
});

describe('POST /api/evidence/upload: refusals before the body is read', () => {
  it('answers 401 when signed out, before the rate limit', async () => {
    signIn(ANONYMOUS_ACTOR('en', CORRELATION_ID));

    const { response, body } = await post();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: 'forbidden',
        messageKey: 'ev.upload.errors.signedOut',
        correlationId: CORRELATION_ID,
      },
    });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('answers 403 for an unconfirmed account (BR1.1)', async () => {
    signIn(account({ emailVerified: false }));

    const { response, body } = await post();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: { messageKey: 'ev.upload.errors.unconfirmed' } });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('answers 429 with the wait when the account is over its upload limit (BR2.7)', async () => {
    results['evidence.admitUpload'] = errResult('evidence.rate_limited', { retryAfterSec: 1200 });

    const { response, body } = await post();

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('1200');
    expect(body).toMatchObject({
      error: {
        code: 'evidence.rate_limited',
        messageKey: 'ev.upload.errors.rateLimited',
        retryAfterSec: 1200,
      },
    });
    expect(calledCommands()).toEqual(['evidence.admitUpload']);
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it('refuses a body declared over the cap without reading it (WF1 step 1)', async () => {
    const { response, body } = await post(buildForm(), String(MAX_FILE_BYTES + 65_537));

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: { code: 'evidence.too_large', messageKey: 'errors.evidence.tooLarge' },
    });
    expect(getRequestContext).not.toHaveBeenCalled();
  });

  it('refuses a body without a Content-Length, so it stays bounded', async () => {
    const { response } = await post(buildForm(), null);

    expect(response.status).toBe(411);
    expect(runCommand).not.toHaveBeenCalled();
  });
});

describe('POST /api/evidence/upload: refusals of the form and the file', () => {
  it.each([
    ['no file part', { files: [] }],
    ['a text field named file', { files: ['not a file'] }],
    ['two file parts (Q7)', { files: [pngFile(), pngFile('second.png')] }],
  ])('answers 400 noFile for %s', async (_label, options: FormOptions) => {
    const { response, body } = await post(buildForm(options));

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { messageKey: 'ev.upload.errors.noFile' } });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it.each([
    ['a malformed', '../../etc'],
    ['a missing', null],
  ])('answers 404 for %s review id', async (_label, reviewPublicId) => {
    const { response, body } = await post(buildForm({ reviewPublicId }));

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      error: { code: 'not_found', messageKey: 'ev.upload.errors.notFound' },
    });
    expect(calledCommands()).toEqual(['evidence.admitUpload']);
  });

  it('answers 400 for an idempotency key that is not a UUID', async () => {
    const { response, body } = await post(buildForm({ idempotencyKey: 'again' }));

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'validation' } });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it.each([
    ['a text body named .png', pngFile('notes.png', new TextEncoder().encode('just some text'))],
    ['JPEG bytes named .png', pngFile('scan.png', JPEG_BYTES)],
    ['a PNG sent as image/gif', pngFile('scan.png', PNG_BYTES, 'image/gif')],
    ['a PNG named .exe', pngFile('scan.exe')],
    ['an empty file', pngFile('empty.png', new Uint8Array())],
  ])(
    'answers 400 type_rejected for %s, before anything is written (BR2.1)',
    async (_label, file) => {
      const { response, body } = await post(buildForm({ files: [file] }));

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        error: { code: 'evidence.type_rejected', messageKey: 'errors.evidence.typeRejected' },
      });
      expect(calledCommands()).toEqual(['evidence.admitUpload']);
      expect(files.putQuarantined).not.toHaveBeenCalled();
    },
  );

  it('answers 400 too_large for one byte over 15 MB (BR2.2)', async () => {
    const big = new Uint8Array(MAX_FILE_BYTES + 1);
    big.set(PNG_BYTES);

    const { response, body } = await post(buildForm({ files: [pngFile('big.png', big)] }));

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'evidence.too_large' } });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it('answers 400 too_large when the writer counts past the limit itself', async () => {
    files.putQuarantined.mockResolvedValue({ ok: false, error: { code: 'too_large' } });

    const { response, body } = await post();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'evidence.too_large' } });
    expect(calledCommands()).not.toContain('evidence.intake');
  });
});

describe('POST /api/evidence/upload: refusals by the pre-check and intake', () => {
  it.each([
    ['not_found', 404, 'ev.upload.errors.notFound'],
    ['evidence.too_many', 400, 'errors.evidence.tooMany'],
    ['evidence.total_too_large', 400, 'errors.evidence.totalTooLarge'],
  ])('maps the pre-check %s to %i with nothing written', async (code, status, messageKey) => {
    results['evidence.checkUpload'] = errResult(code);

    const { response, body } = await post();

    expect(response.status).toBe(status);
    expect(body).toMatchObject({ error: { code, messageKey } });
    expect(files.putQuarantined).not.toHaveBeenCalled();
  });

  it.each([
    ['not_found', 404],
    ['evidence.too_many', 400],
    ['evidence.total_too_large', 400],
    ['evidence.type_rejected', 400],
    ['internal', 500],
  ])('deletes the quarantined key when intake answers %s (BR3.4)', async (code, status) => {
    results['evidence.intake'] = errResult(code);

    const { response } = await post();

    expect(response.status).toBe(status);
    expect(files.delete).toHaveBeenCalledWith(KEY);
  });

  it('answers 500 upload_failed and deletes the key when intake throws', async () => {
    vi.mocked(runCommand).mockImplementation((command) => {
      if ((command as { name: string }).name === 'evidence.intake') {
        return Promise.reject(new TypeError('synthetic database fault'));
      }
      return Promise.resolve(results[(command as { name: string }).name] as never);
    });

    const { response, body } = await post();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      error: {
        code: 'evidence.upload_failed',
        messageKey: 'ev.upload.errors.failed',
        correlationId: CORRELATION_ID,
      },
    });
    expect(files.delete).toHaveBeenCalledWith(KEY);
    expect(logger.error).toHaveBeenCalledWith('evidence.upload_failed', {
      correlationId: CORRELATION_ID,
      errorCode: 'TypeError',
    });
  });

  it('answers 500 when the writer throws, with no key to delete', async () => {
    files.putQuarantined.mockRejectedValue(new Error('disk full'));

    const { response } = await post();

    expect(response.status).toBe(500);
    expect(files.delete).not.toHaveBeenCalled();
  });

  it('still answers when deleting the key fails, and logs no name', async () => {
    results['evidence.intake'] = errResult('evidence.too_many');
    files.delete.mockRejectedValue(new Error('synthetic unlink fault'));

    const { response } = await post();

    expect(response.status).toBe(400);
    expect(logger.error).toHaveBeenCalledWith('evidence.quarantine_delete_failed', {
      correlationId: CORRELATION_ID,
      errorCode: 'Error',
    });
  });
});

describe('POST /api/evidence/upload: privacy (BR2.6, BR7.1)', () => {
  it('puts the submitted file name in no answer and no log line', async () => {
    const texts: string[] = [];
    texts.push((await post()).text);
    results['evidence.intake'] = errResult('evidence.too_many');
    texts.push((await post()).text);
    vi.mocked(runCommand).mockRejectedValueOnce(new Error(`${PRIVATE_NAME}.png`));
    texts.push((await post()).text);

    const logged = JSON.stringify([
      logger.info.mock.calls,
      logger.warn.mock.calls,
      logger.error.mock.calls,
    ]);
    for (const text of [...texts, logged]) expect(text).not.toContain(PRIVATE_NAME);
  });
});
