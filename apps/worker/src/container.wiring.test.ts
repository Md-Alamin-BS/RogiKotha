// Builds the real composition root against a URL nothing listens on: the pool and the queue
// connect lazily, so this needs no database.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildContainer } from './container.js';
import type { WorkerEnv } from './env.js';

function aWorkerEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    DATABASE_URL_WORKER: 'postgres://rk_worker:secret@127.0.0.1:1/rogikotha_unreachable',
    APP_MODE: 'demo',
    LOG_LEVEL: 'info',
    STORAGE_ROOT: './.data/storage',
    CLAMD_HOST: 'localhost',
    CLAMD_PORT: 3310,
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    MAIL_FROM: 'RogiKotha <no-reply@demo.rogikotha.local>',
    ...overrides,
  };
}

describe('buildContainer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers a clock that reads the current time', async () => {
    const container = buildContainer(aWorkerEnv());

    const before = Date.now();
    const read = container.clock.now().getTime();
    const after = Date.now();
    await container.close();

    expect(read).toBeGreaterThanOrEqual(before);
    expect(read).toBeLessThanOrEqual(after);
  });

  it('offers a logger that writes one JSON line per call', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: string) => {
      lines.push(line);
    });
    const container = buildContainer(aWorkerEnv());

    container.logger.info('worker.test', { count: 1 });
    await container.close();

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      level: 'info',
      event: 'worker.test',
      count: 1,
    });
  });

  it('closes cleanly when the queue was never started', async () => {
    const container = buildContainer(aWorkerEnv());

    await expect(container.close()).resolves.toBeUndefined();
  });

  it('builds a separate set of adapters on every call', async () => {
    const first = buildContainer(aWorkerEnv());
    const second = buildContainer(aWorkerEnv());

    expect(first.queue).not.toBe(second.queue);
    expect(first.db).not.toBe(second.db);

    await first.close();
    await second.close();
  });
});
