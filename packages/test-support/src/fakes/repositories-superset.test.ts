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
  FakeCommunityRepository,
  FakeConfigRepository,
  FakeDataRequestRepository,
  FakeDirectoryRepository,
  FakeEvidenceRepository,
  FakeIdentityRepository,
  FakeModerationRepository,
  FakeNotificationRepository,
  FakeRetentionRepository,
  FakeReviewRepository,
  FakeTaxonomyRepository,
} from './repositories.js';

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
  const methodPattern = /^ {2}([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^]*?\)\s*:\s*Promise</gm;
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
  { file: 'community.ts', FakeClass: FakeCommunityRepository },
  { file: 'config.ts', FakeClass: FakeConfigRepository },
  { file: 'data-requests.ts', FakeClass: FakeDataRequestRepository },
  { file: 'directory.ts', FakeClass: FakeDirectoryRepository },
  { file: 'evidence.ts', FakeClass: FakeEvidenceRepository },
  { file: 'identity.ts', FakeClass: FakeIdentityRepository },
  { file: 'moderation.ts', FakeClass: FakeModerationRepository },
  { file: 'notification.ts', FakeClass: FakeNotificationRepository },
  { file: 'retention.ts', FakeClass: FakeRetentionRepository },
  { file: 'review.ts', FakeClass: FakeReviewRepository },
  { file: 'taxonomy.ts', FakeClass: FakeTaxonomyRepository },
];

describe('every repository fake is a method-name superset of its Pg*Repository stub', () => {
  it.each(REPOSITORY_PAIRS)('$FakeClass.name covers every method declared in $file', ({ file, FakeClass }) => {
    const stubMethods = stubMethodNames(path.join(repositoriesDir, file));
    // Guards the guard: if the regex ever stops matching (e.g. a stub file's
    // shape changes), fail loudly instead of vacuously passing on an empty list.
    expect(stubMethods.length).toBeGreaterThan(0);

    const fakeMethods = new Set(fakeMethodNames(FakeClass));
    const missing = stubMethods.filter((name) => !fakeMethods.has(name));
    expect(missing).toEqual([]);
  });

  it('covers all 13 repository fakes', () => {
    expect(REPOSITORY_PAIRS).toHaveLength(13);
  });
});
