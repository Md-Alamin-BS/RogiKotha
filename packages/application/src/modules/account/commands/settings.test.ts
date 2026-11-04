import { describe, expect, it } from 'vitest';

import { anAccountActor, anAnonymousActor, makeCommandPorts } from '../../../fakes-test-support';
import { getOwnAccountQuery } from '../queries/get-own-account';
import { submitFeedbackCommand } from './submit-feedback';
import { updatePreferencesCommand } from './update-preferences';

describe('account.updatePreferences', () => {
  it('saves a partial change for a pending account and audits the field names only', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });

    const result = await updatePreferencesCommand.execute(
      { interfaceLocale: 'bn', emailDiscussion: false },
      world.callAs(anAccountActor(account)),
    );

    expect(result).toEqual({ ok: true, data: {} });
    expect(
      await world.fakes.accounts.findPreferences({} as never, account.accountId),
    ).toMatchObject({
      interfaceLocale: 'bn',
      emailDiscussion: false,
      emailSecurity: true,
    });
    expect(world.fakes.audit.events).toEqual([
      expect.objectContaining({
        action: 'preferences_updated',
        details: { fields: ['emailDiscussion', 'interfaceLocale'] },
      }),
    ]);
  });

  it('writes nothing for an empty change', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();

    await updatePreferencesCommand.execute({}, world.callAs(anAccountActor(account)));

    expect(world.fakes.audit.events).toEqual([]);
  });

  it('refuses an anonymous caller', async () => {
    const world = makeCommandPorts();

    const result = await updatePreferencesCommand.execute(
      { interfaceLocale: 'bn' },
      world.callAs(anAnonymousActor()),
    );

    expect(result.ok ? null : result.error.code).toBe('forbidden');
  });
});

describe('account.submitFeedback', () => {
  it('stores the body with the writer’s locale and audits the row id, never the body', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();

    const result = await submitFeedbackCommand.execute(
      { body: '  সাইটটি ভালো লাগছে  ' },
      world.callAs(anAccountActor(account, { locale: 'bn' })),
    );

    expect(result).toEqual({ ok: true, data: {} });
    expect(world.fakes.accounts.feedback).toEqual([
      expect.objectContaining({ body: 'সাইটটি ভালো লাগছে', locale: 'bn' }),
    ]);
    const [entry] = world.fakes.audit.events;
    expect(entry?.action).toBe('feedback_submitted');
    expect(JSON.stringify(entry)).not.toContain('সাইটটি');
  });

  it('refuses the sixth submission in a day', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();
    const call = world.callAs(anAccountActor(account));
    for (let i = 0; i < 5; i += 1) await submitFeedbackCommand.execute({ body: `Note ${i}` }, call);

    const sixth = await submitFeedbackCommand.execute({ body: 'One more' }, call);

    expect(sixth.ok ? null : sixth.error.code).toBe('rate_limited');
    expect(world.fakes.accounts.feedback).toHaveLength(5);
  });

  it('refuses an empty body or one over 2000 characters', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();
    const call = world.callAs(anAccountActor(account));

    const empty = await submitFeedbackCommand.execute({ body: '   ' }, call);
    const long = await submitFeedbackCommand.execute({ body: 'x'.repeat(2001) }, call);

    expect([empty, long].map((r) => (r.ok ? null : r.error.code))).toEqual([
      'validation',
      'validation',
    ]);
  });
});

describe('account.getOwnAccount', () => {
  it('returns the holder’s own account with the address only masked', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({
      email: 'shirin.demo@example.test',
      username: 'shirin_88',
      displayName: 'Shirin',
      status: 'pending_verification',
    });

    const result = await getOwnAccountQuery.execute({}, world.callAs(anAccountActor(account)));

    expect(result).toEqual({
      ok: true,
      data: {
        username: 'shirin_88',
        displayName: 'Shirin',
        emailVerified: false,
        emailMasked: 's****@example.test',
      },
    });
    expect(JSON.stringify(result)).not.toContain('shirin.demo');
    expect(world.fakes.logger.entries).toEqual([]);
  });

  it('never returns another account’s data', async () => {
    const world = makeCommandPorts();
    const holder = await world.addAccount({ email: 'shirin.demo@example.test' });
    await world.addAccount({ email: 'rafi.demo@example.test' });

    const result = await getOwnAccountQuery.execute({}, world.callAs(anAccountActor(holder)));

    expect(result.ok && result.data.emailMasked).toBe('s****@example.test');
  });

  it('refuses an anonymous caller and an account Actor without a profile', async () => {
    const world = makeCommandPorts();

    const anonymous = await getOwnAccountQuery.execute({}, world.callAs(anAnonymousActor()));
    const missing = await getOwnAccountQuery.execute(
      {},
      world.callAs(anAccountActor({ accountId: 'missing', status: 'active' })),
    );

    expect([anonymous, missing].map((r) => (r.ok ? null : r.error.code))).toEqual([
      'forbidden',
      'forbidden',
    ]);
  });
});
