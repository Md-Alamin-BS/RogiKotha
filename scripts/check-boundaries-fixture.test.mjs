import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

import { checkBoundariesFixture, compareWithManifest } from './check-boundaries-fixture.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (file) => `lint-fixtures/boundary-violation/${file}`;

const aCase = (overrides) => ({
  id: 'FX1',
  kind: 'violation',
  file: 'packages/domain/src/domain-bad.ts',
  rule: 'boundaries/dependencies',
  ...overrides,
});
const aProblem = (overrides) => ({
  file: 'packages/domain/src/domain-bad.ts',
  rule: 'boundaries/dependencies',
  line: 2,
  message: 'refused',
  ...overrides,
});

describe('the boundary fixture proof', () => {
  it('finds every planted violation once and nothing in the controls', async () => {
    const { ok, expected, failures } = await checkBoundariesFixture();

    expect(failures).toEqual([]);
    expect(ok).toBe(true);
    expect(expected).toBe(15);
  });

  it('fails when the element rule is switched off', async () => {
    const { ok, failures } = await checkBoundariesFixture({
      overrideConfig: { rules: { 'boundaries/dependencies': 'off' } },
    });

    expect(ok).toBe(false);
    expect(failures).toContainEqual(expect.stringMatching(/^missing: FX1 /));
  });

  it('fails when a control case reports a problem', () => {
    const cases = [aCase({}), aCase({ id: 'FX12', kind: 'control', file: 'seed-ok.ts' })];
    const problems = [aProblem({}), aProblem({ file: 'seed-ok.ts' })];

    const { ok, failures } = compareWithManifest(cases, problems);

    expect(ok).toBe(false);
    expect(failures).toEqual([expect.stringMatching(/^control FX12 reported: seed-ok.ts/)]);
  });

  it('fails when a violation is reported under another rule', () => {
    const { ok, failures } = compareWithManifest([aCase({})], [aProblem({ rule: 'other/rule' })]);

    expect(ok).toBe(false);
    expect(failures).toHaveLength(2);
  });
});

describe('the boundary rules on imports the fixture does not plant', () => {
  const eslint = new ESLint({ cwd: repoRoot, ignore: false });
  const rulesFor = async (file, code) => {
    const [result] = await eslint.lintText(code, { filePath: fixture(file) });
    return result.messages.map((message) => message.ruleId);
  };

  it('allow a dynamic import of a Node built-in in a component test', async () => {
    const code = "export const m = import('node:fs');";

    expect(await rulesFor('apps/web/src/components/Late.test.tsx', code)).toEqual([]);
  });

  it('allow a Node built-in in a shared-helper test but not in shared-helper source', async () => {
    const code = "import { readFileSync } from 'node:fs';\nexport const read = readFileSync;";

    expect(await rulesFor('apps/web/src/i18n/late.test.ts', code)).toEqual([]);
    expect(await rulesFor('apps/web/src/i18n/late.ts', code)).toEqual([
      '@typescript-eslint/no-restricted-imports',
    ]);
  });

  it('refuse an external package outside the contracts allowlist', async () => {
    const code = "import lodash from 'lodash';\nexport const used = lodash;";

    expect(await rulesFor('packages/contracts/src/late.ts', code)).toEqual([
      'boundaries/dependencies',
    ]);
  });

  it('refuse a workspace import that resolves to no source file', async () => {
    const code = "import type { X } from '@rogikotha/application/worker';\nexport type Y = X;";

    expect(await rulesFor('apps/worker/src/late.ts', code)).toEqual(['boundaries/dependencies']);
  });

  it('refuse a source file that belongs to no element', async () => {
    expect(await rulesFor('packages/unknown/src/late.ts', 'export const y = 1;')).toEqual([
      'boundaries/no-unknown-files',
    ]);
  });
});
