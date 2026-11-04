import { ok, SignInInput, type Actor, type Result } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  defineCommand,
  defineQuery,
  recordedErr,
  type CommandCall,
  type CommandPorts,
  type Refusal,
  type Requirements,
} from './command';
import {
  shouldCommit,
  type HandlerResult,
  type JobQueue,
  type LogFields,
  type Tx,
  type UnitOfWork,
} from './ports';

const TX = {} as unknown as Tx;

class RecordingUnitOfWork implements UnitOfWork {
  readonly outcomes: Array<'commit' | 'rollback' | 'read'> = [];

  async run<T>(work: (tx: Tx) => Promise<HandlerResult<T>>): Promise<HandlerResult<T>> {
    try {
      const result = await work(TX);
      this.outcomes.push(shouldCommit(result) ? 'commit' : 'rollback');
      return result;
    } catch (error) {
      this.outcomes.push('rollback');
      throw error;
    }
  }

  async read<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    this.outcomes.push('read');
    return work(TX);
  }
}

class CountingJobQueue implements Pick<JobQueue, 'ensure'> {
  readonly ensured: string[] = [];
  ensure(name: string): Promise<void> {
    this.ensured.push(name);
    return Promise.resolve();
  }
}

interface LoggedLine {
  event: string;
  fields: LogFields | undefined;
}

/** Ports a test does not hand in throw on first use, so an unexpected call fails the test. */
function unusedPort(name: string): never {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`port ${name} must not be used here`);
      },
    },
  ) as never;
}

function buildCall(actor: Actor) {
  const unitOfWork = new RecordingUnitOfWork();
  const jobQueue = new CountingJobQueue();
  const logged: LoggedLine[] = [];
  const logLine = (event: string, fields?: LogFields) => logged.push({ event, fields });
  const ports = {
    unitOfWork,
    jobQueue: jobQueue as unknown as JobQueue,
    logger: { info: logLine, warn: logLine, error: logLine },
  };
  const names = [
    'authGateway',
    'hasher',
    'rateLimiter',
    'config',
    'crypto',
    'mailCrypto',
    'clock',
    'ids',
    'sleeper',
    'outbox',
    'audit',
    'afterResponse',
    'accounts',
    'deliveries',
    'app',
  ] as const;
  const unused = Object.fromEntries(names.map((name) => [name, unusedPort(name)]));
  const call: CommandCall = {
    actor,
    request: { headers: { get: () => null }, clientAddress: null, sessionId: null },
    ports: { ...unused, ...ports } as unknown as CommandPorts,
  };
  return { call, unitOfWork, jobQueue, logged };
}

function anActor(overrides: Partial<Actor> = {}): Actor {
  return {
    kind: 'account',
    accountId: '00000000-0000-7000-8000-000000000001',
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale: 'en',
    correlationId: 'corr-actor',
    ...overrides,
  };
}

const anonymous = (): Actor => ({
  kind: 'anonymous',
  capabilities: [],
  locale: 'bn',
  correlationId: 'corr-anon',
});

const validSignIn = { email: 'shirin.demo@example.test', password: 'correct-horse-battery' };

function commandWith(
  requires: Requirements<SignInInput>,
  handle: () => Promise<HandlerResult<{ done: true }>> = () => Promise.resolve(ok({ done: true })),
  recordInto?: Refusal[],
) {
  return defineCommand<SignInInput, { done: true }>({
    name: 'test.command',
    input: SignInInput,
    requires,
    ...(recordInto
      ? { onRefused: ({ refusal }) => Promise.resolve(void recordInto.push(refusal)) }
      : {}),
    handle,
  });
}

function codeOf(result: Result<unknown>): string | undefined {
  return result.ok ? undefined : result.error.code;
}

describe('defineCommand parsing', () => {
  it('returns the field-error keys of a bad input and never runs the handler', async () => {
    let handled = false;
    const command = commandWith({}, () => {
      handled = true;
      return Promise.resolve(ok({ done: true }));
    });
    const { call, unitOfWork } = buildCall(anActor());
    const result = await command.execute({ email: 'nope', password: 'x' }, call);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.fieldErrors).toEqual({ email: 'errors.auth.emailInvalid' });
    expect(result.error.correlationId).toBe('corr-actor');
    expect(handled).toBe(false);
    expect(unitOfWork.outcomes).toEqual([]);
  });

  it('hands the parsed, normalised input to the handler and commits an ok result', async () => {
    let seenEmail = '';
    const command = defineCommand({
      name: 'test.command',
      input: SignInInput,
      requires: {},
      handle: ({ input }) => {
        seenEmail = input.email;
        return Promise.resolve(ok({ done: true }));
      },
    });
    const { call, unitOfWork } = buildCall(anonymous());
    const result = await command.execute(
      { ...validSignIn, email: 'Shirin.Demo@Example.test' },
      call,
    );
    expect(result).toEqual({ ok: true, data: { done: true } });
    expect(seenEmail).toBe('shirin.demo@example.test');
    expect(unitOfWork.outcomes).toEqual(['commit']);
  });
});

