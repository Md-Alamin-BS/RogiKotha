/// <reference types="node" />
// `Crypto` port fake: real AES-256-GCM (`iv | tag | ciphertext`, the layout `adapters/crypto` uses)
// and real HMAC-SHA256, with fixed test keys instead of APP_ENCRYPTION_KEY, MAIL_RECIPIENT_KEY and
// BETTER_AUTH_SECRET. Two instances built with different `keyByte`s behave like `crypto` and
// `mailCrypto`: a value sealed by one does not open with the other (FD-095).
// Plain `Uint8Array`s throughout: `application`'s tests compile this file under a tsconfig whose
// lib does not accept a `Buffer` where Node's typings ask for a `Uint8Array`.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

import {
  portErr,
  portOk,
  type Crypto,
  type HmacPurpose,
  type PortResult,
} from '@rogikotha/application';

export interface FakeCryptoOptions {
  /** Every byte of the 32-byte test key; instances with different values cannot read each other. */
  keyByte?: number;
  /** Null builds an instance like the worker's `mailCrypto`, whose `hmac` refuses (review point 6). */
  macSecret?: string | null;
}

const IV_BYTES = 12;
const TAG_BYTES = 16;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function bytesOf(value: Uint8Array | string): Uint8Array {
  return typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export class FakeCrypto implements Crypto {
  private readonly key: Uint8Array;
  private readonly macSecret: string | null;

  constructor(options: FakeCryptoOptions = {}) {
    this.key = new Uint8Array(32).fill(options.keyByte ?? 0);
    this.macSecret = options.macSecret === undefined ? 'test-mac-secret' : options.macSecret;
  }

  encrypt(plain: Uint8Array | string): Uint8Array {
    const iv = new Uint8Array(randomBytes(IV_BYTES));
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const head = new Uint8Array(cipher.update(bytesOf(plain)));
    const tail = new Uint8Array(cipher.final());
    return concat(iv, new Uint8Array(cipher.getAuthTag()), head, tail);
  }

  decrypt(sealed: Uint8Array): PortResult<Uint8Array, 'decrypt_failed'> {
    if (sealed.length < IV_BYTES + TAG_BYTES) return portErr('decrypt_failed');
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, sealed.slice(0, IV_BYTES));
      decipher.setAuthTag(sealed.slice(IV_BYTES, IV_BYTES + TAG_BYTES));
      const head = new Uint8Array(decipher.update(sealed.slice(IV_BYTES + TAG_BYTES)));
      return portOk(concat(head, new Uint8Array(decipher.final())));
    } catch {
      return portErr('decrypt_failed');
    }
  }

  decryptText(sealed: Uint8Array): PortResult<string, 'decrypt_failed'> {
    const result = this.decrypt(sealed);
    if (!result.ok) return result;
    try {
      return portOk(decoder.decode(result.data));
    } catch {
      return portErr('decrypt_failed');
    }
  }

  hash(value: Uint8Array | string): string {
    return createHash('sha256').update(bytesOf(value)).digest('hex');
  }

  randomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hmac(purpose: HmacPurpose, value: Uint8Array | string): string {
    if (this.macSecret === null) {
      throw new Error('FakeCrypto: hmac needs a macSecret; this instance has none');
    }
    // A per-purpose key, like the adapter's HKDF derivation, so purposes never collide.
    const purposeKey = createHmac('sha256', this.macSecret).update(purpose).digest('hex');
    return createHmac('sha256', purposeKey).update(bytesOf(value)).digest('hex');
  }
}
