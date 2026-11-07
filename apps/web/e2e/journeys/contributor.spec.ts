import { expect, test } from '@playwright/test';

import { R1_TITLE } from '../fixtures/seed-facts';
import { CHANGED_PASSWORD, RUN_PASSWORD, runEmail } from '../fixtures/synthetic';
import {
  fillRegistration,
  newRunAccount,
  registerConfirmed,
  secondDevice,
  signIn,
  signOut,
  submitRegistration,
  type RunAccount,
} from '../helpers/accounts';
import { describeEachLocale, forEachLocale } from '../helpers/locale';
import { expectCleanMail, hasNoMessageSince, latestLink, waitForMessage } from '../helpers/mailpit';
import { msg } from '../helpers/messages';
import { checkPage } from '../helpers/page-check';
import { openExperienceByTitle } from '../helpers/reading';

// WF2 Part 2: becoming a contributor, in bn then en (BR2.2, BR3.4, BR6.3). Every account is
// synthetic and made by the test itself (BR1.5); the one ordered group is the P2.8 account.

const CLOCK_SLACK_MS = 1_000;
const since = (): Date => new Date(Date.now() - CLOCK_SLACK_MS);

describeEachLocale('P2.8', 'register, confirm, sign in, reset', (locale, title) => {
  let account: RunAccount;

  test(title('P2.8', 'register and confirm'), async ({ page, browser }) => {
    account = newRunAccount(locale);
    await openExperienceByTitle(page, locale, R1_TITLE[locale]);

    // ASSUMPTION(U50): the masthead write link is the first link to /write; where the narrow
    // layout hides it, the page is opened directly.
    const write = page.locator(`a[href="/${locale}/write"]`).first();
    if (await write.isVisible()) await write.click();
    else await page.goto(`/${locale}/write`);
    await expect(page).toHaveURL(new RegExp(`/${locale}/write$`));

    const gate = page.getByTestId('contribution-gate');
    await expect(gate).toHaveAttribute('data-access', 'signed-out');
    await expect(gate).toContainText(msg(locale, 'auth.gate.title'));
    await expect(gate).toContainText(msg(locale, 'auth.gate.writeBody'));
    for (const link of ['contribution-gate-sign-in', 'contribution-gate-register']) {
      const href = (await gate.getByTestId(link).getAttribute('href')) ?? '';
      expect(decodeURIComponent(href), `${link} carries next`).toContain(`next=/${locale}/write`);
    }
    await checkPage(page, locale, { label: `/${locale}/write (signed out)` });

    await gate.getByTestId('contribution-gate-register').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/register`));
    const after = since();
    await fillRegistration(page, account);

    await expect(page.locator('h1')).toHaveText(msg(locale, 'auth.verify.title'));
    await expect(page.getByTestId('verify-pending-panel')).toContainText(
      msg(locale, 'auth.verify.body', { email: account.email }),
    );
    await checkPage(page, locale, { label: `/${locale}/verify-email (pending)` });

    const { link, message } = await latestLink({
      to: account.email,
      subjectKey: 'email.verify.subject',
      locale,
      pathPrefix: '/verify-email',
      after,
    });
    expectCleanMail(message, locale, 'email.verify.subject');

    // Opening the link confirms nothing by itself.
    await page.goto(link);
    await expect(page.getByTestId('confirm-form-submit-button')).toBeVisible();
    const other = await secondDevice(browser);
    try {
      await signIn(other.page, locale, account, `/${locale}/write`);
      const unconfirmed = other.page.getByTestId('contribution-gate');
      await expect(unconfirmed).toHaveAttribute('data-access', 'unconfirmed');
      await expect(unconfirmed).toContainText(msg(locale, 'auth.gate.verifyToAct'));
    } finally {
      await other.context.close();
    }

    await page.getByTestId('confirm-form-submit-button').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email\\?confirmed=1`));
    const done = page.getByTestId('verify-done-panel');
    await expect(done).toContainText(msg(locale, 'auth.verify.done'));
    await expect(done.locator('.publish-tick')).toHaveCount(1);
    await expect(page.getByTestId('verify-continue-link')).toHaveAttribute(
      'href',
      new RegExp(`/${locale}/write$`),
    );
  });

  test(title('P2.8b', 'sign in'), async ({ page }) => {
    await signIn(page, locale, account, `/${locale}/write`);
    await expect(page.getByTestId('composer')).toBeVisible();
    await expect(page.getByTestId('contribution-gate')).toHaveCount(0);
    await checkPage(page, locale, { label: `/${locale}/write (composer)`, disclaimer: true });

    await signOut(page);
    await signIn(page, locale, account);
    await checkPage(page, locale, { label: `/${locale}/me` });
  });

  test(title('P2.10b', 'reset password'), async ({ page }) => {
    const unknown = runEmail(`unknown${account.username}`);
    const sent = msg(locale, 'auth.reset.sent');

    // The unknown address goes first: when the known address's mail has arrived, any mail for the
    // unknown one would have arrived before it.
    const after = since();
    for (const email of [unknown, account.email]) {
      await page.goto(`/${locale}/reset-password`);
      await page.locator('#f-reset-request-email').fill(email);
      await page.getByTestId('reset-request-form-submit-button').click();
      await expect(page.getByTestId('reset-request-notice')).toHaveText(sent);
    }
    await checkPage(page, locale, { label: `/${locale}/reset-password (sent)` });

    const { link, message } = await latestLink({
      to: account.email,
      subjectKey: 'email.reset.subject',
      locale,
      pathPrefix: '/reset-password',
      after,
    });
    expectCleanMail(message, locale, 'email.reset.subject');
    expect(await hasNoMessageSince(unknown, after), 'a reset mail to an unknown address').toBe(
      true,
    );

    await page.goto(link);
    await page.locator('#f-set-password-newPassword').fill(CHANGED_PASSWORD);
    await page.locator('#f-set-password-confirmPassword').fill(`${CHANGED_PASSWORD}-other`);
    await page.getByTestId('set-password-form-submit-button').click();
    await expect(page.getByText(msg(locale, 'auth.reset.mismatch')).first()).toBeVisible();

    await page.locator('#f-set-password-newPassword').fill(CHANGED_PASSWORD);
    await page.locator('#f-set-password-confirmPassword').fill(CHANGED_PASSWORD);
    await page.getByTestId('set-password-form-submit-button').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in\\?reset=done`));
    await expect(page.getByTestId('auth-notice')).toContainText(msg(locale, 'auth.reset.done'));

    // The old password gets the neutral message; the new one signs in.
    await page.locator('#f-signin-email').fill(account.email);
    await page.locator('#f-signin-password').fill(RUN_PASSWORD);
    await page.getByTestId('signin-form-submit-button').click();
    await expect(page.getByTestId('signin-form-error-summary')).toContainText(
      msg(locale, 'errors.auth.invalidCredentials'),
    );
    await signIn(page, locale, { email: account.email, password: CHANGED_PASSWORD });
  });
});

forEachLocale('P2.8c', 'invalid form', async ({ page, locale, open }) => {
  const refused = newRunAccount(locale, 1);
  await open('/register');
  await page.locator('#f-register-email').fill(refused.email);
  await page.locator('#f-register-password').fill(refused.password);
  await page.locator('#f-register-displayName').fill(refused.displayName);
  await page.locator('#f-register-age').check();
  const after = since();
  await page.getByTestId('register-form-submit-button').click();

  const summary = page.getByTestId('register-form-error-summary');
  await expect(summary).toBeVisible();
  await expect(summary, 'the summary is a live region').toHaveAttribute('role', 'alert');
  await expect(page).toHaveURL(new RegExp(`/${locale}/register`));

  const fields = [
    { id: 'username', key: 'errors.auth.usernameInvalid' },
    { id: 'terms', key: 'errors.auth.termsRequired' },
  ];
  for (const { id, key } of fields) {
    const input = page.locator(`#f-register-${id}`);
    await expect(input, `${id} is marked invalid`).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await input.getAttribute('aria-describedby');
    expect(describedBy, `${id} points at its error`).toBeTruthy();
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText(msg(locale, key));
    await expect(summary.locator(`a[href="#f-register-${id}"]`)).toHaveText(msg(locale, key));
  }
  await checkPage(page, locale, { label: `/${locale}/register (refused)` });

  // Fixing the form with a second address proves nothing was created for the first: the outbox
  // delivers in order, so the second address's mail arriving first would show a first one too.
  const accepted = newRunAccount(locale, 2);
  await page.locator('#f-register-email').fill(accepted.email);
  await page.locator('#f-register-username').fill(accepted.username);
  await page.locator('#f-register-terms').check();
  await page.getByTestId('register-form-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/verify-email(\\?|$)`));
  await waitForMessage({ to: accepted.email, subjectKey: 'email.verify.subject', locale, after });
  expect(await hasNoMessageSince(refused.email, after), 'mail for a refused form').toBe(true);
});

