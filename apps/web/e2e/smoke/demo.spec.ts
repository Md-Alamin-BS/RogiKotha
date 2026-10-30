import { expect, test, type Page } from '@playwright/test';
import bn from '../../../../packages/i18n/messages/bn.json' with { type: 'json' };
import en from '../../../../packages/i18n/messages/en.json' with { type: 'json' };

// Demo slice (FD-099, plan Step 12): the whole click path on the built app, once per language.
// Needs the compose PostgreSQL and a seeded database (`pnpm db:reset && pnpm db:seed`); ClamAV
// decides whether the attachment ends up Ready or Scan pending, and the spec accepts both.

type Locale = 'en' | 'bn';
type Messages = Record<string, unknown>;

const MESSAGES: Record<Locale, Messages> = { en, bn };
// A seeded patient (packages/test-support/src/seed/seed-accounts.ts), synthetic like every seed row.
const SEEDED_PATIENT = { email: 'abba_of_two@demo.rogikotha.local', password: 'demo-pass-2026!' };
const ONE = { en: '1', bn: '১' } satisfies Record<Locale, string>;
// A 1x1 transparent PNG: the upload checks the magic bytes, so it has to be a real one.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/** The message at a dotted key, so the spec reads the same copy the pages render. */
function msg(locale: Locale, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], MESSAGES[locale]);
  if (typeof value !== 'string') throw new Error(`no message at ${key}`);
  return value;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

async function register(page: Page, locale: Locale, username: string, displayName: string) {
  await page.goto(`/${locale}/register`);
  await page.locator('#f-register-email').fill(`${username}@demo.rogikotha.local`);
  await page.locator('#f-register-password').fill('demo-pass-2026!');
  await page.locator('#f-register-username').fill(username);
  await page.locator('#f-register-displayName').fill(displayName);
  await page.locator('#f-register-age').check();
  await page.locator('#f-register-terms').check();
  await page.getByTestId('register-form-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/me$`));
}

async function openAccountMenu(page: Page) {
  await page.getByTestId('masthead-account-menu-button').click();
}

async function signOut(page: Page, locale: Locale) {
  await openAccountMenu(page);
  await page.getByTestId('account-menu-sign-out-button').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}$`));
  await expect(page.getByTestId('masthead-account-sign-in-link')).toBeVisible();
}

async function signIn(page: Page, locale: Locale, next: string) {
  await page.goto(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
  await page.locator('#f-signin-email').fill(SEEDED_PATIENT.email);
  await page.locator('#f-signin-password').fill(SEEDED_PATIENT.password);
  await page.getByTestId('signin-form-submit-button').click();
  await expect(page).toHaveURL(new RegExp(`${next}$`));
  await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
}

async function writeAboutFirstDoctor(page: Page, locale: Locale, title: string): Promise<string> {
  await page.goto(`/${locale}/doctors`);
  await page.getByTestId('doctor-entry-link').first().click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/doctors/[^/]+$`));
  await expect(page.getByText(msg(locale, 'label.notVerified')).first()).toBeVisible();
  await shoot(page, `${locale}-doctor`);

  await page.getByTestId('doctor-profile-write-link').click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/write\\?doctor=`));
  await expect(page.getByTestId('compose-doctor')).not.toHaveValue('');
  await page.getByTestId('compose-relationship-options').getByRole('button').first().click();
  await page.getByTestId('compose-title').fill(title);
  await page
    .getByTestId('compose-body')
    .fill('The doctor listened carefully and explained each test before ordering it.');
  await page.getByTestId('compose-identity-options').getByRole('button').first().click();
  await page.getByTestId('compose-attestation').check();
  await page.getByTestId('compose-publish').click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/]+$`));
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function editExperience(page: Page, locale: Locale, experiencePath: string) {
  await page.getByRole('link', { name: msg(locale, 'experience.editExperience') }).click();
  await expect(page).toHaveURL(new RegExp(`${experiencePath}/edit$`));
  await page
    .getByTestId('compose-body')
    .fill('The doctor listened carefully, explained each test and called back with the results.');
  await page.getByTestId('edit-save').click();
  await expect(page).toHaveURL(new RegExp(`${experiencePath}$`));
  await expect(page.getByText(msg(locale, 'label.edited'), { exact: true })).toBeVisible();
}

