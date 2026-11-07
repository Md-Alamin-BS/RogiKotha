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
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

// The demo-slice pages read the session and the database; this table checks only their shell, so
// a signed-in reader and fixed synthetic records stand in. Each page's own test covers its data.
const RECORD = vi.hoisted(() => ({
  doctorName: 'Dr. Synthetic Haque',
  experienceTitle: 'Clear advice after a long wait',
}));

vi.mock('@/server/auth/session', async () => {
  const { buildCurrentAccount } = await import('@/components/patient/profile/profile-test-support');
  const account = buildCurrentAccount();
  return {
    getCurrentAccount: vi.fn(() => Promise.resolve(account)),
    requireAccount: vi.fn(() => Promise.resolve(account)),
  };
});

vi.mock('@/server/data', async () => {
  const { buildDoctorDetail } = await import('@/components/patient/doctors/directory-test-support');
  const { buildReviewDetail } =
    await import('@/components/patient/experience/experience-test-support');
  const { buildProfile } = await import('@/components/patient/profile/profile-test-support');
  const resolve = <T,>(value: T) => vi.fn(() => Promise.resolve(value));
  return {
    doctors: {
      listRecentPublishedReviews: resolve([]),
      getDoctor: resolve(buildDoctorDetail({ name: RECORD.doctorName })),
    },
    reviews: {
      getReviewByPublicId: resolve(buildReviewDetail({ title: RECORD.experienceTitle })),
      getOwnReviewForEdit: resolve(null),
    },
    comments: { listComments: resolve([]) },
    accounts: { getProfile: resolve(buildProfile()), listOwnReviews: resolve([]) },
  };
});

// U9's auth pages read the request (the Actor, the `rk.pending` cookie, the holder's own account and
// sessions); an anonymous reader with no cookie and empty results stand in. Their own tests cover
// each state.
vi.mock('@/server/auth', () => ({
  getActor: vi.fn(() =>
    Promise.resolve({
      kind: 'anonymous',
      capabilities: [],
      locale: active.locale,
      correlationId: 'pages-test',
    }),
  ),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: () => undefined })),
}));
vi.mock('@/server/actions/account', () => ({
  // U47: /write shows the contribution gate here, so its rows load no composer data.
  getContributionAccess: vi.fn(() => Promise.resolve('signed-out')),
  getOwnAccount: vi.fn(() =>
    Promise.resolve({
      ok: true,
      data: {
        username: 'synthetic_reader',
        displayName: 'Synthetic Reader',
        emailVerified: true,
        emailMasked: 's****@example.test',
      },
    }),
  ),
  listSessions: vi.fn(() => Promise.resolve({ ok: true, data: [] })),
}));

