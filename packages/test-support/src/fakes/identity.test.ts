import type { Tx } from '@rogikotha/application';
import { describe, expect, it } from 'vitest';

import { makeCommandPorts } from './command-ports.js';
import { FakeIdentityStore, makeIdentityPorts } from './identity.js';
import { InMemoryUnitOfWork } from './unit-of-work.js';

const tx = {} as Tx;

describe('FakePrivateIdentityRepository', () => {
  it('keeps one anonymous persona per account and review', async () => {
    const { privateIdentities } = makeIdentityPorts();
    const input = { accountId: 'a1', reviewId: 'r1', alias: 'patient-ab23' };

    const first = await privateIdentities.insertAnonymous(tx, input);
    const second = await privateIdentities.insertAnonymous(tx, { ...input, alias: 'patient-cd45' });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: { code: 'thread_taken' } });
    expect(await privateIdentities.findAnonymous(tx, 'a1', 'r1')).toBe(
      first.ok && first.data.personaId,
    );
  });

  it('keeps generated aliases unique and can be told an alias is taken', async () => {
    const { privateIdentities } = makeIdentityPorts();
    await privateIdentities.insertAnonymous(tx, {
      accountId: 'a1',
      reviewId: 'r1',
      alias: 'patient-ab23',
    });
    privateIdentities.takenAliases.add('patient-cd45');

    for (const alias of ['patient-ab23', 'patient-cd45']) {
      expect(
        await privateIdentities.insertAnonymous(tx, { accountId: 'a2', reviewId: 'r1', alias }),
      ).toEqual({ ok: false, error: { code: 'alias_taken' } });
    }
  });

  it('loses a scripted thread race to a winner it writes first', async () => {
    const { privateIdentities, store } = makeIdentityPorts();
    privateIdentities.racingThreads.add('a1:r1');

    const lost = await privateIdentities.insertAnonymous(tx, {
      accountId: 'a1',
      reviewId: 'r1',
      alias: 'patient-ab23',
    });

    expect(lost).toEqual({ ok: false, error: { code: 'thread_taken' } });
    expect(store.links).toHaveLength(1);
  });

  it('creates a missing default persona only for a live account', async () => {
    const command = makeCommandPorts();
    const live = await command.addAccount({ displayName: 'Shirin Demo' });
    const deleted = await command.addAccount({ status: 'deleted' });
    const { privateIdentities } = makeIdentityPorts({ accounts: command.fakes.accounts });

    expect(
      await privateIdentities.createMissingDefault(tx, live.accountId, 'named'),
    ).not.toBeNull();
    expect(await privateIdentities.createMissingDefault(tx, deleted.accountId, 'named')).toBeNull();
    expect(await privateIdentities.createMissingDefault(tx, 'unknown', 'named')).toBeNull();
  });

  it('answers ownership and lists persona ids up to the limit', async () => {
    const { privateIdentities } = makeIdentityPorts();
    const ids = await privateIdentities.createDefault(tx, {
      accountId: 'a1',
      username: 'shirin_88',
      displayName: 'Shirin Demo',
    });

    expect(await privateIdentities.owns(tx, 'a1', ids.namedPersonaId)).toBe(true);
    expect(await privateIdentities.owns(tx, 'a2', ids.namedPersonaId)).toBe(false);
    expect(await privateIdentities.personaIdsOf(tx, 'a1', 1)).toHaveLength(1);
  });
});

describe('FakeIdentityRepository', () => {
  it('reads personas by id and finds usernames of non-anonymous personas only', async () => {
    const { identities, privateIdentities } = makeIdentityPorts();
    const ids = await privateIdentities.createDefault(tx, {
      accountId: 'a1',
      username: 'shirin_88',
      displayName: 'Shirin Demo',
    });

    expect(await identities.byIds(tx, [ids.namedPersonaId, 'unknown'])).toHaveLength(1);
    expect((await identities.publicIdsByUsername(tx, 'shirin_88')).sort()).toEqual(
      [ids.namedPersonaId, ids.pseudonymousPersonaId].sort(),
    );
  });
});

describe('FakeIdentityStore', () => {
  it('a rollback of the unit of work undoes its writes', async () => {
    const store = new FakeIdentityStore();
    const unitOfWork = new InMemoryUnitOfWork([store]);

    await unitOfWork.run(() => {
      store.insert(
        {
          id: store.newPersonaId(),
          kind: 'named',
          displayName: 'A',
          username: 'a',
          avatarHue: null,
        },
        { personaId: 'p', accountId: 'a1', reviewId: null },
      );
      return Promise.resolve({
        ok: false,
        error: { code: 'internal', messageKey: 'x', correlationId: 'c' },
      });
    });

    expect(store.personas).toEqual([]);
    expect(store.links).toEqual([]);
  });

  it('hands out increasing ids, so the newest persona sorts last', () => {
    const store = new FakeIdentityStore();

    const first = store.newPersonaId();
    const second = store.newPersonaId();

    expect(second > first).toBe(true);
  });
});
