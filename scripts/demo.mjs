// `pnpm demo` and `pnpm demo:serve` (U50, WF6, BR8.1-BR8.6): preflight, compose services, migrate
// and seed-if-empty, build, then the web app and the worker as children with the presenter
// banner. Output is presenter-facing operator text in English, like every repository script.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { waitForHttp, waitForTcp } from './wait-for.mjs';

export const COMPOSE_FILE = 'infra/compose/docker-compose.yml';
export const ENV_EXAMPLE = 'infra/compose/.env.example';
export const PID_FILE = '.data/demo.pid';
export const DEFAULT_STORAGE_ROOT = './.data/storage';
export const KEY_BYTES = 32;
export const GENERATED_KEYS = ['APP_ENCRYPTION_KEY', 'BETTER_AUTH_SECRET', 'MAIL_RECIPIENT_KEY'];

/** The host ports the demo needs; `service` is the compose service that may hold it itself. */
export const DEMO_PORTS = [
  { port: 3000, label: 'web app', service: null },
  { port: 5433, label: 'PostgreSQL (a local PostgreSQL service?)', service: 'postgres' },
  { port: 1025, label: 'Mailpit SMTP', service: 'mailpit' },
  { port: 8025, label: 'Mailpit web', service: 'mailpit' },
  { port: 3310, label: 'ClamAV', service: 'clamav' },
];

// The seed's shared password (packages/test-support/src/seed/seed-accounts.ts). Synthetic accounts.
export const DEMO_PASSWORD = 'demo-pass-2026!';
// Staff accounts stay out while the staff console is release 2 (FD-105).
export const RELEASE1_ACCOUNTS = [
  { username: 'shirin_88', use: 'author of r1 (pseudonymous)' },
  { username: 'rafi_c', use: 'contributor with no content yet: comments and replies' },
  { username: 'anon_author_r2', use: 'author of r2 (anonymous)' },
  { username: 'named_tanvir-ahmed', use: 'author of r6 (named)' },
].map((account) => ({ ...account, email: `${account.username}@demo.rogikotha.local` }));

const HEALTH_URL = 'http://localhost:3000/api/health';
const MAILPIT_INFO_URL = 'http://localhost:8025/api/v1/info';

// ---------------------------------------------------------------------------------------------
// Pure parts (tested in scripts/__tests__/demo.test.mjs)

/** The folder holding `pnpm-workspace.yaml`, searched upward from `start`. */
export function findRepoRoot(start = path.dirname(fileURLToPath(import.meta.url))) {
  let dir = path.resolve(start);
  for (;;) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('pnpm-workspace.yaml not found above ' + start);
    dir = parent;
  }
}

/** `null` when Node is 24.x, else the reason. */
export function checkNodeVersion(version) {
  const major = Number(String(version).replace(/^v/, '').split('.')[0]);
  return major === 24 ? null : `Node 24 is required; this is Node ${version}.`;
}

/** `null` when pnpm is 11.x, else the reason. */
export function checkPnpmVersion(version) {
  if (!version) return 'pnpm 11 is required; pnpm was not found.';
  const major = Number(String(version).trim().split('.')[0]);
  return major === 11 ? null : `pnpm 11 is required; this is pnpm ${String(version).trim()}.`;
}

