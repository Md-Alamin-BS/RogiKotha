// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

// The pure parts of the browser-suite helpers (U50 Steps 20-26), so a journey never fails on a
// harness defect: the e2e environment and database guard, message formatting, digits, the axe
// exclusion filter, the motion limits and the Mailpit link pick. The browser parts run in `pnpm e2e`.
// Plain JS loading the helpers by path: `e2e/` sits outside `src` and its tsconfig, so neither the
// web type project nor an import boundary covers it.

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'e2e');
const load = (file) => import(pathToFileURL(path.join(e2eDir, file)).href);

const env = await load('helpers/env.ts');
const database = await load('helpers/database.ts');
const messages = await load('helpers/messages.ts');
const digits = await load('helpers/digits.ts');
const axe = await load('helpers/axe.ts');
const motion = await load('helpers/motion.ts');
const mailpit = await load('helpers/mailpit.ts');
const setup = await load('helpers/global-setup.ts');

const FILE_ENV = {
  DATABASE_URL: 'postgres://rk_app:rk_app@localhost:5433/rogikotha',
  DATABASE_URL_WORKER: 'postgres://rk_worker:rk_worker@localhost:5433/rogikotha',
  DATABASE_URL_TEST: 'postgres://rk_app:rk_app@localhost:5433/rogikotha_test_w9',
  APP_MODE: 'development',
  STORAGE_ROOT: './.data/storage',
};

describe('the e2e environment (BR1.2, BR1.3)', () => {
  it('points every database URL at rogikotha_e2e_test and storage at one absolute folder', () => {
    const root = path.resolve('/repo');
    const result = env.e2eEnvironment(root, FILE_ENV, { NODE_ENV: 'test' });
    expect(result.DATABASE_URL).toBe('postgres://rk_app:rk_app@localhost:5433/rogikotha_e2e_test');
    expect(result.DATABASE_URL_WORKER).toBe(
      'postgres://rk_worker:rk_worker@localhost:5433/rogikotha_e2e_test',
    );
    expect(result.DATABASE_URL_TEST).toContain('/rogikotha_e2e_test');
    expect(result.APP_URL).toBe('http://127.0.0.1:3107');
    expect(result.APP_MODE).toBe('demo');
    expect(result.STORAGE_ROOT).toBe(path.join(root, '.data', 'e2e-storage'));
    expect(result.EVIDENCE_STORAGE_DIR).toBe(result.STORAGE_ROOT);
    expect(result.NODE_ENV).toBeUndefined();
  });

  it('finds the repository root by pnpm-workspace.yaml', () => {
    expect(env.findRepoRoot(e2eDir)).toBe(path.resolve(e2eDir, '..', '..', '..'));
  });

  it('caps the workers at four and defaults to two', () => {
    expect([env.workerCount(undefined), env.workerCount('1'), env.workerCount('9')]).toEqual([
      2, 1, 4,
    ]);
  });

  it('parses quoted values and trailing comments in .env', () => {
    expect(env.parseEnvFile('A="x y"\nB=1   # note\n# C=2\n')).toEqual({ A: 'x y', B: '1' });
  });
});

describe('the e2e database guard (BR1.3)', () => {
  const target = env.e2eEnvironment(path.resolve('/repo'), FILE_ENV, {});

  it('accepts only a database ending in _e2e_test outside production', () => {
    expect(database.unsafeTargetReason(target)).toBeNull();
    expect(database.unsafeTargetReason({ ...target, APP_MODE: 'production' })).toMatch(
      /production/,
    );
    expect(database.unsafeTargetReason({ ...target, DATABASE_URL: FILE_ENV.DATABASE_URL })).toMatch(
      /"rogikotha"/,
    );
    expect(
      database.unsafeTargetReason({
        ...target,
        DATABASE_URL_WORKER: 'postgres://rk_worker:x@localhost:5433/rogikotha_test',
      }),
    ).toMatch(/"rogikotha_test"/);
  });

  it('creates the database through the compose superuser only when it is missing', () => {
    const calls = [];
    const runner = (answer) => (command, args, options) => {
      calls.push(`${command} ${args.join(' ')} <<${options.input ?? ''}`);
      return { status: 0, stdout: options.input?.startsWith('select') ? answer : '', stderr: '' };
    };
    expect(database.ensureDatabase(target, '/repo', runner('1\n'))).toBe(false);
    expect(calls).toHaveLength(1);
    expect(database.ensureDatabase(target, '/repo', runner(''))).toBe(true);
    expect(calls[2]).toContain('psql -U postgres');
    expect(calls[2]).toContain('CREATE DATABASE rogikotha_e2e_test OWNER rk_app;');
    expect(calls[2]).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
  });

  it('refuses before running anything when the target is unsafe, then resets and seeds in order', () => {
    const calls = [];
    const runner = (command, _args, options) => {
      calls.push(command);
      return { status: 0, stdout: options.input?.startsWith('select') ? '1' : '', stderr: '' };
    };
    expect(() =>
      database.prepareDatabase({ ...target, APP_MODE: 'production' }, '/repo', runner),
    ).toThrow(/production/);
    expect(calls).toEqual([]);
    database.prepareDatabase(target, '/repo', runner);
    expect(calls).toEqual([
      'docker',
      'pnpm --filter @rogikotha/database reset',
      'pnpm --filter @rogikotha/test-support seed',
    ]);
  });

  it('stops on a failed step and names it', () => {
    const runner = (command, _args, options) =>
      command === 'docker'
        ? { status: 0, stdout: options.input?.startsWith('select') ? '1' : '', stderr: '' }
        : { status: 1, stdout: '', stderr: 'boom' };
    expect(() => database.prepareDatabase(target, '/repo', runner)).toThrow(/db:reset failed/);
  });
});

