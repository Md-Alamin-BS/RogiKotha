import type { ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { LiveRegion } from '@/components/shared/LiveRegion';
import { writeNote } from '@/components/shared/ThemeControls';
import type { ViewName } from '@/lib/titles';
import { ViewShell } from './ViewShell';

const routing = vi.hoisted(() => ({ pathname: '/' }));

// See components/patient/Masthead.test.tsx for why this mocks the app's own
// `@/i18n/routing` re-export rather than `next/navigation` directly.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children?: ReactNode }) => <a href={href}>{children}</a>,
  usePathname: () => routing.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');

function loadMessages(locale: 'en' | 'bn'): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

const LANGUAGE_NOTE_KEY = 'rk.langNote';
const ARRIVAL_DELAY_MS = 150;

type ShellOptions = {
  locale?: 'en' | 'bn';
  view?: ViewName;
  title?: string;
  path?: string;
  messages?: AbstractIntlMessages;
};

function shell({ locale = 'en', view = 'doctors', title = '', messages }: ShellOptions = {}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages ?? loadMessages(locale)}>
      <LiveRegion />
      <ViewShell view={view} title={title}>
        <p>content</p>
      </ViewShell>
    </NextIntlClientProvider>
  );
}

function renderShell(options: ShellOptions = {}) {
  routing.pathname = options.path ?? '/doctors';
  return render(shell(options));
}

function liveRegionText(): string {
  return document.getElementById('sr-live')?.textContent ?? '';
}

function waitForArrival() {
  act(() => {
    vi.advanceTimersByTime(ARRIVAL_DELAY_MS);
  });
}

describe('ViewShell', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // Regression test for ISS-121 (fixed in T-207a): the Discover placeholder
  // page passed title="" and got a real, empty `<h1 class="display">` in the
  // DOM — an axe/WCAG failure. A page whose own content brings a complete
  // heading (Emergency, About, Policy) also passes title="" on purpose, so
  // this must render no heading at all rather than an empty one.
  it('renders no heading when title is empty', () => {
    renderShell({ view: 'discover', title: '', path: '/' });
    expect(screen.queryByRole('heading')).toBeNull();
    expect(document.getElementById('view-discover')).toBeInTheDocument();
  });

  it('renders the heading when title is non-empty', () => {
    renderShell({ view: 'about', title: 'About & methodology', path: '/about' });
    expect(screen.getByRole('heading', { level: 1, name: 'About & methodology' })).toBeInTheDocument();
  });

  it.each([
    { locale: 'en', view: 'doctors', path: '/doctors', spoken: 'View: Doctors' },
    { locale: 'bn', view: 'doctors', path: '/doctors', spoken: 'পাতা: ডাক্তারেরা' },
    { locale: 'en', view: 'signin', path: '/sign-in', spoken: 'View: Sign in' },
    { locale: 'bn', view: 'signin', path: '/sign-in', spoken: 'পাতা: সাইন ইন' },
    { locale: 'en', view: 'admin-security', path: '/admin/security', spoken: 'View: Security' },
    { locale: 'bn', view: 'admin-security', path: '/admin/security', spoken: 'পাতা: নিরাপত্তা' },
  ] as const)(
    'announces the $view view on /$locale by its localized name, never its identifier',
    ({ locale, view, path: viewPath, spoken }) => {
      renderShell({ locale, view, path: viewPath });
      waitForArrival();

      const text = liveRegionText();
      expect(text).toBe(spoken);
      expect(text).not.toContain(view);
      expect(document.getElementById(`view-${view}`)).toBeInTheDocument();
    },
  );

  it.each([
    { locale: 'en', spoken: 'View: Discover' },
    { locale: 'bn', spoken: 'পাতা: খুঁজুন' },
  ] as const)('names the home view on /$locale after nav.discover', ({ locale, spoken }) => {
    renderShell({ locale, view: 'discover', path: '/' });
    waitForArrival();
    expect(liveRegionText()).toBe(spoken);
  });

  it('waits a moment after mount before it announces, so a fresh live region is heard', () => {
    renderShell({ locale: 'en' });
    expect(liveRegionText()).toBe('');
    waitForArrival();
    expect(liveRegionText()).toBe('View: Doctors');
  });

  it.each([
    { locale: 'en', spoken: 'Language: English' },
    { locale: 'bn', spoken: 'ভাষা: বাংলা' },
  ] as const)(
    'announces the language once on arrival in /$locale after the toggle, then forgets the note',
    ({ locale, spoken }) => {
      writeNote(locale, '/doctors');
      const first = renderShell({ locale });
      waitForArrival();
      expect(liveRegionText()).toBe(spoken);
      expect(window.sessionStorage.getItem(LANGUAGE_NOTE_KEY)).toBeNull();

      first.unmount();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      renderShell({ locale });
      waitForArrival();
      expect(liveRegionText()).toBe(locale === 'bn' ? 'পাতা: ডাক্তারেরা' : 'View: Doctors');
    },
  );

  it('discards a note older than 30 seconds and announces the view', () => {
    writeNote('bn', '/doctors');
    vi.advanceTimersByTime(30_001);
    renderShell({ locale: 'bn' });
    waitForArrival();
    expect(liveRegionText()).toBe('পাতা: ডাক্তারেরা');
    expect(window.sessionStorage.getItem(LANGUAGE_NOTE_KEY)).toBeNull();
  });

  it('discards a note for another path in the same locale and announces the view', () => {
    writeNote('bn', '/facilities');
    renderShell({ locale: 'bn', path: '/doctors' });
    waitForArrival();
    expect(liveRegionText()).toBe('পাতা: ডাক্তারেরা');
    expect(window.sessionStorage.getItem(LANGUAGE_NOTE_KEY)).toBeNull();
  });

  it('leaves a fresh note for the other locale alone and announces the view', () => {
    writeNote('bn', '/doctors');
    renderShell({ locale: 'en', path: '/doctors' });
    waitForArrival();
    expect(liveRegionText()).toBe('View: Doctors');
    expect(window.sessionStorage.getItem(LANGUAGE_NOTE_KEY)).not.toBeNull();
  });

  it('announces the view without an error when the tab storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);

    expect(() => writeNote('bn', '/doctors')).not.toThrow();
    renderShell({ locale: 'bn' });
    waitForArrival();
    expect(liveRegionText()).toBe('পাতা: ডাক্তারেরা');
  });

  it('does not announce the view again when the layout re-renders with fresh messages', () => {
    const { rerender } = renderShell({ locale: 'en' });
    waitForArrival();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(liveRegionText()).toBe('');

    rerender(shell({ locale: 'en', messages: loadMessages('en') }));
    waitForArrival();
    expect(liveRegionText()).toBe('');
  });
});
