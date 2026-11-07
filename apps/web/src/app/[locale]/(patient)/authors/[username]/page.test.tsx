import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { ExperienceCardVM, Result } from '@rogikotha/contracts';

import {
  renderInLocale,
  testTranslator,
} from '@/components/patient/experience/experience-test-support';
import { redirect } from '@/i18n/routing';
import { documentTitle } from '@/lib/titles';
import { runCommand } from '@/server/command-call';
import { getContainer } from '@/server/container';
import AuthorPage, { generateMetadata } from './page';

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
    usePathname: () => '/authors/synthetic_writer',
    redirect: vi.fn(() => {
      throw new Error('NEXT_REDIRECT');
    }),
  };
});
vi.mock('@/server/command-call', () => ({ runCommand: vi.fn() }));
vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

interface AuthorOutput {
  header: { username: string; displayName?: string };
  page: { items: ExperienceCardVM[]; nextCursor?: string };
}

const card: ExperienceCardVM = {
  publicId: 'exp0000009',
  title: 'A synthetic account by this author',
  excerpt: 'A short synthetic excerpt.',
  truncated: false,
  documentsCount: 0,
  author: { personaKind: 'named', displayName: 'Synthetic Writer' },
  relationship: 'self',
  period: { year: 2026, month: 3 },
  doctor: { publicId: 'd0c7015000', name: 'Dr. Synthetic Rahman' },
};

let answer: Result<AuthorOutput>;

function props(username: string, search: Record<string, string> = {}) {
  return { params: Promise.resolve({ username }), searchParams: Promise.resolve(search) };
}

async function renderPage(locale: 'en' | 'bn', username: string, search = {}) {
  active.locale = locale;
  return renderInLocale(locale, await AuthorPage(props(username, search)));
}

describe.each(['en', 'bn'] as const)('the author page in %s', (locale) => {
  const t = testTranslator(locale);

  beforeEach(() => {
    vi.clearAllMocks();
    answer = {
      ok: true,
      data: {
        header: { username: 'synthetic_writer', displayName: 'Synthetic Writer' },
        page: { items: [card], nextCursor: 'next-1' },
      },
    };
    vi.mocked(getContainer).mockReturnValue({
      review: { authorCards: { name: 'review.authorCards' } },
    } as never);
    vi.mocked(runCommand).mockImplementation(() => Promise.resolve(answer));
  });

  it('shows @username, the display name, the public experiences and a pager', async () => {
    await renderPage(locale, 'synthetic_writer');

    expect(document.getElementById('view-person')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('@synthetic_writer');
    expect(screen.getByTestId('author-display-name')).toHaveTextContent('Synthetic Writer');
    expect(
      screen.getByRole('heading', { level: 2, name: 'A synthetic account by this author' }),
    ).toBeVisible();
    expect(screen.getByTestId('pager-more')).toHaveAttribute(
      'href',
      '/authors/synthetic_writer?cursor=next-1',
    );
    expect(runCommand).toHaveBeenCalledWith(
      { name: 'review.authorCards' },
      { username: 'synthetic_writer' },
    );
  });

  it('renders an unknown username as the same empty page, not a 404', async () => {
    answer = { ok: true, data: { header: { username: 'nobody_here' }, page: { items: [] } } };
    await renderPage(locale, 'nobody_here');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('@nobody_here');
    expect(screen.getByText(t('profile.noContributions'))).toBeInTheDocument();
    expect(screen.queryByTestId('pager')).toBeNull();
  });

  it('renders a username the schema refuses as the same empty page', async () => {
    answer = { ok: false, error: { code: 'validation' } } as Result<AuthorOutput>;
    await renderPage(locale, 'x'.repeat(80));
    expect(screen.getByText(t('profile.noContributions'))).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('passes the cursor on, and sends a bad cursor back to the newest page', async () => {
    await renderPage(locale, 'synthetic_writer', { cursor: 'next-1' });
    expect(runCommand).toHaveBeenCalledWith(
      { name: 'review.authorCards' },
      { username: 'synthetic_writer', cursor: 'next-1' },
    );
    expect(screen.getByTestId('pager-newest')).toHaveAttribute('href', '/authors/synthetic_writer');

    answer = { ok: false, error: { code: 'validation' } } as Result<AuthorOutput>;
    await expect(renderPage(locale, 'synthetic_writer', { cursor: 'bad' })).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith({ href: '/authors/synthetic_writer', locale });
  });

  it('sends another failed read to the error boundary', async () => {
    answer = { ok: false, error: { code: 'internal' } } as Result<AuthorOutput>;
    await expect(renderPage(locale, 'synthetic_writer')).rejects.toThrow(
      'review.authorCards: internal',
    );
  });

  it('keeps search engines out and never echoes the typed username into the tab title', async () => {
    active.locale = locale;
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(documentTitle('person', (key) => t(key as never)));
    expect(metadata.title).not.toContain('synthetic_writer');
    expect(metadata).toMatchObject({ robots: { index: false } });
    expect(runCommand).not.toHaveBeenCalled();
  });
});