describe('the e2e lock (BR1.3)', () => {
  let root = '';
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('lets one run hold it and names the holder to a second run', () => {
    root = mkdtempSync(path.join(tmpdir(), 'rk-e2e-lock-'));
    setup.takeLock(root, 4242);
    expect(() => setup.takeLock(root, 4343)).toThrow(
      /Another browser run is in progress \(pid 4242\)/,
    );
  });
});

describe('messages and digits (BR2.6)', () => {
  it('reads a dotted key in both languages and throws on a missing one', () => {
    expect(messages.msg('en', 'demo.banner')).toBe('Demo — fictional records, not a real service');
    expect(messages.msg('bn', 'demo.banner')).not.toBe(messages.msg('en', 'demo.banner'));
    expect(() => messages.msg('en', 'no.such.key')).toThrow(/No en message at no.such.key/);
  });

  it('fills placeholders, plurals and numbers in the locale digits', () => {
    expect(messages.msg('en', 'email.verify.body', { link: 'L' })).toContain('L');
    const [key, value] = messages
      .allMessages('en')
      .find(([, text]) => /\{(\w+), plural,/.test(text));
    const params = Object.fromEntries(
      [...value.matchAll(/\{(\w+)[,}]/g)].map(([, name]) => [name, 12]),
    );
    expect(messages.msg('bn', key, params)).not.toMatch(/[0-9]|\{|#/);
    expect(messages.msg('en', key, params)).toMatch(/12/);
    expect(messages.msg('en', key, params)).not.toMatch(/\{|#/);
    expect(() => messages.msg('en', key)).toThrow(/parameter/);
    expect(messages.msg('en', 'condition.listCount', { n: 1, count: 1 })).toBe('1 health topic');
    expect(messages.msg('en', 'condition.listCount', { n: 3, count: 3 })).toBe('3 health topics');
  });

  it('maps Bengali digits to Latin and formats like the app', () => {
    expect(digits.toLatinDigits('১২,৩৪০')).toBe('12,340');
    expect(digits.formatNumber(12340, 'bn')).toBe('১২,৩৪০');
    expect(digits.hasAsciiDigit(digits.formatNumber(7, 'bn'))).toBe(false);
  });
});

describe('the axe filter (BR3.1, BR3.2)', () => {
  const violation = (id, impact, target) => ({
    id,
    impact,
    help: id,
    nodes: [{ target: [target] }],
  });

  it('starts with no exclusions and fails only on serious and critical findings', () => {
    expect(axe.EXCLUSIONS).toEqual([]);
    const found = axe.blockingViolations([
      violation('color-contrast', 'serious', '.a'),
      violation('region', 'moderate', '.b'),
      violation('label', 'critical', '.c'),
    ]);
    expect(found.map((item) => item.id)).toEqual(['color-contrast', 'label']);
  });

  it('drops a node only when an exclusion names its rule and selector', () => {
    const exclusions = [{ ruleId: 'label', selector: '.c', reason: 'r', iss: 'ISS-0' }];
    expect(axe.blockingViolations([violation('label', 'critical', '.c')], exclusions)).toEqual([]);
    expect(axe.blockingViolations([violation('label', 'critical', '.d')], exclusions)).toHaveLength(
      1,
    );
  });
});

describe('the motion limits (BR4.1, BR4.6)', () => {
  const sample = (properties, durationMs, iterations = 1) => ({
    kind: 'CSSAnimation',
    name: 'x',
    properties,
    durationMs,
    delayMs: 0,
    iterations,
    pseudo: null,
    target: 'div',
  });

  it('allows only opacity fades of 100 ms or less under reduced motion', () => {
    expect(motion.reducedMotionViolations([sample(['opacity'], 100)])).toEqual([]);
    expect(motion.reducedMotionViolations([sample(['opacity'], 101)])).toHaveLength(1);
    expect(motion.reducedMotionViolations([sample(['opacity', 'transform'], 80)])).toHaveLength(1);
  });

  it('flags a loop or anything playing past five seconds', () => {
    expect(motion.longOrLooping([sample(['opacity'], 300, Infinity)])).toHaveLength(1);
    expect(motion.longOrLooping([sample(['opacity'], 2_000, 3)])).toHaveLength(1);
    expect(motion.longOrLooping([sample(['opacity'], 300, 2)])).toEqual([]);
  });
});

describe('the Mailpit link pick (BR6.1)', () => {
  it('returns the one distinct app link under the page prefix from text and HTML', () => {
    const link = 'http://127.0.0.1:3107/bn/verify-email?token=abc&x=1';
    const links = mailpit.appLinks(
      {
        Text: `Open ${link}.`,
        HTML: `<a href="${link.replace('&', '&amp;')}">x</a> <a href="http://127.0.0.1:3107/bn/terms">t</a>`,
      },
      'http://127.0.0.1:3107/bn/verify-email',
    );
    expect(links).toEqual([link]);
  });
});
