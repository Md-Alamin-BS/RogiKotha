// BR8.6, FD-093 (2): `@rogikotha/application/worker` must not carry account, identity or deletion
// command code into the worker, also not through a re-export. Node's typings come into this
// program through the test-support fakes the other tests import.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));
const FORBIDDEN = [
  /[/\\]modules[/\\]account[/\\]/,
  /[/\\]modules[/\\]identity[/\\]/,
  /[/\\]modules[/\\]data-requests[/\\]commands[/\\]/,
];
const SPECIFIER_RE = /(?:import|export)\s[^'"]*?from\s+'(\.[^']+)'/g;

function resolveLocal(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  for (const candidate of [`${base}.ts`, resolve(base, 'index.ts')]) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // Try the next form.
    }
  }
  throw new Error(`cannot resolve ${specifier} from ${from}`);
}

function importGraph(entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(SPECIFIER_RE)) {
      queue.push(resolveLocal(file, match[1] ?? ''));
    }
  }
  return seen;
}

describe('the worker subpath', () => {
  it('reaches no account, identity or deletion command file', () => {
    const files = [...importGraph(resolve(SRC, 'worker.ts'))];

    expect(files.length).toBeGreaterThan(1);
    expect(files.filter((file) => FORBIDDEN.some((pattern) => pattern.test(file)))).toEqual([]);
  });

  it('would notice an account file, because the root entry does reach one', () => {
    const files = [...importGraph(resolve(SRC, 'index.ts'))];

    expect(files.some((file) => FORBIDDEN[0]?.test(file))).toBe(true);
  });
});
