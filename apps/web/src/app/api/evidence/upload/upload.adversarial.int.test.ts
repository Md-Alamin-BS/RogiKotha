// U48 Step 49, adversarial tests A2–A5 (functional-spec § 8) through the real route, the web
// container, the Pg repositories and the file writer (`web-int`), written by a separate agent.
// Only the session lookup is stood in for. Every account, review and file is synthetic.
//
// Needs `pnpm infra:up`, the repo-root `.env`, and the `database` and `test-support-seed`
// projects run first on a fresh test database, as the `test:int` groups do.
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId, type Actor, type DraftPayloadInput } from '@rogikotha/contracts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { listOwnEvidenceFiles, removeEvidence } from '@/server/actions/evidence';
import { getRequestContext, type RequestContext } from '@/server/auth';
import type { WebContainer } from '@/server/container';
import { optionalEnv } from '@/server/env';

import * as uploadRoute from './route';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));

const { POST } = uploadRoute;
const RUN = Date.now().toString(36);
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 120_000;
const MAX_FILE = 15_728_640;
const STORY =
  'A synthetic account of a calm visit: the doctor listened, explained each dose slowly and wrote it down.';
// A PNG signature and IHDR header with a 1 x 1 size: enough for the route's head check.
const PNG_HEAD = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 2, 0, 0, 0, 0x90, 0x77, 0x53, 0xde,
]);

let container: WebContainer;
let storageRoot: string;
let addressSeq = 0;
let accountSeq = 0;

interface TestAccount {
  accountId: string;
  actor: () => Actor;
}

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${20 + addressSeq}`;
  return {
    headers: new Headers({ 'x-forwarded-for': address }),
    clientAddress: address,
    sessionId: null,
  };
}

function call(actor: Actor) {
  return { actor, request: freshRequest(), ports: container.ports };
}

function actAs(account: TestAccount): void {
  vi.mocked(getRequestContext).mockImplementation(() =>
    Promise.resolve({
      actor: account.actor(),
      request: freshRequest(),
      session: null,
    } satisfies RequestContext),
  );
}

async function query<T>(text: string, values: unknown[] = []): Promise<T[]> {
  const { getDb } = await import('@/server/db');
  const { rows } = await getDb().$client.query(text, values);
  return rows as T[];
}

async function countOf(text: string, values: unknown[] = []): Promise<number> {
  const [row] = await query<{ n: string }>(text, values);
  return Number(row?.n ?? 0);
}

async function anAccount(): Promise<TestAccount> {
  accountSeq += 1;
  const label = `adv${accountSeq}`;
  const result = await registerCommand.execute(
    {
      email: `evidence.adv+${label}-${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `eva_${RUN}_${label}`,
      displayName: `Synthetic ${label}`,
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    call(ANONYMOUS_ACTOR('en', newId())),
  );
  if (!result.ok) throw new Error(`register failed: ${result.error.code}`);
  const { accountId } = result.data;
  return {
    accountId,
    actor: () => ({
      kind: 'account',
      accountId,
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale: 'en',
      correlationId: newId(),
    }),
  };
}

async function publishQuickReview(account: TestAccount): Promise<string> {
  const payload: DraftPayloadInput = {
    target: 'doctor',
    mode: 'quick',
    relationship: 'self',
    period: { year: 2025, month: 5 },
    story: STORY,
    notSure: true,
    title: 'A synthetic visit with a prescription',
    newDoctor: { name: `Dr. Synthetic Adversary ${RUN_LETTERS}` },
    identityMode: 'named',
  };
  const saved = await container.review.saveDraft.execute({ payload }, call(account.actor()));
  if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
  const published = await container.review.publish.execute(
    { draftId: saved.data.draftId, identityMode: 'named', attestation: true },
    call(account.actor()),
  );
  if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);
  return published.data.publicId;
}

/** An author with a fresh published review, acting as the request's actor. */
async function anAuthor() {
  const account = await anAccount();
  const reviewPublicId = await publishQuickReview(account);
  actAs(account);
  return { account, reviewPublicId };
}

/** A PNG-headed body of exactly `bytes` bytes; the route only checks the head. */
function pngOfSize(bytes: number): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(new ArrayBuffer(bytes));
  body.set(PNG_HEAD);
  return body;
}

async function uploadRequest(fields: {
  reviewPublicId: string;
  idempotencyKey?: string;
  file?: File;
  contentLength?: string;
}) {
  const form = new FormData();
  form.set('reviewPublicId', fields.reviewPublicId);
  form.set('idempotencyKey', fields.idempotencyKey ?? newId());
  form.set(
    'file',
    fields.file ?? new File([PNG_HEAD], 'synthetic-lab-report.png', { type: 'image/png' }),
  );
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  return new Request('http://localhost:3000/api/evidence/upload', {
    method: 'POST',
    body,
    headers: {
      'content-type': encoded.headers.get('content-type') ?? '',
      'content-length': fields.contentLength ?? String(body.byteLength),
    },
  });
}

