// `pnpm demo:reset [--yes]` (U50, WF7, BR8.8): returns the demo to the seeded state. Output is
// presenter-facing operator text in English, like every repository script.
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

import {
  effective,
  findRepoRoot,
  isRunning,
  parseEnv,
  PID_FILE,
  readPidFile,
  refuseProduction,
  runCommand,
  stopTree,
  storageDir,
} from './demo.mjs';

export const DONE_LINE = 'Demo reset: seeded data restored, storage and mail cleared.';
const DEFAULT_MAILPIT_URL = 'http://localhost:8025';

/** Deletes everything inside `dir` and keeps the folder itself; a missing folder is fine. */
export function emptyDir(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir))
    rmSync(path.join(dir, entry), { recursive: true, force: true });
}

/** Stops the processes `.data/demo.pid` names that are still running; returns their pids. */
export function stopFromPidFile(
  root,
  { read = readPidFile, running = isRunning, stop = stopTree } = {},
) {
  const pids = read(root);
  if (!pids) return [];
  const stopped = [];
  for (const pid of [pids.web, pids.worker, pids.parent]) {
    if (Number.isInteger(pid) && pid !== process.pid && running(pid)) {
      stop(pid);
      stopped.push(pid);
    }
  }
  rmSync(path.join(root, PID_FILE), { force: true });
  return stopped;
}

async function deleteMail(mailpitUrl) {
  const response = await fetch(new URL('/api/v1/messages', mailpitUrl), {
    method: 'DELETE',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Mailpit answered ${response.status}`);
}

function askConfirmation() {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let answered = false;
    prompt.question(
      'This deletes every demo account, review, comment, upload and email, then reseeds. Continue? (yes/no) ',
      (answer) => {
        answered = true;
        prompt.close();
        resolve(/^y(es)?$/i.test(answer.trim()));
      },
    );
    // No terminal input (end of stdin) counts as no.
    prompt.once('close', () => {
      if (!answered) resolve(false);
    });
  });
}

/**
 * The reset, with every effect injected so the tests can follow the order. Returns the exit code:
 * 0 when done or cancelled, 1 when refused or a step failed (the step is named).
 */
export async function reset({
  yes,
  fileEnv,
  processEnv = process.env,
  root,
  confirm = askConfirmation,
  stopProcesses = () => stopFromPidFile(root),
  run = (args) => runCommand('pnpm', args, { cwd: root }),
  empty = emptyDir,
  clearMail = deleteMail,
  log = (text) => process.stdout.write(`${text}\n`),
  fail = (text) => console.error(text),
}) {
  const production = refuseProduction(fileEnv, processEnv);
  if (production) {
    fail(production);
    return 1;
  }
  if (!yes && !(await confirm())) {
    log('Reset cancelled; nothing changed.');
    return 0;
  }
  const mailpitUrl = effective(fileEnv, 'MAILPIT_URL', processEnv) || DEFAULT_MAILPIT_URL;
  const steps = [
    ['Stop the running demo', () => stopProcesses()],
    ['pnpm db:reset', () => run(['db:reset'])],
    ['pnpm db:seed', () => run(['db:seed'])],
    [
      'Empty the storage folder',
      () => {
        empty(storageDir(root, fileEnv, processEnv));
        empty(path.join(root, 'var', 'evidence'));
      },
    ],
    ['Clear Mailpit', () => clearMail(mailpitUrl)],
  ];
  for (const [name, action] of steps) {
    try {
      log(`${name} ...`);
      await action();
    } catch (error) {
      fail(`${name} failed: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }
  log(DONE_LINE);
  return 0;
}

async function main(argv = process.argv.slice(2)) {
  const root = findRepoRoot();
  const envFile = path.join(root, '.env');
  const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {};
  return reset({ yes: argv.includes('--yes'), fileEnv, root });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main());
