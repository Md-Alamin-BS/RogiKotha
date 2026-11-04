import { describe, expect, it } from 'vitest';

import { createArgon2PasswordHasher } from './password-argon2';

const PASSWORD = 'synthetic-pass-phrase-1';

describe('createArgon2PasswordHasher', () => {
  it('hashes to an Argon2id PHC string with m=64 MiB, t=3, p=1', async () => {
    const hasher = createArgon2PasswordHasher();

    const phc = await hasher.hash(PASSWORD);

    expect(phc).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    expect(phc).not.toContain(PASSWORD);
  });

  it('uses a fresh salt for every hash of the same password', async () => {
    const hasher = createArgon2PasswordHasher();

    const [first, second] = await Promise.all([hasher.hash(PASSWORD), hasher.hash(PASSWORD)]);

    expect(first).not.toBe(second);
  });

  it('verifies the right password and refuses a wrong one', async () => {
    const hasher = createArgon2PasswordHasher();
    const phc = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, phc)).resolves.toBe(true);
    await expect(hasher.verify('synthetic-pass-phrase-2', phc)).resolves.toBe(false);
  });

  it('reads a malformed stored hash as a failed check instead of throwing', async () => {
    const hasher = createArgon2PasswordHasher();

    await expect(hasher.verify(PASSWORD, 'not-a-phc-string')).resolves.toBe(false);
    await expect(hasher.verify(PASSWORD, '')).resolves.toBe(false);
  });

  it('does not normalise: an NFD password does not match its NFC hash', async () => {
    const hasher = createArgon2PasswordHasher();
    const nfc = 'café-synthetic-1'.normalize('NFC');
    const phc = await hasher.hash(nfc);

    await expect(hasher.verify(nfc.normalize('NFD'), phc)).resolves.toBe(false);
  });
});
