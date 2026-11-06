import { describe, expect, it } from 'vitest';

import { aPersonaRecord, makeIdentityPorts } from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule, OWN_PERSONA_IDS_MAX } from './index';

const tx = {} as Tx;

function world() {
  const identity = makeIdentityPorts();
  const { ownership } = createIdentityModule(identity.ports);
  const link = (accountId: string, reviewId: string | null = null) => {
    const persona = aPersonaRecord(reviewId ? { kind: 'anonymous' } : {});
    identity.store.insert(persona, { personaId: persona.id, accountId, reviewId });
    return persona.id;
  };
  return { ...identity, ownership, link };
}

describe('ownsPersona', () => {
  it('is true for a persona linked to the account, anonymous ones included', async () => {
    const { ownership, link } = world();
    const named = link('account-a');
    const anonymous = link('account-a', 'review-1');

    expect(await ownership.ownsPersona(tx, { accountId: 'account-a', personaId: named })).toBe(
      true,
    );
    expect(await ownership.ownsPersona(tx, { accountId: 'account-a', personaId: anonymous })).toBe(
      true,
    );
  });

  it('is false for another account and for an unknown id, the same answer either way', async () => {
    const { ownership, link } = world();
    const ofA = link('account-a', 'review-1');

    expect(await ownership.ownsPersona(tx, { accountId: 'account-b', personaId: ofA })).toBe(false);
    expect(await ownership.ownsPersona(tx, { accountId: 'account-b', personaId: 'unknown' })).toBe(
      false,
    );
  });
});

describe('ownPersonaIds', () => {
  it('lists every persona of the account and none of another', async () => {
    const { ownership, link } = world();
    const named = link('account-a');
    const anonymous = link('account-a', 'review-1');
    link('account-b');

    const ids = await ownership.ownPersonaIds(tx, { accountId: 'account-a' });

    expect(ids.sort()).toEqual([named, anonymous].sort());
  });

  it(`throws a programmer error beyond ${OWN_PERSONA_IDS_MAX} personas`, async () => {
    const { ownership, link } = world();
    for (let i = 0; i <= OWN_PERSONA_IDS_MAX; i += 1) link('account-a', `review-${i}`);

    await expect(ownership.ownPersonaIds(tx, { accountId: 'account-a' })).rejects.toThrow(
      /more than 1000/,
    );
  });
});
