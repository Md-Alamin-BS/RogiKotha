// @vitest-environment node
import type {
  DemoCurrentAccount,
  DemoOwnEvidenceRow,
  DemoReviewEditRow,
  EvidenceState,
} from '@rogikotha/contracts';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentAccount } from '@/server/auth/session';
import { scanBytes } from '@/server/clamav';
import { decryptToString, encrypt } from '@/server/crypto';
import { evidence, reviews } from '@/server/data';
import { listOwnEvidenceFiles, uploadEvidence, type EvidenceUploadState } from './evidence';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ getCurrentAccount: vi.fn() }));
vi.mock('@/server/clamav', () => ({ scanBytes: vi.fn() }));
vi.mock('@/server/data', () => ({
  DEMO_READY_EVIDENCE_STATES: ['preview_ready', 'published'],
  reviews: { getOwnReviewForEdit: vi.fn() },
  evidence: {
    addEvidenceItem: vi.fn(),
    markScanResult: vi.fn(),
    listOwnEvidence: vi.fn(),
  },
}));

const REVIEW_PUBLIC_ID = 'r7x2k9m4pq';
const IDLE: EvidenceUploadState = { status: 'idle' };
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3,
]);
const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 9, 9]);

function buildAccount(overrides: Partial<DemoCurrentAccount> = {}): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'abba_of_two',
    displayName: 'Abba of two',
    locale: 'en',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

function buildOwnReview(): DemoReviewEditRow {
  return {
    id: '0190f5a2-0000-7000-8000-0000000000r1',
    publicId: REVIEW_PUBLIC_ID,
    doctorId: '0190f5a2-0000-7000-8000-0000000000d1',
    title: 'A synthetic visit',
    body: 'Synthetic body',
    sentiment: null,
    outcome: null,
    version: 1,
  };
}

function buildOwnRow(state: EvidenceState, name = 'scan.png'): DemoOwnEvidenceRow {
  return {
    id: `id-${Math.random()}`,
    publicId: `p${Math.random().toString(36).slice(2, 11)}`,
    state,
    mime: 'image/png',
    size: 2048,
    originalFilenameEnc: encrypt(name),
    createdAt: new Date('2026-10-30T09:00:00Z'),
  };
}

function buildForm(file: File | string | null, reviewPublicId = REVIEW_PUBLIC_ID): FormData {
  const form = new FormData();
  form.set('reviewPublicId', reviewPublicId);
  if (file !== null) form.set('file', file);
  return form;
}

function pngFile(name = 'scan.png', bytes: Uint8Array<ArrayBuffer> = PNG_BYTES): File {
  return new File([bytes], name, { type: 'image/png' });
}

let dir: string;
const savedEnv = { key: process.env.APP_ENCRYPTION_KEY, dir: process.env.EVIDENCE_STORAGE_DIR };

async function storedKeys(): Promise<string[]> {
  return existsSync(dir) ? readdir(dir) : [];
}

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'rk-evidence-action-'));
  dir = path.join(tmp, 'evidence');
  process.env.EVIDENCE_STORAGE_DIR = dir;
  vi.mocked(getCurrentAccount).mockResolvedValue(buildAccount());
  vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(buildOwnReview());
  vi.mocked(evidence.listOwnEvidence).mockResolvedValue([]);
  vi.mocked(evidence.addEvidenceItem).mockResolvedValue({ id: 'item-1', publicId: 'e1e1e1e1e1' });
  vi.mocked(evidence.markScanResult).mockResolvedValue();
  vi.mocked(scanBytes).mockResolvedValue('clean');
});

afterEach(async () => {
  process.env.APP_ENCRYPTION_KEY = savedEnv.key;
  if (savedEnv.dir === undefined) delete process.env.EVIDENCE_STORAGE_DIR;
  else process.env.EVIDENCE_STORAGE_DIR = savedEnv.dir;
  await rm(path.dirname(dir), { recursive: true, force: true });
});

