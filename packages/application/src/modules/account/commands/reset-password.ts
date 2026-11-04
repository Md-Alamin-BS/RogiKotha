// `account.resetPassword` (T-101 WF8, BR5.2, BR5.4, review point 1). The token is resolved to its
// account without consuming it, so "equals the email" is refused before the library rotates the
// password. The application rows are then written with retries, because the library committed.
// No transaction is open while the library works (Q4, ISS-452).
import {
  err,
  ok,
  passwordEqualsEmail,
  ResetPasswordInput,
  type Result,
} from '@rogikotha/contracts';
import { nextAccountState } from '@rogikotha/domain';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type LibraryFirstContext } from '../../../command';
import type { AccountProfileRecord } from '../../../ports';
import { queueAccountEmail } from '../internal/mail';
import { recordWithRetry } from '../internal/record';
import { linkParams } from '../links';
import type { ResetPasswordOutput } from '../types';

type Ctx = LibraryFirstContext<ResetPasswordInput>;

function recordReset(ctx: Ctx, profile: AccountProfileRecord): Promise<boolean> {
  const { ports, actor } = ctx;
  const accountId = profile.accountId;
  const confirmed = nextAccountState(profile.status, 'emailVerified');
  return recordWithRetry(ports, async (tx) => {
    await ports.audit.write(tx, accountAudit.passwordReset(accountId));
    await ports.outbox.append(tx, 'account.securityEvent', { accountId, kind: 'passwordChanged' });
    // BR5.4: opening the link proved the inbox, so a pending address is confirmed.
    if (confirmed !== null) {
      await ports.accounts.updateStatus(tx, accountId, confirmed);
      await ports.audit.write(tx, accountAudit.emailVerified(accountId, 'reset'));
    }
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

async function handle(ctx: Ctx): Promise<Result<ResetPasswordOutput>> {
  const { ports, input, actor } = ctx;
  const correlationId = actor.correlationId;
  const found = await ports.unitOfWork.read((tx) =>
    ports.accounts.findResetTokenAccount(tx, input.token),
  );
  // WF8, BR2.3: only a live token is checked, so a dead link names no address and stays expired.
  const tokenAccount =
    found && found.expiresAt.getTime() > ports.clock.now().getTime() ? found : null;
  if (tokenAccount && passwordEqualsEmail(input.newPassword, tokenAccount.email)) {
    return err('auth.password_equals_email', {
      correlationId,
      fieldErrors: { newPassword: 'errors.auth.passwordEqualsEmail' },
    });
  }
  const reset = await ports.authGateway.resetPassword({
    token: input.token,
    newPassword: input.newPassword.normalize('NFC'),
  });
  if (!reset.ok) {
    const code = reset.error.code === 'token_expired' ? 'auth.token_expired' : 'auth.token_invalid';
    return err(code, { correlationId });
  }
  // Any session the library left behind goes too (BR5.2, threat T6).
  const authUserId = reset.data.authUserId;
  await ports.authGateway.revokeSessions(authUserId);
  const profile = await ports.unitOfWork.read((tx) =>
    ports.accounts.findProfileByAuthUserId(tx, authUserId),
  );
  if (profile && !(await recordReset(ctx, profile))) {
    ports.logger.error('auth.reset_record_failed', { accountId: profile.accountId });
  }
  return ok({ session: { kind: 'clear' } });
}

export const resetPasswordCommand = defineCommand<ResetPasswordInput, ResetPasswordOutput>({
  name: 'account.resetPassword',
  input: ResetPasswordInput,
  requires: {},
  sendsMail: true,
  libraryFirst: true,
  handle,
});
