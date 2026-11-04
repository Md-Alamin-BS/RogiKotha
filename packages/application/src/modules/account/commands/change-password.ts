// `account.changePassword` (T-101 WF9, BR5.3): the current password first, 5 failures per 15
// minutes per account; the library rotates it and revokes every other session. The attempt is
// counted before the password is checked, so parallel attempts cannot pass the limit together
// (ISS-453). No transaction is open while the library works; its rows are written afterwards and
// retried, because the rotation cannot be undone (Q4, ISS-452).
import {
  ChangePasswordInput,
  err,
  ok,
  passwordEqualsEmail,
  type Result,
} from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type LibraryFirstContext } from '../../../command';
import { queueAccountEmail } from '../internal/mail';
import { recordWithRetry } from '../internal/record';
import {
  accountKey,
  CHANGE_PASSWORD_FAILURES,
  rateLimited,
  secondsUntilWindowFrees,
} from '../limits';
import { linkParams } from '../links';
import type { ChangePasswordOutput } from '../types';

type Ctx = LibraryFirstContext<ChangePasswordInput>;

const wrongCurrent = (correlationId: string) =>
  err('auth.invalid_credentials', {
    correlationId,
    fieldErrors: { currentPassword: 'errors.auth.invalidCredentials' },
  });

function record(ctx: Ctx, accountId: string): Promise<boolean> {
  const { ports, actor } = ctx;
  return recordWithRetry(ports, async (tx) => {
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
  });
}

/** True when the current password is right; a wrong one keeps its reservation as the failure. */
async function currentPasswordMatches(
  ctx: Ctx,
  accountId: string,
  currentPassword: string,
): Promise<boolean> {
  const { ports } = ctx;
  const credential = await ports.unitOfWork.read((tx) =>
    ports.accounts.findCredentialByAccountId(tx, accountId),
  );
  if (!credential) return false;
  return ports.hasher.verify(currentPassword, credential.passwordHash);
}

async function handle(ctx: Ctx): Promise<Result<ChangePasswordOutput>> {
  const { ports, input, request, actor } = ctx;
  const correlationId = actor.correlationId;
  const accountId = actor.accountId ?? '';
  const { limit, windowSec } = CHANGE_PASSWORD_FAILURES;
  const reservation = await ports.rateLimiter.reserveFailure(
    accountKey('password', accountId),
    windowSec,
  );
  const oldest = reservation.earlier[0];
  if (reservation.earlier.length >= limit && oldest) {
    await reservation.release();
    return rateLimited(
      correlationId,
      secondsUntilWindowFrees(oldest, windowSec, ports.clock.now()),
    );
  }

  const currentPassword = input.currentPassword.normalize('NFC');
  if (!(await currentPasswordMatches(ctx, accountId, currentPassword))) {
    return wrongCurrent(correlationId);
  }
  await reservation.release();
  const ownEmail = await ports.unitOfWork.read((tx) => ports.accounts.findOwnEmail(tx, accountId));
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
  if (!(await record(ctx, accountId))) {
    ports.logger.error('auth.change_password_record_failed', { accountId });
  }
  return ok({ session: { kind: 'set', setCookies: changed.data.setCookies } });
}

export const changePasswordCommand = defineCommand<ChangePasswordInput, ChangePasswordOutput>({
  name: 'account.changePassword',
  input: ChangePasswordInput,
  requires: { authenticated: true },
  sendsMail: true,
  libraryFirst: true,
  handle,
});
