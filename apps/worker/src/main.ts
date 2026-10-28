// Worker entry point (task steps 6, 8, 10). Starts pg-boss, registers job
// handlers from `registry.ts`, and shuts down cleanly on SIGINT/SIGTERM
// (plus SIGBREAK and a `shutdown` IPC message for `tsx watch` on Windows).
import { QueuePolicyMismatchError } from '@rogikotha/database';

import { loadEnv } from './env.js';
import { buildContainer } from './container.js';
import type { WorkerContainer } from './container.js';
import { relayQueueNames } from './handlers/outbox-relay.js';
import { JOBS } from './registry.js';
import type { JobDefinition, JobName } from './registry.js';
import { startHeartbeat } from './health.js';

interface Poller {
  stop(): Promise<void>;
}

/** Runs `def.handler` on a fixed interval, guarded against overlap — if a
 * tick is still running when the next one is due, that tick is skipped
 * rather than run concurrently (task step 7). */
function startPoller(
  name: JobName,
  def: JobDefinition,
  intervalMs: number,
  ctx: WorkerContainer,
): Poller {
  let running = false;
  let stopped = false;

  const tick = async (): Promise<void> => {
    if (running || stopped) {
      return;
    }
    running = true;
    try {
      await def.handler(undefined, ctx);
    } catch (err) {
      ctx.logger.error('job.failed', {
        job: name,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  void tick();

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      const deadline = Date.now() + 10_000;
      while (running && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
  };
}

/** BR1.12: every queue a relay route names exists with its declared policy
 * before the first tick, so the relay never creates a queue inside its
 * transaction. Returns false after logging which queue failed. */
async function ensureRelayQueuesAtStart(ctx: WorkerContainer): Promise<boolean> {
  for (const queue of relayQueueNames()) {
    try {
      await ctx.queue.ensureQueue(queue);
    } catch (err) {
      if (err instanceof QueuePolicyMismatchError) {
        ctx.logger.error('worker.start_failed', {
          code: 'queue_policy_mismatch',
          queue: err.queue,
          expectedPolicy: err.expectedPolicy,
          actualPolicy: err.actualPolicy,
          fix: 'pnpm db:reset',
        });
      } else {
        const sqlState = (err as { code?: unknown } | null)?.code;
        ctx.logger.error('worker.start_failed', {
          code: 'queue_ensure_failed',
          queue,
          errorName: err instanceof Error ? err.name : typeof err,
          ...(typeof sqlState === 'string' ? { sqlState } : {}),
        });
      }
      return false;
    }
  }
  return true;
}

async function main(): Promise<void> {
  const env = loadEnv();
  const ctx = buildContainer(env);

  await ctx.queue.start();

  if (!(await ensureRelayQueuesAtStart(ctx))) {
    await ctx.close();
    process.exit(1);
  }

  const pollers: Poller[] = [];
  let queueCount = 0;

  for (const [name, def] of Object.entries(JOBS) as [JobName, JobDefinition][]) {
    if (def.intervalMs !== undefined) {
      pollers.push(startPoller(name, def, def.intervalMs, ctx));
      continue;
    }
    await ctx.queue.ensureQueue(name);
    await ctx.queue.work(name, (payload: unknown) => def.handler(payload, ctx), def.opts);
    if (def.cron !== undefined) {
      await ctx.queue.schedule(name, def.cron);
    }
    queueCount += 1;
  }

  const jobs = Object.keys(JOBS);
  ctx.logger.info('worker.started', { mode: env.APP_MODE, jobs });

  const heartbeat = startHeartbeat(ctx, queueCount + pollers.length);

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    ctx.logger.info('worker.stopping', { signal });
    void (async () => {
      heartbeat.stop();
      await Promise.all(pollers.map((poller) => poller.stop()));
      await ctx.close();
      ctx.logger.info('worker.stopped', { signal });
      process.exit(0);
    })();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  // Windows: Ctrl-Break, and `tsx watch`'s own restart/shutdown IPC message.
  process.on('SIGBREAK', () => shutdown('SIGBREAK'));
  process.on('message', (message: unknown) => {
    if (message === 'shutdown') {
      shutdown('shutdown');
    }
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
