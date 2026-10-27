import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { LiveRegion } from './LiveRegion';
import { ThemeControls } from './ThemeControls';

const routing = vi.hoisted(() => ({ pathname: '/' }));

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
  usePathname: () => routing.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

type PreferenceWrite = (value: unknown) => Promise<void>;
const setThemeMock = vi.fn<PreferenceWrite>(() => Promise.resolve());
const setMotionMock = vi.fn<PreferenceWrite>(() => Promise.resolve());
const setLangMock = vi.fn<PreferenceWrite>(() => Promise.resolve());
vi.mock('@/server/actions/preferences', () => ({
  setTheme: (theme: unknown) => setThemeMock(theme),
  setMotion: (motion: unknown) => setMotionMock(motion),
  setLang: (locale: unknown) => setLangMock(locale),
}));

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

const LANGUAGE_NOTE_KEY = 'rk.langNote';

type ControlsOptions = {
  locale?: 'en' | 'bn';
  theme?: 'light' | 'dark' | null;
  motion?: 'on' | 'off';
};

function controls({ locale = 'en', theme = null, motion = 'on' }: ControlsOptions = {}) {
  return (
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      <LiveRegion />
      <ThemeControls locale={locale} theme={theme} motion={motion} />
    </NextIntlClientProvider>
  );
}

function renderControls(options: ControlsOptions = {}) {
  return render(controls(options));
}

function liveRegionText(): string {
  return document.getElementById('sr-live')?.textContent ?? '';
}

