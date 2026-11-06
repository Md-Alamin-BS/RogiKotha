// Release-1 evidence is JPEG or PNG only (FD-036). The upload route checks the head of the file
// (BR2.1); the worker checks the whole file's structure before scanning (BR4.3).

export const EVIDENCE_IMAGE_MIMES = ['image/jpeg', 'image/png'] as const;
export type EvidenceImageMime = (typeof EVIDENCE_IMAGE_MIMES)[number];

/** Width and height bounds for both formats (BR4.3). */
export const EVIDENCE_IMAGE_MAX_DIMENSION = 20_000;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
// IHDR's chunk header: length 13, then the type `IHDR`.
const PNG_IHDR_HEADER = [0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52] as const;

function startsWith(bytes: Uint8Array, prefix: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false;
  return prefix.every((b, i) => bytes[offset + i] === b);
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return startsWith(bytes, PNG_SIGNATURE);
}

function hasJpegSoi(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8;
}

/**
 * The type the magic bytes name (BR2.1): PNG is the 8-byte signature followed by an IHDR chunk
 * header; JPEG is SOI `FF D8` followed by a marker byte `FF`.
 */
export function detectImageType(head: Uint8Array): EvidenceImageMime | null {
  if (hasPngSignature(head) && startsWith(head, PNG_IHDR_HEADER, PNG_SIGNATURE.length)) {
    return 'image/png';
  }
  if (hasJpegSoi(head) && head[2] === 0xff) return 'image/jpeg';
  return null;
}

const EXTENSION_MIME: Readonly<Record<string, EvidenceImageMime>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/** The name's extension is one of `.jpg`, `.jpeg`, `.png` and names `mime`, case-insensitively. */
export function extensionMatches(name: string, mime: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  const expected = Object.hasOwn(EXTENSION_MIME, ext) ? EXTENSION_MIME[ext] : undefined;
  return expected !== undefined && expected === mime.toLowerCase();
}

export type ImageStructureResult =
  { ok: true; mime: EvidenceImageMime } | { ok: false; reason: 'malformed' | 'type_mismatch' };

const MALFORMED = { ok: false, reason: 'malformed' } as const;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (ISO 3309, the one PNG uses) over `bytes[start, end)`. */
export function crc32(bytes: Uint8Array, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    c = (CRC_TABLE[(c ^ (bytes[i] ?? 0)) & 0xff] ?? 0) ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u32(bytes: Uint8Array, at: number): number {
  return (
    ((bytes[at] ?? 0) * 0x1000000 +
      ((bytes[at + 1] ?? 0) << 16) +
      ((bytes[at + 2] ?? 0) << 8) +
      (bytes[at + 3] ?? 0)) >>>
    0
  );
}

function u16(bytes: Uint8Array, at: number): number {
  return ((bytes[at] ?? 0) << 8) | (bytes[at + 1] ?? 0);
}

function dimensionOk(value: number): boolean {
  return value >= 1 && value <= EVIDENCE_IMAGE_MAX_DIMENSION;
}

function chunkTypeIs(bytes: Uint8Array, at: number, type: string): boolean {
  for (let i = 0; i < 4; i += 1) {
    if (bytes[at + i] !== type.charCodeAt(i)) return false;
  }
  return true;
}

function pngStructureValid(bytes: Uint8Array): boolean {
  let pos = PNG_SIGNATURE.length;
  let first = true;
  let sawIdat = false;
  while (pos + 12 <= bytes.length) {
    const length = u32(bytes, pos);
    const typeAt = pos + 4;
    const dataAt = pos + 8;
    const crcAt = dataAt + length;
    if (crcAt + 4 > bytes.length) return false;
    if (crc32(bytes, typeAt, crcAt) !== u32(bytes, crcAt)) return false;
    if (first) {
      if (!chunkTypeIs(bytes, typeAt, 'IHDR') || length !== 13) return false;
      if (!dimensionOk(u32(bytes, dataAt)) || !dimensionOk(u32(bytes, dataAt + 4))) return false;
      first = false;
    } else if (chunkTypeIs(bytes, typeAt, 'IHDR')) {
      return false;
    }
    if (chunkTypeIs(bytes, typeAt, 'IDAT')) sawIdat = true;
    pos = crcAt + 4;
    if (chunkTypeIs(bytes, typeAt, 'IEND')) {
      return length === 0 && sawIdat && pos === bytes.length;
    }
  }
  return false;
}

// SOF0-SOF15 without DHT (C4), JPG (C8) and DAC (CC).
function isSof(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function isRst(marker: number): boolean {
  return marker >= 0xd0 && marker <= 0xd7;
}

/** The index of the next marker's `FF` after entropy-coded data, or -1 when the file ends first. */
function skipEntropyData(bytes: Uint8Array, from: number): number {
  let pos = from;
  while (pos < bytes.length) {
    if (bytes[pos] !== 0xff) {
      pos += 1;
      continue;
    }
    const next = bytes[pos + 1];
    if (next === undefined) return -1;
    if (next === 0x00 || isRst(next)) {
      pos += 2;
    } else if (next === 0xff) {
      // A fill byte before the marker.
      pos += 1;
    } else {
      return pos;
    }
  }
  return -1;
}

function jpegStructureValid(bytes: Uint8Array): boolean {
  let pos = 2;
  let sawSof = false;
  let sawSos = false;
  while (pos < bytes.length) {
    if (bytes[pos] !== 0xff) return false;
    while (bytes[pos] === 0xff) pos += 1;
    const marker = bytes[pos];
    if (marker === undefined) return false;
    pos += 1;
    if (marker === 0xd9) return sawSos && pos === bytes.length;
    if (marker === 0x00 || marker === 0xd8) return false;
    if (marker === 0x01 || isRst(marker)) continue;
    if (pos + 2 > bytes.length) return false;
    const length = u16(bytes, pos);
    if (length < 2 || pos + length > bytes.length) return false;
    if (isSof(marker)) {
      if (length < 8) return false;
      if (!dimensionOk(u16(bytes, pos + 3)) || !dimensionOk(u16(bytes, pos + 5))) return false;
      sawSof = true;
    }
    // Every other segment, an EXIF thumbnail's inner SOI and EOI in APP1 included, is skipped by length.
    pos += length;
    if (marker === 0xda) {
      if (!sawSof) return false;
      sawSos = true;
      pos = skipEntropyData(bytes, pos);
      if (pos < 0) return false;
    }
  }
  return false;
}

/**
 * The whole file is a complete PNG or JPEG with nothing after its end (BR4.3). Bytes that start as
 * neither are `type_mismatch`; a truncated file, a broken chunk or segment, or a polyglot is
 * `malformed`.
 */
export function imageStructureValid(bytes: Uint8Array): ImageStructureResult {
  if (hasPngSignature(bytes)) {
    return pngStructureValid(bytes) ? { ok: true, mime: 'image/png' } : MALFORMED;
  }
  if (hasJpegSoi(bytes)) {
    return jpegStructureValid(bytes) ? { ok: true, mime: 'image/jpeg' } : MALFORMED;
  }
  return { ok: false, reason: 'type_mismatch' };
}
