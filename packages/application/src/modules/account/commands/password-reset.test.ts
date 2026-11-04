import type { AccountStatus } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  FAKE_APP_URL,
  makeCommandPorts,
  type FakeCommandWorld,
} from '../../../fakes-test-support';
import { RESET_REQUEST_FLOOR_MS } from '../timing';
import { requestPasswordResetCommand } from './request-password-reset';
import { resetPasswordCommand } from './reset-password';
import { signInCommand } from './sign-in';

const NEW_PASSWORD = 'new-correct-horse';

const requestReset = (world: FakeCommandWorld, email: string, clientAddress = '198.51.100.7') =>
  requestPasswordResetCommand.execute(
    { email },
    world.callAs(anAnonymousActor(), { clientAddress }),
  );

const reset = (world: FakeCommandWorld, token: string, newPassword = NEW_PASSWORD) =>
  resetPasswordCommand.execute({ token, newPassword }, world.callAs(anAnonymousActor()));

async function withResetToken(status: AccountStatus = 'active') {
  const world = makeCommandPorts();
  const account = await world.addAccount({ status, email: 'shirin.demo@example.test' });
  await requestReset(world, account.email);
  const link = world.fakes.deliveries.all()[0]?.params.link ?? '';
  const token = decodeURIComponent(link.split('token=')[1] ?? '');
  world.fakes.audit.events = [];
  return { world, account, token, link };
}

describe('account.requestPasswordReset', () => {
  it('queues a reset link to the own page for an existing account, after the floor', async () => {
    const { world, link } = await withResetToken();

    expect(link).toMatch(new RegExp(`^${FAKE_APP_URL}/en/reset-password\\?token=.+`));
    expect(world.fakes.deliveries.all()[0]).toMatchObject({
      category: 'reset',
      messageKey: 'email.reset',
    });
    expect(world.fakes.sleeper.waits).toEqual([RESET_REQUEST_FLOOR_MS]);
  });

  it('answers the same neutral result for an unknown or deleted address and sends nothing', async () => {
    const world = makeCommandPorts();
    const deleted = await world.addAccount({ status: 'deleted' });

    const unknown = await requestReset(world, 'nobody.demo@example.test');
    const gone = await requestReset(world, deleted.email);

    expect([unknown, gone]).toEqual([
      { ok: true, data: {} },
      { ok: true, data: {} },
    ]);
    expect(world.fakes.deliveries.all()).toEqual([]);
    expect(world.fakes.sleeper.waits).toEqual([RESET_REQUEST_FLOOR_MS, RESET_REQUEST_FLOOR_MS]);
  });

  it('refuses the fourth request in an hour for one address', async () => {
    const world = makeCommandPorts();
    for (let i = 0; i < 3; i += 1) await requestReset(world, 'nobody.demo@example.test');

    const fourth = await requestReset(world, 'nobody.demo@example.test');

    expect(fourth.ok ? null : fourth.error.code).toBe('auth.rate_limited');
  });

  it('answers neutrally and sends nothing past ten mails from one network (review point 4)', async () => {
    const world = makeCommandPorts();
    const account = await world.addAccount();
    for (let i = 0; i < 10; i += 1)
      await requestReset(world, `nobody.demo+${i}@example.test`, '203.0.113.8');

    const limited = await requestReset(world, account.email, '203.0.113.8');

    expect(limited).toEqual({ ok: true, data: {} });
    expect(world.fakes.deliveries.all()).toEqual([]);
  });
});

describe('account.resetPassword', () => {
  it('rotates the password, revokes every session, audits, emits and emails', async () => {
    const { world, account, token } = await withResetToken();
    world.signInAs(account);

    const result = await reset(world, token);

    expect(result).toEqual({ ok: true, data: { session: { kind: 'clear' } } });
    expect(world.fakes.store.sessions.size).toBe(0);
    expect(world.fakes.audit.actions()).toEqual(['password_reset']);
    expect(world.fakes.outbox.events).toEqual([
      {
        name: 'account.securityEvent',
        payload: { accountId: account.accountId, kind: 'passwordChanged' },
      },
    ]);
    expect(world.fakes.deliveries.all().map((d) => d.messageKey)).toEqual([
      'email.reset',
      'email.security.passwordChanged',
    ]);
    const signedIn = await signInCommand.execute(
      { email: account.email, password: NEW_PASSWORD },
      world.callAs(anAnonymousActor()),
    );
    expect(signedIn.ok).toBe(true);
  });

  it('confirms a pending address, because the link proved the inbox (BR5.4)', async () => {
    const { world, account, token } = await withResetToken('pending_verification');

    await reset(world, token);

    expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe('active');
    expect(world.fakes.audit.events).toContainEqual(
      expect.objectContaining({ action: 'email_verified', details: { via: 'reset' } }),
    );
  });

  it('refuses a new password equal to the token account’s email before consuming the token', async () => {
    const { world, token } = await withResetToken();

    const refused = await reset(world, token, 'SHIRIN.DEMO@example.test');
    const retried = await reset(world, token);

    expect(refused.ok ? null : refused.error).toMatchObject({
      code: 'auth.password_equals_email',
      fieldErrors: { newPassword: 'errors.auth.passwordEqualsEmail' },
    });
    expect(world.fakes.authGateway.called('resetPassword')).toBe(1);
    expect(retried.ok).toBe(true);
  });

  it('refuses a used token and an expired one, changing nothing', async () => {
    const { world, token } = await withResetToken();
    await reset(world, token);
    const second = await withResetToken();
    second.world.fakes.clock.advanceMs(60 * 60 * 1000);

    const reused = await reset(world, token);
    const expired = await reset(second.world, second.token);

    expect(reused.ok ? null : reused.error.code).toBe('auth.token_invalid');
    expect(expired.ok ? null : expired.error.code).toBe('auth.token_expired');
    expect(second.world.fakes.audit.events).toEqual([]);
  });

  it('refuses a new password that is too short with its field key', async () => {
    const { world, token } = await withResetToken();

    const result = await reset(world, token, 'short');

    expect(result.ok ? null : result.error).toMatchObject({
      code: 'auth.password_too_short',
      fieldErrors: { newPassword: 'errors.auth.passwordTooShort' },
    });
  });

  it('logs the account id when the record cannot be written after three attempts', async () => {
    const { world, account, token } = await withResetToken();
    world.fakes.unitOfWork.failCommits(3);

    const result = await reset(world, token);

    expect(result.ok).toBe(true);
    expect(world.fakes.logger.entries).toContainEqual({
      level: 'error',
      event: 'auth.reset_record_failed',
      fields: { accountId: account.accountId },
    });
  });
});
