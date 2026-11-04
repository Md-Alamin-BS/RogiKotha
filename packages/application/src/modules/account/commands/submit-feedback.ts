// `account.submitFeedback` (T-101 WF14, BR11.2, FD-097): text only in release 1, 5 per day per
// account; the body is stored with the writer's locale and never audited or logged.
import { ok, SubmitFeedbackInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext } from '../../../command';
import { accountKey, FEEDBACK_LIMIT, rateLimited } from '../limits';
import type { SubmitFeedbackOutput } from '../types';

async function handle(
  ctx: CommandContext<SubmitFeedbackInput>,
): Promise<Result<SubmitFeedbackOutput>> {
  const { ports, input, actor, tx } = ctx;
  const accountId = actor.accountId ?? '';
  const limit = await ports.rateLimiter.hit(
    accountKey('feedback', accountId),
    FEEDBACK_LIMIT.limit,
    FEEDBACK_LIMIT.windowSec,
  );
  if (!limit.allowed)
    return rateLimited(actor.correlationId, limit.retryAfter ?? 1, 'rate_limited');
  const id = ports.ids.newId();
  await ports.accounts.insertFeedback(tx, {
    id,
    accountId,
    body: input.body,
    locale: actor.locale,
  });
  await ports.audit.write(tx, accountAudit.feedbackSubmitted(accountId, id));
  return ok({});
}

export const submitFeedbackCommand = defineCommand<SubmitFeedbackInput, SubmitFeedbackOutput>({
  name: 'account.submitFeedback',
  input: SubmitFeedbackInput,
  requires: { authenticated: true },
  handle,
});
