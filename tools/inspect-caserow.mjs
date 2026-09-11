#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

const BASE = 'http://localhost:8137';
const CHROME = join(process.env.LOCALAPPDATA ?? join(tmpdir(), 'ms-playwright'),
                     'ms-playwright', 'chromium-1140', 'chrome-win', 'chrome.exe');
if (!existsSync(CHROME)) process.exit(2);
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
         '--user-data-dir=' + join(tmpdir(), 'rogikotha-caserow-' + Date.now())],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE + '/ui-design-prototype/admin/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 300));

const out = await page.evaluate(() => {
  const row = document.querySelector('.case-row');
  if (!row) return { error: 'no case-row' };
  const cs = getComputedStyle(row);
  const r = {};
  r.rowClass = row.className;
  r.rowBg = cs.backgroundColor;
  r.rowColor = cs.color;
  // climb up to find first non-transparent ancestor
  let p = row.parentElement;
  const ancestors = [];
  while (p && ancestors.length < 6) {
    const ps = getComputedStyle(p);
    ancestors.push({
      tag: p.tagName.toLowerCase() + (p.id ? '#' + p.id : '') + (p.className ? '.' + String(p.className).split(' ').join('.') : ''),
      bg: ps.backgroundColor,
      color: ps.color,
    });
    p = p.parentElement;
  }
  r.ancestors = ancestors;
  // check the case element inside
  const c = row.querySelector('.case');
  if (c) {
    const ccs = getComputedStyle(c);
    r.caseBg = ccs.backgroundColor;
    r.caseColor = ccs.color;
  }
  return r;
});
console.log(JSON.stringify(out, null, 2));

// also hover and recheck
const row = await page.$('.case-row');
if (row) {
  await row.hover();
  await new Promise(r => setTimeout(r, 120));
  const hoverState = await page.evaluate(() => {
    const row = document.querySelector('.case-row');
    const cs = getComputedStyle(row);
    const c = row.querySelector('.case');
    const ccs = c ? getComputedStyle(c) : null;
    return {
      rowBg: cs.backgroundColor,
      rowColor: cs.color,
      caseBg: ccs?.backgroundColor,
      caseColor: ccs?.color,
    };
  });
  console.log('\nAfter hover:');
  console.log(JSON.stringify(hoverState, null, 2));
}

await browser.close();
