// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE_FILE = /\.(ts|tsx|js|jsx|mjs)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$|[\\/]__tests__[\\/]/;

const FORBIDDEN: readonly [string, RegExp][] = [
  ['an inline <script', /<script/i],
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['a javascript: URL', /javascript:/i],
  ['a string event handler', /\bon[A-Za-z]+=\s*["'`]/],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return SOURCE_FILE.test(entry.name) && !TEST_FILE.test(full) ? [full] : [];
  });
}

describe('the script sweep over apps/web/src (BR1.5)', () => {
  const files = sourceFiles(SRC);

  it('reads the source tree', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((file) => file.endsWith(path.join('lib', 'security', 'csp.ts')))).toBe(true);
  });

  it.each(FORBIDDEN)('finds no %s in a non-test file', (_label, pattern) => {
    const hits = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));

    expect(hits.map((file) => path.relative(SRC, file))).toEqual([]);
  });

  it('allows next/script only in a file that also calls readNonce', () => {
    const hits = files.filter((file) => {
      const text = readFileSync(file, 'utf8');
      return /['"]next\/script['"]/.test(text) && !/\breadNonce\(/.test(text);
    });

    expect(hits.map((file) => path.relative(SRC, file))).toEqual([]);
  });
});
