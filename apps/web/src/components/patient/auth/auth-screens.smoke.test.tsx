import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { getContributionAccess } from '@/server/actions/account';
import { ContributionGate } from './ContributionGate';
import { PendingPanel } from './PendingPanel';
import { LOCALES, loadMessages, translatorFor, type TestLocale } from './auth-test-support';

// T-102 smoke (BR2.3, BR8.2): the "check your email" screen and the signed-out contribution gate.
vi.mock('@/server/actions/account', () => ({ getContributionAccess: vi.fn() }));
vi.mock('@/server/actions/auth', () => ({ resendLink: vi.fn(), resendOwnLink: vi.fn() }));

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
}));

const SYNTHETIC_EMAIL = 'smoke.patient@example.test';

function renderIn(locale: TestLocale, ui: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

describe.each(LOCALES)('patient auth screens smoke in %s', (locale) => {
  it('the pending screen names the address and offers a resend and a sign-in link', () => {
    const t = renderIn(
      locale,
      <PendingPanel
        address={SYNTHETIC_EMAIL}
        signedIn={false}
        expired={false}
        next={`/${locale}/write`}
      />,
    );

    expect(screen.getByTestId('verify-pending-panel')).toHaveAttribute('data-expired', 'false');
    expect(screen.getByText(t('auth.verify.body', { email: SYNTHETIC_EMAIL }))).toBeVisible();
    expect(screen.getByLabelText(new RegExp(t('auth.email')))).toHaveValue(SYNTHETIC_EMAIL);
    expect(screen.getByTestId('verify-sign-in-link')).toHaveAttribute(
      'href',
      `/sign-in?next=%2F${locale}%2Fwrite`,
    );
  });

  it('the gate, signed out, asks to sign in or register and returns to the page', async () => {
    vi.mocked(getContributionAccess).mockResolvedValue('signed-out');
    const returnTo = `/${locale}/doctors/doc0000001`;
    const element = await ContributionGate({ purpose: 'write', returnTo });
    const t = renderIn(locale, element);

    const gate = screen.getByTestId('contribution-gate');
    expect(gate).toHaveAttribute('data-access', 'signed-out');
    expect(gate).toHaveTextContent(t('auth.gate.title'));
    const query = new URLSearchParams({ next: returnTo }).toString();
    expect(screen.getByTestId('contribution-gate-sign-in')).toHaveAttribute(
      'href',
      `/sign-in?${query}`,
    );
    expect(screen.getByTestId('contribution-gate-register')).toHaveAttribute(
      'href',
      `/register?${query}`,
    );
  });
});
