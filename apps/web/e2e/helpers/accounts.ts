import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { displayName, RUN_PASSWORD, runEmail, runUsername } from '../fixtures/synthetic';
import { runId } from './env';
import type { Locale } from './locale';
import { latestLink } from './mailpit';

// BR1.5: each test registers its own account through the UI; seeded accounts are read only.

export interface RunAccount {
  username: string;
  email: string;
  password: string;
  displayName: string;
  locale: Locale;
}

// Mailpit stamps `Created` itself; a second of slack keeps a fast mail from looking older.
const CLOCK_SLACK_MS = 1_000;

export function newRunAccount(locale: Locale, index = 0): RunAccount {
  const username = runUsername(runId(), test.info());
  return {
    username,
    email: runEmail(username),
    password: RUN_PASSWORD,
    displayName: displayName(locale, index),
    locale,
  };
}

/** Fills and submits the register form that is already open; lands on the pending screen. */
export async function fillRegistration(page: Page, account: RunAccount): Promise<void> {
  const { locale } = account;
  await page.locator('#f-register-email').fill(account.email);
  await page.locator('#f-register-password').fill(account.password);
  await page.locator('#f-register-username').fill(account.username);
  await page.locator('#f-register-displayName').fill(account.displayName);
  await page.locator('#f-register-age').check();
  await page.locator('#f-register-terms').check();
  await page.getByTestId('register-form-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email(\\?|$)`));
}

/** Opens the register page, then fills and submits it. */
export async function submitRegistration(page: Page, account: RunAccount): Promise<void> {
  await page.goto(`/${account.locale}/register`);
  await fillRegistration(page, account);
}

/** A second browser context with the project's base URL: another device, another cookie jar. */
export async function secondDevice(
  browser: Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const baseURL = test.info().project.use.baseURL;
  const context = await browser.newContext(baseURL ? { baseURL } : {});
  return { context, page: await context.newPage() };
}

/** Ends the session through the account menu. */
export async function signOut(page: Page): Promise<void> {
  await page.getByTestId('masthead-account-menu-button').click();
  await page.getByTestId('account-menu-sign-out-button').click();
  await expect(page.getByTestId('masthead-account-sign-in-link')).toBeVisible();
}

/** Opens the emailed link and confirms; the confirmation signs the account in (U9 WF3). */
export async function confirmFromMail(
  page: Page,
  account: RunAccount,
  after: Date,
): Promise<string> {
  const { link } = await latestLink({
    to: account.email,
    subjectKey: 'email.verify.subject',
    locale: account.locale,
    pathPrefix: '/verify-email',
    after,
  });
  await page.goto(link);
  await page.getByTestId('confirm-form-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`/${account.locale}/verify-email\\?confirmed=1`));
  await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
  return link;
}

/** A fresh synthetic account, registered, confirmed through Mailpit and signed in. */
export async function registerConfirmed(
  page: Page,
  locale: Locale,
  index = 0,
): Promise<RunAccount> {
  const account = newRunAccount(locale, index);
  const after = new Date(Date.now() - CLOCK_SLACK_MS);
  await submitRegistration(page, account);
  await confirmFromMail(page, account, after);
  return account;
}

export async function signIn(
  page: Page,
  locale: Locale,
  credentials: { email: string; password: string },
  next?: string,
): Promise<void> {
  await page.goto(`/${locale}/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  await page.locator('#f-signin-email').fill(credentials.email);
  await page.locator('#f-signin-password').fill(credentials.password);
  await page.getByTestId('signin-form-submit-button').click();
  await expect(page).toHaveURL(next ? new RegExp(`${next}$`) : new RegExp(`/${locale}/me$`));
  await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
}
