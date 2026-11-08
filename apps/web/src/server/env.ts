import { existsSync } from 'node:fs';
import path from 'node:path';

// `next dev` and `next start` run with apps/web as the working directory, so Next never sees the
// repo-root `.env` that every other package reads; CI sets the variables directly and has no file.
let rootEnvLoaded = false;

function loadRootEnv(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      const file = path.join(dir, '.env');
      // `loadEnvFile` never overrides a variable that is already set.
      if (existsSync(file)) process.loadEnvFile(file);
      return;
    }
    dir = path.dirname(dir);
  }
}

/** Reads a required server variable, loading the repo-root `.env` first when it is missing. */
export function requireEnv(name: string): string {
  if (!process.env[name]) loadRootEnv();
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; copy .env.example to the repo root as .env`);
  return value;
}

/** Reads an optional server variable, with the same `.env` fallback as `requireEnv`. */
export function optionalEnv(name: string): string | undefined {
  if (!process.env[name]) loadRootEnv();
  return process.env[name] || undefined;
}

/** Where the health route's mail and scanner probes connect; the worker's defaults (BR9.1). */
export interface ProbeTargets {
  smtpHost: string;
  smtpPort: number;
  clamdHost: string;
  clamdPort: number;
}

function portOr(value: string | undefined, fallback: number): number {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
}

/** Reads the probe hosts and ports; an unset or unusable value falls back to the default. */
export function readProbeTargets(
  read: (name: string) => string | undefined = optionalEnv,
): ProbeTargets {
  return {
    smtpHost: read('SMTP_HOST') || 'localhost',
    smtpPort: portOr(read('SMTP_PORT'), 1025),
    clamdHost: read('CLAMD_HOST') || 'localhost',
    clamdPort: portOr(read('CLAMD_PORT'), 3310),
  };
}

/** The directory holding `pnpm-workspace.yaml` above the working directory, else the latter. */
export function workspaceRoot(start: string = process.cwd()): string {
  let dir = start;
  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  return start;
}

export const DEFAULT_STORAGE_ROOT = './.data/storage';

/**
 * U48 (BR3.3): a relative `STORAGE_ROOT` is taken from the repo root, not from `apps/web` where
 * `next` runs, and a root inside `apps/web` (so inside its public folder too) is refused.
 */
export function resolveStorageRoot(
  value: string | undefined,
  root: string,
  problems: string[],
): string {
  const resolved = path.resolve(root, value?.trim() || DEFAULT_STORAGE_ROOT);
  const relative = path.relative(path.resolve(root, 'apps', 'web'), resolved);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    problems.push('STORAGE_ROOT must be outside apps/web');
  }
  return resolved;
}

const KEY_BYTES = 32;
const SECRET_MIN_LENGTH = 32;

/** The web tier's validated settings (T-101 BR7.2, FD-095). Read when needed, never at import. */
export interface WebEnv {
  databaseUrl: string;
  /** No trailing slash. */
  appUrl: string;
  appMode: string | undefined;
  betterAuthSecret: string;
  encryptionKey: Uint8Array;
  mailRecipientKey: Uint8Array;
  termsVersion: string;
  /** U48: the evidence quarantine root, absolute (BR3.1, BR3.3). */
  storageRoot: string;
}

/** Names every variable that is wrong, never a value (BR7.2). */
export class WebEnvError extends Error {
  constructor(readonly problems: string[]) {
    super(`Server settings are not usable: ${problems.join('; ')}`);
    this.name = 'WebEnvError';
  }
}

function decodeKey(name: string, value: string | undefined, problems: string[]): Uint8Array {
  const key = value ? Buffer.from(value, 'base64') : Buffer.alloc(0);
  if (key.length !== KEY_BYTES) problems.push(`${name} must be ${KEY_BYTES} bytes of base64`);
  return new Uint8Array(key);
}

function absoluteUrl(value: string | undefined, problems: string[]): string {
  try {
    if (!value) throw new Error('missing');
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
    return value.replace(/\/+$/, '');
  } catch {
    problems.push('APP_URL must be an absolute http(s) URL');
    return '';
  }
}

/**
 * Validates every variable the web tier needs and throws one error naming each problem. `read`
 * is the variable source, so tests can pass their own.
 */
export function readWebEnv(
  read: (name: string) => string | undefined = optionalEnv,
  root: string = workspaceRoot(),
): WebEnv {
  const problems: string[] = [];
  const databaseUrl = read('DATABASE_URL') ?? '';
  if (!databaseUrl) problems.push('DATABASE_URL is not set');
  const appUrl = absoluteUrl(read('APP_URL'), problems);
  const betterAuthSecret = read('BETTER_AUTH_SECRET') ?? '';
  if (betterAuthSecret.length < SECRET_MIN_LENGTH) {
    problems.push(`BETTER_AUTH_SECRET must be at least ${SECRET_MIN_LENGTH} characters`);
  }
  const encryptionKey = decodeKey('APP_ENCRYPTION_KEY', read('APP_ENCRYPTION_KEY'), problems);
  const mailRecipientKey = decodeKey('MAIL_RECIPIENT_KEY', read('MAIL_RECIPIENT_KEY'), problems);
  if (
    encryptionKey.length === KEY_BYTES &&
    Buffer.from(encryptionKey).equals(Buffer.from(mailRecipientKey))
  ) {
    problems.push('MAIL_RECIPIENT_KEY must differ from APP_ENCRYPTION_KEY (FD-095)');
  }
  const termsVersion = (read('TERMS_VERSION') ?? '').trim();
  if (!termsVersion) problems.push('TERMS_VERSION is not set');
  const storageRoot = resolveStorageRoot(read('STORAGE_ROOT'), root, problems);
  if (problems.length > 0) throw new WebEnvError(problems);
  return {
    databaseUrl,
    appUrl,
    appMode: read('APP_MODE'),
    betterAuthSecret,
    encryptionKey,
    mailRecipientKey,
    termsVersion,
    storageRoot,
  };
}
