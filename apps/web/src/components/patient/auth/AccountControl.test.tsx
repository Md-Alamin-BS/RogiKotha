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

let rerender: ReturnType<typeof render>['rerender'] = () => undefined;

function withMessages(locale: TestLocale, ui: ReactNode) {
  return (
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>
  );
}

function renderIn(locale: TestLocale, ui: ReactNode) {
  rerender = render(withMessages(locale, ui)).rerender;
  return translatorFor(locale);
}

function rerenderIn(locale: TestLocale, ui: ReactNode) {
  rerender(withMessages(locale, ui));
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
    expect(control.querySelector('.account-initials')).toHaveAttribute('data-initials', 'NI');
    expect(control.textContent, 'no text node beside the label').toBe('');
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
    expect(control.querySelector('.account-initials')).toHaveAttribute('data-initials', 'নাই');

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

  it('does not reopen the sheet at the next sign-in after signing out from it', async () => {
    const user = userEvent.setup();
    const reader = { displayName: 'Nadia Islam' };
    const t = renderIn(locale, <AccountControl account={reader} />);
    const name = { name: t('auth.accountMenu', { name: reader.displayName }) };
    await user.click(screen.getByRole('button', name));
    expect(screen.getByRole('dialog')).toBeVisible();

    // The same control instance, as the masthead keeps it across sign-out and sign-in.
    rerenderIn(locale, <AccountControl account={null} />);
    rerenderIn(locale, <AccountControl account={reader} />);

    expect(screen.getByRole('button', name)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
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
