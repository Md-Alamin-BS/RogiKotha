import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createTranslator, type AbstractIntlMessages } from 'next-intl';

export const LOCALES = ['en', 'bn'] as const;
export type TestLocale = (typeof LOCALES)[number];

const require = createRequire(import.meta.url);
const messagesDir = path.join(
  path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..'),
  'messages',
);

/** The real message file for `locale`. */
export function loadMessages(locale: TestLocale): AbstractIntlMessages {
  const file = path.join(messagesDir, `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

export type TestTranslate = (key: string, values?: Record<string, string>) => string;

/** A translator over `loadMessages(locale)` that takes any key, as the components' `t` does. */
export function translatorFor(locale: TestLocale): TestTranslate {
  const translate = createTranslator({ locale, messages: loadMessages(locale) });
  // Untyped messages make the strict key type `never`; the tests name keys as plain strings.
  return translate as unknown as TestTranslate;
}
