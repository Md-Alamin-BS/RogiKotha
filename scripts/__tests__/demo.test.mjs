import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  bannerText,
  busyPorts,
  checkNodeVersion,
  checkPnpmVersion,
  childEnv,
  commandFor,
  composeArgs,
  databaseName,
  DEMO_PORTS,
  downProbes,
  ensureEnvFile,
  ENV_EXAMPLE,
  generateEnv,
  isPortFree,
  parseArgs,
  parseCount,
  parseEnv,
  portConflictMessage,
  portConflicts,
  refuseProduction,
  RELEASE1_ACCOUNTS,
  seedIfEmpty,
  stopPlan,
  stopTree,
} from '../demo.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const example = readFileSync(path.join(repoRoot, ENV_EXAMPLE), 'utf8');
const workDir = mkdtempSync(path.join(tmpdir(), 'rk-demo-'));
const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((r) => server.close(() => r()))));
});
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const listenAnywhere = () =>
  new Promise((resolve) => {
    const server = net.createServer();
    servers.push(server);
    server.listen(0, () => resolve(server.address().port));
  });

describe('preflight', () => {
  it('accepts Node 24 and pnpm 11 and names any other version', () => {
    expect(checkNodeVersion('24.11.0')).toBeNull();
    expect(checkNodeVersion('v22.3.0')).toBe('Node 24 is required; this is Node v22.3.0.');
    expect(checkPnpmVersion('11.20.0\n')).toBeNull();
    expect(checkPnpmVersion('10.4.1')).toBe('pnpm 11 is required; this is pnpm 10.4.1.');
    expect(checkPnpmVersion(null)).toMatch(/not found/);
  });

  it('detects a port held by a temporary listener and names it in the message', async () => {
    const port = await listenAnywhere();
    const ports = [{ port, label: 'web app', service: null }];

    expect(await isPortFree(port)).toBe(false);
    const conflicts = portConflicts(await busyPorts(ports), [], ports);

    expect(conflicts).toEqual(ports);
    const message = portConflictMessage(conflicts[0], 'TCP 0.0.0.0:1 LISTENING 4242', 'win32');
    expect(message).toContain(`Port ${port} (web app) is in use`);
    expect(message).toContain(`netstat -ano | findstr :${port}`);
    expect(message).toContain('LISTENING 4242');
    expect(portConflictMessage(conflicts[0], '', 'linux')).toContain(`lsof -i :${port}`);
  });

  it('reports a port free once nothing listens on it', async () => {
    const port = await listenAnywhere();
    await new Promise((r) => servers.pop().close(() => r()));

    expect(await isPortFree(port)).toBe(true);
  });

  it('accepts a busy port held by this compose project, never port 3000', () => {
    const busy = [3000, 5433, 1025, 8025, 3310];

    expect(portConflicts(busy, ['postgres', 'mailpit', 'clamav']).map((c) => c.port)).toEqual([
      3000,
    ]);
    expect(portConflicts(busy, ['postgres']).map((c) => c.port)).toEqual([3000, 1025, 8025, 3310]);
    expect(portConflicts([], []).length).toBe(0);
    expect(DEMO_PORTS.map((p) => p.port)).toEqual([3000, 5433, 1025, 8025, 3310]);
  });

  it('refuses APP_MODE=production from the file or the process environment', () => {
    expect(refuseProduction({ APP_MODE: 'production' }, {})).toMatch(/production/);
    expect(refuseProduction({ APP_MODE: 'demo' }, { APP_MODE: 'production' })).toMatch(
      /production/,
    );
    expect(refuseProduction({ APP_MODE: 'demo' }, {})).toBeNull();
    expect(refuseProduction({ APP_MODE: 'development' }, {})).toBeNull();
  });
});

