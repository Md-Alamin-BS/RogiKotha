#!/usr/bin/env node
/**
 * tools/serve.mjs — tiny static server for the prototype. No dependencies.
 *
 *   node tools/serve.mjs        # or: pnpm tools:serve   (default port 8137)
 *
 * The prototype is plain files and opens fine from file://, but a server
 * keeps hash routes, localStorage origins and the two apps behaving the way
 * they will in production. Serves the repo root read-only; GET/HEAD only.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PORT = Number(process.env.PORT || 8137);
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.woff2':'font/woff2' };

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  try {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    // normalize() collapses any ../ before it can escape ROOT
    // normalize() collapses ../ ; the startsWith(ROOT) check below is the guard
    let p = join(ROOT, normalize(url));
    if (!p.startsWith(ROOT)) { res.writeHead(403).end('forbidden'); return; }
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream',
                         'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); }
}).listen(PORT, () => {
  const base = `http://localhost:${PORT}/ui-design-prototype/`;
  console.log('RogiKotha prototype served from ' + ROOT);
  console.log('  gallery : ' + base + 'index.html');
  console.log('  patient : ' + base + 'concepts/concept-04b-quiet-clinic-minimal/index.html');
  console.log('  admin   : ' + base + 'admin/index.html');
  console.log('\nCtrl+C to stop.');
});
