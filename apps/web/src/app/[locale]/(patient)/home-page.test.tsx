import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import { buildReviewCard, loadMessages } from '@/components/patient/doctors/directory-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));
const data = vi.hoisted(() => ({ listRecentPublishedReviews: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// The page reaches the database only through @/server/data; the double stands in for it.
vi.mock('@/server/data', () => ({ doctors: data }));

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import DiscoverPage from './page';

describe.each(['en', 'bn'] as const)('home page in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
    data.listRecentPublishedReviews.mockReset();
  });

  it('shows the four most recent experiences in the active language', async () => {
    data.listRecentPublishedReviews.mockResolvedValue([buildReviewCard({ title: 'Latest one' })]);

    render(
      <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
        {await DiscoverPage()}
      </NextIntlClientProvider>,
    );

    expect(data.listRecentPublishedReviews).toHaveBeenCalledWith(4, locale);
    expect(document.getElementById('view-discover')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Latest one' })).toBeInTheDocument();
    expect(screen.getByTestId('home-emergency')).toBeInTheDocument();
  });
});
