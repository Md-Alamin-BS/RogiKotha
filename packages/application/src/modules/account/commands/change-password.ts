// `account.changePassword` (T-101 WF9, BR5.3): the current password first, 5 failures per 15
// minutes per account; the library rotates it and revokes every other session.
import {
  ChangePasswordInput,
  err,
  ok,
  passwordEqualsEmail,
  type Result,
} from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import { queueAccountEmail } from '../internal/mail';
import {
  accountKey,
  CHANGE_PASSWORD_FAILURES,
  rateLimited,
  secondsUntilWindowFrees,
} from '../limits';
import { linkParams } from '../links';
import type { ChangePasswordOutput } from '../types';

type Ctx = CommandContext<ChangePasswordInput>;

const wrongCurrent = (correlationId: string) =>
  err('auth.invalid_credentials', {
    correlationId,
    fieldErrors: { currentPassword: 'errors.auth.invalidCredentials' },
  });

async function record(ctx: Ctx, accountId: string): Promise<Result<null>> {
  const { ports, tx, actor } = ctx;
  await ports.audit.write(tx, accountAudit.passwordChanged(accountId));
  await ports.outbox.append(tx, 'account.securityEvent', { accountId, kind: 'passwordChanged' });
  const queued = await queueAccountEmail(ports, tx, {
    accountId,
    category: 'security',
    messageKey: 'email.security.passwordChanged',
    params: linkParams(ports.app, 'reset-password'),
    correlationId: actor.correlationId,
  });
  return queued.ok ? ok(null) : queued;
}

async function handle(ctx: Ctx): Promise<Result<ChangePasswordOutput>> {
  const { ports, input, request, actor, tx } = ctx;
  const correlationId = actor.correlationId;
  const accountId = actor.accountId ?? '';
  const key = accountKey('password', accountId);
  const { limit, windowSec } = CHANGE_PASSWORD_FAILURES;
  const failures = await ports.rateLimiter.failures(key, windowSec);
  const oldest = failures[0];
  if (failures.length >= limit && oldest) {
    return rateLimited(
      correlationId,
      secondsUntilWindowFrees(oldest, windowSec, ports.clock.now()),
    );
  }

  const credential = await ports.accounts.findCredentialByAccountId(tx, accountId);
  const currentPassword = input.currentPassword.normalize('NFC');
  if (!credential || !(await ports.hasher.verify(currentPassword, credential.passwordHash))) {
    await ports.rateLimiter.recordFailure(key);
    return wrongCurrent(correlationId);
  }
  const ownEmail = await ports.accounts.findOwnEmail(tx, accountId);
  if (ownEmail !== null && passwordEqualsEmail(input.newPassword, ownEmail)) {
    return err('auth.password_equals_email', {
      correlationId,
      fieldErrors: { newPassword: 'errors.auth.passwordEqualsEmail' },
    });
  }
  const changed = await ports.authGateway.changePassword({
    headers: request.headers,
    currentPassword,
    newPassword: input.newPassword.normalize('NFC'),
  });
  if (!changed.ok) {
    if (changed.error.code === 'invalid_credentials') return wrongCurrent(correlationId);
    return err('internal', { correlationId });
  }
  const recorded = await record(ctx, accountId);
  if (!recorded.ok) return recorded;
  return ok({ session: { kind: 'set', setCookies: changed.data.setCookies } });
}

export const changePasswordCommand = defineCommand<ChangePasswordInput, ChangePasswordOutput>({
  name: 'account.changePassword',
  input: ChangePasswordInput,
  requires: { authenticated: true },
  sendsMail: true,
  handle,
});
