import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { requireAccount } from '@/server/auth/session';
import { doctors } from '@/server/data';
import {
  renderInLocale,
  translatorFor,
  type TestLocale,
} from '@/components/patient/compose/compose-test-support';
import ComposerPage from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/compose/compose-test-support');
  return {
    getTranslations: () => Promise.resolve(support.translatorFor(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => '/write',
}));
vi.mock('@/server/actions/review', () => ({ publishReview: vi.fn(), saveReviewEdit: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/data', () => ({ doctors: { listDoctorOptions: vi.fn() } }));

function anAccount(): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'abba_of_two',
    displayName: 'Abba of Two',
    locale: 'en',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
  };
}

async function renderPage(locale: TestLocale, search: Record<string, string> = {}) {
  active.locale = locale;
  const element = (await ComposerPage({ searchParams: Promise.resolve(search) })) as ReactElement;
  return renderInLocale(element, locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAccount).mockResolvedValue(anAccount());
  vi.mocked(doctors.listDoctorOptions).mockResolvedValue([
    {
      id: 'doc-uuid-1',
      publicId: 'd0c7015000',
      name: 'Dr. Synthetic Rahman',
      specialty: 'Paediatrics',
    },
    { id: 'doc-uuid-2', publicId: 'd0c7015001', name: 'Dr. Example Sultana', specialty: null },
  ]);
});

describe.each(['en', 'bn'] as const)('the write page in %s', (locale) => {
  const t = translatorFor(locale);

  it('shows the composer under the compose heading for a signed-in author', async () => {
    await renderPage(locale);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.compose'));
    expect(document.getElementById('view-compose')).not.toBeNull();
    expect(
      screen.getByRole('option', { name: 'Dr. Synthetic Rahman — Paediatrics' }),
    ).toBeVisible();
    expect(doctors.listDoctorOptions).toHaveBeenCalledWith(locale);
  });

  it('labels the treatment months in the active language numerals', async () => {
    await renderPage(locale);
    const year = String(new Date().getUTCFullYear());
    const firstPeriod = screen.getByTestId('compose-period').querySelector('option')?.textContent;
    if (locale === 'bn') expect(firstPeriod).not.toMatch(/[0-9]/);
    else expect(firstPeriod).toContain(year);
  });
});

describe('the write page', () => {
  it('prefills the doctor named by ?doctor=, by public id', async () => {
    await renderPage('en', { doctor: 'd0c7015001' });
    expect(screen.getByTestId('compose-doctor')).toHaveValue('doc-uuid-2');
  });

  it('sends a signed-out visitor to sign in and comes back to the same doctor', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(
      ComposerPage({ searchParams: Promise.resolve({ doctor: 'd0c7015001' }) }),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(requireAccount).toHaveBeenCalledWith({ returnTo: '/write?doctor=d0c7015001' });
    expect(doctors.listDoctorOptions).not.toHaveBeenCalled();
  });
});
