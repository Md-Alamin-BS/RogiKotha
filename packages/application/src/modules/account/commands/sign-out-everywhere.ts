// `account.signOutEverywhere` (T-101 WF6, BR4.6): every session of the account, the current one
// included. No step-up in T-101 (Q10).
import { err, ok, SignOutEverywhereInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import type { SignOutEverywhereOutput } from '../types';

async function handle(
  ctx: CommandContext<SignOutEverywhereInput>,
): Promise<Result<SignOutEverywhereOutput>> {
  const { ports, actor, tx } = ctx;
  const accountId = actor.accountId ?? '';
  const profile = await ports.accounts.findProfileById(tx, accountId);
  if (!profile) return err('forbidden', { correlationId: actor.correlationId });
  const { revoked } = await ports.authGateway.revokeSessions(profile.authUserId);
  await ports.audit.write(tx, accountAudit.signedOutEverywhere(accountId, revoked));
  await ports.outbox.append(tx, 'account.securityEvent', { accountId, kind: 'signOutAll' });
  return ok({ revoked, session: { kind: 'clear' } });
}

export const signOutEverywhereCommand = defineCommand<
  SignOutEverywhereInput,
  SignOutEverywhereOutput
>({
  name: 'account.signOutEverywhere',
  input: SignOutEverywhereInput,
  requires: { authenticated: true },
  handle,
});
