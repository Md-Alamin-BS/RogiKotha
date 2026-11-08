// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { healthReport } from './health';

vi.mock('./db', () => ({ getDb: vi.fn() }));

describe('smoke: the health report (U50)', () => {
  it('reports all four probes and ok true when every dependency answers', async () => {
    const ok = () => Promise.resolve('ok' as const);

    const report = await healthReport({ db: ok, queue: ok, mail: ok, scanner: ok });

    expect(report).toMatchObject({ ok: true, db: 'ok', queue: 'ok', mail: 'ok', scanner: 'ok' });
  });
});
