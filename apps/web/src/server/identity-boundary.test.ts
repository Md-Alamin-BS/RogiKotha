// @vitest-environment node
// BR3.6: no server action or route handler reaches an identity operation that takes an account id
// or returns a persona id. `renameNamedCommand` (the actor's own) and the public projections stay
// open to them.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..');
const ROOTS = [join(SRC, 'server', 'actions'), join(SRC, 'app', 'api')];

const FORBIDDEN: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'an import of modules/identity',
    pattern: /from\s+['"][^'"]*modules\/identity[^'"]*['"]/,
  },
  { name: 'createIdentityModule', pattern: /\bcreateIdentityModule\b/ },
  { name: 'an identity repository', pattern: /\b(?:Pg)?(?:Private)?IdentityRepository\b/ },
  { name: 'the private repository port', pattern: /\bprivateIdentities\b/ },
  { name: 'IdentityOwnership', pattern: /\bIdentityOwnership\b/ },
  { name: 'the ownership check', pattern: /\.ownership\b|\bownsPersona\b|\bownPersonaIds\b/ },
  // The module's members; `actions/review.ts` has a demo-slice helper of the same name (U47).
  { name: 'personaFor', pattern: /\.personaFor\b/ },
  { name: 'createDefaultPersonas', pattern: /\.createDefaultPersonas\b/ },
  { name: 'the persona_links table', pattern: /\bpersonaLinks\b|\bpersona_links\b/ },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Line and block comments are left out, so a comment that names the rule is not a hit. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function violationsIn(source: string): string[] {
  const code = withoutComments(source);
  return FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ name }) => name);
}

describe('the identity boundary of actions and routes (BR3.6)', () => {
  const files = ROOTS.flatMap(sourceFiles);

  it('finds the action and route files it checks', () => {
    expect(files.some((file) => file.includes(join('server', 'actions')))).toBe(true);
    expect(files.some((file) => file.includes(join('app', 'api')))).toBe(true);
  });

  it('finds no identity internals in any action or route file', () => {
    const hits = files.flatMap((file) =>
      violationsIn(readFileSync(file, 'utf8')).map((name) => `${relative(SRC, file)}: ${name}`),
    );

    expect(hits).toEqual([]);
  });

  it('flags a file that reaches the ownership check or imports the module', () => {
    const offending = [
      "import { ALIAS_ATTEMPTS } from '@rogikotha/application/src/modules/identity/persona-for';",
      'await getContainer().identity.ownership.ownsPersona(tx, input);',
      'await getContainer().identity.personaFor(tx, input);',
    ].join('\n');

    expect(violationsIn(offending)).toEqual([
      'an import of modules/identity',
      'the ownership check',
      'personaFor',
    ]);
  });

  it('allows the actor-own rename command and ignores comments', () => {
    const allowed = [
      '// ownership of a comment is checked by the community module (personaFor is internal).',
      'await runCommand(getContainer().identity.renameNamedCommand, input);',
    ].join('\n');

    expect(violationsIn(allowed)).toEqual([]);
  });
});