/** Parses `.env` text into an object: `KEY=value`, `#` comments and inline ` # ...` comments. */
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    const quoted = /^(['"])(.*)\1$/.exec(value);
    value = quoted ? quoted[2] : value.replace(/\s+#.*$/, '').trim();
    env[match[1]] = value;
  }
  return env;
}

/** A fresh base64 key of `KEY_BYTES` random bytes, the encoding the web and worker env decode. */
export const newKey = (random = randomBytes) => random(KEY_BYTES).toString('base64');

/**
 * The example file with `APP_MODE=demo` and three fresh keys. `MAIL_RECIPIENT_KEY` differs from
 * `APP_ENCRYPTION_KEY` (FD-095); each key is generated separately, and a repeat is drawn again.
 */
export function generateEnv(exampleText, random = randomBytes) {
  const values = { APP_MODE: 'demo' };
  const used = new Set();
  for (const name of GENERATED_KEYS) {
    let key = newKey(random);
    while (used.has(key)) key = newKey(random);
    used.add(key);
    values[name] = key;
  }
  const seen = new Set();
  const lines = exampleText.split(/\r?\n/).map((line) => {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
    if (!match || !(match[1] in values)) return line;
    seen.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });
  for (const name of Object.keys(values))
    if (!seen.has(name)) lines.push(`${name}=${values[name]}`);
  return lines.join('\n');
}

/**
 * Makes sure `<root>/.env` exists, writing it from the example when missing. Returns the parsed
 * file and whether it was created. Never prints a value.
 */
export function ensureEnvFile(root) {
  const file = path.join(root, '.env');
  let created = false;
  if (!existsSync(file)) {
    writeFileSync(file, generateEnv(readFileSync(path.join(root, ENV_EXAMPLE), 'utf8')), 'utf8');
    created = true;
  }
  return { env: parseEnv(readFileSync(file, 'utf8')), created };
}

/** The effective value: a variable already set in the process wins, as `loadEnvFile` does. */
export const effective = (fileEnv, name, processEnv = process.env) =>
  processEnv[name] || fileEnv[name];

/** `null` unless the effective `APP_MODE` is production (AD-14). */
export function refuseProduction(fileEnv, processEnv = process.env) {
  return effective(fileEnv, 'APP_MODE', processEnv) === 'production'
    ? 'APP_MODE=production: the demo scripts never run against production.'
    : null;
}

/** `docker compose -f <file> [-p <project>]`, the prefix every compose call uses. */
export function composeArgs(project) {
  return ['compose', '-f', COMPOSE_FILE, ...(project ? ['-p', project] : [])];
}

/** The database name in a PostgreSQL URL. */
export function databaseName(url) {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!name) throw new Error('DATABASE_URL names no database');
  return name;
}

/** The count printed by `psql -tAc`, or an error carrying the raw output. */
export function parseCount(output) {
  const text = String(output).trim();
  if (!/^\d+$/.test(text)) throw new Error(`account_profiles count was not a number: ${text}`);
  return Number(text);
}

/** Seeds only an empty database (BR8.3). `count` and `seed` are injected. */
export async function seedIfEmpty({ count, seed, log }) {
  const rows = await count();
  if (rows === 0) {
    await seed();
    return 'seeded';
  }
  log('Existing data kept. Run pnpm demo:reset for a clean slate.');
  return 'kept';
}

/** The ports that are busy and not held by this compose project's own running service. */
export function portConflicts(busyPorts, runningServices, ports = DEMO_PORTS) {
  return ports.filter(
    ({ port, service }) =>
      busyPorts.includes(port) && !(service && runningServices.includes(service)),
  );
}

/** The command that shows who holds a port. */
export const holderCommand = (port, platform = process.platform) =>
  platform === 'win32' ? `netstat -ano | findstr :${port}` : `lsof -i :${port}`;

export function portConflictMessage(conflict, holder = '', platform = process.platform) {
  const lines = [
    `Port ${conflict.port} (${conflict.label}) is in use. Free it and run pnpm demo again.`,
    `  Find its holder: ${holderCommand(conflict.port, platform)}`,
  ];
  if (holder.trim())
    lines.push(
      ...holder
        .trim()
        .split(/\r?\n/)
        .map((line) => `  ${line.trim()}`),
    );
  return lines.join('\n');
}

/** True when nothing listens on `port`: binding succeeds and a local connect is refused. */
export async function isPortFree(port) {
  const bindable = await new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
  if (!bindable) return false;
  const answered = await new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1000, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
  return !answered;
}

export async function busyPorts(ports = DEMO_PORTS, isFree = isPortFree) {
  const busy = [];
  for (const { port } of ports) if (!(await isFree(port))) busy.push(port);
  return busy;
}

/** One absolute storage folder from `STORAGE_ROOT`, resolved against the repository root. */
export function storageDir(root, fileEnv, processEnv = process.env) {
  return path.resolve(root, effective(fileEnv, 'STORAGE_ROOT', processEnv) || DEFAULT_STORAGE_ROOT);
}

