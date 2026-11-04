// CR-011 W6 (BR5.1, ISS-203): loading the worker's env module prints nothing,
// so the worker's first stdout line is its own JSON log. dotenv's banner goes
// through `console.log`, so both it and the raw stdout stream are watched.
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('worker env loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('W6: loading apps/worker/src/env.ts writes nothing to stdout', async () => {
    const consoleLog = vi.spyOn(console, 'log');
    const stdoutWrite = vi.spyOn(process.stdout, 'write');
    vi.resetModules();

    await import('./env.js');

    expect(consoleLog).not.toHaveBeenCalled();
    expect(stdoutWrite).not.toHaveBeenCalled();
  });

  it('removes the web encryption key and the auth secret from process.env as it loads (FD-095)', async () => {
    vi.stubEnv('APP_ENCRYPTION_KEY', 'web-key-the-worker-must-not-hold');
    vi.stubEnv('BETTER_AUTH_SECRET', 'web-secret-the-worker-must-not-hold');
    vi.resetModules();

    await import('./env.js');

    expect(process.env).not.toHaveProperty('APP_ENCRYPTION_KEY');
    expect(process.env).not.toHaveProperty('BETTER_AUTH_SECRET');
    vi.unstubAllEnvs();
  });
});
