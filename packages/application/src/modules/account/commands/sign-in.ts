// `account.signIn` (T-101 WF4, WF5, BR3.1-BR3.12, review point 2). Three refusals come before any
// read or password check; then exactly one verify, against a dummy hash for an unknown or deleted
// address; only an allowed account reaches the library for its session. The attempt is counted
// as a failure before the password is checked and taken back when it is refused or succeeds, so
// parallel attempts cannot pass the limits together (ISS-453). No transaction is open while the
// library works (Q4, ISS-452).
import { err, ok, SignInInput, type Result, type SignInSettings } from '@rogikotha/contracts';
import { isTreatedAsUnknown, mayHoldSession } from '@rogikotha/domain';

import { accountAudit } from '../../../audit/account';
import { defineCommand, type CommandPorts, type LibraryFirstContext } from '../../../command';
import { MAIL_SEND_JOB, type FailureReservation } from '../../../ports';
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

type Ctx = LibraryFirstContext<SignInInput>;

interface Reserved {
  net: FailureReservation;
  email: FailureReservation;
}

/**
 * BR3.2: network limit, email limit, then the delay, each counting attempts still in flight.
 * A refused attempt takes its reservations back, so nothing is recorded for it.
 */
async function reserve(
  ctx: Ctx,
  keys: { email: ReturnType<typeof emailKey>; net: ReturnType<typeof networkKey> },
  settings: SignInSettings,
): Promise<{ retryAfterSec: number } | Reserved> {
  const { rateLimiter, clock } = ctx.ports;
  const windowSec = settings.windowMinutes * 60;
  const now = clock.now();
  const net = await rateLimiter.reserveFailure(keys.net, windowSec);
  const oldestNet = net.earlier[0];
  if (net.earlier.length >= SIGN_IN_NETWORK_FAILURES && oldestNet) {
    await net.release();
    return { retryAfterSec: secondsUntilWindowFrees(oldestNet, windowSec, now) };
  }
  const email = await rateLimiter.reserveFailure(keys.email, windowSec);
  const oldestEmail = email.earlier[0];
  const retryAfterSec =
    email.earlier.length >= SIGN_IN_EMAIL_FAILURES && oldestEmail
      ? secondsUntilWindowFrees(oldestEmail, windowSec, now)
      : signInRefusal(email.earlier, now, settings);
  if (retryAfterSec !== null) {
    await Promise.all([net.release(), email.release()]);
    return { retryAfterSec };
  }
  return { net, email };
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

/** Not a failure after all: neither counter keeps the attempt. */
async function releaseAll(reserved: Reserved): Promise<void> {
  await Promise.all([reserved.net.release(), reserved.email.release()]);
}

async function handle(ctx: Ctx): Promise<Result<SignInOutput>> {
  const { ports, input, request, actor } = ctx;
  const correlationId = actor.correlationId;
  const settings = (await ports.config.current()).signIn;
  const keys = {
    email: emailKey(ports.crypto, 'signin', input.email),
    net: networkKey(ports.crypto, 'signin', request.clientAddress),
  };
  const reserved = await reserve(ctx, keys, settings);
  if ('retryAfterSec' in reserved) return rateLimited(correlationId, reserved.retryAfterSec);

  const password = input.password.normalize('NFC');
  const credential = await ports.unitOfWork.read((tx) =>
    ports.accounts.findCredentialByEmail(tx, input.email),
  );
  const known = credential !== null && !isTreatedAsUnknown(credential.status);
  const phc = known ? credential.passwordHash : await dummyPasswordHash(ports.hasher);
  const matches = await ports.hasher.verify(password, phc);

  if (!known || !matches) {
    // The reservations stay as the recorded failures on both keys.
    const count = reserved.email.earlier.length + 1;
    if (known && count === settings.severeFailures) {
      const accountId = credential.accountId;
      ports.afterResponse.run(() =>
        sendSevereNotice(ports, accountId, count, settings, correlationId),
      );
    }
    return err('auth.invalid_credentials', { correlationId });
  }
  await releaseAll(reserved);
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
  libraryFirst: true,
  handle,
});