describe('.env generation', () => {
  it('writes APP_MODE=demo and three 32-byte base64 keys that all differ', () => {
    const env = parseEnv(generateEnv(example));

    expect(env.APP_MODE).toBe('demo');
    const keys = ['APP_ENCRYPTION_KEY', 'BETTER_AUTH_SECRET', 'MAIL_RECIPIENT_KEY'].map(
      (k) => env[k],
    );
    for (const key of keys) {
      expect(key).toMatch(/^[A-Za-z0-9+/]{43}=$/);
      expect(Buffer.from(key, 'base64')).toHaveLength(32);
    }
    expect(new Set(keys).size).toBe(3);
    expect(env.MAIL_RECIPIENT_KEY).not.toBe(env.APP_ENCRYPTION_KEY);
    // The rest of the example is kept, including host port 5433 (R6).
    expect(env.DATABASE_URL).toContain('localhost:5433');
    expect(env.SMTP_PORT).toBe('1025');
  });

  it('draws a key again when the random source repeats itself', () => {
    const draws = [
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 1),
      Buffer.alloc(32, 2),
      Buffer.alloc(32, 3),
    ];
    const env = parseEnv(generateEnv(example, () => draws.shift()));

    expect(env.APP_ENCRYPTION_KEY).toBe(Buffer.alloc(32, 1).toString('base64'));
    expect(env.BETTER_AUTH_SECRET).toBe(Buffer.alloc(32, 2).toString('base64'));
    expect(env.MAIL_RECIPIENT_KEY).toBe(Buffer.alloc(32, 3).toString('base64'));
  });

  it('gives fresh keys on every generation', () => {
    expect(parseEnv(generateEnv(example)).APP_ENCRYPTION_KEY).not.toBe(
      parseEnv(generateEnv(example)).APP_ENCRYPTION_KEY,
    );
  });

  it('creates .env from the example only when it is missing', () => {
    const root = path.join(workDir, 'env-root');
    mkdirSync(path.join(root, 'infra', 'compose'), { recursive: true });
    writeFileSync(path.join(root, ENV_EXAMPLE), example);

    const first = ensureEnvFile(root);
    expect(first.created).toBe(true);
    expect(first.env.APP_MODE).toBe('demo');

    writeFileSync(path.join(root, '.env'), 'APP_MODE=development\n');
    const second = ensureEnvFile(root);
    expect(second.created).toBe(false);
    expect(second.env).toEqual({ APP_MODE: 'development' });
  });

  it('keeps .env out of git', () => {
    const ignored = readFileSync(path.join(repoRoot, '.gitignore'), 'utf8').split(/\r?\n/);

    expect(ignored).toContain('.env');
    expect(ignored).toContain('.data/');
  });

  it('reads inline comments and quotes the way the example writes them', () => {
    expect(parseEnv('APP_MODE=development   # dev | demo\n# comment\nA="x # y"\nB=\n')).toEqual({
      APP_MODE: 'development',
      A: 'x # y',
      B: '',
    });
  });
});

describe('services and data', () => {
  it('adds the compose project only when RK_COMPOSE_PROJECT is set', () => {
    expect(composeArgs(undefined)).toEqual(['compose', '-f', 'infra/compose/docker-compose.yml']);
    expect(composeArgs('rk-demo')).toEqual([
      'compose',
      '-f',
      'infra/compose/docker-compose.yml',
      '-p',
      'rk-demo',
    ]);
  });

  it('reads the database name from DATABASE_URL', () => {
    expect(databaseName('postgres://rk_app:rk_app@localhost:5433/rogikotha')).toBe('rogikotha');
    expect(() => databaseName('postgres://rk_app@localhost:5433/')).toThrow(/no database/);
  });

  it('parses the psql count and refuses a non-numeric answer with the output', () => {
    expect(parseCount('42\n')).toBe(42);
    expect(() => parseCount('psql: error: relation "account_profiles" does not exist')).toThrow(
      /not a number: psql: error/,
    );
  });

  it('seeds an empty database', async () => {
    const calls = [];
    const outcome = await seedIfEmpty({
      count: async () => 0,
      seed: async () => calls.push('seed'),
      log: (line) => calls.push(line),
    });

    expect(outcome).toBe('seeded');
    expect(calls).toEqual(['seed']);
  });

  it('keeps existing data when the database has rows', async () => {
    const calls = [];
    const outcome = await seedIfEmpty({
      count: async () => 17,
      seed: async () => calls.push('seed'),
      log: (line) => calls.push(line),
    });

    expect(outcome).toBe('kept');
    expect(calls).toEqual(['Existing data kept. Run pnpm demo:reset for a clean slate.']);
  });

  it('parses --no-build and the serve form', () => {
    expect(parseArgs([])).toEqual({ serve: false, build: true });
    expect(parseArgs(['--no-build'])).toEqual({ serve: false, build: false });
    expect(parseArgs(['serve'])).toMatchObject({ serve: true });
    expect(parseArgs(['--serve'])).toMatchObject({ serve: true });
  });
});

