import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { ExperienceCardVM, ExperiencePageVM } from '@rogikotha/contracts';

import { renderInLocale, testTranslator, type TestLocale } from './experience-test-support';
import { ExperienceBody } from './ExperienceBody';
import { ExperiencePage } from './ExperiencePage';
import { Pager } from './Pager';
import { AuthorProfile } from './AuthorProfile';

vi.mock('@/i18n/routing', async () => {
  const support = await import('./experience-test-support');
  return { Link: support.TestLink };
});
// The slots are async server components with their own tests (slots.test.tsx).
vi.mock('@/components/patient/comments/CommentThread', () => ({
  CommentThread: ({ reviewPublicId }: { reviewPublicId: string }) => (
    <p data-testid="slot-comments">{reviewPublicId}</p>
  ),
}));
vi.mock('@/components/patient/evidence/EvidenceSection', () => ({
  EvidenceSection: ({ reviewPublicId }: { reviewPublicId: string }) => (
    <p data-testid="slot-evidence">{reviewPublicId}</p>
  ),
}));
vi.mock('@/components/patient/review-history/ReviewHistory', () => ({
  ReviewHistory: ({ reviewPublicId }: { reviewPublicId: string }) => (
    <p data-testid="slot-history">{reviewPublicId}</p>
  ),
}));
vi.mock('@/components/patient/evidence/AuthorEvidence', () => ({
  AuthorEvidence: () => <p data-testid="author-evidence" />,
}));

const PUBLIC_ID = 'exp0000001';

