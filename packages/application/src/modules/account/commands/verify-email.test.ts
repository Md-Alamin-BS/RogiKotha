import type { AccountStatus } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { anAnonymousActor, makeCommandPorts } from '../../../fakes-test-support';
import { verifyEmailCommand } from './verify-email';

async function tokenFor(status: AccountStatus) {
  const world = makeCommandPorts();
  const account = await world.addAccount({ status });
  const issued = await world.fakes.authGateway.issueVerificationToken(account.email);
  const token = issued.ok ? issued.data.token : '';
  return { world, account, token };
}

const verify = (world: ReturnType<typeof makeCommandPorts>, token: string) =>
  verifyEmailCommand.execute({ token }, world.callAs(anAnonymousActor()));

describe('account.verifyEmail', () => {
  it('activates a pending account, audits it and hands back the session cookie', async () => {
    const { world, account, token } = await tokenFor('pending_verification');

    const result = await verify(world, token);

    expect(result.ok && result.data.session.kind).toBe('set');
    expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe('active');
    expect(world.fakes.audit.events).toEqual([
      expect.objectContaining({ action: 'email_verified', details: { via: 'link' } }),
    ]);
  });

  it.each(['active', 'restricted'] as const)(
    'changes nothing for a %s account and still signs it in',
    async (status) => {
      const { world, account, token } = await tokenFor(status);

      const result = await verify(world, token);

      expect(result.ok && result.data.session.kind).toBe('set');
      expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe(status);
      expect(world.fakes.audit.events).toEqual([]);
    },
  );

  it.each(['suspended', 'banned', 'deleted'] as const)(
    'refuses a %s account as an invalid token and changes nothing (BR2.2)',
    async (status) => {
      const { world, account, token } = await tokenFor(status);
      world.fakes.authGateway.sessionRefusedFor.add(account.authUserId);

      const result = await verify(world, token);

      expect(result.ok ? null : result.error.code).toBe('auth.token_invalid');
      expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe(status);
      expect(world.fakes.store.sessions.size).toBe(0);
    },
  );

  it('answers token_expired after 24 hours and token_invalid for an unknown token', async () => {
    const { world, token } = await tokenFor('pending_verification');
    world.fakes.clock.advance(1);

    const expired = await verify(world, token);
    const unknown = await verify(world, 'not-a-token');

    expect(expired.ok ? null : expired.error.code).toBe('auth.token_expired');
    expect(unknown.ok ? null : unknown.error.code).toBe('auth.token_invalid');
  });

  it('answers ok with no cookie when the library verified but refused the session', async () => {
    const { world, account, token } = await tokenFor('pending_verification');
    world.fakes.authGateway.sessionRefusedFor.add(account.authUserId);

    const result = await verify(world, token);

    expect(result.ok && result.data.session).toEqual({ kind: 'none' });
  });

  it('retries the record and logs the account id only when every attempt fails', async () => {
    const { world, account, token } = await tokenFor('pending_verification');
    world.fakes.unitOfWork.failCommits(3);

    const result = await verify(world, token);

    expect(result.ok).toBe(true);
    expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe(
      'pending_verification',
    );
    expect(world.fakes.logger.entries).toContainEqual({
      level: 'error',
      event: 'auth.verify_record_failed',
      fields: { accountId: account.accountId },
    });
  });

  it('records on a later attempt after one failed commit', async () => {
    const { world, account, token } = await tokenFor('pending_verification');
    world.fakes.unitOfWork.failCommits(1);

    await verify(world, token);

    expect(world.fakes.accounts.profiles.get(account.accountId)?.status).toBe('active');
  });
});
