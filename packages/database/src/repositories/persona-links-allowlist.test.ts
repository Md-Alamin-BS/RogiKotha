// U11 BR3.1 (R-02, R-03): only the files below may touch `persona_links`, by importing the
// `personaLinks` table symbol or by naming the table in code (raw SQL, `sql` templates). The list
// only shrinks: when a Unit removes the last use from a file, that file leaves the list here too.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** Repo-relative path, with the Unit that removes it for each demo-slice file. */
const ALLOWED: Record<string, string> = {
  'packages/database/src/schema/identity.ts': 'the table definition',
  'packages/database/src/repositories/identity-private.ts': 'the private identity repository',
  'packages/test-support/src/seed/seed-accounts.ts': 'FD-040 seed',
  'packages/test-support/src/seed/seed-content.ts': 'FD-040 seed',
  'packages/test-support/src/seed/seed-evidence.ts': 'FD-040 seed',
  'packages/test-support/src/seed/seed-moderation.ts': 'FD-040 seed',
  'packages/database/src/demo/accounts.ts': 'demo slice, removed by U47',
  'packages/database/src/demo/accounts-create.ts': 'demo slice, removed by U47',
  'packages/database/src/demo/reviews.ts': 'demo slice, removed by U47',
  'packages/database/src/demo/session.ts': 'demo slice, removed by U47',
  'packages/database/src/demo/comments.ts': 'demo slice, removed by U49',
};

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist', '.next', '.turbo', 'coverage']);
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const SOURCE_FILE = /\.tsx?$/;
// Migrations are `.sql`, so the scan never reaches them; they stay allowed by BR3.1.
const IMPORTS_PERSONA_LINKS = /import\s+(?:type\s+)?\{[^}]*\bpersonaLinks\b[^}]*\}\s*from/;
const NAMES_TABLE = /\bpersona_links\b/;

/** Block comments and `//` comments that follow whitespace or start a line (not `https://`). */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function touchesPersonaLinks(source: string): boolean {
  const code = withoutComments(source);
  return IMPORTS_PERSONA_LINKS.test(code) || NAMES_TABLE.test(code);
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(full);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [full] : [];
  });
}

describe('persona_links allowlist (BR3.1)', () => {
  it('only the allowlisted non-test sources import personaLinks or name persona_links in code', () => {
    const touching = ['packages', 'apps']
      .flatMap((top) => sourceFiles(path.join(ROOT, top)))
      .filter((file) => touchesPersonaLinks(readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file).split(path.sep).join('/'))
      .sort();

    expect(touching).toEqual(Object.keys(ALLOWED).sort());
  });

  it('flags the import and a raw-SQL use, and ignores a mention in a comment (R-03)', () => {
    expect(
      touchesPersonaLinks("import { personas, personaLinks } from '../schema/identity';"),
    ).toBe(true);
    expect(
      touchesPersonaLinks('await db.execute(sql`select account_id from persona_links`);'),
    ).toBe(true);
    expect(touchesPersonaLinks("const table = 'persona_links';")).toBe(true);
    expect(touchesPersonaLinks('// the link lives in `persona_links`\nconst x = 1;')).toBe(false);
    expect(touchesPersonaLinks('/* reads `persona_links` */ const y = 2;')).toBe(false);
    expect(touchesPersonaLinks("const url = 'https://example.test/persona';")).toBe(false);
  });
});
