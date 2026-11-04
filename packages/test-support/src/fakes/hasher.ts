/// <reference types="node" />
// `PasswordHasher` port fake: sha256 of the password, tests only, so application tests that hash in
// a `beforeEach` stay fast; the seed uses the real `@node-rs/argon2`. It counts its calls, because
// T-101 proves that every sign-in failure path costs exactly one verify (BR3.5).
import { createHash } from 'node:crypto';

import type { PasswordHasher } from '@rogikotha/application';

const PREFIX = 'fasthash$';

export class FastHasher implements PasswordHasher {
  hashCalls = 0;
  verifyCalls = 0;

  hash(password: string): Promise<string> {
    this.hashCalls += 1;
    return Promise.resolve(PREFIX + createHash('sha256').update(password).digest('hex'));
  }

  verify(password: string, phc: string): Promise<boolean> {
    this.verifyCalls += 1;
    return Promise.resolve(phc === PREFIX + createHash('sha256').update(password).digest('hex'));
  }
}
