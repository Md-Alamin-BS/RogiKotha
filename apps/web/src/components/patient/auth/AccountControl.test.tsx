import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { AccountControl, accountInitials } from './AccountControl';
import { LOCALES, loadMessages, translatorFor, type TestLocale } from './auth-test-support';

vi.mock('@/server/actions/auth', () => ({ signOut: vi.fn() }));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

function renderIn(locale: TestLocale, ui: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

describe.each(LOCALES)('the masthead account control in %s', (locale) => {
  it('links a signed-out reader to sign in', () => {
    const t = renderIn(locale, <AccountControl account={null} />);
    const link = screen.getByRole('link', { name: t('auth.signIn.title') });
    expect(link).toHaveAttribute('href', '/sign-in');
    expect(link).toHaveAttribute('id', 'account');
  });

  it('shows a signed-in reader’s initials and opens a menu with the workspace and sign out', async () => {
    const user = userEvent.setup();
    const t = renderIn(locale, <AccountControl account={{ displayName: 'Nadia Islam' }} />);

    const control = screen.getByRole('button', {
      name: t('auth.accountMenu', { name: 'Nadia Islam' }),
    });
    expect(control).toHaveTextContent('NI');
    expect(screen.queryByRole('link', { name: t('auth.signIn.title') })).toBeNull();

    await user.click(control);

    const menu = screen.getByRole('dialog', { name: 'Nadia Islam' });
    expect(menu).toBeVisible();
    expect(screen.getByRole('link', { name: t('nav.mine') })).toHaveAttribute('href', '/me');
    expect(screen.getByRole('button', { name: t('auth.signOut') })).toHaveAttribute(
      'type',
      'submit',
    );
    expect(screen.getByRole('link', { name: t('auth.security.nav') })).toHaveAttribute(
      'href',
      '/me/security',
    );
    expect(screen.queryByRole('link', { name: t('auth.verifyPending') })).toBeNull();
    expect(control).toHaveAttribute('data-verified', 'true');
  });

  it('marks an unconfirmed reader with Bengali initials and links to confirm the email', async () => {
    const user = userEvent.setup();
    const name = 'নাদিয়া ইসলাম';
    const t = renderIn(
      locale,
      <AccountControl account={{ displayName: name, unconfirmed: true }} />,
    );

    const control = screen.getByRole('button', {
      name: t('auth.accountMenuUnconfirmed', { name }),
    });
    expect(control).toHaveAttribute('data-verified', 'false');
    expect(control).toHaveTextContent('নাই');

    await user.click(control);

    expect(screen.getByRole('link', { name: t('auth.verifyPending') })).toHaveAttribute(
      'href',
      '/verify-email',
    );
    expect(screen.getByRole('link', { name: t('auth.security.nav') })).toHaveAttribute(
      'href',
      '/me/security',
    );
  });
});

describe('account initials', () => {
  it('take the first letters of the first and last word, as written', () => {
    expect(accountInitials('Nadia Islam')).toBe('NI');
    expect(accountInitials('  rafi  ')).toBe('r');
    expect(accountInitials('Md. Abdul Karim')).toBe('MK');
  });

  it('keep a Bengali letter whole, with its vowel sign', () => {
    expect(accountInitials('নাদিয়া ইসলাম')).toBe('নাই');
  });

  it('are empty for an empty name', () => {
    expect(accountInitials('   ')).toBe('');
  });
});
