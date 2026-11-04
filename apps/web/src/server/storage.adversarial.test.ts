// @vitest-environment node
// Adversarial tests (demo slice, plan Step 13): try to reach an evidence original through a
// crafted storage key or through any URL the web app serves.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { evidenceRoot, readOriginal, removeOriginal, storeOriginal } from './storage';

const KEY = '0123456789abcdef0123456789abcdef';
const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC_ROOT = path.join(WEB_ROOT, 'src');

describe('a crafted storage key', () => {
  let tmp: string;
  let saved: string | undefined;

  beforeEach(async () => {
    saved = process.env.EVIDENCE_STORAGE_DIR;
    tmp = await mkdtemp(path.join(os.tmpdir(), 'rk-storage-adversarial-'));
    process.env.EVIDENCE_STORAGE_DIR = path.join(tmp, 'evidence');
    // A secret beside the evidence folder, one `..` away.
    await writeFile(path.join(tmp, 'secret.env'), 'APP_ENCRYPTION_KEY=synthetic');
  });

  afterEach(async () => {
    if (saved === undefined) delete process.env.EVIDENCE_STORAGE_DIR;
    else process.env.EVIDENCE_STORAGE_DIR = saved;
    await rm(tmp, { recursive: true, force: true });
  });

  it.each([
    ['a parent-folder hop', '../secret.env'],
    ['a Windows parent-folder hop', '..\\secret.env'],
    ['a valid key followed by a hop', `${KEY}/../../secret.env`],
    ['a valid key with a trailing newline', `${KEY}\n`],
    ['a valid key with a trailing NUL', `${KEY}\0`],
    ['a valid key with a leading space', ` ${KEY}`],
    ['an upper-case key', KEY.toUpperCase()],
    ['a key one character long', `${KEY}0`],
    ['a key of full-width digits', '０'.repeat(32)],
    ['a URL-encoded hop', '%2e%2e%2fsecret.env'],
    ['an absolute POSIX path', '/etc/passwd'],
    ['an absolute Windows path', 'C:\\Windows\\win.ini'],
    ['a UNC path', '\\\\server\\share\\x'],
    ['an empty key', ''],
  ])('is refused for reading and deleting: %s', async (_label, key) => {
    await expect(readOriginal(key)).rejects.toThrow('Malformed evidence storage key');
    await expect(removeOriginal(key)).rejects.toThrow('Malformed evidence storage key');
    expect(existsSync(path.join(tmp, 'secret.env'))).toBe(true);
  });

  it('never takes the stored file name from the upload, so a hostile name cannot pick the path', async () => {
    const stored = await storeOriginal(new TextEncoder().encode('../../secret.env'));
    expect(stored.storageKey).toMatch(/^[0-9a-f]{32}$/);
    expect(readdirSync(path.join(tmp, 'evidence'))).toEqual([stored.storageKey]);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(ts|tsx|js|mjs)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => path.join(dir, file));
}

describe('a public URL to an original', () => {
  it('cannot exist: no page, route or proxy under src/app imports the evidence storage', () => {
    const importers = sourceFiles(path.join(SRC_ROOT, 'app')).filter((file) =>
      /server\/storage|['"]\.\.?\/.*storage['"]/.test(readFileSync(file, 'utf8')),
    );
    expect(importers).toEqual([]);
  });

  it('cannot exist: nothing outside the storage module reads an original back', () => {
    const readers = sourceFiles(SRC_ROOT)
      .filter((file) => path.basename(file) !== 'storage.ts')
      .filter((file) =>
        /\breadOriginal\b|var[/\\]evidence|EVIDENCE_STORAGE_DIR/.test(readFileSync(file, 'utf8')),
      );
    expect(readers.map((file) => path.relative(SRC_ROOT, file))).toEqual([]);
  });

  it('cannot exist: the evidence folder is outside the web app and Next serves no static folder over it', () => {
    const saved = process.env.EVIDENCE_STORAGE_DIR;
    delete process.env.EVIDENCE_STORAGE_DIR;
    try {
      const relative = path.relative(WEB_ROOT, evidenceRoot());
      expect(relative.startsWith('..')).toBe(true);
    } finally {
      if (saved !== undefined) process.env.EVIDENCE_STORAGE_DIR = saved;
    }
    const nextConfig = readFileSync(path.join(WEB_ROOT, 'next.config.ts'), 'utf8');
    expect(nextConfig).not.toMatch(/rewrites|var[/\\]evidence|EVIDENCE_STORAGE_DIR/);
    const publicDir = path.join(WEB_ROOT, 'public');
    const served = existsSync(publicDir)
      ? readdirSync(publicDir, { recursive: true, encoding: 'utf8' })
      : [];
    expect(served.filter((entry) => /evidence|var/.test(entry))).toEqual([]);
  });
});
