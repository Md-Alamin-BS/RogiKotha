#!/usr/bin/env node
/**
 * tools/hover-probe.mjs — hover every interactive element in the admin
 * console and report computed text/background contrast for hover state.
 *
 *   node tools/hover-probe.mjs
 *
 * Used to confirm or refute detector findings that point at hover state,
 * before any code change. Closes the static-detector blind spot on :hover
 * (the contrast matrix can't see hover states either — only computed
 * hover styles in a real browser can).
 *
 * Preconditions (skip cleanly with exit 0 if any are missing):
 *   - puppeteer-core is installed   (npm install)
 *   - chromium binary is present    (npx playwright install chromium)
 *   - prototype server is up        (npm start)
 *
 * Exits non-zero if any LOW-contrast hover state is found. Exits zero
 * otherwise, even if it had to skip.
 */
import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';

// --- preconditions: skip cleanly when missing, like tools/smoke.mjs ---
let PUPPETEER_OK = true;
try { await import('puppeteer-core'); }
catch {
  console.log('SKIPPED - puppeteer-core is not installed.');
  console.log('  npm install        (once, at the repo root)');
  process.exit(0);
}
PUPPETEER_OK = true;

const CHROME = join(process.env.LOCALAPPDATA ?? join(tmpdir(), 'ms-playwright'),
                     'ms-playwright', 'chromium-1140', 'chrome-win', 'chrome.exe');
if (!existsSync(CHROME)) {
  console.log('SKIPPED - chromium binary not found at ' + CHROME);
  console.log('  npx playwright install chromium');
  console.log('  (or update CHROME path in tools/screenshots.mjs / tools/hover-probe.mjs)');
  process.exit(0);
}

// Server check: HEAD localhost:8137; skip if not up.
async function probeServer() {
  try {
    const r = await fetch('http://localhost:8137/ui-design-prototype/admin/index.html', { method: 'HEAD' });
    return r.ok;
  } catch { return false; }
}
if (!(await probeServer())) {
  console.log('SKIPPED - prototype server not running on http://localhost:8137');
  console.log('  npm start        (in another terminal)');
  process.exit(0);
}

const BASE = 'http://localhost:8137';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--user-data-dir=' + join(tmpdir(), 'rogikotha-hover-' + Date.now()),
  ],
});

// WCAG relative luminance
function rel(c) {
  const s = c.map(v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
  return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2];
}
function parseRgb(s) {
  const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [+m[1],+m[2],+m[3]] : null;
}
function ratio(fg, bg) {
  if (!fg || !bg) return null;
  const a = rel(fg), b = rel(bg);
  const [hi,lo] = a>b ? [a,b] : [b,a];
  return (hi+0.05) / (lo+0.05);
}

async function probe(page, theme, view) {
  console.log('\n=== theme=' + theme + ' view=' + view + ' ===');
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  // navigate to default view if not already there; admin sets view via hash
  if (view !== 'queue') {
    await page.evaluate((v) => { location.hash = '#' + v; }, view);
    await new Promise(r => setTimeout(r, 300));
  }
    // STORY-NFR-AA-HOVER-001: hover every interactive admin element (light + dark)
  const selectors = [
    '.btn.primary',
    '.btn.ghost',
    '.btn.danger',
    '.top-item',
    '.tab',
    '.side-tab',
    '.case-row',
    '.nav a',
    '.filter-pill',
  ];
  const findings = [];
  for (const sel of selectors) {
    const els = await page.$$(sel);
    for (const el of els) {
      const visible = await el.boundingBox();
      if (!visible) continue;
      const tag = await el.evaluate(e => e.tagName.toLowerCase());
      const text = (await el.evaluate(e => e.textContent || '')).trim().slice(0, 40);
      // base
      const base = await el.evaluate(e => {
        const s = getComputedStyle(e);
        return { color: s.color, bg: s.backgroundColor, parentBg: getComputedStyle(e.parentElement).backgroundColor };
      });
      // hover
      await el.hover();
      await new Promise(r => setTimeout(r, 80));
      const hover = await el.evaluate(e => {
        const s = getComputedStyle(e);
        return { color: s.color, bg: s.backgroundColor, parentBg: getComputedStyle(e.parentElement).backgroundColor };
      });
      const fg = parseRgb(hover.color);
      const bg = parseRgb(hover.bg);
      // if element bg is transparent/0, use parent
      const effBg = (bg && bg.some(v=>v>0)) ? bg : (parseRgb(hover.parentBg) || bg);
      const r = ratio(fg, effBg);
      const verdict = r == null ? '?' : (r < 3 ? 'LOW' : r < 4.5 ? 'OK-LG' : 'OK');
      const item = { sel, tag, text, baseColor: base.color, baseBg: base.bg, hoverColor: hover.color, hoverBg: hover.bg, parentBg: hover.parentBg, ratio: r ? r.toFixed(2) : '?', verdict };
      if (verdict === 'LOW') findings.push(item);
      console.log('  ' + verdict.padEnd(4) + ' ' + sel.padEnd(14) + ' ratio=' + String(r ? r.toFixed(2) : '?').padEnd(7) + ' hover=(' + hover.color + ' on ' + (effBg ? effBg.join(',') : 'transparent') + ') text="' + text + '"');
      // unhover
      await page.mouse.move(0, 0);
      await new Promise(r => setTimeout(r, 60));
    }
  }
  return findings;
}

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE + '/ui-design-prototype/admin/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 400));

const allFindings = [];
for (const theme of ['light', 'dark']) {
  const findings = await probe(page, theme, 'queue');
  allFindings.push({ theme, findings });
}

await browser.close();

console.log('\n=== FAILING ELEMENTS ===');
for (const { theme, findings } of allFindings) {
  if (!findings.length) continue;
  console.log('\n[theme=' + theme + ']');
  for (const f of findings) {
    console.log('  ' + f.sel + ' — hover (' + f.hoverColor + ') on parent-bg (' + f.parentBg + ') ratio=' + f.ratio + ' text="' + f.text + '"');
  }
}
console.log('\nTotal LOW-contrast hover states: ' + allFindings.reduce((n,f) => n+f.findings.length, 0));

// Exit code: 0 if no LOW-contrast hover states found, 2 otherwise.
// Code 2 chosen to match impeccable detector's exit convention so
// CI scripts can treat both uniformly.
const totalLow = allFindings.reduce((n, f) => n + f.findings.length, 0);
process.exit(totalLow === 0 ? 0 : 2);
