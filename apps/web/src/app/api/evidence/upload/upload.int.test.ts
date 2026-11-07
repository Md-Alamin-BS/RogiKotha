// U48 plan Step 39 (`web-int`): `POST /api/evidence/upload` through the real web container, the
// Evidence and Review modules, the Pg repositories and the file writer, against the assigned
// test database and a temporary STORAGE_ROOT. Only the session lookup is stood in for: the
// request context answers the actor of a registered synthetic account.
//
// Needs `pnpm infra:up`, the repo-root `.env`, and the `database` and `test-support-seed`
// projects run first on a fresh test database, as the `test:int` groups do.
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId, type Actor, type DraftPayloadInput } from '@rogikotha/contracts';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestContext, type RequestContext } from '@/server/auth';
import type { WebContainer } from '@/server/container';
import { optionalEnv } from '@/server/env';

import { POST } from './route';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));

const RUN = Date.now().toString(36);
// Member-added doctor names take letters only, so the run id is spelled in letters.
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const STORY =
  'A synthetic account of a calm visit: the doctor listened, explained each dose slowly and wrote it down.';
// A PNG signature and IHDR header with a 1 x 1 size; the worker's structure check is not run here.
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 1,
  0, 0, 0, 1, 8, 2, 0, 0, 0, 0x90, 0x77, 0x53, 0xde,
]);

let container: WebContainer;
let storageRoot: string;
let addressSeq = 0;
let author: TestAccount;
let stranger: TestAccount;
let reviewPublicId: string;

interface TestAccount {
  accountId: string;
  actor: () => Actor;
}

function freshRequest(): CommandRequest {
  addressSeq += 1;
  const address = `198.51.100.${150 + addressSeq}`;
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
  vi.mocked(getRequestContext).mockResolvedValue({
    actor: account.actor(),
    request: freshRequest(),
    session: null,
  } satisfies RequestContext);
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

async function anAccount(label: string): Promise<TestAccount> {
  const result = await registerCommand.execute(
    {
      email: `evidence.int+${label}-${RUN}@example.test`,
      password: 'a synthetic secret 2026',
      username: `ev_${RUN}_${label}`,
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
    period: { year: 2025, month: 4 },
    story: STORY,
    notSure: true,
    title: 'A synthetic visit with a lab report',
    newDoctor: { name: `Dr. Synthetic Evidence ${RUN_LETTERS}` },
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

// The EICAR test string, joined at run time so no source file holds it for a local antivirus.
const EICAR = ['X5O!P%@AP[4\\PZX54(P^)7CC)7}$', 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(
  '',
);

async function uploadRequest(fields: {
  reviewPublicId: string;
  idempotencyKey: string;
  file?: File;
}) {
  const form = new FormData();
  form.set('reviewPublicId', fields.reviewPublicId);
  form.set('idempotencyKey', fields.idempotencyKey);
  form.set(
    'file',
    fields.file ?? new File([PNG_BYTES], 'synthetic-lab-report.png', { type: 'image/png' }),
  );
  const encoded = new Response(form);
  const body = await encoded.arrayBuffer();
  return new Request('http://localhost:3000/api/evidence/upload', {
    method: 'POST',
    body,
    headers: {
      'content-type': encoded.headers.get('content-type') ?? '',
      'content-length': String(body.byteLength),
      // U41 WF3: the route checks Host and Origin first.
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    },
  });
}

async function quarantinedFiles(): Promise<string[]> {
  const dir = path.join(storageRoot, 'quarantine');
  return existsSync(dir) ? readdir(dir) : [];
}

beforeAll(async () => {
  // The container reads DATABASE_URL and STORAGE_ROOT; both point at this run's own places.
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  storageRoot = await mkdtemp(path.join(os.tmpdir(), 'rk-u48-upload-int-'));
  process.env.STORAGE_ROOT = storageRoot;
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  container = (await import('@/server/container')).getContainer();
  author = await anAccount('author');
  stranger = await anAccount('stranger');
  reviewPublicId = await publishQuickReview(author);
}, SLOW);

afterAll(async () => {
  vi.restoreAllMocks();
  const { getDb } = await import('@/server/db');
  await getDb().$client.end();
  await rm(storageRoot, { recursive: true, force: true });
});

beforeEach(() => actAs(author));

describe('POST /api/evidence/upload against the test database (WF1)', () => {
  const idempotencyKey = newId();
  let itemId: string;

  it(
    "quarantines the author's PNG: one item, one file, one evidence.received event",
    async () => {
      const response = await POST(await uploadRequest({ reviewPublicId, idempotencyKey }));
      const body = (await response.json()) as { itemId: string; state: string }[];

      expect(response.status).toBe(200);
      expect(body).toEqual([{ itemId: expect.any(String) as string, state: 'quarantined' }]);
      itemId = body[0]!.itemId;
      const [item] = await query<{ id: string; state: string; detected_mime: string }>(
        'select id, state, detected_mime from evidence_items where public_id = $1',
        [itemId],
      );
      expect(item).toMatchObject({ state: 'quarantined', detected_mime: 'image/png' });
      expect(await quarantinedFiles()).toHaveLength(1);
      expect(
        await countOf(
          "select count(*) as n from outbox_events where name = 'evidence.received' and payload->>'itemId' = $1",
          [item!.id],
        ),
      ).toBe(1);
      expect(
        await countOf(
          "select count(*) as n from evidence_custody_events where item_id = $1 and event = 'received'",
          [item!.id],
        ),
      ).toBe(1);
    },
    SLOW,
  );

  it(
    'answers a repeat with the same key with the same item and keeps one file',
    async () => {
      const response = await POST(await uploadRequest({ reviewPublicId, idempotencyKey }));

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([{ itemId, state: 'quarantined' }]);
      expect(await quarantinedFiles()).toHaveLength(1);
      expect(
        await countOf('select count(*) as n from evidence_items where idempotency_key = $1', [
          idempotencyKey,
        ]),
      ).toBe(1);
    },
    SLOW,
  );

  it(
    "answers 404 to another account on the author's review and writes no file",
    async () => {
      actAs(stranger);
      const itemsBefore = await countOf('select count(*) as n from evidence_items');

      const response = await POST(await uploadRequest({ reviewPublicId, idempotencyKey: newId() }));

      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        error: { code: 'not_found', messageKey: 'ev.upload.errors.notFound' },
      });
      expect(await quarantinedFiles()).toHaveLength(1);
      expect(await countOf('select count(*) as n from evidence_items')).toBe(itemsBefore);
    },
    SLOW,
  );

  it(
    'refuses the EICAR test string in a PNG-named file at intake with type_rejected and writes nothing',
    async () => {
      const itemsBefore = await countOf('select count(*) as n from evidence_items');
      const file = new File([EICAR], 'synthetic-scan.png', { type: 'image/png' });

      const response = await POST(
        await uploadRequest({ reviewPublicId, idempotencyKey: newId(), file }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: 'evidence.type_rejected', messageKey: 'errors.evidence.typeRejected' },
      });
      expect(await quarantinedFiles()).toHaveLength(1);
      expect(await countOf('select count(*) as n from evidence_items')).toBe(itemsBefore);
    },
    SLOW,
  );
});
