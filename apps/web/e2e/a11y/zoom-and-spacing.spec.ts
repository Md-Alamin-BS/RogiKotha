import { expect, test, type Page } from '@playwright/test';

import { PROFILE_DOCTOR, R1_TITLE, WRITE_TARGET_DOCTOR } from '../fixtures/seed-facts';
import { reviewText, reviewTitle, textSentinel } from '../fixtures/synthetic';
import { registerConfirmed } from '../helpers/accounts';
import { chooseDoctor, chooseIdentityAndAttest, escapeRegExp } from '../helpers/content';
import { runId } from '../helpers/env';
import { forEachLocale, type Locale } from '../helpers/locale';
import { msg } from '../helpers/messages';
import { openByName, openExperienceByTitle } from '../helpers/reading';
import { applyTextSpacing, expectReflow } from '../helpers/spacing';

// BR3.8: at 200 % zoom (640x400 at a device scale factor of 2, the reflow equivalent of 1280x800
// at 200 %) and with the WCAG 1.4.12 text spacing, the doctor profile, the experience page, the
// register form and the composer through to its preview still work without horizontal scrolling or
// clipped text. Runs on chromium-desktop only (the project list pins it).

test.use({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 });
test.describe.configure({ timeout: 240_000 });

interface Surface {
  sentence: string;
  walk: (page: Page, locale: Locale) => Promise<void>;
}

async function composeToPreview(page: Page, locale: Locale): Promise<void> {
  await registerConfirmed(page, locale);
  const sentinel = textSentinel(runId(), test.info());
  await page.goto(`/${locale}/write`);
  await expect(page.getByTestId('composer')).toBeVisible();
  await expectReflow(page, 'composer step 1');

  await chooseDoctor(page, WRITE_TARGET_DOCTOR[locale]);
  await page.getByTestId('compose-relationship-options').getByRole('button').first().click();
  await page.getByTestId('compose-period').selectOption({ index: 1 });
  await page
    .getByTestId('compose-mode')
    .getByRole('button', { name: new RegExp(escapeRegExp(msg(locale, 'compose.mode.quick'))) })
    .click();

  await page.getByTestId('compose-step-2').click();
  await page.getByTestId('compose-title').fill(reviewTitle(locale, sentinel));
  await page.getByTestId('compose-story').fill(reviewText(sentinel));
  await page.getByTestId('compose-not-sure').first().click();
  await expectReflow(page, 'composer step 2');

  await page.getByTestId('compose-step-4').click();
  await chooseIdentityAndAttest(page, locale, 'pseudonymous');
  const details = page.getByTestId('compose-preview-details');
  if (await details.isVisible()) await details.locator('summary').click();
  await expect(page.getByTestId('compose-preview'), 'the preview step is reached').toBeVisible();
  await expect(page.getByTestId('compose-publish'), 'Publish stays reachable').toBeVisible();
  await expectReflow(page, 'composer step 4 (preview)');
}

const SURFACES: readonly Surface[] = [
  {
    sentence: 'doctor profile',
    walk: async (page, locale) => {
      await page.goto(`/${locale}/doctors`);
      await openByName(page, 'doctor-link', PROFILE_DOCTOR[locale]);
      await expect(page.locator('h1')).toHaveText(PROFILE_DOCTOR[locale]);
      await expectReflow(page, 'doctor profile');
    },
  },
  {
    sentence: 'experience r1',
    walk: async (page, locale) => {
      await openExperienceByTitle(page, locale, R1_TITLE[locale]);
      await expect(page.locator('h1')).toHaveText(R1_TITLE[locale]);
      await expectReflow(page, 'experience r1');
    },
  },
  {
    sentence: 'register form',
    walk: async (page, locale) => {
      await page.goto(`/${locale}/register`);
      await expect(page.locator('#f-register-email')).toBeVisible();
      await expectReflow(page, 'register');
      // Every control still takes input at this size.
      await page.locator('#f-register-email').fill('zoom@demo.rogikotha.local');
      await page.locator('#f-register-terms').check();
      await expectReflow(page, 'register (filled)');
    },
  },
  {
    sentence: 'composer to preview',
    walk: composeToPreview,
  },
];

for (const surface of SURFACES) {
  forEachLocale('A11Y zoom', `200 % zoom: ${surface.sentence}`, async ({ page, locale }) => {
    await surface.walk(page, locale);
  });

  forEachLocale(
    'A11Y spacing',
    `200 % zoom and text spacing: ${surface.sentence}`,
    async ({ page, locale }) => {
      await applyTextSpacing(page);
      await surface.walk(page, locale);
    },
  );
}
