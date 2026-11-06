import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { getContributionAccess } from '@/server/actions/account';
import type { ContributionAccess } from '@/server/actions/auth-form';
import {
  ContributionGate,
  ContributionGatePanel,
  type ContributionPurpose,
} from './ContributionGate';
import { LOCALES, loadMessages, translatorFor, type TestLocale } from './auth-test-support';

vi.mock('@/server/actions/account', () => ({ getContributionAccess: vi.fn() }));
vi.mock('@/server/actions/auth', () => ({ resendOwnLink: vi.fn() }));

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

function renderIn(locale: TestLocale, ui: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

async function renderGate(
  locale: TestLocale,
  purpose: ContributionPurpose,
  returnTo: string,
): Promise<ReturnType<typeof translatorFor>> {
  const element = await ContributionGate({ purpose, returnTo });
  return renderIn(locale, element);
}

const PURPOSES: ContributionPurpose[] = ['write', 'comment'];
const BODY_KEY: Record<ContributionPurpose, string> = {
  write: 'auth.gate.writeBody',
  comment: 'auth.gate.commentBody',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('the contribution gate in %s', (locale) => {
  describe.each(PURPOSES)('for %s', (purpose) => {
    it('signed out, asks to sign in or register and returns to the page', async () => {
      vi.mocked(getContributionAccess).mockResolvedValue('signed-out');
      const returnTo = `/${locale}/doctors/doc0000001`;
      const t = await renderGate(locale, purpose, returnTo);

      const gate = screen.getByTestId('contribution-gate');
      expect(gate).toHaveAttribute('data-access', 'signed-out');
      expect(gate).toHaveTextContent(t('auth.gate.title'));
      expect(gate).toHaveTextContent(t(BODY_KEY[purpose]));
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

    it('unconfirmed, asks to confirm with one resend button and shows no address', async () => {
      vi.mocked(getContributionAccess).mockResolvedValue('unconfirmed');
      const t = await renderGate(locale, purpose, `/${locale}/write`);

      const gate = screen.getByTestId('contribution-gate');
      expect(gate).toHaveAttribute('data-access', 'unconfirmed');
      expect(gate).toHaveTextContent(t('auth.gate.verifyToAct'));
      expect(screen.getByTestId('resend-own-submit-button')).toBeInTheDocument();
      expect(screen.getByTestId('contribution-gate-security')).toHaveAttribute(
        'href',
        '/me/security',
      );
      expect(gate).not.toHaveTextContent('@');
      expect(screen.queryByRole('textbox')).toBeNull();
    });

    it('unavailable, says the account cannot take part and offers nothing to press', async () => {
      vi.mocked(getContributionAccess).mockResolvedValue('unavailable');
      const t = await renderGate(locale, purpose, `/${locale}/write`);

      const gate = screen.getByTestId('contribution-gate');
      expect(gate).toHaveAttribute('data-access', 'unavailable');
      expect(gate).toHaveTextContent(t('auth.gate.unavailable'));
      expect(screen.queryByRole('link')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('allowed, renders nothing so the caller shows its own form', async () => {
      vi.mocked(getContributionAccess).mockResolvedValue('allowed');
      await renderGate(locale, purpose, `/${locale}/write`);

      expect(screen.queryByTestId('contribution-gate')).toBeNull();
      expect(document.body.textContent).toBe('');
    });

    it('fails closed to the signed-out prompt when the access query throws', async () => {
      vi.mocked(getContributionAccess).mockRejectedValue(new Error('synthetic failure'));
      const t = await renderGate(locale, purpose, `/${locale}/write`);

      expect(screen.getByTestId('contribution-gate')).toHaveAttribute('data-access', 'signed-out');
      expect(screen.getByTestId('contribution-gate')).toHaveTextContent(t('auth.gate.title'));
    });
  });

  it.each(['https://evil.example/', '//evil.example/write', '/write', 'javascript:alert(1)'])(
    'drops the unsafe returnTo %s from the sign-in and register links',
    async (returnTo) => {
      vi.mocked(getContributionAccess).mockResolvedValue('signed-out');
      await renderGate(locale, 'write', returnTo);

      expect(screen.getByTestId('contribution-gate-sign-in')).toHaveAttribute('href', '/sign-in');
      expect(screen.getByTestId('contribution-gate-register')).toHaveAttribute('href', '/register');
    },
  );

  it.each<ContributionAccess>(['signed-out', 'unconfirmed', 'unavailable'])(
    'the panel for %s renders without awaiting the query',
    (access) => {
      renderIn(locale, <ContributionGatePanel access={access} purpose="comment" next={null} />);
      expect(screen.getByTestId('contribution-gate')).toHaveAttribute('data-access', access);
    },
  );
});