function aCard(overrides: Partial<ExperienceCardVM> = {}): ExperienceCardVM {
  return {
    publicId: 'exp0000009',
    title: 'Another synthetic account',
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

function aPage(overrides: Partial<ExperiencePageVM> = {}): ExperiencePageVM {
  return {
    kind: 'experience',
    publicId: PUBLIC_ID,
    reviewKind: 'quick',
    title: 'A synthetic visit',
    story: 'First paragraph.\n\nSecond paragraph.',
    sections: [],
    contentLanguage: 'en',
    relationship: 'self',
    period: { year: 2026, month: 4 },
    publishedAt: '2026-05-02',
    claims: [{ code: 'wrongDx' }, { text: 'Seeded label as written' }],
    tags: [
      { group: 'condition', name: 'Typed wording', provisional: true },
      { group: 'condition', notSure: true },
    ],
    doctor: {
      publicId: 'd0c7015000',
      name: 'Dr. Synthetic Rahman',
      memberAddedNotConfirmed: true,
    },
    byline: { personaKind: 'named', displayName: 'Synthetic Author' },
    relatedByCondition: [],
    sameDoctor: [],
    otherByAuthor: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.each(['en', 'bn'] as const)('the experience components in %s', (locale: TestLocale) => {
  const t = testTranslator(locale);

  it('shows the page head with Not provided for unanswered judgements and the labels framed', () => {
    renderInLocale(locale, <ExperienceBody vm={aPage()} mode="page" />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A synthetic visit');
    const flags = screen.getByTestId('experience-flags');
    expect(flags).toHaveTextContent(`${t('experience.sentimentLabel')}: ${t('label.notProvided')}`);
    expect(flags).toHaveTextContent(`${t('experience.outcomeLabel')}: ${t('label.notProvided')}`);
    expect(flags.textContent ?? '').not.toMatch(/\b\d+\s*\/\s*\d+\b/);
    const labels = screen.getByTestId('reviewer-labels');
    expect(within(labels).getByText(t('claim.wrongDx'))).toBeInTheDocument();
    expect(within(labels).getByText('Seeded label as written')).toBeInTheDocument();
    expect(within(labels).getAllByText(t('label.reviewerLabel'))).toHaveLength(2);
    expect(screen.getByText(t('label.reviewerLabelWhy'))).toBeInTheDocument();
    expect(screen.getByText('First paragraph.')).toHaveClass('story-lead');
  });

  it('lists a detailed review’s sections in order under their headings', () => {
    renderInLocale(
      locale,
      <ExperienceBody
        vm={aPage({
          reviewKind: 'detailed',
          sections: [
            { key: 'symptoms', body: 'Synthetic symptoms.' },
            { key: 'after', body: 'Synthetic aftermath.' },
          ],
        })}
        mode="page"
      />,
    );
    const items = within(screen.getByTestId('experience-sections')).getAllByRole('listitem');
    expect(items.map((li) => within(li).getByRole('heading').textContent)).toEqual([
      t('compose.symptoms'),
      t('compose.after'),
    ]);
  });

  it('marks the author’s text with its language when it differs from the page', () => {
    const other = locale === 'en' ? 'bn' : 'en';
    renderInLocale(locale, <ExperienceBody vm={aPage({ contentLanguage: other })} mode="page" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', other);
    expect(screen.getByText('First paragraph.')).toHaveAttribute('lang', other);
  });

  it('links a pseudonymous author to the author page as @username', () => {
    renderInLocale(
      locale,
      <ExperienceBody
        vm={aPage({ byline: { personaKind: 'pseudonymous', username: 'synthetic_writer' } })}
        mode="page"
      />,
    );
    expect(screen.getByRole('link', { name: '@synthetic_writer' })).toHaveAttribute(
      'href',
      '/authors/synthetic_writer',
    );
  });

  it('shows an anonymous author’s alias on the page only, never as a link', () => {
    const vm = aPage({ byline: { personaKind: 'anonymous', alias: 'Quiet Heron' } });
    const { unmount } = renderInLocale(locale, <ExperienceBody vm={vm} mode="page" />);
    expect(screen.getByText(t('byline.anonSentence'))).toBeInTheDocument();
    expect(screen.getByTestId('byline-alias')).toHaveTextContent('Quiet Heron');
    expect(screen.queryByRole('link', { name: /Quiet Heron/ })).toBeNull();
    unmount();

    renderInLocale(locale, <ExperienceBody vm={vm} mode="preview" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('A synthetic visit');
    expect(screen.queryByTestId('byline-alias')).toBeNull();
  });

  it('builds the page in block order and hands the slots only the public id', () => {
    renderInLocale(
      locale,
      <ExperiencePage vm={aPage()} reviewPublicId={PUBLIC_ID} isAuthor={false} published={false} />,
    );
    const order = ['slot-history', 'slot-evidence', 'slot-comments', 'related-condition'].map(
      (id) => screen.getByTestId(id),
    );
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getByTestId('slot-comments')).toHaveTextContent(PUBLIC_ID);
    expect(screen.queryByTestId('author-tools')).toBeNull();
    expect(screen.queryByTestId('published-note')).toBeNull();
    expect(
      within(screen.getByTestId('related-condition')).getByText(t('mine.empty')),
    ).toBeVisible();
    expect(screen.queryByTestId('related-doctor')).toBeNull();
    expect(screen.getByText(t('disclaimer.long'))).toHaveAttribute('data-static', 'disclaimer');
  });

  it('gives the author the tools, with the edit link for a quick review only', () => {
    const { unmount } = renderInLocale(
      locale,
      <ExperiencePage vm={aPage()} reviewPublicId={PUBLIC_ID} isAuthor published={false} />,
    );
    expect(screen.getByRole('link', { name: t('experience.editExperience') })).toHaveAttribute(
      'href',
      `/experiences/${PUBLIC_ID}/edit`,
    );
    unmount();

    renderInLocale(
      locale,
      <ExperiencePage
        vm={aPage({ reviewKind: 'detailed', sections: [{ key: 'symptoms', body: 'S.' }] })}
        reviewPublicId={PUBLIC_ID}
        isAuthor
        published={false}
      />,
    );
    expect(screen.getByTestId('author-tools')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t('experience.editExperience') })).toBeNull();
  });

  it('shows the margin with the doctor marks, the tags and the author’s other experiences', () => {
    renderInLocale(
      locale,
      <ExperiencePage
        vm={aPage({ otherByAuthor: [aCard()], sameDoctor: [aCard({ publicId: 'exp0000008' })] })}
        reviewPublicId={PUBLIC_ID}
        isAuthor={false}
        published={false}
      />,
    );
    const margin = screen.getByTestId('experience-margin');
    expect(within(margin).getByTestId('not-verified')).toBeInTheDocument();
    expect(within(margin).getByTestId('member-added')).toBeInTheDocument();
    expect(within(margin).getByText('Typed wording')).toHaveAttribute(
      'title',
      t('condition.provisional'),
    );
    expect(within(margin).getByText(t('compose.notSure'))).toBeInTheDocument();
    expect(within(margin).getByRole('link', { name: 'Another synthetic account' })).toHaveAttribute(
      'href',
      '/experiences/exp0000009',
    );
    expect(screen.getByTestId('related-doctor')).toBeInTheDocument();
  });

  it('pages with plain links and shows an empty author page as no contributions', () => {
    const { unmount } = renderInLocale(
      locale,
      <Pager nextCursor="c1" isLaterPage basePath="/experiences" />,
    );
    expect(screen.getByTestId('pager-more')).toHaveAttribute('href', '/experiences?cursor=c1');
    expect(screen.getByTestId('pager-newest')).toHaveAttribute('href', '/experiences');
    unmount();

    renderInLocale(locale, <AuthorProfile header={{ username: 'nobody_here' }} cards={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('@nobody_here');
    expect(screen.getByText(t('profile.noContributions'))).toBeInTheDocument();
  });

  it('names a named author in plain text, never as a link', () => {
    renderInLocale(locale, <ExperienceBody vm={aPage()} mode="page" />);
    expect(screen.getByText('Synthetic Author')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Synthetic Author/ })).toBeNull();
    expect(screen.getByText(t('experience.writtenBy'))).toBeInTheDocument();
  });

  it('renders the preview with an h2 title and Not provided for the missing period', () => {
    const { period: _period, ...rest } = aPage();
    void _period;
    renderInLocale(locale, <ExperienceBody vm={rest} mode="preview" />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('A synthetic visit');
    expect(screen.getByTestId('experience-flags')).toHaveTextContent(t('label.notProvided'));
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
  });

  it('shows an author page with the display name, the cards and a pager', () => {
    renderInLocale(
      locale,
      <AuthorProfile
        header={{ username: 'synthetic_writer', displayName: 'Synthetic Writer' }}
        cards={[aCard()]}
        nextCursor="c2"
      />,
    );
    expect(screen.getByTestId('author-display-name')).toHaveTextContent('Synthetic Writer');
    expect(
      screen.getByRole('heading', { level: 2, name: 'Another synthetic account' }),
    ).toBeVisible();
    expect(screen.getByTestId('pager-more')).toHaveAttribute(
      'href',
      '/authors/synthetic_writer?cursor=c2',
    );
    expect(screen.queryByTestId('pager-newest')).toBeNull();
  });
});
