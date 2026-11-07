import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { CursorPage, ExperienceCardVM, Result } from '@rogikotha/contracts';

import {
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import { redirect } from '@/i18n/routing';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import ExperienceIndexPage, { generateMetadata } from './page';
import ExperienceIndexLoading from './loading';

const active = vi.hoisted((): { locale: 'en' | 'bn' } => ({ locale: 'en' }));

vi.mock('next-intl/server', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return {
    getLocale: () => Promise.resolve(active.locale),
    getTranslations: () => Promise.resolve(support.testTranslator(active.locale)),
  };
});
vi.mock('@/i18n/routing', async () => {
  const support = await import('@/components/patient/experience/experience-test-support');
  return {
    Link: support.TestLink,
    usePathname: () => '/experiences',
    redirect: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

function aCard(overrides: Partial<ExperienceCardVM> = {}): ExperienceCardVM {
  return {
    publicId: 'exp0000009',
    title: 'A recent synthetic experience',
    excerpt: 'A short synthetic excerpt.',
    truncated: false,
    documentsCount: 0,
    author: { personaKind: 'pseudonymous', username: 'synthetic_writer', initials: '@s' },
    relationship: 'self',
    period: { year: 2026, month: 3 },
    doctor: { publicId: 'd0c7015000', name: 'Dr. Synthetic Rahman' },
    ...overrides,
  };
}

let cards: Result<CursorPage<ExperienceCardVM>>;
let total = 0;
const calls: { name: string; raw: unknown }[] = [];

async function renderPage(locale: 'en' | 'bn', search: Record<string, string> = {}) {
  active.locale = locale;
  const element = await ExperienceIndexPage({ searchParams: Promise.resolve(search) });
  return renderInLocale(locale, element);
}

describe.each(['en', 'bn'] as const)('the experiences index in %s', (locale) => {
  const t = testTranslator(locale);

  beforeEach(() => {
    vi.clearAllMocks();
    calls.length = 0;
    cards = { ok: true, data: { items: [aCard()], nextCursor: 'next-1' } };
    total = 41;
    vi.mocked(getContainer).mockReturnValue({
      reviewReads: { listExperienceCards: { name: 'review.listExperienceCards' } },
      review: { countExperiences: { name: 'review.countExperiences' } },
    } as never);
    vi.mocked(runCommand).mockImplementation((command: unknown, raw: unknown) => {
      const name = (command as { name: string }).name;
      calls.push({ name, raw });
      if (name === 'review.listExperienceCards') return Promise.resolve(cards);
      return Promise.resolve({ ok: true, data: { total } }) as never;
    });
  });

  it('lists 20 cards per page with the total in the count line and a pager', async () => {
    await renderPage(locale);

    expect(document.getElementById('view-experiences')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.account'));
    expect(screen.getByTestId('experience-index-count')).toHaveTextContent(
      // The plural selector `n` is a number; the test translator types every value as a string.
      t('index.count', { n: 41 as never, count: locale === 'bn' ? '৪১' : '41' }),
    );
    expect(
      screen.getByRole('heading', { level: 2, name: 'A recent synthetic experience' }),
    ).toBeVisible();
    expect(screen.getByTestId('pager-more')).toHaveAttribute('href', '/experiences?cursor=next-1');
    expect(screen.queryByTestId('pager-newest')).toBeNull();
    expect(calls).toContainEqual({ name: 'review.listExperienceCards', raw: { limit: 20 } });
    expect(calls).toContainEqual({ name: 'review.countExperiences', raw: {} });
  });

  it('passes the cursor on and offers the way back to the newest page', async () => {
    cards = { ok: true, data: { items: [aCard()] } };
    await renderPage(locale, { cursor: 'next-1' });
    expect(calls).toContainEqual({
      name: 'review.listExperienceCards',
      raw: { limit: 20, cursor: 'next-1' },
    });
    expect(screen.queryByTestId('pager-more')).toBeNull();
    expect(screen.getByTestId('pager-newest')).toHaveAttribute('href', '/experiences');
  });

  it('redirects a bad cursor to the newest page', async () => {
    cards = { ok: false, error: { code: 'validation' } } as typeof cards;
    await expect(renderPage(locale, { cursor: 'not-a-cursor' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/experiences', locale });
  });

  it('sends another failed read to the error boundary', async () => {
    cards = { ok: false, error: { code: 'internal' } } as typeof cards;
    await expect(renderPage(locale)).rejects.toThrow('review.listExperienceCards: internal');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('invites the first account when there is none, with a link to write', async () => {
    cards = { ok: true, data: { items: [] } };
    total = 0;
    await renderPage(locale);
    expect(screen.getByRole('link', { name: t('index.beFirst') })).toHaveAttribute(
      'href',
      '/write',
    );
    expect(screen.queryByTestId('pager')).toBeNull();
  });

  it('shows a static skeleton while loading', () => {
    renderInLocale(locale, <ExperienceIndexLoading />);
    const skeleton = screen.getByTestId('experience-index-loading');
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.account'));
    expect(skeleton.querySelectorAll('.index-skeleton')).toHaveLength(3);
  });

  it('titles the tab as the experiences view', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.title).toContain(t('brand.name'));
  });
});
