import { expect, test, type Page } from '@playwright/test';

import { WRITE_TARGET_DOCTOR } from '../fixtures/seed-facts';
import { reviewTitle, textSentinel } from '../fixtures/synthetic';
import { newRunAccount } from '../helpers/accounts';
import { escapeRegExp } from '../helpers/content';
import { runId } from '../helpers/env';
import {
  activate,
  chooseWithArrows,
  checkWithSpace,
  expectVisibleFocus,
  tabTo,
  typeInto,
} from '../helpers/keyboard';
import { forEachLocale, type Locale } from '../helpers/locale';
import { latestLink } from '../helpers/mailpit';
import { msg } from '../helpers/messages';

// BR3.3: register, confirm, sign in, the account sheet and the composer through to Publish with the
// keyboard only. After the first page.goto only page.keyboard acts; the emailed confirmation link
// arrives outside the page, so it is opened with page.goto (AC2.3.3). The report sheet is release 2.

test.describe.configure({ timeout: 240_000 });

const CLOCK_SLACK_MS = 1_000;
const STEP_HEADING = '#compose-step-heading';

forEachLocale('A11Y keyboard', 'skip link leads into the main content', async ({ page, open }) => {
  await open();
  const skip = page.locator('a.skip');

  await page.keyboard.press('Tab');
  await expect(skip, 'the first Tab stop is the skip link').toBeFocused();
  await expectVisibleFocus(page, 'skip link');
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  await expect
    .poll(() => page.evaluate(() => document.activeElement?.closest('#main') !== null), {
      message: 'the next Tab stop after the skip link is inside main',
    })
    .toBe(true);
  await expectVisibleFocus(page, 'first stop in main');
});

async function goToStep(page: Page, step: number): Promise<void> {
  await activate(page, page.getByTestId(`compose-step-${step}`), `composer step ${step}`);
  await expect(page.locator(STEP_HEADING), 'focus moves to the step heading').toBeFocused();
}

