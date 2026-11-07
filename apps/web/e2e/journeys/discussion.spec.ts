import { expect, test, type Locator, type Page } from '@playwright/test';

import { R1_TITLE } from '../fixtures/seed-facts';
import { commentSentinel } from '../fixtures/synthetic';
import { registerConfirmed, secondDevice } from '../helpers/accounts';
import { escapeRegExp, publishQuickReview } from '../helpers/content';
import { formatNumber } from '../helpers/digits';
import { runId } from '../helpers/env';
import { forEachLocale, type Locale } from '../helpers/locale';
import { msg, rawMessage } from '../helpers/messages';
import { checkPage } from '../helpers/page-check';
import { openExperienceByTitle } from '../helpers/reading';

// WF2 Part 4: discussion, in bn then en (BR2.4). Account A publishes; account B comments, replies
// and deletes. Every body carries the per-test sentinel and its role, and is found by that text.

const COMMENT_MAX = 2_000;

const comment = (page: Page, body: string): Locator =>
  page.locator('article.comment').filter({ hasText: body }).first();

/**
 * Keeps every text `#sr-live` speaks, in order. The region clears after a second and a late
 * arrival note ("Page: ...") may replace a message at once, so the log is read, not the region.
 */
async function recordAnnouncements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as Window & { __announced?: string[] }).__announced = log;
    new MutationObserver((records) => {
      const region = document.getElementById('sr-live');
      // Each write replaces the region's text node: one record per announcement.
      for (const record of records) {
        if (region && record.target === region && record.addedNodes.length > 0) {
          const text = region.textContent ?? '';
          if (text !== '') log.push(text);
        }
      }
    }).observe(document, { subtree: true, childList: true });
  });
}

/** Waits until `#sr-live` has spoken `message` once more than before `act` ran. */
async function expectAnnounced(page: Page, message: string, act: () => Promise<void>) {
  const count = () =>
    page.evaluate(
      (text) =>
        ((window as Window & { __announced?: string[] }).__announced ?? []).filter(
          (said) => said === text,
        ).length,
      message,
    );
  const before = await count();
  await act();
  await expect.poll(count, { message: `announced "${message}"` }).toBe(before + 1);
}

async function post(page: Page, locale: Locale, body: string): Promise<void> {
  const box = page.locator('.composer-box:not(.reply-box)');
  await box.getByRole('textbox').fill(body);
  await expectAnnounced(page, msg(locale, 'experience.commentPosted'), () =>
    box.getByRole('button', { name: msg(locale, 'experience.commentPost'), exact: true }).click(),
  );
  await expect(comment(page, body)).toBeVisible();
}

async function remove(page: Page, locale: Locale, body: string): Promise<void> {
  const label = msg(locale, 'experience.deleteComment');
  const item = comment(page, body);
  await item.getByRole('button', { name: label, exact: true }).first().click();
  await expectAnnounced(page, msg(locale, 'experience.commentDeleted'), () =>
    item.getByRole('group').getByRole('button', { name: label, exact: true }).first().click(),
  );
}

forEachLocale('P4.15', 'comment, reply, delete', async ({ page, browser, locale }) => {
  const author = await registerConfirmed(page, locale);
  const review = await publishQuickReview(page, author);

  const member = await secondDevice(browser);
  try {
    await registerConfirmed(member.page, locale, 1);
    const b = member.page;
    await recordAnnouncements(b);
    await b.goto(review.path);
    const thread = b.getByTestId('comment-thread');
    await expect(thread).toBeVisible();
    await expect(thread.getByTestId('contribution-gate')).toHaveCount(0);

    // 2001 characters are refused, and the text stays in the field. The field itself stops at
    // 2000 (`maxlength`); the limit is lifted in the page so the server's own refusal is what
    // answers (ISS-767).
    const tooLong = 'x'.repeat(COMMENT_MAX + 1);
    const box = b.locator('.composer-box:not(.reply-box)');
    const field = box.getByRole('textbox');
    await expect(field).toHaveAttribute('maxlength', String(COMMENT_MAX));
    await field.evaluate((element) => element.removeAttribute('maxlength'));
    await field.fill(tooLong);
    await box
      .getByRole('button', { name: msg(locale, 'experience.commentPost'), exact: true })
      .click();
    const template = escapeRegExp(rawMessage(locale, 'experience.commentLength'))
      .replace('\\{min\\}', '\\S+')
      .replace('\\{max\\}', escapeRegExp(formatNumber(COMMENT_MAX, locale)));
    await expect(box.getByRole('alert')).toHaveText(new RegExp(template));
    expect((await box.getByRole('textbox').inputValue()).length).toBe(tooLong.length);

    const first = commentSentinel(runId(), test.info(), 'first');
    const reply = commentSentinel(runId(), test.info(), 'reply');
    const second = commentSentinel(runId(), test.info(), 'second');

    await post(b, locale, first);

    const replyLabel = msg(locale, 'experience.reply');
    await comment(b, first).getByRole('button', { name: replyLabel, exact: true }).click();
    const replyBox = b.locator('.reply-box');
    await replyBox.getByRole('textbox').fill(reply);
    await expectAnnounced(b, msg(locale, 'experience.commentPosted'), () =>
      replyBox
        .getByRole('button', { name: msg(locale, 'experience.replyPost'), exact: true })
        .click(),
    );
    const replied = b.locator('.comment-replies article.comment').filter({ hasText: reply });
    await expect(replied).toBeVisible();
    await expect(
      replied.getByRole('button', { name: replyLabel, exact: true }),
      'a reply has no reply control',
    ).toHaveCount(0);

    await post(b, locale, second);

    await remove(b, locale, second);
    await expect(b.locator('article.comment').filter({ hasText: second })).toHaveCount(0);

    // A deleted comment with a reply leaves the placeholder, and the reply stays under it.
    await remove(b, locale, first);
    const placeholder = b.locator('article.comment.tombstone');
    await expect(placeholder).toContainText(msg(locale, 'experience.commentGone'));
    await expect(placeholder).toContainText(reply);
    await expect(b.locator('article.comment').filter({ hasText: first })).toHaveCount(0);
    await checkPage(b, locale, { label: `${review.path} (discussion)`, disclaimer: true });
  } finally {
    await member.context.close();
  }
});

forEachLocale('P4.15b', 'gate', async ({ page, locale }) => {
  await openExperienceByTitle(page, locale, R1_TITLE[locale]);
  const path = new URL(page.url()).pathname;
  const gate = page.getByTestId('comment-thread').getByTestId('contribution-gate');
  await expect(gate).toHaveAttribute('data-access', 'signed-out');
  await expect(gate).toContainText(msg(locale, 'auth.gate.commentBody'));
  for (const link of ['contribution-gate-sign-in', 'contribution-gate-register']) {
    const href = (await gate.getByTestId(link).getAttribute('href')) ?? '';
    expect(decodeURIComponent(href), `${link} carries next`).toContain(`next=${path}`);
  }
});
