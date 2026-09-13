// Task step 5: "a test that greps `apps/worker/src` for
// `better-auth|identity.reveal|dataRequest.delete` and expects no match" —
// T-010 turns this into a lint rule (`eslint-plugin-boundaries`); until
// then this is the only thing enforcing AD-6's "worker has no application
// session, identity-reveal, public-delete, or general database
// credentials" for this package. Test files are excluded from the scan (this
// file's own text would otherwise match its own pattern).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const FORBIDDEN = /better-auth|identity\.reveal|dataRequest\.delete/;

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...listSourceFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('worker source never imports auth, identity reveal or deletion commands', () => {
  it('contains no match for better-auth, identity.reveal or dataRequest.delete', () => {
    const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
    const offenders = listSourceFiles(srcDir).filter((file) => FORBIDDEN.test(readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
