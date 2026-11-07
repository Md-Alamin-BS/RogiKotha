// U48 acceptance: as `rk_worker`, against the compose PostgreSQL test database, a quarantined
// original on a temporary storage root is processed by the `evidence.process` handler with a fake
// scanner. The item ends `preview_ready` with its custody rows. Runs in the `worker-int` project
// after `database` and `test-support-seed`, which migrate and seed the database.
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { crc32 } from 'node:zlib';

import { createProcessEvidence } from '@rogikotha/application/worker';
import type { NewQuarantinedEvidence } from '@rogikotha/application';
import { PgEvidenceRepository, PgUnitOfWork, closeDb, createDb } from '@rogikotha/database';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildContainer, type WorkerContainer } from '../container.js';
import { loadEnv } from '../env.js';
import { evidenceProcessHandler } from './evidence-process.js';

/** `DATABASE_URL_TEST` with `rk_worker`'s credentials, as `packages/database/src/test-setup.ts` derives it. */
function workerUrlForTestDb(testUrl: string): string {
  const url = new URL(testUrl);
  url.username = 'rk_worker';
  url.password = 'rk_worker';
  return url.toString();
}

const be32 = (n: number): Buffer => {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(n);
  return out;
};

function pngChunk(type: string, data: Buffer = Buffer.alloc(0)): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  return Buffer.concat([be32(data.length), typeAndData, be32(crc32(typeAndData))]);
}

/** A 1x1 grey PNG: signature, IHDR, one IDAT, IEND. */
function aPng(): Buffer {
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', Buffer.concat([be32(1), be32(1), Buffer.from([8, 0, 0, 0, 0])])),
    pngChunk('IDAT', Buffer.from([0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01])),
    pngChunk('IEND'),
  ]);
}

const testUrl = process.env.DATABASE_URL_TEST ?? '';
const app = createDb(testUrl);
const repo = new PgEvidenceRepository();
let root: string;
let worker: WorkerContainer;

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'rk-evidence-int-'));
  await mkdir(path.join(root, 'quarantine'), { recursive: true });
  worker = buildContainer(
    loadEnv({
      ...process.env,
      DATABASE_URL_WORKER: workerUrlForTestDb(testUrl),
      MAIL_RECIPIENT_KEY: Buffer.alloc(32, 7).toString('base64'),
      STORAGE_ROOT: root,
    }),
  );
});

afterAll(async () => {
  await worker.close();
  await closeDb(app.pool);
  await rm(root, { recursive: true, force: true });
});

async function seededIds(): Promise<{ reviewId: string; accountId: string }> {
  const review = await app.pool.query<{ id: string }>(
    'select id from reviews order by created_at limit 1',
  );
  const account = await app.pool.query<{ id: string }>(
    'select id from account_profiles order by created_at limit 1',
  );
  const reviewId = review.rows[0]?.id;
  const accountId = account.rows[0]?.id;
  if (reviewId === undefined || accountId === undefined) {
    throw new Error('the seeded test database has no review or account');
  }
  return { reviewId, accountId };
}

async function intake(body: Buffer): Promise<{ itemId: string; storageKey: string }> {
  const { reviewId, accountId } = await seededIds();
  const storageKey = randomBytes(16).toString('hex');
  const item: NewQuarantinedEvidence = {
    id: randomUUID(),
    publicId: `ev${randomBytes(6).toString('hex')}`,
    artifactId: randomUUID(),
    reviewId,
    uploadedByAccountId: accountId,
    declaredMime: 'image/png',
    detectedMime: 'image/png',
    originalBytes: body.length,
    originalSha256: createHash('sha256').update(body).digest('hex'),
    originalFilenameEnc: new Uint8Array([1, 2, 3, 4]),
    idempotencyKey: randomUUID(),
    storageKey,
    now: new Date(),
  };
  await writeFile(path.join(root, 'quarantine', storageKey), body);
  await new PgUnitOfWork(app.db).run(async (tx) => {
    await repo.insertQuarantined(tx, item);
    return { ok: true, data: null };
  });
  return { itemId: item.id, storageKey };
}

const cleanScanner = {
  async scan(stream: AsyncIterable<Uint8Array>) {
    for await (const chunk of stream) void chunk;
    return { result: 'clean' as const, scannerVersion: 'fake-1' };
  },
};

describe('evidence.process as rk_worker (U48 WF2)', () => {
  it('moves a quarantined PNG to preview_ready, with its custody rows and a state-change event', async () => {
    const { itemId } = await intake(aPng());
    const ctx = {
      logger: worker.logger,
      processEvidence: createProcessEvidence({ ...worker.evidenceDeps, scanner: cleanScanner }),
    };
    const job = { eventId: randomUUID(), name: 'evidence.received', payload: { itemId } };

    await evidenceProcessHandler(job, ctx, {
      jobId: 'job-int',
      retryCount: 0,
      retryLimit: 3,
      signal: new AbortController().signal,
    });

    const item = await app.pool.query<{ state: string; fail_reason: string | null }>(
      'select state, fail_reason from evidence_items where id = $1',
      [itemId],
    );
    const custody = await app.pool.query<{ event: string }>(
      'select event from evidence_custody_events where item_id = $1 order by created_at, id',
      [itemId],
    );
    const events = await app.pool.query<{ payload: { state?: string } }>(
      "select payload from outbox_events where name = 'evidence.stateChanged' and payload->>'itemId' = $1",
      [itemId],
    );
    expect(item.rows[0]).toEqual({ state: 'preview_ready', fail_reason: null });
    expect(custody.rows.length).toBeGreaterThan(1);
    expect(events.rows.map((row) => row.payload.state)).toContain('preview_ready');
  });
});
