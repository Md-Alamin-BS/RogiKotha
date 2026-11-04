// WF2 step 1: a fresh verification token from the library, then `email.verify` to the account's
// own page (BR2.1, BR2.6). Shared by register, resend and resend-own.
import { err, type Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../../command';
import type { Tx } from '../../../ports';
import { linkParams } from '../links';
import { queueAccountEmail } from './mail';

export async function queueVerificationEmail(
  ports: CommandPorts,
  tx: Tx,
  account: { accountId: string; email: string },
  correlationId: string,
): Promise<Result<null>> {
  const issued = await ports.authGateway.issueVerificationToken(account.email);
  if (!issued.ok) return err('internal', { correlationId });
  const queued = await queueAccountEmail(ports, tx, {
    accountId: account.accountId,
    category: 'verification',
    messageKey: 'email.verify',
    params: linkParams(ports.app, 'verify-email', issued.data.token),
    correlationId,
  });
  return queued.ok ? { ok: true, data: null } : queued;
}
