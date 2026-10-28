import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import type * as NextIntl from 'next-intl';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { MOTION_COOKIE, THEME_COOKIE } from '@/lib/cookies';
import LocaleLayout from './[locale]/layout';
import PatientLayout from './[locale]/(patient)/layout';
import AdminLayout, { metadata as adminMetadata } from './[locale]/admin/layout';

const require = createRequire(import.meta.url);
const i18nPackageRoot = path.resolve(path.dirname(require.resolve('@rogikotha/i18n')), '..');
const LOCALES = ['en', 'bn'] as const;
type Locale = (typeof LOCALES)[number];

function loadMessages(locale: Locale): AbstractIntlMessages {
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
}

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

// The locale the layout announced to next-intl for this request.
const requestLocale = vi.hoisted(() => ({ current: 'en', set: vi.fn() }));

// Next raises a control-flow error from notFound(); the stand-in does the same.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getMessages: () => Promise.resolve(loadMessages(requestLocale.current as Locale)),
  getLocale: () => Promise.resolve(requestLocale.current),
  setRequestLocale: (locale: string) => {
    requestLocale.current = locale;
    requestLocale.set(locale);
  },
}));
// Under Next's server build the provider infers the locale from the request; the plain build
// used by Vitest cannot, so the stand-in supplies the locale the layout announced.
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof NextIntl>();
  return {
    ...actual,
    NextIntlClientProvider: ({
      locale,
      ...props
    }: ComponentProps<typeof actual.NextIntlClientProvider>) => (
      <actual.NextIntlClientProvider locale={locale ?? requestLocale.current} {...props} />
    ),
  };
});
// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'bn'], defaultLocale: 'en' },
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
  }) => (
    <a href={locale ? `/${locale}${href}` : href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/server/actions/preferences', () => ({
  setTheme: vi.fn(() => Promise.resolve()),
  setMotion: vi.fn(() => Promise.resolve()),
  setLang: vi.fn(() => Promise.resolve()),
}));

