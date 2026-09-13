import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { ThemeControls } from './ThemeControls';

// See components/patient/Masthead.test.tsx for why this mocks the app's own
// `@/i18n/routing` re-export rather than `next/navigation` directly.
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

const setThemeMock = vi.fn();
const setMotionMock = vi.fn();
const setLangMock = vi.fn();
vi.mock('@/server/actions/preferences', () => ({
  setTheme: (theme: unknown): void => {
    setThemeMock(theme);
  },
  setMotion: (motion: unknown): void => {
    setMotionMock(motion);
  },
  setLang: (locale: unknown): void => {
    setLangMock(locale);
  },
}));

const messages = {
  a11y: {
    lang: 'Switch interface language',
    theme: 'Switch light or dark mode',
    motion: 'Reduce animation',
  },
} as unknown as AbstractIntlMessages;

function renderControls(theme: 'light' | 'dark' | null, motion: 'on' | 'off' = 'on') {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ThemeControls locale="en" theme={theme} motion={motion} />
    </NextIntlClientProvider>,
  );
}

function mockPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('ThemeControls', () => {
  beforeEach(() => {
    setThemeMock.mockClear();
    setMotionMock.mockClear();
    mockPrefersDark(false);
  });

  it('theme button reflects the current theme (toggles to the opposite of the explicit theme)', () => {
    const { unmount } = renderControls('dark');
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('light');
    unmount();

    setThemeMock.mockClear();
    renderControls('light');
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('theme button falls back to the system preference when no explicit theme is set', () => {
    mockPrefersDark(true);
    renderControls(null);
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('light');
  });

  it('motion button toggles aria-pressed', () => {
    const { rerender } = renderControls(null, 'on');
    expect(screen.getByTitle('Reduce animation')).toHaveAttribute('aria-pressed', 'false');

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ThemeControls locale="en" theme={null} motion="off" />
      </NextIntlClientProvider>,
    );
    expect(screen.getByTitle('Reduce animation')).toHaveAttribute('aria-pressed', 'true');
  });
});
