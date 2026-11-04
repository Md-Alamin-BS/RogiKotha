// `account.signOut` (T-101 WF6, BR4.5): the current session only; the staff device cookie stays.
// The library revokes the session first, then the audit row is written (Q4, ISS-452).
import { ok, SignOutInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type LibraryFirstContext } from '../../../command';
import type { SignOutOutput } from '../types';

async function handle(ctx: LibraryFirstContext<SignOutInput>): Promise<Result<SignOutOutput>> {
  const { ports, request, actor } = ctx;
  if (request.sessionId) await ports.authGateway.revokeSession(request.sessionId);
  const accountId = actor.accountId ?? '';
  const written = await ports.unitOfWork.run(async (tx) => {
    await ports.audit.write(tx, accountAudit.signedOut(accountId));
    return ok(null);
  });
  return written.ok ? ok({ session: { kind: 'clear' } }) : { ok: false, error: written.error };
}

export const signOutCommand = defineCommand<SignOutInput, SignOutOutput>({
  name: 'account.signOut',
  input: SignOutInput,
  requires: { authenticated: true },
  libraryFirst: true,
  handle,
});