// U47: the experience, index, author and /me pages read the review module through the container;
// an empty module stands in, answering the one fixed experience. The page slots read their own
// data and have their own tests (experience/slots.test.tsx). The home reads U46's queries and the
// configuration through the container (U20 WF2); empty lists and the default settings stand in,
// and home-page.test.tsx covers its sections.
vi.mock('@/server/command-call', () => ({
  runCommand: vi.fn((command: { name: string }, raw: Record<string, unknown>) => {
    const answers: Record<string, unknown> = {
      'review.getExperience': {
        kind: 'experience',
        publicId: 'exp0000001',
        reviewKind: 'quick',
        title: RECORD.experienceTitle,
        story: 'A synthetic story.',
        sections: [],
        contentLanguage: 'en',
        relationship: 'self',
        period: { year: 2026, month: 4 },
        publishedAt: '2026-05-02',
        claims: [],
        tags: [],
        doctor: { publicId: 'd0c7015000', name: RECORD.doctorName },
        byline: { personaKind: 'named', displayName: 'Synthetic Author' },
        relatedByCondition: [],
        sameDoctor: [],
        otherByAuthor: [],
      },
      'review.listExperienceCards': { items: [] },
      'review.countExperiences': { total: 0 },
      'review.authorCards': { header: { username: raw.username }, page: { items: [] } },
      'review.listOwnReviews': [],
      'taxonomy.listConditions': [],
      'directory.listFacilities': { items: [], total: 0 },
    };
    return Promise.resolve({ ok: true, data: answers[command.name] });
  }),
}));
vi.mock('@/server/container', async () => {
  const { DEFAULT_CONFIG_VALUES } = await import('@rogikotha/contracts');
  const command = (name: string) => ({ name });
  return {
    getContainer: () => ({
      taxonomy: { listConditions: command('taxonomy.listConditions') },
      directory: { listFacilities: command('directory.listFacilities') },
      review: {
        getExperience: command('review.getExperience'),
        countExperiences: command('review.countExperiences'),
        authorCards: command('review.authorCards'),
        listOwnReviews: command('review.listOwnReviews'),
        reviewIdForPublicId: () => Promise.resolve(null),
        isReviewAuthor: () => Promise.resolve(false),
      },
      reviewReads: { listExperienceCards: command('review.listExperienceCards') },
      ports: {
        unitOfWork: { read: (fn: (tx: unknown) => unknown) => fn({}) },
        config: { current: () => Promise.resolve(DEFAULT_CONFIG_VALUES) },
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    }),
  };
});
vi.mock('@/components/patient/comments/CommentThread', () => ({ CommentThread: () => null }));
vi.mock('@/components/patient/evidence/EvidenceSection', () => ({ EvidenceSection: () => null }));
vi.mock('@/components/patient/review-history/ReviewHistory', () => ({ ReviewHistory: () => null }));

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

type PageProps = { params: Promise<Record<string, string>> };

type PageModule = {
  default: (props: PageProps) => ReactElement | Promise<ReactElement>;
  generateMetadata: (props: PageProps) => Promise<Metadata>;
};

interface RouteCase {
  route: string;
  load: () => Promise<unknown>;
  view: ViewName;
  // Dynamic segment handed to the page, shown back to the reader unless `recordTitle` is set.
  params?: Record<string, string>;
  // The page brings its own heading, so ViewShell renders none.
  ownsHeading?: boolean;
  noindex?: boolean;
  // A page showing a real record names that record, in its heading and its tab title.
  recordTitle?: string;
}

const ROUTES: RouteCase[] = [
  {
    route: '/',
    load: () => import('./[locale]/(patient)/page'),
    view: 'discover',
    ownsHeading: true,
  },
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
    // U47: AuthorProfile brings the `@username` heading (WF8).
    ownsHeading: true,
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
    params: { id: 'exp0000001' },
    ownsHeading: true,
    recordTitle: RECORD.experienceTitle,
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

function propsFor(routeCase: RouteCase): PageProps {
  return { params: Promise.resolve(routeCase.params ?? {}) };
}

async function renderRoute(routeCase: RouteCase, locale: (typeof LOCALES)[number]) {
  const page = (await routeCase.load()) as PageModule;
  const element = await page.default(propsFor(routeCase));
  const messages = loadMessages(locale);
  render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {element}
    </NextIntlClientProvider>,
  );
  return { page, translate: createTranslator({ locale, messages }) };
}

// Under load the first import of a route (`/emergency` pulls in the whole contracts barrel) passed
// 5 s inside its test (ISS-296); every route module is transformed once here instead.
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
      // ViewShell's generic heading is the section's own child; a ported page may style its
      // heading `.display` further in.
      expect(document.querySelector('section.view > h1.display')).toBeNull();
    },
  );

  it.each(ROUTES.filter((r) => r.recordTitle))(
    '$route names the record in its heading',
    async (routeCase) => {
      await renderRoute(routeCase, locale);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        routeCase.recordTitle ?? '',
      );
    },
  );

  it.each(ROUTES.filter((r) => r.params && !r.recordTitle))(
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
    const metadata = await page.generateMetadata(propsFor(routeCase));
    expect(metadata.title).toBe(
      routeCase.recordTitle
        ? `${routeCase.recordTitle} — ${translate('brand.name' as never)}`
        : documentTitle(routeCase.view, (key) => translate(key as never)),
    );
  });

  it.each(ROUTES)('$route keeps search engines out only where it should', async (routeCase) => {
    const page = (await routeCase.load()) as PageModule;
    const metadata = await page.generateMetadata(propsFor(routeCase));
    if (routeCase.noindex) {
      expect(metadata.robots).toEqual({ index: false });
    } else {
      expect(metadata.robots).toBeUndefined();
    }
  });
});

describe('route pages and the language switch', () => {
  it('gives the English and Bengali version of each tab title a different text', async () => {
    const search = ROUTES.find((r) => r.route === '/search');
    if (!search) throw new Error('search route missing from the table');
    const page = (await search.load()) as PageModule;
    active.locale = 'en';
    const english = (await page.generateMetadata(propsFor(search))).title;
    active.locale = 'bn';
    const bengali = (await page.generateMetadata(propsFor(search))).title;
    expect(english).not.toBe(bengali);
  });
});
