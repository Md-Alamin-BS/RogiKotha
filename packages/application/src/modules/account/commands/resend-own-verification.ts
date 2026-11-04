// `account.resendOwnVerification` (T-101 WF15, BR2.7, FD-096): the pending banner's resend. No
// address crosses the boundary; the command reads the holder's own. The library issues the token
// before the short transaction that queues the email (Q4, ISS-452).
import { err, ok, ResendOwnVerificationInput, type Result } from '@rogikotha/contracts';

import { defineCommand, type LibraryFirstContext } from '../../../command';
import { sendVerificationEmail } from '../internal/verification-email';
import { accountKey, rateLimited, RESEND_OWN_LIMIT } from '../limits';
import type { ResendOwnVerificationOutput } from '../types';

async function handle(
  ctx: LibraryFirstContext<ResendOwnVerificationInput>,
): Promise<Result<ResendOwnVerificationOutput>> {
  const { ports, actor } = ctx;
  const accountId = actor.accountId ?? '';
  const profile = await ports.unitOfWork.read((tx) =>
    ports.accounts.findProfileById(tx, accountId),
  );
  if (!profile || profile.status !== 'pending_verification') return ok({});
  const limit = await ports.rateLimiter.hit(
    accountKey('resend', accountId),
    RESEND_OWN_LIMIT.limit,
    RESEND_OWN_LIMIT.windowSec,
  );
  if (!limit.allowed) return rateLimited(actor.correlationId, limit.retryAfter ?? 1);
  const email = await ports.unitOfWork.read((tx) => ports.accounts.findOwnEmail(tx, accountId));
  if (!email) return err('internal', { correlationId: actor.correlationId });
  const sent = await sendVerificationEmail(ports, { accountId, email }, actor.correlationId);
  return sent.ok ? ok({}) : sent;
}

export const resendOwnVerificationCommand = defineCommand<
  ResendOwnVerificationInput,
  ResendOwnVerificationOutput
>({
  name: 'account.resendOwnVerification',
  input: ResendOwnVerificationInput,
  requires: { authenticated: true },
  sendsMail: true,
  libraryFirst: true,
  handle,
});