/** The environment both children get: one storage folder, whatever their working directory. */
export function childEnv(root, fileEnv, processEnv = process.env) {
  const storage = storageDir(root, fileEnv, processEnv);
  return { ...processEnv, STORAGE_ROOT: storage, EVIDENCE_STORAGE_DIR: storage };
}

/**
 * How to spawn a command. On Windows `pnpm` is a `.cmd` shim, which Node only runs through a
 * shell; the command is passed as one string so no argument array goes to the shell (DEP0190).
 */
export function commandFor(command, args, platform = process.platform) {
  if (platform === 'win32' && command === 'pnpm') {
    return { file: [command, ...args].join(' '), args: [], shell: true };
  }
  return { file: command, args, shell: false };
}

/**
 * How to stop a child's whole process tree. On Windows a signal reaches only the shell, so the
 * tree is killed with taskkill; elsewhere the child leads its own process group.
 */
export function stopPlan(pid, platform = process.platform) {
  return platform === 'win32'
    ? { kind: 'taskkill', command: 'taskkill', args: ['/pid', String(pid), '/T', '/F'] }
    : { kind: 'signal', pid: -pid, signal: 'SIGTERM' };
}

/** Stops a process tree; `run` and `kill` are injected for the tests. Gone already is fine. */
export function stopTree(
  pid,
  { platform = process.platform, run = spawnSync, kill = process.kill } = {},
) {
  const plan = stopPlan(pid, platform);
  if (plan.kind === 'taskkill') {
    run(plan.command, plan.args, { stdio: 'ignore', windowsHide: true });
    return plan;
  }
  try {
    kill(plan.pid, plan.signal);
  } catch {
    try {
      kill(pid, plan.signal);
    } catch {
      // The process has already exited.
    }
  }
  return plan;
}

/** True when `pid` names a running process. */
export function isRunning(pid, kill = process.kill) {
  try {
    kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === 'EPERM';
  }
}

export function readPidFile(root) {
  const file = path.join(root, PID_FILE);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** Probes reported not ok in a health body. */
export const downProbes = (body) =>
  ['db', 'queue', 'mail', 'scanner'].filter((probe) => body?.[probe] !== 'ok');

export function bannerText() {
  const width = Math.max(...RELEASE1_ACCOUNTS.map((account) => account.username.length));
  return [
    '',
    'RogiKotha demo is ready. Fictional records only: every name, account and document is synthetic.',
    '',
    '  Bengali   http://localhost:3000/bn',
    '  English   http://localhost:3000/en',
    '  Mailpit   http://localhost:8025   (confirmation and reset emails)',
    '',
    `  Accounts (password for all: ${DEMO_PASSWORD})`,
    ...RELEASE1_ACCOUNTS.map(
      (account) => `    ${account.username.padEnd(width)}  ${account.email}  ${account.use}`,
    ),
    '',
    '  Walk-through: DEMO.md',
    '  Reset the data: pnpm demo:reset --yes',
    '  Stop: Ctrl+C, then pnpm demo:down to stop the containers (data is kept)',
    '',
  ].join('\n');
}

export function parseArgs(argv) {
  return {
    serve: argv.includes('serve') || argv.includes('--serve'),
    build: !argv.includes('--no-build'),
  };
}

// ---------------------------------------------------------------------------------------------
// Running steps

const stamp = () => new Date().toTimeString().slice(0, 8);
const out = (text) => process.stdout.write(`${text}\n`);

class StepFailure extends Error {}

/** Runs one named step, printing a timestamp with a done or failed mark. */
async function step(name, fn) {
  out(`[${stamp()}] ${name} ...`);
  try {
    const result = await fn();
    out(`[${stamp()}] ${name}: done`);
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[${stamp()}] ${name}: FAILED\n${reason}`);
    throw new StepFailure(reason);
  }
}

/** Runs a command with inherited output; rejects naming it on a non-zero exit. */
export function runCommand(command, args, { cwd, env } = {}) {
  const spec = commandFor(command, args);
  return new Promise((resolve, reject) => {
    const child = spawn(spec.file, spec.args, { cwd, env, shell: spec.shell, stdio: 'inherit' });
    child.once('error', (error) =>
      reject(new Error(`${command} ${args.join(' ')}: ${error.message}`)),
    );
    child.once('exit', (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`)),
    );
  });
}

