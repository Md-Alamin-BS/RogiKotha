import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Added by the T-207a VALIDATOR (docs/validation/T-207a.md), not by the
// implementer. T-207 step 3 asks for a test that "greps the rendered
// Discover, doctor, experience and composer pages for the key and finds
// nothing". Those pages are Half B / later tasks, so the implementer's
// fd-022-lawful-placement.test.tsx can only render the four components that
// exist today — it will stay silently narrow as the other pages arrive.
//
// This is the source-level half of the same rule: the FD-022 lawful-access
// keys may be referenced from exactly one file in apps/web (Policy.tsx, plus
// the two FD-022 tests themselves). Any future page, component or route that
// starts rendering `policy.privacy.lawful` / `lawfulBody` fails here on the
// day it is written, without that task having to remember FD-022.

const WEB_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const LAWFUL_KEYS = ['policy.privacy.lawfulBody', 'policy.privacy.lawful'];

const ALLOWED = new Set([
  'components/patient/Policy.tsx',
  'components/patient/Policy.test.tsx',
  'components/patient/fd-022-lawful-placement.test.tsx',
  'components/patient/fd-022-lawful-key-usage.test.ts',
]);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('FD-022 lawful-access key usage across apps/web', () => {
  it('references the lawful-access keys only from Policy.tsx and the FD-022 tests', () => {
    const offenders = sourceFiles(WEB_SRC)
      .filter((file) => {
        const body = fs.readFileSync(file, 'utf8');
        return LAWFUL_KEYS.some((key) => body.includes(key));
      })
      .map((file) => path.relative(WEB_SRC, file).split(path.sep).join('/'))
      .filter((rel) => !ALLOWED.has(rel));

    expect(offenders).toEqual([]);
  });

  it('finds the keys where they are expected, so the check above cannot pass vacuously', () => {
    const policy = fs.readFileSync(path.join(WEB_SRC, 'components/patient/Policy.tsx'), 'utf8');
    expect(policy).toContain('policy.privacy.lawfulBody');
  });
});
