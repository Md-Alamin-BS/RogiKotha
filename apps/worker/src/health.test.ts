import type { Db } from '@rogikotha/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkerContainer } from './container.js';
import { startHeartbeat } from './health.js';
import type { Logger } from './logger.js';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  fields: Record<string, unknown> | undefined;
}

class CollectingLogger implements Logger {
  readonly entries: LogEntry[] = [];
  info(event: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'info', event, fields });
  }
  warn(event: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'warn', event, fields });
  }
  error(event: string, fields?: Record<string, unknown>): void {
    this.entries.push({ level: 'error', event, fields });
  }
}

/** Rejects with a value that need not be an Error, as a driver or a library sometimes does. */
function rejectWith(reason: unknown): Promise<never> {
  // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the point is a non-Error rejection.
  return Promise.reject(reason);
}

/** A container whose outbox reports `pending` rows, or rejects with `failure` when one is given. */
function aContainer(options: { pending?: number; failure?: unknown } = {}): {
  ctx: WorkerContainer;
  logger: CollectingLogger;
} {
  const logger = new CollectingLogger();
  const db = {} as Db;
  const ctx = {
    db,
    logger,
    outbox: {
      countPending: (given: Db) => {
        expect(given).toBe(db);
        return options.failure === undefined
          ? Promise.resolve(options.pending ?? 0)
          : rejectWith(options.failure);
      },
    },
  } as unknown as WorkerContainer;
  return { ctx, logger };
}

describe('startHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs nothing before the first interval has passed', async () => {
    const { ctx, logger } = aContainer({ pending: 3 });

    const heartbeat = startHeartbeat(ctx, 2, 1000);
    await vi.advanceTimersByTimeAsync(999);
    heartbeat.stop();

    expect(logger.entries).toEqual([]);
  });

  it('logs the queue count and the pending outbox rows once per interval', async () => {
    const { ctx, logger } = aContainer({ pending: 7 });

    const heartbeat = startHeartbeat(ctx, 2, 1000);
    await vi.advanceTimersByTimeAsync(2000);
    heartbeat.stop();

    expect(logger.entries).toEqual([
      { level: 'info', event: 'worker.heartbeat', fields: { queues: 2, outboxPending: 7 } },
      { level: 'info', event: 'worker.heartbeat', fields: { queues: 2, outboxPending: 7 } },
    ]);
  });

  it('beats every 60 seconds when no interval is given', async () => {
    const { ctx, logger } = aContainer({ pending: 0 });

    const heartbeat = startHeartbeat(ctx, 1);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(logger.entries).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    heartbeat.stop();

    expect(logger.entries.map((entry) => entry.event)).toEqual(['worker.heartbeat']);
  });

  it('stays silent after it is stopped', async () => {
    const { ctx, logger } = aContainer({ pending: 1 });

    const heartbeat = startHeartbeat(ctx, 1, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    heartbeat.stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(logger.entries).toHaveLength(1);
  });

  it('logs a warning with the error message when the outbox count fails, and keeps beating', async () => {
    const { ctx, logger } = aContainer({ failure: new Error('connection lost') });

    const heartbeat = startHeartbeat(ctx, 1, 1000);
    await vi.advanceTimersByTimeAsync(2000);
    heartbeat.stop();

    expect(logger.entries).toEqual([
      { level: 'warn', event: 'worker.heartbeat_failed', fields: { message: 'connection lost' } },
      { level: 'warn', event: 'worker.heartbeat_failed', fields: { message: 'connection lost' } },
    ]);
  });

  it('logs the text of a failure that is not an Error', async () => {
    const { ctx, logger } = aContainer({ failure: 'pool closed' });

    const heartbeat = startHeartbeat(ctx, 1, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    heartbeat.stop();

    expect(logger.entries).toEqual([
      { level: 'warn', event: 'worker.heartbeat_failed', fields: { message: 'pool closed' } },
    ]);
  });
});
