// @vitest-environment node
// U11 Step 17, high-risk adversarial test (functional-spec § 8.3, BR3.6), written by an agent that
// did not build the boundary. This scan closes the ways around `identity-boundary.test.ts`:
// destructuring (`const { personaFor } = identity`), bracket access (`identity['ownership']`) and
// aliasing the module to another name. Since the U11 review `WebContainer.identity` is narrowed to
// `WebIdentity` (fixed in U47), so the type closes these members too; the scan stays as the second
// line and now covers all of `app` and `server`, the composition root excepted.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..');
const ROOTS = [join(SRC, 'app'), join(SRC, 'server')];
const COMPOSITION_ROOT = join(SRC, 'server', 'container.ts');

/** The members actions and routes may use: the actor's own rename and the public reads. */
const OPEN_MEMBERS = 'renameNamedCommand|publicProjections?|publicPersonaIdsByUsername';

const FORBIDDEN: readonly { name: string; pattern: RegExp }[] = [
  {
    name: 'a closed member of the identity module',
    pattern: new RegExp(`\\bidentity\\s*(?:\\?\\.|\\.)\\s*(?!(?:${OPEN_MEMBERS})\\b)[A-Za-z_$]`),
  },
  { name: 'bracket access on the identity module', pattern: /\bidentity\s*(?:\?\.)?\s*\[/ },
  {
    name: 'the identity module bound to another name',
    pattern: /=\s*(?:await\s+)?(?:getContainer\(\)|[\w$]+)\s*\.\s*identity\s*[;\n]/,
  },
  { name: 'destructuring the identity module', pattern: /\}\s*=\s*identity\s*[;\n]/ },
  {
    name: 'a closed member named as a string',
    pattern:
      /['"`](?:personaFor|ownership|ownsPersona|ownPersonaIds|createDefaultPersonas|privateIdentities)['"`]/,
  },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Line comments that start a line or follow whitespace, and block comments, are left out. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function violationsIn(source: string): string[] {
  const code = withoutComments(source);
  return FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(({ name }) => name);
}

describe('U11 adversarial: closed identity members reached from actions and routes (§ 8.3, BR3.6)', () => {
  it('flags destructuring, bracket access, aliasing and string member names', () => {
    expect(violationsIn('const { personaFor } = getContainer().identity;\n')).toEqual([
      'the identity module bound to another name',
    ]);
    expect(violationsIn("const check = getContainer().identity['ownership'];")).toEqual([
      'bracket access on the identity module',
      'a closed member named as a string',
    ]);
    expect(
      violationsIn('const ids = getContainer().identity;\nids.personaFor(tx, input);'),
    ).toEqual(['the identity module bound to another name']);
    expect(
      violationsIn('const { identity } = getContainer();\nconst { ownership: o } = identity;\n'),
    ).toEqual(['destructuring the identity module']);
    expect(violationsIn('await identity?.ownership.ownsPersona(tx, input);')).toEqual([
      'a closed member of the identity module',
    ]);
  });

  it('allows the open members and an unrelated `identity` field', () => {
    const allowed = [
      'await runCommand(getContainer().identity.renameNamedCommand, input);',
      'const vm = await getContainer().identity.publicProjections(tx, { personaIds });',
      'const ids = await container.identity.publicPersonaIdsByUsername(tx, { username });',
      'const values = { identityMode: input.identity, title };',
    ].join('\n');

    expect(violationsIn(allowed)).toEqual([]);
  });

  it('finds none of them in any page, route, action or server file', () => {
    const files = ROOTS.flatMap(sourceFiles).filter((file) => file !== COMPOSITION_ROOT);
    expect(files.some((file) => file.includes(join('app', '[locale]')))).toBe(true);
    expect(files.some((file) => file.includes(join('server', 'actions')))).toBe(true);

    const hits = files.flatMap((file) =>
      violationsIn(readFileSync(file, 'utf8')).map((name) => `${relative(SRC, file)}: ${name}`),
    );

    expect(hits).toEqual([]);
  });
});