describe('uploading an attachment', () => {
  it('stores a clean PNG privately, records it, scans it and reports it ready', async () => {
    const result = await uploadEvidence(IDLE, buildForm(pngFile('ward-report.png')));

    expect(result).toEqual({
      status: 'uploaded',
      scan: 'clean',
      messageKey: 'ev.upload.done.ready',
    });
    const [key] = await storedKeys();
    const input = vi.mocked(evidence.addEvidenceItem).mock.calls[0]![0];
    expect(input).toMatchObject({
      reviewId: buildOwnReview().id,
      ownerAccountId: buildAccount().accountId,
      storageKey: key,
      mime: 'image/png',
      size: PNG_BYTES.byteLength,
    });
    expect(input.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(decryptToString(input.originalFilenameEnc)).toBe('ward-report.png');
    expect(evidence.markScanResult).toHaveBeenCalledWith('item-1', 'clean');
    expect(scanBytes).toHaveBeenCalledWith(PNG_BYTES);
    expect(revalidatePath).toHaveBeenCalledWith('/[locale]/experiences/[id]', 'page');
  });

  it('takes the type from the bytes: a JPEG sent as image/png is recorded as JPEG', async () => {
    await uploadEvidence(IDLE, buildForm(new File([JPEG_BYTES], 'x.png', { type: 'image/png' })));
    expect(vi.mocked(evidence.addEvidenceItem).mock.calls[0]![0].mime).toBe('image/jpeg');
  });

  it('keeps only the last part of a file name that carries a path', async () => {
    await uploadEvidence(IDLE, buildForm(pngFile('C:\\Users\\rina\\lab result.png')));
    const input = vi.mocked(evidence.addEvidenceItem).mock.calls[0]![0];
    expect(decryptToString(input.originalFilenameEnc)).toBe('lab result.png');
  });

  it('refuses a signed-out visitor and stores nothing', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue(null);

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.signedOut' });
    expect(await storedKeys()).toEqual([]);
    expect(evidence.addEvidenceItem).not.toHaveBeenCalled();
  });

  it("refuses an upload to someone else's experience and stores nothing", async () => {
    vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(null);

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.notFound' });
    expect(reviews.getOwnReviewForEdit).toHaveBeenCalledWith(
      REVIEW_PUBLIC_ID,
      buildAccount().accountId,
    );
    expect(await storedKeys()).toEqual([]);
  });

  it('refuses a malformed experience id without looking it up', async () => {
    const result = await uploadEvidence(IDLE, buildForm(pngFile(), '../../etc'));
    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.notFound' });
    expect(reviews.getOwnReviewForEdit).not.toHaveBeenCalled();
  });

  it('refuses a text file disguised as a PNG', async () => {
    const disguised = new File(['<script>alert(1)</script>'], 'photo.png', { type: 'image/png' });

    const result = await uploadEvidence(IDLE, buildForm(disguised));

    expect(result).toEqual({ status: 'error', messageKey: 'errors.evidence.typeRejected' });
    expect(await storedKeys()).toEqual([]);
    expect(scanBytes).not.toHaveBeenCalled();
  });

  it('refuses a file over 10 MB', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(PNG_BYTES);

    const result = await uploadEvidence(IDLE, buildForm(pngFile('big.png', big)));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.tooLarge' });
    expect(await storedKeys()).toEqual([]);
  });

  it('accepts a file of exactly 10 MB', async () => {
    const limit = new Uint8Array(10 * 1024 * 1024);
    limit.set(PNG_BYTES);
    const result = await uploadEvidence(IDLE, buildForm(pngFile('limit.png', limit)));
    expect(result.status).toBe('uploaded');
  });

  it('refuses a missing or empty file', async () => {
    await expect(uploadEvidence(IDLE, buildForm(null))).resolves.toEqual({
      status: 'error',
      messageKey: 'ev.upload.errors.noFile',
    });
    await expect(uploadEvidence(IDLE, buildForm('not a file'))).resolves.toEqual({
      status: 'error',
      messageKey: 'ev.upload.errors.noFile',
    });
    await expect(
      uploadEvidence(IDLE, buildForm(pngFile('empty.png', new Uint8Array()))),
    ).resolves.toEqual({ status: 'error', messageKey: 'ev.upload.errors.noFile' });
  });

  it('refuses a sixth file on one experience', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue(
      Array.from({ length: 5 }, () => buildOwnRow('preview_ready')),
    );

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.tooMany' });
    expect(evidence.addEvidenceItem).not.toHaveBeenCalled();
  });

  it('does not count files the scan rejected towards the limit', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([
      ...Array.from({ length: 4 }, () => buildOwnRow('quarantined')),
      buildOwnRow('rejected'),
    ]);
    const result = await uploadEvidence(IDLE, buildForm(pngFile()));
    expect(result.status).toBe('uploaded');
  });

  it('keeps the file quarantined as Scan pending when the scanner is unavailable', async () => {
    vi.mocked(scanBytes).mockResolvedValue('error');

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toEqual({
      status: 'uploaded',
      scan: 'error',
      messageKey: 'ev.upload.done.pending',
    });
    expect(evidence.markScanResult).toHaveBeenCalledWith('item-1', 'error');
    expect(await storedKeys()).toHaveLength(1);
  });

  it('reports pending when the scan result cannot be recorded, so the file stays quarantined', async () => {
    vi.mocked(evidence.markScanResult).mockRejectedValue(new Error('connection lost'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toMatchObject({ status: 'uploaded', scan: 'error' });
  });

  it('deletes an infected original from disk and reports it as not accepted', async () => {
    vi.mocked(scanBytes).mockResolvedValue('infected');

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toEqual({
      status: 'uploaded',
      scan: 'infected',
      messageKey: 'ev.upload.done.rejected',
    });
    expect(evidence.markScanResult).toHaveBeenCalledWith('item-1', 'infected');
    expect(await storedKeys()).toEqual([]);
  });

  it('deletes an infected original even when its scan result cannot be recorded', async () => {
    vi.mocked(scanBytes).mockResolvedValue('infected');
    vi.mocked(evidence.markScanResult).mockRejectedValue(new Error('connection lost'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadEvidence(IDLE, buildForm(pngFile()));

    expect(result).toMatchObject({ status: 'uploaded', scan: 'error' });
    expect(await storedKeys()).toEqual([]);
  });

  it('removes the stored file and logs no file name when the database insert fails', async () => {
    vi.mocked(evidence.addEvidenceItem).mockRejectedValue(new Error('db down'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await uploadEvidence(IDLE, buildForm(pngFile('private-name.png')));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.failed' });
    expect(await storedKeys()).toEqual([]);
    expect(JSON.stringify(logged.mock.calls)).not.toContain('private-name');
    expect(JSON.stringify(logged.mock.calls)).not.toContain('abba_of_two');
  });
});

describe("listing the author's own attachments", () => {
  it('maps each file to Ready, Scan pending or Not accepted with its decrypted name', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([
      buildOwnRow('preview_ready', 'xray.png'),
      buildOwnRow('quarantined', 'prescription.jpg'),
      buildOwnRow('rejected', 'odd.png'),
    ]);

    const list = await listOwnEvidenceFiles(REVIEW_PUBLIC_ID);

    expect(list).toMatchObject({ reviewPublicId: REVIEW_PUBLIC_ID, maxFiles: 5 });
    expect(list!.maxBytes).toBe(10 * 1024 * 1024);
    expect(list!.files.map((f) => [f.name, f.status])).toEqual([
      ['xray.png', 'ready'],
      ['prescription.jpg', 'pending'],
      ['odd.png', 'rejected'],
    ]);
    expect(evidence.listOwnEvidence).toHaveBeenCalledWith(
      buildOwnReview().id,
      buildAccount().accountId,
    );
  });

  it('shows a seeded file that is already published as ready', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([buildOwnRow('published', 'scan.png')]);
    const list = await listOwnEvidenceFiles(REVIEW_PUBLIC_ID);
    expect(list!.files.map((f) => f.status)).toEqual(['ready']);
  });

  it('never hands the encrypted name, storage key or internal id to the page', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([buildOwnRow('preview_ready')]);
    const list = await listOwnEvidenceFiles(REVIEW_PUBLIC_ID);
    expect(Object.keys(list!.files[0]!).sort()).toEqual(['name', 'publicId', 'size', 'status']);
  });

  it('shows no name when the stored name cannot be decrypted', async () => {
    const row = buildOwnRow('preview_ready');
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([row]);

    const list = await listOwnEvidenceFiles(REVIEW_PUBLIC_ID);

    expect(list!.files[0]!.name).toBeNull();
  });

  it('is null for a signed-out visitor, a non-author and a malformed id', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValueOnce(null);
    await expect(listOwnEvidenceFiles(REVIEW_PUBLIC_ID)).resolves.toBeNull();

    vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValueOnce(null);
    await expect(listOwnEvidenceFiles(REVIEW_PUBLIC_ID)).resolves.toBeNull();

    await expect(listOwnEvidenceFiles('not-an-id')).resolves.toBeNull();
    expect(evidence.listOwnEvidence).not.toHaveBeenCalled();
  });
});
