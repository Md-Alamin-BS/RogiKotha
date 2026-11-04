// `account.resendVerification` (T-101 WF3, BR2.4, review point 4): the same neutral answer for
// every address, no earlier than the resend floor.
import { ok, ResendVerificationInput, type Result } from '@rogikotha/contracts';

import { defineCommand, type CommandContext } from '../../../command';
import { queueVerificationEmail } from '../internal/verification-email';
import {
  emailKey,
  MAIL_NETWORK_LIMIT,
  MAIL_NETWORK_SCOPE,
  networkKey,
  rateLimited,
  RESEND_EMAIL_LIMIT,
} from '../limits';
import { RESEND_FLOOR_MS, withTimingFloor } from '../timing';
import type { ResendVerificationOutput } from '../types';

async function handle(
  ctx: CommandContext<ResendVerificationInput>,
): Promise<Result<ResendVerificationOutput>> {
  const { ports, input, request, actor, tx } = ctx;
  const byEmail = await ports.rateLimiter.hit(
    emailKey(ports.crypto, 'resend', input.email),
    RESEND_EMAIL_LIMIT.limit,
    RESEND_EMAIL_LIMIT.windowSec,
  );
  if (!byEmail.allowed) return rateLimited(actor.correlationId, byEmail.retryAfter ?? 1);
  const byNetwork = await ports.rateLimiter.hit(
    networkKey(ports.crypto, MAIL_NETWORK_SCOPE, request.clientAddress),
    MAIL_NETWORK_LIMIT.limit,
    MAIL_NETWORK_LIMIT.windowSec,
  );
  if (!byNetwork.allowed) return ok({});

  const account = await ports.accounts.findByEmail(tx, input.email);
  if (!account || account.status !== 'pending_verification') return ok({});
  const queued = await queueVerificationEmail(
    ports,
    tx,
    { accountId: account.accountId, email: input.email },
    actor.correlationId,
  );
  return queued.ok ? ok({}) : queued;
}

export const resendVerificationCommand = withTimingFloor(
  defineCommand<ResendVerificationInput, ResendVerificationOutput>({
    name: 'account.resendVerification',
    input: ResendVerificationInput,
    requires: {},
    sendsMail: true,
    handle,
  }),
  RESEND_FLOOR_MS,
);
