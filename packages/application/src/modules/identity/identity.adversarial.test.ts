// U11 Step 17, high-risk adversarial tests (functional-spec § 8.1, 8.2, 8.5), written by an agent
// that did not build the module. Each test tries to correlate, de-anonymise or rewrite a persona
// through the public surface of the identity module over the test-support fakes.
import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
  makeIdentityPorts,
} from '../../fakes-test-support';
import type { Tx } from '../../ports/unit-of-work';
import { createIdentityModule } from './index';

const tx = {} as Tx;
const ALIAS = /^patient-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;
const DENYLIST = [
  'id',
  'personaId',
  'accountId',
  'account_id',
  'email',
  'reviewId',
  'review_id',
  'createdAt',
  'userId',
  'authUserId',
];

async function world() {
  const command = makeCommandPorts();
  const shirin = await command.addAccount({ username: 'shirin_88', displayName: 'Shirin Demo' });
  const karim = await command.addAccount({ username: 'karim_07', displayName: 'Karim Demo' });
  const identity = makeIdentityPorts({ accounts: command.fakes.accounts });
  command.fakes.unitOfWork.enlist(identity.store);
  const module = createIdentityModule(identity.ports);
  for (const [account, displayName] of [
    [shirin, 'Shirin Demo'],
    [karim, 'Karim Demo'],
  ] as const) {
    await module.createDefaultPersonas(tx, {
      accountId: account.accountId,
      username: account.username,
      displayName,
    });
  }
  return { command, identity, module, shirin, karim };
}

async function anonymousIn(
  module: ReturnType<typeof createIdentityModule>,
  accountId: string,
  reviewId: string,
): Promise<string> {
  const result = await module.personaFor(tx, { accountId, reviewId, mode: 'anonymous' });
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.data.personaId;
}

/** Every key at any depth of a JSON value. */
function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
}

describe('U11 adversarial: cross-thread correlation (§ 8.1)', () => {
  it('gives one account two unrelated anonymous projections in two threads, sharing only kind and hue 0', async () => {
    const { module, shirin } = await world();
    const inThreadOne = await anonymousIn(module, shirin.accountId, 'review-one');
    const inThreadTwo = await anonymousIn(module, shirin.accountId, 'review-two');
    // A comment in each thread reuses the thread's persona, so it adds no new projection.
    expect(await anonymousIn(module, shirin.accountId, 'review-one')).toBe(inThreadOne);
    expect(await anonymousIn(module, shirin.accountId, 'review-two')).toBe(inThreadTwo);

    const [one, two] = await module.publicProjections(tx, {
      personaIds: [inThreadOne, inThreadTwo],
    });

    expect(Object.keys(one!)).toEqual(['kind', 'displayName', 'avatarHue']);
    expect(Object.keys(two!)).toEqual(['kind', 'displayName', 'avatarHue']);
    expect(one!.displayName).toMatch(ALIAS);
    expect(two!.displayName).toMatch(ALIAS);
    expect(one!.displayName).not.toBe(two!.displayName);
    const shared = Object.entries(one!).filter(
      ([key, value]) => (two as unknown as Record<string, unknown>)[key] === value,
    );
    expect(shared).toEqual([
      ['kind', 'anonymous'],
      ['avatarHue', 0],
    ]);
    const rendered = JSON.stringify([one, two]);
    for (const secret of [inThreadOne, inThreadTwo, shirin.accountId, 'shirin_88', 'Shirin Demo']) {
      expect(rendered).not.toContain(secret);
    }
  });

  it('gives two accounts in the same thread different aliases, so a thread never merges two authors', async () => {
    const { module, shirin, karim } = await world();

    const [fromShirin, fromKarim] = await module.publicProjections(tx, {
      personaIds: [
        await anonymousIn(module, shirin.accountId, 'review-one'),
        await anonymousIn(module, karim.accountId, 'review-one'),
      ],
    });

    expect(fromShirin!.displayName).not.toBe(fromKarim!.displayName);
  });
});

