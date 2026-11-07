import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WEB_ONLY_SECRETS, loadEnv, resolveStorageRoot, scrubWebSecrets } from './env.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** A synthetic 32-byte key: every byte 7. */
const MAIL_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');

class ExitCalled extends Error {
  constructor(readonly code: number | string | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

/** The smallest environment the worker accepts; overrides replace or add keys. */
function aWorkerEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    DATABASE_URL_WORKER: 'postgres://rk_worker:secret@localhost:5432/rogikotha',
    APP_MODE: 'demo',
    MAIL_RECIPIENT_KEY: MAIL_KEY_BASE64,
    ...overrides,
  };
}

interface EnvInvalidLine {
  level: string;
  event: string;
  code: string;
  variables: string[];
}

// Step 9 (U41): these cases read the `worker.env_invalid` log line instead of a stderr sentence,
// because the old sentences carried zod's issue text, which can quote a value (BR6.7).
describe('loadEnv', () => {
  let stderr: string[];
  let lines: string[];

  function logged(index = 0): EnvInvalidLine {
    return JSON.parse(lines[index] ?? '{}') as EnvInvalidLine;
  }

  beforeEach(() => {
    stderr = [];
    lines = [];
    vi.spyOn(console, 'error').mockImplementation((message: unknown) => {
      stderr.push(String(message));
    });
    vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitCalled(code);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the minimal environment and fills the documented defaults', () => {
    const env = loadEnv(aWorkerEnv());

    expect(env).toEqual({
      DATABASE_URL_WORKER: 'postgres://rk_worker:secret@localhost:5432/rogikotha',
      APP_MODE: 'demo',
      LOG_LEVEL: 'info',
      MAIL_RECIPIENT_KEY: new Uint8Array(32).fill(7),
      STORAGE_ROOT: path.join(REPO_ROOT, '.data', 'storage'),
      CLAMD_HOST: 'localhost',
      CLAMD_PORT: 3310,
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      MAIL_FROM: 'RogiKotha <no-reply@demo.rogikotha.local>',
    });
    expect(stderr).toEqual([]);
    expect(lines).toEqual([]);
  });

  it('turns port strings into numbers and keeps the values it is given', () => {
    const env = loadEnv(
      aWorkerEnv({
        CLAMD_PORT: '4000',
        SMTP_PORT: '2525',
        LOG_LEVEL: 'error',
        SMTP_HOST: 'mail.local',
      }),
    );

    expect(env.CLAMD_PORT).toBe(4000);
    expect(env.SMTP_PORT).toBe(2525);
    expect(env.LOG_LEVEL).toBe('error');
    expect(env.SMTP_HOST).toBe('mail.local');
  });

  it('exits with code 1 and names the variable when DATABASE_URL_WORKER is missing', () => {
    const source = aWorkerEnv();
    delete source.DATABASE_URL_WORKER;

    expect(() => loadEnv(source)).toThrow(new ExitCalled(1));
    expect(lines).toHaveLength(1);
    expect(logged()).toMatchObject({
      level: 'error',
      event: 'worker.env_invalid',
      code: 'database_url_worker_required',
      variables: ['DATABASE_URL_WORKER'],
    });
    expect(stderr).toEqual([]);
  });

  it('never falls back to the application role URL', () => {
    const source = aWorkerEnv({
      DATABASE_URL: 'postgres://rk_app:secret@localhost:5432/rogikotha',
    });
    delete source.DATABASE_URL_WORKER;

    expect(() => loadEnv(source)).toThrow(ExitCalled);
    expect(logged().code).toBe('database_url_worker_required');
    expect(lines[0]).not.toContain('rk_app');
  });

  it('exits with code 1 and names APP_MODE when the mode is not recognised', () => {
    expect(() => loadEnv(aWorkerEnv({ APP_MODE: 'staging' }))).toThrow(new ExitCalled(1));
    expect(logged()).toMatchObject({
      event: 'worker.env_invalid',
      code: 'env_invalid',
      variables: ['APP_MODE'],
    });
    expect(lines[0]).not.toContain('staging');
    expect(stderr).toEqual([]);
  });

  it('exits with code 1 and names the variable when a port is not a positive integer', () => {
    expect(() => loadEnv(aWorkerEnv({ CLAMD_PORT: 'abc' }))).toThrow(new ExitCalled(1));
    expect(logged(0).variables).toEqual(['CLAMD_PORT']);

    expect(() => loadEnv(aWorkerEnv({ SMTP_PORT: '0' }))).toThrow(new ExitCalled(1));
    expect(logged(1).variables).toEqual(['SMTP_PORT']);
  });

  it('lists every invalid variable in one message', () => {
    expect(() => loadEnv(aWorkerEnv({ APP_MODE: 'staging', LOG_LEVEL: 'debug' }))).toThrow(
      ExitCalled,
    );

    expect(lines).toHaveLength(1);
    expect([...logged().variables].sort()).toEqual(['APP_MODE', 'LOG_LEVEL']);
  });

  it('exits with code 1 and names MAIL_RECIPIENT_KEY when it is missing (FD-095)', () => {
    const source = aWorkerEnv();
    delete source.MAIL_RECIPIENT_KEY;

    expect(() => loadEnv(source)).toThrow(new ExitCalled(1));
    expect(logged().variables).toEqual(['MAIL_RECIPIENT_KEY']);
  });

  it('refuses a MAIL_RECIPIENT_KEY that is not 32 bytes and never prints the value', () => {
    const shortKey = Buffer.alloc(16, 7).toString('base64');

    expect(() => loadEnv(aWorkerEnv({ MAIL_RECIPIENT_KEY: shortKey }))).toThrow(new ExitCalled(1));
    expect(logged().variables).toEqual(['MAIL_RECIPIENT_KEY']);
    expect(lines[0]).not.toContain(shortKey);
  });

  it('refuses a MAIL_RECIPIENT_KEY of the right length that is not base64', () => {
    const notBase64 = `${'!'.repeat(43)}=`;

    expect(() => loadEnv(aWorkerEnv({ MAIL_RECIPIENT_KEY: notBase64 }))).toThrow(ExitCalled);
    expect(logged().variables).toEqual(['MAIL_RECIPIENT_KEY']);
  });

  it('keeps neither web secret in the parsed environment, even when the source has them', () => {
    const env = loadEnv(
      aWorkerEnv({ APP_ENCRYPTION_KEY: MAIL_KEY_BASE64, BETTER_AUTH_SECRET: 'x'.repeat(40) }),
    );

    expect(Object.keys(env)).not.toContain('APP_ENCRYPTION_KEY');
    expect(Object.keys(env)).not.toContain('BETTER_AUTH_SECRET');
  });
});

