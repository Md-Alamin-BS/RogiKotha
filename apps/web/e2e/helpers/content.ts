import { expect, test, type Page } from '@playwright/test';

import { WRITE_TARGET_DOCTOR } from '../fixtures/seed-facts';
import { reviewText, reviewTitle, textSentinel } from '../fixtures/synthetic';
import type { RunAccount } from './accounts';
import { runId } from './env';
import { msg } from './messages';

// BR1.5, BR7.2: a test that needs an experience publishes its own quick review about the
// write-target doctor, which no reading test opens or counts.

export type IdentityChoice = 'named' | 'pseudonymous' | 'anonymous';

const IDENTITY_KEYS: Readonly<Record<IdentityChoice, string>> = {
  named: 'compose.identity.real',
  pseudonymous: 'compose.identity.pseudo',
  anonymous: 'compose.identity.anon',
};

export interface PublishedReview {
  publicId: string;
  path: string;
  title: string;
  sentinel: string;
}

export interface QuickReviewOptions {
  /** The doctor's visible name in the account's locale; the write target by default. */
  doctor?: string;
  identity?: IdentityChoice;
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Composes a quick review through the four composer steps and publishes it. */
export async function publishQuickReview(
  page: Page,
  account: RunAccount,
  options: QuickReviewOptions = {},
): Promise<PublishedReview> {
  const { locale } = account;
  const doctor = options.doctor ?? WRITE_TARGET_DOCTOR[locale];
  const sentinel = textSentinel(runId(), test.info());
  const title = reviewTitle(locale, sentinel);

  await page.goto(`/${locale}/write`);
  const doctorSelect = page.getByTestId('compose-doctor');
  const value = await doctorSelect
    .locator('option', { hasText: doctor })
    .first()
    .getAttribute('value');
  if (!value) throw new Error(`The composer offers no doctor named ${doctor}`);
  await doctorSelect.selectOption(value);
  await page.getByTestId('compose-relationship-options').getByRole('button').first().click();
  await page.getByTestId('compose-period').selectOption({ index: 1 });
  await page
    .getByTestId('compose-mode')
    .getByRole('button', { name: new RegExp(escapeRegExp(msg(locale, 'compose.mode.quick'))) })
    .click();

  await page.getByTestId('compose-step-2').click();
  await page.getByTestId('compose-title').fill(title);
  await page.getByTestId('compose-story').fill(reviewText(sentinel));
  await page.getByTestId('compose-not-sure').first().click();

  await page.getByTestId('compose-step-4').click();
  const identity = msg(locale, IDENTITY_KEYS[options.identity ?? 'pseudonymous']);
  await page
    .getByTestId('compose-identity-options')
    .getByRole('button', { name: new RegExp(`^${escapeRegExp(identity)}`) })
    .click();
  for (const box of await page.getByTestId('compose-attestation').getByRole('checkbox').all()) {
    await box.check();
  }
  await page.getByTestId('compose-publish').click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/?#]+`));
  const path = new URL(page.url()).pathname;
  const publicId = path.split('/').pop() ?? '';
  return { publicId, path, title, sentinel };
}
