import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workDir = mkdtempSync(path.join(tmpdir(), 'rk-contrast-'));

const contrast = (...args) =>
  spawnSync(process.execPath, ['tools/contrast.mjs', ...args], { cwd: repoRoot, encoding: 'utf8' });

afterAll(() => rmSync(workDir, { recursive: true, force: true }));

describe('the contrast tool with --tokens', () => {
  it('fails and names the missing tokens when the stylesheet lacks them', () => {
    const stylesheet = path.join(workDir, 'no-tokens.css');
    writeFileSync(
      stylesheet,
      ':root {\n  --other: hsl(0 0% 0%);\n}\n:root[data-theme="dark"] {\n  --other: hsl(0 0% 100%);\n}\n',
    );

    const run = contrast('--tokens', stylesheet);

    expect(run.status).toBe(1);
    expect(run.stdout).toContain('LIGHT: body text - missing --ink, --bg');
    expect(run.stdout).not.toContain('OK - every text pair');
  });

  it('fails when the stylesheet cannot be read', () => {
    const run = contrast('--tokens', path.join(workDir, 'missing.css'));

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('cannot read --tokens');
  });

  it('gives the ported tokens the same results as the prototype stylesheet', () => {
    const ported = contrast('--tokens', 'apps/web/src/styles/tokens.css');
    const prototype = contrast();

    expect(ported.status).toBe(0);
    expect(ported.stdout).toBe(prototype.stdout);
  });
});
