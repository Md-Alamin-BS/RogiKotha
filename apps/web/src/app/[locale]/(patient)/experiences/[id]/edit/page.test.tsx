import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { DemoCurrentAccount, DemoReviewEditRow } from '@rogikotha/contracts';
import { notFound } from 'next/navigation';
import { requireAccount } from '@/server/auth/session';
import { doctors, reviews } from '@/server/data';
import {
  renderInLocale,
  translatorFor,
  type TestLocale,
} from '@/components/patient/compose/compose-test-support';
import EditExperiencePage from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/compose/compose-test-support');
  return {
    getTranslations: () => Promise.resolve(support.translatorFor(active.locale)),
    getLocale: () => Promise.resolve(active.locale),
  };
});
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/i18n/routing', () => ({
  Link: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  usePathname: () => '/experiences/a1b2c3d4e5/edit',
}));
vi.mock('@/server/actions/review', () => ({ saveReviewEdit: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  doctors: { getDoctor: vi.fn() },
  reviews: { getOwnReviewForEdit: vi.fn() },
}));

const PUBLIC_ID = 'a1b2c3d4e5';
const ACCOUNT_ID = '0190f5a2-0000-7000-8000-000000000001';

function anAccount(): DemoCurrentAccount {
  return {
    accountId: ACCOUNT_ID,
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

function anEditRow(): DemoReviewEditRow {
  return {
    id: 'review-uuid',
    publicId: PUBLIC_ID,
    doctorId: 'doc-uuid-1',
    title: 'Calm and careful with my son',
    body: 'She listened to every question and explained the doses slowly.',
    sentiment: null,
    outcome: 'helped',
    version: 1,
  };
}

async function renderPage(locale: TestLocale, id = PUBLIC_ID) {
  active.locale = locale;
  const element = (await EditExperiencePage({ params: Promise.resolve({ id }) })) as ReactElement;
  return renderInLocale(element, locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAccount).mockResolvedValue(anAccount());
  vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(anEditRow());
  vi.mocked(doctors.getDoctor).mockResolvedValue({
    id: 'doc-uuid-1',
    publicId: 'd0c7015000',
    name: 'Dr. Synthetic Rahman',
    specialty: null,
    qualifications: null,
    city: null,
    area: null,
    avatarHue: null,
    memberAdded: false,
    publishedReviewCount: 1,
    about: null,
    languages: null,
    feeDisplay: null,
    chambers: [],
  });
});

describe.each(['en', 'bn'] as const)('the edit page in %s', (locale) => {
  const t = translatorFor(locale);

  it("opens the author's own experience in the edit form", async () => {
    await renderPage(locale);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('compose.edit.title'));
    expect(screen.getByTestId('compose-title')).toHaveValue('Calm and careful with my son');
    expect(screen.getByTestId('edit-doctor')).toHaveTextContent('Dr. Synthetic Rahman');
    expect(reviews.getOwnReviewForEdit).toHaveBeenCalledWith(PUBLIC_ID, ACCOUNT_ID);
    expect(doctors.getDoctor).toHaveBeenCalledWith('doc-uuid-1', locale);
  });
});

describe('the edit page', () => {
  it("is not found for someone else's experience", async () => {
    vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(null);

    await expect(renderPage('en')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(doctors.getDoctor).not.toHaveBeenCalled();
  });

  it('is not found for a malformed id, before any account lookup', async () => {
    await expect(renderPage('en', '../me')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(requireAccount).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in, back to this edit page', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(renderPage('en')).rejects.toThrow('NEXT_REDIRECT');
    expect(requireAccount).toHaveBeenCalledWith({ returnTo: `/experiences/${PUBLIC_ID}/edit` });
    expect(reviews.getOwnReviewForEdit).not.toHaveBeenCalled();
  });
});