// Builder: what the request carries for a layout to read.
function givenRequest({
  pathname,
  theme,
  motion,
}: {
  pathname?: string;
  theme?: string;
  motion?: string;
}) {
  const values: Record<string, string> = {};
  if (theme) values[THEME_COOKIE] = theme;
  if (motion) values[MOTION_COOKIE] = motion;
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => (name in values ? { name, value: values[name] } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => (name === 'x-pathname' ? (pathname ?? null) : null),
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

function inLocale(locale: Locale, ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
}

async function renderedDocument(locale: string) {
  const element = await LocaleLayout({
    children: <p>page content</p>,
    params: Promise.resolve({ locale }),
  });
  const html = renderToStaticMarkup(element);
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('locale layout', () => {
  beforeEach(() => {
    requestLocale.set.mockReset();
    vi.mocked(notFound).mockClear();
  });

  it.each(LOCALES)('owns the %s document: language, content and live region', async (locale) => {
    givenRequest({ pathname: `/${locale}/doctors` });
    const doc = await renderedDocument(locale);
    expect(doc.documentElement.getAttribute('lang')).toBe(locale);
    expect(doc.documentElement.getAttribute('data-lang')).toBe(locale);
    expect(doc.body.textContent).toContain('page content');
    expect(doc.getElementById('sr-live')?.getAttribute('aria-live')).toBe('polite');
    expect(requestLocale.set).toHaveBeenCalledWith(locale);
  });

  it('refuses a locale the site does not serve', async () => {
    givenRequest({ pathname: '/fr' });
    await expect(renderedDocument('fr')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('applies the stored theme and motion choices before the first paint', async () => {
    givenRequest({ pathname: '/en', theme: 'dark', motion: 'off' });
    const doc = await renderedDocument('en');
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(doc.body.getAttribute('data-motion')).toBe('off');
  });

  it('leaves the theme to the system and keeps motion on when nothing was stored', async () => {
    givenRequest({ pathname: '/en' });
    const doc = await renderedDocument('en');
    expect(doc.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(doc.body.getAttribute('data-motion')).toBe('on');
  });

  it('marks pages under /admin as the staff app and everything else as the patient app', async () => {
    givenRequest({ pathname: '/bn/admin/queue' });
    expect((await renderedDocument('bn')).body.getAttribute('data-app')).toBe('admin');
    givenRequest({ pathname: '/bn/doctors' });
    expect((await renderedDocument('bn')).body.getAttribute('data-app')).toBe('patient');
  });

  it('treats a request with no pathname header as the locale home, a patient page', async () => {
    givenRequest({});
    expect((await renderedDocument('en')).body.getAttribute('data-app')).toBe('patient');
  });
});

describe.each(LOCALES)('patient layout in %s', (locale) => {
  async function renderPatient(options: Parameters<typeof givenRequest>[0]) {
    givenRequest(options);
    const element = await PatientLayout({
      children: <p>patient page content</p>,
      params: Promise.resolve({ locale }),
    });
    return inLocale(locale, element as ReactElement);
  }

  it('wraps the page in the skip link, demo marker, masthead and colophon', async () => {
    await renderPatient({ pathname: `/${locale}` });
    expect(screen.getByRole('link', { name: copy(locale, 'a11y.skip') })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getAllByText(copy(locale, 'demo.banner')).length).toBeGreaterThan(0);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('puts the page content inside the main landmark', async () => {
    await renderPatient({ pathname: `/${locale}` });
    expect(within(screen.getByRole('main')).getByText('patient page content')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('highlights the tab for the current page', async () => {
    await renderPatient({ pathname: `/${locale}/doctors` });
    const current = document.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent(copy(locale, 'nav.profile'));
  });

  it('highlights no tab on a page that is not one of the six', async () => {
    await renderPatient({ pathname: `/${locale}/emergency` });
    expect(within(screen.getByRole('banner')).queryByRole('link', { current: 'page' })).toBeNull();
  });

  it('falls back to the locale home when the pathname header is missing', async () => {
    await renderPatient({});
    const current = document.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent(copy(locale, 'nav.discover'));
  });
});

describe.each(LOCALES)('admin layout in %s', (locale) => {
  async function renderAdmin(options: Parameters<typeof givenRequest>[0]) {
    givenRequest(options);
    const element = await AdminLayout({
      children: <p>admin page content</p>,
      params: Promise.resolve({ locale }),
    });
    return inLocale(locale, element as ReactElement);
  }

  it('wraps the page in the staff masthead, breadcrumbs, tab bar and colophon', async () => {
    await renderAdmin({ pathname: `/${locale}/admin/evidence` });
    expect(
      within(screen.getByRole('banner')).getByText(copy(locale, 'admin.staffOnly')),
    ).toBeInTheDocument();
    expect(document.querySelector('.crumbs b')).toHaveTextContent(
      copy(locale, 'admin.tab.evidence'),
    );
    expect(document.querySelector('nav.tabbar')).not.toBeNull();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(copy(locale, 'admin.staffOnlyNote'));
  });

  it('puts the page content inside the main landmark', async () => {
    await renderAdmin({ pathname: `/${locale}/admin/queue` });
    expect(within(screen.getByRole('main')).getByText('admin page content')).toBeInTheDocument();
  });

  it('marks the current tab in both the top nav and the tab bar', async () => {
    await renderAdmin({ pathname: `/${locale}/admin/config` });
    const current = Array.from(document.querySelectorAll('[aria-current="page"]'));
    expect(current).toHaveLength(2);
    for (const item of current) expect(item).toHaveAttribute('data-admin', 'config');
  });

  it('shows no nav counts until the case counts are wired in', async () => {
    await renderAdmin({ pathname: `/${locale}/admin/queue` });
    expect(document.querySelector('.count, .tab-dot')).toBeNull();
  });

  it('falls back to the queue tab when the pathname header is missing', async () => {
    await renderAdmin({});
    expect(document.querySelector('.crumbs b')).toHaveTextContent(copy(locale, 'admin.tab.queue'));
  });
});

describe('admin layout metadata', () => {
  it('keeps every staff page out of search engines', () => {
    expect(adminMetadata.robots).toEqual({ index: false });
  });
});
