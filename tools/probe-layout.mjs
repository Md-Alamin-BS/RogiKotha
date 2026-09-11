import puppeteer from 'puppeteer-core';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = join(process.env.LOCALAPPDATA ?? join(tmpdir(), 'ms-playwright'),
                     'ms-playwright', 'chromium-1140', 'chrome-win', 'chrome.exe');

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
         '--user-data-dir=' + join(tmpdir(), 'probe-' + Date.now())],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:8137/ui-design-prototype/admin/index.html#queue', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

const out = await page.evaluate(() => {
  const side = document.querySelector('.p-side');
  const sidePanel = document.querySelector('.p-side .panel');
  const kicker = document.querySelector('.p-side .kicker');
  const note = document.querySelector('.p-grid > div > p.note');
  const grid = document.querySelector('.p-grid');
  const leftCol = document.querySelector('.p-grid > div:first-child');
  return {
    sideComputedPosition: getComputedStyle(side).position,
    sideComputedAlignSelf: getComputedStyle(side).alignSelf,
    gridRowTop: grid.getBoundingClientRect().top,
    gridRowHeight: grid.getBoundingClientRect().height,
    leftColTop: leftCol.getBoundingClientRect().top,
    leftColHeight: leftCol.getBoundingClientRect().height,
    sideTop: side.getBoundingClientRect().top,
    sidePanelTop: sidePanel.getBoundingClientRect().top,
    sidePanelHeight: sidePanel.getBoundingClientRect().height,
    kickerTop: kicker.getBoundingClientRect().top,
    noteTop: note.getBoundingClientRect().top,
    noteTextRect: note.getBoundingClientRect(),
  };
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
