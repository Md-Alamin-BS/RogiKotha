import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import {
  aDoctorCard,
  aDoctorProfile,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));
const load = vi.hoisted(() => ({ loadDoctorIndex: vi.fn(), loadDoctorProfile: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// The loaders own the container calls, the 404 and the 307 (load.test.ts); the pages only render.
vi.mock('./load', () => load);

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/doctors',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import DoctorIndexPage from './page';
import DoctorProfilePage, { generateMetadata as profileMetadata } from './[id]/page';

const LOCALES = ['en', 'bn'] as const;
const BRAND = { en: 'RogiKotha', bn: 'রোগীকথা' } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('doctor pages in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
  });

  it('lists the doctor cards under the doctors heading', async () => {
    load.loadDoctorIndex.mockResolvedValue({
      cards: [aDoctorCard({ name: 'Dr. Listed' })],
      total: 1,
      threshold: 5,
    });

    renderInLocale(locale, await DoctorIndexPage());

    expect(document.getElementById('view-doctors')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      locale === 'bn' ? 'ডাক্তারেরা' : 'Doctors',
    );
    expect(screen.getByRole('link', { name: /Dr\. Listed/ })).toBeInTheDocument();
  });

  it('shows one doctor with the name as the only h1 and passes the search to the loader', async () => {
    const vm = aDoctorProfile({ name: 'Dr. Profiled' });
    load.loadDoctorProfile.mockResolvedValue({ vm, filters: {}, threshold: 5 });
    const search = { relationship: 'self' };

    renderInLocale(
      locale,
      await DoctorProfilePage({
        params: Promise.resolve({ id: vm.publicId }),
        searchParams: Promise.resolve(search),
      }),
    );

    expect(load.loadDoctorProfile).toHaveBeenCalledWith(vm.publicId, search);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dr. Profiled');
    expect(
      screen.getAllByText(
        locale === 'bn' ? 'রেজিস্ট্রেশন যাচাই করা হয়নি' : 'Registration not verified',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('lets the loader’s 404 through for a doctor that does not exist', async () => {
    load.loadDoctorProfile.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'));

    await expect(
      DoctorProfilePage({ params: Promise.resolve({ id: 'missing000' }) }),
    ).rejects.toThrow(/404/);
  });

  it('names the doctor in the browser tab title', async () => {
    load.loadDoctorProfile.mockResolvedValue({
      vm: aDoctorProfile({ name: 'Dr. Titled' }),
      filters: {},
      threshold: 5,
    });

    const metadata = await profileMetadata({ params: Promise.resolve({ id: 'doc0000001' }) });

    expect(metadata.title).toBe(`Dr. Titled — ${BRAND[locale]}`);
  });
});
