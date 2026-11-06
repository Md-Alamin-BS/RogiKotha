import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import type { Actor } from '@rogikotha/contracts';
import {
  LOCALES,
  loadMessages,
  translatorFor,
  type TestLocale,
} from '@/components/patient/auth/auth-test-support';
import RegisterPage, { generateMetadata } from './page';

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
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock('@/server/actions/auth', () => ({ register: vi.fn() }));
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
  Link: ({ href, children, ...rest }: { href: unknown; children?: ReactNode }) => (
    <a href={typeof href === 'string' ? href : JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

function signedIn(locale: TestLocale): Actor {
  return {
    kind: 'account',
    accountId: 'account-synthetic',
    emailVerified: false,
    status: 'pending_verification',
    capabilities: [],
    locale,
    correlationId: 'test',
  };
}

async function renderPage(locale: TestLocale, next?: string) {
  active.locale = locale;
  const element = await RegisterPage(
    next === undefined ? {} : { searchParams: Promise.resolve({ next }) },
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
  active.actor = null;
});

describe.each(LOCALES)('the register page in %s', (locale) => {
  it('keeps search engines out and sends the referrer as usual', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.referrer).toBeUndefined();
  });

  it('shows one heading and the joining strip at step 1', async () => {
    const t = await renderPage(locale);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const steps = screen.getByRole('list', { name: t('auth.steps.label') });
    expect(within(steps).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step');
    expect(document.getElementById('register-form')).not.toBeNull();
  });

  it('carries a safe next into the form', async () => {
    await renderPage(locale, `/${locale}/write`);
    expect(document.querySelector<HTMLInputElement>('input[name="next"]')?.value).toBe(
      `/${locale}/write`,
    );
  });

  it('drops a next that points at another site', async () => {
    await renderPage(locale, 'https://evil.example/');
    expect(document.querySelector('input[name="next"]')).toBeNull();
  });

  it('sends a signed-in visitor to the workspace by default', async () => {
    active.actor = signedIn(locale);
    await expect(renderPage(locale)).rejects.toThrow(`NEXT_REDIRECT /${locale}/me`);
  });

  it('sends a signed-in visitor on to a safe next, never to another site', async () => {
    active.actor = signedIn(locale);
    await expect(renderPage(locale, `/${locale}/doctors`)).rejects.toThrow(
      `NEXT_REDIRECT /${locale}/doctors`,
    );
    await expect(renderPage(locale, 'https://evil.example/')).rejects.toThrow(
      `NEXT_REDIRECT /${locale}/me`,
    );
  });
});
