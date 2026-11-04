// WF2 step 1: a fresh verification token from the library, then `email.verify` to the account's
// own page (BR2.1, BR2.6). Shared by register, resend and resend-own. The token is issued before
// the transaction that queues the email opens, so no connection is held while the library writes
// it (Q4, ISS-452).
import { err, ok, type Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../../command';
import type { Tx } from '../../../ports';
import { linkParams } from '../links';
import { queueAccountEmail } from './mail';

/** Outside any transaction: the library stores the token on its own connection. */
export async function issueVerificationToken(
  ports: CommandPorts,
  email: string,
  correlationId: string,
): Promise<Result<string>> {
  const issued = await ports.authGateway.issueVerificationToken(email);
  return issued.ok ? ok(issued.data.token) : err('internal', { correlationId });
}

export async function queueVerificationEmail(
  ports: CommandPorts,
  tx: Tx,
  account: { accountId: string; token: string },
  correlationId: string,
): Promise<Result<null>> {
  const queued = await queueAccountEmail(ports, tx, {
    accountId: account.accountId,
    category: 'verification',
    messageKey: 'email.verify',
    params: linkParams(ports.app, 'verify-email', account.token),
    correlationId,
  });
  return queued.ok ? ok(null) : queued;
}

/** Issues the token, then queues the email in one short transaction of its own. */
export async function sendVerificationEmail(
  ports: CommandPorts,
  account: { accountId: string; email: string },
  correlationId: string,
): Promise<Result<null>> {
  const token = await issueVerificationToken(ports, account.email, correlationId);
  if (!token.ok) return token;
  const accountId = account.accountId;
  const queued = await ports.unitOfWork.run((tx) =>
    queueVerificationEmail(ports, tx, { accountId, token: token.data }, correlationId),
  );
  return queued.ok ? ok(null) : { ok: false, error: queued.error };
}
