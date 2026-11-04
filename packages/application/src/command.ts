// The one way commands and queries run (01-conventions §3, T-101 BR7.11, functional-spec § 10.1):
// parse, authorize in a fixed order, then the handler inside one UnitOfWork transaction, or, for a
// command that calls the auth library, the handler with its own short transactions (Q4).
// The application layer holds no async-local state (FD-093), so everything arrives in the call.
import {
  err,
  parseInput,
  type Actor,
  type AppError,
  type Capability,
  type InputSchema,
  type Result,
  type StaffRole,
} from '@rogikotha/contracts';

import type {
  AfterResponse,
  AccountRepository,
  AppSettings,
  AuditWriter,
  AuthGateway,
  Clock,
  ConfigProvider,
  Crypto,
  EmailDeliveryRepository,
  HandlerResult,
  IdGenerator,
  JobQueue,
  Logger,
  Outbox,
  PasswordHasher,
  RateLimiter,
  RecordedError,
  RequestHeaders,
  Sleeper,
  Tx,
  UnitOfWork,
} from './ports';
import { MAIL_SEND_JOB } from './ports/job-queue';

/** Everything a web-tier command may use; the web container builds it once (§ 6.4). */
export interface CommandPorts {
  unitOfWork: UnitOfWork;
  authGateway: AuthGateway;
  hasher: PasswordHasher;
  rateLimiter: RateLimiter;
  config: ConfigProvider;
  /** APP_ENCRYPTION_KEY, with the MAC key for rate-limit keys. */
  crypto: Crypto;
  /** MAIL_RECIPIENT_KEY; encrypts `email_deliveries.to_email_enc` and nothing else (FD-095). */
  mailCrypto: Crypto;
  clock: Clock;
  ids: IdGenerator;
  sleeper: Sleeper;
  jobQueue: JobQueue;
  outbox: Outbox;
  audit: AuditWriter;
  logger: Logger;
  afterResponse: AfterResponse;
  accounts: AccountRepository;
  deliveries: EmailDeliveryRepository;
  app: AppSettings;
}

/** What the server action knows about the request beyond the Actor. */
export interface CommandRequest {
  headers: RequestHeaders;
  /** From `server/client-address.ts`; only ever hashed (BR4.9). Null when unknown. */
  clientAddress: string | null;
  /** The current library session id, for sign-out and the session list's `current` marker. */
  sessionId: string | null;
}

export interface CommandCall {
  actor: Actor;
  request: CommandRequest;
  ports: CommandPorts;
}

export interface CommandContext<I> extends CommandCall {
  input: I;
  tx: Tx;
}

export const REQUIREMENT_ORDER = [
  'authenticated',
  'verifiedEmail',
  'notRestricted',
  'staffRole',
  'capability',
  'stepUp',
  'owner',
] as const;
export type RequirementName = (typeof REQUIREMENT_ORDER)[number];

/** An empty object means anyone, anonymous included. */
export interface Requirements<I> {
  authenticated?: true;
  verifiedEmail?: true;
  notRestricted?: true;
  staffRole?: readonly StaffRole[];
  capability?: Capability;
  stepUp?: true;
  /** Runs last, on a read connection; false refuses with `forbidden`. */
  owner?: (ctx: CommandContext<I>) => Promise<boolean>;
}

export interface Refusal {
  requirement: RequirementName;
  error: AppError;
}

interface CommandDefinitionBase<I> {
  /** e.g. `account.signIn` */
  name: string;
  input: InputSchema<I>;
  requires: Requirements<I>;
  /** Ensures the `mail.send` queue before the transaction opens (WF12 step 1). */
  sendsMail?: boolean;
  /** Runs in its own committed transaction for a refusal after `authenticated` (T-104 F12). */
  onRefused?: (ctx: CommandContext<I> & { refusal: Refusal }) => Promise<void>;
}

/** The handler runs inside one UnitOfWork transaction, which commits by `shouldCommit`. */
export interface TransactionalCommandDefinition<I, O> extends CommandDefinitionBase<I> {
  libraryFirst?: false;
  handle: (ctx: CommandContext<I>) => Promise<HandlerResult<O>>;
}

/** What a library-first handler gets: no open transaction. */
export interface LibraryFirstContext<I> extends CommandCall {
  input: I;
}

/**
 * A command that calls the auth library (T-101 Q4, ISS-452). The library uses the same pool, so
 * the handler holds no connection while it works: it reads through `unitOfWork.read`, calls the
 * library, then writes its own rows in a short `unitOfWork.run`, compensating or retrying when
 * that transaction fails after the library committed.
 */
export interface LibraryFirstCommandDefinition<I, O> extends CommandDefinitionBase<I> {
  libraryFirst: true;
  handle: (ctx: LibraryFirstContext<I>) => Promise<Result<O>>;
}

export type CommandDefinition<I, O> =
  TransactionalCommandDefinition<I, O> | LibraryFirstCommandDefinition<I, O>;

export interface QueryDefinition<I, O> {
  name: string;
  input: InputSchema<I>;
  requires: Omit<Requirements<I>, 'owner'>;
  /** Runs on `UnitOfWork.read`: no transaction, nothing written. */
  handle: (ctx: CommandContext<I>) => Promise<Result<O>>;
}

export interface Command<I, O> {
  readonly name: string;
  readonly kind: 'command' | 'query';
  readonly input: InputSchema<I>;
  /** Never throws: a throw inside becomes `internal` with a fresh correlation id. */
  execute(raw: unknown, call: CommandCall): Promise<Result<O>>;
}

