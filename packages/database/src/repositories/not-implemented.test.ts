// Until its owning task lands, a repository method must fail loudly and name that task, never
// resolve with nothing (the stub contract of not-implemented.ts).
import { describe, expect, it } from 'vitest';

import {
  NotImplemented,
  PgAccountRepository,
  PgAuditRepository,
  PgCommunityRepository,
  PgConfigRepository,
  PgDataRequestRepository,
  PgDirectoryRepository,
  PgEvidenceRepository,
  PgIdentityRepository,
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
  ['PgCommunityRepository', new PgCommunityRepository()],
  ['PgConfigRepository', new PgConfigRepository()],
  ['PgDataRequestRepository', new PgDataRequestRepository()],
  ['PgDirectoryRepository', new PgDirectoryRepository()],
  ['PgEvidenceRepository', new PgEvidenceRepository()],
  ['PgIdentityRepository', new PgIdentityRepository()],
  ['PgModerationRepository', new PgModerationRepository()],
  ['PgNotificationRepository', new PgNotificationRepository()],
  ['PgRetentionRepository', new PgRetentionRepository()],
  ['PgReviewRepository', new PgReviewRepository()],
  ['PgSearchIndex', new PgSearchIndex()],
  ['PgTaxonomyRepository', new PgTaxonomyRepository()],
];

function methodNamesOf(repository: object): string[] {
  return Object.getOwnPropertyNames(Object.getPrototypeOf(repository)).filter(
    (name) => name !== 'constructor',
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
    'every method of %s throws NotImplemented naming the task that owns it',
    (_name, repository) => {
      const methods = methodNamesOf(repository);
      expect(methods.length).toBeGreaterThan(0);

      for (const method of methods) {
        const error = thrownBy(() => callMethod(repository, method, ['arg-1', 'arg-2', 'arg-3']));
        expect(error, method).toBeInstanceOf(NotImplemented);
        expect((error as Error).message, method).toMatch(/^not implemented — owned by T-\d{3}\b/);
      }
    },
  );

  it('a stub records the arguments it was called with, so the failing call can be traced', () => {
    const error = thrownBy(() => new PgReviewRepository().getDraft('draft-42'));

    expect(error).toBeInstanceOf(NotImplemented);
    expect((error as Error).message).toBe(
      'not implemented — owned by T-301 {"draftId":"draft-42"}',
    );
  });
});

describe('NotImplemented', () => {
  it('without context names only the owning task and is an Error called NotImplemented', () => {
    const error = new NotImplemented('T-105');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('NotImplemented');
    expect(error.message).toBe('not implemented — owned by T-105');
  });

  it('with context appends the context as JSON', () => {
    expect(new NotImplemented('T-404', { stream: 'case:1', limit: 10 }).message).toBe(
      'not implemented — owned by T-404 {"stream":"case:1","limit":10}',
    );
  });
});
