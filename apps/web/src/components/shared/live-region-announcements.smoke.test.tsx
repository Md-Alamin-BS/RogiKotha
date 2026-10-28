import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { ViewShell } from '@/components/patient/ViewShell';
import { LiveRegion } from './LiveRegion';
import { ThemeControls } from './ThemeControls';

// CR-004 / ISS-122: the shell's toggles once went silent in the port. This
// keeps the theme toggle and the view announcement speaking, in both
// locales, from the real dictionaries.
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
  usePathname: () => '/doctors',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/server/actions/preferences', () => ({
  setTheme: () => Promise.resolve(),
  setMotion: () => Promise.resolve(),
  setLang: () => Promise.resolve(),
}));

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

function liveRegionText(): string {
  return document.getElementById('sr-live')?.textContent ?? '';
}

describe('live-region announcements smoke', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(['en', 'bn'] as const)('the theme toggle speaks on /%s', async (locale) => {
    render(
      <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
        <LiveRegion />
        <ThemeControls locale={locale} theme="light" motion="on" />
      </NextIntlClientProvider>,
    );

    await act(async () => {
      fireEvent.click(document.getElementById('theme') as HTMLElement);
      await Promise.resolve();
    });

    expect(liveRegionText().trim()).not.toBe('');
  });

  it.each(['en', 'bn'] as const)('the view announcement on /%s holds no raw view id', (locale) => {
    vi.useFakeTimers();
    render(
      <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
        <LiveRegion />
        <ViewShell view="doctors" title="">
          <p>content</p>
        </ViewShell>
      </NextIntlClientProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(liveRegionText().trim()).not.toBe('');
    expect(liveRegionText()).not.toContain('doctors');
  });
});
