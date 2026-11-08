// Playwright's webServer can only pipe the server's output into its own reporter; the log scan
// (BR2.8) needs it in a file, so this starts `next start` and writes its output to web.log.
// Usage: node e2e/helpers/web-server.mjs <host> <port>
import { spawn } from 'node:child_process';
import console from 'node:console';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const [host = '127.0.0.1', port = '3107'] = process.argv.slice(2);
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Playwright starts this before the global setup, so the BR1.8 build check runs here first.
if (!existsSync(path.join(webDir, '.next', 'BUILD_ID'))) {
  console.error('No build found: run pnpm build (or pnpm check) first');
  process.exit(1);
}

const logDir = path.join(webDir, 'test-results', 'logs');
mkdirSync(logDir, { recursive: true });
// One run's lines only, so the log scan never reads an earlier run.
const log = createWriteStream(path.join(logDir, 'web.log'), { flags: 'w' });

const nextBin = createRequire(path.join(webDir, 'package.json')).resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'start', '--hostname', host, '--port', port], {
  cwd: webDir,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
child.on('exit', (code, signal) => {
  log.end(() => process.exit(code ?? (signal ? 1 : 0)));
});
