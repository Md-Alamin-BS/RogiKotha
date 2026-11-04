// Argon2id, m=64 MiB, t=3, p=1 in `adapters/password-argon2` (BR1.8). The caller applies NFC.

export interface PasswordHasher {
  /** A PHC string, e.g. `$argon2id$v=19$m=65536,t=3,p=1$...`. */
  hash(password: string): Promise<string>;
  /** False for a wrong password and for a malformed hash; never throws for either. */
  verify(password: string, phc: string): Promise<boolean>;
}