describe('defineCommand authorization order', () => {
  const everything: Requirements<SignInInput> = {
    authenticated: true,
    verifiedEmail: true,
    notRestricted: true,
    staffRole: ['admin'],
    capability: 'content.act',
    stepUp: true,
    owner: () => Promise.resolve(false),
  };

  const steps: Array<[string, Partial<Actor>, string]> = [
    [
      'verifiedEmail',
      { emailVerified: false, status: 'pending_verification' },
      'auth.email_unverified',
    ],
    ['notRestricted', { status: 'restricted' }, 'forbidden'],
    ['staffRole', {}, 'forbidden'],
    ['capability', { staffRole: 'admin' }, 'forbidden'],
    ['stepUp', { staffRole: 'admin', capabilities: ['content.act'] }, 'auth.step_up_required'],
    [
      'owner',
      {
        staffRole: 'admin',
        capabilities: ['content.act'],
        stepUp: { rechecked_at: '2026-11-04T00:00:00.000Z' },
      },
      'forbidden',
    ],
  ];

  it('refuses an anonymous actor with forbidden before any other check, without recording it', async () => {
    const recorded: Refusal[] = [];
    const { call, unitOfWork } = buildCall(anonymous());
    const result = await commandWith(everything, undefined, recorded).execute(validSignIn, call);
    expect(codeOf(result)).toBe('forbidden');
    expect(recorded).toEqual([]);
    expect(unitOfWork.outcomes).toEqual([]);
  });

  it.each(steps)(
    'refuses at %s once every earlier requirement passes',
    async (name, actor, code) => {
      const recorded: Refusal[] = [];
      const { call, unitOfWork } = buildCall(anActor(actor));
      const result = await commandWith(everything, undefined, recorded).execute(validSignIn, call);
      expect(codeOf(result)).toBe(code);
      expect(recorded.map((refusal) => refusal.requirement)).toEqual([name]);
      expect(unitOfWork.outcomes.at(-1)).toBe('commit');
      expect(unitOfWork.outcomes).not.toContain('rollback');
    },
  );

  it('runs the handler when every requirement passes', async () => {
    const { call } = buildCall(
      anActor({
        staffRole: 'admin',
        capabilities: ['content.act'],
        stepUp: { rechecked_at: '2026-11-04T00:00:00.000Z' },
      }),
    );
    const command = commandWith({ ...everything, owner: () => Promise.resolve(true) });
    expect(await command.execute(validSignIn, call)).toEqual({ ok: true, data: { done: true } });
  });

  it('still returns the refusal when recording it fails, and logs the loss', async () => {
    const command = defineCommand({
      name: 'test.command',
      input: SignInInput,
      requires: { verifiedEmail: true },
      onRefused: () => Promise.reject(new Error('database down')),
      handle: () => Promise.resolve(ok({ done: true })),
    });
    const { call, logged } = buildCall(anActor({ emailVerified: false }));
    const result = await command.execute(validSignIn, call);
    expect(codeOf(result)).toBe('auth.email_unverified');
    expect(logged.map((line) => line.event)).toEqual(['command.refusal_record_failed']);
  });
});

describe('defineCommand transactions', () => {
  it('rolls back a handler error', async () => {
    const { call, unitOfWork } = buildCall(anActor());
    const command = commandWith({}, () =>
      Promise.resolve({
        ok: false,
        error: { code: 'conflict', messageKey: 'x', correlationId: 'c' },
      }),
    );
    const result = await command.execute(validSignIn, call);
    expect(codeOf(result)).toBe('conflict');
    expect(unitOfWork.outcomes).toEqual(['rollback']);
  });

  it('commits a recorded error and never lets the flag leave the application', async () => {
    const { call, unitOfWork } = buildCall(anActor());
    const command = commandWith({}, () => Promise.resolve(recordedErr('forbidden')));
    const result = await command.execute(validSignIn, call);
    expect(codeOf(result)).toBe('forbidden');
    expect(result).not.toHaveProperty('recorded');
    expect(unitOfWork.outcomes).toEqual(['commit']);
  });

  it('turns a throw into internal with a fresh, logged correlation id and rolls back', async () => {
    const { call, unitOfWork, logged } = buildCall(anActor());
    const command = commandWith({}, () => Promise.reject(new Error('boom')));
    const result = await command.execute(validSignIn, call);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('internal');
    expect(result.error.correlationId).not.toBe('corr-actor');
    expect(logged).toEqual([
      {
        event: 'command.failed',
        fields: { command: 'test.command', correlationId: result.error.correlationId },
      },
    ]);
    expect(unitOfWork.outcomes).toEqual(['rollback']);
  });

  it('ensures the mail.send queue before the transaction, once per queue', async () => {
    const { call, jobQueue } = buildCall(anActor());
    const command = defineCommand({
      name: 'test.mail',
      input: SignInInput,
      requires: {},
      sendsMail: true,
      handle: () => Promise.resolve(ok({ done: true })),
    });
    await command.execute(validSignIn, call);
    await command.execute(validSignIn, call);
    expect(jobQueue.ensured).toEqual(['mail.send']);
  });
});

describe('defineQuery', () => {
  const query = defineQuery({
    name: 'test.query',
    input: SignInInput,
    requires: { authenticated: true },
    handle: ({ actor }) => Promise.resolve(ok({ accountId: actor.accountId })),
  });

  it('runs on a read connection without a transaction', async () => {
    const { call, unitOfWork } = buildCall(anActor());
    const result = await query.execute(validSignIn, call);
    expect(result).toEqual({
      ok: true,
      data: { accountId: '00000000-0000-7000-8000-000000000001' },
    });
    expect(unitOfWork.outcomes).toEqual(['read']);
  });

  it('refuses an anonymous actor and reads nothing', async () => {
    const { call, unitOfWork } = buildCall(anonymous());
    expect(codeOf(await query.execute(validSignIn, call))).toBe('forbidden');
    expect(unitOfWork.outcomes).toEqual([]);
  });
});
