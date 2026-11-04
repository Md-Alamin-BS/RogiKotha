import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import { notFound } from 'next/navigation';
import { requireAccount } from '@/server/auth/session';
import { accounts } from '@/server/data';
import {
  buildCurrentAccount,
  buildOwnReview,
  buildProfile,
  loadMessages,
} from '@/components/patient/profile/profile-test-support';
import WorkspacePage, { generateMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/me',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  accounts: { getProfile: vi.fn(), listOwnReviews: vi.fn() },
}));
vi.mock('@/server/actions/profile', () => ({
  updateDisplayNameAction: vi.fn(),
  updateLanguageAction: vi.fn(),
}));

async function renderPage(locale: 'en' | 'bn') {
  active.locale = locale;
  const element = await WorkspacePage();
  return render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the /me page', () => {
  it('sends a signed-out visitor to sign in and back to /me, reading no profile', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(WorkspacePage()).rejects.toThrow('NEXT_REDIRECT');
    expect(requireAccount).toHaveBeenCalledWith({ returnTo: '/me' });
    expect(accounts.getProfile).not.toHaveBeenCalled();
    expect(accounts.listOwnReviews).not.toHaveBeenCalled();
  });

  it.each(['en', 'bn'] as const)('renders the signed-in user’s workspace in %s', async (locale) => {
    const account = buildCurrentAccount({ locale });
    vi.mocked(requireAccount).mockResolvedValue(account);
    vi.mocked(accounts.getProfile).mockResolvedValue(
      buildProfile({ accountId: account.accountId, locale }),
    );
    vi.mocked(accounts.listOwnReviews).mockResolvedValue([
      buildOwnReview({ title: 'Synthetic visit' }),
    ]);

    await renderPage(locale);

    const t = createTranslator({ locale, messages: loadMessages(locale) });
    expect(document.getElementById('view-mine')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.mine' as never));
    expect(screen.getByTestId('profile-head')).toHaveTextContent('Rina Akter · @rina_demo');
    expect(screen.getByText('Synthetic visit')).toBeInTheDocument();
    expect(accounts.getProfile).toHaveBeenCalledWith(account.accountId);
    expect(accounts.listOwnReviews).toHaveBeenCalledWith(account.accountId, locale);
  });

  it('shows not-found when the profile was deleted after the session was read', async () => {
    vi.mocked(requireAccount).mockResolvedValue(buildCurrentAccount());
    vi.mocked(accounts.getProfile).mockResolvedValue(null);
    vi.mocked(accounts.listOwnReviews).mockResolvedValue([]);
    await expect(WorkspacePage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('keeps search engines out', async () => {
    await expect(generateMetadata()).resolves.toMatchObject({ robots: { index: false } });
  });
});