describe('U11 adversarial: linkage leak through projections (§ 8.2)', () => {
  it('leaks no denylisted key, id, account field or username for every kind, legacy rows and junk ids', async () => {
    const { module, identity, shirin } = await world();
    const anonymous = await anonymousIn(module, shirin.accountId, 'review-one');
    // Worst-case legacy rows: an anonymous row that still carries a real-looking name and a username.
    const legacyNamed = identity.store.newPersonaId();
    identity.store.insert(
      {
        id: legacyNamed,
        kind: 'anonymous',
        displayName: 'Shirin Demo',
        username: 'shirin_88',
        avatarHue: 200,
      },
      { personaId: legacyNamed, accountId: shirin.accountId, reviewId: 'review-legacy' },
    );
    const legacyAnonymous = identity.store.newPersonaId();
    identity.store.insert(
      {
        id: legacyAnonymous,
        kind: 'anonymous',
        displayName: 'Anonymous',
        username: null,
        avatarHue: 0,
      },
      { personaId: legacyAnonymous, accountId: shirin.accountId, reviewId: 'review-old' },
    );
    const everyId = identity.store.personas.map((p) => p.id);
    const junk = ['', ' ', 'not-a-uuid', shirin.accountId, '00000000-0000-7000-9000-ffffffffffff'];

    const projections = await module.publicProjections(tx, {
      personaIds: [...everyId, ...everyId, ...junk.filter((id) => id !== '')],
    });

    expect(projections).toHaveLength(everyId.length);
    expect(keysOf(projections).filter((key) => DENYLIST.includes(key))).toEqual([]);
    const anonymousOnes = projections.filter((p) => p.kind === 'anonymous');
    expect(anonymousOnes).toHaveLength(3);
    for (const projection of anonymousOnes) {
      expect(projection).not.toHaveProperty('username');
      expect(projection.avatarHue).toBe(0);
      expect(projection.displayName === null || ALIAS.test(projection.displayName)).toBe(true);
    }
    const anonymousJson = JSON.stringify(anonymousOnes);
    for (const secret of [...everyId, shirin.accountId, 'shirin_88', 'Shirin Demo']) {
      expect(anonymousJson).not.toContain(secret);
    }
    expect(anonymous).toBeDefined();
  });
});

describe('U11 adversarial: reaching an alias by name and rename snapshots (§ 8.5)', () => {
  it('finds no persona by an alias, "Anonymous", an empty string or a near-miss of a username', async () => {
    const { module, shirin } = await world();
    const [projection] = await module.publicProjections(tx, {
      personaIds: [await anonymousIn(module, shirin.accountId, 'review-one')],
    });
    const alias = projection!.displayName!;

    for (const username of [alias, 'Anonymous', 'anonymous', '', ' shirin_88', 'shirin_88 ']) {
      expect(await module.publicPersonaIdsByUsername(tx, { username })).toEqual([]);
    }
  });

  it('keeps every earlier persona byte-identical across renames, including a Bengali name typed in NFD', async () => {
    const { module, identity, command, shirin } = await world();
    const call = command.callAs(anAccountActor(shirin));
    await anonymousIn(module, shirin.accountId, 'review-one');
    const earlierCount = identity.store.personas.length;
    const before = JSON.stringify(identity.store.personas);
    const bengali = 'শিরিন বেগম';

    expect(await module.renameNamedCommand.execute({ displayName: bengali }, call)).toEqual({
      ok: true,
      data: { changed: true },
    });
    // The same name in decomposed form is the same name once NFC-normalised.
    expect(
      await module.renameNamedCommand.execute({ displayName: bengali.normalize('NFD') }, call),
    ).toEqual({ ok: true, data: { changed: false } });
    await module.renameNamedCommand.execute({ displayName: 'Shirin Demo' }, call);

    const after = identity.store.personas;
    expect(JSON.stringify(after.slice(0, earlierCount))).toBe(before);
    expect(after.slice(-2).map((p) => [p.kind, p.displayName, p.username])).toEqual([
      ['named', bengali.normalize('NFC'), 'shirin_88'],
      ['named', 'Shirin Demo', 'shirin_88'],
    ]);
  });

  it('refuses an anonymous actor that names another account, and writes nothing', async () => {
    const { module, identity, command, shirin } = await world();
    const before = JSON.stringify(identity.store.personas);

    const result = await module.renameNamedCommand.execute(
      { displayName: 'Taken Over' },
      command.callAs(anAnonymousActor({ accountId: shirin.accountId })),
    );

    expect(result.ok).toBe(false);
    expect(JSON.stringify(identity.store.personas)).toBe(before);
    expect(command.fakes.audit.events).toEqual([]);
  });
});
