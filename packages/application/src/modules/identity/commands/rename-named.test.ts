import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
  makeIdentityPorts,
} from '../../../fakes-test-support';
import { createIdentityModule } from '../index';

async function world() {
  const command = makeCommandPorts();
  const account = await command.addAccount({ username: 'shirin_88', displayName: 'Shirin Demo' });
  const identity = makeIdentityPorts({ accounts: command.fakes.accounts });
  command.fakes.unitOfWork.enlist(identity.store);
  const { renameNamedCommand } = createIdentityModule(identity.ports);
  const call = command.callAs(anAccountActor(account));
  return { ...identity, command, account, renameNamedCommand, call };
}

describe('identity.renameNamed', () => {
  it('creates a new named persona with the current username and hue and audits it', async () => {
    const { renameNamedCommand, call, store, account, command } = await world();
    await renameNamedCommand.execute({ displayName: 'Shirin Demo' }, call);
    const before = store.personas.map((p) => ({ ...p }));

    const result = await renameNamedCommand.execute({ displayName: '  Shirin Begum ' }, call);

    expect(result).toEqual({ ok: true, data: { changed: true } });
    expect(store.personas.slice(0, before.length)).toEqual(before);
    expect(store.personas.at(-1)).toMatchObject({
      kind: 'named',
      displayName: 'Shirin Begum',
      username: 'shirin_88',
      avatarHue: null,
    });
    expect(command.fakes.audit.events).toEqual([
      {
        stream: `account:${account.accountId}`,
        action: 'named_persona_created',
        actor: `account:${account.accountId}`,
        details: {},
      },
    ]);
  });

  it('copies the current hue onto the new persona', async () => {
    const { renameNamedCommand, call, store, account, privateIdentities } = await world();
    await privateIdentities.insertNamed({} as never, {
      accountId: account.accountId,
      displayName: 'Shirin Demo',
      username: 'shirin_88',
      avatarHue: 120,
    });

    await renameNamedCommand.execute({ displayName: 'Shirin Begum' }, call);

    expect(store.personas.at(-1)).toMatchObject({ displayName: 'Shirin Begum', avatarHue: 120 });
  });

  it('changes nothing and writes no audit row when the name is unchanged', async () => {
    const { renameNamedCommand, call, store, command } = await world();

    const result = await renameNamedCommand.execute({ displayName: 'Shirin Demo' }, call);

    expect(result).toEqual({ ok: true, data: { changed: false } });
    // The missing default persona was created from the profile first (BR2.2).
    expect(store.personas).toHaveLength(1);
    expect(command.fakes.audit.events).toEqual([]);
  });

  it('refuses an empty name with the display-name key', async () => {
    const { renameNamedCommand, call, store } = await world();

    const result = await renameNamedCommand.execute({ displayName: '   ' }, call);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.fieldErrors).toEqual({
      displayName: 'errors.auth.displayNameRequired',
    });
    expect(store.personas).toEqual([]);
  });

  it('refuses an anonymous actor and writes nothing', async () => {
    const { renameNamedCommand, command, store } = await world();

    const result = await renameNamedCommand.execute(
      { displayName: 'Shirin Begum' },
      command.callAs(anAnonymousActor()),
    );

    expect(!result.ok && result.error.code).toBe('forbidden');
    expect(store.personas).toEqual([]);
  });

  it('takes no account id from the input', async () => {
    const { renameNamedCommand, call } = await world();

    const result = await renameNamedCommand.execute(
      { displayName: 'Shirin Begum', accountId: 'another-account' },
      call,
    );

    expect(!result.ok && result.error.code).toBe('validation');
  });
});
