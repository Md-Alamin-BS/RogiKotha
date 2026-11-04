import { DEFAULT_CONFIG_VALUES, type AccountStatus } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  aConfig,
  anAnonymousActor,
  FAKE_APP_URL,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { primeDummyCredential } from '../dummy-credential';
import { signInCommand } from './sign-in';

const EMAIL = 'shirin.demo@example.test';
const PASSWORD = 'correct-horse-battery';
const WRONG = 'wrong-horse-battery';

function signIn(
  world: FakeCommandWorld,
  email: string,
  password: string,
  clientAddress = '198.51.100.7',
) {
  return signInCommand.execute(
    { email, password },
    world.callAs(anAnonymousActor(), { clientAddress }),
  );
}

async function failTimes(world: FakeCommandWorld, times: number, email = EMAIL) {
  for (let i = 0; i < times; i += 1) {
    await signIn(world, email, WRONG);
    // Past any delay, so each attempt is checked and counted.
    world.fakes.clock.advanceMs(31_000);
  }
}

async function worldWith(status: AccountStatus = 'active') {
  const world = makeCommandPorts();
  const account = await world.addAccount({ email: EMAIL, password: PASSWORD, status });
  return { world, account };
}

describe('account.signIn checks the password once', () => {
  it.each([
    ['an unknown address', 'nobody.demo@example.test', PASSWORD],
    ['a wrong password', EMAIL, WRONG],
  ])(
    'verifies exactly once and never reaches the library for %s',
    async (_name, email, password) => {
      const { world } = await worldWith();

      const result = await signIn(world, email, password);

      expect(result.ok ? null : result.error.code).toBe('auth.invalid_credentials');
      expect(world.fakes.hasher.verifyCalls).toBe(1);
      expect(world.fakes.authGateway.called('createSession')).toBe(0);
    },
  );

  it('treats a deleted account exactly like a wrong password (BR3.7)', async () => {
    const { world } = await worldWith('deleted');

    const result = await signIn(world, EMAIL, PASSWORD);

    expect(result.ok ? null : result.error.code).toBe('auth.invalid_credentials');
    expect(world.fakes.hasher.verifyCalls).toBe(1);
    expect(world.fakes.rateLimiter.keysWithFailures()).toHaveLength(2);
  });

  it.each(['suspended', 'banned'] as const)(
    'tells a %s account only after the right password, with no session and no failure',
    async (status) => {
      const { world } = await worldWith(status);

      const result = await signIn(world, EMAIL, PASSWORD);

      expect(result.ok ? null : result.error.code).toBe('auth.account_suspended');
      expect(world.fakes.authGateway.called('createSession')).toBe(0);
      expect(world.fakes.store.sessions.size).toBe(0);
      expect(world.fakes.rateLimiter.keysWithFailures()).toEqual([]);
    },
  );

  it.each(['pending_verification', 'active', 'restricted'] as const)(
    'gives a %s account its session cookie through the library',
    async (status) => {
      const { world } = await worldWith(status);

      const result = await signIn(world, ` ${EMAIL.toUpperCase()} `, PASSWORD);

      expect(result.ok).toBe(true);
      expect(result.ok && result.data.session.kind).toBe('set');
      expect(result.ok && result.data.session.setCookies[0]).toMatch(/HttpOnly/);
      expect(world.fakes.authGateway.called('createSession')).toBe(1);
      expect(world.fakes.store.sessions.size).toBe(1);
    },
  );

  it('answers the same shape for an unknown and a known address (BR3.11)', async () => {
    const { world } = await worldWith();

    const known = await signIn(world, EMAIL, WRONG);
    const unknown = await signIn(world, 'nobody.demo@example.test', WRONG, '203.0.113.5');

    const shape = (r: typeof known) => (r.ok ? null : { ...r.error, correlationId: 'x' });
    expect(shape(known)).toEqual(shape(unknown));
    expect(Object.keys(known.ok ? {} : known.error).sort()).toEqual([
      'code',
      'correlationId',
      'messageKey',
    ]);
  });

  it('answers suspended when the library refuses the session as a second layer', async () => {
    const { world, account } = await worldWith();
    world.fakes.authGateway.sessionRefusedFor.add(account.authUserId);

    const result = await signIn(world, EMAIL, PASSWORD);

    expect(result.ok ? null : result.error.code).toBe('auth.account_suspended');
  });

  it('answers internal when the library fails to mint the session', async () => {
    const { world } = await worldWith();
    world.fakes.authGateway.failNext('createSession');

    const result = await signIn(world, EMAIL, PASSWORD);

    expect(result.ok ? null : result.error.code).toBe('internal');
  });
});

