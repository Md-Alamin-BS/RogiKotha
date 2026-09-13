/// <reference types="node" />
// ISS-XXX: this package's automatic `@types/node` inclusion does not fire
// under plain `tsc -p tsconfig.json` (root cause not identified; works for
// every sibling package with an identical tsconfig) — worked around with
// this file's own reference directive plus `--types node` on the package's
// `typecheck` script, both narrower than editing the shared
// `tsconfig.json` (outside this task's owned paths).
// `Crypto` port fake (03-routes-and-contracts.md §3: `encrypt(bytes)`,
// `decrypt(bytes)`, `hash(bytes)` (sha256), `randomToken()`). Task step 5
// says "XOR-free: real AES with a fixed test key" — this uses real
// `node:crypto` AES-256-GCM (the same algorithm `adapters/crypto` uses per
// 02-data-model.md's header, "Encrypted columns use AES-256-GCM"), just
// with a fixed, well-known test key instead of `APP_ENCRYPTION_KEY`, so
// round-tripping in a test behaves exactly like production would.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const TEST_KEY = Buffer.from('0'.repeat(64), 'hex'); // 32 bytes, all zero — test-only.

export class FakeCrypto {
  encrypt(bytes: Buffer): Buffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', TEST_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]);
  }

  decrypt(bytes: Buffer): Buffer {
    const iv = bytes.subarray(0, 12);
    const tag = bytes.subarray(12, 28);
    const ciphertext = bytes.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', TEST_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  hash(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
  }

  randomToken(): string {
    return randomBytes(24).toString('hex');
  }
}
