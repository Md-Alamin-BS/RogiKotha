// Pagination shapes shared by every query (03-routes-and-contracts.md §2).

export interface PageMeta {
  cursor?: string;
  nextCursor?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface BoundedPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

// Cursors are opaque strings to every consumer; encoded/decoded here only.
// Implemented without `Buffer` or DOM `btoa`/`atob` so this package stays
// runnable in any JS runtime (Node, edge, browser) per 01-conventions.md §2
// ("contracts -> zod only").
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function alphabetChar(index: number): string {
  // `index` is always derived from `& 0x3f` or `& 31`, so always in range.
  return BASE64URL_ALPHABET[index]!;
}

function utf8Encode(str: string): number[] {
  const bytes: number[] = [];
  for (const ch of str) {
    const codePoint = ch.codePointAt(0) ?? 0;
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(0xe0 | (codePoint >> 12), 0x80 | ((codePoint >> 6) & 0x3f), 0x80 | (codePoint & 0x3f));
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

function utf8Decode(bytes: number[]): string {
  let result = '';
  let i = 0;
  while (i < bytes.length) {
    const b0 = bytes[i] ?? 0;
    if (b0 < 0x80) {
      result += String.fromCharCode(b0);
      i += 1;
    } else if ((b0 & 0xe0) === 0xc0) {
      const b1 = bytes[i + 1] ?? 0;
      result += String.fromCharCode(((b0 & 0x1f) << 6) | (b1 & 0x3f));
      i += 2;
    } else if ((b0 & 0xf0) === 0xe0) {
      const b1 = bytes[i + 1] ?? 0;
      const b2 = bytes[i + 2] ?? 0;
      result += String.fromCharCode(((b0 & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
      i += 3;
    } else {
      const b1 = bytes[i + 1] ?? 0;
      const b2 = bytes[i + 2] ?? 0;
      const b3 = bytes[i + 3] ?? 0;
      const codePoint = ((b0 & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      result += String.fromCodePoint(codePoint);
      i += 4;
    }
  }
  return result;
}

function bytesToBase64Url(bytes: number[]): string {
  let result = '';
  let i = 0;
  for (; i + 3 <= bytes.length; i += 3) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    result +=
      alphabetChar((n >> 18) & 0x3f) +
      alphabetChar((n >> 12) & 0x3f) +
      alphabetChar((n >> 6) & 0x3f) +
      alphabetChar(n & 0x3f);
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = (bytes[i] ?? 0) << 16;
    result += alphabetChar((n >> 18) & 0x3f) + alphabetChar((n >> 12) & 0x3f);
  } else if (remaining === 2) {
    const n = ((bytes[i] ?? 0) << 16) | ((bytes[i + 1] ?? 0) << 8);
    result += alphabetChar((n >> 18) & 0x3f) + alphabetChar((n >> 12) & 0x3f) + alphabetChar((n >> 6) & 0x3f);
  }
  return result;
}

function base64UrlToBytes(s: string): number[] {
  const cleaned = s.replace(/[^A-Za-z0-9\-_]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i + 4 <= cleaned.length + 3; i += 4) {
    const chunk = cleaned.slice(i, i + 4);
    if (chunk.length < 2) break;
    const values = chunk.split('').map((c) => BASE64URL_ALPHABET.indexOf(c));
    const v0 = values[0] ?? 0;
    const v1 = values[1] ?? 0;
    const v2 = values[2] ?? -1;
    const v3 = values[3] ?? -1;
    const n = (v0 << 18) | (v1 << 12) | ((v2 < 0 ? 0 : v2) << 6) | (v3 < 0 ? 0 : v3);
    bytes.push((n >> 16) & 0xff);
    if (v2 >= 0) bytes.push((n >> 8) & 0xff);
    if (v3 >= 0) bytes.push(n & 0xff);
  }
  return bytes;
}

/** Base64url-encodes an opaque cursor payload. Never assume cursor internals. */
export function encodeCursor(obj: unknown): string {
  const json = JSON.stringify(obj);
  return bytesToBase64Url(utf8Encode(json));
}

/** Decodes a cursor produced by {@link encodeCursor}. Throws on malformed input. */
export function decodeCursor<T = unknown>(s: string): T {
  const json = utf8Decode(base64UrlToBytes(s));
  return JSON.parse(json) as T;
}
