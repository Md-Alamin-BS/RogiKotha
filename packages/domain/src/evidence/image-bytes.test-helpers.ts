// Byte builders for the evidence domain tests. `domain` imports nothing, `test-support` included,
// so the minimal valid PNG and JPEG are built here.
import { crc32 } from './file-type';

export function concat(...parts: readonly (Uint8Array | readonly number[])[]): Uint8Array {
  const arrays = parts.map((p) => (p instanceof Uint8Array ? p : Uint8Array.from(p)));
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let at = 0;
  for (const a of arrays) {
    out.set(a, at);
    at += a.length;
  }
  return out;
}

// `domain` has neither DOM nor Node types, so no `TextEncoder`; callers pass ASCII only.
export const ascii = (text: string): Uint8Array =>
  Uint8Array.from(Array.from(text, (ch) => ch.charCodeAt(0) & 0xff));

const be32 = (n: number): number[] => [
  (n >>> 24) & 0xff,
  (n >>> 16) & 0xff,
  (n >>> 8) & 0xff,
  n & 0xff,
];
const be16 = (n: number): number[] => [(n >>> 8) & 0xff, n & 0xff];

export const PNG_SIGNATURE_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

/** One PNG chunk with its length and a correct CRC-32 over type and data. */
export function pngChunk(type: string, data: readonly number[] | Uint8Array = []): Uint8Array {
  const typeAndData = concat(ascii(type), data);
  return concat(be32(typeAndData.length - 4), typeAndData, be32(crc32(typeAndData)));
}

export function ihdr(width: number, height: number): Uint8Array {
  return pngChunk('IHDR', [...be32(width), ...be32(height), 8, 0, 0, 0, 0]);
}

// A zlib stream of one grey pixel's scanline.
const IDAT_DATA = [0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01];

/** A minimal valid PNG: signature, IHDR, IDAT, IEND. */
export function buildPng(opts: { width?: number; height?: number } = {}): Uint8Array {
  return concat(
    PNG_SIGNATURE_BYTES,
    ihdr(opts.width ?? 1, opts.height ?? 1),
    pngChunk('IDAT', IDAT_DATA),
    pngChunk('IEND'),
  );
}

export function jpegSegment(marker: number, data: readonly number[] | Uint8Array = []): Uint8Array {
  return concat([0xff, marker, ...be16(data.length + 2)], data);
}

export const SOI = [0xff, 0xd8] as const;
export const EOI = [0xff, 0xd9] as const;

const app0 = () => jpegSegment(0xe0, [...ascii('JFIF\0'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const dqt = () => jpegSegment(0xdb, [0x00, ...Array<number>(64).fill(1)]);
const dht = () => jpegSegment(0xc4, [0x00, 1, ...Array<number>(15).fill(0), 0x00]);
export const sof = (marker: number, width: number, height: number) =>
  jpegSegment(marker, [8, ...be16(height), ...be16(width), 1, 1, 0x11, 0]);
const sos = () => jpegSegment(0xda, [1, 1, 0x00, 0, 63, 0]);
// Entropy-coded bytes with a stuffed FF 00 and a restart marker inside.
const ENTROPY = [0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78, 0x9a];

/** An APP1 EXIF segment whose thumbnail carries its own SOI and EOI. */
export function exifWithThumbnail(): Uint8Array {
  return jpegSegment(
    0xe1,
    concat(ascii('Exif\0\0'), SOI, [0xff, 0xdb, 0x00, 0x03, 0x00], [0x11, 0x22], EOI),
  );
}

export function buildJpeg(
  opts: { width?: number; height?: number; progressive?: boolean; exif?: boolean } = {},
): Uint8Array {
  const width = opts.width ?? 1;
  const height = opts.height ?? 1;
  const head = concat(SOI, opts.exif === true ? exifWithThumbnail() : app0(), dqt());
  if (opts.progressive === true) {
    return concat(
      head,
      sof(0xc2, width, height),
      dht(),
      sos(),
      ENTROPY,
      dht(),
      sos(),
      ENTROPY,
      EOI,
    );
  }
  return concat(head, sof(0xc0, width, height), dht(), sos(), ENTROPY, EOI);
}

/** A JPEG whose scan comes before any frame header. */
export function buildJpegWithoutSof(): Uint8Array {
  return concat(SOI, app0(), dqt(), dht(), sos(), ENTROPY, EOI);
}
