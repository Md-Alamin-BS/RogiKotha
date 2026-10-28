import type { ReactElement, ReactNode } from 'react';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator, type AbstractIntlMessages } from 'next-intl';
import type { Metadata } from 'next';
import { documentTitle, titleForView, type ViewName } from '@/lib/titles';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

// The server-side translator the pages ask for. No Next request exists under Vitest, so this
// stands in for next-intl/server with a translator built from the real message files.
vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
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

const messagesByLocale = new Map<string, AbstractIntlMessages>();

function loadMessages(locale: (typeof LOCALES)[number]): AbstractIntlMessages {
  const cached = messagesByLocale.get(locale);
  if (cached !== undefined) return cached;
  const file = path.join(i18nPackageRoot, 'messages', `${locale}.json`);
  const messages = JSON.parse(fs.readFileSync(file, 'utf8')) as AbstractIntlMessages;
  messagesByLocale.set(locale, messages);
  return messages;
}

type PageModule = {
  default: (props: {
    params: Promise<Record<string, string>>;
  }) => ReactElement | Promise<ReactElement>;
  generateMetadata: () => Promise<Metadata>;
};

interface RouteCase {
  route: string;
  load: () => Promise<unknown>;
  view: ViewName;
  // Dynamic segment handed to the page, shown back to the reader.
  params?: Record<string, string>;
  // The page brings its own heading, so ViewShell renders none.
  ownsHeading?: boolean;
  noindex?: boolean;
}

const ROUTES: RouteCase[] = [
  { route: '/', load: () => import('./[locale]/(patient)/page'), view: 'discover' },
  {
    route: '/about',
    load: () => import('./[locale]/(patient)/about/page'),
    view: 'about',
    ownsHeading: true,
  },
  {
    route: '/authors/[username]',
    load: () => import('./[locale]/(patient)/authors/[username]/page'),
    view: 'person',
    params: { username: 'synthetic-writer' },
    noindex: true,
  },
  { route: '/doctors', load: () => import('./[locale]/(patient)/doctors/page'), view: 'doctors' },
  {
    route: '/doctors/[id]',
    load: () => import('./[locale]/(patient)/doctors/[id]/page'),
    view: 'profile',
    params: { id: 'doc-synthetic-1' },
  },
  {
    route: '/emergency',
    load: () => import('./[locale]/(patient)/emergency/page'),
    view: 'emergency',
    ownsHeading: true,
  },
  {
    route: '/experiences',
    load: () => import('./[locale]/(patient)/experiences/page'),
    view: 'experiences',
  },
  {
    route: '/experiences/[id]',
    load: () => import('./[locale]/(patient)/experiences/[id]/page'),
    view: 'account',
    params: { id: 'exp-synthetic-1' },
  },
  {
    route: '/facilities',
    load: () => import('./[locale]/(patient)/facilities/page'),
    view: 'facilities',
  },
  {
    route: '/facilities/[id]',
    load: () => import('./[locale]/(patient)/facilities/[id]/page'),
    view: 'facility',
    params: { id: 'fac-synthetic-1' },
  },
  { route: '/me', load: () => import('./[locale]/(patient)/me/page'), view: 'mine', noindex: true },
  {
    route: '/me/security',
    load: () => import('./[locale]/(patient)/me/security/page'),
    view: 'security',
    noindex: true,
  },
  {
    route: '/notifications',
    load: () => import('./[locale]/(patient)/notifications/page'),
    view: 'notifications',
    noindex: true,
  },
  {
    route: '/privacy',
    load: () => import('./[locale]/(patient)/privacy/page'),
    view: 'privacy',
    ownsHeading: true,
  },
  {
    route: '/register',
    load: () => import('./[locale]/(patient)/register/page'),
    view: 'register',
    noindex: true,
  },
  {
    route: '/reset-password',
    load: () => import('./[locale]/(patient)/reset-password/page'),
    view: 'reset',
    noindex: true,
  },
  {
    route: '/saved',
    load: () => import('./[locale]/(patient)/saved/page'),
    view: 'saved',
    noindex: true,
  },
  { route: '/search', load: () => import('./[locale]/(patient)/search/page'), view: 'results' },
  {
    route: '/sign-in',
    load: () => import('./[locale]/(patient)/sign-in/page'),
    view: 'signin',
    noindex: true,
  },
  {
    route: '/terms',
    load: () => import('./[locale]/(patient)/terms/page'),
    view: 'terms',
    ownsHeading: true,
  },
  { route: '/topics', load: () => import('./[locale]/(patient)/topics/page'), view: 'topics' },
  {
    route: '/topics/[id]',
    load: () => import('./[locale]/(patient)/topics/[id]/page'),
    view: 'condition',
    params: { id: 'topic-synthetic-1' },
  },
  {
    route: '/verify-email',
    load: () => import('./[locale]/(patient)/verify-email/page'),
    view: 'verify',
    noindex: true,
  },
  { route: '/write', load: () => import('./[locale]/(patient)/write/page'), view: 'compose' },
  {
    route: '/admin/approve-device',
    load: () => import('./[locale]/admin/approve-device/page'),
    view: 'admin-approve',
  },
  { route: '/admin/config', load: () => import('./[locale]/admin/config/page'), view: 'config' },
  {
    route: '/admin/evidence',
    load: () => import('./[locale]/admin/evidence/page'),
    view: 'evidence',
  },
  {
    route: '/admin/notifications',
    load: () => import('./[locale]/admin/notifications/page'),
    view: 'admin-notifications',
  },
  {
    route: '/admin/providers',
    load: () => import('./[locale]/admin/providers/page'),
    view: 'providers',
  },
  { route: '/admin/queue', load: () => import('./[locale]/admin/queue/page'), view: 'queue' },
  {
    route: '/admin/queue/[code]',
    load: () => import('./[locale]/admin/queue/[code]/page'),
    view: 'queue',
    params: { code: 'RK-CASE-0001' },
  },
  {
    route: '/admin/security',
    load: () => import('./[locale]/admin/security/page'),
    view: 'admin-security',
  },
  {
    route: '/admin/sign-in',
    load: () => import('./[locale]/admin/sign-in/page'),
    view: 'admin-signin',
  },
];

