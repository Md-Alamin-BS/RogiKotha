import { describe, expect, it } from 'vitest';

import { aPersonaRecord, makeIdentityPorts } from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule } from './index';

const tx = {} as Tx;

function world() {
  const identity = makeIdentityPorts();
  const module = createIdentityModule(identity.ports);
  const add = (overrides: Parameters<typeof aPersonaRecord>[0] = {}) => {
    const persona = aPersonaRecord(overrides);
    identity.store.insert(persona, {
      personaId: persona.id,
      accountId: 'account-1',
      reviewId: null,
    });
    return persona;
  };
  return { ...identity, module, add };
}

describe('publicProjections', () => {
  it('returns the projections in input order and leaves unknown ids out', async () => {
    const { module, add } = world();
    const named = add({ displayName: 'Shirin Demo', username: 'shirin_88' });
    const anonymous = add({ kind: 'anonymous', displayName: 'patient-k7m2' });

    const projections = await module.publicProjections(tx, {
      personaIds: [anonymous.id, 'unknown-id', named.id],
    });

    expect(projections).toEqual([
      { kind: 'anonymous', displayName: 'patient-k7m2', avatarHue: 0 },
      { kind: 'named', displayName: 'Shirin Demo', username: 'shirin_88', avatarHue: null },
    ]);
  });

  it('de-duplicates the ids', async () => {
    const { module, add } = world();
    const named = add();

    expect(await module.publicProjections(tx, { personaIds: [named.id, named.id] })).toHaveLength(
      1,
    );
  });

  it('answers an empty list without a read', async () => {
    const { module } = world();

    expect(await module.publicProjections(tx, { personaIds: [] })).toEqual([]);
  });

  it('accepts 200 distinct ids and throws a programmer error for 201', async () => {
    const { module } = world();
    const ids = (count: number) => Array.from({ length: count }, (_, i) => `persona-${i}`);

    expect(await module.publicProjections(tx, { personaIds: ids(200) })).toEqual([]);
    await expect(module.publicProjections(tx, { personaIds: ids(201) })).rejects.toThrow(
      /more than 200/,
    );
  });
});

describe('publicProjection', () => {
  it('projects one persona and answers null for an unknown id', async () => {
    const { module, add } = world();
    const pseudonymous = add({
      kind: 'pseudonymous',
      displayName: 'shirin_88',
      username: 'shirin_88',
    });

    expect(await module.publicProjection(tx, { personaId: pseudonymous.id })).toEqual({
      kind: 'pseudonymous',
      displayName: 'shirin_88',
      username: 'shirin_88',
      avatarHue: null,
    });
    expect(await module.publicProjection(tx, { personaId: 'unknown-id' })).toBeNull();
  });
});

describe('publicPersonaIdsByUsername', () => {
  it('finds the named and pseudonymous personas of a username and never an anonymous one', async () => {
    const { module, add } = world();
    const named = add({ kind: 'named', username: 'shirin_88' });
    const pseudonymous = add({ kind: 'pseudonymous', username: 'shirin_88' });
    add({ kind: 'anonymous', displayName: 'patient-k7m2', username: null });

    const ids = await module.publicPersonaIdsByUsername(tx, { username: 'shirin_88' });

    expect(ids.sort()).toEqual([named.id, pseudonymous.id].sort());
  });

  it('finds nothing for an alias, for "Anonymous" or for an empty string', async () => {
    const { module, add } = world();
    add({ kind: 'anonymous', displayName: 'patient-k7m2', username: null });
    add({ kind: 'anonymous', displayName: 'Anonymous', username: null });

    for (const username of ['patient-k7m2', 'Anonymous', '']) {
      expect(await module.publicPersonaIdsByUsername(tx, { username })).toEqual([]);
    }
  });
});
