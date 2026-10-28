// `main.ts` runs on import, so each test sets up fakes for the env loader, the container and the
// job registry, imports a fresh copy of the module and drives it through the process hooks it
// registers. No database, queue or signal is real.
import type * as Database from '@rogikotha/database';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkerContainer } from './container.js';
import { relayQueueNames } from './handlers/outbox-relay.js';
import type { JobDefinition } from './registry.js';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: Record<string, unknown> | undefined;
}

interface Scenario {
  ctx: WorkerContainer;
  jobs: Record<string, JobDefinition>;
}

// `vi.resetModules()` gives `main.ts` a fresh copy of `@rogikotha/database`, so the error class it
// checks with `instanceof` must come from that same copy.
const scenario = vi.hoisted(() => ({
  current: undefined as unknown as Scenario,
  PolicyMismatch: undefined as unknown as typeof Database.QueuePolicyMismatchError,
}));

vi.mock('@rogikotha/database', async (importOriginal) => {
  const actual = await importOriginal<typeof Database>();
  scenario.PolicyMismatch = actual.QueuePolicyMismatchError;
  return actual;
});

vi.mock('./env.js', () => ({ loadEnv: () => ({ APP_MODE: 'demo' }) }));
vi.mock('./container.js', () => ({ buildContainer: () => scenario.current.ctx }));
vi.mock('./registry.js', () => ({
  get JOBS() {
    return scenario.current.jobs;
  },
}));

class ExitCalled extends Error {
  constructor(readonly code: number | string | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

/** Rejects with a value that need not be an Error, as a driver or a library sometimes does. */
function rejectWith(reason: unknown): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the point is a non-Error rejection.
  return Promise.reject(reason);
}

/** Everything a started worker did, as seen through the fakes. */
class FakeWorld {
  readonly logs: LogEntry[] = [];
  readonly calls: string[] = [];
  readonly worked: { name: string; opts: unknown }[] = [];
  readonly scheduled: { name: string; cron: string }[] = [];
  readonly ensured: string[] = [];
  closed = 0;
  failEnsureWith: ((queue: string) => { error: unknown }) | undefined;
  failStartWith: Error | undefined;
  private readonly workHandlers = new Map<string, (payload: unknown) => Promise<void>>();

  readonly ctx = {
    db: {},
    outbox: { countPending: () => Promise.resolve(0) },
    logger: {
      info: (event: string, fields?: Record<string, unknown>) =>
        this.logs.push({ level: 'info', event, fields }),
      warn: (event: string, fields?: Record<string, unknown>) =>
        this.logs.push({ level: 'warn', event, fields }),
      error: (event: string, fields?: Record<string, unknown>) =>
        this.logs.push({ level: 'error', event, fields }),
    },
    queue: {
      start: () => {
        this.calls.push('start');
        return this.failStartWith === undefined
          ? Promise.resolve()
          : Promise.reject(this.failStartWith);
      },
      ensureQueue: (name: string) => {
        this.ensured.push(name);
        const failure = this.failEnsureWith?.(name);
        return failure === undefined ? Promise.resolve() : rejectWith(failure.error);
      },
      work: (name: string, handler: (payload: unknown) => Promise<void>, opts?: unknown) => {
        this.workHandlers.set(name, handler);
        this.worked.push({ name, opts });
        return Promise.resolve();
      },
      schedule: (name: string, cron: string) => {
        this.scheduled.push({ name, cron });
        return Promise.resolve();
      },
    },
    close: () => {
      this.closed += 1;
      return Promise.resolve();
    },
  } as unknown as WorkerContainer;

  events(): string[] {
    return this.logs.map((entry) => entry.event);
  }

  find(event: string): LogEntry | undefined {
    return this.logs.find((entry) => entry.event === event);
  }

