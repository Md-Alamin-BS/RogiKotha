// `account.verifyEmail` (T-101 WF2 steps 2-4, BR2.2, BR2.3). Runs only from a server action
// (POST), never while a page renders. The library checks the token and, through the session
// hook, signs the holder in only for an allowed status; this command activates a pending account.
import { err, ok, VerifyEmailInput, type Result } from '@rogikotha/contracts';
import { mayHoldSession, nextAccountState } from '@rogikotha/domain';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import { recordWithRetry } from '../internal/record';
import type { SessionCookieEffect, VerifyEmailOutput } from '../types';

async function handle(ctx: CommandContext<VerifyEmailInput>): Promise<Result<VerifyEmailOutput>> {
  const { ports, input, actor, tx } = ctx;
  const correlationId = actor.correlationId;
  const verified = await ports.authGateway.verifyEmailToken(input.token);
  if (!verified.ok) {
    const code =
      verified.error.code === 'token_expired' ? 'auth.token_expired' : 'auth.token_invalid';
    return err(code, { correlationId });
  }
  const profile = await ports.accounts.findProfileByAuthUserId(tx, verified.data.authUserId);
  // Suspended, banned or deleted: the hook refused the session and nothing changes (BR2.2).
  if (!profile || !mayHoldSession(profile.status))
    return err('auth.token_invalid', { correlationId });

  const activated = nextAccountState(profile.status, 'emailVerified');
  if (activated !== null) {
    const done = await recordWithRetry(ports, async (recordTx) => {
      await ports.accounts.updateStatus(recordTx, profile.accountId, activated);
      await ports.audit.write(recordTx, accountAudit.emailVerified(profile.accountId, 'link'));
      return ok(null);
    });
    if (!done) {
      ports.logger.error('auth.verify_record_failed', { accountId: profile.accountId });
    }
  }
  const session: SessionCookieEffect = verified.data.setCookies
    ? { kind: 'set', setCookies: verified.data.setCookies }
    : { kind: 'none' };
  return ok({ session });
}

export const verifyEmailCommand = defineCommand<VerifyEmailInput, VerifyEmailOutput>({
  name: 'account.verifyEmail',
  input: VerifyEmailInput,
  requires: {},
  handle,
});
