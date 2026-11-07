import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ExperiencePageVM, Result } from '@rogikotha/contracts';

import {
  renderInLocale,
  testTranslator,
  type TestLocale,
} from '@/components/patient/experience/experience-test-support';
import { getActor } from '@/server/auth';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import ExperienceRoute, { generateMetadata } from './page';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return {
    getLocale: () => Promise.resolve(active.locale),
    getTranslations: () => Promise.resolve(support.testTranslator(active.locale)),
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
vi.mock('@/server/auth', () => ({ getActor: vi.fn() }));
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));
// The page component and its slots have their own tests; here only the props matter.
vi.mock('@/components/patient/experience/ExperiencePage', () => ({
  ExperiencePage: (props: {
    vm: ExperiencePageVM;
    reviewPublicId: string;
    isAuthor: boolean;
    published: boolean;
  }) => (
    <article data-testid="experience-page">
      <h1>{props.vm.title}</h1>
      <p data-testid="props">
        {JSON.stringify({
          reviewPublicId: props.reviewPublicId,
          isAuthor: props.isAuthor,
          published: props.published,
        })}
      </p>
    </article>
  ),
}));

const PUBLIC_ID = 'exp0000001';
const REVIEW_ID = '0190f5a2-0000-7000-8000-0000000000e1';
const ACTOR = { kind: 'account', accountId: '0190f5a2-0000-7000-8000-000000000002' };

const vm = {
  kind: 'experience',
  publicId: PUBLIC_ID,
  title: 'Clear advice after a long wait',
} as ExperiencePageVM;

let experience: Result<ExperiencePageVM>;
const reviewIdForPublicId = vi.fn();
const isReviewAuthor = vi.fn();
const read = vi.fn((fn: (tx: unknown) => unknown) => fn({}));

function props(id: string, search: Record<string, string> = {}) {
  return { params: Promise.resolve({ id }), searchParams: Promise.resolve(search) };
}

async function renderPage(locale: TestLocale, id = PUBLIC_ID, search: Record<string, string> = {}) {
  active.locale = locale;
  return renderInLocale(locale, await ExperienceRoute(props(id, search)));
}

function shownProps(): { reviewPublicId: string; isAuthor: boolean; published: boolean } {
  return JSON.parse(screen.getByTestId('props').textContent ?? '{}') as {
    reviewPublicId: string;
    isAuthor: boolean;
    published: boolean;
  };
}

describe.each(['en', 'bn'] as const)('the experience page in %s', (locale) => {
  const t = testTranslator(locale);

  beforeEach(() => {
    vi.clearAllMocks();
    experience = { ok: true, data: vm };
    reviewIdForPublicId.mockResolvedValue(REVIEW_ID);
    isReviewAuthor.mockResolvedValue(false);
    vi.mocked(getActor).mockResolvedValue(ACTOR as never);
    vi.mocked(getContainer).mockReturnValue({
      review: {
        getExperience: { name: 'review.getExperience' },
        reviewIdForPublicId,
        isReviewAuthor,
      },
      ports: { unitOfWork: { read } },
    } as never);
    vi.mocked(runCommand).mockImplementation((command: unknown) => {
      const name = (command as { name: string }).name;
      if (name !== 'review.getExperience') throw new Error(`unexpected ${name}`);
      return Promise.resolve(experience);
    });
  });

  it('shows a reader the experience, resolving the id and the authorship once', async () => {
    await renderPage(locale, `${PUBLIC_ID}-clear-advice`);

    expect(document.getElementById('view-account')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(vm.title);
    expect(shownProps()).toEqual({ reviewPublicId: PUBLIC_ID, isAuthor: false, published: false });
    expect(runCommand).toHaveBeenCalledWith(
      { name: 'review.getExperience' },
      {
        publicId: PUBLIC_ID,
      },
    );
    expect(reviewIdForPublicId).toHaveBeenCalledTimes(1);
    expect(reviewIdForPublicId).toHaveBeenCalledWith({}, { publicId: PUBLIC_ID });
    expect(isReviewAuthor).toHaveBeenCalledTimes(1);
    expect(isReviewAuthor).toHaveBeenCalledWith({}, { reviewId: REVIEW_ID, actor: ACTOR });
  });

  it('gives the author the author view and the published note only with ?published=1', async () => {
    isReviewAuthor.mockResolvedValue(true);
    const { unmount } = await renderPage(locale, PUBLIC_ID, { published: '1' });
    expect(shownProps()).toEqual({ reviewPublicId: PUBLIC_ID, isAuthor: true, published: true });
    unmount();

    await renderPage(locale);
    expect(shownProps()).toMatchObject({ isAuthor: true, published: false });
  });

  it('never shows the published note to someone who is not the author', async () => {
    await renderPage(locale, PUBLIC_ID, { published: '1' });
    expect(shownProps()).toMatchObject({ isAuthor: false, published: false });
  });

  it('skips the authorship check when the id resolves to no review', async () => {
    reviewIdForPublicId.mockResolvedValue(null);
    await renderPage(locale);
    expect(shownProps()).toMatchObject({ isAuthor: false });
    expect(isReviewAuthor).not.toHaveBeenCalled();
  });

  it('is not found for an unknown or malformed id, before any read of the authorship', async () => {
    experience = { ok: false, error: { code: 'not_found' } } as Result<ExperiencePageVM>;
    await expect(renderPage(locale, 'exp0000009')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderPage(locale, '../secret')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(runCommand).toHaveBeenCalledTimes(1);
    expect(reviewIdForPublicId).not.toHaveBeenCalled();
  });

  it('sends any other failed read to the error boundary', async () => {
    experience = { ok: false, error: { code: 'internal' } } as Result<ExperiencePageVM>;
    await expect(renderPage(locale)).rejects.toThrow('review.getExperience: internal');
  });

  it('titles the tab with the experience title and stays indexable', async () => {
    active.locale = locale;
    const metadata = await generateMetadata(props(PUBLIC_ID));
    expect(metadata.title).toBe(`${vm.title} — ${t('brand.name')}`);
    expect(metadata.robots).toBeUndefined();
  });
});
