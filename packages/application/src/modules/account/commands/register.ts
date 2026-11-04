// `account.register` (T-101 WF1, BR1.1-BR1.10, review point 5). The library creates the credential
// first, on its own connection; then one application transaction writes every domain row. If that
// transaction does not commit, the library user is deleted again (compensation).
import { err, ok, RegisterInput, type Result } from '@rogikotha/contracts';

import { accountAudit } from '../../../audit/account';
import {
  defineCommand,
  type Command,
  type CommandCall,
  type CommandContext,
  type CommandRequest,
} from '../../../command';
import type { AccountByEmailRecord } from '../../../ports';
import { queueAccountEmail } from '../internal/mail';
import { queueVerificationEmail } from '../internal/verification-email';
import {
  MAIL_NETWORK_LIMIT,
  MAIL_NETWORK_SCOPE,
  networkKey,
  rateLimited,
  REGISTER_NETWORK_LIMIT,
} from '../limits';
import { linkParams } from '../links';
import { REGISTER_FLOOR_MS, waitForFloor } from '../timing';
import type { RegisterOutput } from '../types';

type Ctx = CommandContext<RegisterInput>;

/** The library user this call created, so the wrapper can delete it if nothing commits. */
interface Created {
  authUserId: string | null;
}

const createdBy = new WeakMap<CommandRequest, Created>();

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
  const queued = await queueAccountEmail(ports, ctx.tx, {
    accountId: existing.accountId,
    category: 'security',
    messageKey: 'email.existing',
    params: linkParams(ports.app, 'sign-in'),
    correlationId: actor.correlationId,
  });
  if (!queued.ok) return queued;
  await ports.outbox.append(ctx.tx, 'account.securityEvent', {
    accountId: existing.accountId,
    kind: 'existingEmailRegister',
  });
  await ports.audit.write(ctx.tx, accountAudit.existingEmailRegister(existing.accountId));
  return ok(null);
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
  if (!noticed.ok) return noticed;
  return ok({ accountId: ctx.ports.ids.newId() });
}

async function writeDomainRows(ctx: Ctx, authUserId: string): Promise<Result<RegisterOutput>> {
  const { ports, input, tx, actor } = ctx;
  const now = ports.clock.now();
  const accountId = ports.ids.newId();
  const created = await ports.accounts.createProfile(tx, {
    accountId,
    authUserId,
    username: input.username,
    displayName: input.displayName,
    locale: input.locale,
    ageConfirmedAt: now,
    termsVersion: ports.app.termsVersion,
    termsAcceptedAt: now,
  });
  // Review point 5: a username taken between the check and the insert.
  if (!created.ok) return usernameTaken(ctx);
  await ports.accounts.insertPreferences(tx, { accountId, interfaceLocale: input.locale });
  // TODO(T-104): identity.createDefaultPersonas replaces these inserts.
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
    { accountId, email: input.email },
    actor.correlationId,
  );
  return mailed.ok ? ok({ accountId }) : mailed;
}

async function handle(ctx: Ctx): Promise<Result<RegisterOutput>> {
  const { ports, input, request, actor, tx } = ctx;
  const netKey = networkKey(ports.crypto, 'register', request.clientAddress);
  const limit = await ports.rateLimiter.hit(
    netKey,
    REGISTER_NETWORK_LIMIT.limit,
    REGISTER_NETWORK_LIMIT.windowSec,
  );
  if (!limit.allowed) return rateLimited(actor.correlationId, limit.retryAfter ?? 1);
  // BR1.3: before the email branch, so the answer never depends on the address.
  if (await ports.accounts.usernameTaken(tx, input.username)) return usernameTaken(ctx);

  const existing = await ports.accounts.findByEmail(tx, input.email);
  if (existing) return existingEmailBranch(ctx, existing);

  const user = await ports.authGateway.createCredentialUser({
    email: input.email,
    password: input.password.normalize('NFC'),
  });
  if (!user.ok && user.error.code === 'email_exists') {
    // Review point 5: another registration of this address won the race.
    return existingEmailBranch(ctx, await ports.accounts.findByEmail(tx, input.email));
  }
  if (!user.ok) return err('internal', { correlationId: actor.correlationId });
  const created = createdBy.get(request);
  if (created) created.authUserId = user.data.authUserId;
  return writeDomainRows(ctx, user.data.authUserId);
}

const inner = defineCommand<RegisterInput, RegisterOutput>({
  name: 'account.register',
  input: RegisterInput,
  // ASSUMPTION(T-101): "anonymous" is no requirement; a signed-in caller gets a second account.
  requires: {},
  sendsMail: true,
  handle,
});

async function compensate(call: CommandCall, authUserId: string): Promise<void> {
  const deleted = await call.ports.authGateway.deleteUser(authUserId);
  call.ports.logger.error('auth.register_rolled_back', {
    correlationId: call.actor.correlationId,
    ...(deleted.ok ? {} : { errorCode: deleted.error.code }),
  });
}

export const registerCommand: Command<RegisterInput, RegisterOutput> = {
  ...inner,
  async execute(raw, call) {
    const startedAt = call.ports.clock.now();
    // A request object of its own, so the handler's record of what it created belongs to this call.
    const request: CommandRequest = { ...call.request };
    const created: Created = { authUserId: null };
    createdBy.set(request, created);
    const result = await inner.execute(raw, { ...call, request });
    try {
      if (!result.ok && created.authUserId !== null) await compensate(call, created.authUserId);
      if (result.ok) await waitForFloor(call, startedAt, REGISTER_FLOOR_MS);
    } catch {
      call.ports.logger.error('auth.register_compensation_failed', {
        correlationId: call.actor.correlationId,
      });
      return result.ok ? result : err('internal', { correlationId: call.actor.correlationId });
    }
    return result;
  },
};
