// Adversarial tests, carried over from apps/web/src/server/storage.adversarial.test.ts: try to
// reach a file outside the quarantine folder through a crafted key or a hostile upload.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EvidenceByteStream } from '@rogikotha/application';

import { MalformedEvidenceKeyError, createFsEvidenceReader, createFsEvidenceWriter } from './index';

const KEY = '0123456789abcdef0123456789abcdef';

async function* once(bytes: Uint8Array): EvidenceByteStream {
  await Promise.resolve();
  yield bytes;
}

let tmp: string;
let root: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'rk-storage-fs-adversarial-'));
  root = path.join(tmp, 'evidence');
  await mkdir(path.join(root, 'quarantine'), { recursive: true });
  // A secret beside the evidence folder and one inside the root, one `..` away from quarantine.
  await writeFile(path.join(tmp, 'secret.env'), 'APP_ENCRYPTION_KEY=synthetic');
  await writeFile(path.join(root, 'secret.env'), 'APP_ENCRYPTION_KEY=synthetic');
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('a crafted storage key', () => {
  it.each([
    ['a parent-folder hop', '../secret.env'],
    ['a Windows parent-folder hop', '..\\secret.env'],
    ['a valid key followed by a hop', `${KEY}/../../secret.env`],
    ['a valid key with a trailing newline', `${KEY}\n`],
    ['a valid key with a trailing NUL', `${KEY}\0`],
    ['a valid key with a leading space', ` ${KEY}`],
    ['an upper-case key', KEY.toUpperCase()],
    ['a key one character too long', `${KEY}0`],
    ['a key of full-width digits', '０'.repeat(32)],
    ['a URL-encoded hop', '%2e%2e%2fsecret.env'],
    ['an absolute POSIX path', '/etc/passwd'],
    ['an absolute Windows path', 'C:\\Windows\\win.ini'],
    ['a UNC path', '\\\\server\\share\\x'],
    ['an empty key', ''],
  ])('is refused for reading and deleting: %s', async (_label, key) => {
    const reader = createFsEvidenceReader(root);
    const writer = createFsEvidenceWriter(root);
    await expect(reader.readQuarantined(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    await expect(reader.delete(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    await expect(writer.delete(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    expect(existsSync(path.join(tmp, 'secret.env'))).toBe(true);
    expect(existsSync(path.join(root, 'secret.env'))).toBe(true);
  });

  it('cannot open the half-written temp file of an upload, whose name fails the key pattern', async () => {
    await writeFile(path.join(root, 'quarantine', `.${KEY}.part`), 'partial');
    await expect(
      createFsEvidenceReader(root).readQuarantined(`.${KEY}.part`),
    ).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
  });
});

describe('a hostile upload', () => {
  it('cannot pick the stored file name, since the key never comes from the upload', async () => {
    const put = await createFsEvidenceWriter(root).putQuarantined(
      once(new TextEncoder().encode('../../secret.env')),
      { maxBytes: 100 },
    );
    if (!put.ok) throw new Error('put failed');
    expect(put.data.key).toMatch(/^[0-9a-f]{32}$/);
    expect(readdirSync(path.join(root, 'quarantine'))).toEqual([put.data.key]);
    expect(readFileSync(path.join(tmp, 'secret.env'), 'utf8')).toBe('APP_ENCRYPTION_KEY=synthetic');
  });

  it('cannot exceed maxBytes by sending one oversized chunk', async () => {
    const put = await createFsEvidenceWriter(root).putQuarantined(once(Buffer.alloc(1_000_001)), {
      maxBytes: 1_000_000,
    });
    expect(put).toEqual({ ok: false, error: { code: 'too_large' } });
    expect(readdirSync(path.join(root, 'quarantine'))).toEqual([]);
  });
});