  /** What pg-boss does when a job arrives on `name`. */
  deliver(name: string, payload: unknown): Promise<void> {
    const handler = this.workHandlers.get(name);
    if (handler === undefined) {
      throw new Error(`no handler registered for ${name}`);
    }
    return handler(payload);
  }
}

/** A deferred promise a test settles by hand, to hold a handler "running". */
function aPendingHandler(): { handler: JobDefinition['handler']; calls: number; release(): void } {
  let release: () => void = () => {};
  const state = {
    calls: 0,
    handler: (() => {
      state.calls += 1;
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    }) as JobDefinition['handler'],
    release: () => release(),
  };
  return state;
}

describe('worker entry point', () => {
  let world: FakeWorld;
  let hooks: Map<string, (...args: unknown[]) => void>;
  let exitCodes: (number | string | null | undefined)[];
  let throwOnExit: boolean;
  let stderr: unknown[];
  const originalExitCode = process.exitCode;

  async function start(jobs: Record<string, JobDefinition>): Promise<void> {
    scenario.current = { ctx: world.ctx, jobs };
    vi.resetModules();
    await import('./main.js');
    await vi.advanceTimersByTimeAsync(0);
  }

  // Under load the first transform of `@rogikotha/database` passed 5 s, and a timed-out test's
  // import later picked up the next test's fakes (ISS-272); transform it once, outside the tests.
  beforeAll(async () => {
    await import('@rogikotha/database');
    await import('./health.js');
  }, 120_000);

  beforeEach(() => {
    vi.useFakeTimers();
    world = new FakeWorld();
    hooks = new Map();
    exitCodes = [];
    throwOnExit = false;
    stderr = [];
    vi.spyOn(process, 'on').mockImplementation(((
      event: string,
      listener: (...args: unknown[]) => void,
    ) => {
      hooks.set(event, listener);
      return process;
    }) as typeof process.on);
    vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
      exitCodes.push(code);
      if (throwOnExit) {
        throw new ExitCalled(code);
      }
    }) as typeof process.exit);
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      stderr.push(...args);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  describe('starting up', () => {
    it('starts the queue, ensures every relay queue and logs the registered jobs', async () => {
      await start({ 'outbox.relay': { handler: () => Promise.resolve(), intervalMs: 2000 } });

      expect(world.calls).toEqual(['start']);
      expect([...world.ensured].sort()).toEqual([...relayQueueNames()].sort());
      expect(world.find('worker.started')).toEqual({
        level: 'info',
        event: 'worker.started',
        fields: { mode: 'demo', jobs: ['outbox.relay'] },
      });
    });

    it('runs a self-polling job at once and then on every interval', async () => {
      const handler = vi.fn(() => Promise.resolve());

      await start({ 'outbox.relay': { handler, intervalMs: 2000 } });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenLastCalledWith(undefined, world.ctx);

      await vi.advanceTimersByTimeAsync(4000);
      expect(handler).toHaveBeenCalledTimes(3);
      expect(world.worked).toEqual([]);
    });

    it('hands a queue-driven job to the queue with its work options and gives its handler the payload', async () => {
      const handler = vi.fn(() => Promise.resolve());

      await start({ 'search.refresh': { handler, opts: { batchSize: 5 } } });
      await world.deliver('search.refresh', { eventId: 'evt-1' });

      expect(world.worked).toEqual([{ name: 'search.refresh', opts: { batchSize: 5 } }]);
      expect(world.scheduled).toEqual([]);
      expect(handler).toHaveBeenCalledWith({ eventId: 'evt-1' }, world.ctx);
    });

    it('schedules a queue-driven job that carries a cron expression', async () => {
      await start({ 'retention.expire': { handler: () => Promise.resolve(), cron: '0 3 * * *' } });

      expect(world.scheduled).toEqual([{ name: 'retention.expire', cron: '0 3 * * *' }]);
      expect(world.ensured).toContain('retention.expire');
    });

    it('lets a failing queue-driven job reject so the queue can retry it', async () => {
      await start({
        'search.refresh': { handler: () => Promise.reject(new Error('index offline')) },
      });

      await expect(world.deliver('search.refresh', {})).rejects.toThrow('index offline');
    });

    it('registers a signal hook for interrupt, terminate and break, plus the shutdown message', async () => {
      await start({});

      expect([...hooks.keys()].sort()).toEqual(['SIGBREAK', 'SIGINT', 'SIGTERM', 'message']);
    });
  });

  describe('when a queue cannot be ensured at start', () => {
    it('reports a policy mismatch with the fix, closes the container and exits with code 1', async () => {
      throwOnExit = true;
      world.failEnsureWith = (queue) => ({
        error: new scenario.PolicyMismatch(queue, 'exclusive', 'standard'),
      });
      const handler = vi.fn(() => Promise.resolve());

      await start({ 'outbox.relay': { handler, intervalMs: 2000 } });

      const failure = world.find('worker.start_failed');
      expect(failure?.level).toBe('error');
      expect(failure?.fields).toMatchObject({
        code: 'queue_policy_mismatch',
        expectedPolicy: 'exclusive',
        actualPolicy: 'standard',
        fix: 'pnpm db:reset',
      });
      expect(world.closed).toBe(1);
      expect(exitCodes).toEqual([1]);
      expect(handler).not.toHaveBeenCalled();
      expect(world.events()).not.toContain('worker.started');
    });

    it('reports any other failure with the queue, the error name and the SQL state', async () => {
      throwOnExit = true;
      world.failEnsureWith = () => ({
        error: Object.assign(new TypeError('connect ECONNREFUSED'), { code: '57P03' }),
      });

      await start({});

      expect(world.find('worker.start_failed')?.fields).toEqual({
        code: 'queue_ensure_failed',
        queue: relayQueueNames()[0],
        errorName: 'TypeError',
        sqlState: '57P03',
      });
      expect(exitCodes).toEqual([1]);
    });

    it('leaves the SQL state out when the failure carries none, and never logs the error message', async () => {
      throwOnExit = true;
      world.failEnsureWith = () => ({
        error: new Error('password authentication failed for rk_worker'),
      });

      await start({});

      const fields = world.find('worker.start_failed')?.fields;
      expect(fields).toEqual({
        code: 'queue_ensure_failed',
        queue: relayQueueNames()[0],
        errorName: 'Error',
      });
      expect(JSON.stringify(world.logs)).not.toContain('password authentication');
    });

    it('names the type of a failure that is not an Error', async () => {
      throwOnExit = true;
      world.failEnsureWith = () => ({ error: 'boom' });

      await start({});

      expect(world.find('worker.start_failed')?.fields).toMatchObject({ errorName: 'string' });
    });

    it('survives a failure that is null', async () => {
      throwOnExit = true;
      world.failEnsureWith = () => ({ error: null });

      await start({});

      expect(world.find('worker.start_failed')?.fields).toEqual({
        code: 'queue_ensure_failed',
        queue: relayQueueNames()[0],
        errorName: 'object',
      });
      expect(exitCodes).toEqual([1]);
    });
  });

  describe('when the queue cannot start', () => {
    it('writes the error to stderr and sets a failing exit code instead of crashing', async () => {
      world.failStartWith = new Error('database is down');

      await start({ 'outbox.relay': { handler: () => Promise.resolve(), intervalMs: 2000 } });

      expect(stderr).toEqual([new Error('database is down')]);
      expect(process.exitCode).toBe(1);
      expect(world.events()).not.toContain('worker.started');
    });
  });

  describe('a self-polling job', () => {
    it('logs a failed tick with the error message and keeps polling', async () => {
      const handler = vi
        .fn<JobDefinition['handler']>()
        .mockRejectedValueOnce(new Error('connection lost'))
        .mockResolvedValue(undefined);

      await start({ 'outbox.relay': { handler, intervalMs: 2000 } });

      expect(world.find('job.failed')).toEqual({
        level: 'error',
        event: 'job.failed',
        fields: { job: 'outbox.relay', message: 'connection lost' },
      });

      await vi.advanceTimersByTimeAsync(2000);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(world.logs.filter((entry) => entry.event === 'job.failed')).toHaveLength(1);
    });

    it('logs the text of a failure that is not an Error', async () => {
      const handler = vi.fn<JobDefinition['handler']>().mockRejectedValue('queue gone');

      await start({ 'outbox.relay': { handler, intervalMs: 2000 } });

      expect(world.find('job.failed')?.fields).toEqual({
        job: 'outbox.relay',
        message: 'queue gone',
      });
    });

    it('skips a tick while the previous one is still running', async () => {
      const slow = aPendingHandler();

      await start({ 'outbox.relay': { handler: slow.handler, intervalMs: 2000 } });
      await vi.advanceTimersByTimeAsync(6000);
      expect(slow.calls).toBe(1);

      slow.release();
      await vi.advanceTimersByTimeAsync(2000);
      expect(slow.calls).toBe(2);
    });
  });

  describe('shutting down', () => {
    function signal(name: string): void {
      const hook = hooks.get(name);
      if (hook === undefined) {
        throw new Error(`no hook registered for ${name}`);
      }
      hook(name === 'message' ? 'shutdown' : undefined);
    }

    async function settle(): Promise<void> {
      await vi.advanceTimersByTimeAsync(0);
    }

    it('stops the heartbeat and the pollers, closes the container and exits with code 0', async () => {
      const handler = vi.fn(() => Promise.resolve());
      await start({ 'outbox.relay': { handler, intervalMs: 2000 } });

      signal('SIGTERM');
      await settle();

      expect(world.find('worker.stopping')?.fields).toEqual({ signal: 'SIGTERM' });
      expect(world.find('worker.stopped')?.fields).toEqual({ signal: 'SIGTERM' });
      expect(world.closed).toBe(1);
      expect(exitCodes).toEqual([0]);

      handler.mockClear();
      await vi.advanceTimersByTimeAsync(120_000);
      expect(handler).not.toHaveBeenCalled();
      expect(world.events()).not.toContain('worker.heartbeat');
    });

    it.each(['SIGINT', 'SIGBREAK'])(
      'shuts down on %s and names the signal in its log lines',
      async (name) => {
        await start({});

        signal(name);
        await settle();

        expect(world.find('worker.stopped')?.fields).toEqual({ signal: name });
        expect(exitCodes).toEqual([0]);
      },
    );

    it('shuts down on the shutdown message from a parent process', async () => {
      await start({});

      signal('message');
      await settle();

      expect(world.find('worker.stopped')?.fields).toEqual({ signal: 'shutdown' });
      expect(exitCodes).toEqual([0]);
    });

    it('ignores any other message from a parent process', async () => {
      await start({});

      hooks.get('message')?.('restart');
      await settle();

      expect(world.events()).not.toContain('worker.stopping');
      expect(exitCodes).toEqual([]);
    });

    it('shuts down once when a second signal arrives while it is stopping', async () => {
      await start({});

      signal('SIGINT');
      signal('SIGTERM');
      await settle();

      expect(world.logs.filter((entry) => entry.event === 'worker.stopping')).toHaveLength(1);
      expect(world.closed).toBe(1);
      expect(exitCodes).toEqual([0]);
    });

    it('waits for a running tick to finish before it closes the container', async () => {
      const slow = aPendingHandler();
      await start({ 'outbox.relay': { handler: slow.handler, intervalMs: 2000 } });

      signal('SIGTERM');
      await vi.advanceTimersByTimeAsync(500);
      expect(world.closed).toBe(0);
      expect(exitCodes).toEqual([]);

      slow.release();
      await vi.advanceTimersByTimeAsync(100);

      expect(world.closed).toBe(1);
      expect(exitCodes).toEqual([0]);
    });

    it('stops waiting for a tick that never finishes after ten seconds', async () => {
      const stuck = aPendingHandler();
      await start({ 'outbox.relay': { handler: stuck.handler, intervalMs: 2000 } });

      signal('SIGTERM');
      await vi.advanceTimersByTimeAsync(9000);
      expect(world.closed).toBe(0);

      await vi.advanceTimersByTimeAsync(1100);

      expect(world.closed).toBe(1);
      expect(exitCodes).toEqual([0]);
    });
  });

  describe('heartbeat', () => {
    it('counts queue-driven jobs and pollers together in the heartbeat', async () => {
      await start({
        'outbox.relay': { handler: () => Promise.resolve(), intervalMs: 2000 },
        'search.refresh': { handler: () => Promise.resolve() },
      });

      await vi.advanceTimersByTimeAsync(60_000);

      expect(world.find('worker.heartbeat')?.fields).toEqual({ queues: 2, outboxPending: 0 });
    });
  });
});
