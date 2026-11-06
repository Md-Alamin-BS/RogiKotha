import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect as redirectToSignIn } from '@rogikotha/i18n';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import { getOwnAccount, listSessions } from '@/server/actions/account';
import { getRequestContext } from '@/server/auth';
import { session } from '@/server/data';
import SecuritySettingsPage, { generateMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));
// The real `requireAccount` runs; only what it reads from the request and the data layer is stubbed.
vi.mock('@/server/auth', () => ({ getRequestContext: vi.fn() }));
vi.mock('@/server/data', () => ({ session: { getCurrentAccountByAuthUserId: vi.fn() } }));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('@/server/actions/account', () => ({ getOwnAccount: vi.fn(), listSessions: vi.fn() }));
vi.mock('@/server/actions/auth', () => ({
  changePasswordForm: vi.fn(),
  resendOwnLink: vi.fn(),
  signOutEverywhereForm: vi.fn(),
}));
// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

const HOLDER: DemoCurrentAccount = {
  accountId: 'account-synthetic',
  authUserId: 'auth-synthetic',
  username: 'synthetic_reader',
  displayName: 'Synthetic Reader',
  locale: 'en',
  status: 'active',
  currentPersonaId: 'persona-synthetic',
  pseudonymousPersonaId: null,
  pseudonymousDisplayName: null,
};

const NO_HEADERS = { get: () => null };

function signedIn(locale: TestLocale) {
  const now = new Date('2026-11-05T10:00:00.000Z');
  vi.mocked(getRequestContext).mockResolvedValue({
    actor: {
      kind: 'account',
      accountId: HOLDER.accountId,
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale,
      correlationId: 'test',
    },
    request: { headers: NO_HEADERS, clientAddress: null, sessionId: 'session-synthetic-1' },
    session: {
      sessionId: 'session-synthetic-1',
      authUserId: HOLDER.authUserId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 86_400_000),
    },
  });
  vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(HOLDER);
}

async function renderPage(locale: TestLocale) {
  active.locale = locale;
  const element = await SecuritySettingsPage();
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getOwnAccount).mockResolvedValue({
    ok: true,
    data: {
      username: HOLDER.username,
      displayName: HOLDER.displayName,
      emailVerified: true,
      emailMasked: 'r****@example.test',
    },
  });
  vi.mocked(listSessions).mockResolvedValue({
    ok: true,
    data: [
      {
        id: 'session-synthetic-1',
        current: true,
        browser: 'Firefox',
        os: 'Linux',
        firstSeen: '2026-10-01T04:00:00.000Z',
        lastSeen: '2026-11-05T10:00:00.000Z',
      },
    ],
  });
});

describe.each(LOCALES)('the security page in %s', (locale) => {
  it('keeps search engines out', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false });
  });

  it('signed out, redirects to sign in with the page to return to and reads no account data', async () => {
    vi.mocked(getRequestContext).mockResolvedValue({
      actor: { kind: 'anonymous', capabilities: [], locale, correlationId: 'test' },
      request: { headers: NO_HEADERS, clientAddress: null, sessionId: null },
      session: null,
    });

    await expect(renderPage(locale)).rejects.toThrow('NEXT_REDIRECT');

    expect(redirectToSignIn).toHaveBeenCalledWith({
      href: { pathname: '/sign-in', query: { next: `/${locale}/me/security` } },
      locale,
    });
    expect(getOwnAccount).not.toHaveBeenCalled();
    expect(listSessions).not.toHaveBeenCalled();
  });

  it('signed in, shows one heading, the masked address and the sessions', async () => {
    signedIn(locale);
    const t = await renderPage(locale);

    expect(document.getElementById('view-security')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('auth.security.title'));
    expect(screen.getByTestId('security-email')).toHaveTextContent('r****@example.test');
    expect(screen.getByTestId('session-list')).toHaveTextContent(t('auth.security.thisDevice'));
    expect(getOwnAccount).toHaveBeenCalledTimes(1);
    expect(listSessions).toHaveBeenCalledTimes(1);
  });

  it('a failed sessions query blanks only the sessions section', async () => {
    signedIn(locale);
    vi.mocked(listSessions).mockResolvedValue({
      ok: false,
      error: { code: 'internal', messageKey: 'errors.common.internal' },
    } as Awaited<ReturnType<typeof listSessions>>);
    await renderPage(locale);

    expect(screen.getByTestId('security-email')).toBeInTheDocument();
    expect(screen.getAllByTestId('security-section-failed')).toHaveLength(1);
    expect(screen.queryByTestId('session-list')).toBeNull();
  });
});