async function quarantinedFiles(): Promise<string[]> {
  const dir = path.join(storageRoot, 'quarantine');
  return existsSync(dir) ? readdir(dir) : [];
}

async function itemsOn(reviewPublicId: string): Promise<number> {
  return countOf(
    `select count(*) as n from evidence_items e join reviews r on r.id = e.review_id
     where r.public_id = $1`,
    [reviewPublicId],
  );
}

async function errorCodeOf(response: Response): Promise<string | undefined> {
  const body = (await response.json()) as { error?: { code: string } };
  return body.error?.code;
}

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  storageRoot = await mkdtemp(path.join(os.tmpdir(), 'rk-u48-adversarial-'));
  process.env.STORAGE_ROOT = path.join(storageRoot, 'evidence-root');
  storageRoot = process.env.STORAGE_ROOT;
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  container = (await import('@/server/container')).getContainer();
}, SLOW);

afterAll(async () => {
  vi.restoreAllMocks();
  const { getDb } = await import('@/server/db');
  await getDb().$client.end();
  await rm(path.dirname(storageRoot), { recursive: true, force: true });
});

describe('A2: the size and count limits hold under oversize, lying and concurrent uploads', () => {
  it(
    'refuses a 16 MB file on its Content-Length, before the session is read',
    async () => {
      await anAuthor();
      vi.mocked(getRequestContext).mockClear();
      const file = new File([pngOfSize(16 * 1024 * 1024)], 'synthetic-big.png', {
        type: 'image/png',
      });
      const before = (await quarantinedFiles()).length;

      const response = await POST(await uploadRequest({ reviewPublicId: newId(), file }));

      expect(response.status).toBe(400);
      expect(await errorCodeOf(response)).toBe('evidence.too_large');
      expect(getRequestContext).not.toHaveBeenCalled();
      expect(await quarantinedFiles()).toHaveLength(before);
    },
    SLOW,
  );

  it(
    'refuses a file one byte over 15 MB even when the Content-Length header understates it',
    async () => {
      const { reviewPublicId } = await anAuthor();
      const file = new File([pngOfSize(MAX_FILE + 1)], 'synthetic-big.png', { type: 'image/png' });
      const before = (await quarantinedFiles()).length;

      const response = await POST(
        await uploadRequest({ reviewPublicId, file, contentLength: '4096' }),
      );

      expect(response.status).toBe(400);
      expect(await errorCodeOf(response)).toBe('evidence.too_large');
      expect(await quarantinedFiles()).toHaveLength(before);
      expect(await itemsOn(reviewPublicId)).toBe(0);
    },
    SLOW,
  );

  it(
    'takes exactly one of two eleventh files sent at the same instant, then refuses the next',
    async () => {
      const { reviewPublicId } = await anAuthor();
      for (let i = 0; i < 9; i += 1) {
        expect((await POST(await uploadRequest({ reviewPublicId }))).status).toBe(200);
      }
      const filesBefore = (await quarantinedFiles()).length;

      const [a, b] = await Promise.all([
        uploadRequest({ reviewPublicId }).then(POST),
        uploadRequest({ reviewPublicId }).then(POST),
      ]);
      const outcomes = [
        `${a.status}:${(await errorCodeOf(a.clone())) ?? 'ok'}`,
        `${b.status}:${(await errorCodeOf(b.clone())) ?? 'ok'}`,
      ].sort();
      const eleventh = await POST(await uploadRequest({ reviewPublicId }));

      expect(outcomes).toEqual(['200:ok', '400:evidence.too_many']);
      expect(eleventh.status).toBe(400);
      expect(await errorCodeOf(eleventh)).toBe('evidence.too_many');
      expect(await itemsOn(reviewPublicId)).toBe(10);
      // The refused file is deleted again: one new file on disk, not two.
      expect(await quarantinedFiles()).toHaveLength(filesBefore + 1);
    },
    SLOW,
  );

  it(
    'answers two retries with the same idempotency key at the same instant with one item',
    async () => {
      const { reviewPublicId } = await anAuthor();
      const idempotencyKey = newId();
      const filesBefore = (await quarantinedFiles()).length;

      const [a, b] = await Promise.all([
        uploadRequest({ reviewPublicId, idempotencyKey }).then(POST),
        uploadRequest({ reviewPublicId, idempotencyKey }).then(POST),
      ]);

      expect([a.status, b.status]).toEqual([200, 200]);
      const [bodyA, bodyB] = (await Promise.all([a.json(), b.json()])) as [
        { itemId: string }[],
        { itemId: string }[],
      ];
      expect(bodyA[0]?.itemId).toBe(bodyB[0]?.itemId);
      expect(await itemsOn(reviewPublicId)).toBe(1);
      expect(await quarantinedFiles()).toHaveLength(filesBefore + 1);
    },
    SLOW,
  );

  it(
    'refuses the file that pushes a review past 100 MB in total',
    async () => {
      const { reviewPublicId } = await anAuthor();
      const big = () =>
        new File([pngOfSize(MAX_FILE)], 'synthetic-scan.png', { type: 'image/png' });
      // Six full-size files are 90 MiB; a seventh would make 105.
      for (let i = 0; i < 6; i += 1) {
        expect((await POST(await uploadRequest({ reviewPublicId, file: big() }))).status).toBe(200);
      }
      const filesBefore = (await quarantinedFiles()).length;

      const response = await POST(await uploadRequest({ reviewPublicId, file: big() }));

      expect(response.status).toBe(400);
      expect(await errorCodeOf(response)).toBe('evidence.total_too_large');
      expect(await itemsOn(reviewPublicId)).toBe(6);
      expect(await quarantinedFiles()).toHaveLength(filesBefore);
    },
    SLOW,
  );
});