describe('account.signIn limits and the progressive delay', () => {
  it('refuses during the delay with no repository read and no password check (BR3.2)', async () => {
    const { world } = await worldWith();
    for (let i = 0; i < 3; i += 1) await signIn(world, EMAIL, WRONG);
    world.fakes.hasher.verifyCalls = 0;
    world.fakes.accounts.emailReads = 0;

    const refused = await signIn(world, EMAIL, PASSWORD);

    expect(refused.ok ? null : refused.error).toMatchObject({
      code: 'auth.rate_limited',
      retryAfterSec: 1,
    });
    expect(world.fakes.hasher.verifyCalls).toBe(0);
    expect(world.fakes.accounts.emailReads).toBe(0);
    expect(world.fakes.authGateway.called('createSession')).toBe(0);
  });

  it('counts address variants on one counter (BR3.1)', async () => {
    const { world } = await worldWith();
    await signIn(world, EMAIL, WRONG);
    await signIn(world, EMAIL.toUpperCase(), WRONG);
    await signIn(world, `  ${EMAIL}  `, WRONG);

    const fourth = await signIn(world, EMAIL, PASSWORD);

    expect(fourth.ok ? null : fourth.error.code).toBe('auth.rate_limited');
  });

  it('refuses the eleventh attempt for one address until the oldest failure leaves the window', async () => {
    const { world } = await worldWith();
    await failTimes(world, 10);

    const refused = await signIn(world, EMAIL, PASSWORD);
    world.fakes.clock.advanceMs(15 * 60_000);
    const later = await signIn(world, EMAIL, PASSWORD);

    expect(refused.ok ? null : refused.error.code).toBe('auth.rate_limited');
    expect(later.ok).toBe(true);
  });

  it('refuses the 31st attempt from one network across rotating addresses', async () => {
    const { world } = await worldWith();
    for (let i = 0; i < 30; i += 1) await signIn(world, `nobody.demo+${i}@example.test`, WRONG);

    const refused = await signIn(world, EMAIL, PASSWORD);
    const otherNetwork = await signIn(world, EMAIL, PASSWORD, '198.51.100.99');

    expect(refused.ok ? null : refused.error.code).toBe('auth.rate_limited');
    expect(otherNetwork.ok).toBe(true);
  });

  it('counts both counters inside windowMinutes from the settings (review point 2)', async () => {
    const { world } = await worldWith();
    const signInSettings = { ...DEFAULT_CONFIG_VALUES.signIn, windowMinutes: 60 };
    world.fakes.config.set(aConfig({ signIn: signInSettings }));
    await failTimes(world, 10);
    world.fakes.clock.advanceMs(16 * 60_000);

    const refused = await signIn(world, EMAIL, PASSWORD);

    expect(refused.ok ? null : refused.error.code).toBe('auth.rate_limited');
  });

  it('reads the delay settings through the asynchronous provider (threshold 5, cap 10 s)', async () => {
    const { world } = await worldWith();
    const signInSettings = {
      ...DEFAULT_CONFIG_VALUES.signIn,
      delayAfterFailures: 5,
      maxDelaySeconds: 10,
    };
    world.fakes.config.set(aConfig({ signIn: signInSettings }));
    for (let i = 0; i < 4; i += 1) await signIn(world, EMAIL, WRONG);

    const fifthChecked = await signIn(world, EMAIL, WRONG);
    const sixthRefused = await signIn(world, EMAIL, PASSWORD);

    expect(fifthChecked.ok ? null : fifthChecked.error.code).toBe('auth.invalid_credentials');
    expect(sixthRefused.ok ? null : sixthRefused.error.retryAfterSec).toBe(1);
  });

  it('applies the same delay to an unknown address (FD-058)', async () => {
    const world = makeCommandPorts();
    await failTimes(world, 3, 'nobody.demo@example.test');
    await signIn(world, 'nobody.demo@example.test', WRONG);

    const refused = await signIn(world, 'nobody.demo@example.test', WRONG);

    expect(refused.ok ? null : refused.error.retryAfterSec).toBe(2);
  });

  it('clears the address counter after a success', async () => {
    const { world } = await worldWith();
    await signIn(world, EMAIL, WRONG);
    await signIn(world, EMAIL, WRONG);
    await signIn(world, EMAIL, PASSWORD);

    const afterSuccess = await signIn(world, EMAIL, WRONG);
    const checkedAgain = await signIn(world, EMAIL, WRONG);

    expect(afterSuccess.ok ? null : afterSuccess.error.code).toBe('auth.invalid_credentials');
    expect(checkedAgain.ok ? null : checkedAgain.error.code).toBe('auth.invalid_credentials');
  });
});

