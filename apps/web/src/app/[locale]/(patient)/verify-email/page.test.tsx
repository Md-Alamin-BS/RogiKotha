import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { Actor } from '@rogikotha/contracts';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import { confirmEmail } from '@/server/actions/auth';
import { PENDING_EMAIL_COOKIE, serialisePendingCookie } from '@/server/actions/auth-form';
import VerifyEmailPage, { generateMetadata } from './page';

const active = vi.hoisted(
  (): {
    locale: 'en' | 'bn';
    actor: Actor | null;
    cookies: Record<string, string>;
    appMode: string | undefined;
  } => ({ locale: 'en', actor: null, cookies: {}, appMode: undefined }),
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
    }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock(import('@/server/env'), async (importOriginal) => ({
  ...(await importOriginal()),
  optionalEnv: (name: string) => (name === 'APP_MODE' ? active.appMode : undefined),
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

const SYNTHETIC_EMAIL = 'reader@example.test';

function account(locale: TestLocale, verified: boolean): Actor {
  return {
    kind: 'account',
    accountId: 'account-synthetic',
    emailVerified: verified,
    status: verified ? 'active' : 'pending_verification',
    capabilities: [],
    locale,
    correlationId: 'test',
  };
}

async function renderPage(locale: TestLocale, search: Record<string, string> = {}) {
  active.locale = locale;
  const element = await VerifyEmailPage({ searchParams: Promise.resolve(search) });
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
  return translatorFor(locale);
}

function currentStep(t: ReturnType<typeof translatorFor>): number {
  const items = within(screen.getByRole('list', { name: t('auth.steps.label') })).getAllByRole(
    'listitem',
  );
  return items.findIndex((item) => item.getAttribute('aria-current') === 'step') + 1;
}

beforeEach(() => {
  vi.clearAllMocks();
  active.actor = null;
  active.cookies = {};
  active.appMode = undefined;
});

describe.each(LOCALES)('the verify-email page in %s', (locale) => {
  it('keeps search engines out and sends no referrer, because the link carries a token', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.referrer).toBe('no-referrer');
  });

  it('the pending panel names the address from the flash cookie, at step 2', async () => {
    active.cookies = {
      [PENDING_EMAIL_COOKIE]: serialisePendingCookie({
        email: SYNTHETIC_EMAIL,
        next: `/${locale}/write`,
      }),
    };
    const t = await renderPage(locale);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(currentStep(t)).toBe(2);
    expect(screen.getByTestId('verify-pending-panel')).toHaveAttribute('data-expired', 'false');
    expect(screen.getByText(t('auth.verify.body', { email: SYNTHETIC_EMAIL }))).toBeVisible();
    expect(screen.getByTestId('verify-sign-in-link')).toHaveAttribute(
      'href',
      `/sign-in?next=%2F${locale}%2Fwrite`,
    );
    expect(screen.getByTestId('verify-dev-inbox-link')).toBeInTheDocument();
  });

  it('the pending panel ignores a cookie that does not parse and hides the inbox in production', async () => {
    active.cookies = { [PENDING_EMAIL_COOKIE]: 'not-json' };
    active.appMode = 'production';
    const t = await renderPage(locale);

    expect(screen.getByText(t('auth.verify.bodyNoEmail'))).toBeVisible();
    expect(screen.queryByTestId('verify-dev-inbox-link')).toBeNull();
  });

  it('signed in and unconfirmed, the pending panel shows no address and one resend button', async () => {
    active.actor = account(locale, false);
    active.cookies = {
      [PENDING_EMAIL_COOKIE]: serialisePendingCookie({ email: SYNTHETIC_EMAIL, next: null }),
    };
    const t = await renderPage(locale);

    expect(screen.getByText(t('auth.verify.bodyNoEmail'))).toBeVisible();
    expect(screen.queryByText(new RegExp(SYNTHETIC_EMAIL))).toBeNull();
    expect(screen.getByTestId('resend-own-submit-button')).toBeInTheDocument();
    expect(screen.queryByTestId('verify-sign-in-link')).toBeNull();
  });

  it('opening the emailed link shows only the confirm button and confirms nothing', async () => {
    const t = await renderPage(locale, { token: 'synthetic-token' });

    expect(currentStep(t)).toBe(2);
    expect(screen.getByRole('button', { name: t('auth.verify.confirm') })).toBeInTheDocument();
    expect(document.querySelector<HTMLInputElement>('input[name="token"]')?.value).toBe(
      'synthetic-token',
    );
    expect(screen.queryByTestId('verify-pending-panel')).toBeNull();
    expect(confirmEmail).not.toHaveBeenCalled();
  });

  it('a used or expired link turns the confirm form into the expired panel', async () => {
    vi.mocked(confirmEmail).mockResolvedValue({
      status: 'refused',
      formError: null,
      fieldErrors: {},
      expired: true,
    });
    const user = userEvent.setup();
    const t = await renderPage(locale, { token: 'synthetic-token' });

    await user.click(screen.getByRole('button', { name: t('auth.verify.confirm') }));

    expect(await screen.findByTestId('verify-expired')).toHaveTextContent(t('auth.verify.expired'));
    expect(screen.getByTestId('verify-pending-panel')).toHaveAttribute('data-expired', 'true');
  });

  it('the done panel is shown to a verified actor at step 3, with a safe next', async () => {
    active.actor = account(locale, true);
    const t = await renderPage(locale, { confirmed: '1', next: `/${locale}/write` });

    expect(currentStep(t)).toBe(3);
    expect(screen.getByTestId('verify-done-panel')).toHaveTextContent(t('auth.verify.done'));
    expect(screen.getByTestId('verify-continue-link')).toHaveAttribute('href', `/${locale}/write`);
  });

  it('confirmed=1 typed by hand without a verified actor still shows the pending panel', async () => {
    const t = await renderPage(locale, { confirmed: '1' });

    expect(screen.queryByTestId('verify-done-panel')).toBeNull();
    expect(screen.getByTestId('verify-pending-panel')).toBeInTheDocument();
    expect(currentStep(t)).toBe(2);
  });

  it('confirmed=1 typed by an unconfirmed holder still shows the pending panel', async () => {
    active.actor = account(locale, false);
    await renderPage(locale, { confirmed: '1' });

    expect(screen.queryByTestId('verify-done-panel')).toBeNull();
    expect(screen.getByTestId('verify-pending-panel')).toBeInTheDocument();
  });

  it('a verified actor opening the page with nothing to do goes to the workspace', async () => {
    active.actor = account(locale, true);
    await expect(renderPage(locale)).rejects.toThrow(`NEXT_REDIRECT /${locale}/me`);
  });
});
