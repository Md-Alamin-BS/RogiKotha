import { spawnSync } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { parseCliArgs, waitForHttp, waitForTcp } from '../wait-for.mjs';

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'wait-for.mjs');
const servers = [];
const sockets = new Set();

afterEach(async () => {
  for (const socket of sockets) socket.destroy();
  sockets.clear();
  await Promise.all(servers.splice(0).map((server) => new Promise((r) => server.close(() => r()))));
});

const listen = (server) =>
  new Promise((resolve) => {
    servers.push(server);
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('error', () => {});
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

/** A port nothing listens on: bind it, read the number, release it. */
const closedPort = () =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });

describe('waitForTcp', () => {
  it('resolves when the port accepts a connection before the deadline', async () => {
    const port = await listen(net.createServer((socket) => socket.end()));

    const result = await waitForTcp({ host: '127.0.0.1', port, timeoutMs: 3000 });

    expect(result.target).toBe(`tcp 127.0.0.1:${port}`);
    expect(result.elapsedMs).toBeLessThan(3000);
  });

  it('resolves only once the server answers the probe with the expected reply', async () => {
    const port = await listen(
      net.createServer((socket) =>
        socket.on('data', (data) => {
          if (data.toString() === 'zPING\0') socket.end('PONG\0');
        }),
      ),
    );

    await expect(
      waitForTcp({ host: '127.0.0.1', port, timeoutMs: 3000, send: 'zPING\0', expect: 'PONG' }),
    ).resolves.toMatchObject({ target: `tcp 127.0.0.1:${port}` });
  });

  it('rejects after the deadline when the reply never matches, naming the target', async () => {
    const port = await listen(net.createServer((socket) => socket.end('NOPE\n')));

    await expect(
      waitForTcp({ host: '127.0.0.1', port, timeoutMs: 1200, send: 'zPING\0', expect: 'PONG' }),
    ).rejects.toThrow(new RegExp(`tcp 127\\.0\\.0\\.1:${port} not ready after \\d+ ms`));
  });

  it('rejects after the deadline when nothing listens, naming the target', async () => {
    const port = await closedPort();
    const started = Date.now();

    await expect(waitForTcp({ host: '127.0.0.1', port, timeoutMs: 1000 })).rejects.toThrow(
      `tcp 127.0.0.1:${port} not ready after`,
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  });
});

describe('waitForHttp', () => {
  it('resolves when the URL answers with the expected status', async () => {
    const port = await listen(http.createServer((_, res) => res.writeHead(200).end('{}')));

    await expect(
      waitForHttp({ url: `http://127.0.0.1:${port}/api/v1/info`, timeoutMs: 3000 }),
    ).resolves.toMatchObject({ target: `http http://127.0.0.1:${port}/api/v1/info` });
  });

  it('becomes ready once the server starts answering 200 within the deadline', async () => {
    let calls = 0;
    const port = await listen(
      http.createServer((_, res) => {
        calls += 1;
        res.writeHead(calls < 3 ? 503 : 200).end();
      }),
    );

    await waitForHttp({ url: `http://127.0.0.1:${port}/`, timeoutMs: 5000, intervalMs: 50 });

    expect(calls).toBe(3);
  });

  it('fails when the status never matches, naming the URL and the status seen', async () => {
    const port = await listen(http.createServer((_, res) => res.writeHead(500).end()));
    const url = `http://127.0.0.1:${port}/api/health`;

    await expect(waitForHttp({ url, timeoutMs: 1000 })).rejects.toThrow(
      new RegExp(
        `http ${url.replaceAll('.', '\\.')} not ready after \\d+ ms \\(status 500, expected 200\\)`,
      ),
    );
  });

  it('fails when the accept check never passes even though the status is right', async () => {
    const port = await listen(
      http.createServer((_, res) => res.writeHead(200).end(JSON.stringify({ ok: false }))),
    );

    await expect(
      waitForHttp({
        url: `http://127.0.0.1:${port}/api/health`,
        timeoutMs: 1000,
        accept: async (response) => (await response.json()).ok === true,
      }),
    ).rejects.toThrow('answer not ready');
  });
});

describe('the command-line form', () => {
  it('parses a tcp and an http target and refuses a malformed one', () => {
    expect(parseCliArgs(['tcp', 'localhost:5433', '90']).target).toBe('localhost:5433');
    expect(parseCliArgs(['http', 'http://localhost:8025/api/v1/info', '90']).target).toBe(
      'http://localhost:8025/api/v1/info',
    );
    expect(parseCliArgs(['tcp', 'localhost:x', '90']).error).toMatch(/^Usage/);
    expect(parseCliArgs(['ftp', 'host', '5']).error).toMatch(/^Usage/);
    expect(parseCliArgs(['tcp', 'localhost:5433']).error).toMatch(/^Usage/);
  });

  it('exits 0 when the target is ready', async () => {
    const port = await listen(net.createServer((socket) => socket.end()));

    const run = spawnSync(process.execPath, [script, 'tcp', `127.0.0.1:${port}`, '5'], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(0);
    expect(run.stdout).toContain(`tcp 127.0.0.1:${port} ready after`);
  });

  it('exits 1 with a message naming the target when it is not ready in time', async () => {
    const port = await closedPort();

    const run = spawnSync(process.execPath, [script, 'tcp', `127.0.0.1:${port}`, '1'], {
      encoding: 'utf8',
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain(`tcp 127.0.0.1:${port} not ready after`);
  });
});
