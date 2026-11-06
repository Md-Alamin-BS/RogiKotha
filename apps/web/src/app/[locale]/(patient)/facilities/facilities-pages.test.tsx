import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import {
  aFacilityCard,
  aFacilityProfile,
  loadMessages,
  renderInLocale,
} from '@/components/patient/doctors/directory-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));
const load = vi.hoisted(() => ({ loadFacilityIndex: vi.fn(), loadFacilityProfile: vi.fn() }));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// The loaders own the container calls and the 404 (load.test.ts); the pages only render.
vi.mock('./load', () => load);

// See components/patient/Masthead.test.tsx for why the app's own routing module is mocked.
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/facilities',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

import FacilityIndexPage from './page';
import FacilityProfilePage, { generateMetadata as profileMetadata } from './[id]/page';

const LOCALES = ['en', 'bn'] as const;
const BRAND = { en: 'RogiKotha', bn: 'রোগীকথা' } as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('facility pages in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
  });

  it('lists the facility cards in the facilities view under one h1', async () => {
    load.loadFacilityIndex.mockResolvedValue({
      cards: [aFacilityCard({ name: 'Synthetic Listed Clinic' })],
      total: 1,
      threshold: 5,
    });

    renderInLocale(locale, await FacilityIndexPage());

    expect(document.getElementById('view-facilities')).not.toBeNull();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Synthetic Listed Clinic/ })).toBeInTheDocument();
  });

  it('shows one facility with its name as the only h1', async () => {
    const vm = aFacilityProfile({ name: 'Synthetic Profiled Hospital' });
    load.loadFacilityProfile.mockResolvedValue({ vm, threshold: 5 });

    renderInLocale(
      locale,
      await FacilityProfilePage({ params: Promise.resolve({ id: vm.publicId }) }),
    );

    expect(load.loadFacilityProfile).toHaveBeenCalledWith(vm.publicId);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Synthetic Profiled Hospital',
    );
  });

  it('lets the loader’s 404 through for a facility that does not exist', async () => {
    load.loadFacilityProfile.mockRejectedValue(new Error('NEXT_HTTP_ERROR_FALLBACK;404'));

    await expect(
      FacilityProfilePage({ params: Promise.resolve({ id: 'missing000' }) }),
    ).rejects.toThrow(/404/);
  });

  it('names the facility in the browser tab title', async () => {
    load.loadFacilityProfile.mockResolvedValue({
      vm: aFacilityProfile({ name: 'Synthetic Titled Hospital' }),
      threshold: 5,
    });

    const metadata = await profileMetadata({ params: Promise.resolve({ id: 'fac0000001' }) });

    expect(metadata.title).toBe(`Synthetic Titled Hospital — ${BRAND[locale]}`);
  });
});