describe('run and banner', () => {
  it('gives both children one absolute storage folder from the repository root', () => {
    const root = path.resolve(workDir, 'repo');
    const env = childEnv(root, { STORAGE_ROOT: './.data/storage' }, { PATH: 'x' });

    expect(env.STORAGE_ROOT).toBe(path.join(root, '.data', 'storage'));
    expect(env.EVIDENCE_STORAGE_DIR).toBe(env.STORAGE_ROOT);
    expect(path.isAbsolute(env.STORAGE_ROOT)).toBe(true);
    expect(env.PATH).toBe('x');
    expect(childEnv(root, {}, {}).STORAGE_ROOT).toBe(path.join(root, '.data', 'storage'));
  });

  it('runs pnpm through one shell string on Windows and directly elsewhere', () => {
    expect(commandFor('pnpm', ['--filter', '@rogikotha/web', 'start'], 'win32')).toEqual({
      file: 'pnpm --filter @rogikotha/web start',
      args: [],
      shell: true,
    });
    expect(commandFor('pnpm', ['db:seed'], 'linux')).toEqual({
      file: 'pnpm',
      args: ['db:seed'],
      shell: false,
    });
    expect(commandFor('docker', ['info'], 'win32')).toMatchObject({ shell: false });
  });

  it('lists only the release-1 accounts, with the shared password and the stop and reset commands', () => {
    const banner = bannerText();

    for (const username of ['shirin_88', 'rafi_c', 'anon_author_r2', 'named_tanvir-ahmed']) {
      expect(banner).toContain(username);
      expect(banner).toContain(`${username}@demo.rogikotha.local`);
    }
    expect(RELEASE1_ACCOUNTS).toHaveLength(4);
    for (const staff of ['mod_rashid', 'admin_nadia', 'sa_founder', 'reporter_1']) {
      expect(banner).not.toContain(staff);
    }
    expect(banner).toContain('demo-pass-2026!');
    expect(banner).toContain('http://localhost:3000/bn');
    expect(banner).toContain('http://localhost:3000/en');
    expect(banner).toContain('http://localhost:8025');
    expect(banner).toContain('Fictional records only');
    expect(banner).toContain('DEMO.md');
    expect(banner).toContain('pnpm demo:reset --yes');
    expect(banner).toContain('pnpm demo:down');
  });

  it('matches the accounts table in DEMO.md', () => {
    const demoDoc = path.join(repoRoot, 'DEMO.md');
    expect(existsSync(demoDoc)).toBe(true);
    const doc = readFileSync(demoDoc, 'utf8');
    for (const account of RELEASE1_ACCOUNTS) {
      expect(doc).toContain(`| \`${account.username}\` | \`${account.email}\` |`);
    }
    expect(doc).toContain('demo-pass-2026!');
  });

  it('names the probes that are not ok', () => {
    expect(downProbes({ db: 'ok', queue: 'ok', mail: 'down', scanner: 'unknown' })).toEqual([
      'mail',
      'scanner',
    ]);
    expect(downProbes(undefined)).toEqual(['db', 'queue', 'mail', 'scanner']);
  });
});

describe('stopping the children', () => {
  it('uses taskkill on the whole tree on Windows', () => {
    const calls = [];
    const plan = stopTree(4242, {
      platform: 'win32',
      run: (command, args) => calls.push([command, ...args]),
      kill: () => calls.push(['kill']),
    });

    expect(plan.kind).toBe('taskkill');
    expect(calls).toEqual([['taskkill', '/pid', '4242', '/T', '/F']]);
  });

  it('signals the process group elsewhere and never runs taskkill', () => {
    const calls = [];
    stopTree(4242, {
      platform: 'linux',
      run: () => calls.push(['taskkill']),
      kill: (pid, signal) => calls.push([pid, signal]),
    });

    expect(calls).toEqual([[-4242, 'SIGTERM']]);
    expect(stopPlan(7, 'darwin')).toEqual({ kind: 'signal', pid: -7, signal: 'SIGTERM' });
  });

  it('falls back to the process itself when the group is gone', () => {
    const calls = [];
    stopTree(4242, {
      platform: 'linux',
      run: () => {},
      kill: (pid, signal) => {
        calls.push([pid, signal]);
        if (pid < 0) throw Object.assign(new Error('no such group'), { code: 'ESRCH' });
      },
    });

    expect(calls).toEqual([
      [-4242, 'SIGTERM'],
      [4242, 'SIGTERM'],
    ]);
  });
});
