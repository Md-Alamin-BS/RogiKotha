// Builds the real composition root against a URL nothing listens on: the pool and the queue
// connect lazily, so this needs no database.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MailRetry, buildContainer } from './container.js';
import type { WorkerEnv } from './env.js';

function aWorkerEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    DATABASE_URL_WORKER: 'postgres://rk_worker:secret@127.0.0.1:1/rogikotha_unreachable',
    APP_MODE: 'demo',
    LOG_LEVEL: 'info',
    MAIL_RECIPIENT_KEY: new Uint8Array(32).fill(7),
    STORAGE_ROOT: './.data/storage',
    CLAMD_HOST: 'localhost',
    CLAMD_PORT: 3310,
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    MAIL_FROM: 'RogiKotha <no-reply@demo.rogikotha.local>',
    ...overrides,
  };
}

describe('buildContainer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers a clock that reads the current time', async () => {
    const container = buildContainer(aWorkerEnv());

    const before = Date.now();
    const read = container.clock.now().getTime();
    const after = Date.now();
    await container.close();

    expect(read).toBeGreaterThanOrEqual(before);
    expect(read).toBeLessThanOrEqual(after);
  });

  it('offers a logger that writes one JSON line per call', async () => {
    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((line: string) => {
      lines.push(line);
    });
    const container = buildContainer(aWorkerEnv());

    container.logger.info('worker.test', { count: 1 });
    await container.close();

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      level: 'info',
      event: 'worker.test',
      count: 1,
    });
  });

  it('closes cleanly when the queue was never started', async () => {
    const container = buildContainer(aWorkerEnv());

    await expect(container.close()).resolves.toBeUndefined();
  });

  it('builds the mail crypto from the mail key alone, so it decrypts but has no MAC key (review point 6)', async () => {
    const container = buildContainer(aWorkerEnv());

    const sealed = container.mailCrypto.encrypt('shirin.demo@example.test');
    const opened = container.mailCrypto.decryptText(sealed);
    await container.close();

    expect(opened).toEqual({ ok: true, data: 'shirin.demo@example.test' });
    expect(() => container.mailCrypto.hmac('email-key', 'shirin.demo@example.test')).toThrow();
  });

  it('cannot open a recipient sealed under a different key', async () => {
    const container = buildContainer(aWorkerEnv());
    const other = buildContainer(aWorkerEnv({ MAIL_RECIPIENT_KEY: new Uint8Array(32).fill(9) }));

    const sealed = other.mailCrypto.encrypt('shirin.demo@example.test');
    const opened = container.mailCrypto.decryptText(sealed);
    await container.close();
    await other.close();

    expect(opened.ok).toBe(false);
  });

  it('loads the email catalog in both languages from the message files', async () => {
    const container = buildContainer(aWorkerEnv());
    await container.close();

    expect(container.emailCatalog.en['email.verify']?.body).toContain('{link}');
    expect(container.emailCatalog.bn['email.verify']?.body).toContain('{link}');
  });

  it('asks for a retry with an error that names only the code and the attempt count', () => {
    const retry = new MailRetry('smtp_unavailable', 2);

    expect(retry).toBeInstanceOf(Error);
    expect(retry.message).toBe('mail.send retry: smtp_unavailable after 2 attempts');
    expect({ code: retry.errorCode, attempts: retry.attempts }).toEqual({
      code: 'smtp_unavailable',
      attempts: 2,
    });
  });

  it('builds a separate set of adapters on every call', async () => {
    const first = buildContainer(aWorkerEnv());
    const second = buildContainer(aWorkerEnv());

    expect(first.queue).not.toBe(second.queue);
    expect(first.db).not.toBe(second.db);

    await first.close();
    await second.close();
  });
});

describe('the evidence processor wiring (U48 BR3.6)', () => {
  it('holds the file reader and no writer, so the worker cannot put an original into quarantine', async () => {
    const container = buildContainer(aWorkerEnv());
    await container.close();

    const files = container.evidenceDeps.files as unknown as Record<string, unknown>;
    expect(typeof files.readQuarantined).toBe('function');
    expect('putQuarantined' in files).toBe(false);
    expect('filenameSeal' in container.evidenceDeps).toBe(false);
  });

  it('offers the processor and the sweep to the handlers', async () => {
    const container = buildContainer(aWorkerEnv());
    await container.close();

    expect(typeof container.processEvidence).toBe('function');
    expect(typeof container.sweepEvidence).toBe('function');
  });
});
