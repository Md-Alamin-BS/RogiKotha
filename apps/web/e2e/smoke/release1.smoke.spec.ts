import { expect } from '@playwright/test';

import { SEEDED_ACCOUNT_LOCALE, SEEDED_USERNAMES, SHARED_PASSWORD } from '../fixtures/seed-facts';
import { commentSentinel, RUN_EMAIL_DOMAIN } from '../fixtures/synthetic';
import { registerConfirmed, secondDevice, signIn } from '../helpers/accounts';
import { publishQuickReview } from '../helpers/content';
import { runId } from '../helpers/env';
import { forEachLocale } from '../helpers/locale';
import { msg } from '../helpers/messages';

// BR14.7: the release-1 smoke, one short assertion per storyboard part (home, sign-in, publish,
// comment) in bn then en. No evidence is attached, so it runs without the scanner.

forEachLocale('SMOKE home', 'renders with the demo marker', async ({ page, open, locale }) => {
  await open();
  await expect(
    page.locator('p.demo[role="note"]').filter({ hasText: msg(locale, 'demo.banner') }),
  ).toBeVisible();
});

forEachLocale('SMOKE sign-in', 'a seeded account signs in', async ({ page, locale }) => {
  // Seeded accounts are only signed in to, never changed (BR1.5).
  await signIn(
    page,
    locale,
    { email: `${SEEDED_USERNAMES.shirin}@${RUN_EMAIL_DOMAIN}`, password: SHARED_PASSWORD },
    undefined,
    SEEDED_ACCOUNT_LOCALE,
  );
});

forEachLocale(
  'SMOKE publish',
  'a quick review publishes, reads back and takes a comment',
  async ({ page, browser, locale }, testInfo) => {
    const author = await registerConfirmed(page, locale);
    const review = await publishQuickReview(page, author);

    const reader = await secondDevice(browser);
    try {
      await reader.page.goto(review.path);
      await expect(reader.page.locator('main'), 'read back signed out').toContainText(review.title);
    } finally {
      await reader.context.close();
    }

    // ASSUMPTION(U50): the author may comment on their own experience; P4.15 covers a second
    // member's comment.
    const body = commentSentinel(runId(), testInfo, 'smoke');
    const box = page.locator('.composer-box:not(.reply-box)');
    await box.getByRole('textbox').fill(body);
    await box
      .getByRole('button', { name: msg(locale, 'experience.commentPost'), exact: true })
      .click();
    await expect(page.locator('article.comment').filter({ hasText: body })).toBeVisible();
  },
);
