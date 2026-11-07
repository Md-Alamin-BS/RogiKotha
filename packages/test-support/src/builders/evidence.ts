// `anEvidenceItem()` — an evidence item entity. `toIntakeEvidenceInput()`
// extracts the `evidence.intake` command-input subset for schema validation
// against the real `IntakeEvidenceInput` (contracts/schemas/evidence.ts).
import type { IntakeEvidenceInput } from '@rogikotha/contracts';
import {
  crc32,
  type EvidenceImageMime,
  type EvidenceItemFailReason,
  type EvidenceItemState,
} from '@rogikotha/domain';
import type { z } from 'zod';

import type { CorpusEvidenceItem } from '../corpus/types.js';
import { seq, seqId } from './seq.js';

export interface EvidenceItemBuild extends CorpusEvidenceItem {
  id: string;
  declaredMime: 'image/jpeg' | 'image/png';
  bytes: number;
}

export function anEvidenceItem(overrides: Partial<EvidenceItemBuild> = {}): EvidenceItemBuild {
  const n = seqId('evidence');
  return {
    id: n,
    seedRef: n,
    reviewSeedRef: overrides.reviewSeedRef ?? 'r1',
    group: 'reviewed',
    label: { en: `Builder document ${n}`, bn: `বিল্ডার নথি ${n}` },
    prototypeState: 'ready',
    pageCount: 1,
    declaredMime: 'image/jpeg',
    bytes: 12_345,
    ...overrides,
  };
}

export function toIntakeEvidenceInput(e: EvidenceItemBuild): z.infer<typeof IntakeEvidenceInput> {
  return {
    reviewDraftId: e.reviewSeedRef,
    group: e.group,
    declaredMime: e.declaredMime,
    declaredName: `${e.seedRef}.jpg`,
    bytes: e.bytes,
    idempotencyKey: `idem-${e.seedRef}`,
  };
}

// U48: a stored evidence row as the in-memory repository keeps it, one builder per state, and
// valid PNG and JPEG bodies for the processor and the upload route.
export interface StoredEvidenceItem {
  id: string;
  publicId: string;
  reviewId: string;
  uploadedByAccountId: string;
  state: EvidenceItemState;
  failReason: EvidenceItemFailReason | null;
  declaredMime: string;
  detectedMime: EvidenceImageMime | null;
  originalBytes: number;
  originalSha256: string;
  originalFilenameEnc: Uint8Array;
  idempotencyKey: string | null;
  storageKey: string | null;
  originalDeletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date | null;
}

const DEFAULT_FAIL_REASON: Partial<Record<EvidenceItemState, EvidenceItemFailReason>> = {
  rejected: 'malformed',
  failed: 'processing_timeout',
};

const PUBLIC_ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

function builderPublicId(n: number): string {
  let out = '';
  let rest = n;
  for (let i = 0; i < 10; i += 1) {
    out = (PUBLIC_ID_ALPHABET[rest % 32] ?? '0') + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

/** A stored item in `quarantined` unless overridden; ids, key and hash are deterministic. */
export function aStoredEvidenceItem(
  overrides: Partial<StoredEvidenceItem> = {},
): StoredEvidenceItem {
  const n = seq('stored-evidence');
  const hex = n.toString(16).padStart(32, '0');
  const state = overrides.state ?? 'quarantined';
  return {
    id: `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`,
    publicId: builderPublicId(n),
    reviewId: 'review-1',
    uploadedByAccountId: 'account-1',
    state,
    failReason: DEFAULT_FAIL_REASON[state] ?? null,
    declaredMime: 'image/png',
    detectedMime: 'image/png',
    originalBytes: 68,
    originalSha256: `${hex}${hex}`,
    originalFilenameEnc: Uint8Array.from([0x73, 0x65, 0x61, 0x6c]),
    idempotencyKey: `3f1c2b9e-4d5a-4b6c-8d7e-${n.toString(16).padStart(12, '0')}`,
    storageKey: hex,
    originalDeletedAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: null,
    ...overrides,
  };
}

/** A stored item in `state`, with the default fail reason for `rejected` and `failed`. */
export function evidenceItemIn(
  state: EvidenceItemState,
  overrides: Partial<StoredEvidenceItem> = {},
): StoredEvidenceItem {
  return aStoredEvidenceItem({ ...overrides, state });
}

function concatBytes(parts: readonly (Uint8Array | readonly number[])[]): Uint8Array {
  const arrays = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of arrays) {
    out.set(a, at);
    at += a.length;
  }
  return out;
}

const be32 = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];
const be16 = (n: number): number[] => [(n >>> 8) & 0xff, n & 0xff];
const asciiBytes = (text: string): number[] => Array.from(text, (ch) => ch.charCodeAt(0) & 0xff);

function pngChunk(type: string, data: readonly number[] = []): Uint8Array {
  const typeAndData = Uint8Array.from([...asciiBytes(type), ...data]);
  return concatBytes([be32(data.length), typeAndData, be32(crc32(typeAndData))]);
}

function jpegSegment(marker: number, data: readonly number[]): number[] {
  return [0xff, marker, ...be16(data.length + 2), ...data];
}

export interface ImageBytesOptions {
  kind: 'png' | 'jpeg';
  width?: number;
  height?: number;
  /** Bytes appended after IEND or EOI, which makes the file a polyglot (malformed, BR4.3). */
  trailing?: readonly number[];
  /** Drops the last `truncate` bytes, which makes the file truncated (malformed, BR4.3). */
  truncate?: number;
}

/** A minimal valid PNG or JPEG body unless `trailing` or `truncate` breaks it on purpose. */
export function imageBytes(opts: ImageBytesOptions): Uint8Array {
  const width = opts.width ?? 1;
  const height = opts.height ?? 1;
  let body: Uint8Array;
  if (opts.kind === 'png') {
    body = concatBytes([
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      pngChunk('IHDR', [...be32(width), ...be32(height), 8, 0, 0, 0, 0]),
      pngChunk('IDAT', [0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]),
      pngChunk('IEND'),
    ]);
  } else {
    body = Uint8Array.from([
      0xff,
      0xd8,
      ...jpegSegment(0xe0, [...asciiBytes('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]),
      ...jpegSegment(0xdb, [0x00, ...Array<number>(64).fill(1)]),
      ...jpegSegment(0xc0, [8, ...be16(height), ...be16(width), 1, 1, 0x11, 0]),
      ...jpegSegment(0xc4, [0x00, 1, ...Array<number>(15).fill(0), 0x00]),
      ...jpegSegment(0xda, [1, 1, 0x00, 0, 63, 0]),
      0x12,
      0x34,
      0xff,
      0x00,
      0x56,
      0xff,
      0xd9,
    ]);
  }
  if (opts.trailing) body = concatBytes([body, opts.trailing]);
  if (opts.truncate) body = body.slice(0, body.length - opts.truncate);
  return body;
}
