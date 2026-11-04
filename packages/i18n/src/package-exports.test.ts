import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
  exports: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
};

describe('@rogikotha/i18n package surface (FD-098)', () => {
  it('exports the message files, so the worker can read email copy without next-intl', () => {
    const target = manifest.exports['./messages/*.json'];

    expect(target).toBe('./messages/*.json');
    for (const locale of ['en', 'bn']) {
      const file = path.join(packageDir, (target ?? '').replace('*', locale));
      expect(fs.existsSync(file), file).toBe(true);
    }
  });

  it('makes next-intl an optional peer, because the message files need none', () => {
    expect(manifest.peerDependenciesMeta?.['next-intl']?.optional).toBe(true);
  });
});
