// Column encryption for the demo's `*_enc` bytea columns (NFR3), on T-101's `Crypto` adapter
// (AES-256-GCM, iv | tag | ciphertext) instead of a second copy of it (ISS-391). The key is read
// per call, so a changed APP_ENCRYPTION_KEY takes effect without a restart.
import { createColumnCrypto } from './container';
import { requireEnv } from './env';

const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function encryptionKey(): Uint8Array {
  const key = Buffer.from(requireEnv('APP_ENCRYPTION_KEY'), 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(`APP_ENCRYPTION_KEY must be ${KEY_BYTES} bytes of base64`);
  }
  return new Uint8Array(key);
}

/** Encrypts `plain` (UTF-8 when a string) into `iv | tag | ciphertext`. */
export function encrypt(plain: Uint8Array | string): Buffer {
  return Buffer.from(createColumnCrypto(encryptionKey()).encrypt(plain));
}

/** Decrypts `iv | tag | ciphertext`; throws when the data was altered or the key is wrong. */
export function decrypt(sealed: Uint8Array): Buffer {
  if (sealed.length < IV_BYTES + TAG_BYTES) throw new Error('Encrypted value is too short');
  const opened = createColumnCrypto(encryptionKey()).decrypt(sealed);
  if (!opened.ok) throw new Error('Encrypted value could not be decrypted');
  return Buffer.from(opened.data);
}

/** `decrypt` for values that were encrypted from a string. */
export function decryptToString(sealed: Uint8Array): string {
  return decrypt(sealed).toString('utf8');
}
