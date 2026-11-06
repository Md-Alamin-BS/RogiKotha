import { describe, expect, it } from 'vitest';

import { makeCommandPorts, makeIdentityPorts } from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule } from './index';
import { ALIAS_ATTEMPTS } from './persona-for';

const tx = {} as Tx;
const FIXED_TOKEN = 'A'.repeat(43);

/** Hands out the given tokens in order, then repeats the last one. */
function tokenSource(...tokens: string[]) {
  let calls = 0;
  return { randomToken: () => tokens[Math.min(calls++, tokens.length - 1)]! };
}

async function world(options: { tokens?: string[] } = {}) {
  const command = makeCommandPorts();
  const account = await command.addAccount({ username: 'shirin_88', displayName: 'Shirin Demo' });
  const identity = makeIdentityPorts({ accounts: command.fakes.accounts });
  const ports = options.tokens
    ? { ...identity.ports, crypto: tokenSource(...options.tokens) }
    : identity.ports;
  const module = createIdentityModule(ports);
  return { ...identity, module, account, command };
}

function personaIdOf(
  result: Awaited<ReturnType<ReturnType<typeof createIdentityModule>['personaFor']>>,
) {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.data.personaId;
}

describe('personaFor in named and pseudonymous mode', () => {
  it('returns the existing named persona and ignores the review id', async () => {
    const { module, account, store } = await world();
    const ids = await module.createDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: 'Shirin Demo',
    });

    const result = await module.personaFor(tx, {
      accountId: account.accountId,
      reviewId: 'review-1',
      mode: 'named',
    });

    expect(personaIdOf(result)).toBe(ids.namedPersonaId);
    expect(store.personas).toHaveLength(2);
  });

  it('returns the pseudonymous persona for pseudonymous mode', async () => {
    const { module, account } = await world();
    const ids = await module.createDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: 'Shirin Demo',
    });

    const result = await module.personaFor(tx, {
      accountId: account.accountId,
      mode: 'pseudonymous',
    });

    expect(personaIdOf(result)).toBe(ids.pseudonymousPersonaId);
  });

  it('returns the newest named persona once a rename made a second one', async () => {
    const { module, account, privateIdentities } = await world();
    await module.createDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName: 'Shirin Demo',
    });
    const renamed = await privateIdentities.insertNamed(tx, {
      accountId: account.accountId,
      displayName: 'Shirin Begum',
      username: account.username,
      avatarHue: null,
    });

    const result = await module.personaFor(tx, { accountId: account.accountId, mode: 'named' });

    expect(personaIdOf(result)).toBe(renamed);
  });

  it('creates a missing default persona from the profile once, then reuses it', async () => {
    const { module, account, store } = await world();

    const first = personaIdOf(
      await module.personaFor(tx, { accountId: account.accountId, mode: 'named' }),
    );
    const second = personaIdOf(
      await module.personaFor(tx, { accountId: account.accountId, mode: 'named' }),
    );

    expect(second).toBe(first);
    expect(store.personas).toEqual([
      expect.objectContaining({ id: first, kind: 'named', displayName: 'Shirin Demo' }),
    ]);
    expect(store.links).toEqual([
      { personaId: first, accountId: account.accountId, reviewId: null },
    ]);
  });

  it('creates a missing pseudonymous persona under the username', async () => {
    const { module, account, store } = await world();

    await module.personaFor(tx, { accountId: account.accountId, mode: 'pseudonymous' });

    expect(store.personas).toEqual([
      expect.objectContaining({
        kind: 'pseudonymous',
        displayName: 'shirin_88',
        username: 'shirin_88',
      }),
    ]);
  });

  it('throws a programmer error for an account that does not exist', async () => {
    const { module } = await world();

    await expect(
      module.personaFor(tx, { accountId: 'no-such-account', mode: 'named' }),
    ).rejects.toThrow(/no live account/);
  });

  it('answers validation for an unknown mode', async () => {
    const { module, account } = await world();

    const result = await module.personaFor(tx, { accountId: account.accountId, mode: 'real' });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('validation');
  });
});

