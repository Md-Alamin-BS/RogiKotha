// @vitest-environment node
// The web composition root (§ 6.4, BR7.2, FD-095): built once on first use, with the mail-only key
// in its own `Crypto`. The adapters and repositories are stood in for; their own packages test them.
import {
  MAIL_SEND_JOB,
  type CommandPorts,
  type EvidenceModuleDeps,
  type IdentityOwnership,
  type PrivateIdentityRepository,
  type ReviewModulePorts,
  type ReviewSeams,
} from '@rogikotha/application';
import type * as Application from '@rogikotha/application';
import { createInterimPublicEvidenceCount } from '@rogikotha/database';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createAuthInstance } from './better-auth/instance';
import { getContainer, type WebIdentity } from './container';
import { readWebEnv, type WebEnv } from './env';

// Held here, not imported: only the container itself may import `adapters` (T-010 matrix).
const ensure = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const createCrypto = vi.hoisted(() => vi.fn((keys: unknown) => ({ keys })));
const privatePort = vi.hoisted(() => ({ owns: vi.fn(() => Promise.resolve(true)) }));
// U11 review: the ownership check is no longer on the container, so it is read where it goes.
const reviewDeps = vi.hoisted(() => ({ last: undefined as ReviewModulePorts | undefined }));
// U48: what the evidence module was built with, and the writer the adapter stand-in hands out.
const evidenceDeps = vi.hoisted(() => ({ last: undefined as EvidenceModuleDeps | undefined }));
const evidenceWriter = vi.hoisted(() => ({ putQuarantined: vi.fn(), delete: vi.fn() }));
const createFsEvidenceWriter = vi.hoisted(() => vi.fn(() => evidenceWriter));

vi.mock('@rogikotha/application', async (importOriginal) => {
  const actual = await importOriginal<typeof Application>();
  return {
    ...actual,
    createReviewModule: vi.fn((deps: ReviewModulePorts) => {
      reviewDeps.last = deps;
      return actual.createReviewModule(deps);
    }),
    createEvidenceModule: vi.fn((deps: EvidenceModuleDeps) => {
      evidenceDeps.last = deps;
      return actual.createEvidenceModule(deps);
    }),
  };
});

function reviewOwnership(): IdentityOwnership {
  getContainer();
  if (!reviewDeps.last) throw new Error('the review module was not built');
  return reviewDeps.last.ownership;
}

vi.mock('@rogikotha/adapters', () => ({
  createArgon2PasswordHasher: vi.fn(() => ({
    hash: vi.fn(() => Promise.resolve('$argon2id$synthetic')),
    verify: vi.fn(() => Promise.resolve(false)),
  })),
  createCrypto,
  createMemoryRateLimiter: vi.fn(() => ({})),
  // U48: the writer only; the stand-in has no reader to hand out (BR3.6).
  createFsEvidenceWriter,
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
    // U47's block.
    PgReviewModuleRepository: Stub,
    createInterimPublicEvidenceCount: vi.fn(() => ({})),
    // U48's block.
    PgEvidenceRepository: Stub,
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
    storageRoot: '/synthetic/evidence-root',
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

  it('offers the review module with its four seams (U47, C9)', () => {
    const { review } = getContainer();

    expect(review.publish.name).toBe('review.publish');
    expect(review.saveDraft.kind).toBe('command');
    const seams = [
      'reviewIdForPublicId',
      'isReviewAuthor',
      'isReviewPublished',
      'authorIdentityModeOf',
    ] as const satisfies readonly (keyof ReviewSeams)[];
    expect(seams.map((seam) => typeof review[seam])).toEqual(seams.map(() => 'function'));
  });

  it('gives the evidence module the quarantine writer on the storage root and no reader (U48, BR3.6)', () => {
    const { evidence } = getContainer();

    expect(createFsEvidenceWriter).toHaveBeenCalledWith('/synthetic/evidence-root');
    expect(evidence.files).toBe(evidenceWriter);
    expect(evidenceDeps.last?.files).toBe(evidenceWriter);
    expect('readQuarantined' in evidence.files).toBe(false);
    expect(Object.keys(evidenceDeps.last ?? {})).not.toContain('scanner');
    expect(evidence.intake.name).toBe('evidence.intake');
    expectTypeOf<keyof EvidenceModuleDeps['files']>().toEqualTypeOf<'putQuarantined' | 'delete'>();
  });

  it("binds the public evidence count to the evidence module's own (U48, C17)", () => {
    const container = getContainer();

    expect(container.publicEvidence).toBe(container.evidence.publicEvidenceCount);
    expect(createInterimPublicEvidenceCount).not.toHaveBeenCalled();
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
    await expect(
      reviewOwnership().ownsPersona({} as never, { accountId: 'a', personaId: 'p' }),
    ).resolves.toBe(true);
    expect(privatePort.owns).toHaveBeenCalledWith({}, 'a', 'p');
  });

  it('offers pages and actions only the rename and the public reads (BR3.6, U11 review)', () => {
    const { identity } = getContainer();

    expect(Object.keys(identity).sort()).toEqual([
      'publicPersonaIdsByUsername',
      'publicProjection',
      'publicProjections',
      'renameNamedCommand',
    ]);
    expectTypeOf<keyof WebIdentity>().toEqualTypeOf<
      'renameNamedCommand' | 'publicProjection' | 'publicProjections' | 'publicPersonaIdsByUsername'
    >();
    // @ts-expect-error BR3.5: the ownership check is not on the container.
    expect(identity.ownership).toBeUndefined();
    // @ts-expect-error BR3.6: nor is the persona choice, which takes an account id.
    expect(identity.personaFor).toBeUndefined();
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
    // U47: the review module takes the ownership check (BR3.5), never the private repository.
    expectTypeOf<FieldsAccepting<ReviewModulePorts, PrivateIdentityRepository>>().toBeNever();
  });

  it('lets no other module ports type take the ownership check (BR3.5)', () => {
    const ownership = reviewOwnership();

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
