import { expect, type Locator, type Page } from '@playwright/test';

import {
  EMERGENCY_NUMBERS,
  EMERGENCY_VERIFIED,
  LIMITED_DATA_THRESHOLD,
} from '../fixtures/seed-facts';
import { hasAsciiDigit, toBengaliDigits, toLatinDigits } from './digits';
import { expectLocale, type Locale } from './locale';
import { msg } from './messages';

// BR2.1, BR2.6: what the reading journeys share: the language toggle, the in-test cross-locale
// number comparison, the "n of m" reading, the emergency numbers and navigation by visible name.

export const otherLocale = (locale: Locale): Locale => (locale === 'bn' ? 'en' : 'bn');

/** The first whole number in a text, in Latin digits; a text without one fails the test. */
export function firstNumber(text: string): number {
  const found = /\d+/.exec(toLatinDigits(text));
  if (!found) throw new Error(`No number in "${text}"`);
  return Number(found[0]);
}

/** Presses the language toggle and waits for the same path in the other locale and its announcement. */
export async function switchLanguage(page: Page, from: Locale): Promise<Locale> {
  const to = otherLocale(from);
  const before = new URL(page.url());
  await page.locator('a#lang').click();
  await expect(page).toHaveURL(
    (url) => url.pathname === before.pathname.replace(`/${from}`, `/${to}`),
  );
  await expectLocale(page, to);
  await expect(page.locator('#sr-live'), 'the toggle announces the language').toHaveText(
    msg(to, 'a11y.announce.language'),
  );
  return to;
}

const NUMBER_TOKEN = /[0-9০-৯][0-9০-৯,]*/g;

/**
 * Every number the given selectors show, in document order and Latin digits, tagged with the
 * selector, so two locales of one page compare equal (BR2.6).
 */
export async function numbersIn(page: Page, selectors: readonly string[]): Promise<string[]> {
  const texts = await page.evaluate(
    (list) =>
      list.map((selector) =>
        [...document.querySelectorAll(selector)].map((element) => element.textContent ?? ''),
      ),
    [...selectors],
  );
  return texts.flatMap((group, index) =>
    group.flatMap((text) =>
      (text.match(NUMBER_TOKEN) ?? []).map(
        (token) => `${selectors[index] ?? ''}: ${toLatinDigits(token).replace(/,/g, '')}`,
      ),
    ),
  );
}

/** "n of m" (`sentiment.ofTotal`) read from a distribution's denominator; returns m. */
export async function expectOfTotal(
  denominator: Locator,
  locale: Locale,
  expectedTotal?: number,
): Promise<number> {
  const total = firstNumber(await denominator.innerText());
  expect(await denominator.innerText()).toBe(
    msg(locale, 'sentiment.ofTotal', { n: total, count: total }),
  );
  if (expectedTotal !== undefined)
    expect(total, 'denominator equals the account count').toBe(expectedTotal);
  return total;
}

/** The capsule counts of a distribution block, as numbers (Latin digits). */
export async function capsuleCounts(block: Locator): Promise<number[]> {
  const texts = await block.locator('.cap b').allInnerTexts();
  return texts.map(firstNumber);
}

/** In `bn` no capsule shows an ASCII digit (BR2.6). */
export async function expectNoAsciiDigitInCapsules(block: Locator): Promise<void> {
  for (const text of await block.locator('.cap').allInnerTexts()) {
    expect(hasAsciiDigit(text), `ASCII digit in capsule "${text}"`).toBe(false);
  }
}

/** A bare `0` standing for a missing value: a zero that is not part of a longer number. */
export const BARE_ZERO = /(?<![0-9.,])0(?![0-9])/;

export function hasBareZero(text: string): boolean {
  return BARE_ZERO.test(toLatinDigits(text));
}

/** A regular expression matching a `prov.updatedOn` chip of any source and date. */
export function provenancePattern(locale: Locale): RegExp {
  const probe = msg(locale, 'prov.updatedOn', { source: '@@SOURCE@@', date: '@@DATE@@' });
  const escaped = probe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace('@@SOURCE@@', '.+').replace('@@DATE@@', '.+')}$`);
}

export const emergencyNumber = (key: keyof typeof EMERGENCY_NUMBERS, locale: Locale): string =>
  locale === 'bn' ? toBengaliDigits(EMERGENCY_NUMBERS[key]) : EMERGENCY_NUMBERS[key];

/** The three numbers as `tel:` links, in the locale's digits, and the last-verified line. */
export async function expectEmergencyNumbers(
  scope: Locator,
  locale: Locale,
  lastVerified: Locator,
): Promise<void> {
  for (const key of ['ambulance', 'healthLine', 'crisisLine'] as const) {
    const link = scope.locator(`a[href="tel:${EMERGENCY_NUMBERS[key]}"]`);
    await expect(link, `tel link for ${key}`).toHaveCount(1);
    await expect(link).toContainText(emergencyNumber(key, locale));
  }
  await expect(lastVerified).toHaveText(
    msg(locale, 'emergency.lastVerifiedLine', { date: EMERGENCY_VERIFIED[locale] }),
  );
}

/** Opens a card link by its visible name from the page you are on (names are unique per list). */
export async function openByName(page: Page, testId: string, name: string): Promise<void> {
  const link = page.getByTestId(testId).filter({ hasText: name }).first();
  await expect(link, `${testId} "${name}"`).toBeVisible();
  await link.click();
}

const MAX_INDEX_PAGES = 8;

/**
 * Opens an experience from the newest-first index by its title, following "more" while the title
 * is not on the page yet. Each step waits on the page, never on time.
 */
export async function openExperienceByTitle(
  page: Page,
  locale: Locale,
  title: string,
): Promise<void> {
  await page.goto(`/${locale}/experiences`);
  for (let visited = 0; visited < MAX_INDEX_PAGES; visited += 1) {
    const link = page.getByTestId('account-row-title-link').filter({ hasText: title });
    if ((await link.count()) > 0) {
      await link.first().click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/experiences/[^/?]+$`));
      return;
    }
    const more = page.getByTestId('pager-more');
    if ((await more.count()) === 0) break;
    const before = page.url();
    await more.click();
    await expect(page).not.toHaveURL(before);
  }
  throw new Error(`Experience "${title}" is not in the first ${MAX_INDEX_PAGES} index pages`);
}

/** The visit count a facility teaser row shows, or null when the row shows none. */
export function visitCountOf(rowText: string, locale: Locale): number | null {
  if (rowText.includes(msg(locale, 'facility.noVisits'))) return 0;
  // Descending, so "12 visits" is not read as "2 visits".
  for (let n = 500; n >= 1; n -= 1) {
    if (rowText.includes(msg(locale, 'facility.visitCount', { n, count: n }))) return n;
  }
  return null;
}

export const isLimited = (count: number): boolean => count < LIMITED_DATA_THRESHOLD;