describe('account.signIn severe-activity notice (WF5)', () => {
  it('writes one email, one event and one audit row at the tenth failure, after the response', async () => {
    const { world, account } = await worldWith();

    await failTimes(world, 10);
    await world.fakes.afterResponse.settle();

    expect(world.fakes.afterResponse.scheduled).toBe(1);
    expect(world.fakes.deliveries.all()).toEqual([
      expect.objectContaining({
        accountId: account.accountId,
        messageKey: 'email.security.severeSignInActivity',
        params: { link: `${FAKE_APP_URL}/en/reset-password` },
      }),
    ]);
    expect(world.fakes.outbox.events).toEqual([
      {
        name: 'account.securityEvent',
        payload: { accountId: account.accountId, kind: 'severeSignInActivity' },
      },
    ]);
    expect(world.fakes.audit.events).toEqual([
      expect.objectContaining({ action: 'severe_sign_in_activity', details: { failures: 10 } }),
    ]);
  });

  it('sends it at most once per window, even when the count reaches the threshold again', async () => {
    const { world } = await worldWith();
    await failTimes(world, 10);
    await world.fakes.afterResponse.settle();
    // The first failure leaves the 15-minute window; the notice, sent at the tenth, does not.
    world.fakes.clock.advanceMs(591_000);

    await signIn(world, EMAIL, WRONG);
    await world.fakes.afterResponse.settle();

    expect(world.fakes.afterResponse.scheduled).toBe(2);
    expect(world.fakes.deliveries.all()).toHaveLength(1);
  });

  it('writes nothing for an address without an account', async () => {
    const world = makeCommandPorts();

    await failTimes(world, 10, 'nobody.demo@example.test');
    await world.fakes.afterResponse.settle();

    expect(world.fakes.afterResponse.scheduled).toBe(0);
    expect(world.fakes.deliveries.all()).toEqual([]);
  });

  it('logs and swallows a failure of the notice, which never changes the answer', async () => {
    const { world } = await worldWith();
    world.fakes.jobQueue.refuseEnqueues(1);

    await failTimes(world, 10);
    await world.fakes.afterResponse.settle();

    expect(world.fakes.logger.events()).toContain('auth.severe_notice_failed');
    expect(world.fakes.deliveries.all()).toEqual([]);
  });
});

describe('the dummy credential', () => {
  it('is hashed once per hasher, so a primed container pays nothing on the first sign-in', async () => {
    const world = makeCommandPorts();
    await primeDummyCredential(world.fakes.hasher);
    await primeDummyCredential(world.fakes.hasher);

    await signIn(world, 'nobody.demo@example.test', WRONG);

    expect(world.fakes.hasher.hashCalls).toBe(1);
    expect(world.fakes.hasher.verifyCalls).toBe(1);
  });
});
