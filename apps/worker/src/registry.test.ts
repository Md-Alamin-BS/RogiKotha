import type { EventOutcome, RelayStore } from '@rogikotha/database';
import { describe, expect, it } from 'vitest';

import type { WorkerContainer } from './container.js';
import { relayQueueNames } from './handlers/outbox-relay.js';
import { JOBS } from './registry.js';

/** A container whose relay store hands back no events and records every batch size it was asked for. */
function aContainer(relayBatch?: RelayStore['relayBatch']): {
  ctx: WorkerContainer;
  batches: number[];
  ensured: string[];
} {
  const batches: number[] = [];
  const ensured: string[] = [];
  const relayStore: RelayStore = {
    relayBatch:
      relayBatch ??
      ((opts) => {
        batches.push(opts.limit);
        return Promise.resolve<EventOutcome[]>([]);
      }),
  };
  const ctx = {
    relayStore,
    queue: {
      ensureQueue: (name: string) => {
        ensured.push(name);
        return Promise.resolve();
      },
    },
    logger: { info() {}, warn() {}, error() {} },
  } as unknown as WorkerContainer;
  return { ctx, batches, ensured };
}

describe('job registry', () => {
  it('registers the outbox relay as a self-polling job that runs every two seconds', () => {
    const relay = JOBS['outbox.relay'];

    expect(relay).toBeDefined();
    expect(relay?.intervalMs).toBe(2000);
    expect(relay?.cron).toBeUndefined();
  });

  it('runs one relay tick when the outbox relay handler is called', async () => {
    const { ctx, batches, ensured } = aContainer();

    await JOBS['outbox.relay']?.handler(undefined, ctx);

    expect(batches).toEqual([50]);
    expect([...ensured].sort()).toEqual([...relayQueueNames()].sort());
  });

  it('lets a failing relay tick reject so the poller can log it', async () => {
    const { ctx } = aContainer(() => Promise.reject(new Error('connection lost')));

    await expect(JOBS['outbox.relay']?.handler(undefined, ctx)).rejects.toThrow('connection lost');
  });
});
