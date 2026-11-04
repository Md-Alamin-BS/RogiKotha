// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import { healthReport, probeDatabase } from './health';

vi.mock('./db', () => ({ getDb: vi.fn() }));

describe('the health probes', () => {
  it('reports the database ok when select 1 answers', async () => {
    await expect(probeDatabase(() => Promise.resolve({ rows: [{}] }))).resolves.toBe('ok');
  });

  it('reports the database down when the query fails', async () => {
    await expect(probeDatabase(() => Promise.reject(new Error('refused')))).resolves.toBe('down');
  });

  it('reports the database down when it does not answer within two seconds', async () => {
    vi.useFakeTimers();
    const probe = probeDatabase(() => new Promise(() => undefined));
    await vi.advanceTimersByTimeAsync(2000);
    await expect(probe).resolves.toBe('down');
    vi.useRealTimers();
  });

  it('is not ok while the database is down, and leaves the unwired probes unknown', async () => {
    const report = await healthReport(() => Promise.resolve('down'));

    expect(report).toMatchObject({
      ok: false,
      db: 'down',
      queue: 'unknown',
      mail: 'unknown',
      scanner: 'unknown',
    });
    await expect(healthReport(() => Promise.resolve('ok'))).resolves.toMatchObject({ ok: true });
  });
});
