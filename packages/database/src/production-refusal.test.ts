// Demo safety (AD-14): migrate and reset refuse APP_MODE=production before they open a
// connection. The URL points at a closed port, so a connection attempt would fail differently.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { runMigrate } from './migrate';
import { runReset } from './reset';

const UNREACHABLE_TEST_URL = 'postgres://nobody:nobody@127.0.0.1:1/never_test';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('production refusal', () => {
  it('db:migrate refuses to run with APP_MODE=production', async () => {
    vi.stubEnv('APP_MODE', 'production');

    await expect(runMigrate(UNREACHABLE_TEST_URL)).rejects.toThrow(
      'db:migrate refuses to run with APP_MODE=production',
    );
  });

  it('db:reset refuses to run with APP_MODE=production, even when asked to sweep a test database', async () => {
    vi.stubEnv('APP_MODE', 'production');

    await expect(runReset(UNREACHABLE_TEST_URL, { terminateStaleBackends: true })).rejects.toThrow(
      'db:reset refuses to run with APP_MODE=production',
    );
  });

  it('outside production db:reset gets past the refusal and fails only on the unreachable server', async () => {
    vi.stubEnv('APP_MODE', 'development');

    await expect(runReset(UNREACHABLE_TEST_URL)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof Error &&
        !error.message.includes('refuses to run with APP_MODE=production'),
    );
  });
});
