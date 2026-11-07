// U48 smoke (`web-int`, group 3): a PNG uploaded through the route handler is quarantined and not
// counted; once the processor has scanned it with a fake scanner, the count behind
// `EvidenceSection` is 1. Real container and Pg repositories against the compose test database.
// The `web-int` project has no JSX transform, so `EvidenceNote` showing that count is smoked in
// `EvidenceNote.smoke.test.tsx` (jsdom).
//
// Needs `pnpm infra:up`, the repo-root `.env`, and the `database` and `test-support-seed`
// projects run first on a fresh test database, as the `test:int` groups do.
// ASSUMPTION(U48): the worker's processor is built here from the real reader and repository so one
// test spans upload, scan and count; no web test may import these two packages otherwise, hence
// the two suppressions. Proposed ISS row: S4, Area evidence, 'web-int smoke imports adapters and database'.
// eslint-disable-next-line boundaries/dependencies -- builds the worker's processor for the end-to-end smoke
import { createFsEvidenceReader } from '@rogikotha/adapters';
import { registerCommand, type CommandRequest } from '@rogikotha/application';
import { createProcessEvidence } from '@rogikotha/application/worker';
import { ANONYMOUS_ACTOR, newId, type Actor, type DraftPayloadInput } from '@rogikotha/contracts';
// eslint-disable-next-line boundaries/dependencies -- builds the worker's processor for the end-to-end smoke
import { PgEvidenceRepository } from '@rogikotha/database';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import { loadPublicEvidenceCount } from '@/server/actions/review-slots';
import { getRequestContext } from '@/server/auth';
import type { WebContainer } from '@/server/container';
import { optionalEnv } from '@/server/env';

import { POST } from './route';

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(new Headers()) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));

const RUN = Date.now().toString(36);
const RUN_LETTERS = RUN.replace(/\d/g, (digit) => 'abcdefghij'[Number(digit)] ?? 'x');
const SLOW = 60_000;
const STORY =
  'A synthetic account of a calm visit: the doctor listened, explained each dose slowly and wrote it down.';

const be32 = (n: number): Buffer => {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(n);
  return out;
};

function pngChunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  return Buffer.concat([be32(data.length), typeAndData, be32(crc32(typeAndData))]);
}

/** A 1x1 grey PNG the worker's structure check accepts. */
function aPng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', Buffer.concat([be32(1), be32(1), Buffer.from([8, 0, 0, 0, 0])])),
    pngChunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])),
    pngChunk('IEND'),
  ]);
}

const cleanScanner = {
  async scan(stream: AsyncIterable<Uint8Array>) {
    for await (const chunk of stream) void chunk;
    return { result: 'clean' as const, scannerVersion: 'fake-1' };
  },
};

let container: WebContainer;
let storageRoot: string;

function requestOf(): CommandRequest {
  return {
    headers: new Headers({ 'x-forwarded-for': '198.51.100.201' }),
    clientAddress: '198.51.100.201',
    sessionId: null,
  };
}

async function query<T>(text: string, values: unknown[] = []): Promise<T[]> {
  const { getDb } = await import('@/server/db');
  const { rows } = await getDb().$client.query(text, values);
  return rows as T[];
}

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  storageRoot = await mkdtemp(path.join(os.tmpdir(), 'rk-u48-smoke-'));
  process.env.STORAGE_ROOT = storageRoot;
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
  await rm(storageRoot, { recursive: true, force: true });
});

it(
  'counts an uploaded PNG for the public only after the scan has passed',
  async () => {
    const call = (actor: Actor) => ({ actor, request: requestOf(), ports: container.ports });
    const registered = await registerCommand.execute(
      {
        email: `evidence.smoke+${RUN}@example.test`,
        password: 'a synthetic secret 2026',
        username: `evs_${RUN}`,
        displayName: 'Synthetic smoke author',
        locale: 'en',
        ageConfirmed: true,
        termsAccepted: true,
      },
      call(ANONYMOUS_ACTOR('en', newId())),
    );
    if (!registered.ok) throw new Error(`register failed: ${registered.error.code}`);
    const { accountId } = registered.data;
    const author = (): Actor => ({
      kind: 'account',
      accountId,
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale: 'en',
      correlationId: newId(),
    });
    const payload: DraftPayloadInput = {
      target: 'doctor',
      mode: 'quick',
      relationship: 'self',
      period: { year: 2025, month: 4 },
      story: STORY,
      notSure: true,
      title: 'A synthetic visit with a lab report',
      newDoctor: { name: `Dr. Synthetic Smoke ${RUN_LETTERS}` },
      identityMode: 'named',
    };
    const saved = await container.review.saveDraft.execute({ payload }, call(author()));
    if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
    const published = await container.review.publish.execute(
      { draftId: saved.data.draftId, identityMode: 'named', attestation: true },
      call(author()),
    );
    if (!published.ok) throw new Error(`publish failed: ${published.error.code}`);
    const reviewPublicId = published.data.publicId;
    const [review] = await query<{ id: string }>('select id from reviews where public_id = $1', [
      reviewPublicId,
    ]);
    const reviewId = review!.id;

    vi.mocked(getRequestContext).mockResolvedValue({
      actor: author(),
      request: requestOf(),
      session: null,
    });
    const form = new FormData();
    form.set('reviewPublicId', reviewPublicId);
    form.set('idempotencyKey', newId());
    form.set(
      'file',
      new File([Uint8Array.from(aPng())], 'synthetic-report.png', { type: 'image/png' }),
    );
    const encoded = new Response(form);
    const body = await encoded.arrayBuffer();
    const response = await POST(
      new Request('http://localhost:3000/api/evidence/upload', {
        method: 'POST',
        body,
        headers: {
          'content-type': encoded.headers.get('content-type') ?? '',
          'content-length': String(body.byteLength),
        },
      }),
    );
    const uploaded = (await response.json()) as { itemId: string; state: string }[];

    expect(response.status).toBe(200);
    expect(uploaded[0]?.state).toBe('quarantined');
    expect(await container.publicEvidence.countPublicEvidence(reviewId)).toBe(0);

    const [item] = await query<{ id: string }>(
      'select id from evidence_items where public_id = $1',
      [uploaded[0]!.itemId],
    );
    const processEvidence = createProcessEvidence({
      unitOfWork: container.ports.unitOfWork,
      evidenceRepository: new PgEvidenceRepository(),
      files: createFsEvidenceReader(storageRoot),
      scanner: cleanScanner,
      outbox: container.ports.outbox,
      clock: container.ports.clock,
      logger: container.ports.logger,
      hasher: container.ports.crypto,
    });
    const result = await processEvidence({
      itemId: item!.id,
      attempt: 1,
      lastAttempt: false,
      signal: new AbortController().signal,
    });

    expect(result.state).toBe('preview_ready');
    expect(await container.publicEvidence.countPublicEvidence(reviewId)).toBe(1);
    // The slot's own read: the count `EvidenceSection` hands to `EvidenceNote`.
    expect(await loadPublicEvidenceCount(reviewPublicId)).toBe(1);
    expect(await loadPublicEvidenceCount('unknownid0')).toBeNull();
  },
  SLOW,
);
