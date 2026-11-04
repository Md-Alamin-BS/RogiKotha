// Test helpers for the composer: the real message files and a render wrapper.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator, type AbstractIntlMessages } from 'next-intl';

export type TestLocale = 'en' | 'bn';

const require = createRequire(import.meta.url);
const messagesDir = path.join(
  path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..'),
  'messages',
);

const cache = new Map<TestLocale, AbstractIntlMessages>();

export function messagesFor(locale: TestLocale): AbstractIntlMessages {
  const cached = cache.get(locale);
  if (cached) return cached;
  const file = path.join(messagesDir, `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
  cache.set(locale, messages);
  return messages;
}

export type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Untyped keys: the merged messages are not known to the type system. */
export function translatorFor(locale: TestLocale): Translate {
  const translate = createTranslator({ locale, messages: messagesFor(locale) }) as unknown;
  return translate as Translate;
}

export function renderInLocale(ui: ReactElement, locale: TestLocale) {
  return render(
    createElement(NextIntlClientProvider, {
      locale,
      messages: messagesFor(locale),
      children: ui,
    }),
  );
}
