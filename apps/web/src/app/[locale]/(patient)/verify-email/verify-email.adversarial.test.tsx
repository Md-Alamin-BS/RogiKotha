// Adversarial tests (U9 plan Step 14, angle 5; BR3.1, BR1.4, BR1.5; T-106), by a tester who did
// not build the page: a link scanner that runs scripts opens the emailed `/verify-email?token=`
// link, and a crafted link tries to reflect markup or send a verified reader off-site. Opening the
// page, hydrating it and running its effects must confirm nothing and set or drop no cookie.
// ASSUMPTION(U9): the `web-int` project has no JSX transform, so the page runs here with its
// collaborators mocked; the DB-backed angles are in `server/actions/*.adversarial.int.test.ts`.
import type { ReactNode } from 'react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { Actor } from '@rogikotha/contracts';
import {
  LOCALES,
  loadMessages,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import { confirmEmail, resendLink, resendOwnLink } from '@/server/actions/auth';
import VerifyEmailPage from './page';

const active = vi.hoisted(
  (): {
    locale: 'en' | 'bn';
    actor: Actor | null;
    cookies: Record<string, string>;
    writes: string[];
  } => ({ locale: 'en', actor: null, cookies: {}, writes: [] }),
);

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
}));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        name in active.cookies ? { name, value: active.cookies[name] } : undefined,
      set: (name: string) => {
        active.writes.push(`set ${name}`);
      },
      delete: (name: string) => {
        active.writes.push(`delete ${name}`);
      },
    }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock('@/server/actions/auth', () => ({
  confirmEmail: vi.fn(),
  resendLink: vi.fn(),
  resendOwnLink: vi.fn(),
}));
vi.mock('@/server/auth', () => ({
  getActor: () =>
    Promise.resolve(
      active.actor ?? {
        kind: 'anonymous',
        capabilities: [],
        locale: active.locale,
        correlationId: 'test',
      },
    ),
}));
// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children?: ReactNode;
    [key: string]: unknown;
  }) => {
    const target =
      typeof href === 'string' ? href : `${href.pathname}?${new URLSearchParams(href.query)}`;
    return (
      <a href={target} {...rest}>
        {children}
      </a>
    );
  },
  usePathname: () => '/',
}));

const TOKEN = 'synthetic-scanner-token';

function verifiedAccount(locale: TestLocale): Actor {
  return {
    kind: 'account',
    accountId: 'account-synthetic',
    emailVerified: true,
    status: 'active',
    capabilities: [],
    locale,
    correlationId: 'test',
  };
}

async function openAndHydrate(locale: TestLocale, search: Record<string, string | string[]>) {
  active.locale = locale;
  const element = await VerifyEmailPage({ searchParams: Promise.resolve(search) });
  await act(async () => {
    render(
      <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
        {element}
      </NextIntlClientProvider>,
    );
    // Lets every effect and any queued microtask run, as a script-running scanner would wait.
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  active.actor = null;
  active.cookies = {};
  active.writes = [];
  window.history.replaceState(null, '', '/');
});

describe.each(LOCALES)('a scanner or a crafted link on /verify-email in %s', (locale) => {
  it('opening and hydrating the emailed link confirms nothing, sends nothing and writes no cookie', async () => {
    window.history.replaceState(null, '', `/${locale}/verify-email?token=${TOKEN}`);

    await openAndHydrate(locale, { token: TOKEN });

    expect(confirmEmail).not.toHaveBeenCalled();
    expect(resendLink).not.toHaveBeenCalled();
    expect(resendOwnLink).not.toHaveBeenCalled();
    expect(active.writes).toEqual([]);
    // BR1.4: the token leaves the address bar once the page has hydrated.
    expect(window.location.search).not.toContain(TOKEN);
  });

  it('reflects a token carrying markup only as an inert hidden value', async () => {
    const hostile = '"><img src=x onerror=alert(1)><script>alert(1)</script>';

    await openAndHydrate(locale, { token: hostile });

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="token"]')?.value).toBe(hostile);
    expect(confirmEmail).not.toHaveBeenCalled();
  });

  it.each([
    'https://evil.example/',
    '//evil.example/',
    '/\\evil.example',
    `/${locale}/%2F%2Fevil.example`,
    `/${locale}/sign-in?next=https://evil.example`,
    'javascript:alert(1)',
  ])('a verified reader of the done panel is never sent to %s', async (next) => {
    active.actor = verifiedAccount(locale);

    await openAndHydrate(locale, { confirmed: '1', next });

    expect(screen.getByTestId('verify-done-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('verify-continue-link')).toBeNull();
    for (const anchor of document.querySelectorAll('a')) {
      expect(anchor.getAttribute('href') ?? '').toMatch(/^\/(?!\/)/);
    }
  });
});
