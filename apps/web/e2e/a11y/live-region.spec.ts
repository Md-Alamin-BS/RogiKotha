import { expect, type Locator, type Page } from '@playwright/test';

import { forEachLocale, type Locale } from '../helpers/locale';
import { msg } from '../helpers/messages';
import { switchLanguage } from '../helpers/reading';

// BR3.7: the CR-004 announcements on the walked pages: language, theme and view, each in bn and
// en. The region clears itself after one second, so every step first waits for it to be empty.

const viewAnnouncement = (locale: Locale, nameKey: string): string =>
  msg(locale, 'a11y.announce.view', { view: msg(locale, nameKey) });

/** The arrival announcement of the home page, then the region emptying again. */
async function settleOnHome(live: Locator, locale: Locale): Promise<void> {
  await expect(live, 'the arrival announces the view').toHaveText(
    viewAnnouncement(locale, 'nav.discover'),
  );
  await expect(live).toBeEmpty();
}

forEachLocale('A11Y live-region', 'language toggle announces the new language', async (args) => {
  const { page, locale, open } = args;
  const live = page.locator('#sr-live');
  await open();
  await settleOnHome(live, locale);

  const to = await switchLanguage(page, locale);
  await expect(live).toBeEmpty();

  // And back, so both announcements are heard whichever language the test starts in.
  const back = await switchLanguage(page, to);
  expect(back).toBe(locale);
});

async function isDark(page: Page): Promise<boolean> {
  // ASSUMPTION(U50): no theme cookie is set in a fresh context, so the effective theme is the
  // browser's colour scheme, which the projects fix (light; dark in chromium-reduced-motion).
  return page.evaluate(() => {
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
}

forEachLocale('A11Y live-region', 'theme toggle announces dark then light', async (args) => {
  const { page, locale, open } = args;
  const live = page.locator('#sr-live');
  await open();
  await settleOnHome(live, locale);

  const dark = 'a11y.announce.themeDark';
  const light = 'a11y.announce.themeLight';
  const [first, second] = (await isDark(page)) ? [light, dark] : [dark, light];

  await page.locator('#theme').click();
  await expect(live).toHaveText(msg(locale, first));
  await expect(live).toBeEmpty();

  await page.locator('#theme').click();
  await expect(live).toHaveText(msg(locale, second));
});

forEachLocale('A11Y live-region', 'route change announces the view', async (args) => {
  const { page, locale, open } = args;
  const live = page.locator('#sr-live');
  await open();
  await settleOnHome(live, locale);

  const tab = page.locator('nav.tabs a[data-nav="doctors"]');
  // ASSUMPTION(U50): where the narrow layout hides the tab bar, the page is opened directly; the
  // arrival announcement is the same one.
  if (await tab.isVisible()) await tab.click();
  else await page.goto(`/${locale}/doctors`);
  await expect(page).toHaveURL(new RegExp(`/${locale}/doctors$`));
  await expect(live).toHaveText(viewAnnouncement(locale, 'nav.profile'));
});
