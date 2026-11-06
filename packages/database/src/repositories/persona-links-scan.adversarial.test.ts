// U11 Step 17, high-risk adversarial test (functional-spec § 8.2, BR3.1), written by an agent that
// did not build the allowlist. It re-scans the repository for `persona_links` with the ways around
// `persona-links-allowlist.test.ts` closed: upper-case raw SQL, a namespace import
// (`schema.personaLinks`), Drizzle's relational API (`db.query.personaLinks`, the client is built
// with the whole schema), `.js`/`.mjs`/`.cjs`/`.sql` files, `scripts/` and `infra/`, and a
// comment stripper that a `/*` inside a string literal (a glob such as `'apps/*/src'`) cannot fool.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

/** The BR3.1 allowlist of `persona-links-allowlist.test.ts`, repeated so a drift there shows here. */
const ALLOWED = [
  'packages/database/src/schema/identity.ts',
  'packages/database/src/repositories/identity-private.ts',
  'packages/test-support/src/seed/seed-accounts.ts',
  'packages/test-support/src/seed/seed-content.ts',
  'packages/test-support/src/seed/seed-evidence.ts',
  'packages/test-support/src/seed/seed-moderation.ts',
  'packages/database/src/demo/accounts.ts',
  'packages/database/src/demo/accounts-create.ts',
  'packages/database/src/demo/reviews.ts',
  'packages/database/src/demo/session.ts',
  'packages/database/src/demo/comments.ts',
];

/** Migrations own the grants and constraints of the table (BR3.1). */
const MIGRATIONS = 'packages/database/src/migrations/';
const SCANNED_ROOTS = ['packages', 'apps', 'scripts', 'infra'];
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  'coverage',
  '.git',
]);
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const SOURCE_FILE = /\.([cm]?[jt]sx?|sql)$/;
const TOUCHES = /persona_links|\bpersonaLinks\b/i;

/** Drops comments but keeps every string and template literal, where raw SQL lives. */
function codeOf(source: string, sqlFile: boolean): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const char = source[i]!;
    const next = source[i + 1];
    if (quote !== null) {
      out += char;
      if (char === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i += 1;
      continue;
    }
    if (char === "'" || char === '"' || (!sqlFile && char === '`')) {
      quote = char;
      out += char;
      i += 1;
      continue;
    }
    const lineComment = sqlFile ? char === '-' && next === '-' : char === '/' && next === '/';
    if (lineComment) {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    out += char;
    i += 1;
  }
  return out;
}

function touchesPersonaLinks(source: string, sqlFile = false): boolean {
  return TOUCHES.test(codeOf(source, sqlFile));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourceFiles(full);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [full] : [];
  });
}

describe('U11 adversarial: persona_links reached around the allowlist (§ 8.2, BR3.1)', () => {
  it('flags the forms the allowlist scan misses, and still ignores comments', () => {
    expect(
      touchesPersonaLinks("import * as schema from '../schema';\ndb.from(schema.personaLinks);"),
    ).toBe(true);
    expect(touchesPersonaLinks('await db.query.personaLinks.findMany();')).toBe(true);
    expect(
      touchesPersonaLinks('await db.execute(sql`SELECT account_id FROM PERSONA_LINKS`);'),
    ).toBe(true);
    expect(
      touchesPersonaLinks(
        "const glob = 'apps/*/src';\nawait db.execute(sql`select account_id from persona_links`);\n/** doc */",
      ),
    ).toBe(true);
    expect(touchesPersonaLinks('select account_id from persona_links;', true)).toBe(true);
    expect(touchesPersonaLinks('-- revokes persona_links\nselect 1;', true)).toBe(false);
    expect(touchesPersonaLinks('// the link lives in `persona_links`\nconst x = 1;')).toBe(false);
    expect(touchesPersonaLinks('/* reads persona_links */ const y = 2;')).toBe(false);
    expect(touchesPersonaLinks("const url = 'https://example.test/persona';")).toBe(false);
  });

  it('finds no non-test file outside the allowlist and the migrations that reaches persona_links', () => {
    const touching = SCANNED_ROOTS.flatMap((top) => sourceFiles(path.join(ROOT, top)))
      .map((file) => ({ file, rel: path.relative(ROOT, file).split(path.sep).join('/') }))
      .filter(({ rel }) => !rel.startsWith(MIGRATIONS))
      .filter(({ file, rel }) =>
        touchesPersonaLinks(readFileSync(file, 'utf8'), rel.endsWith('.sql')),
      )
      .map(({ rel }) => rel)
      .sort();

    expect(touching.filter((rel) => !ALLOWED.includes(rel))).toEqual([]);
  });
});
