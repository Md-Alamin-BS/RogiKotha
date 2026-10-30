import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider, createTranslator } from 'next-intl';
import {
  buildDoctorDetail,
  buildDoctorRow,
  buildReviewCard,
  loadMessages,
  type TestLocale,
} from '@/components/patient/doctors/directory-test-support';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));
const data = vi.hoisted(() => ({
  listDoctors: vi.fn(),
  getDoctor: vi.fn(),
  listPublishedReviewsForDoctor: vi.fn(),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: () =>
    Promise.resolve(
      createTranslator({ locale: active.locale, messages: loadMessages(active.locale) }),
    ),
  getLocale: () => Promise.resolve(active.locale),
}));

// Pages reach the database only through @/server/data; the doubles stand in for it.
vi.mock('@/server/data', () => ({ doctors: data }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

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

function renderPage(locale: TestLocale, element: ReactNode) {
  render(
    <NextIntlClientProvider locale={locale} messages={loadMessages(locale)}>
      {element}
    </NextIntlClientProvider>,
  );
}

const LOCALES = ['en', 'bn'] as const;

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(LOCALES)('doctor pages in %s', (locale) => {
  beforeEach(() => {
    active.locale = locale;
  });

  it('lists the doctors in the active language under the doctors heading', async () => {
    data.listDoctors.mockResolvedValue([buildDoctorRow({ name: 'Dr. Listed' })]);

    renderPage(locale, await DoctorIndexPage());

    expect(data.listDoctors).toHaveBeenCalledWith(locale);
    expect(document.getElementById('view-doctors')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      locale === 'bn' ? 'ডাক্তারেরা' : 'Doctors',
    );
    expect(screen.getByRole('link', { name: 'Dr. Listed' })).toBeInTheDocument();
  });

  it('shows one doctor with their experiences, the name as the only h1', async () => {
    const doctor = buildDoctorDetail({ name: 'Dr. Profiled' });
    data.getDoctor.mockResolvedValue(doctor);
    data.listPublishedReviewsForDoctor.mockResolvedValue([buildReviewCard({ title: 'A visit' })]);

    renderPage(
      locale,
      await DoctorProfilePage({ params: Promise.resolve({ id: doctor.publicId }) }),
    );

    expect(data.getDoctor).toHaveBeenCalledWith(doctor.publicId, locale);
    expect(data.listPublishedReviewsForDoctor).toHaveBeenCalledWith(doctor.id, locale);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dr. Profiled');
    expect(screen.getByRole('link', { name: 'A visit' })).toBeInTheDocument();
  });

  it('answers 404 for a doctor that does not exist', async () => {
    data.getDoctor.mockResolvedValue(null);

    await expect(
      DoctorProfilePage({ params: Promise.resolve({ id: 'missing000' }) }),
    ).rejects.toThrow(/404/);
    expect(data.listPublishedReviewsForDoctor).not.toHaveBeenCalled();
  });

  it('names the doctor in the browser tab title', async () => {
    data.getDoctor.mockResolvedValue(buildDoctorDetail({ name: 'Dr. Titled' }));

    const metadata = await profileMetadata({ params: Promise.resolve({ id: 'doc0000001' }) });

    expect(metadata.title).toBe(`Dr. Titled — ${locale === 'bn' ? 'রোগীকথা' : 'RogiKotha'}`);
  });
});