describe("A3: another account's review and item answer not found and change nothing", () => {
  it(
    "refuses a stranger's upload, list and remove on the author's review and item",
    async () => {
      const { account: author, reviewPublicId } = await anAuthor();
      const first = await POST(await uploadRequest({ reviewPublicId }));
      const [{ itemId }] = (await first.json()) as [{ itemId: string }];
      const stranger = await anAccount();
      actAs(stranger);
      const filesBefore = await quarantinedFiles();
      const itemBefore = await query('select * from evidence_items where public_id = $1', [itemId]);

      const upload = await POST(await uploadRequest({ reviewPublicId }));
      const list = await listOwnEvidenceFiles(reviewPublicId);
      const remove = await removeEvidence(itemId);

      expect(upload.status).toBe(404);
      expect(JSON.stringify(await upload.json())).not.toContain(itemId);
      expect(list).toBeNull();
      expect(remove).toEqual({ status: 'error', messageKey: 'ev.upload.errors.notFound' });
      expect(await quarantinedFiles()).toEqual(filesBefore);
      expect(await query('select * from evidence_items where public_id = $1', [itemId])).toEqual(
        itemBefore,
      );
      actAs(author);
      expect((await listOwnEvidenceFiles(reviewPublicId))?.files).toHaveLength(1);
    },
    SLOW,
  );
});

describe('A4: a crafted file name never reaches outside the evidence root', () => {
  it.each([
    ['a POSIX parent-folder hop', '../../../synthetic-escape.png'],
    ['a Windows parent-folder hop', '..\\..\\..\\synthetic-escape.png'],
    ['an absolute path', '/tmp/synthetic-escape.png'],
  ])(
    'stores the upload under a random key and keeps only the last name segment: %s',
    async (_label, name) => {
      const { reviewPublicId } = await anAuthor();
      const parent = path.dirname(storageRoot);
      const parentBefore = readdirSync(parent).sort();
      const filesBefore = new Set(await quarantinedFiles());

      const response = await POST(
        await uploadRequest({
          reviewPublicId,
          file: new File([PNG_HEAD], name, { type: 'image/png' }),
        }),
      );

      expect(response.status).toBe(200);
      const added = (await quarantinedFiles()).filter((f) => !filesBefore.has(f));
      expect(added).toHaveLength(1);
      expect(added[0]).toMatch(/^[0-9a-f]{32}$/);
      expect(statSync(path.join(storageRoot, 'quarantine', added[0]!)).size).toBe(PNG_HEAD.length);
      expect(readdirSync(parent).sort()).toEqual(parentBefore);
      expect(readdirSync(storageRoot)).toEqual(['quarantine']);
      expect(existsSync(path.join(os.tmpdir(), 'synthetic-escape.png'))).toBe(false);
      const [row] = await query<{ storage_key: string; enc: Buffer }>(
        `select a.storage_key, e.original_filename_enc as enc from evidence_items e
         join evidence_artifacts a on a.item_id = e.id
         join reviews r on r.id = e.review_id where r.public_id = $1`,
        [reviewPublicId],
      );
      expect(row?.storage_key).toBe(added[0]);
      // The name is sealed: the hop is not stored in clear.
      expect(Buffer.from(row!.enc).toString('latin1')).not.toContain('..');
      expect((await listOwnEvidenceFiles(reviewPublicId))?.files[0]?.name).toBe(
        'synthetic-escape.png',
      );
    },
    SLOW,
  );
});

describe('A5: no route returns the bytes of an original', () => {
  const APP_DIR = fileURLToPath(new URL('../../..', import.meta.url));

  function routeFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return routeFiles(full);
      return /^route\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  it('finds no route that reads quarantine, and the upload route answers POST only', () => {
    const routes = routeFiles(APP_DIR);
    expect(routes.length).toBeGreaterThan(0);
    for (const file of routes) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(
        /readQuarantined|createFsEvidenceReader|createReadStream|STORAGE_ROOT|quarantine\//,
      );
    }
    expect(Object.keys(uploadRoute).sort()).toEqual(['POST']);
  });

  it('gives the web tier a file writer without any read method', () => {
    const files = container.evidence.files as unknown as Record<string, unknown>;
    expect(Object.keys(files).sort()).toEqual(['delete', 'putQuarantined']);
    expect(files.readQuarantined).toBeUndefined();
  });
});
