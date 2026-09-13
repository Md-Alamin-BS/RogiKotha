/// <reference types="node" />
// `PasswordHasher` port fake (03-routes-and-contracts.md §3: `hash(pw)`,
// `verify(pw, phc)`). Task step 5: "FastHasher (sha256 of the password —
// tests only)" — deliberately not Argon2id, so application/domain unit
// tests that hash a password in a `beforeEach` stay fast; the seed itself
// uses the real `@node-rs/argon2` (seed/seed-accounts.ts), never this fake.
import { createHash } from 'node:crypto';

const PREFIX = 'fasthash$';

export class FastHasher {
  hash(password: string): Promise<string> {
    return Promise.resolve(PREFIX + createHash('sha256').update(password).digest('hex'));
  }

  verify(password: string, phc: string): Promise<boolean> {
    return Promise.resolve(phc === PREFIX + createHash('sha256').update(password).digest('hex'));
  }
}
