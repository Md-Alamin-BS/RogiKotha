// BR6.6 (U41): the worker's error and start-up paths, driven through the real `JsonLogger`, write
// no synthetic marker, address, path or token, and nothing reaches the console beside the logger.
// `main.ts` runs on import, so its paths use the same fakes as `main.test.ts`.
import type * as Database from '@rogikotha/database';
import type { EventOutcome } from '@rogikotha/database';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkerContainer } from './container.js';
import type * as Env from './env.js';
import { logOutcomes } from './handlers/outbox-relay.js';
import { JsonLogger } from './logger.js';
import type { JobDefinition } from './registry.js';

const ADDRESS = 'mitu.logscrub.demo@example.test';
const WINDOWS_PATH = 'C:\\rogikotha\\.data\\storage\\logscrub-রিপোর্ট-7Q.png';
const POSIX_PATH = '/srv/rogikotha/.data/storage/logscrub-7Q.png';
const TOKEN = 'LogScrubToken7QabcdefghijklmnopqrstuvwxyZ';
const MARKER = 'LOGSCRUB-W-7Q';
const ENV_MARKER = 'LOGSCRUB-ENV-7Q';

/** A sentence that carries every marker, as a driver or a library error message might. */
const LEAKY_MESSAGE = `${MARKER} could not deliver to ${ADDRESS} from ${WINDOWS_PATH} or ${POSIX_PATH} (token ${TOKEN})`;

const FORBIDDEN = [ADDRESS, '@example.test', MARKER, 'logscrub', 'রিপোর্ট', TOKEN, POSIX_PATH];

const scenario = vi.hoisted(() => ({
  ctx: undefined as unknown as WorkerContainer,
  jobs: {},
  buildFails: undefined as Error | undefined,
  PolicyMismatch: undefined as unknown as typeof Database.QueuePolicyMismatchError,
}));

// `vi.resetModules()` gives `main.ts` a fresh `@rogikotha/database`; the error class it checks
// with `instanceof` must come from that same copy.
vi.mock('@rogikotha/database', async (importOriginal) => {
  const actual = await importOriginal<typeof Database>();
  scenario.PolicyMismatch = actual.QueuePolicyMismatchError;
  return actual;
});
vi.mock('./env.js', () => ({ loadEnv: () => ({ APP_MODE: 'demo' }) }));
vi.mock('./container.js', () => ({
  buildContainer: () => {
    if (scenario.buildFails !== undefined) {
      throw scenario.buildFails;
    }
    return scenario.ctx;
  },
}));
vi.mock('./registry.js', () => ({
  get JOBS() {
    return scenario.jobs;
  },
}));

