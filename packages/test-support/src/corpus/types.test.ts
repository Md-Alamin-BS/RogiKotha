import { IDENTITY_MODES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { identityToMode, type PrototypeIdentity } from './types.js';

describe('identityToMode', () => {
  it.each<[PrototypeIdentity, string]>([
    ['real', 'named'],
    ['pseudo', 'pseudonymous'],
    ['anon', 'anonymous'],
  ])('maps the prototype identity %s to the %s identity mode', (identity, mode) => {
    expect(identityToMode(identity)).toBe(mode);
  });

  it('only ever produces a mode the contracts know', () => {
    const identities: PrototypeIdentity[] = ['real', 'pseudo', 'anon'];

    for (const identity of identities) {
      expect(IDENTITY_MODES).toContain(identityToMode(identity));
    }
  });
});
