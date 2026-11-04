// `account.signOutEverywhere` (T-101 WF6, BR4.6): every session of the account, the current one
// included. No step-up in T-101 (Q10). The library revokes first, then one short transaction
// writes the audit row and the event (Q4, ISS-452).
import { err, ok, SignOutEverywhereInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type LibraryFirstContext } from '../../../command';
import type { SignOutEverywhereOutput } from '../types';

async function handle(
  ctx: LibraryFirstContext<SignOutEverywhereInput>,
): Promise<Result<SignOutEverywhereOutput>> {
  const { ports, actor } = ctx;
  const accountId = actor.accountId ?? '';
  const profile = await ports.unitOfWork.read((tx) =>
    ports.accounts.findProfileById(tx, accountId),
  );
  if (!profile) return err('forbidden', { correlationId: actor.correlationId });
  const { revoked } = await ports.authGateway.revokeSessions(profile.authUserId);
  const written = await ports.unitOfWork.run(async (tx) => {
    await ports.audit.write(tx, accountAudit.signedOutEverywhere(accountId, revoked));
    await ports.outbox.append(tx, 'account.securityEvent', { accountId, kind: 'signOutAll' });
    return ok(null);
  });
  if (!written.ok) return { ok: false, error: written.error };
  return ok({ revoked, session: { kind: 'clear' } });
}

export const signOutEverywhereCommand = defineCommand<
  SignOutEverywhereInput,
  SignOutEverywhereOutput
>({
  name: 'account.signOutEverywhere',
  input: SignOutEverywhereInput,
  requires: { authenticated: true },
  libraryFirst: true,
  handle,
});
