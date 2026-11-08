import { expect, test, type Page } from '@playwright/test';

import { WRITE_TARGET_DOCTOR } from '../fixtures/seed-facts';
import { reviewText, reviewTitle, textSentinel } from '../fixtures/synthetic';
import type { RunAccount } from './accounts';
import { runId } from './env';
import type { Locale } from './locale';
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
  /** A doctor the account adds itself (P3.11b); replaces the doctor choice. */
  newDoctorName?: string;
  identity?: IdentityChoice;
}

export const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Step 1 of the composer: the doctor, picked by visible name or added by the account. */
export async function chooseDoctor(page: Page, doctor: string, newDoctorName?: string) {
  if (newDoctorName) {
    await page.getByTestId('compose-add-doctor-open').click();
    await page.getByTestId('compose-newDoctorName').fill(newDoctorName);
    return;
  }
  const doctorSelect = page.getByTestId('compose-doctor');
  const value = await doctorSelect
    .locator('option', { hasText: doctor })
    .first()
    .getAttribute('value');
  if (!value) throw new Error(`The composer offers no doctor named ${doctor}`);
  await doctorSelect.selectOption(value);
}

/** Step 4 of the composer: the identity choice and every attestation, before Publish. */
export async function chooseIdentityAndAttest(
  page: Page,
  locale: Locale,
  choice: IdentityChoice,
): Promise<void> {
  const identity = msg(locale, IDENTITY_KEYS[choice]);
  await page
    .getByTestId('compose-identity-options')
    .getByRole('button', { name: new RegExp(`^${escapeRegExp(identity)}`) })
    .click();
  for (const box of await page.getByTestId('compose-attestation').getByRole('checkbox').all()) {
    await box.check();
  }
}

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
  await chooseDoctor(page, doctor, options.newDoctorName);
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
  await chooseIdentityAndAttest(page, locale, options.identity ?? 'pseudonymous');
  await page.getByTestId('compose-publish').click();

  await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/?#]+`));
  const path = new URL(page.url()).pathname;
  const publicId = path.split('/').pop() ?? '';
  return { publicId, path, title, sentinel };
}
