// `account.requestPasswordReset` (T-101 WF7, BR5.1, review point 4): the same neutral answer for
// every address, no earlier than the reset floor; a 1 h link only to an existing account.
import { err, ok, RequestPasswordResetInput, type Result } from '@rogikotha/contracts';

import { defineCommand, type CommandContext } from '../../../command';
import { queueAccountEmail } from '../internal/mail';
import {
  emailKey,
  MAIL_NETWORK_LIMIT,
  MAIL_NETWORK_SCOPE,
  networkKey,
  rateLimited,
  RESET_EMAIL_LIMIT,
} from '../limits';
import { linkParams } from '../links';
import { RESET_REQUEST_FLOOR_MS, withTimingFloor } from '../timing';
import type { RequestPasswordResetOutput } from '../types';

async function handle(
  ctx: CommandContext<RequestPasswordResetInput>,
): Promise<Result<RequestPasswordResetOutput>> {
  const { ports, input, request, actor, tx } = ctx;
  const correlationId = actor.correlationId;
  const byEmail = await ports.rateLimiter.hit(
    emailKey(ports.crypto, 'reset', input.email),
    RESET_EMAIL_LIMIT.limit,
    RESET_EMAIL_LIMIT.windowSec,
  );
  if (!byEmail.allowed) return rateLimited(correlationId, byEmail.retryAfter ?? 1);
  const byNetwork = await ports.rateLimiter.hit(
    networkKey(ports.crypto, MAIL_NETWORK_SCOPE, request.clientAddress),
    MAIL_NETWORK_LIMIT.limit,
    MAIL_NETWORK_LIMIT.windowSec,
  );
  if (!byNetwork.allowed) return ok({});

  const account = await ports.accounts.findByEmail(tx, input.email);
  if (!account || account.status === 'deleted') return ok({});
  const issued = await ports.authGateway.issueResetToken(input.email);
  if (!issued.ok) return err('internal', { correlationId });
  const queued = await queueAccountEmail(ports, tx, {
    accountId: account.accountId,
    category: 'reset',
    messageKey: 'email.reset',
    params: linkParams(ports.app, 'reset-password', issued.data.token),
    correlationId,
  });
  return queued.ok ? ok({}) : queued;
}

export const requestPasswordResetCommand = withTimingFloor(
  defineCommand<RequestPasswordResetInput, RequestPasswordResetOutput>({
    name: 'account.requestPasswordReset',
    input: RequestPasswordResetInput,
    requires: {},
    sendsMail: true,
    handle,
  }),
  RESET_REQUEST_FLOOR_MS,
);