/** A handler error that commits, e.g. a refused identity reveal that must stay audited. */
export function recordedErr(...args: Parameters<typeof err>): RecordedError {
  const result = err(...args);
  if (result.ok) throw new Error('recordedErr: err() returned ok');
  return { ok: false, error: result.error, recorded: true };
}

function refuse(
  requirement: RequirementName,
  code: AppError['code'],
  correlationId: string,
): Refusal {
  const result = err(code, { correlationId });
  if (result.ok) throw new Error('refuse: err() returned ok');
  return { requirement, error: result.error };
}

function checkActor<I>(requires: Requirements<I>, actor: Actor): Refusal | null {
  const id = actor.correlationId;
  const isAccount = actor.kind === 'account';
  const needsAccount =
    requires.authenticated === true ||
    requires.verifiedEmail === true ||
    requires.notRestricted === true ||
    requires.staffRole !== undefined ||
    requires.capability !== undefined ||
    requires.stepUp === true ||
    requires.owner !== undefined;
  if (needsAccount && !isAccount) return refuse('authenticated', 'forbidden', id);
  if (requires.verifiedEmail && actor.emailVerified !== true) {
    return refuse('verifiedEmail', 'auth.email_unverified', id);
  }
  if (requires.notRestricted && actor.status === 'restricted') {
    return refuse('notRestricted', 'forbidden', id);
  }
  if (requires.staffRole && !(actor.staffRole && requires.staffRole.includes(actor.staffRole))) {
    return refuse('staffRole', 'forbidden', id);
  }
  if (requires.capability && !actor.capabilities.includes(requires.capability)) {
    return refuse('capability', 'forbidden', id);
  }
  if (requires.stepUp && actor.stepUp === undefined) {
    return refuse('stepUp', 'auth.step_up_required', id);
  }
  return null;
}

function stripRecorded<O>(result: HandlerResult<O>): Result<O> {
  return result.ok ? result : { ok: false, error: result.error };
}

const ensuredMailQueues = new WeakSet<JobQueue>();

async function ensureMailQueue(jobQueue: JobQueue): Promise<void> {
  if (ensuredMailQueues.has(jobQueue)) return;
  await jobQueue.ensure(MAIL_SEND_JOB);
  ensuredMailQueues.add(jobQueue);
}

function internalFailure(name: string, call: CommandCall): Result<never> {
  const result = err('internal');
  if (!result.ok) {
    call.ports.logger.error('command.failed', {
      command: name,
      correlationId: result.error.correlationId,
    });
  }
  return result;
}

async function recordRefusal<I>(
  definition: CommandDefinition<I, unknown>,
  call: CommandCall,
  input: I,
  refusal: Refusal,
): Promise<void> {
  const onRefused = definition.onRefused;
  if (!onRefused) return;
  try {
    await call.ports.unitOfWork.run(async (tx) => {
      await onRefused({ ...call, input, tx, refusal });
      return { ok: true, data: null };
    });
  } catch {
    // The refusal is still returned; a lost record is logged, never turned into success.
    call.ports.logger.error('command.refusal_record_failed', {
      command: definition.name,
      correlationId: call.actor.correlationId,
    });
  }
}

export function defineCommand<I, O>(definition: CommandDefinition<I, O>): Command<I, O> {
  return {
    name: definition.name,
    kind: 'command',
    input: definition.input,
    async execute(raw, call) {
      const parsed = parseInput(definition.input, raw, {
        correlationId: call.actor.correlationId,
      });
      if (!parsed.ok) return parsed;
      const input = parsed.data;
      try {
        const actorRefusal = checkActor(definition.requires, call.actor);
        const ownerRefusal =
          actorRefusal === null && definition.requires.owner
            ? await checkOwner(definition.requires.owner, call, input)
            : null;
        const refusal = actorRefusal ?? ownerRefusal;
        if (refusal) {
          if (refusal.requirement !== 'authenticated') {
            await recordRefusal(definition, call, input, refusal);
          }
          return { ok: false, error: refusal.error };
        }
        if (definition.sendsMail) await ensureMailQueue(call.ports.jobQueue);
        if (definition.libraryFirst) return await definition.handle({ ...call, input });
        const handle = definition.handle;
        const result = await call.ports.unitOfWork.run((tx) => handle({ ...call, input, tx }));
        return stripRecorded(result);
      } catch {
        return internalFailure(definition.name, call);
      }
    },
  };
}

async function checkOwner<I>(
  owner: NonNullable<Requirements<I>['owner']>,
  call: CommandCall,
  input: I,
): Promise<Refusal | null> {
  const isOwner = await call.ports.unitOfWork.read((tx) => owner({ ...call, input, tx }));
  return isOwner ? null : refuse('owner', 'forbidden', call.actor.correlationId);
}

export function defineQuery<I, O>(definition: QueryDefinition<I, O>): Command<I, O> {
  return {
    name: definition.name,
    kind: 'query',
    input: definition.input,
    async execute(raw, call) {
      const parsed = parseInput(definition.input, raw, {
        correlationId: call.actor.correlationId,
      });
      if (!parsed.ok) return parsed;
      const input = parsed.data;
      try {
        const refusal = checkActor(definition.requires, call.actor);
        if (refusal) return { ok: false, error: refusal.error };
        return await call.ports.unitOfWork.read((tx) => definition.handle({ ...call, input, tx }));
      } catch {
        return internalFailure(definition.name, call);
      }
    },
  };
}
