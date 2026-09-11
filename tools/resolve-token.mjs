#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const BASE = 'http://localhost:8137';
const CHROME = join(process.env.LOCALAPPDATA ?? join(tmpdir(), 'ms-playwright'),
                     'ms-playwright', 'chromium-1140', 'chrome-win', 'chrome.exe');

if (!existsSync(CHROME)) { console.error('no chromium'); process.exit(2); }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
         '--user-data-dir=' + join(tmpdir(), 'rogikotha-tok-' + Date.now())],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

for (const theme of ['light', 'dark']) {
  await page.goto(BASE + '/ui-design-prototype/admin/index.html', { waitUntil: 'networkidle0' });
  await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await new Promise(r => setTimeout(r, 200));
  const resolved = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;';
    const tokens = ['--accent-soft', '--accent', '--accent-2', '--accent-ink', '--ink', '--surface-hover', '--fill-secondary', '--glass-2', '--bg'];
    document.body.appendChild(probe);
    const out = {};
    for (const t of tokens) {
      probe.style.color = 'var(' + t + ')';
      out[t] = getComputedStyle(probe).color;
    }
    document.body.removeChild(probe);
    return out;
  });
  console.log('\n[' + theme + ']');
  for (const [k, v] of Object.entries(resolved)) {
    console.log('  ' + k.padEnd(20) + ' = ' + v);
  }
}

await browser.close();
