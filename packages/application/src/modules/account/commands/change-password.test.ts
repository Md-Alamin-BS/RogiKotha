import { describe, expect, it } from 'vitest';

import { anAccountActor, anAnonymousActor, makeCommandPorts } from '../../../fakes-test-support';
import { changePasswordCommand } from './change-password';

const CURRENT = 'correct-horse-battery';
const NEXT = 'next-correct-horse';

async function signedIn() {
  const world = makeCommandPorts();
  const account = await world.addAccount({ password: CURRENT, email: 'shirin.demo@example.test' });
  const current = world.signInAs(account);
  const other = world.signInAs(account);
  const call = world.callAs(anAccountActor(account), current);
  return { world, account, current, other, call };
}

describe('account.changePassword', () => {
  it('rotates the password, revokes the other sessions, audits, emits and emails', async () => {
    const { world, account, other, call } = await signedIn();

    const result = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: NEXT },
      call,
    );

    expect(result.ok && result.data.session.kind).toBe('set');
    expect(world.fakes.store.sessions.has(other.sessionId)).toBe(false);
    expect(world.fakes.audit.actions()).toEqual(['password_changed']);
    expect(world.fakes.outbox.events).toEqual([
      {
        name: 'account.securityEvent',
        payload: { accountId: account.accountId, kind: 'passwordChanged' },
      },
    ]);
    expect(world.fakes.deliveries.all().map((d) => d.messageKey)).toEqual([
      'email.security.passwordChanged',
    ]);
  });

  it('refuses a wrong current password on its field and records a failure', async () => {
    const { world, call } = await signedIn();

    const result = await changePasswordCommand.execute(
      { currentPassword: 'not-it-at-all', newPassword: NEXT },
      call,
    );

    expect(result.ok ? null : result.error).toMatchObject({
      code: 'auth.invalid_credentials',
      fieldErrors: { currentPassword: 'errors.auth.invalidCredentials' },
    });
    expect(world.fakes.authGateway.called('changePassword')).toBe(0);
    expect(world.fakes.audit.events).toEqual([]);
  });

  it('refuses the sixth attempt after five wrong passwords in 15 minutes', async () => {
    const { call } = await signedIn();
    for (let i = 0; i < 5; i += 1) {
      await changePasswordCommand.execute(
        { currentPassword: 'not-it-at-all', newPassword: NEXT },
        call,
      );
    }

    const sixth = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: NEXT },
      call,
    );

    expect(sixth.ok ? null : sixth.error.code).toBe('auth.rate_limited');
  });

  it('lets at most five of 15 parallel wrong passwords past the check (ISS-453)', async () => {
    const { world, call } = await signedIn();
    const hasher = world.fakes.hasher;
    const verify = hasher.verify.bind(hasher);
    // A few real milliseconds per check, like Argon2, so the attempts overlap.
    hasher.verify = async (password, phc) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return verify(password, phc);
    };

    const results = await Promise.all(
      Array.from({ length: 15 }, () =>
        changePasswordCommand.execute(
          { currentPassword: 'not-it-at-all', newPassword: NEXT },
          call,
        ),
      ),
    );

    expect(hasher.verifyCalls).toBe(5);
    expect(results.filter((r) => !r.ok && r.error.code === 'auth.rate_limited')).toHaveLength(10);
  });

  it('does not count a right current password against the limit', async () => {
    const { world, call } = await signedIn();
    for (let i = 0; i < 4; i += 1) {
      await changePasswordCommand.execute(
        { currentPassword: 'not-it-at-all', newPassword: NEXT },
        call,
      );
    }
    await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: 'Shirin.Demo@example.test' },
      call,
    );

    const fifthWrong = await changePasswordCommand.execute(
      { currentPassword: 'not-it-at-all', newPassword: NEXT },
      call,
    );

    expect(fifthWrong.ok ? null : fifthWrong.error.code).toBe('auth.invalid_credentials');
    expect(world.fakes.rateLimiter.keysWithFailures()).toHaveLength(1);
  });

  it('refuses a new password equal to the holder’s email', async () => {
    const { call } = await signedIn();

    const result = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: 'Shirin.Demo@example.test' },
      call,
    );

    expect(result.ok ? null : result.error.code).toBe('auth.password_equals_email');
  });

  it('answers internal when the library fails, and invalid credentials when it disagrees', async () => {
    const { world, call } = await signedIn();
    world.fakes.authGateway.failNext('changePassword');

    const failed = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: NEXT },
      call,
    );
    const noSession = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: NEXT },
      { ...call, request: { ...call.request, headers: { get: () => null } } },
    );

    expect(failed.ok ? null : failed.error.code).toBe('internal');
    expect(noSession.ok ? null : noSession.error.code).toBe('auth.invalid_credentials');
  });

  it('refuses an anonymous caller', async () => {
    const world = makeCommandPorts();

    const result = await changePasswordCommand.execute(
      { currentPassword: CURRENT, newPassword: NEXT },
      world.callAs(anAnonymousActor()),
    );

    expect(result.ok ? null : result.error.code).toBe('forbidden');
  });
});
