// `account.getOwnAccount` (T-101 WF16, BR4.10, FD-096): the holder's own account, with the address
// only masked. The full address never leaves this function, and nothing here is logged or cached.
import { err, GetOwnAccountInput, ok, type Result } from '@rogikotha/contracts';
import { maskEmail } from '@rogikotha/domain';

import { defineQuery, type CommandContext } from '../../../command';
import type { GetOwnAccountOutput } from '../types';

async function handle(
  ctx: CommandContext<GetOwnAccountInput>,
): Promise<Result<GetOwnAccountOutput>> {
  const { ports, actor, tx } = ctx;
  const accountId = actor.accountId ?? '';
  const profile = await ports.accounts.findProfileById(tx, accountId);
  const email = profile ? await ports.accounts.findOwnEmail(tx, accountId) : null;
  if (!profile || email === null) return err('forbidden', { correlationId: actor.correlationId });
  return ok({
    username: profile.username,
    displayName: profile.displayName,
    emailVerified: profile.status !== 'pending_verification',
    emailMasked: maskEmail(email),
  });
}

export const getOwnAccountQuery = defineQuery<GetOwnAccountInput, GetOwnAccountOutput>({
  name: 'account.getOwnAccount',
  input: GetOwnAccountInput,
  requires: { authenticated: true },
  handle,
});
