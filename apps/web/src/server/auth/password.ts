import { hash, verify } from '@node-rs/argon2';

// The seed's parameters (packages/test-support/src/seed/seed-accounts.ts), so seeded accounts sign
// in. `algorithm: 2` is Argon2id: the package's `Algorithm` is an ambient const enum that
// `verbatimModuleSyntax` refuses to import as a value.
export const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
  algorithm: 2 as const,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/** False for a wrong password and for a stored value that is not an Argon2 hash. */
export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    // A malformed stored hash must read as a failed sign-in, never as a server error.
    return false;
  }
}
