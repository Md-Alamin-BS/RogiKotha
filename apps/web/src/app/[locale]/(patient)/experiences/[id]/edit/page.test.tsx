import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { err, ok, type EditReviewVM } from '@rogikotha/contracts';
import { notFound } from 'next/navigation';
import { requireAccount } from '@/server/auth/session';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import {
  renderInLocale,
  translatorFor,
  type TestLocale,
} from '@/components/patient/compose/compose-test-support';
import EditExperiencePage, { generateMetadata } from './page';

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
vi.mock('@/server/actions/review-edit', () => ({ correctReviewAction: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireAccount: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

const PUBLIC_ID = 'a1b2c3d4e5';
const getOwnForEdit = { name: 'review.getOwnForEdit', execute: vi.fn() };

function aViewModel(overrides: Partial<EditReviewVM> = {}): EditReviewVM {
  const quick = (overrides.kind ?? 'quick') === 'quick';
  return {
    publicId: PUBLIC_ID,
    kind: 'quick',
    version: 1,
    title: 'Calm and careful with my son',
    ...(quick ? { story: 'She listened to every question and explained the doses slowly.' } : {}),
    outcome: 'helped',
    claims: [],
    doctorName: 'Dr. Synthetic Rahman',
    ...overrides,
  };
}

async function renderPage(locale: TestLocale, id = PUBLIC_ID) {
  active.locale = locale;
  const element = (await EditExperiencePage({ params: Promise.resolve({ id }) })) as ReactElement;
  return renderInLocale(element, locale);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getContainer).mockReturnValue({
    review: { getOwnForEdit },
  } as unknown as ReturnType<typeof getContainer>);
  vi.mocked(requireAccount).mockResolvedValue({} as Awaited<ReturnType<typeof requireAccount>>);
  vi.mocked(runCommand).mockResolvedValue(ok(aViewModel()));
});

describe.each(['en', 'bn'] as const)('the edit page in %s', (locale) => {
  const t = translatorFor(locale);

  it("opens the author's own experience in the edit form, with one h1", async () => {
    await renderPage(locale);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('compose.edit.title'));
    expect(screen.getByText(t('compose.edit.intro'))).toBeInTheDocument();
    expect(screen.getByTestId('compose-title')).toHaveValue('Calm and careful with my son');
    expect(screen.getByTestId('compose-story')).toBeInTheDocument();
    expect(screen.getByTestId('edit-doctor')).toHaveTextContent('Dr. Synthetic Rahman');
    expect(runCommand).toHaveBeenCalledWith(getOwnForEdit, { publicId: PUBLIC_ID });
  });

  it('opens a detailed experience with its four sections', async () => {
    vi.mocked(runCommand).mockResolvedValue(
      ok(aViewModel({ kind: 'detailed', sections: { symptoms: 'Fever for three days.' } })),
    );

    await renderPage(locale);

    expect(screen.getByTestId('compose-symptoms')).toHaveValue('Fever for three days.');
    expect(screen.getByTestId('compose-after')).toHaveValue('');
  });
});

describe('the edit page', () => {
  it('is noindex and titled for editing', async () => {
    active.locale = 'en';
    const metadata = await generateMetadata();

    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.title).toContain(translatorFor('en')('compose.edit.title'));
  });

  it("is not found for someone else's experience", async () => {
    vi.mocked(runCommand).mockResolvedValue(err('not_found'));

    await expect(renderPage('en')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is not found for a malformed id, before any account lookup', async () => {
    await expect(renderPage('en', '../me')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(requireAccount).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in, back to this edit page', async () => {
    vi.mocked(requireAccount).mockRejectedValue(new Error('NEXT_REDIRECT'));

    await expect(renderPage('en')).rejects.toThrow('NEXT_REDIRECT');
    expect(requireAccount).toHaveBeenCalledWith({ returnTo: `/experiences/${PUBLIC_ID}/edit` });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('fails loudly on an unexpected command error instead of showing a form', async () => {
    vi.mocked(runCommand).mockResolvedValue(err('internal'));

    await expect(renderPage('en')).rejects.toThrow('review.getOwnForEdit: internal');
  });
});
