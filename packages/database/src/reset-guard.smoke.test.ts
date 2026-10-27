// CR-007 smoke: the stale-backend sweep never runs against the development
// database. Full coverage lives in `reset-guard.int.test.ts`.
import { describe, expect, it } from 'vitest';

import { terminateStaleTestBackends } from './reset';

describe('reset guard (smoke)', () => {
  it('the stale-backend sweep refuses the development database rogikotha', async () => {
    const u = new URL(process.env.DATABASE_URL_TEST!);
    u.hostname = '127.0.0.1';
    u.port = '1';
    u.pathname = '/rogikotha';
    const result = await terminateStaleTestBackends(u.toString());
    expect(result.ok).toBe(false);
  });
});
