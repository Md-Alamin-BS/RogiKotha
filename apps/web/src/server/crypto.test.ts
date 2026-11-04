// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { decrypt, decryptToString, encrypt } from './crypto';

const KEY = randomBytes(32).toString('base64');

describe('column encryption (AES-256-GCM, iv | tag | ciphertext)', () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = process.env.APP_ENCRYPTION_KEY;
    process.env.APP_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    process.env.APP_ENCRYPTION_KEY = saved;
  });

  it('decrypts a file name back to the exact text, Bengali included', () => {
    const sealed = encrypt('রিপোর্ট scan-01.png');
    expect(decryptToString(sealed)).toBe('রিপোর্ট scan-01.png');
  });

  it('round-trips raw bytes and lays the value out as a 12-byte iv, a 16-byte tag and the ciphertext', () => {
    const plain = randomBytes(40);
    const sealed = encrypt(plain);
    expect(sealed.length).toBe(12 + 16 + plain.length);
    expect(decrypt(sealed).equals(plain)).toBe(true);
  });

  it('never produces the same ciphertext twice for the same text', () => {
    expect(encrypt('same name').equals(encrypt('same name'))).toBe(false);
  });

  it('refuses a value whose ciphertext was altered', () => {
    const sealed = encrypt('original.jpg');
    sealed[sealed.length - 1]! ^= 0xff;
    expect(() => decrypt(sealed)).toThrow();
  });

  it('refuses a value sealed with another key', () => {
    const sealed = encrypt('original.jpg');
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    expect(() => decrypt(sealed)).toThrow();
  });

  it('refuses a value too short to hold an iv and a tag', () => {
    expect(() => decrypt(Buffer.alloc(20))).toThrow('too short');
  });

  it('refuses a key that is not 32 bytes', () => {
    process.env.APP_ENCRYPTION_KEY = randomBytes(16).toString('base64');
    expect(() => encrypt('x')).toThrow('32 bytes');
  });
});
