import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { DemoMarker } from './DemoMarker';
import { SkipLink } from './SkipLink';

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

describe.each(LOCALES)('SkipLink in %s', (locale) => {
  it('is a link to the main landmark with the skip text', () => {
    inLocale(locale, <SkipLink />);
    const link = screen.getByRole('link', { name: copy(locale, 'a11y.skip') });
    expect(link).toHaveAttribute('href', '#main');
  });
});

describe.each(LOCALES)('DemoMarker in %s', (locale) => {
  it('says the records are fictional, as a note', () => {
    inLocale(locale, <DemoMarker />);
    expect(screen.getByRole('note')).toHaveTextContent(copy(locale, 'demo.banner'));
  });
});
