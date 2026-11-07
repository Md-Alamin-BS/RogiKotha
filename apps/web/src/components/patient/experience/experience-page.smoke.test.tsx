// U47 smoke (cumulative suite): the experience page renders its head, story and the three slots
// (documents, history, discussion) in both languages. The slots are async server components with
// their own tests (slots.test.tsx), so stand-ins mark where each one is mounted.
import type { ExperiencePageVM } from '@rogikotha/contracts';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderInLocale, testTranslator, type TestLocale } from './experience-test-support';
import { ExperiencePage } from './ExperiencePage';

vi.mock('@/i18n/routing', async () => {
  const support = await import('./experience-test-support');
  return { Link: support.TestLink };
});
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

const PAGE: ExperiencePageVM = {
  kind: 'experience',
  publicId: PUBLIC_ID,
  reviewKind: 'quick',
  title: 'A synthetic smoke visit',
  story: 'First paragraph.\n\nSecond paragraph.',
  sections: [],
  contentLanguage: 'en',
  relationship: 'self',
  period: { year: 2026, month: 4 },
  publishedAt: '2026-05-02',
  claims: [],
  tags: [],
  doctor: { publicId: 'd0c7015000', name: 'Dr. Synthetic Rahman', memberAddedNotConfirmed: false },
  byline: { personaKind: 'named', displayName: 'Synthetic Author' },
  relatedByCondition: [],
  sameDoctor: [],
  otherByAuthor: [],
};

describe.each(['en', 'bn'] as const)('the experience page in %s', (locale: TestLocale) => {
  it('renders the head, the story and its three slots with the disclaimer', () => {
    const t = testTranslator(locale);

    renderInLocale(
      locale,
      <ExperiencePage vm={PAGE} reviewPublicId={PUBLIC_ID} isAuthor={false} published={false} />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('A synthetic smoke visit');
    for (const slot of ['slot-history', 'slot-evidence', 'slot-comments']) {
      expect(screen.getByTestId(slot)).toHaveTextContent(PUBLIC_ID);
    }
    expect(screen.getByText(t('disclaimer.long'))).toBeInTheDocument();
  });
});
