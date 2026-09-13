import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { About } from './About';
import { Emergency, type EmergencyConfig } from './Emergency';
import { Policy } from './Policy';

// FD-022 (docs/status/decision-log.md): the lawful-access disclosure appears
// only in the Privacy Policy, never as a banner or warning anywhere else.
// T-207's task file asks for a test that greps every page this task built
// for the sentence and finds it nowhere but /privacy — Discover, the doctor
// profile and the experience page are Half B / later tasks and do not exist
// yet, so this covers exactly the pages Half A owns: /emergency, /about,
// /terms, /privacy.

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

describe('FD-022 lawful-access placement', () => {
  it('the lawful-access sentence appears on /privacy and nowhere else built so far, in English', () => {
    const pages = {
      emergency: renderHtml(<Emergency config={EMERGENCY_CONFIG} locale="en" />, 'en'),
      about: renderHtml(<About />, 'en'),
      terms: renderHtml(<Policy kind="terms" />, 'en'),
      privacy: renderHtml(<Policy kind="privacy" />, 'en'),
    };

    expect(pages.emergency).not.toContain(LAWFUL_BODY_EN);
    expect(pages.about).not.toContain(LAWFUL_BODY_EN);
    expect(pages.terms).not.toContain(LAWFUL_BODY_EN);
    expect(pages.privacy).toContain(LAWFUL_BODY_EN);
  });

  it('the lawful-access sentence appears on /privacy and nowhere else built so far, in Bengali', () => {
    const pages = {
      emergency: renderHtml(<Emergency config={EMERGENCY_CONFIG} locale="bn" />, 'bn'),
      about: renderHtml(<About />, 'bn'),
      terms: renderHtml(<Policy kind="terms" />, 'bn'),
      privacy: renderHtml(<Policy kind="privacy" />, 'bn'),
    };

    expect(pages.emergency).not.toContain(LAWFUL_BODY_BN);
    expect(pages.about).not.toContain(LAWFUL_BODY_BN);
    expect(pages.terms).not.toContain(LAWFUL_BODY_BN);
    expect(pages.privacy).toContain(LAWFUL_BODY_BN);
  });
});