class ExitCalled extends Error {
  constructor(readonly code: number | string | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

/** Everything written to the console or stdout, split by where it went. */
interface Captured {
  logLines: string[];
  other: string[];
}

function aWorkerContext(ensureQueue: (name: string) => Promise<void>): WorkerContainer {
  return {
    db: {},
    outbox: { countPending: () => Promise.resolve(0) },
    logger: new JsonLogger(),
    queue: {
      start: () => Promise.resolve(),
      ensureQueue,
      work: () => Promise.resolve(),
      schedule: () => Promise.resolve(),
    },
    close: () => Promise.resolve(),
  } as unknown as WorkerContainer;
}

function anOutcome(overrides: Partial<EventOutcome>): EventOutcome {
  return {
    eventId: '0b9e6a52-3c1f-4d2e-9a7b-5f8c1d2e3a4b',
    eventName: 'review.published',
    result: 'retry',
    attempts: 2,
    jobs: [],
    ...overrides,
  };
}

describe('worker log scrubbing (BR6.6)', () => {
  let captured: Captured;
  const originalExitCode = process.exitCode;

  function written(): string {
    return [...captured.logLines, ...captured.other].join('\n');
  }

  function parsedLines(): Record<string, unknown>[] {
    return captured.logLines.map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function expectNoMarker(): void {
    const text = written();
    for (const marker of FORBIDDEN) {
      expect(text).not.toContain(marker);
    }
    expect(text).not.toContain('C:\\');
  }

  function expectOnlyLoggerOutput(): void {
    expect(captured.other).toEqual([]);
    for (const line of parsedLines()) {
      expect(Object.keys(line).slice(-3)).toEqual(['ts', 'level', 'event']);
    }
  }

  async function startMain(): Promise<void> {
    vi.resetModules();
    await import('./main.js');
    await vi.advanceTimersByTimeAsync(0);
  }

  // The first transform of `@rogikotha/database` can pass 5 s under load (ISS-295).
  beforeAll(async () => {
    await import('@rogikotha/database');
    await import('./health.js');
  }, 120_000);

  beforeEach(() => {
    captured = { logLines: [], other: [] };
    scenario.buildFails = undefined;
    scenario.jobs = {};
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      captured.logLines.push(String(line));
    });
    for (const method of ['error', 'warn', 'info', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        captured.other.push(args.map(String).join(' '));
      });
    }
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      captured.other.push(String(chunk));
      return true;
    });
    vi.spyOn(process, 'on').mockImplementation((() => process) as typeof process.on);
    vi.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
      throw new ExitCalled(code);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it('writes the outbox relay outcomes without a marker hidden in a name or an error code', () => {
    const logger = new JsonLogger();

    logOutcomes(logger, [
      anOutcome({ result: 'unmapped', eventName: `${MARKER} for ${ADDRESS}` }),
      anOutcome({
        result: 'retry',
        failedJob: 'mail.send',
        errorCode: LEAKY_MESSAGE as NonNullable<EventOutcome['errorCode']>,
      }),
      anOutcome({ result: 'dead', failedJob: POSIX_PATH, errorCode: 'enqueue_error' }),
    ]);

    expect(parsedLines().map((line) => line.event)).toEqual([
      'outbox.unmapped',
      'outbox.relay_failed',
      'outbox.dead',
    ]);
    expect(parsedLines()[0]?.eventName).toBe('[scrubbed]');
    expect(parsedLines()[1]?.errorCode).toBe('[scrubbed]');
    expect(parsedLines()[2]?.errorCode).toBe('enqueue_error');
    expectNoMarker();
    expectOnlyLoggerOutput();
  });

  it('writes job.failed for a poller whose error message holds an address and a path', async () => {
    vi.useFakeTimers();
    scenario.ctx = aWorkerContext(() => Promise.resolve());
    scenario.jobs = {
      'outbox.relay': {
        handler: () => Promise.reject(new Error(LEAKY_MESSAGE)),
        intervalMs: 2000,
      } satisfies JobDefinition,
    };

    await startMain();

    const failed = parsedLines().find((line) => line.event === 'job.failed');
    expect(failed).toMatchObject({ level: 'error', job: 'outbox.relay', message: '[scrubbed]' });
    expectNoMarker();
    expectOnlyLoggerOutput();
  });

  it('writes only the error name when the worker crashes before its container exists', async () => {
    vi.useFakeTimers();
    scenario.buildFails = new TypeError(LEAKY_MESSAGE);

    await startMain();

    expect(parsedLines()).toEqual([
      expect.objectContaining({ level: 'error', event: 'worker.crashed', errorName: 'TypeError' }),
    ]);
    expect(process.exitCode).toBe(1);
    expectNoMarker();
    expectOnlyLoggerOutput();
  });

  it('names APP_MODE but never its invalid value when the environment is refused', async () => {
    const { loadEnv } = await vi.importActual<typeof Env>('./env.js');
    // Importing the real module loads the repo `.env` quietly; only the call below is checked.
    captured.logLines = [];
    captured.other = [];

    expect(() =>
      loadEnv({
        DATABASE_URL_WORKER: 'postgres://rk_worker:secret@localhost:5432/rogikotha',
        APP_MODE: ENV_MARKER,
        MAIL_RECIPIENT_KEY: Buffer.alloc(32, 7).toString('base64'),
      }),
    ).toThrow(ExitCalled);

    expect(parsedLines()).toEqual([
      expect.objectContaining({
        event: 'worker.env_invalid',
        code: 'env_invalid',
        variables: ['APP_MODE'],
      }),
    ]);
    expect(written()).not.toContain(ENV_MARKER);
    expect(written()).not.toContain('secret');
    expectOnlyLoggerOutput();
  });

  it('writes the queue mismatch as the code db.reset_required and keeps the policies', async () => {
    vi.useFakeTimers();
    scenario.ctx = aWorkerContext((name) =>
      Promise.reject(new scenario.PolicyMismatch(name, 'exclusive', 'standard')),
    );
    scenario.jobs = {};

    await expect(startMain()).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(0);

    const failed = parsedLines().find((line) => line.event === 'worker.start_failed');
    expect(failed).toMatchObject({
      level: 'error',
      code: 'queue_policy_mismatch',
      expectedPolicy: 'exclusive',
      actualPolicy: 'standard',
      fix: 'db.reset_required',
    });
    expect(written()).not.toContain('pnpm db:reset');
    expectNoMarker();
    expectOnlyLoggerOutput();
  });

  // U41 plan Step 32: U48's processor on its last attempt, with a reader whose error message and a
  // delete whose error class carry the markers, and a storage key that is a path.
  it('writes the evidence processor lines with the class name only, never the key or the message', async () => {
    const { createProcessEvidence } = await import('@rogikotha/application/worker');
    const itemId = '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a21';
    const facts = {
      id: itemId,
      reviewId: '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a22',
      storageKey: WINDOWS_PATH,
      state: 'validating',
      createdAt: new Date(),
      latestCustody: null,
    };
    const tx = {};
    const deleteError = Object.assign(new Error(LEAKY_MESSAGE), { name: POSIX_PATH });
    const processEvidence = createProcessEvidence({
      unitOfWork: {
        read: (work: (t: unknown) => unknown) => work(tx),
        run: (work: (t: unknown) => unknown) => work(tx),
      },
      evidenceRepository: {
        processingFacts: () => Promise.resolve(facts),
        transition: () => Promise.resolve(true),
        appendCustody: () => Promise.resolve(),
        markOriginalDeleted: () => Promise.resolve(),
      },
      files: {
        readQuarantined: () => Promise.reject(new Error(LEAKY_MESSAGE)),
        delete: () => Promise.reject(deleteError),
      },
      scanner: { scan: () => Promise.reject(new Error(LEAKY_MESSAGE)) },
      outbox: { append: () => Promise.resolve() },
      clock: { now: () => new Date() },
      logger: new JsonLogger(),
      hasher: { hash: () => TOKEN },
    } as unknown as Parameters<typeof createProcessEvidence>[0]);

    const result = await processEvidence({
      itemId,
      attempt: 4,
      lastAttempt: true,
      signal: { aborted: false } as Parameters<typeof processEvidence>[0]['signal'],
    });

    expect(result).toEqual({ state: 'failed' });
    expect(parsedLines().map((line) => line.event)).toEqual([
      'evidence.last_attempt_failed',
      'evidence.original_delete_failed',
      'evidence.failed',
    ]);
    expect(parsedLines()[0]).toMatchObject({ itemId, attempt: 4, errorClass: 'Error' });
    expect(parsedLines()[1]).toMatchObject({ itemId, errorClass: '[scrubbed]' });
    expectNoMarker();
    expectOnlyLoggerOutput();
  });

  // U41 plan Step 34, adversarial A4 (separate agent). The marker is code-shaped on purpose: the
  // value rules alone keep it, so a `message` field leaked it until ISS-697 was fixed.
  describe('A4: an unhandled throw whose message is the marker LOGSCRUB-THROW-7Q', () => {
    const THROW_MARKER = 'LOGSCRUB-THROW-7Q';

    function expectNoThrowMarker(): void {
      expect(written()).not.toContain(THROW_MARKER);
      expect(written()).not.toContain('LOGSCRUB');
    }

    it('a poller job that throws it writes job.failed without it', async () => {
      vi.useFakeTimers();
      scenario.ctx = aWorkerContext(() => Promise.resolve());
      scenario.jobs = {
        'outbox.relay': {
          handler: () => Promise.reject(new Error(THROW_MARKER)),
          intervalMs: 2000,
        } satisfies JobDefinition,
      };

      await startMain();

      const failed = parsedLines().find((line) => line.event === 'job.failed');
      expect(failed).toMatchObject({ level: 'error', job: 'outbox.relay', message: '[scrubbed]' });
      expectNoThrowMarker();
      expectOnlyLoggerOutput();
    });

    it('a crash before the container exists writes worker.crashed without it', async () => {
      vi.useFakeTimers();
      scenario.buildFails = new Error(THROW_MARKER);

      await startMain();

      expect(parsedLines()).toEqual([
        expect.objectContaining({ event: 'worker.crashed', errorName: 'Error' }),
      ]);
      expectNoThrowMarker();
      expectOnlyLoggerOutput();
    });

    it('a heartbeat whose outbox count throws it writes heartbeat_failed without it', async () => {
      vi.useFakeTimers();
      const { startHeartbeat } = await import('./health.js');
      const ctx = {
        ...aWorkerContext(() => Promise.resolve()),
        outbox: { countPending: () => Promise.reject(new Error(THROW_MARKER)) },
      } as unknown as WorkerContainer;

      const heartbeat = startHeartbeat(ctx, 1, 1000);
      await vi.advanceTimersByTimeAsync(1000);
      heartbeat.stop();

      expect(parsedLines()).toEqual([
        expect.objectContaining({ event: 'worker.heartbeat_failed', message: '[scrubbed]' }),
      ]);
      expectNoThrowMarker();
      expectOnlyLoggerOutput();
    });

    it('a scanner outage that throws it writes scan_unavailable without it', async () => {
      const { createProcessEvidence } = await import('@rogikotha/application/worker');
      const itemId = '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a31';
      const tx = {};
      const processEvidence = createProcessEvidence({
        unitOfWork: {
          read: (work: (t: unknown) => unknown) => work(tx),
          run: (work: (t: unknown) => unknown) => work(tx),
        },
        evidenceRepository: {
          processingFacts: () =>
            Promise.resolve({
              id: itemId,
              reviewId: '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a32',
              storageKey: 'a'.repeat(32),
              state: 'validating',
              createdAt: new Date(),
              latestCustody: null,
            }),
          transition: () => Promise.resolve(true),
          appendCustody: () => Promise.resolve(),
          markOriginalDeleted: () => Promise.resolve(),
        },
        files: {
          readQuarantined: () => Promise.resolve(new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
          delete: () => Promise.resolve(),
        },
        scanner: { scan: () => Promise.reject(new Error(THROW_MARKER)) },
        outbox: { append: () => Promise.resolve() },
        clock: { now: () => new Date() },
        logger: new JsonLogger(),
        hasher: { hash: () => 'b'.repeat(64) },
      } as unknown as Parameters<typeof createProcessEvidence>[0]);

      await processEvidence({
        itemId,
        attempt: 1,
        lastAttempt: false,
        signal: { aborted: false } as Parameters<typeof processEvidence>[0]['signal'],
      }).catch(() => undefined);

      expect(parsedLines().length).toBeGreaterThan(0);
      expectNoThrowMarker();
      expectOnlyLoggerOutput();
    });
  });
});
