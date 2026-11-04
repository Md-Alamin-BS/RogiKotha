// T-101 § 6.2 and review point 6. The web tier builds two instances, `crypto` (APP_ENCRYPTION_KEY,
// macSecret from BETTER_AUTH_SECRET) and `mailCrypto` (MAIL_RECIPIENT_KEY, no macSecret); the
// worker builds only `mailCrypto` (FD-095).
// ASSUMPTION(T-101): the methods also take strings, because `application` has no `TextEncoder`
// type (lib ES2023, no `@types/node`) and must encrypt addresses and hash keys.
import type { PortResult } from './port-result';

/** One HKDF-derived MAC key per purpose, so a key computed for one use never matches another. */
export const HMAC_PURPOSES = ['email-key', 'network-key'] as const;
export type HmacPurpose = (typeof HMAC_PURPOSES)[number];

/** What the `adapters/crypto` factory is built from. */
export interface CryptoKeys {
  /** 32 bytes, AES-256-GCM. */
  encryptionKey: Uint8Array;
  /** BETTER_AUTH_SECRET; absent on the mail-key instances. */
  macSecret?: string;
}

export interface Crypto {
  /** AES-256-GCM, layout `iv(12) | tag(16) | ciphertext`; a string is encoded as UTF-8. */
  encrypt(plain: Uint8Array | string): Uint8Array;
  decrypt(sealed: Uint8Array): PortResult<Uint8Array, 'decrypt_failed'>;
  decryptText(sealed: Uint8Array): PortResult<string, 'decrypt_failed'>;
  /** SHA-256, lowercase hex. */
  hash(value: Uint8Array | string): string;
  /** URL-safe random token, at least 32 bytes of entropy. */
  randomToken(): string;
  /**
   * HMAC-SHA256 under the purpose's key, lowercase hex. Throws a programmer error on an instance
   * built without `macSecret` (review point 6).
   */
  hmac(purpose: HmacPurpose, value: Uint8Array | string): string;
}
