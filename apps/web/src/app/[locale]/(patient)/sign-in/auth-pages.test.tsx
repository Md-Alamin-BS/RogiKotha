import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import RegisterPage from '../register/page';
import SignInPage from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
}));
vi.mock('@/server/actions/auth', () => ({
  register: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children?: ReactNode }) => (
    <a href={typeof href === 'string' ? href : JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

async function renderPage(
  locale: TestLocale,
  page: (props: { searchParams?: Promise<{ next?: string }> }) => Promise<ReactElement>,
  next?: string,
) {
  active.locale = locale;
  const element = await page(next === undefined ? {} : { searchParams: Promise.resolve({ next }) });
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('the auth pages in %s', (locale) => {
  it('the register page shows the prototype heading, lede and form', async () => {
    const t = await renderPage(locale, RegisterPage);

    expect(document.getElementById('view-register')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('auth.register.title'));
    expect(screen.getByText(t('auth.register.lede'))).toBeInTheDocument();
    expect(document.getElementById('register-form')).not.toBeNull();
  });

  it('the sign-in page shows the prototype heading, lede and form', async () => {
    const t = await renderPage(locale, SignInPage);

    expect(document.getElementById('view-signin')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('auth.signIn.title'));
    expect(screen.getByText(t('auth.signIn.lede'))).toBeInTheDocument();
    expect(document.getElementById('signin-form')).not.toBeNull();
  });

  it('the sign-in page keeps a same-site page to return to', async () => {
    await renderPage(locale, SignInPage, `/${locale}/write`);
    expect(document.querySelector<HTMLInputElement>('input[name="next"]')?.value).toBe(
      `/${locale}/write`,
    );
  });

  it('the sign-in page drops a link to another site', async () => {
    await renderPage(locale, SignInPage, 'https://evil.example/');
    expect(document.querySelector('input[name="next"]')).toBeNull();
  });
});
