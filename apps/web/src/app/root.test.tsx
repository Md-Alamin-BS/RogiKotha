import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import RootLayout from './layout';
import NotFound from './not-found';
import RootPage from './page';
import AdminIndexPage from './[locale]/admin/page';
import { GET as health } from './api/health/route';

// Next's redirect() never returns: it throws a control-flow error. The stand-in does the same,
// carrying the target, so the code after a redirect cannot run by accident.
class Redirected extends Error {
  constructor(readonly target: string) {
    super(`NEXT_REDIRECT ${target}`);
  }
}
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Redirected(target);
  }),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'bn'], defaultLocale: 'en' },
}));

// Builder: the request cookies and Accept-Language the root page reads.
function givenRequest({
  langCookie,
  acceptLanguage,
}: {
  langCookie?: string;
  acceptLanguage?: string;
}) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) =>
      name === 'rk.lang' && langCookie !== undefined ? { name, value: langCookie } : undefined,
  } as unknown as Awaited<ReturnType<typeof cookies>>);
  vi.mocked(headers).mockResolvedValue({
    get: (name: string) => (name === 'accept-language' ? (acceptLanguage ?? null) : null),
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

async function redirectTarget(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    if (error instanceof Redirected) return error.target;
    throw error;
  }
  throw new Error('Expected a redirect');
}

describe('root page', () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
  });

  it.each(['en', 'bn'])('sends a reader with the %s language cookie to that site', async (lang) => {
    givenRequest({ langCookie: lang, acceptLanguage: 'en-US' });
    await expect(redirectTarget(RootPage)).resolves.toBe(`/${lang}`);
  });

  it('lets the language cookie win over the browser language', async () => {
    givenRequest({ langCookie: 'en', acceptLanguage: 'bn-BD,bn;q=0.9' });
    await expect(redirectTarget(RootPage)).resolves.toBe('/en');
  });

  it('ignores a language cookie for a language the site does not serve', async () => {
    givenRequest({ langCookie: 'fr', acceptLanguage: 'bn' });
    await expect(redirectTarget(RootPage)).resolves.toBe('/bn');
  });

  it.each([
    ['bn-BD,bn;q=0.9,en;q=0.8', '/bn'],
    ['en-GB,en;q=0.9', '/en'],
    ['fr-FR, bn;q=0.5', '/bn'],
    ['BN', '/bn'],
  ])('follows the browser language %s', async (acceptLanguage, target) => {
    givenRequest({ acceptLanguage });
    await expect(redirectTarget(RootPage)).resolves.toBe(target);
  });

  it('uses the default language when the browser sends none', async () => {
    givenRequest({});
    await expect(redirectTarget(RootPage)).resolves.toBe('/en');
  });

  it('uses the default language when the browser asks only for languages the site lacks', async () => {
    givenRequest({ acceptLanguage: 'fr-FR,de;q=0.8' });
    await expect(redirectTarget(RootPage)).resolves.toBe('/en');
  });

  it('redirects exactly once', async () => {
    givenRequest({ langCookie: 'bn' });
    await redirectTarget(RootPage);
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});

describe('admin index page', () => {
  it.each(['en', 'bn'])('opens the report queue in the %s site', async (locale) => {
    await expect(
      redirectTarget(() => AdminIndexPage({ params: Promise.resolve({ locale }) })),
    ).resolves.toBe(`/${locale}/admin/queue`);
  });
});

describe('root layout', () => {
  it('passes the locale layout through without adding markup', () => {
    expect(renderToStaticMarkup(<RootLayout>{<p>inner</p>}</RootLayout>)).toBe('<p>inner</p>');
  });
});

describe('not-found page', () => {
  it('offers a way home in both languages, outside any locale provider', () => {
    const html = renderToStaticMarkup(<NotFound />);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/en', '/bn']);
    expect(doc.querySelector('[lang="bn"]')).not.toBeNull();
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
  });
});

describe('health route', () => {
  const originalMode = process.env.APP_MODE;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.APP_MODE;
    else process.env.APP_MODE = originalMode;
  });

  it('answers ok and reports every dependency as not yet probed', async () => {
    const response = health();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      db: 'unknown',
      queue: 'unknown',
      mail: 'unknown',
      scanner: 'unknown',
    });
  });

  it('reports the running mode from APP_MODE', async () => {
    process.env.APP_MODE = 'demo';
    await expect(health().json()).resolves.toMatchObject({ mode: 'demo' });
  });

  it('reports the mode as unknown when APP_MODE is not set', async () => {
    delete process.env.APP_MODE;
    await expect(health().json()).resolves.toMatchObject({ mode: 'unknown' });
  });
});
