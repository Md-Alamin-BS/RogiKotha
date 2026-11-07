import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { loadMessages, renderInLocale } from '@/components/patient/doctors/directory-test-support';
import type { Translate } from '@/lib/titles';

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', async () => ({
  Link: (await import('@/components/patient/shared/link-test-support')).PlainLink,
  usePathname: () => '/missing',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import PatientNotFound from './not-found';

describe.each(['en', 'bn'] as const)('patient 404 in %s', (locale) => {
  const t = createTranslator({ locale, messages: loadMessages(locale) }) as unknown as Translate;

  it('shows one heading and the body line in the active language', () => {
    renderInLocale(locale, <PatientNotFound />);

    expect(document.getElementById('view-not-found')).not.toBeNull();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(t('errors.common.notFound'));
    expect(screen.getByText(t('notFound.body'))).toBeInTheDocument();
  });

  it('links home and to emergency help', () => {
    renderInLocale(locale, <PatientNotFound />);

    expect(screen.getByRole('link', { name: t('notFound.home') })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: t('nav.emergency') })).toHaveAttribute(
      'href',
      '/emergency',
    );
  });

  it('carries no inline style', () => {
    const { container } = renderInLocale(locale, <PatientNotFound />);
    expect(container.querySelectorAll('[style]')).toHaveLength(0);
  });
});
