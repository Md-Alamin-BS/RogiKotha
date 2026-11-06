// @vitest-environment node
// The web composition root (§ 6.4, BR7.2, FD-095): built once on first use, with the mail-only key
// in its own `Crypto`. The adapters and repositories are stood in for; their own packages test them.
import {
  MAIL_SEND_JOB,
  type CommandPorts,
  type IdentityOwnership,
  type PrivateIdentityRepository,
} from '@rogikotha/application';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createAuthInstance } from './better-auth/instance';
import { getContainer } from './container';
import { readWebEnv, type WebEnv } from './env';

// Held here, not imported: only the container itself may import `adapters` (T-010 matrix).
const ensure = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const createCrypto = vi.hoisted(() => vi.fn((keys: unknown) => ({ keys })));
const privatePort = vi.hoisted(() => ({ owns: vi.fn(() => Promise.resolve(true)) }));

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
    PgIdentityRepository: Stub,
    PgJobQueue: vi.fn(function PgJobQueue() {
      return { ensure };
    }),
    PgOutbox: Stub,
    PgPrivateIdentityRepository: vi.fn(function PgPrivateIdentityRepository() {
      return { asPort: () => privatePort };
    }),
    PgUnitOfWork: Stub,
    // U46's block.
    PgDirectoryModuleRepository: Stub,
    PgReviewReadRepository: Stub,
    PgTaxonomyModuleRepository: Stub,
    createInterimPublicEvidenceCount: vi.fn(() => ({})),
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

  it('offers the directory, taxonomy and review read queries (U46)', () => {
    const container = getContainer();

    expect(container.directory.getDoctor.name).toBe('directory.getDoctor');
    expect(container.taxonomy.getCondition.name).toBe('taxonomy.getCondition');
    expect(container.reviewReads.listExperienceCards.kind).toBe('query');
  });

  it('hands the app settings to the commands without any secret', () => {
    expect(getContainer().ports.app).toEqual({
      appUrl: 'http://localhost:3000',
      termsVersion: '1',
    });
  });
});

/** The keys of `P` whose type would take a value of type `X`. */
type FieldsAccepting<P, X> = { [K in keyof P]-?: [X] extends [P[K]] ? K : never }[keyof P];

function accepts<T>(value: T): T {
  return value;
}

describe('the identity wiring (C19)', () => {
  it('gives the private repository to the identity module, whose ownership check reads it', async () => {
    const { identity } = getContainer();

    await expect(
      identity.ownership.ownsPersona({} as never, { accountId: 'a', personaId: 'p' }),
    ).resolves.toBe(true);
    expect(privatePort.owns).toHaveBeenCalledWith({}, 'a', 'p');
  });

  it('keeps the private repository out of the command ports (BR3.2)', () => {
    const { ports } = getContainer();

    expect(Object.values(ports)).not.toContain(privatePort);
    expect(Object.keys(ports)).not.toContain('privateIdentities');
  });

  // These are checked by `tsc` (`pnpm typecheck`); a `@ts-expect-error` that no longer errors fails it.
  // ASSUMPTION(U11): the directory, taxonomy and evidence modules have no ports type yet (U47 and
  // later add them), so BR3.5 is asserted against `CommandPorts`, the only other module ports type
  // today; each new module's ports type gets the same two lines when it lands.
  it('lets no other module ports type take the private repository (BR3.2)', () => {
    const repo = privatePort as unknown as PrivateIdentityRepository;

    expectTypeOf<FieldsAccepting<CommandPorts, PrivateIdentityRepository>>().toBeNever();
    // @ts-expect-error BR3.2: the account repository port is not the private identity repository.
    accepts<CommandPorts['accounts']>(repo);
  });

  it('lets no other module ports type take the ownership check (BR3.5)', () => {
    const ownership = getContainer().identity.ownership;

    expectTypeOf<FieldsAccepting<CommandPorts, IdentityOwnership>>().toBeNever();
    // @ts-expect-error BR3.5: no command port is the identity ownership check.
    accepts<CommandPorts['accounts']>(ownership);
  });

  it('has a field check that does find a field that takes the value', () => {
    expectTypeOf<
      FieldsAccepting<{ held: PrivateIdentityRepository; other: string }, PrivateIdentityRepository>
    >().toEqualTypeOf<'held'>();
  });
});
