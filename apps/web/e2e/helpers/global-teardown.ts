import { rmSync } from 'node:fs';

import { lockFile, repoRoot } from './env';
import { readLock } from './global-setup';

// BR1.2, BR1.3: stops the worker the setup started and frees the machine for the next run.
// Playwright runs this even when the setup failed, so it only touches a lock this run holds.

export const WORKER_STOP_TIMEOUT_MS = 10_000;

export function isRunning(
  pid: number,
  kill: (pid: number, signal: number) => void = (target, signal) => process.kill(target, signal),
): boolean {
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/** Resolves true once `pid` is gone, false at the deadline. */
export function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!isRunning(pid)) {
      resolve(true);
      return;
    }
    const check = setInterval(() => {
      if (isRunning(pid)) return;
      clearInterval(check);
      clearTimeout(deadline);
      resolve(true);
    }, 200);
    const deadline = setTimeout(() => {
      clearInterval(check);
      resolve(false);
    }, timeoutMs);
  });
}

export async function stopWorker(pid: number): Promise<void> {
  if (!isRunning(pid)) return;
  process.kill(pid, 'SIGTERM');
  if (await waitForExit(pid, WORKER_STOP_TIMEOUT_MS)) return;
  console.warn(
    `The worker (pid ${pid}) did not stop within ${WORKER_STOP_TIMEOUT_MS} ms; killing it`,
  );
  process.kill(pid, 'SIGKILL');
}

export default async function globalTeardown(): Promise<void> {
  const file = lockFile(repoRoot());
  const lock = readLock(file);
  if (lock?.pid !== process.pid) return;
  if (lock.workerPid !== undefined) await stopWorker(lock.workerPid);
  rmSync(file, { force: true });
}
