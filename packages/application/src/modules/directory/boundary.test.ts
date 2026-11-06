import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// FD-067, BR6.1: Directory and Taxonomy learn review figures only through their declared ports.
// The boundary lint does not check edges inside `application`, so this scan does.
const modulesRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    const isTestFile = /\.test\.ts$|-test-support\.ts$/.test(entry.name);
    return entry.name.endsWith('.ts') && !isTestFile ? [full] : [];
  });
}

const IMPORT_RE = /from\s+'([^']+)'/g;
const REVIEW_IMPORT =
  /(^|\/)review(\/|'|$)|ports\/repositories\/review|ports\/repositories(\/index)?$/;

describe.each(['directory', 'taxonomy'])('the %s module', (name) => {
  it('imports neither the review module nor the review repository port', () => {
    const offending = sourceFiles(path.join(modulesRoot, name)).flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return [...text.matchAll(IMPORT_RE)]
        .map((m) => m[1] ?? '')
        .filter((spec) => REVIEW_IMPORT.test(spec))
        .map((spec) => `${path.basename(file)} -> ${spec}`);
    });
    expect(offending).toEqual([]);
  });

  it('names no review repository type in its source', () => {
    const text = sourceFiles(path.join(modulesRoot, name))
      .map((file) => fs.readFileSync(file, 'utf8'))
      .join('\n');
    expect(text).not.toMatch(/ReviewReadRepository|ReviewCardRecord|createReviewReadModule/);
  });
});
