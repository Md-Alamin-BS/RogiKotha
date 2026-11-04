import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { requireEnv } from './env';

// Column encryption for the `*_enc` bytea columns (NFR3): AES-256-GCM, stored as iv | tag | ciphertext.
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function encryptionKey(): Buffer {
  const key = Buffer.from(requireEnv('APP_ENCRYPTION_KEY'), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`APP_ENCRYPTION_KEY must be ${KEY_BYTES} bytes of base64`);
  }
  return key;
}

/** Encrypts `plain` (UTF-8 when a string) into `iv | tag | ciphertext`. */
export function encrypt(plain: Uint8Array | string): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const data = typeof plain === 'string' ? Buffer.from(plain, 'utf8') : Buffer.from(plain);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]);
}

/** Decrypts `iv | tag | ciphertext`; throws when the data was altered or the key is wrong. */
export function decrypt(sealed: Uint8Array): Buffer {
  if (sealed.length < IV_BYTES + TAG_BYTES) throw new Error('Encrypted value is too short');
  const bytes = Buffer.from(sealed);
  const iv = bytes.subarray(0, IV_BYTES);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
}

/** `decrypt` for values that were encrypted from a string. */
export function decryptToString(sealed: Uint8Array): string {
  return decrypt(sealed).toString('utf8');
}
