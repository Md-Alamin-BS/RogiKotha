import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';

import { AuthorTools } from './AuthorTools';
import { ExperienceIndex } from './ExperienceIndex';
import {
  buildReviewCard,
  renderInLocale,
  testTranslator,
  type TestLocale,
} from './experience-test-support';

vi.mock('@/i18n/routing', async () => {
  const support = await import('./experience-test-support');
  return { Link: support.TestLink };
});

describe.each(['en', 'bn'] as const)('the experience index in %s', (locale: TestLocale) => {
  const t = testTranslator(locale);

  it('lists each experience with its doctor and a link to read it in full', () => {
    const { container } = renderInLocale(
      locale,
      <ExperienceIndex
        cards={[
          buildReviewCard({ publicId: 'exp0000001', title: 'First synthetic visit' }),
          buildReviewCard({ publicId: 'exp0000002', title: 'Second synthetic visit' }),
        ]}
      />,
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('nav.account'));
    const titles = Array.from(container.querySelectorAll('article.acct h3')).map(
      (h3) => h3.textContent,
    );
    expect(titles).toEqual(['First synthetic visit', 'Second synthetic visit']);
    const readLinks = screen.getAllByRole('link', { name: t('review.readFull') });
    expect(readLinks.map((a) => a.getAttribute('href'))).toEqual([
      '/experiences/exp0000001',
      '/experiences/exp0000002',
    ]);
    expect(screen.getAllByRole('link', { name: 'Dr. Nasrin Synthetic' })[0]).toHaveAttribute(
      'href',
      '/doctors/dcr0000001',
    );
  });

  it('counts the experiences with numerals of the active language', () => {
    const cards = Array.from({ length: 12 }, (_, i) =>
      buildReviewCard({ publicId: `exp00000${String(i).padStart(2, '0')}` }),
    );
    const { container } = renderInLocale(locale, <ExperienceIndex cards={cards} />);
    const count = locale === 'bn' ? '১২' : '12';
    expect(container.querySelector('.count-line')).toHaveTextContent(
      `${count} ${t('sentiment.accounts')}`,
    );
  });

  it('shows the documents badge or "No documents" on each row', () => {
    renderInLocale(
      locale,
      <ExperienceIndex
        cards={[
          buildReviewCard({ publicId: 'exp0000001', readyEvidenceCount: 3 }),
          buildReviewCard({ publicId: 'exp0000002', readyEvidenceCount: 0 }),
        ]}
      />,
    );
    const three = locale === 'bn' ? '৩' : '3';
    expect(screen.getByText(`${three} ${t('label.documentsWord')}`)).toBeInTheDocument();
    expect(screen.getByText(t('label.noDocuments'))).toBeInTheDocument();
  });

  it('says so when there is nothing to list', () => {
    renderInLocale(locale, <ExperienceIndex cards={[]} />);
    expect(screen.getByText(t('mine.empty'))).toBeInTheDocument();
  });

  it('gives the author an edit link next to their uploader', () => {
    renderInLocale(
      locale,
      <AuthorTools reviewPublicId="exp0000001" uploader={<p>uploader slot</p>} />,
    );
    expect(screen.getByRole('link', { name: t('experience.editExperience') })).toHaveAttribute(
      'href',
      '/experiences/exp0000001/edit',
    );
    expect(screen.getByText('uploader slot')).toBeInTheDocument();
  });
});
