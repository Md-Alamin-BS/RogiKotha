import { createHash } from 'node:crypto';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { EvidenceByteStream } from '@rogikotha/application';

import { MalformedEvidenceKeyError, createFsEvidenceReader, createFsEvidenceWriter } from './index';

const KEY = '0123456789abcdef0123456789abcdef';

async function* chunks(...parts: Uint8Array[]): EvidenceByteStream {
  for (const part of parts) {
    await Promise.resolve();
    yield part;
  }
}

async function readAll(stream: EvidenceByteStream): Promise<Buffer> {
  const parts: Uint8Array[] = [];
  for await (const part of stream) parts.push(part);
  return Buffer.concat(parts);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

let tmp: string;
let root: string;

beforeEach(async () => {
  tmp = await mkdtemp(path.join(os.tmpdir(), 'rk-storage-fs-'));
  root = path.join(tmp, 'evidence');
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('the file-system evidence writer and reader', () => {
  it('stores a streamed upload under a random key and reads the same bytes back', async () => {
    const writer = createFsEvidenceWriter(root);
    const reader = createFsEvidenceReader(root);
    const first = Buffer.alloc(70_000, 1);
    const second = Buffer.from('synthetic tail');

    const put = await writer.putQuarantined(chunks(first, second), { maxBytes: 100_000 });

    expect(put.ok).toBe(true);
    if (!put.ok) return;
    const body = Buffer.concat([first, second]);
    expect(put.data).toEqual({ key: put.data.key, bytes: body.byteLength, sha256: sha256(body) });
    expect(put.data.key).toMatch(/^[0-9a-f]{32}$/);
    expect(readdirSync(path.join(root, 'quarantine'))).toEqual([put.data.key]);
    const read = await reader.readQuarantined(put.data.key);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect((await readAll(read.data)).equals(body)).toBe(true);
  });

  it('accepts an upload of exactly maxBytes', async () => {
    const put = await createFsEvidenceWriter(root).putQuarantined(chunks(Buffer.alloc(10, 2)), {
      maxBytes: 10,
    });
    expect(put.ok && put.data.bytes).toBe(10);
  });

  it('answers too_large one byte past maxBytes and leaves no file behind', async () => {
    const put = await createFsEvidenceWriter(root).putQuarantined(
      chunks(Buffer.alloc(6, 3), Buffer.alloc(5, 3)),
      { maxBytes: 10 },
    );
    expect(put).toEqual({ ok: false, error: { code: 'too_large' } });
    expect(readdirSync(path.join(root, 'quarantine'))).toEqual([]);
  });

  it('deletes the partial file when the upload stream fails', async () => {
    async function* broken(): EvidenceByteStream {
      yield Buffer.from('partial');
      await Promise.resolve();
      throw new Error('client went away');
    }
    await expect(
      createFsEvidenceWriter(root).putQuarantined(broken(), { maxBytes: 100 }),
    ).rejects.toThrow('client went away');
    expect(readdirSync(path.join(root, 'quarantine'))).toEqual([]);
  });

  it('gives every upload a new key, even for the same bytes', async () => {
    const writer = createFsEvidenceWriter(root);
    const a = await writer.putQuarantined(chunks(Buffer.from('same')), { maxBytes: 10 });
    const b = await writer.putQuarantined(chunks(Buffer.from('same')), { maxBytes: 10 });
    expect(a.ok && b.ok && a.data.key !== b.data.key).toBe(true);
  });

  it.skipIf(process.platform === 'win32')(
    'keeps the folder and files private to the server user',
    async () => {
      const put = await createFsEvidenceWriter(root).putQuarantined(chunks(Buffer.from('x')), {
        maxBytes: 10,
      });
      if (!put.ok) throw new Error('put failed');
      expect(statSync(path.join(root, 'quarantine')).mode & 0o777).toBe(0o700);
      expect(statSync(path.join(root, 'quarantine', put.data.key)).mode & 0o777).toBe(0o600);
    },
  );

  it('answers original_missing for a key with no file', async () => {
    await expect(createFsEvidenceReader(root).readQuarantined(KEY)).resolves.toEqual({
      ok: false,
      error: { code: 'original_missing' },
    });
  });

  it('deletes a file, and deleting it again is not an error', async () => {
    const writer = createFsEvidenceWriter(root);
    const reader = createFsEvidenceReader(root);
    const put = await writer.putQuarantined(chunks(Buffer.from('x')), { maxBytes: 10 });
    if (!put.ok) throw new Error('put failed');

    await reader.delete(put.data.key);
    await expect(reader.delete(put.data.key)).resolves.toBeUndefined();
    await expect(writer.delete(put.data.key)).resolves.toBeUndefined();
    expect(existsSync(path.join(root, 'quarantine', put.data.key))).toBe(false);
  });

  it.each([
    ['a parent-folder hop', '../secret.env'],
    ['a slash', `${KEY.slice(0, 16)}/${KEY.slice(17)}`],
    ['an upper-case key', KEY.toUpperCase()],
    ['a key of 31 characters', KEY.slice(1)],
  ])('refuses %s before any file call', async (_label, key) => {
    // The root does not exist, so any file call would fail with ENOENT instead.
    const missingRoot = path.join(tmp, 'never-created');
    const reader = createFsEvidenceReader(missingRoot);
    const writer = createFsEvidenceWriter(missingRoot);
    await expect(reader.readQuarantined(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    await expect(reader.delete(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    await expect(writer.delete(key)).rejects.toBeInstanceOf(MalformedEvidenceKeyError);
    expect(existsSync(missingRoot)).toBe(false);
  });

  it('hands the web tier no read method and the worker no write method (BR3.6)', () => {
    const writer = createFsEvidenceWriter(root);
    const reader = createFsEvidenceReader(root);
    expect(Object.keys(writer).sort()).toEqual(['delete', 'putQuarantined']);
    expect(Object.keys(reader).sort()).toEqual(['delete', 'readQuarantined']);
    expect('readQuarantined' in writer).toBe(false);
    expect('putQuarantined' in reader).toBe(false);
  });

  it('never reads a file outside the quarantine folder', async () => {
    await writeFile(path.join(tmp, 'outside'), 'synthetic secret');
    await expect(createFsEvidenceReader(root).readQuarantined('outside')).rejects.toBeInstanceOf(
      MalformedEvidenceKeyError,
    );
  });
});
