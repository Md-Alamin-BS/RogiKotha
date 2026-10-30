import type { DemoEvidenceMime } from '@rogikotha/contracts';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { optionalEnv } from './env';

// Evidence originals (FR5, NFR3). They live under <repo>/var/evidence, outside apps/web and its
// public/ folder, so no route can serve them; only the server reads them back by key.
const STORAGE_KEY_RE = /^[0-9a-f]{32}$/;

/** Upload limits of the demo slice (FR5.1, Q2). */
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_PER_REVIEW = 5;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
// The 8-byte signature, then the first chunk, which the PNG spec fixes as a 13-byte IHDR.
const PNG_MAGIC = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
];
const JPEG_FIRST_MARKER_MIN = 0xc0;
const JPEG_FIRST_MARKER_MAX = 0xfe;

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return bytes.byteLength >= magic.length && magic.every((byte, i) => bytes[i] === byte);
}

function isJpeg(bytes: Uint8Array): boolean {
  const marker = bytes[JPEG_MAGIC.length];
  return (
    startsWith(bytes, JPEG_MAGIC) &&
    marker !== undefined &&
    marker >= JPEG_FIRST_MARKER_MIN &&
    marker <= JPEG_FIRST_MARKER_MAX
  );
}

/**
 * The image type read from the file's header; null for anything but JPEG or PNG (NFR3).
 * ASSUMPTION(demo-slice): a header check only; decoding and re-encoding is T-304's sanitiser.
 */
export function detectImageMime(bytes: Uint8Array): DemoEvidenceMime | null {
  if (startsWith(bytes, PNG_MAGIC)) return 'image/png';
  if (isJpeg(bytes)) return 'image/jpeg';
  return null;
}

export interface StoredOriginal {
  /** The random file name under the evidence root; never derived from the uploaded name. */
  storageKey: string;
  sha256: string;
  size: number;
}

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Could not find the repo root (pnpm-workspace.yaml) for evidence storage');
}

/** The folder holding evidence originals; `EVIDENCE_STORAGE_DIR` overrides `<repo>/var/evidence`. */
export function evidenceRoot(): string {
  return optionalEnv('EVIDENCE_STORAGE_DIR') ?? path.join(findRepoRoot(), 'var', 'evidence');
}

function pathForKey(storageKey: string): string {
  // The key is the whole file name, so a malformed one could only come from a bug or tampering.
  if (!STORAGE_KEY_RE.test(storageKey)) throw new Error('Malformed evidence storage key');
  return path.join(evidenceRoot(), storageKey);
}

/** Writes an original under a new random key, readable and writable by the server user only. */
export async function storeOriginal(bytes: Uint8Array): Promise<StoredOriginal> {
  const storageKey = randomBytes(16).toString('hex');
  await mkdir(evidenceRoot(), { recursive: true, mode: 0o700 });
  await writeFile(pathForKey(storageKey), bytes, { flag: 'wx', mode: 0o600 });
  return {
    storageKey,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
  };
}

/** Reads an original back; for server-side use only, never streamed to a public response. */
export async function readOriginal(storageKey: string): Promise<Buffer> {
  return readFile(pathForKey(storageKey));
}

/** Deletes an original; a key that is already gone is not an error. */
export async function removeOriginal(storageKey: string): Promise<void> {
  await rm(pathForKey(storageKey), { force: true });
}
