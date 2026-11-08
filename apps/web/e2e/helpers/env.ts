import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// BR1.2, BR1.3: the one environment the suite's web server, worker and database helpers share.

export const E2E_HOST = '127.0.0.1';
export const E2E_PORT = 3107;
export const E2E_ORIGIN = `http://${E2E_HOST}:${E2E_PORT}`;
export const E2E_DATABASE = 'rogikotha_e2e_test';
/** The demo and integration-test databases the suite must never touch (BR1.3). */
export const PROTECTED_DATABASES: readonly string[] = ['rogikotha', 'rogikotha_test'];
export const DEFAULT_MAILPIT_URL = 'http://localhost:8025';
export const DEFAULT_WORKERS = 2;
export const MAX_WORKERS = 4;

/** Set by the global setup; Playwright hands `process.env` changes made there to every worker. */
export const RUN_ID_VARIABLE = 'E2E_RUN_ID';

export type E2eEnvironment = Record<string, string>;

/** The folder holding `pnpm-workspace.yaml`, the same search `apps/web/src/server/storage.ts` does. */
export function findRepoRoot(start = path.dirname(fileURLToPath(import.meta.url))): string {
  let dir = path.resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not find the repo root (pnpm-workspace.yaml) above ${start}`);
}

export const repoRoot = (): string => findRepoRoot();
export const dataDir = (root = repoRoot()): string => path.join(root, '.data');
export const storageDir = (root = repoRoot()): string => path.join(root, '.data', 'e2e-storage');
export const lockFile = (root = repoRoot()): string => path.join(root, '.data', 'e2e.lock');
export const webDir = (root = repoRoot()): string => path.join(root, 'apps', 'web');
export const resultsDir = (root = repoRoot()): string => path.join(webDir(root), 'test-results');
export const logsDir = (root = repoRoot()): string => path.join(resultsDir(root), 'logs');
export const workerEntry = (root = repoRoot()): string =>
  path.join(root, 'apps', 'worker', 'dist', 'main.js');
/**
 * ASSUMPTION(U50): plain `node dist/main.js` cannot load the workspace packages' TS source
 * (ISS-193), so the worker's source runs under its own tsx loader in one process (ISS-759).
 */
export const workerArgs = (root = repoRoot()): string[] => {
  const worker = path.join(root, 'apps', 'worker');
  const loader = path.join(worker, 'node_modules', 'tsx', 'dist', 'loader.mjs');
  return ['--import', pathToFileURL(loader).href, path.join(worker, 'src', 'main.ts')];
};
export const webBuildId = (root = repoRoot()): string =>
  path.join(webDir(root), '.next', 'BUILD_ID');

/** `KEY=VALUE` lines; quotes around a value are dropped, `#` lines and blanks skipped. */
export function parseEnvFile(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    const quoted = /^(['"])(.*)\1$/.exec(value);
    if (quoted) value = quoted[2] ?? '';
    else value = value.replace(/\s+#.*$/, '');
    values[key] = value;
  }
  return values;
}

export function readEnvFile(root = repoRoot()): Record<string, string> {
  const file = path.join(root, '.env');
  return existsSync(file) ? parseEnvFile(readFileSync(file, 'utf8')) : {};
}

/** The database name in a PostgreSQL URL. */
export function databaseNameOf(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
}

/** The same URL (role, password, host, port) pointed at another database. */
export function withDatabase(url: string, database: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${encodeURIComponent(database)}`;
  return parsed.toString();
}

function definedOnly(source: NodeJS.ProcessEnv): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) values[key] = value;
  }
  return values;
}

/**
 * `.env`, then the shell's variables, then the suite's overrides: the e2e database for every
 * role, the 3107 origin, demo mode and one absolute storage folder under every name a release-1
 * process reads (BR1.2).
 */
export function e2eEnvironment(
  root = repoRoot(),
  fileEnv = readEnvFile(root),
  processEnv: NodeJS.ProcessEnv = process.env,
): E2eEnvironment {
  const base = { ...fileEnv, ...definedOnly(processEnv) };
  const storage = storageDir(root);
  const overrides: Record<string, string> = {
    APP_URL: E2E_ORIGIN,
    APP_MODE: 'demo',
    LOG_LEVEL: 'info',
    STORAGE_ROOT: storage,
    EVIDENCE_STORAGE_DIR: storage,
    MAILPIT_URL: base['MAILPIT_URL'] ?? DEFAULT_MAILPIT_URL,
  };
  // A missing URL stays missing, so the global setup refuses by name (database.ts) instead of
  // the config failing to load. DATABASE_URL_TEST and the maintenance URL are pointed here too,
  // so nothing the suite starts can reach another database.
  const appUrl = base['DATABASE_URL'];
  if (appUrl) {
    overrides['DATABASE_URL'] = withDatabase(appUrl, E2E_DATABASE);
    overrides['DATABASE_URL_TEST'] = withDatabase(appUrl, E2E_DATABASE);
  }
  for (const variable of ['DATABASE_URL_WORKER', 'DATABASE_URL_MAINTENANCE']) {
    const url = base[variable];
    if (url) overrides[variable] = withDatabase(url, E2E_DATABASE);
  }
  const environment = { ...base, ...overrides };
  // An inherited NODE_ENV=test would make `next start` warn and run React in another mode.
  delete environment['NODE_ENV'];
  return environment;
}

/** BR1.5: two workers by default; `E2E_WORKERS` may lower it and never raise it above four. */
export function workerCount(value = process.env['E2E_WORKERS']): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_WORKERS;
  return Math.min(parsed, MAX_WORKERS);
}

/** BR1.5: base36 timestamp of the global setup. */
export const newRunId = (now = Date.now()): string => now.toString(36);

/** The run id the global setup published; a spec loaded without it is a harness defect. */
export function runId(): string {
  const value = process.env[RUN_ID_VARIABLE];
  if (!value) throw new Error(`${RUN_ID_VARIABLE} is not set: the global setup did not run`);
  return value;
}

/** BR1.8: a missing build stops the run before any server or database work. */
export function buildProblems(root = repoRoot()): string[] {
  const missing = [webBuildId(root), workerEntry(root)].filter((file) => !existsSync(file));
  return missing.length > 0
    ? [`No build found: run pnpm build (or pnpm check) first (missing ${missing.join(', ')})`]
    : [];
}

function newestMtime(dir: string): number {
  if (!existsSync(dir)) return 0;
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const time = entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs;
    if (time > newest) newest = time;
  }
  return newest;
}

/** BR1.8: a warning, not a stop, when the web build is older than the newest source file. */
export function staleBuildWarning(root = repoRoot()): string | null {
  const buildId = webBuildId(root);
  if (!existsSync(buildId)) return null;
  const source = Math.max(
    newestMtime(path.join(webDir(root), 'src')),
    newestMtime(path.join(root, 'apps', 'worker', 'src')),
  );
  return statSync(buildId).mtimeMs < source
    ? 'The build is older than the source: run pnpm build'
    : null;
}
