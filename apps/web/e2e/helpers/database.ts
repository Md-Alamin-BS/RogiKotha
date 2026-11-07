import { spawnSync } from 'node:child_process';
import path from 'node:path';

import {
  databaseNameOf,
  E2E_DATABASE,
  PROTECTED_DATABASES,
  repoRoot,
  type E2eEnvironment,
} from './env';

// BR1.3: the suite's own database, created through the compose superuser when missing (R10),
// then reset, migrated and seeded once per run.

export const COMPOSE_FILE = path.join('infra', 'compose', 'docker-compose.yml');

/** The refusal for a target the suite must not reset, or null when it is the e2e database. */
export function unsafeTargetReason(env: E2eEnvironment): string | null {
  if (env['APP_MODE'] === 'production')
    return 'The browser suite refuses to run with APP_MODE=production';
  for (const variable of ['DATABASE_URL', 'DATABASE_URL_WORKER']) {
    const url = env[variable];
    if (!url) return `${variable} is not set`;
    const name = databaseNameOf(url);
    if (PROTECTED_DATABASES.includes(name) || !name.endsWith('_e2e_test')) {
      return `${variable} names database "${name}"; the browser suite only resets a database ending in _e2e_test`;
    }
  }
  return null;
}

export interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

export type Runner = (
  command: string,
  args: string[],
  options: { cwd: string; env: E2eEnvironment; input?: string; shell?: boolean },
) => CommandResult;

export const runSync: Runner = (command, args, { cwd, env, input, shell = false }) => {
  const result = spawnSync(command, args, {
    cwd,
    env,
    input,
    shell,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

/** `docker compose -f <file> [-p <project>] exec -T postgres psql -U postgres ...` */
export function psqlArgs(env: E2eEnvironment, database = 'postgres'): string[] {
  const project = env['RK_COMPOSE_PROJECT'];
  return [
    'compose',
    '-f',
    COMPOSE_FILE,
    ...(project ? ['-p', project] : []),
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-tA',
    '-d',
    database,
  ];
}

export const EXISTS_SQL = `select 1 from pg_database where datname = '${E2E_DATABASE}';\n`;

// The same roles, owner and extensions `infra/compose/postgres-init` gives `rogikotha_test`.
export const CREATE_SQL = [
  `CREATE DATABASE ${E2E_DATABASE} OWNER rk_app;`,
  `GRANT CONNECT ON DATABASE ${E2E_DATABASE} TO rk_worker, rk_maintenance;`,
  `\\c ${E2E_DATABASE}`,
  'CREATE EXTENSION IF NOT EXISTS pg_trgm;',
  'CREATE EXTENSION IF NOT EXISTS citext;',
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  '',
].join('\n');

function failed(step: string, result: CommandResult): Error {
  const detail = (result.stderr || result.stdout).trim().split(/\r?\n/).slice(-5).join(' | ');
  return new Error(`e2e database: ${step} failed (exit ${result.status ?? 'none'}): ${detail}`);
}

/** Creates the database when missing; true when it was created. */
export function ensureDatabase(env: E2eEnvironment, root = repoRoot(), run = runSync): boolean {
  const exists = run('docker', psqlArgs(env), { cwd: root, env, input: EXISTS_SQL });
  if (exists.status !== 0) throw failed('the existence check', exists);
  if (exists.stdout.trim() === '1') return false;
  const created = run('docker', psqlArgs(env), { cwd: root, env, input: CREATE_SQL });
  if (created.status !== 0) throw failed(`CREATE DATABASE ${E2E_DATABASE}`, created);
  return true;
}

// `pnpm` is a `.cmd` shim on Windows, which Node only starts through a shell; the commands are
// fixed strings, so nothing typed reaches the shell.
const PNPM_STEPS: ReadonlyArray<{ step: string; command: string }> = [
  { step: 'db:reset', command: 'pnpm --filter @rogikotha/database reset' },
  { step: 'db:seed', command: 'pnpm --filter @rogikotha/test-support seed' },
];

/** Refuses an unsafe target, then creates when missing, resets (drops, migrates) and seeds. */
export function prepareDatabase(env: E2eEnvironment, root = repoRoot(), run = runSync): void {
  const refusal = unsafeTargetReason(env);
  if (refusal) throw new Error(refusal);
  ensureDatabase(env, root, run);
  for (const { step, command } of PNPM_STEPS) {
    const result = run(command, [], { cwd: root, env, shell: true });
    if (result.status !== 0) throw failed(step, result);
  }
}
