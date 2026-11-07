import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { DONE_LINE, emptyDir, reset, stopFromPidFile } from '../demo-reset.mjs';

const workDir = mkdtempSync(path.join(tmpdir(), 'rk-demo-reset-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

/** A reset whose every effect records its name in `calls`. */
function fakes(calls) {
  return {
    root: path.join(workDir, 'repo'),
    processEnv: {},
    confirm: async () => {
      calls.push('confirm');
      return true;
    },
    stopProcesses: () => calls.push('stop'),
    run: async (args) => calls.push(`pnpm ${args.join(' ')}`),
    empty: (dir) => calls.push(`empty ${path.relative(path.join(workDir, 'repo'), dir)}`),
    clearMail: async (url) => calls.push(`mail ${url}`),
    log: (line) => calls.push(`log ${line}`),
    fail: (line) => calls.push(`fail ${line}`),
  };
}

describe('pnpm demo:reset', () => {
  it('refuses APP_MODE=production and runs nothing', async () => {
    const calls = [];

    const code = await reset({ yes: true, fileEnv: { APP_MODE: 'production' }, ...fakes(calls) });

    expect(code).toBe(1);
    expect(calls).toEqual([
      'fail APP_MODE=production: the demo scripts never run against production.',
    ]);
  });

  it('refuses production set in the process environment too', async () => {
    const calls = [];

    const code = await reset({
      yes: true,
      fileEnv: { APP_MODE: 'demo' },
      ...fakes(calls),
      processEnv: { APP_MODE: 'production' },
    });

    expect(code).toBe(1);
    expect(calls.filter((call) => !call.startsWith('fail'))).toEqual([]);
  });

  it('runs nothing when the confirmation is not given', async () => {
    const calls = [];

    const code = await reset({
      yes: false,
      fileEnv: { APP_MODE: 'demo' },
      ...fakes(calls),
      confirm: async () => false,
    });

    expect(code).toBe(0);
    expect(calls).toEqual(['log Reset cancelled; nothing changed.']);
  });

  it('asks first without --yes and runs every step in order after a yes', async () => {
    const calls = [];

    const code = await reset({
      yes: false,
      fileEnv: { APP_MODE: 'demo', MAILPIT_URL: 'http://localhost:8025' },
      ...fakes(calls),
    });

    expect(code).toBe(0);
    expect(calls.filter((call) => !call.startsWith('log '))).toEqual([
      'confirm',
      'stop',
      'pnpm db:reset',
      'pnpm db:seed',
      `empty ${path.join('.data', 'storage')}`,
      `empty ${path.join('var', 'evidence')}`,
      'mail http://localhost:8025',
    ]);
    expect(calls.at(-1)).toBe(`log ${DONE_LINE}`);
  });

  it('skips the question with --yes and empties the configured storage folder', async () => {
    const calls = [];

    await reset({ yes: true, fileEnv: { STORAGE_ROOT: './elsewhere' }, ...fakes(calls) });

    expect(calls).not.toContain('confirm');
    expect(calls).toContain('empty elsewhere');
    expect(calls).toContain('mail http://localhost:8025');
  });

  it('stops at a failed step, names it and exits 1', async () => {
    const calls = [];

    const code = await reset({
      yes: true,
      fileEnv: {},
      ...fakes(calls),
      run: async (args) => {
        calls.push(`pnpm ${args.join(' ')}`);
        if (args[0] === 'db:seed') throw new Error('exited with code 1');
      },
    });

    expect(code).toBe(1);
    expect(calls).toContain('fail pnpm db:seed failed: exited with code 1');
    expect(calls.some((call) => call.startsWith('empty') || call.startsWith('mail'))).toBe(false);
    expect(calls).not.toContain(`log ${DONE_LINE}`);
  });
});

describe('reset helpers', () => {
  it('empties a folder but keeps it, and ignores a missing one', () => {
    const dir = path.join(workDir, 'storage');
    mkdirSync(path.join(dir, 'nested'), { recursive: true });
    writeFileSync(path.join(dir, 'a.bin'), 'x');
    writeFileSync(path.join(dir, 'nested', 'b.bin'), 'y');

    emptyDir(dir);
    emptyDir(path.join(workDir, 'missing'));

    expect(existsSync(dir)).toBe(true);
    expect(readdirSync(dir)).toEqual([]);
  });

  it('stops only the running processes the pidfile names, then removes it', () => {
    const root = path.join(workDir, 'pid-root');
    mkdirSync(path.join(root, '.data'), { recursive: true });
    writeFileSync(path.join(root, '.data', 'demo.pid'), '{}');
    const stopped = [];

    const result = stopFromPidFile(root, {
      read: () => ({ parent: 10, web: 11, worker: 12 }),
      running: (pid) => pid !== 12,
      stop: (pid) => stopped.push(pid),
    });

    expect(result).toEqual([11, 10]);
    expect(stopped).toEqual([11, 10]);
    expect(existsSync(path.join(root, '.data', 'demo.pid'))).toBe(false);
  });

  it('does nothing without a pidfile', () => {
    expect(stopFromPidFile(path.join(workDir, 'none'), { read: () => null })).toEqual([]);
  });
});
