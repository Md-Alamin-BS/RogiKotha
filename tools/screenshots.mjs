#!/usr/bin/env node
/**
 * tools/screenshots.mjs — capture screenshots of the running prototype.
 *
 *   node tools/screenshots.mjs
 *
 * Hard-codes localhost:8137, writes to %TEMP%\rogikotha-screens\.
 * Uses puppeteer-core driving the chromium already cached at
 * %LOCALAPPDATA%\ms-playwright\chromium-1140 (no download).
 *
 * No remote URLs are ever passed. The list of routes is the only
 * `goto()` surface — adding a new route requires editing this file.
 */
import puppeteer from 'puppeteer-core';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, platform } from 'node:os';
import { existsSync } from 'node:fs';

const BASE  = 'http://localhost:8137';
const OUT   = join(tmpdir(), 'rogikotha-screens');
const CHROME = join(process.env.LOCALAPPDATA ?? join(tmpdir(), 'ms-playwright'),
                     'ms-playwright', 'chromium-1140', 'chrome-win', 'chrome.exe');

// Hard-coded routes — only localhost:8137, ever.
const ROUTES = [
  // (filename, viewport, path)
  ['gallery-desktop',     { width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 }, '/ui-design-prototype/index.html'],
  ['patient-discover',    { width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 }, '/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html'],
  ['patient-discover-mobile', { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, hasTouch: true }, '/ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/index.html'],
  ['admin-desktop',       { width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 }, '/ui-design-prototype/admin/index.html'],
  ['admin-mobile',        { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2, hasTouch: true }, '/ui-design-prototype/admin/index.html'],
  ['admin-hover-state',   { width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 }, '/ui-design-prototype/admin/index.html'],
];

// Pages where we also capture a hover state — assert the bug fix is visible.
const HOVER_TARGETS = {
  'admin-hover-state': { selector: '.case-row:nth-child(2)', label: 'Row hover (was sub-AA)' },
};

if (!existsSync(CHROME)) {
  console.error('chromium binary not found at ' + CHROME);
  console.error('either install playwright browsers (`npx playwright install chromium`)');
  console.error('or update CHROME path in this file');
  process.exit(2);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

console.log('Launching chromium…');
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--user-data-dir=' + join(tmpdir(), 'rogikotha-shot-profile-' + Date.now()),
    '--no-default-browser-check',
    '--disable-features=Translate,OptimizationHints,IsolateOrigins,site-per-process',
  ],
});

const results = [];
for (const [name, viewport, path] of ROUTES) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  const url = BASE + path;
  console.log('  capture ' + name + ' ← ' + url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 400)); // let fonts settle

  // Hover state capture (if registered): hover the target before screenshot.
  const hover = HOVER_TARGETS[name];
  if (hover) {
    try {
      const el = await page.$(hover.selector);
      if (el) {
        await el.hover();
        await new Promise(r => setTimeout(r, 200));
        console.log('           hover on ' + hover.selector + ' (' + hover.label + ')');
      }
    } catch (e) { console.warn('           hover skipped: ' + e.message); }
  }

  const file = join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: true });
  const dim = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
  }));
  results.push({ name, url, file, viewport, doc: dim, hover: !!hover });
  await page.close();
}

await browser.close();

console.log('\nWrote ' + results.length + ' screenshots to ' + OUT);
for (const r of results) {
  console.log('  ' + r.name.padEnd(28) + ' → ' + r.file + '  (doc ' + r.doc.w + '×' + r.doc.h + ')');
}
