import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
  type TestDetails,
  type TestInfo,
} from '@playwright/test';

// BR1.4: every journey runs once in bn and once in en, bn first, with the step and the locale in
// the title, so `--grep "\[bn\]"` and `--grep "\[en\]"` list equal counts.

export const LOCALES = ['bn', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** `P1.4 [bn] sentence` for journeys, `A11Y keyboard [bn] sentence` for accessibility. */
export function localeTitle(id: string, locale: Locale, sentence = ''): string {
  return `${id} [${locale}]${sentence ? ` ${sentence}` : ''}`;
}

export async function expectLocale(page: Page, locale: Locale): Promise<void> {
  const html = page.locator('html');
  await expect(html).toHaveAttribute('lang', locale);
  await expect(html).toHaveAttribute('data-lang', locale);
}

export interface LocaleTestArgs {
  page: Page;
  context: BrowserContext;
  browser: Browser;
  request: APIRequestContext;
  locale: Locale;
  /** `page.goto('/<locale><path>')`; the first call also asserts `lang` and `data-lang`. */
  open: (path?: string) => Promise<void>;
}

export type LocaleTestBody = (args: LocaleTestArgs, testInfo: TestInfo) => Promise<void>;

function opener(page: Page, locale: Locale): (path?: string) => Promise<void> {
  let first = true;
  return async (path = '') => {
    await page.goto(`/${locale}${path}`);
    if (first) {
      first = false;
      await expectLocale(page, locale);
    }
  };
}

/** Declares the bn test, then the en test. */
export function forEachLocale(
  id: string,
  sentence: string,
  body: LocaleTestBody,
  details: TestDetails = {},
): void {
  for (const locale of LOCALES) {
    test(
      localeTitle(id, locale, sentence),
      details,
      async ({ page, context, browser, request }, testInfo) => {
        await body(
          { page, context, browser, request, locale, open: opener(page, locale) },
          testInfo,
        );
      },
    );
  }
}

/**
 * BR1.5's one exception: a `describe.serial` group per locale for one account's life in order.
 * `title` builds each inner test's `P<part>.<step> [<locale>]` title.
 */
export function describeEachLocale(
  id: string,
  sentence: string,
  body: (locale: Locale, title: (innerId: string, innerSentence: string) => string) => void,
): void {
  for (const locale of LOCALES) {
    test.describe.serial(localeTitle(id, locale, sentence), () => {
      body(locale, (innerId, innerSentence) => localeTitle(innerId, locale, innerSentence));
    });
  }
}

export { opener as localeOpener };
