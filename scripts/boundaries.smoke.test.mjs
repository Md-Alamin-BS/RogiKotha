import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('boundary rules (T-010 smoke)', () => {
  it('refuse an import from domain to application', async () => {
    const eslint = new ESLint({ cwd: repoRoot, ignore: false });
    const [result] = await eslint.lintFiles([
      'lint-fixtures/boundary-violation/packages/domain/src/domain-bad.ts',
    ]);

    expect(result.messages).toEqual([
      expect.objectContaining({
        ruleId: 'boundaries/dependencies',
        severity: 2,
        message: expect.stringContaining('"domain" to elements of type "application"'),
      }),
    ]);
  });
});
