import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Emergency, type EmergencyConfig } from './Emergency';
import { About } from './About';
import { Policy } from './Policy';

// 04-handoff-and-validation.md §3.1: T-207a's smoke assertion for the
// cumulative suite — the four Half A pages render, in both locales, without
// throwing (a missing i18n key throws under next-intl's onError in
// packages/i18n/src/request.ts, so this alone catches a dropped key).
const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

const CONFIG: EmergencyConfig = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

describe('Emergency/About/Policy smoke', () => {
  for (const locale of ['en', 'bn'] as const) {
    it(`renders Emergency, About, Terms and Privacy in ${locale} without throwing`, () => {
      const messages = loadMessages(locale);
      const wrap = (child: ReactNode) => (
        <NextIntlClientProvider locale={locale} messages={messages}>
          {child}
        </NextIntlClientProvider>
      );

      expect(() => render(wrap(<Emergency config={CONFIG} locale={locale} />))).not.toThrow();
      expect(() => render(wrap(<About />))).not.toThrow();
      expect(() => render(wrap(<Policy kind="terms" />))).not.toThrow();
      expect(() => render(wrap(<Policy kind="privacy" />))).not.toThrow();
    });
  }
});