describe('personaFor in anonymous mode', () => {
  it('creates one anonymous persona for the thread and returns it again on the next call', async () => {
    const { module, account, store } = await world();

    const first = personaIdOf(
      await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId: 'r1',
        mode: 'anonymous',
      }),
    );
    const again = personaIdOf(
      await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId: 'r1',
        mode: 'anonymous',
      }),
    );

    expect(again).toBe(first);
    expect(store.personas).toHaveLength(1);
    expect(store.personas[0]).toMatchObject({ kind: 'anonymous', username: null, avatarHue: 0 });
    expect(store.personas[0]!.displayName).toMatch(
      /^patient-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/,
    );
    expect(store.links).toEqual([
      { personaId: first, accountId: account.accountId, reviewId: 'r1' },
    ]);
  });

  it('gives another thread a different persona', async () => {
    const { module, account } = await world();

    const r1 = personaIdOf(
      await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId: 'r1',
        mode: 'anonymous',
      }),
    );
    const r2 = personaIdOf(
      await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId: 'r2',
        mode: 'anonymous',
      }),
    );

    expect(r2).not.toBe(r1);
  });

  it('reads the winner when a concurrent first use took the thread', async () => {
    const { module, account, store, privateIdentities } = await world();
    privateIdentities.racingThreads.add(`${account.accountId}:r1`);

    const result = personaIdOf(
      await module.personaFor(tx, {
        accountId: account.accountId,
        reviewId: 'r1',
        mode: 'anonymous',
      }),
    );

    expect(store.personas).toHaveLength(1);
    expect(result).toBe(store.personas[0]!.id);
  });

  it('draws a new alias when the first one is taken', async () => {
    const { module, account, store, privateIdentities } = await world({
      tokens: [FIXED_TOKEN, 'B'.repeat(43)],
    });
    privateIdentities.takenAliases.add('patient-aaaa');

    await module.personaFor(tx, {
      accountId: account.accountId,
      reviewId: 'r1',
      mode: 'anonymous',
    });

    expect(privateIdentities.insertAnonymousCalls).toBe(2);
    expect(store.personas.map((p) => p.displayName)).toEqual(['patient-bbbb']);
  });

  it(`answers internal after ${ALIAS_ATTEMPTS} taken aliases and writes nothing`, async () => {
    const { module, account, store, privateIdentities, logger } = await world({
      tokens: [FIXED_TOKEN],
    });
    privateIdentities.takenAliases.add('patient-aaaa');

    const result = await module.personaFor(tx, {
      accountId: account.accountId,
      reviewId: 'r1',
      mode: 'anonymous',
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('internal');
    expect(privateIdentities.insertAnonymousCalls).toBe(ALIAS_ATTEMPTS);
    expect(store.personas).toEqual([]);
    expect(store.links).toEqual([]);
    expect(logger.entries).toEqual([
      {
        level: 'error',
        event: 'identity.alias_exhausted',
        fields: {
          attempts: ALIAS_ATTEMPTS,
          correlationId: !result.ok && result.error.correlationId,
        },
      },
    ]);
  });

  it('throws a programmer error without a review id', async () => {
    const { module, account } = await world();

    await expect(
      module.personaFor(tx, { accountId: account.accountId, mode: 'anonymous' }),
    ).rejects.toThrow(/anonymous needs a reviewId/);
  });
});

describe('createDefaultPersonas', () => {
  it('creates one named and one pseudonymous persona with unscoped links', async () => {
    const { module, account, store } = await world();

    const ids = await module.createDefaultPersonas(tx, {
      accountId: account.accountId,
      username: 'shirin_88',
      displayName: 'Shirin Demo',
    });

    expect(store.personas).toEqual([
      {
        id: ids.namedPersonaId,
        kind: 'named',
        displayName: 'Shirin Demo',
        username: 'shirin_88',
        avatarHue: null,
      },
      {
        id: ids.pseudonymousPersonaId,
        kind: 'pseudonymous',
        displayName: 'shirin_88',
        username: 'shirin_88',
        avatarHue: null,
      },
    ]);
    expect(store.links.every((l) => l.reviewId === null && l.accountId === account.accountId)).toBe(
      true,
    );
  });

  it('is idempotent: a repeat returns the same ids and creates nothing', async () => {
    const { module, account, store } = await world();
    const input = {
      accountId: account.accountId,
      username: 'shirin_88',
      displayName: 'Shirin Demo',
    };

    const first = await module.createDefaultPersonas(tx, input);
    const second = await module.createDefaultPersonas(tx, input);

    expect(second).toEqual(first);
    expect(store.personas).toHaveLength(2);
  });
});
