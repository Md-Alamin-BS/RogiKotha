// The `PasswordHasher` port over `@node-rs/argon2` (BR1.8, BR7.6). The parameters equal the seed's
// (packages/test-support/src/seed) and the demo slice's, so seeded accounts keep signing in.
import { hash, verify } from '@node-rs/argon2';

import type { PasswordHasher } from '@rogikotha/application';

// `algorithm: 2` is Argon2id: the package's `Algorithm` is an ambient const enum that
// `verbatimModuleSyntax` refuses to import as a value.
export const ARGON2ID_PARAMS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  algorithm: 2 as const,
};

export function createArgon2PasswordHasher(): PasswordHasher {
  return {
    hash(password) {
      return hash(password, ARGON2ID_PARAMS);
    },
    async verify(password, phc) {
      try {
        return await verify(phc, password);
      } catch {
        // A malformed stored hash reads as a failed check, never as a server error (port contract).
        return false;
      }
    },
  };
}
