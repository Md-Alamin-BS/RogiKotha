import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadEnv } from './env.js';

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
    ...overrides,
  };
}

describe('loadEnv', () => {
  let stderr: string[];

  beforeEach(() => {
    stderr = [];
    vi.spyOn(console, 'error').mockImplementation((message: unknown) => {
      stderr.push(String(message));
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
      STORAGE_ROOT: './.data/storage',
      CLAMD_HOST: 'localhost',
      CLAMD_PORT: 3310,
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      MAIL_FROM: 'RogiKotha <no-reply@demo.rogikotha.local>',
    });
    expect(stderr).toEqual([]);
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
    expect(stderr).toHaveLength(1);
    expect(stderr[0]).toContain('DATABASE_URL_WORKER is required');
  });

  it('never falls back to the application role URL', () => {
    const source = aWorkerEnv({
      DATABASE_URL: 'postgres://rk_app:secret@localhost:5432/rogikotha',
    });
    delete source.DATABASE_URL_WORKER;

    expect(() => loadEnv(source)).toThrow(ExitCalled);
    expect(stderr[0]).toContain('never falls back to DATABASE_URL');
  });

  it('exits with code 1 and names APP_MODE when the mode is not recognised', () => {
    expect(() => loadEnv(aWorkerEnv({ APP_MODE: 'staging' }))).toThrow(new ExitCalled(1));
    expect(stderr[0]).toContain('worker environment invalid');
    expect(stderr[0]).toContain('APP_MODE');
  });

  it('exits with code 1 and names the variable when a port is not a positive integer', () => {
    expect(() => loadEnv(aWorkerEnv({ CLAMD_PORT: 'abc' }))).toThrow(new ExitCalled(1));
    expect(stderr[0]).toContain('CLAMD_PORT');

    expect(() => loadEnv(aWorkerEnv({ SMTP_PORT: '0' }))).toThrow(new ExitCalled(1));
    expect(stderr[1]).toContain('SMTP_PORT');
  });

  it('lists every invalid variable in one message', () => {
    expect(() => loadEnv(aWorkerEnv({ APP_MODE: 'staging', LOG_LEVEL: 'debug' }))).toThrow(
      ExitCalled,
    );

    expect(stderr).toHaveLength(1);
    expect(stderr[0]).toContain('APP_MODE');
    expect(stderr[0]).toContain('LOG_LEVEL');
  });
});