/** Runs a command and returns its stdout, or `null` when it cannot run or exits non-zero. */
function capture(command, args, { cwd, timeout = 60_000, shell = false } = {}) {
  const spec = shell ? { file: command, args: [], shell: true } : commandFor(command, args);
  const result = spawnSync(spec.file, spec.args, {
    cwd,
    shell: spec.shell,
    encoding: 'utf8',
    timeout,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout;
}

async function preflight(root) {
  const nodeProblem = checkNodeVersion(process.versions.node);
  if (nodeProblem) throw new Error(nodeProblem);
  const pnpmProblem = checkPnpmVersion(capture('pnpm', ['--version'], { cwd: root }));
  if (pnpmProblem) throw new Error(pnpmProblem);
  if (capture('docker', ['info'], { cwd: root, timeout: 30_000 }) === null) {
    throw new Error('Docker is not running: start Docker Desktop and run pnpm demo again.');
  }

  const { env, created } = ensureEnvFile(root);
  if (created) out(`Created .env from ${ENV_EXAMPLE} with APP_MODE=demo and three new keys.`);
  const production = refuseProduction(env);
  if (production) throw new Error(production);

  const project = effective(env, 'RK_COMPOSE_PROJECT');
  const running =
    capture('docker', [...composeArgs(project), 'ps', '--status', 'running', '--services'], {
      cwd: root,
    }) ?? '';
  const conflicts = portConflicts(await busyPorts(), running.split(/\r?\n/).filter(Boolean));
  if (conflicts.length > 0) {
    throw new Error(
      conflicts
        .map((conflict) => {
          const holder =
            capture(holderCommand(conflict.port), [], {
              cwd: root,
              timeout: 10_000,
              shell: true,
            }) ?? '';
          return portConflictMessage(conflict, holder);
        })
        .join('\n'),
    );
  }
  return env;
}

async function services(root, env) {
  const project = effective(env, 'RK_COMPOSE_PROJECT');
  await runCommand('docker', [...composeArgs(project), 'up', '-d'], { cwd: root });
  await waitForHealthyPostgres(root, project, 90_000);
  await waitForHttp({ url: MAILPIT_INFO_URL, timeoutMs: 90_000 });
  const clamHost = effective(env, 'CLAMD_HOST') || 'localhost';
  const clamPort = Number(effective(env, 'CLAMD_PORT') || 3310);
  try {
    await waitForTcp({
      host: clamHost,
      port: clamPort,
      timeoutMs: 120_000,
      send: 'zPING\0',
      expect: 'PONG',
    });
  } catch {
    console.warn(
      'ClamAV is not ready yet (it downloads its signatures on first start). The demo continues;' +
        ' uploads stay "scanning" until clamd is ready.',
    );
  }
}

/** Polls the compose healthcheck of the postgres service until it reports healthy. */
async function waitForHealthyPostgres(root, project, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let state = 'unknown';
  while (Date.now() < deadline) {
    const id = capture('docker', [...composeArgs(project), 'ps', '-q', 'postgres'], { cwd: root });
    const container = id?.trim().split(/\r?\n/)[0];
    if (container) {
      state =
        capture('docker', ['inspect', '-f', '{{.State.Health.Status}}', container], {
          cwd: root,
        })?.trim() ?? 'unknown';
      if (state === 'healthy') return;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(500, deadline - Date.now())));
  }
  throw new Error(`postgres not healthy after ${timeoutMs / 1000} s (last state: ${state})`);
}

async function data(root, env) {
  await runCommand('pnpm', ['db:migrate'], { cwd: root });
  const project = effective(env, 'RK_COMPOSE_PROJECT');
  const database = databaseName(effective(env, 'DATABASE_URL'));
  await seedIfEmpty({
    count: async () => {
      const args = [
        ...composeArgs(project),
        'exec',
        '-T',
        'postgres',
        'psql',
        '-U',
        'postgres',
        '-d',
        database,
        '-tAc',
        'select count(*) from account_profiles',
      ];
      const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 60_000 });
      return parseCount(`${result.stdout ?? ''}${result.status === 0 ? '' : result.stderr}`);
    },
    seed: () => runCommand('pnpm', ['db:seed'], { cwd: root }),
    log: out,
  });
}

