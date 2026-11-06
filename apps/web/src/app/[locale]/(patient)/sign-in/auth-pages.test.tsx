import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { Actor } from '@rogikotha/contracts';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import RegisterPage from '../register/page';
import SignInPage, { generateMetadata as generateSignInMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn'; actor: Actor | null } => ({
  locale: 'en',
  actor: null,
}));

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
// The pages read the request's Actor for the signed-in redirect (BR1.6); rows are anonymous unless
// they set `active.actor`.
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
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
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
  page: (props: { searchParams?: Promise<Record<string, string>> }) => Promise<ReactElement>,
  next?: string | Record<string, string>,
) {
  active.locale = locale;
  const search = typeof next === 'string' ? { next } : next;
  const element = await page(search === undefined ? {} : { searchParams: Promise.resolve(search) });
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  active.actor = null;
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

describe.each(LOCALES)('the sign-in page in %s', (locale) => {
  it('keeps search engines out', async () => {
    active.locale = locale;
    const metadata = await generateSignInMetadata();
    expect(metadata.robots).toEqual({ index: false });
  });

  it('shows no notice on a plain visit', async () => {
    await renderPage(locale, SignInPage);
    expect(screen.queryByTestId('auth-notice')).toBeNull();
  });

  it('confirms a finished password reset with the tick', async () => {
    const t = await renderPage(locale, SignInPage, { reset: 'done' });
    const notice = screen.getByTestId('auth-notice');
    expect(notice).toHaveTextContent(t('auth.reset.done'));
    expect(notice).toHaveAttribute('data-tone', 'done');
  });

  it('says the reader was signed out everywhere', async () => {
    const t = await renderPage(locale, SignInPage, { signedOut: 'all' });
    expect(screen.getByTestId('auth-notice')).toHaveTextContent(t('auth.security.signedOutAll'));
  });

  it('shows only the suspended notice when the session belongs to a suspended account', async () => {
    active.actor = {
      kind: 'anonymous',
      capabilities: [],
      locale,
      correlationId: 'test',
      refusal: 'suspended',
    };
    const t = await renderPage(locale, SignInPage, { reset: 'done', signedOut: 'all' });

    const notices = screen.getAllByTestId('auth-notice');
    expect(notices).toHaveLength(1);
    expect(notices[0]).toHaveTextContent(t('errors.auth.accountSuspended'));
  });

  it('sends a signed-in visitor on to a safe next or to the workspace', async () => {
    active.actor = {
      kind: 'account',
      accountId: 'account-synthetic',
      emailVerified: true,
      status: 'active',
      capabilities: [],
      locale,
      correlationId: 'test',
    };

    await expect(renderPage(locale, SignInPage, `/${locale}/write`)).rejects.toThrow(
      `NEXT_REDIRECT /${locale}/write`,
    );
    await expect(renderPage(locale, SignInPage, '//evil.example/')).rejects.toThrow(
      `NEXT_REDIRECT /${locale}/me`,
    );
  });
});