forEachLocale('P2.9', 'same email', async ({ page, browser, locale }) => {
  const first = await registerConfirmed(page, locale);

  const device = await secondDevice(browser);
  try {
    const second: RunAccount = {
      ...newRunAccount(locale, 1),
      email: first.email,
      password: CHANGED_PASSWORD,
    };
    const after = since();
    await submitRegistration(device.page, second);

    // The same screen and URL as a first registration, which names the address and nothing else.
    const url = new URL(device.page.url());
    expect(`${url.pathname}${url.search}`).toBe(`/${locale}/verify-email`);
    await expect(device.page.locator('h1')).toHaveText(msg(locale, 'auth.verify.title'));
    await expect(device.page.getByTestId('verify-pending-panel')).toContainText(
      msg(locale, 'auth.verify.body', { email: first.email }),
    );

    const mail = await waitForMessage({
      to: first.email,
      subjectKey: 'email.existing.subject',
      locale,
      after,
    });
    expectCleanMail(mail, locale, 'email.existing.subject');

    // No second account: the new password signs nobody in.
    await device.page.goto(`/${locale}/sign-in`);
    await device.page.locator('#f-signin-email').fill(first.email);
    await device.page.locator('#f-signin-password').fill(second.password);
    await device.page.getByTestId('signin-form-submit-button').click();
    await expect(device.page.getByTestId('signin-form-error-summary')).toContainText(
      msg(locale, 'errors.auth.invalidCredentials'),
    );
  } finally {
    await device.context.close();
  }
});

