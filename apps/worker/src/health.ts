// Heartbeat logging (task step 8) — `worker.heartbeat` every 60 s at
// `info`, `{ queues, outboxPending }`. T-504 may read these lines for the
// demo dashboard.
import type { WorkerContainer } from './container.js';

export interface HeartbeatHandle {
  stop(): void;
}

export function startHeartbeat(
  ctx: WorkerContainer,
  queueCount: number,
  intervalMs = 60_000,
): HeartbeatHandle {
  const tick = async (): Promise<void> => {
    try {
      const outboxPending = await ctx.outbox.countPending(ctx.db);
      ctx.logger.info('worker.heartbeat', { queues: queueCount, outboxPending });
    } catch (err) {
      ctx.logger.warn('worker.heartbeat_failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, intervalMs);
  timer.unref();

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
