// Private evidence file storage on the local disk (BR3.1 to BR3.6). The writer goes to the web tier
// and the reader to the worker; each factory returns only its own methods, and none returns a path.
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, open, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  portErr,
  portOk,
  type EvidenceByteStream,
  type EvidenceFileReader,
  type EvidenceFileWriter,
} from '@rogikotha/application';

const STORAGE_KEY_RE = /^[0-9a-f]{32}$/;
const QUARANTINE_DIR = 'quarantine';
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;

/** Thrown for a key that is not 32 lowercase hex characters: only a bug or tampering makes one. */
export class MalformedEvidenceKeyError extends Error {
  constructor() {
    super('Malformed evidence storage key');
    this.name = 'MalformedEvidenceKeyError';
  }
}

function quarantineDir(root: string): string {
  return path.join(path.resolve(root), QUARANTINE_DIR);
}

/** The file of `key` under `<root>/quarantine`; throws before any file call when the key is bad. */
function quarantinePath(root: string, key: string): string {
  if (!STORAGE_KEY_RE.test(key)) throw new MalformedEvidenceKeyError();
  const resolvedRoot = path.resolve(root);
  const file = path.resolve(path.join(resolvedRoot, QUARANTINE_DIR, key));
  const relative = path.relative(resolvedRoot, file);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new MalformedEvidenceKeyError();
  }
  return file;
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

async function deleteKey(root: string, key: string): Promise<void> {
  await rm(quarantinePath(root, key), { force: true });
}

export function createFsEvidenceWriter(root: string): EvidenceFileWriter {
  return {
    async putQuarantined(stream: EvidenceByteStream, opts: { maxBytes: number }) {
      const key = randomBytes(16).toString('hex');
      const finalPath = quarantinePath(root, key);
      // The temp name fails the key pattern, so no reader can open a half-written file.
      const tempPath = path.join(quarantineDir(root), `.${key}.part`);
      await mkdir(quarantineDir(root), { recursive: true, mode: DIR_MODE });
      const handle = await open(tempPath, 'wx', FILE_MODE);
      const hash = createHash('sha256');
      let bytes = 0;
      let closed = false;
      try {
        for await (const chunk of stream) {
          bytes += chunk.byteLength;
          // The declared length is never trusted; this counter is the limit (BR3.4).
          if (bytes > opts.maxBytes) {
            await handle.close();
            closed = true;
            await rm(tempPath, { force: true });
            return portErr('too_large');
          }
          hash.update(chunk);
          await handle.write(chunk);
        }
        await handle.close();
        closed = true;
        // rename replaces an existing file, so the exclusive create of BR3.1 is checked here.
        if (await exists(finalPath)) throw new Error('Evidence storage key collision');
        await rename(tempPath, finalPath);
        return portOk({ key, bytes, sha256: hash.digest('hex') });
      } catch (error) {
        if (!closed) await handle.close().catch(() => undefined);
        await rm(tempPath, { force: true }).catch(() => undefined);
        throw error;
      }
    },
    delete(key: string) {
      return deleteKey(root, key);
    },
  };
}

export function createFsEvidenceReader(root: string): EvidenceFileReader {
  return {
    async readQuarantined(key: string) {
      const file = quarantinePath(root, key);
      try {
        const handle = await open(file, 'r');
        return portOk<EvidenceByteStream>(handle.createReadStream());
      } catch (error) {
        if (isMissing(error)) return portErr('original_missing');
        throw error;
      }
    },
    delete(key: string) {
      return deleteKey(root, key);
    },
  };
}