forEachLocale('P2.10', 'security page', async ({ page, browser, locale }) => {
  const account = await registerConfirmed(page, locale);
  const device = await secondDevice(browser);
  try {
    await signIn(device.page, locale, account);

    await page.goto(`/${locale}/me/security`);
    const email = page.getByTestId('security-email');
    await expect(email).not.toContainText(account.email);
    await expect(email).not.toContainText(account.username);
    await expect(page.getByTestId('security-email-status')).toHaveText(
      msg(locale, 'auth.security.verified'),
    );
    await checkPage(page, locale, { label: `/${locale}/me/security` });

    const rows = page.getByTestId('session-list').locator('tbody tr');
    await expect(rows).toHaveCount(2);
    const current = page.getByTestId('session-list').locator('tbody tr[data-current="true"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText(msg(locale, 'auth.security.thisDevice'));

    await page.locator('#f-change-password-currentPassword').fill(account.password);
    await page.locator('#f-change-password-newPassword').fill(CHANGED_PASSWORD);
    await page.getByTestId('change-password-form-submit-button').click();
    await expect(page.getByTestId('change-password-notice')).toContainText(
      msg(locale, 'auth.security.passwordChanged'),
    );

    // The other device is signed out on its next page load.
    await device.page.goto(`/${locale}/me`);
    await expect(device.page.getByTestId('masthead-account-sign-in-link')).toBeVisible();

    await page.goto(`/${locale}/me/security`);
    await page.getByTestId('sign-out-all').locator('summary').click();
    await page.getByTestId('sign-out-all-confirm-button').click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in\\?signedOut=all`));
    await expect(page.getByTestId('auth-notice')).toContainText(
      msg(locale, 'auth.security.signedOutAll'),
    );
  } finally {
    await device.context.close();
  }
});
