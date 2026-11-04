// @vitest-environment node
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_EVIDENCE_BYTES,
  MAX_EVIDENCE_PER_REVIEW,
  detectImageMime,
  evidenceRoot,
  readOriginal,
  removeOriginal,
  storeOriginal,
} from './storage';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG = Uint8Array.from([
  ...PNG_SIGNATURE,
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52,
  0x01,
]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

describe('image type detection by content', () => {
  it('recognises a PNG and a JPEG by their first bytes', () => {
    expect(detectImageMime(PNG)).toBe('image/png');
    expect(detectImageMime(JPEG)).toBe('image/jpeg');
  });

  it('refuses a PNG signature that is not followed by the IHDR chunk', () => {
    const html = new TextEncoder().encode('<html><script>1</script></html>');
    expect(detectImageMime(Uint8Array.from([...PNG_SIGNATURE, ...html]))).toBeNull();
  });

  it('refuses a JPEG start whose fourth byte is not a segment marker', () => {
    expect(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x3c, 0x68]))).toBeNull();
    expect(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('refuses a text file, a GIF and a Windows executable whatever their names claim', () => {
    expect(detectImageMime(new TextEncoder().encode('just text named photo.png'))).toBeNull();
    expect(detectImageMime(new TextEncoder().encode('GIF89a....'))).toBeNull();
    expect(detectImageMime(Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
  });

  it('refuses a file shorter than the signature', () => {
    expect(detectImageMime(Uint8Array.from([0x89, 0x50]))).toBeNull();
    expect(detectImageMime(new Uint8Array())).toBeNull();
  });
});

describe('upload limits', () => {
  it('are 10 MB per file and 5 files per experience', () => {
    expect(MAX_EVIDENCE_BYTES).toBe(10 * 1024 * 1024);
    expect(MAX_EVIDENCE_PER_REVIEW).toBe(5);
  });
});

describe('evidence original storage', () => {
  let dir: string;
  let saved: string | undefined;

  beforeEach(async () => {
    saved = process.env.EVIDENCE_STORAGE_DIR;
    dir = await mkdtemp(path.join(os.tmpdir(), 'rk-evidence-'));
    process.env.EVIDENCE_STORAGE_DIR = path.join(dir, 'evidence');
  });

  afterEach(async () => {
    if (saved === undefined) delete process.env.EVIDENCE_STORAGE_DIR;
    else process.env.EVIDENCE_STORAGE_DIR = saved;
    await rm(dir, { recursive: true, force: true });
  });

  it('stores an original under a random key with its hash and size, and reads it back', async () => {
    const stored = await storeOriginal(PNG);

    expect(stored.storageKey).toMatch(/^[0-9a-f]{32}$/);
    expect(stored.size).toBe(PNG.byteLength);
    expect(stored.sha256).toBe(createHash('sha256').update(PNG).digest('hex'));
    expect(await readdir(path.join(dir, 'evidence'))).toEqual([stored.storageKey]);
    expect(new Uint8Array(await readOriginal(stored.storageKey))).toEqual(PNG);
  });

  it('gives two uploads of the same file two different keys', async () => {
    const first = await storeOriginal(JPEG);
    const second = await storeOriginal(JPEG);
    expect(first.storageKey).not.toBe(second.storageKey);
  });

  it('removes an original, and removing it twice is not an error', async () => {
    const stored = await storeOriginal(PNG);
    await removeOriginal(stored.storageKey);
    await removeOriginal(stored.storageKey);
    expect(existsSync(path.join(dir, 'evidence', stored.storageKey))).toBe(false);
  });

  it('refuses a key that could reach outside the evidence folder', async () => {
    await expect(readOriginal('../../.env')).rejects.toThrow('Malformed evidence storage key');
    await expect(removeOriginal('..')).rejects.toThrow('Malformed evidence storage key');
  });
});

describe('the default evidence folder', () => {
  it('is var/evidence at the repo root, outside the web app and its public folder', () => {
    const saved = process.env.EVIDENCE_STORAGE_DIR;
    delete process.env.EVIDENCE_STORAGE_DIR;
    try {
      const root = evidenceRoot();
      expect(root.endsWith(path.join('var', 'evidence'))).toBe(true);
      expect(existsSync(path.join(root, '..', '..', 'pnpm-workspace.yaml'))).toBe(true);
      expect(root.split(path.sep)).not.toContain('web');
    } finally {
      if (saved !== undefined) process.env.EVIDENCE_STORAGE_DIR = saved;
    }
  });
});
