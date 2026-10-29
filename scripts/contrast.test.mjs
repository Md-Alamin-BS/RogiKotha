import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

describe('the contrast tool with --pairs patient', () => {
  const patientCss = readFileSync(path.join(repoRoot, 'apps/web/src/styles/patient.css'), 'utf8');
  // Replaces the first definition of a token, which is the light one.
  const withLightToken = (name, value) => {
    const changed = patientCss.replace(
      new RegExp(`^  ${name}: [^;]+;`, 'm'),
      `  ${name}: ${value};`,
    );
    expect(changed).not.toBe(patientCss);
    const stylesheet = path.join(workDir, `${name.slice(2)}.css`);
    writeFileSync(stylesheet, changed);
    return stylesheet;
  };

  it('passes on the patient palette in both modes and checks the extra pairs', () => {
    const run = contrast('--tokens', 'apps/web/src/styles/patient.css', '--pairs', 'patient');

    expect(run.status).toBe(0);
    expect(run.stdout).toContain('focus ring on page');
    expect(run.stdout).toContain('current tab text');
    expect(run.stdout).not.toContain('SKIP');
    expect(run.stdout).toContain('OK - every text pair');
  });

  it('fails and names --focus when the stylesheet lacks it', () => {
    const stylesheet = path.join(workDir, 'no-focus.css');
    writeFileSync(stylesheet, patientCss.replace(/^ +--focus: [^;]+;\r?\n/gm, ''));

    const run = contrast('--tokens', stylesheet, '--pairs', 'patient');

    expect(run.status).toBe(1);
    expect(run.stdout).toContain('missing --focus');
  });

  it('fails when the focus ring falls below 3:1 on the page', () => {
    const run = contrast(
      '--tokens',
      withLightToken('--focus', 'hsl(40 33% 90%)'),
      '--pairs',
      'patient',
    );

    expect(run.status).toBe(1);
    expect(run.stdout).toMatch(/FAIL [\d.]+:1 \(need 3\) focus ring on page/);
  });

  it('fails when text on the primary wash falls below 4.5:1', () => {
    const run = contrast(
      '--tokens',
      withLightToken('--primary-soft', 'hsl(167 33% 30%)'),
      '--pairs',
      'patient',
    );

    expect(run.status).toBe(1);
    expect(run.stdout).toMatch(/FAIL [\d.]+:1 \(need 4\.5\) text on primary wash/);
  });

  it('leaves the shared pair list alone when the flag is absent', () => {
    const run = contrast('--tokens', 'apps/web/src/styles/patient.css');

    expect(run.status).toBe(0);
    expect(run.stdout).not.toContain('focus ring on page');
    expect(run.stdout).not.toContain('current tab text');
  });

  it('refuses a pair set it does not know', () => {
    const run = contrast('--tokens', 'apps/web/src/styles/patient.css', '--pairs', 'staff');

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('--pairs accepts only "patient"');
  });

  it('refuses --pairs without --tokens', () => {
    const run = contrast('--pairs', 'patient');

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('needs --tokens');
  });

  it('keeps the staff output byte for byte when the flag is absent', () => {
    const staff = contrast('--tokens', 'apps/web/src/styles/tokens.css');

    expect(staff.status).toBe(0);
    expect(staff.stdout).not.toContain('--focus');
    expect(staff.stdout).not.toContain('primary wash');
  });
});
