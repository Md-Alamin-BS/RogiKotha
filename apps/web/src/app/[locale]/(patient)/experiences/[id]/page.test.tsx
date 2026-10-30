import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { DemoCurrentAccount, DemoReviewEditRow } from '@rogikotha/contracts';

import { getCurrentAccount } from '@/server/auth/session';
import { comments, reviews } from '@/server/data';
import {
  buildReviewDetail,
  buildThread,
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '@/components/patient/experience/experience-test-support';
import ExperiencePage, { generateMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const { createTranslator: makeTranslator } = await import('next-intl');
  const support = await import('@/components/patient/experience/experience-test-support');
  return {
    getLocale: () => Promise.resolve(active.locale),
    getTranslations: () =>
      Promise.resolve(
        makeTranslator({ locale: active.locale, messages: support.loadMessages(active.locale) }),
      ),
  };
});
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/i18n/routing', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return { Link: support.TestLink, usePathname: () => '/experiences/exp0000001' };
});
vi.mock('@/server/auth/session', () => ({ getCurrentAccount: vi.fn() }));
vi.mock('@/server/data', () => ({
  reviews: { getReviewByPublicId: vi.fn(), getOwnReviewForEdit: vi.fn() },
  comments: { listComments: vi.fn() },
}));
vi.mock('@/server/actions/comments', () => ({ postComment: vi.fn(), deleteComment: vi.fn() }));
vi.mock('@/components/patient/evidence/EvidenceNote', () => ({
  EvidenceNote: ({ count }: { count: number }) => <p>evidence note for {count}</p>,
}));
vi.mock('@/components/patient/evidence/AuthorEvidence', () => ({
  AuthorEvidence: ({ reviewPublicId }: { reviewPublicId: string }) => (
    <p>author evidence for {reviewPublicId}</p>
  ),
}));

const reader: DemoCurrentAccount = {
  accountId: '0190f5a2-0000-7000-8000-000000000002',
  authUserId: 'auth-user-2',
  username: 'karim_reader',
  displayName: 'Karim Reader',
  locale: 'en',
  status: 'active',
  currentPersonaId: '0190f5a2-0000-7000-8000-0000000000bb',
  pseudonymousPersonaId: null,
  pseudonymousDisplayName: null,
};

const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function renderPage(locale: TestLocale, id = 'exp0000001') {
  active.locale = locale;
  const element = await ExperiencePage(params(id));
  return renderInLocale(locale, element);
}

describe.each(['en', 'bn'] as const)('the experience page in %s', (locale) => {
  const t = testTranslator(locale);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(reviews.getReviewByPublicId).mockResolvedValue(
      buildReviewDetail({ readyEvidenceCount: 2 }),
    );
    vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue(null);
    vi.mocked(comments.listComments).mockResolvedValue([
      buildThread({ body: 'A comment from a reader' }),
    ]);
    vi.mocked(getCurrentAccount).mockResolvedValue(null);
  });

  it('shows the experience, its evidence note and its comments to a signed-out reader', async () => {
    await renderPage(locale);

    expect(document.getElementById('view-account')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Clear advice after a long wait',
    );
    expect(screen.getByText('evidence note for 2')).toBeInTheDocument();
    expect(screen.getByText('A comment from a reader')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: t('experience.signInToComment') })).toBeInTheDocument();
    expect(screen.queryByText(/author evidence/)).toBeNull();
    expect(reviews.getReviewByPublicId).toHaveBeenCalledWith('exp0000001', locale);
    expect(comments.listComments).toHaveBeenCalledWith(buildReviewDetail().id, null);
    expect(reviews.getOwnReviewForEdit).not.toHaveBeenCalled();
  });

  it('gives a signed-in reader who is not the author the comment form and no edit link', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue(reader);
    await renderPage(locale);

    expect(screen.getByRole('textbox', { name: t('experience.commentBox') })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t('experience.editExperience') })).toBeNull();
    expect(reviews.getOwnReviewForEdit).toHaveBeenCalledWith('exp0000001', reader.accountId);
    expect(comments.listComments).toHaveBeenCalledWith(buildReviewDetail().id, reader.accountId);
  });

  it('gives the author the edit link and the uploader', async () => {
    vi.mocked(getCurrentAccount).mockResolvedValue(reader);
    vi.mocked(reviews.getOwnReviewForEdit).mockResolvedValue({
      publicId: 'exp0000001',
    } as DemoReviewEditRow);
    await renderPage(locale);

    expect(screen.getByRole('link', { name: t('experience.editExperience') })).toHaveAttribute(
      'href',
      '/experiences/exp0000001/edit',
    );
    expect(screen.getByText('author evidence for exp0000001')).toBeInTheDocument();
  });

  it('is not found for an unknown or malformed experience id', async () => {
    vi.mocked(reviews.getReviewByPublicId).mockResolvedValue(null);
    await expect(renderPage(locale, 'exp0000009')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderPage(locale, '../secret')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(reviews.getReviewByPublicId).toHaveBeenCalledTimes(1);
  });

  it('titles the browser tab with the experience title', async () => {
    active.locale = locale;
    const metadata = await generateMetadata(params('exp0000001'));
    expect(metadata.title).toBe(`Clear advice after a long wait — ${t('brand.name')}`);
  });
});
