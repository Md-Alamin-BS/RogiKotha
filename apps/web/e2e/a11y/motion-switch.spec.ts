import { expect, test, type Locator, type Page } from '@playwright/test';

import { R1_TITLE } from '../fixtures/seed-facts';
import { forEachLocale } from '../helpers/locale';
import {
  expectNeverAnimated,
  longOrLooping,
  reducedMotionViolations,
  sampleAnimations,
} from '../helpers/motion';
import { openExperienceByTitle } from '../helpers/reading';

// BR4.2, BR4.3, BR4.6: the app's reduce-motion switch by cookie and flipped mid-session (ISS-323),
// the never-animated elements during a route change, and nothing that loops or plays past 5 s.
// The same file runs under chromium-reduced-motion with the operating-system setting (BR4.1).

const STATIC_SELECTORS = [
  'p.demo[role="note"]',
  '[data-static="disclaimer"]',
  '[data-static="emergency"]',
  // The /emergency page is itself the guidance; motion.css holds it static (ISS-763).
  '#view-emergency',
];
const SETTLE_AFTER_MS = 6_000;

/** Runs the action while sampling animations, so a short fade that starts and ends is still seen. */
async function sampledDuring(page: Page, action: () => Promise<void>) {
  const sampling = sampleAnimations(page);
  await action();
  return sampling;
}

/** How many animations ran on the static elements in the next frames of the page. */
async function staticAnimationsDuring(page: Page, action: () => Promise<void>): Promise<number> {
  const watching = page.evaluate(
    async ({ selectors, frames }) => {
      let seen = 0;
      for (let frame = 0; frame < frames; frame += 1) {
        for (const element of document.querySelectorAll(selectors.join(','))) {
          seen += element.getAnimations({ subtree: true }).length;
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      return seen;
    },
    { selectors: STATIC_SELECTORS, frames: 40 },
  );
  await action();
  return watching;
}

async function hydrated(page: Page): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready', '');
}

async function clickTab(page: Page, tab: 'doctors' | 'facilities', locale: string): Promise<void> {
  const link = page.locator(`nav.tabs a[data-nav="${tab}"]`);
  // ASSUMPTION(U50): where the narrow layout hides the tab bar, the page is opened directly.
  if (await link.isVisible()) await link.click();
  else await page.goto(`/${locale}/${tab}`);
  await expect(page).toHaveURL(new RegExp(`/${tab}$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

forEachLocale('A11Y motion', 'cookie switch reduces motion', async ({ page, context, locale }) => {
  const baseURL = test.info().project.use.baseURL ?? '';
  await context.addCookies([{ name: 'rk.motion', value: 'off', url: baseURL }]);
  await page.goto(`/${locale}`);
  await hydrated(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(page.locator('#motion')).toHaveAttribute('aria-pressed', 'true');

  const samples = await sampledDuring(page, () => clickTab(page, 'doctors', locale));
  expect(reducedMotionViolations(samples), 'animations beyond a 100 ms opacity fade').toEqual([]);
});

forEachLocale('A11Y motion', 'switch flipped mid-session (ISS-323)', async ({ page, locale }) => {
  await page.goto(`/${locale}`);
  await hydrated(page);
  const control = page.locator('#motion');
  await expect(control, 'a fresh visitor has motion on').toHaveAttribute('aria-pressed', 'false');

  await control.click();
  await expect(control).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');

  const first = await sampledDuring(page, () => clickTab(page, 'doctors', locale));
  expect(reducedMotionViolations(first), 'movement on the next route change').toEqual([]);
  const second = await sampledDuring(page, () => clickTab(page, 'facilities', locale));
  expect(reducedMotionViolations(second), 'movement on the route change after that').toEqual([]);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
});

async function expectStaticStill(page: Page): Promise<void> {
  const marker = page.locator('p.demo[role="note"]').first();
  await expectNeverAnimated(marker, 'demo marker');
  for (const selector of STATIC_SELECTORS.slice(1)) {
    const elements: Locator = page.locator(selector);
    for (const element of await elements.all()) {
      if (await element.isVisible()) await expectNeverAnimated(element, selector);
    }
  }
}

forEachLocale(
  'A11Y motion',
  'demo marker, disclaimer and emergency guidance never animate on a route change',
  async ({ page, locale }) => {
    await page.goto(`/${locale}`);
    await hydrated(page);
    await expectStaticStill(page);

    const moved = await staticAnimationsDuring(page, () => clickTab(page, 'doctors', locale));
    expect(moved, 'animations on the static elements during the route change').toBe(0);
    await expectStaticStill(page);

    await page.goto(`/${locale}/emergency`);
    await hydrated(page);
    await expect(page.locator('#view-emergency')).toBeVisible();
    await expectStaticStill(page);
  },
);

async function expectNothingLongRunning(page: Page, label: string): Promise<void> {
  // Bounded wait on the page's own clock (time since navigation), never a fixed sleep.
  await expect
    .poll(() => page.evaluate(() => performance.now()), {
      message: `${label}: waiting for ${SETTLE_AFTER_MS} ms after load`,
      timeout: 20_000,
      intervals: [250, 500, 1_000],
    })
    .toBeGreaterThan(SETTLE_AFTER_MS);
  expect(
    longOrLooping(await sampleAnimations(page, 10)),
    `${label}: looping or long animation`,
  ).toEqual([]);
}

forEachLocale('A11Y motion', 'nothing loops or plays past 5 s on home and r1', async (args) => {
  const { page, locale } = args;
  await page.goto(`/${locale}`);
  await hydrated(page);
  await expectNothingLongRunning(page, `/${locale}`);

  await openExperienceByTitle(page, locale, R1_TITLE[locale]);
  await page.reload();
  await hydrated(page);
  await expectNothingLongRunning(page, `/${locale}/experiences/r1`);
});