async function registerWithKeyboard(
  page: Page,
  account: ReturnType<typeof newRunAccount>,
): Promise<void> {
  const { locale } = account;
  await typeInto(page, page.locator('#f-register-email'), account.email, 'register email');
  await typeInto(page, page.locator('#f-register-password'), account.password, 'register password');
  await typeInto(page, page.locator('#f-register-username'), account.username, 'register username');
  await typeInto(
    page,
    page.locator('#f-register-displayName'),
    account.displayName,
    'register display name',
  );
  await checkWithSpace(page, page.locator('#f-register-age'), 'age confirmation');
  await checkWithSpace(page, page.locator('#f-register-terms'), 'terms');
  await activate(page, page.getByTestId('register-form-submit-button'), 'register submit');
  await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email(\\?|$)`));
}

async function confirmWithKeyboard(
  page: Page,
  account: ReturnType<typeof newRunAccount>,
  after: Date,
): Promise<void> {
  const { link } = await latestLink({
    to: account.email,
    subjectKey: 'email.verify.subject',
    locale: account.locale,
    pathPrefix: '/verify-email',
    after,
  });
  // The mail is read outside the page, so the link is the one allowed navigation.
  await page.goto(link);
  await activate(page, page.getByTestId('confirm-form-submit-button'), 'confirm submit');
  await expect(page).toHaveURL(new RegExp(`/${account.locale}/verify-email\\?confirmed=1`));
  await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
}

async function accountSheetRoundTrip(page: Page): Promise<void> {
  const trigger = page.getByTestId('masthead-account-menu-button');
  const dialog = page.getByRole('dialog');

  await activate(page, trigger, 'account menu button');
  await expect(dialog, 'Enter opens the account sheet').toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog, 'Escape closes the account sheet').toBeHidden();
  await expect(trigger, 'focus returns to the account button').toBeFocused();
  await expectVisibleFocus(page, 'account menu button after Escape');
}

async function signOutWithKeyboard(page: Page): Promise<void> {
  await activate(page, page.getByTestId('masthead-account-menu-button'), 'account menu button');
  await activate(page, page.getByTestId('account-menu-sign-out-button'), 'sign out');
  await expect(page.getByTestId('masthead-account-sign-in-link')).toBeVisible();
}

async function signInWithKeyboard(
  page: Page,
  locale: Locale,
  account: ReturnType<typeof newRunAccount>,
): Promise<void> {
  await activate(page, page.getByTestId('masthead-account-sign-in-link'), 'sign-in link');
  await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in`));
  await typeInto(page, page.locator('#f-signin-email'), account.email, 'sign-in email');
  await typeInto(page, page.locator('#f-signin-password'), account.password, 'sign-in password');
  // Enter inside the password field submits the form.
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/${locale}/me$`));
  await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
}

async function composeAndPublishWithKeyboard(page: Page, locale: Locale): Promise<void> {
  const sentinel = textSentinel(runId(), test.info());
  const title = reviewTitle(locale, sentinel);

  await activate(page, page.locator('a.cta-write'), 'write link');
  await expect(page).toHaveURL(new RegExp(`/${locale}/write$`));
  await expect(page.getByTestId('composer')).toBeVisible();

  // Step 1: the doctor, relationship, period and the detailed mode.
  await chooseWithArrows(
    page,
    page.getByTestId('compose-doctor'),
    WRITE_TARGET_DOCTOR[locale],
    'doctor',
  );
  await activate(
    page,
    page.getByTestId('compose-relationship-options').getByRole('button').first(),
    'relationship',
  );
  await chooseWithArrows(
    page,
    page.getByTestId('compose-period'),
    await page.getByTestId('compose-period').locator('option').nth(1).innerText(),
    'period',
  );
  await activate(
    page,
    page.getByTestId('compose-mode').getByRole('button', {
      name: new RegExp(escapeRegExp(msg(locale, 'compose.mode.detailed'))),
    }),
    'detailed mode',
  );

  // Step 2: the story.
  await goToStep(page, 2);
  await typeInto(page, page.getByTestId('compose-title'), title, 'title');
  for (const section of ['symptoms', 'diagnosis', 'treatment', 'after']) {
    await typeInto(
      page,
      page.getByTestId(`compose-${section}`),
      `${section} ${sentinel}`,
      `${section} section`,
    );
  }
  await activate(page, page.getByTestId('compose-not-sure').first(), 'not sure');

  // Step 3: one Reviewer's label; sentiment stays empty.
  await goToStep(page, 3);
  await activate(page, page.getByTestId('compose-claims').getByRole('button').first(), 'label');

  // Step 4: anonymous, every attestation, Publish.
  await goToStep(page, 4);
  await activate(
    page,
    page.getByTestId('compose-identity-options').getByRole('button', {
      name: new RegExp(`^${escapeRegExp(msg(locale, 'compose.identity.anon'))}`),
    }),
    'anonymous identity',
  );
  for (const box of await page.getByTestId('compose-attestation').getByRole('checkbox').all()) {
    await checkWithSpace(page, box, 'attestation');
  }
  await activate(page, page.getByTestId('compose-publish'), 'publish');
  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/?#]+`));
  await expect(page.locator('h1')).toHaveText(title);
}

forEachLocale(
  'A11Y keyboard',
  'register, confirm, account sheet, sign out, sign in, compose and publish',
  async ({ page, locale, open }) => {
    const account = newRunAccount(locale);
    const after = new Date(Date.now() - CLOCK_SLACK_MS);

    await open('/register');
    await registerWithKeyboard(page, account);
    await confirmWithKeyboard(page, account, after);
    await accountSheetRoundTrip(page);
    await signOutWithKeyboard(page);
    await signInWithKeyboard(page, locale, account);
    await composeAndPublishWithKeyboard(page, locale);
  },
);

// Shift+Tab reaches the same controls backwards: the language toggle from the first main stop.
forEachLocale('A11Y keyboard', 'Shift+Tab walks back to the skip link', async ({ page, open }) => {
  await open();
  const skip = page.locator('a.skip');
  await tabTo(page, page.locator('a#lang'), 'language toggle');
  await tabTo(page, skip, 'skip link, walking back');
  await expect(skip).toBeFocused();
});
