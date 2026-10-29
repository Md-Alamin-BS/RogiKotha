import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Colophon } from './Colophon';

// See components/patient/Masthead.test.tsx for why this mocks the app's own
// `@/i18n/routing` re-export rather than `next/navigation` directly.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');
const LOCALES = ['en', 'bn'] as const;
type Locale = (typeof LOCALES)[number];

function loadMessages(locale: Locale): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

// The message-file text for a dotted key, so assertions follow the copy and not a pasted string.
function copy(locale: Locale, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      loadMessages(locale),
    );
  if (typeof value !== 'string') throw new Error(`No message ${key} in ${locale}`);
  return value;
}

function inLocale(locale: Locale, ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe.each(LOCALES)('patient Colophon in %s', (locale) => {
  it('links the emergency and about pages', () => {
    inLocale(locale, <Colophon />);
    const nav = screen.getByRole('navigation', { name: copy(locale, 'a11y.siteSections') });
    expect(within(nav).getByRole('link', { name: copy(locale, 'nav.emergency') })).toHaveAttribute(
      'href',
      '/emergency',
    );
    expect(within(nav).getByRole('link', { name: copy(locale, 'nav.about') })).toHaveAttribute(
      'href',
      '/about',
    );
  });

  it('keeps the medical-advice disclaimer and the demo marker text in the footer', () => {
    inLocale(locale, <Colophon />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByText(copy(locale, 'disclaimer.long'))).toBeInTheDocument();
    expect(within(footer).getByText(copy(locale, 'demo.banner'))).toBeInTheDocument();
  });
});
