import { spawn } from 'node:child_process';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { prepareDatabase } from './database';
import {
  buildProblems,
  dataDir,
  e2eEnvironment,
  lockFile,
  logsDir,
  newRunId,
  repoRoot,
  RUN_ID_VARIABLE,
  staleBuildWarning,
  storageDir,
  workerEntry,
  type E2eEnvironment,
} from './env';

// BR1.2, BR1.3: one browser run per machine, services up, the e2e database fresh, the storage
// folder empty, then the built worker running against the same environment as the web server.

export const SERVICE_TIMEOUT_MS = 30_000;
export const WORKER_START_TIMEOUT_MS = 30_000;
/** The worker's JSON log line once every handler and the outbox relay are registered. */
export const WORKER_START_LINE = '"worker.started"';

export interface LockContent {
  pid: number;
  workerPid?: number;
}

interface WaitForModule {
  waitForTcp(options: { host: string; port: number; timeoutMs: number }): Promise<unknown>;
  waitForHttp(options: { url: string; timeoutMs: number }): Promise<unknown>;
}

export function readLock(file = lockFile()): LockContent | null {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as LockContent;
  } catch {
    return { pid: Number.NaN };
  }
}

export function writeLock(content: LockContent, file = lockFile()): void {
  writeFileSync(file, JSON.stringify(content));
}

/** Exclusive create, so two runs can never both hold it. */
export function takeLock(root = repoRoot(), pid = process.pid): void {
  mkdirSync(dataDir(root), { recursive: true });
  const file = lockFile(root);
  let fd: number;
  try {
    fd = openSync(file, 'wx');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const holder = readLock(file)?.pid ?? 'unknown';
    throw new Error(
      `Another browser run is in progress (pid ${holder}); wait for it or delete .data/e2e.lock if that process is gone`,
      { cause: error },
    );
  }
  writeSync(fd, JSON.stringify({ pid } satisfies LockContent));
  closeSync(fd);
}

async function waitForServices(env: E2eEnvironment, root: string): Promise<void> {
  const url = env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL is not set');
  const database = new URL(url);
  const waitFor = (await import(
    pathToFileURL(path.join(root, 'scripts', 'wait-for.mjs')).href
  )) as WaitForModule;
  await Promise.all([
    waitFor.waitForTcp({
      host: database.hostname,
      port: Number(database.port || 5432),
      timeoutMs: SERVICE_TIMEOUT_MS,
    }),
    waitFor.waitForHttp({
      url: `${env['MAILPIT_URL'] ?? ''}/api/v1/info`,
      timeoutMs: SERVICE_TIMEOUT_MS,
    }),
  ]);
}

function emptyStorage(root: string): void {
  const dir = storageDir(root);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

/** Resolves once `text` appears in `file`; rejects at the deadline or when the process exits. */
export function waitForLine(
  file: string,
  text: string,
  timeoutMs: number,
  exited: Promise<number | null>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = setInterval(() => {
      if (existsSync(file) && readFileSync(file, 'utf8').includes(text)) finish();
    }, 250);
    const deadline = setTimeout(
      () => finish(new Error(`The worker did not start within ${timeoutMs} ms (see ${file})`)),
      timeoutMs,
    );
    void exited.then((code) =>
      finish(
        new Error(`The worker exited with code ${code ?? 'none'} before it started (see ${file})`),
      ),
    );
    let done = false;
    function finish(error?: Error) {
      if (done) return;
      done = true;
      clearInterval(check);
      clearTimeout(deadline);
      if (error) reject(error);
      else resolve();
    }
  });
}

async function startWorker(env: E2eEnvironment, root: string): Promise<number> {
  const logDir = logsDir(root);
  mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'worker.log');
  // The worker writes straight into the file, so it keeps logging after this function returns.
  const fd = openSync(logPath, 'w');
  const child = spawn(process.execPath, [workerEntry(root)], {
    cwd: root,
    env,
    stdio: ['ignore', fd, fd],
    windowsHide: true,
  });
  closeSync(fd);
  const exited = new Promise<number | null>((resolve) => child.once('exit', resolve));
  if (child.pid === undefined) throw new Error('The worker could not be started');
  child.unref();
  await waitForLine(logPath, WORKER_START_LINE, WORKER_START_TIMEOUT_MS, exited);
  return child.pid;
}

export default async function globalSetup(): Promise<void> {
  const root = repoRoot();
  const problems = buildProblems(root);
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const stale = staleBuildWarning(root);
  if (stale) console.warn(stale);

  takeLock(root);
  const env = e2eEnvironment(root);
  await waitForServices(env, root);
  prepareDatabase(env, root);
  emptyStorage(root);
  const workerPid = await startWorker(env, root);
  writeLock({ pid: process.pid, workerPid }, lockFile(root));
  process.env[RUN_ID_VARIABLE] = newRunId();
}