function mockPrefersDark(prefersDark: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('dark') ? prefersDark : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

// jsdom cannot navigate, so the language link's default action is stopped
// to keep its "not implemented" noise out of the run.
function preventNavigation(event: Event) {
  event.preventDefault();
}

describe('ThemeControls', () => {
  beforeEach(() => {
    setThemeMock.mockClear();
    setMotionMock.mockClear();
    setLangMock.mockClear();
    routing.pathname = '/';
    window.sessionStorage.clear();
    mockPrefersDark(false);
    window.addEventListener('click', preventNavigation);
  });

  afterEach(() => {
    window.removeEventListener('click', preventNavigation);
    vi.restoreAllMocks();
  });

  it('theme button reflects the current theme (toggles to the opposite of the explicit theme)', () => {
    const { unmount } = renderControls({ theme: 'dark' });
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('light');
    unmount();

    setThemeMock.mockClear();
    renderControls({ theme: 'light' });
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('dark');
  });

  it('theme button falls back to the system preference when no explicit theme is set', () => {
    mockPrefersDark(true);
    renderControls({ theme: null });
    fireEvent.click(screen.getByTitle('Switch light or dark mode'));
    expect(setThemeMock).toHaveBeenCalledWith('light');
  });

  it('motion button toggles aria-pressed', () => {
    const { rerender } = renderControls({ motion: 'on' });
    expect(screen.getByTitle('Reduce animation')).toHaveAttribute('aria-pressed', 'false');

    rerender(controls({ motion: 'off' }));
    expect(screen.getByTitle('Reduce animation')).toHaveAttribute('aria-pressed', 'true');
  });

  it.each([
    { locale: 'en', theme: 'light', written: 'dark', spoken: 'Theme: dark' },
    { locale: 'en', theme: 'dark', written: 'light', spoken: 'Theme: light' },
    { locale: 'bn', theme: 'light', written: 'dark', spoken: 'থিম: অন্ধকার' },
    { locale: 'bn', theme: 'dark', written: 'light', spoken: 'থিম: আলো' },
  ] as const)(
    'announces "$spoken" on /$locale only once the $written theme has been written',
    async ({ locale, theme, written, spoken }) => {
      const write = deferred();
      setThemeMock.mockReturnValueOnce(write.promise);
      renderControls({ locale, theme });

      fireEvent.click(document.getElementById('theme') as HTMLElement);
      expect(setThemeMock).toHaveBeenCalledWith(written);
      expect(liveRegionText()).toBe('');

      await act(async () => {
        write.resolve();
        await write.promise;
      });
      expect(liveRegionText()).toBe(spoken);
    },
  );

  it.each([
    { locale: 'en', spoken: 'Theme: light' },
    { locale: 'bn', spoken: 'থিম: আলো' },
  ] as const)(
    'from "follow the system" in dark mode on /$locale it writes and announces light',
    async ({ locale, spoken }) => {
      mockPrefersDark(true);
      renderControls({ locale, theme: null });

      await act(async () => {
        fireEvent.click(document.getElementById('theme') as HTMLElement);
        await Promise.resolve();
      });

      expect(setThemeMock).toHaveBeenCalledWith('light');
      expect(liveRegionText()).toBe(spoken);
    },
  );

  it('announces nothing when the theme write fails, and the failure still surfaces', async () => {
    const failure = new Error('theme write failed');
    setThemeMock.mockReturnValueOnce(Promise.reject(failure));
    // Vitest fails the run on any unhandled rejection, so its listeners step
    // aside while this test checks the rejection still escapes unhandled.
    const vitestListeners = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    const surfaced: unknown[] = [];
    process.on('unhandledRejection', (reason) => {
      surfaced.push(reason);
    });

    try {
      renderControls({ theme: 'light' });
      await act(async () => {
        fireEvent.click(document.getElementById('theme') as HTMLElement);
        await new Promise((done) => setTimeout(done, 10));
      });

      expect(liveRegionText()).toBe('');
      expect(surfaced).toContain(failure);
    } finally {
      process.removeAllListeners('unhandledRejection');
      for (const listener of vitestListeners) process.on('unhandledRejection', listener);
    }
  });

  it.each([
    { locale: 'en', target: 'bn', href: '/bn/doctors', pressed: 'false', glyph: 'অ' },
    { locale: 'bn', target: 'en', href: '/en/doctors', pressed: 'true', glyph: 'A' },
  ] as const)(
    'language toggle on /$locale leaves a note for $target, stays silent and keeps its link',
    async ({ locale, target, href, pressed, glyph }) => {
      routing.pathname = '/doctors';
      renderControls({ locale });
      const toggle = document.getElementById('lang') as HTMLElement;

      await act(async () => {
        fireEvent.click(toggle);
        await Promise.resolve();
      });

      const note = JSON.parse(window.sessionStorage.getItem(LANGUAGE_NOTE_KEY) ?? 'null') as {
        targetLocale: string;
        path: string;
        at: number;
      } | null;
      expect(note).toMatchObject({ targetLocale: target, path: '/doctors' });
      expect(typeof note?.at).toBe('number');
      expect(liveRegionText()).toBe('');
      expect(setLangMock).toHaveBeenCalledWith(target);
      expect(toggle).toHaveAttribute('href', href);
      expect(toggle).toHaveAttribute('aria-pressed', pressed);
      expect(toggle).toHaveTextContent(glyph);
    },
  );

  it('language toggle still switches when the tab storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    routing.pathname = '/doctors';
    renderControls({ locale: 'en' });
    const toggle = document.getElementById('lang') as HTMLElement;

    await act(async () => {
      fireEvent.click(toggle);
      await Promise.resolve();
    });

    expect(setLangMock).toHaveBeenCalledWith('bn');
    expect(toggle).toHaveAttribute('href', '/bn/doctors');
    expect(liveRegionText()).toBe('');
  });

  it.each(['en', 'bn'] as const)('motion toggle on /%s stays silent', async (locale) => {
    renderControls({ locale, motion: 'on' });

    await act(async () => {
      fireEvent.click(document.getElementById('motion') as HTMLElement);
      await Promise.resolve();
    });

    expect(setMotionMock).toHaveBeenCalledWith('off');
    expect(liveRegionText()).toBe('');
  });
});
