import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import {
  confirmationQuestion,
  DONE_LINE,
  emptyDir,
  folderRefusal,
  realPathOf,
  reset,
  stopFromPidFile,
} from '../demo-reset.mjs';

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

describe('pnpm demo:reset storage folder', () => {
  const repo = path.join(workDir, 'confine-repo');
  const outside = path.join(workDir, 'outside');
  const keep = path.join(outside, 'keep.txt');
  mkdirSync(repo, { recursive: true });
  mkdirSync(outside, { recursive: true });

  /** A reset on `repo` with the real emptyDir; every other effect is recorded in `calls`. */
  const realReset = (calls, options) =>
    reset({ yes: true, ...fakes(calls), root: repo, empty: emptyDir, ...options });

  const expectRefused = (calls, code, folder) => {
    expect(code).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(
      /^fail Refused: demo:reset empties only a folder inside the repository/,
    );
    expect(calls[0]).toContain(folder);
    expect(existsSync(keep)).toBe(true);
  };

  it('refuses an absolute STORAGE_ROOT outside the repository, even with --yes, and deletes nothing', async () => {
    writeFileSync(keep, 'user data');
    const calls = [];

    const code = await realReset(calls, { fileEnv: { STORAGE_ROOT: outside } });

    expectRefused(calls, code, outside);
    expect(calls[0]).toContain('is outside it');
  });

  it('refuses a relative STORAGE_ROOT that climbs out of the repository', async () => {
    writeFileSync(keep, 'user data');
    const calls = [];

    const code = await realReset(calls, { fileEnv: { STORAGE_ROOT: '../outside' } });

    expectRefused(calls, code, outside);
  });

  it('refuses a STORAGE_ROOT from the shell environment outside the repository', async () => {
    writeFileSync(keep, 'user data');
    const calls = [];

    const code = await realReset(calls, {
      yes: false,
      fileEnv: { STORAGE_ROOT: './.data/storage' },
      processEnv: { STORAGE_ROOT: outside },
    });

    expectRefused(calls, code, outside);
    expect(calls).not.toContain('confirm');
  });

  it('refuses the repository root itself', async () => {
    writeFileSync(path.join(repo, 'pnpm-workspace.yaml'), 'packages: []\n');
    const calls = [];

    const code = await realReset(calls, { fileEnv: { STORAGE_ROOT: '.' } });

    expect(code).toBe(1);
    expect(calls).toEqual([expect.stringContaining('is the repository root')]);
    expect(existsSync(path.join(repo, 'pnpm-workspace.yaml'))).toBe(true);
  });

  it('refuses a folder inside .git', async () => {
    const calls = [];

    const code = await realReset(calls, { fileEnv: { STORAGE_ROOT: './.git/objects' } });

    expect(code).toBe(1);
    expect(calls).toEqual([expect.stringContaining('is inside .git')]);
  });

  it('refuses a link inside the repository that points outside it', async () => {
    writeFileSync(keep, 'user data');
    const link = path.join(repo, 'linked-storage');
    rmSync(link, { recursive: true, force: true });
    symlinkSync(outside, link, 'junction');
    const calls = [];

    const code = await realReset(calls, { fileEnv: { STORAGE_ROOT: './linked-storage' } });

    expectRefused(calls, code, link);
    expect(calls[0]).toContain('it resolves to');
  });

  it('refuses a broken link, whose target is unknown', () => {
    const link = path.join(repo, 'broken-link');
    rmSync(link, { recursive: true, force: true });
    symlinkSync(path.join(workDir, 'gone'), link, 'junction');

    expect(realPathOf(link)).toBeNull();
    expect(folderRefusal(repo, link)).toContain('is a broken link');
  });

  it('empties .data/storage inside the repository and names it in the question', async () => {
    const storage = path.join(repo, '.data', 'storage');
    mkdirSync(path.join(storage, 'u1'), { recursive: true });
    writeFileSync(path.join(storage, 'u1', 'file.bin'), 'x');
    const calls = [];
    let asked;

    const code = await realReset(calls, {
      yes: false,
      fileEnv: { STORAGE_ROOT: './.data/storage' },
      confirm: async (folders) => {
        asked = confirmationQuestion(folders);
        return true;
      },
    });

    expect(code).toBe(0);
    expect(readdirSync(storage)).toEqual([]);
    expect(asked).toContain(storage);
    expect(asked).toContain(path.join(repo, 'var', 'evidence'));
    expect(calls).toContain(
      `log Empty the storage folders ${storage} and ${path.join(repo, 'var', 'evidence')} ...`,
    );
  });

  it('allows a folder that does not exist yet inside the repository', () => {
    expect(folderRefusal(repo, path.join(repo, 'not', 'there', 'yet'))).toBeNull();
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
