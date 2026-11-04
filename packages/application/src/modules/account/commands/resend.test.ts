import type { AccountStatus } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  anAccountActor,
  anAnonymousActor,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { RESEND_FLOOR_MS } from '../timing';
import { resendOwnVerificationCommand } from './resend-own-verification';
import { resendVerificationCommand } from './resend-verification';

const resend = (world: FakeCommandWorld, email: string, clientAddress = '198.51.100.7') =>
  resendVerificationCommand.execute({ email }, world.callAs(anAnonymousActor(), { clientAddress }));

describe('account.resendVerification', () => {
  it('queues a new verification email for a pending account', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });

    const result = await resend(world, account.email);

    expect(result).toEqual({ ok: true, data: {} });
    expect(world.fakes.deliveries.all()).toEqual([
      expect.objectContaining({ accountId: account.accountId, messageKey: 'email.verify' }),
    ]);
    expect(world.fakes.sleeper.waits).toEqual([RESEND_FLOOR_MS]);
  });

  it.each(['active', 'deleted'] as const)(
    'answers the same neutral result for a %s account and sends nothing',
    async (status: AccountStatus) => {
      const world = makeCommandPorts();
      const account = await world.addAccount({ status });

      const result = await resend(world, account.email);

      expect(result).toEqual({ ok: true, data: {} });
      expect(world.fakes.deliveries.all()).toEqual([]);
      expect(world.fakes.sleeper.waits).toEqual([RESEND_FLOOR_MS]);
    },
  );

  it('answers the same neutral result for an unknown address', async () => {
    const world = makeCommandPorts();

    expect(await resend(world, 'nobody.demo@example.test')).toEqual({ ok: true, data: {} });
    expect(world.fakes.authGateway.called('issueVerificationToken')).toBe(0);
  });

  it('refuses the fourth resend in an hour for any address alike', async () => {
    const world = makeCommandPorts();
    for (let i = 0; i < 3; i += 1) await resend(world, 'nobody.demo@example.test');

    const fourth = await resend(world, 'Nobody.Demo@example.test');

    expect(fourth.ok ? null : fourth.error.code).toBe('auth.rate_limited');
  });

  it('answers neutrally and sends nothing past ten mails from one network (review point 4)', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });
    for (let i = 0; i < 10; i += 1)
      await resend(world, `nobody.demo+${i}@example.test`, '203.0.113.4');

    const limited = await resend(world, account.email, '203.0.113.4');

    expect(limited).toEqual({ ok: true, data: {} });
    expect(world.fakes.deliveries.all()).toEqual([]);
  });
});

describe('account.resendOwnVerification', () => {
  it('queues the verification email to the holder’s own address without taking one', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });

    const result = await resendOwnVerificationCommand.execute(
      {},
      world.callAs(anAccountActor(account)),
    );

    expect(result).toEqual({ ok: true, data: {} });
    const sealed = world.fakes.deliveries.all()[0]?.toEmailEnc ?? new Uint8Array();
    expect(world.fakes.mailCrypto.decryptText(sealed)).toEqual({ ok: true, data: account.email });
  });

  it('does nothing for an account that is already confirmed', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'active' });

    const result = await resendOwnVerificationCommand.execute(
      {},
      world.callAs(anAccountActor(account)),
    );

    expect(result).toEqual({ ok: true, data: {} });
    expect(world.fakes.deliveries.all()).toEqual([]);
  });

  it('refuses the fourth resend in an hour', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount({ status: 'pending_verification' });
    const call = world.callAs(anAccountActor(account));
    for (let i = 0; i < 3; i += 1) await resendOwnVerificationCommand.execute({}, call);

    const fourth = await resendOwnVerificationCommand.execute({}, call);

    expect(fourth.ok ? null : fourth.error).toMatchObject({ code: 'auth.rate_limited' });
    expect(world.fakes.deliveries.all()).toHaveLength(3);
  });

  it('refuses an anonymous caller and an address in the input', async () => {
    const world = makeCommandPorts();

    const anonymous = await resendOwnVerificationCommand.execute(
      {},
      world.callAs(anAnonymousActor()),
    );
    const withAddress = await resendOwnVerificationCommand.execute(
      { email: 's****@example.test' },
      world.callAs(anAnonymousActor()),
    );

    expect(anonymous.ok ? null : anonymous.error.code).toBe('forbidden');
    expect(withAddress.ok ? null : withAddress.error.code).toBe('validation');
  });
});
