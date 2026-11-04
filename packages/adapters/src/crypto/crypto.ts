// The `Crypto` port over `node:crypto` (T-101 § 6.2, review point 6, FD-095). The web tier builds
// `crypto` (APP_ENCRYPTION_KEY with BETTER_AUTH_SECRET as macSecret) and `mailCrypto`
// (MAIL_RECIPIENT_KEY, no macSecret); the worker builds only `mailCrypto`.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

import type { Crypto, CryptoKeys, HmacPurpose } from '@rogikotha/application';

const ALGORITHM = 'aes-256-gcm';
export const KEY_BYTES = 32;
export const IV_BYTES = 12;
export const TAG_BYTES = 16;
const TOKEN_BYTES = 32;
// Changing this label changes every derived MAC key, and so every stored rate-limit key.
const HKDF_INFO_PREFIX = 'rogikotha:hmac:';

function toBuffer(value: Uint8Array | string): Buffer {
  return typeof value === 'string' ? Buffer.from(value, 'utf8') : Buffer.from(value);
}

function deriveMacKey(macSecret: string, purpose: HmacPurpose): Buffer {
  return Buffer.from(
    hkdfSync('sha256', macSecret, Buffer.alloc(0), `${HKDF_INFO_PREFIX}${purpose}`, KEY_BYTES),
  );
}

function openSealed(key: Buffer, sealed: Uint8Array): Buffer | null {
  if (sealed.length < IV_BYTES + TAG_BYTES) return null;
  const bytes = Buffer.from(sealed);
  try {
    const decipher = createDecipheriv(ALGORITHM, key, bytes.subarray(0, IV_BYTES));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    return Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
  } catch {
    // A wrong key and an altered value both fail the GCM tag; the caller gets `decrypt_failed`.
    return null;
  }
}

/** Throws on a key of the wrong length or an empty macSecret: both are configuration errors. */
export function createCrypto(keys: CryptoKeys): Crypto {
  if (keys.encryptionKey.length !== KEY_BYTES) {
    throw new Error(`Crypto: the encryption key must be ${KEY_BYTES} bytes`);
  }
  if (keys.macSecret !== undefined && keys.macSecret.length === 0) {
    throw new Error('Crypto: macSecret must not be empty');
  }
  const encryptionKey = Buffer.from(keys.encryptionKey);
  const { macSecret } = keys;
  const macKeys = new Map<HmacPurpose, Buffer>();
  const textDecoder = new TextDecoder('utf-8', { fatal: true });

  return {
    encrypt(plain) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv(ALGORITHM, encryptionKey, iv);
      const ciphertext = Buffer.concat([cipher.update(toBuffer(plain)), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
    },
    decrypt(sealed) {
      const plain = openSealed(encryptionKey, sealed);
      return plain ? { ok: true, data: plain } : { ok: false, error: { code: 'decrypt_failed' } };
    },
    decryptText(sealed) {
      const plain = openSealed(encryptionKey, sealed);
      if (!plain) return { ok: false, error: { code: 'decrypt_failed' } };
      try {
        return { ok: true, data: textDecoder.decode(plain) };
      } catch {
        return { ok: false, error: { code: 'decrypt_failed' } };
      }
    },
    hash(value) {
      return createHash('sha256').update(toBuffer(value)).digest('hex');
    },
    randomToken() {
      return randomBytes(TOKEN_BYTES).toString('base64url');
    },
    hmac(purpose, value) {
      if (macSecret === undefined) {
        throw new Error('Crypto: hmac needs an instance built with macSecret (review point 6)');
      }
      let key = macKeys.get(purpose);
      if (!key) {
        key = deriveMacKey(macSecret, purpose);
        macKeys.set(purpose, key);
      }
      return createHmac('sha256', key).update(toBuffer(value)).digest('hex');
    },
  };
}
