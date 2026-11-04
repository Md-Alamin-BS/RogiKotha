import { createHmac, hkdfSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { CryptoKeys } from '@rogikotha/application';

import { IV_BYTES, KEY_BYTES, TAG_BYTES, createCrypto } from './crypto';

function keyOf(fill: number): Uint8Array {
  return new Uint8Array(KEY_BYTES).fill(fill);
}

function buildKeys(overrides: Partial<CryptoKeys> = {}): CryptoKeys {
  return { encryptionKey: keyOf(1), macSecret: 'synthetic-mac-secret-for-tests', ...overrides };
}

function mailKeys(): CryptoKeys {
  return { encryptionKey: keyOf(2) };
}

function flipByte(bytes: Uint8Array, index: number): Uint8Array {
  const copy = Uint8Array.from(bytes);
  copy[index] = (copy[index] ?? 0) ^ 0xff;
  return copy;
}

describe('createCrypto', () => {
  it('decrypts what it encrypted, for bytes and for text', () => {
    const crypto = createCrypto(buildKeys());
    const bytes = Uint8Array.from([0, 1, 2, 250, 255]);

    const fromBytes = crypto.decrypt(crypto.encrypt(bytes));
    const fromText = crypto.decryptText(crypto.encrypt('rahim.synthetic@example.test'));

    expect(fromBytes.ok && Array.from(fromBytes.data)).toEqual(Array.from(bytes));
    expect(fromText).toEqual({ ok: true, data: 'rahim.synthetic@example.test' });
  });

  it('round-trips Bengali text as UTF-8', () => {
    const crypto = createCrypto(buildKeys());

    expect(crypto.decryptText(crypto.encrypt('রোগীকথা'))).toEqual({ ok: true, data: 'রোগীকথা' });
  });

  it('seals as iv then tag then ciphertext, with a fresh iv each time', () => {
    const crypto = createCrypto(buildKeys());
    const plain = 'same input';

    const first = crypto.encrypt(plain);
    const second = crypto.encrypt(plain);

    expect(first.length).toBe(IV_BYTES + TAG_BYTES + Buffer.byteLength(plain));
    expect(Buffer.from(first.subarray(0, IV_BYTES))).not.toEqual(
      Buffer.from(second.subarray(0, IV_BYTES)),
    );
  });

  it('refuses a value whose ciphertext, tag or iv was altered', () => {
    const crypto = createCrypto(buildKeys());
    const sealed = crypto.encrypt('do not change me');

    for (const index of [0, IV_BYTES, sealed.length - 1]) {
      expect(crypto.decrypt(flipByte(sealed, index))).toEqual({
        ok: false,
        error: { code: 'decrypt_failed' },
      });
    }
  });

  it('refuses a value encrypted under the other key', () => {
    const appCrypto = createCrypto(buildKeys());
    const mailCrypto = createCrypto(mailKeys());

    const sealedForMail = mailCrypto.encrypt('nasrin.synthetic@example.test');

    expect(appCrypto.decryptText(sealedForMail)).toEqual({
      ok: false,
      error: { code: 'decrypt_failed' },
    });
    expect(mailCrypto.decryptText(sealedForMail).ok).toBe(true);
  });

  it('refuses a value shorter than an iv and a tag', () => {
    const crypto = createCrypto(buildKeys());

    expect(crypto.decrypt(new Uint8Array(IV_BYTES + TAG_BYTES - 1))).toEqual({
      ok: false,
      error: { code: 'decrypt_failed' },
    });
  });

  it('refuses to read bytes that are not UTF-8 as text', () => {
    const crypto = createCrypto(buildKeys());

    const sealed = crypto.encrypt(Uint8Array.from([0xc3, 0x28]));

    expect(crypto.decryptText(sealed)).toEqual({ ok: false, error: { code: 'decrypt_failed' } });
  });

  it('hashes with SHA-256 as lowercase hex', () => {
    const crypto = createCrypto(buildKeys());

    expect(crypto.hash('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(crypto.hash(new TextEncoder().encode('abc'))).toBe(crypto.hash('abc'));
  });

  it('issues distinct URL-safe tokens of 32 random bytes', () => {
    const crypto = createCrypto(buildKeys());

    const tokens = new Set(Array.from({ length: 50 }, () => crypto.randomToken()));

    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('gives each purpose its own HKDF-derived MAC key', () => {
    const keys = buildKeys();
    const crypto = createCrypto(keys);
    const purposeKey = hkdfSync(
      'sha256',
      keys.macSecret ?? '',
      Buffer.alloc(0),
      'rogikotha:hmac:email-key',
      32,
    );

    const emailKey = crypto.hmac('email-key', 'karim.synthetic@example.test');

    expect(emailKey).toBe(
      createHmac('sha256', Buffer.from(purposeKey))
        .update('karim.synthetic@example.test')
        .digest('hex'),
    );
    expect(crypto.hmac('network-key', 'karim.synthetic@example.test')).not.toBe(emailKey);
    expect(crypto.hmac('email-key', 'karim.synthetic@example.test')).toBe(emailKey);
  });

  it('gives different MACs under a different secret', () => {
    const first = createCrypto(buildKeys());
    const second = createCrypto(buildKeys({ macSecret: 'another-synthetic-secret' }));

    expect(first.hmac('network-key', '192.0.2.10')).not.toBe(
      second.hmac('network-key', '192.0.2.10'),
    );
  });

  it('refuses hmac on the mail-key instance, which has no macSecret', () => {
    const mailCrypto = createCrypto(mailKeys());

    expect(() => mailCrypto.hmac('email-key', 'karim.synthetic@example.test')).toThrow(/macSecret/);
  });

  it('refuses an encryption key that is not 32 bytes', () => {
    expect(() => createCrypto(buildKeys({ encryptionKey: new Uint8Array(16) }))).toThrow(
      /32 bytes/,
    );
  });

  it('refuses an empty macSecret', () => {
    expect(() => createCrypto(buildKeys({ macSecret: '' }))).toThrow(/macSecret/);
  });
});
