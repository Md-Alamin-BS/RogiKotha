// @vitest-environment node
// The web composition root (§ 6.4, BR7.2, FD-095): built once on first use, with the mail-only key
// in its own `Crypto`. The adapters and repositories are stood in for; their own packages test them.
import { MAIL_SEND_JOB } from '@rogikotha/application';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthInstance } from './better-auth/instance';
import { getContainer } from './container';
import { readWebEnv, type WebEnv } from './env';

// Held here, not imported: only the container itself may import `adapters` (T-010 matrix).
const ensure = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const createCrypto = vi.hoisted(() => vi.fn((keys: unknown) => ({ keys })));

vi.mock('@rogikotha/adapters', () => ({
  createArgon2PasswordHasher: vi.fn(() => ({
    hash: vi.fn(() => Promise.resolve('$argon2id$synthetic')),
    verify: vi.fn(() => Promise.resolve(false)),
  })),
  createCrypto,
  createMemoryRateLimiter: vi.fn(() => ({})),
}));
vi.mock('@rogikotha/database', () => {
  const Stub = vi.fn(function Stub() {});
  return {
    PgAccountRepository: Stub,
    PgAuditWriter: Stub,
    PgBossQueue: Stub,
    PgEmailDeliveryRepository: Stub,
    PgJobQueue: vi.fn(function PgJobQueue() {
      return { ensure };
    }),
    PgOutbox: Stub,
    PgUnitOfWork: Stub,
  };
});
vi.mock('./better-auth/instance', () => ({
  createAuthInstance: vi.fn(() => ({ handler: vi.fn() })),
}));
vi.mock('./better-auth/gateway', () => ({ createAuthGateway: vi.fn(() => ({})) }));
vi.mock('./db', () => ({ getDb: vi.fn(() => ({})) }));
vi.mock('./env', () => ({ readWebEnv: vi.fn() }));

const ENCRYPTION_KEY = new Uint8Array(32).fill(1);
const MAIL_KEY = new Uint8Array(32).fill(2);

function buildEnv(): WebEnv {
  return {
    databaseUrl: 'postgres://synthetic@localhost/none',
    appUrl: 'http://localhost:3000',
    appMode: 'demo',
    betterAuthSecret: 'a-synthetic-test-secret-of-at-least-32-chars',
    encryptionKey: ENCRYPTION_KEY,
    mailRecipientKey: MAIL_KEY,
    termsVersion: '1',
  };
}

// Counted after the imports above ran, before any test asks for the container.
const builtAtImport =
  vi.mocked(readWebEnv).mock.calls.length + vi.mocked(createAuthInstance).mock.calls.length;

beforeEach(() => {
  vi.clearAllMocks();
  delete (globalThis as { __rkWebContainer?: unknown }).__rkWebContainer;
  vi.mocked(readWebEnv).mockReturnValue(buildEnv());
});

describe('the web container', () => {
  it('reads no setting and builds nothing when the module is imported (BR7.2)', () => {
    expect(builtAtImport).toBe(0);
  });

  it('is built once and then reused', () => {
    const first = getContainer();
    const second = getContainer();

    expect(second).toBe(first);
    expect(readWebEnv).toHaveBeenCalledTimes(1);
  });

  it('seals recipients with the mail-only key, which has no MAC secret (FD-095)', () => {
    getContainer();

    expect(createCrypto).toHaveBeenCalledWith({
      encryptionKey: ENCRYPTION_KEY,
      macSecret: buildEnv().betterAuthSecret,
    });
    expect(createCrypto).toHaveBeenCalledWith({ encryptionKey: MAIL_KEY });
  });

  it('ensures the mail queue at start (WF12 step 1)', () => {
    getContainer();

    expect(ensure).toHaveBeenCalledWith(MAIL_SEND_JOB);
  });

  it('hands the app settings to the commands without any secret', () => {
    expect(getContainer().ports.app).toEqual({
      appUrl: 'http://localhost:3000',
      termsVersion: '1',
    });
  });
});
