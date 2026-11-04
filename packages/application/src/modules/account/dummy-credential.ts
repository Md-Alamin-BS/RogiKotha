// The dummy credential (T-101 BR3.5, Q14): an unknown or deleted address is verified against a
// hash made with the production parameters, so every sign-in failure costs exactly one verify.
import type { PasswordHasher } from '../../ports';

// A fixed, public value: the hash only has to cost what a real one costs, never to match.
const DUMMY_PASSWORD = 'rogikotha-dummy-credential-never-matches';

const dummyHashes = new WeakMap<PasswordHasher, Promise<string>>();

/** Hashed once per hasher; the web container primes it at start so no request pays for it. */
export function dummyPasswordHash(hasher: PasswordHasher): Promise<string> {
  let hash = dummyHashes.get(hasher);
  if (!hash) {
    hash = hasher.hash(DUMMY_PASSWORD);
    dummyHashes.set(hasher, hash);
    // A failed hash is not kept, so the next sign-in tries again.
    hash.catch(() => dummyHashes.delete(hasher));
  }
  return hash;
}

export async function primeDummyCredential(hasher: PasswordHasher): Promise<void> {
  await dummyPasswordHash(hasher);
}