describe('resolveStorageRoot (ISS-621)', () => {
  it('takes a relative root from the repository root, not from apps/worker', () => {
    expect(existsSync(path.join(REPO_ROOT, 'pnpm-workspace.yaml'))).toBe(true);

    expect(resolveStorageRoot('./.data/storage')).toBe(path.join(REPO_ROOT, '.data', 'storage'));
    expect(loadEnv(aWorkerEnv({ STORAGE_ROOT: 'var/evidence' })).STORAGE_ROOT).toBe(
      path.join(REPO_ROOT, 'var', 'evidence'),
    );
  });

  it('keeps an absolute root exactly as given', () => {
    const absolute = path.join(tmpdir(), 'rk-storage-synthetic');

    expect(resolveStorageRoot(absolute)).toBe(absolute);
    expect(loadEnv(aWorkerEnv({ STORAGE_ROOT: absolute })).STORAGE_ROOT).toBe(absolute);
  });
});

describe('scrubWebSecrets', () => {
  it('deletes the web encryption key and the auth secret and keeps everything else', () => {
    const target = aWorkerEnv({
      APP_ENCRYPTION_KEY: MAIL_KEY_BASE64,
      BETTER_AUTH_SECRET: 'x'.repeat(40),
    });

    scrubWebSecrets(target);

    expect(WEB_ONLY_SECRETS).toEqual(['APP_ENCRYPTION_KEY', 'BETTER_AUTH_SECRET']);
    expect(Object.keys(target).sort()).toEqual([
      'APP_MODE',
      'DATABASE_URL_WORKER',
      'MAIL_RECIPIENT_KEY',
    ]);
  });
});
