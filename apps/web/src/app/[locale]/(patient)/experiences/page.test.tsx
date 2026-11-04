import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { doctors } from '@/server/data';
import {
  buildReviewCard,
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import ExperienceIndexPage from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve(active.locale) }));
vi.mock('@/i18n/routing', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return { Link: support.TestLink, usePathname: () => '/experiences' };
});
vi.mock('@/server/data', () => ({ doctors: { listRecentPublishedReviews: vi.fn() } }));

describe.each(['en', 'bn'] as const)('the experiences page in %s', (locale) => {
  const t = testTranslator(locale);

  beforeEach(() => {
    active.locale = locale;
    vi.mocked(doctors.listRecentPublishedReviews).mockResolvedValue([
      buildReviewCard({ title: 'A recent synthetic experience' }),
    ]);
  });

  it('lists the recent published experiences in the active language', async () => {
    renderInLocale(locale, await ExperienceIndexPage());

    expect(document.getElementById('view-experiences')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.account'));
    expect(screen.getByText('A recent synthetic experience')).toBeInTheDocument();
    expect(doctors.listRecentPublishedReviews).toHaveBeenCalledWith(50, locale);
  });
});
