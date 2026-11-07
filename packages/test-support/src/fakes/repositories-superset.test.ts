// CR-008 / ISS-177: two of the thirteen repository fakes were short ten
// methods their `packages/database/src/repositories/*.ts` (T-004/T-005)
// stub declares, and nothing caught it — the fakes carry no `implements
// <Port>` clause (application's port interfaces do not exist yet). This
// test reads the method names straight out of each stub's source text
// (never imports `@rogikotha/database` — `01-conventions.md` §2 forbids
// `test-support` depending on `database`) and asserts every fake is at
// least a superset, so the next stub method cannot silently diverge again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  FakeAccountRepository,
  FakeAuditRepository,
  FakeConfigRepository,
  FakeDataRequestRepository,
  FakeDirectoryRepository,
  FakeEvidenceRepository,
  FakeIdentityRepository,
  FakePrivateIdentityRepository,
  FakeModerationRepository,
  FakeNotificationRepository,
  FakeRetentionRepository,
  FakeReviewRepository,
  FakeTaxonomyRepository,
} from './repositories.js';
import { FakeCommunityModuleRepository } from './community-repository.js';
import { FakeEmailDeliveryRepository } from './email-delivery-repository.js';
import { InMemoryEvidenceRepository } from './evidence-repository.js';

// U48: `evidence.ts` holds the release-1 methods `InMemoryEvidenceRepository` fakes and the
// release-2 stubs `FakeEvidenceRepository` still fakes; together they must cover the file.
class EvidenceFakes {}
for (const Fake of [FakeEvidenceRepository, InMemoryEvidenceRepository]) {
  for (const name of Object.getOwnPropertyNames(Fake.prototype)) {
    if (name === 'constructor' || Object.hasOwn(EvidenceFakes.prototype, name)) continue;
    Object.defineProperty(
      EvidenceFakes.prototype,
      name,
      Object.getOwnPropertyDescriptor(Fake.prototype, name)!,
    );
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoriesDir = path.resolve(here, '../../../database/src/repositories');

/**
 * Extracts the declared method names of the one `export class Pg...` in a
 * repository stub file, by reading its source text. Every stub in this
 * codebase uses the same one-line shape — `  methodName(args): Promise<T> {`
 * at 2-space class-body indentation (confirmed across all 13 files this
 * test reads) — so a small regex is enough; no TS parser dependency needed.
 */
function stubMethodNames(filePath: string): string[] {
  const source = fs.readFileSync(filePath, 'utf8');
  // ISS-223: an `async` prefix is part of the shape too (`outbox.ts`, the T-101 repositories).
  const methodPattern = /^ {2}(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^]*?\)\s*:\s*Promise</gm;
  const names = new Set<string>();
  for (const match of source.matchAll(methodPattern)) names.add(match[1]!);
  return [...names];
}

function fakeMethodNames(FakeClass: new () => unknown): string[] {
  return Object.getOwnPropertyNames((FakeClass as { prototype: object }).prototype).filter(
    (name) => name !== 'constructor',
  );
}

const REPOSITORY_PAIRS: { file: string; FakeClass: new () => unknown }[] = [
  { file: 'account.ts', FakeClass: FakeAccountRepository },
  { file: 'audit.ts', FakeClass: FakeAuditRepository },
  // U49: the release-1 repository is mirrored by its own fake; the old one keeps the T-004 names.
  { file: 'community.ts', FakeClass: FakeCommunityModuleRepository },
  { file: 'config.ts', FakeClass: FakeConfigRepository },
  { file: 'data-requests.ts', FakeClass: FakeDataRequestRepository },
  { file: 'directory.ts', FakeClass: FakeDirectoryRepository },
  { file: 'evidence.ts', FakeClass: EvidenceFakes },
  { file: 'identity.ts', FakeClass: FakeIdentityRepository },
  { file: 'moderation.ts', FakeClass: FakeModerationRepository },
  { file: 'notification.ts', FakeClass: FakeNotificationRepository },
  { file: 'retention.ts', FakeClass: FakeRetentionRepository },
  { file: 'review.ts', FakeClass: FakeReviewRepository },
  { file: 'taxonomy.ts', FakeClass: FakeTaxonomyRepository },
  // T-101: the email-delivery methods have their own class (the port's `insert` would clash).
  {
    file: 'email-delivery.ts',
    FakeClass: FakeEmailDeliveryRepository as unknown as new () => unknown,
  },
  // U11: the private identity repository, the only reader of `persona_links` (BR3.1).
  { file: 'identity-private.ts', FakeClass: FakePrivateIdentityRepository },
];

describe('every repository fake is a method-name superset of its Pg*Repository stub', () => {
  it.each(REPOSITORY_PAIRS)(
    '$FakeClass.name covers every method declared in $file',
    ({ file, FakeClass }) => {
      const stubMethods = stubMethodNames(path.join(repositoriesDir, file));
      // Guards the guard: if the regex ever stops matching (e.g. a stub file's
      // shape changes), fail loudly instead of vacuously passing on an empty list.
      expect(stubMethods.length).toBeGreaterThan(0);

      const fakeMethods = new Set(fakeMethodNames(FakeClass));
      const missing = stubMethods.filter((name) => !fakeMethods.has(name));
      expect(missing).toEqual([]);
    },
  );

  it('covers all 15 repository fakes', () => {
    expect(REPOSITORY_PAIRS).toHaveLength(15);
  });

  it('pairs every repository file, so a new one cannot go unchecked (ISS-223)', () => {
    // `outbox.ts` has its own fake shape (ListOutbox) and `not-implemented.ts` holds no repository.
    const unpairedByDesign = new Set(['not-implemented.ts', 'outbox.ts']);
    // U46's repositories are paired with their fakes in `directory-repositories.test.ts` (BR8.4).
    for (const file of [
      'directory-module.ts',
      'taxonomy-module.ts',
      'review-reads.ts',
      'public-evidence-count-interim.ts',
      // U47: paired with `FakeReviewModuleRepository` in the same file.
      'review-module.ts',
    ])
      unpairedByDesign.add(file);
    // Test helpers (`*-test-support.ts`) sit beside the repositories but are not repositories.
    const repositoryFiles = fs
      .readdirSync(repositoriesDir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
      .filter((file) => !file.endsWith('-test-support.ts'))
      .filter((file) => !unpairedByDesign.has(file));

    const paired = new Set(REPOSITORY_PAIRS.map((pair) => pair.file));

    expect(repositoryFiles.filter((file) => !paired.has(file))).toEqual([]);
  });

  it('extracts async methods as well as plain ones', () => {
    const methods = stubMethodNames(path.join(repositoriesDir, 'outbox.ts'));

    expect(methods.length).toBeGreaterThan(0);
  });
});
