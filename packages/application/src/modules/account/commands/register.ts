// `account.register` (T-101 WF1, BR1.1-BR1.10, review point 5). The library creates the credential
// and the verification token first, with no transaction of this command open (Q4, ISS-452); then
// one short application transaction writes every domain row. If that transaction does not
// commit, the library user is deleted again (compensation).
import { err, ok, RegisterInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import {
  defineCommand,
  type Command,
  type CommandPorts,
  type LibraryFirstContext,
} from '../../../command';
import type { AccountByEmailRecord, Tx } from '../../../ports';
import { queueAccountEmail } from '../internal/mail';
import { issueVerificationToken, queueVerificationEmail } from '../internal/verification-email';
import {
  MAIL_NETWORK_LIMIT,
  MAIL_NETWORK_SCOPE,
  networkKey,
  rateLimited,
  REGISTER_NETWORK_LIMIT,
} from '../limits';
import { linkParams } from '../links';
import { REGISTER_FLOOR_MS, withTimingFloor } from '../timing';
import type { RegisterOutput } from '../types';

type Ctx = LibraryFirstContext<RegisterInput>;

const usernameTaken = (ctx: Ctx) =>
  err('auth.username_taken', {
    correlationId: ctx.actor.correlationId,
    fieldErrors: { username: 'errors.auth.usernameTaken' },
  });

/** BR1.4: the owner of the address is told; nothing about it reaches the caller. */
async function noticeExistingEmail(ctx: Ctx, existing: AccountByEmailRecord | null) {
  const { ports, request, actor } = ctx;
  if (!existing || existing.status === 'deleted') return ok(null);
  // Review point 4: one network cannot make the app mail many existing owners.
  const mailKey = networkKey(ports.crypto, MAIL_NETWORK_SCOPE, request.clientAddress);
  const allowed = await ports.rateLimiter.hit(
    mailKey,
    MAIL_NETWORK_LIMIT.limit,
    MAIL_NETWORK_LIMIT.windowSec,
  );
  if (!allowed.allowed) return ok(null);
  return ports.unitOfWork.run(async (tx) => {
    const queued = await queueAccountEmail(ports, tx, {
      accountId: existing.accountId,
      category: 'security',
      messageKey: 'email.existing',
      params: linkParams(ports.app, 'sign-in'),
      correlationId: actor.correlationId,
    });
    if (!queued.ok) return queued;
    await ports.outbox.append(tx, 'account.securityEvent', {
      accountId: existing.accountId,
      kind: 'existingEmailRegister',
    });
    await ports.audit.write(tx, accountAudit.existingEmailRegister(existing.accountId));
    return ok(null);
  });
}

/** The same answer as a new account: a fresh id that is never stored. */
async function existingEmailBranch(
  ctx: Ctx,
  existing: AccountByEmailRecord | null,
): Promise<Result<RegisterOutput>> {
  // Cost parity (BR1.6): the new-email branch hashes once in the gateway, so this one does too.
  // ASSUMPTION(T-101): the library answers a taken address before it hashes, so a race hashes here.
  await ctx.ports.hasher.hash(ctx.input.password.normalize('NFC'));
  const noticed = await noticeExistingEmail(ctx, existing);
  if (!noticed.ok) return { ok: false, error: noticed.error };
  return ok({ accountId: ctx.ports.ids.newId() });
}

interface Created {
  authUserId: string;
  verificationToken: string;
}

async function writeDomainRows(
  ctx: Ctx,
  tx: Tx,
  created: Created,
): Promise<Result<RegisterOutput>> {
  const { ports, input, actor } = ctx;
  const now = ports.clock.now();
  const accountId = ports.ids.newId();
  const profile = await ports.accounts.createProfile(tx, {
    accountId,
    authUserId: created.authUserId,
    username: input.username,
    displayName: input.displayName,
    locale: input.locale,
    ageConfirmedAt: now,
    termsVersion: ports.app.termsVersion,
    termsAcceptedAt: now,
  });
  // Review point 5: a username taken between the check and the insert.
  if (!profile.ok) return usernameTaken(ctx);
  await ports.accounts.insertPreferences(tx, { accountId, interfaceLocale: input.locale });
  // U11 BR1.2: the repository delegates to the private identity repository's `createDefault`.
  await ports.accounts.insertDefaultPersonas(tx, {
    accountId,
    username: input.username,
    displayName: input.displayName,
    namedPersonaId: ports.ids.newId(),
    pseudonymousPersonaId: ports.ids.newId(),
  });
  await ports.audit.write(tx, accountAudit.registered(accountId, input.locale));
  await ports.outbox.append(tx, 'account.registered', { accountId });
  const mailed = await queueVerificationEmail(
    ports,
    tx,
    { accountId, token: created.verificationToken },
    actor.correlationId,
  );
  return mailed.ok ? ok({ accountId }) : mailed;
}

/** Deletes the library user when nothing of the account committed; never throws. */
async function compensate(ports: CommandPorts, authUserId: string, correlationId: string) {
  try {
    const deleted = await ports.authGateway.deleteUser(authUserId);
    ports.logger.error('auth.register_rolled_back', {
      correlationId,
      ...(deleted.ok ? {} : { errorCode: deleted.error.code }),
    });
  } catch {
    ports.logger.error('auth.register_compensation_failed', { correlationId });
  }
}

/** BR1.5: the library user and its token, then the domain rows; compensated if they fail. */
async function newEmailBranch(ctx: Ctx, authUserId: string): Promise<Result<RegisterOutput>> {
  const { ports, input, actor } = ctx;
  const correlationId = actor.correlationId;
  let written: Result<RegisterOutput> | undefined;
  try {
    const token = await issueVerificationToken(ports, input.email, correlationId);
    if (!token.ok) return token;
    const created = { authUserId, verificationToken: token.data };
    const result = await ports.unitOfWork.run((tx) => writeDomainRows(ctx, tx, created));
    written = result.ok ? result : { ok: false, error: result.error };
    return written;
  } finally {
    if (!written?.ok) await compensate(ports, authUserId, correlationId);
  }
}

async function handle(ctx: Ctx): Promise<Result<RegisterOutput>> {
  const { ports, input, request, actor } = ctx;
  const netKey = networkKey(ports.crypto, 'register', request.clientAddress);
  const limit = await ports.rateLimiter.hit(
    netKey,
    REGISTER_NETWORK_LIMIT.limit,
    REGISTER_NETWORK_LIMIT.windowSec,
  );
  if (!limit.allowed) return rateLimited(actor.correlationId, limit.retryAfter ?? 1);
  // BR1.3: before the email branch, so the answer never depends on the address.
  const { taken, existing } = await ports.unitOfWork.read(async (tx) => ({
    taken: await ports.accounts.usernameTaken(tx, input.username),
    existing: await ports.accounts.findByEmail(tx, input.email),
  }));
  if (taken) return usernameTaken(ctx);
  if (existing) return existingEmailBranch(ctx, existing);

  const user = await ports.authGateway.createCredentialUser({
    email: input.email,
    password: input.password.normalize('NFC'),
  });
  if (!user.ok && user.error.code === 'email_exists') {
    // Review point 5: another registration of this address won the race.
    const winner = await ports.unitOfWork.read((tx) => ports.accounts.findByEmail(tx, input.email));
    return existingEmailBranch(ctx, winner);
  }
  if (!user.ok) return err('internal', { correlationId: actor.correlationId });
  return newEmailBranch(ctx, user.data.authUserId);
}

export const registerCommand: Command<RegisterInput, RegisterOutput> = withTimingFloor(
  defineCommand<RegisterInput, RegisterOutput>({
    name: 'account.register',
    input: RegisterInput,
    // ASSUMPTION(T-101): "anonymous" is no requirement; a signed-in caller gets a second account.
    requires: {},
    sendsMail: true,
    libraryFirst: true,
    handle,
  }),
  REGISTER_FLOOR_MS,
);
