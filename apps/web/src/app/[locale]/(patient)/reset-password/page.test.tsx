import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import { requestReset, setNewPassword } from '@/server/actions/auth';
import ResetPasswordPage, { generateMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
}));
vi.mock('@/server/actions/auth', () => ({ requestReset: vi.fn(), setNewPassword: vi.fn() }));
// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

async function renderPage(locale: TestLocale, search?: Record<string, string>) {
  active.locale = locale;
  const element = await ResetPasswordPage(
    search === undefined ? {} : { searchParams: Promise.resolve(search) },
  );
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

describe.each(LOCALES)('the reset-password page in %s', (locale) => {
  it('keeps search engines out and sends no referrer, because the link carries a token', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.referrer).toBe('no-referrer');
  });

  it('without a token, shows one heading, the lede and the request form', async () => {
    const t = await renderPage(locale);

    expect(document.getElementById('view-reset')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('auth.reset.title'));
    expect(screen.getByText(t('auth.reset.lede'))).toBeVisible();
    expect(document.getElementById('reset-request-form')).not.toBeNull();
    expect(document.getElementById('set-password-form')).toBeNull();
  });

  it('with the emailed token, shows the new-password form carrying it and no lede', async () => {
    const t = await renderPage(locale, { token: 'synthetic-reset-token' });

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByText(t('auth.reset.lede'))).toBeNull();
    expect(document.getElementById('set-password-form')).not.toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="token"]')?.value).toBe(
      'synthetic-reset-token',
    );
    expect(setNewPassword).not.toHaveBeenCalled();
    expect(requestReset).not.toHaveBeenCalled();
  });

  it('an empty token reads as no token', async () => {
    await renderPage(locale, { token: '' });
    expect(document.getElementById('reset-request-form')).not.toBeNull();
  });
});
