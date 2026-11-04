import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { register, signIn } from '@/server/actions/auth';
import { RegisterForm } from './RegisterForm';
import { SignInForm } from './SignInForm';
import { LOCALES, loadMessages, translatorFor, type TestLocale } from './auth-test-support';

vi.mock('@/server/actions/auth', () => ({
  register: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
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
}));

function renderIn(locale: TestLocale, ui: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {ui}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('the register form in %s', (locale) => {
  it('renders every field of the prototype with its label', () => {
    const t = renderIn(locale, <RegisterForm next={null} />);

    expect(screen.getByLabelText(new RegExp(t('auth.email')))).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(new RegExp(t('auth.password')))).toHaveAttribute(
      'type',
      'password',
    );
    expect(screen.getByLabelText(new RegExp(t('auth.username')))).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(t('auth.displayName')))).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: t('auth.ageLabel') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('auth.termsLink') })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: t('auth.privacyLink') })).toHaveAttribute(
      'href',
      '/privacy',
    );
    expect(screen.getByRole('button', { name: t('auth.register.submit') })).toBeInTheDocument();
  });

  it('preselects the active language and sends the one the reader picks', async () => {
    const user = userEvent.setup();
    const t = renderIn(locale, <RegisterForm next={null} />);
    const other = locale === 'en' ? 'bn' : 'en';

    expect(screen.getByRole('radio', { name: t(`user2.lang.${locale}`) })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('radio', { name: t(`user2.lang.${other}`) }));
    expect(document.querySelector<HTMLInputElement>('input[name="locale"]')?.value).toBe(other);
  });

  it('shows each refused field next to the field and in the summary, in the active language', async () => {
    vi.mocked(register).mockResolvedValue({
      fieldErrors: {
        password: 'errors.auth.passwordTooShort',
        username: 'errors.auth.usernameTaken',
      },
      formError: null,
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <RegisterForm next={null} />);

    await user.click(screen.getByRole('button', { name: t('auth.register.submit') }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent(t('auth.errorSummary'));
    expect(summary).toHaveFocus();
    const password = screen.getByLabelText(new RegExp(t('auth.password')));
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAccessibleDescription(t('errors.auth.passwordTooShort'));
    expect(screen.getAllByText(t('errors.auth.usernameTaken'))).toHaveLength(2);
  });

  it('shows the neutral message when registration is refused as a whole', async () => {
    vi.mocked(register).mockResolvedValue({
      fieldErrors: {},
      formError: 'formErrors.auth.registrationRefused',
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <RegisterForm next={null} />);

    await user.click(screen.getByRole('button', { name: t('auth.register.submit') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      t('formErrors.auth.registrationRefused'),
    );
  });

  it('keeps what the reader typed after a refusal', async () => {
    vi.mocked(register).mockResolvedValue({
      fieldErrors: { terms: 'errors.auth.termsRequired' },
      formError: null,
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <RegisterForm next={null} />);
    const email = screen.getByLabelText(new RegExp(t('auth.email')));

    await user.type(email, 'reader@example.test');
    await user.click(screen.getByRole('button', { name: t('auth.register.submit') }));
    await screen.findByRole('alert');

    expect(email).toHaveValue('reader@example.test');
  });
});

describe.each(LOCALES)('the sign-in form in %s', (locale) => {
  it('renders the email and password fields and links to registration', () => {
    const t = renderIn(locale, <SignInForm next={null} />);

    expect(screen.getByLabelText(new RegExp(t('auth.email')))).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(t('auth.password')))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('auth.noAccount') })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('shows one neutral message for a wrong email or password', async () => {
    vi.mocked(signIn).mockResolvedValue({
      fieldErrors: {},
      formError: 'errors.auth.invalidCredentials',
    });
    const user = userEvent.setup();
    const t = renderIn(locale, <SignInForm next={null} />);

    await user.click(screen.getByRole('button', { name: t('auth.signIn.submit') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(t('errors.auth.invalidCredentials'));
  });

  it('carries the page to return to in the form and on the register link', () => {
    const t = renderIn(locale, <SignInForm next="/bn/write" />);

    expect(document.querySelector<HTMLInputElement>('input[name="next"]')?.value).toBe('/bn/write');
    expect(screen.getByRole('link', { name: t('auth.noAccount') })).toHaveAttribute(
      'href',
      '/register?next=%2Fbn%2Fwrite',
    );
  });

  it('shows and hides the password on request', async () => {
    const user = userEvent.setup();
    const t = renderIn(locale, <SignInForm next={null} />);
    const password = screen.getByLabelText(new RegExp(t('auth.password')));

    await user.click(screen.getByRole('button', { name: t('auth.showPassword') }));
    expect(password).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: t('auth.hidePassword') }));
    expect(password).toHaveAttribute('type', 'password');
  });
});
