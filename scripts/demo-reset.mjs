// `pnpm demo:reset [--yes]` (U50, WF7, BR8.8): returns the demo to the seeded state. Output is
// presenter-facing operator text in English, like every repository script.
import { existsSync, lstatSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

import {
  effective,
  findRepoRoot,
  isRunning,
  PID_FILE,
  readEnvFile,
  readPidFile,
  refuseProduction,
  runCommand,
  stopTree,
  storageDir,
} from './demo.mjs';

export const DONE_LINE = 'Demo reset: seeded data restored, storage and mail cleared.';
const DEFAULT_MAILPIT_URL = 'http://localhost:8025';

/**
 * The real path of `target` with every link and junction resolved; a part that does not exist yet
 * is appended to its nearest existing parent. `null` for a broken link, whose target is unknown.
 */
export function realPathOf(target) {
  const missing = [];
  let current = path.resolve(target);
  for (;;) {
    try {
      return path.join(realpathSync.native(current), ...missing);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ENOTDIR') throw error;
      if (lstatSync(current, { throwIfNoEntry: false })) return null;
    }
    const parent = path.dirname(current);
    if (parent === current) return path.join(current, ...missing);
    missing.unshift(path.basename(current));
    current = parent;
  }
}

/**
 * `null` when `dir` may be emptied: its real path lies inside the repository and is neither the
 * root itself nor in `.git`. Otherwise the refusal, naming the folder.
 */
export function folderRefusal(root, dir) {
  const real = realPathOf(dir);
  const refused = (why) =>
    `Refused: demo:reset empties only a folder inside the repository (${root}); ${dir} ${why}. ` +
    'Set STORAGE_ROOT to a folder such as ./.data/storage. Nothing was changed.';
  if (real === null) return refused('is a broken link');
  const relative = path.relative(realPathOf(root) ?? path.resolve(root), real);
  const via = real === path.resolve(dir) ? '' : ` (it resolves to ${real})`;
  if (relative === '') return refused(`is the repository root${via}`);
  const first = relative.split(path.sep)[0];
  if (first === '..' || path.isAbsolute(relative)) return refused(`is outside it${via}`);
  if (first === '.git') return refused(`is inside .git${via}`);
  return null;
}

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

export const confirmationQuestion = (folders) =>
  'This deletes every demo account, review, comment and email, empties ' +
  `${folders.join(' and ')}, then reseeds. Continue? (yes/no) `;

function askConfirmation(folders) {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    let answered = false;
    prompt.question(confirmationQuestion(folders), (answer) => {
      answered = true;
      prompt.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
    // No terminal input (end of stdin) counts as no.
    prompt.once('close', () => {
      if (!answered) resolve(false);
    });
  });
}

/**
 * The reset, with every effect injected so the tests can follow the order. Returns the exit code:
 * 0 when done or cancelled, 1 when refused or a step failed (the step is named). A folder outside
 * the repository is refused before the question, so `--yes` cannot pass it.
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
  const folders = [
    ...new Set([storageDir(root, fileEnv, processEnv), path.join(root, 'var', 'evidence')]),
  ];
  for (const folder of folders) {
    const refusal = folderRefusal(root, folder);
    if (refusal) {
      fail(refusal);
      return 1;
    }
  }
  if (!yes && !(await confirm(folders))) {
    log('Reset cancelled; nothing changed.');
    return 0;
  }
  const mailpitUrl = effective(fileEnv, 'MAILPIT_URL', processEnv) || DEFAULT_MAILPIT_URL;
  const steps = [
    ['Stop the running demo', () => stopProcesses()],
    ['pnpm db:reset', () => run(['db:reset'])],
    ['pnpm db:seed', () => run(['db:seed'])],
    [
      `Empty the storage folders ${folders.join(' and ')}`,
      () => {
        for (const folder of folders) empty(folder);
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
  return reset({ yes: argv.includes('--yes'), fileEnv: readEnvFile(root), root });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main());
