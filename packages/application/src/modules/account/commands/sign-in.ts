// `account.signIn` (T-101 WF4, WF5, BR3.1-BR3.12, review point 2). Three refusals come before any
// read or password check; then exactly one verify, against a dummy hash for an unknown or deleted
// address; only an allowed account reaches the library for its session.
import { err, ok, SignInInput, type Result, type SignInSettings } from '@rogikotha/contracts';
import { isTreatedAsUnknown, mayHoldSession } from '@rogikotha/domain';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandContext, type CommandPorts } from '../../../command';
import { MAIL_SEND_JOB } from '../../../ports';
import { dummyPasswordHash } from '../dummy-credential';
import { queueAccountEmail } from '../internal/mail';
import {
  emailKey,
  networkKey,
  rateLimited,
  secondsUntilWindowFrees,
  SIGN_IN_EMAIL_FAILURES,
  SIGN_IN_NETWORK_FAILURES,
} from '../limits';
import { linkParams } from '../links';
import { signInRefusal } from '../sign-in-delay';
import type { SignInOutput } from '../types';

type Ctx = CommandContext<SignInInput>;

/** BR3.2: network limit, email limit, then the delay; null when the attempt may be checked. */
async function refusal(
  ctx: Ctx,
  keys: { email: ReturnType<typeof emailKey>; net: ReturnType<typeof networkKey> },
  settings: SignInSettings,
): Promise<{ retryAfterSec: number } | { failures: Date[] }> {
  const { rateLimiter, clock } = ctx.ports;
  const windowSec = settings.windowMinutes * 60;
  const now = clock.now();
  const netFailures = await rateLimiter.failures(keys.net, windowSec);
  const oldestNet = netFailures[0];
  if (netFailures.length >= SIGN_IN_NETWORK_FAILURES && oldestNet) {
    return { retryAfterSec: secondsUntilWindowFrees(oldestNet, windowSec, now) };
  }
  const failures = await rateLimiter.failures(keys.email, windowSec);
  const oldestEmail = failures[0];
  if (failures.length >= SIGN_IN_EMAIL_FAILURES && oldestEmail) {
    return { retryAfterSec: secondsUntilWindowFrees(oldestEmail, windowSec, now) };
  }
  const delay = signInRefusal(failures, now, settings);
  return delay === null ? { failures } : { retryAfterSec: delay };
}

/** WF5, after the response: one notice per account per window, real accounts only (BR3.9). */
async function sendSevereNotice(
  ports: CommandPorts,
  accountId: string,
  failures: number,
  settings: SignInSettings,
  correlationId: string,
): Promise<void> {
  try {
    await ports.jobQueue.ensure(MAIL_SEND_JOB);
    const since = new Date(ports.clock.now().getTime() - settings.windowMinutes * 60_000);
    const result = await ports.unitOfWork.run(async (tx) => {
      const profile = await ports.accounts.findProfileById(tx, accountId);
      if (!profile || isTreatedAsUnknown(profile.status)) return ok(null);
      const messageKey = 'email.security.severeSignInActivity';
      if (await ports.deliveries.findRecent(tx, { accountId, messageKey, since })) return ok(null);
      const queued = await queueAccountEmail(ports, tx, {
        accountId,
        category: 'security',
        messageKey,
        params: linkParams(ports.app, 'reset-password'),
        correlationId,
      });
      if (!queued.ok) return queued;
      await ports.outbox.append(tx, 'account.securityEvent', {
        accountId,
        kind: 'severeSignInActivity',
      });
      await ports.audit.write(tx, accountAudit.severeSignInActivity(accountId, failures));
      return ok(null);
    });
    if (!result.ok) ports.logger.error('auth.severe_notice_failed', { accountId });
  } catch {
    // Nothing is retried: the next window can send again.
    ports.logger.error('auth.severe_notice_failed', { accountId });
  }
}

async function handle(ctx: Ctx): Promise<Result<SignInOutput>> {
  const { ports, input, request, actor, tx } = ctx;
  const correlationId = actor.correlationId;
  const settings = (await ports.config.current()).signIn;
  const keys = {
    email: emailKey(ports.crypto, 'signin', input.email),
    net: networkKey(ports.crypto, 'signin', request.clientAddress),
  };
  const checked = await refusal(ctx, keys, settings);
  if ('retryAfterSec' in checked) return rateLimited(correlationId, checked.retryAfterSec);

  const password = input.password.normalize('NFC');
  const credential = await ports.accounts.findCredentialByEmail(tx, input.email);
  const known = credential !== null && !isTreatedAsUnknown(credential.status);
  const phc = known ? credential.passwordHash : await dummyPasswordHash(ports.hasher);
  const matches = await ports.hasher.verify(password, phc);

  if (!known || !matches) {
    await ports.rateLimiter.recordFailure(keys.email);
    await ports.rateLimiter.recordFailure(keys.net);
    const count = checked.failures.length + 1;
    if (known && count === settings.severeFailures) {
      const accountId = credential.accountId;
      ports.afterResponse.run(() =>
        sendSevereNotice(ports, accountId, count, settings, correlationId),
      );
    }
    return err('auth.invalid_credentials', { correlationId });
  }
  // BR3.6: only after the password, and never a session.
  if (!mayHoldSession(credential.status)) return err('auth.account_suspended', { correlationId });

  const session = await ports.authGateway.createSession({ email: input.email, password });
  if (!session.ok) {
    if (session.error.code === 'session_refused') {
      return err('auth.account_suspended', { correlationId });
    }
    if (session.error.code === 'invalid_credentials') {
      return err('auth.invalid_credentials', { correlationId });
    }
    return err('internal', { correlationId });
  }
  await ports.rateLimiter.clear(keys.email);
  return ok({ session: { kind: 'set', setCookies: session.data.setCookies } });
}

export const signInCommand = defineCommand<SignInInput, SignInOutput>({
  name: 'account.signIn',
  input: SignInInput,
  // ASSUMPTION(T-101): "anonymous" is no requirement; signing in again replaces the session.
  requires: {},
  handle,
});