/** Attaches the PNG and returns whether the scan finished clean (ClamAV running) or is pending. */
async function attachPng(page: Page, locale: Locale): Promise<'ready' | 'pending'> {
  await page
    .getByTestId('evidence-file-input')
    .setInputFiles({ name: 'discharge-note.png', mimeType: 'image/png', buffer: TINY_PNG });
  await page.getByTestId('evidence-upload-submit').click();
  const file = page.getByTestId('evidence-file').filter({ hasText: 'discharge-note.png' });
  await expect(file).toBeVisible();
  const ready = msg(locale, 'ev.status.ready');
  const pending = msg(locale, 'ev.status.pending');
  await expect(file).toContainText(new RegExp(`${ready}|${pending}`));
  return (await file.textContent())?.includes(ready) ? 'ready' : 'pending';
}

async function commentAndReply(page: Page, locale: Locale) {
  const comment = `A question from a reader ${uniqueSuffix()}`;
  const reply = `A follow-up reply ${uniqueSuffix()}`;
  await page.getByPlaceholder(msg(locale, 'experience.commentBox')).first().fill(comment);
  await page.getByRole('button', { name: msg(locale, 'experience.commentPost') }).click();
  const thread = page.locator('article.comment').filter({ hasText: comment });
  await expect(thread).toBeVisible();

  await thread.getByRole('button', { name: msg(locale, 'experience.reply') }).click();
  await thread.locator('.reply-box textarea').fill(reply);
  await thread.getByRole('button', { name: msg(locale, 'experience.replyPost') }).click();
  await expect(thread.locator('.comment-replies')).toContainText(reply);
}

async function shoot(page: Page, name: string) {
  const dir = process.env['DEMO_SHOTS_DIR'];
  if (!dir) return;
  // The route fade and reveals would otherwise leave the old page half-faded in the picture.
  // Capped, because reveals below the fold only finish once they are scrolled into view.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      ),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]),
  );
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

test('switching the language keeps where sign-in returns to', async ({ page }) => {
  await page.goto('/en/sign-in?next=%2Fdoctors');
  await expect(page.locator('html')).toHaveAttribute('data-motion-ready', '');
  await page.locator('#lang').click();
  await expect(page).toHaveURL(/\/bn\/sign-in\?next=%2Fdoctors$/);
});

for (const locale of ['en', 'bn'] as const) {
  test(`a visitor can walk the whole demo in ${locale}`, async ({ page }) => {
    test.setTimeout(180_000);
    const username = `demo_${uniqueSuffix()}`.slice(0, 24);
    const title = `Clear explanations ${uniqueSuffix()}`;

    await register(page, locale, username, 'Demo Reader');
    await expect(page.getByTestId('masthead-account-menu-button')).toBeVisible();
    await shoot(page, `${locale}-me`);

    await page.getByTestId('profile-name-input').fill('Demo Reader Renamed');
    await page.getByTestId('profile-name-submit').click();
    await expect(page.getByText(msg(locale, 'mine.profile.nameSaved'))).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('profile-name-input')).toHaveValue('Demo Reader Renamed');

    const experiencePath = await writeAboutFirstDoctor(page, locale, title);
    await expect(page.getByText(msg(locale, 'label.noDocuments')).first()).toBeVisible();
    await editExperience(page, locale, experiencePath);
    const scan = await attachPng(page, locale);
    test.info().annotations.push({ type: 'scan', description: scan });
    await shoot(page, `${locale}-experience-author`);

    await signOut(page, locale);
    await signIn(page, locale, experiencePath);
    await commentAndReply(page, locale);

    const note = page.getByTestId('evidence-note');
    if (scan === 'ready') {
      await expect(note).toContainText(msg(locale, 'evidence.status'));
      await expect(note).toContainText(
        msg(locale, 'ev.note.count').replace('{count}', ONE[locale]),
      );
    } else {
      await expect(note).toHaveCount(0);
    }
    await shoot(page, `${locale}-experience-reader`);

    for (const path of ['', '/doctors', '/experiences', '/write']) {
      await page.goto(`/${locale}${path}`);
      await shoot(page, `${locale}-${path.slice(1) || 'home'}`);
    }
  });
}