/** Streams a child's output line by line with a prefix. */
function prefixOutput(stream, prefix, write) {
  readline.createInterface({ input: stream }).on('line', (line) => write(`${prefix} | ${line}\n`));
}

/**
 * Runs the web app and the worker until either exits or a signal arrives, then stops both.
 * Resolves with the exit code: the first non-zero child code, or 0 after a requested stop.
 */
function serve(root, env) {
  const environment = childEnv(root, env);
  mkdirSync(environment.STORAGE_ROOT, { recursive: true });
  mkdirSync(path.join(root, '.data'), { recursive: true });

  const children = {};
  for (const [name, filter] of [
    ['web', '@rogikotha/web'],
    ['worker', '@rogikotha/worker'],
  ]) {
    const spec = commandFor('pnpm', ['--filter', filter, 'start']);
    const child = spawn(spec.file, spec.args, {
      cwd: root,
      env: environment,
      shell: spec.shell,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    prefixOutput(child.stdout, name, (line) => process.stdout.write(line));
    prefixOutput(child.stderr, name, (line) => process.stderr.write(line));
    children[name] = child;
  }
  const pidFile = path.join(root, PID_FILE);
  writeFileSync(
    pidFile,
    JSON.stringify({ parent: process.pid, web: children.web.pid, worker: children.worker.pid }),
  );

  return new Promise((resolve) => {
    let stopping = false;
    let exitCode = 0;
    const alive = new Set(Object.keys(children));
    const stopAll = () => {
      for (const name of alive) if (children[name].pid) stopTree(children[name].pid);
    };
    const onSignal = () => {
      if (!stopping) out('\nStopping the web app and the worker ...');
      stopping = true;
      stopAll();
    };
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);

    for (const [name, child] of Object.entries(children)) {
      child.once('exit', (code) => {
        alive.delete(name);
        if (!stopping) {
          stopping = true;
          exitCode = code || 1;
          console.error(`${name} exited (code ${code}); stopping the other process.`);
          stopAll();
        }
        if (alive.size === 0) {
          process.off('SIGINT', onSignal);
          process.off('SIGTERM', onSignal);
          rmSync(pidFile, { force: true });
          out('Stopped. The containers keep running; pnpm demo:down stops them.');
          resolve(exitCode);
        }
      });
    }

    waitForHttp({
      url: HEALTH_URL,
      timeoutMs: 120_000,
      accept: async (response) => (await response.json()).ok === true,
    })
      .then(() => {
        if (!stopping) out(bannerText());
      })
      .catch(async () => {
        if (stopping) return;
        let down = ['web app'];
        try {
          down = downProbes(await (await fetch(HEALTH_URL)).json());
        } catch {
          // The web app itself is not answering.
        }
        console.warn(`Health is not ok after 120 s; not ready: ${down.join(', ')}.`);
      });
  });
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const root = findRepoRoot();
  try {
    const env = await step('Preflight', () => preflight(root));
    if (!options.serve) {
      await step('Services', () => services(root, env));
      await step('Data', () => data(root, env));
      if (options.build) {
        await step('Build', () =>
          runCommand(
            'pnpm',
            ['--filter', '@rogikotha/web', '--filter', '@rogikotha/worker', 'build'],
            {
              cwd: root,
            },
          ),
        );
      }
    }
    out(`[${stamp()}] Run: starting the web app and the worker`);
    return await serve(root, env);
  } catch (error) {
    if (!(error instanceof StepFailure)) console.error(error);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) process.exit(await main());
