import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { About } from './About';
import { Emergency, type EmergencyConfig } from './Emergency';
import { Policy } from './Policy';
import { Home } from './home/Home';

// FD-008, FD-022 and FD-109 (docs/status/decision-log.md): the lawful-access
// disclosure is the last section of both legal pages, /terms and /privacy,
// never a banner or warning anywhere else. This renders the pages T-207 owns:
// /, /emergency, /about, /terms and /privacy.

const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

const EMERGENCY_CONFIG: EmergencyConfig = {
  ambulance: '999',
  healthLine: '16263',
  crisisLine: '09612-119911',
  lastVerified: '2026-08-21',
};

const LAWFUL_BODY_EN =
  'An anonymous account is never publicly linked to you. A small number of authorised staff can, for a stated moderation, security or legal reason, look up which account wrote it; every such access is recorded. We may be required to disclose that link in response to a lawful order.';
const LAWFUL_BODY_BN =
  'একটি বেনামী অভিজ্ঞতা কখনো প্রকাশ্যে আপনার সঙ্গে যুক্ত হয় না। নির্দিষ্ট মডারেশন, নিরাপত্তা বা আইনি কারণে অল্প কয়েকজন অনুমোদিত স্টাফ কোন অ্যাকাউন্ট থেকে সেটি লেখা হয়েছে তা দেখতে পারেন; এমন প্রতিটি প্রবেশ রেকর্ড করা হয়। আইনসম্মত আদেশের প্রেক্ষিতে সেই সংযোগ প্রকাশ করতে আমরা বাধ্য হতে পারি।';

function renderHtml(node: ReactElement, locale: 'en' | 'bn'): string {
  const { container, unmount } = render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {node}
    </NextIntlClientProvider>,
  );
  const html = container.innerHTML;
  unmount();
  return html;
}

vi.mock('@/i18n/routing', async () => ({
  Link: (await import('./shared/link-test-support')).PlainLink,
}));

const LAWFUL_BODY = { en: LAWFUL_BODY_EN, bn: LAWFUL_BODY_BN } as const;

describe.each(['en', 'bn'] as const)('FD-022 lawful-access placement in %s', (locale) => {
  it('appears on /terms and /privacy', () => {
    expect(renderHtml(<Policy kind="terms" />, locale)).toContain(LAWFUL_BODY[locale]);
    expect(renderHtml(<Policy kind="privacy" />, locale)).toContain(LAWFUL_BODY[locale]);
  });

  it('appears nowhere on /, /about or /emergency', () => {
    const home = renderHtml(
      <Home chips={[]} browse={[]} facilities={[]} latest={[]} emergency={EMERGENCY_CONFIG} />,
      locale,
    );
    expect(home).not.toContain(LAWFUL_BODY[locale]);
    expect(renderHtml(<About />, locale)).not.toContain(LAWFUL_BODY[locale]);
    expect(
      renderHtml(<Emergency config={EMERGENCY_CONFIG} locale={locale} />, locale),
    ).not.toContain(LAWFUL_BODY[locale]);
  });
});
