// `account.signOut` (T-101 WF6, BR4.5): the current session only; the staff device cookie stays.
import { ok, SignOutInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import type { SignOutOutput } from '../types';

async function handle(ctx: CommandContext<SignOutInput>): Promise<Result<SignOutOutput>> {
  const { ports, request, actor, tx } = ctx;
  if (request.sessionId) await ports.authGateway.revokeSession(request.sessionId);
  await ports.audit.write(tx, accountAudit.signedOut(actor.accountId ?? ''));
  return ok({ session: { kind: 'clear' } });
}

export const signOutCommand = defineCommand<SignOutInput, SignOutOutput>({
  name: 'account.signOut',
  input: SignOutInput,
  requires: { authenticated: true },
  handle,
});
