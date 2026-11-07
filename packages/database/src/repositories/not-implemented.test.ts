// Until its owning task lands, a repository method must fail loudly and name that task, never
// resolve with nothing (the stub contract of not-implemented.ts).
import { describe, expect, it } from 'vitest';

import {
  NotImplemented,
  PgAccountRepository,
  PgAuditRepository,
  PgConfigRepository,
  PgDataRequestRepository,
  PgDirectoryRepository,
  PgEvidenceRepository,
  PgModerationRepository,
  PgNotificationRepository,
  PgRetentionRepository,
  PgReviewRepository,
  PgSearchIndex,
  PgTaxonomyRepository,
} from '../index';

const STUB_REPOSITORIES: [string, object][] = [
  ['PgAccountRepository', new PgAccountRepository()],
  ['PgAuditRepository', new PgAuditRepository()],
  ['PgConfigRepository', new PgConfigRepository()],
  ['PgDataRequestRepository', new PgDataRequestRepository()],
  ['PgDirectoryRepository', new PgDirectoryRepository()],
  ['PgEvidenceRepository', new PgEvidenceRepository()],
  ['PgModerationRepository', new PgModerationRepository()],
  ['PgNotificationRepository', new PgNotificationRepository()],
  ['PgRetentionRepository', new PgRetentionRepository()],
  ['PgReviewRepository', new PgReviewRepository()],
  ['PgSearchIndex', new PgSearchIndex()],
  ['PgTaxonomyRepository', new PgTaxonomyRepository()],
];

// T-101 implements the AccountRepository port on PgAccountRepository (F32); its other methods stay
// stubs. Proven against the database by account.int.test.ts.
const IMPLEMENTED: Record<string, readonly string[]> = {
  PgAccountRepository: [
    'findProfileByAuthUserId',
    'findProfileById',
    'findByEmail',
    'findCredentialByEmail',
    'findCredentialByAccountId',
    'findOwnEmail',
    'findResetTokenAccount',
    'usernameTaken',
    'createProfile',
    'insertDefaultPersonas',
    'updateStatus',
    'insertPreferences',
    'findPreferences',
    'savePreferences',
    'insertFeedback',
  ],
};

function stubMethodNamesOf(name: string, repository: object): string[] {
  const implemented = new Set(IMPLEMENTED[name] ?? []);
  return Object.getOwnPropertyNames(Object.getPrototypeOf(repository)).filter(
    (method) => method !== 'constructor' && !implemented.has(method),
  );
}

function callMethod(repository: object, name: string, args: unknown[]): unknown {
  const method: unknown = Reflect.get(repository, name);
  if (typeof method !== 'function') {
    throw new TypeError(`${name} is not a method`);
  }
  return Reflect.apply(method, repository, args);
}

function thrownBy(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('repository stubs', () => {
  it.each(STUB_REPOSITORIES)(
    'every stub method of %s throws NotImplemented naming the task that owns it',
    (name, repository) => {
      const methods = stubMethodNamesOf(name, repository);
      expect(methods.length).toBeGreaterThan(0);

      for (const method of methods) {
        const error = thrownBy(() => callMethod(repository, method, ['arg-1', 'arg-2', 'arg-3']));
        expect(error, method).toBeInstanceOf(NotImplemented);
        expect((error as Error).message, method).toMatch(/^not implemented — owned by T-\d{3}\b/);
      }
    },
  );

  it('every method the account port lists is implemented, not a stub', () => {
    const repository = new PgAccountRepository();
    for (const method of IMPLEMENTED.PgAccountRepository ?? []) {
      expect(typeof Reflect.get(repository, method), method).toBe('function');
    }
  });

  it('a stub names the parameters it was called with but never their values (ISS-111 item 1)', () => {
    const error = thrownBy(() =>
      new PgAccountRepository().addBookmark('shirin.demo@example.test', 'the doctor was rude'),
    );

    expect(error).toBeInstanceOf(NotImplemented);
    expect((error as Error).message).toBe('not implemented — owned by T-409 (accountId, reviewId)');
  });
});

describe('NotImplemented', () => {
  it('without context names only the owning task and is an Error called NotImplemented', () => {
    const error = new NotImplemented('T-105');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotImplemented');
    expect(error.message).toBe('not implemented — owned by T-105');
  });

  it('with context lists the context keys and leaves the values out', () => {
    const error = new NotImplemented('T-404', { stream: 'case:1', body: 'free text from a user' });

    expect(error.message).toBe('not implemented — owned by T-404 (stream, body)');
    expect(error.message).not.toContain('free text');
  });

  it('with an empty context names only the owning task', () => {
    expect(new NotImplemented('T-404', {}).message).toBe('not implemented — owned by T-404');
  });
});
