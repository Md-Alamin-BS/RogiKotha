// `pnpm lint:boundaries`: proves the boundary rules by linting the planted fixture and comparing
// the report with its manifest (T-010, BR5.2-BR5.3).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE_DIR = 'lint-fixtures/boundary-violation';

const toPosix = (filePath) => filePath.split(path.sep).join('/');

export async function readManifest(rootDir = REPO_ROOT) {
  const text = await readFile(path.join(rootDir, FIXTURE_DIR, 'manifest.json'), 'utf8');
  return JSON.parse(text).cases;
}

/** Every problem ESLint reports on the fixture, as fixture-relative path and rule id. */
export async function lintFixture({ rootDir = REPO_ROOT, overrideConfig } = {}) {
  const eslint = new ESLint({ cwd: rootDir, ignore: false, overrideConfig });
  const results = await eslint.lintFiles([FIXTURE_DIR]);
  const fixtureRoot = path.join(rootDir, FIXTURE_DIR);
  return results.flatMap((result) =>
    result.messages.map((message) => ({
      file: toPosix(path.relative(fixtureRoot, result.filePath)),
      rule: message.ruleId ?? '(fatal)',
      line: message.line,
      message: message.message,
    })),
  );
}

/** Compares the report with the manifest; `ok` only when they are equal (BR5.2, BR5.3). */
export function compareWithManifest(cases, problems) {
  const failures = [];
  const remaining = [...problems];
  for (const fixtureCase of cases.filter((c) => c.kind === 'violation')) {
    const index = remaining.findIndex(
      (p) => p.file === fixtureCase.file && p.rule === fixtureCase.rule,
    );
    if (index === -1) {
      failures.push(`missing: ${fixtureCase.id} ${fixtureCase.file} expected ${fixtureCase.rule}`);
    } else {
      remaining.splice(index, 1);
    }
  }
  for (const problem of remaining) {
    const control = cases.find((c) => c.kind === 'control' && c.file === problem.file);
    const label = control ? `control ${control.id} reported` : 'unexpected';
    failures.push(`${label}: ${problem.file}:${problem.line} ${problem.rule} ${problem.message}`);
  }
  const expected = cases.filter((c) => c.kind === 'violation').length;
  return { ok: failures.length === 0, expected, failures };
}

export async function checkBoundariesFixture(options = {}) {
  const cases = await readManifest(options.rootDir);
  const problems = await lintFixture(options);
  return compareWithManifest(cases, problems);
}

async function main() {
  const { ok, expected, failures } = await checkBoundariesFixture();
  if (ok) {
    process.stdout.write(`${expected} expected violations found\n`);
    return;
  }
  console.error(`Boundary fixture does not match its manifest:\n${failures.join('\n')}`);
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
