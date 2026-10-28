import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Masthead } from './Masthead';

// No real Next.js router runs under Vitest, and next-intl's own
// `usePathname`/`Link` reach into `next/navigation` in a way that doesn't
// resolve outside an actual Next.js build (see packages/i18n's T-006
// hand-off, ISS-053) — mock this app's own thin `@/i18n/routing`
// re-export instead of next-intl's internals.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: string;
    locale?: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => {
    const target = locale ? `/${locale}${href === '/' ? '' : href}` : href;
    return (
      <a href={target} {...rest}>
        {children}
      </a>
    );
  },
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const require = createRequire(import.meta.url);
const i18nEntryPath = require.resolve('@rogikotha/i18n');
const i18nPackageRoot = path.resolve(path.dirname(i18nEntryPath), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

function renderMasthead(locale: 'en' | 'bn') {
  const messages = loadMessages(locale);
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Masthead locale={locale} theme={null} motion="on" />
    </NextIntlClientProvider>,
  );
}

describe('Masthead', () => {
  it('renders the six tabs and the write CTA in English', () => {
    renderMasthead('en');
    const tabLabels = [
      'Discover',
      'Doctors',
      'Hospitals & clinics',
      'Health topics',
      'Experiences',
      'My writing',
    ];
    for (const label of tabLabels) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'Share your experience' })).toBeInTheDocument();
  });

  it('renders the six tabs and the write CTA in Bengali', () => {
    renderMasthead('bn');
    const tabLabels = [
      'খুঁজুন',
      'ডাক্তারেরা',
      'হাসপাতাল ও ক্লিনিক',
      'রোগ ও স্বাস্থ্য',
      'অভিজ্ঞতা',
      'আমার লেখা',
    ];
    for (const label of tabLabels) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('link', { name: 'অভিজ্ঞতা লিখুন' })).toBeInTheDocument();
  });

  it('the language control links to the same path in the other locale', () => {
    renderMasthead('en');
    const langLink = document.getElementById('lang');
    expect(langLink).not.toBeNull();
    expect(langLink?.getAttribute('href')).toBe('/bn');
  });
});