async function renderRoute(routeCase: RouteCase, locale: (typeof LOCALES)[number]) {
  const page = (await routeCase.load()) as PageModule;
  const element = await page.default({ params: Promise.resolve(routeCase.params ?? {}) });
  const messages = loadMessages(locale);
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {element}
    </NextIntlClientProvider>,
  );
  return { page, translate: createTranslator({ locale, messages }) };
}

// Under load the first import of a route (`/emergency` pulls in the whole contracts barrel) passed
// 5 s inside its test (ISS-273); every route module is transformed once here instead.
beforeAll(async () => {
  await Promise.all(ROUTES.map((routeCase) => routeCase.load()));
}, 120_000);

describe.each(LOCALES)('route pages in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
  });

  it.each(ROUTES)('$route renders its own view section', async (routeCase) => {
    await renderRoute(routeCase, locale);
    const section = document.getElementById(`view-${routeCase.view}`);
    expect(section).not.toBeNull();
    expect(section?.tagName).toBe('SECTION');
  });

  it.each(ROUTES.filter((r) => !r.ownsHeading))(
    '$route titles the view with the heading for its view name',
    async (routeCase) => {
      const { translate } = await renderRoute(routeCase, locale);
      const expected = titleForView(routeCase.view, (key) => translate(key as never));
      if (expected === '') {
        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
      } else {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(expected);
      }
    },
  );

  it.each(ROUTES.filter((r) => r.ownsHeading))(
    '$route shows one heading of its own, not a generic one above it',
    async (routeCase) => {
      await renderRoute(routeCase, locale);
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(document.querySelector('h1.display')).toBeNull();
    },
  );

  it.each(ROUTES.filter((r) => r.params))(
    '$route tells the reader which record was asked for',
    async (routeCase) => {
      await renderRoute(routeCase, locale);
      for (const value of Object.values(routeCase.params ?? {})) {
        expect(screen.getByText(new RegExp(value))).toBeInTheDocument();
      }
    },
  );

  it.each(ROUTES)('$route sets the browser tab title for its view', async (routeCase) => {
    const page = (await routeCase.load()) as PageModule;
    const messages = loadMessages(locale);
    const translate = createTranslator({ locale, messages });
    const metadata = await page.generateMetadata();
    expect(metadata.title).toBe(documentTitle(routeCase.view, (key) => translate(key as never)));
  });

  it.each(ROUTES)('$route keeps search engines out only where it should', async (routeCase) => {
    const page = (await routeCase.load()) as PageModule;
    const metadata = await page.generateMetadata();
    if (routeCase.noindex) {
      expect(metadata.robots).toEqual({ index: false });
    } else {
      expect(metadata.robots).toBeUndefined();
    }
  });
});

describe('route pages and the language switch', () => {
  it('gives the English and Bengali version of each tab title a different text', async () => {
    const doctors = ROUTES.find((r) => r.route === '/doctors');
    if (!doctors) throw new Error('doctors route missing from the table');
    const page = (await doctors.load()) as PageModule;
    active.locale = 'en';
    const english = (await page.generateMetadata()).title;
    active.locale = 'bn';
    const bengali = (await page.generateMetadata()).title;
    expect(english).not.toBe(bengali);
  });
});
